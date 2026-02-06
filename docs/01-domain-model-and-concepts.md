# 领域模型与核心概念

## 核心实体

- `Project`
- `Rule`
- `Node`
- `Edge`
- `GlobalVar`
- `Execution`
- `ExecutionStep`
- `StoredData`
- `Connector`（外部连接配置：MySQL/Redis）

## 关系

- 一个 `Project` 包含多个 `Rule`。
- 一个 `Rule` 包含多个 `Node` 与 `Edge`。
- 一个 `Project` 拥有项目级 `GlobalVar`。
- 一个 `Rule` 可拥有规则级 `GlobalVar`（覆盖项目级同名变量）。
- 每次规则运行生成一个 `Execution`，并包含多条 `ExecutionStep`。
- `StoredData` 归属于 `Execution`，并可设置作用域 `project` 或 `rule`。

## 作用域与变量优先级

变量解析顺序（高到低）：

1. 运行时传入变量（run variables）
2. 规则级变量（rule vars）
3. 项目级变量（project vars）
4. 系统默认变量（system vars）

## 项目隔离规则

- 规则、执行、存储数据默认按 `project_id` 过滤。
- 跨项目读取默认禁止。
- UI 层必须先选择项目，再展示规则按钮和图编辑器。

## 外部连接模型

- `Connector` 挂在项目下。
- `connector_type` 仅支持 `mysql` 与 `redis`（首版）。
- 敏感字段（密码、token）仅存密文，前端不回显。
