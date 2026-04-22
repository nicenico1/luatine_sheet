import fs from 'node:fs';

const s = fs.readFileSync(new URL('../i18n.js', import.meta.url), 'utf8');
const start = s.indexOf('const I18N = ') + 'const I18N = '.length;
const end = s.indexOf('    const NAV_ICONS');
if (start < 0 || end < 0) throw new Error('Could not find I18N bounds in i18n.js');
const obj = s.slice(start, end).trim();

const header = `/**
 * UI strings — FR / EN (same keys as legacy \`i18n.js\`).
 * Svelte uses the \`lang\` store + \`tr()\` helper for reactivity.
 */
`;

fs.writeFileSync(new URL('../src/lib/messages.js', import.meta.url), `${header}export const MESSAGES = ${obj};\n\nexport const LANG_STORAGE_KEY = 'fiche_lang';\n`);
console.log('Wrote src/lib/messages.js');
