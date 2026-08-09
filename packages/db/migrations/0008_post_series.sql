PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS series (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  i18n TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS series_slug_idx ON series (slug);
CREATE INDEX IF NOT EXISTS series_sort_idx ON series (sort_order, name);

ALTER TABLE posts ADD COLUMN series_id TEXT REFERENCES series (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_series_idx ON posts (series_id);
