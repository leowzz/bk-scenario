from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import select, delete

from .db import SessionLocal
from .schema import (
    RuleModel,
    NodeModel,
    EdgeModel,
    GlobalVarModel,
    ExecutionModel,
    ExecutionStepModel,
    StoredDataModel,
)


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


class Storage:
    def __init__(self):
        self.session = SessionLocal()

    def close(self):
        self.session.close()

    # ===== Rules =====
    def create_rule(self, name: str, description: str) -> RuleModel:
        now = _now_iso()
        rule = RuleModel(name=name, description=description, created_at=now, updated_at=now)
        self.session.add(rule)
        self.session.commit()
        self.session.refresh(rule)
        return rule

    def list_rules(self) -> list[RuleModel]:
        return list(self.session.scalars(select(RuleModel)))

    def get_rule(self, rule_id: int) -> RuleModel | None:
        return self.session.get(RuleModel, rule_id)

    def update_rule(self, rule_id: int, name: str | None, description: str | None) -> RuleModel | None:
        rule = self.get_rule(rule_id)
        if not rule:
            return None
        if name is not None:
            rule.name = name
        if description is not None:
            rule.description = description
        rule.updated_at = _now_iso()
        self.session.commit()
        self.session.refresh(rule)
        return rule

    def delete_rule(self, rule_id: int) -> bool:
        rule = self.get_rule(rule_id)
        if not rule:
            return False
        self.session.delete(rule)
        self.session.commit()
        return True

    # ===== Nodes/Edges =====
    def replace_nodes(self, rule_id: int, nodes: list[dict[str, Any]]):
        self.session.execute(delete(NodeModel).where(NodeModel.rule_id == rule_id))
        for node in nodes:
            self.session.add(
                NodeModel(
                    rule_id=rule_id,
                    node_id=node["node_id"],
                    type=node["type"],
                    position_x=node["position_x"],
                    position_y=node["position_y"],
                    config=json.dumps(node.get("config", {}), ensure_ascii=True),
                )
            )
        self.session.commit()

    def replace_edges(self, rule_id: int, edges: list[dict[str, Any]]):
        self.session.execute(delete(EdgeModel).where(EdgeModel.rule_id == rule_id))
        for edge in edges:
            self.session.add(
                EdgeModel(
                    rule_id=rule_id,
                    source_node=edge["source_node"],
                    target_node=edge["target_node"],
                    condition=edge.get("condition"),
                )
            )
        self.session.commit()

    def list_nodes(self, rule_id: int) -> list[NodeModel]:
        return list(self.session.scalars(select(NodeModel).where(NodeModel.rule_id == rule_id)))

    def list_edges(self, rule_id: int) -> list[EdgeModel]:
        return list(self.session.scalars(select(EdgeModel).where(EdgeModel.rule_id == rule_id)))

    # ===== Global Vars =====
    def list_globals(self) -> list[GlobalVarModel]:
        return list(self.session.scalars(select(GlobalVarModel)))

    def upsert_global(self, key: str, value: str | None, var_type: str | None, description: str | None) -> GlobalVarModel:
        existing = self.session.scalar(select(GlobalVarModel).where(GlobalVarModel.key == key))
        now = _now_iso()
        if existing:
            existing.value = value
            existing.type = var_type
            existing.description = description
            existing.updated_at = now
            self.session.commit()
            self.session.refresh(existing)
            return existing

        record = GlobalVarModel(
            key=key,
            value=value,
            type=var_type,
            description=description,
            created_at=now,
            updated_at=now,
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        return record

    def delete_global(self, key: str) -> bool:
        record = self.session.scalar(select(GlobalVarModel).where(GlobalVarModel.key == key))
        if not record:
            return False
        self.session.delete(record)
        self.session.commit()
        return True

    # ===== Executions =====
    def create_execution(self, rule_id: int, variables: dict[str, Any]) -> ExecutionModel:
        exec_id = f"exec_{int(datetime.utcnow().timestamp() * 1000)}"
        record = ExecutionModel(
            rule_id=rule_id,
            execution_id=exec_id,
            started_at=_now_iso(),
            status="running",
            variables=json.dumps(variables, ensure_ascii=True),
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        return record

    def complete_execution(self, execution_id: str, status: str, summary: str | None):
        record = self.session.scalar(select(ExecutionModel).where(ExecutionModel.execution_id == execution_id))
        if not record:
            return
        record.completed_at = _now_iso()
        record.status = status
        record.result_summary = summary
        self.session.commit()

    def list_executions(self, rule_id: int) -> list[ExecutionModel]:
        return list(self.session.scalars(select(ExecutionModel).where(ExecutionModel.rule_id == rule_id)))

    def get_execution(self, execution_id: str) -> ExecutionModel | None:
        return self.session.scalar(select(ExecutionModel).where(ExecutionModel.execution_id == execution_id))

    def add_step(self, execution_id: str, node_id: str, action_type: str, content: str) -> ExecutionStepModel:
        step = ExecutionStepModel(
            execution_id=execution_id,
            node_id=node_id,
            action_type=action_type,
            content=content,
            started_at=_now_iso(),
            status="running",
        )
        self.session.add(step)
        self.session.commit()
        self.session.refresh(step)
        return step

    def complete_step(self, step_id: int, status: str, output: str | None):
        step = self.session.get(ExecutionStepModel, step_id)
        if not step:
            return
        step.completed_at = _now_iso()
        step.status = status
        step.output = output
        self.session.commit()

    def list_steps(self, execution_id: str) -> list[ExecutionStepModel]:
        return list(self.session.scalars(select(ExecutionStepModel).where(ExecutionStepModel.execution_id == execution_id)))

    def store_data(self, execution_id: str, node_id: str, key: str | None, value: str | None):
        record = StoredDataModel(
            execution_id=execution_id,
            node_id=node_id,
            key=key,
            value=value,
            created_at=_now_iso(),
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        return record

    def list_stored_data(self, execution_id: str) -> list[StoredDataModel]:
        return list(self.session.scalars(select(StoredDataModel).where(StoredDataModel.execution_id == execution_id)))
