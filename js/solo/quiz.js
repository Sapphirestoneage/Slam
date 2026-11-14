// SPDX-License-Identifier: AGPL-3.0-only
// Standalone: the money personality quick ten. One statement at a time, five taps wide. The result is five scales, not a
// type, and it sets what the whole plan shows first. A second person can answer from a link and the two are compared.
import { boot, h, btn, chip, stepLine, carryCard, foot } from './shell.js';
import { pack } from '../start/link.js';
import { ITEMS, SCALE, quizOf, pairOf } from '../quiz.js';
import { MIRRORS } from '../mirror.js';

const $ = id => document.getElementById(id);
const bars = (scores, other = null) => h('div.st-quizbars', {}, scores.map(s => h('div.st-quizbar', {}, h('span.st-quizname', {}, h('strong', {}, s.name), h('small', {}, s.word)),
  h('span.st-quiztrack', { role: 'img', 'aria-label': `${s.name}: ${s.score} of 100${other ? `, theirs ${other.find(o => o.id === s.id).score}` : ''}` }, h('b', { style: { width: `${Math.max(3, s.score)}%` } }), other ? h('i', { style: { left: `${other.find(o => o.id === s.id).score}%` } }) : null), h('span.st-quiznum', {}, String(s.score)))));

function draw(api) {
  stepLine(api); foot();
  const m = api.mine(), answers = m.quiz || {}, Q = quizOf(answers), other = m.quizOther || null;
  const set = (id, v) => { const a = { ...answers, [id]: v }, q = quizOf(a); api.remember({ quiz: a, ...(q.ready && q.done === q.of && !m.mirrorPicked ? { mirror: q.mirror } : {}) }); api.render(); };
  const at = m.quizAt && ITEMS.some(i => i.id === m.quizAt) ? m.quizAt : Q.next, item = ITEMS.find(i => i.id === at), n = ITEMS.findIndex(i => i.id === at);
  const asking = item && Q.done < Q.of || (item && m.quizAt);
  const ask = () => h('div.st-card', {}, h('div.st-eyebrow', {}, `${n + 1} of ${ITEMS.length}`), h('div.st-pips', { 'aria-hidden': 'true' }, ITEMS.map(i => h(`i${answers[i.id] ? '.on' : ''}${i.id === at ? '.now' : ''}`))),
    h('h2.st-quizq', {}, item.text), h('div.st-quizscale.st-pulse', { role: 'group', 'aria-label': 'How much is this you?' }, SCALE.map(([v, l]) => chip(l, answers[item.id] === v, () => { api.remember({ quizAt: null }); set(item.id, v); }))),
    h('div.st-row', { style: { marginTop: '12px' } }, n > 0 ? btn('‹ Back one', () => { api.remember({ quizAt: ITEMS[n - 1].id }); api.render(); }, 'slim') : null));
  const P = other && Q.ready ? pairOf(answers, other) : null;
  const result = () => h('div.st-card.hero', { id: 'answer' }, h('div.st-eyebrow', {}, 'Your five money muscles'), h('h2', { style: { margin: '0 0 6px' } }, Q.words),
    h('p.st-small', {}, 'These are muscles, built by what life asked of you. None is a type and none is fixed.'), bars(Q.scores, P ? quizOf(other).scores : null),
    P ? h('p.st-readout', { role: 'status' }, `The mark on each bar is the other person. You are closest on ${P.closest.name} and furthest apart on ${P.widest.name}. A gap is cover, not a problem: between you, ${P.covered.length ? `${P.covered.join(', ')} ${P.covered.length === 1 ? 'is' : 'are'} strong` : 'no one muscle is strong yet'}${P.open.length ? `, and ${P.open.join(', ')} ${P.open.length === 1 ? 'is' : 'are'} the one to build together` : ''}.`) : null,
    h('ul.st-list', { style: { marginTop: '10px' } }, h('li', {}, h('span.dot', {}, '✓'), h('span', {}, `Strongest: ${Q.top.name}`, h('small', {}, Q.top.strong)), h('span.when', {}, String(Q.top.score))),
      Q.even ? null : h('li', {}, h('span.dot', {}, ''), h('span', {}, `Least practiced: ${Q.low.name}`, h('small', {}, Q.low.thin)), h('span.when', {}, String(Q.low.score)))),
    h('div.st-field', {}, h('div.st-flabel', {}, 'So your plan will show this first'), h('div.st-chips', {}, MIRRORS.map(x => chip(x.label, (m.mirror ?? Q.mirror) === x.id, () => { api.remember({ mirror: x.id, mirrorPicked: true }); api.render(); })))),
    h('div.st-row', { style: { marginTop: '10px' } }, btn('Change my answers', () => { api.remember({ quizAt: ITEMS[0].id }); api.render(); }, 'slim'),
      btn('Send it to my person to compare', async e => { const mine = api.store.doc.settings.start, theirs = JSON.parse(JSON.stringify(api.store.doc)); theirs.settings = { ...theirs.settings, start: { quizOther: mine.quiz } }; theirs.records = [];
        const url = `${location.origin}${location.pathname}#/d/${await pack(theirs)}`; try { await navigator.clipboard.writeText(url); $('sent').textContent = 'Link copied. When they finish, their page shows the two of you side by side.'; } catch { $('sent').replaceChildren(h('input', { readonly: '', value: url, 'aria-label': 'Link for your person', style: { width: '100%' }, onFocus: ev => ev.target.select() })); } }, 'slim')),
    h('p.st-small', { id: 'sent', role: 'status', style: { margin: '6px 0 0' } }, ''));
  $('main').replaceChildren(
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, api.me.title), h('p', { style: { marginBottom: 0 } }, other && !Q.ready ? 'Someone sent you this to compare. Ten taps, answered as yourself. Go with your first reaction.' : 'Ten statements, one tap each. Go with your first reaction: there are no right answers.')),
    asking ? ask() : null, Q.ready && !asking ? result() : null,
    carryCard(api, { ready: true, pulse: Q.ready && !asking }));
}
boot('quiz', draw);
