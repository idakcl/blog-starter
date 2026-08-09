import { createLazyFileRoute, getRouteApi } from "@tanstack/react-router";

import { DocsRouteView } from "#/components/docs-route";

const routeApi = getRouteApi("/docs/$");

export const Route = createLazyFileRoute("/docs/$")({
  component: DocsRoute,
});

function DocsRoute() {
  return <DocsRouteView data={routeApi.useLoaderData()} />;
}
