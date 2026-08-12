import type { ContentStatus, Post } from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Link } from "@tanstack/react-router";
import {
  ArchiveIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  InfoIcon,
  SearchIcon,
  SendIcon,
} from "lucide-react";

import { AdminPanel, AdminTableFrame, adminSelectClassName } from "#/components/admin/admin-ui";
import { PostBatchActions, type BatchAction } from "#/components/admin/post-batch-actions";
import { m } from "#/paraglide/messages.js";

const statusOptions: Array<"all" | Exclude<ContentStatus, "deleted">> = [
  "all",
  "draft",
  "published",
  "scheduled",
  "archived",
];

interface PostListProps {
  visiblePosts: Post[];
  selectedPostIds: string[];
  allVisibleSelected: boolean;
  query: string;
  statusFilter: "all" | ContentStatus;
  seriesFilter: string;
  tagFilter: string;
  seriesOptions: Array<{ slug: string; name: string }>;
  tagOptions: Array<{ slug: string; name: string }>;
  onQueryChange: (query: string) => void;
  onStatusFilterChange: (status: "all" | ContentStatus) => void;
  onSeriesFilterChange: (slug: string) => void;
  onTagFilterChange: (slug: string) => void;
  onToggleAll: (checked: boolean) => void;
  onTogglePost: (postId: string, checked: boolean) => void;
  onChangePostStatus: (post: Post, status: ContentStatus) => void;
  onDeletePost: (post: Post) => void;
  onBatchAction: (action: BatchAction) => void;
  hiddenFilter: boolean;
  hiddenCount: number;
  onHiddenFilterChange: (value: boolean) => void;
  onShowInList: (post: Post) => void;
  onHidePost?: (post: Post) => void;
}

