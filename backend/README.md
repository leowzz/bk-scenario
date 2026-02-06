# DB Scenario Pro

工程化版本：规则可视化编排 + 执行引擎 + 结果追踪。

## 快速开始

```bash
cd /Users/leo/Desktop/work/db-scenario/backend

# 安装依赖（使用 uv）
uv sync

# 生成本地配置（app.yaml 已在 .gitignore 中）
cp config/app.yaml.template config/app.yaml

# 配置数据库（可选：环境变量优先）
# export DB_SCENARIO_DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/db_scenario"

# 启动服务
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

打开浏览器访问: http://localhost:8001

## 包管理

- 后端 Python 使用 `uv`
- 前端依赖仍用 `npm`（如需切换到 pnpm/yarn，告诉我）

## 说明

- 本服务主存储使用 PostgreSQL（配置见 `backend/config/app.yaml`）
- 支持项目模型与 `project_id` 作用域隔离
- 数据库版本管理使用 Alembic
- 日志框架使用 Loguru
- 保留 `/api/rules`、`/api/globals` 等兼容路由，默认落到 `default` 项目
- 提供 SQLite 到 PostgreSQL 的迁移脚本：`backend/scripts/migrate_sqlite_to_postgres.py`

## Alembic

```bash
cd /Users/leo/Desktop/work/db-scenario/backend

# 执行迁移
uv run alembic upgrade head

# 回滚一个版本
uv run alembic downgrade -1

# 生成迁移（自动比对 SQLAlchemy 模型）
uv run alembic revision --autogenerate -m "your message"
```

## 目录结构

```
backend/
├── app/
│   ├── main.py              # FastAPI 应用
│   ├── db.py                # SQLAlchemy 连接
│   ├── config.py            # pydantic-settings + YAML 配置读取
│   ├── models.py            # Pydantic 模型
│   ├── schema.py            # SQLAlchemy 模型
│   ├── storage.py           # CRUD/存储
│   ├── engine.py            # 规则执行引擎
│   └── template.py          # SQL 模板渲染
├── alembic/
│   ├── env.py               # Alembic 环境配置
│   └── versions/            # 迁移版本文件
├── alembic.ini              # Alembic 主配置
├── config/
│   ├── app.yaml             # 本地配置（git ignore）
│   └── app.yaml.template    # 配置模板（git tracked）
├── db/                      # 预留目录（当前无静态 SQL 脚本）
└── frontend/
    └── index.html
```
