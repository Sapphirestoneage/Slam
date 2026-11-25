// SPDX-License-Identifier: AGPL-3.0-only
// The screen of the money sins read in the web app (quiz.html, under the sins quiz). It works nothing out: every word,
// level and line comes from js/math/sins.js snRead, on the one quiz engine. Tap-only; each part is collapsed until
// opened. Private by default. The cost of a pattern is not here: it lives only in the opt-in Mistake audit.
// Part 2 builds the result card and the archetypes on this read; this card is the read itself.
import { h } from '../ui/dom.js';
import { SN_TAGS, SN_RULES, snCheckinDue } from '../math/sins.js';

const btn = (label, onClick, kind = '') => h(`button.st-btn${kind ? '.' + kind.split(' ').join('.') : ''}`, { type: 'button', onClick }, label);
const chip = (label, on, onClick) => h('button.st-chip', { type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick }, label);
const fold = (title, ...body) => h('details.st-fold', {}, h('summary', {}, title), ...body);
const money = v => `$${Math.round(v).toLocaleString('en-US')}`;

// One family: its top two with the light side, the level, why we think this, and the push-back.
function familyPart(def, f, on) {
  const others = def.traits.filter(t => t.group === f.id && t.id !== f.top.id);
  return h('div.st-field', { 'data-sn': f.id },
    h('div.st-flabel', {}, f.name),
    h('p.st-small', { style: { margin: '0 0 6px' } }, h('span.st-tag', { title: f.why }, f.level || 'Guess'), ` ${f.word || 'Early read'}. ${f.why}`),
    h('ol.st-small', { style: { margin: '0 0 6px', paddingLeft: '20px' } }, f.topTwo.map(t => h('li', {}, h('strong', {}, t.name), t.money ? h('div', {}, t.money) : null, h('div.st-soft', {}, `Light side: ${t.light}`)))),
    fold('Why we think this', f.lines.length ? h('ul.st-small', {}, f.lines.map(l => h('li', {}, l.line, l.ago ? ` (${l.ago})` : ''))) : h('p.st-small', {}, 'Nothing strong yet.')),
    fold('Is this really it?', h('p.st-small', {}, `Your answer counts as evidence, and it is kept on your read. Is ${f.top.name} right?`),
      h('div.st-row', {}, btn('Yes, that is me', () => on.push(f.top.id, 'yes'), 'slim'), btn('Not really', () => on.push(f.top.id, 'no'), 'slim')),
      h('div.st-flabel', { style: { marginTop: '8px' } }, 'More like'), h('div.st-chips', {}, others.map(t => chip(t.name, false, () => on.push(f.top.id, 'other', t.id))))));
}
// Test the fix: one defense for a month, and its check.
function fixPart(read, on) {
  const F = read.fix;
  if (!F || !F.name) return null;
  const result = F.started && F.done ? (F.dropped === true ? 'The pattern dropped. The read firms up.' : F.dropped === false ? 'The pattern held, so the read moves to the next most likely one.' : 'Nothing showed in the month before, so there is nothing to compare yet.') : null;
  return h('div.st-field', { 'data-sn': 'fix' }, h('div.st-flabel', {}, 'Test the fix: one defense for a month'),
    h('p', { style: { margin: '0 0 4px' } }, h('strong', {}, F.name), F.moved ? ' (the next most likely read)' : ''),
    h('p.st-small', { style: { margin: '0 0 4px' } }, F.how), h('p.st-small.st-soft', { style: { margin: '0 0 6px' } }, `The check: ${F.check}`),
    F.started ? (F.done ? h('div', {}, h('p.st-readout', { role: 'status' }, result), btn('Keep the result', on.fixEnd, 'slim'))
      : h('p.st-readout', { role: 'status' }, `${F.daysLeft} days left. So far: ${F.during} points of the pattern, against ${F.before} in the month before.`))
      : btn('Start the month', on.fixStart, 'slim'));
}
// The one-tap check-ins: only the buys that pass the line or trip a pattern, three a week at most.
function checkPart(read, data, sn, on, today) {
  const asked = new Set((sn.checks || []).map(c => `${c.d}|${c.amt}`)), line = sn.line ?? SN_RULES.line, rows = [];
  for (const b of [...data.buys].sort((x, y) => y.d.localeCompare(x.d)).slice(0, 20)) {
    if (rows.length >= 3 || asked.has(`${b.d}|${b.amt}`)) continue;
    const due = snCheckinDue(sn, b, { ...data, buys: data.buys.filter(x => x !== b) }, today);
    if (due.ask) rows.push({ b, why: due.why });
  }
  return fold(`What was this? (${rows.length ? `${rows.length} to tap` : 'nothing to ask'})`,
    h('p.st-small', {}, `One tap, only on a buy over your line or when a pattern trips, at most ${SN_RULES.perWeek} a week. Skip any of them.`),
    ...rows.map(({ b, why }) => h('div.st-field', {}, h('div.st-flabel', {}, `${money(b.amt)} on ${b.d}`), h('div.st-small.st-soft', {}, why),
      h('div.st-chips', {}, SN_TAGS.map(t => chip(t.label, false, () => on.check(b, t.id))), chip('Skip', false, () => on.skip())))),
    h('div.st-flabel', { style: { marginTop: '8px' } }, 'Ask me about buys over'),
    h('div.st-chips', {}, SN_RULES.lines.map(v => chip(money(v), v === line, () => on.line(v)))));
}
// The whole read. o: { def, read, data, sn, today, on: { push, fixStart, fixEnd, check, skip, line, show } }
export function readCard({ def, read, data, sn = {}, today, on }) {
  return h('div.st-card', { id: 'read' }, h('div.st-eyebrow', {}, 'A game lens, not a diagnosis'), h('h2', { style: { margin: '0 0 6px' } }, def.read.title),
    h('p.st-small', { style: { margin: '0 0 8px' } }, `From ${read.sources.map(s => s.name.toLowerCase()).join(', ') || 'nothing yet'}. Recent evidence counts more; anything a month old counts half.`),
    read.families.map(f => familyPart(def, f, on)),
    fold('Two kinds of pride', h('p.st-small', {}, def.read.pride)),
    fixPart(read, on),
    checkPart(read, data, sn, on, today),
    read.gathering.length ? fold('Still being gathered', h('ul.st-small', {}, read.gathering.map(l => h('li', {}, l)))) : null,
    fold('Show the math', h('ul.st-small', {}, h('li', {}, `The quiz counts ${Math.round(read.quizWeight * 100)}% now: it shares out as other evidence comes in.`),
      h('li', {}, `Half-life ${SN_RULES.halfLife} days. A label shows when ${SN_RULES.agree} sources agree over about ${SN_RULES.labelDays} days of your money (${read.days} so far).`),
      ...read.families.flatMap(f => f.order.slice(0, 4).map(id => h('li', {}, `${def.traits.find(t => t.id === id).name}: ${Math.round((read.engine.scores[id] || 0) * 10) / 10}`))))),
    h('p.st-small.st-soft', {}, h('a', { href: 'index.html#/report' }, 'What a pattern costs, in dollars: the Mistake audit (opt-in, on Report)')),
    h('div.st-field', {}, h('div.st-flabel', {}, `Who sees your read: ${sn.show ? 'Me, and anyone I show my plan' : 'Me only'}`),
      h('div.st-chips', {}, chip('Me only', !sn.show, () => on.show(false)), chip('Show my read', !!sn.show, () => on.show(true))),
      h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'Me only keeps it out of a coach\'s screens, a partner\'s view and every shared copy. Even when shown, your check-ins stay home.')));
}
