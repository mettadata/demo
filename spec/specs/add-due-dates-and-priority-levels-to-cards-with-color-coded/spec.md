# add-due-dates-and-priority-levels-to-cards-with-color-coded

## Requirement: Priority Labels

Each card MUST display a color-coded priority badge when priority is not . The color mapping MUST be: Low = green, Medium = yellow/amber, High = red. The badge MUST show the priority text.

### Scenario: Card with high priority
- GIVEN a todo has
- WHEN rendered in kanban or list view
- THEN a red badge reading "High" MUST be visible

### Scenario: Card with no priority
- GIVEN a todo has
- WHEN rendered in kanban or list view
- THEN no priority badge MUST be displayed


## Requirement: Due Date Display

Each card MUST display the due date when set. Overdue items (due date before today) MUST have a red visual indicator. Due dates MUST be formatted as human-readable short dates (e.g., "Apr 10").

### Scenario: Overdue card
- GIVEN a todo has  set to a date in the past
- WHEN rendered in any view
- THEN the due date MUST display with a red highlight/text

### Scenario: Card with future due date
- GIVEN a todo has  set to a future date
- WHEN rendered in any view
- THEN the due date MUST display in neutral styling


## Requirement: Priority and Due Date Editing

Users MUST be able to set and change priority and due date on any card. The UI MUST provide inline controls accessible from both list and kanban views.

### Scenario: Set priority on existing card
- GIVEN an existing todo with no priority
- WHEN the user selects "High" from the priority control
- THEN the todo MUST update to  and persist to localStorage

### Scenario: Set due date on card
- GIVEN an existing todo with no due date
- WHEN the user selects a date from the date picker
- THEN the todo MUST update with the selected  and persist to localStorage

### Scenario: Clear due date
- GIVEN a todo with a due date set
- WHEN the user clears the due date
- THEN  MUST be set to  and persist


## Requirement: Sort by Due Date

Users MUST be able to toggle sorting by due date in both list and kanban views. When enabled, items with due dates MUST sort ascending (earliest first). Items without due dates MUST sort to the end. The sort preference MUST persist to localStorage.

### Scenario: Toggle sort in kanban view
- GIVEN kanban view with cards having mixed due dates
- WHEN the user enables "Sort by due date"
- THEN cards within each column MUST reorder by due date ascending, with no-date cards last

### Scenario: Sort in list view
- GIVEN list view with mixed due dates
- WHEN sort by due date is enabled
- THEN todos MUST display sorted by due date ascending, no-date items last


## Requirement: Dark Mode Support

All new UI elements (priority badges, due date displays, date picker, sort toggle) MUST support dark mode using Tailwind  variants consistent with existing styling.

### Scenario: Priority badge in dark mode
- GIVEN dark mode is active
- WHEN a card with priority is rendered
- THEN the priority badge MUST use appropriate dark-mode colors with sufficient contrast


## Requirement: Accessibility

Priority controls MUST be keyboard-navigable. Due date picker MUST have an accessible label. Priority badges MUST include  attributes. Sort toggle MUST be a labeled button.

### Scenario: Keyboard priority selection
- GIVEN a card's priority control is focused
- WHEN the user presses arrow keys and Enter
- THEN priority MUST change accordingly


## Requirement: Priority Labels

Each card MUST display a color-coded priority badge when priority is not . The color mapping MUST be: Low = green, Medium = yellow/amber, High = red. The badge MUST show the priority text.

### Scenario: Card with high priority
- GIVEN a todo has
- WHEN rendered in kanban or list view
- THEN a red badge reading "High" MUST be visible

### Scenario: Card with no priority
- GIVEN a todo has
- WHEN rendered in kanban or list view
- THEN no priority badge MUST be displayed


## Requirement: Due Date Display

Each card MUST display the due date when set. Overdue items (due date before today) MUST have a red visual indicator. Due dates MUST be formatted as human-readable short dates (e.g., "Apr 10").

### Scenario: Overdue card
- GIVEN a todo has  set to a date in the past
- WHEN rendered in any view
- THEN the due date MUST display with a red highlight/text

### Scenario: Card with future due date
- GIVEN a todo has  set to a future date
- WHEN rendered in any view
- THEN the due date MUST display in neutral styling


## Requirement: Priority and Due Date Editing

Users MUST be able to set and change priority and due date on any card. The UI MUST provide inline controls accessible from both list and kanban views.

### Scenario: Set priority on existing card
- GIVEN an existing todo with no priority
- WHEN the user selects "High" from the priority control
- THEN the todo MUST update to  and persist to localStorage

### Scenario: Set due date on card
- GIVEN an existing todo with no due date
- WHEN the user selects a date from the date picker
- THEN the todo MUST update with the selected  and persist to localStorage

### Scenario: Clear due date
- GIVEN a todo with a due date set
- WHEN the user clears the due date
- THEN  MUST be set to  and persist


## Requirement: Sort by Due Date

Users MUST be able to toggle sorting by due date in both list and kanban views. When enabled, items with due dates MUST sort ascending (earliest first). Items without due dates MUST sort to the end. The sort preference MUST persist to localStorage.

### Scenario: Toggle sort in kanban view
- GIVEN kanban view with cards having mixed due dates
- WHEN the user enables "Sort by due date"
- THEN cards within each column MUST reorder by due date ascending, with no-date cards last

### Scenario: Sort in list view
- GIVEN list view with mixed due dates
- WHEN sort by due date is enabled
- THEN todos MUST display sorted by due date ascending, no-date items last


## Requirement: Dark Mode Support

All new UI elements (priority badges, due date displays, date picker, sort toggle) MUST support dark mode using Tailwind  variants consistent with existing styling.

### Scenario: Priority badge in dark mode
- GIVEN dark mode is active
- WHEN a card with priority is rendered
- THEN the priority badge MUST use appropriate dark-mode colors with sufficient contrast


## Requirement: Accessibility

Priority controls MUST be keyboard-navigable. Due date picker MUST have an accessible label. Priority badges MUST include  attributes. Sort toggle MUST be a labeled button.

### Scenario: Keyboard priority selection
- GIVEN a card's priority control is focused
- WHEN the user presses arrow keys and Enter
- THEN priority MUST change accordingly
