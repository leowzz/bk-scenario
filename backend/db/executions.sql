id: integer PRIMARY KEY AUTOINCREMENT
rule_id: integer
execution_id: text NOT NULL UNIQUE
started_at: timestamp DEFAULT CURRENT_TIMESTAMP
completed_at: timestamp
status: text  -- running, completed, failed
variables: text  -- JSON 存储执行时的变量快照
result_summary: text
FOREIGN KEY (rule_id) REFERENCES rules(id)
