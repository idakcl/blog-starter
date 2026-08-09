CREATE TABLE `post_sources` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `post_id` TEXT NOT NULL,
  `source` TEXT NOT NULL CHECK (`source` IN ('obsidian_git')),
  `source_path` TEXT NOT NULL,
  `content_hash` TEXT NOT NULL,
  `last_seen_at` TEXT NOT NULL,
  `missing_at` TEXT,
  `created_at` TEXT NOT NULL,
  `updated_at` TEXT NOT NULL,
  FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `post_sources_source_path_idx` ON `post_sources` (`source`, `source_path`);
CREATE UNIQUE INDEX `post_sources_post_source_idx` ON `post_sources` (`post_id`, `source`);
CREATE INDEX `post_sources_missing_idx` ON `post_sources` (`source`, `missing_at`);
