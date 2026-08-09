import { describe, it, expect } from "vitest";

import {
  resolveLocale,
  localizeText,
  localizeTag,
  localizePost,
  localizeSiteSettings,
} from "../index";
import type { Tag, Post, SiteSettings } from "../types";

describe("resolveLocale", () => {
  it('returns "zh" for "zh"', () => {
    expect(resolveLocale("zh")).toBe("zh");
  });

  it('returns "en" for "en"', () => {
    expect(resolveLocale("en")).toBe("en");
  });

  it('returns "en" for undefined', () => {
    expect(resolveLocale(undefined)).toBe("en");
  });

  it('returns "en" for unknown locale', () => {
    expect(resolveLocale("fr")).toBe("en");
  });
});

describe("localizeText", () => {
  it("returns zh translation when available and locale is zh", () => {
    expect(localizeText("fallback", { zh: "中文", en: "English" }, "zh")).toBe("中文");
  });

  it("returns en translation when available and locale is en", () => {
    expect(localizeText("fallback", { zh: "中文", en: "English" }, "en")).toBe("English");
  });

  it("falls back to en when locale translation is missing", () => {
    expect(localizeText("fallback", { en: "English" }, "zh")).toBe("English");
  });

  it("falls back to fallback when no translations exist", () => {
    expect(localizeText("fallback", undefined, "zh")).toBe("fallback");
  });

  it("falls back to fallback when translations object is empty", () => {
    expect(localizeText("fallback", {}, "zh")).toBe("fallback");
  });
});

describe("localizeTag", () => {
  const tag: Tag = {
    id: "tag-1",
    name: "Cloudflare",
    slug: "cloudflare",
    description: "Edge computing platform.",
    i18n: {
      name: { zh: "Cloudflare中文" },
      description: { zh: "边缘计算平台。" },
    },
  };

  it("localizes name and description to zh", () => {
    const result = localizeTag(tag, "zh");
    expect(result.name).toBe("Cloudflare中文");
    expect(result.description).toBe("边缘计算平台。");
  });

  it("preserves English values for en locale", () => {
    const result = localizeTag(tag, "en");
    expect(result.name).toBe("Cloudflare");
    expect(result.description).toBe("Edge computing platform.");
  });

  it("preserves id and slug", () => {
    const result = localizeTag(tag, "zh");
    expect(result.id).toBe("tag-1");
    expect(result.slug).toBe("cloudflare");
  });
});

describe("localizePost", () => {
  const post: Post = {
    id: "post-1",
    title: "Hello World",
    slug: "hello-world",
    excerpt: "An excerpt.",
    coverImage: "/cover.jpg",
    contentMarkdown: "# Hello",
    contentHtml: "<h1>Hello</h1>",
    contentText: "Hello",
    status: "published",
    source: "editor",
    featured: false,
    pinned: false,
    commentsEnabled: true,
    publishedAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    authorName: "Author",
    series: null,
    tags: [
      {
        id: "tag-1",
        name: "Tech",
        slug: "tech",
        description: "Technology",
        i18n: { name: { zh: "技术" }, description: { zh: "技术相关" } },
      },
    ],
    seoTitle: "Hello World SEO",
    seoDescription: "SEO description",
    i18n: {
      title: { zh: "你好世界" },
      excerpt: { zh: "一段摘录。" },
      contentMarkdown: { zh: "# 你好" },
      contentHtml: { zh: "<h1>你好</h1>" },
      contentText: { zh: "你好" },
      seoTitle: { zh: "你好世界 SEO" },
      seoDescription: { zh: "SEO 描述" },
    },
  };

  it("localizes title, excerpt, content fields to zh", () => {
    const result = localizePost(post, "zh");
    expect(result.title).toBe("你好世界");
    expect(result.excerpt).toBe("一段摘录。");
    expect(result.contentMarkdown).toBe("# 你好");
    expect(result.contentHtml).toBe("<h1>你好</h1>");
    expect(result.contentText).toBe("你好");
  });

  it("localizes seo fields to zh", () => {
    const result = localizePost(post, "zh");
    expect(result.seoTitle).toBe("你好世界 SEO");
    expect(result.seoDescription).toBe("SEO 描述");
  });

  it("localizes nested tags", () => {
    const result = localizePost(post, "zh");
    expect(result.tags[0].name).toBe("技术");
    expect(result.tags[0].description).toBe("技术相关");
  });

  it("preserves English values for en locale", () => {
    const result = localizePost(post, "en");
    expect(result.title).toBe("Hello World");
    expect(result.excerpt).toBe("An excerpt.");
  });

  it("preserves non-localizable fields", () => {
    const result = localizePost(post, "zh");
    expect(result.id).toBe("post-1");
    expect(result.slug).toBe("hello-world");
    expect(result.status).toBe("published");
  });
});

describe("localizeSiteSettings", () => {
  const settings: SiteSettings = {
    name: "My Blog",
    description: "A blog about tech.",
    url: "https://example.com",
    authorName: "Author",
    authorBio: "Writer and coder.",
    avatarUrl: "/avatar.jpg",
    defaultOgImage: "/og.jpg",
    socialLinks: [],
    navigation: [],
    rssEnabled: true,
    commentsEnabled: true,
    commentsRequireApproval: true,
    commentAutoBlockEnabled: false,
    commentBlockedKeywords: [],
    aiCommentModerationEnabled: false,
    aiCommentModerationRules: "",
    emailVerificationEnabled: false,
    emailNotificationsEnabled: false,
    manualEmailBroadcastsEnabled: false,
    indexingEnabled: true,
    themePreset: "maker",
    layoutPreset: "shelf",
    locales: ["en", "zh"],
    primaryLanguage: "en",
    i18n: {
      name: { zh: "我的博客" },
      description: { zh: "关于技术的博客。" },
      authorBio: { zh: "写作者和程序员。" },
    },
  };

  it("localizes name to zh", () => {
    const result = localizeSiteSettings(settings, "zh");
    expect(result.name).toBe("我的博客");
  });

  it("localizes description to zh", () => {
    const result = localizeSiteSettings(settings, "zh");
    expect(result.description).toBe("关于技术的博客。");
  });

  it("localizes authorBio to zh", () => {
    const result = localizeSiteSettings(settings, "zh");
    expect(result.authorBio).toBe("写作者和程序员。");
  });

  it("preserves English values for en locale", () => {
    const result = localizeSiteSettings(settings, "en");
    expect(result.name).toBe("My Blog");
    expect(result.description).toBe("A blog about tech.");
    expect(result.authorBio).toBe("Writer and coder.");
  });

  it("preserves non-localizable fields", () => {
    const result = localizeSiteSettings(settings, "zh");
    expect(result.url).toBe("https://example.com");
    expect(result.authorName).toBe("Author");
  });
});
