PRAGMA foreign_keys = OFF;

DROP INDEX IF EXISTS comments_post_status_idx;
DROP INDEX IF EXISTS comments_status_created_idx;
DROP INDEX IF EXISTS comments_author_user_idx;

CREATE TABLE comments_next (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  parent_id TEXT,
  author_user_id TEXT REFERENCES "user" (id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_email_hash TEXT NOT NULL,
  author_website TEXT,
  body TEXT NOT NULL,
  i18n TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam', 'deleted')),
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO comments_next (
  id,
  post_id,
  parent_id,
  author_name,
  author_email_hash,
  author_website,
  body,
  i18n,
  status,
  ip_hash,
  user_agent,
  created_at,
  updated_at
)
SELECT
  id,
  post_id,
  parent_id,
  author_name,
  author_email_hash,
  author_website,
  body,
  i18n,
  status,
  ip_hash,
  user_agent,
  created_at,
  updated_at
FROM comments;

DROP TABLE comments;
ALTER TABLE comments_next RENAME TO comments;

PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS comments_post_status_idx ON comments (post_id, status);
CREATE INDEX IF NOT EXISTS comments_status_created_idx ON comments (status, created_at);
CREATE INDEX IF NOT EXISTS comments_author_user_idx ON comments (author_user_id);
