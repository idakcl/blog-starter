<!-- based on https://github.com/TanStack/tanstack.com/blob/main/.claude/typescript.md -->

# TypeScript Conventions

## Avoid Type Casting

Never cast types unless absolutely necessary. This includes:

- Manual generic type parameters (e.g., `<Type>`)
- Type assertions using `as`
- Type assertions using `satisfies`

## Prefer Type Inference

Infer types by going up the logical chain:

1. **Schema validation** as source of truth (e.g. Zod)
2. **Type inference** from function return types, API responses
3. **Fix at source** (schema, API definition, function signature) rather than casting at point of use

```typescript
// Bad
const result = api.getData() as MyType;
const value = getValue<MyType>();

// Good
const result = api.getData(); // Type inferred from return type
const value = getValue(); // Type inferred from implementation
```

## Generic Type Parameter Naming

All generic type parameters must be prefixed with `T`.

```typescript
// Bad
function withCapability<Args extends unknown[], R>(
  handler: (user: AuthUser, ...args: Args) => R,
) { ... }

// Good
function withCapability<TArgs extends unknown[], TReturn>(
  handler: (user: AuthUser, ...args: TArgs) => TReturn,
) { ... }
```

Common names: `T`, `TArgs`, `TReturn`, `TData`, `TError`, `TKey`, `TValue`

## Schema Placement

- Keep schemas close to where they are defined and consumed.
- Shared validation schemas (Zod) live in `packages/core/src/` when used across packages.
- App-specific schemas can live in `apps/web/src/` near their route or feature.

## Import Boundaries

- Packages must not import from `apps/*`. Dependencies flow downward: `apps/web` → `packages/*` → `tooling/*`.
- Use `workspace:*` for internal package references.
- Use `#/*` path alias for app-local imports within `apps/web/src/`.

## File Naming

- Use `lib/` for modules with logic, state, or side effects.
- Use `utils/` for pure, stateless helper functions.
- Prefer specific names over generic ones (e.g., `date-helpers.ts` over `utils.ts`).
