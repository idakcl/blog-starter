import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.SKIP_R2_BUCKET_CHECK === "1") {
  console.log("Skipping R2 bucket preflight because SKIP_R2_BUCKET_CHECK=1.");
  process.exit(0);
}

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const webDir = path.join(rootDir, "apps", "web");
const wranglerConfigPath = path.join(webDir, "wrangler.jsonc");
const config = parseJsonc(readFileSync(wranglerConfigPath, "utf8"));

assertDeployConfig(config);

const buckets = Array.isArray(config.r2_buckets)
  ? config.r2_buckets
      .map((bucket) => ({
        binding: String(bucket.binding ?? ""),
        bucketName: String(bucket.bucket_name ?? ""),
      }))
      .filter((bucket) => bucket.binding && bucket.bucketName)
  : [];

if (buckets.length === 0) {
  console.log("No R2 bucket is declared in apps/web/wrangler.jsonc.");
  process.exit(0);
}

const result = spawnSync(
  "pnpm",
  ["exec", "wrangler", "r2", "bucket", "list", "--config", "wrangler.jsonc"],
  {
    cwd: webDir,
    encoding: "utf8",
  },
);

if (result.error || result.status !== 0) {
  const details = [result.error?.message, result.stdout, result.stderr].filter(Boolean).join("\n");

  fail([
    "Could not verify the R2 bucket before deploy.",
    "",
    "Make sure Wrangler is logged in to the target Cloudflare account and that R2 is enabled.",
    "For new Cloudflare accounts, open Storage & databases > R2 and complete the R2 subscription checkout. A valid account payment method may be required for usage-based billing and preauthorization.",
    "",
    details.trim(),
  ]);
}

const output = `${result.stdout}\n${result.stderr}`;
const missingBuckets = buckets.filter((bucket) => !output.includes(bucket.bucketName));

if (missingBuckets.length > 0) {
  fail([
    "Missing R2 bucket required by apps/web/wrangler.jsonc:",
    ...missingBuckets.map((bucket) => `- ${bucket.binding}: ${bucket.bucketName}`),
    "",
    "Create it in the target Cloudflare account before deploying:",
    ...missingBuckets.map(
      (bucket) =>
        `pnpm --filter @repo/web exec wrangler r2 bucket create ${bucket.bucketName} --config wrangler.jsonc`,
    ),
    "",
    "If the create command asks for billing setup, finish the R2 subscription/payment method flow in the Cloudflare dashboard first.",
  ]);
}

console.log(`R2 bucket preflight passed: ${buckets.map((bucket) => bucket.bucketName).join(", ")}`);

function assertDeployConfig(config) {
  const vars = config.vars && typeof config.vars === "object" ? config.vars : {};
  const d1Databases = Array.isArray(config.d1_databases) ? config.d1_databases : [];
  const kvNamespaces = Array.isArray(config.kv_namespaces) ? config.kv_namespaces : [];
  const problems = [];

  const publicSiteUrl = String(vars.CMS_PUBLIC_SITE_URL ?? "");
  const viteBaseUrl = String(vars.VITE_BASE_URL ?? "");

  if (isPlaceholderUrl(publicSiteUrl) || isPlaceholderUrl(viteBaseUrl)) {
    problems.push("Set CMS_PUBLIC_SITE_URL and VITE_BASE_URL to your production URL.");
  }

  for (const database of d1Databases) {
    const id = String(database.database_id ?? "");

    if (isPlaceholderUuid(id)) {
      problems.push(`Set a real D1 database_id for ${database.binding ?? "CMS_DB"}.`);
    }
  }

  for (const namespace of kvNamespaces) {
    const id = String(namespace.id ?? "");

    if (isPlaceholderHexId(id)) {
      problems.push(`Set a real KV namespace id for ${namespace.binding ?? "CMS_CACHE"}.`);
    }
  }

  if (problems.length) {
    fail([
      "apps/web/wrangler.jsonc still contains template deployment values.",
      "",
      ...Array.from(new Set(problems)).map((problem) => `- ${problem}`),
    ]);
  }
}

function isPlaceholderUrl(value) {
  return !value || value.includes("your-domain.example") || value.includes("example.com");
}

function isPlaceholderUuid(value) {
  return value === "00000000-0000-0000-0000-000000000000" || /replace|your/i.test(value);
}

function isPlaceholderHexId(value) {
  return value === "00000000000000000000000000000000" || /replace|your/i.test(value);
}

function fail(lines) {
  console.error(lines.filter(Boolean).join("\n"));
  process.exit(1);
}

function parseJsonc(value) {
  return JSON.parse(stripTrailingCommas(stripJsonComments(value)));
}

function stripJsonComments(value) {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        output += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      output += char;

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function stripTrailingCommas(value) {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (inString) {
      output += char;

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === ",") {
      let cursor = index + 1;

      while (/\s/.test(value[cursor] ?? "")) {
        cursor += 1;
      }

      if (value[cursor] === "}" || value[cursor] === "]") {
        continue;
      }
    }

    output += char;
  }

  return output;
}
