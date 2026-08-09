CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'page_view',
  path TEXT NOT NULL,
  post_slug TEXT,
  referrer_host TEXT,
  visitor_hash TEXT NOT NULL,
  occurred_date TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS analytics_events_date_idx ON analytics_events (occurred_date);
CREATE INDEX IF NOT EXISTS analytics_events_path_date_idx ON analytics_events (path, occurred_date);
CREATE INDEX IF NOT EXISTS analytics_events_post_date_idx ON analytics_events (post_slug, occurred_date);
CREATE INDEX IF NOT EXISTS analytics_events_visitor_date_idx ON analytics_events (visitor_hash, occurred_date);
