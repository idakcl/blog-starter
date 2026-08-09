import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "reader";
  createdAt: string;
  lastLoginAt: string | null;
};

export async function _getUser(_query?: {
  disableCookieCache?: boolean;
  disableRefresh?: boolean;
}) {
  const { user } = await getUserResponse(_query);
  return user;
}

export async function getUserResponse(_query?: {
  disableCookieCache?: boolean;
  disableRefresh?: boolean;
}) {
  const request = getRequest();
  const url = new URL("/api/account/me", request.url);
  const headers = new Headers();
  const cookie = request.headers.get("cookie");

  if (cookie) {
    headers.set("cookie", cookie);
  }

  if (_query?.disableCookieCache) {
    url.searchParams.set("disableCookieCache", "true");
  }

  if (_query?.disableRefresh) {
    url.searchParams.set("disableRefresh", "true");
  }

  const response = await fetch(url, {
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    return { headers: response.headers, user: null };
  }

  const payload = (await response.json()) as { data?: AdminUser | null };
  return { headers: response.headers, user: payload.data ?? null };
}
