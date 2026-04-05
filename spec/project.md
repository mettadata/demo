# demo — Project Constitution

## Project
A simple todo list web app built with SvelteKit. Users can create, complete, delete, and filter todos. Designed as a clean, functional task manager for individual use.

## Stack
- SvelteKit (framework)
- TypeScript (strict)
- Tailwind CSS (styling)
- Vitest (testing)

## Conventions
- Follow standard SvelteKit conventions: `routes/`, `lib/`, `+page.svelte`, `+page.server.ts`
- Use TypeScript strict mode
- Tailwind utility classes for styling, no custom CSS unless necessary
- Colocate components in `$lib/components/`
- Use SvelteKit form actions and load functions for data flow

## Architectural Constraints
- No external database — local/in-memory storage is fine
- No authentication layer
- Keep dependencies minimal
- Client-side state management only (Svelte stores)

## Quality Standards
- Unit tests for core logic (todo CRUD, filtering)
- Basic accessibility: semantic HTML, keyboard navigation, ARIA labels
- Vitest for all test files

## Off-Limits
- No secrets or credentials in code
- No force pushes
- No unvalidated user input
- No inline styles when Tailwind classes suffice
