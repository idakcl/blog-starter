import { describe, it, expect } from "vitest";

import { renderMarkdownToHtml, markdownToText, sanitizeHtml, htmlToText } from "../markdown";

describe("renderMarkdownToHtml", () => {
  it("renders headings", () => {
    expect(renderMarkdownToHtml("# Title")).toContain("<h1>");
    expect(renderMarkdownToHtml("## Subtitle")).toContain("<h2>");
    expect(renderMarkdownToHtml("### Section")).toContain("<h3>");
  });

  it("renders unordered lists", () => {
    const md = "- item one\n- item two";
    const html = renderMarkdownToHtml(md);
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>");
    expect(html).toContain("item one");
    expect(html).toContain("item two");
  });

  it("renders ordered lists", () => {
    const md = "1. item one\n2. item two";
    const html = renderMarkdownToHtml(md);
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>");
    expect(html).toContain("item one");
    expect(html).toContain("item two");
  });

  it("renders code blocks", () => {
    const md = "```js\nconst x = 1;\n```";
    const html = renderMarkdownToHtml(md);
    expect(html).toContain("<pre><code>");
    expect(html).toContain("const x = 1;");
  });

  it("renders inline formatting (bold, italic, code)", () => {
    const md = "This is **bold** and *italic* and `code`.";
    const html = renderMarkdownToHtml(md);
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<code>code</code>");
  });

  it("renders links", () => {
    const md = "[Example](https://example.com)";
    const html = renderMarkdownToHtml(md);
    expect(html).toContain('<a href="https://example.com"');
    expect(html).toContain("Example</a>");
  });

  it("renders images", () => {
    const md = "![Alt text](https://example.com/img.png)";
    const html = renderMarkdownToHtml(md);
    expect(html).toContain('<img src="https://example.com/img.png" alt="Alt text" />');
    expect(html).not.toContain("<a ");
  });

  it("renders blockquotes", () => {
    const html = renderMarkdownToHtml("> A quote");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("A quote");
  });

  it("renders paragraphs for plain text", () => {
    const html = renderMarkdownToHtml("Hello world");
    expect(html).toContain("<p>Hello world</p>");
  });
});

describe("markdownToText", () => {
  it("strips heading markers", () => {
    expect(markdownToText("# Title")).toBe("Title");
  });

  it("strips bold and italic markers", () => {
    expect(markdownToText("**bold** and *italic*")).toBe("bold and italic");
  });

  it("extracts link text from markdown links", () => {
    expect(markdownToText("[Example](https://example.com)")).toBe("Example");
  });

  it("removes image syntax", () => {
    const result = markdownToText("![alt](https://example.com/img.png)");
    expect(result).not.toContain("![");
    expect(result).not.toContain("](");
  });

  it("removes code blocks", () => {
    const result = markdownToText("```js\ncode\n```");
    expect(result).not.toContain("```");
  });

  it("preserves plain text content", () => {
    expect(markdownToText("Hello world")).toBe("Hello world");
  });
});

describe("sanitizeHtml", () => {
  it("removes script tags", () => {
    const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
    expect(sanitizeHtml(html)).toBe("<p>Hello</p><p>World</p>");
  });

  it("removes onclick handlers", () => {
    const html = '<div onclick="alert(1)">Click</div>';
    expect(sanitizeHtml(html)).not.toContain("onclick");
    expect(sanitizeHtml(html)).toContain("Click");
  });

  it("removes javascript: URIs", () => {
    const html = '<a href="javascript:alert(1)">Link</a>';
    expect(sanitizeHtml(html)).not.toContain("javascript:");
    expect(sanitizeHtml(html)).toContain("Link");
  });

  it("keeps safe HTML tags", () => {
    const html = '<p class="safe"><strong>Bold</strong></p>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("removes script tags with attributes", () => {
    const html = '<script type="text/javascript">alert("xss")</script>';
    expect(sanitizeHtml(html)).toBe("");
  });

  it("removes single-quoted onclick handlers", () => {
    const html = "<div onclick='alert(1)'>Click</div>";
    expect(sanitizeHtml(html)).not.toContain("onclick");
  });
});

describe("htmlToText", () => {
  it("strips HTML tags", () => {
    expect(htmlToText("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });

  it("replaces block tags with spaces", () => {
    const result = htmlToText("<p>First</p><p>Second</p>");
    expect(result).toBe("First Second");
  });

  it("preserves text content", () => {
    expect(htmlToText("plain text")).toBe("plain text");
  });

  it("handles nested tags", () => {
    const html = "<div><span>One</span><span>Two</span></div>";
    expect(htmlToText(html)).toBe("OneTwo");
  });

  it("handles empty string", () => {
    expect(htmlToText("")).toBe("");
  });
});
