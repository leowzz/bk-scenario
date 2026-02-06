from typing import List, Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


class ProjectModel(SQLModel, table=True):
    __tablename__ = "projects"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(nullable=False, unique=True)
    description: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    rules: List["RuleModel"] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={
            "primaryjoin": "ProjectModel.id == foreign(RuleModel.project_id)",
            "cascade": "all, delete-orphan",
        },
    )
    globals: List["GlobalVarModel"] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={
            "primaryjoin": "ProjectModel.id == foreign(GlobalVarModel.project_id)",
            "cascade": "all, delete-orphan",
        },
    )
    executions: List["ExecutionModel"] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={
            "primaryjoin": "ProjectModel.id == foreign(ExecutionModel.project_id)",
            "cascade": "all, delete-orphan",
        },
    )


class RuleModel(SQLModel, table=True):
    __tablename__ = "rules"
    __table_args__ = (UniqueConstraint("project_id", "name", name="uq_rules_project_name"),)

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(nullable=False)
    name: str = Field(nullable=False)
    description: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    project: Optional[ProjectModel] = Relationship(
        back_populates="rules",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(RuleModel.project_id) == ProjectModel.id",
            "foreign_keys": "RuleModel.project_id",
        },
    )
    nodes: List["NodeModel"] = Relationship(
        back_populates="rule",
        sa_relationship_kwargs={
            "primaryjoin": "RuleModel.id == foreign(NodeModel.rule_id)",
            "cascade": "all, delete-orphan",
        },
    )
    edges: List["EdgeModel"] = Relationship(
        back_populates="rule",
        sa_relationship_kwargs={
            "primaryjoin": "RuleModel.id == foreign(EdgeModel.rule_id)",
            "cascade": "all, delete-orphan",
        },
    )
    executions: List["ExecutionModel"] = Relationship(
        back_populates="rule",
        sa_relationship_kwargs={
            "primaryjoin": "RuleModel.id == foreign(ExecutionModel.rule_id)",
        },
    )
    stored_data: List["StoredDataModel"] = Relationship(
        back_populates="rule",
        sa_relationship_kwargs={
            "primaryjoin": "RuleModel.id == foreign(StoredDataModel.rule_id)",
        },
    )


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
    rule: Optional[RuleModel] = Relationship(
        back_populates="nodes",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(NodeModel.rule_id) == RuleModel.id",
            "foreign_keys": "NodeModel.rule_id",
        },
    )


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
    rule: Optional[RuleModel] = Relationship(
        back_populates="edges",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(EdgeModel.rule_id) == RuleModel.id",
            "foreign_keys": "EdgeModel.rule_id",
        },
    )


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
    project: Optional[ProjectModel] = Relationship(
        back_populates="globals",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(GlobalVarModel.project_id) == ProjectModel.id",
            "foreign_keys": "GlobalVarModel.project_id",
        },
    )


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
    project: Optional[ProjectModel] = Relationship(
        back_populates="executions",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(ExecutionModel.project_id) == ProjectModel.id",
            "foreign_keys": "ExecutionModel.project_id",
        },
    )
    rule: Optional[RuleModel] = Relationship(
        back_populates="executions",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(ExecutionModel.rule_id) == RuleModel.id",
            "foreign_keys": "ExecutionModel.rule_id",
        },
    )
    steps: List["ExecutionStepModel"] = Relationship(
        back_populates="execution",
        sa_relationship_kwargs={
            "primaryjoin": "ExecutionModel.execution_id == foreign(ExecutionStepModel.execution_id)",
            "cascade": "all, delete-orphan",
        },
    )
    stored_data: List["StoredDataModel"] = Relationship(
        back_populates="execution",
        sa_relationship_kwargs={
            "primaryjoin": "ExecutionModel.execution_id == foreign(StoredDataModel.execution_id)",
        },
    )


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
    execution: Optional[ExecutionModel] = Relationship(
        back_populates="steps",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(ExecutionStepModel.execution_id) == ExecutionModel.execution_id",
            "foreign_keys": "ExecutionStepModel.execution_id",
        },
    )


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
    project: Optional[ProjectModel] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "foreign(StoredDataModel.project_id) == ProjectModel.id",
            "foreign_keys": "StoredDataModel.project_id",
        },
    )
    rule: Optional[RuleModel] = Relationship(
        back_populates="stored_data",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(StoredDataModel.rule_id) == RuleModel.id",
            "foreign_keys": "StoredDataModel.rule_id",
        },
    )
    execution: Optional[ExecutionModel] = Relationship(
        back_populates="stored_data",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(StoredDataModel.execution_id) == ExecutionModel.execution_id",
            "foreign_keys": "StoredDataModel.execution_id",
        },
    )
