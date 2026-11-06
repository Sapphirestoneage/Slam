// SPDX-License-Identifier: AGPL-3.0-only
// Walk me through (batch 14, item 5): every empty or rough box, one at a time, like a TurboTax interview. Since batch 48
// the first stop is the Ask next question (QUESTIONS 373); then the order is the program's session 1 checklist first (what you have, the top-line numbers), then the core boxes screen by screen:
// About you, Income (with the filing status on Taxes), Budget categories, Assets, Debt, Credit cards, Protection, Goals (Fast Track runs before the walk
// when it has not been done). Each stop names a real box (a data-focus handle) and how to park it (Will get it).
// The list is worked out again after every step, so a box filled along the way drops off. Pure: no DOM.
import { profileCompletion } from './profile-completion.js';
import { listCompletion, budgetCompletion, paidInFull, protectionCompletion } from './completion.js';
import { statusOf } from './records.js';
import { isCategoryRecord, categoryKeyOf, categoryTypicalOf } from './math/spending.js';
import { whyAnswered } from './whynow.js';
import { defaultFilingStatus } from './math/income.js';
import { PROTECTION_TYPES } from './gates.js';
import { typicalCardLimit } from './math/proposed.js';

// Batch 18 (QUESTIONS 233, 234): session 1 is the first pass. Its walk stops only at empty core boxes (a rough or
// guessed number waits for session 2), and Protection asks Have it? for Health and Life only; the rest of the usual
// list comes in session 2 or from the Protection screen.
export const SESSION1_COVERAGE = ['Health', 'Life'];
export const inSessionOne = doc => (doc.session?.count || 0) === 0;
// The money words for a typical choice ("Use typical $2,480").
const dollars = v => `$${Math.round(v).toLocaleString('en-US')}`;

// Each About you core answer: its box and its key in profile.later (Will get it).
const PROFILE_BOX = {
  'What prompted this call': ['p:whyNow:chips', 'whyNow'], 'Biggest worry': ['p:worry:chips', 'worry'], 'Goal in their words': ['p:goalWords:chips', 'goalWords'],
  'First name': ['p:firstName', 'firstName'], 'Last name': ['p:lastName', 'lastName'], 'Birth year': ['p:birthYear', 'birthYear'], State: ['p:state', 'state'],
  'Solo or couple': ['p:mode', 'household'], 'Work situation': ['p:hub-work', 'workSituation'], Housing: ['seg:Housing:Rent', 'housing'], Car: ['seg:Has a car:true', 'hasCar'],
  Pets: ['seg:Has pets:true', 'hasPets'], 'Which do you have today': ['p:area-cash', 'areas'],
  'Partner name': ['p:partnerName', 'partnerName', 'profile:about'], 'Partner birth year': ['p:partnerBirthYear', 'partnerBirthYear', 'profile:about'],
};
// Words for a stop's field, the way the bar says it ("Rent's due day").
const WORD = { amount: 'amount', balance: 'balance', apr: 'APR', have: 'have it?', value: 'value', dueDay: 'due day', payFrequency: 'pay schedule', limit: 'credit limit' };
const BOX = { value: 'balance' }; // an asset's value box is its balance column (js/ui/money-lists.js)
const ROUGH = new Set(['Roughly', 'Not sure']);
// "Rent's due day"; a name with a note in it reads "Investments (all accounts): balance".
const label = (n, w) => (/[()]/.test(n) || w.endsWith("?") ? `${n}: ${w}` : /s$/i.test(n) ? `${n}' ${w}` : `${n}'s ${w}`);

export const WALK_SCREENS = ['About you', 'Income', 'Taxes', 'Budget categories', 'Assets', 'Debt', 'Credit cards', 'Protection', 'Goals'];
const SCREEN_OF = [['#/home/profile', 'About you'], ['#/cash-flow/income', 'Income'], ['#/cash-flow/taxes', 'Taxes'], ['#/cash-flow/budget', 'Budget categories'], ['#/net-worth/assets', 'Assets'],
  ['#/net-worth/debt', 'Debt'], ['#/net-worth/credit-cards', 'Credit cards'], ['#/net-worth/protection', 'Protection'], ['#/plan/goals', 'Goals']];

