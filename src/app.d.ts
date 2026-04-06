// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface LocalUser {
			id: string;
			username: string;
		}
		// interface Error {}
		interface Locals {
			user?: LocalUser;
		}
		interface PageData {
			user?: LocalUser;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
