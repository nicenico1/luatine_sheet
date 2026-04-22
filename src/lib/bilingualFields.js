/**
 * Shared helpers for { fr, en } field values saved in snapshots.
 * When EN has no translation yet, show FR so the UI stays readable and
 * contenteditable regions are not empty (fixes EN edit mode).
 */

/** @param {unknown} v */
export function normalizeFieldValue(v) {
    if (v && typeof v === 'object' && ('fr' in v || 'en' in v)) {
        return {
            fr: typeof v.fr === 'string' ? v.fr : '',
            en: typeof v.en === 'string' ? v.en : '',
        };
    }
    const s = typeof v === 'string' ? v : '';
    return { fr: s, en: '' };
}

/**
 * @param {unknown} raw
 * @param {'fr'|'en'} lang
 * @param {string} [fallback='']
 * @param {{ imageField?: boolean }} [opts]
 */
export function getBilingualHtml(raw, lang, fallback = '', opts = {}) {
    const { imageField = false } = opts;
    if (raw && typeof raw === 'object' && ('fr' in raw || 'en' in raw)) {
        const b = /** @type {{ fr?: string; en?: string }} */ (raw);
        const fr = b.fr || '';
        const en = b.en || '';
        if (lang === 'en') {
            if (en.trim()) return en;
            if (imageField) return fr;
            return fr.trim() ? fr : fallback;
        }
        return fr || fallback;
    }
    if (typeof raw === 'string') return raw;
    return fallback;
}
