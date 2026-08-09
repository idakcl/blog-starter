import { createFileRoute } from "@tanstack/react-router";

import { PostEditorPage } from "#/components/admin/post-editor-page";

export const Route = createFileRoute("/_auth/admin/posts/new")({
  component: AdminNewPostPage,
});

function AdminNewPostPage() {
  return <PostEditorPage />;
}
