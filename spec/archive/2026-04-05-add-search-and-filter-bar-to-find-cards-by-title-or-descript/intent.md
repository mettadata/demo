# add-search-and-filter-bar-to-find-cards-by-title-or-descript

## Problem
As the number of todos grows, users have no way to quickly find a specific card by text. The existing filter (all/active/completed) only filters by status, not by content.

## Proposal
Add a search input field that filters todos by text match (case-insensitive substring). The search applies in both list and kanban views, narrowing visible cards to those matching the query. The search bar sits below the todo input, above the view content.

## Impact
- `filteredTodos` and `sortedFilteredTodos` derived stores will incorporate the search query
- Kanban board will only show cards matching the search within each column
- Existing status filter (all/active/completed) continues to work alongside search

## Out of Scope
- Full-text search or fuzzy matching
- Search by priority or due date
- Search history or saved searches
- Server-side search
