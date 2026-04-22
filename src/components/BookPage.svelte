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
    import { activeEditor }       from '../stores/toolbar.js';
    import { openAddMenu, closeAddMenu, addMenu } from '../stores/addMenu.js';
    import { resolveImageSrc, placeholderImg } from '../lib/images.js';

    let {
        side      = 'left',
        elements  = $bindable([]),
        hasBlot   = false,
        onUpdate  = () => {},
    } = $props();

    // ── DOM refs ──────────────────────────────────────────────────────────────
    let pageNumEl     = $state(null);
    let elemRefs      = {};
    let editors       = {};

    // ── page number editor ────────────────────────────────────────────────────

    function onEditorFocus(key) {
        // Write directly to the global store — works across component boundaries
        activeEditor.set(editors[key] ?? null);
    }

    function onEditorBlur() {
        setTimeout(() => {
            // Don't clear if focus moved to the format toolbar or a select inside it
            const focused = document.activeElement;
            if (focused?.closest('#format-toolbar')) return;
            // Don't clear if another Tiptap editor on this page is focused
            const anyFocused = Object.values(editors).some((ed) => ed?.isFocused);
            if (!anyFocused) activeEditor.set(null);
        }, 200);
    }

    function mountPageNumEditor() {
        // Page number field intentionally disabled — was showing "—" clutter
    }

    // ── element editors ───────────────────────────────────────────────────────

    function needsEditor(type) {
        return ['paragraph', 'heading', 'caption'].includes(type);
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
            onFocus() { onEditorFocus(idx); },
            onBlur()  { onEditorBlur(); },
        });
    }

    // id-card has two separate editable text columns (colA left, colB right)
    function mountIdCardEditor(idx) {
        for (const col of ['A', 'B']) {
            const key  = `idcard${col}-${idx}`;
            const el   = elemRefs[key];
            const prop = col === 'A' ? 'colA' : 'colB';
            if (!el) continue;
            editors[key]?.destroy();
            editors[key] = createEditor({
                element:  el,
                content:  elements[idx]?.[prop] || '',
                editable: $isEditor,
                onUpdate(html) {
                    elements[idx] = { ...elements[idx], [prop]: html };
                    emit();
                },
                onFocus() { onEditorFocus(key); },
                onBlur()  { onEditorBlur(); },
            });
        }
    }

    function emit() { onUpdate(elements); }

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

    // Menu DOM is rendered at App level via addMenu store (avoids overflow:hidden clipping)
    let showAddMenu = $state(false);

    function buildNewElement(kind) {
        switch (kind) {
            case 'paragraph':      return { type: 'paragraph', content: 'Écrire ici…' };
            case 'heading':        return { type: 'heading',   content: 'Titre…' };
            case 'caption':        return { type: 'caption',   content: 'Légende — lieu — date.' };
            case 'divider':        return { type: 'divider' };
            case 'photo':          return { type: 'photo', src: '', variant: 'normal',   rotate: Math.floor(Math.random()*7)-3, w: 420, h: 280, alt: '', caption: '' };
            case 'photo-portrait': return { type: 'photo', src: '', variant: 'portrait', rotate: Math.floor(Math.random()*7)-3, w: 280, h: 380, alt: '', caption: '' };
            case 'photo-clip':     return { type: 'photo', src: '', variant: 'clip',     rotate: 0, w: 220, h: 150, alt: '', caption: '' };
            case 'id-card':        return {
                type: 'id-card',
                colA: 'Nom: …<br>Taille: …<br>Poids: …<br>Yeux: …<br>Age: …',
                colB: 'Née à: …<br>CID: …<br>Status: …',
            };
            default:               return null;
        }
    }

    function addElement(kind) {
        const el = buildNewElement(kind);
        if (!el) return;
        elements = [...elements, el];
        showAddMenu = false;
        closeAddMenu();
        setTimeout(() => {
            const idx = elements.length - 1;
            mountEditor(idx);
        }, 50);
        emit();
    }

    function toggleAddMenu(e) {
        // If THIS page's menu is open, close it
        if (showAddMenu) {
            showAddMenu = false;
            closeAddMenu();
            return;
        }
        // Close any other page's menu first
        closeAddMenu();

        // Calculate fixed position from the button's viewport rect
        const btn  = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const menuW = 218;
        let left = rect.left + rect.width / 2 - menuW / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
        const estimatedMenuH = 8 * 44;
        let top = rect.top - estimatedMenuH - 6;
        if (top < 8) top = rect.bottom + 6;

        showAddMenu = true;
        openAddMenu(`left:${left}px; top:${top}px; width:${menuW}px`, addElement);
    }

    // Track when the global menu closes externally (another + button opened it)
    const unsubMenu = addMenu.subscribe((m) => {
        if (!m.open || m.onAdd !== addElement) showAddMenu = false;
    });

    // Close menu on outside click
    function onDocClick(e) {
        if (!showAddMenu) return;
        if (!e.target.closest('.page-add-btn') && !e.target.closest('.add-element-menu')) {
            showAddMenu = false;
            closeAddMenu();
        }
    }

    // ── lifecycle ─────────────────────────────────────────────────────────────

    onMount(() => {
        mountPageNumEditor();
        elements.forEach((_, i) => {
            mountEditor(i);
            if (elements[i]?.type === 'id-card') mountIdCardEditor(i);
        });
        document.addEventListener('click', onDocClick, true);
    });

    onDestroy(() => {
        destroyAll();
        unsubMenu();
        document.removeEventListener('click', onDocClick, true);
    });

    // Svelte 5 action — key can be a number (element idx) or string (e.g. 'idcard-0')
    function setElemRef(el, key) {
        if (!el) return;
        elemRefs[key] = el;
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
                    <div class="book-id-grid">
                        <div class="book-id-col" use:setElemRef={`idcardA-${idx}`}></div>
                        <div class="book-id-col" use:setElemRef={`idcardB-${idx}`}></div>
                    </div>
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
        {/if}

    </div>

    {#if hasBlot}
        <div class="book-decoration book-decoration--blot" aria-hidden="true"></div>
    {/if}
</div>