// Batch 48 (QUESTIONS 373): the walk starts with the Ask next question (M9Q, js/math/nextbest.js), the one answer that
// narrows the plan most, then carries on as before. q: Ask next's top question when the walk starts. The stop keeps the
// key the same box has further down the list, so it is never asked twice.
export function askStopOf(q) {
  if (!q) return null;
  const rec = q.recId && q.field ? { kind: 'record', id: q.recId, field: q.field } : null;
  return { key: rec ? `${q.recId}:${q.field}` : `ask:${q.id}`, ask: { id: q.id, question: q.question }, screen: SCREEN_OF.find(([r]) => String(q.route || '').startsWith(r))?.[1] ?? 'Ask next',
    route: q.route, focus: q.focus ?? null, id: q.recId ?? null, field: q.field ?? null, name: q.question, why: q.why ?? null, park: rec };
}
// Is the Ask next stop still open: the same question is still on Ask next's list (an answer takes it off or changes it).
const askOpen = (ctx, stop) => (ctx.askNext?.()?.questions || []).some(x => x.id === stop.ask.id && x.question === stop.ask.question);

// The stops for this client now, in order: [{ key, screen, name, route, focus, id, field, parentCat, open, park }].
// park: { kind: 'profile', key } or { kind: 'record', id, field } or { kind: 'category', id } (Will get it).
// ask: the Ask next stop the walk started with (askStopOf), first while it is still open.
export function walkStops(ctx, { ask = null } = {}) {
  const doc = ctx.store.doc, p = doc.profile || {};
  const out = [];
  const seen = new Set();
  const lead = ask && askOpen(ctx, ask) ? ask : null;
  const add = s => { if (!seen.has(s.key) && !(lead && s !== lead && lead.focus && s.focus === lead.focus)) { seen.add(s.key); out.push(s); } };
  if (lead) add(lead);
  const recStop = (screen, route, r, field, { name = null, rough = false } = {}) => ({
    key: `${r.id}:${field}`, screen, route, id: r.id, field, focus: `${r.id}:${BOX[r.kind === 'asset' ? field : ''] ?? field}`,
    name: `${label(name ?? (r.name || r.type || 'This'), WORD[field] ?? field)}${rough ? (statusOf(r, field) === 'Not sure' ? ' (a guess)' : ' (rough)') : ''}`, park: { kind: 'record', id: r.id, field } });
  const m = ctx.metrics();
  const live = ctx.visible(() => true);

  // ---------- Session 1: what you have, then the top-line numbers ----------
  const areasAnswered = p.noneOfThese === true || Object.values(p.areas || {}).some(v => v === true || v === false);
  if (!areasAnswered) add({ key: 'profile:areas', screen: 'About you', route: '#/home/profile', focus: 'p:area-cash', name: 'Which do you have today', park: { kind: 'profile', key: 'areas' } });
  const income = live.filter(r => r.kind === 'income');
  if (m.inputs.takeHome == null) add(income[0] ? recStop('Income', '#/cash-flow/income', income[0], 'amount', { name: 'Take-home pay' })
    : { key: 'add:income', screen: 'Income', route: '#/cash-flow/income', focus: 'add:income', name: 'Take-home pay: add the paycheck', park: null });
  if (m.inputs.spending == null) add({ key: 'gut', screen: 'Budget categories', route: '#/cash-flow/budget', focus: 'gut', name: 'Spending a month, all in (a gut number is fine)', park: null });

  // ---------- About you ----------
  const pc = profileCompletion(doc).core;
  for (const label of pc.missing) {
    const [focus, key, open] = PROFILE_BOX[label] ?? [];
    if (!focus || p.later?.[key]) continue;
    if (['whyNow', 'worry', 'goalWords'].includes(key) && whyAnswered(p, key)) continue;
    add({ key: `profile:${key}`, screen: 'About you', route: '#/home/profile', focus, open: open ?? null, name: label, park: { kind: 'profile', key } });
  }

  // ---------- Income, Budget categories, Assets, Debt, Credit cards, Protection ----------
  const fromList = (screen, route, items) => { for (const it of items) { const r = doc.records.find(x => x.id === it.id); if (r) add({ ...recStop(screen, route, r, it.field, { name: it.name.split(': ')[0] }) }); } };
  const first = inSessionOne(doc);
  // Session 1 keeps one rough stop: a guessed APR on heavy debt while the debt-free date is the headline, the input
  // that moves that date most (batch 18, item 4). The rest wait for session 2.
  const headline = new Set(m.debtRule?.heavy ? (m.inputs.debts || []).filter(d => d.aprGuess && d.heavy).map(d => d.id) : []);
  const roughOf = (screen, route, recs, fields) => { for (const r of recs) for (const f of fields(r)) if (ROUGH.has(statusOf(r, f)) && (!first || (f === 'apr' && headline.has(r.id)))) add({ ...recStop(screen, route, r, f, { rough: true }), why: headline.has(r.id) && f === 'apr' ? 'it moves the debt-free date most' : null }); };
  const inc = listCompletion(ctx, r => r.kind === 'income' || r.kind === 'benefit', ['amount']);
  fromList('Income', '#/cash-flow/income', inc.core.items);
  for (const r of income) if (!r.values?.payFrequency && r.per === 'paycheck') add(recStop('Income', '#/cash-flow/income', r, 'payFrequency'));
  roughOf('Income', '#/cash-flow/income', income, () => ['amount']);

  // Taxes (one tap): the filing status is a guess until it is picked.
  if (!p.filingStatus && !p.later?.filingStatus && !p.none?.filingStatus && income.length) {
    const guess = defaultFilingStatus(p); // batch 18: the typical answer from the household is the first tap
    add({ key: 'tax:filing', screen: 'Taxes', route: '#/cash-flow/taxes', focus: 'tax:filing', name: 'Filing status (a guess until picked)', park: { kind: 'profile', key: 'filingStatus' },
      typical: { label: guess, why: guess === 'Head of household' ? 'Typical with a dependent and no marriage' : `Typical for ${p.mode || p.household || 'Solo'}`, apply: { kind: 'profile', patch: { filingStatus: guess } } } });
  }

  const bud = budgetCompletion(ctx);
  for (const it of bud.core.items) {
    const key = it.focus.split(':')[1];
    const rec = live.find(r => isCategoryRecord(r) && r.type === key);
    // Batch 18 (QUESTIONS 229): one tap "Use typical $X", from the category's faded starter amounts, marked Rough.
    const t = categoryTypicalOf(live.filter(r => r.kind === 'bill'), key, m.inputs?.typicalScale ?? 1);
    add({ key: it.focus, screen: 'Budget categories', route: '#/cash-flow/budget', focus: it.focus, id: rec?.id ?? null, field: 'amount', name: it.name.replace(': amount', ', a month'), park: rec ? { kind: 'category', id: rec.id } : null,
      typical: rec && t ? { label: `Use typical ${dollars(t)}`, why: 'The starter amounts for this category, marked Rough', apply: { kind: 'category', id: rec.id, amount: t } } : null });
  }
  for (const it of bud.full.items.filter(x => x.field === 'dueDay')) {
    const r = doc.records.find(x => x.id === it.id);
    if (r) add({ ...recStop('Budget categories', '#/cash-flow/budget', r, 'dueDay', { name: r.name || r.values.category }), parentCat: categoryKeyOf(r) });
  }

  const assets = listCompletion(ctx, r => r.kind === 'account' || r.kind === 'asset', r => [r.kind === 'asset' ? 'value' : 'balance']);
  fromList('Assets', '#/net-worth/assets', assets.core.items);
  roughOf('Assets', '#/net-worth/assets', live.filter(r => r.kind === 'account' || r.kind === 'asset'), r => [r.kind === 'asset' ? 'value' : 'balance']);

  if (ctx.gates().areas.debt !== false) {
    const coreDebt = r => (paidInFull(r) ? ['balance'] : ['balance', 'apr']);
    const debts = listCompletion(ctx, r => r.kind === 'debt' && r.type !== 'Credit card', coreDebt);
    fromList('Debt', '#/net-worth/debt', debts.core.items);
    roughOf('Debt', '#/net-worth/debt', live.filter(r => r.kind === 'debt' && r.type !== 'Credit card'), coreDebt);
    const cards = listCompletion(ctx, r => r.kind === 'debt' && r.type === 'Credit card', coreDebt);
    fromList('Credit cards', '#/net-worth/credit-cards', cards.core.items);
    roughOf('Credit cards', '#/net-worth/credit-cards', live.filter(r => r.kind === 'debt' && r.type === 'Credit card'), coreDebt);
    // Batch 45 (QUESTIONS 344): when the month is short, the gap goes on the cards until they are full, so the walk asks
    // each card's limit (one box per card). "I don't know" keeps Experian's typical limit at this age (marked a guess).
    if (m.surplus?.value != null && m.surplus.value < -0.5) {
      const typ = typicalCardLimit(ctx.ref, m.inputs.age);
      for (const r of live.filter(x => x.kind === 'debt' && x.type === 'Credit card' && x.values?.limit == null && !x.fieldStatus?.limit && x.values?.payChoice !== 'In full' && x.status !== 'Not for me'))
        add({ ...recStop('Credit cards', '#/net-worth/credit-cards', r, 'limit'), why: 'the month is short, so the room on the cards matters',
          typical: { label: "I don't know", why: typ ? `Keeps the typical limit at this age (${dollars(typ)} across the cards, Experian), marked a guess` : 'Leave it blank, marked a guess', apply: { kind: 'unknown', id: r.id, field: 'limit' } } });
    }
  }

  const coverage = live.filter(r => r.kind === 'coverage');
  const usual = PROTECTION_TYPES.filter(t => t !== 'Car' || ctx.gates().car !== false);
  if (!coverage.length && first) add({ key: 'make:coverage', screen: 'Protection', route: '#/net-worth/protection', focus: null, name: 'Health and Life insurance', park: null, make: SESSION1_COVERAGE });
  else if (!coverage.length) add({ key: 'add:usual-coverage', screen: 'Protection', route: '#/net-worth/protection', focus: 'add:usual-coverage', name: 'Insurance: add the usual list (one tap), then have it or not', park: null });
  else {
    for (const it of protectionCompletion(ctx).core.items) { const r = doc.records.find(x => x.id === it.id); if (r) add({ ...recStop('Protection', '#/net-worth/protection', r, 'have', { name: r.type === 'Renters or home' && ctx.gates().housing !== 'Own' ? 'Renters insurance' : `${r.type} insurance` }) }); }
    const rest = usual.filter(t => !coverage.some(r => r.type === t));
    if (!first && rest.length) add({ key: 'add:usual-coverage', screen: 'Protection', route: '#/net-worth/protection', focus: 'add:usual-coverage', name: `Insurance: add the rest of the usual list (${rest.length})`, park: null });
  }

  // ---------- Goals ----------
  if (doc.assumptions?.fiAge == null && !p.later?.fiAge && !p.none?.fiAge) add({ key: 'goal:fiAge', screen: 'Goals', route: '#/plan/goals', focus: 'g:fiAge', name: 'When work should be optional (FI age)', park: { kind: 'profile', key: 'fiAge' } });
  return out;
}

