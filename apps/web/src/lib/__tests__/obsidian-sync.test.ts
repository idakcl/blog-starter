import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildObsidianSyncPayload,
  isPublishedNote,
  parseFrontmatter,
  rewriteObsidianMarkdown,
} from "../../../../../scripts/sync-obsidian.mjs";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { force: true, recursive: true })));
  tempDirs.length = 0;
});

describe("parseFrontmatter", () => {
  it("parses Obsidian publish metadata and arrays", () => {
    const parsed = parseFrontmatter(`---
publish: true
tags: [AI, writing]
---
# Hello
`);

    expect(parsed.metadata).toEqual({ publish: true, tags: ["AI", "writing"] });
    expect(isPublishedNote(parsed.metadata, parsed.content)).toBe(true);
  });
});

describe("rewriteObsidianMarkdown", () => {
  it("rewrites Obsidian image embeds, note links, and callouts", async () => {
    const root = await createTempVault({
      "Posts/Hello.md": "# Hello",
      "Assets/cover image.png": "image-bytes",
    });
    const note = {
      absolutePath: path.join(root, "Posts/Hello.md"),
      notesRoot: root,
    };
    const assetPath = path.join(root, "Assets/cover image.png").replace(/\\/g, "/");
    const markdown = await rewriteObsidianMarkdown(
      ["> [!NOTE] Read this", "![[cover image.png|Cover]]", "[[Hello|the note]]"].join("\n"),
      {
        assetIndex: {
          byAbsolutePath: new Map([[assetPath, { path: assetPath }]]),
          byFilename: new Map([["cover image.png", [{ path: assetPath }]]]),
        },
        dryRun: true,
        note,
        noteLinkIndex: new Map([["hello", "hello"]]),
        resolvedAssets: [],
        siteUrl: "https://example.com/",
        token: "",
        uploadCache: new Map(),
      },
    );

    expect(markdown).toContain("> **Read this**");
    expect(markdown).toContain("![Cover](/uploads/dry-run/cover image.png)");
    expect(markdown).toContain("[the note](/blog/hello)");
  });
});

describe("buildObsidianSyncPayload", () => {
  it("includes only published Markdown and MDX files", async () => {
    const root = await createTempVault({
      "draft.md": "# Draft",
      "post.mdx": `---
publish: true
tags:
  - Obsidian
---
# Published

Body with #writing.
`,
    });

    const payload = await buildObsidianSyncPayload({
      apiToken: "",
      dryRun: true,
      notesRoot: root,
      siteUrl: "https://example.com/",
    });

    expect(payload.scannedFiles).toBe(2);
    expect(payload.skippedFiles).toBe(1);
    expect(payload.entries).toHaveLength(1);
    expect(payload.entries[0].path).toBe("post.mdx");
    expect(payload.entries[0].post.title).toBe("Published");
    expect(payload.entries[0].post.slug).toBe("post");
    expect(payload.entries[0].post.tags).toEqual(["obsidian", "writing"]);
  });
});

async function createTempVault(files: Record<string, string>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "obsidian-sync-"));
  tempDirs.push(root);

  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  return root;
}
