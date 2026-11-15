// SPDX-License-Identifier: AGPL-3.0-only
// The second engine (tools/audit): SLAM's money math worked out a second time in Python and compared to the dollar.
// A short run here on every `node --test`; the full run is `node tools/audit/run.mjs`. Skipped where python3 is missing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const python = spawnSync('python3', ['--version']).status === 0;
test('second engine: every number agrees with an independent rebuild, to the dollar', { skip: python ? false : 'python3 is not installed' }, () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/audit/run.mjs', import.meta.url)), '80', '7'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /The two engines agree on all/);
});

test('quantum collapse, measured: the tool runs and every answer set gives a plan', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/collapse/measure.mjs', import.meta.url)), '3', '5'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /0 skipped/);
});

test('one engine: no screen reads the unshown projection engine, and money grows at one pace everywhere', async () => {
  const { readdirSync, readFileSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const root = fileURLToPath(new URL('../js', import.meta.url)), files = [];
  const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p); } };
  walk(root);
  // js/math/projection.js (M9P) is math no screen shows yet. Until it agrees with the lifetime engine to the dollar
  // (tools/audit), only the registry may read it: a screen that did would project a second way.
  const readers = files.filter(f => /from '[^']*math\/projection\.js'/.test(readFileSync(f, 'utf8'))).map(f => f.slice(root.length + 1));
  assert.deepEqual(readers, ['registry/math.js']);
  // A month of growth is (1 + yearly) to the power 1/12 (M53). A twelfth of the yearly return compounds to more than
  // the year and makes two tools disagree (the finish line did, until Nov 14 2026). Debt interest is apr / 12 and is fine.
  const twelfth = files.filter(f => /(realReturn|\breturn\w*)\s*\/\s*12\b(?!\s*\*\s*\()/.test(readFileSync(f, 'utf8').replace(/\/\/.*$/gm, ''))).map(f => f.slice(root.length + 1));
  assert.deepEqual(twelfth, [], 'a yearly return divided by 12');
});

test('the FIRE canon, replicated: the famous numbers come out of SLAM\'s own math and history', async () => {
  const { mkdtempSync, readFileSync } = await import('node:fs'); const { tmpdir } = await import('node:os'); const { join } = await import('node:path');
  const out = join(mkdtempSync(join(tmpdir(), 'slam-canon-')), 'canon.json');
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/canon/replicate.mjs', import.meta.url)), out], { encoding: 'utf8', maxBuffer: 1 << 26 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const c = JSON.parse(readFileSync(out, 'utf8'));
  // Mr. Money Mustache's table (5% after inflation, 4%): worked the way he made it, within half a year of every printed row
  for (const row of c.savingsRate) assert.ok(Math.abs(row.yearly5 - row.printed) <= 0.5, `${row.rate}%: ${row.yearly5} against ${row.printed}`);
  // the 4% rule over 30 years: it failed only for people who stopped work in the late 1960s
  assert.ok(c.fourPercent.allHistory[30][0.04].mix75 > 0.95); assert.deepEqual(c.fourPercent.failed30at4, [1965, 1966, 1968, 1969]);
  assert.ok(c.fourPercent.allHistory[50][0.04].mix75 < 0.9, 'over 50 years 4% holds less often');
  assert.ok(Math.abs(c.fourPercent.slamEngine.mix75 - c.fourPercent.slamEngine.byHand) < 0.02, 'SLAM\'s lifetime engine and the by-hand replay agree');
  // 752 and 173 as printed, and what the plan's pace makes of them
  assert.ok(Math.abs(c.napkin.weekly.asMade - 752.3) < 0.2 && Math.abs(c.napkin.monthly.asMade - 173.1) < 0.1);
  assert.equal(c.hundred[0].needs, 30000);
});
