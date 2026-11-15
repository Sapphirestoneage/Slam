// SPDX-License-Identifier: AGPL-3.0-only
// The card plan, an addendum to the household plan: "Is this card right for me?" One input and one answer. Spending is
// the Budget's lines, the cards held are the Credit cards list (with their Use it taps and opening months), heavy debt
// is the debts, the score is the Profile's. js/cardplan.js reads them and works out the answer; this page only shows
// it, and Net worth > Credit cards shows the same sentence from the same call. Taps here write back to the plan: a
// credit's Use it and a card's opening month go on the card's own row; what the plan has no place for (programs you
// would use, what a point is worth, other cards opened) is kept with the journey's choices.
import { boot, h, money, btn, chip, foot, copyLink } from './shell.js';
import { pack } from '../start/link.js';
import { carryUrl } from '../solo.js';
import { cardPlanOf, addHeldCard } from '../cardplan.js';
import { issuerName } from '../math/cards.js';
import { RULES } from '../registry/assumptions.js';
import * as P from '../math/cardplan.js';

const $ = id => document.getElementById(id);
const SCORES = [['fair', 'Under 670'], ['good', '670 to 739'], ['excellent', '740 or more']];
const LEVEL = { fits: 'Fits', maybe: 'Maybe', later: 'Later' };
const UI = { open: {}, year: {}, all: false, bank: null, adding: null }; // what is unfolded on this visit: not part of the plan
let lib = null, off = null, tools = null;

const monthSay = s => P.monthWords(Number(s.slice(0, 4)) * 12 + Number(s.slice(5, 7)) - 1);
const question = (label, kids, tag = null) => h('div.cp-q', {}, h('div.st-flabel', {}, label, tag ? [' ', h('span.st-tag', {}, tag)] : null), h('div.st-chips', {}, kids));
const tags = (label, list, cls = '') => h('div.cp-tags', {}, h('span.cp-lab', {}, label), list.map(t => h(`span.st-tag${cls}`, {}, t)));
const from = words => h('span.st-tag.yours', {}, words);
const withId = (id, el) => { el.id = id; return el; };

