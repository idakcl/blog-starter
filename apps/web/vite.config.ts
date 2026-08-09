import { cloudflare } from "@cloudflare/vite-plugin";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite-plus";

const injectedHeadScriptsFallback = {
  name: "tanstack-start-injected-head-scripts-client-fallback",
  apply: "serve",
  resolveId(id: string) {
    if (id === "tanstack-start-injected-head-scripts:v") {
      return "\0tanstack-start-injected-head-scripts-client-fallback";
    }
  },
  load(id: string) {
    if (id === "\0tanstack-start-injected-head-scripts-client-fallback") {
      return "export const injectedHeadScripts = undefined;";
    }
  },
} as const;

const publicHtmlCacheVersion =
  process.env.CF_VERSION_METADATA_ID ??
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  String(Date.now());

export default defineConfig({
  run: {
    // Vite Task
    // https://viteplus.dev/config/run
    // https://viteplus.dev/guide/run
    // https://viteplus.dev/guide/cache
    tasks: {
      build: {
        // When deploying, use `vp run build` as the build command, not `vp build`
        command: "vp build",
        env: ["NODE_ENV", "VITE_*"],
        input: [
          { auto: true },
          "!**/.output/**",
          "!**/.vercel/**",
          "!**/.netlify/**",
          "!**/build/**",
          "!**/.wrangler/**",
          "!**/dist/**",
          "!**/*.tsbuildinfo",
          "!**/node_modules/.vite/**",
          "!**/node_modules/.vite-temp/**",
          "!**/node_modules/.nitro/**",
        ],
      },
    },
  },

  resolve: {
    tsconfigPaths: true,
  },
  define: {
    __PUBLIC_HTML_CACHE_VERSION__: JSON.stringify(publicHtmlCacheVersion),
  },
  server: {
    port: 3000,
  },
  plugins: [
    devtools(),
    mdx(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      emitGitIgnore: false,
      emitTsDeclarations: true,
      isServer: "import.meta.env.SSR",
      outputStructure: "locale-modules",
      strategy: ["cookie", "preferredLanguage", "globalVariable", "custom-primary-zh"],
    }),
    tanstackStart(),
    injectedHeadScriptsFallback,
    viteReact(),
    // https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#react-compiler
    babel({
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
  ],
});
