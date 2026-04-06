# Password Hashing Research — SvelteKit Auth System

**Context:** Cookie-based auth, in-memory store, Node.js 22.22.0, TypeScript strict, ESM.

---

## Option 1: bcrypt (npm `bcrypt` v6.0.0)

Algorithm: Blowfish-based, cost factor, **72-byte password limit**.

- Pros: battle-tested; simple API; automatic salt embedding
- Cons: native C++ addon (node-gyp, ABI must match Node 22); 72-byte truncation footgun; OWASP no longer recommends for new systems

---

## Option 2: Node.js built-in `crypto.scrypt`

Algorithm: scrypt (2009), memory-hard KDF, no password length limit.

- Pros: zero dependencies; ships with Node 22; memory-hard (GPU/ASIC resistant); async + sync variants; benchmarked ~57 ms (N=16384) and ~112 ms (N=32768) on this machine
- Cons: manual salt management (`salt:hash` format); `maxmem` override required for N > 16384; ~15 lines of boilerplate vs 5

OWASP recommended params: `N=32768, r=8, p=1, maxmem=67108864` (64 MB).

---

## Option 3: argon2 (npm `argon2` v0.44.0)

Algorithm: Argon2id — OWASP #1 recommendation, 2015 PHC winner.

- Pros: strongest modern algorithm; memory-hard + side-channel resistant; automatic salt; clean API
- Cons: native C addon (same gyp/ABI risks as bcrypt); adds compiled dependency to a currently zero-native-dep project; marginal security gain over scrypt for a demo in-memory app

---

## Comparison

| Criteria        | bcrypt      | crypto.scrypt  | argon2      |
|-----------------|-------------|----------------|-------------|
| Strength        | Good        | Very good      | Best        |
| Salt handling   | Automatic   | Manual         | Automatic   |
| Native addon    | Yes         | No             | Yes         |
| New deps        | 1 + native  | 0              | 1 + native  |
| Node 22 risk    | ABI rebuild | None           | ABI rebuild |
| 72-byte limit   | Yes         | No             | No          |

---

## Recommendation: `crypto.scrypt`

Use `crypto.scrypt` with `N=32768, r=8, p=1, maxmem=67108864`.

1. Zero added dependencies — consistent with the project's minimal-dep pattern (no external DB, no compiled addons).
2. No native addon eliminates Node ABI friction on Node 22 cutting-edge releases.
3. scrypt exceeds OWASP minimums; the security gap versus argon2id is not meaningful for a demo in-memory store.
4. bcrypt is eliminated by the 72-byte truncation footgun and weaker GPU resistance.

Key implementation note: always use `timingSafeEqual` for comparison to prevent timing attacks.

```typescript
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 67108864 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await scryptAsync(password, salt, 64, PARAMS) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  const key = await scryptAsync(password, salt, 64, PARAMS) as Buffer;
  return timingSafeEqual(Buffer.from(hash, 'hex'), key);
}
```
