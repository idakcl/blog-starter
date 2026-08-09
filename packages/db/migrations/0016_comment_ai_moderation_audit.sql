ALTER TABLE comments ADD COLUMN ai_moderation_status TEXT DEFAULT 'not_requested' NOT NULL;

ALTER TABLE comments ADD COLUMN ai_moderation_decision TEXT;

ALTER TABLE comments ADD COLUMN ai_moderation_reason TEXT;

ALTER TABLE comments ADD COLUMN ai_moderation_error TEXT;

ALTER TABLE comments ADD COLUMN ai_moderation_reviewed_at TEXT;

CREATE INDEX IF NOT EXISTS comments_ai_moderation_status_idx ON comments (ai_moderation_status, created_at);
