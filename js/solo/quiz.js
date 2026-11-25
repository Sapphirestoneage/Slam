// SPDX-License-Identifier: AGPL-3.0-only
// Standalone: the Money Chart. One statement at a time, five taps wide, at three depths (10, 25, 100) that nest, so
// going deeper never re-asks. The result is five scales, not a type, and it sets what the whole plan shows first.
// For two or more: send a link, each answers as themselves, and the page shows everyone so far side by side. The link
// each person passes on carries everyone before them, so a third and a fourth person join the same picture.
import { boot, h, btn, chip, stepLine, carryCard, foot } from './shell.js';
import { pack } from '../start/link.js';
import { DEPTHS, MONEY_CHART, itemsFor, quizOf, groupOf, perceptionOf } from '../quiz.js';
import { carryUrl } from '../solo.js';
import { qzFlow, qzLast } from '../math/quizcore.js';
import { SKINS, skinOf } from '../quiz/skins/index.js';
import { lensOf, lensPatch, lensNow, elementNow, SHOWN, sinsReadNow, sinsReadOf, sinsKeyOf, SN_KEYS } from '../quiz/store.js';
import { sinsResultCard, sinsShareOf, sinsRetakeCard, sinsGrowthPart, sinsCouplePart } from '../quiz/result.js';
import { adultsOf } from '../registry/couples.js';
import { sinsDataOf } from '../quiz/sinsdata.js';
import { readCard } from '../quiz/read.js';
import { snPush, snFixStart, snFixEnd, snCheckinAdd, snCheckinSkip, snCard, snHistAdd, snRetake, snRetakeDue, snRetakeSkip, snGrowth, snMatePart, snCouple, snDate } from '../math/sins.js';
import { ME_ONLY } from '../exercises/calm-letter.js';
import { askCard, introCard, resultCard, listCard } from '../quiz/page.js';
import { MIRRORS } from '../mirror.js';

const $ = id => document.getElementById(id);
// the names of the skills, skill trees and readings the result cards route to (made by tools/game_quiz_build.mjs)
const routes = await fetch('data/quiz/routes.json').then(r => r.json()).catch(() => null);
// others: a list of score sets, one per other person; each shows as a numbered mark on the bar
const bars = (scores, others = []) => h('div.st-quizbars', {}, scores.map(s => h('div.st-quizbar', {}, h('span.st-quizname', {}, h('strong', {}, s.name), h('small', {}, s.word)),
  h('span.st-quiztrack', { role: 'img', 'aria-label': `${s.name}: ${s.score} of 100${others.length ? `; the others: ${others.map(o => o.find(x => x.id === s.id).score).join(', ')}` : ''}` }, h('b', { style: { width: `${Math.max(3, s.score)}%` } }), others.map((o, k) => h('i', { style: { left: `${o.find(x => x.id === s.id).score}%` } }, others.length > 1 ? h('em', {}, String(k + 2)) : null))), h('span.st-quiznum', {}, String(s.score)))));

