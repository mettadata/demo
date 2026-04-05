# add-due-dates-and-priority-levels-to-cards-with-color-coded

## Problem
Cards in the kanban board and list view have no way to indicate urgency or deadlines. Users cannot prioritize work or see what's overdue at a glance.

## Proposal
Add optional due date and priority level fields to todos/cards:
- **Priority levels:** None, Low, Medium, High with color-coded labels (green, yellow, orange, red)
- **Due dates:** Date-only picker, with red highlight for overdue items
- **Sorting:** Toggle to sort by due date within kanban columns and list view
- Both fields are optional when creating or editing a todo

## Impact
- `Todo` interface gains `dueDate` and `priority` fields
- KanbanCard and TodoItem components render priority badges and due date indicators
- Existing todos remain valid (fields default to none/null)
- localStorage schema evolves with backward compatibility

## Out of Scope
- Date+time (time-of-day) granularity
- Recurring due dates or reminders
- Priority-based filtering (can be added later)
- Calendar view
