#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), "output", "2026-06-05-blog-starter-launch");
const postsDir = join(outDir, "posts");

mkdirSync(postsDir, { recursive: true });

const generatedAt = "2026-06-05T06:00:00.000Z";

const productionPosts = [
  {
    id: "post_blog_starter_origin_20260531",
    title: "为什么我想做一个可以被 AI 维护的个人博客",
    slug: "why-i-built-an-ai-maintained-personal-blog",
    excerpt:
      "这篇文章从预发布说明更新成正式介绍，聊 01mvp-blog-starter 为什么存在，以及普通人怎么用 AI 和 Cloudflare 拥有一个自己的博客。",
    seoDescription:
      "01mvp-blog-starter 的正式介绍，包含项目动机、AI 维护博客的意义、Skill 和复制 Prompt 两种初始化方式。",
    publishedAt: "2026-05-31T11:10:52.540Z",
    featured: true,
    pinned: true,
    tags: ["01MVP", "AI Skill", "Cloudflare", "个人博客"],
    markdown: `
我之前写过一篇预发布说明，标题也是这一句，为什么我想做一个可以被 AI 维护的个人博客。

那时候这个项目还更像一个半成品，我只是把大概方向跑起来了，朋友可以装一个 Skill，让 AI 帮他从模板里初始化一个博客。

现在我把这件事重新整理了一遍。

01mvp-blog-starter 不只是一份代码模板，它更像一份给普通人的 AI 建站说明书。你可以安装 01mvp-blog Skill，也可以直接复制一段 Prompt 给 Codex。后面的事交给 AI 去做，AI 会帮你 clone 仓库、安装依赖、创建 Cloudflare 资源、部署 Worker、绑定域名、跑通后台。

人真正需要处理的环节很少。

你需要有一个 Cloudflare 账号。你需要在 Codex 里安装 Cloudflare 插件或连接器。你可能需要自己登录 Cloudflare、选择账号、购买域名、切换 nameserver、确认付款方式。GitHub 登录、Google 登录、邮件发送这些进阶能力，也需要你自己去创建对应的密钥。

剩下的初始化工作，应该由 AI 完成。

## 我为什么还要做博客

我一直觉得，个人博客这件事没有过时。

只是以前搭一个博客太麻烦了。

你要选框架，要买服务器，要折腾数据库，要处理登录，要备份图片，要管部署。稍微认真一点，还要考虑评论、邮件通知、RSS、SEO、后台编辑、导入导出。

这些东西每一个单独看都不难，但叠在一起，对很多非程序员来说就会变成一道墙。

AI 出现以后，这道墙开始变矮了。

但我发现另一个问题，很多人虽然会让 AI 写代码，却不知道怎么把一个真实项目交给 AI。AI 可以写一个页面，可以生成一个 demo，但从空仓库到生产环境，里面有太多边角活。

所以我想做一个项目，把这些边角活收进一个稳定模板里。

这个模板里已经有后台、文章系统、评论系统、读者账号、RSS、站点地图、导入导出、图片存储、邮件配置入口。AI 不需要从零发明一套博客系统，它只需要照着这份模板完成初始化。

这就是 01mvp-blog-starter 的价值。

## Skill 和复制 Prompt

最开始我做的是 Skill。

Skill 的好处很明显。用户安装一次之后，后面如果初始化流程、Cloudflare 命令、资源配置有更新，我可以继续维护 Skill。新用户拿到的是更新后的流程。

但我后来又想了一下，如果一个新手只是想搭个博客，让他先学会安装 Skill，也是一道小门槛。

所以现在我给两种方式。

推荐方式是安装 01mvp-blog Skill。适合想长期使用、希望流程持续更新的人。

备用方式是复制 AI 初始化文档里的 Prompt。适合想马上试一下、不想安装额外东西的人。

两种方式的目标一样，都是让 AI 按同一套流程创建博客。

## 这套博客适合谁

它适合几类人。

一类是想重新拥有个人网站的人。你不想把所有内容都放在公众号、小红书、X、知乎这些平台里，想有一个自己能长期控制的地方。

一类是正在学习 AI 编程的人。你不想只停留在 toy demo，希望亲手跑一个真实的全栈项目，里面有数据库、有登录、有后台、有部署、有域名。

还有一类是产品经理、设计师、运营、自媒体人。你不一定想成为程序员，但你想知道，现在一个普通人能不能靠 AI 做出一个像样的网站。

我希望答案是，可以。

## 域名这块要讲清楚

Cloudflare Workers 默认会给你一个 \`*.workers.dev\` 地址。这个地址适合测试，能帮你很快看到网站跑起来。

但如果你的读者主要在中国大陆，我建议准备自己的域名。

\`*.workers.dev\` 在中国大陆很多网络环境里打不开或不稳定。绑定自己的域名之后，访问会更可控一些。长期公开运营、高访问量或商业化站点，还需要按当地要求处理备案、接入和合规事项。

这个问题并不只属于 01mvp-blog-starter，所有部署在海外平台上的网站都需要面对。

所以我在文档里把它写清楚。不要等网站做好了，才发现入口不适合自己的读者。

## 可选功能不用一开始全开

R2 用来放图片、导入包、导出包和备份。Cloudflare R2 本身有免费额度，但通常需要账号绑定付款方式才能开通。

邮件功能目前可以先放一放。Email Sending 需要 Workers Paid。不开启邮件时，你可以先关闭邮件验证码、密码重置邮件、评论回复邮件、博客周报这些功能。

GitHub 登录、Google 登录、API Token 也都可以后面再配。

我不希望新手一上来就被一堆配置吓退。先让博客跑起来，能写文章，能访问后台，能部署上线，这就已经赢了一次。

## 我接下来会自己先用

我会把自己的博客当成第一个真实用户来迁移。

先用 \`new.makerjackie.com\` 跑新站，原来的 \`makerjackie.com\` 先保留。等内容迁移、域名、评论、后台都确认没问题，再考虑正式切换。

这个过程里，Skill 如果哪里不顺，我会继续改。文档如果哪一步不够小白友好，我也会补。

我做这个项目，目标不在证明模板多厉害。

我更在意的是，屏幕前的你能不能真的把它跑起来。

能不能在某一天，用 AI 搭出一个自己的博客，然后写下第一篇文章。

那一刻会很小。

但它很重要。
`.trim(),
  },
  {
    id: "post_cloudflare_stack_20260605",
    title: "这个博客为什么选 Cloudflare 全家桶",
    slug: "why-this-blog-uses-cloudflare-stack",
    excerpt:
      "从 Workers、D1、KV、R2 到 Email Service，拆一下 01mvp-blog-starter 的技术选型，以及这些选择对个人博客意味着什么。",
    seoDescription:
      "01mvp-blog-starter 技术选型说明，覆盖 TanStack Start、Cloudflare Workers、D1、KV、R2、Better Auth、Drizzle 和 AI 初始化流程。",
    publishedAt: "2026-06-05T05:30:00.000Z",
    featured: true,
    pinned: false,
    tags: ["Cloudflare", "技术选型", "01MVP", "个人博客"],
    markdown: `
我做 01mvp-blog-starter 的时候，最早定下来的方向很明确，尽量放在 Cloudflare 上。

原因不复杂。

个人博客最需要的并非一台很强的服务器。它更需要稳定的访问入口、足够低的维护成本、能被 AI 自动化的资源创建流程，以及未来可扩展的空间。

Cloudflare 这套东西刚好贴合这个需求。

## 前端和服务端，TanStack Start

这个项目用 TanStack Start 做全栈入口。

它的好处是前端路由、服务端函数、SSR、部署入口都在一个 TypeScript 项目里。对 AI 来说，这种结构也更容易理解。AI 不需要同时在多个仓库、多个框架之间来回跳。

页面是 React，路由是 TanStack Router，构建是 Vite Plus。后台、文章页、文档页、API 都在同一个 Web 应用里。

这让模板更适合被 AI 维护。

AI 改一个功能时，可以顺着路由、组件、服务端函数、数据库 schema 一路读下去。它不需要猜一个传统 CMS 的插件体系，也不需要绕过一堆历史包袱。

## Worker，博客的运行入口

部署到 Cloudflare Workers 后，博客本身就是一个边缘应用。

文章列表、文章详情、RSS、站点地图、后台 API、登录回调，都从 Worker 处理。

对个人博客来说，这样有几个实际好处。

部署很轻。没有服务器要登录，没有系统包要升级，也没有 Nginx 配置要维护。

扩展方便。后面要加后台接口、评论审核、邮件通知、导出备份，都在同一个运行环境里。

AI 自动化也更清楚。Skill 可以直接调用 Wrangler 和 Cloudflare API，创建资源、绑定资源、部署 Worker、检查结果。

## D1，文章和账号数据

博客需要数据库。

文章、标签、系列、评论、用户、会话、API Token、邮件偏好，这些都需要稳定存储。

我选 D1，是因为它和 Workers 的绑定方式很直接。模板里用 Drizzle 管 schema，代码里用类型约束字段。AI 读到 schema 后，基本能知道文章有哪些字段，评论有哪些状态，后台 API 应该怎么改。

D1 也很适合个人博客这种读多写少的场景。

写文章、改设置、发评论，频率不会特别高。读文章、访问列表、生成 RSS，才是主要流量。

## KV，做短期缓存

KV 在这个项目里主要做缓存。

比如已发布文章列表、标签列表、站点地图路径。这些数据不需要每次都查数据库。

更新文章、标签、系列之后，系统会清掉相关缓存。读者访问时，再重新生成。

这一步没有什么炫技成分。它只是让一个小博客在高访问时更稳一点，也让 Cloudflare 的资源使用更克制。

## R2，图片和备份

文章图片、导入包、导出包、站点备份，放在 R2。

R2 有免费额度，但通常需要 Cloudflare 账号绑定付款方式才能开通。这一点我在文档里写得很明确。

如果你暂时不想绑定付款方式，也可以先把图片功能和导出备份放一放。博客先跑起来更重要。

后面你真的开始写文章了，再补 R2 也来得及。

## Better Auth，账号系统

博客还包含动态能力。

后台需要管理员登录。评论区可能需要读者账号。以后如果加订阅、邮件通知、私密文章，也会需要一个稳定的账号系统。

Better Auth 的优势是比较现代，和 TypeScript 项目配合舒服。这个模板里已经把管理员、读者、评论状态、邮箱偏好这些基础能力放进去了。

GitHub 登录和 Google 登录是可选项。

你可以先用邮箱账号登录后台。等需要社交登录时，再创建 OAuth 应用，填入对应密钥。

## Email，先当进阶功能

邮件功能很有用。

邮箱验证码、密码重置、评论回复通知、博客周报，这些都依赖邮件发送。

但 Cloudflare Email Sending 目前需要 Workers Paid。对于一个新手来说，我不希望这一步变成阻塞点。

所以模板把邮件设计成可选。

不开启邮件时，相关能力可以先关掉。等 Cloudflare 未来给 Email Service 更多免费额度，或者你愿意升级账号，再打开也行。

## 自定义域名，正式站建议准备

Cloudflare Workers 默认会给一个 \`*.workers.dev\` 地址。

测试没问题。

但如果你面向中国大陆读者，这个地址在很多网络环境里打不开或不稳定。正式公开时，我建议绑定自己的域名。

绑定域名后，访问入口更可控，链接也更像长期资产。

如果你要长期稳定、大量公开访问，还要考虑备案和接入要求。这个项目能帮你把博客部署出来，但域名和访问合规依然要按你的使用场景处理。

## 为什么这套栈适合 AI

我对 01mvp-blog-starter 的要求，重点不在功能数量。

我更希望它的边界清楚。

一个仓库。一个 Web 应用。一个数据库 schema。Cloudflare 资源都有明确绑定。初始化流程写在文档和 Skill 里。AI 读完之后知道自己该做什么，也知道哪些地方需要用户手动处理。

这很重要。

很多 AI 项目失败，问题经常出在工程边界不清楚。模型会写代码，但它不知道该往哪里写、该停在哪里。

这个项目想解决的就是这个问题。

让 AI 不再从一张白纸开始胡乱发挥。

让它拿到一套已经跑通的博客骨架，然后把你的网站真正部署出来。
`.trim(),
  },
  {
    id: "post_ai_setup_tutorial_20260605",
    title: "用 AI 搭一个自己的个人博客，新手版完整流程",
    slug: "ai-setup-personal-blog-tutorial",
    excerpt:
      "从准备 Cloudflare 账号、安装 Codex Cloudflare 插件、clone 模板仓库，到让 AI 自动创建资源和部署博客，这是一份新手友好的完整流程。",
    seoDescription:
      "01mvp-blog-starter 新手搭建教程，包含 Skill 安装、复制 Prompt、Cloudflare 账号、自定义域名、R2、邮件、OAuth 和 API Token 说明。",
    publishedAt: "2026-06-05T05:45:00.000Z",
    featured: false,
    pinned: false,
    tags: ["教程", "AI 建站", "Cloudflare", "01MVP"],
    markdown: `
这篇教程的目标很简单。

让你用 AI 搭一个自己的个人博客。

你不需要先学完整的前端、后端、数据库、部署。你要做的是准备账号和工具，然后把一段清晰的任务交给 AI。

## 你需要准备什么

准备 3 个东西。

1. 一个 Cloudflare 账号。
2. 一个能执行代码任务的 AI 环境，比如 Codex。
3. \`01mvp/blog-starter\` 这个仓库。

仓库地址：

\`\`\`txt
https://github.com/01mvp/blog-starter
\`\`\`

你可以 fork，也可以 clone，也可以直接下载。推荐 fork 或 clone，这样后面更容易保存自己的改动。

如果你还没有域名，也可以先不用买。Cloudflare Workers 会给你一个 \`*.workers.dev\` 测试地址。

如果你的读者主要在中国大陆，正式公开时建议准备自己的域名。\`*.workers.dev\` 在中国大陆很多网络环境里打不开或不稳定。长期稳定、大量公开访问时，还要考虑备案和接入要求。

## 第 1 步，在 Codex 里安装 Cloudflare 插件

在 Codex 里找到插件或连接器入口，安装 Cloudflare。

这一步的作用，是让 AI 能调用 Cloudflare 相关能力。

安装之后，AI 才能帮你创建 D1 数据库、KV 命名空间、R2 存储桶、部署 Worker、绑定域名、检查部署结果。

你可能需要自己登录 Cloudflare，选择账号，确认授权。

这些浏览器登录环节需要你处理，AI 不能替你完成。

## 第 2 步，选择 Skill 或复制 Prompt

推荐安装 01mvp-blog Skill。

Skill 适合长期使用。以后初始化流程有更新，Skill 也能继续更新。

如果你只是想马上试一下，也可以打开文档，复制 AI setup Prompt 给 Codex。

中文文档：

\`\`\`txt
https://blog.01mvp.com/zh/docs/ai-setup
\`\`\`

英文文档：

\`\`\`txt
https://blog.01mvp.com/docs/ai-setup
\`\`\`

两种方式都可以。

Skill 更适合长期维护，复制 Prompt 更适合快速体验。

## 第 3 步，把任务交给 AI

如果你已经安装 Skill，可以这样对 Codex 说：

\`\`\`txt
使用 01mvp-blog Skill，帮我基于 https://github.com/01mvp/blog-starter 创建并部署一个个人博客。

我希望 AI 尽量自动完成本地初始化、依赖安装、Cloudflare D1/KV/R2/Worker/DNS 配置、部署、验证和交付报告。

只有 Cloudflare 登录、账号注册、账号选择、域名购买、nameserver 切换、付款方式确认、OAuth 应用创建、邮件验证、API Token 创建这些无法自动完成的环节，才让我手动处理。
\`\`\`

如果你不想安装 Skill，就复制 AI setup 文档里的完整 Prompt。

## 第 4 步，AI 会向你确认信息

AI 通常会问你这些内容：

1. 博客名称。
2. 作者名称。
3. 主要语言。
4. 是否绑定自定义域名。
5. 是否启用评论。
6. 是否启用 GitHub 或 Google 登录。
7. 是否启用邮件功能。
8. 是否开通 R2。

你可以先选最简单的版本。

博客名称、作者、语言先填好。评论可以打开。自定义域名如果暂时没有，就先跳过。R2 和邮件都可以后面补。

## 第 5 步，AI 会做哪些事

正常情况下，AI 会完成这些工作：

1. clone 或检查你的仓库。
2. 安装 pnpm 依赖。
3. 生成必要的本地配置。
4. 创建 Cloudflare D1 数据库。
5. 创建 KV 命名空间。
6. 按需创建 R2 存储桶。
7. 写入 Worker 配置。
8. 执行数据库迁移。
9. 部署到 Cloudflare Workers。
10. 验证首页、文章页、后台入口、RSS 和站点地图。

你看到 AI 要修改文件时，可以让它列出改动文件。你看到 AI 要执行部署时，可以让它给出部署后的 URL。

## 第 6 步，哪些地方需要你手动处理

这些环节通常需要你自己操作。

Cloudflare 登录，AI 不能替你输入账号密码。

账号选择，如果你有多个 Cloudflare 账号，需要你确认部署到哪一个。

域名购买和 nameserver 切换，需要你在域名服务商或 Cloudflare 控制台处理。

付款方式确认，R2 通常需要绑定付款方式才能开通。R2 有免费额度，但账号层面的付款方式需要你自己确认。

GitHub 和 Google OAuth，需要你自己创建应用，复制 Client ID 和 Secret。

邮件发送，目前 Cloudflare Email Sending 需要 Workers Paid。不开启邮件也能先运行博客，只是没有邮件验证码、密码重置邮件、评论回复通知和博客周报。

## 第 7 步，部署完成后检查什么

部署完成后，至少检查这些页面。

1. 首页能打开。
2. 文章列表能打开。
3. 文档页能打开。
4. \`/admin\` 后台入口能打开。
5. RSS 地址能打开。
6. 站点地图能打开。
7. 如果绑定了域名，自定义域名能打开。

如果你开了评论，发一条测试评论。

如果你开了登录，测试邮箱登录或社交登录。

如果你开了 R2，上传一张图片。

如果你开了邮件，发一次验证码或密码重置邮件。

## 新手建议

第一次搭建时，不要追求一次性配齐所有功能。

我建议按这个顺序来。

第 1 轮，只跑通博客和后台。

第 2 轮，绑定自定义域名。

第 3 轮，迁移文章和图片。

第 4 轮，再开 R2、邮件、OAuth、API Token。

你只要先把网站跑起来，就已经迈过了最难的一步。

后面的配置，可以慢慢补。
`.trim(),
  },
];

