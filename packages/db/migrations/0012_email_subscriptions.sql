ALTER TABLE "user" ADD COLUMN "email_preference" TEXT DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email_preference_updated_at" TEXT;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "marketing_opt_out" INTEGER DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "unsubscribe_token_hash" TEXT;
--> statement-breakpoint
CREATE TABLE "email_notification_deliveries" (
	"id" TEXT PRIMARY KEY NOT NULL,
	"user_id" TEXT NOT NULL,
	"notification_type" TEXT NOT NULL,
	"subject" TEXT NOT NULL,
	"status" TEXT DEFAULT 'pending' NOT NULL,
	"message_id" TEXT,
	"error" TEXT,
	"created_at" TEXT NOT NULL,
	"sent_at" TEXT,
	FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX "email_delivery_user_idx" ON "email_notification_deliveries" ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "email_delivery_status_idx" ON "email_notification_deliveries" ("status","created_at");
--> statement-breakpoint
CREATE TABLE "weekly_blog_update_runs" (
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
CREATE INDEX "weekly_blog_update_period_idx" ON "weekly_blog_update_runs" ("period_end");
--> statement-breakpoint
CREATE TABLE "email_broadcasts" (
	"id" TEXT PRIMARY KEY NOT NULL,
	"subject" TEXT NOT NULL,
	"message" TEXT NOT NULL,
	"status" TEXT NOT NULL,
	"recipient_count" INTEGER DEFAULT 0 NOT NULL,
	"error" TEXT,
	"created_by_user_id" TEXT,
	"created_at" TEXT NOT NULL,
	"sent_at" TEXT,
	FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX "email_broadcast_created_idx" ON "email_broadcasts" ("created_at");
