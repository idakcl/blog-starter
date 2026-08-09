import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { authQueryOptions } from "./queries";

// These hooks can be used in route components or any components.
// They share the same deduped query as beforeLoad/loaders in __root and the _auth layout,
// so these will not result in unnecessary duplicate calls.

export function useAuthSuspense() {
  const { data: user } = useSuspenseQuery(authQueryOptions());
  return { user };
}

export function useAuth() {
  const { data: user, isFetching, isPending } = useQuery(authQueryOptions());
  return { user: user ?? null, isFetching, isPending };
}
