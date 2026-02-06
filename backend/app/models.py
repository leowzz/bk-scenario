from pydantic import BaseModel
from typing import Any, Optional, List
from enum import Enum


class NodeType(str, Enum):
    SQL = "sql"
    LOG = "log"
    STORE = "store"


class NodeConfig(BaseModel):
    sql: Optional[str] = None
    log_message: Optional[str] = None
    store_key: Optional[str] = None
    store_value: Optional[str] = None


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


class RuleCreate(BaseModel):
    name: str
    description: str = ""


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class Rule(BaseModel):
    id: int
    name: str
    description: str
    created_at: str
    updated_at: str
    nodes: List[Node] = []
    edges: List[Edge] = []


class GlobalVar(BaseModel):
    key: str
    value: Optional[str] = None
    type: Optional[str] = "string"
    description: Optional[str] = None


class ExecutionRequest(BaseModel):
    rule_id: int
    variables: dict[str, Any] = {}


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
    rule_id: int
    execution_id: str
    started_at: str
    completed_at: Optional[str] = None
    status: str
    variables: dict[str, Any]
    result_summary: Optional[str] = None
    steps: List[ExecutionStep] = []
