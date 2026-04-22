/**
 * Tiptap editor factory for the fiche RP.
 *
 * Replaces contenteditable + document.execCommand.
 * Returns a configured Editor instance.
 *
 * Font sizing uses real CSS font-size values via TextStyle, not the
 * legacy <font size="1-7"> integers that execCommand produced.
 */
import { Editor }       from '@tiptap/core';
import Document         from '@tiptap/extension-document';
import Paragraph        from '@tiptap/extension-paragraph';
import Text             from '@tiptap/extension-text';
import Bold             from '@tiptap/extension-bold';
import Italic           from '@tiptap/extension-italic';
import Underline        from '@tiptap/extension-underline';
import Strike           from '@tiptap/extension-strike';
import HardBreak        from '@tiptap/extension-hard-break';
import History          from '@tiptap/extension-history';
import TextStyle        from '@tiptap/extension-text-style';
import { Color }        from '@tiptap/extension-color';
import FontFamily       from '@tiptap/extension-font-family';
import TextAlign        from '@tiptap/extension-text-align';
import { Extension }    from '@tiptap/core';

/**
 * Custom FontSize extension — sets real CSS font-size in px.
 * execCommand used legacy integer sizes (1–7); we use px strings instead.
 */
const FontSize = Extension.create({
    name: 'fontSize',
    addGlobalAttributes() {
        return [
            {
                types: ['textStyle'],
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (el) => el.style.fontSize || null,
                        renderHTML: (attrs) =>
                            attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize:
                (size) =>
                ({ chain }) =>
                    chain().setMark('textStyle', { fontSize: size }).run(),
            unsetFontSize:
                () =>
                ({ chain }) =>
                    chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
        };
    },
});

const SHARED_EXTENSIONS = [
    Document,
    Paragraph,
    Text,
    Bold,
    Italic,
    Underline,
    Strike,
    HardBreak.configure({ keepMarks: true }),
    History,
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    TextAlign.configure({ types: ['paragraph'] }),
];

/**
 * Create a Tiptap editor in a given DOM element.
 *
 * @param {HTMLElement} element  - Container element
 * @param {string}      content  - Initial HTML content
 * @param {boolean}     editable - Whether editing is enabled
 * @param {Function}    onUpdate - Called with updated HTML whenever content changes
 */
export function createEditor({ element, content = '', editable = false, onUpdate, onFocus, onBlur }) {
    return new Editor({
        element,
        extensions: SHARED_EXTENSIONS,
        content,
        editable,
        editorProps: {
            attributes: {
                // The editor div itself should not have extra styling —
                // the surrounding .book-text / .book-heading class handles fonts.
                class: 'tiptap-content',
            },
        },
        onUpdate({ editor }) {
            if (onUpdate) onUpdate(editor.getHTML());
        },
        onFocus() { if (onFocus) onFocus(); },
        onBlur()  { if (onBlur)  onBlur();  },
    });
}

/**
 * Named font-size values that match the former <select> options.
 * These are CSS values applied via setFontSize().
 */
export const FONT_SIZES = [
    { label: 'Très petit', value: '13px' },
    { label: 'Normal',     value: '18px' },
    { label: 'Grand',      value: '22px' },
    { label: 'Très grand', value: '28px' },
    { label: 'Énorme',     value: '36px' },
    { label: 'Géant',      value: '48px' },
];

/** Font families available in the toolbar. */
export const FONT_FAMILIES = [
    { group: 'Manuscrit', fonts: [
        { label: 'Caveat',              value: "'Caveat', cursive"              },
        { label: 'Dancing Script',      value: "'Dancing Script', cursive"      },
        { label: 'Kalam',               value: "'Kalam', cursive"               },
        { label: 'Indie Flower',        value: "'Indie Flower', cursive"        },
        { label: 'Shadows Into Light',  value: "'Shadows Into Light', cursive"  },
        { label: 'Patrick Hand',        value: "'Patrick Hand', cursive"        },
        { label: 'Reenie Beanie',       value: "'Reenie Beanie', cursive"       },
        { label: 'Architects Daughter', value: "'Architects Daughter', cursive" },
        { label: 'Homemade Apple',      value: "'Homemade Apple', cursive"      },
        { label: 'Gloria Hallelujah',   value: "'Gloria Hallelujah', cursive"   },
        { label: 'Cedarville Cursive',  value: "'Cedarville Cursive', cursive"  },
        { label: 'La Belle Aurore',     value: "'La Belle Aurore', cursive"     },
        { label: 'Marck Script',        value: "'Marck Script', cursive"        },
        { label: 'Nothing You Could Do',value: "'Nothing You Could Do', cursive"},
        { label: 'Rock Salt',           value: "'Rock Salt', cursive"           },
        { label: 'Permanent Marker',    value: "'Permanent Marker', cursive"    },
        { label: 'Sacramento',          value: "'Sacramento', cursive"          },
        { label: 'Pinyon Script',       value: "'Pinyon Script', cursive"       },
    ]},
    { group: 'Imprimé / vintage', fonts: [
        { label: 'Special Elite',       value: "'Special Elite', monospace"     },
        { label: 'IM Fell English',     value: "'IM Fell English', serif"       },
        { label: 'IM Fell English SC',  value: "'IM Fell English SC', serif"    },
        { label: 'Cormorant Garamond',  value: "'Cormorant Garamond', serif"    },
        { label: 'Lora',                value: "'Lora', serif"                  },
        { label: 'Share Tech Mono',     value: "'Share Tech Mono', monospace"   },
    ]},
];

/** Ink colours. */
export const INK_COLORS = [
    { label: 'Encre noire',   value: '#1a1a1a' },
    { label: 'Encre bleue',   value: '#1f3a8a' },
    { label: 'Encre verte',   value: '#0d3b1f' },
    { label: 'Encre rouge',   value: '#7a1212' },
    { label: 'Sépia',         value: '#5b3a1d' },
    { label: 'Encre fanée',   value: '#7a6d52' },
    { label: 'Encre violette',value: '#5b00a8' },
];
