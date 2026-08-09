import { createFileRoute, redirect } from "@tanstack/react-router";

import { docsServerLoader } from "#/lib/docs-data";
import { getCurrentLocale } from "#/lib/i18n";

export const Route = createFileRoute("/docs/$")({
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/").filter(Boolean) ?? [];

    if (getCurrentLocale() === "zh") {
      throw redirect({
        to: "/zh/docs/$",
        params: { _splat: slugs.join("/") },
        replace: true,
      });
    }

    const data = await docsServerLoader({ data: { locale: "en", slugs } });

    return data;
  },
});
