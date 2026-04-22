<script>
    import { FONT_FAMILIES, FONT_SIZES, INK_COLORS } from '../lib/tiptap.js';
    import { isEditor } from '../stores/editor.js';
    import { activeEditor } from '../stores/toolbar.js';
    import { trStore } from '../lib/i18n.js';

    // Reads directly from the global store — no prop drilling needed
    $: visible = $isEditor && $activeEditor !== null;

    function cmd(command, ...args) {
        if (!$activeEditor) return;
        $activeEditor.chain().focus()[command](...args).run();
    }

    function setFont(e)  { cmd('setFontFamily', e.target.value); }
    function setSize(e)  { cmd('setFontSize', e.target.value); }
    function setColor(c) { cmd('setColor', c); }

    function isActive(name, attrs) {
        return $activeEditor?.isActive(name, attrs) ?? false;
    }
</script>

{#if visible}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div
    id="format-toolbar"
    class="format-toolbar"
    role="toolbar"
    aria-label={$trStore('format_toolbar_aria')}
    tabindex="-1"
    onmousedown={(e) => {
        // Allow mousedown on select elements so native dropdowns open
        if (e.target.closest('select')) return;
        e.preventDefault();
    }}
>
    <div class="ft-group">
        <select class="ft-select" title={$trStore('ft_police')} onchange={setFont}>
            {#each FONT_FAMILIES as group}
                <optgroup label={group.group}>
                    {#each group.fonts as f}
                        <option value={f.value}>{f.label}</option>
                    {/each}
                </optgroup>
            {/each}
        </select>
        <select class="ft-select ft-size" title={$trStore('ft_taille')} onchange={setSize}>
            {#each FONT_SIZES as s}
                <option value={s.value}>{s.label}</option>
            {/each}
        </select>
    </div>

    <div class="ft-group">
        <button type="button" class="ft-btn" class:is-active={isActive('bold')}
            title={$trStore('ft_gras')} onclick={() => cmd('toggleBold')}>
            <i class="fas fa-bold"></i>
        </button>
        <button type="button" class="ft-btn" class:is-active={isActive('italic')}
            title={$trStore('ft_italique')} onclick={() => cmd('toggleItalic')}>
            <i class="fas fa-italic"></i>
        </button>
        <button type="button" class="ft-btn" class:is-active={isActive('underline')}
            title={$trStore('ft_souligne')} onclick={() => cmd('toggleUnderline')}>
            <i class="fas fa-underline"></i>
        </button>
        <button type="button" class="ft-btn" class:is-active={isActive('strike')}
            title={$trStore('ft_barre')} onclick={() => cmd('toggleStrike')}>
            <i class="fas fa-strikethrough"></i>
        </button>
    </div>

    <div class="ft-group ft-inks">
        {#each INK_COLORS as ink}
            <button
                type="button"
                class="ft-ink"
                title={ink.label}
                style="background:{ink.value}"
                onclick={() => setColor(ink.value)}
            ></button>
        {/each}
    </div>

    <div class="ft-group">
        <button type="button" class="ft-btn" class:is-active={isActive('paragraph', { textAlign: 'left' })}
            title={$trStore('ft_align_left')} onclick={() => cmd('setTextAlign', 'left')}>
            <i class="fas fa-align-left"></i>
        </button>
        <button type="button" class="ft-btn" class:is-active={isActive('paragraph', { textAlign: 'center' })}
            title={$trStore('ft_center')} onclick={() => cmd('setTextAlign', 'center')}>
            <i class="fas fa-align-center"></i>
        </button>
        <button type="button" class="ft-btn" class:is-active={isActive('paragraph', { textAlign: 'right' })}
            title={$trStore('ft_align_right')} onclick={() => cmd('setTextAlign', 'right')}>
            <i class="fas fa-align-right"></i>
        </button>
        <button type="button" class="ft-btn" class:is-active={isActive('paragraph', { textAlign: 'justify' })}
            title={$trStore('ft_justify')} onclick={() => cmd('setTextAlign', 'justify')}>
            <i class="fas fa-align-justify"></i>
        </button>
    </div>

    <div class="ft-group">
        <button type="button" class="ft-btn" title={$trStore('ft_clear_format')}
            onclick={() => cmd('unsetAllMarks')}>
            <i class="fas fa-eraser"></i>
        </button>
    </div>
</div>
{/if}
