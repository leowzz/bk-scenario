from __future__ import annotations

import sys
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine, select
from sqlalchemy.pool import StaticPool

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.schema import (
    EdgeModel,
    ExecutionModel,
    ExecutionStepModel,
    GlobalVarModel,
    NodeModel,
    ProjectModel,
    RuleModel,
    StoredDataModel,
)


def _build_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    return Session(engine)


def test_project_rule_node_edge_relationships_work_without_foreign_keys():
    with _build_session() as session:
        project = ProjectModel(name="p1")
        session.add(project)
        session.commit()
        session.refresh(project)

        rule = RuleModel(project_id=project.id, name="r1")
        session.add(rule)
        session.commit()
        session.refresh(rule)

        node = NodeModel(rule_id=rule.id, node_id="n1", type="sql", position_x=1.0, position_y=2.0, config="{}")
        edge = EdgeModel(rule_id=rule.id, source_node="n1", target_node="n2")
        gvar = GlobalVarModel(project_id=project.id, key="k1", value="v1")
        session.add(node)
        session.add(edge)
        session.add(gvar)
        session.commit()

        loaded_project = session.exec(select(ProjectModel).where(ProjectModel.id == project.id)).one()
        loaded_rule = session.exec(select(RuleModel).where(RuleModel.id == rule.id)).one()
        loaded_node = session.exec(select(NodeModel).where(NodeModel.id == node.id)).one()
        loaded_edge = session.exec(select(EdgeModel).where(EdgeModel.id == edge.id)).one()
        loaded_global = session.exec(select(GlobalVarModel).where(GlobalVarModel.id == gvar.id)).one()

        assert len(loaded_project.rules) == 1
        assert loaded_project.rules[0].id == rule.id
        assert len(loaded_project.globals) == 1
        assert loaded_project.globals[0].id == gvar.id
        assert loaded_rule.project is not None and loaded_rule.project.id == project.id
        assert len(loaded_rule.nodes) == 1 and loaded_rule.nodes[0].id == node.id
        assert len(loaded_rule.edges) == 1 and loaded_rule.edges[0].id == edge.id
        assert loaded_node.rule is not None and loaded_node.rule.id == rule.id
        assert loaded_edge.rule is not None and loaded_edge.rule.id == rule.id
        assert loaded_global.project is not None and loaded_global.project.id == project.id


def test_execution_relationships_work_without_foreign_keys():
    with _build_session() as session:
        project = ProjectModel(name="p2")
        session.add(project)
        session.commit()
        session.refresh(project)

        rule = RuleModel(project_id=project.id, name="r2")
        session.add(rule)
        session.commit()
        session.refresh(rule)

        execution = ExecutionModel(project_id=project.id, rule_id=rule.id, execution_id="exec_1", status="running")
        session.add(execution)
        session.commit()
        session.refresh(execution)

        step = ExecutionStepModel(execution_id="exec_1", node_id="n1", action_type="sql")
        stored = StoredDataModel(project_id=project.id, rule_id=rule.id, execution_id="exec_1", node_id="n1")
        session.add(step)
        session.add(stored)
        session.commit()

        loaded_execution = session.exec(select(ExecutionModel).where(ExecutionModel.id == execution.id)).one()
        loaded_step = session.exec(select(ExecutionStepModel).where(ExecutionStepModel.id == step.id)).one()
        loaded_stored = session.exec(select(StoredDataModel).where(StoredDataModel.id == stored.id)).one()

        assert loaded_execution.project is not None and loaded_execution.project.id == project.id
        assert loaded_execution.rule is not None and loaded_execution.rule.id == rule.id
        assert len(loaded_execution.steps) == 1 and loaded_execution.steps[0].id == step.id
        assert len(loaded_execution.stored_data) == 1 and loaded_execution.stored_data[0].id == stored.id
        assert loaded_step.execution is not None and loaded_step.execution.execution_id == execution.execution_id
        assert loaded_stored.execution is not None and loaded_stored.execution.execution_id == execution.execution_id
        assert loaded_stored.rule is not None and loaded_stored.rule.id == rule.id
        assert loaded_stored.project is not None and loaded_stored.project.id == project.id
