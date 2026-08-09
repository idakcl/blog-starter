import "@tanstack/react-start/server-only";
import type { Asset } from "@repo/core";
import { env } from "cloudflare:workers";

import { createD1Asset } from "#/lib/cms-d1";

type AssetUploadInput = {
  filename: string;
  contentType: string;
  data: ArrayBuffer | Uint8Array | Blob;
  attachedPostId?: string | null;
};

export const MAX_ASSET_UPLOAD_BYTES = 10 * 1024 * 1024;

const maxAssetRequestBytes = Math.ceil(MAX_ASSET_UPLOAD_BYTES * 1.5) + 64 * 1024;

export class AssetUploadTooLargeError extends Error {
  constructor() {
    super(`Asset uploads are limited to ${formatBytes(MAX_ASSET_UPLOAD_BYTES)}.`);
    this.name = "AssetUploadTooLargeError";
  }
}

type R2StatusBucket = Pick<(typeof env)["CMS_STORAGE"], "list">;

export type R2BucketStatus = {
  binding: "CMS_STORAGE";
  purpose: "storage";
  prefix: string;
  status: "ready" | "unavailable";
  checkedAt: string;
  sampleCount: number;
  message?: string;
};

export type R2StorageStatus = {
  status: "ready" | "degraded";
  buckets: R2BucketStatus[];
};

export async function readAssetUpload(request: Request): Promise<AssetUploadInput> {
  const contentType = request.headers.get("content-type") ?? "";

  assertRequestWithinUploadLimit(request, contentType);

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("Upload requires a file field.");
    }

    assertSizeWithinUploadLimit(file.size);

    return {
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      data: file,
      attachedPostId: valueOrNull(formData.get("attachedPostId")),
    };
  }

  const body = (await request.json().catch(() => ({}))) as Partial<{
    filename: string;
    contentType: string;
    contentBase64: string;
    dataUrl: string;
    attachedPostId: string | null;
  }>;

  const parsedDataUrl = body.dataUrl ? parseDataUrl(body.dataUrl) : undefined;
  const contentBase64 = parsedDataUrl?.contentBase64 ?? body.contentBase64;

  if (!contentBase64) {
    throw new Error("Upload requires contentBase64, dataUrl, or multipart file data.");
  }

  assertSizeWithinUploadLimit(estimatedBase64DecodedBytes(contentBase64));
  const data = decodeBase64(contentBase64);
  assertSizeWithinUploadLimit(data.byteLength);

  return {
    filename: body.filename?.trim() || "upload.bin",
    contentType:
      parsedDataUrl?.contentType ?? body.contentType?.trim() ?? "application/octet-stream",
    data,
    attachedPostId: body.attachedPostId ?? null,
  };
}

