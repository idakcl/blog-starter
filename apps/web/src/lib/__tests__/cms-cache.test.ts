import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start/server-only", () => ({}));

const mockCache = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  env: {
    CMS_CACHE: mockCache,
  },
}));

import { cachedGet, invalidateCache } from "../cms-cache";

describe("cachedGet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached false values without calling the fetcher", async () => {
    mockCache.get.mockResolvedValueOnce(false);
    const fetcher = vi.fn(async () => true);

    await expect(cachedGet("flag", fetcher)).resolves.toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns cached zero values without calling the fetcher", async () => {
    mockCache.get.mockResolvedValueOnce(0);
    const fetcher = vi.fn(async () => 1);

    await expect(cachedGet("count", fetcher)).resolves.toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetches and stores fresh data when KV returns null", async () => {
    mockCache.get.mockResolvedValueOnce(null);
    mockCache.put.mockResolvedValueOnce(undefined);
    const fetcher = vi.fn(async () => ({ ok: true }));

    await expect(cachedGet("object", fetcher)).resolves.toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(mockCache.put).toHaveBeenCalledWith("object", JSON.stringify({ ok: true }), {
      expirationTtl: 300,
    });
  });

  it("falls back to the fetcher when KV reads fail", async () => {
    mockCache.get.mockRejectedValueOnce(new Error("KV unavailable"));
    mockCache.put.mockResolvedValueOnce(undefined);
    const fetcher = vi.fn(async () => "fresh");

    await expect(cachedGet("key", fetcher)).resolves.toBe("fresh");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not fail the request when the background KV write fails", async () => {
    mockCache.get.mockResolvedValueOnce(null);
    mockCache.put.mockRejectedValueOnce(new Error("KV write failed"));

    await expect(cachedGet("key", async () => "fresh")).resolves.toBe("fresh");
  });
});

describe("invalidateCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes all provided keys", async () => {
    mockCache.delete.mockResolvedValue(undefined);

    await invalidateCache("a", "b", "c");

    expect(mockCache.delete).toHaveBeenCalledTimes(3);
    expect(mockCache.delete).toHaveBeenCalledWith("a");
    expect(mockCache.delete).toHaveBeenCalledWith("b");
    expect(mockCache.delete).toHaveBeenCalledWith("c");
  });

  it("settles delete failures instead of throwing", async () => {
    mockCache.delete.mockRejectedValueOnce(new Error("delete failed"));

    await expect(invalidateCache("a")).resolves.toBeUndefined();
  });
});
