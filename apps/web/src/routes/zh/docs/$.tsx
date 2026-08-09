import { createFileRoute } from "@tanstack/react-router";

import { docsServerLoader } from "#/lib/docs-data";

export const Route = createFileRoute("/zh/docs/$")({
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/").filter(Boolean) ?? [];
    const data = await docsServerLoader({ data: { locale: "zh", slugs } });

    return data;
  },
});
