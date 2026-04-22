import { writable } from 'svelte/store';

/**
 * Which screen is currently visible.
 * Values: 'splash' | 'char-select' | 'char-bio' | 'journal'
 */
export const currentScreen = writable('splash');
