import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";

import { auth } from "#/lib/auth";
import { getSetCookieValues } from "#/lib/auth-helpers";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return normalizeAuthResponse(await auth.handler(request));
      },
      POST: async ({ request }) => {
        return normalizeAuthResponse(await auth.handler(request));
      },
    },
  },
});

function normalizeAuthResponse(response: Response) {
  const headers = new Headers();

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") {
      headers.append(key, value);
    }
  });

  const cookies = getSetCookieValues(response.headers);

  for (const cookie of cookies) {
    headers.append("set-cookie", cookie);
    applyResponseCookie(cookie);
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function applyResponseCookie(cookie: string) {
  const [nameValue, ...attributes] = cookie.split(";").map((part) => part.trim());
  const separator = nameValue?.indexOf("=") ?? -1;

  if (!nameValue || separator <= 0) {
    return;
  }

  const name = nameValue.slice(0, separator);
  const value = decodeCookieValue(nameValue.slice(separator + 1));
  const options: Record<string, unknown> = {};

  for (const attribute of attributes) {
    const [rawName, ...rawValueParts] = attribute.split("=");
    const attributeName = rawName?.trim().toLowerCase();
    const attributeValue = rawValueParts.join("=").trim();

    if (!attributeName) {
      continue;
    }

    if (attributeName === "max-age") {
      const maxAge = Number.parseInt(attributeValue, 10);

      if (Number.isFinite(maxAge)) {
        options.maxAge = maxAge;
      }
    } else if (attributeName === "expires") {
      const expires = new Date(attributeValue);

      if (!Number.isNaN(expires.getTime())) {
        options.expires = expires;
      }
    } else if (attributeName === "domain" && attributeValue) {
      options.domain = attributeValue;
    } else if (attributeName === "path" && attributeValue) {
      options.path = attributeValue;
    } else if (attributeName === "secure") {
      options.secure = true;
    } else if (attributeName === "httponly") {
      options.httpOnly = true;
    } else if (attributeName === "samesite" && attributeValue) {
      options.sameSite = attributeValue.toLowerCase();
    } else if (attributeName === "partitioned") {
      options.partitioned = true;
    }
  }

  setCookie(name, value, options as Parameters<typeof setCookie>[2]);
}

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
