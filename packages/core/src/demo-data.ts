import type { Asset, Comment, Post, Series, SiteSettings, Tag } from "./types";

export const siteSettings: SiteSettings = {
  name: "01MVP Blog Starter",
  description:
    "A Cloudflare-native personal site for articles, videos, durable notes, and API-assisted publishing.",
  url: "https://your-domain.example",
  authorName: "01MVP",
  authorBio:
    "Builder notes, product essays, and durable personal knowledge on an edge-native publishing stack.",
  avatarUrl: "/og-default.svg",
  defaultOgImage: "/og-default.svg",
  socialLinks: [
    { label: "GitHub", href: "https://github.com/01mvp/blog-starter" },
    { label: "RSS", href: "/rss.xml" },
  ],
  navigation: [
    { label: "Demo", href: "/demo", i18n: { label: { zh: "博客 Demo" } } },
    { label: "Docs", href: "/docs", i18n: { label: { zh: "文档" } } },
    { label: "Articles", href: "/blog", i18n: { label: { zh: "文章" } } },
    { label: "About", href: "/about", i18n: { label: { zh: "关于" } } },
  ],
  rssEnabled: true,
  commentsEnabled: true,
  commentsRequireApproval: true,
  commentAutoBlockEnabled: true,
  commentBlockedKeywords: ["博彩", "赌博", "色情", "诈骗", "辱骂", "violence", "scam", "spam"],
  aiCommentModerationEnabled: false,
  aiCommentModerationRules:
    "判断这条博客评论是否适合公开展示。拦截广告、诈骗、钓鱼、辱骂、仇恨、色情、暴力威胁、隐私泄露、无意义灌水和明显 SEO 外链。普通反对意见、批评、提问、纠错、补充信息应该允许。",
  emailVerificationEnabled: false,
  emailNotificationsEnabled: false,
  manualEmailBroadcastsEnabled: false,
  indexingEnabled: true,
  themePreset: "maker",
  layoutPreset: "shelf",
  locales: ["en", "zh"],
  primaryLanguage: "en",
  i18n: {
    description: {
      zh: "基于 Cloudflare 的个人站点，用来沉淀文章、视频、长期笔记和 API 辅助发布工作流。",
    },
    authorBio: {
      zh: "基于边缘原生发布栈记录构建笔记、产品文章和长期可沉淀的个人知识。",
    },
  },
};

export const tags: Tag[] = [
  {
    id: "tag-cloudflare",
    name: "Cloudflare",
    slug: "cloudflare",
    description: "Workers, D1, R2, Turnstile, and edge deployment notes.",
    i18n: {
      name: { zh: "Cloudflare" },
      description: { zh: "Workers、D1、R2、Turnstile 和边缘部署笔记。" },
    },
  },
  {
    id: "tag-publishing",
    name: "Publishing",
    slug: "publishing",
    description: "Content workflows for writing, publishing, importing, and exporting.",
    i18n: {
      name: { zh: "内容管理" },
      description: { zh: "覆盖写作、发布、导入和导出的内容工作流。" },
    },
  },
  {
    id: "tag-ai",
    name: "API Automation",
    slug: "api-automation",
    description: "OpenAPI workflows for repeatable publishing and site maintenance.",
    i18n: {
      name: { zh: "API 自动化" },
      description: { zh: "用于发布和站点维护的 OpenAPI 工作流。" },
    },
  },
  {
    id: "tag-markdown",
    name: "Markdown",
    slug: "markdown",
    description: "Markdown-first authoring with rendered HTML, search text, and portable exports.",
    i18n: {
      name: { zh: "Markdown" },
      description: { zh: "以 Markdown 为核心的写作、HTML 渲染、搜索文本和可迁移导出。" },
    },
  },
];

