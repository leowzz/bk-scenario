# DB Scenario Pro

工程化版本：规则可视化编排 + 执行引擎 + 结果追踪。

## 快速开始

```bash
cd /Users/leo/Desktop/work/db-scenario/backend

# 安装依赖（使用 uv）
uv sync

# 启动服务
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

打开浏览器访问: http://localhost:8001

## 包管理

- 后端 Python 使用 `uv`
- 前端依赖仍用 `npm`（如需切换到 pnpm/yarn，告诉我）

## 说明

- 本服务数据持久化使用 SQLite
- 规则执行时可连接外部 MySQL（当前仅渲染 SQL，不执行）

## 目录结构

```
backend/
├── app/
│   ├── main.py              # FastAPI 应用
│   ├── db.py                # SQLite 连接
│   ├── models.py            # Pydantic 模型
│   ├── schema.py            # SQLAlchemy 模型
│   ├── storage.py           # CRUD/存储
│   ├── engine.py            # 规则执行引擎
│   └── template.py          # SQL 模板渲染
├── db/
│   ├── init.sql             # 建表脚本（SQLite）
│   └── *.sql
└── frontend/
    └── index.html
```
