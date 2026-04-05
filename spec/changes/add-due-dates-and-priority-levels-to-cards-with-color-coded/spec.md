# add-due-dates-and-priority-levels-to-cards-with-color-coded

## MODIFIED: Requirement: Todo Data Model

The `Todo` interface MUST include optional `priority` and `dueDate` fields. Priority MUST be one of `'none' | 'low' | 'medium' | 'high'`. Due date MUST be a date-only ISO string (YYYY-MM-DD) or `null`. Existing todos without these fields MUST default to `priority: 'none'` and `dueDate: null` when loaded from localStorage.

### Scenario: Legacy todo loaded from localStorage
- GIVEN a todo exists in localStorage without `priority` or `dueDate` fields
- WHEN the app loads
- THEN the todo MUST have `priority: 'none'` and `dueDate: null`

### Scenario: New todo created
- GIVEN a user creates a new todo
- WHEN no priority or due date is specified
- THEN the todo MUST be created with `priority: 'none'` and `dueDate: null`

## ADDED: Requirement: Priority Labels

Each card MUST display a color-coded priority badge when priority is not `'none'`. The color mapping MUST be: Low = green, Medium = yellow/amber, High = red. The badge MUST show the priority text.

### Scenario: Card with high priority
- GIVEN a todo has `priority: 'high'`
- WHEN rendered in kanban or list view
- THEN a red badge reading "High" MUST be visible

### Scenario: Card with no priority
- GIVEN a todo has `priority: 'none'`
- WHEN rendered in kanban or list view
- THEN no priority badge MUST be displayed

## ADDED: Requirement: Due Date Display

Each card MUST display the due date when set. Overdue items (due date before today) MUST have a red visual indicator. Due dates MUST be formatted as human-readable short dates (e.g., "Apr 10").

### Scenario: Overdue card
- GIVEN a todo has `dueDate` set to a date in the past
- WHEN rendered in any view
- THEN the due date MUST display with a red highlight/text

### Scenario: Card with future due date
- GIVEN a todo has `dueDate` set to a future date
- WHEN rendered in any view
- THEN the due date MUST display in neutral styling

## ADDED: Requirement: Priority and Due Date Editing

Users MUST be able to set and change priority and due date on any card. The UI MUST provide inline controls accessible from both list and kanban views.

### Scenario: Set priority on existing card
- GIVEN an existing todo with no priority
- WHEN the user selects "High" from the priority control
- THEN the todo MUST update to `priority: 'high'` and persist to localStorage

### Scenario: Set due date on card
- GIVEN an existing todo with no due date
- WHEN the user selects a date from the date picker
- THEN the todo MUST update with the selected `dueDate` and persist to localStorage

### Scenario: Clear due date
- GIVEN a todo with a due date set
- WHEN the user clears the due date
- THEN `dueDate` MUST be set to `null` and persist

## ADDED: Requirement: Sort by Due Date

Users MUST be able to toggle sorting by due date in both list and kanban views. When enabled, items with due dates MUST sort ascending (earliest first). Items without due dates MUST sort to the end. The sort preference MUST persist to localStorage.

### Scenario: Toggle sort in kanban view
- GIVEN kanban view with cards having mixed due dates
- WHEN the user enables "Sort by due date"
- THEN cards within each column MUST reorder by due date ascending, with no-date cards last

### Scenario: Sort in list view
- GIVEN list view with mixed due dates
- WHEN sort by due date is enabled
- THEN todos MUST display sorted by due date ascending, no-date items last

## ADDED: Requirement: Dark Mode Support

All new UI elements (priority badges, due date displays, date picker, sort toggle) MUST support dark mode using Tailwind `dark:` variants consistent with existing styling.

### Scenario: Priority badge in dark mode
- GIVEN dark mode is active
- WHEN a card with priority is rendered
- THEN the priority badge MUST use appropriate dark-mode colors with sufficient contrast

## ADDED: Requirement: Accessibility

Priority controls MUST be keyboard-navigable. Due date picker MUST have an accessible label. Priority badges MUST include `aria-label` attributes. Sort toggle MUST be a labeled button.

### Scenario: Keyboard priority selection
- GIVEN a card's priority control is focused
- WHEN the user presses arrow keys and Enter
- THEN priority MUST change accordingly
