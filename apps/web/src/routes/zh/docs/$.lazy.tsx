import { createLazyFileRoute, getRouteApi } from "@tanstack/react-router";

import { DocsRouteView } from "#/components/docs-route";

const routeApi = getRouteApi("/zh/docs/$");

export const Route = createLazyFileRoute("/zh/docs/$")({
  component: DocsRoute,
});

function DocsRoute() {
  return <DocsRouteView data={routeApi.useLoaderData()} />;
}
