export type ContentStatus = "draft" | "published" | "scheduled" | "archived" | "deleted";

export type SupportedLocale = "en" | "zh";

export type ThemePreset = "maker" | "apple" | "editorial" | "brutalist";
export type LayoutPreset = "shelf" | "developer" | "journal";

export type LocalizedString = Partial<Record<SupportedLocale, string>>;

export type LocalizedFields<TField extends string> = Partial<Record<TField, LocalizedString>>;

export type ContentSource =
  | "editor"
  | "markdown_upload"
  | "html_upload"
  | "api"
  | "cli"
  | "ai"
  | "import";

export type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  contentMarkdown: string;
  contentHtml: string;
  contentText: string;
  status: ContentStatus;
  source: ContentSource;
  featured: boolean;
  pinned: boolean;
  commentsEnabled: boolean;
  publishedAt: string;
  updatedAt: string;
  authorName: string;
  series: Series | null;
  tags: Tag[];
  externalSource?: PostExternalSource | null;
  seoTitle: string;
  seoDescription: string;
  i18n?: LocalizedFields<
    | "title"
    | "excerpt"
    | "contentMarkdown"
    | "contentHtml"
    | "contentText"
    | "seoTitle"
    | "seoDescription"
  >;
};

export type PostExternalSource = {
  kind: "obsidian_git";
  path: string;
  hash: string;
  lastSeenAt: string;
  missingAt: string | null;
};

export type Series = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  i18n?: LocalizedFields<"name" | "description">;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
  description: string;
  i18n?: LocalizedFields<"name" | "description">;
};

export type CommentStatus = "pending" | "approved" | "spam" | "deleted";

export type CommentAiModerationStatus = "not_requested" | "pending" | "completed" | "failed";

export type CommentAiModerationDecision = "approve" | "review" | "spam";

export type CommentAiModeration = {
  status: CommentAiModerationStatus;
  decision: CommentAiModerationDecision | null;
  reason: string | null;
  error: string | null;
  reviewedAt: string | null;
};

export type UserRole = "admin" | "reader";

export type CommentUserStatus = "active" | "muted";

export type EmailPreference = "none" | "weekly_blog_updates";

export type CmsUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  image: string | null;
  commentStatus: CommentUserStatus;
  commentStatusUpdatedAt: string | null;
  emailPreference: EmailPreference;
  emailPreferenceUpdatedAt: string | null;
  marketingOptOut: boolean;
  commentReplyNotificationsEnabled: boolean;
  providers: Array<"email" | "github" | "google" | "unknown">;
  commentCount: number;
  lastCommentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Comment = {
  id: string;
  postId: string;
  parentId: string | null;
  authorUserId?: string | null;
  authorName: string;
  authorEmailHash: string;
  authorWebsite: string | null;
  body: string;
  status: CommentStatus;
  aiModeration?: CommentAiModeration;
  createdAt: string;
  i18n?: LocalizedFields<"body">;
};

export type Asset = {
  id: string;
  key: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  attachedPostId: string | null;
};

export type SiteSettings = {
  name: string;
  description: string;
  url: string;
  authorName: string;
  authorBio: string;
  avatarUrl: string;
  defaultOgImage: string;
  socialLinks: Array<{
    label: string;
    href: string;
  }>;
  navigation: Array<{
    label: string;
    href: string;
    i18n?: LocalizedFields<"label">;
  }>;
  rssEnabled: boolean;
  commentsEnabled: boolean;
  commentsRequireApproval: boolean;
  commentAutoBlockEnabled: boolean;
  commentBlockedKeywords: string[];
  aiCommentModerationEnabled: boolean;
  aiCommentModerationRules: string;
  emailVerificationEnabled: boolean;
  emailNotificationsEnabled: boolean;
  manualEmailBroadcastsEnabled: boolean;
  indexingEnabled: boolean;
  themePreset: ThemePreset;
  layoutPreset: LayoutPreset;
  locales: SupportedLocale[];
  primaryLanguage: SupportedLocale;
  i18n?: LocalizedFields<"name" | "description" | "authorBio">;
};

export type ApiTokenScope =
  | "posts:read"
  | "posts:write"
  | "posts:publish"
  | "assets:write"
  | "comments:moderate"
  | "site:read"
  | "site:write"
  | "export:read";

export type ApiToken = {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: ApiTokenScope[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};
