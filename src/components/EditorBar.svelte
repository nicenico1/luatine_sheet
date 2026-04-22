<script>
    import { isEditor, lockEditor } from '../stores/editor.js';
    import { trStore } from '../lib/i18n.js';
    import LangSwitcher from './LangSwitcher.svelte';

    let { onExport = () => {}, onImport = () => {}, modal = null } = $props();

    async function handleLock() {
        // Try to show a confirmation modal if available
        // If modal is not wired or returns null/undefined, still lock
        let confirmed = true;
        if (modal) {
            const result = await modal({
                message: $trStore('script_lock_confirm'),
            });
            // result is true (OK clicked) or false (Cancel) — never undefined when modal is set
            confirmed = result === true;
        }
        if (confirmed) lockEditor();
    }

    let importInput = $state(null);
    function triggerImport() { importInput.value = ''; importInput.click(); }

    function onFileChange() {
        const file = importInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => onImport(reader.result);
        reader.readAsText(file);
        importInput.value = '';
    }
</script>

{#if $isEditor}
<div id="editor-bar" class="editor-bar" role="status">
    <span class="editor-bar-title"><i class="fas fa-pen"></i> {$trStore('editor_title')}</span>
    <div class="editor-bar-lang">
        <LangSwitcher switcherId="lang-switcher-editor" />
    </div>
    <div class="editor-bar-actions">
        <button type="button" class="btn-text btn-editor-action" onclick={onExport}>
            {$trStore('editor_export')}
        </button>
        <button type="button" class="btn-text btn-editor-action" onclick={triggerImport}>
            {$trStore('editor_import')}
        </button>
        <input
            type="file"
            accept="application/json,.json"
            class="visually-hidden"
            aria-hidden="true"
            bind:this={importInput}
            onchange={onFileChange}
        />
    </div>
    <button type="button" class="btn-text btn-lock" onclick={handleLock}>
        {$trStore('editor_lock')}
    </button>
    <p class="editor-publish-hint">
        {@html $trStore('editor_hint')}
    </p>
</div>
{/if}
