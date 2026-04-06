# build-auth-system

## ADDED: Requirement: user-registration

The application MUST expose a `/register` route that renders a registration form accepting a username and a password. The server MUST store the username and a bcrypt hash of the password in a server-side in-memory user store keyed by username. Usernames MUST be unique; attempting to register a duplicate username MUST return an error without overwriting the existing record. Passwords MUST be at least 8 characters long; shorter passwords MUST be rejected before hashing. Upon successful registration the server MUST create a session for the new user and redirect to the main todo route.

### Scenario: successful-registration
- GIVEN the in-memory user store contains no account with the username "alice"
- WHEN the user submits the registration form with username "alice" and password "securepassword"
- THEN the user store MUST contain an entry for "alice" whose password field is a bcrypt hash (not plaintext), a session MUST be created for "alice", an httpOnly SameSite=Strict cookie containing the session ID MUST be set, and the response MUST redirect to the main todo route

### Scenario: duplicate-username-rejected
- GIVEN the in-memory user store already contains an account with username "alice"
- WHEN a second registration form is submitted with username "alice" and any password of 8+ characters
- THEN the server MUST return the registration form with an error message stating the username is taken, no new user record MUST be created or overwritten, and no session cookie MUST be set

### Scenario: short-password-rejected
- GIVEN the registration form is displayed
- WHEN the user submits with username "bob" and password "short" (fewer than 8 characters)
- THEN the server MUST return the registration form with an error message describing the password policy, no user record MUST be created, and no session cookie MUST be set

### Scenario: empty-username-rejected
- GIVEN the registration form is displayed
- WHEN the user submits with an empty username and a valid password "validpassword"
- THEN the server MUST return the registration form with a validation error and no user record MUST be created

---

## ADDED: Requirement: user-login

The application MUST expose a `/login` route that renders a login form accepting a username and password. The server MUST look up the username in the in-memory user store, compare the submitted password against the stored bcrypt hash, and reject the request if either the username does not exist or the password does not match. A successful credential check MUST result in a new server-side session being created and its ID stored in an httpOnly SameSite=Strict cookie, after which the server MUST redirect to the main todo route.

### Scenario: successful-login
- GIVEN the user store contains "alice" with a bcrypt hash of "securepassword"
- WHEN the login form is submitted with username "alice" and password "securepassword"
- THEN bcrypt comparison MUST succeed, a new session entry MUST be created in the server-side session store keyed by a generated session ID, an httpOnly SameSite=Strict cookie named `session_id` MUST be set to that session ID, and the response MUST redirect to the main todo route

### Scenario: wrong-password-rejected
- GIVEN the user store contains "alice" with a bcrypt hash of "securepassword"
- WHEN the login form is submitted with username "alice" and password "wrongpassword"
- THEN bcrypt comparison MUST fail, no session MUST be created, no cookie MUST be set, and the login form MUST be re-rendered with a generic invalid credentials error message

### Scenario: unknown-username-rejected
- GIVEN the user store does not contain an account for username "ghost"
- WHEN the login form is submitted with username "ghost" and password "doesnotmatter"
- THEN the server MUST return the login form with the same generic invalid credentials error message (MUST NOT distinguish between wrong username and wrong password), and no session MUST be created

---

## ADDED: Requirement: user-logout

The application MUST provide a logout mechanism implemented as a SvelteKit form action (not a GET route). When the action is invoked the server MUST delete the session record from the server-side session store, clear the `session_id` cookie by setting it with an expired `Max-Age`, and redirect the user to `/login`.

### Scenario: successful-logout
- GIVEN a user is authenticated with a valid session cookie
- WHEN the user submits the logout form action
- THEN the session record MUST be removed from the server-side session store, the `session_id` cookie MUST be cleared (Max-Age=0 or equivalent), and the response MUST redirect to `/login`

### Scenario: logout-invalidates-session
- GIVEN a user has logged out and their former session ID is known
- WHEN any subsequent request is made with the former `session_id` cookie value
- THEN `hooks.server.ts` MUST NOT resolve the session to a user, `event.locals.user` MUST be undefined, and the request MUST be redirected to `/login`

---

## ADDED: Requirement: session-enforcement

The application MUST implement session enforcement in `hooks.server.ts`. On every request the hook MUST read the `session_id` cookie, look up the corresponding session in the server-side session store, and attach the resolved user object to `event.locals.user`. If the cookie is absent or the session ID does not resolve to a valid session, `event.locals.user` MUST be `undefined`. Every route except `/login` and `/register` MUST redirect unauthenticated requests to `/login`. The `event.locals` type MUST be extended in `app.d.ts` to declare the `user` field.

### Scenario: authenticated-request-passes-through
- GIVEN a request is made to the main todo route `/` with a valid `session_id` cookie that resolves to user "alice"
- WHEN `hooks.server.ts` processes the request
- THEN `event.locals.user` MUST be populated with "alice"'s user object and the route load function MUST execute normally without redirecting

### Scenario: unauthenticated-request-redirected
- GIVEN a request is made to `/` with no `session_id` cookie
- WHEN `hooks.server.ts` processes the request
- THEN `event.locals.user` MUST be `undefined` and the response MUST be a redirect to `/login`

