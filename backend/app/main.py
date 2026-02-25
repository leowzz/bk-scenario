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
    Connector,
    ConnectorCreate,
    ConnectorUpdate,
    DataReadRequest,
    DataWriteRequest,
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


def _to_connector(model) -> Connector:
    return Connector(
        id=model.id,
        project_id=model.project_id,
        name=model.name,
        type=model.type,
        created_at=model.created_at,
        updated_at=model.updated_at,
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


@app.post("/api/test-connection")
async def test_connection(payload: dict[str, Any]):
    conn_type = payload.get("type")
    dsn = payload.get("dsn")

    if not conn_type or not dsn:
        raise HTTPException(status_code=422, detail="type and dsn are required")

    from .connection import test_redis_connection, test_mysql_connection

    if conn_type == "redis":
        result = test_redis_connection(dsn)
    elif conn_type == "mysql":
        result = test_mysql_connection(dsn)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported connection type: {conn_type}")

    if result["status"] == "failed":
        return result 
        # Or raise HTTP exception? The frontend expects 200 OK with success/failed status usually, 
        # or we can follow the pattern of other endpoints. 
        # Let's return the result dict, frontend can check status.
    
    return result



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

    from .engine import RuleEngine
    from .models import ExecutionContext, NodeOutput

    storage = Storage()
    try:
        project_id = payload.get("project_id")
        if project_id is None:
            project_id = _get_default_project_id(storage)

        node_id = node.get("id", "test-node")
        rule_id = payload.get("rule_id", 0)

        # 从 DB 加载已有 store 数据，再用 payload.store 覆盖
        db_store = storage.load_latest_store_snapshot(project_id, rule_id)
        db_store.update(payload.get("store", {}))

        ctx = ExecutionContext(
            project_id=project_id,
            rule_id=rule_id,
            execution_id="test",
            vars=dict(variables),
            store=db_store,
        )
        engine = RuleEngine(storage)
        try:
            if action_type == "sql":
                output = engine._execute_sql_node(project_id, node_id, config, ctx)
            elif action_type == "log":
                output = engine._execute_log_node(node_id, config, ctx)
            elif action_type == "store":
                scope = config.get("scope", "rule")
                if scope not in {"project", "rule"}:
                    scope = "rule"
                key = TemplateRenderer.render(str(config.get("store_key", "")), ctx.to_template_vars())
                value = TemplateRenderer.render(str(config.get("store_value", "")), ctx.to_template_vars())
                record = storage.store_data(
                    project_id=project_id,
                    rule_id=0,
                    execution_id="test",
                    node_id=node_id,
                    scope=scope,
                    key=key,
                    value=value,
                )
                output = NodeOutput(node_id=node_id, node_type="store", status="success", data={"id": record.id, "key": key, "value": value, "scope": scope})
            elif action_type == "load":
                key = TemplateRenderer.render(str(config.get("key", "")), ctx.to_template_vars())
                assign_to = str(config.get("assign_to", "value"))
                output = NodeOutput(node_id=node_id, node_type="load", status="success", data={"scope": config.get("scope", "rule"), "key": key, "assign_to": assign_to})
            elif action_type == "python":
                output = engine._execute_python_node(node_id, config, ctx)
            elif action_type == "shell":
                output = engine._execute_shell_node(node_id, config, ctx)
            else:
                output = NodeOutput(node_id=node_id, node_type=str(action_type), status="error", error=f"unsupported node type: {action_type}")
        except Exception as exc:
            output = NodeOutput(node_id=node_id, node_type=str(action_type), status="error", error=str(exc))
    finally:
        storage.close()

    return {
        "status": "completed" if output.status == "success" else output.status,
        "action_type": action_type,
        "content": output.error or str(output.data or ""),
        "output": output.data,
        "error": output.error,
        "metadata": output.metadata,
    }

    return {
        "status": "completed" if output.status == "success" else output.status,
        "action_type": action_type,
        "content": output.error or str(output.data or ""),
        "output": output.data,
        "error": output.error,
        "metadata": output.metadata,
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


@app.get("/api/projects/{project_id}/executions")
async def list_project_executions(project_id: int):
    storage = Storage()
    try:
        if not storage.get_project(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        records = storage.list_executions(project_id)
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
                    "step_data": json.loads(s.step_data) if s.step_data else None,
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


# ===== Connectors =====
@app.get("/api/projects/{project_id}/connectors", response_model=list[Connector])
async def list_connectors(project_id: int):
    storage = Storage()
    try:
        if not storage.get_project(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        return [_to_connector(c) for c in storage.list_connectors(project_id)]
    finally:
        storage.close()


@app.post("/api/projects/{project_id}/connectors", response_model=Connector)
async def create_connector(project_id: int, req: ConnectorCreate):
    storage = Storage()
    try:
        if not storage.get_project(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        if req.type not in {"mysql", "redis"}:
            raise HTTPException(status_code=422, detail="connector type must be mysql or redis")
        created = storage.create_connector(
            project_id=project_id,
            name=req.name,
            connector_type=req.type,
            config_encrypted=json.dumps(req.config, ensure_ascii=True),
        )
        return _to_connector(created)
    finally:
        storage.close()


@app.put("/api/projects/{project_id}/connectors/{connector_id}", response_model=Connector)
async def update_connector(project_id: int, connector_id: int, req: ConnectorUpdate):
    storage = Storage()
    try:
        updated = storage.update_connector(
            project_id=project_id,
            connector_id=connector_id,
            name=req.name,
            config_encrypted=json.dumps(req.config, ensure_ascii=True) if req.config is not None else None,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Connector not found")
        return _to_connector(updated)
    finally:
        storage.close()


@app.delete("/api/projects/{project_id}/connectors/{connector_id}")
async def delete_connector(project_id: int, connector_id: int):
    storage = Storage()
    try:
        ok = storage.delete_connector(project_id, connector_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Connector not found")
        return {"deleted": True}
    finally:
        storage.close()


# ===== Data I/O =====
@app.post("/api/data/write")
async def write_data(req: DataWriteRequest):
    storage = Storage()
    try:
        if req.scope not in {"project", "rule"}:
            raise HTTPException(status_code=422, detail="scope must be project or rule")
        if not storage.get_project(req.project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        record = storage.store_data(
            project_id=req.project_id,
            rule_id=req.rule_id,
            execution_id=req.execution_id or "manual",
            node_id=req.node_id or "manual",
            scope=req.scope,
            key=req.key,
            value=json.dumps(req.value, ensure_ascii=True) if not isinstance(req.value, str) else req.value,
        )
        return {
            "id": record.id,
            "project_id": record.project_id,
            "rule_id": record.rule_id,
            "execution_id": record.execution_id,
            "scope": record.scope,
            "key": record.key,
        }
    finally:
        storage.close()


@app.post("/api/data/read")
async def read_data(req: DataReadRequest):
    storage = Storage()
    try:
        if req.scope not in {"project", "rule"}:
            raise HTTPException(status_code=422, detail="scope must be project or rule")
        if not storage.get_project(req.project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        record = storage.read_latest_stored_data(
            project_id=req.project_id,
            rule_id=req.rule_id,
            scope=req.scope,
            key=req.key,
        )
        if not record:
            return {"found": False, "value": None}
        return {
            "found": True,
            "project_id": record.project_id,
            "rule_id": record.rule_id,
            "execution_id": record.execution_id,
            "scope": record.scope,
            "key": record.key,
            "value": record.value,
            "created_at": record.created_at,
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
