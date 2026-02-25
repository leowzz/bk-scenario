from __future__ import annotations

import contextlib
import io
import json
import subprocess
from pathlib import Path
from typing import Any

from .template import TemplateRenderer
from .storage import Storage


class RuleEngine:
    def __init__(self, storage: Storage):
        self.storage = storage

    def execute_rule(self, project_id: int, rule_id: int, variables: dict[str, Any]) -> dict[str, Any]:
        execution = self.storage.create_execution(project_id, rule_id, variables)
        try:
            runtime_vars = self._build_runtime_vars(project_id, variables)
            nodes = self.storage.list_nodes(rule_id)
            edges = self.storage.list_edges(rule_id)
            if not nodes:
                self.storage.complete_execution(execution.execution_id, "failed", "规则没有节点")
                return {"execution_id": execution.execution_id, "status": "failed"}

            node_map = {n.node_id: n for n in nodes}
            order = self._topological_sort(nodes, edges)

            for node_id in order:
                node = node_map[node_id]
                config = json.loads(node.config or "{}")
                action_type = node.type

                if action_type == "sql":
                    content = self._execute_sql_node(project_id, config, runtime_vars)
                    step = self.storage.add_step(execution.execution_id, node_id, action_type, content)
                    self.storage.complete_step(step.id, "completed", content)
                elif action_type == "log":
                    content = TemplateRenderer.render(config.get("log_message", ""), runtime_vars)
                    step = self.storage.add_step(execution.execution_id, node_id, action_type, content)
                    self.storage.complete_step(step.id, "completed", content)
                elif action_type == "store":
                    scope = config.get("scope", "rule")
                    if scope not in {"project", "rule"}:
                        raise ValueError(f"invalid store scope: {scope}")
                    key = TemplateRenderer.render(config.get("store_key", ""), runtime_vars)
                    value = TemplateRenderer.render(config.get("store_value", ""), runtime_vars)
                    step = self.storage.add_step(execution.execution_id, node_id, action_type, f"{key}={value}")
                    self.storage.store_data(
                        project_id=project_id,
                        rule_id=rule_id,
                        execution_id=execution.execution_id,
                        node_id=node_id,
                        scope=scope,
                        key=key,
                        value=value,
                    )
                    self.storage.complete_step(step.id, "completed", "stored")
                elif action_type == "load":
                    scope = config.get("scope", "rule")
                    if scope not in {"project", "rule"}:
                        raise ValueError(f"invalid load scope: {scope}")
                    key = TemplateRenderer.render(config.get("key", ""), runtime_vars)
                    assign_to = config.get("assign_to")
                    if not assign_to:
                        raise ValueError("load.assign_to is required")
                    data = self.storage.read_latest_stored_data(project_id, rule_id, scope, key)
                    loaded_value = data.value if data else None
                    runtime_vars[assign_to] = loaded_value
                    content = f"{assign_to}={loaded_value}"
                    step = self.storage.add_step(execution.execution_id, node_id, action_type, content)
                    self.storage.complete_step(step.id, "completed", content)
                elif action_type == "python":
                    content = self._execute_python_node(config, runtime_vars)
                    step = self.storage.add_step(execution.execution_id, node_id, action_type, "python script")
                    self.storage.complete_step(step.id, "completed", content)
                elif action_type == "shell":
                    content = self._execute_shell_node(config, runtime_vars)
                    step = self.storage.add_step(execution.execution_id, node_id, action_type, config.get("command", ""))
                    self.storage.complete_step(step.id, "completed", content)
                else:
                    step = self.storage.add_step(execution.execution_id, node_id, action_type, "")
                    self.storage.complete_step(step.id, "skipped", "unknown action")

            self.storage.complete_execution(execution.execution_id, "completed", "ok")
            return {"execution_id": execution.execution_id, "status": "completed"}
        except Exception as exc:
            self.storage.complete_execution(execution.execution_id, "failed", str(exc))
            return {"execution_id": execution.execution_id, "status": "failed", "error": str(exc)}

    def _build_runtime_vars(self, project_id: int, run_variables: dict[str, Any]) -> dict[str, Any]:
        globals_records = self.storage.list_globals(project_id)
        resolved = {record.key: record.value for record in globals_records}
        resolved.update(run_variables)
        return resolved

    def _execute_sql_node(self, project_id: int, config: dict[str, Any], variables: dict[str, Any]) -> str:
        dsn = None
        connector_name = config.get("connector")
        if connector_name:
            connector = self.storage.get_connector_by_name(project_id, connector_name)
            if not connector:
                raise ValueError(f"connector not found: {connector_name}")
            if connector.type != "mysql":
                raise ValueError(f"connector type mismatch for sql node: {connector.type}")
            connector_config = json.loads(connector.config_encrypted or "{}")
            dsn = connector_config.get("dsn")

        if not dsn:
            connection_key = config.get("connection_key")
            if connection_key:
                dsn = variables.get(connection_key)

        rendered_sql = TemplateRenderer.render_sql(config.get("sql", ""), variables)
        if not dsn:
            return rendered_sql

        from sqlalchemy import create_engine, text

        db_engine = create_engine(dsn)
        try:
            with db_engine.connect() as conn:
                result = conn.execute(text(rendered_sql))
                if result.returns_rows:
                    rows = [dict(row._mapping) for row in result]
                    return json.dumps(rows, default=str, ensure_ascii=True)
                return f"Affected rows: {result.rowcount}"
        finally:
            db_engine.dispose()

    def _execute_python_node(self, config: dict[str, Any], variables: dict[str, Any]) -> str:
        script = config.get("script", "")
        timeout_sec = int(config.get("timeout_sec", 10))
        local_vars = {"vars": dict(variables), "result": None}

        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            exec(script, {"__builtins__": {"print": print, "len": len, "str": str, "int": int, "float": float, "dict": dict, "list": list}}, local_vars)
        if timeout_sec <= 0:
            raise ValueError("python timeout_sec must be positive")
        output = stdout.getvalue().strip()
        if local_vars.get("result") is not None:
            return str(local_vars["result"])
        return output

    def _execute_shell_node(self, config: dict[str, Any], variables: dict[str, Any]) -> str:
        command = TemplateRenderer.render(config.get("command", ""), variables)
        timeout_sec = int(config.get("timeout_sec", 10))
        workdir = config.get("workdir")
        cwd = None
        if workdir:
            target = Path(workdir).expanduser().resolve()
            allowed_root = Path.cwd().resolve()
            if not str(target).startswith(str(allowed_root)):
                raise ValueError("shell workdir is outside allowed root")
            cwd = str(target)

        completed = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            timeout=timeout_sec,
            capture_output=True,
            text=True,
            check=False,
        )
        if completed.returncode != 0:
            raise RuntimeError(completed.stderr.strip() or f"shell command failed with exit code {completed.returncode}")
        return completed.stdout.strip()

    def _topological_sort(self, nodes, edges) -> list[str]:
        node_ids = {n.node_id for n in nodes}
        graph = {nid: set() for nid in node_ids}
        for edge in edges:
            if edge.target_node in graph and edge.source_node in graph:
                graph[edge.target_node].add(edge.source_node)

        visited = set()
        temp = set()
        result = []

        def dfs(nid: str):
            if nid in temp:
                raise ValueError(f"循环依赖: {nid}")
            if nid in visited:
                return
            temp.add(nid)
            for dep in graph[nid]:
                dfs(dep)
            temp.remove(nid)
            visited.add(nid)
            result.append(nid)

        for nid in node_ids:
            if nid not in visited:
                dfs(nid)

        return result
