id: integer PRIMARY KEY AUTOINCREMENT
execution_id: text NOT NULL
node_id: text NOT NULL
action_type: text
content: text
started_at: timestamp DEFAULT CURRENT_TIMESTAMP
completed_at: timestamp
status: text  -- pending, running, completed, failed
output: text
FOREIGN KEY (execution_id) REFERENCES executions(execution_id) ON DELETE CASCADE
