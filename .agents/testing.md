# Testing Policy

## Core Policy

- Assume no tests unless explicitly requested.
- Never auto-add tests to feature work.
- Implementation requests should return implementation only unless tests are explicitly requested.
- Inspect nearby tests before generating new ones.
- Keep test setup close to the owning package or app.

## Test Commands

| Command            | Purpose                    |
| ------------------ | -------------------------- |
| `pnpm test`        | Run Vitest unit tests      |
| `pnpm test:watch`  | Run Vitest in watch mode   |
| `pnpm test:e2e`    | Run Playwright e2e tests   |
| `pnpm test:e2e:ui` | Run Playwright with UI     |
| `pnpm test:all`    | Run all tests (unit + e2e) |

## Test Locations

Unit tests:

- `src/**/__tests__/*.test.ts`

End-to-end tests:

- `e2e/*.spec.ts`

## Vitest Setup Rule

When tests are explicitly requested, and the package or app does not already have Vitest configured:

1. Install Vitest if it is not already available in the workspace.
2. Add `vitest.config.ts` only when the default Vitest discovery is not enough.
3. Keep test scripts in the owning package.

Explicit rules:

- Prefer default Vitest behavior before adding configuration.
- Do not introduce a shared test abstraction unless at least two packages need it.

## When Tests Are Explicitly Requested

Generate behavior-driven tests that prioritize:

- Happy paths
- Edge cases and fallback precedence
- Pathological inputs
- Regression-prone cases
- Contract invariants

Prefer:

- Table-driven tests
- Testing public contracts over internals
- Fixtures and builders to reduce duplication
- Adding regression tests for bug fixes
- Mirroring nearby test structure