export const series: Series[] = [
  {
    id: "series-publishing-stack",
    name: "Publishing Stack",
    slug: "publishing-stack",
    description: "Long-running notes on the blog engine, storage model, and publishing workflow.",
    sortOrder: 10,
    i18n: {
      name: { zh: "发布栈" },
      description: { zh: "围绕博客引擎、存储模型和发布工作流的长期笔记。" },
    },
  },
  {
    id: "series-ai-workflow",
    name: "AI Workflow",
    slug: "ai-workflow",
    description: "Automation flows for setup, content operations, and agent-friendly maintenance.",
    sortOrder: 20,
    i18n: {
      name: { zh: "AI 工作流" },
      description: { zh: "面向初始化、内容运营和 Agent 维护的自动化流程。" },
    },
  },
];

const cloudflare = tags[0];
const publishing = tags[1];
const ai = tags[2];
const markdown = tags[3];
const publishingStack = series[0];
const aiWorkflow = series[1];

export const posts: Post[] = [
  {
    id: "post-edge-publishing",
    title: "Designing a permanent personal publishing system on Cloudflare",
    slug: "designing-a-permanent-personal-publishing-system-on-cloudflare",
    excerpt:
      "The template stores canonical content in D1, keeps media and backup archives in R2, and exposes the same OpenAPI publishing surface to people and automation tools.",
    coverImage: "/demo/desk.jpg",
    contentMarkdown: `# Designing a permanent personal publishing system on Cloudflare

01mvp-blog-starter treats the database as the source of truth and Markdown as the durable content format. Posts, comments, settings, and API tokens live in D1. Images, attachments, import packages, and backups live in R2.

The first release focuses on a reliable loop: sign in, write, upload, publish, render, comment, review, and export. Paid features such as email notifications stay optional so the free core remains usable.

## Core boundaries

- D1 owns structured content.
- R2 owns binary assets.
- Markdown remains exportable.
- HTML imports are sanitized before rendering.
- API tokens use scoped permissions for OpenAPI automation.
`,
    contentHtml:
      "<p>01mvp-blog-starter treats the database as the source of truth and Markdown as the durable content format.</p><p>The first release focuses on a reliable loop: sign in, write, upload, publish, render, comment, review, and export.</p>",
    contentText:
      "01mvp-blog-starter stores posts comments settings and API tokens in D1 and stores assets imports and backups in R2.",
    status: "published",
    source: "editor",
    featured: true,
    pinned: true,
    commentsEnabled: true,
    publishedAt: "2026-05-20T09:00:00.000Z",
    updatedAt: "2026-05-22T12:20:00.000Z",
    authorName: "01MVP",
    series: publishingStack,
    tags: [cloudflare, publishing, markdown],
    seoTitle: "Designing a permanent personal publishing system on Cloudflare",
    seoDescription:
      "How 01mvp-blog-starter uses Cloudflare Workers, D1, R2, Markdown, and scoped automation for durable personal publishing.",
    i18n: {
      title: { zh: "在 Cloudflare 上设计一个长期可用的个人发布系统" },
      excerpt: {
        zh: "这个模板把标准内容存入 D1，把媒体和备份归档放进 R2，并向作者和自动化工具暴露同一套 OpenAPI 发布能力。",
      },
      contentMarkdown: {
        zh: `# 在 Cloudflare 上设计一个长期可用的个人发布系统

01mvp-blog-starter 把数据库视为事实来源，把 Markdown 视为长期可迁移的内容格式。文章、页面、评论、站点设置和 API Token 存在 D1，图片、附件、导入包和备份存在 R2。

第一版聚焦一个可靠闭环：登录、写作、上传、发布、渲染、评论、审核和导出。邮件通知等付费能力保持可选，让免费核心能力依旧完整可用。

## 核心边界

- D1 负责结构化内容。
- R2 负责二进制资源。
- Markdown 始终可以导出。
- HTML 导入会先清洗再渲染。
- API Token 为 OpenAPI 自动化提供受限权限。
`,
      },
      contentHtml: {
        zh: "<p>01mvp-blog-starter 把数据库视为事实来源，把 Markdown 视为长期可迁移的内容格式。</p><p>第一版聚焦一个可靠闭环：登录、写作、上传、发布、渲染、评论、审核和导出。</p>",
      },
      contentText: {
        zh: "01mvp-blog-starter 将文章、页面、评论、设置和 API Token 存入 D1，并将资源、导入包和备份存入 R2。",
      },
      seoTitle: { zh: "在 Cloudflare 上设计长期可用的个人发布系统" },
      seoDescription: {
        zh: "01mvp-blog-starter 如何使用 Cloudflare Workers、D1、R2、Markdown 和受限自动化能力支持长期个人发布。",
      },
    },
  },
  {
    id: "post-skill-runner",
    title: "What a guided setup workflow should automate",
    slug: "what-a-guided-setup-workflow-should-automate",
    excerpt:
      "A setup workflow should check local tooling, prepare Cloudflare resources, write site config, deploy the Worker, validate routes, and create the first post.",
    coverImage: "/demo/notes.jpg",
    contentMarkdown: `# What a guided setup workflow should automate

A good setup workflow should remove repetitive deployment work without hiding the decisions a site owner needs to make.

It should collect the site name, author, domain, theme, comments preference, and email preference. Then it checks Node, pnpm, Vite+, Wrangler, and Cloudflare auth state before preparing D1, R2, optional KV, and Turnstile resources.

Manual steps are reserved for login, token creation, paid-plan confirmation, DNS confirmation, and email verification.
`,
    contentHtml:
      "<p>A good setup workflow should remove repetitive deployment work without hiding the decisions a site owner needs to make.</p><p>Manual steps are reserved for login, token creation, paid-plan confirmation, DNS confirmation, and email verification.</p>",
    contentText:
      "The setup workflow checks local tooling prepares Cloudflare resources writes config deploys validates and creates a first post.",
    status: "published",
    source: "ai",
    featured: true,
    pinned: false,
    commentsEnabled: true,
    publishedAt: "2026-05-21T10:30:00.000Z",
    updatedAt: "2026-05-21T10:30:00.000Z",
    authorName: "01MVP",
    series: aiWorkflow,
    tags: [ai, cloudflare],
    seoTitle: "Setup automation plan for 01mvp-blog-starter",
    seoDescription:
      "A guided setup workflow can configure, deploy, validate, and maintain a Cloudflare-native blog.",
    i18n: {
      title: { zh: "引导式初始化流程应该自动化哪些步骤" },
      excerpt: {
        zh: "初始化流程应该检查本地工具、准备 Cloudflare 资源、写入站点配置、部署 Worker、验证路由并创建第一篇文章。",
      },
      contentMarkdown: {
        zh: `# 引导式初始化流程应该自动化哪些步骤

好的初始化流程应该减少重复部署工作，同时保留站点所有者需要做的关键选择。

它需要收集站点名称、作者、域名、主题、评论偏好、邮件偏好和主语言，然后检查 Node、pnpm、Vite+、Wrangler 和 Cloudflare 登录状态，再准备 D1、R2、可选 KV 与 Turnstile 资源。

人工步骤只保留给登录、Token 创建、付费计划确认、DNS 确认和邮件验证。
`,
      },
      contentHtml: {
        zh: "<p>好的初始化流程应该减少重复部署工作，同时保留站点所有者需要做的关键选择。</p><p>人工步骤只保留给登录、Token 创建、付费计划确认、DNS 确认和邮件验证。</p>",
      },
      contentText: {
        zh: "初始化流程会检查本地工具、准备 Cloudflare 资源、写入配置、部署、验证并创建第一篇文章。",
      },
      seoTitle: { zh: "01mvp-blog-starter 的初始化自动化计划" },
      seoDescription: {
        zh: "引导式初始化流程可以配置、部署、验证并维护一个新的 Cloudflare 原生博客。",
      },
    },
  },
  {
    id: "post-import-export",
    title: "A portable content model for Markdown, HTML, and ZIP backups",
    slug: "portable-content-model-markdown-html-zip-backups",
    excerpt:
      "Imports normalize Markdown, HTML, and bundled images into database records and R2 keys; exports produce a plain folder that other blog tools can read.",
    coverImage: "/demo/garden.jpg",
    contentMarkdown: `# A portable content model for Markdown, HTML, and ZIP backups

01mvp-blog-starter keeps export paths boring on purpose. A complete export contains posts, assets, comments, and site settings. Markdown stays readable by other static blogs.

HTML import has two modes: sanitized HTML for normal use and trusted iframe rendering for admin-only legacy content.
`,
    contentHtml:
      "<p>01mvp-blog-starter keeps export paths boring on purpose. A complete export contains posts, assets, comments, and site settings.</p>",
    contentText:
      "Imports normalize Markdown HTML and image ZIP bundles and exports produce portable Markdown HTML assets comments and settings.",
    status: "published",
    source: "markdown_upload",
    featured: false,
    pinned: false,
    commentsEnabled: true,
    publishedAt: "2026-05-23T08:10:00.000Z",
    updatedAt: "2026-05-23T08:10:00.000Z",
    authorName: "01MVP",
    series: publishingStack,
    tags: [publishing, markdown],
    seoTitle: "Portable Markdown, HTML, and ZIP backup model",
    seoDescription:
      "A Cloudflare-native publishing model that imports Markdown and HTML and exports portable archives.",
    i18n: {
      title: { zh: "适配 Markdown、HTML 和 ZIP 备份的可迁移内容模型" },
      excerpt: {
        zh: "导入流程会把 Markdown、HTML 和图片压缩包规范化为数据库记录与 R2 key；导出结果则是其他博客工具也能读取的普通文件夹。",
      },
      contentMarkdown: {
        zh: `# 适配 Markdown、HTML 和 ZIP 备份的可迁移内容模型

01mvp-blog-starter 刻意让导出路径保持简单。一次完整导出包含文章、资源、评论和站点设置，Markdown 依旧能被其他静态博客读取。

HTML 导入提供两种模式：普通使用场景下的安全清洗 HTML，以及只在管理后台使用的可信 iframe 渲染。
`,
      },
      contentHtml: {
        zh: "<p>01mvp-blog-starter 刻意让导出路径保持简单。一次完整导出包含文章、资源、评论和站点设置。</p>",
      },
      contentText: {
        zh: "导入流程规范化 Markdown、HTML 和图片 ZIP，导出流程生成可迁移的 Markdown、HTML、资源、评论和设置。",
      },
      seoTitle: { zh: "可迁移的 Markdown、HTML 和 ZIP 备份模型" },
      seoDescription: {
        zh: "Cloudflare 原生发布系统的内容模型，可导入 Markdown 与 HTML，并导出可迁移归档。",
      },
    },
  },
];

