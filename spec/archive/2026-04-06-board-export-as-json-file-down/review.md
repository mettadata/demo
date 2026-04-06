# Code Review: board-export-as-json-file-down

## Summary
Clean, well-scoped feature that correctly exports board state as a JSON download. The implementation follows the Blob/URL pattern properly, includes all required payload fields, and revokes the object URL after use. Tests are thorough and cover payload structure, label filtering, filename, and URL cleanup.

## Issues Found

### Critical (must fix)
(none)

### Warnings (should fix)
- `src/routes/+page.svelte:80` — The `ExportBoardButton` is rendered as a standalone block-level element between `BoardStatsDashboard` and `KanbanBoard`. The intent specifies it should be "placed in the kanban view's toolbar area (the same row as any existing kanban-only controls)." It would fit more naturally inside a flex row, e.g. alongside BoardStatsDashboard or in a dedicated toolbar div, rather than sitting alone on its own line. As-is, it renders as a full-width row containing a small button, which looks awkward.

### Suggestions (nice to have)
- `src/lib/components/ExportBoardButton.svelte:6-12` — The `cards` array is built by flatMapping over `$kanbanBoard`, which also iterates columns for `cardIds`. For very large boards this is fine, but if a card appears in multiple columns (shouldn't happen, but defensive), it would be duplicated in the export. Consider deduplicating by card id if robustness is desired.
- `src/lib/components/ExportBoardButton.svelte:20-30` — Two `new Date()` calls (line 20 for `exportedAt`, line 30 for filename date) could theoretically straddle midnight, producing an `exportedAt` timestamp on one date and a filename with a different date. Capturing the date once would be more consistent.
- `src/lib/components/__tests__/ExportBoardButton.test.ts:165` — The test asserts `payload.labels` is defined but does not verify the label count or contents in the "exports correct JSON payload structure" test. The dedicated "only includes referenced labels" test covers this well, but a stricter assertion (e.g. `toHaveLength(1)`) in the main structure test would catch regressions more precisely.

## Positive Notes
- Proper `URL.revokeObjectURL` call prevents memory leaks.
- Aria-label on the button satisfies accessibility requirements.
- Dark mode Tailwind variants are consistent with existing toolbar buttons.
- Label filtering correctly exports only referenced labels, not all labels.
- Test coverage is strong: verifies payload structure, label filtering, filename format, and URL cleanup.
- No server-side code or store modifications -- purely a read path as intended.

## Verdict
PASS_WITH_WARNINGS
