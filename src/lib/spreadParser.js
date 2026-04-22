/**
 * Convert raw spread HTML (saved v3/v4 format) ↔ structured spread data.
 *
 * Structured format:
 * {
 *   left:  { pageNum: string, elements: Element[] },
 *   right: { pageNum: string, elements: Element[] },
 * }
 *
 * Element types:
 *   { type: 'paragraph', content: html }
 *   { type: 'heading',   content: html }
 *   { type: 'caption',   content: html }
 *   { type: 'divider' }
 *   { type: 'photo', src, alt, variant, rotate, w, h }
 *   { type: 'id-card', content: html }
 */

import { sanitizeHTML } from './persist.js';
import { tr } from './i18n.js';

/**
 * Flatten Tiptap HTML for saving inside our own block elements.
 *
 * Tiptap wraps every paragraph in <p> tags. When we store content into
 * our own <p class="book-text"> we cannot nest <p> inside <p> — that's
 * invalid HTML and the browser parser splits it into phantom elements.
 *
 * This function:
 * 1. Unwraps Tiptap <p> / <div> wrappers, extracting inner HTML
 * 2. Joins multiple paragraphs with <br> to preserve line breaks
 * 3. Returns plain inline HTML safe to embed in any block element
 */
function unwrapTiptapHTML(html) {
    if (!html) return '';
    const hasBlock = /<(p|div)[\s>]/i.test(html);
    if (!hasBlock) return html;
    try {
        const doc  = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
        const body = doc.body;
        const blocks = Array.from(body.children).filter((el) => {
            const t = el.tagName;
            return t === 'P' || t === 'DIV';
        });
        if (blocks.length === 0) return body.innerHTML;
        return blocks
            .map((b) => b.innerHTML)
            .filter((s) => s.trim() && s.trim() !== '<br>')
            .join('<br>');
    } catch {
        return html;
    }
}

/**
 * Wrap raw inline HTML in a <p> so Tiptap gets valid input.
 * Split on <br> to create separate paragraphs.
 */
export function wrapForTiptap(html) {
    if (!html) return '<p></p>';
    // Already has block tags — pass through
    if (/<(p|div|h[1-6])[\s>]/i.test(html)) return html;
    // Split on <br> to create paragraphs
    return html.split(/<br\s*\/?>/i)
        .map((line) => `<p>${line.trim()}</p>`)
        .filter((p) => p !== '<p></p>' || html.includes('<br'))
        .join('') || '<p></p>';
}

const SKIP_CLASSES = [
    'book-page-num', 'book-decoration', 'element-tools', 'page-add-btn',
    'tiptap-content', 'tiptap',
];

function parseElements(pageInner) {
    if (!pageInner) return [];
    const elements = [];

    for (const child of Array.from(pageInner.children)) {
        if (SKIP_CLASSES.some((c) => child.classList.contains(c))) continue;

        const cls = child.className || '';

        if (child.tagName === 'FIGURE' || cls.includes('photo-taped')) {
            const img     = child.querySelector('img');
            const caption = child.querySelector('.book-caption');
            const rotate  = parseInt(child.getAttribute('data-rotate') ?? child.style.transform?.match(/-?\d+/)?.[0] ?? '0', 10) || 0;
            elements.push({
                type:    'photo',
                src:     img?.getAttribute('src') ?? '',
                alt:     img?.alt ?? '',
                variant: cls.includes('portrait') ? 'portrait' : cls.includes('clip') ? 'clip' : 'normal',
                rotate,
                w: parseInt(img?.getAttribute('width')  ?? '420', 10),
                h: parseInt(img?.getAttribute('height') ?? '280', 10),
                caption: caption?.textContent ?? '',
            });
            continue;
        }

        if (child.tagName === 'HR' || cls.includes('book-divider')) {
            elements.push({ type: 'divider' });
            continue;
        }

        if (child.tagName === 'H2' || cls.includes('book-heading')) {
            elements.push({ type: 'heading', content: child.innerHTML });
            continue;
        }

        if (cls.includes('book-caption')) {
            elements.push({ type: 'caption', content: child.innerHTML });
            continue;
        }

        if (cls.includes('book-id-grid')) {
            const cols = child.querySelectorAll('.book-id-col');
            elements.push({
                type: 'id-card',
                colA: cols[0]?.innerHTML ?? child.innerHTML ?? '',
                colB: cols[1]?.innerHTML ?? '',
            });
            continue;
        }

        if (cls.includes('scrap-row')) {
            // scrap-row wraps multiple photo-taped figures — flatten them
            for (const fig of Array.from(child.querySelectorAll('.photo-taped, figure'))) {
                const img    = fig.querySelector('img');
                const rotate = parseInt(fig.getAttribute('data-rotate') ?? '0', 10) || 0;
                elements.push({
                    type:    'photo',
                    src:     img?.getAttribute('src') ?? '',
                    alt:     img?.alt ?? '',
                    variant: fig.classList.contains('photo-taped--clip') ? 'clip'
                           : fig.classList.contains('photo-taped--portrait') ? 'portrait' : 'normal',
                    rotate,
                    w: parseInt(img?.getAttribute('width')  ?? '220', 10),
                    h: parseInt(img?.getAttribute('height') ?? '150', 10),
                    caption: '',
                });
            }
            continue;
        }

        // Only accept explicit book-text paragraphs — not Tiptap wrapper divs
        // or other injected elements that would create phantom paragraphs on reload.
        if (child.tagName === 'P' || cls.includes('book-text')) {
            const text = child.innerHTML ?? '';
            if (text.trim()) {
                elements.push({ type: 'paragraph', content: text });
            }
        }
    }

    return elements;
}

