import "@tanstack/react-start/server-only";
import { escapeHtml } from "@repo/core";
import type { Comment, Post } from "@repo/core";
import { env } from "cloudflare:workers";

type EmailMessageBuilder = {
  to: string | string[];
  from: string | { email: string; name: string };
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | { email: string; name: string };
};

type SendEmailBinding = {
  send(message: EmailMessageBuilder): Promise<{ messageId: string }>;
};

type EmailProvider = "cloudflare" | "resend";

export type EmailDeliveryStatus = {
  configured: boolean;
  provider: EmailProvider | null;
  missing: string[];
};

type EmailResult =
  | { sent: true; messageId: string }
  | { sent: false; reason: "disabled" | "not_configured" | "failed"; error?: string };

type EmailContext = {
  subject: string;
  text: string;
  html?: string;
  to?: string;
};

type EmailBindings = CloudflareBindings & {
  CMS_EMAIL?: SendEmailBinding;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  EMAIL_FROM?: string;
};

export function getEmailDeliveryStatus(): EmailDeliveryStatus {
  const bindings = env as unknown as EmailBindings;
  const cloudflare = getCloudflareEmailConfig(bindings);
  const resend = getResendEmailConfig(bindings);

  if (cloudflare.configured) {
    return { configured: true, provider: "cloudflare", missing: [] };
  }

  if (resend.configured) {
    return { configured: true, provider: "resend", missing: [] };
  }

  return {
    configured: false,
    provider: null,
    missing: [...cloudflare.missing, ...resend.missing],
  };
}

export async function sendCmsEmail(input: EmailContext): Promise<EmailResult> {
  const bindings = env as unknown as EmailBindings;
  const to = input.to?.trim() || bindings.CMS_EMAIL_TO?.trim();

  if (!to) {
    return { sent: false, reason: "not_configured" };
  }

  const cloudflare = getCloudflareEmailConfig(bindings);

  if (cloudflare.configured && bindings.CMS_EMAIL) {
    return sendCloudflareEmail({
      binding: bindings.CMS_EMAIL,
      from: cloudflare.from,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to,
    });
  }

  const resend = getResendEmailConfig(bindings);

  if (resend.configured) {
    return sendResendEmail({
      apiKey: resend.apiKey,
      from: resend.from,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to,
    });
  }

  if (bindings.CMS_EMAIL_SENDING_ENABLED !== "true" && !bindings.RESEND_API_KEY?.trim()) {
    return { sent: false, reason: "disabled" };
  }

  return { sent: false, reason: "not_configured" };
}

