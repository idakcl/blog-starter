#!/usr/bin/env bash
set -euo pipefail

missing=0

check() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    if [ "$name" = "vp" ] && pnpm exec vp --version >/dev/null 2>&1; then
      printf 'ok: %s -> pnpm exec vp\n' "$name"
      return
    fi

    if [ "$name" = "wrangler" ] && pnpm --filter @repo/web exec wrangler --version >/dev/null 2>&1; then
      printf 'ok: %s -> pnpm --filter @repo/web exec wrangler\n' "$name"
      return
    fi

    printf 'missing: %s\n' "$name"
    missing=1
    return
  fi

  printf 'ok: %s -> %s\n' "$name" "$(command -v "$name")"
}

check node
check pnpm
check vp
check wrangler

if [ "$missing" -ne 0 ]; then
  exit 1
fi
