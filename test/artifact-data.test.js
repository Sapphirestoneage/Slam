// The one-file artifact (tools/artifact.mjs) packs every data file the app fetches, found by its literal
// fetch('....json') call. A fetch built from a template or a variable is missed, and the feature breaks only in the
// artifact (found Nov 6: the skill library loaded in the browser but not in "SLAM for Eli"). Every JSON fetch in js/
// must be a single-quoted literal path.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const files = dir => readdirSync(join(root, dir), { withFileTypes: true }).flatMap(e => (e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.js') ? [join(dir, e.name)] : []));
test('every JSON the app fetches is a literal path the artifact build can pack', () => {
  const bad = [];
  for (const f of files('js')) {
    const src = readFileSync(join(root, f), 'utf8');
    for (const m of src.matchAll(/fetch\(([^)]*)\)/g)) {
      const arg = m[1].trim();
      if (/\.json/.test(arg) && !/^'[^']+\.json'$/.test(arg)) bad.push(`${f}: fetch(${arg})`);
      if (/^`|^[a-zA-Z_]/.test(arg) && !/^'/.test(arg) && /json|data\//.test(src.slice(Math.max(0, m.index - 80), m.index + 80))) bad.push(`${f}: fetch(${arg}) (not a literal path)`);
    }
  }
  assert.deepEqual([...new Set(bad)], []);
});
