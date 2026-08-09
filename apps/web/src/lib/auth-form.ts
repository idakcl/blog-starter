import { getSetCookieValues } from "#/lib/auth-helpers";
import { readJsonBody } from "#/lib/cms-api";

export async function readJsonOrFormBody<TBody extends object>(
  request: Request,
): Promise<Partial<TBody>> {
  if (!isFormPost(request)) {
    return readJsonBody<TBody>(request);
  }

  const formData = await request.formData();
  const body: Record<string, string> = {};

  for (const [key, value] of formData) {
    body[key] = typeof value === "string" ? value : value.name;
  }

  return body as Partial<TBody>;
}

export function isFormPost(request: Request) {
  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();

  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
}

export function formRedirect(location: string, init?: ResponseInit) {
  const headers = new Headers({
    "cache-control": "no-store",
    location: sanitizeRedirect(location),
  });

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

  return new Response(null, {
    ...init,
    status: init?.status ?? 303,
    headers,
  });
}

function sanitizeRedirect(location: string) {
  return location.replace(/[\r\n]/g, "");
}
