// SPDX-License-Identifier: AGPL-3.0-only
// Standalone: the Money Chart. One statement at a time, five taps wide, at three depths (10, 25, 100) that nest, so
// going deeper never re-asks. The result is five scales, not a type, and it sets what the whole plan shows first.
// For two: send a link, each answers as themselves and can guess the other, and the page shows both side by side.
import { boot, h, btn, chip, stepLine, carryCard, foot } from './shell.js';
import { pack } from '../start/link.js';
import { SCALE, DEPTHS, itemsFor, quizOf, pairOf, perceptionOf } from '../quiz.js';
import { MIRRORS } from '../mirror.js';

const $ = id => document.getElementById(id);
const bars = (scores, other = null) => h('div.st-quizbars', {}, scores.map(s => h('div.st-quizbar', {}, h('span.st-quizname', {}, h('strong', {}, s.name), h('small', {}, s.word)),
  h('span.st-quiztrack', { role: 'img', 'aria-label': `${s.name}: ${s.score} of 100${other ? `, theirs ${other.find(o => o.id === s.id).score}` : ''}` }, h('b', { style: { width: `${Math.max(3, s.score)}%` } }), other ? h('i', { style: { left: `${other.find(o => o.id === s.id).score}%` } }) : null), h('span.st-quiznum', {}, String(s.score)))));

