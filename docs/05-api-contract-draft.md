# API 合同草案

## 项目 API

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{project_id}`
- `PUT /api/projects/{project_id}`
- `DELETE /api/projects/{project_id}`

## 规则 API

- `GET /api/projects/{project_id}/rules`
- `POST /api/projects/{project_id}/rules`
- `GET /api/projects/{project_id}/rules/{rule_id}`
- `PUT /api/projects/{project_id}/rules/{rule_id}`
- `PUT /api/projects/{project_id}/rules/{rule_id}/graph`

## 连接器 API

- `GET /api/projects/{project_id}/connectors`
- `POST /api/projects/{project_id}/connectors`
- `PUT /api/projects/{project_id}/connectors/{connector_id}`
- `DELETE /api/projects/{project_id}/connectors/{connector_id}`

## 执行 API

- `POST /api/execute`
- `GET /api/projects/{project_id}/executions`
- `GET /api/execution/{execution_id}`

`POST /api/execute` 请求体建议：

```json
{
  "project_id": "prod_ops",
  "rule_id": 12,
  "request_id": "req-20260206-001",
  "dry_run": false,
  "variables": {
    "cutoff": "2025-01-01"
  }
}
```

## 数据读写 API（调试与回放）

- `POST /api/data/write`
- `POST /api/data/read`

## 错误码（建议）

- `RULE_NOT_FOUND`
- `PROJECT_NOT_FOUND`
- `CONNECTOR_NOT_FOUND`
- `CONNECTOR_TYPE_MISMATCH`
- `NODE_EXEC_TIMEOUT`
- `NODE_EXEC_FORBIDDEN`
- `TEMPLATE_RENDER_ERROR`
- `PROJECT_ISOLATION_DENIED`
