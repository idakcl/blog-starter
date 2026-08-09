import "@tanstack/react-start/server-only";
import { env } from "cloudflare:workers";

const CACHE_TTL_SECONDS = 300;

export async function cachedGet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const cached = await env.CMS_CACHE.get<T>(key, "json");
    if (cached !== null) return cached;
  } catch {
    // KV read failure — fall through to fetcher
  }

  const fresh = await fetcher();

  // Fire-and-forget put — don't block the response
  void env.CMS_CACHE.put(key, JSON.stringify(fresh), {
    expirationTtl: CACHE_TTL_SECONDS,
  }).catch(() => {});

  return fresh;
}

export async function invalidateCache(...keys: string[]) {
  await Promise.allSettled(keys.map((key) => env.CMS_CACHE.delete(key)));
}
