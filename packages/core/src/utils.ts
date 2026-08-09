export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9一-龥]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export async function digestText(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function countLinks(value: string) {
  return (value.match(/https?:\/\//g) ?? []).length;
}

export function normalizeDateInput(value: string | undefined | null): string {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function cleanStringList(input: string[] | undefined) {
  return Array.from(new Set((input ?? []).map((value) => value.trim()).filter(Boolean)));
}

export function parseJson<TValue>(value: string | null): TValue | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as TValue;
  } catch {
    return undefined;
  }
}

export function normalizeEmail(value: string | undefined) {
  const email = value?.trim().toLowerCase() ?? "";

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("A valid email is required");
  }

  return email;
}

export function assertPassword(password: string) {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
}

export function toIsoString(value: Date | string | number | undefined) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

export function extractSetCookieHeaders(response: Response) {
  const headers = new Headers();
  const getSetCookie = (
    response.headers as Headers & {
      getSetCookie?: () => string[];
    }
  ).getSetCookie;
  const cookies = getSetCookie ? getSetCookie.call(response.headers) : [];
  const fallback = response.headers.get("set-cookie");

  for (const cookie of cookies.length ? cookies : fallback ? splitSetCookieHeader(fallback) : []) {
    headers.append("set-cookie", cookie);
  }

  return headers;
}

export function splitSetCookieHeader(value: string) {
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

export function authErrorMessage(
  payload: { code?: string; error?: string; message?: string } | null,
  fallback: string,
) {
  return payload?.message || payload?.error || payload?.code || fallback;
}
