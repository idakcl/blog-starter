import type { EmailPreference } from "@repo/core";

export const weeklyBlogUpdatesEmailPreference = "weekly_blog_updates" satisfies EmailPreference;

export function isEmailPreference(value: unknown): value is EmailPreference {
  return value === "none" || value === weeklyBlogUpdatesEmailPreference;
}