// Batch 18: the one-tap typical answer for a stop (Use typical $X, or the filing status the household implies).
export function useStopTypical(store, stop) {
  const a = stop.typical?.apply;
  if (!a) return false;
  if (a.kind === 'profile') store.setDoc('profile', a.patch);
  else if (a.kind === 'category') store.update(a.id, { amount: a.amount, per: 'month', status: 'Roughly', usedTypical: true });
  else if (a.kind === 'unknown') store.setFieldStatus(a.id, a.field, 'Not sure'); // batch 45: the typical stands in, marked a guess
  return true;
}
// Batch 18: the rows a stop makes before it is landed on (session 1's Health and Life), one undo step.
export function makeStopRows(store, stop) {
  if (!stop.make?.length) return 0;
  const have = new Set(store.find(r => r.kind === 'coverage').map(r => r.type));
  const add = stop.make.filter(t => !have.has(t));
  if (add.length) store.transaction('Add Health and Life insurance', () => { for (const t of add) store.add('coverage', { name: null, values: {} }, { type: t }); });
  return add.length;
}

// Will get it for one stop: the box goes on the homework list (Getting it), the way each screen's own button does.
export function parkStop(store, stop) {
  const k = stop.park;
  if (!k) return false;
  if (k.kind === 'profile') store.setDoc('profile', { later: { ...(store.doc.profile.later || {}), [k.key]: true } });
  else if (k.kind === 'record') store.setFieldStatus(k.id, k.field, 'Will email');
  else if (k.kind === 'category') store.update(k.id, { status: 'Will email' });
  return true;
}

// A brand-new client (item 6): nothing typed yet, Fast Track not run, no session ended. Home then shows one action.
export function isFreshClient(doc) {
  const typed = (doc.records || []).some(r => r.amount != null || r.values?.balance != null || r.values?.value != null);
  return !typed && !doc.settings?.fastTrack?.done && !(doc.session?.count > 0) && !(doc.snapshots || []).length;
}
