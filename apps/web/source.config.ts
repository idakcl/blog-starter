import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    files: ["**/*.md", "**/*.mdx"],
  },
  meta: {
    files: ["**/meta.json", "**/meta.*.json"],
  },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: false,
  },
});
