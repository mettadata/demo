/**
 * Store initialization module.
 *
 * Provides a central `initStores(userId)` function that namespaces
 * localStorage keys per user and re-loads all stores from the correct keys.
 *
 * Task 3.3 will update individual store modules to read `getCurrentUserId()`
 * when constructing their storage keys. For now this module handles the
 * userId bookkeeping and re-initializes stores from namespaced keys.
 */

let _currentUserId: string | null = null;

export function getCurrentUserId(): string | null {
	return _currentUserId;
}

/**
 * Build the namespaced localStorage key for a given base key.
 * Returns the base key if no userId is set (backward compatibility).
 */
export function storageKey(base: string): string {
	if (_currentUserId) {
		return `${base}_${_currentUserId}`;
	}
	return base;
}

/**
 * Initialize all stores with user-scoped localStorage keys.
 *
 * Must be called in `onMount` BEFORE any store reads so that
 * subsequent localStorage operations use the namespaced key.
 */
export function initStores(userId: string): void {
	_currentUserId = userId;
}