const publicArticle = {
  title: "我把个人博客做成了一个可以被 AI 创建的网站",
  slug: "ai-created-personal-blog",
  date: "2026-06-05",
  brand: "MakerJackie",
  description:
    "一篇介绍 01mvp-blog-starter 的公众号长文，适合发布前再根据 dogfood 结果补最后的访问链接。",
  markdown: `
今天我在搞一件很小但很让我兴奋的事。

我把一个个人博客，做成了可以被 AI 创建的网站。

它已经超过临时页面 demo。它是真正有后台、有文章、有评论、有登录、有 RSS、有站点地图、有图片存储、有部署流程的博客。

项目叫 01mvp-blog-starter。

它现在的目标很具体，给你一个 Cloudflare 上能跑的个人博客模板，然后让 AI 按文档或 Skill，把初始化、部署、资源创建这些麻烦活尽量都做掉。

你只需要准备 Cloudflare 账号，准备 Codex，安装 Cloudflare 插件，clone 或 fork 这个仓库。

后面交给 AI。

说实话，这件事听起来没有那么性感。

它不像一个新的 AI 视频模型，也不像一个一键生成 App 的工具。它只是一个博客。

但我最近越来越觉得，博客这玩意可能又要重要起来了。

## 我为什么又回到博客

过去几年，我们把太多内容放在平台里了。

公众号、小红书、X、知乎、B 站，每个平台都有自己的流量规则、排版规则、推荐机制。

这些平台当然很重要。我自己也会继续发。

但平台账号很难成为一个真正属于你的家。

你写过的内容，最后都散在不同平台里。你的文章入口、读者关系、搜索流量、链接结构，都被平台托管着。

所以我一直有个很朴素的想法。

我希望自己有一个地方，可以放所有东西。

文章、教程、项目记录、踩坑、产品日志、一些还没想明白的想法。

这个地方不需要多华丽，但它要长期存在。它要能被搜索。它要有自己的域名。它要能被我自己控制。

以前做这个事很烦。

你要选框架，要搞服务器，要配数据库，要做登录，要处理图片，要折腾部署。你如果想认真一点，还要做评论、邮件通知、RSS、SEO、导入导出。

很多人卡住，原因很直接。第一步太麻烦了。

AI 出现以后，我觉得这个第一步应该被重新设计。

## 我一开始做的是 Skill

最早我做 01mvp-blog-starter 的时候，有一个 01mvp-blog Skill。

你把 Skill 安装到 Codex 里，它会指导 AI 怎么从这个模板创建你的博客。

这条路很合理。

因为 Skill 可以更新。

今天 Cloudflare 命令变了，明天初始化流程变了，后天模板目录调整了，我可以更新 Skill。用户下次使用时，就能拿到新的流程。

但我后来发现一个问题。

新手要先安装 Skill，这件事本身也有门槛。

如果一个人只是想试试，想看看 AI 能不能帮自己搭一个博客，他可能不想先研究 Skill 怎么安装。

所以我现在把流程拆成两条。

推荐方式，安装 01mvp-blog Skill。

备用方式，直接复制文档里的 Prompt 给 AI。

你可以把它理解成，一个是长期维护版，一个是马上体验版。

两种方式做的事一样，都是让 AI 接管初始化。

## AI 到底会帮你做什么

很多人说 AI 会写代码，但真正难的是把项目落地。

一个真实博客要上线，里面有很多碎活。

AI 要 clone 仓库，要装依赖，要创建 Cloudflare D1 数据库，要创建 KV，要按需创建 R2，要写 Wrangler 配置，要跑数据库迁移，要部署 Worker，要检查首页、文章页、后台、RSS、站点地图。

如果你要绑定域名，它还要处理 DNS 记录和 Worker custom domain。

这些事情人当然也能做。

但对新手来说，每一步都有可能卡住。

你不知道 D1 是什么。

你不知道 KV 是什么。

你不知道 R2 为什么要绑定付款方式。

你不知道 \`*.workers.dev\` 在中国大陆很多网络环境里可能打不开。

你也不知道邮件功能为什么现在会牵扯到 Workers Paid。

所以我希望这个项目把这些信息都写进文档和 Skill 里。

AI 可以自动完成的，就让 AI 去做。

AI 不能替你做的，就清楚告诉你。

比如 Cloudflare 登录、账号注册、域名购买、nameserver 切换、付款方式确认、OAuth 应用创建、邮件验证，这些都需要你自己处理。

这件事要讲清楚。

不然新手很容易以为 AI 能包办一切，跑到一半突然被浏览器登录、付款方式、域名设置拦住，然后就放弃了。

## 为什么选 Cloudflare

这个模板基本围绕 Cloudflare 来做。

Worker 负责运行网站。

D1 存文章、评论、账号和后台数据。

KV 做缓存。

R2 放图片、导入包、导出包和备份。

Email Service 负责邮件，不过现在先放在进阶功能里。

这套组合对个人博客挺合适。

你不用维护服务器，也不用自己装数据库。部署命令清楚，资源边界清楚，AI 也比较容易理解。

更重要的是，Cloudflare 这些资源可以通过 Wrangler 和 API 自动化创建。

这对 AI 很关键。

如果一个模板每一步都要人去后台点点点，AI 的价值会被打折。

我希望 AI 能真的参与创建过程，而不只是写一段代码给你看。

## 这个项目现在长什么样

01mvp-blog-starter 现在已经远远超过一个首页。

它有文章列表、文章详情、标签、系列、文档、关于页。

后台里可以写文章、管理评论、管理用户、管理站点设置、导入导出内容、上传资源。

它有读者账号，也有管理员入口。

它支持 RSS 和站点地图。

它也给新手准备了中文文档和英文文档。

这次我重点补了一篇 AI setup 文档。

这篇文档会告诉你两种方式，装 Skill，或者复制 Prompt。

文档里还会把一些容易踩坑的点写清楚。

自定义域名是可选的，但如果面向中国大陆读者，我建议准备自己的域名。

R2 有免费额度，但通常需要绑定付款方式才能开通。

邮件功能目前需要 Workers Paid，不开也能先跑博客，只是邮件验证码、密码重置、评论回复通知这些功能先关掉。

GitHub 登录、Google 登录、API Token 都是进阶功能，不需要第一天全配完。

先让博客跑起来。

这句话我很想反复说。

因为很多人做产品，第一天就想把所有功能配齐，然后被复杂度拖住。

个人博客不需要这样。

能打开首页，能进后台，能写第一篇文章，能部署到一个 URL 上，这就已经很棒了。

## 我会先拿自己的博客试

我接下来会把自己的博客当成第一个真实用户。

计划是先用 \`new.makerjackie.com\` 跑新站。老的 \`makerjackie.com\` 先保留，等迁移、文章、域名、访问都确认没问题，再决定正式切换。

这一步对我来说很重要。

如果我自己都不用，那这个项目就很虚。

只有我自己真的迁移，真的用 Skill 创建，真的把旧文章搬过去，真的遇到问题再修 Skill，这个模板才会慢慢变可靠。

我不想做一个只在 README 里看起来不错的项目。

我想做一个普通人真的能跟着跑起来的项目。

## 给想试的朋友

如果你想试，路径很简单。

打开 GitHub：

\`\`\`txt
https://github.com/01mvp/blog-starter
\`\`\`

准备一个 Cloudflare 账号。

在 Codex 里安装 Cloudflare 插件。

然后二选一。

安装 01mvp-blog Skill，或者打开 AI setup 文档，把 Prompt 复制给 Codex。

中文文档：

\`\`\`txt
https://blog.01mvp.com/zh/docs/ai-setup
\`\`\`

英文文档：

\`\`\`txt
https://blog.01mvp.com/docs/ai-setup
\`\`\`

你不需要一开始就懂所有技术名词。

D1 可以先理解成博客数据库。

KV 可以先理解成缓存。

R2 可以先理解成图片和备份仓库。

Worker 可以先理解成运行网站的地方。

这些理解不够严谨，但足够你迈出第一步。

后面你真的跑起来了，再慢慢补概念也来得及。

## 我真正想做的事

我做 01mvp-blog-starter，不打算把大家都推成程序员。

我更希望它能降低一个小门槛。

让一个想写东西的人，有机会拥有自己的站点。

让一个想学 AI 编程的人，有机会跑通一个真实项目。

让一个产品经理、设计师、运营、自媒体人，能亲手体验从模板到部署的完整过程。

AI 时代很容易让人焦虑。

每天都有新模型、新工具、新论文、新 demo。看久了，人会觉得自己永远追不上。

但我觉得更好的方式，是做一个很小的东西。

不用太大。

一个博客就够。

你把它跑起来，写一篇文章，发到自己的域名上。

然后你会发现，AI 不再是一个挂在天上的概念。

它开始变成你手里的工具。

这件事挺重要的。

因为很多时候，我们并不缺宏大的未来。

我们缺的是今天晚上能完成的一小步。
`.trim(),
};

