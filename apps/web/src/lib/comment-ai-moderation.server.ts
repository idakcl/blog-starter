import "@tanstack/react-start/server-only";
import {
  applyAiCommentModerationDecision,
  type CommentAiModerationDecision,
  type CommentStatus,
} from "@repo/core";

import { createConfiguredChatCompletion, parseAiJsonObject } from "#/lib/ai-provider.server";

export async function resolveAiCommentStatus({
  baseStatus,
  body,
  requireApproval,
  rules,
}: {
  baseStatus: CommentStatus;
  body: string;
  requireApproval: boolean;
  rules: string;
}) {
  const outcome = await resolveAiCommentModerationOutcome({
    baseStatus,
    body,
    requireApproval,
    rules,
  });

  return outcome.status;
}

export async function resolveAiCommentModerationOutcome({
  baseStatus,
  body,
  requireApproval,
  rules,
}: {
  baseStatus: CommentStatus;
  body: string;
  requireApproval: boolean;
  rules: string;
}) {
  if (baseStatus === "spam" || baseStatus === "deleted") {
    return {
      status: baseStatus,
      audit: {
        status: "completed" as const,
        decision: baseStatus === "spam" ? ("spam" as const) : null,
        reason: null,
        error: null,
        reviewedAt: new Date().toISOString(),
      },
    };
  }

  const result = await createConfiguredChatCompletion({
    messages: [
      {
        role: "system",
        content:
          'You review blog comments. Return compact JSON only: {"decision":"approve|review|spam","reason":"short reason"}. Never include markdown.',
      },
      {
        role: "user",
        content: JSON.stringify({
          rules,
          comment: body,
        }),
      },
    ],
    maxTokens: 160,
    temperature: 0,
    timeoutMs: 12_000,
  }).catch(() => null);

  if (!result?.ok) {
    return {
      status: baseStatus,
      audit: {
        status: "failed" as const,
        decision: null,
        reason: null,
        error: result?.error ?? "AI moderation request failed.",
        reviewedAt: new Date().toISOString(),
      },
    };
  }

  const parsed = parseAiJsonObject(result.content);
  const decision =
    typeof parsed?.decision === "string" ? normalizeAiModerationDecision(parsed.decision) : null;

  if (!decision) {
    return {
      status: baseStatus,
      audit: {
        status: "failed" as const,
        decision: null,
        reason: normalizeAiModerationReason(parsed?.reason),
        error: "AI moderation response did not include a supported decision.",
        reviewedAt: new Date().toISOString(),
      },
    };
  }

  return {
    status: applyAiCommentModerationDecision({
      baseStatus,
      decision,
      requireApproval,
    }),
    audit: {
      status: "completed" as const,
      decision,
      reason: normalizeAiModerationReason(parsed?.reason),
      error: null,
      reviewedAt: new Date().toISOString(),
    },
  };
}

function normalizeAiModerationDecision(value: string): CommentAiModerationDecision | null {
  const normalized = value.trim().toLowerCase();

  if (["spam", "reject", "block"].includes(normalized)) {
    return "spam";
  }

  if (["review", "pending", "uncertain"].includes(normalized)) {
    return "review";
  }

  if (["approve", "allow"].includes(normalized)) {
    return "approve";
  }

  return null;
}

function normalizeAiModerationReason(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const reason = value.trim().replace(/\s+/g, " ");

  if (!reason) {
    return null;
  }

  return reason.length > 280 ? `${reason.slice(0, 277)}...` : reason;
}
