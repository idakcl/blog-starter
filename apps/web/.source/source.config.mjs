// source.config.ts
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
var docs = defineDocs({
  dir: "content/docs",
  docs: {
    files: ["**/*.md", "**/*.mdx"]
  },
  meta: {
    files: ["**/meta.json", "**/meta.*.json"]
  }
});
var source_config_default = defineConfig({
  mdxOptions: {
    rehypeCodeOptions: false
  }
});
export {
  source_config_default as default,
  docs
};
