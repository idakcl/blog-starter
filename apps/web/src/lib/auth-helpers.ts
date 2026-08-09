import { splitSetCookieHeader } from "@repo/core";

/**
 * Extract individual `Set-Cookie` values from a `Headers` object.
 * Uses the non-standard `getSetCookie()` method when available (Node / Workers),
 * falling back to splitting `get("set-cookie")` when a runtime collapses values.
 *
 * Note: `extractSetCookieHeaders` from `@repo/core` accepts a `Response` and
 * returns a `Headers` object. This helper accepts raw `Headers` and returns
 * a `string[]`, which is more convenient for callers that need to iterate
 * or append cookies individually.
 */
export function getSetCookieValues(headers: Headers) {
  const getSetCookie = (
    headers as Headers & {
      getSetCookie?: () => string[];
    }
  ).getSetCookie;
  const cookies = getSetCookie ? getSetCookie.call(headers) : [];
  const fallback = headers.get("set-cookie");

  return cookies.length ? cookies : fallback ? splitSetCookieHeader(fallback) : [];
}
