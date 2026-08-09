# Toolchain

Use Vite Plus for this repository. `vp` is the standard project runner, and `vpx` is the standard one-off package runner.

## Command Mapping

| Task                        | Command                                |
| --------------------------- | -------------------------------------- |
| Install dependencies        | `vp install`                           |
| Run web app locally         | `pnpm dev:web`                         |
| Run all packages locally    | `pnpm dev`                             |
| Build all packages          | `pnpm build`                           |
| Build web app only          | `pnpm build:web`                       |
| Check workspace             | `pnpm check`                           |
| Lint workspace (type-aware) | `pnpm lint`                            |
| Format workspace            | `pnpm format`                          |
| Run tests (unit)            | `pnpm test`                            |
| Run tests (e2e)             | `pnpm test:e2e`                        |
| Run all tests               | `pnpm test:all`                        |
| Generate DB migrations      | `pnpm -F @repo/db db generate`         |
| Apply local DB migrations   | `pnpm -F @repo/db db migrate`          |
| Open Drizzle Studio         | `pnpm -F @repo/db db studio`           |
| Deploy web app              | `pnpm deploy:web`                      |
| Add shadcn component        | `pnpm -F @repo/web ui add <component>` |
| Check dependency updates    | `pnpm deps`                            |
| Run one-off package CLI     | `vpx <package>`                        |

## Rules

- Prefer package-local commands (`pnpm -F <pkg> <script>`) for focused work.
- Use root `pnpm lint`, `pnpm check`, and `pnpm build` for broad validation.
- Keep app-specific scripts in `apps/web/package.json`; keep workspace task metadata in root `vite.config.ts`.
- Add workspace packages with `workspace:*` dependencies and keep shared versions centralized in `pnpm-workspace.yaml`.

## Public Docs Versus Agent Commands

- Agent-facing repository instructions should use `vp` and `vpx` where applicable.
- Reader-facing template docs may use `pnpm` when explaining commands a project user will run from this starter.
- Keep the two command surfaces separate so public docs stay approachable while agent runbooks stay aligned with Vite Plus.

## TanStack Docs

Use `pnpm tanstack` (aliased to `vpx @tanstack/cli@latest`) to look up TanStack documentation. Always pass `--json` for machine-readable output.

```bash
# List TanStack libraries (optionally filter by --group state|headlessUI|performance|tooling)
pnpm tanstack libraries --json

# Fetch a specific doc page
pnpm tanstack doc router framework/react/guide/data-loading --json
pnpm tanstack doc query framework/react/overview --docs-version v5 --json

# Search docs (optionally filter by --library, --framework, --limit)
pnpm tanstack search-docs "server functions" --library start --json
pnpm tanstack search-docs "loaders" --library router --framework react --json
```
