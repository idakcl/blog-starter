# UI Guidelines

Use this when adding or refactoring app-facing UI in `apps/web`.

This guide covers app-level UI decisions. For reusable component boundaries inside `packages/ui`, keep them app-agnostic.

## Default Sources

- Prefer existing components from `@repo/ui` before creating new app-local primitives.
- Use `lucide-react` for UI icons (use `Icon` suffix, e.g. `import { Loader2Icon } from "lucide-react"`); for brand icons use `@icons-pack/react-simple-icons` (e.g. `SiGithub`).
- Use `cn(...)` from `@repo/ui/lib/utils` for class composition.
- Add primitives via shadcn CLI (`pnpm -F @repo/web ui add <component>`).

## shadcn Usage

- The repo uses shadcn with CSS variables and Lucide icons.
- Add reusable shadcn-derived components to `packages/ui` when they can stay app-agnostic.
- Keep a component in `apps/web` when it depends directly on app routing, auth, SEO, or app config.
- Keep app-level wrappers and glue code in `apps/web/src`.

## Composition

- Build page UI in route files or co-located page components, composite sections in feature/widget components.
- Prefer composing `@repo/ui` primitives instead of duplicating styling across many leaf components.
- Keep route files thin. Put UI composition in page, feature, widget, or shared components, not in route files.
- Follow [TanStack patterns](./tanstack-patterns.md) for route/file placement.

## Images And Links

- Prefer app-owned wrappers for images or routing-aware links when the app needs router or env-specific behavior.
- Do not import app wrappers into `packages/ui`; use dependency injection instead.
- Keep CDN, proxy, and base URL logic outside shared UI primitives.

## Theme And Visual Direction

- Use semantic tokens such as `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, and shadcn component variants before adding custom palette classes.
- Public UI copy is for normal readers. Do not put implementation notes, agent reasoning, deployment commentary, or author-only instructions into visible pages.

## Mobile UI

- Build mobile-first, then add larger-screen breathing room with `md:` and `lg:` modifiers.
- Keep touch targets at least `44px`.
- Prefer compact list rows, grouped sections, clear single-column flows.
- Do not scale font size with viewport width. Use explicit responsive text classes.

## Extraction Rule

- Extract a component to `packages/ui` when it is reusable, app-agnostic, and the shared package can own its styling and accessibility.
- Keep a component app-local when it depends on route params, auth state, app SEO, or other app-owned integrations.
