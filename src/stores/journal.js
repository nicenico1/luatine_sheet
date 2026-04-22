import { writable } from 'svelte/store';

/**
 * Index of the currently visible spread (0-based).
 */
export const currentSpreadIdx = writable(0);

/**
 * Total number of spreads.
 */
export const totalSpreads = writable(1);
