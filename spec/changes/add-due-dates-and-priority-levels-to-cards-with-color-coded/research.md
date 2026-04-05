# Research: add-due-dates-and-priority-levels-to-cards-with-color-coded

## Decision: Extend Todo interface with optional fields, native date input, inline priority select

### Approaches Considered

1. **Extend existing Todo interface with optional fields** (selected) — Minimal change, backward compatible with existing localStorage data. Migration handled by defaulting undefined fields on load.
2. **Separate Priority/DueDate models linked by todo ID** — Over-engineered for a client-only app with localStorage. Adds join complexity for no benefit.
3. **Third-party date picker library** — Unnecessary dependency. Native `<input type="date">` provides good UX and accessibility with zero bundle cost.

### Rationale

The app uses a simple `Todo` interface stored in localStorage. Adding optional `priority` and `dueDate` fields is the most straightforward approach:

- **Backward compatibility**: Existing todos loaded from localStorage simply get defaults (`priority: 'none'`, `dueDate: null`) via a migration/normalization step in the store initialization.
- **Date input**: Native `<input type="date">` works well across modern browsers, is keyboard-accessible, and renders the system date picker. No library needed.
- **Priority select**: A `<select>` element with color-coded options. Simple, accessible, no dependencies.
- **Sort toggle**: A boolean `sortByDueDate` stored in localStorage alongside `viewPreference`. When active, a derived store computes the sorted order.
- **Color-coded badges**: Tailwind utility classes for each priority level. Small inline `<span>` elements.

### Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Date format | ISO YYYY-MM-DD string | Native input value format, easy to compare/sort |
| Priority type | String union type | Type-safe, simple to extend |
| Overdue detection | Compare against `new Date().toISOString().split('T')[0]` | Date-only comparison, no timezone issues |
| Edit UI | Inline controls on card expand/hover | No modal needed, keeps interaction fast |
| Sort mechanism | Derived store | Reactive, composable with existing filters |

### Data Model Change

```typescript
export type Priority = 'none' | 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  priority: Priority;    // new, defaults to 'none'
  dueDate: string | null; // new, ISO date string or null
}
```

### Artifacts Produced
- Data model extension defined above
- No external API contracts (client-only app)
- Sort logic: `a.dueDate localeCompare b.dueDate` with null-last semantics
