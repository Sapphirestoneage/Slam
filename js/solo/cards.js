// SPDX-License-Identifier: AGPL-3.0-only
// Standalone: "Is this card right for me?" The planning side of cards: your next move and the one after it, whether a
// card fits you today, what a fee really costs, the dates to know, and whether any setup beats one plain card.
// Every number comes from js/math/cardplan.js and js/math/cards.js over the card library and the dated offers file.
import { h } from '../ui/dom.js';
import { money, btn, chip, foot } from './shell.js';
import { cardRewards, feeCheck, issuerName } from '../math/cards.js';
import { materialityOf } from '../math/time.js';
import { RULES } from '../registry/assumptions.js';
import * as P from '../math/cardplan.js';

const $ = id => document.getElementById(id);
const KEY = 'slam.cardplan.v1';
const CATS = [['dining', 'Dining and takeout', 300], ['groceries', 'Groceries', 500], ['gas', 'Gas', 150], ['travel', 'Travel', 150], ['streaming', 'Streaming', 50], ['drugstore', 'Drugstores', 50], ['transit', 'Transit and rideshare', 100], ['other', 'Everything else', 1000]];
const AMTS = [0, 50, 150, 300, 500, 1000, 2000];
const SCORES = [['none', 'None yet'], ['fair', 'Under 670'], ['good', '670 to 739'], ['excellent', '740 or more']];
const LEVEL = { fits: 'Fits', maybe: 'Maybe', later: 'Later' };
let S = { held: [], opened: [], uses: {}, cat: {}, open: {} }, lib = null, offers = null, tools = null, ref = null;
try { S = { ...S, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* a private window: answers last for this visit */ }
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* fine */ } };
// tap: this page's own answers, kept in this browser only (they are not part of the household plan or its sheet)
const tap = patch => { Object.assign(S, patch); keep(); draw(); };
const yours = () => Object.keys(S).some(k => ['score', 'spend', 'heavyDebt', 'business', 'tv'].includes(k) && S[k] != null) || S.held.length > 0 || S.opened.length > 0 || (S.programs || []).length > 0;

const fold = (id, summary, body, { amt = null } = {}) => {
  const d = h('details.cp-fold', { id }, h('summary', {}, h('span', {}, summary), amt ? h('span.cp-amt', {}, amt) : h('span'), h('span.cp-see', {}, 'See')), h('div.cp-body', {}, body));
  d.open = !!S.open[id];
  d.addEventListener('toggle', () => { S.open[id] = d.open; keep(); });
  return d;
};
const question = (label, kids, tag = null) => h('div.cp-q', {}, h('div.st-flabel', {}, label, tag ? [' ', h('span.st-tag', {}, tag)] : null), h('div.st-chips', {}, kids));
const tags = (label, list, cls = '') => h('div.cp-tags', {}, h('span.cp-lab', {}, label), list.map(t => h(`span.st-tag${cls}`, {}, t)));
const cardOf = id => lib.cards.find(c => c.id === id) ?? null;
const usedOf = id => (cardOf(id)?.credits || []).reduce((t, c) => t + (S.uses[id]?.[c.id] === 'Use' ? c.value ?? 0 : 0), 0);
const spendYear = () => Object.fromEntries(CATS.map(([k, , typical]) => [k, (S.cat[k] ?? typical) * 12]));
const now = () => new Date();

// two taps for a month: the year, then the month
function monthPick(id, onPick) {
  const y = now().getFullYear(), year = S.pickYear?.[id] ?? null;
  return h('div.cp-small', {}, h('div.st-chips', {}, [y - 2, y - 1, y].map(v => chip(String(v), year === v, () => tap({ pickYear: { ...S.pickYear, [id]: v } })))),
    year ? h('div.st-chips', { style: { marginTop: '6px' } }, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => chip(m, false, () => { const pk = { ...S.pickYear }; delete pk[id]; S.pickYear = pk; onPick(`${year}-${String(i + 1).padStart(2, '0')}`); }))) : null);
}
const monthSay = s => P.monthWords(Number(s.slice(0, 4)) * 12 + Number(s.slice(5)) - 1);

