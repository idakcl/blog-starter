import { createServerFn } from "@tanstack/react-start";

export const $getUser = createServerFn({ method: "GET" }).handler(async () => {
  const [{ setResponseHeader }, { getUserResponse }] = await Promise.all([
    import("@tanstack/react-start/server"),
    import("./user.server"),
  ]);

  setResponseHeader("cache-control", "no-store, max-age=0");
  setResponseHeader("pragma", "no-cache");

  const { headers, user } = await getUserResponse();
  const cookies = getSetCookieValues(headers);

  if (cookies.length) {
    setResponseHeader("Set-Cookie", cookies);
  }

  return user;
});

function getSetCookieValues(headers: Headers) {
  const getSetCookie = (
    headers as Headers & {
      getSetCookie?: () => string[];
    }
  ).getSetCookie;
  const cookies = getSetCookie ? getSetCookie.call(headers) : [];
  const fallback = headers.get("set-cookie");

  return cookies.length ? cookies : fallback ? splitSetCookieHeader(fallback) : [];
}

function splitSetCookieHeader(value: string) {
  const cookies: string[] = [];
  let start = 0;
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char !== "," || quoted) {
      continue;
    }

    if (!/^\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=/.test(value.slice(index + 1))) {
      continue;
    }

    cookies.push(value.slice(start, index).trim());
    start = index + 1;
  }

  cookies.push(value.slice(start).trim());

  return cookies.filter(Boolean);
}
