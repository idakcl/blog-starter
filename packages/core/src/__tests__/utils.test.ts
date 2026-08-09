import { describe, it, expect } from "vitest";

import {
  slugify,
  digestText,
  escapeHtml,
  countLinks,
  normalizeDateInput,
  cleanStringList,
  parseJson,
  normalizeEmail,
  assertPassword,
  toIsoString,
} from "../utils";

describe("slugify", () => {
  it("converts basic ASCII text to lowercase slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("preserves Chinese characters", () => {
    expect(slugify("你好世界")).toBe("你好世界");
  });

  it("replaces special characters with dashes", () => {
    expect(slugify("hello!@#world")).toBe("hello-world");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });

  it("truncates slugs longer than 96 characters", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(96);
  });

  it("strips leading and trailing dashes", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("collapses multiple dashes", () => {
    expect(slugify("hello   world   test")).toBe("hello-world-test");
  });
});

describe("digestText", () => {
  it("returns deterministic output for the same input", async () => {
    const a = await digestText("test");
    const b = await digestText("test");
    expect(a).toBe(b);
  });

  it("produces a known SHA-256 hash for empty string", async () => {
    // SHA-256 of empty string
    const hash = await digestText("");
    expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("produces a 64-character hex string", async () => {
    const hash = await digestText("hello");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("&")).toBe("&amp;");
  });

  it("escapes less-than", () => {
    expect(escapeHtml("<")).toBe("&lt;");
  });

  it("escapes greater-than", () => {
    expect(escapeHtml(">")).toBe("&gt;");
  });

  it("escapes double quote", () => {
    expect(escapeHtml('"')).toBe("&quot;");
  });

  it("escapes single quote", () => {
    expect(escapeHtml("'")).toBe("&#39;");
  });

  it("escapes nested HTML", () => {
    expect(escapeHtml('<div class="x">&amp;</div>')).toBe(
      "&lt;div class=&quot;x&quot;&gt;&amp;amp;&lt;/div&gt;",
    );
  });

  it("returns empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("returns unchanged string with no special chars", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

describe("countLinks", () => {
  it("returns 0 for text with no links", () => {
    expect(countLinks("just plain text")).toBe(0);
  });

  it("counts a single http link", () => {
    expect(countLinks("visit http://example.com")).toBe(1);
  });

  it("counts a single https link", () => {
    expect(countLinks("visit https://example.com")).toBe(1);
  });

  it("counts multiple links", () => {
    expect(countLinks("http://a.com and https://b.com and http://c.com")).toBe(3);
  });

  it("ignores non-http text", () => {
    expect(countLinks("ftp://server.com")).toBe(0);
  });
});

describe("normalizeDateInput", () => {
  it("converts a valid ISO string to ISO format", () => {
    const result = normalizeDateInput("2024-01-15T10:30:00Z");
    expect(result).toBe("2024-01-15T10:30:00.000Z");
  });

  it("returns invalid string as-is", () => {
    expect(normalizeDateInput("not-a-date")).toBe("not-a-date");
  });

  it("returns ISO string for null", () => {
    const result = normalizeDateInput(null);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns ISO string for undefined", () => {
    const result = normalizeDateInput(undefined);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("cleanStringList", () => {
  it("removes duplicates", () => {
    expect(cleanStringList(["a", "b", "a"])).toEqual(["a", "b"]);
  });

  it("trims whitespace", () => {
    expect(cleanStringList(["  hello  ", "  world  "])).toEqual(["hello", "world"]);
  });

  it("filters empty strings", () => {
    expect(cleanStringList(["a", "", "b", "  "])).toEqual(["a", "b"]);
  });

  it("handles undefined input", () => {
    expect(cleanStringList(undefined)).toEqual([]);
  });
});

describe("parseJson", () => {
  it("parses valid JSON", () => {
    expect(parseJson('{"key":"value"}')).toEqual({ key: "value" });
  });

  it("returns undefined for invalid JSON", () => {
    expect(parseJson("{bad json}")).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(parseJson(null)).toBeUndefined();
  });

  it("parses JSON arrays", () => {
    expect(parseJson("[1,2,3]")).toEqual([1, 2, 3]);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases a valid email", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });

  it("returns a plain valid email unchanged", () => {
    expect(normalizeEmail("user@example.com")).toBe("user@example.com");
  });

  it("throws for an invalid email", () => {
    expect(() => normalizeEmail("not-an-email")).toThrow("A valid email is required");
  });

  it("throws for undefined input", () => {
    expect(() => normalizeEmail(undefined)).toThrow("A valid email is required");
  });
});

describe("assertPassword", () => {
  it("throws for a short password", () => {
    expect(() => assertPassword("short")).toThrow("Password must be at least 8 characters");
  });

  it("does not throw for a valid password", () => {
    expect(() => assertPassword("longpassword")).not.toThrow();
  });

  it("does not throw for exactly 8 characters", () => {
    expect(() => assertPassword("12345678")).not.toThrow();
  });
});

describe("toIsoString", () => {
  it("converts a Date object to ISO string", () => {
    const date = new Date("2024-01-15T10:30:00Z");
    expect(toIsoString(date)).toBe("2024-01-15T10:30:00.000Z");
  });

  it("converts a string date to ISO string", () => {
    expect(toIsoString("2024-01-15T10:30:00Z")).toBe("2024-01-15T10:30:00.000Z");
  });

  it("converts a numeric timestamp to ISO string", () => {
    const ts = new Date("2024-01-15T10:30:00Z").getTime();
    expect(toIsoString(ts)).toBe("2024-01-15T10:30:00.000Z");
  });

  it("returns ISO string for undefined", () => {
    const result = toIsoString(undefined);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns string representation for invalid input", () => {
    expect(toIsoString("not-a-date")).toBe("not-a-date");
  });
});
