# Flow: End-to-End Notification Lifecycle

## 1. Overdue Detection Flow

```
+page.svelte onMount
  └─ startDueDateChecker()
        │
        ├─ [immediate] detect overdue todos
        │       │
        │       └─ push({ type:'overdue', ... })   ← notifications.ts
        │               │
        │               ├─ append to $notifications store
        │               ├─ Toaster.svelte reacts → renders Toast.svelte
        │               └─ postMessage('notification-pushed') → BroadcastChannel
        │                       │
        │                       └─ [other tabs] receive → push(..., fromChannel=true)
        │                               └─ append to their $notifications, no re-broadcast
        │
        └─ [every 60s] repeat detect cycle (skip already-notified ids)
```

## 2. @mention Detection Flow

```
User types comment → clicks "Add Comment"
  └─ CardComments.svelte: handleAddComment()
        └─ addComment(todoId, body, $self.id)   ← todos.ts
              │
              ├─ write Comment record to todos store
              ├─ broadcastTodos(...)
              ├─ parseMentions(trimmed, allCollaboratorNames)
              │       └─ regex match per name with word boundary check
              │
              └─ [if self.name matched]
                    └─ push({ type:'mention', title:'You were mentioned', ... })
                            │
                            ├─ append to $notifications
                            └─ postMessage('notification-pushed') → BroadcastChannel
```

## 3. Board Activity Flow (cross-tab)

```
Tab A: user drags card to new column
  └─ moveCard(...)   ← kanban.ts
        └─ broadcastKanban(newState) → BroadcastChannel 'metta-todo-sync'

Tab B: BroadcastChannel message received
  └─ listenForRemoteUpdates handler (broadcastSync.ts)
        └─ case 'kanban-updated':
              ├─ snapshot previous = get(kanbanState)
              ├─ onKanban(payload)  → kanbanState.set(payload)
              ├─ diffKanbanStates(previous, payload, todoMap)
              │       └─ detects: card columnId changed → card-moved change
              └─ push({ type:'activity', title:'Board Updated',
                         message:"'Fix login bug' moved to Done" })
                      │
                      ├─ append to Tab B's $notifications
                      └─ postMessage('notification-pushed') → back to channel
                              └─ Tab A receives → push(..., fromChannel=true)
                                      └─ append to Tab A's store (Tab A also sees activity toast)
```

Note: Tab A sees its own action reflected back as an activity toast via cross-tab sync. This is intentional per the spec — the "no self-toast" rule applies only to the BroadcastChannel diff handler (which only runs in *receiving* tabs), not to re-received notification-pushed messages.

## 4. Cross-Tab Notification Sync Flow

```
Tab A: any push() call (local origin)
  └─ notifications.ts push(n, fromChannel=false)
        ├─ append n to $notifications
        └─ channel.postMessage({ type:'notification-pushed', payload: n })
                │
                └─ Tab B: message event fires
                      └─ notifications listener:
                            case 'notification-pushed':
                              push(payload, fromChannel=true)
                                └─ append to store, NO postMessage

Tab A: dismiss(id) call (local origin)
  └─ notifications.ts dismiss(id, fromChannel=false)
        ├─ remove from $notifications
        └─ channel.postMessage({ type:'notification-dismissed', payload: { id } })
                │
                └─ Tab B: message event fires
                      └─ case 'notification-dismissed':
                            dismiss(id, fromChannel=true)
                              └─ remove from store, NO postMessage
```

## 5. Toast Dismiss Timer State Machine

```
[MOUNTED]
    │
    ▼
[RUNNING: setTimeout(5000)]
    │
    ├─ mouseenter ──────────────────────► [PAUSED]
    │                                         │
    │                                    mouseleave
    │                                         │
    │                                         ▼
    │                                    [RUNNING: setTimeout(remaining)]
    │
    ├─ timer fires ─────────────────────► dismiss(id) → removed from store
    │
    ├─ close button clicked ────────────► dismiss(id) → removed from store
    │
    └─ component destroyed (external) ──► clearTimeout → [DESTROYED, no dismiss]
```

## 6. Module Dependency Graph

```
+page.svelte
  ├── imports: startDueDateChecker (dueDateChecker.ts)
  ├── imports: Toaster.svelte
  └── imports: listenForRemoteUpdates (broadcastSync.ts)

Toaster.svelte
  ├── imports: notifications store
  └── renders: Toast.svelte (per notification)

notifications.ts
  ├── imports: channel (from broadcastSync.ts)  ← exported reference
  └── exposes: push, dismiss, clearAll, notifications store

broadcastSync.ts
  ├── imports: push (from notifications.ts)
  ├── imports: kanbanState, todos (for diff snapshot)
  └── exports: channel, listenForRemoteUpdates, broadcastTodos, broadcastKanban, broadcastHeartbeat

dueDateChecker.ts
  ├── imports: todos store
  └── imports: push (from notifications.ts)

todos.ts
  ├── imports: self, activeCollaborators (from collaborators.ts)
  ├── imports: push (from notifications.ts)
  └── exports: parseMentions, addComment, addReply, ...
```

**Circular-import check:** `broadcastSync.ts` imports from `notifications.ts`; `notifications.ts` imports `channel` (a value, not a function) from `broadcastSync.ts`. This is a mutual import. In Node16 ESM with TypeScript, mutual imports between `.ts` files work as long as neither module depends on the other being *fully initialized* at the point of first use. Since `channel` is only read inside the `push`/`dismiss` function bodies (not at module init time in `notifications.ts`), and `push` is only called from within the `handler` function inside `broadcastSync.ts` (not at module init), the initialization order is safe.
