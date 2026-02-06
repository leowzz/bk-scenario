# 执行架构

## 执行流水线

1. `Loader`: 读取规则图与节点配置。
2. `Resolver`: 解析变量并渲染模板。
3. `Planner`: 做 DAG 拓扑排序与循环检测。
4. `Executor`: 逐节点执行动作。
5. `Recorder`: 记录步骤、状态、输出与存储产物。

## 运行模式

- 首版：同步执行（HTTP 触发后直至完成/失败）。
- 预留：异步执行（Postgres 队列表 + worker）。

## Postgres 作为轻量 Redis 的使用边界

推荐用于：

- 执行队列（`FOR UPDATE SKIP LOCKED`）。
- 幂等键与短期状态。
- 小规模 KV 缓存。

不推荐用于：

- 高频 Pub/Sub。
- 大规模低延迟缓存。
- 长连接消息扇出。

当出现以上场景时，应补充独立 Redis。

## 组件拆分建议

- API 服务：处理规则管理、执行触发、查询。
- Worker 服务：执行 `python/shell/sql` 节点。
- Connector 适配层：MySQL/Redis 客户端与凭据管理。

## 状态机

- Execution: `running -> completed | failed | cancelled`
- Step: `running -> completed | failed | skipped`

## 失败策略

- 模板渲染异常：节点失败。
- 连接器不可用：节点失败并附带可诊断错误码。
- 超时：节点失败并写入 `timeout` 输出。
