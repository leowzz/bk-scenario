# DB Scenario 文档索引

本目录定义项目从“按钮化规则执行器”演进为“项目化后端运维自动化平台”的长期方案。

## 阅读顺序

1. `docs/00-vision-and-principles.md`
2. `docs/01-domain-model-and-concepts.md`
3. `docs/02-rule-dsl-and-node-spec.md`
4. `docs/03-execution-architecture.md`
5. `docs/04-data-model-and-storage.md`
6. `docs/05-api-contract-draft.md`
7. `docs/06-dashboard-and-editor-spec.md`
8. `docs/07-security-governance.md`
9. `docs/08-roadmap-and-migration.md`

## 当前关键技术决策

- 平台后端主存储使用 PostgreSQL。
- 平台内部“轻量缓存/队列”优先复用 PostgreSQL（而不是单独引入 Redis）。
- 平台配置文件使用 YAML。
- 规则操作的外部数据源主要是 MySQL 与 Redis。

## 术语

- `Project`: 项目隔离边界。
- `Rule`: 一组可编排的执行节点。
- `Node`: 执行动作（SQL、Python、Shell、Store、Load、Log）。
- `Execution`: 一次规则运行记录。
- `StoredData`: 规则执行中写入的可回读数据。
