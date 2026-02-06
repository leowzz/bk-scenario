from __future__ import annotations

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class ProjectModel(SQLModel, table=True):
    __tablename__ = "projects"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(nullable=False, unique=True)
    description: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class RuleModel(SQLModel, table=True):
    __tablename__ = "rules"
    __table_args__ = (UniqueConstraint("project_id", "name", name="uq_rules_project_name"),)

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(nullable=False)
    name: str = Field(nullable=False)
    description: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class NodeModel(SQLModel, table=True):
    __tablename__ = "nodes"
    __table_args__ = (UniqueConstraint("rule_id", "node_id", name="uq_nodes_rule_node"),)

    id: int | None = Field(default=None, primary_key=True)
    rule_id: int = Field(nullable=False)
    node_id: str = Field(nullable=False)
    type: str = Field(nullable=False)
    position_x: float = Field(nullable=False)
    position_y: float = Field(nullable=False)
    config: str | None = None


class EdgeModel(SQLModel, table=True):
    __tablename__ = "edges"
    __table_args__ = (
        UniqueConstraint("rule_id", "source_node", "target_node", name="uq_edges_rule_src_dst"),
    )

    id: int | None = Field(default=None, primary_key=True)
    rule_id: int = Field(nullable=False)
    source_node: str = Field(nullable=False)
    target_node: str = Field(nullable=False)
    condition: str | None = None


class GlobalVarModel(SQLModel, table=True):
    __tablename__ = "global_vars"
    __table_args__ = (
        UniqueConstraint("project_id", "key", name="uq_globals_project_key"),
    )

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(nullable=False)
    key: str = Field(nullable=False)
    value: str | None = None
    type: str | None = None
    description: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class ExecutionModel(SQLModel, table=True):
    __tablename__ = "executions"

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(nullable=False)
    rule_id: int = Field(nullable=False)
    execution_id: str = Field(nullable=False, unique=True)
    started_at: str | None = None
    completed_at: str | None = None
    status: str | None = None
    variables: str | None = None
    result_summary: str | None = None


class ExecutionStepModel(SQLModel, table=True):
    __tablename__ = "execution_steps"

    id: int | None = Field(default=None, primary_key=True)
    execution_id: str = Field(nullable=False)
    node_id: str = Field(nullable=False)
    action_type: str | None = None
    content: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    status: str | None = None
    output: str | None = None


class StoredDataModel(SQLModel, table=True):
    __tablename__ = "stored_data"

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(nullable=False)
    rule_id: int = Field(nullable=False)
    execution_id: str = Field(nullable=False)
    node_id: str = Field(nullable=False)
    key: str | None = None
    value: str | None = None
    created_at: str | None = None
