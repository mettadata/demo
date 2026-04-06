# Flow: Sync and Presence

---

## 1. State Mutation and Broadcast Flow

```
Tab A — User Action
        │
        ▼
  mutation fn called
  (e.g. moveCard, addTodo)
        │
        ├─► snapshot()          ← saveSnapshot() in history.ts
        │                         pushes current Todo[] onto undoStack
        │
        ├─► store.update(...)   ← commits new state to todos / kanbanState
        │
        └─► broadcastTodos()    ← posts full Todo[] on BroadcastChannel
            broadcastKanban()      "metta-todo-sync"

BroadcastChannel API
        │
        │  (does NOT deliver back to Tab A — browser spec guarantee)
        │
        ▼
Tab B — listenForRemoteUpdates callback
        │
        ├─► onTodos(payload)    ← todos.set(payload)   bypasses snapshot()
        │                                               undoStack unchanged
        └─► onKanban(payload)   ← kanbanState.set(payload)
```

**Key invariant:** Remote updates enter the store via direct `set()` calls that do NOT invoke `saveSnapshot()`. The `snapshot()` call is made exclusively inside mutation functions, which are NOT called for incoming remote payloads.

---

## 2. History Isolation

```
Tab A undoStack:  [ snapshot-before-addTodo ]
                         │
Tab B sends remote mutation arrives
                         │
                         ▼
        todos.set(remotePayload)   ← direct set, no snapshot
                         │
Tab A undoStack:  [ snapshot-before-addTodo ]   ← unchanged

Tab A calls undo()
        │
        ▼
todos.set(snapshot-before-addTodo)  ← reverts only Tab A's local action
```

Tab B is unaffected because undo/redo stacks are not broadcast.

---

## 3. Presence Heartbeat Lifecycle

```
Tab A loads
    │
    ├─► read localStorage "user-id" / "user-name"
    ├─► derive color from id
    ├─► self store initialized
    │
    ├─► broadcastHeartbeat(self)   ← immediate on-load heartbeat
    │
    └─► setInterval(broadcastHeartbeat, 30_000)   ← ongoing heartbeat

Tab B — receives presence-heartbeat
    │
    ├─► if payload.id === self.id → IGNORE (self-echo guard)
    │
    └─► activeCollaborators.update(upsert entry by id, set lastSeen)

Tab B — expiry poller (setInterval, 10_000 ms)
    │
    └─► activeCollaborators.update(
          filter out entries where Date.now() - lastSeen > 90_000
        )

Tab A closes / navigates away
    │
    └─► destroyPresence()
            │
            ├─► clearInterval(heartbeatInterval)
            ├─► clearInterval(expiryInterval)
            └─► channel.close()
        (Tab B's expiry poller will evict Tab A within 10s + up to 90s silence)
```

---

## 4. First-Visit Name Prompt Flow

```
+page.svelte mounts
    │
    └─► check localStorage.getItem("user-name")
            │
     null ──┤                        not null
            ▼                            ▼
    show NamePrompt banner        do not show prompt

NamePrompt — user types name and confirms
    │
    └─► updateSelfName(name)
            ├─► localStorage.setItem("user-name", name)
            ├─► self store updated
            └─► prompt hidden (showPrompt = false)

NamePrompt — user dismisses without name
    │
    └─► localStorage.setItem("user-name", "Anonymous")
        self.name remains "Anonymous"
        prompt hidden
        (on reload: "user-name" exists → prompt does not appear)
```

---

## 5. Avatar Render Decision Tree (KanbanCard)

```
todo.activityLog
    │
    └─► find event with max timestamp where detail.actorId is non-empty
            │
       not found ──► render no avatar
            │
       found (actorId)
            │
            ├─► actorId === self.id  ──► use self.name, self.color
            │
            └─► look up in activeCollaborators by id
                    │
               found  ──► use collaborator.name, collaborator.color
                    │
               not found ──► render no avatar
                              (actor is from a previous session, not currently present)
```

---

## 6. Store Integration Pattern: Wrapper Functions

The mutation functions in `todos.ts` and `kanban.ts` are the sole integration point. No decorator or subscriber hook intercepts `store.set`; instead, each named export function explicitly calls `broadcastTodos` / `broadcastKanban` after mutating:

```
addTodo(text, actorId?)
  snapshot()
  todos.update(...)        ← store write
  broadcastTodos($todos)   ← explicit broadcast at function end

moveCard(todoId, colId, idx, actorId?)
  kanbanState.update(...)  ← kanban store write
  todos.update(...)        ← todos store write (moved activity event)
  broadcastKanban($kanbanState)
  broadcastTodos($todos)
```

This is explicit rather than reactive to avoid broadcasting remote-induced store writes (which arrive via `set()` in the listener, not through named mutation functions).
