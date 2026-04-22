<script>
    import { tick }            from 'svelte';
    import BookSpread          from './BookSpread.svelte';
    import FormatToolbar       from './FormatToolbar.svelte';
    import { isEditor }        from '../stores/editor.js';
    import { currentSpreadIdx, totalSpreads } from '../stores/journal.js';
    import { defaultSpread }   from '../lib/spreadParser.js';

    let {
        spreads  = $bindable([]),
        fields   = $bindable({}),
        images   = $bindable([]),
        modal    = null,
        onSave   = () => {},
        footer,
    } = $props();

    let activeEditor = $state(null);
    let isFlipping   = $state(false);
    let directionMap = $state({});

    $effect(() => { $totalSpreads = spreads.length || 1; });

    let canPrev = $derived($currentSpreadIdx > 0);
    let canNext = $derived($currentSpreadIdx < spreads.length - 1);

    function getField(id, fallback = '') {
        return fields[id] ?? fallback;
    }

    function updateField(id, value) {
        fields = { ...fields, [id]: value };
        onSave();
    }

    function goTo(idx) {
        if (isFlipping || idx === $currentSpreadIdx) return;
        if (idx < 0 || idx >= spreads.length)       return;
        isFlipping = true;

        const from = $currentSpreadIdx;
        const fwd  = idx > from;

        directionMap = {
            [from]: fwd ? 'leaving-forward'  : 'leaving-backward',
            [idx]:  fwd ? 'entering-forward' : 'entering-backward',
        };

        $currentSpreadIdx = idx;

        setTimeout(() => {
            directionMap  = {};
            isFlipping    = false;
        }, 440);
    }

    function prevSpread() { goTo($currentSpreadIdx - 1); }
    function nextSpread() { goTo($currentSpreadIdx + 1); }

    function onKeydown(e) {
        const active = document.activeElement;
        if (active?.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(active?.tagName)) return;
        if (e.key === 'ArrowLeft')  prevSpread();
        if (e.key === 'ArrowRight') nextSpread();
    }

    async function addSpread() {
        if (!$isEditor) return;
        spreads = [...spreads, defaultSpread()];
        $totalSpreads = spreads.length;
        await tick();
        goTo(spreads.length - 1);
        onSave();
    }

    async function removeSpread() {
        if (!$isEditor) return;
        if (spreads.length <= 1) {
            await modal?.({ message: 'Impossible : il doit rester au moins une double-page.', confirmOnly: true });
            return;
        }
        const ok = await modal?.({ message: 'Supprimer définitivement la double-page actuelle ?' });
        if (!ok) return;
        spreads = spreads.filter((_, i) => i !== $currentSpreadIdx);
        $totalSpreads = spreads.length;
        $currentSpreadIdx = Math.min($currentSpreadIdx, spreads.length - 1);
        onSave();
    }

    function onSpreadUpdate(idx, updatedSpread) {
        spreads[idx] = updatedSpread;
        spreads = [...spreads];
        onSave();
    }
</script>

<svelte:window onkeydown={onKeydown} />

<div id="journal-screen" class="screen active">
    <div class="journal-wrap journal-wrap--book">
        <div class="journal-stamp">CONFIDENTIEL</div>

        <!-- FIX: header fields are now editable and wired to fields store -->
        <header class="journal-header journal-header--book">
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <p
                class="journal-doc-id"
                contenteditable={$isEditor ? 'true' : 'false'}
                onblur={(e) => updateField('journal-doc', e.target.innerHTML)}
            >{@html getField('journal-doc', 'DOCUMENT — NIVEAU D / USAGE RP')}</p>
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <h1
                class="journal-title"
                contenteditable={$isEditor ? 'true' : 'false'}
                onblur={(e) => updateField('journal-title', e.target.innerHTML)}
            >{@html getField('journal-title', 'JOURNAL INTIME')}</h1>
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <p
                class="journal-author"
                contenteditable={$isEditor ? 'true' : 'false'}
                onblur={(e) => updateField('journal-author', e.target.innerHTML)}
            >{@html getField('journal-author', 'Lua Tyler — citoyenne — U.N.I.S.C.A.')}</p>
        </header>

        <!-- Format toolbar (appears on text focus in editor mode) -->
        <FormatToolbar bind:activeEditor />

        <!-- Book viewer -->
        <div class="book-viewer" id="book-viewer">
            <button
                type="button"
                class="book-nav book-nav--prev"
                aria-label="Page précédente"
                disabled={!canPrev}
                onclick={prevSpread}
            >
                <i class="fas fa-chevron-left"></i>
            </button>

            <div class="book-stage" id="book-stage">
                <div class="journal-book" id="journal-entries">
                    {#each spreads as spread, idx (idx)}
                        <BookSpread
                            {spread}
                            isCurrent={idx === $currentSpreadIdx}
                            direction={directionMap[idx] ?? null}
                            setActive={(ed) => (activeEditor = ed)}
                            onUpdate={(s) => onSpreadUpdate(idx, s)}
                        />
                    {/each}
                </div>
            </div>

            <button
                type="button"
                class="book-nav book-nav--next"
                aria-label="Page suivante"
                disabled={!canNext}
                onclick={nextSpread}
            >
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>

        <!-- Pager -->
        <div class="book-pager">
            <span class="book-pager-current">{$currentSpreadIdx + 1}</span>
            <span class="book-pager-sep">/</span>
            <span class="book-pager-total">{spreads.length}</span>
        </div>

        <!-- Add/remove spread buttons (editor only) -->
        {#if $isEditor}
        <div class="journal-toolbar">
            <button type="button" class="btn-journal-add editor-only"
                title="Ajouter une double-page" onclick={addSpread}>
                <i class="fas fa-plus"></i> Ajouter une double-page
            </button>
            <button type="button" class="btn-journal-add editor-only"
                title="Supprimer la double-page actuelle" onclick={removeSpread}>
                <i class="fas fa-trash"></i> Supprimer cette double-page
            </button>
        </div>
        {/if}

        <footer class="journal-footer">
            {@render footer?.()}
        </footer>
    </div>
</div>
