import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "#/components/admin-shell";

export const Route = createFileRoute("/_auth/admin")({
  component: AdminRoute,
});

function AdminRoute() {
  const { user } = Route.useRouteContext();

  return <AdminShell user={user} />;
}
