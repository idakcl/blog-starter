CREATE TABLE IF NOT EXISTS "weekly_blog_update_runs" (
	"id" TEXT PRIMARY KEY NOT NULL,
	"period_start" TEXT NOT NULL,
	"period_end" TEXT NOT NULL,
	"status" TEXT NOT NULL,
	"post_count" INTEGER DEFAULT 0 NOT NULL,
	"recipient_count" INTEGER DEFAULT 0 NOT NULL,
	"error" TEXT,
	"created_at" TEXT NOT NULL,
	"completed_at" TEXT
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_digest_runs" (
	"id" TEXT PRIMARY KEY NOT NULL,
	"period_start" TEXT NOT NULL,
	"period_end" TEXT NOT NULL,
	"status" TEXT NOT NULL,
	"post_count" INTEGER DEFAULT 0 NOT NULL,
	"recipient_count" INTEGER DEFAULT 0 NOT NULL,
	"error" TEXT,
	"created_at" TEXT NOT NULL,
	"completed_at" TEXT
);
--> statement-breakpoint
INSERT OR IGNORE INTO "weekly_blog_update_runs" (
	"id",
	"period_start",
	"period_end",
	"status",
	"post_count",
	"recipient_count",
	"error",
	"created_at",
	"completed_at"
)
SELECT
	"id",
	"period_start",
	"period_end",
	"status",
	"post_count",
	"recipient_count",
	"error",
	"created_at",
	"completed_at"
FROM "email_digest_runs";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "weekly_blog_update_period_idx" ON "weekly_blog_update_runs" ("period_end");
--> statement-breakpoint
DROP INDEX IF EXISTS "email_delivery_post_user_type_idx";
--> statement-breakpoint
DROP TABLE IF EXISTS "email_digest_runs";
