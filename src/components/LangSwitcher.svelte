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
        <span class="lang-flag" aria-hidden="true">
            <svg class="lang-flag-svg" viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg">
                <rect width="1" height="2" fill="#002395" />
                <rect x="1" width="1" height="2" fill="#fff" />
                <rect x="2" width="1" height="2" fill="#ED2939" />
            </svg>
        </span>
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
        <span class="lang-flag" aria-hidden="true">
            <svg class="lang-flag-svg" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
                <path fill="#012169" d="M0 0h60v30H0z" />
                <path stroke="#fff" stroke-width="6" d="M0 0l60 30M60 0L0 30" />
                <path stroke="#C8102E" stroke-width="4" d="M0 0l60 30M60 0L0 30" />
                <path stroke="#fff" stroke-width="10" d="M30 0v30M0 15h60" />
                <path stroke="#C8102E" stroke-width="6" d="M30 0v30M0 15h60" />
            </svg>
        </span>
    </button>
</div>