### Scenario: invalid-session-id-redirected
- GIVEN a request is made to `/` with a `session_id` cookie containing a value not present in the session store
- WHEN `hooks.server.ts` processes the request
- THEN `event.locals.user` MUST be `undefined` and the response MUST be a redirect to `/login`

### Scenario: public-routes-not-blocked
- GIVEN a request is made to `/login` or `/register` with no `session_id` cookie
- WHEN `hooks.server.ts` processes the request
- THEN the request MUST NOT be redirected and MUST proceed to the route handler normally

---

## ADDED: Requirement: per-user-todo-isolation

The server-side in-memory todo store MUST be a `Map` keyed by `userId`. All load functions and form actions that read or mutate todos MUST scope their operations to `event.locals.user.id`. A user MUST only ever see and modify their own todos. Two different authenticated users operating simultaneously MUST not observe each other's todo lists.

### Scenario: user-sees-only-own-todos
- GIVEN "alice" has todos ["Buy milk", "Walk dog"] and "bob" has todos ["Write report"]
- WHEN "alice"'s authenticated session loads the todo page
- THEN the load function MUST return only ["Buy milk", "Walk dog"] and MUST NOT include "Write report"

### Scenario: new-todo-stored-under-correct-user
- GIVEN "alice" is authenticated and "bob" has no todos
- WHEN "alice" creates the todo "Buy milk" via a form action
- THEN the server-side store MUST contain "Buy milk" under "alice"'s userId entry and "bob"'s entry MUST remain empty or absent

### Scenario: empty-store-for-new-user
- GIVEN a user "carol" has just registered for the first time
- WHEN the main todo page loads for "carol"
- THEN the load function MUST return an empty todo list

---

## MODIFIED: Requirement: todo-data-model

The `Todo` TypeScript interface MUST be extended with an `ownerId` field of type `string` that stores the `userId` of the user who created the todo. The `ownerId` field MUST be set server-side at creation time using `event.locals.user.id` and MUST NOT be settable by the client. All existing fields (`id`, `text`, `completed`, `createdAt`) MUST be preserved.

### Scenario: todo-contains-owner-id
- GIVEN a user with userId "user-abc" is authenticated and creates a todo "Buy milk"
- WHEN the todo object is stored in the server-side in-memory store
- THEN the todo MUST contain an `ownerId` field equal to "user-abc" in addition to the standard `id`, `text`, `completed`, and `createdAt` fields

### Scenario: owner-id-not-client-settable
- GIVEN an authenticated user submits a create-todo form action with a crafted body containing a different `ownerId`
- WHEN the server form action processes the request
- THEN the stored todo's `ownerId` MUST equal `event.locals.user.id` and MUST ignore any client-supplied `ownerId` value

---

## MODIFIED: Requirement: layout-auth-ui

The application layout MUST be updated to replace any existing client-side name prompt with server-driven authentication UI. When a user is authenticated, the layout MUST display the current username and a logout button rendered as a form with a POST action. When no session is active the layout MUST NOT render authenticated UI elements, as the user will be redirected to `/login` by session enforcement. The layout MUST source the current user from `data` returned by `+layout.server.ts`, which reads from `event.locals.user`.

### Scenario: authenticated-layout-shows-username-and-logout
- GIVEN "alice" is authenticated and navigates to the main todo page
- WHEN the layout renders
- THEN the layout MUST display the text "alice" (or equivalent username identifier) and a logout button that submits a POST form action to the logout endpoint

### Scenario: layout-server-provides-user-data
- GIVEN `event.locals.user` is populated with user "alice" by `hooks.server.ts`
- WHEN `+layout.server.ts` executes its load function
- THEN it MUST return at minimum `{ user: { username: "alice" } }` so that layout components can access the username without additional server calls

### Scenario: no-name-prompt-in-authenticated-app
- GIVEN the application has been updated to use server authentication
- WHEN any authenticated user loads the application
- THEN no client-side name prompt or username input field asking for an unauthenticated display name MUST be rendered

---

## ADDED: Requirement: password-hashing

The application MUST use bcrypt to hash passwords before storing them. Plaintext passwords MUST never be persisted in the user store, logged, or returned in any server response. The bcrypt work factor SHOULD be at least 10. Password comparison during login MUST use the bcrypt compare function against the stored hash; the stored hash MUST NOT be decrypted or compared as plaintext.

### Scenario: stored-password-is-hashed
- GIVEN a user registers with password "securepassword"
- WHEN the server stores the user record in the in-memory user store
- THEN the stored credential MUST be a bcrypt hash string (beginning with `$2b$` or `$2a$`) and MUST NOT equal the plaintext string "securepassword"

### Scenario: login-uses-bcrypt-compare
- GIVEN the user store contains "alice" with a bcrypt hash of "securepassword"
- WHEN "alice" logs in with the correct password "securepassword"
- THEN the server MUST call `bcrypt.compare("securepassword", storedHash)` and rely solely on its boolean result to grant or deny access, never performing string equality against the hash

### Scenario: incorrect-password-fails-bcrypt-compare
- GIVEN the user store contains "alice" with a bcrypt hash of "securepassword"
- WHEN a login attempt is made with password "wrongpassword"
- THEN `bcrypt.compare` MUST return false, the login MUST be rejected, and no session MUST be created
