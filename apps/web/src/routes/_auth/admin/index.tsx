import {
  localizeSiteSettings,
  type ApiToken,
  type Asset,
  type CmsUser,
  type Comment,
  type Post,
  type SiteSettings,
  type SupportedLocale,
} from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  BarChart3Icon,
  DatabaseIcon,
  EyeIcon,
  FileTextIcon,
  ImageIcon,
  KeyRoundIcon,
  MessageSquareIcon,
  TrendingUpIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AdminPageHeader, AdminPanel } from "#/components/admin/admin-ui";
import type { AnalyticsOverview, AnalyticsTopPost } from "#/lib/analytics-types";
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_auth/admin/")({
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const locale = getCurrentLocale();
  const defaultSettings: SiteSettings = {
    name: "Blog",
    description: "",
    url: "",
    authorName: "",
    authorBio: "",
    avatarUrl: "",
    defaultOgImage: "",
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
    layoutPreset: "journal",
    locales: ["en", "zh"],
    primaryLanguage: "en",
  };
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSettings);
  const [stats, setStats] = useState<OverviewStats>(emptyOverviewStats);
  const [analytics, setAnalytics] = useState<AnalyticsOverview>(emptyAnalyticsOverview);

  useEffect(() => {
    let ignore = false;

    void Promise.all([
      fetch(`/api/site?lang=${locale}`).then((r) => (r.ok ? r.json() : undefined)),
      fetch(`/api/posts?status=all&lang=${locale}`).then((r) => (r.ok ? r.json() : undefined)),
      fetch(`/api/comments?lang=${locale}`).then((r) => (r.ok ? r.json() : undefined)),
      fetch("/api/admin/users").then((r) => (r.ok ? r.json() : undefined)),
      fetch("/api/assets").then((r) => (r.ok ? r.json() : undefined)),
      fetch("/api/tokens").then((r) => (r.ok ? r.json() : undefined)),
      fetch("/api/analytics/overview?days=7").then((r) => (r.ok ? r.json() : undefined)),
    ]).then(
      ([
        sitePayload,
        postPayload,
        commentPayload,
        userPayload,
        assetPayload,
        tokenPayload,
        analyticsPayload,
      ]) => {
        const settings = (sitePayload as { data?: SiteSettings } | undefined)?.data;
        const posts = (postPayload as { data?: Post[] } | undefined)?.data ?? [];
        const comments = (commentPayload as { data?: Comment[] } | undefined)?.data ?? [];
        const users = (userPayload as { data?: CmsUser[] } | undefined)?.data ?? [];
        const assets = (assetPayload as { data?: Asset[] } | undefined)?.data ?? [];
        const tokens = (tokenPayload as { data?: ApiToken[] } | undefined)?.data ?? [];
        const overview = (analyticsPayload as { data?: AnalyticsOverview } | undefined)?.data;

        if (ignore) {
          return;
        }

        if (settings) {
          setSiteSettings(localizeSiteSettings(settings, locale));
        }
        setStats(getOverviewStats({ assets, comments, posts, tokens, users }));
        if (overview) {
          setAnalytics(overview);
        }
      },
    );

    return () => {
      ignore = true;
    };
  }, [locale]);

  const copy = getOverviewCopy(locale);
  const cards = [
    {
      icon: FileTextIcon,
      label: m.admin_posts_title(),
      value: stats.posts.total,
      detail: copy.postsDetail(stats.posts),
    },
    {
      icon: MessageSquareIcon,
      label: m.admin_comments_title(),
      value: stats.comments.total,
      detail: copy.commentsDetail(stats.comments),
    },
    {
      icon: UsersIcon,
      label: m.admin_users_title(),
      value: stats.users.total,
      detail: copy.usersDetail(stats.users),
    },
    {
      icon: ImageIcon,
      label: m.admin_assets_title(),
      value: stats.assets.total,
      detail: copy.assetsDetail(stats.assets),
    },
    {
      icon: KeyRoundIcon,
      label: m.admin_tokens_title(),
      value: stats.tokens.active,
      detail: copy.tokensDetail(stats.tokens),
    },
    {
      icon: DatabaseIcon,
      label: copy.recordsLabel,
      value: stats.records.total,
      detail: copy.recordsDetail(stats.records),
    },
  ];
  const readerCards = [
    {
      icon: EyeIcon,
      label: copy.viewsLabel,
      value: analytics.totals.views,
      detail: copy.viewsDetail(analytics),
    },
    {
      icon: UsersIcon,
      label: copy.visitorsLabel,
      value: analytics.totals.visitors,
      detail: copy.visitorsDetail(analytics),
    },
    {
      icon: TrendingUpIcon,
      label: copy.postViewsLabel,
      value: analytics.totals.postViews,
      detail: copy.postViewsDetail(analytics),
    },
  ];

  return (
    <div className="grid gap-4">
      <AdminPageHeader
        eyebrow={m.admin_overview_eyebrow()}
        title={m.admin_overview_title()}
        description={m.admin_metric_overview_description({ name: siteSettings.name })}
        className="pb-4"
        actions={
          <Button render={<Link to="/admin/posts" />} size="sm" nativeButton={false}>
            {m.admin_manage_posts()}
            <ArrowRightIcon />
          </Button>
        }
      />

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <AdminPanel key={card.label} className="min-h-0 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-normal">{card.value}</p>
                </div>
                <Icon className="size-5 text-link" />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.detail}</p>
            </AdminPanel>
          );
        })}
      </div>

      <AdminPanel className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {copy.analyticsEyebrow}
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-normal">{copy.analyticsTitle}</h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
              {copy.analyticsDescription(analytics)}
            </p>
          </div>
          <BarChart3Icon className="size-5 text-link" />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {readerCards.map((card) => (
            <AnalyticsMetricBlock key={card.label} card={card} locale={locale} />
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
          <div className="min-w-0 border-t border-border/70 pt-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{copy.trendLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">{copy.trendDetail}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {copy.todayLabel}: {formatNumber(analytics.today.views, locale)}
              </p>
            </div>
            <DailyTrend daily={analytics.daily} locale={locale} emptyLabel={copy.noAnalytics} />
          </div>

          <div className="border-t border-border/70 pt-4">
            <p className="text-sm font-semibold">{copy.topPostsLabel}</p>
            <TopPostsList
              posts={analytics.topPosts}
              locale={locale}
              emptyLabel={copy.noTopPosts}
              copy={copy}
            />
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}

type OverviewStats = {
  posts: {
    archived: number;
    draft: number;
    published: number;
    scheduled: number;
    total: number;
  };
  comments: {
    approved: number;
    pending: number;
    spam: number;
    total: number;
  };
  users: {
    active: number;
    admin: number;
    muted: number;
    reader: number;
    total: number;
  };
  assets: {
    sizeBytes: number;
    total: number;
  };
  tokens: {
    active: number;
    total: number;
  };
  records: {
    content: number;
    total: number;
  };
};

const emptyOverviewStats: OverviewStats = {
  assets: { sizeBytes: 0, total: 0 },
  comments: { approved: 0, pending: 0, spam: 0, total: 0 },
  posts: { archived: 0, draft: 0, published: 0, scheduled: 0, total: 0 },
  records: { content: 0, total: 0 },
  tokens: { active: 0, total: 0 },
  users: { active: 0, admin: 0, muted: 0, reader: 0, total: 0 },
};

const emptyAnalyticsDay = { date: "", views: 0, visitors: 0, postViews: 0 };

const emptyAnalyticsOverview: AnalyticsOverview = {
  days: 7,
  startDate: "",
  endDate: "",
  totals: { views: 0, visitors: 0, postViews: 0 },
  today: emptyAnalyticsDay,
  yesterday: emptyAnalyticsDay,
  daily: [],
  topPosts: [],
};

type AnalyticsMetricCard = {
  icon: LucideIcon;
  label: string;
  value: number;
  detail: string;
};

function AnalyticsMetricBlock({
  card,
  locale,
}: {
  readonly card: AnalyticsMetricCard;
  readonly locale: SupportedLocale;
}) {
  const Icon = card.icon;

  return (
    <div className="border-t border-border/70 pt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-normal">
            {formatNumber(card.value, locale)}
          </p>
        </div>
        <Icon className="size-4 text-link" />
      </div>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{card.detail}</p>
    </div>
  );
}

function DailyTrend({
  daily,
  emptyLabel,
  locale,
}: {
  readonly daily: AnalyticsOverview["daily"];
  readonly emptyLabel: string;
  readonly locale: SupportedLocale;
}) {
  const hasData = daily.some((day) => day.views > 0);
  const maxViews = Math.max(1, ...daily.map((day) => day.views));

  if (!daily.length || !hasData) {
    return <p className="mt-5 text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="mt-4 flex h-28 items-end gap-2 border-b border-border/70 pb-2">
      {daily.map((day) => {
        const height = day.views > 0 ? Math.max(8, (day.views / maxViews) * 100) : 2;

        return (
          <div
            key={day.date}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
            title={`${formatShortDate(day.date, locale)}: ${formatNumber(day.views, locale)}`}
          >
            <div className="flex w-full flex-1 items-end bg-muted/45">
              <div
                className="w-full bg-link/75 transition-[height]"
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-[11px] leading-none text-muted-foreground">
              {formatShortDate(day.date, locale)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TopPostsList({
  copy,
  emptyLabel,
  locale,
  posts,
}: {
  readonly copy: ReturnType<typeof getOverviewCopy>;
  readonly emptyLabel: string;
  readonly locale: SupportedLocale;
  readonly posts: AnalyticsTopPost[];
}) {
  if (!posts.length) {
    return <p className="mt-5 text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ol className="mt-3 grid gap-2.5">
      {posts.map((post, index) => (
        <li
          key={post.slug}
          className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-3"
        >
          <span className="mt-0.5 text-xs font-semibold text-muted-foreground">{index + 1}</span>
          <div className="min-w-0">
            <Link
              to="/blog/$slug"
              params={{ slug: post.slug }}
              className="block truncate text-sm font-semibold underline-offset-4 hover:text-link hover:underline"
            >
              {post.title}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">{copy.topPostMeta(post)}</p>
          </div>
          <span className="text-sm font-semibold">{formatNumber(post.views, locale)}</span>
        </li>
      ))}
    </ol>
  );
}

function getOverviewStats({
  assets,
  comments,
  posts,
  tokens,
  users,
}: {
  readonly assets: Asset[];
  readonly comments: Comment[];
  readonly posts: Post[];
  readonly tokens: ApiToken[];
  readonly users: CmsUser[];
}): OverviewStats {
  return {
    assets: {
      sizeBytes: assets.reduce((total, asset) => total + asset.sizeBytes, 0),
      total: assets.length,
    },
    comments: {
      approved: comments.filter((comment) => comment.status === "approved").length,
      pending: comments.filter((comment) => comment.status === "pending").length,
      spam: comments.filter((comment) => comment.status === "spam").length,
      total: comments.length,
    },
    posts: {
      archived: posts.filter((post) => post.status === "archived").length,
      draft: posts.filter((post) => post.status === "draft").length,
      published: posts.filter((post) => post.status === "published").length,
      scheduled: posts.filter((post) => post.status === "scheduled").length,
      total: posts.length,
    },
    records: {
      content: posts.length,
      total: posts.length + comments.length + assets.length + users.length,
    },
    tokens: {
      active: tokens.filter((token) => !token.revokedAt).length,
      total: tokens.length,
    },
    users: {
      active: users.filter((user) => user.commentStatus === "active").length,
      admin: users.filter((user) => user.role === "admin").length,
      muted: users.filter((user) => user.commentStatus === "muted").length,
      reader: users.filter((user) => user.role === "reader").length,
      total: users.length,
    },
  };
}

function getOverviewCopy(locale: SupportedLocale) {
  if (locale === "zh") {
    return {
      analyticsDescription: (analytics: AnalyticsOverview) =>
        `近 ${analytics.days} 天 ${formatNumber(analytics.totals.views, locale)} 次访问，${formatNumber(analytics.totals.visitors, locale)} 位访客。`,
      analyticsEyebrow: "读者反馈",
      analyticsTitle: "访问和阅读",
      assetsDetail: (assets: OverviewStats["assets"]) =>
        `${formatBytes(assets.sizeBytes)} 已上传资源。`,
      commentsDetail: (comments: OverviewStats["comments"]) =>
        `${comments.pending} 条待审，${comments.approved} 条已通过，${comments.spam} 条垃圾评论。`,
      noAnalytics: "还没有访问数据。公开页面被访问后，这里会显示最近趋势。",
      noTopPosts: "还没有文章阅读数据。",
      postsDetail: (posts: OverviewStats["posts"]) =>
        `${posts.published} 篇已发布，${posts.draft} 篇草稿，${posts.scheduled} 篇定时，${posts.archived} 篇归档。`,
      postViewsDetail: (analytics: AnalyticsOverview) =>
        `${formatPostViewShare(analytics)} 来自文章页阅读。`,
      postViewsLabel: "文章阅读",
      recordsDetail: (records: OverviewStats["records"]) =>
        `内容 ${records.content} 条，总记录 ${records.total} 条。`,
      recordsLabel: "内容记录",
      todayLabel: "今日",
      tokensDetail: (tokens: OverviewStats["tokens"]) =>
        `${tokens.active} 个可用 Token，共 ${tokens.total} 个。`,
      topPostMeta: (post: AnalyticsTopPost) =>
        `${formatNumber(post.visitors, locale)} 位访客，${formatNumber(post.comments, locale)} 条评论`,
      topPostsLabel: "热门文章",
      trendDetail: "按天统计的页面访问量。",
      trendLabel: "7 日趋势",
      usersDetail: (users: OverviewStats["users"]) =>
        `${users.reader} 个读者账号，${users.admin} 个管理员，${users.muted} 个已禁止评论。`,
      viewsDetail: (analytics: AnalyticsOverview) =>
        `今日 ${formatNumber(analytics.today.views, locale)}，昨日 ${formatNumber(analytics.yesterday.views, locale)}。`,
      viewsLabel: "页面访问",
      visitorsDetail: (analytics: AnalyticsOverview) =>
        `今日 ${formatNumber(analytics.today.visitors, locale)} 位，按天匿名去重。`,
      visitorsLabel: "访客",
    };
  }

  return {
    analyticsDescription: (analytics: AnalyticsOverview) =>
      `${formatNumber(analytics.totals.views, locale)} visits and ${formatNumber(analytics.totals.visitors, locale)} visitors over the last ${analytics.days} days.`,
    analyticsEyebrow: "Reader feedback",
    analyticsTitle: "Visits and reading",
    assetsDetail: (assets: OverviewStats["assets"]) => `${formatBytes(assets.sizeBytes)} uploaded.`,
    commentsDetail: (comments: OverviewStats["comments"]) =>
      `${comments.pending} pending, ${comments.approved} approved, ${comments.spam} spam.`,
    noAnalytics: "No visit data yet. Public page visits will appear here.",
    noTopPosts: "No article reading data yet.",
    postsDetail: (posts: OverviewStats["posts"]) =>
      `${posts.published} published, ${posts.draft} drafts, ${posts.scheduled} scheduled, ${posts.archived} archived.`,
    postViewsDetail: (analytics: AnalyticsOverview) =>
      `${formatPostViewShare(analytics)} from article pages.`,
    postViewsLabel: "Article reads",
    recordsDetail: (records: OverviewStats["records"]) =>
      `Content ${records.content}. Total records ${records.total}.`,
    recordsLabel: "Content records",
    todayLabel: "Today",
    tokensDetail: (tokens: OverviewStats["tokens"]) =>
      `${tokens.active} active tokens, ${tokens.total} total.`,
    topPostMeta: (post: AnalyticsTopPost) =>
      `${formatNumber(post.visitors, locale)} visitors, ${formatNumber(post.comments, locale)} comments`,
    topPostsLabel: "Top articles",
    trendDetail: "Page visits grouped by day.",
    trendLabel: "7-day trend",
    usersDetail: (users: OverviewStats["users"]) =>
      `${users.reader} reader accounts, ${users.admin} admins, ${users.muted} muted.`,
    viewsDetail: (analytics: AnalyticsOverview) =>
      `Today ${formatNumber(analytics.today.views, locale)}, yesterday ${formatNumber(analytics.yesterday.views, locale)}.`,
    viewsLabel: "Page visits",
    visitorsDetail: (analytics: AnalyticsOverview) =>
      `${formatNumber(analytics.today.visitors, locale)} today, deduped anonymously by day.`,
    visitorsLabel: "Visitors",
  };
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatNumber(value: number, locale: SupportedLocale) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US").format(value);
}

function formatShortDate(value: string, locale: SupportedLocale) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatPostViewShare(analytics: AnalyticsOverview) {
  if (!analytics.totals.views) {
    return "0%";
  }

  return `${Math.round((analytics.totals.postViews / analytics.totals.views) * 100)}%`;
}
