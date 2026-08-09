import { createFileRoute } from "@tanstack/react-router";

import { PostEditorPage } from "#/components/admin/post-editor-page";

export const Route = createFileRoute("/_auth/admin/posts/$postId")({
  component: AdminEditPostPage,
});

function AdminEditPostPage() {
  const { postId } = Route.useParams();

  return <PostEditorPage postId={postId} />;
}