function draw(api) {
  if (!lib || !off || !tools) return;
  const doc = api.store.doc, now = new Date(), R = cardPlanOf(doc, api.ref, lib, off, { now });
  const cp = () => api.mine().cardPlan || {};
  const mine = patch => { api.remember({ cardPlan: { ...cp(), ...patch } }); api.render(); };
  const onRow = (row, patch) => { api.store.update(row.id, patch); api.render(); };
  const redraw = () => api.render();
  const cardOf = id => lib.cards.find(c => c.id === id) ?? null;
  const fold = (id, summary, body, { amt = null } = {}) => {
    const d = h('details.cp-fold', { id }, h('summary', {}, h('span', {}, summary), amt ? h('span.cp-amt', {}, amt) : h('span'), h('span.cp-see', {}, 'See')), h('div.cp-body', {}, typeof body === 'function' ? (UI.open[id] ? body() : null) : body));
    d.open = !!UI.open[id];
    d.addEventListener('toggle', () => { const was = !!UI.open[id]; UI.open[id] = d.open; if (!d.open || was) return;
      const seen = id.startsWith('move-') ? 'move' : id === 'plain-fold' ? 'plain' : null;
      if (seen && !cp().seen?.[seen]) mine({ seen: { ...cp().seen, [seen]: true } }); else if (typeof body === 'function') redraw(); });
    return d;
  };
  // two taps for a month: the year, then the month
  const monthPick = (id, onPick) => { const y = now.getFullYear(), year = UI.year[id] ?? null;
    return h('div.cp-small', {}, h('div.st-chips', {}, [y - 2, y - 1, y].map(v => chip(String(v), year === v, () => { UI.year[id] = v; redraw(); }))),
      year ? h('div.st-chips', { style: { marginTop: '6px' } }, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => chip(m, false, () => { delete UI.year[id]; onPick(`${year}-${String(i + 1).padStart(2, '0')}`); }))) : null); };
  // a credit's Use it tap: on the card's own row when the card is held, with the journey's choices when it is only being weighed
  const creditTaps = (id, label) => { const card = cardOf(id), held = R.held.find(x => x.card.id === id), uses = R.useOf(id);
    if (!card?.credits?.some(c => c.value > 0)) return null;
    const flip = c => { const next = { ...uses, [c.id]: uses[c.id] === 'Use' ? null : 'Use' }; if (held) onRow(held.row, { cardUse: next }); else mine({ uses: { ...cp().uses, [id]: next } }); };
    return question(label, card.credits.filter(c => c.value > 0).map(c => chip(`${c.name}, ${money(c.value)}`, uses[c.id] === 'Use', () => flip(c)))); };

  const next = () => {
    const spendKnown = R.inputs.spend.monthly != null;
    const row = m => {
      const o = m.offer, id = o.cardId ?? o.name, card = o.cardId ? cardOf(o.cardId) : null;
      const fit = P.cardFit(o, { ...R.me, opened: R.slots.used, monthlySpend: R.inputs.spend.monthly }, { ...R.opts, held: R.held.map(x => x.card.id), creditsUsed: R.creditsUsedOf(id) });
      const OU = P.opensAndUses(card, o, { unlockIds: off.unlocksTransfers, benefitKinds: lib.benefitKinds, rule: off.rules.chase524 });
      const value = P.offerValue(o, { ...R.opts, held: R.held.map(x => x.card.id) }), used = R.creditsUsedOf(id), yearly = Math.max(0, (o.annualFee ?? 0) - used);
      const offerWords = o.bonus.words ?? `${o.bonus.amount.toLocaleString('en-US')} ${off.units[o.bonus.unit].name}`;
      return fold(`move-${id.replace(/\W+/g, '-')}`, [o.name, ' ', h('span.st-tag', {}, LEVEL[fit.level])], [
        h('p', { style: { margin: 0 } }, `${offerWords}${o.spend ? `, after ${money(o.spend)} on the card in ${o.months} months` : ''}. `, h('span.st-small.st-soft', {}, `From review sites, read ${monthSay(off.asOf)}.${o.conflict ? ` ${o.conflict}.` : ''}${o.ends ? ` Listed as ending ${monthSay(o.ends)}.` : ''}`)),
        OU.opens.length ? tags('Opens', OU.opens) : null, tags('Uses', OU.uses, '.uses'),
        h('ul.st-small', { style: { margin: 0, paddingLeft: '18px' } }, fit.reasons.map(t => h('li', {}, t))),
        creditTaps(id, 'Credits you would use anyway'),
        yearly > 0 ? h('p.st-small', { style: { margin: 0 } }, `${used > 0 ? 'After those credits it' : 'It'} costs ${money(yearly)} a year. A cost you keep paying adds ${money(Math.round(P.costAsFiNumber(yearly, R.wr)))} to the amount you need to stop working.`) : (o.annualFee > 0 ? h('p.st-small', { style: { margin: 0 } }, 'The credits you would use cover the fee.') : null),
        value > 0 ? h('p.st-small', { style: { margin: 0 } }, `Invest the ${money(Math.round(value))} and leave it 30 years: about ${money(Math.round(P.investedLater(value, 30, R.rr)))} in today's dollars.`) : null,
        h('p.st-small', { style: { margin: 0 } }, `After this: ${m.slotsAfter} ${m.slotsAfter === 1 ? 'slot' : 'slots'} left.`),
        m.then.length ? [h('div.cp-lab', {}, 'Then you could'), h('ul.cp-then', {}, m.then.slice(0, 3).map(t => h('li', {}, h('span', {}, `${t.offer.name}${spendKnown ? `, from month ${t.startsMonth}` : ''}`), h('b.cp-amt', {}, `${money(Math.round(t.both))} for both`))),
          h('li', {}, h('span', {}, 'Or stop here and keep your slots'), h('b.cp-amt', {}, money(Math.round(m.net)))))] : null,
      ], { amt: money(Math.round(m.net)) });
    };
    const more = R.moves.length > 3 && !UI.all, rule = off.rules.chase524, G = R.guide, hidden = cp().guideOff === true;
    return h('div.st-card.hero', { id: 'next', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your next card move'), h('p', { id: 'answer', style: { fontWeight: 800, fontSize: '1.15rem', margin: '4px 0 6px' } }, R.line), h('p.cp-why', {}, R.why),
      hidden ? h('div.st-row.cp-guide', {}, btn('Show my next step', () => mine({ guideOff: null }), 'slim'))
        : h('div.st-nextbar.cp-guide', { id: 'guide' }, h('span.st-count', {}, G.count), G.next ? btn(`${G.line} ›`, () => goNext(), 'primary') : h('span', {}, G.line), G.next ? btn('Hide', () => mine({ guideOff: true }), 'slim') : null),
      h('p.st-small', { style: { marginTop: '10px' } }, `${R.slots.left} of ${rule.slots} Chase slots open${R.slots.frees && R.slots.left < rule.slots ? `. The next one comes back in ${R.slots.frees}` : ''}. Welcome offers are loaded for Chase so far. Amounts are the offer less the first-year fee.`),
      (more ? R.moves.slice(0, 3) : R.moves).map(row),
      more ? h('div.st-row', { style: { marginTop: '10px' } }, btn(`Show all ${R.moves.length} moves`, () => { UI.all = true; redraw(); }, 'slim')) : null);
  };

  const built = () => {
    const I = R.inputs, heldNames = R.held.map(x => x.label);
    const line = (label, value, src) => [h('dt', {}, label), h('dd', {}, value, src ? [' ', src] : null)];
    return h('div.st-card', { id: 'built' }, h('h2', { style: { marginTop: 0 } }, 'What this is built on'), h('p.st-small.st-soft', {}, 'These come from your plan. Change them there and this page follows.'),
      h('dl.st-kv', {},
        line('Everyday spending', I.spend.fromBudget ? `${money(Math.round(I.spend.monthly))} a month` : 'No everyday lines yet', I.spend.fromBudget ? from('From your Budget') : h('span.st-tag', {}, 'Typical amounts used')),
        line('Cards you hold', heldNames.length ? heldNames.join(', ') : R.unpicked.length ? `${R.unpicked.length} not matched to a card yet` : 'None listed', from('From Credit cards')),
        line('Debt at 8% or more', I.heavy ? 'Yes' : 'No', I.heavyListed || !I.carryTap ? from('From your debts') : h('span.st-tag', {}, 'You said you carry a card balance')),
        line('Credit score', I.score.fromProfile ? String(I.score.number) : I.score.band ? SCORES.find(s => s[0] === I.score.band)?.[1] ?? 'None yet' : 'Not in your plan', I.score.fromProfile ? from('From your Profile') : null),
        line('Growth and withdrawal', `${+(R.rr * 100).toFixed(1)}% and ${+(R.wr * 100).toFixed(1)}%`, from('From your plan'))),
      h('div.st-row', { style: { marginTop: '12px' } }, btn('Change these in my plan', async () => { location.href = carryUrl('plan', await pack(api.store.doc)); }, 'slim')),
      I.carryTap ? h('div.st-row', { style: { marginTop: '8px' } }, btn('I no longer carry a card balance', () => mine({ carry: null }), 'slim'), btn('Add the balance to my plan', async () => { location.href = carryUrl('debt', await pack(api.store.doc)); }, 'slim')) : null,
      I.spend.fromBudget ? null : withId('q-spend', question('Until the Budget has them: what you put on cards in a month', [500, 1000, 2000, 4000].map(v => chip(v === 4000 ? '$4,000 or more' : `About ${money(v)}`, I.spendTap === v, () => mine({ spend: I.spendTap === v ? null : v }))))),
      I.score.fromProfile ? null : withId('q-score', question('Until your score is in the plan', SCORES.map(([v, l]) => chip(l, cp().score === v, () => mine({ score: cp().score === v ? null : v }))))),
      h('div', { style: { marginTop: '14px' } }, fold('tune', 'Fine-tune: business cards, point value, airline and hotel points, other cards', [
      question('A business or side income?', [chip('Yes', I.business === true, () => mine({ business: I.business === true ? null : true })), chip('No', I.business === false, () => mine({ business: I.business === false ? null : false }))]),
      question('What a Chase point is worth to you', [[null, 'Cash, 1 cent'], [0.0125, '1.25 cents'], [0.015, '1.5 cents'], [0.02, '2 cents']].map(([v, l]) => chip(l, I.tv === v, () => mine({ tv: v })))),
      question('Airline and hotel points you would really use', Object.entries(off.units).filter(([k, u]) => k !== 'cash' && !u.transferable).map(([k, u]) => chip(u.name, I.programs.includes(k), () => mine({ programs: I.programs.includes(k) ? I.programs.filter(v => v !== k) : [...I.programs, k] })))),
      h('div.st-small.st-soft', {}, 'Their cards stay out of your moves until you tap one. Miles you would not use are worth nothing to you.'),
      h('div.cp-q', {}, h('div.st-flabel', {}, 'Other cards opened in the last two years that are not on your list'),
        I.openedOther.length ? h('div.st-chips', {}, I.openedOther.map((d, i) => h('button.st-chip.cp-chipx', { type: 'button', title: 'Remove this one', 'aria-label': `Remove the card opened ${monthSay(d)}`, onClick: () => mine({ opened: I.openedOther.filter((_, j) => j !== i) }) }, `${monthSay(d)} ×`))) : null,
        h('div.st-small.st-soft', {}, 'A card you closed, or one at a bank you do not track. Tap the year, then the month.'),
        monthPick('other', d => mine({ opened: [...I.openedOther, d].sort() })))])));
  };

  const held = () => h('div.st-card', { id: 'held' }, h('h2', { style: { marginTop: 0 } }, 'Cards you hold'), h('p.st-small.st-soft', {}, 'From your Credit cards list. Each one gets a yearly check: did it earn its fee?'),
    R.held.map(x => fold(`held-${x.row.id}`, x.label, [
      h('p', { style: { margin: 0, fontWeight: 700 } }, x.year.line), x.year.option ? h('p.st-small', { style: { margin: 0 } }, x.year.option) : null,
      creditTaps(x.card.id, 'Credits you really use'),
      x.check.fee ? h('p.st-small.st-soft', { style: { margin: 0 } }, `Counts ${money(Math.round(x.check.rewards?.value ?? 0))} in rewards on your everyday spending plus the credits tapped. The same taps show on Credit cards in your plan.`) : null,
      h('div.cp-q', {}, h('div.st-flabel', {}, x.opened ? `Opened ${monthSay(x.opened)}` : 'When did you open it? (for the dates and the 5 card limit)'),
        x.opened ? h('div.st-row', {}, btn('Change the month', () => onRow(x.row, { opened: null }), 'slim')) : monthPick(`held-${x.row.id}`, d => onRow(x.row, { opened: d })),
        x.opened ? null : h('div.st-chips.cp-small', { style: { marginTop: '6px' } }, chip('Older than two years', R.monthsOld[x.row.id] === true, () => mine({ old: { ...R.monthsOld, [x.row.id]: R.monthsOld[x.row.id] ? null : true } })))),
      h('div.st-row', {}, btn('Take this card off my plan', () => { api.store.remove([x.row.id]); api.render(); }, 'slim')),
    ], { amt: x.check.fee ? `${money(x.check.fee)} a year` : 'No fee' })),
    R.unpicked.length ? h('p.st-small', { style: { marginBottom: 0 } }, `${R.unpicked.map(r => r.name || 'A card').join(', ')}: on your list but not matched to a card yet. Pick which card it is on Credit cards in your plan and it joins this page.`) : null,
    !R.held.length && !R.unpicked.length ? h('div.cp-q', {}, h('p.st-small.st-soft', { style: { margin: 0 } }, 'No cards on your plan yet. Add the ones you hold below, or say you have none.'), h('div.st-chips', {}, chip('I hold no cards', cp().noCards === true, () => mine({ noCards: cp().noCards ? null : true })))) : null,
    addCard());

  // add a card you hold: a bank, the card, then one question. It becomes a row on your plan's Credit cards list.
  const addCard = () => {
    const banks = [...new Set(lib.cards.map(issuerName))].filter(Boolean).sort(), have = new Set(R.held.map(x => x.card.id));
    const picking = UI.adding ? cardOf(UI.adding) : null;
    const done = inFull => { addHeldCard(api.store, picking, { inFull }); UI.adding = null; UI.bank = null; if (!inFull) mine({ carry: true }); else api.render(); };
    return h('div.cp-q', { id: 'add-card', style: { marginTop: '12px' } }, h('div.st-flabel', {}, 'Add a card you hold'),
      picking ? [h('p', { style: { margin: '0 0 6px', fontWeight: 700 } }, `${issuerName(picking)} ${picking.name}: do you pay it in full each month?`),
        h('div.st-chips', {}, chip('Yes, in full', false, () => done(true)), chip('No, I carry a balance', false, () => done(false)), chip('Not this card', false, () => { UI.adding = null; redraw(); }))]
        : [h('div.st-chips.cp-small', {}, banks.map(n => chip(n, UI.bank === n, () => { UI.bank = UI.bank === n ? null : n; redraw(); }))),
          UI.bank ? h('div.st-chips.cp-small', { style: { marginTop: '8px' } }, (list => (list.length ? list.map(c => chip(c.name, false, () => { UI.adding = c.id; redraw(); })) : h('span.st-small.st-soft', {}, 'Every card listed for this bank is already on your plan.')))(lib.cards.filter(c => issuerName(c) === UI.bank && !have.has(c.id)))) : h('div.st-small.st-soft', {}, 'Tap the bank, then the card. It goes on your plan\'s Credit cards list.')]);
  };

  const dates = () => h('div.st-card', { id: 'dates' }, h('h2', { style: { marginTop: 0 } }, 'Dates to know'),
    R.dates.length ? h('ul.cp-dates', {}, R.dates.slice(0, 8).map(d => h('li', {}, h('b', {}, d.when), h('span', {}, `${d.text}.`))))
      : h('p.st-small.st-soft', { style: { marginBottom: 0 } }, 'Once a card you hold has its opening month, its offer deadline, fee date and the month it stops counting show here.'));

  const plain = () => {
    const sy = R.inputs.spend.byCat, body = () => {
      const { flat, list } = R.setups(), best = [...list].sort((a, b) => b.value - a.value)[0], simple = best ? list.find(r => best.value - r.value < R.small) ?? best : null;
      const rows = [{ label: `One plain ${Math.round(RULES.plainCardRate * 100)}% card`, value: flat }, ...list.map(r => ({ label: `Best ${r.size} ${r.size === 1 ? 'card' : 'cards'}`, value: r.value, names: r.cards.map(c => c.name).join(' + ') }))];
      const max = Math.max(1, ...rows.map(r => r.value));
      return [h('p.st-small', { style: { margin: 0 } }, R.inputs.spend.fromBudget ? from('From your Budget') : h('span.st-tag', {}, 'Typical amounts'), ' ', Object.entries(sy).map(([k, v]) => `${lib.categories[k]?.label ?? k} ${money(Math.round(v / 12))}`).join(', '), ' a month.',
        R.inputs.spend.fromBudget ? '' : ' Put these lines in your Budget and this uses your own numbers.'),
        h('div.cp-bars', { role: 'img', 'aria-label': rows.map(r => `${r.label}: ${money(Math.round(r.value))} a year`).join('. ') }, rows.map(r => h('div.cp-barrow', { title: r.names ?? r.label }, h('span', {}, r.label), h('div.cp-track', {}, h('b', { style: { width: `${Math.max(0, r.value) / max * 100}%` } })), h('b.cp-amt', {}, `${money(Math.round(r.value))} a year`)))),
        simple ? h('p', { id: 'plain-line', style: { margin: 0, fontWeight: 700 } }, simple.gain < R.small ? `The best setup pays about ${money(Math.max(0, Math.round(best.gain)))} a year more than one plain card. That is small enough that one simple card is a fine answer.` : `${simple.cards.map(c => c.name).join(' + ')} pays about ${money(Math.round(simple.gain))} a year more than one plain card.`) : null,
        simple && simple.gain >= R.small && simple.size > 1 ? h('dl.st-kv', {}, Object.keys(sy).map(k => [h('dt', {}, lib.categories[k]?.label ?? k), h('dd', {}, simple.use[k])])) : null,
        h('p.st-small.st-soft', { style: { margin: 0 } }, 'Rewards a year on this spending, less each fee after the credits tapped. Welcome offers are left out. Points count at their cash value, and rotating categories are not counted.')];
    };
    return h('div.st-card', { id: 'plain' }, h('h2', { style: { marginTop: 0 } }, 'Does any setup beat one plain card?'), fold('plain-fold', 'Check it against my spending', body));
  };

  const pairs = () => { const jobs = [...new Set(tools.tools.map(t => t.job))];
    return h('div.st-card', { id: 'pairs' }, h('h2', { style: { marginTop: 0 } }, 'Tools that pair with this'),
      fold('pairs-fold', 'Seven apps for the daily jobs this page does not do', [
        h('p.st-small.st-soft', { style: { margin: 0 } }, `This page plans. These handle the day to day. No one pays to be listed and the order means nothing. Read ${monthSay(tools.asOf)}.`),
        jobs.map(j => h('div', {}, h('div.cp-lab', {}, j), h('ul.st-small', { style: { margin: '4px 0 0', paddingLeft: '18px' } }, tools.tools.filter(t => t.job === j).map(t => h('li', {}, h('strong', {}, t.name), `: ${t.does} ${t.tradeoff}`))))),
      ])); };

  // The next step: where it lives on the page. The thing to tap pulses; while it is out of view the button in the top
  // bar pulses instead, so there is always exactly one pulse, and it moves on after every tap.
  const targetOf = () => { const n = R.guide.next?.id; if (!n) return null;
    if (n === 'cards') return $('add-card')?.querySelector('.st-chips');
    if (n === 'spend') return $('q-spend')?.querySelector('.st-chips');
    if (n === 'score') return $('q-score')?.querySelector('.st-chips');
    if (n === 'months') { const x = R.held.find(hd => !hd.opened && !R.monthsOld[hd.row.id]), d = x ? $(`held-${x.row.id}`) : null; return d ? (d.open ? d.querySelector('.cp-small .st-chips') : d.querySelector('summary')) : null; }
    if (n === 'move') return $('next')?.querySelector('details.cp-fold > summary');
    return $('plain-fold')?.querySelector('summary'); };
  goNext = () => { const t = targetOf(); if (!t) return; t.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); if (t.tagName === 'SUMMARY') t.focus({ preventScroll: true }); };

  const y = window.scrollY;
  $('main').replaceChildren(
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Part of your plan'), h('h1', {}, 'Is this card right for me?'), h('p', { style: { marginBottom: 0 } }, 'Your next move, the move after it, and what each card opens and uses, worked out from your own plan. It will also tell you when the answer is no card at all.')),
    next(), built(), held(), dates(), plain(), pairs(),
    h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, 'These answers are saved in your plan, so the link carries them.'),
      h('div.st-row', {}, copyLink(api), btn('All the steps', async () => { location.href = `one.html#/d/${await pack(api.store.doc)}`; }, 'slim'))));
  foot();
  window.scrollTo(0, y);
  const go = $('go'), target = cp().guideOff === true ? null : targetOf();
  watch?.disconnect(); watch = null;
  go.hidden = !target; go.classList.remove('st-pulse');
  if (target) {
    go.textContent = `${R.guide.count} ›`; go.title = R.guide.line; go.setAttribute('aria-label', `${R.guide.count}: ${R.guide.line}. Take me there`); go.onclick = () => goNext();
    target.classList.add('st-pulse');
    if (typeof IntersectionObserver === 'function') { watch = new IntersectionObserver(([e]) => go.classList.toggle('st-pulse', !e.isIntersecting), { threshold: 0.6 }); watch.observe(target); }
  }
}
let watch = null, goNext = () => {};
const json = r => r.json();
let API = null;
Promise.all([fetch('data/library/cards.json').then(json), fetch('data/library/card-offers.json').then(json), fetch('data/library/card-tools.json').then(json)])
  .then(([a, b, c]) => { lib = a; off = b; tools = c; if (API) API.render(); })
  .catch(() => $('main').replaceChildren(h('div.st-card', {}, h('h1', {}, 'Is this card right for me?'), h('p', {}, 'The card list did not load. Refresh the page to try again.'))));
boot('cards', draw).then(api => { API = api; if (lib && off && tools) api.render(); });
