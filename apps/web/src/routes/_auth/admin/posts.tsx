import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admin/posts")({
  component: AdminPostsLayout,
});

function AdminPostsLayout() {
  return <Outlet />;
}
