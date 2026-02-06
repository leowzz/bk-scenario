-- DB Scenario Pro 数据库初始化脚本

.read rules.sql
.read nodes.sql
.read edges.sql
.read global_vars.sql
.read executions.sql
.read execution_steps.sql
.read stored_data.sql

-- 创建索引
CREATE INDEX idx_edges_rule ON edges(rule_id);
CREATE INDEX idx_edges_source ON edges(source_node);
CREATE INDEX idx_nodes_rule ON nodes(rule_id);
CREATE INDEX idx_executions_rule ON executions(rule_id);
CREATE INDEX idx_executions_id ON executions(execution_id);
CREATE INDEX idx_execution_steps_exec ON execution_steps(execution_id);
CREATE INDEX idx_stored_data_exec ON stored_data(execution_id);