function context() {
  const rule = offers.rules.chase524, dates = [...S.opened, ...S.held.map(x => x.opened).filter(Boolean)];
  const slots = P.slotsFromDates(dates, now(), rule);
  const opts = { units: offers.units, rule, unlockIds: offers.unlocksTransfers, transferValue: S.tv ?? null, creditsUsedOf: usedOf, programs: S.programs || [] };
  const me = { score: S.score ?? null, heavyDebt: S.heavyDebt === true, business: S.business === true };
  const state = { held: S.held.map(x => x.id), opened: slots.used, monthlySpend: S.spend ?? null, me };
  return { rule, slots, opts, me, state, small: materialityOf(null, {}).value, rr: ref.presets.realReturn.default, wr: ref.presets.withdrawalRate.default };
}

function aboutYou() {
  const pick = (k, v) => tap({ [k]: S[k] === v ? null : v });
  return h('div.st-card', { id: 'about' }, h('h2', { style: { marginTop: 0 } }, 'About you'), h('p.st-small.st-soft', {}, 'All taps. Each one sharpens the answer.'),
    question('Carrying card debt at 8% or more?', [chip('Yes', S.heavyDebt === true, () => pick('heavyDebt', true)), chip('No', S.heavyDebt === false, () => pick('heavyDebt', false))]),
    question('Credit score', SCORES.map(([v, l]) => chip(l, S.score === v, () => pick('score', v)))),
    question('What you put on cards in a month', [500, 1000, 2000, 4000].map(v => chip(v === 4000 ? '$4,000 or more' : `About ${money(v)}`, S.spend === v, () => pick('spend', v)))),
    question('A business or side income?', [chip('Yes', S.business === true, () => pick('business', true)), chip('No', S.business === false, () => pick('business', false))]),
    question('What a Chase point is worth to you', [[null, 'Cash, 1 cent'], [0.0125, '1.25 cents'], [0.015, '1.5 cents'], [0.02, '2 cents']].map(([v, l]) => chip(l, (S.tv ?? null) === v, () => tap({ tv: v })))),
    question('Airline and hotel points you would really use', Object.entries(offers.units).filter(([k, u]) => k !== 'cash' && !u.transferable).map(([k, u]) => chip(u.name, (S.programs || []).includes(k), () => tap({ programs: (S.programs || []).includes(k) ? S.programs.filter(x => x !== k) : [...(S.programs || []), k] })))),
    h('div.st-small.st-soft', {}, 'Their cards stay out of your moves until you tap one. Miles you would not use are worth nothing to you.'),
    h('div.cp-q', {}, h('div.st-flabel', {}, 'Cards opened in the last two years, at any bank'),
      S.opened.length ? h('div.st-chips', {}, S.opened.map((d, i) => h('button.st-chip.cp-chipx', { type: 'button', title: 'Remove this one', 'aria-label': `Remove the card opened ${monthSay(d)}`, onClick: () => tap({ opened: S.opened.filter((_, j) => j !== i) }) }, `${monthSay(d)} ×`))) : null,
      h('div.st-small.st-soft', {}, 'Add one: tap the year, then the month. Cards you hold are added below, so leave those out here.'),
      monthPick('other', d => tap({ opened: [...S.opened, d].sort() }))));
}

