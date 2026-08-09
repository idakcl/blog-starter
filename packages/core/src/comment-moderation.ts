import type { CommentStatus, SiteSettings } from "./types";

export const defaultCommentBlockedKeywords = [
  "博彩",
  "赌博",
  "色情",
  "诈骗",
  "代开",
  "发票",
  "辱骂",
  "暴力",
  "casino",
  "porn",
  "scam",
  "invoice",
];

export const defaultAiCommentModerationRules =
  "判断这条博客评论是否适合公开展示。拦截广告、诈骗、钓鱼、辱骂、仇恨、色情、暴力威胁、隐私泄露、无意义灌水和明显 SEO 外链。普通反对意见、批评、提问、纠错、补充信息应该允许。";

type ModerationSettings = Pick<
  SiteSettings,
  "commentAutoBlockEnabled" | "commentBlockedKeywords" | "commentsRequireApproval"
>;

export function normalizeCommentBlockedKeywords(value: unknown) {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,，]/)
      : [];

  return [...new Set(items.map((item) => String(item).trim()).filter(Boolean))];
}

export function getCommentInitialStatus({
  body,
  settings,
}: {
  body: string;
  settings: ModerationSettings;
}): CommentStatus {
  if (
    settings.commentAutoBlockEnabled &&
    findBlockedCommentKeyword(body, settings.commentBlockedKeywords)
  ) {
    return "spam";
  }

  return settings.commentsRequireApproval ? "pending" : "approved";
}

export function findBlockedCommentKeyword(body: string, keywords: string[]) {
  const normalizedBody = body.toLowerCase();

  return normalizeCommentBlockedKeywords(keywords).find((keyword) =>
    normalizedBody.includes(keyword.toLowerCase()),
  );
}

export function applyAiCommentModerationDecision({
  baseStatus,
  decision,
  requireApproval,
}: {
  baseStatus: CommentStatus;
  decision: string | undefined;
  requireApproval: boolean;
}): CommentStatus {
  if (baseStatus === "spam" || baseStatus === "deleted") {
    return baseStatus;
  }

  const normalized = decision?.trim().toLowerCase();

  if (!normalized) {
    return baseStatus;
  }

  if (["spam", "reject", "block"].includes(normalized)) {
    return "spam";
  }

  if (["review", "pending", "uncertain"].includes(normalized)) {
    return "pending";
  }

  if (["approve", "allow"].includes(normalized)) {
    return requireApproval ? "pending" : "approved";
  }

  return baseStatus;
}
