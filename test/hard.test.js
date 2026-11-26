// SPDX-License-Identifier: AGPL-3.0-only
// Hard moments (run Not built, groups 1 to 5, Part 7; M8H): the math checked by hand on made-up numbers, one split for
// the quick roommate calculator and the roommate leaving, the dated sources, nothing kept until Keep this is on, a
// kept tool private (out of a partner's view and anything shared, in a coach's view only when let in), the quick exit
// on every page, the calm words, and the game's copy current.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as H from '../js/math/hard.js';
import { roommateExit } from '../js/math/hardplan.js';
import { qcRoommates } from '../js/math/quickplan.js';
import { rowShare } from '../js/math/household.js';
import { keptOnly, hardForAudience, isKept } from '../js/hard.js';
import { foldDoc, SHARE } from '../js/privacy.js';
import { newHousehold } from '../js/records.js';
import { blameIn } from '../tools/tone/scan.mjs';

const root = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, root), 'utf8');
const D = JSON.parse(read('data/sources/hard-2026.json'));
const near = (a, b, tol = 1e-9, why = '') => assert.ok(Math.abs(a - b) <= tol, `${why} ${a} vs ${b}`);
const PAGES = { untangle: 'untangle.html', roomexit: 'roomexit.html', grief: 'grief.html', widow: 'widowed.html', medical: 'medicalbills.html', sayno: 'sayno.html', crisis: 'crisis.html', safety: 'safety.html' };

test('a roommate leaving: the one who leaves pays the months agreed, the rest split the whole rent the same way', () => {
  assert.equal(roommateExit({ rent: 3000, people: [{ id: 'Me' }, { id: 'P2' }], leaver: 'P2' }).ready, false, 'empty is not zero: no months left');
  const R = roommateExit({ rent: 3000, bills: 300, how: 'equal', people: [{ id: 'Me', name: 'You' }, { id: 'P2' }, { id: 'P3' }], leaver: 'P2', monthsLeft: 6, cover: 2, deposit: 3000, damage: 300 });
  assert.equal(R.rows[0].now, 1100); assert.equal(R.rows[0].later, 1650); assert.equal(R.rows[0].toEnd, 1100 * 2 + 1650 * 4);
  assert.equal(R.leaving.toEnd, 2200); assert.equal(R.uncovered, 1100 * 4);
  near(R.total, 3300 * 6, 1e-9, 'the whole lease is paid, no more, no less');
  near(R.rows.reduce((s, r) => s + r.deposit, 0), 2700, 1e-9, 'the deposit less the damage comes back in full');
  // by room size: the people staying split by their own rooms
  const S = roommateExit({ rent: 2000, how: 'size', people: [{ id: 'Me', size: 100 }, { id: 'P2', size: 300 }, { id: 'P3', size: 100 }], leaver: 'P2', monthsLeft: 3, cover: 0 });
  near(S.rows[0].now, 400); near(S.rows[0].later, 1000); near(S.rows[0].toEnd, 3000); assert.equal(S.leaving.toEnd, 0);
  const capped = roommateExit({ rent: 2000, how: 'equal', people: [{ id: 'Me' }, { id: 'P2' }], leaver: 'P2', monthsLeft: 2, cover: 9 });
  assert.equal(capped.cover, 2, 'cover never runs past the lease');
});

test('one split: the quick roommate calculator and the roommate leaving stand on splitSharesOf and rowShare', () => {
  const people = [{ id: 'Me', size: 120, income: 3000 }, { id: 'P2', size: 180, income: 5000 }];
  for (const how of ['size', 'income', 'equal']) {
    const S = H.splitSharesOf({ how, people }, rowShare), Q = qcRoommates({ rent: 2500, how, people });
    near(S.rows.reduce((s, r) => s + r.rentShare, 0), 1, 1e-12, how);
    S.rows.forEach((r, i) => near(Q.rows[i].rent, 2500 * r.rentShare, 1e-9, how));
  }
  assert.equal(H.splitSharesOf({ how: 'income', people: [{ id: 'Me', income: null }, { id: 'P2', income: 1 }] }, rowShare).ready, false, 'an income not given is not $0');
  assert.match(read('js/math/quickplan.js'), /splitSharesOf/);
});

