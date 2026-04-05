# add-card-description-field-with-markdown-preview

## Problem
Cards only have a title (text field). Users cannot add notes, details, or context to their todos. There is no way to store longer-form information on a card.

## Proposal
Add an optional `description` field to todos that supports markdown content. Cards show a truncated preview of the description. An expanded edit mode allows writing/editing the description with a live markdown preview panel alongside the textarea.

- Markdown rendering uses a lightweight parser (no external dependency — simple regex-based rendering for bold, italic, code, links, lists, and headings)
- Description is optional, defaults to empty string
- Existing todos without description get empty string on migration
- Both list and kanban views support description display and editing

## Impact
- `Todo` interface gains `description: string` field
- KanbanCard and TodoItem render description preview (first ~80 chars)
- Card expand/edit mode includes textarea + markdown preview
- Search bar also searches description text
- localStorage schema evolves (backward compatible)

## Out of Scope
- Full GFM spec (tables, footnotes, task lists)
- File attachments or images
- Rich text editor (WYSIWYG)
- Description-only cards (title still required)
