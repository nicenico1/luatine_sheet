<script>
    /**
     * A single book page with Tiptap-powered text elements.
     * Svelte 5 runes.
     *
     * Fixes vs. initial version:
     *  - Tiptap onFocus/onBlur used instead of DOM focusin/focusout
     *    so the format toolbar reliably appears/disappears.
     *  - page-add-btn and add-element menu added (was missing entirely).
     *  - element-tools now correctly shown on hover via CSS body.is-editor.
     */
    import { onMount, onDestroy } from 'svelte';
    import { createEditor }       from '../lib/tiptap.js';
    import { isEditor }           from '../stores/editor.js';
    import { resolveImageSrc, placeholderImg } from '../lib/images.js';

    let {
        side      = 'left',
        elements  = $bindable([]),
        pageNum   = $bindable(''),
        hasBlot   = false,
        onUpdate  = () => {},
        setActive = () => {},
    } = $props();

    // ── DOM refs ──────────────────────────────────────────────────────────────
    let pageNumEl     = $state(null);
    let elemRefs      = {};
    let editors       = {};

    // ── page number editor ────────────────────────────────────────────────────

    function mountPageNumEditor() {
        if (!pageNumEl) return;
        editors['pagenum']?.destroy();
        editors['pagenum'] = createEditor({
            element:  pageNumEl,
            content:  pageNum || '—',
            editable: $isEditor,
            onUpdate(html) { pageNum = html; emit(); },
            // FIX: use Tiptap onFocus / onBlur for toolbar wiring
            onFocus() { setActive(editors['pagenum']); },
            onBlur()  {
                setTimeout(() => {
                    const anyFocused = Object.values(editors).some((ed) => ed?.isFocused);
                    if (!anyFocused) setActive(null);
                }, 80);
            },
        });
    }

    // ── element editors ───────────────────────────────────────────────────────

    function needsEditor(type) {
        return ['paragraph', 'heading', 'caption', 'id-card'].includes(type);
    }

    function mountEditor(idx) {
        const el = elemRefs[idx];
        if (!el || !needsEditor(elements[idx]?.type)) return;
        editors[idx]?.destroy();
        editors[idx] = createEditor({
            element:  el,
            content:  elements[idx]?.content || '',
            editable: $isEditor,
            onUpdate(html) {
                elements[idx] = { ...elements[idx], content: html };
                emit();
            },
            // FIX: Tiptap onFocus/onBlur — reliable vs. DOM focusin
            onFocus() { setActive(editors[idx]); },
            onBlur()  {
                setTimeout(() => {
                    const anyFocused = Object.values(editors).some((ed) => ed?.isFocused);
                    if (!anyFocused) setActive(null);
                }, 80);
            },
        });
    }

    function emit() { onUpdate(elements, pageNum); }

    function destroyAll() {
        Object.values(editors).forEach((ed) => ed?.destroy());
        editors = {};
    }

    // ── editor mode reactivity ────────────────────────────────────────────────

    $effect(() => {
        const editable = $isEditor;
        Object.values(editors).forEach((ed) => ed?.setEditable(editable));
    });

    // ── element mutations ─────────────────────────────────────────────────────

    function moveUp(idx) {
        if (idx <= 0) return;
        [elements[idx - 1], elements[idx]] = [elements[idx], elements[idx - 1]];
        elements = [...elements];
        // rebuild editors in new order
        setTimeout(() => { destroyAll(); elements.forEach((_, i) => mountEditor(i)); mountPageNumEditor(); }, 0);
        emit();
    }

    function moveDown(idx) {
        if (idx >= elements.length - 1) return;
        [elements[idx], elements[idx + 1]] = [elements[idx + 1], elements[idx]];
        elements = [...elements];
        setTimeout(() => { destroyAll(); elements.forEach((_, i) => mountEditor(i)); mountPageNumEditor(); }, 0);
        emit();
    }

    function rotateEl(idx) {
        const cur = elements[idx].rotate ?? 0;
        elements[idx] = { ...elements[idx], rotate: cur >= 5 ? -3 : cur + 1 };
        elements = [...elements];
        emit();
    }

    function removeEl(idx) {
        editors[idx]?.destroy();
        delete editors[idx];
        delete elemRefs[idx];
        elements = elements.filter((_, i) => i !== idx);
        emit();
    }

    // ── image handling ────────────────────────────────────────────────────────

    let fileInput   = $state(null);
    let pendingIdx  = $state(null);

    function promptImage(idx) {
        if (!$isEditor) return;
        pendingIdx        = idx;
        fileInput.value   = '';
        fileInput.click();
    }

    async function onFileSelected() {
        const file = fileInput.files?.[0];
        if (!file || pendingIdx === null) return;
        const src = await resolveImageSrc(file);
        elements[pendingIdx] = { ...elements[pendingIdx], src };
        elements = [...elements];
        emit();
        pendingIdx      = null;
        fileInput.value = '';
    }

    // ── add element menu ──────────────────────────────────────────────────────

    let showAddMenu = $state(false);

    const ADD_ITEMS = [
        { kind: 'paragraph',     icon: 'fa-paragraph',  label: 'Paragraphe'       },
        { kind: 'heading',       icon: 'fa-heading',    label: 'Titre'             },
        { kind: 'caption',       icon: 'fa-quote-right',label: 'Légende'           },
        { kind: 'divider',       icon: 'fa-grip-lines', label: 'Séparateur'        },
        { kind: 'photo',         icon: 'fa-image',      label: 'Photo (scotch)'    },
        { kind: 'photo-portrait',icon: 'fa-portrait',   label: 'Photo portrait'    },
        { kind: 'photo-clip',    icon: 'fa-thumbtack',  label: 'Photo (trombone)'  },
        { kind: 'id-card',       icon: 'fa-id-card',    label: 'Bloc identité'     },
    ];

    function buildNewElement(kind) {
        switch (kind) {
            case 'paragraph':      return { type: 'paragraph', content: 'Écrire ici…' };
            case 'heading':        return { type: 'heading',   content: 'Titre…' };
            case 'caption':        return { type: 'caption',   content: 'Légende — lieu — date.' };
            case 'divider':        return { type: 'divider' };
            case 'photo':          return { type: 'photo', src: '', variant: 'normal',   rotate: Math.floor(Math.random()*7)-3, w: 420, h: 280, alt: '', caption: '' };
            case 'photo-portrait': return { type: 'photo', src: '', variant: 'portrait', rotate: Math.floor(Math.random()*7)-3, w: 280, h: 380, alt: '', caption: '' };
            case 'photo-clip':     return { type: 'photo', src: '', variant: 'clip',     rotate: 0, w: 220, h: 150, alt: '', caption: '' };
            case 'id-card':        return { type: 'id-card', content: 'Name: …<br>Height: …<br>Weight: …<br>Eyes: …<br>Age: …' };
            default:               return null;
        }
    }

    function addElement(kind) {
        const el = buildNewElement(kind);
        if (!el) return;
        elements = [...elements, el];
        showAddMenu = false;
        // mount editor for new text element after DOM updates
        setTimeout(() => {
            const idx = elements.length - 1;
            mountEditor(idx);
        }, 50);
        emit();
    }

    function toggleAddMenu() {
        showAddMenu = !showAddMenu;
    }

    // Close menu on outside click
    function onDocClick(e) {
        if (!showAddMenu) return;
        if (!e.target.closest('.page-add-btn') && !e.target.closest('.add-element-menu')) {
            showAddMenu = false;
        }
    }

    // ── lifecycle ─────────────────────────────────────────────────────────────

    onMount(() => {
        mountPageNumEditor();
        elements.forEach((_, i) => mountEditor(i));
        document.addEventListener('click', onDocClick, true);
    });

    onDestroy(() => {
        destroyAll();
        document.removeEventListener('click', onDocClick, true);
    });

    // Svelte 5 action to capture element refs inside {#each}
    function setElemRef(el, idx) {
        if (!el) return;
        elemRefs[idx] = el;
    }