test('untangling: what each person ends up with, what is open, and the debts still in both names', () => {
  assert.equal(H.hmUntangle([]).ready, false);
  const U = H.hmUntangle([
    { id: 'a', name: 'Joint checking', kind: 'have', amount: 5000, names: 'both', plan: 'split' },
    { id: 'b', name: 'Card', kind: 'owe', amount: 2000, names: 'both', plan: 'them' },
    { id: 'c', name: 'Car', kind: 'have', amount: 9000, names: 'me', plan: 'me' },
    { id: 'd', name: 'Car loan', kind: 'owe', amount: 4000, names: 'both', plan: 'sell' },
    { id: 'e', name: 'Sofa', kind: 'have', amount: null, names: 'both', plan: null },
    { id: 'f', name: 'Savings', kind: 'have', amount: 1000, names: 'both', plan: 'none' }]);
  assert.equal(U.mine.have, 2500 + 9000); assert.equal(U.mine.owe, 2000); assert.equal(U.mine.net, 9500);
  assert.equal(U.theirs.have, 2500); assert.equal(U.theirs.owe, 2000 + 2000); assert.equal(U.theirs.net, -1500);
  assert.deepEqual(U.open, ['e', 'f']); assert.equal(U.openAmount, 1000, 'the sofa has no amount yet: never counted as $0');
  assert.deepEqual(U.noAmount, ['e']); assert.deepEqual(U.stillBoth, ['b'], 'a joint card left to them is still owed by both; a loan paid off from a sale is not');
  assert.equal(U.stillBothAmount, 2000); assert.equal(U.decided, 4);
  near(H.hmUntangle([{ id: 'x', kind: 'have', amount: 1000, plan: 'split' }], { share: 0.4 }).mine.have, 400);
});

test('a checklist, words to copy and money that waits', () => {
  const C = H.hmChecklist([{ id: 'a', when: 'now' }, { id: 'b', when: 'now' }, { id: 'c', when: 'later' }], { a: true });
  assert.equal(C.done, 1); assert.equal(C.next.id, 'b'); assert.deepEqual(C.groups.map(g => [g.when, g.done, g.of]), [['now', 1, 2], ['later', 0, 1]]);
  assert.equal(H.hmChecklist([{ id: 'a' }], { a: true }).all, true);
  assert.equal(H.hmFill('I can pay {monthly|an amount} a month on {balance}.', { monthly: '$50' }), 'I can pay $50 a month on my amount.');
  assert.equal(H.hmFill('Pay {offer|an amount}.', { offer: '' }), 'Pay an amount.');
  assert.equal(H.hmParkMonths({ amount: 12000 }).ready, false);
  const P = H.hmParkMonths({ amount: 12000, spending: 3000 }); assert.equal(P.months, 4); assert.equal(P.whole, 4);
});