const xCopies = [
  `我把 01mvp-blog-starter 整理成了两条路：安装 Skill，或者直接复制 AI setup 文档里的 Prompt。目标很简单，让 AI 帮你从 blog-starter 模板创建一个 Cloudflare 博客。Cloudflare 账号、Codex Cloudflare 插件、仓库准备好，后面的 D1/KV/R2/Worker/DNS 尽量交给 AI。`,
  `个人博客这件事可能又要重要起来了。平台内容还要发，但我也想有一个自己能长期控制的地方。所以我做了 01mvp-blog-starter：后台、文章、评论、账号、RSS、站点地图、Cloudflare 部署都放进模板，让 AI 帮新手完成初始化。`,
  `新手搭博客最容易卡在部署和配置。01mvp-blog-starter 现在给了两种方式：Skill 长期维护版，复制 Prompt 快速体验版。邮件、R2、OAuth、API Token 都可以后面再开。先让博客跑起来，能写第一篇文章，这就已经赢了一次。`,
];

const videoScript = `
# 视频脚本，01mvp-blog-starter 新手演示

## 视频标题

用 AI 搭一个自己的个人博客，Cloudflare + Codex 全流程

## 视频目标

让新手知道 01mvp-blog-starter 是什么，看到从文档到 AI 执行的大概流程，并理解哪些步骤 AI 能做、哪些步骤需要自己处理。

## 时长建议

8 到 12 分钟。

## 开场，0:00 到 0:45

大家好，我是 Jackie。

今天我想演示一个我最近在做的小项目，01mvp-blog-starter。

它已经超过临时页面 demo。它是一个可以部署到 Cloudflare 的个人博客模板，有后台、有文章、有评论、有登录、有 RSS、有站点地图。

我希望你准备好 Cloudflare 账号和 Codex，然后让 AI 帮你把博客搭起来。

## 展示成品，0:45 到 1:30

打开 blog.01mvp.com。

展示首页、文章列表、文档页、后台入口。

重点点开 AI setup 文档：

\`\`\`txt
https://blog.01mvp.com/zh/docs/ai-setup
\`\`\`

说明两种方式：

1. 安装 01mvp-blog Skill。
2. 直接复制文档里的 Prompt。

## 准备工作，1:30 到 2:30

展示 GitHub 仓库：

\`\`\`txt
https://github.com/01mvp/blog-starter
\`\`\`

讲清楚需要准备：

1. Cloudflare 账号。
2. Codex。
3. Codex 里的 Cloudflare 插件或连接器。
4. fork 或 clone 仓库。

补一句：

没有域名也能先用 \`*.workers.dev\` 测试。面向中国大陆读者，正式公开建议绑定自己的域名。

## 安装 Skill 或复制 Prompt，2:30 到 3:30

演示 Skill 路线：

\`\`\`txt
使用 01mvp-blog Skill，帮我基于 01mvp/blog-starter 创建并部署一个个人博客。
\`\`\`

再演示 Prompt 路线：

打开 AI setup 文档，复制完整 Prompt，粘贴给 Codex。

强调：

Skill 适合长期使用，Prompt 适合快速体验。

## AI 执行流程，3:30 到 6:30

展示 AI 会做的事：

1. 检查仓库。
2. 安装依赖。
3. 创建 D1。
4. 创建 KV。
5. 按需创建 R2。
6. 写 Cloudflare 配置。
7. 执行数据库迁移。
8. 部署 Worker。
9. 验证网站。

如果录制时遇到需要人工确认的步骤，直接展示。

例如 Cloudflare 登录、账号选择、付款方式确认、域名购买、OAuth 应用创建、邮件验证。

这里不要跳过，反而要解释清楚：

AI 能做工程自动化，人要处理账号和授权。

## 进阶功能说明，6:30 到 8:00

打开文档底部的 Advanced 部分。

讲 4 个点：

R2，用来放图片、导入导出和备份。通常需要绑定付款方式才能开通，但有免费额度。

Email，目前发送邮件需要 Workers Paid。不开启也能先跑博客，只是没有邮件验证码、密码重置和邮件通知。

OAuth，GitHub 和 Google 登录都是可选项。需要时再创建应用。

API Token，适合以后做自动发布、脚本同步、外部工具集成。

## 收尾，8:00 到 9:00

回到部署后的博客页面。

展示最终 URL。

总结一句：

第一次不用追求配齐所有功能。先让博客跑起来，写第一篇文章，再慢慢补域名、R2、邮件和登录。

最后引导：

仓库地址在简介里，文档也在简介里。你可以先复制 Prompt 试一下，跑不通的地方欢迎留言，我会继续改文档和 Skill。
`.trim();

