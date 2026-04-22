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
        class="lang-btn lang-btn--flag"
        class:lang-btn--active={$lang === 'fr'}
        data-lang="fr"
        onclick={() => pick('fr')}
        aria-pressed={$lang === 'fr'}
        aria-label={$trStore('lang_btn_fr_aria')}
        title={$trStore('lang_btn_fr_aria')}
    >
        <span class="lang-flag" aria-hidden="true">🇫🇷</span>
    </button>
    <button
        type="button"
        class="lang-btn lang-btn--flag"
        class:lang-btn--active={$lang === 'en'}
        data-lang="en"
        onclick={() => pick('en')}
        aria-pressed={$lang === 'en'}
        aria-label={$trStore('lang_btn_en_aria')}
        title={$trStore('lang_btn_en_aria')}
    >
        <span class="lang-flag" aria-hidden="true">🇬🇧</span>
    </button>
</div>
