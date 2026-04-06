# API Contract: Board Activity Diff (broadcastSync extension)

**Module:** `src/lib/sync/broadcastSync.ts` (modified)

## New Internal Function

### `diffKanbanStates`
```ts
function diffKanbanStates(
  previous: KanbanState,
  incoming: KanbanState,
  todoMap: Map<string, string>  // todoId -> text
): ActivityChange[]
```
Pure function computing the set of structural changes between two `KanbanState` values. Not exported.

**`ActivityChange` type (internal):**
```ts
type ActivityChange =
  | { kind: 'card-moved'; cardId: string; cardTitle: string; toColumnTitle: string }
  | { kind: 'column-added'; columnTitle: string }
  | { kind: 'column-renamed'; newTitle: string };
```

**Detection rules:**

1. **Card moved:** For each `cardId` present in both `previous` and `incoming`, if the `columnId` containing it differs, record a `card-moved` change. Card title is looked up from `todoMap`; falls back to `"Unknown card"` if not found.

2. **Column added:** For each column in `incoming` whose `id` does not exist in `previous.columns`, record a `column-added` change.

3. **Column renamed:** For each column in `incoming` whose `id` exists in `previous.columns` but whose `title` differs from the matching previous column, record a `column-renamed` change.

**Does NOT detect:** column deletion, card reordering within the same column (same `columnId`), card title changes (those come through `todos-updated`).

---

## Integration in `listenForRemoteUpdates`

The `kanban-updated` case in the message handler is extended:

```ts
case 'kanban-updated':
  if (!msg.payload || ...) return;
  const previous = get(kanbanState); // read local state before update
  onKanban(msg.payload);             // existing callback sets local store
  const todoMap = buildTodoMap(get(todos));
  const changes = diffKanbanStates(previous, msg.payload, todoMap);
  for (const change of changes) {
    if (change.kind === 'card-moved') {
      push({ type: 'activity', title: 'Board Updated',
             message: `'${change.cardTitle}' moved to ${change.toColumnTitle}` });
    } else if (change.kind === 'column-added') {
      push({ type: 'activity', title: 'Board Updated',
             message: `New column '${change.columnTitle}' added` });
    } else if (change.kind === 'column-renamed') {
      push({ type: 'activity', title: 'Board Updated',
             message: `Column renamed to '${change.newTitle}'` });
    }
  }
  break;
```

**Self-exclusion:** BroadcastChannel does not deliver messages to the sending tab, so no extra guard is needed. Activity toasts are inherently only generated in receiving tabs.

**Import dependency:** `broadcastSync.ts` imports `push` from `$lib/stores/notifications.js` and `get` from `svelte/store`. It also imports `kanbanState` and `todos` stores for the pre-update snapshot. This introduces a new import dependency; circular-import risk is avoided because `notifications.ts` does NOT import from `broadcastSync.ts` directly — it accesses the channel reference through a shared module or re-exports `channel`.

**Recommended pattern to avoid circular imports:** Export the `channel` reference from `broadcastSync.ts` as `export { channel }` and have `notifications.ts` import it. `broadcastSync.ts` imports `push` from `notifications.ts`. This is a one-directional dependency: `broadcastSync -> notifications`.
