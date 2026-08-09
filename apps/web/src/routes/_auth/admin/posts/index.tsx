import { type ContentStatus, type Post } from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminPageHeader } from "#/components/admin/admin-ui";
import { type BatchAction } from "#/components/admin/post-batch-actions";
import { PostList } from "#/components/admin/post-list";
import { getResponseErrorMessage } from "#/lib/admin-notifications";
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_auth/admin/posts/")({
  component: AdminPostsPage,
});

function AdminPostsPage() {
  const locale = getCurrentLocale();
  const copy = getAdminPostsCopy(locale);
  const [rows, setRows] = useState<Post[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContentStatus>("all");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);

  const visiblePosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter(
      (post) =>
        (statusFilter === "all" || post.status === statusFilter) &&
        (seriesFilter === "all" || post.series?.slug === seriesFilter) &&
        (tagFilter === "all" || post.tags.some((tag) => tag.slug === tagFilter)) &&
        (!normalizedQuery ||
          [
            post.title,
            post.excerpt,
            post.status,
            post.source,
            post.series?.name ?? "",
            ...post.tags.map((tag) => tag.name),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)),
    );
  }, [rows, query, statusFilter, seriesFilter, tagFilter]);

  const seriesOptions = useMemo(() => {
    const seriesBySlug = new Map<string, NonNullable<Post["series"]>>();

    for (const post of rows) {
      if (post.series) {
        seriesBySlug.set(post.series.slug, post.series);
      }
    }

    return Array.from(seriesBySlug.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const tagOptions = useMemo(() => {
    const tagsBySlug = new Map<string, Post["tags"][number]>();

    for (const post of rows) {
      for (const tag of post.tags) {
        tagsBySlug.set(tag.slug, tag);
      }
    }

    return Array.from(tagsBySlug.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);
  const allVisibleSelected =
    visiblePosts.length > 0 && visiblePosts.every((post) => selectedPostIds.includes(post.id));

  useEffect(() => {
    let ignore = false;

    void fetch(`/api/posts?status=all&lang=${locale}`)
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload) => {
        const data = (payload as { data?: Post[] } | undefined)?.data;

        if (!ignore && data) {
          setRows(data);
        }
      });

    return () => {
      ignore = true;
    };
  }, [locale]);

  const upsertPost = (post: Post) => {
    setRows((current) => {
      if (current.some((row) => row.id === post.id)) {
        return current.map((row) => (row.id === post.id ? post : row));
      }

      return [post, ...current];
    });
  };

  const changePostStatus = async (post: Post, status: ContentStatus) => {
    const response = await fetch(`/api/posts/${post.id}?lang=${locale}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);

    if (!response?.ok) {
      toast.error(copy.statusError(status), {
        description: response
          ? await getResponseErrorMessage(response, copy.statusError(status))
          : copy.networkError,
      });
      return;
    }

    const payload = (await response.json()) as { data: Post };
    upsertPost(payload.data);
    setSelectedPostIds((current) => current.filter((id) => id !== post.id));
    toast.success(copy.statusSuccess(status, post.title));
  };

  const deletePost = async (post: Post) => {
    const response = await fetch(`/api/posts/${post.id}?lang=${locale}`, {
      method: "DELETE",
    }).catch(() => null);

    if (!response?.ok) {
      toast.error(copy.deleteError, {
        description: response
          ? await getResponseErrorMessage(response, copy.deleteError)
          : copy.networkError,
      });
      return;
    }

    setRows((current) => current.filter((row) => row.id !== post.id));
    setSelectedPostIds((current) => current.filter((id) => id !== post.id));
    toast.success(copy.deleteSuccess(post.title));
  };

  const toggleAllVisiblePosts = (checked: boolean) => {
    const visibleIds = visiblePosts.map((post) => post.id);

    setSelectedPostIds((current) =>
      checked
        ? Array.from(new Set([...current, ...visibleIds]))
        : current.filter((id) => !visibleIds.includes(id)),
    );
  };

  const togglePostSelection = (postId: string, checked: boolean) => {
    setSelectedPostIds((current) =>
      checked ? Array.from(new Set([...current, postId])) : current.filter((id) => id !== postId),
    );
  };

  const applyBatchAction = async (action: BatchAction) => {
    if (!selectedPostIds.length) {
      return;
    }

    const response = await fetch(`/api/posts/batch?lang=${locale}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: selectedPostIds, action, locale }),
    }).catch(() => null);

    if (!response?.ok) {
      toast.error(copy.batchError(action), {
        description: response
          ? await getResponseErrorMessage(response, copy.batchError(action))
          : copy.networkError,
      });
      return;
    }

    const payload = (await response.json()) as { data: Post[] };

    if (action === "delete") {
      const deletedIds = new Set(payload.data.map((post) => post.id));
      setRows((current) => current.filter((post) => !deletedIds.has(post.id)));
    } else {
      for (const post of payload.data) {
        upsertPost(post);
      }
    }

    setSelectedPostIds([]);
    toast.success(copy.batchSuccess(action, payload.data.length));
  };

  return (
    <section className="grid gap-5">
      <AdminPageHeader
        title={m.admin_posts_title()}
        description={m.admin_posts_description()}
        actions={
          <Button render={<Link to="/admin/posts/new" />} nativeButton={false}>
            <PlusIcon />
            {m.admin_new_post()}
          </Button>
        }
      />

      <PostList
        visiblePosts={visiblePosts}
        selectedPostIds={selectedPostIds}
        allVisibleSelected={allVisibleSelected}
        query={query}
        statusFilter={statusFilter}
        seriesFilter={seriesFilter}
        tagFilter={tagFilter}
        seriesOptions={seriesOptions}
        tagOptions={tagOptions}
        onQueryChange={setQuery}
        onStatusFilterChange={setStatusFilter}
        onSeriesFilterChange={setSeriesFilter}
        onTagFilterChange={setTagFilter}
        onToggleAll={toggleAllVisiblePosts}
        onTogglePost={togglePostSelection}
        onChangePostStatus={(post, status) => void changePostStatus(post, status)}
        onDeletePost={(post) => void deletePost(post)}
        onBatchAction={(action) => void applyBatchAction(action)}
      />
    </section>
  );
}

function getAdminPostsCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      batchError: (action: BatchAction) =>
        action === "publish"
          ? "批量发布失败"
          : action === "draft"
            ? "批量改为草稿失败"
            : action === "archive"
              ? "批量归档失败"
              : "批量删除失败",
      batchSuccess: (action: BatchAction, count: number) =>
        action === "publish"
          ? `${count} 篇文章已发布`
          : action === "draft"
            ? `${count} 篇文章已改为草稿`
            : action === "archive"
              ? `${count} 篇文章已归档`
              : `${count} 篇文章已删除`,
      deleteError: "文章删除失败",
      deleteSuccess: (title: string) => `“${title}”已删除`,
      networkError: "网络异常，请稍后再试。",
      statusError: (status: ContentStatus) =>
        status === "published"
          ? "文章发布失败"
          : status === "draft"
            ? "文章改为草稿失败"
            : "文章归档失败",
      statusSuccess: (status: ContentStatus, title: string) =>
        status === "published"
          ? `“${title}”已发布`
          : status === "draft"
            ? `“${title}”已改为草稿`
            : `“${title}”已归档`,
    };
  }

  return {
    batchError: (action: BatchAction) =>
      action === "publish"
        ? "Batch publish failed"
        : action === "draft"
          ? "Batch draft update failed"
          : action === "archive"
            ? "Batch archive failed"
            : "Batch delete failed",
    batchSuccess: (action: BatchAction, count: number) =>
      action === "publish"
        ? `${count} posts published`
        : action === "draft"
          ? `${count} posts moved to draft`
          : action === "archive"
            ? `${count} posts archived`
            : `${count} posts deleted`,
    deleteError: "Post could not be deleted",
    deleteSuccess: (title: string) => `"${title}" deleted`,
    networkError: "Network error. Try again in a moment.",
    statusError: (status: ContentStatus) =>
      status === "published"
        ? "Post could not be published"
        : status === "draft"
          ? "Post could not be moved to draft"
          : "Post could not be archived",
    statusSuccess: (status: ContentStatus, title: string) =>
      status === "published"
        ? `"${title}" published`
        : status === "draft"
          ? `"${title}" moved to draft`
          : `"${title}" archived`,
  };
}
