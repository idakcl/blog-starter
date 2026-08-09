import { Button } from "@repo/ui/components/button";

import { m } from "#/paraglide/messages.js";

export type BatchAction = "publish" | "draft" | "archive" | "delete";

interface PostBatchActionsProps {
  selectedCount: number;
  onAction: (action: BatchAction) => void;
}

export function PostBatchActions({ selectedCount, onAction }: PostBatchActionsProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
      <p className="text-sm text-muted-foreground">
        {m.admin_posts_selected({ count: selectedCount })}
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!selectedCount}
        onClick={() => onAction("publish")}
      >
        {m.admin_publish_post()}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!selectedCount}
        onClick={() => onAction("draft")}
      >
        {m.admin_posts_move_to_draft()}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!selectedCount}
        onClick={() => onAction("archive")}
      >
        {m.admin_posts_archive()}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={!selectedCount}
        onClick={() => onAction("delete")}
      >
        {m.admin_posts_delete()}
      </Button>
    </div>
  );
}
