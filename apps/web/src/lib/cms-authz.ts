import type { ApiTokenScope } from "@repo/core";

import { getAdminUserFromRequest } from "#/lib/admin-auth";
import { jsonResponse } from "#/lib/cms-api";
import { verifyD1ApiToken } from "#/lib/cms-d1";

export async function requireAdminSession(request: Request) {
  const admin = await getAdminUserFromRequest(request).catch(() => null);

  return admin ? null : jsonResponse({ error: "Admin authentication required" }, { status: 401 });
}

export async function requireCmsAccess(request: Request, scope: ApiTokenScope) {
  const admin = await getAdminUserFromRequest(request).catch(() => null);

  if (admin) {
    return null;
  }

  const token = bearerToken(request);

  if (!token) {
    return jsonResponse(
      { error: "Authentication required", requiredScope: scope },
      { status: 401 },
    );
  }

  const verified = await verifyD1ApiToken(token, scope).catch(() => null);

  if (!verified) {
    return jsonResponse(
      { error: "Insufficient API token scope", requiredScope: scope },
      { status: 403 },
    );
  }

  return null;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);

  return match?.[1]?.trim() || request.headers.get("x-api-token")?.trim() || null;
}