/**
 * Parse a raw .book-spread HTML string into a structured spread object.
 */
export function parseSpreadHTML(html) {
    if (!html) return defaultSpread();
    const doc   = new DOMParser().parseFromString(sanitizeHTML(html), 'text/html');
    const pages = doc.querySelectorAll('.book-page');

    const left  = pages[0];
    const right = pages[1];

    return {
        left: {
            pageNum:  left?.querySelector('.book-page-num')?.textContent?.trim() ?? '',
            elements: parseElements(left?.querySelector('.book-page-inner')),
        },
        right: {
            pageNum:  right?.querySelector('.book-page-num')?.textContent?.trim() ?? '',
            elements: parseElements(right?.querySelector('.book-page-inner')),
        },
    };
}

/**
 * Serialize a structured spread back to HTML for saving.
 * This mirrors how the original `sanitizeSpreadHTMLForSave` worked but cleaner.
 */
export function serializeSpread(spread) {
    const left  = serializePage(spread.left, 'left');
    const right = serializeSpread2(spread.right, 'right');
    return `<section class="book-spread">${left}<div class="book-gutter" aria-hidden="true"></div>${right}</section>`;
}

function serializePage(page, side) {
    const inner = (page.elements ?? []).map(serializeElement).join('');
    const num   = page.pageNum ?? '—';
    return `<div class="book-page book-page--${side}"><div class="book-page-inner">${inner}</div><div class="book-page-num">${num}</div>${side === 'left' ? '<div class="book-decoration book-decoration--blot" aria-hidden="true"></div>' : ''}</div>`;
}

// alias to avoid name collision
const serializeSpread2 = serializePage;

