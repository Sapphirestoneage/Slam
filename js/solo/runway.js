// SPDX-License-Identifier: AGPL-3.0-only
// Standalone: "How long would my money last?" Two numbers in, one answer out: the months your cash covers if the pay
// stopped, and what stretches them. The two numbers are the whole plan's questions 2 and 3, so they carry straight in.
import { boot, h, btn, chip, money, numBox, stepLine, carryCard, foot } from './shell.js';
import { answer, onFile } from '../journey.js';
import { runwayOf, CUTS, STILL_IN } from '../solo.js';
import { HAPPENS } from '../extras.js';

const $ = id => document.getElementById(id);
function draw(api) {
  stepLine(api); foot();
  const m = api.mine(), cashNow = onFile(api.store.doc, 'cash'), spendNow = onFile(api.store.doc, 'spending');
  const cash = cashNow.checking == null && cashNow.savings == null ? null : (cashNow.checking ?? 0) + (cashNow.savings ?? 0), spending = spendNow.gut ?? null;
  const stillIn = m.soloStillIn ?? 0, cut = m.soloCut ?? 0;
  const result = () => {
    const R = runwayOf({ cash, spending, stillIn, cut });
    if (!R.ready) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'Two numbers above and it appears. Rough is fine.'));
    const pick = patch => { api.remember(patch); api.render(); };
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your answer'),
      R.covered ? [h('div.st-big', {}, 'It keeps going'), h('p', { style: { fontWeight: 700 } }, `What still comes in covers the ${money(Math.round(R.out))} going out, so your cash is not drawn down.`)]
        : [h('div.st-soft', {}, 'Your money lasts about'), h('div.st-big', {}, R.whole >= 1 ? `${R.whole} ${R.whole === 1 ? 'month' : 'months'}` : 'Under a month'), h('p', { style: { fontWeight: 700 } }, `${R.whole >= 1 ? `Covered through ${R.date}. ` : ''}${money(Math.round(R.gap))} a month comes out of ${money(Math.round(R.cash))}. Each $1,000 more in cash buys about ${Math.round(R.perThousand)} days.`)],
      h('div.st-field', {}, h('div.st-flabel', {}, 'Money that would still come in each month (unemployment, a partner, side work)'), h('div.st-chips', {}, STILL_IN.map(v => chip(v ? money(v) : 'None', stillIn === v, () => pick({ soloStillIn: v }))))),
      h('div.st-field', {}, h('div.st-flabel', {}, 'If you trimmed spending while it lasted'), h('div.st-chips', {}, CUTS.map(v => chip(v ? `${Math.round(v * 100)}% less` : 'No trim', cut === v, () => pick({ soloCut: v }))))),
      !R.covered && cut > 0 && R.extraMonths > 0.05 ? h('p.st-readout', { role: 'status' }, `Trimming ${Math.round(cut * 100)}% (${money(Math.round(spending * cut))} a month) stretches it by about ${R.extraMonths >= 1 ? `${R.extraMonths.toFixed(1)} months` : `${Math.round(R.extraMonths * 30)} days`}.`) : null,
      h('details.st-fold', {}, h('summary', {}, 'What actually happens when a job ends'), h('ol.st-steps', {}, HAPPENS.find(x => x.id === 'lostJob').steps.map(t => h('li', {}, t)))));
  };
  let card = result(), carry = null;
  const setNum = (key, v, typing) => { if (key === 'cash') { const t = cash || 0, c = cashNow.checking ?? 0; answer(api.store, 'cash', v == null ? { checking: 0, savings: 0 } : t > 0 ? { checking: Math.round(v * c / t), savings: v - Math.round(v * c / t) } : { checking: 0, savings: v }); } else answer(api.store, 'spending', { gut: v ?? 0 });
    if (typing) { const fresh = (() => { const c2 = onFile(api.store.doc, 'cash'), s2 = onFile(api.store.doc, 'spending'); return runwayOf({ cash: (c2.checking ?? 0) + (c2.savings ?? 0), spending: s2.gut ?? null, stillIn, cut }); })(); api.save(); soft(fresh); } else api.render(); };
  // while typing, only the headline moves; the full card redraws when the box is left
  const soft = R => { const big = card.querySelector('.st-big'); if (big && R.ready && !R.covered) big.textContent = R.whole >= 1 ? `${R.whole} ${R.whole === 1 ? 'month' : 'months'}` : 'Under a month'; carry?.setReady(R.ready); };
  carry = carryCard(api, { ready: cash != null && spending > 0, pulse: cash != null && spending > 0 });
  const inputs = h('div.st-card', { onFocusout: e => { const t = e.relatedTarget, main = document.getElementById('main'); if (!t || t === main || !main.contains(t)) setTimeout(() => api.render(), 0); } }, h('h2', { style: { marginTop: 0 } }, 'Two numbers'),
    numBox('Cash you could reach this week (checking and savings)', cash, [1000, 2500, 5000, 10000, 20000], (v, typing) => setNum('cash', v, typing), { id: 'cash' }),
    numBox('What you spend in a month, all in', spending, [2000, 3000, 4000, 5000, 6500], (v, typing) => setNum('spending', v, typing), { id: 'spend', help: 'Rent, food, bills, fun: everything. A rough number is enough.' }));
  const keep = document.activeElement?.id;
  $('main').replaceChildren(
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, api.me.title), h('p', { style: { marginBottom: 0 } }, 'If the pay stopped tomorrow, how many months are covered? Looking at it once, calmly, is the whole exercise.')),
    inputs, card, carry);
  if (cash == null) inputs.querySelector('.st-box .in')?.classList.add('st-pulse'); else if (!(spending > 0)) inputs.querySelectorAll('.st-box .in')[1]?.classList.add('st-pulse');
  if (keep && document.activeElement?.id !== keep) { /* focus left with the redraw: that is fine, the box was left */ }
}
boot('runway', draw);
