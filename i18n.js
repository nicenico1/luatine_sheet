/**
 * FR / EN — toutes les chaînes du site (UI + textes par défaut).
 */
(function () {
    const STORAGE_LANG = 'fiche_lang';

    const I18N = {
        fr: {
            meta_title: 'Dossier Citoyen - Lua Tyler',
            splash_text: '"There it is, the story of how I died... - Lua Tyler"',
            chars_title: 'PERSONNAGES',
            btn_back: 'RETOUR',
            btn_back_dossier: 'RETOUR AU DOSSIER',
            btn_next: 'SUIVANT',
            btn_finish: 'TERMINER',
            img_placeholder_card: "Cliquez pour changer l'image",
            img_placeholder_model: 'Cliquez pour changer le modèle',
            menu_dossier: 'DOSSIER<br>CITOYEN',
            nav_personnage: 'PERSONNAGE',
            nav_famille: 'FAMILLE',
            nav_apparences: 'APPARENCES',
            nav_cheveux: 'CHEVEUX',
            nav_vetements: 'VÊTEMENTS',
            nav_traits: 'TRAITS',
            lab_nom_genre: 'Prénom Nom',
            warn_nom: 'Votre nom doit contenir au minimum 4 caractères (9 / 32)',
            lab_genetique: 'DESCRIPTION GÉNÉTIQUE',
            dd_age: 'ÂGE',
            dd_yeux: 'COULEUR DES YEUX',
            warn_genetique: 'Les valeurs de description génétique sont permanentes.',
            lab_langue: 'SECONDE LANGUE',
            dd_langue: 'LANGUAGE',
            lab_physique: 'DESCRIPTION PHYSIQUE',
            phys_combined:
                "Décrivez l'apparence physique de votre personnage ici...<br><br>Lua est une citoyenne d'apparence fatiguée, portant des lunettes à monture noire. Ses vêtements standards de l'U.N.I.S.C.A. sont légèrement usés par le temps.",
            warn_physique: 'Votre description doit contenir au minimum 32 caractères (150 / 512)',
            famille_heading: 'INFORMATIONS FAMILIALES',
            famille_warn:
                "Aucun membre de la famille n'est dans votre district. Cette partie est facultative. (Ces informations pourraient être connues en RP.)",
            membre_mere: 'MÈRE',
            membre_pere: 'PÈRE',
            membre1: 'MEMBRE DE LA FAMILLE 1',
            membre2: 'MEMBRE DE LA FAMILLE 2',
            membre3: 'MEMBRE DE LA FAMILLE 3',
            dd_type: 'TYPE',
            nom_membre_ph: 'Nom...',
            info_membre_ph: 'Informations...',
            app_heading: 'APPARENCES GÉNÉRALES',
            app_warn: 'Décrivez ce qui est visible au premier regard (visage, corpulence, démarche, etc.).',
            lab_visage: 'VISAGE & SILHOUETTE',
            visage_ph: 'Traits du visage, teint, cicatrices visibles, corpulence, posture...',
            lab_presence: 'CARACTÈRE',
            presence_ph: 'Tempérament, attitude, façon d’être en société...',
            cheveux_heading: 'CHEVEUX',
            lab_coupe: 'COUPE / STYLE',
            dd_style: 'STYLE',
            lab_couleur: 'COULEUR',
            dd_couleur: 'COULEUR',
            lab_longueur: 'LONGUEUR',
            dd_longueur: 'LONGUEUR',
            lab_details_rp: 'DÉTAILS (RP)',
            cheveux_ph: 'Châtain, tirés en arrière, mèches rebelles, etc.',
            vet_heading: 'VÊTEMENTS & TENUE',
            vet_warn: 'Tenue habituelle et accessoires portés en permanence.',
            lab_tenue: 'TENUE HABITUELLE',
            tenue_ph: 'Veste U.N.I.S.C.A., pantalon sombre, chaussures usées...',
            lab_accessoires: 'ACCESSOIRES',
            acc_ph: 'Lunettes, badge, sac, montre...',
            traits_heading: 'SÉLECTION DES TRAITS',
            traits_warn: 'Les traits sont des archétypes utilisés par les maîtres du jeu.',
            traits_count: 'Traits sélectionnés : 0 / 4',
            trait_num: 'TRAIT #1',
            trait_nom: 'LOGIQUE',
            trait_sub: 'Intellect — Le monde des idées',
            trait_desc: 'Arme de votre force intellectuelle, décryptez le monde environnant.',
            btn_valider_trait: 'VALIDER CE TRAIT',
            attr_heading: 'SÉLECTION DES ATTRIBUTS',
            points_left: 'point(s) restant(s)',
            skill_heading: 'SÉLECTION DES COMPÉTENCES',
            attr_force: 'FORCE',
            attr_force_desc: 'Bonus majeur aux armes à feu / Bonus mineur à la vitesse et au craft.',
            attr_perc: 'PERCEPTION',
            attr_perc_desc: 'Bonus majeur à la cuisine / Bonus mineur à la contrebande et aux armes.',
            attr_agi: 'AGILITÉ',
            attr_agi_desc: 'Bonus majeur à la contrebande et à la vitesse / Bonus mineur à la médecine.',
            attr_int: 'INTELLIGENCE',
            attr_int_desc: 'Bonus majeur à la médecine et au craft / Bonus mineur à la cuisine.',
            warn_attr: 'Les attributs sont permanents et ne peuvent être modifiés que temporairement en RP selon les règles du serveur.',
            skill_meta: "Niveaux d'attribut : +0",
            sk_med: 'MÉDECINE',
            sk_med_desc: 'Soignez-vous et soignez les autres.',
            sk_contre: 'CONTREBANDE',
            sk_contre_desc: 'Achetez des marchandises illégales au marché noir.',
            sk_armes: 'ARMES À FEU',
            sk_armes_desc: 'Connaissance du maniement des armes à feu.',
            sk_vit: 'VITESSE',
            sk_vit_desc: "Gagnez l'initiative au combat, courez plus loin et plus vite.",
            sk_cuisine: 'CUISINE',
            sk_cuisine_desc: 'Votre talent culinaire.',
            sk_cac: 'CORPS À CORPS',
            sk_cac_desc: 'Votre maîtrise des armes de mêlée.',
            sk_art: 'ARTISANAT',
            sk_art_desc: "Réparation, démontage et fabrication d'objets.",
            warn_skills: 'Les compétences ont un niveau maximum de 50.',
            parcours_heading: 'SÉLECTION DU PARCOURS',
            parcours_ph:
                "Aucune sélection de parcours disponible pour cette faction — décrivez ici le parcours RP de Lua (études, emplois, événements marquants avant l'arrivée à City 17).",
            hist_heading: 'HISTOIRE & PARCOURS (RP)',
            hist_ph: "Enfance, formation, pertes, ralliement à l'U.N.I.S.C.A., tout ce qui forge le personnage aujourd'hui...",
            journal_stamp: 'CONFIDENTIEL',
            journal_doc: 'DOCUMENT — NIVEAU D / USAGE RP',
            journal_title: 'JOURNAL INTIME',
            journal_author: 'Lua Tyler — citoyenne — U.N.I.S.C.A.',
            book_p1:
                "City 9 ne ressemble à rien de ce que j'avais lu dans les romans de mon père. Ici, être loyaliste, c'est coopérer avec la Protection civile, accepter les rationnements, fermer les yeux sur ce qu'on entend la nuit. J'écris ces lignes pour moi seule — si quelqu'un les lit plus tard, qu'il sache que ce n'était pas de la lâcheté, seulement de la survie.",
            book_cap1: 'Lua Tyler — Summer 2023.<br>—<br>Paris, City 9.',
            img_ph_journal: 'Portrait (éditeur = URL)',
            id_heading: 'Identity card',
            id_col1:
                'Name: Lua Tyler (Daisy).<br>Height: 170cm.<br>Weight: 52kg.<br>Eyes: Brown.<br>Age: 29.',
            id_col2: 'Birth: May 3, 1998 — Seattle.',
            id_bio_label: 'Biography:',
            id_bio_text:
                "Famille, livres de fantasy dans l'appartement trop petit, puis le voyage scolaire qui a coïncidé avec l'arrivée d'une espèce extraterrestre qui a conquis la Terre en quelques heures. Les lignes de redirection, les villes numérotées — je me suis retrouvée à City 9 pendant sa construction, quelque part entre ce qui restait de Paris et ce que les Combine voulaient en faire.",
            monster_cap: '« Monster » — City 9 Incident 2024',
            cap_xmas: 'Lua Tyler — 25th December 2022.<br>—<br>Christmas Eve in City 9',
            btn_add_journal: 'Ajouter une double-page',
            tpl_write_left: 'Écrire sur la page de gauche…',
            tpl_caption: 'Légende — lieu — date.',
            editor_title: 'Mode éditeur',
            editor_export: 'Exporter JSON',
            editor_import: 'Importer JSON',
            editor_lock: 'Verrouiller',
            editor_hint:
                '<strong>Publication :</strong> la navigation privée et les autres lecteurs ne voient que ce qui est sur GitHub. Après tes modifs, clique <strong>Exporter JSON</strong>, enregistre le fichier sous <code>data/fiche-export.json</code>, puis <code>git add</code> / <code>commit</code> / <code>push</code>.',
            editor_fab: 'Mode éditeur',
            aria_prev: 'Précédent',
            aria_next: 'Suivant',
            script_prompt_pwd: 'Mot de passe — mode éditeur :',
            script_wrong_pwd: 'Mot de passe incorrect.',
            script_lock_confirm:
                'Passer en lecture seule ? Les visiteurs ne pourront plus modifier la page.',
            script_export_alert:
                'Fichier téléchargé.\n\n1) Renomme-le exactement : fiche-export.json\n2) Mets-le dans le dossier data/ de ton projet (à côté de index.html)\n3) git add data/fiche-export.json && git commit -m "Données fiche" && git push\n\nSans cette étape, seul ton navigateur mémorise les changements — pas le site pour les autres ni la navigation privée.',
            script_import_ok: 'Import terminé.',
            script_import_bad: 'Fichier JSON invalide.',
            script_prompt_img: "URL de l'image (lien direct .png, .jpg, etc.) :",
            tpl_aria_spread: 'Nouvelle double page',
            spread_aria_1: 'Double page 1',
            spread_aria_2: 'Double page 2',
            tpl_photo_ph: 'Photo',
            emblem_title: 'Emblème (décoratif)',
            lang_switcher_aria: 'Choisir la langue',
            alt_model: 'Modèle personnage',
            jimg_photo1: 'Photo 1',
            jimg_sketch: 'Croquis',
            jimg_portrait: 'Portrait',
        },
        en: {
            meta_title: 'Citizen File - Lua Tyler',
            splash_text: '"There it is, the story of how I died... - Lua Tyler"',
            chars_title: 'CHARACTERS',
            btn_back: 'BACK',
            btn_back_dossier: 'BACK TO FILE',
            btn_next: 'NEXT',
            btn_finish: 'FINISH',
            img_placeholder_card: 'Click to change image',
            img_placeholder_model: 'Click to change model',
            menu_dossier: 'CITIZEN<br>FILE',
            nav_personnage: 'CHARACTER',
            nav_famille: 'FAMILY',
            nav_apparences: 'APPEARANCE',
            nav_cheveux: 'HAIR',
            nav_vetements: 'CLOTHING',
            nav_traits: 'TRAITS',
            lab_nom_genre: 'First name Last name',
            warn_nom: 'Your name must be at least 4 characters (9 / 32)',
            lab_genetique: 'GENETIC DESCRIPTION',
            dd_age: 'AGE',
            dd_yeux: 'EYE COLOR',
            warn_genetique: 'Genetic description values are permanent.',
            lab_langue: 'SECOND LANGUAGE',
            dd_langue: 'LANGUAGE',
            lab_physique: 'PHYSICAL DESCRIPTION',
            phys_combined:
                'Describe your character’s physical appearance here...<br><br>Lua looks tired; she wears black-rimmed glasses. Her standard U.N.I.S.C.A. clothes are slightly worn from daily life.',
            warn_physique: 'Your description must be at least 32 characters (150 / 512)',
            famille_heading: 'FAMILY INFORMATION',
            famille_warn:
                'No family members are in your district. This section is optional. (This may be known in RP.)',
            membre_mere: 'MOTHER',
            membre_pere: 'FATHER',
            membre1: 'FAMILY MEMBER 1',
            membre2: 'FAMILY MEMBER 2',
            membre3: 'FAMILY MEMBER 3',
            dd_type: 'TYPE',
            nom_membre_ph: 'Name...',
            info_membre_ph: 'Notes...',
            app_heading: 'GENERAL APPEARANCE',
            app_warn: 'Describe what is visible at first glance (face, build, gait, etc.).',
            lab_visage: 'FACE & SILHOUETTE',
            visage_ph: 'Facial features, complexion, visible scars, build, posture...',
            lab_presence: 'CHARACTER',
            presence_ph: 'Temperament, attitude, how they come across...',
            cheveux_heading: 'HAIR',
            lab_coupe: 'CUT / STYLE',
            dd_style: 'STYLE',
            lab_couleur: 'COLOR',
            dd_couleur: 'COLOR',
            lab_longueur: 'LENGTH',
            dd_longueur: 'LENGTH',
            lab_details_rp: 'DETAILS (RP)',
            cheveux_ph: 'Chestnut, pulled back, stray strands, etc.',
            vet_heading: 'CLOTHING & OUTFIT',
            vet_warn: 'Usual outfit and accessories worn daily.',
            lab_tenue: 'USUAL OUTFIT',
            tenue_ph: 'U.N.I.S.C.A. jacket, dark trousers, worn shoes...',
            lab_accessoires: 'ACCESSORIES',
            acc_ph: 'Glasses, badge, bag, watch...',
            traits_heading: 'TRAIT SELECTION',
            traits_warn: 'Traits are archetypes used by game masters.',
            traits_count: 'Traits selected: 0 / 4',
            trait_num: 'TRAIT #1',
            trait_nom: 'LOGIC',
            trait_sub: 'Intellect — The world of ideas',
            trait_desc: 'Your weapon is your intellect—decipher the world around you.',
            btn_valider_trait: 'CONFIRM TRAIT',
            attr_heading: 'ATTRIBUTE SELECTION',
            points_left: 'point(s) remaining',
            skill_heading: 'SKILL SELECTION',
            attr_force: 'STRENGTH',
            attr_force_desc: 'Major bonus to firearms / Minor bonus to speed and crafting.',
            attr_perc: 'PERCEPTION',
            attr_perc_desc: 'Major bonus to cooking / Minor bonus to smuggling and weapons.',
            attr_agi: 'AGILITY',
            attr_agi_desc: 'Major bonus to smuggling and speed / Minor bonus to medicine.',
            attr_int: 'INTELLIGENCE',
            attr_int_desc: 'Major bonus to medicine and crafting / Minor bonus to cooking.',
            warn_attr: 'Attributes are permanent and can only be changed temporarily in RP per server rules.',
            skill_meta: 'Attribute levels: +0',
            sk_med: 'MEDICINE',
            sk_med_desc: 'Heal yourself and others.',
            sk_contre: 'SMUGGLING',
            sk_contre_desc: 'Buy illegal goods on the black market.',
            sk_armes: 'FIREARMS',
            sk_armes_desc: 'Knowledge of how to use firearms.',
            sk_vit: 'SPEED',
            sk_vit_desc: 'Win initiative in combat, run farther and faster.',
            sk_cuisine: 'COOKING',
            sk_cuisine_desc: 'Your culinary talent.',
            sk_cac: 'MELEE',
            sk_cac_desc: 'Your skill with melee weapons.',
            sk_art: 'CRAFTING',
            sk_art_desc: 'Repair, dismantling, and fabrication of objects.',
            warn_skills: 'Skills have a maximum level of 50.',
            parcours_heading: 'BACKGROUND SELECTION',
            parcours_ph:
                'No background path available for this faction — describe Lua’s RP path here (studies, jobs, major events before City 17).',
            hist_heading: 'HISTORY & BACKGROUND (RP)',
            hist_ph: 'Childhood, training, losses, joining U.N.I.S.C.A.—everything that shapes the character today...',
            journal_stamp: 'CONFIDENTIAL',
            journal_doc: 'DOCUMENT — LEVEL D / RP USE',
            journal_title: 'PRIVATE JOURNAL',
            journal_author: 'Lua Tyler — citizen — U.N.I.S.C.A.',
            book_p1:
                "City 9 is nothing like what I read in my father's novels. Here, being a loyalist means cooperating with Civil Protection, accepting rations, and closing your eyes to what you hear at night. I write these lines for myself alone—if someone reads them later, know it wasn't cowardice, only survival.",
            book_cap1: 'Lua Tyler — Summer 2023.<br>—<br>Paris, City 9.',
            img_ph_journal: 'Portrait (editor = URL)',
            id_heading: 'Identity card',
            id_col1:
                'Name: Lua Tyler (Daisy).<br>Height: 170cm.<br>Weight: 52kg.<br>Eyes: Brown.<br>Age: 29.',
            id_col2: 'Birth: May 3, 1998 — Seattle.',
            id_bio_label: 'Biography:',
            id_bio_text:
                'Family, fantasy novels in a cramped apartment, then the school trip that coincided with the arrival of an extraterrestrial species that conquered Earth in hours. The relocation lines, the numbered cities—I ended up in City 9 while it was being built, somewhere between what remained of Paris and what the Combine wanted it to become.',
            monster_cap: 'Monster — City 9 Incident 2024',
            cap_xmas: 'Lua Tyler — 25th December 2022.<br>—<br>Christmas Eve in City 9',
            btn_add_journal: 'Add a spread',
            tpl_write_left: 'Write on the left page…',
            tpl_caption: 'Caption — place — date.',
            editor_title: 'Editor mode',
            editor_export: 'Export JSON',
            editor_import: 'Import JSON',
            editor_lock: 'Lock',
            editor_hint:
                '<strong>Publishing:</strong> private browsing and other readers only see what is on GitHub. After editing, click <strong>Export JSON</strong>, save as <code>data/fiche-export.json</code>, then <code>git add</code> / <code>commit</code> / <code>push</code>.',
            editor_fab: 'Editor mode',
            aria_prev: 'Previous',
            aria_next: 'Next',
            script_prompt_pwd: 'Editor password:',
            script_wrong_pwd: 'Incorrect password.',
            script_lock_confirm:
                'Switch to read-only? Visitors will no longer be able to edit the page.',
            script_export_alert:
                'File downloaded.\n\n1) Rename it exactly: fiche-export.json\n2) Put it in your project data/ folder (next to index.html)\n3) git add data/fiche-export.json && git commit -m "Sheet data" && git push\n\nWithout this, only your browser remembers changes—not the site for others or private browsing.',
            script_import_ok: 'Import complete.',
            script_import_bad: 'Invalid JSON file.',
            script_prompt_img: 'Image URL (direct link .png, .jpg, etc.):',
            tpl_aria_spread: 'New spread',
            spread_aria_1: 'Spread 1',
            spread_aria_2: 'Spread 2',
            tpl_photo_ph: 'Photo',
            emblem_title: 'Emblem (decorative)',
            lang_switcher_aria: 'Choose language',
            alt_model: 'Character model',
            jimg_photo1: 'Photo 1',
            jimg_sketch: 'Sketch',
            jimg_portrait: 'Portrait',
        },
    };

    const NAV_ICONS = {
        nav_personnage: 'fa-id-card',
        nav_famille: 'fa-users',
        nav_apparences: 'fa-wand-magic-sparkles',
        nav_cheveux: 'fa-cut',
        nav_vetements: 'fa-shirt',
        nav_traits: 'fa-dice',
    };

    function getLang() {
        return localStorage.getItem(STORAGE_LANG) || 'fr';
    }

    function setLang(lang) {
        if (lang !== 'fr' && lang !== 'en') return;
        localStorage.setItem(STORAGE_LANG, lang);
    }

    function t(key) {
        const lang = getLang();
        const v = I18N[lang] && I18N[lang][key];
        if (v != null) return v;
        return I18N.fr[key] || key;
    }

    function applyLanguage(lang) {
        if (lang !== 'fr' && lang !== 'en') lang = 'fr';
        setLang(lang);
        document.documentElement.lang = lang === 'en' ? 'en' : 'fr';

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            const val = I18N[lang][key];
            if (val == null) return;
            const mode = el.getAttribute('data-i18n-mode');
            if (mode === 'html' || val.includes('<')) {
                el.innerHTML = val;
            } else {
                el.textContent = val;
            }
        });

        // Placeholder images (translated ?text=)
        document.querySelectorAll('[data-i18n-placeholder]').forEach((img) => {
            const key = img.getAttribute('data-i18n-placeholder');
            const text = I18N[lang][key];
            if (text == null || !(img instanceof HTMLImageElement)) return;
            const w = img.getAttribute('data-ph-w') || '300';
            const h = img.getAttribute('data-ph-h') || '500';
            const bg = img.getAttribute('data-ph-bg') || '1a1c23';
            const fg = img.getAttribute('data-ph-fg') || 'ffffff';
            img.src = `https://via.placeholder.com/${w}x${h}/${bg}/${fg}?text=${encodeURIComponent(text)}`;
        });

        // aria-label on any element
        document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
            const key = el.getAttribute('data-i18n-aria');
            const val = key && I18N[lang][key];
            if (val != null) el.setAttribute('aria-label', val);
        });

        document.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.getAttribute('data-i18n-title');
            const val = key && I18N[lang][key];
            if (val != null) el.setAttribute('title', val);
        });

        document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
            const key = el.getAttribute('data-i18n-alt');
            const val = key && I18N[lang][key];
            if (val != null) el.setAttribute('alt', val);
        });

        // Editor FAB + add-journal button titles
        const fab = document.getElementById('btn-unlock-editor');
        if (fab && I18N[lang].editor_fab) {
            fab.setAttribute('title', I18N[lang].editor_fab);
            fab.setAttribute('aria-label', I18N[lang].editor_fab);
        }
        const btnAddJ = document.getElementById('btn-add-journal-entry');
        if (btnAddJ && I18N[lang].btn_add_journal) {
            btnAddJ.setAttribute('title', I18N[lang].btn_add_journal);
        }

        // Trait carousel prev/next
        document.querySelectorAll('.trait-picker .trait-nav.editor-only').forEach((btn, idx) => {
            btn.setAttribute('aria-label', idx === 0 ? I18N[lang].aria_prev : I18N[lang].aria_next);
        });

        // Nav links: keep icon, replace text
        document.querySelectorAll('.nav-btn[data-i18n-nav]').forEach((a) => {
            const k = a.getAttribute('data-i18n-nav');
            const ic = NAV_ICONS[k];
            const text = I18N[lang][k];
            if (ic && text) {
                a.innerHTML = '<i class="fas ' + ic + '"></i> ' + text;
            }
        });

        // Dropdowns: text + chevron (contenteditable preserved)
        document.querySelectorAll('.dropdown-mock[data-i18n-key]').forEach((el) => {
            const k = el.getAttribute('data-i18n-key');
            const text = I18N[lang][k];
            if (text == null) return;
            const i = document.createElement('i');
            i.className = 'fas fa-chevron-down';
            el.innerHTML = '';
            el.appendChild(document.createTextNode(text + ' '));
            el.appendChild(i);
            el.setAttribute('contenteditable', 'true');
        });

        // Buttons with icon prefix/suffix
        const btnBack = document.getElementById('btn-retour-select');
        if (btnBack) {
            btnBack.innerHTML = '<i class="fas fa-arrow-left"></i> ' + I18N[lang].btn_back;
        }
        const btnBackChar = document.getElementById('btn-retour-char-select');
        if (btnBackChar) {
            btnBackChar.innerHTML = '<i class="fas fa-arrow-left"></i> ' + I18N[lang].btn_back;
        }
        const btnNext = document.getElementById('btn-next-journal');
        if (btnNext) {
            btnNext.innerHTML = I18N[lang].btn_next + ' <i class="fas fa-arrow-right"></i>';
        }
        const btnFinish = document.getElementById('btn-finish');
        if (btnFinish) {
            btnFinish.innerHTML = I18N[lang].btn_finish + ' <i class="fas fa-check"></i>';
        }
        const btnRetourDossier = document.getElementById('btn-retour-dossier');
        if (btnRetourDossier) {
            btnRetourDossier.innerHTML = '<i class="fas fa-arrow-left"></i> ' + I18N[lang].btn_back_dossier;
        }
        const btnAddJournal = document.getElementById('btn-add-journal-entry');
        if (btnAddJournal) {
            btnAddJournal.innerHTML = '<i class="fas fa-plus"></i> ' + I18N[lang].btn_add_journal;
        }

        // Points labels (numbers preserved)
        const attrLab = document.getElementById('attr-points-label');
        if (attrLab) {
            const num = document.getElementById('attr-points-num');
            const n = num ? num.textContent : '8';
            attrLab.innerHTML =
                '<span id="attr-points-num">' + n + '</span> ' + I18N[lang].points_left;
        }
        const skillLab = document.getElementById('skill-points-label');
        if (skillLab) {
            const num = document.getElementById('skill-points-num');
            const n = num ? num.textContent : '10';
            skillLab.innerHTML =
                '<span id="skill-points-num">' + n + '</span> ' + I18N[lang].points_left;
        }

        document.title = I18N[lang].meta_title;

        // Lang switcher active state
        document.querySelectorAll('.lang-btn').forEach((b) => {
            b.classList.toggle('lang-btn--active', b.getAttribute('data-lang') === lang);
        });
    }

    window.I18N = I18N;
    window.getLang = getLang;
    window.setLang = setLang;
    window.t = t;
    window.applyLanguage = applyLanguage;
})();
