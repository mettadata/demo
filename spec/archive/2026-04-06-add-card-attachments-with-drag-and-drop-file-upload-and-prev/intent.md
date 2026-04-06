# add-card-attachments-with-drag-and-drop-file-upload-and-prev

## Problem

Users cannot attach files or images to kanban cards. Supporting documents, screenshots, and reference images must be stored outside the app, breaking the context needed to understand and complete a card. Any team member (or the solo user in a personal workflow) reviewing a card must locate related files separately, increasing friction and the risk of missing context.

This affects cards in all columns — a card with a design mockup, a bug report screenshot, or a reference PDF currently has no way to surface that material inline.

## Proposal

Add a per-card attachment system that stores files as base64 data URLs in localStorage alongside the existing `Todo` record.

**Data model changes:**

- The `Todo` interface MUST gain an `attachments: Attachment[]` field.
- The `Attachment` interface MUST include: `id: string`, `name: string`, `mimeType: string`, `dataUrl: string`, `size: number` (bytes), and `createdAt: string` (ISO 8601).
- `loadTodos()` MUST backfill `attachments: []` on any existing record that lacks the field.
- `addAttachment(todoId, attachment)` and `removeAttachment(todoId, attachmentId)` MUST be added to `todos.ts`; both MUST call `snapshot()` to integrate with the existing undo/redo stack.

**Upload interaction:**

- The card detail panel (the `showEdit` section of `KanbanCard.svelte`) MUST expose a drag-and-drop drop zone that accepts files dragged from the OS file manager.
- The drop zone MUST also include a file picker `<input type="file">` button for users who cannot or do not wish to drag and drop.
- Both paths MUST support selecting multiple files in a single operation.
- Each selected file MUST be read via the `FileReader` API and converted to a base64 data URL before being stored.

**Size and type constraints:**

- Files larger than 5 MB MUST be rejected with an inline error message. This limit is enforced to guard localStorage quota.
- Any MIME type MAY be attached. No server-side validation is possible; client-side MIME sniffing from the `File` object SHOULD be used for display decisions only.

**Preview and display:**

- Attachments MUST be displayed in a grid/list within the card detail panel.
- For attachments whose `mimeType` begins with `image/`, the UI MUST render an `<img>` thumbnail using the stored `dataUrl`.
- For all other MIME types, the UI MUST display a generic file icon alongside the file name and a human-readable file size.
- Each attachment MUST provide a download affordance (an anchor with `download` attribute) so the user can retrieve the file from the browser.
- Each attachment MUST include a delete button that calls `removeAttachment`.

**Drag-and-drop specifics:**

- The drop zone MUST visually indicate dragover state (highlighted border or background) when a compatible drag is active over it.
- The drop zone MUST NOT interfere with the existing card-reordering drag-and-drop. The `ondragstart` handler on the outer card element MUST be suppressed when a drag originates inside the attachment drop zone.
- Touch-based drag (the existing `onpointerdown`/`onpointermove` flow) is unaffected; file drag-and-drop is a desktop-only OS interaction.

**Activity log integration:**

- `addAttachment` SHOULD append an `edited` `ActivityEvent` to `activityLog` with `detail: { field: 'attachments', action: 'added', name: file.name }`.
- `removeAttachment` SHOULD append an `edited` `ActivityEvent` with `detail: { field: 'attachments', action: 'removed', name: attachment.name }`.

**Persistence:**

- The `attachments` array MUST be serialized as part of the todo record written to localStorage under the existing `STORAGE_KEY`.
- If `localStorage.setItem` throws (quota exceeded), the error MUST be caught, the attachment MUST NOT be added to the store, and an inline error message MUST inform the user that storage is full.

## Impact

- `Todo` interface in `src/lib/stores/todos.ts` gains `attachments: Attachment[]`; all code that constructs a `Todo` literal (e.g., `addTodo`, `loadTodos` migration) must include the field.
- `KanbanCard.svelte` gains a new section in the `showEdit` panel; drag event handling must be carefully scoped to prevent attachment drop events from conflicting with the card-reorder drag handlers.
- The undo/redo snapshot captured by `registerSnapshotFn` will include the full `attachments` array. Undoing an add or remove will restore the previous attachment list, including base64 data. Snapshots may become large if multiple attachments are present; this is a known consequence of the localStorage-only architecture.
- localStorage usage will grow proportionally to attachment size. Users adding many large files risk hitting the 5–10 MB browser quota; the 5 MB per-file cap and the quota-exceeded error handler mitigate but do not eliminate this risk.
- The existing `ActivityLog` component and `ActivityEvent` type are unaffected structurally; new events use the existing `edited` type.

## Out of Scope

- Backend or cloud file storage of any kind
- Cross-device or cross-browser attachment sync
- File editing or in-app annotation
- Video or audio playback within the card panel
- Generating file thumbnails for non-image types (PDF preview, video frame, etc.)
- Drag-and-drop reordering of attachments within the list
- Attachment search or filtering across all cards
- Access control or per-user attachment visibility (no auth exists)
- Virus scanning or server-side content validation
- Compressing or resizing images before storage
- Attaching files from URLs (remote fetch)
