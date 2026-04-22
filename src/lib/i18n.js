/**
 * Reactive UI language (fr | en) for Svelte.
 */
import { writable, derived, get } from 'svelte/store';
import { MESSAGES, LANG_STORAGE_KEY } from './messages.js';

/** @typedef {'fr' | 'en'} Lang */

function readStoredLang() {
    if (typeof localStorage === 'undefined') return 'fr';
    try {
        const v = localStorage.getItem(LANG_STORAGE_KEY);
        return v === 'en' ? 'en' : 'fr';
    } catch {
        return 'fr';
    }
}

/** @type {import('svelte/store').Writable<Lang>} */
export const lang = writable(readStoredLang());

lang.subscribe((value) => {
    if (typeof document !== 'undefined') {
        document.documentElement.lang = value === 'en' ? 'en' : 'fr';
    }
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(LANG_STORAGE_KEY, value);
        } catch {
            /* ignore */
        }
    }
});

/** @param {Lang} next */
export function setLang(next) {
    if (next !== 'fr' && next !== 'en') return;
    lang.set(next);
}

/**
 * @param {keyof typeof MESSAGES['fr']} key
 * @returns {string}
 */
export function tr(key) {
    const L = get(lang);
    const row = MESSAGES[L];
    if (row && key in row) return /** @type {string} */ (row[key]);
    return /** @type {string} */ (MESSAGES.fr[key] ?? String(key));
}

/** Reactive: use in Svelte as `$tr('btn_back')` */
export const trStore = derived(lang, ($lang) => {
    const row = MESSAGES[$lang] ?? MESSAGES.fr;
    return (/** @type {keyof typeof MESSAGES['fr']} */ key) =>
        (key in row ? row[key] : MESSAGES.fr[key]) ?? String(key);
});
