import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: () => redirect({ href: "/rss.xml", statusCode: 301 }),
    },
  },
});
