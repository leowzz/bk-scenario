# 数据模型与存储

## 主数据库

平台主库统一使用 PostgreSQL。

## 建议表

- `projects`
- `rules`
- `nodes`
- `edges`
- `global_vars`
- `connectors`
- `executions`
- `execution_steps`
- `stored_data`
- `job_queue`（可选，异步模式）
- `runtime_kv`（可选，短期状态）

## 关键字段

1. `projects`
- `id`, `name`, `description`, `created_at`, `updated_at`

2. `rules`
- `id`, `project_id`, `name`, `description`, `created_at`, `updated_at`

3. `nodes`
- `id`, `rule_id`, `node_id`, `type`, `position_x`, `position_y`, `config_json`

4. `connectors`
- `id`, `project_id`, `name`, `type(mysql|redis)`, `config_encrypted`, `created_at`, `updated_at`

5. `stored_data`
- `id`, `project_id`, `rule_id`, `execution_id`, `scope`, `key`, `value`, `created_at`

## 索引建议

- `rules(project_id)`
- `nodes(rule_id)`
- `edges(rule_id)`
- `executions(project_id, rule_id, started_at desc)`
- `stored_data(project_id, scope, key, created_at desc)`
- `job_queue(status, available_at)`

## YAML 配置

配置文件建议 `backend/config/*.yaml`：

- `app.yaml`: 服务基础配置。
- `security.yaml`: 执行限制、白名单、超时。
- `connectors.yaml`: 可选默认连接模板（非敏感字段）。

敏感信息通过环境变量注入，不写入 YAML 明文。
