from __future__ import annotations

import json
from typing import Any

from .template import TemplateRenderer
from .storage import Storage


class RuleEngine:
    def __init__(self, storage: Storage):
        self.storage = storage

    def execute_rule(self, rule_id: int, variables: dict[str, Any]) -> dict[str, Any]:
        execution = self.storage.create_execution(rule_id, variables)
        try:
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
                    content = TemplateRenderer.render_sql(config.get("sql", ""), variables)
                    step = self.storage.add_step(execution.execution_id, node_id, action_type, content)
                    self.storage.complete_step(step.id, "completed", content)
                elif action_type == "log":
                    content = TemplateRenderer.render(config.get("log_message", ""), variables)
                    step = self.storage.add_step(execution.execution_id, node_id, action_type, content)
                    self.storage.complete_step(step.id, "completed", content)
                elif action_type == "store":
                    key = TemplateRenderer.render(config.get("store_key", ""), variables)
                    value = TemplateRenderer.render(config.get("store_value", ""), variables)
                    step = self.storage.add_step(execution.execution_id, node_id, action_type, f"{key}={value}")
                    self.storage.store_data(execution.execution_id, node_id, key, value)
                    self.storage.complete_step(step.id, "completed", "stored")
                else:
                    step = self.storage.add_step(execution.execution_id, node_id, action_type, "")
                    self.storage.complete_step(step.id, "skipped", "unknown action")

            self.storage.complete_execution(execution.execution_id, "completed", "ok")
            return {"execution_id": execution.execution_id, "status": "completed"}
        except Exception as exc:
            self.storage.complete_execution(execution.execution_id, "failed", str(exc))
            return {"execution_id": execution.execution_id, "status": "failed", "error": str(exc)}

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
