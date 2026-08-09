import { resolveLocale, siteSettings, type SupportedLocale } from "@repo/core";

import { getSetCookieValues } from "#/lib/auth-helpers";

export const apiTokenScopes = [
  "posts:read",
  "posts:write",
  "posts:publish",
  "assets:write",
  "comments:moderate",
  "site:read",
  "site:write",
  "export:read",
] as const;

export function jsonResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers({ "cache-control": "no-store" });

  if (init?.headers) {
    const inputHeaders = new Headers(init.headers);

    inputHeaders.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        return;
      }

      headers.set(key, value);
    });

    for (const cookie of getSetCookieValues(inputHeaders)) {
      headers.append("set-cookie", cookie);
    }
  }

  return Response.json(body, {
    ...init,
    headers,
  });
}

export function getApiLocale(request: Request): SupportedLocale {
  const url = new URL(request.url);
  const queryLocale = url.searchParams.get("lang");

  if (queryLocale) {
    return resolveLocale(queryLocale);
  }

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  return resolveAcceptLanguageLocale(acceptLanguage) ?? siteSettings.primaryLanguage;
}

export async function readJsonBody<TBody extends object>(
  request: Request,
): Promise<Partial<TBody>> {
  const text = await request.text();

  if (!text.trim()) {
    return {} as Partial<TBody>;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw jsonResponse({ error: "Malformed JSON body" }, { status: 400 });
  }

  return isPlainJsonObject(parsed) ? (parsed as Partial<TBody>) : ({} as Partial<TBody>);
}

export function importPreview(kind: "markdown" | "html" | "zip", filename: string | undefined) {
  const now = new Date().toISOString();
  return {
    id: `import_${crypto.randomUUID()}`,
    kind,
    filename: filename ?? null,
    status: "accepted",
    createdAt: now,
    createdPostStatus: "draft",
  };
}

function resolveAcceptLanguageLocale(header: string): SupportedLocale | null {
  const preferred = header
    .split(",")
    .map((part, index) => {
      const [rawLanguage = "", ...rawParams] = part.trim().split(";");
      const qValue = rawParams
        .map((param) => param.trim())
        .find((param) => param.toLowerCase().startsWith("q="))
        ?.slice(2);
      const quality = qValue === undefined ? 1 : Number(qValue);

      return {
        index,
        language: rawLanguage.toLowerCase(),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((item) => item.language && item.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const item of preferred) {
    if (item.language === "zh" || item.language.startsWith("zh-")) {
      return "zh";
    }

    if (item.language === "en" || item.language.startsWith("en-")) {
      return "en";
    }
  }

  return null;
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
