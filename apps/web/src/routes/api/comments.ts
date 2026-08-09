import { localizeComment, resolveLocale, type Comment } from "@repo/core";
import { createFileRoute } from "@tanstack/react-router";
import { waitUntil } from "cloudflare:workers";

import { CreateCommentSchema, validateBody } from "#/lib/api-validation";
import { getApiLocale, jsonResponse, readJsonBody } from "#/lib/cms-api";
import { requireCmsAccess } from "#/lib/cms-authz";
import { createD1Comment, listD1Comments, resolveD1CommentAiModeration } from "#/lib/cms-d1";
import { notifyCommentCreated } from "#/lib/cms-email";
import { getCommentUserFromRequest } from "#/lib/comment-auth";
import { checkCommentRateLimit, getClientIp, verifyTurnstile } from "#/lib/comment-guard";
import { notifyCommentReplyCreated } from "#/lib/comment-reply-notifications";

export const Route = createFileRoute("/api/comments")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const accessError = await requireCmsAccess(request, "comments:moderate");

        if (accessError) {
          return accessError;
        }

        const locale = getApiLocale(request);
        const persistedComments = await listD1Comments();

        return jsonResponse({
          data: persistedComments.map((comment) => localizeComment(comment, locale)),
          locale,
          requiredScope: "comments:moderate",
        });
      },
      POST: async ({ request }: { request: Request }) => {
        const raw = await readJsonBody(request);
        const [body, validationError] = validateBody(CreateCommentSchema, raw);

        if (validationError) {
          return validationError;
        }

        if (body.honeypot) {
          return jsonResponse({ error: "Comment rejected" }, { status: 400 });
        }

        const user = await getCommentUserFromRequest(request);

        if (user?.commentStatus === "muted") {
          return jsonResponse(
            { error: "Commenting is disabled for this account" },
            { status: 403 },
          );
        }

        // Guest comments: require guestName when not logged in
        if (!user && !(body as Record<string, unknown>).guestName) {
          return jsonResponse(
            { error: "A display name is required to comment as a guest" },
            { status: 400 },
          );
        }

        const turnstile = await verifyTurnstile({
          token: body.turnstileToken,
          request,
        });

        if (!turnstile.ok) {
          return jsonResponse({ error: turnstile.error }, { status: 400 });
        }

        const rateLimit = await checkCommentRateLimit({
          ip: getClientIp(request),
          postSlug: body.postSlug,
        });

        if (!rateLimit.ok) {
          return jsonResponse({ error: rateLimit.error }, { status: 429 });
        }

        const guestName = !user
          ? String((body as Record<string, unknown>).guestName || "Anonymous")
          : undefined;
        const commentInput = {
          postSlug: body.postSlug,
          authorUserId: user?.id ?? null,
          authorName: user ? user.name : guestName!,
          authorEmail: user ? user.email : `guest-${Date.now()}@anonymous.local`,
          body: body.body,
          parentId: body.parentId || null,
          locale: resolveLocale(new URL(request.url).searchParams.get("lang") ?? undefined),
        };
        const persistedResult = await createD1Comment(commentInput);

        if ("error" in persistedResult) {
          return jsonResponse({ error: persistedResult.error }, { status: 400 });
        }

        const { aiModeration, comment, postTitle } = persistedResult.data;
        const finalComment = aiModeration
          ? await resolveD1CommentAiModeration({
              comment,
              moderation: aiModeration,
            })
          : comment;

        queueCommentCreatedEffects({
          comment: finalComment,
          postTitle,
          siteUrl: new URL(request.url).origin,
        });

        return jsonResponse(
          {
            data: finalComment,
          },
          { status: 201 },
        );
      },
    },
  },
});

function queueCommentCreatedEffects(input: {
  comment: Comment;
  postTitle: string;
  siteUrl: string;
}) {
  waitUntil(
    (async () => {
      if (input.comment.status === "spam") {
        return;
      }

      await notifyCommentCreated({
        comment: input.comment,
        postTitle: input.postTitle,
        siteUrl: input.siteUrl,
      });

      if (input.comment.status === "approved") {
        await notifyCommentReplyCreated(input.comment);
      }
    })().catch((error: unknown) => {
      console.error("Comment post-create effects failed", error);
    }),
  );
}
