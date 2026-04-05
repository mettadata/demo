# add-card-labels-with-custom-colors-and-a-label-manager

## Problem
Users cannot categorize or tag cards beyond priority levels. There is no way to group related cards across columns (e.g., "Bug", "Feature", "Design") or visually distinguish cards by topic.

## Proposal
Add a label system with custom colors:

- **Label model**: Each label has an `id`, `name`, and `color` (from a preset palette of 8 colors)
- **Label store**: Global labels stored in localStorage, separate from todos. CRUD operations for labels.
- **Card labels**: Each todo can have zero or more label IDs attached. Labels render as small colored chips on cards.
- **Label manager**: A modal/panel accessible from the header to create, rename, recolor, and delete labels.
- **Card label picker**: Inline dropdown on cards to add/remove labels from a todo.
- Preset color palette: red, orange, amber, green, teal, blue, purple, pink — each with light/dark Tailwind variants.

## Impact
- New `labels` store with its own localStorage persistence
- `Todo` interface gains `labelIds: string[]` field
- KanbanCard and TodoItem render label chips
- New LabelManager and LabelPicker components
- Search bar also matches label names on cards

## Out of Scope
- Filtering by label (can be added later)
- Custom hex color input (preset palette only)
- Label ordering or grouping
- Label icons or emojis