function write(name, value) {
  writeFileSync(join(outDir, name), `${value}\n`);
}

function writePostFile(post) {
  writeFileSync(join(postsDir, `${post.slug}.md`), `${post.markdown}\n`);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let listItems = [];
  let listTag = null;
  let codeLines = [];
  let inCodeBlock = false;

  const flushList = () => {
    if (!listItems.length || !listTag) return;
    html.push(`<${listTag}>${listItems.map((item) => `<li>${item}</li>`).join("")}</${listTag}>`);
    listItems = [];
    listTag = null;
  };

  const flushCode = () => {
    if (!inCodeBlock) return;
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeLines = [];
    inCodeBlock = false;
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCode();
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      html.push(`<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      html.push(`<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`);
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      html.push(`<h1>${inlineMarkdown(trimmed.slice(2))}</h1>`);
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushList();
      html.push(`<blockquote>${inlineMarkdown(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      if (listTag && listTag !== "ul") flushList();
      listTag = "ul";
      listItems.push(inlineMarkdown(trimmed.replace(/^[-*]\s+/, "")));
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (listTag && listTag !== "ol") flushList();
      listTag = "ol";
      listItems.push(inlineMarkdown(trimmed.replace(/^\d+\.\s+/, "")));
      continue;
    }

    flushList();
    html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
  }

  flushList();
  flushCode();

  return html.join("");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/!\[([^\]]*)]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(
      /(?<!!)\[([^\]]+)]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g,
      '<a href="$2" rel="noreferrer">$1</a>',
    );
}

