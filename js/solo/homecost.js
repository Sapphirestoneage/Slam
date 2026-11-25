// SPDX-License-Identifier: AGPL-3.0-only
// Home buying and renting on home.html (run of Nov 25 2026, Part 2): the bank's payment first, then the true cost of
// owning line by line, the true cost of renting, the year owning comes out ahead, and two rules of thumb beside it.
// Formatting only: js/math/homebuy.js works every number out, and the game's simulator "Rent or buy" calls the same
// functions (game/core/homebuy.js is its copy). The answers are kept with the page's other answers (settings.start).
import { h, chip, money, numBox } from './shell.js';
import { HB_OPTS, HB_LINES, HB_ASSUME, HB_SOURCES, HB_RULES, hbRun, hbBreakeven, hbBreakevenWords, hbPriceToRent, hbFivePercent, hbLevel, hbMath, hbCompareMath } from '../math/homebuy.js';

const KEYS = ['price', 'downPct', 'ratePct', 'years', 'taxPct', 'insYear', 'pmiPct', 'hoa', 'maintPct', 'repairsYear', 'rent', 'rentIns', 'rentGrowthPct', 'homeGrowthPct', 'closingPct', 'sellingPct', 'retPct'];
const k = key => `home_${key}`;
const big = v => money(Math.round(v));
const LEVEL_TIP = { Guess: 'Some lines are not counted yet, or the numbers are a best guess. It will move as they firm up.', Close: 'From a listing or a quote.', Exact: 'From your own bills.' };
const tag = level => (level ? h(`span.st-tag${level === 'Guess' ? '' : '.yours'}`, { title: LEVEL_TIP[level] }, level) : null);
const SHOW = { taxPct: v => `${v}%`, pmiPct: v => `${v}%`, maintPct: v => `${v}%`, rentGrowthPct: v => `${v}%`, homeGrowthPct: v => `${v}%`, closingPct: v => `${v}%`, sellingPct: v => `${v}%`, retPct: v => `${v}%`, downPct: v => `${v}%`, ratePct: v => `${v}%`, years: v => `${v} years` };
const show = (key, v) => (SHOW[key] ? SHOW[key](v) : money(v));
const open = new Set(); // which folds are open, kept while the page is redrawn

