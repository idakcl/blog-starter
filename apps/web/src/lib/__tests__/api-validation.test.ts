import { describe, it, expect } from "vitest";

import {
  AccountEmailPreferencesPatchSchema,
  ApiTokenCreateSchema,
  BatchPostSchema,
  CreateCommentSchema,
  PostPatchSchema,
  validateBody,
} from "../api-validation";

describe("CreateCommentSchema", () => {
  const validComment = {
    postSlug: "my-post",
    body: "This is a great article!",
  };

  it("accepts a valid minimal comment", () => {
    const result = CreateCommentSchema.safeParse(validComment);
    expect(result.success).toBe(true);
  });

  it("accepts optional fields when provided", () => {
    const result = CreateCommentSchema.safeParse({
      ...validComment,
      parentId: "comment-abc",
      honeypot: "",
      turnstileToken: "cf-turnstile-token-123",
    });
    expect(result.success).toBe(true);
  });

  it("defaults honeypot to empty string when omitted", () => {
    const result = CreateCommentSchema.safeParse(validComment);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.honeypot).toBe("");
    }
  });

  it("trims postSlug before validation", () => {
    const result = CreateCommentSchema.safeParse({ ...validComment, postSlug: "  my-post  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.postSlug).toBe("my-post");
    }
  });

  it("rejects when postSlug is empty", () => {
    const result = CreateCommentSchema.safeParse({ ...validComment, postSlug: "" });
    expect(result.success).toBe(false);
  });

  it("rejects when body is too short (1 char)", () => {
    const result = CreateCommentSchema.safeParse({ ...validComment, body: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects a body with only whitespace", () => {
    const result = CreateCommentSchema.safeParse({ ...validComment, body: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects when body exceeds 4000 characters", () => {
    const result = CreateCommentSchema.safeParse({
      ...validComment,
      body: "a".repeat(4001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects when postSlug exceeds 200 characters", () => {
    const result = CreateCommentSchema.safeParse({
      ...validComment,
      postSlug: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a missing turnstileToken", () => {
    const result = CreateCommentSchema.safeParse(validComment);
    expect(result.success).toBe(true);
  });

  it("normalizes a null turnstileToken to undefined", () => {
    const result = CreateCommentSchema.safeParse({ ...validComment, turnstileToken: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.turnstileToken).toBeUndefined();
    }
  });

  it("normalizes an empty turnstileToken to undefined", () => {
    const result = CreateCommentSchema.safeParse({ ...validComment, turnstileToken: "   " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.turnstileToken).toBeUndefined();
    }
  });

  it("trims turnstileToken when provided", () => {
    const result = CreateCommentSchema.safeParse({
      ...validComment,
      turnstileToken: "  cf-token  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.turnstileToken).toBe("cf-token");
    }
  });

  it("normalizes an empty parentId to null", () => {
    const result = CreateCommentSchema.safeParse({ ...validComment, parentId: "   " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentId).toBeNull();
    }
  });

  it("trims parentId when provided", () => {
    const result = CreateCommentSchema.safeParse({ ...validComment, parentId: " comment-1 " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentId).toBe("comment-1");
    }
  });
});

describe("PostPatchSchema", () => {
  it("accepts a known partial post update", () => {
    const result = PostPatchSchema.safeParse({
      status: "published",
      tags: ["release", "notes"],
      locale: "en",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown fields", () => {
    const result = PostPatchSchema.safeParse({ statuz: "published" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty update", () => {
    const result = PostPatchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid statuses", () => {
    const result = PostPatchSchema.safeParse({ status: "live" });
    expect(result.success).toBe(false);
  });
});

describe("BatchPostSchema", () => {
  it("accepts a valid batch action", () => {
    const result = BatchPostSchema.safeParse({
      action: "publish",
      ids: ["post_1", "post_2"],
    });
    expect(result.success).toBe(true);
  });

  it("trims post ids in a batch action", () => {
    const result = BatchPostSchema.safeParse({
      action: "publish",
      ids: [" post_1 ", "post_2"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ids).toEqual(["post_1", "post_2"]);
    }
  });

  it("rejects more than 50 ids", () => {
    const result = BatchPostSchema.safeParse({
      action: "archive",
      ids: Array.from({ length: 51 }, (_, index) => `post_${index}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate ids after trimming", () => {
    const result = BatchPostSchema.safeParse({
      action: "archive",
      ids: ["post_1", " post_1 "],
    });
    expect(result.success).toBe(false);
  });
});

describe("AccountEmailPreferencesPatchSchema", () => {
  it("accepts a comment reply notification toggle", () => {
    const result = AccountEmailPreferencesPatchSchema.safeParse({
      commentReplyNotificationsEnabled: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts blog email and announcement preference updates", () => {
    const result = AccountEmailPreferencesPatchSchema.safeParse({
      emailPreference: "weekly_blog_updates",
      marketingOptOut: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty preference update", () => {
    const result = AccountEmailPreferencesPatchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid comment reply notification values", () => {
    const result = AccountEmailPreferencesPatchSchema.safeParse({
      commentReplyNotificationsEnabled: "false",
    });
    expect(result.success).toBe(false);
  });
});

describe("ApiTokenCreateSchema", () => {
  it("accepts a future token expiry", () => {
    const result = ApiTokenCreateSchema.safeParse({
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      name: "AI publisher",
      scopes: ["posts:read"],
    });
    expect(result.success).toBe(true);
  });

  it("normalizes an empty token expiry to null", () => {
    const result = ApiTokenCreateSchema.safeParse({
      expiresAt: "",
      name: "AI publisher",
      scopes: ["posts:read"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expiresAt).toBeNull();
    }
  });

  it("rejects a past token expiry", () => {
    const result = ApiTokenCreateSchema.safeParse({
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      name: "AI publisher",
      scopes: ["posts:read"],
    });
    expect(result.success).toBe(false);
  });
});

describe("validateBody", () => {
  const schema = CreateCommentSchema;

  it("returns [data, null] for valid input", () => {
    const input = {
      postSlug: "post",
      body: "Hello world!",
    };
    const [data, error] = validateBody(schema, input);
    expect(data).toBeDefined();
    expect(error).toBeNull();
    expect(data!.postSlug).toBe("post");
  });

  it("returns [null, Response] for invalid input", () => {
    const [data, error] = validateBody(schema, { postSlug: "" });
    expect(data).toBeNull();
    expect(error).toBeInstanceOf(Response);
  });

  it("error response has status 400", async () => {
    const [, error] = validateBody(schema, {});
    expect(error).toBeInstanceOf(Response);
    expect(error!.status).toBe(400);
  });

  it("error response body contains validation details", async () => {
    const [, error] = validateBody(schema, { postSlug: "" });
    const body = (await error!.json()) as {
      error: string;
      details: Array<{ path: string; message: string }>;
    };
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details[0]).toHaveProperty("path");
    expect(body.details[0]).toHaveProperty("message");
  });

  it("error details include the correct field path", async () => {
    const [, error] = validateBody(schema, { postSlug: "", body: "x" });
    const body = (await error!.json()) as { details: Array<{ path: string }> };
    const paths = body.details.map((d) => d.path);
    expect(paths).toContain("postSlug");
    expect(paths).toContain("body");
  });
});
