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
