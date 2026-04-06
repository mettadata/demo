# add-three-independent-utility-modules-a-date-formatter-a-str

## Problem

Three recurring presentation concerns in the app lack dedicated, testable utility
functions:

1. **Date formatting.** `DueDateDisplay.svelte` calls `toLocaleDateString` inline with
   hardcoded options. `relativeTime.ts` already passes raw ISO date strings (e.g.,
   `"2025-06-15"`) directly into `formatActivityDescription` output without any
   consistent formatting layer. Any component that needs a formatted date must
   re-implement locale/format logic on the spot, making it impossible to change the
   display format in one place or cover the logic with unit tests.

2. **String truncation.** `KanbanCard.svelte` calls `truncateDescription` from
   `markdown.ts` for card descriptions in compact view. That function strips markdown
   and truncates at a hard-coded character boundary with no word-boundary awareness.
   Card titles (`todo.text`) are rendered raw with no truncation at all, relying on
   Tailwind's `truncate` class (CSS overflow) instead of a controlled, testable
   function. A general-purpose truncation utility is missing from the utils layer.

3. **Color conversion.** Label colors in `labels.ts` are defined as a fixed
   discriminated-union type (`LabelColor = 'red' | 'orange' | ...`) mapped to
   Tailwind class strings. This prevents programmatic color manipulation — there is no
   way to derive accessible foreground colors, lighten/darken a label color, or accept
   custom hex values from a future color-picker UI. The app has no conversion path
   between hex, RGB, and HSL values.

Developers building new features (due-date badges, activity log timestamps, card title
overflow, custom label colors) must either duplicate ad-hoc logic or accept
inconsistent output. The absence of colocated tests for these concerns means regressions
go undetected.

## Proposal

Add three independent pure-function utility modules under `src/lib/utils/`, each with a
colocated Vitest test file:

### 1. `src/lib/utils/dateFormat.ts` + `dateFormat.test.ts`

Export the following functions:

- `formatDisplayDate(isoDate: string, now?: Date): string` — formats an ISO date string
  (`"YYYY-MM-DD"`) for human display. Returns `"Today"` when the date equals the
  current calendar day, `"Yesterday"` for the prior day, and a locale string such as
  `"Apr 6, 2026"` for all other dates. Accepts an optional `now` parameter for
  deterministic testing.

- `formatIsoDate(isoDate: string): string` — returns the date in `"YYYY-MM-DD"` format
  (a no-op pass-through with validation, useful for normalising inputs before storage).

- `formatShortDate(isoDate: string): string` — returns a compact form such as
  `"Apr 6"` (month abbreviation + day, no year) for use in space-constrained UI
  contexts like `DueDateDisplay.svelte`.

### 2. `src/lib/utils/truncate.ts` + `truncate.test.ts`

Export the following functions:

- `truncate(text: string, maxLength: number, options?: { wordBoundary?: boolean, suffix?: string }): string`
  — truncates `text` to at most `maxLength` characters. When `wordBoundary` is `true`
  (default `false`), the cut is moved back to the last whitespace boundary before
  `maxLength` to avoid splitting mid-word. The appended suffix defaults to `"..."`.
  Returns the original string unchanged when its length is within `maxLength`.

- `truncateWords(text: string, maxWords: number, suffix?: string): string` — truncates
  to at most `maxWords` whole words, appending `suffix` (default `"..."`) when
  truncated.

### 3. `src/lib/utils/color.ts` + `color.test.ts`

Export the following types and functions:

- `type RgbColor = { r: number; g: number; b: number }` — channels in `[0, 255]`.
- `type HslColor = { h: number; s: number; l: number }` — hue in `[0, 360)`, saturation
  and lightness in `[0, 100]`.

- `hexToRgb(hex: string): RgbColor` — parses a 3- or 6-digit hex string (with or
  without leading `#`) and returns an `RgbColor`. Throws a `TypeError` on invalid
  input.

- `rgbToHex(rgb: RgbColor): string` — returns a lowercase 6-digit hex string with
  leading `#` (e.g., `"#a3b4c5"`).

- `rgbToHsl(rgb: RgbColor): HslColor` — converts RGB to HSL using the standard
  algorithm. Hue is rounded to the nearest integer degree; saturation and lightness are
  rounded to one decimal place.

- `hslToRgb(hsl: HslColor): RgbColor` — converts HSL back to RGB. Output channels are
  rounded to the nearest integer.

- `hexToHsl(hex: string): HslColor` — convenience composition of `hexToRgb` +
  `rgbToHsl`.

- `hslToHex(hsl: HslColor): string` — convenience composition of `hslToRgb` +
  `rgbToHex`.

All six modules are self-contained with zero runtime dependencies beyond the TypeScript
standard library. Each module is barrel-exported from `src/lib/utils/index.ts` (or a
new barrel if one does not exist yet).

## Impact

**`DueDateDisplay.svelte`** — the inline `toLocaleDateString` call can be replaced with
`formatShortDate` from `dateFormat.ts` to centralise the formatting logic. This is a
follow-up refactor opportunity; this change does not modify the component.

**`markdown.ts` / `truncateDescription`** — the new `truncate` utility provides a
proper replacement path. `truncateDescription` is not removed or changed by this
change; it remains the markdown-stripping variant used in `KanbanCard.svelte`.

**`labels.ts` / `LABEL_COLOR_CLASSES`** — `color.ts` does not change the existing
`LabelColor` union or Tailwind class mappings. It is additive infrastructure that future
label-color features may build on.

**Test suite** — three new `*.test.ts` files are added, increasing overall test count.
No existing tests are modified.

**`src/lib/utils/` directory** — gains six new files (`dateFormat.ts`,
`dateFormat.test.ts`, `truncate.ts`, `truncate.test.ts`, `color.ts`, `color.test.ts`).
If a `src/lib/utils/index.ts` barrel does not already exist it will be created to
export the new public APIs.

## Out of Scope

- **Modifying any existing component.** `DueDateDisplay.svelte`, `KanbanCard.svelte`,
  `ActivityLog.svelte`, and all other Svelte files are unchanged in this change.

- **Modifying `markdown.ts` or `relativeTime.ts`.** The existing utilities are not
  refactored to use the new modules; that is a separate change.

- **Internationalisation (i18n).** `dateFormat.ts` uses the `en-US` locale. Supporting
  configurable locales is not in scope.

- **Timezone handling beyond local-calendar semantics.** `formatDisplayDate` determines
  "Today" and "Yesterday" using `new Date()` local time and calendar date comparison.
  UTC-offset edge cases and user-timezone preferences are not addressed.

- **Custom color picker UI.** `color.ts` provides conversion utilities only. No UI
  component for picking arbitrary hex colors is included.

- **Validation or schema changes to `LabelColor`.** The `LabelColor` union type and
  `LABEL_COLOR_CLASSES` mapping in `labels.ts` are not changed; `color.ts` is purely
  additive.

- **CSS-in-JS or dynamic Tailwind class generation.** `color.ts` returns numeric
  values; wiring those into Tailwind classes or CSS custom properties is a separate
  concern.

- **Barrel-export changes to `src/lib/index.ts` or any route-level module.** Only
  `src/lib/utils/` is affected.
