# API Contract: Notifications Store

**Module:** `src/lib/stores/notifications.ts`

## Exported Symbols

### `notifications`
```ts
import { writable } from 'svelte/store';
export const notifications: Writable<Notification[]>;
```
A Svelte writable store whose current value is an ordered array of `Notification` records, most-recently-pushed last. Maximum length is 5; oldest record is evicted before a new one is appended when the cap is reached.

---

### `push`
```ts
export function push(
  notification: Omit<Notification, 'id' | 'createdAt'>,
  _fromChannel?: boolean
): string
```
Appends a new `Notification` record (auto-generates `id` via `crypto.randomUUID()` and `createdAt` as `new Date().toISOString()`). Returns the generated `id`.

When `_fromChannel` is `false` or omitted (local origin), the function also posts a `notification-pushed` message to the `metta-todo-sync` BroadcastChannel. When `_fromChannel` is `true`, no broadcast is sent (prevents echo loops).

**Capacity rule:** If `notifications` already holds 5 records, the record with the earliest `createdAt` is removed before the new record is appended.

**Error contract:** Never throws. If BroadcastChannel is unavailable, the local append still succeeds silently.

---

### `dismiss`
```ts
export function dismiss(id: string, _fromChannel?: boolean): void
```
Removes the record matching `id` from the store. If no record matches, this is a no-op (no error thrown).

When `_fromChannel` is `false` or omitted, posts a `notification-dismissed` message to the channel. When `_fromChannel` is `true`, no broadcast is sent.

---

### `clearAll`
```ts
export function clearAll(): void
```
Sets the store value to an empty array. Does not broadcast.

---

## BroadcastChannel Integration

`notifications.ts` imports the existing `channel` reference from `broadcastSync.ts` (or re-accesses it through an exported getter). It listens for two new `SyncMessage` variants:

| Message type | Action |
|---|---|
| `notification-pushed` | Calls `push(payload, true)` — appends without re-broadcasting |
| `notification-dismissed` | Calls `dismiss(payload.id, true)` — removes without re-broadcasting |

The listener is registered once at module initialization, guarded by `typeof window !== 'undefined'`.

---

## SyncMessage Extension (in `broadcastSync.ts`)

```ts
export type SyncMessage =
  | { type: 'todos-updated'; payload: Todo[] }
  | { type: 'kanban-updated'; payload: KanbanState }
  | { type: 'presence-heartbeat'; payload: HeartbeatPayload }
  | { type: 'notification-pushed'; payload: Notification }
  | { type: 'notification-dismissed'; payload: { id: string } };
```
