# API Contract: Mention Parser

**Module:** `src/lib/stores/todos.ts` (new export added to existing module)

## Exported Symbol

### `parseMentions`
```ts
export function parseMentions(
  body: string,
  collaboratorNames: string[]
): string[]
```
Pure function. Returns the **deduplicated, lowercased** list of collaborator names found in `body` as `@name` tokens matching whole-word boundaries.

**Algorithm:** For each name in `collaboratorNames`, tests the regex `/(?<!\w)@(name)(?!\w)/gi` (with `name` escaped for regex special chars via `name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`). If the pattern matches at least once in `body`, the lowercased name is added to the result set. Each name appears at most once in the output regardless of how many times it appears in `body`.

**Returns:** `string[]` — may be empty if no names are matched.

**Error contract:** Never throws. Returns `[]` on empty input or empty `collaboratorNames`.

---

## Integration in `addComment` and `addReply`

After writing to the `todos` store and before calling `broadcastTodos`, both functions execute mention detection:

```ts
// Pseudocode — actual implementation reads stores via get()
const allNames = [get(self).name, ...get(activeCollaborators).map(c => c.name)];
const matched = parseMentions(trimmed, allNames);

const selfName = get(self).name.toLowerCase();
if (matched.includes(selfName)) {
  const actor = get(activeCollaborators).find(c => c.id === actorId);
  const commenterName = actor?.name ?? get(self).name;
  const todo = get(todos).find(t => t.id === todoId);
  push({
    type: 'mention',
    title: 'You were mentioned',
    message: `Mentioned in ${todo?.text ?? 'a card'} by ${commenterName}`
  });
}
```

**Constraints:**
- `editComment` and `editReply` do NOT call `parseMentions`.
- At most one `mention` notification is pushed per `addComment` / `addReply` call, even if the current user's name appears multiple times in the body.
- `actorId` is used to resolve the commenter display name from `activeCollaborators`; falls back to `get(self).name` if `actorId` does not resolve.