function markdownToText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderWechatHtml(article) {
  const bodyHtml = renderMarkdownToHtml(article.markdown)
    .replaceAll(
      "<h2>",
      '<h2 style="font-size:20px;line-height:1.45;font-weight:800;margin:34px 0 14px;color:#111;border-top:3px solid #111;padding-top:18px;">',
    )
    .replaceAll("</h2>", "</h2>")
    .replaceAll(
      "<h3>",
      '<h3 style="font-size:17px;line-height:1.45;font-weight:800;margin:26px 0 10px;color:#111;">',
    )
    .replaceAll("<p>", '<p style="font-size:16px;line-height:1.75;margin:0 0 18px;color:#222;">')
    .replaceAll(
      "<ol>",
      '<ol style="font-size:16px;line-height:1.7;margin:0 0 18px;padding-left:22px;color:#222;">',
    )
    .replaceAll(
      "<ul>",
      '<ul style="font-size:16px;line-height:1.7;margin:0 0 18px;padding-left:22px;color:#222;">',
    )
    .replaceAll("<li>", '<li style="margin:0 0 8px;">')
    .replaceAll(
      "<pre>",
      '<pre style="font-size:13px;line-height:1.6;background:#f6f6f6;border:2px solid #111;padding:14px;overflow:auto;margin:18px 0;">',
    )
    .replaceAll(
      "<blockquote>",
      '<blockquote style="border-left:4px solid #111;margin:20px 0;padding:2px 0 2px 14px;color:#555;">',
    )
    .replaceAll(
      "<code>",
      '<code style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;background:#f1f1f1;padding:2px 4px;border-radius:0;">',
    );

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(article.title)}</title>
</head>
<body style="margin:0;background:#fff;">
  <main style="max-width:720px;margin:0 auto;padding:0 18px 48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
    <img src="${article.date}-${article.slug}-cover.png" alt="${escapeHtml(article.title)}" style="display:block;width:100%;max-width:900px;margin:0 auto 28px;border:3px solid #111;">
    ${bodyHtml}
    <section style="margin-top:36px;border:3px solid #111;padding:18px;">
      <p style="font-size:16px;line-height:1.75;margin:0;color:#111;">项目地址：github.com/01mvp/blog-starter</p>
      <p style="font-size:16px;line-height:1.75;margin:8px 0 0;color:#111;">中文文档：blog.01mvp.com/zh/docs/ai-setup</p>
    </section>
  </main>
