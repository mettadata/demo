# Card Attachments Implementation Summary

## Changes Made

### src/lib/stores/todos.ts
- Added `Attachment` interface with id, name, mimeType, dataUrl, size, createdAt fields
- Added `attachments: Attachment[]` to the `Todo` interface
- Extended `ActivityEventType` with `attachment_added` and `attachment_removed`
- Added `_lastPersistError` tracking in the store subscription for quota-exceeded detection
- Exported `getLastPersistError()` for callers to check persistence failures
- `loadTodos()` backfills `attachments: []` on legacy records missing the field
- `addTodo()` includes `attachments: []` in new todo literals
- `addAttachment(todoId, attachment)` adds attachment optimistically, reverts on quota exceeded, returns boolean success
- `removeAttachment(todoId, attachmentId)` removes attachment and logs activity

### src/lib/components/CardAttachments.svelte (new)
- Drop zone with dragover visual highlight (blue border/background)
- File picker button as alternative to drag-and-drop
- 5 MB per-file validation with inline error message
- localStorage quota-exceeded inline error on failed persist
- Image thumbnails for image/* MIME types, generic file icon for others
- Download link and delete button per attachment
- Event propagation stopped to avoid interfering with card-reorder drag-and-drop
- Only activates drop zone for File drags (not kanban card drags)

### src/lib/components/KanbanCard.svelte
- Imported and placed `CardAttachments` in the `showEdit` detail panel

### src/lib/components/ActivityLog.svelte
- Added icons for `attachment_added` and `attachment_removed` event types

### src/lib/utils/relativeTime.ts
- Added `formatActivityDescription` cases for attachment_added and attachment_removed

### Test files updated
- `todos.test.ts`: 5 new tests covering addTodo attachments default, legacy migration backfill, addAttachment success, addAttachment quota revert, removeAttachment with activity log
- `kanban.test.ts`: Fixed Todo literals to include attachments and activityLog fields

## Test Results
- 125 tests passing (was 120)
- 0 type errors from svelte-check
