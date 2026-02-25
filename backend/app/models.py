from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel


class NodeType(str, Enum):
    SQL = "sql"
    LOG = "log"
    STORE = "store"
    LOAD = "load"
    PYTHON = "python"
    SHELL = "shell"


class NodeConfig(BaseModel):
    sql: Optional[str] = None
    log_message: Optional[str] = None
    script: Optional[str] = None
    command: Optional[str] = None
    connector: Optional[str] = None
    timeout_sec: Optional[int] = None
    scope: Optional[str] = "rule"
    assign_to: Optional[str] = None
    store_key: Optional[str] = None
    store_value: Optional[str] = None


class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class Project(BaseModel):
    id: int
    name: str
    description: str
    created_at: str
    updated_at: str


class RuleCreate(BaseModel):
    name: str
    description: str = ""


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class Node(BaseModel):
    id: str
    rule_id: int
    type: NodeType
    position_x: float
    position_y: float
    config: NodeConfig


class Edge(BaseModel):
    id: int
    rule_id: int
    source_node: str
    target_node: str
    condition: Optional[str] = None


class Rule(BaseModel):
    id: int
    project_id: int
    name: str
    description: str
    created_at: str
    updated_at: str
    nodes: List[Node] = []
    edges: List[Edge] = []


class GlobalVar(BaseModel):
    project_id: int
    key: str
    value: Optional[str] = None
    type: Optional[str] = "string"
    description: Optional[str] = None


class GlobalVarUpsert(BaseModel):
    key: str
    value: Optional[str] = None
    type: Optional[str] = "string"
    description: Optional[str] = None


class ExecutionRequest(BaseModel):
    project_id: int
    rule_id: int
    variables: dict[str, Any] = {}


class ConnectorCreate(BaseModel):
    name: str
    type: str
    config: dict[str, Any] = {}


class ConnectorUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[dict[str, Any]] = None


class Connector(BaseModel):
    id: int
    project_id: int
    name: str
    type: str
    created_at: str
    updated_at: str


class DataWriteRequest(BaseModel):
    project_id: int
    rule_id: int
    execution_id: Optional[str] = "manual"
    node_id: Optional[str] = "manual"
    scope: str = "rule"
    key: str
    value: Any


class DataReadRequest(BaseModel):
    project_id: int
    rule_id: int
    scope: str = "rule"
    key: str


class ExecutionStep(BaseModel):
    id: int
    execution_id: str
    node_id: str
    action_type: str
    content: str
    started_at: str
    completed_at: Optional[str] = None
    status: str
    output: Optional[str] = None


class Execution(BaseModel):
    id: int
    project_id: int
    rule_id: int
    execution_id: str
    started_at: str
    completed_at: Optional[str] = None
    status: str
    variables: dict[str, Any]
    result_summary: Optional[str] = None
    steps: List[ExecutionStep] = []
