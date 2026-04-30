/**
 * Journal table-of-contents: entries link to a spread when the page label matches.
 */

/** @param {unknown} s */
export function normalizePageLabel(s) {
    return String(s ?? '')
        .replace(/\s+/g, ' ')
        .replace(/\u00a0/g, ' ')
        .trim();
}

/** @param {unknown} s */
function normKey(s) {
    return normalizePageLabel(s).toLowerCase();
}

/** @param {unknown} s */
function variants(s) {
    const n = normKey(s);
    if (!n) return [];
    const noPageWord = n.replace(/^page\s+/, '').replace(/^p\.?\s*/, '');
    const uniq = new Set([n, noPageWord].filter(Boolean));
    return [...uniq];
}

/**
 * @param {{ left?: { pageNum?: string }; right?: { pageNum?: string } }[]} spreads
 * @param {unknown} queryRaw
 * @returns {number} spread index, or -1
 */
export function findSpreadIndexForPageLabel(spreads, queryRaw) {
    if (!Array.isArray(spreads) || spreads.length === 0) return -1;
    const want = variants(queryRaw);
    if (want.length === 0) return -1;
    for (let i = 0; i < spreads.length; i++) {
        const L = spreads[i]?.left?.pageNum;
        const R = spreads[i]?.right?.pageNum;
        const labels = [...variants(L), ...variants(R)];
        for (const w of want) {
            if (labels.some((l) => l === w)) return i;
        }
    }
    return -1;
}

/**
 * @typedef {{ title: string; page: string }} JournalSummaryEntry
 */

/** @param {unknown} raw */
export function coerceJournalSummaryEntries(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((row) => {
            if (row && typeof row === 'object') {
                const o = row;
                const title = typeof o.title === 'string' ? o.title : '';
                const page  = typeof o.page  === 'string' ? o.page  : '';
                return { title, page };
            }
            return { title: '', page: '' };
        });
}

/** @param {unknown} html */
export function migrateJournalSummaryFromFieldsHtml(html) {
    if (!html || typeof html !== 'string') return [];
    try {
        const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
        const root = doc.querySelector('div');
        if (!root) return [];
        /** @type {JournalSummaryEntry[]} */
        const out = [];
        for (const a of root.querySelectorAll('a[data-journal-page]')) {
            const page = a.getAttribute('data-journal-page') ?? '';
            const title = a.textContent?.trim() ?? '';
            if (title || page) out.push({ title, page });
        }
        return out;
    } catch {
        return [];
    }
}
