<script>
    import { lang, setLang, trStore } from '../lib/i18n.js';

    function pick(next) {
        setLang(next);
    }
</script>

<div
    id="lang-switcher"
    class="lang-switcher"
    role="group"
    aria-label={$trStore('lang_switcher_aria')}
>
    <button
        type="button"
        class="lang-btn"
        class:lang-btn--active={$lang === 'fr'}
        data-lang="fr"
        onclick={() => pick('fr')}
        aria-pressed={$lang === 'fr'}
    >
        FR
    </button>
    <button
        type="button"
        class="lang-btn"
        class:lang-btn--active={$lang === 'en'}
        data-lang="en"
        onclick={() => pick('en')}
        aria-pressed={$lang === 'en'}
    >
        EN
    </button>
</div>
