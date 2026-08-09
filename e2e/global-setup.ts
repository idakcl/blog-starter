import { spawnSync } from "node:child_process";

const localAdminEnv = {
  BLOGCMS_LOCAL_ADMIN_EMAIL: process.env.BLOGCMS_LOCAL_ADMIN_EMAIL ?? "a@a.test",
  BLOGCMS_LOCAL_ADMIN_NAME: process.env.BLOGCMS_LOCAL_ADMIN_NAME ?? "Local Admin",
  BLOGCMS_LOCAL_ADMIN_PASSWORD: process.env.BLOGCMS_LOCAL_ADMIN_PASSWORD ?? "1",
};

export default async function globalSetup() {
  const env = {
    ...process.env,
    ...localAdminEnv,
  };

  run(
    "pnpm",
    [
      "--filter",
      "@repo/web",
      "exec",
      "wrangler",
      "d1",
      "migrations",
      "apply",
      "blog-starter-cms",
      "--local",
      "--config",
      "wrangler.jsonc",
    ],
    env,
  );

  run("pnpm", ["db:seed:local-admin"], env);
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env,
  });

  if (result.status === 0) {
    return;
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  throw new Error(`Playwright setup failed while running: ${command} ${args.join(" ")}`);
}
