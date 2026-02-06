id: integer PRIMARY KEY AUTOINCREMENT
execution_id: text NOT NULL
node_id: text NOT NULL
key: text
value: text
created_at: timestamp DEFAULT CURRENT_TIMESTAMP
FOREIGN KEY (execution_id) REFERENCES executions(execution_id) ON DELETE CASCADE