function serializeElement(el) {
    switch (el.type) {
        case 'paragraph':
            return `<p class="book-text book-text--body">${unwrapTiptapHTML(el.content ?? '')}</p>`;
        case 'heading':
            return `<h2 class="book-heading">${unwrapTiptapHTML(el.content ?? '')}</h2>`;
        case 'caption':
            return `<p class="book-caption">${unwrapTiptapHTML(el.content ?? '')}</p>`;
        case 'divider':
            return `<div class="book-divider" aria-hidden="true"></div>`;
        case 'id-card':
            return `<div class="book-id-grid"><div class="book-id-col">${unwrapTiptapHTML(el.colA ?? el.content ?? '')}</div><div class="book-id-col">${unwrapTiptapHTML(el.colB ?? '')}</div></div>`;
        case 'photo': {
            const rot = el.rotate ?? 0;
            const variant = el.variant === 'portrait' ? ' photo-taped--portrait'
                           : el.variant === 'clip'    ? ' photo-taped--small photo-taped--clip'
                           : '';
            const clip = el.variant === 'clip' ? '<span class="paperclip" aria-hidden="true"></span>' : '';
            const src = (el.src || '').replace(/data:image[^"'\s)>]+/gi, '');
            return `<figure class="photo-taped${variant}" data-rotate="${rot}">${clip}<img src="${src}" alt="${el.alt ?? ''}" class="editable-image journal-photo book-photo" width="${el.w ?? 420}" height="${el.h ?? 280}"/></figure>`;
        }
        default:
            return '';
    }
}

export function defaultSpread() {
    return {
        left:  { pageNum: '—', elements: [{ type: 'paragraph', content: tr('tpl_write_left') }] },
        right: {
            pageNum: '—',
            elements: [
                {
                    type:    'photo',
                    src:     '',
                    variant: 'normal',
                    rotate:  0,
                    w:       520,
                    h:       340,
                    alt:     '',
                    caption: tr('tpl_caption'),
                },
            ],
        },
    };
}

export function defaultSpreads() {
    return [defaultSpread()];
}

/** Deep clone a spread tree (pages + elements). */
export function deepCloneSpread(spread) {
    return spread ? JSON.parse(JSON.stringify(spread)) : defaultSpread();
}

export function deepCloneSpreads(spreads) {
    if (!Array.isArray(spreads) || spreads.length === 0) return [];
    return spreads.map((s) => deepCloneSpread(s));
}

/**
 * Clear paragraph + caption body text for an EN "blank page" draft.
 * Headings, id-card columns, and photos stay (same behaviour as legacy script.js).
 */
export function clearJournalTranslatableText(spread) {
    const s = deepCloneSpread(spread);
    for (const side of ['left', 'right']) {
        const page = s[side];
        if (!page?.elements) continue;
        page.elements = page.elements.map((el) => {
            if (el.type === 'paragraph' || el.type === 'caption') {
                return { ...el, content: '' };
            }
            return { ...el };
        });
    }
    return s;
}

function mergeElementForEnSync(enEl, frEl) {
    if (!frEl) return enEl;
    if (!enEl) {
        if (frEl.type === 'paragraph' || frEl.type === 'caption') {
            return { ...frEl, content: '' };
        }
        if (frEl.type === 'heading') {
            return { ...frEl };
        }
        if (frEl.type === 'id-card') {
            return { ...frEl, colA: '', colB: '' };
        }
        if (frEl.type === 'photo') {
            return { ...frEl };
        }
        if (frEl.type === 'divider') {
            return { ...frEl };
        }
        return { ...frEl };
    }
    if (frEl.type === 'photo' && enEl.type === 'photo') {
        return {
            ...enEl,
            src:     frEl.src ?? enEl.src,
            variant: frEl.variant ?? enEl.variant,
            rotate:  frEl.rotate ?? enEl.rotate,
            w:       frEl.w ?? enEl.w,
            h:       frEl.h ?? enEl.h,
        };
    }
    if (frEl.type === enEl.type) {
        return { ...enEl };
    }
    return { ...frEl };
}

function mergePageForEnSync(enPage, frPage) {
    const fr = frPage ?? { pageNum: '—', elements: [] };
    const en = enPage ?? { pageNum: fr.pageNum, elements: [] };
    const frEls = fr.elements ?? [];
    const enEls = en.elements ?? [];
    const elements = frEls.map((frEl, i) => mergeElementForEnSync(enEls[i], frEl));
    return {
        pageNum: fr.pageNum ?? en.pageNum,
        elements,
    };
}

/**
 * EN journal: same layout and photos as FR, keep EN text where it exists.
 * Call when switching to EN (or after FR layout changes).
 */
export function mergeJournalSpreadsEnFromFr(enSpreads, frSpreads) {
    const fr = Array.isArray(frSpreads) && frSpreads.length ? frSpreads : [defaultSpread()];
    const en = Array.isArray(enSpreads) ? enSpreads : [];
    const hadNoEn = en.length === 0;
    // One EN spread per FR spread only — layout is defined by French; extra EN-only
    // spreads from old bugs are dropped so FR/EN stay aligned and saves stay stable.
    return fr.map((frS, i) => {
        const merged = {
            left:  mergePageForEnSync(en[i]?.left, frS.left),
            right: mergePageForEnSync(en[i]?.right, frS.right),
        };
        return hadNoEn ? clearJournalTranslatableText(merged) : merged;
    });
}
