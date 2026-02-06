id: integer PRIMARY KEY AUTOINCREMENT
key: text NOT NULL UNIQUE
value: text
type: text  -- string, number, boolean
description: text
created_at: timestamp DEFAULT CURRENT_TIMESTAMP
updated_at: timestamp DEFAULT CURRENT_TIMESTAMP
