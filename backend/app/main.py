from __future__ import annotations

import json
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .db import Base, get_engine
from .models import RuleCreate, RuleUpdate, Rule, Node, Edge, GlobalVar, ExecutionRequest
from .storage import Storage
from .engine import RuleEngine


app = FastAPI(title="DB Scenario Pro", version="0.1.0")

# Static (optional for split frontend/backend)
_static_dir = Path(__file__).resolve().parent.parent / "frontend"
if _static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


@app.on_event("startup")
def on_startup():
    engine = get_engine()
    Base.metadata.create_all(bind=engine)


@app.get("/")
async def index():
    index_path = _static_dir / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"status": "ok"}


@app.post("/api/rules", response_model=Rule)
async def create_rule(req: RuleCreate):
    storage = Storage()
    try:
        rule = storage.create_rule(req.name, req.description)
        return Rule(id=rule.id, name=rule.name, description=rule.description or "", created_at=rule.created_at, updated_at=rule.updated_at)
    finally:
        storage.close()


@app.get("/api/rules", response_model=list[Rule])
async def list_rules():
    storage = Storage()
    try:
        rules = storage.list_rules()
        return [Rule(id=r.id, name=r.name, description=r.description or "", created_at=r.created_at, updated_at=r.updated_at) for r in rules]
    finally:
        storage.close()


@app.get("/api/rules/{rule_id}", response_model=Rule)
async def get_rule(rule_id: int):
    storage = Storage()
    try:
        rule = storage.get_rule(rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        nodes = storage.list_nodes(rule_id)
        edges = storage.list_edges(rule_id)
        return Rule(
            id=rule.id,
            name=rule.name,
            description=rule.description or "",
            created_at=rule.created_at,
            updated_at=rule.updated_at,
            nodes=[
                Node(
                    id=n.node_id,
                    rule_id=n.rule_id,
                    type=n.type,
                    position_x=n.position_x,
                    position_y=n.position_y,
                    config=json.loads(n.config or "{}"),
                )
                for n in nodes
            ],
            edges=[
                Edge(id=e.id, rule_id=e.rule_id, source_node=e.source_node, target_node=e.target_node, condition=e.condition)
                for e in edges
            ],
        )
    finally:
        storage.close()


@app.put("/api/rules/{rule_id}", response_model=Rule)
async def update_rule(rule_id: int, req: RuleUpdate):
    storage = Storage()
    try:
        rule = storage.update_rule(rule_id, req.name, req.description)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        return Rule(id=rule.id, name=rule.name, description=rule.description or "", created_at=rule.created_at, updated_at=rule.updated_at)
    finally:
        storage.close()


@app.delete("/api/rules/{rule_id}")
async def delete_rule(rule_id: int):
    storage = Storage()
    try:
        ok = storage.delete_rule(rule_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {"deleted": True}
    finally:
        storage.close()


@app.put("/api/rules/{rule_id}/graph")
async def replace_rule_graph(rule_id: int, payload: dict):
    storage = Storage()
    try:
        rule = storage.get_rule(rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        nodes = payload.get("nodes", [])
        edges = payload.get("edges", [])
        storage.replace_nodes(rule_id, nodes)
        storage.replace_edges(rule_id, edges)
        return {"updated": True}
    finally:
        storage.close()


@app.get("/api/globals", response_model=list[GlobalVar])
async def list_globals():
    storage = Storage()
    try:
        records = storage.list_globals()
        return [GlobalVar(key=r.key, value=r.value, type=r.type, description=r.description) for r in records]
    finally:
        storage.close()


@app.post("/api/globals", response_model=GlobalVar)
async def upsert_global(req: GlobalVar):
    storage = Storage()
    try:
        record = storage.upsert_global(req.key, req.value, req.type, req.description)
        return GlobalVar(key=record.key, value=record.value, type=record.type, description=record.description)
    finally:
        storage.close()


@app.delete("/api/globals/{key}")
async def delete_global(key: str):
    storage = Storage()
    try:
        ok = storage.delete_global(key)
        if not ok:
            raise HTTPException(status_code=404, detail="Global not found")
        return {"deleted": True}
    finally:
        storage.close()


@app.post("/api/execute")
async def execute_rule(req: ExecutionRequest):
    storage = Storage()
    try:
        rule = storage.get_rule(req.rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        engine = RuleEngine(storage)
        return engine.execute_rule(req.rule_id, req.variables)
    finally:
        storage.close()


@app.get("/api/executions/{rule_id}")
async def list_executions(rule_id: int):
    storage = Storage()
    try:
        records = storage.list_executions(rule_id)
        return [
            {
                "execution_id": r.execution_id,
                "started_at": r.started_at,
                "completed_at": r.completed_at,
                "status": r.status,
                "variables": json.loads(r.variables or "{}")} for r in records
        ]
    finally:
        storage.close()


@app.get("/api/execution/{execution_id}")
async def get_execution(execution_id: str):
    storage = Storage()
    try:
        record = storage.get_execution(execution_id)
        if not record:
            raise HTTPException(status_code=404, detail="Execution not found")
        steps = storage.list_steps(execution_id)
        stored = storage.list_stored_data(execution_id)
        return {
            "execution_id": record.execution_id,
            "rule_id": record.rule_id,
            "started_at": record.started_at,
            "completed_at": record.completed_at,
            "status": record.status,
            "variables": json.loads(record.variables or "{}"),
            "steps": [
                {
                    "node_id": s.node_id,
                    "action_type": s.action_type,
                    "content": s.content,
                    "status": s.status,
                    "output": s.output,
                    "started_at": s.started_at,
                    "completed_at": s.completed_at,
                }
                for s in steps
            ],
            "stored": [
                {
                    "node_id": d.node_id,
                    "key": d.key,
                    "value": d.value,
                    "created_at": d.created_at,
                }
                for d in stored
            ],
        }
    finally:
        storage.close()
