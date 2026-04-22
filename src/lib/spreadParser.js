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

const SKIP_CLASSES = [
    'book-page-num', 'book-decoration', 'element-tools', 'page-add-btn',
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
            const img  = child.querySelector('img.book-id-photo, img.editable-image');
            elements.push({
                type: 'id-card',
                colA: cols[0]?.innerHTML ?? child.innerHTML,
                src:  img?.getAttribute('src') ?? '',
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

        // Default: treat as paragraph
        const text = child.innerHTML ?? child.textContent ?? '';
        if (text.trim()) {
            elements.push({ type: 'paragraph', content: text });
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
            return `<p class="book-text book-text--body">${el.content ?? ''}</p>`;
        case 'heading':
            return `<h2 class="book-heading">${el.content ?? ''}</h2>`;
        case 'caption':
            return `<p class="book-caption">${el.content ?? ''}</p>`;
        case 'divider':
            return `<div class="book-divider" aria-hidden="true"></div>`;
        case 'id-card': {
            const idSrc = (el.src || '').replace(/data:image[^"'\s)>]+/gi, '');
            const photo = idSrc
                ? `<img src="${idSrc}" alt="ID photo" class="editable-image book-id-photo"/>`
                : `<img src="" alt="ID photo" class="editable-image book-id-photo"/>`;
            return `<div class="book-id-grid"><div class="book-id-col">${el.colA ?? el.content ?? ''}</div><div class="book-id-col book-id-col--photo">${photo}</div></div>`;
        }
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
        left:  { pageNum: '—', elements: [{ type: 'paragraph', content: 'Écrire sur la page de gauche…' }] },
        right: { pageNum: '—', elements: [{ type: 'photo', src: '', variant: 'normal', rotate: 0, w: 520, h: 340, alt: '', caption: 'Légende — lieu — date.' }] },
    };
}

export function defaultSpreads() {
    return [defaultSpread()];
}
