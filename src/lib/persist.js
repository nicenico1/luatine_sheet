/**
 * Save / load logic for the fiche RP.
 *
 * Data format v4:
 *   { version: 4, fields: { id: { fr, en } }, journalPages, journalPagesFR, journalPagesEN,
 *     images: [], stepperVals: [], attrPoints, skillPoints, lang }
 *
 * Load priority: data/fiche-export.json → Firebase → localStorage
 */
import { saveToFirebase, loadFromFirebase, isFirebaseReady } from './firebase.js';

const STORAGE_KEY = 'ficherp_save_v3';

// ─── security helpers ───────────────────────────────────────────────────────

export function sanitizeHTML(dirty) {
    const doc = new DOMParser().parseFromString(dirty, 'text/html');
    doc.querySelectorAll('script, style, iframe, object, embed, link[rel="import"], meta, form').forEach(
        (el) => el.remove()
    );
    doc.querySelectorAll('*').forEach((el) => {
        for (const attr of Array.from(el.attributes)) {
            const name = attr.name.toLowerCase();
            const val  = (attr.value ?? '').trim().toLowerCase();
            if (name.startsWith('on') || val.startsWith('javascript:') || val.startsWith('data:text')) {
                el.removeAttribute(attr.name);
            }
        }
    });
    return doc.body.innerHTML;
}

export function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const t = url.trim().toLowerCase();
    return !t.startsWith('javascript:') && !t.startsWith('data:text');
}

// ─── debounce ───────────────────────────────────────────────────────────────

export function debounce(fn, ms) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms);
    };
}

// ─── save ───────────────────────────────────────────────────────────────────

let _firebaseSaveDebounced = null;

function getFirebaseSaveDebounced() {
    if (!_firebaseSaveDebounced) {
        _firebaseSaveDebounced = debounce((snap) => {
            if (isFirebaseReady()) saveToFirebase(snap);
        }, 2000);
    }
    return _firebaseSaveDebounced;
}

export function persistSnapshot(snapshot) {
    // Firebase first (async, won't block)
    try { getFirebaseSaveDebounced()(snapshot); } catch { /* ignore */ }

    // localStorage fallback
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
        if (e?.name === 'QuotaExceededError') {
            try {
                const lite = { ...snapshot };
                delete lite.journalPages;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(lite));
                console.warn('[FicheRP] localStorage quota — pages omitted');
            } catch { /* ignore */ }
        }
    }
}

// ─── load ───────────────────────────────────────────────────────────────────

export async function loadSnapshot() {
    let data = null;

    // 1. Static JSON committed to repo
    try {
        const r = await fetch('data/fiche-export.json', { cache: 'no-store' });
        if (r.ok) {
            const json = await r.json();
            if (json?.version >= 2) data = json;
        }
    } catch { /* file:// or not found */ }

    // 2. Firebase (takes priority for fields/images/meta, but only replaces
    //    journal pages when Firebase actually HAS pages — prevents an empty
    //    Firebase cloud save from wiping the static fiche-export.json journal)
    if (isFirebaseReady()) {
        try {
            const cloud = await loadFromFirebase();
            if (cloud?.version >= 2) {
                const cloudHasJournal =
                    (Array.isArray(cloud.journalPages) && cloud.journalPages.length > 0) ||
                    (typeof cloud.journalHTML === 'string' && cloud.journalHTML.trim().length > 0);

                if (cloudHasJournal) {
                    // Cloud has full data — use it exclusively
                    data = cloud;
                    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
                    return data;
                } else {
                    // Cloud only has metadata (fields, images) — merge over static JSON
                    // but KEEP the static journal pages
                    data = {
                        ...data,           // static JSON (has journalHTML / journalPages)
                        ...cloud,          // cloud fields/images/meta override
                        // Preserve journal from static if cloud has none
                        journalPages: (data?.journalPages?.length > 0) ? data.journalPages : cloud.journalPages,
                        journalHTML:  cloud.journalHTML ?? data?.journalHTML,
                    };
                }
            }
        } catch (e) {
            console.warn('[FicheRP] Firebase load failed, falling back', e);
        }
    }

    // 3. localStorage
    try {
        const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('ficherp_save_v2');
        if (raw) {
            const local = JSON.parse(raw);
            if (local?.version >= 2) data = local;
        }
    } catch { /* ignore */ }

    return data;
}