test('every help line and every fact names its source, its own page and the date it was checked', () => {
  assert.match(D.checked, /^2026-\d\d-\d\d$/);
  for (const [k, L] of Object.entries(D.lines)) { assert.ok(L.source && L.what, k); assert.match(L.url, /^https:\/\//, k); assert.equal(L.checked, D.checked, k); }
  for (const [k, F] of Object.entries(D.facts)) { assert.ok(F.source && F.text, k); assert.match(F.url, /^https:\/\//, k); assert.ok(F.checked, k); }
  for (const [id, T] of Object.entries(D.tools)) {
    const lines = Array.isArray(T.lines) ? T.lines : Object.values(T.lines).flat();
    assert.ok(lines.length, `${id}: a resource list`); for (const k of lines) assert.ok(D.lines[k], `${id}: ${k} is a dated line`);
    for (const s of T.steps) { assert.ok(D.when[s.when], `${id}.${s.id}: when`); if (s.fact) assert.ok(D.facts[s.fact], `${id}.${s.id}: ${s.fact}`); }
  }
  // the hotline numbers, as their own pages give them (checked Nov 25 2026)
  assert.equal(D.lines.ndvh.call, '1-800-799-7233'); assert.equal(D.lines.ndvh.text, 'Text START to 88788');
  assert.equal(D.lines.nyDv.call, '1-800-942-6906'); assert.equal(D.lines.l988.call, '988');
  assert.match(D.exit.to, /^https:\/\//); assert.match(D.exit.url, /design-system\.service\.gov\.uk/);
});

test('the words are calm: no blame words, nothing clinical, no pressure, no em dash', () => {
  const all = [];
  const walk = v => (typeof v === 'string' ? all.push(v) : v && typeof v === 'object' ? Object.values(v).forEach(walk) : null);
  walk(D.tools); for (const L of Object.values(D.lines)) walk([L.name, L.what, L.text, L.chat].filter(Boolean)); for (const F of Object.values(D.facts)) walk(F.text); // a source's own page name is its name, not our copy
  for (const s of all) {
    assert.deepEqual(blameIn(s), [], s);
    assert.doesNotMatch(s, /\b(must act now|immediately pay|you should have|your fault|failure|victim|patient zero|diagnos)/i, s);
    assert.ok(!s.includes(String.fromCharCode(0x2014)), s);
  }
  for (const T of Object.values(D.tools)) for (const sc of T.scripts || []) for (const line of sc.say) assert.doesNotMatch(line, /\b(or else|last chance|you have to|you must)\b/i, line);
});

test('nothing is kept until Keep this is on, and turning it off takes the kept copy away', () => {
  const doc = newHousehold({ name: 'Test' });
  doc.settings = { ...(doc.settings || {}), start: { years_age: 30 }, hard: { safety: { safety_ticks: 1, ticks: { cash: true } }, medical: { keep: true, medical_balance: 2500 } } };
  const out = keptOnly(doc);
  assert.equal(out.settings.hard.safety, undefined, 'not kept: left out of every save and every link');
  assert.equal(out.settings.hard.medical.medical_balance, 2500, 'kept: saved');
  assert.deepEqual(out.settings.start, doc.settings.start, 'the rest of the plan is untouched');
  assert.equal(isKept(doc, 'medical'), true); assert.equal(isKept(doc, 'safety'), false);
  const none = keptOnly({ ...doc, settings: { ...doc.settings, hard: { safety: { ticks: { cash: true } } } } });
  assert.equal(none.settings.hard, undefined, 'nothing kept: no hard part at all');
  const plain = newHousehold({ name: 'x' }); assert.equal(keptOnly(plain), plain, 'a plan with no hard moments is the same object');
  // the shell: a private page writes nothing (not the address, not the device) until something is kept, and packs only what is kept
  const shell = read('js/solo/shell.js');
  assert.match(shell, /if \(priv && !wrote && mine\(\)\.keep !== true\) return;/);
  assert.match(shell, /const out = \(\) => pack\(keptOnly\(store\.doc\)\)/);
  assert.doesNotMatch(shell, /pack\(store\.doc\)/, 'no save or link packs the doc as it is');
});

test('kept is still private: the person sees it, a coach only when let in, a partner and anything shared never', () => {
  const S = { start: {}, hard: { untangle: { keep: true, coach: false, items: [1] }, grief: { keep: true, coach: true } } };
  assert.equal(hardForAudience(S, { who: 'client', person: 'all', couple: false }), S, 'the person\'s own view');
  assert.equal(hardForAudience(S, { who: 'client', person: 'Me', couple: true }), S);
  assert.deepEqual(Object.keys(hardForAudience(S, { who: 'coach', person: 'all', couple: false }).hard), ['grief'], 'a coach: only what the person let in');
  assert.equal(hardForAudience(S, { who: 'client', person: 'Partner', couple: true }).hard, undefined, 'a partner: none');
  assert.equal(hardForAudience(S, SHARE).hard, undefined);
  const doc = newHousehold({ name: 'Test' }); doc.settings = { ...(doc.settings || {}), hard: S.hard };
  assert.equal(foldDoc(doc, SHARE).settings.hard, undefined, 'a shared copy never carries them');
  assert.deepEqual(Object.keys(foldDoc(doc, { who: 'coach', person: 'all', couple: false }).settings.hard), ['grief']);
});

test('eight pages, each private, each with Leave this page, on the one renderer and on the shelf', async () => {
  const hard = read('js/solo/hard.js') + read('js/solo/keepthis.js'), calc = read('js/solo/calc.js'), hub = read('js/solo/hub.js'), layout = read('tools/e2e/layout.cjs');
  for (const [id, page] of Object.entries(PAGES)) {
    assert.ok(existsSync(new URL(page, root)), page);
    const html = read(page);
    assert.match(html, new RegExp(`data-hard="${id}"`)); assert.match(html, /src="js\/solo\/hard\.js"/);
    assert.ok(hub.includes(`'${page}'`) || hub.includes('HARD_PAGES'), `${page} on the hub shelf`);
    assert.ok(layout.includes(`'${page.replace('.html', '')}'`), `${page} in the layout check`);
  }
  assert.match(hard, /const page = \(D, tool, spec\) => \(\{ private: true,/, 'every spec is private');
  assert.match(hard, /keep: keepCard/); assert.match(hard, /drawn: \(\) => exitButton\(D\)/, 'every page has Leave this page');
  assert.match(hard, /location\.replace\(D\.exit\.to\)/, 'leaving replaces the page, so Back does not return to it');
  assert.match(hard, /e\.key !== 'Shift'/, 'Shift three times leaves too');
  assert.match(calc, /boot\(id, draw, \{ private: !!spec\.private \}\)/);
  assert.match(hard, /chip\('Off', !on/, 'Keep this starts off');
  for (const f of ['js/solo/hard.js']) assert.doesNotMatch(read(f), /1-800|88788|988lifeline|\b255\b|\$400/, `${f}: no number typed in the view; they come from the dated data`);
});

test('the game\'s copy is current (node tools/game_hard_build.mjs)', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('tools/game_hard_build.mjs', root)), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
