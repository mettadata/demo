# Board Export as JSON File

## What was implemented

Added an "Export" button to the kanban board view that downloads the entire board state as a JSON file.

## Files changed

- `src/lib/components/ExportBoardButton.svelte` -- New component with export logic. Serializes columns, cards, and referenced labels into a JSON payload with version and timestamp. Uses Blob + anchor click pattern for browser download.
- `src/lib/components/__tests__/ExportBoardButton.test.ts` -- 6 unit tests covering rendering, aria-label, payload structure, label filtering, filename format, and URL cleanup.
- `src/routes/+page.svelte` -- Mounted ExportBoardButton in the kanban view branch, between BoardStatsDashboard and KanbanBoard.

## Export payload format

```json
{
  "version": "1",
  "exportedAt": "ISO-8601 timestamp",
  "columns": [{ "id", "title", "cardIds" }],
  "cards": [full Todo objects],
  "labels": [only labels referenced by exported cards]
}
```

## Verification

- TypeScript: `npx tsc --noEmit` passes with zero errors
- Tests: All 223 tests pass (6 new + 217 existing)
