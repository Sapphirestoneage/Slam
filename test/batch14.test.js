// Batch 14: Fast Track's tap step (core About you done after it), Walk me through (every empty or rough box in
// session order, each a real box), a new client's one first action, the X of Y filled counters, and the usage log
// with the ease answer. Findability is test/findability.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Store, newHousehold } from '../js/records.js';
import { householdFromInputs } from '../js/demo.js';
import { createCtx } from '../js/ui/staples.js';
import { addPresets, ensureCategories } from '../js/presets.js';
import { applyFastTrack, fastTrackAnswers, lastWords } from '../js/fasttrack.js';
import { profileCompletion } from '../js/profile-completion.js';
import { walkStops, parkStop, isFreshClient, WALK_SCREENS } from '../js/walk.js';
import { fillCounts, taxesCompletion, goalsCompletion, protectionCompletion } from '../js/completion.js';
import { logEvent, usageCsv, usageSummary, scrub, USAGE_MAX } from '../js/usage.js';
import { startSession, endSession } from '../js/program.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const now = new Date('2026-11-05T15:00:00Z');
const ctxOf = s => createCtx({ store: s, ref, now: () => now });
// Alexis (build notes) through Fast Track, the tap step answered.
function alexis({ taps = true } = {}) {
  const s = new Store(newHousehold({ name: 'Alexis Gillmore' }));
  addPresets(s, ref); ensureCategories(s);
  const a = fastTrackAnswers(s.doc);
  Object.assign(a, { birthYear: 1998, household: 'Solo', takeHome: 1200, takePer: 'paycheck', payFrequency: '2 weeks', gut: 2800, gutIncludesDebt: false, checking: 400, savings: 0, invested: 0, housing: 'Rent', hasCar: false, noDebts: true });
  a.debts['Credit card'] = { balance: 4200, payment: 120, rows: 0 };
  if (taps) Object.assign(a, { hasKids: false, hasPets: false, workSituation: 'Employed (W-2)', hsaEligible: false, fsa: false, equityPay: false, state: 'NY',
    chips: { whyNow: ['Debt feels out of control'], worry: ['Debt'], goalWords: ['Debt free'] } });
  applyFastTrack(s, a, { finished: true, now: now.toISOString() });
  return s;
}

test('7: Fast Track with its tap step leaves core About you at 100%', () => {
  const without = profileCompletion(alexis({ taps: false }).doc).core;
  assert.ok(without.done < without.of, 'the 8 steps alone leave About you short');
  const s = alexis();
  const c = profileCompletion(s.doc).core;
  assert.deepEqual([c.done, c.of, c.missing], [c.of, c.of, []]);
  const p = s.doc.profile;
  assert.equal(p.lastName, 'Gillmore', 'the last name comes from the client name');
  assert.equal(p.mode, 'Solo', 'Solo in step 1 is the Solo household mode');
  assert.deepEqual([p.dependents, p.hasPets, p.workSituation, p.hsaEligible, p.state], [0, false, 'Employed (W-2)', false, 'NY']);
  assert.deepEqual(p.chips.goalWords, ['Debt free']);
  assert.equal(lastWords('Alexis'), null);
});

test('7: a yes to car or own a home makes the row, so its value can be asked', () => {
  const s = new Store(newHousehold({ name: 'Tom Hutchinson' }));
  const a = fastTrackAnswers(s.doc);
  Object.assign(a, { housing: 'Own', hasCar: true });
  applyFastTrack(s, a, { finished: true });
  assert.deepEqual(s.doc.records.filter(r => r.kind === 'asset').map(r => r.type).sort(), ['Car', 'Home']);
});

test('5: Walk me through visits the empty and rough boxes in session order, each a real box', () => {
  const s = alexis();
  const stops = walkStops(ctxOf(s));
  assert.ok(stops.length >= 5);
  for (const st of stops) assert.ok(st.focus && st.route?.startsWith('#/') && st.name, `${st.key}: a box, a screen and words`);
  assert.equal(new Set(stops.map(x => x.key)).size, stops.length, 'each box once');
  const order = stops.map(x => WALK_SCREENS.indexOf(x.screen));
  assert.deepEqual(order, [...order].sort((a, b) => a - b), `screens in order: ${stops.map(x => x.screen).join(', ')}`);
  assert.ok(stops.some(x => x.focus === 'cat:Accommodation:amount'), 'the Budget categories are asked');
  assert.ok(stops.some(x => /a guess/.test(x.name) && x.field === 'apr'), 'the guessed card APR is a rough box');
  assert.ok(!stops.some(x => x.screen === 'About you'), 'About you is done by Fast Track');
});

test('5: a new client with nothing yet walks the session 1 checklist first', () => {
  const s = new Store(newHousehold({ name: 'New' }));
  addPresets(s, ref);
  const stops = walkStops(ctxOf(s));
  assert.deepEqual(stops.slice(0, 3).map(x => x.focus), ['p:area-cash', 'add:income', 'gut']);
});

