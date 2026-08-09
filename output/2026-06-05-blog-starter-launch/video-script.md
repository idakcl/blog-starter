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

```txt
https://blog.01mvp.com/zh/docs/ai-setup
```

说明两种方式：

1. 安装 01mvp-blog Skill。
2. 直接复制文档里的 Prompt。

## 准备工作，1:30 到 2:30

展示 GitHub 仓库：

```txt
https://github.com/01mvp/blog-starter
```

讲清楚需要准备：

1. Cloudflare 账号。
2. Codex。
3. Codex 里的 Cloudflare 插件或连接器。
4. fork 或 clone 仓库。

补一句：

没有域名也能先用 `*.workers.dev` 测试。面向中国大陆读者，正式公开建议绑定自己的域名。

## 安装 Skill 或复制 Prompt，2:30 到 3:30

演示 Skill 路线：

```txt
使用 01mvp-blog Skill，帮我基于 01mvp/blog-starter 创建并部署一个个人博客。
```

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
