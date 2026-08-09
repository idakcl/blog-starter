import handler from "@tanstack/react-start/server-entry";

import { getSiteSettingsCacheVersion } from "#/lib/cms-d1";
import { sendDueWeeklyBlogUpdates } from "#/lib/email-notifications";
import { cookieMaxAge, cookieName, defineCustomServerStrategy } from "#/paraglide/runtime.js";
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
    // 强制 HTTPS：会话 cookie 带 Secure 标记，在 http:// 下会被浏览器丢弃，
    // 导致后台读不到登录态而反复跳回登录页。统一把 http 请求 308 跳转到 https。
    const httpsRedirect = redirectInsecureToHttps(request);

    if (httpsRedirect) {
      return httpsRedirect;
    }

    const crossOriginWrite = rejectCrossOriginWrite(request);

    if (crossOriginWrite) {
      return crossOriginWrite;
    }

    return handlePublicHtmlCache(
      request,
      () =>
        paraglideMiddleware(request, async ({ request: req, locale }) => {
          // handler.fetch 返回 Promise<Response>，必须先 await 再处理，
          // 否则拿到的 response 仍是 Promise，访问 .headers 会抛错并导致 Worker 1101。
          const response = await handler.fetch(req);
          // 服务端按策略解析出 locale 后，仅在访问者尚未显式选择语言时把它写入
          // PARAGLIDE_LOCALE cookie。客户端 preferredLanguage 策略会先读到该 cookie，
          // 从而与 SSR 使用同一语言，避免水合时因 navigator.language 与服务端不一致
          // 而反复抛出 React #418 文本不匹配。已设置过 cookie 的访问者不受影响，
          // 也不会破坏无 cookie 首次访问的边缘 HTML 缓存。
          return stampLocaleCookie(response, locale, request);
        }),
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

/**
 * 把服务端解析出的语言写入 cookie（仅当访问者尚未显式选择语言时）。
 * 这样客户端水合阶段读到的 locale 与 SSR 一致，避免 React #418 文本不匹配。
 */
function stampLocaleCookie(response: Response, locale: string, request: Request): Response {
  if (locale !== "en" && locale !== "zh") {
    return response;
  }

  // 访问者已显式选过语言（cookie 存在），或本次响应已设置，则不再覆盖。
  const requestCookies = parseCookieHeader(request.headers.get("cookie"));
  if (requestCookies[cookieName] || responseHasCookie(response, cookieName)) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.append(
    "set-cookie",
    `${cookieName}=${locale}; Path=/; Max-Age=${cookieMaxAge}; SameSite=Lax`,
  );

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function responseHasCookie(response: Response, name: string): boolean {
  return Boolean(parseCookieHeaderFromList(response.headers.getSetCookie?.() ?? []).get(name));
}

function parseCookieHeader(raw: string | null): Record<string, string> {
  const map: Record<string, string> = {};

  if (!raw) {
    return map;
  }

  for (const part of raw.split(";")) {
    const index = part.indexOf("=");

    if (index <= 0) {
      continue;
    }

    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    if (key && !map[key]) {
      map[key] = value;
    }
  }

  return map;
}

function parseCookieHeaderFromList(values: string[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const header of values) {
    const index = header.indexOf("=");

    if (index <= 0) {
      continue;
    }

    const key = header.slice(0, index).trim();
    const value = header
      .split(";")[0]
      .slice(index + 1)
      .trim();

    if (key && !map.has(key)) {
      map.set(key, value);
    }
  }

  return map;
}

function redirectInsecureToHttps(request: Request): Response | null {
  // Cloudflare 在请求头里带上真实协议；本地开发（无该头）不跳转。
  const header =
    request.headers.get("x-forwarded-proto") ?? request.headers.get("cf-visitor") ?? "";

  let scheme = header;

  if (header.startsWith("{")) {
    try {
      scheme = JSON.parse(header).scheme ?? "";
    } catch {
      scheme = "";
    }
  }

  if (scheme.toLowerCase() === "https") {
    return null;
  }

  const url = new URL(request.url);
  url.protocol = "https:";

  return Response.redirect(url.toString(), 308);
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
