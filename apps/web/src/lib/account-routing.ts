import type { UserRole } from "@repo/core";

export function redirectForRole(_user: { readonly role: UserRole }, redirectTo: unknown = "/app") {
  const safeRedirectTo = safeAccountRedirectPath(redirectTo);

  // Keep post-login routing centered on the account hub; admins can open /admin from there.
  if (safeRedirectTo.startsWith("/admin")) {
    return "/app";
  }

  return safeRedirectTo;
}

export function safeAccountRedirectPath(value: unknown, fallback = "/app") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
