import { escapeHtml } from "./utils";

const blockTags = new Set(["blockquote", "h1", "h2", "h3", "li", "ol", "p", "pre", "ul"]);

export function renderMarkdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let listItems: string[] = [];
  let listTag: "ol" | "ul" | null = null;
  let codeLines: string[] = [];
  let inCodeBlock = false;

  const flushList = () => {
    if (listItems.length === 0 || !listTag) {
      return;
    }

    html.push(`<${listTag}>${listItems.map((item) => `<li>${item}</li>`).join("")}</${listTag}>`);
    listItems = [];
    listTag = null;
  };

  const pushListItem = (tag: "ol" | "ul", item: string) => {
    if (listTag && listTag !== tag) {
      flushList();
    }

    listTag = tag;
    listItems.push(item);
  };

  const flushCode = () => {
    if (!inCodeBlock) {
      return;
    }

    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeLines = [];
    inCodeBlock = false;
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCode();
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      html.push(`<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      html.push(`<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`);
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      html.push(`<h1>${inlineMarkdown(trimmed.slice(2))}</h1>`);
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushList();
      html.push(`<blockquote>${inlineMarkdown(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      pushListItem("ul", inlineMarkdown(trimmed.replace(/^[-*]\s+/, "")));
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      pushListItem("ol", inlineMarkdown(trimmed.replace(/^\d+\.\s+/, "")));
      continue;
    }

    flushList();
    html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
  }

  flushList();
  flushCode();

  return html.join("");
}

export function markdownToText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\son\w+=[^\s>]*/gi, "")
    .replace(/\ssrcdoc="[^"]*"/gi, "")
    .replace(/\ssrcdoc='[^']*'/gi, "")
    .replace(/\ssrcdoc=[^\s>]*/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "");
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/!\[([^\]]*)]\(([^)\s]+)\)/g, (substring: string, alt: string, raw: string) => {
      const posterMatch = /#poster=(.*)$/.exec(raw);
      const url = posterMatch ? raw.slice(0, posterMatch.index) : raw;
      let poster: string | undefined;

      if (posterMatch?.[1]) {
        try {
          poster = decodeUriComponentSafe(posterMatch[1]);
        } catch {
          poster = undefined;
        }
      }

      const isVideo = /\.(mp4|webm|ogg|ogv|mov|m4v|m3u8)(\?|#|$)/i.test(url);

      if (isVideo) {
        const posterAttr = poster ? ` poster="${poster}"` : "";
        // playsinline + webkit-playsinline 让视频在微信/iOS 里页内播放，不跳系统播放器。
        // 无 poster 的视频用 preload="auto"：否则只预加载元数据，首帧要等播放才出现，
        // 页面上会一直空白（看起来“看不到”，点击才出画面）。有 poster 的用 metadata 省流量。
        const preload = poster ? "metadata" : "auto";
        return `<video src="${url}"${posterAttr} controls preload="${preload}" playsinline webkit-playsinline></video>`;
      }

      return `<img src="${url}" alt="${alt}" />`;
    })
    .replace(
      /(?<!!)\[([^\]]+)]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g,
      '<a href="$2" rel="noreferrer">$1</a>',
    );
}

export function htmlToText(html: string) {
  return html
    .replace(new RegExp(`</?(${Array.from(blockTags).join("|")})[^>]*>`, "gi"), " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeUriComponentSafe(value: string): string {
  return decodeURIComponent(value);
}
