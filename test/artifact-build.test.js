// The one-file artifact ("SLAM for Eli") must always build: a stray fetch('...json') in a comment once broke it
// without any test noticing (Nov 6). Runs tools/artifact.mjs into a temp file; skipped when esbuild is not installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const hasEsbuild = existsSync(join(root, 'node_modules', 'esbuild'));
test('the one-file artifact builds and packs every data file', { skip: !hasEsbuild && 'needs esbuild (npm i --no-save esbuild@0.24.0)', timeout: 120000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'slam-art-'));
  try {
    const out = join(dir, 'a.html');
    execFileSync(process.execPath, [join(root, 'tools', 'artifact.mjs'), out, 'Test', ''], { cwd: root, stdio: 'pipe' });
    const html = readFileSync(out, 'utf8');
    assert.ok(html.length > 500000, 'the page has the app in it');
    for (const f of ['data/library/skills.json', 'data/library/cards.json', 'data/reference-2026.json']) assert.ok(html.includes(f), `${f} is packed`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
