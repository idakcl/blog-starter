import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";

import { source } from "#/lib/source";

const searchServer = createFromSource(source, {
  localeMap: {
    en: "english",
    zh: {},
  },
});

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => searchServer.GET(request),
    },
  },
});