function draw(api) {
  stepLine(api); foot();
  const m = api.mine(), depth = m.quizDepth ?? 'ten', guessing = !!m.quizGuessing, key = guessing ? 'quizGuess' : 'quiz';
  const answers = m[key] || {}, items = itemsFor(guessing ? 'ten' : depth), Q = quizOf(m.quiz || {}, depth), G = quizOf(answers, guessing ? 'ten' : depth), other = m.quizOther || null;
  const set = (id, v) => { const a = { ...answers, [id]: v }, q = quizOf(guessing ? (m.quiz || {}) : a, depth); const last = !items.some(i => !(a[i.id] >= 1));
    api.remember({ [key]: a, quizAt: null, ...(guessing && last ? { quizGuessing: false } : {}), ...(!guessing && q.ready && q.complete && !m.mirrorPicked ? { mirror: q.mirror } : {}) }); api.render(); };
  const at = m.quizAt && items.some(i => i.id === m.quizAt) ? m.quizAt : G.next, item = items.find(i => i.id === at), n = items.findIndex(i => i.id === at);
  const asking = !!item && (G.done < items.length || !!m.quizAt);
  const ask = () => h('div.st-card', {}, h('div.st-eyebrow', {}, guessing ? `As your person would answer: ${n + 1} of ${items.length}` : `${n + 1} of ${items.length}`),
    items.length <= 25 ? h('div.st-pips', { 'aria-hidden': 'true' }, items.map(i => h(`i${answers[i.id] ? '.on' : ''}${i.id === at ? '.now' : ''}`))) : h('div.st-collapse', { 'aria-hidden': 'true' }, h('b', { style: { width: `${G.done / items.length * 100}%` } })),
    h('h2.st-quizq', {}, item.text), h('div.st-quizscale.st-pulse', { role: 'group', 'aria-label': 'How much do you agree?' }, SCALE.map(([v, l]) => chip(l, answers[item.id] === v, () => set(item.id, v)))),
    h('div.st-row', { style: { marginTop: '12px' } }, n > 0 ? btn('‹ Back one', () => { api.remember({ quizAt: items[n - 1].id }); api.render(); }, 'slim') : null,
      guessing ? btn('Stop guessing', () => { api.remember({ quizGuessing: false, quizAt: null }); api.render(); }, 'slim') : Q.ready && Q.done >= 10 ? btn('See my chart now', () => { api.remember({ quizAt: null, quizDepth: Q.done >= 25 ? 'std' : 'ten' }); api.render(); }, 'slim') : null));
  const P = other && Q.ready ? pairOf(m.quiz, other) : null, theirRead = m.quizOtherGuess && Q.ready ? perceptionOf(m.quizOtherGuess, m.quiz) : null;
  const kindWords = { cover: 'one of you has it covered', doubled: 'you both lean hard here, a shared habit to watch', open: 'neither of you leans here, the one to build together', alike: 'you sit close together' };
  const result = () => h('div.st-card.hero', { id: 'answer' }, h('div.st-eyebrow', {}, 'Your money chart'), h('h2', { style: { margin: '0 0 6px' } }, Q.words),
    h('p.st-small', {}, 'These are muscles, built by what life asked of you. None is a type and none is fixed. Often the one that carried you here is the one in the way next.'), bars(Q.scores, P ? quizOf(other).scores : null),
    h('ul.st-list', { style: { marginTop: '10px' } },
      h('li', {}, h('span.dot', {}, '☉'), h('span', {}, `Sun: ${Q.sun.name}`, h('small', {}, 'Your strongest single trait: the move you make by reflex.')), h('span.when', {}, String(Q.sun.score))),
      Q.moon ? h('li', {}, h('span.dot', {}, '☽'), h('span', {}, `Moon: ${Q.moon.name}`, h('small', {}, 'Your strongest feeling trait: what runs underneath.')), h('span.when', {}, String(Q.moon.score))) : null,
      Q.rising ? h('li', {}, h('span.dot', {}, '↑'), h('span', {}, `Rising: ${Q.rising.name}`, h('small', {}, 'What other people see in how you spend, earn and give.')), h('span.when', {}, String(Q.rising.score))) : null,
      h('li', {}, h('span.dot', {}, ''), h('span', {}, `Most worked: ${Q.top.name}`, h('small', {}, Q.top.high)), h('span.when', {}, String(Q.top.score))),
      Q.even ? null : h('li', {}, h('span.dot', {}, ''), h('span', {}, `Least practiced: ${Q.low.name}`, h('small', {}, Q.low.low)), h('span.when', {}, String(Q.low.score)))),
    P ? h('div.st-readout', { role: 'status' }, h('strong', {}, 'The two of you'), h('div', {}, 'The mark on each bar is your person.'), h('ul', { style: { margin: '6px 0 0', paddingLeft: '18px' } }, P.rows.map(r => h('li', {}, `${r.name}: ${kindWords[r.kind]} (${r.mine} and ${r.theirs}).`)))) : null,
    theirRead ? h('p.st-readout', { role: 'status' }, `How well they read you: off by about ${theirRead.average} points a muscle. ${theirRead.close.length ? `Closest on ${theirRead.close.join(', ')}. ` : ''}Furthest on ${theirRead.miss.name}: they guessed ${theirRead.miss.guessed}, you are ${theirRead.miss.actual}.`) : null,
    h('div.st-field', {}, h('div.st-flabel', {}, Q.done < 100 ? 'Go deeper (nothing is asked twice)' : 'Depth'), h('div.st-chips', {}, DEPTHS.map(([id, l, count]) => chip(Q.done >= count ? `${l} ✓` : l, depth === id, () => { api.remember({ quizDepth: id, quizAt: null }); api.render(); })))),
    h('div.st-field', {}, h('div.st-flabel', {}, 'So your plan will show this first'), h('div.st-chips', {}, MIRRORS.map(x => chip(x.label, (m.mirror ?? Q.mirror) === x.id, () => { api.remember({ mirror: x.id, mirrorPicked: true }); api.render(); })))),
    h('div.st-field', {}, h('div.st-flabel', {}, 'For two'), h('div.st-row', {},
      btn(m.quizGuess && Object.keys(m.quizGuess).length >= 10 ? 'Guess my person again' : 'Guess how my person would answer (10)', () => { api.remember({ quizGuessing: true, quizGuess: {}, quizAt: null }); api.render(); }, 'slim'),
      btn('Copy a link for my person', async () => { const mine = api.store.doc.settings.start, theirs = JSON.parse(JSON.stringify(api.store.doc)); theirs.settings = { ...theirs.settings, start: { quizOther: mine.quiz, ...(mine.quizGuess && Object.keys(mine.quizGuess).length >= 10 ? { quizOtherGuess: mine.quizGuess } : {}) } }; theirs.records = [];
        const url = `${location.origin}${location.pathname}#/d/${await pack(theirs)}`; try { await navigator.clipboard.writeText(url); $('sent').textContent = 'Link copied. When they finish, their page shows the two of you side by side, and how well you read them.'; } catch { $('sent').replaceChildren(h('input', { readonly: '', value: url, 'aria-label': 'Link for your person', style: { width: '100%' }, onFocus: ev => ev.target.select() })); } }, 'slim')),
      h('p.st-small', { id: 'sent', role: 'status', style: { margin: '6px 0 0' } }, m.quizGuess && Object.keys(m.quizGuess).length >= 10 ? 'Your guess rides along in the link, so they see how well you read them.' : '')),
    h('div.st-row', { style: { marginTop: '10px' } }, btn('Change my answers', () => { api.remember({ quizAt: items[0].id }); api.render(); }, 'slim')));
  $('main').replaceChildren(
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, api.me.title), h('p', { style: { marginBottom: 0 } }, guessing ? 'Now the same ten, answered the way you think your person would. It is a guess: that is the point.' : other && !Q.ready ? 'Someone sent you this to compare. Ten taps, answered as yourself. Go with your gut.' : 'One statement at a time. Go with your gut: there are no right answers, and nobody sees this but you.')),
    asking ? ask() : null, Q.ready && !asking ? result() : null,
    carryCard(api, { ready: true, pulse: Q.ready && !asking }));
}
boot('quiz', draw);
