// SPDX-License-Identifier: AGPL-3.0-only
// Standalone, off the seven steps: Money fire drills (Eli's "financial exposure therapy"). A money fear, run on your own
// numbers, then one small rep in real life. The drills are the plan's own (js/drills.js): this page asks only for the
// numbers each drill needs, shows a drill the moment its numbers are in, and never runs one on a typical stand-in.
// Cash, spending and pay are the whole plan's questions, so they carry in and out (docs/KIT.md).
import { boot, h, btn, chip, money, numBox, copyLink, foot } from './shell.js';
import { answer, onFile, planOf } from '../journey.js';
import { drillsOf } from '../drills.js';
import { lifeOf } from '../lifetime/inputs.js';
import { answeredOf } from '../math/agestart.js';
import { pack } from '../start/link.js';

const [priors, flags, hist] = await Promise.all(['priors-2026', 'flags', 'history-returns'].map(f => fetch(`data/${f}.json`).then(r => r.json())));
const $ = id => document.getElementById(id), AGES = [22, 25, 30, 35, 40, 50, 60];
// which answers each drill stands on; a drill shows only when all of them are the person's own
const NEEDS = { bill: ['cash'], job: ['cash', 'spending', 'income'], gap: ['cash', 'spending'], cut: ['income', 'spending'], crash: ['invested', 'income', 'spending'], miss: ['card'] };
const ASK = { cash: 'your cash', spending: 'your spending', income: 'your pay', invested: 'what you have invested (in the whole plan)', card: 'what you owe (in When am I debt free?)' };
function draw(api) {
  foot(); const step = $('step'); if (step) step.textContent = 'On its own';
  const now = new Date(), doc = () => api.store.doc, age = doc().profile?.birthYear != null ? now.getFullYear() - doc().profile.birthYear : null;
  const cashOn = onFile(doc(), 'cash'), cash = cashOn.checking == null && cashOn.savings == null ? null : (cashOn.checking ?? 0) + (cashOn.savings ?? 0);
  const spend = onFile(doc(), 'spending').gut ?? null, pay = onFile(doc(), 'income', { ref: api.ref }).takeHome ?? null;
  const done = api.mine().done || {}, tick = id => { api.remember({ done: { ...(api.mine().done || {}), [id]: !done[id] } }); api.render(); };
  // the drills, from whatever is on file this instant (so the list is right while a number is still being typed)
  const list = () => {
    if (doc().profile?.birthYear == null) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your drills show here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'Your age and one number, and the first one appears.'));
    const have = answeredOf(doc(), api.ref), plan = planOf(doc(), api.ref, priors, { flags, now });
    let life = null; if (have.invested && have.income && have.spending) { try { life = lifeOf(plan, doc(), api.ref, hist, {}); } catch { life = null; } }
    const all = drillsOf(plan, doc(), api.ref, priors, { life, now }), ready = all.filter(d => (NEEDS[d.id] || []).every(k => have[k]));
    const waiting = Object.entries(NEEDS).filter(([id]) => !ready.some(d => d.id === id) && (id !== 'gap' || all.some(d => d.id === 'gap')) && (id !== 'job' || !all.some(d => d.id === 'gap'))).map(([id, keys]) => ({ id, missing: keys.filter(k => !have[k]) })).filter(w => w.missing.length);
    if (!ready.length) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your drills show here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'One number above and the first one appears.'));
    const open = api.mine().drillOpen ?? ready.find(d => !done[`drill:${d.id}`])?.id ?? ready[0].id;
    const card = d => h(`details.st-card.st-level.st-drill${done[`drill:${d.id}`] ? '.done' : ''}`, { open: open === d.id ? true : null, onToggle: e => { if (e.target.open && api.mine().drillOpen !== d.id) api.remember({ drillOpen: d.id }); } },
      h('summary.st-levelhead', {}, h('span.st-lvl', {}, done[`drill:${d.id}`] ? '✓' : '!'), h('div', {}, h('div.st-soft.st-small', {}, d.fear), h('h2', { style: { margin: 0 } }, d.headline)), d.calm ? h('span.st-tag.yours', {}, 'Covered') : null),
      h('div', { style: { marginTop: '10px' } }, d.lines.map(l => h('p', { style: { margin: '0 0 6px' } }, l))),
      h('details.st-fold', {}, h('summary', {}, 'What actually happens'), h('ol.st-steps', {}, d.happens.map(x => h('li', {}, x)))),
      h('div.st-do', {}, h('div.st-eyebrow', {}, d.rep.minutes ? `Your rep, ${d.rep.minutes} minutes` : 'Your rep'), h('div', {}, d.rep.text),
        h('div', { style: { marginTop: '8px' } }, h('button.st-btn.slim', { type: 'button', 'aria-pressed': done[`drill:${d.id}`] ? 'true' : 'false', class: done[`drill:${d.id}`] ? 'primary' : '', onClick: () => tick(`drill:${d.id}`) }, done[`drill:${d.id}`] ? '✓ Done' : 'I did it'))));
    const FEAR = { bill: 'A surprise bill', job: 'Losing the job', cut: 'A pay cut', crash: 'A market crash', miss: 'A missed card payment' };
    return h('div', { id: 'answer', 'aria-live': 'polite' },
      h('p.st-small', { style: { margin: '0 4px 8px', fontWeight: 700 } }, `${ready.length} ${ready.length === 1 ? 'drill' : 'drills'} on your numbers. ${ready.filter(d => done[`drill:${d.id}`]).length} done.`),
      ready.map(card),
      waiting.length ? h('div.st-card', {}, h('h2', { style: { marginTop: 0, fontSize: '1rem' } }, 'More drills open with more numbers'), h('ul.st-list', {}, waiting.filter(w => FEAR[w.id]).map(w => h('li', {}, h('span.dot', {}, ''), h('span', {}, FEAR[w.id], h('small', {}, `Needs ${w.missing.map(k => ASK[k]).join(' and ')}`)), h('span.when', {}, ''))))) : null);
  };
  let cards = list();
  const redraw = () => { const fresh = list(); cards.replaceWith(fresh); cards = fresh; };
  const pulse = () => { const boxes = [...inputs.querySelectorAll('.st-box .in')], has = boxes.map(x => x.querySelector('input').value !== ''), aged = doc().profile?.birthYear != null;
    $('ages')?.classList.toggle('st-pulse', !aged); boxes.forEach((x, i) => x.classList.toggle('st-pulse', aged && !has[i] && has.slice(0, i).every(Boolean))); };
  const set = key => (v, typing) => {
    if (key === 'cash') { const t = cash || 0, c = cashOn.checking ?? 0; answer(api.store, 'cash', v == null ? { checking: 0, savings: 0 } : t > 0 ? { checking: Math.round(v * c / t), savings: v - Math.round(v * c / t) } : { checking: 0, savings: v }); }
    else if (key === 'spending') answer(api.store, 'spending', { gut: v ?? 0 });
    else answer(api.store, 'income', { takeHome: v ?? 0 });
    if (!typing) return api.render(); api.save(); redraw(); pulse(); };
  const inputs = h('div.st-card', { onFocusout: e => { const t = e.relatedTarget, main = $('main'); if (!t || t === main || !main.contains(t)) setTimeout(() => api.render(), 0); } }, h('h2', { style: { marginTop: 0 } }, 'Your numbers'),
    age != null ? h('p.st-small.st-soft', { style: { marginTop: 0 } }, `Your age, ${age}, is from your plan.`)
      : h('div.st-field', {}, h('div.st-flabel', {}, 'Your age, about'), h('div.st-chips', { id: 'ages' }, AGES.map(a => chip(String(a), false, () => { api.store.setDoc('profile', { birthYear: now.getFullYear() - a }); api.render(); })))),
    numBox('Cash you could reach this week (checking and savings)', cash, [500, 1000, 2500, 5000, 10000], set('cash'), { id: 'cash', help: 'This alone opens the surprise bill drill.' }),
    numBox('What you spend in a month, all in', spend, [2000, 3000, 4000, 5000, 6500], set('spending'), { id: 'spend' }),
    numBox('Take-home pay a month', pay, [2500, 3500, 4500, 6000, 8000], set('income'), { id: 'pay', help: 'With spending, this opens the lost job and pay cut drills.' }));
  const carry = h('div.st-card', { id: 'carry' }, h('h2', { style: { marginTop: 0 } }, 'Take it with you'), h('p.st-small', {}, 'Your link keeps these numbers and which reps you did. The whole plan has more drills and the skills that go with them.'),
    h('div.st-row', {}, copyLink(api), btn('All the steps', async () => { location.href = `one.html#/d/${await pack(api.store.doc)}`; }, 'slim')));
  $('main').replaceChildren(...[
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Money fire drills'), h('h1', {}, 'What if it goes wrong?'), h('p', { style: { marginBottom: 0 } }, 'Pick the thing you are afraid of and run it on your own numbers. Then one small rep in real life, so it stops being a fog.')),
    inputs, cards, carry].filter(Boolean));
  pulse();
}
boot('drills', draw);