</body>
</html>`;
}

function renderCoverHtml(article) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(article.title)}</title>
</head>
<body style="margin:0;background:#fff;">
  <div class="cover" style="width:900px;height:383px;box-sizing:border-box;border:3px solid #111;background:#fff;position:relative;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#111;overflow:hidden;">
    <div style="position:absolute;left:32px;top:28px;font-size:14px;font-weight:700;letter-spacing:0;">${article.date}</div>
    <div style="position:absolute;left:54px;right:54px;top:98px;font-size:64px;line-height:1.04;font-weight:900;letter-spacing:0;text-align:center;">${escapeHtml(article.title)}</div>
    <div style="position:absolute;right:32px;bottom:28px;font-size:14px;font-weight:700;letter-spacing:0;">${escapeHtml(article.brand)}</div>
  </div>
</body>
</html>`;
}

function parseBlocks(markdown, title) {
  const blocks = [{ type: "title", text: title }];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let inCode = false;
  let code = [];

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push({ type: "code", text: code.join("\n") });
        code = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.slice(3) });
    } else if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: trimmed.slice(4) });
    } else if (/^\d+\.\s+/.test(trimmed)) {
      blocks.push({ type: "li", text: trimmed });
    } else {
      blocks.push({ type: "p", text: trimmed });
    }
  }

  return blocks;
}

