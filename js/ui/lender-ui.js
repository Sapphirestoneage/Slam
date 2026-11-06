// SPDX-License-Identifier: AGPL-3.0-only
// Report › Lender's view (batch 42, Phase 4 Track 2, M9W): what a mortgage lender, a landlord and a card issuer each see.
// Three reads side by side, each with the one number that reader looks at, where this household lands against the
// usual lines, and the one or two moves that change it most. Under them, one slim line for the gap (earned against
// what can be shown) and caret sections, closed: what each one counts, row by row; the returns and tips (taps and a
// one-tap Use); the debts a lender counts. The math is js/math/lender.js; this file only shows it and saves the taps.
// Benchmarks (docs/BENCHMARK.md): Credit Karma and Experian lead with one number and "what moves it" (the card read);
// Rocket Mortgage's and Zillow's affordability pages lead with the home price, then the DTI it rests on.
import { h, icon } from './dom.js';
import * as S from './staples.js';
import { sec } from './sections.js';
import { money, pct } from '../format.js';
import { lenderOf, lenderOn, RETURNS_FILED, lenderTermsOf, LENDER_RATES, LENDER_SHARES, rateWords } from '../math/lender.js';
import { RULES } from '../registry/assumptions.js';
import { land } from './arrive.js';
import { debtRatios } from './lists.js';
import { ownLineHidden } from '../privacy.js';

const head = (title, sub) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null));
const k = v => money(Math.round(v / 1000) * 1000);
const tip = text => h('span.ln-tip', { title: text, tabindex: '0', role: 'img', 'aria-label': text }, icon('info'));

export function lenderScreen(app, ctx) {
  const doc = ctx.store.doc;
  const title = 'What a lender sees', sub = 'A mortgage lender, a landlord and a card issuer, each reading what you can show';
  if (!lenderOn(doc)) {
    return [head(title), h('div.card', {}, h('div.empty.center', {}, h('span.title', {}, 'The lender\'s view is a Phase 4 preview, off for this client'),
      S.button('Turn it on', { kind: 'primary', onClick: () => ctx.store.setDoc('settings', { phase4: true }) }), h('span.muted.small', {}, 'Coach tools › Session has the same switch')))];
  }
  const m = ctx.metrics();
  const L = lenderOf(doc, ctx.ref, { now: ctx.now(), m });
  if (!L.has) {
    return [head(title, sub), h('div.card', {}, h('div.empty.center', {}, h('span.title', {}, 'No income yet: a lender starts there'),
      S.button('Add income', { kind: 'primary', iconName: 'plus', onClick: () => app.go('#/cash-flow/income') })))];
  }
  // Batch 28: a coach-only row has no line of its own in Client view (the totals still count it), and no move names it.
  const own = id => !ownLineHidden(doc, id);
  const moves = list => list.filter(x => own(x.rowId) && own(x.debtId));
  const V = { ...L, rows: L.rows.filter(r => own(r.id)), mortgage: { ...L.mortgage, moves: moves(L.mortgage.moves) }, landlord: { ...L.landlord, moves: moves(L.landlord.moves) },
    debts: { ...L.debts, list: L.debts.list.filter(d => own(d.id)), left: L.debts.left.filter(d => own(d.id)) } };
  return [head(title, sub), gapLine(V), h('div.ln-reads', { 'data-focus': 'lender' }, mortgageRead(app, ctx, V), landlordRead(V), cardRead(app, V)),
    countsSection(V), changeSection(ctx, V), debtsSection(V)];
}

// ---------- The gap, one slim line ----------
function gapLine(L) {
  const g = L.gap;
  const body = g.month > 0.5
    ? [h('span', {}, 'You earn ', h('strong', {}, money(L.earned)), ' a month; a mortgage lender can count ', h('strong', {}, money(L.mortgageIncome)), '.'),
      h('span', {}, 'The ', h('strong.ln-gap-num', {}, `${money(g.month)} a month`), ` between them rules out about ${k(g.loan)} of home loan and ${money(g.rent)} a month of rent.`)]
    : [h('span', {}, 'Everything you earn (', h('strong', {}, money(L.earned)), ' a month before tax) is income a lender can count.')];
  return h('div.card.ln-gap', { title: g.text }, h('span.label', {}, 'The gap'), h('div.ln-gap-text', {}, ...body),
    L.guess ? h('span.ln-guess-line', {}, S.guessTag(), h('span.muted.small', {}, 'Returns not answered: read as this year\'s pace')) : null);
}