async function sendCloudflareEmail(input: {
  binding: SendEmailBinding;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<EmailResult> {
  try {
    const result = await input.binding.send({
      to: input.to,
      from: input.from,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return { sent: true, messageId: result.messageId };
  } catch (error) {
    return {
      sent: false,
      reason: "failed",
      error: error instanceof Error ? error.message : "Email send failed",
    };
  }
}

async function sendResendEmail(input: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<EmailResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string };

    if (!response.ok || !payload.id) {
      return {
        sent: false,
        reason: "failed",
        error: payload.message || `Resend returned ${response.status}`,
      };
    }

    return { sent: true, messageId: payload.id };
  } catch (error) {
    return {
      sent: false,
      reason: "failed",
      error: error instanceof Error ? error.message : "Email send failed",
    };
  }
}

function getCloudflareEmailConfig(bindings: EmailBindings) {
  const missing: string[] = [];
  const from = bindings.CMS_EMAIL_FROM?.trim();

  if (bindings.CMS_EMAIL_SENDING_ENABLED !== "true") {
    missing.push("CMS_EMAIL_SENDING_ENABLED");
  }

  if (!bindings.CMS_EMAIL) {
    missing.push("CMS_EMAIL");
  }

  if (!from) {
    missing.push("CMS_EMAIL_FROM");
  }

  return {
    configured: missing.length === 0,
    from: from ?? "",
    missing,
  };
}

function getResendEmailConfig(bindings: EmailBindings) {
  const missing: string[] = [];
  const apiKey = bindings.RESEND_API_KEY?.trim();
  const from =
    bindings.RESEND_FROM_EMAIL?.trim() ||
    bindings.CMS_EMAIL_FROM?.trim() ||
    bindings.EMAIL_FROM?.trim();

  if (!apiKey) {
    missing.push("RESEND_API_KEY");
  }

  if (!from) {
    missing.push("RESEND_FROM_EMAIL");
  }

  return {
    apiKey: apiKey ?? "",
    configured: missing.length === 0,
    from: from ?? "",
    missing,
  };
}

export async function notifyCommentCreated(input: {
  comment: Comment;
  postTitle: string;
  siteUrl: string;
}) {
  const moderationUrl = `${input.siteUrl.replace(/\/$/, "")}/admin/comments`;
  const commentPreview = previewCommentText(input.comment.body);
  const statusLabel = commentNotificationStatus(input.comment.status);

  return sendCmsEmail({
    subject: `New comment: ${commentPreview}`,
    text: [
      "New comment",
      "",
      "Comment:",
      input.comment.body,
      "",
      `Author: ${input.comment.authorName}`,
      `Status: ${statusLabel}`,
      `Post: ${input.postTitle}`,
      `Manage comments: ${moderationUrl}`,
    ].join("\n"),
    html: [
      `<p><strong>New comment</strong></p>`,
      `<p><strong>Comment:</strong></p>`,
      `<blockquote style="margin:0;padding:12px 16px;border-left:3px solid #d4d4d4;background:#f8f8f8;">${escapeHtml(input.comment.body)}</blockquote>`,
      `<p><strong>Author:</strong> ${escapeHtml(input.comment.authorName)}</p>`,
      `<p><strong>Status:</strong> ${escapeHtml(statusLabel)}</p>`,
      `<p><strong>Post:</strong> ${escapeHtml(input.postTitle)}</p>`,
      `<p><a href="${escapeHtml(moderationUrl)}">Manage comments</a></p>`,
    ].join(""),
  });
}

function previewCommentText(body: string) {
  const normalized = body.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Empty comment";
  }

  if (normalized.length <= 96) {
    return normalized;
  }

  return `${normalized.slice(0, 93).trimEnd()}...`;
}

function commentNotificationStatus(status: Comment["status"]) {
  if (status === "approved") {
    return "Published";
  }

  if (status === "pending") {
    return "Pending";
  }

  if (status === "spam") {
    return "Spam";
  }

  return "Deleted";
}

export async function notifyImportCompleted(input: {
  kind: "markdown" | "html" | "zip";
  post: Post;
  siteUrl: string;
}) {
  const postUrl = `${input.siteUrl.replace(/\/$/, "")}/blog/${input.post.slug}`;

  return sendCmsEmail({
    subject: `Import completed: ${input.post.title}`,
    text: [
      `Import type: ${input.kind}`,
      `Post: ${input.post.title}`,
      `Status: ${input.post.status}`,
      `URL: ${postUrl}`,
    ].join("\n"),
    html: [
      `<p><strong>Import type:</strong> ${escapeHtml(input.kind)}</p>`,
      `<p><strong>Post:</strong> ${escapeHtml(input.post.title)}</p>`,
      `<p><strong>Status:</strong> ${escapeHtml(input.post.status)}</p>`,
      `<p><a href="${escapeHtml(postUrl)}">Open post</a></p>`,
    ].join(""),
  });
}

export async function notifyExportCompleted(input: {
  format: "json" | "zip";
  backupKey: string | null;
  siteUrl: string;
}) {
  return sendCmsEmail({
    subject: `Export completed: ${input.format.toUpperCase()}`,
    text: [
      `Format: ${input.format}`,
      `Backup key: ${input.backupKey ?? "not stored"}`,
      `Site: ${input.siteUrl}`,
    ].join("\n"),
    html: [
      `<p><strong>Format:</strong> ${escapeHtml(input.format)}</p>`,
      `<p><strong>Backup key:</strong> ${escapeHtml(input.backupKey ?? "not stored")}</p>`,
      `<p>${escapeHtml(input.siteUrl)}</p>`,
    ].join(""),
  });
}

export async function notifyBackupCompleted(input: {
  backupKey: string;
  sizeBytes: number;
  trigger: "manual";
  prunedCount: number;
}) {
  return sendCmsEmail({
    subject: `Backup completed: ${input.trigger}`,
    text: [
      `Backup key: ${input.backupKey}`,
      `Size: ${input.sizeBytes} bytes`,
      `Trigger: ${input.trigger}`,
      `Pruned objects: ${input.prunedCount}`,
    ].join("\n"),
    html: [
      `<p><strong>Backup key:</strong> ${escapeHtml(input.backupKey)}</p>`,
      `<p><strong>Size:</strong> ${input.sizeBytes} bytes</p>`,
      `<p><strong>Trigger:</strong> ${escapeHtml(input.trigger)}</p>`,
      `<p><strong>Pruned objects:</strong> ${input.prunedCount}</p>`,
    ].join(""),
  });
}

export async function sendPasswordResetEmail(input: {
  email: string;
  siteName?: string;
  token: string;
  siteUrl: string;
  ttlMinutes: number;
}) {
  const resetUrl = `${input.siteUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(
    input.token,
  )}`;

  return sendCmsEmail({
    to: input.email,
    subject: `Reset your ${input.siteName ?? "01mvp-blog-starter"} password`,
    text: [
      `Open this link to reset your password: ${resetUrl}`,
      `This link expires in ${input.ttlMinutes} minutes.`,
    ].join("\n"),
    html: [
      `<p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p>`,
      `<p>This link expires in ${input.ttlMinutes} minutes.</p>`,
    ].join(""),
  });
}

export async function sendEmailVerificationEmail(input: {
  email: string;
  name: string;
  siteName: string;
  verifyUrl: string;
  ttlMinutes: number;
}) {
  return sendCmsEmail({
    to: input.email,
    subject: `Verify your email for ${input.siteName}`,
    text: [
      `Hi ${input.name},`,
      `Open this link to verify your email address: ${input.verifyUrl}`,
      `This link expires in ${input.ttlMinutes} minutes.`,
    ].join("\n"),
    html: [
      `<p>Hi ${escapeHtml(input.name)},</p>`,
      `<p><a href="${escapeHtml(input.verifyUrl)}">Verify your email address</a></p>`,
      `<p>This link expires in ${input.ttlMinutes} minutes.</p>`,
    ].join(""),
  });
}
