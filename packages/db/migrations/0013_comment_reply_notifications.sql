ALTER TABLE "user" ADD COLUMN "comment_reply_notifications_enabled" INTEGER DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "comment_reply_unsubscribe_token_hash" TEXT;
--> statement-breakpoint
ALTER TABLE "email_notification_deliveries" ADD COLUMN "comment_id" TEXT REFERENCES "comments"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE UNIQUE INDEX "email_delivery_comment_user_type_idx" ON "email_notification_deliveries" ("user_id","comment_id","notification_type");
