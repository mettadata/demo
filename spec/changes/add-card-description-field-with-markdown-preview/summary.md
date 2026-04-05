# Verification: add-card-description-field-with-markdown-preview

## Spec Scenarios

- [x] Todo model extended with `description: string` field
- [x] Legacy todos migrate with empty string default
- [x] New todos created with empty description
- [x] Markdown rendering: bold, italic, code, links, headings, lists, newlines
- [x] HTML escaping prevents XSS in rendered markdown
- [x] Links render with `rel="noopener noreferrer" target="_blank"`
- [x] Description truncated preview on kanban cards (~80 chars)
- [x] DescriptionEditor with textarea + live markdown preview
- [x] Search bar also matches description text
- [x] Dark mode support on all new UI elements
- [x] Event propagation stopped in kanban context

## Gate Results

- Tests: PASS (64 total across 3 files — 19 markdown tests, 4 new store tests)
- Typecheck: PASS (0 errors)
- Lint: PASS

## Summary

Added `description` field to Todo model with backward-compatible migration. Created zero-dependency markdown renderer (`src/lib/utils/markdown.ts`) supporting common syntax with XSS-safe HTML escaping. DescriptionEditor component provides view/edit toggle with live preview. Integrated into both kanban cards (truncated preview + expandable editor) and list items. Search now covers description text.
