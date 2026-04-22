<script>
    /**
     * A single book page (left or right) with Tiptap-powered text elements.
     * Svelte 5 runes.
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
    let pageNumEl = $state(null);
    let elemRefs  = {};   // idx → DOM element
    let editors   = {};   // idx → Tiptap Editor

    // ── page number editor ────────────────────────────────────────────────────

    function mountPageNumEditor() {
        if (!pageNumEl) return;
        editors['pagenum']?.destroy();
        editors['pagenum'] = createEditor({
            element:  pageNumEl,
            content:  pageNum || '—',
            editable: $isEditor,
            onUpdate(html) { pageNum = html; emit(); },
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
        });
        el.addEventListener('focusin',  () => setActive(editors[idx]));
        el.addEventListener('focusout', () => {
            setTimeout(() => {
                const anyFocused = Object.values(editors).some((ed) => ed?.view?.hasFocus?.());
                if (!anyFocused) setActive(null);
            }, 60);
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
        emit();
    }

    function moveDown(idx) {
        if (idx >= elements.length - 1) return;
        [elements[idx], elements[idx + 1]] = [elements[idx + 1], elements[idx]];
        elements = [...elements];
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
        pendingIdx        = null;
        fileInput.value   = '';
    }

    // ── lifecycle ─────────────────────────────────────────────────────────────

    onMount(() => {
        mountPageNumEditor();
        elements.forEach((_, i) => mountEditor(i));
    });

    onDestroy(destroyAll);

    // Callback ref helper for Svelte 5 (bind:this doesn't work in {#each} cleanly)
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
                            class:cursor-pointer={$isEditor}
                            onclick={() => promptImage(idx)}
                        />
                    </figure>

                {:else if elem.type === 'id-card'}
                    <div class="book-id-grid" use:setElemRef={idx}></div>
                {/if}

                {#if $isEditor}
                    <div class="element-tools editor-only">
                        <button type="button" class="et-up"   title="Monter"   onclick={() => moveUp(idx)}><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="et-down" title="Descendre" onclick={() => moveDown(idx)}><i class="fas fa-arrow-down"></i></button>
                        {#if elem.type === 'photo'}
                        <button type="button" class="et-rotate" title="Tourner" onclick={() => rotateEl(idx)}><i class="fas fa-rotate-right"></i></button>
                        {/if}
                        <button type="button" class="et-del" title="Supprimer" onclick={() => removeEl(idx)}><i class="fas fa-times"></i></button>
                    </div>
                {/if}
            </div>
        {/each}

    </div>

    <!-- Page number (Tiptap) -->
    <div class="book-page-num" bind:this={pageNumEl}></div>

    {#if hasBlot}
        <div class="book-decoration book-decoration--blot" aria-hidden="true"></div>
    {/if}
</div>
