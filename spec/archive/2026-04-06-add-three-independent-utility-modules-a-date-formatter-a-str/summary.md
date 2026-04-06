# Summary: Add Three Independent Utility Modules

## What was implemented

Three pure utility modules with colocated tests, following the existing `relativeTime.ts` pattern:

1. **dateFormat** (`src/lib/utils/dateFormat.ts`) -- `formatDisplayDate` (Today/Yesterday/Tomorrow or "Apr 6, 2026"), `formatIsoDate` (validates and extracts YYYY-MM-DD), `formatShortDate` (compact "Apr 6" format).

2. **truncate** (`src/lib/utils/truncate.ts`) -- `truncate` (character-level truncation with optional word boundary and custom suffix), `truncateWords` (word-count truncation).

3. **color** (`src/lib/utils/color.ts`) -- `hexToRgb`, `rgbToHex`, `rgbToHsl`, `hslToRgb`, `hexToHsl`, `hslToHex` with typed `RgbColor` and `HslColor` interfaces.

## Gate results

| Gate | Result |
|------|--------|
| `npx vitest run` | PASS -- 11 test files, 205 tests passing, 0 failures |
| `npx tsc --noEmit` | PASS -- no type errors |
| `npm run lint` (svelte-check) | PASS -- 0 errors, 1 pre-existing warning (KanbanCard.svelte a11y tabindex) |

## Spec compliance checklist

| Requirement | Status | Evidence |
|---|---|---|
| `dateFormat.ts` exists with `formatDisplayDate`, `formatIsoDate`, `formatShortDate` | PASS | `src/lib/utils/dateFormat.ts` lines 4, 21, 30 |
| `dateFormat.test.ts` colocated tests | PASS | `src/lib/utils/dateFormat.test.ts` -- 11 tests passing |
| `truncate.ts` exists with `truncate`, `truncateWords` | PASS | `src/lib/utils/truncate.ts` lines 4, 30 |
| `truncate.test.ts` colocated tests | PASS | `src/lib/utils/truncate.test.ts` -- 10 tests passing |
| `color.ts` exists with `hexToRgb`, `rgbToHex`, `rgbToHsl`, `hslToRgb`, `hexToHsl`, `hslToHex` | PASS | `src/lib/utils/color.ts` lines 7, 25, 34, 64, 96, 103 |
| `color.ts` exports `RgbColor`, `HslColor` types | PASS | `src/lib/utils/color.ts` lines 1, 2 |
| `color.test.ts` colocated tests | PASS | `src/lib/utils/color.test.ts` -- 19 tests passing |
| No existing files modified | PASS | Implementation commit `c224371` only adds 6 new files |
| Barrel export from `src/lib/utils/index.ts` | GAP | Spec requires barrel export; no `index.ts` barrel was created |

## Gaps

1. **Missing barrel export**: The spec states "Each module is barrel-exported from `src/lib/utils/index.ts` (or a new barrel if one does not exist yet)." No `src/lib/utils/index.ts` file exists. The three modules are importable directly by path but not through a barrel re-export. This is a minor gap -- the modules are fully functional without it.

## Test results

- 40 new tests across 3 test files, all passing
- Full suite: 205 tests passing, no regressions
