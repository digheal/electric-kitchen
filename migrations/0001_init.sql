CREATE TABLE kitchens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kitchen_type TEXT NOT NULL,
  street_address TEXT,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL,
  lat REAL,
  lng REAL,
  equipment TEXT NOT NULL DEFAULT '[]',   -- JSON list, e.g. ["induction range","combi oven"]
  equipment_other TEXT,
  website TEXT,
  photo_key TEXT,
  year_electric INTEGER,
  build_type TEXT NOT NULL DEFAULT 'unknown', -- new build | converted | unknown
  notes TEXT,
  relationship TEXT,
  submitter_name TEXT,                    -- private, never returned by the public API
  submitter_email TEXT,                   -- private, never returned by the public API
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT
);

CREATE INDEX idx_kitchens_status ON kitchens (status, approved_at);
