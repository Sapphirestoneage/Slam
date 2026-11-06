// SPDX-License-Identifier: AGPL-3.0-only
// Builds the one-file SLAM page published as the "SLAM for Eli" artifact, from this repo, so the two never drift.
// The site itself has no build step; this only packs it: CSS inline, the three data files inline, ECharts from cdnjs.
// Needs esbuild once: npm i --no-save esbuild@0.24.0   Run: node tools/artifact.mjs [out.html] [title] [client name]
// Publish it with the artifact's downloads capability declared (capabilities: { downloads: true }): the spreadsheet
// export and the backup file go through that door inside the artifact (js/ui/save-file.js, batch 7 item 1).
// A client name opens the page straight into that client. Where its numbers come from, first found wins:
//   1. fixtures/<name>.household.local.json, a full household: a SLAM backup file (Coach tools › Data › Export) of
//      that client, saved under the client name in lower case with spaces as dashes (Eli: fixtures/eli.household.local.json).
//      The page opens straight into that whole household (every row, the program, the sessions), not one built from
//      the simple inputs. The file is private, git-ignored by the fixtures/*.local.json rule: publish the page privately only.
//   2. fixtures/eli.local.json, the private Test client's simple inputs (real numbers: publish privately only).
//   3. fixtures/demo.json, the made-up Demo client.
// A client already saved in the browser under that name still opens as saved (the page never overwrites it).
import { build } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || join(root, 'dist', 'slam-artifact.html'));
const title = process.argv[3] || 'SLAM for Eli';
const client = process.argv[4] ?? 'Eli';
// Every data file the app fetches, found in the code (so a new one is never left out of the page).
const jsFiles = dir => readdirSync(join(root, dir), { withFileTypes: true }).flatMap(e => (e.isDirectory() ? jsFiles(join(dir, e.name)) : e.name.endsWith('.js') ? [join(dir, e.name)] : []));
const DATA = [...new Set(jsFiles('js').flatMap(f => [...readFileSync(join(root, f), 'utf8').matchAll(/fetch\('([^']+\.json)'\)/g)].map(m => m[1])))].sort();
// The client starts from the private Test client when it is on this machine (git-ignored), else the made-up Demo.
const PRIVATE = 'fixtures/eli.local.json';
const start = existsSync(join(root, PRIVATE)) ? PRIVATE : 'fixtures/demo.json';
const HOUSEHOLD = client ? `fixtures/${client.trim().toLowerCase().replace(/\s+/g, '-')}.household.local.json` : null;
const household = HOUSEHOLD && existsSync(join(root, HOUSEHOLD)) ? HOUSEHOLD : null;
if (household) console.log(`Opening into the full household in ${household} (private: publish privately only)`);

// The entry answers fetch() for the data files from the bundle, then starts the app.
const entry = `${DATA.map((p, i) => `import d${i} from './${p}';`).join('\n')}
const files = { ${DATA.map((p, i) => `'${p}': d${i}`).join(', ')} };
const real = window.fetch.bind(window);
window.fetch = (u, ...a) => (typeof u === 'string' && files[u] ? Promise.resolve(new Response(JSON.stringify(files[u]), { headers: { 'Content-Type': 'application/json' } })) : real(u, ...a));
await import('./js/app.js');
${client ? `// Opens straight into the client, with the usual spending list.
import startData from './${household ?? start}';
import { localAdapter, listClients, loadClient } from './js/storage.js';
import { householdFromInputs } from './js/demo.js';
import { importFile } from './js/records.js';
import { addPresets } from './js/presets.js';
let store; try { localStorage.getItem('x'); store = localAdapter(); } catch { store = null; }
const mine = store ? listClients(store).find(c => c.name === ${JSON.stringify(client)}) : null;
${household ? `// A full household backup: the whole file, under the client name (its own spending list comes with it).
const fresh = () => { const doc = importFile(startData); doc.client.name = ${JSON.stringify(client)}; return doc; };` : `const fresh = () => householdFromInputs(startData.inputs, { name: ${JSON.stringify(client)} });`}
if (!window.slam.hasClient || !mine) { window.slam.open(mine ? loadClient(store, mine.id) : fresh()); window.slam.go('#/home/prep'); }
if (window.slam.hasClient && !window.slam.store.doc.settings.presetsAdded) addPresets(window.slam.store, d0);` : ''}
`;
const js = (await build({
  stdin: { contents: entry, resolveDir: root, sourcefile: 'artifact-entry.js', loader: 'js' },
  bundle: true, format: 'esm', target: 'es2022', minify: true, write: false, splitting: false,
})).outputFiles[0].text;

// app.css pulls in tokens.css with @import; inline it in place.
const css = file => readFileSync(join(root, 'css', file), 'utf8').replace(/@import url\('([^']+)'\);?/g, (_, f) => css(f));
const html = readFileSync(join(root, 'index.html'), 'utf8')
  .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
  .replace(/<link rel="stylesheet" href="css\/([^"]+)">/g, (_, f) => `<style>${css(f)}</style>`)
  .replace(/<script type="module" src="js\/app.js"><\/script>/, () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`Wrote ${out} (${Math.round(html.length / 1024)} KB)`);
