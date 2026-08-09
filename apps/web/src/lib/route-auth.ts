import type { AuthQueryResult } from "@repo/auth/tanstack/queries";
import { createIsomorphicFn } from "@tanstack/react-start";

export const getServerAuthUser = createIsomorphicFn()
  .client(async (): Promise<AuthQueryResult | undefined> => undefined)
  .server(async (): Promise<AuthQueryResult | null> => {
    const [
      { getRequest, setResponseHeader },
      { getSetCookieValues },
      { getAccountSessionFromRequest },
    ] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("#/lib/auth-helpers"),
      import("#/lib/account-auth"),
    ]);
    const session = await getAccountSessionFromRequest(getRequest()).catch(() => null);

    if (!session) {
      return null;
    }

    const cookies = getSetCookieValues(session.headers);

    if (cookies.length) {
      setResponseHeader("Set-Cookie", cookies);
    }

    return session.user;
  });
