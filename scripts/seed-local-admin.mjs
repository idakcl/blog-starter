import { execFileSync } from "node:child_process";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const userId = "local-dev-admin";
const accountId = "local-dev-admin-credential";
const email = normalizeEmail(process.env.BLOGCMS_LOCAL_ADMIN_EMAIL ?? "a@a.test");
const name = (process.env.BLOGCMS_LOCAL_ADMIN_NAME ?? "Local Admin").trim() || "Local Admin";
const password = process.env.BLOGCMS_LOCAL_ADMIN_PASSWORD ?? "1";

if (!password) {
  throw new Error("BLOGCMS_LOCAL_ADMIN_PASSWORD cannot be empty.");
}

const passwordHash = await hashPassword(password);
const timestampSql = "cast(unixepoch('subsecond') * 1000 as integer)";
const sql = `
PRAGMA foreign_keys = ON;

INSERT INTO "user" (id, name, email, role, email_verified, image, created_at, updated_at)
VALUES (
  '${escapeSql(userId)}',
  '${escapeSql(name)}',
  '${escapeSql(email)}',
  'admin',
  1,
  NULL,
  ${timestampSql},
  ${timestampSql}
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  email = excluded.email,
  role = 'admin',
  email_verified = 1,
  updated_at = ${timestampSql};

DELETE FROM account
WHERE id = '${escapeSql(accountId)}'
   OR (user_id = '${escapeSql(userId)}' AND provider_id = 'credential');

INSERT INTO account (
  id,
  account_id,
  provider_id,
  user_id,
  password,
  created_at,
  updated_at
)
VALUES (
  '${escapeSql(accountId)}',
  '${escapeSql(userId)}',
  'credential',
  '${escapeSql(userId)}',
  '${escapeSql(passwordHash)}',
  ${timestampSql},
  ${timestampSql}
);

DELETE FROM session WHERE user_id = '${escapeSql(userId)}';
`;

execFileSync(
  "pnpm",
  [
    "--filter",
    "@repo/web",
    "exec",
    "wrangler",
    "d1",
    "execute",
    "blog-starter-cms",
    "--local",
    "--command",
    sql,
  ],
  { stdio: "inherit" },
);

console.log("");
console.log("Local admin ready:");
console.log(`  email: ${email}`);
console.log(`  password: ${password}`);
console.log("");
console.log("This script only writes to the local Wrangler D1 database.");

async function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(value.normalize("NFKC"), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  });

  return `${salt}:${key.toString("hex")}`;
}

function normalizeEmail(value) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    throw new Error("BLOGCMS_LOCAL_ADMIN_EMAIL cannot be empty.");
  }

  return normalized;
}

function escapeSql(value) {
  return value.replaceAll("'", "''");
}
