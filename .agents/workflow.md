# Workflow

## Essential Commands

| Command        | Purpose                             |
| -------------- | ----------------------------------- |
| `pnpm dev:web` | Start the web app locally           |
| `pnpm lint`    | Type-checking & type-aware linting  |
| `pnpm check`   | Run all checks (format, lint, etc.) |
| `pnpm build`   | Build all packages                  |
| `pnpm test`    | Run Vitest unit tests               |

## Validation Timing

Prefer narrow validation first.

- Use package-local `pnpm -F <pkg> <script>` in the app or package you changed when the work is scoped.
- Use root `pnpm lint` and `pnpm check` after substantial multi-package work or when a task explicitly asks for broad validation.
- Do not run broad validation for markdown-only edits, small documentation tweaks, or other changes that cannot affect formatting, linting, typechecking, build output, or runtime behavior unless the user explicitly asks.

Run focused checks first, then broaden to the root tasks when the changed surface crosses package boundaries.

## Build Usage

- `pnpm build` is only for build/bundler issues or verifying production output.
- Don't build after every change. If `pnpm lint` passes, assume changes work.

## Database Schema Changes

1. Edit schemas in `packages/db/src/schema/`
2. Add a new forward-only SQL migration under `packages/db/migrations/`. Do not rewrite a migration that may already have been applied to local, preview, or production D1.
3. **Check Wrangler environment** — ensure you're targeting the intended local/dev D1 database before applying locally, and use `--remote` only when the deployment step or user explicitly calls for production.
4. Apply with Wrangler D1 migrations for the target database. Features will silently fail without applied migrations.

## Other DB Commands

| Command                                                                                            | Purpose                       |
| -------------------------------------------------------------------------------------------------- | ----------------------------- |
| `pnpm --filter @repo/web exec wrangler d1 migrations list CMS_DB --config wrangler.jsonc`          | Check local migration status  |
| `pnpm --filter @repo/web exec wrangler d1 migrations apply CMS_DB --config wrangler.jsonc`         | Apply local D1 migrations     |
| `pnpm --filter @repo/web exec wrangler d1 migrations list CMS_DB --remote --config wrangler.jsonc` | Check remote migration status |

## Planning Artifacts

- Small fixes and docs edits can go straight from current task context to implementation and focused validation.
- Medium product changes may use a short Markdown spec when the product intent, page flow, or acceptance criteria need to survive beyond one chat.
- Large or risky changes that affect data, auth, or multiple packages should have an explicit proposal or spec before implementation.

## UI Components And shadcn

For UI component selection, shadcn install decisions, and visual coherence rules, use [UI guidelines](./ui.md). Keep the detailed UI policy there rather than duplicating it in workflow docs.

## Testing

Follow [Testing policy](./testing.md). Do not add or run tests unless requested, except when an existing task explicitly calls for them.

## Formatting

Oxfmt (via Vite+) is configured for consistent code formatting via `vp fmt`. It runs automatically on commit via Vite+ pre-commit hooks, so manual formatting is not necessary.

## Commits

Use conventional commit format when committing.
After a scoped change passes the appropriate validation, commit it directly unless the user explicitly asks not to. Keep each commit coherent, inspect staged paths before committing in a dirty worktree, and leave unrelated local changes unstaged.