export function PostList({
  visiblePosts,
  selectedPostIds,
  allVisibleSelected,
  query,
  statusFilter,
  seriesFilter,
  tagFilter,
  seriesOptions,
  tagOptions,
  onQueryChange,
  onStatusFilterChange,
  onSeriesFilterChange,
  onTagFilterChange,
  onToggleAll,
  onTogglePost,
  onChangePostStatus,
  onDeletePost,
  onBatchAction,
  hiddenFilter,
  hiddenCount,
  onHiddenFilterChange,
  onShowInList,
  onHidePost,
}: PostListProps) {
  const statusDetails = statusOptions
    .filter((status): status is Exclude<ContentStatus, "deleted"> => status !== "all")
    .map((status) => ({
      status,
      ...getPostStatusCopy(status),
    }));

  return (
    <AdminPanel>
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_640px] lg:items-end">
        <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 shadow-xs">
          <SearchIcon className="size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={m.admin_posts_search()}
            className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="post-status-filter">{m.admin_posts_filter_status()}</Label>
            <select
              id="post-status-filter"
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(event.currentTarget.value as "all" | ContentStatus)
              }
              className={adminSelectClassName}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "all"
                    ? m.admin_posts_filter_all_status()
                    : getPostStatusCopy(status).label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="post-series-filter">{m.admin_posts_filter_series()}</Label>
            <select
              id="post-series-filter"
              value={seriesFilter}
              onChange={(event) => onSeriesFilterChange(event.currentTarget.value)}
              className={adminSelectClassName}
            >
              <option value="all">{m.admin_posts_filter_all_series()}</option>
              {seriesOptions.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="post-tag-filter">{m.admin_posts_filter_tag()}</Label>
            <select
              id="post-tag-filter"
              value={tagFilter}
              onChange={(event) => onTagFilterChange(event.currentTarget.value)}
              className={adminSelectClassName}
            >
              <option value="all">{m.admin_posts_filter_all_tags()}</option>
              {tagOptions.map((tag) => (
                <option key={tag.slug} value={tag.slug}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={hiddenFilter ? "default" : "outline"}
          onClick={() => onHiddenFilterChange(!hiddenFilter)}
          aria-pressed={hiddenFilter}
        >
          <EyeOffIcon />
          {m.admin_posts_show_hidden()}
          {hiddenCount > 0 ? (
            <span className="ml-1 rounded-sm bg-background/20 px-1.5 py-0.5 text-[11px] font-semibold">
              {hiddenCount}
            </span>
          ) : null}
        </Button>
        {(["draft", "published", "scheduled", "archived"] as const).map((status) => {
          const active = statusFilter === status && !hiddenFilter;

          return (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              onClick={() => {
                onStatusFilterChange(active ? "all" : status);
                onHiddenFilterChange(false);
              }}
            >
              {getPostStatusCopy(status).label}
            </Button>
          );
        })}
        {hiddenFilter ? (
          <span className="text-xs text-muted-foreground">
            仅显示已从公开列表隐藏的文章；点“显示在列表”可让其重新公开。
          </span>
        ) : null}
      </div>

      <details className="mt-4 border-y border-border/80 py-3">
        <summary className="flex min-h-9 w-fit cursor-pointer list-none items-center gap-2 rounded-md px-1 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/20 [&::-webkit-details-marker]:hidden">
          <InfoIcon className="size-4" />
          {m.admin_posts_status()}
        </summary>
        <p className="mt-2 text-sm text-muted-foreground">{m.admin_posts_status_help()}</p>
        <dl className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {statusDetails.map((item) => (
            <div key={item.status} className="space-y-1">
              <dt className="text-sm font-medium text-foreground">{item.label}</dt>
              <dd className="text-xs leading-5 text-muted-foreground">{item.description}</dd>
            </div>
          ))}
        </dl>
      </details>

      <PostBatchActions selectedCount={selectedPostIds.length} onAction={onBatchAction} />

      <div className="mt-4 hidden lg:block">
        <AdminTableFrame>
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-muted/55 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(event) => onToggleAll(event.currentTarget.checked)}
                    aria-label={m.admin_posts_select_all()}
                    className="size-4 rounded border-input"
                  />
                </th>
                <th className="px-3 py-2.5">{m.admin_posts_column_title()}</th>
                <th className="px-3 py-2.5">{m.admin_posts_status()}</th>
                <th className="px-3 py-2.5">{m.admin_series_title()}</th>
                <th className="px-3 py-2.5">{m.admin_posts_source()}</th>
                <th className="px-3 py-2.5">{m.admin_posts_updated()}</th>
                <th className="px-3 py-2.5">{m.admin_posts_public_url()}</th>
                <th className="px-3 py-2.5">{m.admin_posts_actions()}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {visiblePosts.map((post) => {
                const statusCopy = getPostStatusCopy(post.status);
                const publiclyVisible = isPostPubliclyVisible(post);
                const isObsidianPost = post.externalSource?.kind === "obsidian_git";

                return (
                  <tr key={post.id}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPostIds.includes(post.id)}
                        onChange={(event) => onTogglePost(post.id, event.currentTarget.checked)}
                        aria-label={m.admin_posts_select_one({ title: post.title })}
                        className="size-4 rounded border-input"
                      />
                    </td>
                    <td className="px-3 py-3 font-medium">
                      <div className="grid gap-1">
                        <span>{post.title}</span>
                        {post.pinned || post.featured ? (
                          <div className="flex flex-wrap gap-1.5">
                            {post.pinned ? (
                              <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                {m.pinned()}
                              </span>
                            ) : null}
                            {post.featured ? (
                              <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                {m.featured()}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        {!post.listed ? (
                          <span className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            {m.admin_posts_hidden_badge()}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {getPostStatusBadges(post).map((badge) => (
                          <span
                            key={badge.label}
                            className="rounded-sm bg-accent px-2 py-1 text-xs font-medium text-accent-foreground"
                            title={statusCopy.description}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {post.series?.name ?? m.admin_posts_no_series()}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {isObsidianPost ? "Obsidian" : post.source}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {post.updatedAt.slice(0, 10)}
                    </td>
                    <td className="px-3 py-3">
                      {publiclyVisible ? (
                        <Link
                          to="/blog/$slug"
                          params={{ slug: post.slug }}
                          className="text-link hover:underline"
                        >
                          {m.admin_posts_view()}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{m.admin_posts_not_public()}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <PostActions
                        post={post}
                        onChangePostStatus={onChangePostStatus}
                        onDeletePost={onDeletePost}
                        onShowInList={onShowInList}
                        onHidePost={onHidePost}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AdminTableFrame>
      </div>

      <PostListMobile
        visiblePosts={visiblePosts}
        selectedPostIds={selectedPostIds}
        onTogglePost={onTogglePost}
        onChangePostStatus={onChangePostStatus}
        onDeletePost={onDeletePost}
        onShowInList={onShowInList}
        onHidePost={onHidePost}
      />
    </AdminPanel>
  );
}

function getPostStatusCopy(status: ContentStatus) {
  switch (status) {
    case "draft":
      return {
        label: m.admin_post_status_draft_label(),
        description: m.admin_post_status_draft_description(),
      };
    case "published":
      return {
        label: m.admin_post_status_published_label(),
        description: m.admin_post_status_published_description(),
      };
    case "scheduled":
      return {
        label: m.admin_post_status_scheduled_label(),
        description: m.admin_post_status_scheduled_description(),
      };
    case "archived":
      return {
        label: m.admin_post_status_archived_label(),
        description: m.admin_post_status_archived_description(),
      };
    case "deleted":
      return {
        label: m.admin_post_status_deleted_label(),
        description: m.admin_post_status_deleted_description(),
      };
  }
}

function isPostPubliclyVisible(post: Post) {
  if (post.status === "published") {
    return true;
  }

  return post.status === "scheduled" && Date.parse(post.publishedAt) <= Date.now();
}

// 状态徽章：定时发布且发布时间已过，除「定时发布」外再追加「已发布」徽章。
function getPostStatusBadges(post: Post): Array<{ label: string }> {
  if (post.status === "scheduled" && Date.parse(post.publishedAt) <= Date.now()) {
    return [
      { label: getPostStatusCopy("scheduled").label },
      { label: getPostStatusCopy("published").label },
    ];
  }

  return [{ label: getPostStatusCopy(post.status).label }];
}

type PostActionsProps = {
  readonly post: Post;
  readonly onChangePostStatus: (post: Post, status: ContentStatus) => void;
  readonly onDeletePost: (post: Post) => void;
  readonly onShowInList: (post: Post) => void;
  readonly onHidePost?: (post: Post) => void;
};

// 桌面表格与移动端卡片共用的操作按钮，保证两套布局行为一致。
function PostActions({
  post,
  onChangePostStatus,
  onDeletePost,
  onShowInList,
  onHidePost,
}: PostActionsProps) {
  const isObsidianPost = post.externalSource?.kind === "obsidian_git";

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        render={<Link to="/admin/posts/$postId" params={{ postId: post.id }} />}
        nativeButton={false}
        size="sm"
        variant="outline"
      >
        {m.admin_posts_edit()}
      </Button>
      {!isObsidianPost && !post.listed ? (
        <>
          {(["draft", "published", "archived"] as const).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={post.status === status ? "default" : "outline"}
              aria-pressed={post.status === status}
              onClick={() => onChangePostStatus(post, status)}
            >
              {getPostStatusCopy(status).label}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => onShowInList(post)}>
            <EyeIcon />
            {m.admin_posts_show_in_list()}
          </Button>
        </>
      ) : null}
      {!isObsidianPost && post.listed ? (
        <>
          {post.status !== "published" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChangePostStatus(post, "published")}
            >
              <SendIcon />
              {m.admin_publish_post()}
            </Button>
          ) : null}
          {post.status !== "draft" ? (
            <Button size="sm" variant="outline" onClick={() => onChangePostStatus(post, "draft")}>
              <FileTextIcon />
              {m.admin_posts_move_to_draft()}
            </Button>
          ) : null}
          {post.status !== "archived" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChangePostStatus(post, "archived")}
            >
              <ArchiveIcon />
              {m.admin_posts_archive()}
            </Button>
          ) : null}
          {onHidePost ? (
            <Button size="sm" variant="outline" onClick={() => onHidePost(post)}>
              <EyeOffIcon />
              {m.admin_posts_hide()}
            </Button>
          ) : null}
        </>
      ) : null}
      {!isObsidianPost ? (
        <Button size="sm" variant="destructive" onClick={() => onDeletePost(post)}>
          {m.admin_posts_delete()}
        </Button>
      ) : null}
    </div>
  );
}

// 移动端（< lg）文章列表：用卡片代替宽表格，避免横向滚动、内容超出左右边线。
function PostListMobile({
  visiblePosts,
  selectedPostIds,
  onTogglePost,
  onChangePostStatus,
  onDeletePost,
  onShowInList,
  onHidePost,
}: {
  readonly visiblePosts: Post[];
  readonly selectedPostIds: string[];
  readonly onTogglePost: (postId: string, checked: boolean) => void;
  readonly onChangePostStatus: (post: Post, status: ContentStatus) => void;
  readonly onDeletePost: (post: Post) => void;
  readonly onShowInList: (post: Post) => void;
  readonly onHidePost?: (post: Post) => void;
}) {
  if (visiblePosts.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-3 lg:hidden">
      {visiblePosts.map((post) => {
        const isObsidianPost = post.externalSource?.kind === "obsidian_git";

        return (
          <div key={post.id} className="rounded-md border border-border/80 bg-card p-3 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to="/admin/posts/$postId"
                  params={{ postId: post.id }}
                  className="block font-medium hover:text-link"
                >
                  {post.title}
                </Link>
                {(post.pinned || post.featured || !post.listed) && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {post.pinned ? (
                      <span className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {m.pinned()}
                      </span>
                    ) : null}
                    {post.featured ? (
                      <span className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {m.featured()}
                      </span>
                    ) : null}
                    {!post.listed ? (
                      <span className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        {m.admin_posts_hidden_badge()}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <input
                type="checkbox"
                checked={selectedPostIds.includes(post.id)}
                onChange={(event) => onTogglePost(post.id, event.currentTarget.checked)}
                aria-label={m.admin_posts_select_one({ title: post.title })}
                className="size-4 shrink-0 rounded border-input"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {getPostStatusBadges(post).map((badge) => (
                <span
                  key={badge.label}
                  className="rounded-sm bg-accent px-2 py-1 font-medium text-accent-foreground"
                >
                  {badge.label}
                </span>
              ))}
              <span>{post.series?.name ?? m.admin_posts_no_series()}</span>
              <span>{isObsidianPost ? "Obsidian" : post.source}</span>
              <span>{post.updatedAt.slice(0, 10)}</span>
            </div>
            <div className="mt-3">
              <PostActions
                post={post}
                onChangePostStatus={onChangePostStatus}
                onDeletePost={onDeletePost}
                onShowInList={onShowInList}
                onHidePost={onHidePost}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