</script>

<input type="file" accept="image/*" bind:this={fileInput} style="display:none" onchange={onFileSelected} />

<div class="book-page book-page--{side}">
    <div class="book-page-inner">

        {#each elements as elem, idx (idx)}
            <div class="book-element" data-element={elem.type}>

                {#if elem.type === 'paragraph'}
                    <div class="book-text book-text--body" use:setElemRef={idx}></div>

                {:else if elem.type === 'heading'}
                    <div class="book-heading" use:setElemRef={idx}></div>

                {:else if elem.type === 'caption'}
                    <div class="book-caption" use:setElemRef={idx}></div>

                {:else if elem.type === 'divider'}
                    <div class="book-divider" aria-hidden="true"></div>

                {:else if elem.type === 'photo'}
                    <figure
                        class="photo-taped"
                        class:photo-taped--portrait={elem.variant === 'portrait'}
                        class:photo-taped--small={elem.variant === 'clip'}
                        class:photo-taped--clip={elem.variant === 'clip'}
                        style="transform: rotate({elem.rotate ?? 0}deg)"
                    >
                        {#if elem.variant === 'clip'}
                            <span class="paperclip" aria-hidden="true"></span>
                        {/if}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <img
                            src={elem.src || placeholderImg(elem.w ?? 420, elem.h ?? 280)}
                            alt={elem.alt ?? ''}
                            class="editable-image journal-photo book-photo"
                            onclick={() => promptImage(idx)}
                        />
                    </figure>

                {:else if elem.type === 'id-card'}
                    <div class="book-id-grid" use:setElemRef={idx}></div>
                {/if}

                <!-- Element tools: move / rotate / delete -->
                {#if $isEditor}
                    <div class="element-tools editor-only">
                        <button type="button" class="et-up"   title="Monter"    onclick={() => moveUp(idx)}>  <i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="et-down" title="Descendre" onclick={() => moveDown(idx)}><i class="fas fa-arrow-down"></i></button>
                        {#if elem.type === 'photo'}
                        <button type="button" class="et-rotate" title="Tourner" onclick={() => rotateEl(idx)}><i class="fas fa-rotate-right"></i></button>
                        {/if}
                        <button type="button" class="et-del" title="Supprimer"  onclick={() => removeEl(idx)}><i class="fas fa-times"></i></button>
                    </div>
                {/if}
            </div>
        {/each}

        <!-- FIX: Add element button (was never ported from script.js) -->
        {#if $isEditor}
            <button
                type="button"
                class="page-add-btn editor-only"
                class:is-open={showAddMenu}
                title="Ajouter un élément"
                aria-label="Ajouter un élément"
                onclick={toggleAddMenu}
            >
                <i class="fas fa-plus"></i>
            </button>

            {#if showAddMenu}
                <div class="add-element-menu" role="menu">
                    {#each ADD_ITEMS as item}
                        <button
                            type="button"
                            class="aem-item"
                            role="menuitem"
                            onclick={() => addElement(item.kind)}
                        >
                            <i class="fas {item.icon}"></i> {item.label}
                        </button>
                    {/each}
                </div>
            {/if}
        {/if}

    </div>

    <!-- Page number (Tiptap) -->
    <div class="book-page-num" bind:this={pageNumEl}></div>

    {#if hasBlot}
        <div class="book-decoration book-decoration--blot" aria-hidden="true"></div>
    {/if}
</div>
