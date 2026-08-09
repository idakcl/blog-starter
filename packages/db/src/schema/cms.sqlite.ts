import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user as authUser } from "./auth.schema";

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const serverSettings = sqliteTable("server_settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const series = sqliteTable(
  "series",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    i18n: text("i18n", { mode: "json" }),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("series_slug_idx").on(table.slug),
    index("series_sort_idx").on(table.sortOrder, table.name),
  ],
);

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    coverImage: text("cover_image"),
    contentMarkdown: text("content_markdown").notNull(),
    contentHtml: text("content_html").notNull(),
    contentText: text("content_text").notNull(),
    status: text("status", {
      enum: ["draft", "published", "scheduled", "archived", "deleted"],
    })
      .notNull()
      .default("draft"),
    source: text("source", {
      enum: ["editor", "markdown_upload", "html_upload", "api", "cli", "ai", "import"],
    })
      .notNull()
      .default("editor"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    commentsEnabled: integer("comments_enabled", { mode: "boolean" }).notNull().default(true),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    canonicalUrl: text("canonical_url"),
    robots: text("robots").notNull().default("index,follow"),
    structuredData: text("structured_data", { mode: "json" }),
    i18n: text("i18n", { mode: "json" }),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    authorId: text("author_id"),
    seriesId: text("series_id").references(() => series.id, { onDelete: "set null" }),
  },
  (table) => [
    uniqueIndex("posts_slug_idx").on(table.slug),
    index("posts_status_published_idx").on(table.status, table.publishedAt),
    index("posts_content_text_idx").on(table.contentText),
    index("posts_series_idx").on(table.seriesId),
  ],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    i18n: text("i18n", { mode: "json" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("tags_slug_idx").on(table.slug)],
);

export const postTags = sqliteTable(
  "post_tags",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("post_tags_unique_idx").on(table.postId, table.tagId)],
);

export const postSources = sqliteTable(
  "post_sources",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    source: text("source", { enum: ["obsidian_git"] }).notNull(),
    sourcePath: text("source_path").notNull(),
    contentHash: text("content_hash").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    missingAt: text("missing_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("post_sources_source_path_idx").on(table.source, table.sourcePath),
    uniqueIndex("post_sources_post_source_idx").on(table.postId, table.source),
    index("post_sources_missing_idx").on(table.source, table.missingAt),
  ],
);

export const assets = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    url: text("url").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    attachedPostId: text("attached_post_id").references(() => posts.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("assets_key_idx").on(table.key),
    index("assets_post_idx").on(table.attachedPostId),
  ],
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    authorUserId: text("author_user_id").references(() => authUser.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name").notNull(),
    authorEmailHash: text("author_email_hash").notNull(),
    authorWebsite: text("author_website"),
    body: text("body").notNull(),
    i18n: text("i18n", { mode: "json" }),
    status: text("status", { enum: ["pending", "approved", "spam", "deleted"] })
      .notNull()
      .default("pending"),
    aiModerationStatus: text("ai_moderation_status", {
      enum: ["not_requested", "pending", "completed", "failed"],
    })
      .notNull()
      .default("not_requested"),
    aiModerationDecision: text("ai_moderation_decision", {
      enum: ["approve", "review", "spam"],
    }),
    aiModerationReason: text("ai_moderation_reason"),
    aiModerationError: text("ai_moderation_error"),
    aiModerationReviewedAt: text("ai_moderation_reviewed_at"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("comments_post_status_idx").on(table.postId, table.status),
    index("comments_status_created_idx").on(table.status, table.createdAt),
    index("comments_author_user_idx").on(table.authorUserId),
    index("comments_ai_moderation_status_idx").on(table.aiModerationStatus, table.createdAt),
  ],
);

export const analyticsEvents = sqliteTable(
  "analytics_events",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type", { enum: ["page_view"] })
      .notNull()
      .default("page_view"),
    path: text("path").notNull(),
    postSlug: text("post_slug"),
    referrerHost: text("referrer_host"),
    visitorHash: text("visitor_hash").notNull(),
    occurredDate: text("occurred_date").notNull(),
    occurredAt: text("occurred_at").notNull(),
  },
  (table) => [
    index("analytics_events_date_idx").on(table.occurredDate),
    index("analytics_events_path_date_idx").on(table.path, table.occurredDate),
    index("analytics_events_post_date_idx").on(table.postSlug, table.occurredDate),
    index("analytics_events_visitor_date_idx").on(table.visitorHash, table.occurredDate),
  ],
);

export const apiTokens = sqliteTable(
  "api_tokens",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    scopes: text("scopes", { mode: "json" }).notNull(),
    expiresAt: text("expires_at"),
    lastUsedAt: text("last_used_at"),
    revokedAt: text("revoked_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("api_tokens_hash_idx").on(table.tokenHash)],
);

export const emailNotificationDeliveries = sqliteTable(
  "email_notification_deliveries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    commentId: text("comment_id").references(() => comments.id, { onDelete: "cascade" }),
    notificationType: text("notification_type", {
      enum: ["weekly_blog_updates", "manual_broadcast", "comment_reply"],
    }).notNull(),
    subject: text("subject").notNull(),
    status: text("status", { enum: ["pending", "sent", "failed"] })
      .notNull()
      .default("pending"),
    messageId: text("message_id"),
    error: text("error"),
    createdAt: text("created_at").notNull(),
    sentAt: text("sent_at"),
  },
  (table) => [
    uniqueIndex("email_delivery_comment_user_type_idx").on(
      table.userId,
      table.commentId,
      table.notificationType,
    ),
    index("email_delivery_user_idx").on(table.userId, table.createdAt),
    index("email_delivery_status_idx").on(table.status, table.createdAt),
  ],
);

export const weeklyBlogUpdateRuns = sqliteTable(
  "weekly_blog_update_runs",
  {
    id: text("id").primaryKey(),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    status: text("status", { enum: ["sent", "failed", "skipped"] }).notNull(),
    postCount: integer("post_count").notNull().default(0),
    recipientCount: integer("recipient_count").notNull().default(0),
    error: text("error"),
    createdAt: text("created_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [index("weekly_blog_update_period_idx").on(table.periodEnd)],
);

export const emailBroadcasts = sqliteTable(
  "email_broadcasts",
  {
    id: text("id").primaryKey(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status", { enum: ["sent", "failed"] }).notNull(),
    recipientCount: integer("recipient_count").notNull().default(0),
    error: text("error"),
    createdByUserId: text("created_by_user_id").references(() => authUser.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at").notNull(),
    sentAt: text("sent_at"),
  },
  (table) => [index("email_broadcast_created_idx").on(table.createdAt)],
);
