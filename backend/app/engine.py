from __future__ import annotations

import contextlib
import io
import json
import shlex
import subprocess
import time
from pathlib import Path
from typing import Any

from .models import ExecutionContext, NodeOutput
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
            if not nodes:
                self.storage.complete_execution(execution.execution_id, "failed", "规则没有节点")
                return {"execution_id": execution.execution_id, "status": "failed"}

            ctx = ExecutionContext(
                project_id=project_id,
                rule_id=rule_id,
                execution_id=execution.execution_id,
                vars=runtime_vars,
            )

            for node in nodes:
                node_id = node.node_id
                config = json.loads(node.config or "{}")
                action_type = node.type

                try:
                    if action_type in {"sql", "mysql"}:
                        output = self._execute_sql_node(project_id, node_id, config, ctx)
                    elif action_type == "redis":
                        output = self._execute_redis_node(project_id, node_id, config, ctx)
                    elif action_type == "log":
                        output = self._execute_log_node(node_id, config, ctx)
                    elif action_type == "store":
                        output = self._execute_store_node(project_id, rule_id, node_id, config, ctx)
                    elif action_type == "load":
                        output = self._execute_load_node(project_id, rule_id, node_id, config, ctx)
                    elif action_type == "python":
                        output = self._execute_python_node(node_id, config, ctx)
                    elif action_type == "shell":
                        output = self._execute_shell_node(node_id, config, ctx)
                    else:
                        output = NodeOutput(node_id=node_id, node_type=action_type, status="skipped")
                except Exception as node_exc:
                    output = NodeOutput(node_id=node_id, node_type=action_type, status="error", error=str(node_exc))

                ctx.set_output(output)
                step_status = "completed" if output.status == "success" else output.status
                content = output.error or str(output.data or "")
                step_data_json = json.dumps(output.model_dump(), default=str, ensure_ascii=False)
                step = self.storage.add_step(execution.execution_id, node_id, action_type, content[:500])
                self.storage.complete_step(step.id, step_status, content[:500], step_data=step_data_json)

                if output.status == "error":
                    raise RuntimeError(output.error)

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

    def _execute_sql_node(self, project_id: int, node_id: str, config: dict[str, Any], ctx: ExecutionContext) -> NodeOutput:
        template_vars = ctx.to_template_vars()
        dsn = None
        connector_name_raw = config.get("connector") or ""
        connector_name = TemplateRenderer.render(str(connector_name_raw), template_vars).strip() or None
        if connector_name:
            connector = self.storage.get_connector_by_name(project_id, connector_name)
            if not connector:
                raise ValueError(f"connector not found: {connector_name}")
            if connector.type != "mysql":
                raise ValueError(f"connector type mismatch for mysql node: {connector.type}")
            connector_config = json.loads(connector.config_encrypted or "{}")
            dsn = connector_config.get("dsn")

        if not dsn:
            connection_key = config.get("connection_key")
            if connection_key:
                dsn = template_vars.get(connection_key)

        rendered_sql = TemplateRenderer.render_sql(config.get("sql", ""), template_vars)
        if not dsn:
            return NodeOutput(node_id=node_id, node_type="mysql", status="success", data=rendered_sql, metadata={"rendered_sql": rendered_sql})

        from sqlalchemy import create_engine, text

        timeout_sec = int(ctx.vars.get("__sql_timeout__", 10))
        dsn = dsn.replace("mysql+aiomysql://", "mysql+pymysql://").replace("aiomysql://", "mysql+pymysql://")
        db_engine = create_engine(dsn, connect_args={"connect_timeout": timeout_sec}, pool_pre_ping=True)
        try:
            t0 = time.perf_counter()
            with db_engine.connect() as conn:
                conn.execute(text(f"SET SESSION max_execution_time={timeout_sec * 1000}"))
                result = conn.execute(text(rendered_sql))
                if result.returns_rows:
                    rows = [dict(row._mapping) for row in result]
                    elapsed_ms = int((time.perf_counter() - t0) * 1000)
                    return NodeOutput(node_id=node_id, node_type="mysql", status="success", data=rows, metadata={"row_count": len(rows), "rendered_sql": rendered_sql, "elapsed_ms": elapsed_ms, "timeout_sec": timeout_sec})
                elapsed_ms = int((time.perf_counter() - t0) * 1000)
                return NodeOutput(node_id=node_id, node_type="mysql", status="success", data=f"Affected rows: {result.rowcount}", metadata={"rendered_sql": rendered_sql, "elapsed_ms": elapsed_ms, "timeout_sec": timeout_sec})
        finally:
            db_engine.dispose()

    def _execute_log_node(self, node_id: str, config: dict[str, Any], ctx: ExecutionContext) -> NodeOutput:
        content = TemplateRenderer.render(config.get("log_message", ""), ctx.to_template_vars())
        return NodeOutput(node_id=node_id, node_type="log", status="success", data=content)

    def _execute_store_node(self, project_id: int, rule_id: int, node_id: str, config: dict[str, Any], ctx: ExecutionContext) -> NodeOutput:
        template_vars = ctx.to_template_vars()
        scope = TemplateRenderer.render(str(config.get("scope", "rule")), template_vars).strip() or "rule"
        if scope not in {"project", "rule"}:
            raise ValueError(f"invalid store scope: {scope}")
        key = TemplateRenderer.render(config.get("store_key", ""), template_vars)
        value = TemplateRenderer.render(config.get("store_value", ""), template_vars)
        self.storage.store_data(
            project_id=project_id,
            rule_id=rule_id,
            execution_id=ctx.execution_id,
            node_id=node_id,
            scope=scope,
            key=key,
            value=value,
        )
        ctx.store[key] = value
        return NodeOutput(node_id=node_id, node_type="store", status="success", data={"key": key, "value": value})

    def _execute_load_node(self, project_id: int, rule_id: int, node_id: str, config: dict[str, Any], ctx: ExecutionContext) -> NodeOutput:
        template_vars = ctx.to_template_vars()
        scope = TemplateRenderer.render(str(config.get("scope", "rule")), template_vars).strip() or "rule"
        if scope not in {"project", "rule"}:
            raise ValueError(f"invalid load scope: {scope}")
        key = TemplateRenderer.render(config.get("key", ""), template_vars)
        assign_to_raw = config.get("assign_to") or ""
        assign_to = TemplateRenderer.render(assign_to_raw, template_vars).strip() or None
        data = self.storage.read_latest_stored_data(project_id, rule_id, scope, key)
        loaded_value = data.value if data else None
        ctx.store[key] = loaded_value
        if assign_to:
            ctx.vars[assign_to] = loaded_value
        return NodeOutput(node_id=node_id, node_type="load", status="success", data={"key": key, "value": loaded_value, "assign_to": assign_to})

    def _execute_python_node(self, node_id: str, config: dict[str, Any], ctx: ExecutionContext) -> NodeOutput:
        template_vars = ctx.to_template_vars()
        script = TemplateRenderer.render(config.get("script", ""), template_vars)
        timeout_raw = TemplateRenderer.render(str(config.get("timeout_sec", "10")), template_vars).strip()
        timeout_sec = int(timeout_raw) if timeout_raw.isdigit() else 10
        if timeout_sec <= 0:
            raise ValueError("python timeout_sec must be positive")
        local_vars = {"vars": ctx.vars, "store": ctx.store, "nodes": ctx.node_outputs, "result": None}

        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            exec(script, {"__builtins__": {"print": print, "len": len, "str": str, "int": int, "float": float, "dict": dict, "list": list}}, local_vars)

        result_value = local_vars.get("result")
        assign_to_raw = config.get("assign_to") or ""
        assign_to = TemplateRenderer.render(assign_to_raw, template_vars).strip() or None
        if assign_to and result_value is not None:
            ctx.vars[assign_to] = result_value

        output_data = result_value if result_value is not None else stdout.getvalue().strip()
        return NodeOutput(node_id=node_id, node_type="python", status="success", data=output_data)

    def _execute_shell_node(self, node_id: str, config: dict[str, Any], ctx: ExecutionContext) -> NodeOutput:
        template_vars = ctx.to_template_vars()
        command = TemplateRenderer.render(config.get("command", ""), template_vars)
        timeout_raw = TemplateRenderer.render(str(config.get("timeout_sec", "10")), template_vars).strip()
        timeout_sec = int(timeout_raw) if timeout_raw.isdigit() else 10
        workdir_raw = config.get("workdir") or ""
        workdir = TemplateRenderer.render(workdir_raw, template_vars).strip() or None
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
        data = {"stdout": completed.stdout.strip(), "stderr": completed.stderr.strip(), "returncode": completed.returncode}
        if completed.returncode != 0:
            raise RuntimeError(completed.stderr.strip() or f"shell command failed with exit code {completed.returncode}")
        return NodeOutput(node_id=node_id, node_type="shell", status="success", data=data)

    def _execute_redis_node(self, project_id: int, node_id: str, config: dict[str, Any], ctx: ExecutionContext) -> NodeOutput:
        template_vars = ctx.to_template_vars()
        connector_name = config.get("connector")
        if not connector_name:
            raise ValueError("connector is required for redis node")
        connector = self.storage.get_connector_by_name(project_id, connector_name)
        if not connector:
            raise ValueError(f"connector not found: {connector_name}")
        if connector.type != "redis":
            raise ValueError(f"connector type mismatch for redis node: {connector.type}")
        connector_config = json.loads(connector.config_encrypted or "{}")
        dsn = connector_config.get("dsn")
        if not dsn:
            raise ValueError("redis dsn not configured on connector")

        raw_command = config.get("command") or "PING"
        rendered_command = TemplateRenderer.render(raw_command, template_vars)
        parts = shlex.split(rendered_command)
        if not parts:
            raise ValueError("redis command is empty")

        import redis  # type: ignore[import-not-found]

        client = redis.from_url(dsn)
        try:
            result = client.execute_command(*parts)
        finally:
            client.close()

        return NodeOutput(
            node_id=node_id,
            node_type="redis",
            status="success",
            data=result,
            metadata={"command": rendered_command},
        )

