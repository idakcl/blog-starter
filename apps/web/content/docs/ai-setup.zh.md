---
title: AI 初始化建站
description: 用 01mvp-blog Skill 或复制 Prompt，让 AI 帮你从模板部署到 Cloudflare。
---

## 你需要准备什么

开始前先准备这些东西：

| 项目                    | 必需吗 | 说明                                               |
| ----------------------- | ------ | -------------------------------------------------- |
| Cloudflare 账号         | 必需   | 网站、数据库、存储和域名绑定都会放在 Cloudflare 上 |
| GitHub 账号             | 推荐   | 用来保存你的博客代码，方便未来继续升级             |
| AI 编程工具             | 必需   | Codex、Claude Code、Cursor 等都可以                |
| Cloudflare 插件或连接器 | 推荐   | 让 AI 可以创建 D1、KV、R2、Worker 和 DNS 记录      |
| 自定义域名              | 可选   | 没有域名也能先用 `*.workers.dev` 访问              |

如果你面向中国大陆读者，建议准备自己的域名。Cloudflare 默认提供的 `*.workers.dev` 在中国大陆很多网络环境里打不开或不稳定；绑定自己的域名后，一般访问会更可控。长期公开运营、高访问量或商业化站点，还需要按当地要求处理备案、接入和合规事项。

## 推荐方式：安装 01mvp-blog Skill

Skill 的好处是后续可以更新。模板命令、Cloudflare 创建流程、验收清单有变化时，重新安装或更新 Skill 就能拿到新流程。

