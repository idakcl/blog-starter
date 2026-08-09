import type { Post, SupportedLocale } from "@repo/core";
import { formatDate } from "@repo/core";
import { cn } from "@repo/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { CalendarDaysIcon, LibraryIcon } from "lucide-react";
import { useState } from "react";

import { getCurrentLocale } from "#/lib/i18n";
import { resolvePostCoverImage } from "#/lib/post-cover-image";
import { m } from "#/paraglide/messages.js";

type PostCardProps = {
  readonly post: Post;
  readonly priority?: boolean;
  readonly locale?: SupportedLocale;
};

export function PostCard({ post, priority = false, locale = getCurrentLocale() }: PostCardProps) {
  const resolvedCoverImage = resolvePostCoverImage(post.coverImage);
  const [failedCoverImage, setFailedCoverImage] = useState("");
  const coverImage = failedCoverImage === resolvedCoverImage ? "" : resolvedCoverImage;

  return (
    <article
      className={cn(
        "grid overflow-hidden rounded-lg border border-border/80 bg-card shadow-xs transition hover:border-ring/45 hover:shadow-sm",
        coverImage && "md:grid-cols-[0.42fr_0.58fr]",
      )}
    >
      {coverImage ? (
        <Link to="/blog/$slug" params={{ slug: post.slug }} className="block min-h-56 bg-muted">
          <img
            src={coverImage}
            alt=""
            loading={priority ? "eager" : "lazy"}
            onError={() => setFailedCoverImage(resolvedCoverImage)}
            className="h-full min-h-56 w-full object-cover"
          />
        </Link>
      ) : null}
      <div className={cn("flex min-w-0 flex-col p-5", !coverImage && "sm:p-6")}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDaysIcon className="size-3.5" />
            {formatDate(post.publishedAt, locale)}
          </span>
          {post.pinned ? (
            <span className="rounded-sm bg-accent px-2 py-0.5 text-accent-foreground">
              {m.pinned()}
            </span>
          ) : null}
          {post.featured ? (
            <span className="rounded-sm bg-accent px-2 py-0.5 text-accent-foreground">
              {m.featured()}
            </span>
          ) : null}
          {post.series ? (
            <Link
              to="/series/$slug"
              params={{ slug: post.series.slug }}
              className="inline-flex items-center gap-1 rounded-sm bg-accent px-2 py-0.5 text-accent-foreground transition hover:bg-accent/80"
            >
              <LibraryIcon className="size-3.5" />
              {post.series.name}
            </Link>
          ) : null}
        </div>
        <Link to="/blog/$slug" params={{ slug: post.slug }} className="group mt-3">
          <h2 className="text-2xl font-semibold text-balance group-hover:text-link">
            {post.title}
          </h2>
        </Link>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Link
              key={tag.slug}
              to="/tags/$slug"
              params={{ slug: tag.slug }}
              className="rounded-sm border border-border bg-muted/45 px-2 py-1 text-xs text-muted-foreground transition hover:border-ring/50 hover:text-foreground"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}