function draw(api) {
  stepLine(api); foot();
  const m = api.mine(), depth = m.quizDepth ?? 'ten', guessing = !!m.quizGuessing, key = guessing ? 'quizGuess' : 'quiz';
  const answers = m[key] || {}, items = itemsFor(guessing ? 'ten' : depth), Q = quizOf(m.quiz || {}, depth), G = quizOf(answers, guessing ? 'ten' : depth);
  const others = [...(m.quizOthers || []), ...(m.quizOther ? [m.quizOther] : [])], other = others.length ? others : null; // everyone who answered before you on this link
  const set = (id, v) => { const a = { ...answers, [id]: v }, q = quizOf(guessing ? (m.quiz || {}) : a, depth); const last = !items.some(i => !(a[i.id] >= 1));
    api.remember({ [key]: a, quizAt: null, ...(guessing && last ? { quizGuessing: false } : {}), ...(!guessing && q.ready && q.complete && !m.mirrorPicked ? { mirror: q.mirror } : {}) }); api.render(); };
  const at = m.quizAt && items.some(i => i.id === m.quizAt) ? m.quizAt : G.next, item = items.find(i => i.id === at), n = items.findIndex(i => i.id === at);
  const asking = !!item && (G.done < items.length || !!m.quizAt);
  // the question is drawn by the one renderer (js/quiz/page.js askCard), from the Money Chart's definition
  const ask = () => askCard({ def: MONEY_CHART, q: MONEY_CHART.questions.find(x => x.id === item.id), n, of: items.length, answer: answers[item.id], onPick: v => set(item.id, v),
    eyebrow: guessing ? `As they would answer: ${n + 1} of ${items.length}` : `${n + 1} of ${items.length}`,
    progress: items.length <= 25 ? h('div.st-pips', { 'aria-hidden': 'true' }, items.map(i => h(`i${answers[i.id] ? '.on' : ''}${i.id === at ? '.now' : ''}`))) : h('div.st-collapse', { 'aria-hidden': 'true' }, h('b', { style: { width: `${G.done / items.length * 100}%` } })),
    onBack: () => { api.remember({ quizAt: items[n - 1].id }); api.render(); },
    extra: guessing ? btn('Stop guessing', () => { api.remember({ quizGuessing: false, quizAt: null }); api.render(); }, 'slim') : Q.ready && Q.done >= 10 ? btn('See my chart now', () => { api.remember({ quizAt: null, quizDepth: Q.done >= 25 ? 'std' : 'ten' }); api.render(); }, 'slim') : null });
  const P = other && Q.ready ? groupOf([m.quiz, ...others]) : null, theirRead = m.quizOtherGuess && Q.ready ? perceptionOf(m.quizOtherGuess, m.quiz) : null;
  const kindWords = { cover: 'one of you has it covered', doubled: 'all of you lean hard here, a shared habit to watch', open: 'none of you leans here, the one to build together', alike: 'you sit close together' };
  const result = () => h('div.st-card.hero', { id: 'answer' }, h('div.st-eyebrow', {}, 'Your money chart'), h('h2', { style: { margin: '0 0 6px' } }, Q.words),
    h('p.st-small', {}, 'These are muscles, built by what life asked of you. None is a type and none is fixed. Often the one that carried you here is the one in the way next.'), bars(Q.scores, P ? others.map(o => quizOf(o).scores) : []),
    h('ul.st-list', { style: { marginTop: '10px' } },
      h('li', {}, h('span.dot', {}, '☉'), h('span', {}, `Sun: ${Q.sun.name}`, h('small', {}, 'Your strongest single trait: the move you make by reflex.')), h('span.when', {}, String(Q.sun.score))),
      Q.moon ? h('li', {}, h('span.dot', {}, '☽'), h('span', {}, `Moon: ${Q.moon.name}`, h('small', {}, 'Your strongest feeling trait: what runs underneath.')), h('span.when', {}, String(Q.moon.score))) : null,
      Q.rising ? h('li', {}, h('span.dot', {}, '↑'), h('span', {}, `Rising: ${Q.rising.name}`, h('small', {}, 'What other people see in how you spend, earn and give.')), h('span.when', {}, String(Q.rising.score))) : null,
      h('li', {}, h('span.dot', {}, ''), h('span', {}, `Most worked: ${Q.top.name}`, h('small', {}, Q.top.high)), h('span.when', {}, String(Q.top.score))),
      Q.even ? null : h('li', {}, h('span.dot', {}, ''), h('span', {}, `Least practiced: ${Q.low.name}`, h('small', {}, Q.low.low)), h('span.when', {}, String(Q.low.score)))),
    P ? h('div.st-readout', { role: 'status' }, h('strong', {}, P.size === 2 ? 'The two of you' : `The ${P.size} of you`), h('div', {}, P.size === 2 ? 'The mark on each bar is the other person.' : 'You are the bar. The numbered marks are the others, in the order they answered.'), h('ul', { style: { margin: '6px 0 0', paddingLeft: '18px' } }, P.rows.map(r => h('li', {}, `${r.name}: ${kindWords[r.kind]} (${r.scores.join(', ')}).`)))) : null,
    theirRead ? h('p.st-readout', { role: 'status' }, `How well they read you: off by about ${theirRead.average} points a muscle. ${theirRead.close.length ? `Closest on ${theirRead.close.join(', ')}. ` : ''}Furthest on ${theirRead.miss.name}: they guessed ${theirRead.miss.guessed}, you are ${theirRead.miss.actual}.`) : null,
    h('div.st-field', {}, h('div.st-flabel', {}, Q.done < 100 ? 'Go deeper (nothing is asked twice)' : 'Depth'), h('div.st-chips', {}, DEPTHS.map(([id, l, count]) => chip(Q.done >= count ? `${l} ✓` : l, depth === id, () => { api.remember({ quizDepth: id, quizAt: null }); api.render(); })))),
    h('div.st-field', {}, h('div.st-flabel', {}, 'So your plan will show this first'), h('div.st-chips', {}, MIRRORS.map(x => chip(x.label, (m.mirror ?? Q.mirror) === x.id, () => { api.remember({ mirror: x.id, mirrorPicked: true }); api.render(); })))),
    h('div.st-field', {}, h('div.st-flabel', {}, 'Share it as a quiz'), h('div.st-row', {},
      btn('Share with friends', async () => { const mine = api.store.doc.settings.start, theirs = JSON.parse(JSON.stringify(api.store.doc)); theirs.settings = { ...theirs.settings, start: { quizOthers: [...others, mine.quiz] } }; theirs.records = [];
        const url = `${location.origin}${location.pathname}#/d/${await pack(theirs)}`, text = `My money chart: mostly ${Q.top.name} (${Q.top.word.toLowerCase()}), least ${Q.low.name} (${Q.low.word.toLowerCase()}). Ten taps to see yours next to mine.`;
        try { if (navigator.share) { await navigator.share({ title: 'How do I handle money?', text, url }); $('sent').textContent = 'Shared. Each friend sees their chart beside yours.'; } else { await navigator.clipboard.writeText(`${text} ${url}`); $('sent').textContent = 'Copied, with a line to paste in a group chat. Each friend sees their chart beside yours.'; } }
        catch (e) { if (e?.name !== 'AbortError') $('sent').replaceChildren(h('input', { readonly: '', value: url, 'aria-label': 'Link to share', style: { width: '100%' }, onFocus: ev => ev.target.select() })); } }, 'primary'),
      h('a.st-btn.slim', { href: 'quiz.html', target: '_blank', rel: 'noopener' }, 'A blank one, without my answers')),
      h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'Your five scores travel in the link so friends can compare. Your plan and your numbers do not.')),
    h('div.st-field', {}, h('div.st-flabel', {}, 'With your people (two or more)'), h('div.st-row', {},
      btn(m.quizGuess && Object.keys(m.quizGuess).length >= 10 ? 'Guess again' : 'Guess how one of them would answer (10)', () => { api.remember({ quizGuessing: true, quizGuess: {}, quizAt: null }); api.render(); }, 'slim'),
      btn(others.length ? 'Copy a link for the next person' : 'Copy a link for my people', async () => { const mine = api.store.doc.settings.start, theirs = JSON.parse(JSON.stringify(api.store.doc)); theirs.settings = { ...theirs.settings, start: { quizOthers: [...others, mine.quiz], ...(mine.quizGuess && Object.keys(mine.quizGuess).length >= 10 ? { quizOtherGuess: mine.quizGuess } : {}) } }; theirs.records = [];
        const url = `${location.origin}${location.pathname}#/d/${await pack(theirs)}`; try { await navigator.clipboard.writeText(url); $('sent').textContent = others.length ? 'Link copied. It carries everyone so far, so the next person sees all of you side by side.' : 'Link copied. Send it to one person or several: each sees themselves beside you. To get everyone on one picture, each person passes on their own link.'; } catch { $('sent').replaceChildren(h('input', { readonly: '', value: url, 'aria-label': 'Link for your person', style: { width: '100%' }, onFocus: ev => ev.target.select() })); } }, 'slim')),
      h('p.st-small', { id: 'sent', role: 'status', style: { margin: '6px 0 0' } }, m.quizGuess && Object.keys(m.quizGuess).length >= 10 ? 'Your guess rides along in the link, so whoever opens it sees how well you read them.' : '')),
    h('div.st-row', { style: { marginTop: '10px' } }, btn('Change my answers', () => { api.remember({ quizAt: items[0].id }); api.render(); }, 'slim')));
  // ---------- the other quizzes: skins of the one engine, drawn by the one renderer ----------
  const chartTop = Q.ready ? Q.top.name : null, element = elementNow(m, chartTop), skin = m.lens ? skinOf(m.lens) : null, open = skin && !skin.soon ? skin : null;
  const keep = (id, patch) => { api.remember(lensPatch(api.mine(), id, patch)); api.render(); };
  const toList = () => { api.remember({ lens: null, lensList: true }); api.render(); };
  // the money sins (Part 2): in a household of two, each adult takes it as themselves (key: whose read it is)
  const adults = adultsOf(api.store.doc), pair = adults.length >= 2, who = pair && m.sinsWho === 'Partner' ? 'Partner' : 'Me';
  const keyOf = def => (def.id === 'sins' ? sinsKeyOf(who) : def.id);
  const whoChips = () => (pair && open.id === 'sins' ? h('div.st-card', { 'data-sn': 'who' }, h('div.st-flabel', {}, 'Taking it as'),
    h('div.st-chips', {}, adults.slice(0, 2).map(a => chip(a.name, who === a.id, () => { api.remember({ sinsWho: a.id }); api.render(); }))),
    h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'Each of you has a read of your own. Neither sees the other\'s unless you both choose to share.')) : null);
  const lens = () => {
    const key = keyOf(open), st = lensOf(m, key), N = lensNow(open, st, element);
    if (N.card && open.id === 'sins') return h('div', {}, whoChips(), sinsPart2(key, st), resultCard({ N, routes, on: lensOn(st, N, key) }), sinsRead(st, key));
    if (N.card) return resultCard({ N, routes, on: lensOn(st, N, key) });
    if (!st.go && !N.R.answered) return h('div', {}, whoChips(), introCard({ def: open, taps: N.taps, onStart: () => keep(key, { go: true }), onList: toList }));
    const q = N.R.next;
    return askCard({ def: open, q, n: N.R.answered, of: N.R.of, answer: st.ans[q.id], onPick: v => { const ans = { ...st.ans, [q.id]: v }, done = qzFlow(open, ans).done, at = done ? new Date().toISOString() : null;
        // the money sins: each finished take is kept in the read's history (the sin weakening over the retakes)
        const extra = done && open.id === 'sins' ? { sn: { v: 1, ...snHistAdd(st.sn || {}, sinsReadOf(open, { ...st, ans, at }, api.store.doc, at.slice(0, 10)), at) } } : {};
        keep(key, { ans, at, ...extra }); },
      onBack: () => { const ans = { ...st.ans }; delete ans[qzLast(open, ans)]; keep(key, { ans }); }, extra: btn('All quizzes', toList, 'slim') });
  };
  // the money sins, Part 2: the result card, the share card (only on a tap), the retake, the growth and the two of you
  const sinsPart2 = (key, st) => {
    const today = new Date().toISOString().slice(0, 10), sn = st.sn || {}, put = f => keep(key, { sn: { v: 1, ...f(sn) } });
    const read = sinsReadNow(open, m, api.store.doc, today, key), card = snCard(open, read), share = m.sinsShare === key ? sinsShareOf(open, card) : null;
    const say = t => { const el = document.getElementById('sins-sent'); if (el) el.textContent = t; };
    const send = async () => { const S = sinsShareOf(open, card), url = `${location.origin}${location.pathname}`;
      try { if (navigator.share) { await navigator.share({ title: S.title, text: S.text, url }); say('Sent.'); } else { await navigator.clipboard.writeText(`${S.text}\n${url}`); say('Copied. Paste it wherever you like.'); } }
      catch (e) { if (e?.name !== 'AbortError') say('This browser did not let the page send it. Copy the words instead.'); } };
    const copy = async () => { try { await navigator.clipboard.writeText(sinsShareOf(open, card).text); say('Copied.'); } catch { say('This browser did not let the page copy. Press and hold the words to copy them.'); } };
    const hist = sn.hist?.length ? sn.hist : st.at ? snHistAdd(sn, read, st.at).hist : [];
    // the two of you: only when both reads exist and both people turned sharing with each other on
    let couplePart = null;
    if (pair) {
      const otherKey = key === SN_KEYS.Me ? SN_KEYS.Partner : SN_KEYS.Me, otherSt = lensOf(m, otherKey), otherName = adults.find(a => a.id === (key === SN_KEYS.Me ? 'Partner' : 'Me'))?.name || 'your partner';
      const meName = adults.find(a => a.id === who)?.name || 'You';
      const a = snMatePart(read, meName, sn.mate), b = otherSt.at ? snMatePart(sinsReadNow(open, m, api.store.doc, today, otherKey), otherName, otherSt.sn?.mate) : null;
      const C = snCouple(open, a, b);
      couplePart = sinsCouplePart({ mate: !!sn.mate, otherName, couple: C, date: C ? snDate(open, a, b) : null, step: m.sinsDateStep || 0,
        on: { mate: v => put(s => ({ ...s, mate: v })), step: n => { api.remember({ sinsDateStep: n }); api.render(); } } });
    }
    return h('div', {}, sinsRetakeCard({ due: snRetakeDue(st, today), on: { retake: () => keep(key, snRetake(st, read)), skip: () => put(s => snRetakeSkip(s, st, today)) } }),
      sinsResultCard({ def: open, card, share, on: { share: () => { api.remember({ sinsShare: key }); api.render(); }, unshare: () => { api.remember({ sinsShare: null }); api.render(); }, send, copy } }),
      sinsGrowthPart(snGrowth(open, hist)), couplePart);
  };
  // the money sins: the read under the quiz card (js/quiz/read.js draws it; js/math/sins.js works it out)
  const sinsRead = (st, key = 'sins') => {
    const today = new Date().toISOString().slice(0, 10), nowAt = () => new Date().toISOString(), sn = st.sn || {};
    const read = sinsReadNow(open, m, api.store.doc, today, key), data = sinsDataOf(api.store.doc), put = f => keep(key, { sn: { v: 1, ...f(sn) } });
    return readCard({ def: open, read, data, sn, today, on: {
      push: (t, said, to) => put(s => snPush(s, t, said, to, nowAt())), fixStart: () => put(s => snFixStart(s, read.fix.trait, read.fix.group, today)),
      fixEnd: () => put(s => snFixEnd(s, read.ev, today)), check: (b, tag) => put(s => snCheckinAdd(s, b, tag, nowAt())), skip: () => put(s => snCheckinSkip(s, nowAt())),
      line: v => put(s => ({ ...s, line: v })), show: on => keep(key, { seen: on ? SHOWN : ME_ONLY, sn: { v: 1, ...sn, show: on } }) } });
  };
  const lensOn = (st, N, key = open.id) => ({
      keep: () => keep(key, { kept: N.feed.to }), switch: () => { api.remember({ element: N.feed.to, ...lensPatch(api.mine(), key, { kept: null }) }); api.render(); },
      // the money sins: one switch for who sees it (sn.show), and "That is me" is a push-back that counts as evidence
      show: on => keep(key, { seen: on ? SHOWN : ME_ONLY, ...(open.id === 'sins' ? { sn: { v: 1, ...(st.sn || {}), show: on } } : {}) }),
      confirm: () => keep(key, open.id === 'sins' ? { sn: { v: 1, ...snPush(st.sn || {}, N.R.id, 'yes', null, new Date().toISOString()) } } : { ok: true }),
      // the money sins: a retake keeps the old take in the history, and the rest of the read (snRetake)
      again: () => keep(key, open.id === 'sins' ? snRetake(st, sinsReadNow(open, m, api.store.doc, new Date().toISOString().slice(0, 10), key)) : { ans: {}, go: true, ok: false, kept: null, at: null }), list: toList,
      skills: async () => { location.href = carryUrl('skills', await pack(api.store.doc)); } });
  const list = () => listCard({ rows: SKINS.map(def => ({ def, N: def.soon ? null : lensNow(def, lensOf(m, keyOf(def)), element) })), element, elementFrom: m.element ? 'your pick' : 'from your Money Chart', open: !!m.lensList || !!open,
    onOpen: id => { api.remember({ lens: id }); api.render(); document.getElementById('ask')?.scrollIntoView?.({ block: 'center' }); }, onChart: open ? () => { api.remember({ lens: null }); api.render(); } : null });
  $('main').replaceChildren(...[
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'One thing, done right'), h('h1', {}, api.me.title), h('p', { style: { marginBottom: 0 } }, open ? 'A short tap quiz. Go with your gut: there are no right answers, and nobody sees this but you.' : guessing ? 'Now the same ten, answered the way you think one of your people would. It is a guess: that is the point.' : other && !Q.ready ? 'Someone sent you this to compare. Ten taps, answered as yourself. Go with your gut.' : 'One statement at a time. Go with your gut: there are no right answers, and nobody sees this but you.')),
    open ? lens() : null, !open && asking ? ask() : null, !open && Q.ready && !asking ? result() : null,
    guessing ? null : list(),
    carryCard(api, { ready: true, pulse: Q.ready && !asking && !open })].filter(Boolean));
}
boot('quiz', draw);
