// SPDX-License-Identifier: AGPL-3.0-only
// Standalone: "How long would my money last?" Two numbers in, one answer out: the months your cash covers if the pay
// stopped, and what stretches them. The two numbers are the whole plan's questions 2 and 3, so they carry straight in.
import { boot, h, btn, chip, money, numBox, stepLine, carryCard, foot, gameWords } from './shell.js';
import { answer, onFile } from '../journey.js';
import { runwayOf, CUTS, STILL_IN } from '../solo.js';
import { HAPPENS } from '../extras.js';
import { cmFyou } from '../math/canonmath.js';

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
  // Part 15: Zombie mode, with game words on (the game's switch, or this page's own tap). One playful line and the days.
  const zombie = () => {
    const on = gameWords(api), R = runwayOf({ cash, spending, stillIn, cut });
    const seg = h('div.st-field', {}, h('div.st-flabel', {}, 'Game words'), h('div.st-chips', {}, [['Off', false], ['On', true]].map(([w, v]) => chip(w, on === v, () => { api.remember({ gamer: v }); api.render(); }))),
      h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'Starts the way Game words is set in SLAM the Game on this device.'));
    if (!on) return h('div.st-card', { id: 'zombie' }, seg);
    if (!R.ready) return h('div.st-card', { id: 'zombie' }, h('div.st-eyebrow', {}, 'Zombie mode'), h('p', { style: { margin: '0 0 8px' } }, 'Two numbers above and you find out how long you would last.'), seg);
    return h('div.st-card', { id: 'zombie' }, h('div.st-eyebrow', {}, 'Zombie mode'), h('h2', { style: { margin: '0 0 6px' } }, 'How long you\'d last'),
      h('div.st-big', {}, R.covered ? 'You outlast them' : `${R.days.toLocaleString('en-US')} ${R.days === 1 ? 'day' : 'days'}`),
      h('p', { style: { fontWeight: 700 } }, R.covered ? 'What still comes in covers what goes out. The zombies get bored and leave.' : `If the zombies shut every office in town tomorrow, your cash holds the fort for ${R.days.toLocaleString('en-US')} days. Each ${money(1000)} more adds about ${Math.round(R.perThousand)}.`),
      seg);
  };
  // Part 21: F-You money (JL Collins), the months you could walk away from a job: the cash above, plus what you could
  // sell without a penalty, at what life costs with the job gone (js/math/canonmath.js, one function with the game).
  const fyou = () => {
    const inv = m.soloFyInv ?? null, work = m.soloFyWork ?? null, health = m.soloFyHealth ?? null;
    const F = cmFyou({ reach: cash == null ? null : cash + (inv ?? 0), spending, workCosts: work, health });
    const pick = patch => { api.remember(patch); api.render(); };
    const row = (label, key, opts, cur, show) => h('div.st-field', {}, h('div.st-flabel', {}, label), h('div.st-chips', {}, opts.map(v => chip(show(v), cur === v, () => pick({ [key]: cur === v ? null : v })))));
    const mo = v => (v == null ? 'No end' : `${v < 10 ? v.toFixed(1) : Math.round(v)} months`);
    return h('div.st-card', { id: 'fyou' }, h('div.st-eyebrow', {}, 'F-You money'), h('h2', { style: { margin: '0 0 6px' } }, 'Months you could walk away from a job'),
      F.ready ? [h('div.st-big', {}, mo(F.months)), h('p', { style: { fontWeight: 700 } }, `${money(Math.round(F.reach))} you could reach, at ${money(Math.round(F.walk))} a month with the job gone.${F.next != null ? ` ${money(Math.round(Math.max(0, F.toNext)))} more reaches ${F.next} months.` : ''}`)]
        : h('p.st-soft', { style: { margin: '0 0 8px' } }, 'Two numbers above and the meter fills in.'),
      row('Investments you could sell without a penalty (a taxable account, Roth contributions)', 'soloFyInv', [0, 5000, 25000, 100000], inv, v => (v ? money(v) : 'None')),
      row('Work costs that stop with the job, a month (commute, lunches, clothes)', 'soloFyWork', [0, 100, 250, 500, 1000], work, v => (v ? money(v) : 'None')),
      row('Health cover on your own, a month', 'soloFyHealth', [0, 300, 600, 900, 1500], health, v => (v ? money(v) : 'Covered another way')),
      F.ready ? h('details.st-fold', {}, h('summary', {}, 'Show the math'), h('ol.st-steps', {},
        h('li', {}, `Cash ${money(Math.round(cash))}${inv ? ` + investments ${money(inv)}` : ''} = ${money(Math.round(F.reach))}`),
        h('li', {}, `A month: ${money(Math.round(spending))}${F.counted.workCosts ? ` - work costs ${money(work)}` : ''}${F.counted.health ? ` + health cover ${money(health)}` : ''} = ${money(Math.round(F.walk))}`),
        h('li', {}, F.months == null ? 'Nothing goes out, so it has no end.' : `${money(Math.round(F.reach))} / ${money(Math.round(F.walk))} = ${mo(F.months)}`),
        !F.counted.workCosts || !F.counted.health ? h('li', {}, 'A tap not given counts as nothing for now.') : null)) : null,
      h('p.st-small.st-soft', { style: { marginBottom: 0 } }, 'JL Collins, The Simple Path to Wealth, calls it F-You money: enough set aside that a job cannot hold you.'));
  };
  let card = result(), carry = null;
  const setNum = (key, v, typing) => { if (key === 'cash') { const t = cash || 0, c = cashNow.checking ?? 0; answer(api.store, 'cash', v == null ? { checking: 0, savings: 0 } : t > 0 ? { checking: Math.round(v * c / t), savings: v - Math.round(v * c / t) } : { checking: 0, savings: v }); } else answer(api.store, 'spending', { gut: v ?? 0 });
    if (typing) { const fresh = (() => { const c2 = onFile(api.store.doc, 'cash'), s2 = onFile(api.store.doc, 'spending'); return runwayOf({ cash: (c2.checking ?? 0) + (c2.savings ?? 0), spending: s2.gut ?? null, stillIn, cut }); })(); api.save(); soft(fresh); } else api.render(); };
  // while typing, only the headline moves; the full card redraws when the box is left
  const lasts = R => (R.covered ? 'It keeps going' : R.whole >= 1 ? `${R.whole} ${R.whole === 1 ? 'month' : 'months'}` : 'Under a month');
  // The answer has to appear the moment the second number is typed, with the keyboard still up (Krug walk, Nov 15
  // 2026: it stayed on "Your answer shows here" until a tap elsewhere). The headline goes in now; the rest when the box is left.
  const soft = R => { const big = card.querySelector('.st-big');
    if (big && R.ready) big.textContent = lasts(R);
    else if (!big && R.ready) { card.className = 'st-card hero'; card.replaceChildren(h('div.st-eyebrow', {}, 'Your answer'), h('div.st-soft', {}, R.covered ? 'What still comes in covers what goes out' : 'Your money lasts about'), h('div.st-big', {}, lasts(R))); }
    // the pulse moves on as soon as a box has a number, without waiting for the box to be left
    const boxes = [...inputs.querySelectorAll('.st-box .in')], has = boxes.map(x => x.querySelector('input').value !== '');
    boxes.forEach((x, i) => x.classList.toggle('st-pulse', !has[i] && has.slice(0, i).every(Boolean)));
    carry?.setReady(R.ready); };
  carry = carryCard(api, { ready: cash != null && spending > 0, pulse: cash != null && spending > 0 });
  const inputs = h('div.st-card', { onFocusout: e => { const t = e.relatedTarget, main = document.getElementById('main'); if (!t || t === main || !main.contains(t)) setTimeout(() => api.render(), 0); } }, h('h2', { style: { marginTop: 0 } }, 'Two numbers'),
    numBox('Cash you could reach this week (checking and savings)', cash, [1000, 2500, 5000, 10000, 20000], (v, typing) => setNum('cash', v, typing), { id: 'cash' }),
    numBox('What you spend in a month, all in', spending, [2000, 3000, 4000, 5000, 6500], (v, typing) => setNum('spending', v, typing), { id: 'spend', help: 'Rent, food, bills, fun: everything. A rough number is enough.' }));
  const keep = document.activeElement?.id;
  $('main').replaceChildren(...[
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, api.me.title), h('p', { style: { marginBottom: 0 } }, 'If the pay stopped tomorrow, how many months are covered? Looking at it once, calmly, is the whole exercise.')),
    inputs, card, zombie(), fyou(), carry].filter(Boolean));
  if (cash == null) inputs.querySelector('.st-box .in')?.classList.add('st-pulse'); else if (!(spending > 0)) inputs.querySelectorAll('.st-box .in')[1]?.classList.add('st-pulse');
  if (keep && document.activeElement?.id !== keep) { /* focus left with the redraw: that is fine, the box was left */ }
}
boot('runway', draw);
