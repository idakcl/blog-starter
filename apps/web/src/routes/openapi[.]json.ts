import { createFileRoute } from "@tanstack/react-router";

import { apiTokenScopes } from "#/lib/cms-api-utils";

export const Route = createFileRoute("/openapi.json")({
  server: {
    handlers: {
      GET: () => {
        return Response.json({
          openapi: "3.1.0",
          info: {
            title: "01mvp-blog-starter API",
            version: "0.1.0",
            description:
              "Automation API for bilingual 01mvp-blog-starter publishing, imports, exports, assets, and moderation.",
          },
          paths: {
            "/api/posts": {
              get: {
                summary: "List posts",
                security: [{ apiToken: ["posts:read"] }],
                parameters: [
                  { name: "lang", in: "query", schema: { enum: ["en", "zh"] } },
                  { name: "q", in: "query", schema: { type: "string" } },
                  { name: "tag", in: "query", schema: { type: "string" } },
                  { name: "series", in: "query", schema: { type: "string" } },
                ],
                responses: { "200": { description: "Localized post list" } },
              },
              post: {
                summary: "Create post",
                description:
                  "Creating a published or scheduled post requires both posts:write and posts:publish scopes.",
                security: [{ apiToken: ["posts:write"] }],
                responses: { "201": { description: "Post created" } },
              },
            },
            "/api/posts/batch": {
              post: {
                summary: "Batch update posts",
                description:
                  "Applies publish, draft, archive, or delete to selected posts. Publish requires posts:publish in addition to posts:write.",
                security: [{ apiToken: ["posts:write"] }],
                requestBody: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          ids: { type: "array", items: { type: "string" } },
                          action: { enum: ["publish", "draft", "archive", "delete"] },
                        },
                        required: ["ids", "action"],
                      },
                    },
                  },
                },
                responses: { "200": { description: "Posts updated" } },
              },
            },
            "/api/posts/{id}": {
              get: {
                summary: "Get post",
                security: [{ apiToken: ["posts:read"] }],
                responses: { "200": { description: "Post detail" } },
              },
              patch: {
                summary: "Update post",
                description:
                  "Changing a post to published or scheduled requires both posts:write and posts:publish scopes.",
                security: [{ apiToken: ["posts:write"] }],
                responses: { "200": { description: "Post updated" } },
              },
              delete: {
                summary: "Delete post",
                security: [{ apiToken: ["posts:write"] }],
                responses: { "200": { description: "Post deleted" } },
              },
            },
            "/api/series": {
              get: {
                summary: "List series",
                security: [{ apiToken: ["posts:read"] }],
                responses: { "200": { description: "Series list" } },
              },
              post: {
                summary: "Create series",
                security: [{ apiToken: ["posts:write"] }],
                requestBody: {
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/SeriesInput" },
                    },
                  },
                },
                responses: { "201": { description: "Series created" } },
              },
            },
            "/api/series/{id}": {
              get: {
                summary: "Get series",
                security: [{ apiToken: ["posts:read"] }],
                responses: { "200": { description: "Series detail" } },
              },
              patch: {
                summary: "Update series",
                security: [{ apiToken: ["posts:write"] }],
                requestBody: {
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/SeriesInput" },
                    },
                  },
                },
                responses: { "200": { description: "Series updated" } },
              },
              delete: {
                summary: "Delete series",
                security: [{ apiToken: ["posts:write"] }],
                responses: { "200": { description: "Series deleted" } },
              },
            },
            "/api/import/markdown": {
              post: {
                summary: "Import Markdown",
                description:
                  "Parses simple frontmatter, derives title/slug/excerpt, and creates a draft unless status is provided. Published and scheduled imports also require posts:publish.",
                security: [{ apiToken: ["posts:write"] }],
                requestBody: {
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/MarkdownImportRequest" },
                    },
                  },
                },
                responses: { "202": { description: "Markdown import accepted" } },
              },
            },
            "/api/import/html": {
              post: {
                summary: "Import HTML",
                description:
                  "Sanitizes HTML, extracts title and description metadata, and creates a draft unless status is provided.",
                security: [{ apiToken: ["posts:write"] }],
                requestBody: {
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/HtmlImportRequest" },
                    },
                  },
                },
                responses: { "202": { description: "HTML import accepted" } },
              },
            },
            "/api/import/zip": {
              post: {
                summary: "Import ZIP package",
                description:
                  "Accepts a base64 ZIP or automation file manifest, imports Markdown/HTML content, uploads image entries to R2, and rewrites local image references.",
                security: [{ apiToken: ["posts:write"] }],
                requestBody: {
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/ZipImportRequest" },
                    },
                  },
                },
                responses: { "202": { description: "ZIP import accepted" } },
              },
            },
            "/api/assets": {
              get: {
                summary: "List assets",
                security: [{ apiToken: ["site:read"] }],
                responses: { "200": { description: "Asset list" } },
              },
              post: {
                summary: "Upload asset",
                security: [{ apiToken: ["assets:write"] }],
                responses: { "201": { description: "Asset uploaded" } },
              },
            },
            "/api/assets/{id}": {
              delete: {
                summary: "Delete asset",
                description: "Deletes the D1 asset record and the matching R2 object when present.",
                security: [{ apiToken: ["assets:write"] }],
                responses: {
                  "200": { description: "Asset deleted" },
                  "404": { description: "Asset not found" },
                },
              },
            },
            "/api/site": {
              get: {
                summary: "Read site settings",
                security: [{ apiToken: ["site:read"] }],
                responses: { "200": { description: "Site settings" } },
              },
              put: {
                summary: "Update site settings",
                security: [{ apiToken: ["site:write"] }],
                requestBody: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          url: { type: "string" },
                          description: { type: "string" },
                          authorName: { type: "string" },
                          authorBio: { type: "string" },
                          avatarUrl: { type: "string" },
                          defaultOgImage: { type: "string" },
                          socialLinks: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                label: { type: "string" },
                                href: { type: "string" },
                              },
                            },
                          },
                          navigation: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                label: { type: "string" },
                                href: { type: "string" },
                              },
                            },
                          },
                          themePreset: { enum: ["maker", "apple", "editorial", "brutalist"] },
                          layoutPreset: { enum: ["shelf", "developer", "journal"] },
                          primaryLanguage: { enum: ["en", "zh"] },
                          rssEnabled: { type: "boolean" },
                          commentsEnabled: { type: "boolean" },
                          commentsRequireApproval: { type: "boolean" },
                          commentAutoBlockEnabled: { type: "boolean" },
                          commentBlockedKeywords: {
                            type: "array",
                            items: { type: "string" },
                          },
                          aiCommentModerationEnabled: { type: "boolean" },
                          aiCommentModerationRules: { type: "string" },
                          emailVerificationEnabled: { type: "boolean" },
                          emailNotificationsEnabled: { type: "boolean" },
                          manualEmailBroadcastsEnabled: { type: "boolean" },
                          indexingEnabled: { type: "boolean" },
                        },
                      },
                    },
                  },
                },
                responses: { "200": { description: "Site settings updated" } },
              },
            },
            "/api/export": {
              get: {
                summary: "Export site archive",
                description:
                  "Returns JSON by default. Use format=zip to download a full ZIP archive with Markdown, HTML, JSON manifests, comments, settings, and bundled R2 assets.",
                security: [{ apiToken: ["export:read"] }],
                parameters: [{ name: "format", in: "query", schema: { enum: ["json", "zip"] } }],
                responses: {
                  "200": {
                    description: "Export archive",
                    content: {
                      "application/json": {
                        schema: { type: "object" },
                      },
                      "application/zip": {
                        schema: { type: "string", format: "binary" },
                      },
                    },
                  },
                },
              },
            },
            "/api/backups": {
              post: {
                summary: "Create backup",
                description:
                  "Creates a ZIP export backup in R2 and applies the configured backup retention policy.",
                security: [{ apiToken: ["export:read"] }],
                responses: {
                  "201": {
                    description: "Backup created",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/BackupResult" },
                      },
                    },
                  },
                },
              },
            },
            "/api/comments": {
              get: {
                summary: "List comments for moderation",
                security: [{ apiToken: ["comments:moderate"] }],
                parameters: [{ name: "lang", in: "query", schema: { enum: ["en", "zh"] } }],
                responses: { "200": { description: "Localized moderation queue" } },
              },
              post: {
                summary: "Submit comment",
                description:
                  "Requires a reader comment session. Author name and email are taken from the session.",
                requestBody: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          postSlug: { type: "string" },
                          parentId: {
                            type: "string",
                            description: "Optional approved parent comment id for replies.",
                          },
                          body: { type: "string" },
                          turnstileToken: {
                            type: "string",
                            description:
                              "Required only when Turnstile site key and secret are configured.",
                          },
                        },
                        required: ["postSlug", "body"],
                      },
                    },
                  },
                },
                responses: {
                  "201": { description: "Comment created through moderation settings" },
                  "401": { description: "Comment login required" },
                  "403": { description: "Comment account is muted" },
                },
              },
            },
            "/api/comment-auth/me": {
              get: {
                summary: "Read current comment user",
                responses: { "200": { description: "Current reader comment user or null" } },
              },
            },
            "/api/comment-auth/login": {
              post: {
                summary: "Email login for commenting",
                requestBody: {
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/CommentEmailAuthRequest" },
                    },
                  },
                },
                responses: {
                  "200": { description: "Comment session created" },
                  "401": { description: "Email verification required or credentials invalid" },
                },
              },
            },
            "/api/comment-auth/signup": {
              post: {
                summary: "Email signup for commenting",
                requestBody: {
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/CommentEmailSignupRequest" },
                    },
                  },
                },
                responses: {
                  "200": { description: "Comment user and session created" },
                  "202": { description: "Verification email sent" },
                },
              },
            },
            "/api/comment-auth/verify-email": {
              get: {
                summary: "Verify comment account email",
                parameters: [
                  { name: "userId", in: "query", schema: { type: "string" } },
                  { name: "token", in: "query", schema: { type: "string" } },
                ],
                responses: {
                  "200": { description: "Email verified" },
                  "400": { description: "Verification link invalid or expired" },
                },
              },
            },
            "/api/comment-auth/logout": {
              post: {
                summary: "Logout comment user",
                responses: { "200": { description: "Comment session cleared" } },
              },
            },
            "/api/comment-auth/github/start": {
              get: {
                summary: "Start GitHub comment login",
                responses: { "302": { description: "Redirect to GitHub OAuth" } },
              },
            },
            "/api/comment-auth/google/start": {
              get: {
                summary: "Start Google comment login",
                responses: { "302": { description: "Redirect to Google OAuth" } },
              },
            },
            "/api/admin/email-status": {
              get: {
                summary: "Read outbound email configuration status",
                security: [{ apiToken: ["site:read"] }],
                responses: { "200": { description: "Email provider and verification status" } },
              },
            },
            "/api/admin/users": {
              get: {
                summary: "List admin and reader users",
                responses: { "200": { description: "User list with comment access status" } },
              },
            },
            "/api/admin/users/{id}": {
              patch: {
                summary: "Update a user's role or comment access",
                requestBody: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          role: { type: "string", enum: ["admin", "reader"] },
                          commentStatus: { type: "string", enum: ["active", "muted"] },
                        },
                      },
                    },
                  },
                },
                responses: {
                  "200": { description: "User updated" },
                  "404": { description: "User not found" },
                },
              },
            },
            "/api/comments/{id}/approve": {
              post: {
                summary: "Approve comment",
                security: [{ apiToken: ["comments:moderate"] }],
                responses: { "200": { description: "Comment approved" } },
              },
            },
            "/api/comments/{id}/spam": {
              post: {
                summary: "Mark comment as spam",
                security: [{ apiToken: ["comments:moderate"] }],
                responses: { "200": { description: "Comment marked as spam" } },
              },
            },
            "/api/comments/{id}/delete": {
              post: {
                summary: "Delete comment",
                security: [{ apiToken: ["comments:moderate"] }],
                responses: { "200": { description: "Comment deleted" } },
              },
            },
            "/api/tokens": {
              get: {
                summary: "List API tokens",
                security: [{ adminSession: [] }],
                responses: { "200": { description: "API token list" } },
              },
              post: {
                summary: "Create API token",
                security: [{ adminSession: [] }],
                responses: { "201": { description: "API token created" } },
              },
            },
            "/api/tokens/{id}/revoke": {
              post: {
                summary: "Revoke API token",
                security: [{ adminSession: [] }],
                responses: { "200": { description: "API token revoked" } },
              },
            },
            "/api/admin/password-reset": {
              post: {
                summary: "Request or confirm password reset",
                description:
                  "Requests an optional Email Sending password reset link when email is supplied, or confirms a reset when token and password are supplied.",
                requestBody: {
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/PasswordResetRequest" },
                    },
                  },
                },
                responses: {
                  "202": { description: "Password reset email accepted" },
                  "200": { description: "Password updated" },
                },
              },
            },
          },
          components: {
            securitySchemes: {
              apiToken: {
                type: "http",
                scheme: "bearer",
              },
              adminSession: {
                type: "apiKey",
                in: "cookie",
                name: "better-auth.session_token",
              },
            },
            schemas: {
              LocalizedFields: {
                type: "object",
                additionalProperties: {
                  type: "object",
                  properties: {
                    en: { type: "string" },
                    zh: { type: "string" },
                  },
                },
              },
              ImportPostFields: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  slug: { type: "string" },
                  excerpt: { type: "string" },
                  status: { enum: ["draft", "published", "scheduled", "archived"] },
                  publishedAt: { type: "string", format: "date-time" },
                  coverImage: { type: "string" },
                  seoTitle: { type: "string" },
                  seoDescription: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  seriesId: { type: "string" },
                  seriesSlug: { type: "string" },
                  seriesName: { type: "string" },
                  locale: { enum: ["en", "zh"] },
                  i18n: { $ref: "#/components/schemas/LocalizedFields" },
                },
              },
              SeriesInput: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  slug: { type: "string" },
                  description: { type: "string" },
                  sortOrder: { type: "number" },
                  locale: { enum: ["en", "zh"] },
                },
                required: ["name"],
              },
              MarkdownImportRequest: {
                allOf: [
                  { $ref: "#/components/schemas/ImportPostFields" },
                  {
                    type: "object",
                    properties: {
                      filename: { type: "string" },
                      contentMarkdown: { type: "string" },
                    },
                    required: ["contentMarkdown"],
                  },
                ],
              },
              HtmlImportRequest: {
                allOf: [
                  { $ref: "#/components/schemas/ImportPostFields" },
                  {
                    type: "object",
                    properties: {
                      filename: { type: "string" },
                      contentHtml: { type: "string" },
                    },
                    required: ["contentHtml"],
                  },
                ],
              },
              ZipImportRequest: {
                allOf: [
                  { $ref: "#/components/schemas/ImportPostFields" },
                  {
                    type: "object",
                    properties: {
                      filename: { type: "string" },
                      contentBase64: { type: "string" },
                      files: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            path: { type: "string" },
                            contentBase64: { type: "string" },
                            contentText: { type: "string" },
                            contentType: { type: "string" },
                          },
                          required: ["path"],
                        },
                      },
                    },
                  },
                ],
              },
              BackupResult: {
                type: "object",
                properties: {
                  trigger: { enum: ["manual"] },
                  backup: {
                    type: "object",
                    properties: {
                      key: { type: "string" },
                      url: { type: "string" },
                      contentType: { type: "string" },
                      sizeBytes: { type: "number" },
                      createdAt: { type: "string" },
                    },
                  },
                  retentionDays: { type: "number" },
                  prunedKeys: { type: "array", items: { type: "string" } },
                  assetCount: { type: "number" },
                  missingAssetKeys: { type: "array", items: { type: "string" } },
                  exportedAt: { type: "string" },
                },
              },
              PasswordResetRequest: {
                oneOf: [
                  {
                    type: "object",
                    properties: {
                      email: { type: "string" },
                    },
                    required: ["email"],
                  },
                  {
                    type: "object",
                    properties: {
                      token: { type: "string" },
                      password: { type: "string" },
                    },
                    required: ["token", "password"],
                  },
                ],
              },
              CommentEmailAuthRequest: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                },
                required: ["email", "password"],
              },
              CommentEmailSignupRequest: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 1 },
                  email: { type: "string" },
                  password: { type: "string" },
                },
                required: ["name", "email", "password"],
              },
            },
          },
          "x-token-scopes": apiTokenScopes,
        });
      },
    },
  },
});
