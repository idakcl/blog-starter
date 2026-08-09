import { queryOptions } from "@tanstack/react-query";

import { $getUser } from "./functions";

/**
 * This query is mainly used in _auth/route.tsx, which is the _auth layout
 * that protects all child routes under it (e.g. _auth/app/*)
 */
export const authQueryOptions = () =>
  queryOptions({
    queryKey: ["auth"],
    queryFn: ({ signal }) => getAuthUser(signal),
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

export type AuthQueryResult = Awaited<ReturnType<typeof $getUser>>;

async function getAuthUser(signal?: AbortSignal): Promise<AuthQueryResult> {
  if (typeof window === "undefined") {
    return $getUser({ signal });
  }

  const response = await fetch("/api/account/me", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as {
    data?: AuthQueryResult | null;
  } | null;

  return payload?.data ?? null;
}