1. 在 Codex、Claude Code 或 Cursor 里安装 Cloudflare 插件，并完成 Cloudflare 授权。
2. Fork、clone 或下载 [`01MVP/blog-starter`](https://github.com/01MVP/blog-starter) 仓库。
3. 在你的项目里安装 `01mvp-blog` Skill：

```sh
npx skills@latest add 01MVP/blog-starter --skill 01mvp-blog --agent codex --yes
```

如果你使用其他 AI 工具，把 `codex` 换成你的 agent id，例如 `cursor` 或 `gemini-cli`。

4. 把下面这句话发给 AI：

```txt
请使用 01mvp-blog Skill，从 01MVP/blog-starter 为我创建一个新的个人博客。优先自动完成 GitHub 仓库、Cloudflare D1、KV、R2、Worker、DNS、D1 migrations、部署和上线验证。缺少 Cloudflare 登录、域名确认、付款方式确认、OAuth 密钥或邮件验证时再让我手动处理。
```

AI 会继续向你收集站点名称、作者、语言、域名、主题、评论和邮件等信息。

## 备选方式：直接复制 Prompt

如果你不想安装 Skill，可以把下面这段完整复制给 AI。它会按同一套流程执行，只是未来模板流程更新时，需要你重新复制新版文档。

```txt
你是我的个人博客建站执行助手。请基于 https://github.com/01MVP/blog-starter 为我创建并部署一个 Cloudflare 原生个人博客。

目标：
- 创建或使用我的 GitHub 仓库保存博客代码。
- 连接我的 Cloudflare 账号。
- 自动创建并绑定 Cloudflare Worker、D1、KV、R2。
- 写入 wrangler 配置、生成必要 secret、执行 D1 migrations、部署 Worker。
- 如果我提供自定义域名，自动配置 DNS 和 Worker route；如果域名还没接入 Cloudflare，请告诉我需要完成哪些人工步骤。
- 部署后验证公开首页、/blog、/admin、/openapi.json、RSS、sitemap、robots、D1 数据、R2 上传、导出和备份。

你需要先向我确认这些信息：
- 项目名和 GitHub 仓库名
- 博客名称、简介、作者名、作者邮箱
- 主语言：zh 或 en
- 域名：可以先用 *.workers.dev，也可以绑定自定义域名
- 主题预设：maker、apple、editorial、brutalist
- 布局预设：shelf、developer、journal
- 是否开启评论
- 是否开启 GitHub 或 Google 登录
- 是否开启 Email Sending

执行规则：
- 优先自动完成可以通过命令或 API 完成的步骤。
- 只有 Cloudflare 登录、账号注册、域名购买、nameserver 切换、付款方式确认、OAuth 应用创建、邮件验证这些无法自动完成的环节，才让我手动处理。
- R2 用于图片、导入、导出和备份。R2 通常需要账号绑定付款方式才能开通；如果我暂时不想处理，请先说明哪些功能会受影响。
- Email Sending 是可选功能，目前需要 Workers Paid。不开启时，邮件验证码、密码重置邮件、邮件通知相关功能可以先关闭。
- 自定义域名是可选但推荐的。若主要面向中国大陆读者，不要只依赖 *.workers.dev。
- 不要覆盖我本地已有的未确认改动。每次修改后给我列出改动文件和验证结果。

最后交付：
- GitHub 仓库地址
- Cloudflare Worker 名称
- D1、KV、R2 资源名称
- 正式访问地址和后台地址
- 管理员账号创建方式
- API Token 创建方式
- 验证清单和未完成的人工事项
```

## AI 会自动做什么

| 事项               | AI 可以处理吗 | 说明                                                 |
| ------------------ | ------------- | ---------------------------------------------------- |
| 克隆或创建仓库     | 可以          | 也可以从 fork 后的仓库继续                           |
| 生成站点配置       | 可以          | 包括语言、主题、站点信息、社交链接                   |
| 创建 D1 数据库     | 可以          | 用于文章、评论、用户、设置和 API Token               |
| 创建 KV namespace  | 可以          | 用于缓存和短期记录                                   |
| 创建 R2 bucket     | 可以          | 账号需要允许 R2；通常要先确认付款方式                |
| 生成 secret        | 可以          | 例如 `BETTER_AUTH_SECRET`                            |
| 执行 D1 migrations | 可以          | 把数据库结构写到远程 D1                              |
| 部署 Worker        | 可以          | 部署完成后会得到公开访问地址                         |
| 绑定自定义域名     | 通常可以      | 前提是域名已经在 Cloudflare 或 nameserver 已完成切换 |
| 验证上线结果       | 可以          | 包括首页、后台、RSS、sitemap、OpenAPI、上传和导出    |

## 你可能需要手动做什么

AI 不能替你完成所有网页里的确认动作。遇到下面情况时，按 AI 给出的提示操作即可：

- 注册或登录 Cloudflare。
- 选择 Cloudflare 账号。
- 购买域名或把域名 nameserver 切到 Cloudflare。
- 为 Cloudflare 账号确认付款方式。
- 创建 GitHub / Google OAuth App，并复制 Client ID、Client Secret。
- 验证发信域名、收件邮箱或 Email Sending 权限。
- 在后台创建第一个管理员账号。

## 进阶功能

### R2 图片和备份

R2 用来存储图片、导入包、导出包和 ZIP 备份。Cloudflare R2 有免费额度，且没有下载流量费用，但账号通常需要先绑定付款方式才能开通。少量个人博客图片通常会落在免费额度内，具体以 [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/) 为准。

如果你跳过 R2，文章和评论仍可使用，但图片上传、导入、导出和备份体验会受影响。

### Email Sending

Email Sending 用于密码重置邮件、评论通知、导入导出通知等。这个功能是可选的；不开启时，站点仍然可以发布文章、管理评论、上传图片和导出备份。

Cloudflare Email Sending 目前需要 Workers Paid，Email Routing 可用于收信转发。价格和可用性以 [Cloudflare Email Service Pricing](https://developers.cloudflare.com/email-service/platform/pricing/) 为准。

### 自定义域名

没有域名也可以先上线，默认会得到 `*.workers.dev` 地址。这个地址适合测试，但在中国大陆很多网络环境里打不开或不稳定。建议正式公开时绑定自己的域名：

- 更像一个长期个人品牌资产。
- 更方便迁移和保留链接。
- 面向中国大陆访问时更稳定可控。
- 长期稳定、大量公开访问时，需要额外考虑备案和接入要求。

### API Token

部署完成后，你可以在后台创建受限 API Token。AI、脚本或自动化工具可以通过 `/openapi.json` 和 API Token 发布文章、上传图片、导出数据或审核评论。
