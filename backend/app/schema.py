from __future__ import annotations

from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from .db import Base


class RuleModel(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False)
    description = Column(Text)
    created_at = Column(Text)
    updated_at = Column(Text)

    nodes = relationship("NodeModel", cascade="all, delete-orphan", back_populates="rule")
    edges = relationship("EdgeModel", cascade="all, delete-orphan", back_populates="rule")


class NodeModel(Base):
    __tablename__ = "nodes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    rule_id = Column(Integer, ForeignKey("rules.id", ondelete="CASCADE"), nullable=False)
    node_id = Column(Text, nullable=False)
    type = Column(Text, nullable=False)
    position_x = Column(Float, nullable=False)
    position_y = Column(Float, nullable=False)
    config = Column(Text)

    rule = relationship("RuleModel", back_populates="nodes")


class EdgeModel(Base):
    __tablename__ = "edges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    rule_id = Column(Integer, ForeignKey("rules.id", ondelete="CASCADE"), nullable=False)
    source_node = Column(Text, nullable=False)
    target_node = Column(Text, nullable=False)
    condition = Column(Text)

    rule = relationship("RuleModel", back_populates="edges")


class GlobalVarModel(Base):
    __tablename__ = "global_vars"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(Text, nullable=False, unique=True)
    value = Column(Text)
    type = Column(Text)
    description = Column(Text)
    created_at = Column(Text)
    updated_at = Column(Text)


class ExecutionModel(Base):
    __tablename__ = "executions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    rule_id = Column(Integer, ForeignKey("rules.id"))
    execution_id = Column(Text, nullable=False, unique=True)
    started_at = Column(Text)
    completed_at = Column(Text)
    status = Column(Text)
    variables = Column(Text)
    result_summary = Column(Text)


class ExecutionStepModel(Base):
    __tablename__ = "execution_steps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    execution_id = Column(Text, ForeignKey("executions.execution_id", ondelete="CASCADE"), nullable=False)
    node_id = Column(Text, nullable=False)
    action_type = Column(Text)
    content = Column(Text)
    started_at = Column(Text)
    completed_at = Column(Text)
    status = Column(Text)
    output = Column(Text)


class StoredDataModel(Base):
    __tablename__ = "stored_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    execution_id = Column(Text, ForeignKey("executions.execution_id", ondelete="CASCADE"), nullable=False)
    node_id = Column(Text, nullable=False)
    key = Column(Text)
    value = Column(Text)
    created_at = Column(Text)