// ---------- The three reads ----------
function read(cls, who, look, { big, bigTip, under = null, after = null, place = null, limits, moves, empty = null, extra = null, guess = false }) {
  return h(`div.card.ln-read.${cls}`, {},
    h('div.ln-who', {}, h('h2', {}, who), tip(limits)),
    h('span.label', {}, look),
    h('div.ln-big-row', {}, h('strong.ln-big', { title: bigTip }, big), guess ? S.guessTag() : null),
    under ? h('span.ln-under', {}, under) : null,
    after,
    place ? h('p.ln-place', {}, place) : null,
    empty, extra,
    moves?.length ? h('div.ln-moves', {}, h('span.label', {}, moves.length === 1 ? 'The move that changes it most' : 'The moves that change it most'),
      h('ol.ln-move-list', {}, moves.map(x => h('li', {}, x.text)))) : null);
}
function mortgageRead(app, ctx, L) {
  const M = L.mortgage;
  const over = debtRatios(ctx, ctx.metrics()).dti.value; // Overview's card, as Overview shows it (one line says how they differ)
  return read('ln-mortgage', 'A mortgage lender', 'Debt payments over the income a lender can count (DTI)', {
    big: M.dti === null ? 'No income counted yet' : pct(M.dti), bigTip: M.text, guess: L.guess,
    under: M.dti === null ? null : `${money(M.income)} a month counted · clears about ${k(M.loan)} of home loan`,
    // Batch 48 (QUESTIONS 358): one return on file keeps the cautious number big; one line says what the next return brings.
    after: M.dti === null ? null : [M.afterNext ? h('span.ln-under.ln-next', { title: M.afterNext.tip }, `${M.afterNext.text} of home loan`) : null,
      // QUESTIONS 357, 360: the rate and share it used, one tap to change them for this client.
      h('div.ln-terms', { 'data-focus': 'lender:terms' }, h('span.muted.small', {}, `At ${M.terms.text}`),
        S.moreBlock('lender:terms', () => h('div.card.ln-terms-pick', {}, lenderTermsControls(ctx)), { label: 'Change' }))],
    place: M.place, limits: M.limits, moves: M.moves,
    extra: over != null && M.dti !== null && Math.abs(over - M.dti) > 0.0005 ? h('p.muted.small.ln-note', { title: 'Overview divides what you pay on your debts by your gross pay. A lender reads each card at its minimum and counts only income it can see.' }, `Overview's debt-to-income is ${pct(over)}: what you pay, over your gross pay.`) : null,
  });
}
function landlordRead(L) {
  const R = L.landlord;
  const need = R.need === 3 ? '3' : (Math.round(R.need * 100) / 100).toFixed(2);
  return read('ln-landlord', 'A landlord', R.rent ? 'Gross pay a month over the rent' : 'The rent your gross pay clears', {
    big: R.income <= 0 ? 'No income counted yet' : R.rent ? `${(Math.round(R.times * 10) / 10).toFixed(1)} times the rent` : `Rent up to ${money(R.clears)}`, bigTip: R.text,
    under: R.income <= 0 ? null : R.rent ? `${money(R.income)} a month counted · ${money(R.rent)} rent` : `${money(R.income)} a month counted, divided by ${need}`,
    place: R.place, limits: R.limits, moves: R.moves,
  });
}
function cardRead(app, L) {
  const C = L.card;
  const addLimit = C.needsLimit ? S.button('Add a card limit', { iconName: 'plus', size: 'small', onClick: () => land(app, '#/net-worth/credit-cards', { id: C.firstWithout, field: 'limit', focus: `${C.firstWithout}:limit` }) }) : null;
  return read('ln-card', 'A card issuer', 'Card balances over your limits (utilization)', {
    big: C.util !== null ? pct(C.util) : C.cards ? 'Needs a card limit' : 'No cards on file', bigTip: C.text,
    under: C.history, place: C.place, limits: C.limits, moves: C.moves,
    empty: addLimit ? h('div.row-line', {}, addLimit) : null,
  });
}