function blockUnits(block) {
  if (block.type === "title") return 4;
  if (block.type === "h2") return 2.4;
  if (block.type === "h3") return 2;
  if (block.type === "code") return Math.ceil(block.text.length / 28) + 1.5;
  return Math.ceil(block.text.length / 24) + 0.9;
}

function renderXhsSlides(article) {
  const blocks = parseBlocks(article.markdown, article.title);
  const slides = [];
  let current = [];
  let units = 0;
  const maxUnits = 16;

  for (const block of blocks) {
    const nextUnits = blockUnits(block);
    if (current.length && units + nextUnits > maxUnits) {
      slides.push(current);
      current = [];
      units = 0;
    }
    current.push(block);
    units += nextUnits;
  }
  if (current.length) slides.push(current);

  const renderedSlides = slides
    .map((slide, index) => {
      const content = slide.map(renderXhsBlock).join("\n");
      return `<section class="slide" style="width:1080px;height:1350px;box-sizing:border-box;padding:74px 76px;background:#fff;border:3px solid #111;color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden;position:relative;margin:28px;">
  <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:22px;font-weight:800;margin-bottom:34px;">${article.date} / ${article.brand}</div>
  ${content}
  <div style="position:absolute;right:76px;bottom:54px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:22px;font-weight:800;">${index + 1}/${slides.length}</div>
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(article.title)}</title>
</head>
<body style="margin:0;background:#eee;">
${renderedSlides}
</body>
</html>`;
}

function renderXhsBlock(block) {
  const text = escapeHtml(block.text);
  if (block.type === "title") {
    return `<h1 style="font-size:58px;line-height:1.12;font-weight:900;letter-spacing:0;margin:0 0 34px;">${text}</h1>`;
  }
  if (block.type === "h2") {
    return `<h2 style="font-size:44px;line-height:1.2;font-weight:900;letter-spacing:0;margin:34px 0 22px;border-top:3px solid #111;padding-top:22px;">${text}</h2>`;
  }
  if (block.type === "h3") {
    return `<h3 style="font-size:38px;line-height:1.25;font-weight:900;letter-spacing:0;margin:26px 0 16px;">${text}</h3>`;
  }
  if (block.type === "code") {
    return `<pre style="font-size:28px;line-height:1.45;margin:18px 0 22px;padding:18px;border:2px solid #111;background:#f7f7f7;white-space:pre-wrap;">${text}</pre>`;
  }
  return `<p style="font-size:34px;line-height:1.5;letter-spacing:0;margin:0 0 20px;">${text}</p>`;
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlBool(value) {
  return value ? "1" : "0";
}

function buildPostSql(posts) {
  const tags = Array.from(new Set(posts.flatMap((post) => post.tags)));
  const lines = [
    "-- Generated by scripts/generate-launch-assets.mjs",
    "-- Review before running against production D1.",
    "",
    "UPDATE posts",
    `SET status = 'deleted', updated_at = ${sqlString(generatedAt)}`,
    "WHERE slug IN ('auth-smoke-1779684454', 'd1-smoke-1779683117');",
    "",
  ];

  for (const tag of tags) {
    const slug = slugify(tag);
    lines.push(
      `INSERT INTO tags (id, name, slug, description, created_at) VALUES (${sqlString(`tag_${slug}`)}, ${sqlString(tag)}, ${sqlString(slug)}, '', ${sqlString(generatedAt)}) ON CONFLICT(slug) DO UPDATE SET name = excluded.name;`,
    );
  }

  lines.push("");

  for (const post of posts) {
    const html = renderMarkdownToHtml(post.markdown);
    const text = markdownToText(post.markdown);
    const i18n = {
      title: { zh: post.title },
      excerpt: { zh: post.excerpt },
      contentMarkdown: { zh: post.markdown },
      contentHtml: { zh: html },
      contentText: { zh: text },
      seoTitle: { zh: post.title },
      seoDescription: { zh: post.seoDescription },
    };

    lines.push(
      [
        "INSERT INTO posts (id, title, slug, excerpt, cover_image, content_markdown, content_html, content_text, status, source, featured, pinned, comments_enabled, seo_title, seo_description, canonical_url, robots, structured_data, i18n, published_at, created_at, updated_at, author_id, series_id)",
        `VALUES (${sqlString(post.id)}, ${sqlString(post.title)}, ${sqlString(post.slug)}, ${sqlString(post.excerpt)}, '', ${sqlString(post.markdown)}, ${sqlString(html)}, ${sqlString(text)}, 'published', 'ai', ${sqlBool(post.featured)}, ${sqlBool(post.pinned)}, 1, ${sqlString(post.title)}, ${sqlString(post.seoDescription)}, NULL, 'index,follow', NULL, ${sqlString(JSON.stringify(i18n))}, ${sqlString(post.publishedAt)}, ${sqlString(post.publishedAt)}, ${sqlString(generatedAt)}, NULL, NULL)`,
        "ON CONFLICT(slug) DO UPDATE SET",
        "title = excluded.title,",
        "excerpt = excluded.excerpt,",
        "cover_image = excluded.cover_image,",
        "content_markdown = excluded.content_markdown,",
        "content_html = excluded.content_html,",
        "content_text = excluded.content_text,",
        "status = excluded.status,",
        "source = excluded.source,",
        "featured = excluded.featured,",
        "pinned = excluded.pinned,",
        "comments_enabled = excluded.comments_enabled,",
        "seo_title = excluded.seo_title,",
        "seo_description = excluded.seo_description,",
        "robots = excluded.robots,",
        "structured_data = excluded.structured_data,",
        "i18n = excluded.i18n,",
        "published_at = excluded.published_at,",
        "updated_at = excluded.updated_at;",
      ].join("\n"),
    );

    lines.push(
      `DELETE FROM post_tags WHERE post_id = (SELECT id FROM posts WHERE slug = ${sqlString(post.slug)});`,
    );

    for (const tag of post.tags) {
      lines.push(
        `INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES ((SELECT id FROM posts WHERE slug = ${sqlString(post.slug)}), (SELECT id FROM tags WHERE slug = ${sqlString(slugify(tag))}));`,
      );
    }

    lines.push("");
  }

  lines.push(
    "SELECT slug, title, status, published_at FROM posts WHERE slug IN ('why-i-built-an-ai-maintained-personal-blog', 'why-this-blog-uses-cloudflare-stack', 'ai-setup-personal-blog-tutorial') ORDER BY published_at DESC;",
  );

  return lines.join("\n");
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9一-龥]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function buildManifest() {
  return {
    generatedAt,
    productionPosts: productionPosts.map((post) => ({
      title: post.title,
      slug: post.slug,
      tags: post.tags,
      publishedAt: post.publishedAt,
    })),
    publicArticle: {
      title: publicArticle.title,
      slug: publicArticle.slug,
      date: publicArticle.date,
    },
    files: [
      "posts/*.md",
      "production-posts.sql",
      "wechat-article.md",
      "wechat-article.html",
      "2026-06-05-ai-created-personal-blog-cover.html",
      "2026-06-05-ai-created-personal-blog.xhs-slides.html",
      "x-twitter-copy.md",
      "video-script.md",
      "review-notes.md",
    ],
  };
}

function buildReviewNotes() {
  return `
# 01mvp-blog-starter 发布素材说明

## 生产文章

1. 改写历史文章，保留 slug：\`why-i-built-an-ai-maintained-personal-blog\`
2. 新增技术选型文章：\`why-this-blog-uses-cloudflare-stack\`
3. 新增新手搭建教程：\`ai-setup-personal-blog-tutorial\`

\`production-posts.sql\` 会同时把两个 smoke post 标记为 deleted，并重建三篇文章的标签关系。

## 多平台素材

- 公众号原文：\`wechat-article.md\`
- 公众号排版 HTML：\`wechat-article.html\`
- 公众号封面 HTML：\`2026-06-05-ai-created-personal-blog-cover.html\`
- 小红书长图 HTML：\`2026-06-05-ai-created-personal-blog.xhs-slides.html\`
- X 文案：\`x-twitter-copy.md\`
- 视频脚本：\`video-script.md\`

## 发布前需要补充

MakerJackie 新站 dogfood 完成后，把公众号文章里关于 \`new.makerjackie.com\` 的段落改成实际访问结果和最终链接。
`.trim();
}

for (const post of productionPosts) {
  writePostFile(post);
}

write("production-posts.sql", buildPostSql(productionPosts));
write("wechat-article.md", publicArticle.markdown);
write("wechat-article.html", renderWechatHtml(publicArticle));
write(`${publicArticle.date}-${publicArticle.slug}-cover.html`, renderCoverHtml(publicArticle));
write(
  `${publicArticle.date}-${publicArticle.slug}.xhs-slides.html`,
  renderXhsSlides(publicArticle),
);
write(
  "x-twitter-copy.md",
  xCopies.map((copy, index) => `## 版本 ${index + 1}\n\n${copy}`).join("\n\n"),
);
write("video-script.md", videoScript);
write("review-notes.md", buildReviewNotes());
write("manifest.json", JSON.stringify(buildManifest(), null, 2));

console.log(`Generated launch assets in ${outDir}`);
