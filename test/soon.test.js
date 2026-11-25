// SPDX-License-Identifier: AGPL-3.0-only
// Coming soon (js/ui/soon.js): a route with no screen and a screen that throws both end in the card; the error is
// kept and thrown again after, so nothing is hidden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guardScreen, record, ERRORS } from '../js/ui/soon.js';

const CARD = { card: true };
const opts = seen => ({ card: () => CARD, after: e => seen.push(e) });

test('soon: a screen that draws is returned as it is, with no record', () => {
  const seen = [], n = ERRORS.length, node = { screen: 'fine' };
  assert.equal(guardScreen(() => node, () => node, 'screen home/session', opts(seen)), node);
  assert.equal(ERRORS.length, n);
  assert.equal(seen.length, 0);
});

test('soon: a route with no screen ends in the card, and is recorded', () => {
  const seen = [], n = ERRORS.length;
  assert.equal(guardScreen(undefined, () => { throw new Error('never called'); }, 'screen plan/later', opts(seen)), CARD);
  assert.equal(ERRORS.length, n + 1);
  assert.equal(ERRORS.at(-1).where, 'screen plan/later');
  assert.match(ERRORS.at(-1).msg, /No screen/);
});

test('soon: a screen that throws ends in the card; the error is recorded and thrown again after', () => {
  const seen = [], n = ERRORS.length, boom = new Error('boom in a screen');
  const screen = () => { throw boom; };
  assert.equal(guardScreen(screen, () => screen(), 'screen plan/goals', opts(seen)), CARD);
  assert.equal(ERRORS.length, n + 1);
  assert.deepEqual({ where: ERRORS.at(-1).where, msg: ERRORS.at(-1).msg }, { where: 'screen plan/goals', msg: 'boom in a screen' });
  assert.deepEqual(seen, [boom]); // the same error goes on to the console
});

test('soon: by default the error is thrown again on a timer, so the console and the page-error tools see it', () => {
  const real = globalThis.setTimeout, queued = [];
  globalThis.setTimeout = f => { queued.push(f); return 0; };
  try {
    const boom = new Error('still visible');
    assert.equal(guardScreen(() => 1, () => { throw boom; }, 'screen x/y', { card: () => CARD }), CARD);
    assert.equal(queued.length, 1);
    assert.throws(() => queued[0](), e => e === boom);
  } finally { globalThis.setTimeout = real; }
});

test('soon: the log keeps the last 100', () => {
  for (let i = 0; i < 130; i++) record(new Error(`e${i}`), 'test');
  assert.equal(ERRORS.length, 100);
  assert.equal(ERRORS.at(-1).msg, 'e129');
});

test('soon: the router draws each screen through guardScreen, and the card is calm', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /guardScreen\(screen, \(\) => screen\(this, this\.ctx\), `screen \$\{tab\.id\}\/\$\{sub\.id\}`\)/);
  assert.ok(!/screen \? screen\(this, this\.ctx\) : null/.test(app), 'no second way to draw a screen');
  const src = readFileSync(new URL('../js/ui/soon.js', import.meta.url), 'utf8');
  const copy = src.slice(src.indexOf('export function soonCard'), src.indexOf('const later'));
  assert.match(copy, /Coming soon/);
  assert.ok(!/broken|failed|wrong|mistake|sorry|oops|error/i.test(copy), 'no verdict word and no error text on the card');
});
