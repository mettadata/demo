# Verification: add-search-and-filter-bar-to-find-cards-by-title-or-descript

## Spec Scenarios

- [x] Search input filters todos by case-insensitive substring match
- [x] Empty/whitespace search shows all todos
- [x] Search works alongside status filter (all/active/completed)
- [x] Search applies in list view via sortedFilteredTodos derived store
- [x] Search applies in kanban view via visibleCards derived in KanbanColumn
- [x] Clear button resets search query
- [x] Dark mode support on search input
- [x] Accessible: aria-label on input and clear button

## Gate Results

- Tests: PASS (40 total, 3 new search tests)
- Typecheck: PASS (0 errors)
- Lint: PASS (0 errors, 1 pre-existing warning)

## Summary

Added a `searchQuery` writable store to `todos.ts` that integrates into the existing `filteredTodos` derived store chain. Created a `SearchBar.svelte` component with clear button. Kanban columns filter visible cards via a `$derived.by` computation. No new dependencies added.
