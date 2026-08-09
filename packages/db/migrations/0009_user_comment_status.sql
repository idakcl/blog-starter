ALTER TABLE "user" ADD COLUMN comment_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "user" ADD COLUMN comment_status_updated_at TEXT;