export async function uploadAssetToR2(input: AssetUploadInput) {
  const filename = safeFilename(input.filename);
  const key = uploadObjectKey(filename);
  const url = `/uploads/${key.replace(/^uploads\//, "")}`;
  const sizeBytes = await byteLength(input.data);

  assertSizeWithinUploadLimit(sizeBytes);

  await env.CMS_STORAGE.put(key, input.data, {
    httpMetadata: {
      contentType: input.contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  return createD1Asset({
    key,
    url,
    filename,
    contentType: input.contentType,
    sizeBytes,
    attachedPostId: input.attachedPostId,
  });
}

export async function getR2Asset(key: string) {
  return env.CMS_STORAGE.get(key);
}

export async function deleteR2Asset(key: string) {
  await env.CMS_STORAGE.delete(key);
}

export async function getR2StorageStatus(): Promise<R2StorageStatus> {
  const buckets = [
    await checkR2Bucket({
      binding: "CMS_STORAGE",
      bucket: env.CMS_STORAGE,
      purpose: "storage",
      prefix: "uploads/ · imports/ · exports/",
    }),
  ];

  return {
    buckets,
    status: buckets.every((bucket) => bucket.status === "ready") ? "ready" : "degraded",
  };
}

export async function storeImportPackage(input: {
  filename: string;
  contentType: string;
  contentBase64?: string;
  attachedPostId?: string | null;
}) {
  const filename = safeFilename(input.filename);
  const key = objectKey("imports", filename);
  const data = input.contentBase64 ? decodeBase64(input.contentBase64) : new Uint8Array();

  await env.CMS_STORAGE.put(key, data, {
    httpMetadata: {
      contentType: input.contentType,
    },
  });

  return {
    id: `asset_${crypto.randomUUID()}`,
    key,
    url: `r2://CMS_STORAGE/${key}`,
    filename,
    contentType: input.contentType,
    sizeBytes: data.byteLength,
    attachedPostId: input.attachedPostId ?? null,
    createdAt: new Date().toISOString(),
  } satisfies Asset;
}

export async function storeExportBackup(payload: unknown) {
  const content = JSON.stringify(payload, null, 2);
  const createdAt = new Date().toISOString();
  const key = objectKey("exports", `01mvp-blog-starter-${createdAt.replace(/[:.]/g, "-")}.json`);

  await env.CMS_STORAGE.put(key, content, {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
    },
  });

  return {
    key,
    url: `r2://CMS_STORAGE/${key}`,
    contentType: "application/json",
    sizeBytes: new TextEncoder().encode(content).byteLength,
    createdAt,
  };
}

export async function storeExportZipBackup(data: Uint8Array, filename: string) {
  const createdAt = new Date().toISOString();
  const key = objectKey("exports", filename);

  await env.CMS_STORAGE.put(key, data, {
    httpMetadata: {
      contentType: "application/zip",
    },
  });

  return {
    key,
    url: `r2://CMS_STORAGE/${key}`,
    contentType: "application/zip",
    sizeBytes: data.byteLength,
    createdAt,
  };
}

export async function pruneExportBackups(retentionDays: number) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const deletedKeys: string[] = [];
  let cursor: string | undefined;

  do {
    const result = await env.CMS_STORAGE.list({
      prefix: "exports/",
      cursor,
      limit: 100,
    });

    for (const object of result.objects) {
      if (object.uploaded.getTime() >= cutoff) {
        continue;
      }

      await env.CMS_STORAGE.delete(object.key);
      deletedKeys.push(object.key);
    }

    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);

  return { deletedKeys, retentionDays };
}

function objectKey(prefix: "imports" | "exports", filename: string) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${prefix}/${yyyy}/${mm}/${crypto.randomUUID()}-${filename}`;
}

function uploadObjectKey(filename: string) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const extension = extensionForFilename(filename);
  const assetId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  return `uploads/${yyyy}/${mm}/${assetId}${extension}`;
}

function extensionForFilename(filename: string) {
  return /\.[a-z0-9]{1,12}$/i.exec(filename)?.[0].toLowerCase() ?? "";
}

function safeFilename(filename: string) {
  const lastSegment = filename.split(/[\\/]/).pop() || "upload.bin";
  const safeName = lastSegment
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return safeName || "upload.bin";
}

function parseDataUrl(value: string) {
  const match = /^data:([^;,]+)?;base64,(.+)$/i.exec(value);

  if (!match) {
    return undefined;
  }

  return {
    contentType: match[1] || "application/octet-stream",
    contentBase64: match[2],
  };
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function assertRequestWithinUploadLimit(request: Request, contentType: string) {
  const rawContentLength = request.headers.get("content-length");

  if (!rawContentLength) {
    return;
  }

  const contentLength = Number(rawContentLength);
  const maxRequestBytes = contentType.includes("multipart/form-data")
    ? MAX_ASSET_UPLOAD_BYTES + 64 * 1024
    : maxAssetRequestBytes;

  if (Number.isFinite(contentLength) && contentLength > maxRequestBytes) {
    throw new AssetUploadTooLargeError();
  }
}

function assertSizeWithinUploadLimit(size: number) {
  if (size > MAX_ASSET_UPLOAD_BYTES) {
    throw new AssetUploadTooLargeError();
  }
}

function estimatedBase64DecodedBytes(value: string) {
  const normalized = value.replace(/\s/g, "");
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;

  return Math.floor((normalized.length * 3) / 4) - padding;
}

function formatBytes(value: number) {
  return `${Math.round(value / 1024 / 1024)} MiB`;
}

async function byteLength(data: ArrayBuffer | Uint8Array | Blob) {
  if (data instanceof Blob) {
    return data.size;
  }

  return data.byteLength;
}

function valueOrNull(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function checkR2Bucket({
  binding,
  bucket,
  purpose,
  prefix,
}: {
  binding: R2BucketStatus["binding"];
  bucket: R2StatusBucket | undefined;
  purpose: R2BucketStatus["purpose"];
  prefix: string;
}): Promise<R2BucketStatus> {
  const checkedAt = new Date().toISOString();

  if (!bucket) {
    return {
      binding,
      checkedAt,
      message: "R2 binding is not available in this Worker environment.",
      prefix,
      purpose,
      sampleCount: 0,
      status: "unavailable",
    };
  }

  try {
    const result = await withTimeout(bucket.list({ limit: 1 }), 2500);

    return {
      binding,
      checkedAt,
      prefix,
      purpose,
      sampleCount: result.objects.length,
      status: "ready",
    };
  } catch (error) {
    return {
      binding,
      checkedAt,
      message: storageErrorMessage(error),
      prefix,
      purpose,
      sampleCount: 0,
      status: "unavailable",
    };
  }
}

function storageErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/bucket.*(not found|does not exist)|no such bucket/i.test(message)) {
    return "The configured R2 bucket was not found.";
  }

  if (/billing|payment|pre.?author|subscription|r2.*(not enabled|disabled)/i.test(message)) {
    return "R2 may not be enabled for this Cloudflare account yet.";
  }

  if (/timed out/i.test(message)) {
    return "R2 status check timed out.";
  }

  return "R2 could not be reached from this Worker environment.";
}

function withTimeout<TValue>(promise: Promise<TValue>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<TValue>((_, reject) => {
      setTimeout(() => reject(new Error("R2 status check timed out.")), timeoutMs);
    }),
  ]);
}
