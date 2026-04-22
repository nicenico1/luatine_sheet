<script>
    let visible      = $state(false);
    let message      = $state('');
    let showInput    = $state(false);
    let confirmOnly  = $state(false);
    let inputValue   = $state('');
    let inputEl      = $state(null);
    let resolve      = $state(null);

    let isPassword = $derived(
        message.toLowerCase().includes('mot de passe') ||
        message.toLowerCase().includes('password')
    );

    export function open(opts = {}) {
        message     = opts.message      ?? '';
        showInput   = opts.input        ?? false;
        confirmOnly = opts.confirmOnly  ?? false;
        inputValue  = opts.defaultValue ?? '';
        visible     = true;

        if (showInput) {
            setTimeout(() => inputEl?.focus(), 30);
        }

        return new Promise((res) => { resolve = res; });
    }

    function onOk() {
        visible = false;
        resolve?.(showInput ? inputValue : true);
    }

    function onCancel() {
        visible = false;
        resolve?.(showInput ? null : false);
    }

    function onKey(e) {
        if (e.key === 'Enter')  onOk();
        if (e.key === 'Escape') onCancel();
    }

    function onBackdrop(e) {
        if (e.target === e.currentTarget) onCancel();
    }
</script>

{#if visible}
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div
    class="fiche-modal-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={onBackdrop}
    onkeydown={onKey}
>
    <div class="fiche-modal">
        <p class="fiche-modal-message">{message}</p>

        {#if showInput}
            <input
                bind:this={inputEl}
                bind:value={inputValue}
                type={isPassword ? 'password' : 'text'}
                class="fiche-modal-input"
                autocomplete="off"
                onkeydown={onKey}
            />
        {/if}

        <div class="fiche-modal-actions">
            {#if !confirmOnly}
                <button type="button" class="fiche-modal-btn fiche-modal-cancel" onclick={onCancel}>
                    Annuler
                </button>
            {/if}
            <button type="button" class="fiche-modal-btn fiche-modal-ok" onclick={onOk}>
                OK
            </button>
        </div>
    </div>
</div>
{/if}
