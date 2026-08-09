import { describe, it, expect } from "vitest";

import { getSetCookieValues } from "../auth-helpers";

/**
 * Helper to build a Headers object with `getSetCookie()` support,
 * simulating Node / Cloudflare Workers behaviour.
 */
function makeHeaders(
  cookieEntries: string[],
  opts: { includeGetSetCookie?: boolean } = {},
): Headers {
  const headers = new Headers();
  for (const c of cookieEntries) {
    headers.append("set-cookie", c);
  }

  if (opts.includeGetSetCookie !== false) {
    (headers as any).getSetCookie = () => cookieEntries;
  }

  return headers;
}

describe("getSetCookieValues", () => {
  it("returns multiple cookies from getSetCookie() when available", () => {
    const cookies = ["session=abc; Path=/", "csrf=xyz; Path=/; HttpOnly"];
    const headers = makeHeaders(cookies);
    const result = getSetCookieValues(headers);
    expect(result).toEqual(cookies);
  });

  it("returns single cookie from getSetCookie()", () => {
    const cookies = ["session=abc; Path=/; Secure"];
    const headers = makeHeaders(cookies);
    const result = getSetCookieValues(headers);
    expect(result).toEqual(cookies);
  });

  it("falls back to get('set-cookie') when getSetCookie() returns empty", () => {
    const headers = new Headers();
    headers.append("set-cookie", "fallback=value; Path=/");
    // Override getSetCookie to return empty
    (headers as any).getSetCookie = () => [];
    const result = getSetCookieValues(headers);
    expect(result).toEqual(["fallback=value; Path=/"]);
  });

  it("falls back to get('set-cookie') when getSetCookie is not present", () => {
    const headers = new Headers();
    headers.append("set-cookie", "token=abc123; Path=/");
    // No getSetCookie method
    const result = getSetCookieValues(headers);
    expect(result).toEqual(["token=abc123; Path=/"]);
  });

  it("returns empty array when no set-cookie headers exist", () => {
    const headers = new Headers();
    const result = getSetCookieValues(headers);
    expect(result).toEqual([]);
  });

  it("returns empty array when getSetCookie() is absent and get('set-cookie') is null", () => {
    const headers = new Headers({ "content-type": "text/html" });
    const result = getSetCookieValues(headers);
    expect(result).toEqual([]);
  });
});
