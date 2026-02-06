id: integer PRIMARY KEY AUTOINCREMENT
rule_id: integer NOT NULL
node_id: text NOT NULL
type: text NOT NULL  -- sql, log, store, condition
position_x: real NOT NULL
position_y: real NOT NULL
config: text  -- JSON
FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
UNIQUE(rule_id, node_id)
