import "@tanstack/react-start/server-only";
import { env } from "cloudflare:workers";

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_PER_IP = 200;
const RATE_LIMIT_PER_POST = 200;

type CommentGuardResult = { ok: true } | { ok: false; error: string };

export function getClientIp(request: Request) {
  const forwardedFor = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .find(Boolean);
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return cloudflareIp || forwardedFor || realIp || "local";
}

export async function checkCommentRateLimit({
  ip,
  postSlug,
}: {
  ip: string;
  postSlug: string;
}): Promise<CommentGuardResult> {
  const ipKey = `ratelimit:ip:${ip}`;
  const postKey = `ratelimit:post:${postSlug}:${ip}`;

  const [rawIpCount, rawPostCount] = await Promise.all([
    env.CMS_CACHE.get<number>(ipKey, "json").catch(() => 0),
    env.CMS_CACHE.get<number>(postKey, "json").catch(() => 0),
  ]);
  const ipCount = normalizeRateLimitCount(rawIpCount);
  const postCount = normalizeRateLimitCount(rawPostCount);

  if (ipCount >= RATE_LIMIT_PER_IP || postCount >= RATE_LIMIT_PER_POST) {
    return { ok: false, error: "Too many comments submitted recently. Please try again later." };
  }

  // Fire-and-forget increment — approximate rate limiting (KV is eventually consistent)
  await Promise.all([
    env.CMS_CACHE.put(ipKey, JSON.stringify(ipCount + 1), {
      expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
    }),
    env.CMS_CACHE.put(postKey, JSON.stringify(postCount + 1), {
      expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
    }),
  ]).catch(() => {});

  return { ok: true };
}

export async function verifyTurnstile({
  token,
  request,
}: {
  token: string | undefined;
  request: Request;
}): Promise<CommentGuardResult> {
  const secret = env.CMS_TURNSTILE_SECRET_KEY?.trim();
  const siteKey = env.VITE_TURNSTILE_SITE_KEY?.trim();
  const normalizedToken = token?.trim();

  if (!secret || !siteKey) {
    return { ok: true };
  }

  if (!normalizedToken) {
    return { ok: false, error: "Turnstile token is required" };
  }

  const formData = new FormData();
  formData.set("secret", secret);
  formData.set("response", normalizedToken);
  formData.set("remoteip", getClientIp(request));

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => ({}))) as { success?: boolean };

    return response.ok && payload.success
      ? { ok: true }
      : { ok: false, error: "Turnstile verification failed" };
  } catch {
    return { ok: false, error: "Turnstile verification failed" };
  }
}

function normalizeRateLimitCount(value: unknown) {
  const count = Number(value ?? 0);

  if (!Number.isFinite(count) || count < 0) {
    return 0;
  }

  return Math.floor(count);
}