// ---------- Under the reads: caret sections, closed ----------
function countsSection(L) {
  const out = L.rows.filter(r => r.hidden > 0.5).length;
  const cell = (v, label) => h('td.num', { 'data-label': label }, money(v / 12));
  return sec('lender:counts', { title: 'What each one counts', summary: `${L.rows.length} ${L.rows.length === 1 ? 'income' : 'incomes'}${out ? ` · ${money(L.gap.month)} a month out of a lender's sight` : ''}` },
    () => h('div.card', {}, h('table.rows.mini.ln-table', {},
      h('thead', {}, h('tr', {}, ['Income', 'You earn', 'A mortgage lender', 'A landlord'].map((t, i) => h(i ? 'th.num' : 'th', {}, t)))),
      h('tbody', {}, L.rows.map(r => h('tr', {}, h('td', {}, h('span.ln-name', {}, r.name, tip(r.why), r.guess ? S.guessTag() : null)), cell(r.earned, 'You earn'), cell(r.mortgage, 'A mortgage lender'), cell(r.landlord, 'A landlord')))),
      h('tfoot', {}, h('tr', {}, h('td', {}, h('strong', {}, 'A month')), h('td.num', { 'data-label': 'You earn' }, h('strong', {}, money(L.earned))), h('td.num', { 'data-label': 'A mortgage lender' }, h('strong', {}, money(L.mortgageIncome))), h('td.num', { 'data-label': 'A landlord' }, h('strong', {}, money(L.landlordIncome)))))),
    h('p.muted.small.ln-foot', {}, 'A month before tax. Money from family is a gift to a lender, not income.')));
}
const FILED = RETURNS_FILED.map(v => [v, v]);
function changeSection(ctx, L) {
  const self = L.rows.filter(r => r.kind === 'self'), tipsRows = L.rows.filter(r => r.kind === 'paycheck' && (r.tipsHidden > 0 || r.tipsReported));
  if (!self.length && !tipsRows.length) return null;
  const up = (id, patch) => ctx.store.update(id, patch);
  const summary = self.some(r => r.returns?.guessed) ? 'Returns not answered yet: a Guess' : [self.length ? `${self.length} self-employment ${self.length === 1 ? 'income' : 'incomes'}` : null, tipsRows.length ? (tipsRows.some(r => r.tipsHidden > 0) ? 'cash tips not reported' : 'cash tips reported') : null].filter(Boolean).join(' · ');
  const box = (r, key, value, year) => S.labelled(`Net profit, ${year}`, h('span.row-line.ln-box', {},
    r.pace != null ? S.button(`Use ${money(r.pace)}`, { size: 'small', tip: 'This year\'s pace, as the return would show it', onClick: () => up(r.id, { [key]: Math.round(r.pace) }) }) : null,
    S.moneyInput(value, v => up(r.id, { [key]: v }), { hint: 'Add amount', cents: false, key: `${r.id}:${key}`, width: 130 })));
  return sec('lender:change', { title: 'Your returns and tips', summary, open: false },
    () => h('div.card.ln-change', {},
      self.map(r => { const R = r.returns, rec = ctx.store.get(r.id), v = rec?.values || {};
        return h('div.ln-change-row', { 'data-id': r.id }, h('strong.ln-change-name', {}, r.name),
          S.labelled('Tax returns filed with it', S.toggle(FILED, v.returnsFiled ?? null, x => up(r.id, { returnsFiled: x }), { label: `${r.name}: tax returns filed`, clearable: true, key: `${r.id}:returnsFiled` })),
          R.n >= 1 || v.returnsFiled == null ? box(r, 'returnLast', v.returnLast ?? null, R.year) : null,
          R.n >= 2 || v.returnsFiled == null ? box(r, 'returnBefore', v.returnBefore ?? null, R.year - 1) : null); }),
      tipsRows.map(r => { const rec = ctx.store.get(r.id);
        return h('div.ln-change-row', { 'data-id': r.id }, h('strong.ln-change-name', {}, r.name),
          S.labelled('Cash tips reported', S.toggle(['Yes', 'No'], rec?.values?.cashReported ?? null, x => up(r.id, { cashReported: x }), { label: `${r.name}: cash tips reported`, clearable: true, key: `${r.id}:cashReported` }), { tip: 'To your employer, by the 10th of the next month. Reported tips go on the W-2 a lender reads' })); }),
      self.length ? h('p.muted.small.ln-foot', {}, 'Net profit is what the return shows after the costs written off (Schedule C).') : null));
}
function debtsSection(L) {
  const D = L.debts;
  if (!D.list.length && !D.left.length) return null;
  return sec('lender:debts', { title: 'Debts a lender counts', summary: `${money(D.housing + D.other)} a month` },
    () => h('div.card', {}, h('table.rows.mini.ln-table', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Debt'), h('th.num', {}, 'Balance'), h('th.num', {}, 'Counted a month'))),
      h('tbody', {}, D.list.map(d => h('tr', {}, h('td', {}, d.name, d.housing ? h('span.muted.small', {}, ' · the home') : d.minimum ? h('span.muted.small', {}, ' · its minimum') : null), h('td.num', { 'data-label': 'Balance' }, money(d.balance)), h('td.num', { 'data-label': 'Counted a month' }, money(d.payment)))),
        D.left.map(d => h('tr.ln-left', {}, h('td', {}, d.name, h('span.muted.small', {}, ` · left out: ${d.why}`)), h('td.num', { 'data-label': 'Balance' }, money(d.balance)), h('td.num', { 'data-label': 'Counted a month' }, money(0)))))),
    D.list.some(d => d.minimum) ? h('p.muted.small.ln-foot', {}, 'A lender reads each card at the minimum on the credit report, not what you pay.') : null));
}

// Batch 48 (QUESTIONS 357, 360): this client's mortgage rate and taxes-and-insurance share, taps for the common values and
// a box for any other; blank (or this week's rate) follows RULES. On Plan › Goals › More and on the Lender's view.
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-9;
const round5 = v => (v == null ? null : Math.round(v * 1e5) / 1e5);
export function lenderTermsControls(ctx) {
  const T = lenderTermsOf(ctx.store.doc);
  const setA = patch => ctx.store.setDoc('assumptions', patch);
  const today = RULES.lenderMortgageRate, share = RULES.lenderTaxInsShare;
  const rates = [...LENDER_RATES.filter(v => !near(v, today)), today].sort((a, b) => a - b);
  const shares = LENDER_SHARES.includes(share) ? LENDER_SHARES : [...LENDER_SHARES, share].sort((a, b) => a - b);
  const onRate = v => setA({ lenderRate: v == null || near(v, today) ? null : round5(v) });
  const onShare = v => setA({ lenderTaxIns: v == null || near(v, share) ? null : round5(v) });
  const rateOther = T.rateMine && !rates.some(v => near(v, T.rate)), shareOther = T.shareMine && !shares.some(v => near(v, T.share));
  return h('div.stack.ln-terms-rows', { style: { gap: '12px' } },
    h('div.preset-row', {}, h('span.label', {}, 'Mortgage rate'),
      S.tapPick(rates.map(v => [v, near(v, today) ? `${rateWords(v)} today` : rateWords(v)]), rateOther ? null : rates.find(v => near(v, T.rate)) ?? null, onRate, { label: 'Mortgage rate, 30-year fixed', key: 'g:lenderRate' }),
      S.pctInput(rateOther ? T.rate : null, onRate, { hint: 'Other', key: 'g:lenderRate:box' }),
      h('span.muted.small', {}, `30-year fixed. Today is Freddie Mac's weekly rate (${rateWords(today)})`)),
    h('div.preset-row', {}, h('span.label', {}, 'Taxes and insurance'),
      S.tapPick(shares.map(v => [v, `${Math.round(v * 100)}%`]), shareOther ? null : shares.find(v => near(v, T.share)) ?? null, onShare, { label: 'Taxes and insurance, share of the home payment', key: 'g:lenderTaxIns' }),
      S.pctInput(shareOther ? T.share : null, onShare, { hint: 'Other', key: 'g:lenderTaxIns:box' }),
      h('span.muted.small', {}, `Of the home payment. ${Math.round(share * 100)}% is a national share; NY property taxes run higher`)));
}
