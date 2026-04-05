import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme-preference';

function loadThemePreference(): ThemePreference {
	if (typeof window === 'undefined') return 'system';
	try {
		const raw = localStorage.getItem(THEME_STORAGE_KEY);
		if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
	} catch {
		// fall through
	}
	return 'system';
}

function getSystemTheme(): ResolvedTheme {
	if (typeof window === 'undefined') return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const themePreference: Writable<ThemePreference> = writable<ThemePreference>(loadThemePreference());

const systemTheme: Writable<ResolvedTheme> = writable<ResolvedTheme>(getSystemTheme());

export const resolvedTheme: Readable<ResolvedTheme> = derived(
	[themePreference, systemTheme],
	([$pref, $sys]) => $pref === 'system' ? $sys : $pref
);

// Persist preference
themePreference.subscribe((value) => {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(THEME_STORAGE_KEY, value);
	} catch {
		// ignore
	}
});

// Apply dark class to document
resolvedTheme.subscribe((value) => {
	if (typeof window === 'undefined') return;
	document.documentElement.classList.toggle('dark', value === 'dark');
});

// Listen for system preference changes
if (typeof window !== 'undefined') {
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		systemTheme.set(e.matches ? 'dark' : 'light');
	});
}

export function cycleTheme(): void {
	themePreference.update((current) => {
		const order: ThemePreference[] = ['system', 'light', 'dark'];
		const index = order.indexOf(current);
		return order[(index + 1) % order.length];
	});
}
