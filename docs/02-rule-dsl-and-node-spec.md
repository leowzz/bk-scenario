# 规则 DSL 与节点规范

## Rule DSL 基本结构

```yaml
rule:
  id: user_cleanup
  project_id: prod_ops
  name: 用户清理
  entry: node_start
  nodes:
    - id: node_start
      type: log
      config:
        message: "start {{now}}"
    - id: node_sql
      type: sql
      config:
        connector: mysql_main
        statement: "update users set status='inactive' where last_login < '{{cutoff}}'"
  edges:
    - source: node_start
      target: node_sql
```

## 节点类型

- `log`: 写运行日志。
- `sql`: 在指定连接上执行 SQL（MySQL）。
- `python`: 执行 Python 代码片段。
- `shell`: 执行 Shell 命令。
- `store`: 写入平台存储数据。
- `load`: 从平台存储数据读取到变量。

## 各节点配置

1. `sql`
- `connector`: 连接器 ID（必须是 `mysql`）。
- `statement`: SQL 模板。
- `timeout_sec`: 可选，默认 15。

2. `python`
- `script`: Python 代码。
- `timeout_sec`: 可选，默认 10。
- `allow_imports`: 可选白名单模块。

3. `shell`
- `command`: 命令模板。
- `timeout_sec`: 可选，默认 10。
- `workdir`: 可选工作目录（受限白名单）。

4. `store`
- `scope`: `project` 或 `rule`。
- `key`: 存储键。
- `value`: 存储值模板。

5. `load`
- `scope`: `project` 或 `rule`。
- `key`: 读取键。
- `assign_to`: 绑定到变量名。

## 模板变量

- 使用 `{{ var_name }}` 语法。
- 模板渲染失败视为节点失败。
- `load` 节点成功后注入运行上下文，可被后续节点继续引用。

## 错误语义

- 节点错误默认中断规则执行。
- 后续可扩展 `continue_on_error`。
