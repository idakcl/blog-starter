/// <reference types="vite/client" />

type CmsD1Result<TValue> = {
  results: TValue[];
  success: boolean;
  meta: unknown;
};

type CmsD1Statement = {
  bind(...values: unknown[]): CmsD1Statement;
  all<TValue = unknown>(): Promise<CmsD1Result<TValue>>;
  first<TValue = unknown>(): Promise<TValue | null>;
  run(): Promise<unknown>;
};

type CmsD1Database = {
  prepare(query: string): CmsD1Statement;
};

type CmsR2Object = {
  key: string;
  body: ReadableStream<Uint8Array> | null;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
  };
  size: number;
  uploaded: Date;
};

type CmsR2ListResult = {
  objects: CmsR2Object[];
  truncated: boolean;
  cursor?: string;
};

type CmsR2Bucket = {
  get(key: string): Promise<CmsR2Object | null>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<CmsR2ListResult>;
  put(
    key: string,
    value: ReadableStream<Uint8Array> | ArrayBuffer | ArrayBufferView | string | Blob | null,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
      };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
};

type CmsKVNamespace = {
  get(key: string): Promise<string | null>;
  get<TValue = unknown>(key: string, type: "json"): Promise<TValue | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
};

type CmsEmailBinding = {
  send(message: {
    to: string | string[];
    from: string | { email: string; name: string };
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string | { email: string; name: string };
  }): Promise<{ messageId: string }>;
};

type CloudflareBindings = {
  CMS_DB: CmsD1Database;
  CMS_STORAGE: CmsR2Bucket;
  CMS_CACHE: CmsKVNamespace;
  CMS_EMAIL?: CmsEmailBinding;
  VITE_BASE_URL: string;
  CMS_PUBLIC_SITE_URL: string;
  CMS_BACKUP_RETENTION_DAYS: string;
  CMS_EMAIL_SENDING_ENABLED: string;
  CMS_EMAIL_FROM: string;
  CMS_EMAIL_TO: string;
  CMS_PASSWORD_RESET_TTL_MINUTES: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  EMAIL_FROM?: string;
  CMS_TURNSTILE_SECRET_KEY?: string;
  VITE_TURNSTILE_SITE_KEY: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  NETPAN_API_TOKEN?: string;
  NETPAN_API_BASE?: string;
};

declare module "cloudflare:workers" {
  export const env: CloudflareBindings;
  export function waitUntil(promise: Promise<unknown>): void;
}