export const comments: Comment[] = [
  {
    id: "comment-1",
    postId: "post-edge-publishing",
    parentId: null,
    authorName: "Reader",
    authorEmailHash: "demo-email-hash",
    authorWebsite: null,
    body: "The split between D1 records and Markdown exports makes migration feel realistic.",
    status: "approved",
    createdAt: "2026-05-22T13:15:00.000Z",
    i18n: {
      body: { zh: "D1 记录和 Markdown 导出的分工让迁移路径看起来很扎实。" },
    },
  },
  {
    id: "comment-2",
    postId: "post-skill-runner",
    parentId: null,
    authorName: "Automation tester",
    authorEmailHash: "pending-email-hash",
    authorWebsite: "https://example.com",
    body: "Please add the exact fallback path for Cloudflare API token creation.",
    status: "pending",
    createdAt: "2026-05-23T06:45:00.000Z",
    i18n: {
      body: { zh: "请补上 Cloudflare API Token 创建失败时的明确兜底路径。" },
    },
  },
];

export const assets: Asset[] = [
  {
    id: "asset-og",
    key: "site/og-default.svg",
    url: "/og-default.svg",
    filename: "og-default.svg",
    contentType: "image/svg+xml",
    sizeBytes: 4096,
    createdAt: "2026-05-20T08:00:00.000Z",
    attachedPostId: null,
  },
  {
    id: "asset-cover",
    key: "posts/edge-publishing-cover.jpg",
    url: posts[0].coverImage,
    filename: "edge-publishing-cover.jpg",
    contentType: "image/jpeg",
    sizeBytes: 184320,
    createdAt: "2026-05-20T09:10:00.000Z",
    attachedPostId: "post-edge-publishing",
  },
];
