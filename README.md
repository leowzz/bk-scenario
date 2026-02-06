# DB Scenario

当前仓库仅保留工程化后端版本，代码在 `backend/` 目录。

## 快速开始

```bash
cd /Users/leo/Desktop/work/db-scenario/backend

# 安装依赖（uv）
uv sync

# 启动服务
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

打开浏览器访问: http://localhost:8001

## 项目结构

```
backend/
├── app/
├── db/
├── frontend/
├── pyproject.toml
├── README.md
└── uv.lock
```
