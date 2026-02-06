from __future__ import annotations

from sqlalchemy import Float, Text, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


class ProjectModel(SQLModel, table=True):
    __tablename__ = "projects"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(sa_type=Text, nullable=False, unique=True)
    description: str | None = Field(default=None, sa_type=Text)
    created_at: str | None = Field(default=None, sa_type=Text)
    updated_at: str | None = Field(default=None, sa_type=Text)

    rules: list["RuleModel"] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    globals: list["GlobalVarModel"] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    executions: list["ExecutionModel"] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class RuleModel(SQLModel, table=True):
    __tablename__ = "rules"
    __table_args__ = (UniqueConstraint("project_id", "name", name="uq_rules_project_name"),)

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id", ondelete="CASCADE", nullable=False)
    name: str = Field(sa_type=Text, nullable=False)
    description: str | None = Field(default=None, sa_type=Text)
    created_at: str | None = Field(default=None, sa_type=Text)
    updated_at: str | None = Field(default=None, sa_type=Text)

    project: ProjectModel = Relationship(back_populates="rules")
    nodes: list["NodeModel"] = Relationship(
        back_populates="rule",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    edges: list["EdgeModel"] = Relationship(
        back_populates="rule",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class NodeModel(SQLModel, table=True):
    __tablename__ = "nodes"
    __table_args__ = (UniqueConstraint("rule_id", "node_id", name="uq_nodes_rule_node"),)

    id: int | None = Field(default=None, primary_key=True)
    rule_id: int = Field(foreign_key="rules.id", ondelete="CASCADE", nullable=False)
    node_id: str = Field(sa_type=Text, nullable=False)
    type: str = Field(sa_type=Text, nullable=False)
    position_x: float = Field(sa_type=Float, nullable=False)
    position_y: float = Field(sa_type=Float, nullable=False)
    config: str | None = Field(default=None, sa_type=Text)

    rule: RuleModel = Relationship(back_populates="nodes")


class EdgeModel(SQLModel, table=True):
    __tablename__ = "edges"
    __table_args__ = (
        UniqueConstraint("rule_id", "source_node", "target_node", name="uq_edges_rule_src_dst"),
    )

    id: int | None = Field(default=None, primary_key=True)
    rule_id: int = Field(foreign_key="rules.id", ondelete="CASCADE", nullable=False)
    source_node: str = Field(sa_type=Text, nullable=False)
    target_node: str = Field(sa_type=Text, nullable=False)
    condition: str | None = Field(default=None, sa_type=Text)

    rule: RuleModel = Relationship(back_populates="edges")


class GlobalVarModel(SQLModel, table=True):
    __tablename__ = "global_vars"
    __table_args__ = (
        UniqueConstraint("project_id", "key", name="uq_globals_project_key"),
    )

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id", ondelete="CASCADE", nullable=False)
    key: str = Field(sa_type=Text, nullable=False)
    value: str | None = Field(default=None, sa_type=Text)
    type: str | None = Field(default=None, sa_type=Text)
    description: str | None = Field(default=None, sa_type=Text)
    created_at: str | None = Field(default=None, sa_type=Text)
    updated_at: str | None = Field(default=None, sa_type=Text)

    project: ProjectModel = Relationship(back_populates="globals")


class ExecutionModel(SQLModel, table=True):
    __tablename__ = "executions"

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id", ondelete="CASCADE", nullable=False)
    rule_id: int = Field(foreign_key="rules.id", ondelete="CASCADE", nullable=False)
    execution_id: str = Field(sa_type=Text, nullable=False, unique=True)
    started_at: str | None = Field(default=None, sa_type=Text)
    completed_at: str | None = Field(default=None, sa_type=Text)
    status: str | None = Field(default=None, sa_type=Text)
    variables: str | None = Field(default=None, sa_type=Text)
    result_summary: str | None = Field(default=None, sa_type=Text)

    project: ProjectModel = Relationship(back_populates="executions")


class ExecutionStepModel(SQLModel, table=True):
    __tablename__ = "execution_steps"

    id: int | None = Field(default=None, primary_key=True)
    execution_id: str = Field(foreign_key="executions.execution_id", ondelete="CASCADE", nullable=False)
    node_id: str = Field(sa_type=Text, nullable=False)
    action_type: str | None = Field(default=None, sa_type=Text)
    content: str | None = Field(default=None, sa_type=Text)
    started_at: str | None = Field(default=None, sa_type=Text)
    completed_at: str | None = Field(default=None, sa_type=Text)
    status: str | None = Field(default=None, sa_type=Text)
    output: str | None = Field(default=None, sa_type=Text)


class StoredDataModel(SQLModel, table=True):
    __tablename__ = "stored_data"

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id", ondelete="CASCADE", nullable=False)
    rule_id: int = Field(foreign_key="rules.id", ondelete="CASCADE", nullable=False)
    execution_id: str = Field(foreign_key="executions.execution_id", ondelete="CASCADE", nullable=False)
    node_id: str = Field(sa_type=Text, nullable=False)
    key: str | None = Field(default=None, sa_type=Text)
    value: str | None = Field(default=None, sa_type=Text)
    created_at: str | None = Field(default=None, sa_type=Text)
