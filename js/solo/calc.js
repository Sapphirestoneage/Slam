// SPDX-License-Identifier: AGPL-3.0-only
// One renderer for the small calculators (docs/KIT.md): the question, a few boxes with amounts to tap, the answer card
// (redrawn while typing; the boxes are not), what changes it, the fold, and the link to take away. A calculator is a
// spec: { title, why, fields, run(values, ref), answer(result, values), more(api) }. The math is in js/solo.js, with tests.
// A field with `unit` is a count, not money; one with `when` shows only for some answers. `picks` and `help` may be
// functions of the answers and the reference data (tuition.html: the dated childcare row of the state tapped).
// A field with `plan` reads and writes the plan's own answer (take-home, spending, invested), so nothing is typed twice.
// A private spec (the hard moments, js/solo/hard.js) keeps nothing until the person turns on Keep this (boot's private
// mode); its `keep(api)` card stands in for the link card, `first(api)` cards come before the boxes, and a spec with no
// boxes or no run shows only its own cards.
import { boot, h, btn, chip, money, numBox, copyLink, foot } from './shell.js';
import { answer, onFile } from '../journey.js';

const $ = id => document.getElementById(id);
const PLAN = { takeHome: ['income', 'takeHome'], spending: ['spending', 'gut'], invested: ['invested', 'invested'] };
export function calcPage(id, spec) {
  function draw(api) {
    foot(); const step = $('step'); if (step) step.textContent = 'On its own';
    const key = k => `${id}_${k}`, mem = () => api.mine();
    const get = f => (f.plan ? onFile(api.store.doc, PLAN[f.plan][0], { ref: api.ref })[PLAN[f.plan][1]] ?? null : mem()[key(f.key)] ?? f.start ?? null);
    const put = (f, v) => { if (f.plan) answer(api.store, PLAN[f.plan][0], { [PLAN[f.plan][1]]: v }); else api.remember({ [key(f.key)]: v }); };
    const values = (over = {}) => ({ ...Object.fromEntries(spec.fields.map(f => [f.key, get(f)])), ...Object.fromEntries((spec.picks || []).map(p => [p.key, mem()[key(p.key)] ?? p.start])), ...over });
    const answerCard = (over = {}) => {
      if (!spec.run) return null;
      const V = values(over), R = spec.run(V, api.ref);
      if (!R.ready) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your answer shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, spec.waiting ?? 'Fill in the boxes above and it appears. Rough numbers are fine.'));
      const A = spec.answer(R, V);
      if (!A) return null;
      return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Your answer'), h('div.st-soft', {}, A.lead), h('div.st-big', {}, A.big), h('p', { style: { fontWeight: 700 } }, A.line),
        (spec.picks || []).map(p => h('div.st-field', {}, h('div.st-flabel', {}, p.label), h('div.st-chips', {}, p.options.map(([label, v]) => chip(label, V[p.key] === v, () => { api.remember({ [key(p.key)]: v }); api.render(); }))))),
        A.rows?.length ? h('ul.st-list', {}, A.rows.map(([label, small, value]) => h('li', {}, h('span.dot', {}, ''), h('span', {}, label, small ? h('small', {}, small) : null), h('span.when', {}, value)))) : null,
        A.small ? h('p.st-small.st-soft', {}, A.small) : null,
        (A.fold || []).map(([summary, ...paras]) => h('details.st-fold', {}, h('summary', {}, summary), paras.map(p => h('p.st-small', {}, p)))));
    };
    const shown = () => { const V = values(); return spec.fields.filter(f => !f.when || f.when(V)); }; // when: a field that only shows for some answers (roommates: the third room)
    let card = answerCard();
    const set = f => (v, typing) => { put(f, v); if (!typing) return api.render(); api.save(); const fresh = answerCard({ [f.key]: v }); if (card && fresh) { card.replaceWith(fresh); card = fresh; } spec.typed?.(api); };
    const field = f => (f.options
      ? h('div.st-field', {}, h('div.st-flabel', {}, f.label), h('div.st-chips', {}, f.options.map(([label, v]) => chip(label, get(f) === v, () => { put(f, v); api.render(); }))), f.help ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, f.help) : null)
      : numBox(f.label, get(f), typeof f.picks === 'function' ? f.picks(values(), api.ref) : f.picks, set(f), { id: `f_${f.key}`, help: typeof f.help === 'function' ? f.help(values(), api.ref) : f.help, unit: f.unit }));
    const inputs = !spec.fields.length ? null : h('div.st-card', { onFocusout: e => { const t = e.relatedTarget, main = $('main'); if (!t || t === main || !main.contains(t)) setTimeout(() => api.render(), 0); } },
      h('h2', { style: { marginTop: 0 } }, spec.boxes ?? (spec.fields.length === 1 ? 'One number' : 'A few numbers')), shown().map(field));
    const carry = spec.keep ? spec.keep(api) : h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, 'Your link keeps this answer.'),
      h('div.st-row', {}, copyLink(api), btn('All the steps', async () => { location.href = `one.html#/d/${await api.packed()}`; }, 'slim')));
    $('main').replaceChildren(h('div.st-card.hero', {}, h('div.st-eyebrow', {}, spec.eyebrow ?? 'One thing, done right'), h('h1', {}, spec.title), h('p', { style: { marginBottom: 0 } }, spec.why)), ...(spec.first ? spec.first(api) : []), ...[inputs, card].filter(Boolean), ...(spec.more ? spec.more(api) : []), carry); // more: a page's own cards after the answer (home.html: buying and renting)
    spec.drawn?.(api);
    const empty = inputs && shown().find(f => !f.options && !f.optional && get(f) == null);
    if (empty) inputs.querySelector(`#f_${empty.key}`)?.closest('.in')?.classList.add('st-pulse');
  }
  return boot(id, draw, { private: !!spec.private });
}
