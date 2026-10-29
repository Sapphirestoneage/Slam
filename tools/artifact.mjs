// Builds the one-file SLAM page published as the "SLAM for Eli" artifact, from this repo, so the two never drift.
// The site itself has no build step; this only packs it: CSS inline, the three data files inline, ECharts from cdnjs.
// Needs esbuild once: npm i --no-save esbuild@0.24.0   Run: node tools/artifact.mjs [out.html] [title] [client name]
// A client name opens the page straight into that client. Its numbers come from the private Test client when that
// file is here (so the page holds real numbers: publish it privately only), else from the made-up Demo client.
import { build } from 'esbuild';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || join(root, 'dist', 'slam-artifact.html'));
const title = process.argv[3] || 'SLAM for Eli';
const client = process.argv[4] ?? 'Eli';
const DATA = ['data/reference-2026.json', 'data/fields.json', 'fixtures/demo.json'];
// The client starts from the private Test client when it is on this machine (git-ignored), else the made-up Demo.
const PRIVATE = 'fixtures/eli.local.json';
const start = existsSync(join(root, PRIVATE)) ? PRIVATE : 'fixtures/demo.json';

// The entry answers fetch() for the data files from the bundle, then starts the app.
const entry = `${DATA.map((p, i) => `import d${i} from './${p}';`).join('\n')}
const files = { ${DATA.map((p, i) => `'${p}': d${i}`).join(', ')} };
const real = window.fetch.bind(window);
window.fetch = (u, ...a) => (typeof u === 'string' && files[u] ? Promise.resolve(new Response(JSON.stringify(files[u]), { headers: { 'Content-Type': 'application/json' } })) : real(u, ...a));
await import('./js/app.js');
${client ? `// Opens straight into the client, with the usual spending list.
import startData from './${start}';
import { localAdapter, listClients, loadClient } from './js/storage.js';
import { householdFromInputs } from './js/demo.js';
import { addPresets } from './js/presets.js';
let store; try { localStorage.getItem('x'); store = localAdapter(); } catch { store = null; }
const mine = store ? listClients(store).find(c => c.name === ${JSON.stringify(client)}) : null;
if (!window.slam.hasClient || !mine) { window.slam.open(mine ? loadClient(store, mine.id) : householdFromInputs(startData.inputs, { name: ${JSON.stringify(client)} })); window.slam.go('#/home/prep'); }
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
writeFileSync(out, html);
console.log(`Wrote ${out} (${Math.round(html.length / 1024)} KB)`);
