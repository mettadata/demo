# Data Model: Collaborator

---

## TypeScript Interfaces

```ts
// src/lib/stores/collaborators.ts

export interface Collaborator {
  id: string;       // crypto.randomUUID(), persisted under localStorage key "user-id"
  name: string;     // display name, persisted under "user-name", defaults to "Anonymous"
  color: string;    // deterministic hex color derived from id, e.g. "#a3b4c5"
  lastSeen: number; // Unix epoch ms; for self: updated on each heartbeat send; for remotes: set from received payload
}
```

---

## Stores

### `self: Writable<Collaborator>`

Holds the current user's record. Initialized synchronously from `localStorage` on module import.

Initialization algorithm:
1. Read `localStorage.getItem("user-id")`. If absent, call `crypto.randomUUID()` and write to `"user-id"`.
2. Read `localStorage.getItem("user-name")`. If absent, use `"Anonymous"` (do NOT write to localStorage yet — writing is deferred to first-visit prompt dismiss or explicit name save, to distinguish "never prompted" from "dismissed").
3. Derive `color` from `id` using the palette hash (see Color Derivation below).
4. Set `lastSeen` to `Date.now()`.

Any update to `self.name` via `updateSelfName(name: string): void` MUST:
- Trim the input; reject if empty after trimming.
- Write to `localStorage` under `"user-name"`.
- Update the `self` store.

### `activeCollaborators: Writable<Collaborator[]>`

Holds records for remote tabs detected as present. MUST NOT contain an entry whose `id === self.id`. Entries are upserted on each received `presence-heartbeat` message. Entries are evicted when `Date.now() - entry.lastSeen > 90_000`.

---

## Color Derivation: Predefined Palette Hash

The `color` field is derived by hashing the `id` string into an index into a fixed palette of 12 visually distinct, WCAG-AA-contrast colors (dark text on light background or vice versa). This is the recommended approach (see Research).

```ts
const AVATAR_PALETTE = [
  '#e57373', '#f06292', '#ba68c8', '#7986cb',
  '#4fc3f7', '#4db6ac', '#81c784', '#dce775',
  '#ffb74d', '#ff8a65', '#a1887f', '#90a4ae'
];

function deriveColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0; // unsigned 32-bit
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
```

Properties:
- Pure synchronous function — no async hashing.
- Deterministic: same `id` always returns the same color.
- Stable across page reloads (no runtime entropy).
- Zero external dependencies.

---

## localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `"user-id"` | `string` | UUID, written once on first visit |
| `"user-name"` | `string` | Display name; written on first-visit prompt resolution or explicit name update |

---

## Presence Heartbeat Message Shape

The `presence-heartbeat` BroadcastChannel message payload maps directly to the `Collaborator` interface minus internal fields:

```ts
interface HeartbeatPayload {
  id: string;
  name: string;
  color: string;
  lastSeen: number; // sender's Date.now() at time of send
}
```

Receivers upsert `activeCollaborators` using `id` as the unique key.

---

## Expiry and Cleanup

- Heartbeat send interval: 30 000 ms.
- Expiry threshold: 90 000 ms of silence.
- Expiry poll interval: 10 000 ms (as specified in the requirement).
- `destroyPresence(): void` clears both intervals and closes the BroadcastChannel.

---

## Avatar Initials Algorithm

Given a `name` string:
1. Split on whitespace into words.
2. If more than one word: take the first character of the first and last words, uppercase.
3. If exactly one word: take the first two characters of that word, uppercase.
4. If the name is empty: fall back to `"??"`.

Examples:
- `"Grace Hopper"` → `"GH"`
- `"Anonymous"` → `"AN"`
- `"Bob"` → `"BO"`
- `"Frank Lloyd Wright"` → `"FW"` (first + last)
