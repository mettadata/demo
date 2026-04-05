# demo

<!-- metta:project-start source:spec/project.md -->
## Project

**demo** — A simple todo list web app where users can create, complete, delete, and filter todos.

Stack: SvelteKit, TypeScript (strict), Tailwind CSS, Vitest
<!-- metta:project-end -->

<!-- metta:conventions-start source:spec/project.md -->
## Conventions

- Follow standard SvelteKit conventions (`routes/`, `lib/`, `+page.svelte`, `+page.server.ts`)
- Use TypeScript strict mode
- Tailwind utility classes for styling
- Colocate components in `$lib/components/`
- Use SvelteKit form actions and load functions for data flow
- No external database — local/in-memory storage
- Unit tests for core logic with Vitest
- Semantic HTML, keyboard navigation, ARIA labels
<!-- metta:conventions-end -->

<!-- metta:workflow-start -->
## Metta Workflow

Use these entry points:
- `metta propose <description>` for new features
- `metta quick <description>` for small fixes
- `metta auto <description>` for full lifecycle
- `metta status --json` for current state
<!-- metta:workflow-end -->
