# add-board-templates-with-preset-columns-and-sample-cards-for

## Problem
New users open the Kanban board and see a generic three-column layout ("To Do", "In Progress", "Done") with no cards. They must manually add columns, rename them, and create sample cards before the board reflects their actual workflow. This cold-start friction is highest for teams adopting Scrum, individuals managing personal tasks, or anyone whose process does not map to the default three columns. Users abandon board setup or use suboptimal column structures because manual configuration takes too long.

## Proposal
Add a board template selection step that appears when the board has no existing columns customized beyond the default state. Users choose from three curated presets, each provisioning named columns and sample cards so the board is immediately usable.

Templates:

1. **Kanban** — Columns: Backlog, To Do, In Progress, Review, Done. Sample cards demonstrate a typical feature delivery flow (e.g., "Define acceptance criteria", "Implement feature", "Request peer review").
2. **Scrum** — Columns: Sprint Backlog, In Progress, In Review, Testing, Done. Sample cards reflect sprint ceremony artifacts (e.g., "Refine user stories", "Write unit tests", "Deploy to staging").
3. **Personal** — Columns: Ideas, Today, This Week, Completed. Sample cards illustrate daily planning habits (e.g., "Read for 20 minutes", "Respond to emails", "Plan weekend").

Implementation scope:

- Add a `BOARD_TEMPLATES` constant in `kanban.ts` mapping template name to column definitions and sample card titles.
- Add an `applyTemplate(templateName: string): void` export in `kanban.ts` that clears existing columns and cards, creates fresh `KanbanColumn` entries, creates corresponding `Todo` entries via the todos store, and places their IDs in the correct column's `cardIds`.
- Show a `BoardTemplateSelector.svelte` modal/panel in `KanbanBoard.svelte` when `kanbanState.columns` matches the unmodified default state (three default column IDs with zero cards total).
- Users can dismiss the selector and keep the blank default board.
- After a template is applied, the selector does not reappear unless the user explicitly triggers it via a "Change template" action in the board header.
- The "Change template" action warns the user that applying a new template will replace all current columns and cards.

## Impact

- `kanban.ts` gains `BOARD_TEMPLATES` constant, `applyTemplate` function, and a helper to detect the pristine default state.
- `KanbanBoard.svelte` conditionally renders `BoardTemplateSelector.svelte` on first load when the board is in the default blank state.
- The todos store is written to when sample cards are created; existing sync logic in `syncWithTodos` handles new card IDs automatically.
- localStorage is overwritten when a template is applied — any cards or columns in the current session are replaced.
- No changes to `KanbanColumn`, `KanbanState`, or `Todo` interfaces; all existing mutation functions (`addColumn`, `moveCard`, etc.) continue to work unchanged.

## Out of Scope

- User-defined custom templates (saving the current board layout as a template).
- Editing or deleting the built-in templates.
- Importing templates from external sources or files.
- Per-column WIP (work-in-progress) limits as part of template configuration.
- Template-specific styling, colors, or column icons.
- Migrating or merging existing cards when switching templates; applying a template is a destructive full reset.
- Onboarding wizard or multi-step setup flow beyond template selection.