function moves(C) {
  const list = offers.offers, R = P.nextMoves(list, C.state, C.opts), spendKnown = S.spend != null;
  let line;
  if (C.me.heavyDebt) line = 'Your next move: pay down the debt. No new card pays more than that interest costs.';
  else if (C.slots.left <= 0) line = `Your next move: wait. Chase opens up again in ${C.slots.frees}.`;
  else if (R.moves.length) { const m = R.moves[0]; line = `Your next move: ${m.offer.name}, worth ${money(Math.round(m.net))} in its first year after the fee${spendKnown ? `, from about ${m.months} ${m.months === 1 ? 'month' : 'months'} of spending you already do` : ''}.`; }
  else line = 'Your next move: hold. Nothing here beats what you have.';
  const row = m => {
    const o = m.offer, card = o.cardId ? cardOf(o.cardId) : null, id = o.cardId ?? o.name;
    const fit = P.cardFit(o, { ...C.me, opened: C.slots.used, monthlySpend: S.spend ?? null }, { ...C.opts, held: C.state.held, creditsUsed: usedOf(id) });
    const OU = P.opensAndUses(card, o, { unlockIds: offers.unlocksTransfers, benefitKinds: lib.benefitKinds, rule: C.rule });
    const value = P.offerValue(o, { ...C.opts, held: C.state.held }), yearly = Math.max(0, (o.annualFee ?? 0) - usedOf(id));
    const offerWords = o.bonus.words ?? `${o.bonus.amount.toLocaleString('en-US')} ${offers.units[o.bonus.unit].name}`;
    return fold(`move-${id.replace(/\W+/g, '-')}`, [o.name, ' ', h('span.st-tag', {}, LEVEL[fit.level])], [
      h('p', { style: { margin: 0 } }, `${offerWords}${o.spend ? `, after ${money(o.spend)} on the card in ${o.months} months` : ''}. `, h('span.st-small.st-soft', {}, `From review sites, read ${monthSay(offers.asOf.slice(0, 7))}.${o.conflict ? ` ${o.conflict}.` : ''}${o.ends ? ` Listed as ending ${monthSay(o.ends.slice(0, 7))}.` : ''}`)),
      OU.opens.length ? tags('Opens', OU.opens) : null, tags('Uses', OU.uses, '.uses'),
      h('ul.st-small', { style: { margin: 0, paddingLeft: '18px' } }, fit.reasons.map(t => h('li', {}, t))),
      card?.credits?.some(c => c.value > 0) ? question('Credits you would use anyway', card.credits.filter(c => c.value > 0).map(c => chip(`${c.name}, ${money(c.value)}`, S.uses[id]?.[c.id] === 'Use', () => tap({ uses: { ...S.uses, [id]: { ...S.uses[id], [c.id]: S.uses[id]?.[c.id] === 'Use' ? null : 'Use' } } })))) : null,
      yearly > 0 ? h('p.st-small', { style: { margin: 0 } }, `${usedOf(id) > 0 ? 'After those credits it' : 'It'} costs ${money(yearly)} a year. A cost you keep paying adds ${money(Math.round(P.costAsFiNumber(yearly, C.wr)))} to the amount you need to stop working.`) : (o.annualFee > 0 ? h('p.st-small', { style: { margin: 0 } }, 'The credits you would use cover the fee.') : null),
      value > 0 ? h('p.st-small', { style: { margin: 0 } }, `Invest the ${money(Math.round(value))} and leave it 30 years: about ${money(Math.round(P.investedLater(value, 30, C.rr)))} in today's dollars.`) : null,
      h('p.st-small', { style: { margin: 0 } }, `After this: ${m.slotsAfter} ${m.slotsAfter === 1 ? 'slot' : 'slots'} left.`),
      m.then.length ? [h('div.cp-lab', {}, 'Then you could'), h('ul.cp-then', {}, m.then.slice(0, 3).map(t => h('li', {}, h('span', {}, `${t.offer.name}${spendKnown ? `, from month ${t.startsMonth}` : ''}`), h('b.cp-amt', {}, `${money(Math.round(t.both))} for both`))),
        h('li', {}, h('span', {}, 'Or stop here and keep your slots'), h('b.cp-amt', {}, money(Math.round(m.net)))))] : null,
    ], { amt: money(Math.round(m.net)) });
  };
  const more = R.moves.length > 6 && !S.allMoves;
  return h('div.st-card.hero', { id: 'next', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Where you stand'), h('p', { style: { fontWeight: 800, fontSize: '1.15rem', margin: '4px 0 6px' } }, line),
    h('p.st-small.st-soft', {}, yours() ? 'Built from your answers. Change one and this changes.' : 'Built on no answers yet. Tap a few under About you to make it yours.'),
    h('p.st-small', {}, `${C.slots.left} of ${C.rule.slots} Chase slots open${C.slots.frees && C.slots.left < C.rule.slots ? `. The next one comes back in ${C.slots.frees}` : ''}. Welcome offers are loaded for Chase so far. Amounts are the offer less the first-year fee.`),
    (more ? R.moves.slice(0, 6) : R.moves).map(row),
    more ? h('div.st-row', { style: { marginTop: '10px' } }, btn(`Show all ${R.moves.length} moves`, () => tap({ allMoves: true }), 'slim')) : null);
}

function held(C) {
  const issuers = [...new Set(lib.cards.map(issuerName))].filter(Boolean).sort();
  const adding = S.addIssuer ? lib.cards.filter(c => issuerName(c) === S.addIssuer && !S.held.some(x => x.id === c.id)) : [];
  const sy = spendYear();
  const one = (x, i) => {
    const c = cardOf(x.id); if (!c) return null;
    const F = feeCheck(c, { uses: S.uses[x.id] || {}, spend: sy }), sib = lib.cards.find(o => o.issuer === c.issuer && !(o.annualFee > 0) && o.id !== c.id && o.rewards?.kind === c.rewards?.kind);
    const Y = P.yearCheck({ fee: c.annualFee ?? 0, back: F.back ?? 0, small: C.small, noFeeSibling: sib ? sib.name : null });
    const upd = patch => tap({ held: S.held.map((y, j) => (j === i ? { ...y, ...patch } : y)) });
    return fold(`held-${x.id}`, `${issuerName(c)} ${c.name}`, [
      h('p', { style: { margin: 0, fontWeight: 700 } }, Y.line), Y.option ? h('p.st-small', { style: { margin: 0 } }, Y.option) : null,
      c.credits?.some(k => k.value > 0) ? question('Credits you really use', c.credits.filter(k => k.value > 0).map(k => chip(`${k.name}, ${money(k.value)}`, S.uses[x.id]?.[k.id] === 'Use', () => tap({ uses: { ...S.uses, [x.id]: { ...S.uses[x.id], [k.id]: S.uses[x.id]?.[k.id] === 'Use' ? null : 'Use' } } })))) : null,
      c.annualFee > 0 ? h('p.st-small.st-soft', { style: { margin: 0 } }, `Counts ${money(Math.round(F.rewards?.value ?? 0))} in rewards on the spending below plus the credits tapped.`) : null,
      h('div.cp-q', {}, h('div.st-flabel', {}, x.opened ? `Opened ${monthSay(x.opened)}` : 'When did you open it? (for the dates and the 5 card limit)'),
        x.opened ? h('div.st-row', {}, btn('Change the month', () => upd({ opened: null }), 'slim')) : monthPick(`held-${x.id}`, d => upd({ opened: d })),
        x.opened ? null : h('div.st-small.st-soft', {}, 'Older than two years? Leave it blank.')),
      h('div.st-row', {}, btn('I no longer have this card', () => tap({ held: S.held.filter((_, j) => j !== i) }), 'slim')),
    ], { amt: c.annualFee > 0 ? `${money(c.annualFee)} a year` : 'No fee' });
  };
  return h('div.st-card', { id: 'held' }, h('h2', { style: { marginTop: 0 } }, 'Cards you hold'), h('p.st-small.st-soft', {}, 'Tap a bank, then your card. Each one gets a yearly check: did it earn its fee?'),
    S.held.map(one),
    h('div.cp-q', { style: { marginTop: '12px' } }, h('div.st-flabel', {}, 'Add a card'), h('div.st-chips.cp-small', {}, issuers.map(n => chip(n, S.addIssuer === n, () => tap({ addIssuer: S.addIssuer === n ? null : n })))),
      S.addIssuer ? h('div.st-chips.cp-small', { style: { marginTop: '8px' } }, adding.length ? adding.map(c => chip(c.name, false, () => tap({ held: [...S.held, { id: c.id, opened: null }], addIssuer: null, open: { ...S.open, [`held-${c.id}`]: true } }))) : h('span.st-small.st-soft', {}, 'You hold every card listed for this bank.')) : null));
}

function dates(C) {
  const list = P.cardDates(S.held.map(x => { const c = cardOf(x.id), o = offers.offers.find(f => f.cardId === x.id); return { name: c?.name ?? x.id, opened: x.opened, fee: c?.annualFee ?? 0, offerMonths: o?.spend ? o.months : null }; }), now(), C.rule);
  return h('div.st-card', { id: 'dates' }, h('h2', { style: { marginTop: 0 } }, 'Dates to know'),
    list.length ? h('ul.cp-dates', {}, list.slice(0, 8).map(d => h('li', {}, h('b', {}, d.when), h('span', {}, `${d.text}.`))))
      : h('p.st-small.st-soft', { style: { marginBottom: 0 } }, 'Add a card you hold and the month you opened it. Its offer deadline, fee date and the month it stops counting show here.'));
}

function plain() {
  const sy = spendYear(), total = Object.values(sy).reduce((a, b) => a + b, 0), flat = total * RULES.plainCardRate;
  const per = lib.cards.filter(c => c.rewards && !c.secured && !c.store).map(c => ({ card: c, name: `${issuerName(c)} ${c.name}`, fee: (c.annualFee ?? 0) - usedOf(c.id) }));
  const key = JSON.stringify([sy, S.uses]);
  if (plain.key !== key) { plain.key = key; plain.R = P.bestSetups(per, sy, flat); }
  const R = plain.R, small = materialityOf(null, {}).value;
  const best = [...R].sort((a, b) => b.value - a.value)[0], simple = best ? R.find(r => best.value - r.value < small) ?? best : null;
  const rows = [{ label: `One plain ${Math.round(RULES.plainCardRate * 100)}% card`, value: flat }, ...R.map(r => ({ label: `Best ${r.size} ${r.size === 1 ? 'card' : 'cards'}`, value: r.value, names: r.cards.map(c => c.name).join(' + ') }))];
  const max = Math.max(1, ...rows.map(r => r.value));
  const body = [h('p.st-small.st-soft', { style: { margin: 0 } }, 'A month of spending by kind. Each starts on a typical amount until you tap it.'),
    CATS.map(([k, label, typical]) => question(label, AMTS.map(a => chip(money(a), (S.cat[k] ?? typical) === a, () => tap({ cat: { ...S.cat, [k]: a } }))), S.cat[k] == null ? 'Typical' : null)),
    h('div.cp-bars', { role: 'img', 'aria-label': rows.map(r => `${r.label}: ${money(Math.round(r.value))} a year`).join('. ') }, rows.map(r => h('div.cp-barrow', { title: r.names ?? r.label }, h('span', {}, r.label), h('div.cp-track', {}, h('b', { style: { width: `${Math.max(0, r.value) / max * 100}%` } })), h('b.cp-amt', {}, `${money(Math.round(r.value))} a year`)))),
    simple ? h('p', { style: { margin: 0, fontWeight: 700 } }, simple.gain < small ? `The best setup pays about ${money(Math.max(0, Math.round(best.gain)))} a year more than one plain card. That is small enough that one simple card is a fine answer.` : `${simple.cards.map(c => c.name).join(' + ')} pays about ${money(Math.round(simple.gain))} a year more than one plain card.`) : null,
    simple && simple.gain >= small && simple.size > 1 ? h('dl.st-kv', {}, CATS.filter(([k]) => sy[k] > 0).map(([k, label]) => [h('dt', {}, label), h('dd', {}, simple.use[k])])) : null,
    h('p.st-small.st-soft', { style: { margin: 0 } }, 'Rewards a year on this spending, less each fee after the credits you tapped. Welcome offers are left out. Points count at their cash value, and rotating categories are not counted.')];
  return h('div.st-card', { id: 'plain' }, h('h2', { style: { marginTop: 0 } }, 'Does any setup beat one plain card?'), fold('plain-fold', 'Check it against my spending', body, { amt: best ? `${money(Math.max(0, Math.round(best.gain)))} a year at most` : null }));
}

function pairs() {
  const jobs = [...new Set(tools.tools.map(t => t.job))];
  return h('div.st-card', { id: 'pairs' }, h('h2', { style: { marginTop: 0 } }, 'Tools that pair with this'),
    fold('pairs-fold', 'Seven apps for the daily jobs this page does not do', [
      h('p.st-small.st-soft', { style: { margin: 0 } }, `This page plans. These handle the day to day. No one pays to be listed and the order means nothing. Read ${monthSay(tools.asOf.slice(0, 7))}.`),
      jobs.map(j => h('div', {}, h('div.cp-lab', {}, j), h('ul.st-small', { style: { margin: '4px 0 0', paddingLeft: '18px' } }, tools.tools.filter(t => t.job === j).map(t => h('li', {}, h('strong', {}, t.name), `: ${t.does} ${t.tradeoff}`))))),
    ]));
}

function draw() {
  if (!lib || !offers || !tools || !ref) return;
  const C = context(), y = window.scrollY;
  $('main').replaceChildren(
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, 'Is this card right for me?'), h('p', { style: { marginBottom: 0 } }, 'Your next move, the move after it, and what each card opens and uses. It will also tell you when the answer is no card at all.')),
    moves(C), aboutYou(), held(C), dates(C), plain(), pairs(),
    h('div.st-row', {}, btn('Clear my answers', () => { S = { held: [], opened: [], uses: {}, cat: {}, open: {} }; keep(); draw(); }, 'slim')));
  foot();
  window.scrollTo(0, y);
}
const json = r => r.json();
Promise.all([fetch('data/library/cards.json').then(json), fetch('data/library/card-offers.json').then(json), fetch('data/library/card-tools.json').then(json), fetch('data/reference-2026.json').then(json)]).then(([a, b, c, d]) => { lib = a; offers = b; tools = c; ref = d; draw(); })
  .catch(() => $('main').replaceChildren(h('div.st-card', {}, h('h1', {}, 'Is this card right for me?'), h('p', {}, 'The card list did not load. Refresh the page to try again.'))));