test('5: Will get it parks the box (homework) and it drops off the walk; filling a box drops it too', () => {
  const s = alexis();
  const ctx = ctxOf(s);
  const first = walkStops(ctx).find(x => x.screen === 'Budget categories');
  assert.equal(first.park.kind, 'category');
  assert.equal(walkStops(ctx)[0].focus, 'tax:filing', 'the filing status first (a guess until picked)');
  parkStop(s, first);
  ctx.refresh?.();
  assert.ok(!walkStops(ctxOf(s)).some(x => x.key === first.key));
  const fi = walkStops(ctxOf(s)).find(x => x.key === 'goal:fiAge');
  s.setDoc('assumptions', { fiAge: 55 });
  assert.ok(fi && !walkStops(ctxOf(s)).some(x => x.key === 'goal:fiAge'));
});

test('6: a brand-new client is fresh (one first action on Home) until Fast Track or a number', () => {
  const s = new Store(newHousehold({ name: 'New' }));
  addPresets(s, ref);
  assert.equal(isFreshClient(s.doc), true, 'faded starter lines are not data');
  assert.equal(isFreshClient(alexis().doc), false);
  assert.equal(isFreshClient(householdFromInputs(JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url))).inputs, { name: 'Demo' })), false);
});

test('8: X of Y filled on Budget, Taxes, Protection and Goals; every screen counted', () => {
  const s = alexis();
  const ctx = ctxOf(s);
  assert.deepEqual([taxesCompletion(ctx).core.of, taxesCompletion(ctx).core.done], [1, 0], 'the filing status is a guess until picked');
  s.setDoc('profile', { filingStatus: 'Single', lastYearTax: 'Refund' });
  assert.equal(taxesCompletion(ctxOf(s)).full.of, 5, 'a refund asks how much');
  assert.equal(goalsCompletion(ctx).core.of, 1);
  assert.equal(protectionCompletion(ctx).core.items[0].focus, 'add:usual-coverage', 'no coverage yet: the one box is the usual list');
  const counts = fillCounts(ctxOf(s));
  assert.deepEqual(counts.map(c => c.screen), ['About you', 'Income', 'Budget', 'Taxes', 'Assets', 'Debt', 'Credit cards', 'Protection', 'Goals']);
  for (const c of counts) assert.ok(c.full.done <= c.full.of && c.core.done <= c.core.of, c.screen);
});

test('9: the usage log keeps counts and words, never a dollar amount, and exports with the ease answer', () => {
  const s = alexis();
  const doc = s.doc;
  logEvent(doc, 'screen', { screen: 'cash-flow/budget', ms: 4200, clicks: 3 }, { now });
  logEvent(doc, 'findMiss', { words: 'rnet' }, { now, debounce: 'findMiss' });
  logEvent(doc, 'findMiss', { words: 'rent 1200 dollars' }, { now: new Date(now.getTime() + 500), debounce: 'findMiss' });
  logEvent(doc, 'undo', {}, { now });
  logEvent(doc, 'back', {}, { now });
  logEvent(doc, 'deadEnd', { name: 'Rent: due day' }, { now });
  assert.equal(logEvent(doc, 'nonsense', {}), null, 'only known events');
  assert.equal(usageSummary(doc).findMiss, 1, 'typing replaces the last Find miss');
  assert.equal(scrub('rent $1,200 at 24%'), 'rent # at #');
  startSession(s, ref, { now });
  endSession(s, ref, { now, ease: { score: 6, stuck: 'Could not find the 401k match' } });
  logEvent(doc, 'ease', { score: 6, stuck: 'Could not find the 401k match', session: 1 }, { now });
  assert.deepEqual(doc.program.reviews.S1.ease, { score: 6, stuck: 'Could not find the 401k match' });
  const csv = usageCsv(doc);
  assert.match(csv, /^time,event,screen,seconds,clicks,detail\n/);
  for (const e of ['screen', 'findMiss', 'undo', 'back', 'deadEnd', 'ease', 'ease \\(session record\\)']) assert.match(csv, new RegExp(`,${e},`));
  assert.match(csv, /cash-flow\/budget,4\.2,3/);
  assert.ok(!/1,?200/.test(csv), 'no dollar amounts');
  for (let i = 0; i < USAGE_MAX + 5; i++) logEvent(doc, 'back', {}, { now });
  assert.equal(doc.usage.events.length, USAGE_MAX);
  assert.ok(!s.undoStack.some(u => JSON.stringify(u).includes('"usage"')), 'never an undo step');
});

test('9: no ease answer leaves the session record as it was', () => {
  const s = alexis();
  startSession(s, ref, { now });
  endSession(s, ref, { now, ease: { score: null, stuck: '' } });
  assert.equal(s.doc.program.reviews.S1.ease, undefined);
});
