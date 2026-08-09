import handler from "@tanstack/react-start/server-entry";

import { getSiteSettingsCacheVersion } from "#/lib/cms-d1";
import { sendDueWeeklyBlogUpdates } from "#/lib/email-notifications";
import { defineCustomServerStrategy } from "#/paraglide/runtime.js";
import { paraglideMiddleware } from "#/paraglide/server.js";

// Register a custom strategy that returns zh as the default locale
// when no cookie or other locale indicator is present
defineCustomServerStrategy("custom-primary-zh", {
  getLocale: () => "zh",
});

type WorkerExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

type ScheduledEvent = {
  cron: string;
  scheduledTime: number;
};

type CloudflareCacheStorage = CacheStorage & {
  default: Cache;
};

declare const __PUBLIC_HTML_CACHE_VERSION__: string;

const PUBLIC_HTML_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=1800";

const PUBLIC_HTML_CACHE_EXCLUDED_PREFIXES = [
  "/admin",
  "/api",
  "/app",
  "/blog",
  "/login",
  "/reset-password",
  "/signup",
  "/uploads",
] as const;

export default {
  fetch(request: Request, _env: CloudflareBindings, ctx: WorkerExecutionContext) {
    const crossOriginWrite = rejectCrossOriginWrite(request);

    if (crossOriginWrite) {
      return crossOriginWrite;
    }

    return handlePublicHtmlCache(
      request,
      () => paraglideMiddleware(request, ({ request: req }) => handler.fetch(req)),
      ctx,
    );
  },
  scheduled(_event: ScheduledEvent, _env: CloudflareBindings, ctx: WorkerExecutionContext) {
    ctx.waitUntil(sendDueWeeklyBlogUpdates().then(() => undefined));
  },
};

async function handlePublicHtmlCache(
  request: Request,
  render: () => Promise<Response>,
  ctx: WorkerExecutionContext,
) {
  if (!isPublicHtmlCacheCandidate(request)) {
    return render();
  }

  const cacheKey = await createPublicHtmlCacheKey(request);
  const defaultCache = getDefaultCache();
  const cached = await defaultCache.match(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await render();

  if (!isCacheablePublicHtmlResponse(response)) {
    return response;
  }

  const cacheableResponse = withPublicHtmlCacheHeaders(response);

  ctx.waitUntil(defaultCache.put(cacheKey, cacheableResponse.clone()).catch(() => undefined));

  return cacheableResponse;
}

async function createPublicHtmlCacheKey(request: Request) {
  const url = new URL(request.url);
  url.searchParams.set("__html_cache_v", __PUBLIC_HTML_CACHE_VERSION__);

  // 把站点设置的版本戳（updatedAt）并入缓存键：保存设置后立即让旧 HTML 缓存失效，
  // 否则站点名称等改动要等边缘缓存（s-maxage=300）过期才生效。
  try {
    const settingsVersion = await getSiteSettingsCacheVersion();
    if (settingsVersion) {
      url.searchParams.set("__settings_v", settingsVersion);
    }
  } catch {
    // 读取失败时不影响缓存，仅退化为按构建版本缓存
  }

  return new Request(url, { method: "GET" });
}

function getDefaultCache() {
  return (caches as CloudflareCacheStorage).default;
}

function isPublicHtmlCacheCandidate(request: Request) {
  if (request.method !== "GET") {
    return false;
  }

  if (request.headers.has("cookie") || request.headers.has("origin")) {
    return false;
  }

  const accept = request.headers.get("accept") ?? "";

  if (!accept.includes("text/html")) {
    return false;
  }

  const pathname = new URL(request.url).pathname;

  return !PUBLIC_HTML_CACHE_EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isCacheablePublicHtmlResponse(response: Response) {
  if (response.status !== 200 || response.headers.has("set-cookie")) {
    return false;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("text/html")) {
    return false;
  }

  const cacheControl = response.headers.get("cache-control") ?? "";

  return !/(?:^|,\s*)(no-store|private)(?:\s|,|$)/i.test(cacheControl);
}

function withPublicHtmlCacheHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", PUBLIC_HTML_CACHE_CONTROL);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function rejectCrossOriginWrite(request: Request) {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return null;
  }

  if (hasApiTokenAuth(request)) {
    return null;
  }

  const origin = request.headers.get("origin");

  try {
    if (origin && new URL(origin).origin === new URL(request.url).origin) {
      return null;
    }
  } catch {
    // Invalid Origin headers are rejected below.
  }

  if (!origin && isTrustedFetchSite(request.headers.get("sec-fetch-site"))) {
    return null;
  }

  return Response.json({ error: "Cross-origin write requests are not allowed" }, { status: 403 });
}

function hasApiTokenAuth(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  return /^Bearer\s+.+/i.test(authorization) || Boolean(request.headers.get("x-api-token")?.trim());
}

function isTrustedFetchSite(value: string | null) {
  return value === "same-origin" || value === "same-site" || value === "none";
}
