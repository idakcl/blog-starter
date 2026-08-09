import { describe, it, expect } from "vitest";

import {
  getCommentInitialStatus,
  normalizeCommentBlockedKeywords,
  findBlockedCommentKeyword,
} from "../comment-moderation";

describe("getCommentInitialStatus", () => {
  it('returns "approved" when auto-block off and approval not required', () => {
    expect(
      getCommentInitialStatus({
        body: "Nice post!",
        settings: {
          commentAutoBlockEnabled: false,
          commentBlockedKeywords: [],
          commentsRequireApproval: false,
        },
      }),
    ).toBe("approved");
  });

  it('returns "pending" when approval is required and no block match', () => {
    expect(
      getCommentInitialStatus({
        body: "Nice post!",
        settings: {
          commentAutoBlockEnabled: false,
          commentBlockedKeywords: [],
          commentsRequireApproval: true,
        },
      }),
    ).toBe("pending");
  });

  it('returns "spam" when auto-block is on and body matches keyword', () => {
    expect(
      getCommentInitialStatus({
        body: "This is a scam",
        settings: {
          commentAutoBlockEnabled: true,
          commentBlockedKeywords: ["scam"],
          commentsRequireApproval: true,
        },
      }),
    ).toBe("spam");
  });

  it('returns "spam" over "pending" when both apply', () => {
    expect(
      getCommentInitialStatus({
        body: "Visit this casino now",
        settings: {
          commentAutoBlockEnabled: true,
          commentBlockedKeywords: ["casino"],
          commentsRequireApproval: true,
        },
      }),
    ).toBe("spam");
  });

  it('returns "approved" when auto-block is on but no keyword matches', () => {
    expect(
      getCommentInitialStatus({
        body: "Great article!",
        settings: {
          commentAutoBlockEnabled: true,
          commentBlockedKeywords: ["scam"],
          commentsRequireApproval: false,
        },
      }),
    ).toBe("approved");
  });

  it('returns "pending" when auto-block is on but no keywords provided', () => {
    expect(
      getCommentInitialStatus({
        body: "Hello",
        settings: {
          commentAutoBlockEnabled: true,
          commentBlockedKeywords: [],
          commentsRequireApproval: true,
        },
      }),
    ).toBe("pending");
  });
});

describe("normalizeCommentBlockedKeywords", () => {
  it("normalizes an array input", () => {
    expect(normalizeCommentBlockedKeywords(["spam", "scam"])).toEqual(["spam", "scam"]);
  });

  it("normalizes a comma-separated string input", () => {
    expect(normalizeCommentBlockedKeywords("spam,scam,phish")).toEqual(["spam", "scam", "phish"]);
  });

  it("normalizes a newline-separated string input", () => {
    expect(normalizeCommentBlockedKeywords("spam\nscam\nphish")).toEqual(["spam", "scam", "phish"]);
  });

  it("trims whitespace", () => {
    expect(normalizeCommentBlockedKeywords(["  spam  ", "  scam  "])).toEqual(["spam", "scam"]);
  });

  it("removes duplicates", () => {
    expect(normalizeCommentBlockedKeywords(["spam", "spam", "scam"])).toEqual(["spam", "scam"]);
  });

  it("filters empty strings", () => {
    expect(normalizeCommentBlockedKeywords(["spam", "", "scam", "  "])).toEqual(["spam", "scam"]);
  });

  it("returns empty array for non-array, non-string input", () => {
    expect(normalizeCommentBlockedKeywords(null)).toEqual([]);
    expect(normalizeCommentBlockedKeywords(undefined)).toEqual([]);
    expect(normalizeCommentBlockedKeywords(123)).toEqual([]);
  });
});

describe("findBlockedCommentKeyword", () => {
  it("finds a blocked keyword in the body", () => {
    expect(findBlockedCommentKeyword("This is a scam message", ["scam"])).toBe("scam");
  });

  it("matches case-insensitively", () => {
    expect(findBlockedCommentKeyword("This is a SCAM message", ["scam"])).toBe("scam");
    expect(findBlockedCommentKeyword("this casino is bad", ["Casino"])).toBe("Casino");
  });

  it("returns undefined when no keyword matches", () => {
    expect(findBlockedCommentKeyword("Great article!", ["scam", "spam"])).toBeUndefined();
  });

  it("matches Chinese keywords", () => {
    expect(findBlockedCommentKeyword("这里有博彩内容", ["博彩", "赌博"])).toBe("博彩");
  });

  it("returns undefined for empty keywords array", () => {
    expect(findBlockedCommentKeyword("Anything", [])).toBeUndefined();
  });
});
