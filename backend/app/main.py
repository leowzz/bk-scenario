from __future__ import annotations

import json
from time import perf_counter
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from loguru import logger
from sqlmodel import SQLModel

from .db import get_engine
from .engine import RuleEngine
from .logger import configure_logging
from .models import (
    Edge,
    GlobalVar,
    GlobalVarUpsert,
    Node,
    Project,
    ProjectCreate,
    ProjectUpdate,
    Rule,
    RuleCreate,
    RuleUpdate,
)
from .storage import Storage
from .template import TemplateRenderer


app = FastAPI(title="DB Scenario Pro", version="0.2.0")

_static_dir = Path(__file__).resolve().parent.parent / "frontend"
if _static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


def _to_project(model) -> Project:
    return Project(
        id=model.id,
        name=model.name,
        description=model.description or "",
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def _to_rule(model, nodes=None, edges=None) -> Rule:
    return Rule(
        id=model.id,
        project_id=model.project_id,
        name=model.name,
        description=model.description or "",
        created_at=model.created_at,
        updated_at=model.updated_at,
        nodes=nodes or [],
        edges=edges or [],
    )


def _to_node(model) -> Node:
    return Node(
        id=model.node_id,
        rule_id=model.rule_id,
        type=model.type,
        position_x=model.position_x,
        position_y=model.position_y,
        config=json.loads(model.config or "{}"),
    )


def _to_edge(model) -> Edge:
    return Edge(
        id=model.id,
        rule_id=model.rule_id,
        source_node=model.source_node,
        target_node=model.target_node,
        condition=model.condition,
    )


def _get_default_project_id(storage: Storage) -> int:
    return storage.ensure_default_project().id


@app.on_event("startup")
def on_startup():
    configure_logging()
    engine = get_engine()
    SQLModel.metadata.create_all(bind=engine)
    storage = Storage()
    try:
        default_project = storage.ensure_default_project()
        logger.info("startup completed, default project id={}", default_project.id)
    finally:
        storage.close()


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (perf_counter() - start) * 1000
        logger.exception("request failed method={} path={} duration_ms={:.2f}", request.method, request.url.path, duration_ms)
        raise
    duration_ms = (perf_counter() - start) * 1000
    logger.info(
        "request method={} path={} status={} duration_ms={:.2f}",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.get("/")
async def index():
    index_path = _static_dir / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"status": "ok"}


# ===== Projects =====
@app.post("/api/projects", response_model=Project)
async def create_project(req: ProjectCreate):
    storage = Storage()
    try:
        existing = storage.get_project_by_name(req.name)
        if existing:
            raise HTTPException(status_code=409, detail="Project already exists")
        return _to_project(storage.create_project(req.name, req.description))
    finally:
        storage.close()


@app.get("/api/projects", response_model=list[Project])
async def list_projects():
    storage = Storage()
    try:
        return [_to_project(p) for p in storage.list_projects()]
    finally:
        storage.close()


@app.get("/api/projects/{project_id}", response_model=Project)
async def get_project(project_id: int):
    storage = Storage()
    try:
        project = storage.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return _to_project(project)
    finally:
        storage.close()


@app.put("/api/projects/{project_id}", response_model=Project)
async def update_project(project_id: int, req: ProjectUpdate):
    storage = Storage()
    try:
        project = storage.update_project(project_id, req.name, req.description)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return _to_project(project)
    finally:
        storage.close()


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: int):
    storage = Storage()
    try:
        ok = storage.delete_project(project_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Project not found")
        return {"deleted": True}
    finally:
        storage.close()


# ===== Project-scoped Rules =====
@app.post("/api/projects/{project_id}/rules", response_model=Rule)
async def create_rule(project_id: int, req: RuleCreate):
    storage = Storage()
    try:
        if not storage.get_project(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        return _to_rule(storage.create_rule(project_id, req.name, req.description))
    finally:
        storage.close()


@app.get("/api/projects/{project_id}/rules", response_model=list[Rule])
async def list_rules(project_id: int):
    storage = Storage()
    try:
        if not storage.get_project(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        return [_to_rule(r) for r in storage.list_rules(project_id)]
    finally:
        storage.close()


@app.get("/api/projects/{project_id}/rules/{rule_id}", response_model=Rule)
async def get_rule(project_id: int, rule_id: int):
    storage = Storage()
    try:
        rule = storage.get_rule(project_id, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        nodes = [_to_node(n) for n in storage.list_nodes(rule_id)]
        edges = [_to_edge(e) for e in storage.list_edges(rule_id)]
        return _to_rule(rule, nodes=nodes, edges=edges)
    finally:
        storage.close()


@app.put("/api/projects/{project_id}/rules/{rule_id}", response_model=Rule)
async def update_rule(project_id: int, rule_id: int, req: RuleUpdate):
    storage = Storage()
    try:
        rule = storage.update_rule(project_id, rule_id, req.name, req.description)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        return _to_rule(rule)
    finally:
        storage.close()


@app.delete("/api/projects/{project_id}/rules/{rule_id}")
async def delete_rule(project_id: int, rule_id: int):
    storage = Storage()
    try:
        ok = storage.delete_rule(project_id, rule_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {"deleted": True}
    finally:
        storage.close()


@app.put("/api/projects/{project_id}/rules/{rule_id}/graph")
async def replace_rule_graph(project_id: int, rule_id: int, payload: dict[str, Any]):
    storage = Storage()
    try:
        rule = storage.get_rule(project_id, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        storage.replace_nodes(rule_id, payload.get("nodes", []))
        storage.replace_edges(rule_id, payload.get("edges", []))
        return {"updated": True}
    finally:
        storage.close()


# ===== Project-scoped Globals =====
@app.get("/api/projects/{project_id}/globals", response_model=list[GlobalVar])
async def list_globals(project_id: int):
    storage = Storage()
    try:
        if not storage.get_project(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        records = storage.list_globals(project_id)
        return [GlobalVar(project_id=r.project_id, key=r.key, value=r.value, type=r.type, description=r.description) for r in records]
    finally:
        storage.close()


@app.post("/api/projects/{project_id}/globals", response_model=GlobalVar)
async def upsert_global(project_id: int, req: GlobalVarUpsert):
    storage = Storage()
    try:
        if not storage.get_project(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        record = storage.upsert_global(project_id, req.key, req.value, req.type, req.description)
        return GlobalVar(
            project_id=record.project_id,
            key=record.key,
            value=record.value,
            type=record.type,
            description=record.description,
        )
    finally:
        storage.close()


@app.delete("/api/projects/{project_id}/globals/{key}")
async def delete_global(project_id: int, key: str):
    storage = Storage()
    try:
        ok = storage.delete_global(project_id, key)
        if not ok:
            raise HTTPException(status_code=404, detail="Global not found")
        return {"deleted": True}
    finally:
        storage.close()


# ===== Execute =====
@app.post("/api/execute")
async def execute_rule(payload: dict[str, Any]):
    storage = Storage()
    try:
        project_id = payload.get("project_id")
        if project_id is None:
            project_id = _get_default_project_id(storage)
        rule_id = payload.get("rule_id")
        variables = payload.get("variables", {})

        if rule_id is None:
            raise HTTPException(status_code=422, detail="rule_id is required")
        if not isinstance(variables, dict):
            raise HTTPException(status_code=422, detail="variables must be object")

        rule = storage.get_rule(project_id, int(rule_id))
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found in project")
        engine = RuleEngine(storage)
        return engine.execute_rule(project_id, int(rule_id), variables)
    finally:
        storage.close()


@app.post("/api/node-test")
async def test_node(payload: dict[str, Any]):
    node = payload.get("node")
    variables = payload.get("variables", {})

    if not isinstance(node, dict):
        raise HTTPException(status_code=422, detail="node must be object")
    if not isinstance(variables, dict):
        raise HTTPException(status_code=422, detail="variables must be object")

    action_type = node.get("type")
    config = node.get("config") or {}
    if not isinstance(config, dict):
        raise HTTPException(status_code=422, detail="node.config must be object")

    if action_type == "sql":
        rendered = TemplateRenderer.render_sql(str(config.get("sql", "")), variables)
        return {
            "status": "completed",
            "action_type": action_type,
            "content": rendered,
            "output": rendered,
        }
    if action_type == "log":
        rendered = TemplateRenderer.render(str(config.get("log_message", "")), variables)
        return {
            "status": "completed",
            "action_type": action_type,
            "content": rendered,
            "output": rendered,
        }
    if action_type == "store":
        key = TemplateRenderer.render(str(config.get("store_key", "")), variables)
        value = TemplateRenderer.render(str(config.get("store_value", "")), variables)
        return {
            "status": "completed",
            "action_type": action_type,
            "content": f"{key}={value}",
            "output": {"key": key, "value": value},
        }

    return {
        "status": "failed",
        "action_type": str(action_type),
        "error": f"unsupported node type: {action_type}",
    }


@app.get("/api/projects/{project_id}/executions/{rule_id}")
async def list_executions(project_id: int, rule_id: int):
    storage = Storage()
    try:
        records = storage.list_executions(project_id, rule_id)
        return [
            {
                "execution_id": r.execution_id,
                "project_id": r.project_id,
                "rule_id": r.rule_id,
                "started_at": r.started_at,
                "completed_at": r.completed_at,
                "status": r.status,
                "variables": json.loads(r.variables or "{}"),
                "result_summary": r.result_summary,
            }
            for r in records
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
        execution_error = record.result_summary if record.status == "failed" else None
        return {
            "execution_id": record.execution_id,
            "project_id": record.project_id,
            "rule_id": record.rule_id,
            "started_at": record.started_at,
            "completed_at": record.completed_at,
            "status": record.status,
            "variables": json.loads(record.variables or "{}"),
            "result_summary": record.result_summary,
            "error": execution_error,
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
                    "project_id": d.project_id,
                    "rule_id": d.rule_id,
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


# ===== Compatibility APIs for existing frontend =====
@app.post("/api/rules", response_model=Rule)
async def compat_create_rule(req: RuleCreate):
    storage = Storage()
    try:
        project_id = _get_default_project_id(storage)
        return _to_rule(storage.create_rule(project_id, req.name, req.description))
    finally:
        storage.close()


@app.get("/api/rules", response_model=list[Rule])
async def compat_list_rules():
    storage = Storage()
    try:
        project_id = _get_default_project_id(storage)
        return [_to_rule(r) for r in storage.list_rules(project_id)]
    finally:
        storage.close()


@app.get("/api/rules/{rule_id}", response_model=Rule)
async def compat_get_rule(rule_id: int):
    storage = Storage()
    try:
        project_id = _get_default_project_id(storage)
        rule = storage.get_rule(project_id, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        nodes = [_to_node(n) for n in storage.list_nodes(rule_id)]
        edges = [_to_edge(e) for e in storage.list_edges(rule_id)]
        return _to_rule(rule, nodes=nodes, edges=edges)
    finally:
        storage.close()


@app.put("/api/rules/{rule_id}", response_model=Rule)
async def compat_update_rule(rule_id: int, req: RuleUpdate):
    storage = Storage()
    try:
        project_id = _get_default_project_id(storage)
        rule = storage.update_rule(project_id, rule_id, req.name, req.description)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        return _to_rule(rule)
    finally:
        storage.close()


@app.delete("/api/rules/{rule_id}")
async def compat_delete_rule(rule_id: int):
    storage = Storage()
    try:
        project_id = _get_default_project_id(storage)
        ok = storage.delete_rule(project_id, rule_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {"deleted": True}
    finally:
        storage.close()


@app.put("/api/rules/{rule_id}/graph")
async def compat_replace_rule_graph(rule_id: int, payload: dict[str, Any]):
    storage = Storage()
    try:
        project_id = _get_default_project_id(storage)
        rule = storage.get_rule(project_id, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        storage.replace_nodes(rule_id, payload.get("nodes", []))
        storage.replace_edges(rule_id, payload.get("edges", []))
        return {"updated": True}
    finally:
        storage.close()


@app.get("/api/globals", response_model=list[GlobalVar])
async def compat_list_globals():
    storage = Storage()
    try:
        project_id = _get_default_project_id(storage)
        records = storage.list_globals(project_id)
        return [GlobalVar(project_id=r.project_id, key=r.key, value=r.value, type=r.type, description=r.description) for r in records]
    finally:
        storage.close()


@app.post("/api/globals", response_model=GlobalVar)
async def compat_upsert_global(req: GlobalVarUpsert):
    storage = Storage()
    try:
        project_id = _get_default_project_id(storage)
        record = storage.upsert_global(project_id, req.key, req.value, req.type, req.description)
        return GlobalVar(
            project_id=record.project_id,
            key=record.key,
            value=record.value,
            type=record.type,
            description=record.description,
        )
    finally:
        storage.close()


@app.delete("/api/globals/{key}")
async def compat_delete_global(key: str):
    storage = Storage()
    try:
        project_id = _get_default_project_id(storage)
        ok = storage.delete_global(project_id, key)
        if not ok:
            raise HTTPException(status_code=404, detail="Global not found")
        return {"deleted": True}
    finally:
        storage.close()


@app.get("/api/executions/{rule_id}")
async def compat_list_executions(rule_id: int):
    storage = Storage()
    try:
        project_id = _get_default_project_id(storage)
        records = storage.list_executions(project_id, rule_id)
        return [
            {
                "execution_id": r.execution_id,
                "project_id": r.project_id,
                "rule_id": r.rule_id,
                "started_at": r.started_at,
                "completed_at": r.completed_at,
                "status": r.status,
                "variables": json.loads(r.variables or "{}"),
                "result_summary": r.result_summary,
            }
            for r in records
        ]
    finally:
        storage.close()
