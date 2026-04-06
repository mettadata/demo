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

### Gate Results
| Gate | Status |
|------|--------|
| Tests | PASS (223/223, 13 suites) |
| TypeCheck | FAIL |

**TypeCheck failure**: `src/lib/components/__tests__/ExportBoardButton.test.ts:53` -- `mockImplementation((blob: Blob) => string)` is incompatible with the inferred mock signature `() => string`. The mock `createObjectURLMock` was created via `vi.fn(() => 'blob:mock-url')` which infers zero parameters, but `mockImplementation` is later called with a `(blob: Blob)` callback. This is a test-only type error; runtime behavior is correct.

### Intent Compliance
- [x] Single "Export JSON" button triggers browser file download of board state as JSON
- [x] Payload includes columns with id, title, and ordered cardIds
- [x] Payload includes full Todo objects for non-archived cards in columns
- [x] Payload includes only labels referenced by exported cards
- [x] Payload includes metadata: exportedAt (ISO 8601) and version "1"
- [x] Uses Blob + URL.createObjectURL + programmatic anchor-click pattern (no server request)
- [x] Filename follows board-export-YYYY-MM-DD.json format
- [x] New file: src/lib/components/ExportBoardButton.svelte (self-contained)
- [x] Mounted in src/routes/+page.svelte, rendered only when viewPreference is kanban
- [x] Dark mode: button uses dark: Tailwind variants consistent with existing toolbar buttons
- [x] No new stores, no new routes, no server-side code

### Verdict: FAIL

The implementation is fully compliant with the intent spec. All 223 tests pass. However, the TypeCheck gate fails due to a type mismatch in the test file at line 53. The fix is trivial (add a type parameter to `vi.fn<(blob: Blob) => string>(() => 'blob:mock-url')`) but this verification report does not modify implementation code.
