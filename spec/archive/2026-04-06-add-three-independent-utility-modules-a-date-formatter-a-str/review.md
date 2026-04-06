# Code Review: add-three-independent-utility-modules-a-date-formatter-a-str

## Summary
Three well-structured, pure-function utility modules with colocated tests. The code is clean, correct, and follows project conventions. A few minor issues around missing validation, missing barrel export, and test gaps.

## Issues Found

### Critical (must fix)
(none)

### Warnings (should fix)

- **Missing barrel export** -- The intent specifies that all modules should be barrel-exported from `src/lib/utils/index.ts`. This file does not exist. While not a runtime bug, it is an explicit deliverable in the spec.

- `src/lib/utils/dateFormat.ts:22` -- `formatIsoDate` validates the string format with a regex but does not validate that the date is actually valid (e.g., `"2026-02-30"` passes the regex and returns `"2026-02-30"`). The docstring says "validated" which is misleading. Consider parsing with `new Date()` and checking for `NaN` to reject impossible dates.

- `src/lib/utils/dateFormat.ts:31` -- `formatShortDate` does not validate its input at all. Passing a garbage string like `"not-a-date"` results in `new Date("not-a-dateT00:00:00")` which is `NaN`, and `toLocaleDateString` on an invalid date returns `"Invalid Date"` rather than throwing. Consider adding input validation consistent with `formatIsoDate`.

- `src/lib/utils/dateFormat.ts:5` -- `formatDisplayDate` also has no input validation. An invalid `isoDate` string will silently produce `NaN`-based comparisons, returning "Invalid Date" from `toLocaleDateString` on the fallback path, but potentially returning "Today" or other incorrect labels depending on the NaN arithmetic.

- `src/lib/utils/truncate.ts:18-19` -- When `wordBoundary` is true and there is no space in the truncated segment (e.g., a single very long word), the function falls through and keeps the mid-word cut. This is a reasonable fallback but is undocumented and untested.

### Suggestions (nice to have)

- `src/lib/utils/truncate.test.ts` -- Missing test for empty string input to both `truncate` and `truncateWords`.

- `src/lib/utils/truncate.test.ts` -- Missing test for `truncate` with `wordBoundary: true` when the text has no spaces (single long word), to document the fallback behavior.

- `src/lib/utils/truncate.test.ts` -- Missing test for `truncateWords` with `maxWords: 0`.

- `src/lib/utils/color.test.ts` -- Missing test for `hexToRgb` with 3-digit shorthand without `#` (e.g., `"f00"`).

- `src/lib/utils/color.test.ts` -- Missing test for pure green (`{ r: 0, g: 255, b: 0 }`) and pure blue in `rgbToHsl` to exercise all three hue-calculation branches (max===r, max===g, max===b). Only max===r is tested with a known expected value.

- `src/lib/utils/dateFormat.test.ts` -- No test for `formatDisplayDate` when called without the `now` parameter (default path using `new Date()`). A smoke test would improve confidence in the default behavior.

- `src/lib/utils/color.ts:26-27` -- `rgbToHex` silently clamps out-of-range values. This is a valid design choice, but an alternative would be to throw on invalid input for consistency with `hexToRgb`. Worth documenting the clamping behavior in the JSDoc.

## Strengths

- All three modules are pure functions with zero side effects and zero runtime dependencies, exactly as specified.
- The `+T00:00:00` suffix in `dateFormat.ts` correctly prevents timezone-offset parsing issues with date-only ISO strings -- a common pitfall.
- `rgbToHex` defensively clamps values, preventing invalid hex output from out-of-range inputs.
- The `hue2rgb` helper in `hslToRgb` correctly implements the standard HSL-to-RGB algorithm.
- Test files use `.js` extensions in imports, following the project's ESM convention.
- Color conversion roundtrip tests provide good confidence in the math.
- The `truncate` function correctly handles edge cases where `maxLength` is smaller than or equal to the suffix length.

## Verdict
PASS_WITH_WARNINGS