export function homeCostCards(api) {
  const mem = api.mine(), x = Object.fromEntries(KEYS.map(key => [key, mem[k(key)] ?? null]));
  if (x.years == null) x.years = 30;
  const source = mem[k('source')] ?? null;
  const set = (key, v) => { api.remember({ [k(key)]: v }); api.render(); };
  const picks = (key, label, note) => h('div.st-field', {}, h('div.st-flabel', {}, label),
    h('div.st-chips', { role: 'group', 'aria-label': label }, HB_OPTS[key].map(v => chip(show(key, v), x[key] === v, () => set(key, x[key] === v && key !== 'years' ? null : v)))),
    note ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, note) : null);
  const fold = (id, summary, ...body) => h('details.st-fold', { open: open.has(id), onToggle: e => { if (e.target.open) open.add(id); else open.delete(id); } }, h('summary', {}, summary), ...body);
  const math = (id, lines) => fold(id, 'Show the math', lines.map(t => h('p.st-small', {}, t)));
  const rows = list => h('ul.st-list', {}, list.filter(Boolean).map(([label, small, value]) => h('li', {}, h('span.dot', {}, ''), h('span', {}, label, small ? h('small', {}, small) : null), h('span.when', {}, value))));

  // The result cards are drawn again while a number is typed; the boxes are not.
  const results = (over = {}) => {
    const X = { ...x, ...over }, R = hbRun({ ...X, stay: HB_RULES.maxYears });
    if (!R) return h('div', { id: 'hb-results' }, h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, 'The payment shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'Pick a price, a down payment and a rate above.')));
    const f = R.first, level = hbLevel(R, source), not = key => (R.open.includes(key) ? 'Not counted yet' : null);
    const line = (key, name, v) => [name, not(key), R.open.includes(key) ? 'Tap yours' : `${big(v)} a month`];
    const bank = h('div.st-card.hero', { id: 'hb-bank', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'What the bank shows'), h('div.st-soft', {}, 'Principal and interest only'),
      h('div.st-big', {}, `${big(R.pmt)} a month`),
      h('p', { style: { fontWeight: 700 } }, `A loan of ${big(R.loan)} after ${big(R.down)} down. This is the number a bank's payment calculator gives. Owning costs more than this.`),
      math('m-bank', hbMath(R, X).slice(0, 2)));
    const openNames = R.open.map(key => HB_LINES.find(l => l.key === key)?.name).filter(Boolean);
    const own = h('div.st-card', { id: 'hb-own' }, h('div.st-row', { style: { justifyContent: 'space-between' } }, h('h2', { style: { margin: 0 } }, 'The true cost of owning'), tag(level)),
      h('div.st-big', {}, `${big(f.total)} a month`), h('p.st-soft', {}, openNames.length ? `In the first month, on the lines counted so far. Not counted yet: ${openNames.join(', ')}.` : 'In the first month, every line counted.'),
      rows([['Principal and interest', 'what the bank shows', `${big(f.pi)} a month`], line('taxPct', 'Property tax', f.tax), line('insYear', 'Home insurance', f.ins),
        R.under20 ? ['PMI', not('pmiPct') ?? (R.pmiMonths ? `paid for ${R.pmiYears} ${R.pmiYears === 1 ? 'year' : 'years'}, until the loan is 80% of the price` : null), R.open.includes('pmiPct') ? 'Tap yours' : `${big(f.pmi)} a month`] : null,
        line('hoa', 'HOA', f.hoa), line('maintPct', 'Maintenance', f.maint), line('repairsYear', 'Big repairs, spread out', f.repairs)]),
      math('m-own', hbMath(R, X)));
    const cards = [bank, own];
    if (R.compare) {
      const fr = R.firstRent, B = hbBreakeven(X), words = hbBreakevenWords(B), P = hbPriceToRent(X.price, X.rent), F = hbFivePercent(X.price, X.rent);
      const y = n => R.byYear.find(r => r.year === n);
      cards.push(h('div.st-card', { id: 'hb-rent' }, h('div.st-row', { style: { justifyContent: 'space-between' } }, h('h2', { style: { margin: 0 } }, 'The true cost of renting'), tag(level)),
        h('div.st-big', {}, `${big(fr.total)} a month`),
        rows([['Rent', null, `${big(fr.rent)} a month`], ['Renter\'s insurance', not('rentIns'), R.open.includes('rentIns') ? 'Tap yours' : `${big(fr.ins)} a month`],
          X.rentGrowthPct == null ? ['In 10 years', 'Pick a rent growth below', 'Tap yours'] : ['In 10 years', `growing ${X.rentGrowthPct}% a year`, `${big(y(10).rentMonth)} a month`]])));
      const names = (B?.needs || []).map(key => HB_ASSUME.find(a => a.key === key).name.toLowerCase());
      cards.push(h('div.st-card', { id: 'hb-even' }, h('div.st-row', { style: { justifyContent: 'space-between' } }, h('h2', { style: { margin: 0 } }, 'When owning comes out ahead'), words ? tag(hbLevel(R, source, { future: true })) : null),
        words ? h('p', { style: { fontWeight: 700, fontSize: '1.15rem' } }, words) : h('p.st-soft', {}, `The year shows once you pick what you assume below: ${names.join(', ')}.`),
        words && R.open.length ? h('p.st-small.st-soft', {}, 'This is on the cost lines counted so far. Each line you add moves the year later.') : null,
        rows([['Price-to-rent ratio', 'the price over a year of rent; a number to compare places with', P == null ? '' : P.toFixed(1)],
          ['The 5% rule', F.rentLess ? 'the rent is under this line: by this rule, renting costs less' : 'the rent is at or over this line: by this rule, owning costs less', `${big(F.line)} a month`]]),
        words ? fold('f-years', 'Year by year', h('div.hb-scroll', {}, h('table.hb-years', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Year'), h('th', {}, 'Owning, paid so far'), h('th', {}, 'Renting, paid so far'), h('th', {}, 'Owning is ahead by'))),
          h('tbody', {}, [1, 2, 3, 5, 7, 10, 15, 20, 30].map(y).filter(Boolean).map(r => h('tr', {}, h('th', { scope: 'row' }, String(r.year)), h('td', {}, big(r.ownOut)), h('td', {}, big(r.rentOut)), h('td', {}, r.ahead >= 0 ? big(r.ahead) : `-${big(-r.ahead)}`)))))),
          h('p.st-small.st-soft', {}, 'Ahead by: what the owner would have after selling that year, next to what the renter would have. A minus means renting is ahead that year.')) : null,
        words ? math('m-even', hbCompareMath(X)) : null,
        fold('f-rules', 'Whose rules of thumb these are', h('p.st-small', {}, 'The 5% rule is taught by Ben Felix: the costs of owning that never come back (property tax, maintenance, the cost of the money tied up) are about 5% of the home\'s value a year. Divide by 12 and compare with the rent for a place like it.'),
          h('p.st-small', {}, 'The price-to-rent ratio is the price divided by one year of rent. Use it to compare places. Neither one knows your numbers; the year above does.'))));
    }
    return h('div', { id: 'hb-results' }, cards);
  };
  let res = results();
  const typed = key => (v, typing) => { if (!typing) return set(key, v); api.remember({ [k(key)]: v }); api.save(); const fresh = results({ [key]: v }); res.replaceWith(fresh); res = fresh; };
  const under20 = x.downPct != null && x.downPct < 20;
  const ownCount = HB_LINES.filter(l => l.side === 'own' && !(l.onlyUnder20 && !under20));
  const loan = h('div.st-card', { id: 'hb-loan' }, h('div.st-eyebrow', {}, 'Buying or renting'), h('h2', { style: { marginTop: 0 } }, 'What would this home really cost?'),
    h('p.st-soft', {}, 'The bank shows one payment. Owning has six more lines. Start with three taps.'),
    numBox('The price of the home', x.price, HB_OPTS.price, typed('price'), { id: 'hb_price' }),
    picks('downPct', 'Down payment'), picks('ratePct', 'Mortgage rate', 'Your own number: a lender\'s quote shows it.'), picks('years', 'Years of the loan'));
  const costs = h('div.st-card', { id: 'hb-costs' }, h('h2', { style: { marginTop: 0 } }, 'Your own costs of owning'),
    h('p.st-soft', {}, 'These differ from home to home, so nothing is filled in for you. A line counts once you tap it.'),
    fold('f-costs', `The six lines (${ownCount.filter(l => x[l.key] != null).length} of ${ownCount.length} picked)`,
      picks('taxPct', 'Property tax, % of the home\'s value a year', 'Your number: the listing or the county\'s site shows it.'),
      numBox('Home insurance a year', x.insYear, HB_OPTS.insYear, typed('insYear'), { id: 'hb_ins', help: 'Your number: an insurer\'s quote shows it.' }),
      under20 ? picks('pmiPct', 'PMI, % of the loan a year', 'Your number: the lender\'s loan estimate shows it. It is charged when the down payment is under 20%.') : null,
      numBox('HOA a month', x.hoa, HB_OPTS.hoa, typed('hoa'), { id: 'hb_hoa', help: 'Your number: the listing shows it. $0 when there is none.' }),
      picks('maintPct', 'Maintenance, % of the home\'s value a year', 'Typical: 1 to 2% a year.'),
      numBox('Big repairs, set aside a year', x.repairsYear, HB_OPTS.repairsYear, typed('repairsYear'), { id: 'hb_repairs', help: 'Your number: a roof, a furnace, windows. The cost divided by the years it lasts.' })),
    h('div.st-field', {}, h('div.st-flabel', {}, 'Where are these numbers from?'), h('div.st-chips', { role: 'group', 'aria-label': 'Where are these numbers from?' }, HB_SOURCES.map(([v, label]) => chip(label, source === v, () => set('source', source === v ? null : v))))));
  const rent = h('div.st-card', { id: 'hb-renting' }, h('h2', { style: { marginTop: 0 } }, 'Renting a place like it'),
    numBox('Rent a month', x.rent, HB_OPTS.rent, typed('rent'), { id: 'hb_rent' }),
    fold('f-rent', `Renter's insurance and what you assume about the years ahead (${[x.rentIns, ...HB_ASSUME.map(a => x[a.key])].filter(v => v != null).length} of ${HB_ASSUME.length + 1} picked)`,
      picks('rentIns', 'Renter\'s insurance a month', 'Your number: your policy shows it.'),
      HB_ASSUME.map(a => picks(a.key, a.name, a.typical ? `${a.typical}.` : 'Your own pick. Nobody knows this one ahead of time.'))));
  return [loan, costs, rent, res];
}
