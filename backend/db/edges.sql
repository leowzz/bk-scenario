id: integer PRIMARY KEY AUTOINCREMENT
rule_id: integer NOT NULL
source_node: text NOT NULL
target_node: text NOT NULL
condition: text  -- 可选：连接条件
FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
UNIQUE(rule_id, source_node, target_node)
