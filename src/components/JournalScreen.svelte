<script>
    import { tick }            from 'svelte';
    import BookSpread          from './BookSpread.svelte';
    import FormatToolbar       from './FormatToolbar.svelte';
    import { isEditor }        from '../stores/editor.js';
    import { activeEditor }   from '../stores/toolbar.js';
    import { currentSpreadIdx, totalSpreads } from '../stores/journal.js';
    import { defaultSpread }   from '../lib/spreadParser.js';
    import { trStore, lang }   from '../lib/i18n.js';
    import { normalizeFieldValue, getBilingualHtml } from '../lib/bilingualFields.js';
    import { findSpreadIndexForPageLabel } from '../lib/journalSummary.js';

    let {
        spreads        = $bindable([]),
        journalSummary = $bindable([]),
        fields         = $bindable({}),
        images         = $bindable([]),
        modal          = null,
        onSave         = () => {},
        footer,
    } = $props();

    function getField(id, fallback = '') {
        return getBilingualHtml(fields[id], $lang, fallback);
    }

    function updateField(id, value) {
        const L = $lang;
        const prev = normalizeFieldValue(fields[id]);
        if (L === 'en') {
            fields = { ...fields, [id]: { ...prev, en: value } };
        } else {
            fields = { ...fields, [id]: { ...prev, fr: value } };
        }
        onSave();
    }

    let isFlipping   = $state(false);
    let directionMap = $state({});

    /** Bumps when UI language changes so BookSpread/BookPage remount and Tiptap reloads content. */
    let journalRemountKey = $state(0);
    let prevJournalLang = $state(/** @type {'fr'|'en'|null} */ (null));
    $effect(() => {
        const L = $lang;
        if (prevJournalLang !== null && prevJournalLang !== L) {
            journalRemountKey += 1;
            activeEditor.set(null);
        }
        prevJournalLang = L;
    });

    $effect(() => { $totalSpreads = spreads.length || 1; });

    let canPrev = $derived($currentSpreadIdx > 0);
    let canNext = $derived($currentSpreadIdx < spreads.length - 1);

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
            await modal?.({ message: $trStore('journal_remove_forbidden'), confirmOnly: true });
            return;
        }
        const ok = await modal?.({ message: $trStore('journal_remove_confirm') });
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

    function addSummaryRow() {
        journalSummary = [...journalSummary, { title: '', page: '' }];
        onSave();
    }

    function removeSummaryRow(i) {
        journalSummary = journalSummary.filter((_, j) => j !== i);
        onSave();
    }

    function patchSummaryRow(i, patch) {
        journalSummary = journalSummary.map((row, j) => (j === i ? { ...row, ...patch } : row));
        onSave();
    }

    async function jumpToSummaryPage(pageRaw) {
        const idx = findSpreadIndexForPageLabel(spreads, pageRaw);
        if (idx < 0) {
            await modal?.({ message: $trStore('journal_summary_not_found'), confirmOnly: true });
            return;
        }
        goTo(idx);
    }
</script>

<svelte:window onkeydown={onKeydown} />

<div id="journal-screen" class="screen active">
    <div class="journal-wrap journal-wrap--book">
        <div class="journal-stamp">{$trStore('journal_stamp')}</div>

        <!-- FIX: header fields are now editable and wired to fields store -->
        <header class="journal-header journal-header--book">
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <p
                class="journal-doc-id"
                contenteditable={$isEditor ? 'true' : 'false'}
                onblur={(e) => updateField('journal-doc', e.target.innerHTML)}
            >{@html getField('journal-doc', $trStore('journal_doc'))}</p>
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <h1
                class="journal-title"
                contenteditable={$isEditor ? 'true' : 'false'}
                onblur={(e) => updateField('journal-title', e.target.innerHTML)}
            >{@html getField('journal-title', $trStore('journal_title'))}</h1>
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <p
                class="journal-author"
                contenteditable={$isEditor ? 'true' : 'false'}
                onblur={(e) => updateField('journal-author', e.target.innerHTML)}
            >{@html getField('journal-author', $trStore('journal_author'))}</p>
        </header>

        <!-- Format toolbar — reads from activeEditor store directly -->
        <FormatToolbar />

        {#if journalSummary.length > 0 || $isEditor}
        <section class="journal-summary" aria-label={$trStore('journal_summary_heading')}>
            <h2 class="journal-summary__title">{$trStore('journal_summary_heading')}</h2>
            {#if $isEditor}
            <p class="journal-summary__hint">{$trStore('journal_summary_hint')}</p>
            {/if}
            <ul class="journal-summary__list">
                {#each journalSummary as row, i (i)}
                    <li class="journal-summary__item">
                        {#if $isEditor}
                        <input
                            class="journal-summary__input journal-summary__input--title"
                            type="text"
                            value={row.title}
                            placeholder={$trStore('journal_summary_title_ph')}
                            oninput={(e) => patchSummaryRow(i, { title: e.currentTarget.value })}
                        />
                        <input
                            class="journal-summary__input journal-summary__input--page"
                            type="text"
                            inputmode="numeric"
                            value={row.page}
                            placeholder={$trStore('journal_summary_page_ph')}
                            oninput={(e) => patchSummaryRow(i, { page: e.currentTarget.value })}
                        />
                        <button
                            type="button"
                            class="journal-summary__remove editor-only"
                            title={$trStore('journal_summary_remove')}
                            aria-label={$trStore('journal_summary_remove')}
                            onclick={() => removeSummaryRow(i)}
                        >
                            <i class="fas fa-times"></i>
                        </button>
                        {:else}
                        <button
                            type="button"
                            class="journal-summary__link"
                            onclick={() => jumpToSummaryPage(row.page)}
                        >
                            <span class="journal-summary__link-title">{row.title || row.page}</span>
                            {#if row.title && row.page}
                            <span class="journal-summary__link-meta">({row.page})</span>
                            {/if}
                        </button>
                        {/if}
                    </li>
                {/each}
            </ul>
            {#if $isEditor}
            <button type="button" class="journal-summary__add btn-journal-add editor-only" onclick={addSummaryRow}>
                <i class="fas fa-plus"></i> {$trStore('journal_summary_add')}
            </button>
            {/if}
        </section>
        {/if}

        <!-- Book viewer -->
        <div class="book-viewer" id="book-viewer">
            <button
                type="button"
                class="book-nav book-nav--prev"
                aria-label={$trStore('aria_prev')}
                disabled={!canPrev}
                onclick={prevSpread}
            >
                <i class="fas fa-chevron-left"></i>
            </button>

            <div class="book-stage" id="book-stage">
                {#key journalRemountKey}
                <div class="journal-book" id="journal-entries">
                    {#each spreads as spread, idx (idx)}
                        <BookSpread
                            {spread}
                            isCurrent={idx === $currentSpreadIdx}
                            direction={directionMap[idx] ?? null}
                            onUpdate={(s) => onSpreadUpdate(idx, s)}
                        />
                    {/each}
                </div>
                {/key}
            </div>

            <button
                type="button"
                class="book-nav book-nav--next"
                aria-label={$trStore('aria_next')}
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
                title={$trStore('journal_title_add_spread')} onclick={addSpread}>
                <i class="fas fa-plus"></i> {$trStore('journal_btn_add_spread')}
            </button>
            <button type="button" class="btn-journal-add editor-only"
                title={$trStore('journal_title_remove_spread')} onclick={removeSpread}>
                <i class="fas fa-trash"></i> {$trStore('journal_btn_remove_spread')}
            </button>
        </div>
        {/if}

        <footer class="journal-footer">
            {@render footer?.()}
        </footer>
    </div>
</div>
