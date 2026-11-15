// SPDX-License-Identifier: AGPL-3.0-only
// The template for a standalone tool (docs/KIT.md). Copy to js/solo/<name>.js. As written it is the smallest whole
// tool: one number in (what you spend in a month, the plan's own answer), one answer out (what a year of it comes to).
import { boot, h, chip, money, numBox, stepLine, carryCard, foot } from './shell.js';
import { answer, onFile } from '../journey.js';

// CHANGE: the math. It belongs in js/math (or js/solo.js) with a test and a second-engine check; it is here only so
// the template runs on its own. A page never works a number out.
export const yearOf = ({ spending, trim = 0 }) => (spending > 0 ? { ready: true, year: spending * (1 - trim) * 12 } : { ready: false });
const TRIMS = [0, 0.1, 0.2];

function draw(api) {
  stepLine(api); foot();
  const spending = onFile(api.store.doc, 'spending').gut ?? null, trim = api.mine().templateTrim ?? 0;
  const answerCard = () => {
    const R = yearOf({ spending, trim });
    if (!R.ready) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'One number above and it appears. Rough is fine.'));
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your answer'),
      h('div.st-soft', {}, 'A year of it comes to'), h('div.st-big', {}, money(Math.round(R.year))),
      h('p', { style: { fontWeight: 700 } }, `${money(spending)} a month${trim ? `, trimmed ${Math.round(trim * 100)}%,` : ''} for twelve months.`),
      h('div.st-field', {}, h('div.st-flabel', {}, 'If you trimmed it'), h('div.st-chips', {}, TRIMS.map(v => chip(v ? `${Math.round(v * 100)}% less` : 'No trim', trim === v, () => { api.remember({ templateTrim: v }); api.render(); })))),
      h('details.st-fold', {}, h('summary', {}, 'How this is worked out'), h('p.st-small', {}, 'Your monthly number, less the trim, times twelve. Whose idea the tool is goes here too.')));
  };
  const card = answerCard(), carry = carryCard(api, { ready: spending > 0 });
  // while typing only the headline moves; the card redraws when the box is left
  const set = (v, typing) => { answer(api.store, 'spending', { gut: v }); if (!typing) return api.render(); api.save(); const big = card.querySelector('.st-big'), R = yearOf({ spending: v, trim }); if (big && R.ready) big.textContent = money(Math.round(R.year)); else if (!big && R.ready) { card.className = 'st-card hero'; card.replaceChildren(h('div.st-eyebrow', {}, 'Your answer'), h('div.st-soft', {}, 'A year of it comes to'), h('div.st-big', {}, money(Math.round(R.year)))); } carry.setReady(R.ready); };
  const inputs = h('div.st-card', { onFocusout: e => { const t = e.relatedTarget, main = document.getElementById('main'); if (!t || t === main || !main.contains(t)) setTimeout(() => api.render(), 0); } }, h('h2', { style: { marginTop: 0 } }, 'One number'),
    numBox('What you spend in a month, all in', spending, [2000, 3000, 4000, 5000, 6500], set, { id: 'spend', help: 'Everything. A rough number is enough.' }));
  document.getElementById('main').replaceChildren(...[
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, api.me.title), h('p', { style: { marginBottom: 0 } }, 'One sentence on why looking at this is worth a minute.')),
    inputs, card, carry].filter(Boolean));
  if (!(spending > 0)) inputs.querySelector('.st-box .in')?.classList.add('st-pulse');
}
// CHANGE: this tool's id in SOLO (js/solo.js)
boot('runway', draw);
