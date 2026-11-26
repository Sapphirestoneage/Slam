// SPDX-License-Identifier: AGPL-3.0-only
// Hard moments (run Not built, groups 1 to 5, Part 7): eight small pages on the one renderer (js/solo/calc.js), each a
// private spec. Untangling after a breakup or a divorce, a roommate moving out, the first 90 days after a death, when a
// partner has died, words for medical bills, saying no to lending, after a fire, a flood or an eviction notice, and a
// money plan kept private (financial abuse safety planning). The math is js/math/hard.js and js/math/hardplan.js (M8H);
// the steps, the scripts and the dated resource lists are data/sources/hard-2026.json, each line with its source.
// Nothing is kept unless the person turns on Keep this (js/hard.js, boot's private mode). Every page has Leave this
// page: one tap (or Shift three times) and the page is gone, replaced by a weather site, and off the Back button.
import { h, btn, chip, money, numBox, copyLink } from './shell.js';
import { calcPage } from './calc.js';
import { quickExit, exitButton, keepCard } from './keepthis.js';
import { hmUntangle, hmChecklist, hmFill, hmParkMonths, HM_PLANS, HM_SPLIT } from '../math/hard.js';
import { roommateExit } from '../math/hardplan.js';
import { SINS } from '../quiz/skins/sins.js';

const $ = id => document.getElementById(id);
const big = v => money(Math.round(v));
const opt = (list, f = String) => list.map(v => [f(v), v]);
const mo = v => `${v} ${v === 1 ? 'month' : 'months'}`;
const dateWords = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// Leave this page and Keep this are shared with Your own path (run Not built, Part 6): js/solo/keepthis.js.

// ---------- the shared cards ----------
const sourceLine = (x, D) => h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'Source: ', h('a', { href: x.url, target: '_blank', rel: 'noopener' }, x.source), `. Checked ${dateWords(x.checked ?? D.checked)}.`);
// Who can help: the dated list of lines for this tool. A phone number is a link that dials.
function linesCard(D, keys, { title = 'Who can help', id = 'lines' } = {}) {
  const tel = n => `tel:${n.replace(/[^\d]/g, '')}`;
  return h('div.st-card', { id }, h('h2', { style: { marginTop: 0 } }, title),
    h('ul.st-list', {}, keys.map(k => D.lines[k]).filter(Boolean).map(L => h('li', {}, h('span.dot', {}, ''),
      h('span', {}, h('b', {}, L.name), h('small', {}, L.what), [L.text, L.chat].some(Boolean) ? h('small', {}, [L.text, L.chat].filter(Boolean).join('. ')) : null,
        h('div.st-row', { style: { marginTop: '6px', alignItems: 'center' } }, L.call ? h('a.st-btn.slim', { href: tel(L.call), 'aria-label': `Call ${L.name}, ${L.call}` }, `Call ${L.call}`) : null, h('a', { href: L.url, target: '_blank', rel: 'noopener' }, 'Their own page'))),
      h('span', {}, '')))),
    h('p.st-small.st-soft', { style: { marginBottom: 0 } }, `Checked on ${dateWords(D.checked)}, each on the organization's own page. Numbers can change, so the link goes to their page.`));
}
// The steps, grouped by when, each one a tap. The count and the next step on top.
function stepsCard(api, D, items, { title = 'What to do, and when' } = {}) {
  const ticks = api.mine().ticks || {}, C = hmChecklist(items, ticks);
  const tick = id => { api.remember({ ticks: { ...(api.mine().ticks || {}), [id]: !ticks[id] } }); api.render(); };
  const groups = C.groups.map(g => h('div', { style: { marginTop: '10px' } }, h('div.st-eyebrow', {}, `${D.when[g.when] ?? 'Next'} · ${g.done} of ${g.of}`),
    h('ul.st-list', {}, items.filter(i => (i.when ?? null) === g.when).map(i => h(`li${ticks[i.id] ? '.done' : ''}`, {}, h('span.dot', {}, ticks[i.id] ? '✓' : ''),
      h('span', {}, i.text, i.fact && D.facts[i.fact] ? h('small', {}, D.facts[i.fact].text) : null, i.fact && D.facts[i.fact] ? sourceLine(D.facts[i.fact], D) : null),
      h('button.st-btn.slim', { type: 'button', 'aria-pressed': ticks[i.id] ? 'true' : 'false', onClick: () => tick(i.id) }, ticks[i.id] ? '✓ Done' : 'Done'))))));
  return h('div.st-card', { id: 'steps' }, h('h2', { style: { marginTop: 0 } }, title),
    h('p.st-small', { style: { margin: 0 } }, C.all ? 'Every step is ticked. That is the list done.' : C.next ? `${C.done} of ${C.of} done. Next: ${C.next.text}` : ''),
    api.mine().keep ? null : h('p.st-small.st-soft', { style: { margin: '4px 0 0' } }, 'Ticks stay on this screen only, unless you turn on Keep this below.'), groups);
}
// Words to copy, with the person's own numbers in them. Each script folded; one tap copies its words.
function scriptsCard(D, scripts, values, { title = 'Words to use' } = {}) {
  const fill = s => s.say.map(t => hmFill(t, values));
  return h('div.st-card', { id: 'scripts' }, h('h2', { style: { marginTop: 0 } }, title), h('p.st-small.st-soft', { style: { marginTop: 0 } }, 'Words to copy or read out, never a script you have to follow. Change anything that does not sound like you.'),
    scripts.map(s => { const out = h('span.st-small', { role: 'status', style: { marginLeft: '8px' } }, '');
      return h('details.st-fold', {}, h('summary', {}, s.title), h('p.st-small.st-soft', { style: { margin: '6px 0' } }, s.who), fill(s).map(t => h('p', { style: { margin: '0 0 6px' } }, `"${t}"`)), s.note ? h('p.st-small', {}, s.note) : null,
        h('div.st-row', {}, btn('Copy the words', async () => { try { await navigator.clipboard.writeText(fill(s).join(' ')); out.textContent = 'Copied.'; } catch { out.textContent = 'Copying is blocked here. Hold to select the words instead.'; } }, 'slim'), out)); }));
}
// The pause line or the 72-hour rule, from the money sins read (js/quiz/skins/sins.js): one set of these words.
function pauseCard(which) {
  const f = SINS.read.fix[which]; if (!f) return null;
  return h('div.st-card', { id: 'pause' }, h('div.st-eyebrow', {}, 'First'), h('h2', { style: { margin: '2px 0 6px' } }, f.name), h('p', { style: { margin: 0 } }, f.how));
}
// Each page: private, with Leave this page, and Keep this in place of the link card.
const page = (D, tool, spec) => ({ private: true, eyebrow: 'A hard moment', title: D.tools[tool].title, why: D.tools[tool].why, fields: [], keep: keepCard, drawn: () => exitButton(D), ...spec });

// ---------- untangling after a breakup or a divorce ----------
const UT_TAPS = [['Joint checking', 'have'], ['Joint savings', 'have'], ['A credit card', 'owe'], ['A car loan', 'owe'], ['The car', 'have'], ['A mortgage', 'owe'], ['The home', 'have'], ['A lease deposit', 'have'], ['Retirement account', 'have'], ['Phone plan', 'owe'], ['Furniture', 'have'], ['Something else', 'have']];
const UT_NAMES = [['Both names', 'both'], ['Mine', 'me'], ['Theirs', 'them']];
function untangleCards(api, D) {
  const M = api.mine(), items = M.items || [], put = list => api.remember({ items: list });
  const totals = () => { const U = hmUntangle(api.mine().items || [], { share: api.mine().share ?? 0.5 });
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Where it lands'),
      !U.ready ? h('p.st-soft', { style: { margin: 0 } }, 'Tap what you shared above, and it adds up here.') : [
        h('div.st-soft', {}, 'With what is decided so far, you end up with'), h('div.st-big', {}, big(U.mine.net)),
        h('p', { style: { fontWeight: 700 } }, `${big(U.mine.have)} you keep, ${big(U.mine.owe)} you owe. They end up with ${big(U.theirs.net)}.`),
        h('ul.st-list', {}, [[`Decided`, null, `${U.decided} of ${U.of}`], U.open.length ? ['Still to decide', `${U.open.length} ${U.open.length === 1 ? 'thing' : 'things'}`, big(U.openAmount)] : null,
          U.noAmount.length ? ['An amount to look up', null, `${U.noAmount.length}`] : null,
          U.stillBoth.length ? ['Debts still in both names', 'Owed by both of you until paid off, moved into one name, or closed', big(U.stillBothAmount)] : null].filter(Boolean)
          .map(([l, s, v]) => h('li', {}, h('span.dot', {}, ''), h('span', {}, l, s ? h('small', {}, s) : null), h('span.when', {}, v)))),
        h('div.st-field', {}, h('div.st-flabel', {}, 'Your part of what you split or sell'), h('div.st-chips', {}, [[0.5, 'Half'], [0.4, '40%'], [0.6, '60%'], [0.3, '30%'], [0.7, '70%']].map(([v, l]) => chip(l, (api.mine().share ?? 0.5) === v, () => { api.remember({ share: v }); api.render(); })))),
        h('p.st-small.st-soft', { style: { marginBottom: 0 } }, 'A list for talking it through, not a legal split. What the law gives each of you depends on your state.')]);
  };
  let tot = totals();
  const row = (it, i) => {
    const change = patch => { const list = [...(api.mine().items || [])]; list[i] = { ...list[i], ...patch }; put(list); };
    return h('div.st-field', { style: { borderTop: '2px solid var(--border-row)', paddingTop: '10px' } }, h('div.st-flabel', {}, it.name, it.kind === 'owe' ? ' (owed)' : ''),
      numBox(it.kind === 'owe' ? 'What is owed' : 'What it is worth', it.amount ?? null, [], (v, typing) => { change({ amount: v }); if (typing) { api.save(); const f = totals(); tot.replaceWith(f); tot = f; } else api.render(); }, { id: `ut_${it.id}` }),
      h('div.st-flabel', {}, 'Whose name it is in'), h('div.st-chips', {}, UT_NAMES.map(([l, v]) => chip(l, it.names === v, () => { change({ names: v }); api.render(); }))),
      h('div.st-flabel', {}, 'Who ends up with it'), h('div.st-chips', {}, Object.entries(HM_PLANS).map(([v, l]) => chip(l, (it.plan ?? 'none') === v, () => { change({ plan: v }); api.render(); }))),
      h('div.st-row', { style: { marginTop: '6px' } }, btn('Remove', () => { put((api.mine().items || []).filter((_, k) => k !== i)); api.render(); }, 'slim')));
  };
  const list = h('div.st-card', { id: 'shared' }, h('h2', { style: { marginTop: 0 } }, 'What you shared'), h('p.st-small.st-soft', { style: { marginTop: 0 } }, 'Tap each one you shared. Add an amount when you know it.'),
    h('div.st-chips', {}, UT_TAPS.map(([name, kind]) => chip(`+ ${name}`, false, () => { const list2 = [...(api.mine().items || [])]; list2.push({ id: `u${Date.now().toString(36)}${list2.length}`, name, kind, amount: null, names: 'both', plan: null }); put(list2); api.render(); }))),
    items.map(row));
  return [list, tot];
}

// ---------- the eight specs ----------
const SPLIT_FIELDS = [1, 2, 3, 4].flatMap(n => [
  { key: `size${n}`, label: n === 1 ? 'Your room' : `Room ${n}`, unit: 'sq ft', picks: [80, 100, 130, 160, 200], when: v => v.how === 'size' && n <= v.people, help: n === 1 ? 'Square feet, or count floor tiles: it only needs to be the same for every room.' : null },
  { key: `income${n}`, label: n === 1 ? 'Your take-home a month' : `Person ${n}'s take-home a month`, picks: [2000, 3500, 5000, 7000], when: v => v.how === 'income' && n <= v.people }]);
const who = (i, v) => (i === 0 ? 'You' : `Person ${i + 1}`);
export function hardSpecs(D) {
  const T = D.tools;
  return {
    untangle: page(D, 'untangle', { more: api => [...untangleCards(api, D), stepsCard(api, D, T.untangle.steps), linesCard(D, T.untangle.lines), h('p.st-small.st-soft', {}, T.untangle.safety, ' ', h('a', { href: 'safety.html' }, 'Open the money plan kept private'), '.')] }),
    roomexit: page(D, 'roomexit', {
      boxes: 'The lease and the rent',
      fields: [{ key: 'rent', label: 'The whole rent a month', picks: [1800, 2500, 3200, 4000, 5000] },
        { key: 'bills', label: 'Shared bills a month', picks: [0, 100, 200, 350], start: 0, optional: true, help: 'Utilities, internet, the shared supplies.' },
        { key: 'people', label: 'How many of you now', options: opt([2, 3, 4]), start: 2 },
        { key: 'leaver', label: 'Who is moving out', options: [['You', 0], ['Person 2', 1], ['Person 3', 2], ['Person 4', 3]], start: 1 },
        { key: 'monthsLeft', label: 'Months left on the lease', options: opt([1, 2, 3, 4, 6, 9, 12], mo) },
        { key: 'cover', label: 'Months the person leaving keeps paying', options: opt([0, 1, 2, 3, 6], String), start: 0, help: 'What you agree, often until a new roommate is found. 0 is an answer.' },
        { key: 'how', label: 'Split the rent', options: Object.entries(HM_SPLIT).map(([k, label]) => [label, k]), start: 'equal' },
        { key: 'billsHow', label: 'Split the bills', options: [['Equally', 'equal'], ['The same way as the rent', 'same']], start: 'equal' },
        ...SPLIT_FIELDS,
        { key: 'deposit', label: 'The whole deposit', picks: [0, 1500, 2500, 4000], start: 0, optional: true },
        { key: 'damage', label: 'What comes off the deposit', picks: [0, 100, 300, 600], start: 0, optional: true, help: 'Cleaning or damage, if you know it.' }],
      run: v => roommateExit({ rent: v.rent, bills: v.bills, how: v.how, billsHow: v.billsHow, monthsLeft: v.monthsLeft, cover: v.cover, deposit: v.deposit, damage: v.damage,
        leaver: v.leaver < v.people ? (v.leaver === 0 ? 'Me' : `P${v.leaver + 1}`) : null,
        people: Array.from({ length: v.people }, (_, i) => ({ id: i === 0 ? 'Me' : `P${i + 1}`, name: who(i), size: v[`size${i + 1}`], income: v[`income${i + 1}`] })) }),
      waiting: 'The rent and the months left on the lease, and it appears. Pick who is moving out from the people you have.',
      answer: R => { const me = R.rows[0];
        return { lead: me.leaving ? `Moving out, what you pay until the lease ends is` : 'Until the lease ends, what you pay is', big: big(me.toEnd),
          line: me.leaving ? `${big(me.now)} a month for ${mo(R.cover)}, as agreed.${R.rest ? ` The ${mo(R.rest)} after that, ${big(R.uncovered)} of your part, falls to the people staying unless someone new moves in.` : ''}`
            : `${big(me.now)} a month now${R.rest ? `, then ${big(me.later)} a month for the last ${mo(R.rest)} if no one new moves in (${big(me.more)} more a month)` : ''}.`,
          rows: R.rows.map(r => [r.name + (r.leaving ? ' (moving out)' : ''), r.leaving ? `${big(r.now)} a month for ${mo(R.cover)}` : R.rest ? `${big(r.now)} then ${big(r.later)} a month` : `${big(r.now)} a month`, big(r.toEnd)]),
          small: R.deposit ? `The deposit of ${big(R.deposit)}${R.damage ? `, less ${big(R.damage)}` : ''}, back by each person's share of the rent: ${R.rows.map(r => `${r.name} ${big(r.deposit)}`).join(', ')}.` : 'Add the deposit to see how it comes back.',
          fold: [['How this is split', 'The same split the roommate calculator and the whole plan use for a household (by room size, by income or equally). After the person leaving stops paying, the people staying split the whole rent the same way among themselves.', 'A new roommate from the next month puts everyone back on the first line.']] }; },
      more: api => [stepsCard(api, D, T.roomexit.steps), linesCard(D, T.roomexit.lines)] }),
    grief: page(D, 'grief', {
      boxes: 'If money arrives (optional)',
      first: api => [pauseCard(T.grief.pause), stepsCard(api, D, T.grief.steps)].filter(Boolean),
      fields: [{ key: 'amount', label: 'Money that has arrived or will', picks: [5000, 10000, 25000, 50000, 100000], optional: true, help: 'An inheritance, life insurance, a final paycheck. It can wait in savings.' },
        { key: 'spending', plan: 'spending', label: 'What you spend in a month, all in', picks: [2000, 3000, 4000, 5000, 6500], optional: true }],
      run: v => hmParkMonths(v),
      waiting: 'If money arrives, put it in here to see how long it carries the household while it waits. Nothing needs deciding.',
      answer: R => ({ lead: 'Waiting in savings, it covers about', big: R.months >= 24 ? `${(R.months / 12).toFixed(1)} years` : mo(Math.round(R.months * 10) / 10), line: `${big(R.amount)} at ${big(R.spending)} a month. While it waits, the choices about it can wait too.`, small: D.facts.inheritIncome.text }),
      more: api => [linesCard(D, T.grief.lines)] }),
    widow: page(D, 'widow', { first: api => [pauseCard(T.widow.pause), stepsCard(api, D, T.widow.steps)].filter(Boolean), more: () => [linesCard(D, T.widow.lines)] }),
    medical: page(D, 'medical', {
      boxes: 'Your numbers, for the words (optional)',
      fields: [{ key: 'balance', label: 'The bill', picks: [500, 1000, 2500, 5000, 10000], optional: true },
        { key: 'monthly', label: 'What you could pay a month', picks: [25, 50, 100, 200], optional: true, help: 'A number you can keep paying in a lean month.' },
        { key: 'offer', label: 'One payment you could make', picks: [250, 500, 1000, 2500], optional: true, help: 'Only if you have it. Leave it empty otherwise.' }],
      typed: api => { const el = $('scripts'); if (el) el.replaceWith(medScripts(api, D)); },
      more: api => [medScripts(api, D), stepsCard(api, D, T.medical.steps, { title: 'Your rights, step by step' }), linesCard(D, T.medical.lines)] }),
    sayno: page(D, 'sayno', {
      boxes: 'Your numbers, for the words (optional)',
      first: () => [pauseCard(T.sayno.pause)].filter(Boolean),
      fields: [{ key: 'asked', label: 'What they asked for', picks: [100, 250, 500, 1000, 5000], optional: true },
        { key: 'gift', label: 'What you could give and never need back', picks: [0, 25, 50, 100, 250], optional: true, help: '$0 is a whole answer.' }],
      typed: api => { const el = $('scripts'); if (el) el.replaceWith(noScripts(api, D)); },
      more: api => [noScripts(api, D), stepsCard(api, D, T.sayno.steps, { title: 'Before you answer' }), linesCard(D, T.sayno.lines, { title: 'For the person asking' })] }),
    crisis: page(D, 'crisis', {
      boxes: 'What happened',
      fields: [{ key: 'kind', label: 'Tap one', options: Object.entries(T.crisis.kinds).map(([k, l]) => [l, k]), start: 'fire' }],
      more: api => { const kind = api.mine().crisis_kind ?? 'fire'; return [linesCard(D, T.crisis.lines[kind]), stepsCard(api, D, T.crisis.steps.filter(s => s.kind === 'all' || s.kind === kind))]; } }),
    safety: page(D, 'safety', {
      first: api => [linesCard(D, T.safety.lines, { title: 'Talk to someone', id: 'lines' }),
        h('div.st-card', { id: 'cannot' }, h('h2', { style: { marginTop: 0 } }, 'What this page can and cannot hide'), h('ul.st-list', {}, T.safety.cannot.map(t => h('li', {}, h('span.dot', {}, ''), h('span', {}, t), h('span', {}, '')))),
          h('p.st-small', {}, D.facts.history.text), sourceLine(D.facts.history, D), h('p.st-small.st-soft', {}, D.exit.keys)),
        stepsCard(api, D, T.safety.steps, { title: 'Quiet steps, when it is safe' }), h('p.st-small.st-soft', {}, D.facts.hotlineMoney.text), sourceLine(D.facts.hotlineMoney, D)] }),
  };
}
const mval = (api, id, k) => { const v = api.mine()[`${id}_${k}`]; return v == null ? null : big(v); };
const medScripts = (api, D) => scriptsCard(D, D.tools.medical.scripts, { balance: mval(api, 'medical', 'balance'), monthly: mval(api, 'medical', 'monthly'), offer: mval(api, 'medical', 'offer') });
const noScripts = (api, D) => scriptsCard(D, D.tools.sayno.scripts, { asked: mval(api, 'sayno', 'asked'), gift: mval(api, 'sayno', 'gift') });

export const HARD_SHELF = [['untangle', 'Untangling what you shared'], ['roomexit', 'A roommate is moving out'], ['grief', 'After a death: the first 90 days'], ['widow', 'When your partner has died'], ['medical', 'Medical bills: words to use'], ['sayno', 'Saying no to lending money'], ['crisis', 'After a fire, a flood or an eviction'], ['safety', 'A money plan, kept private']];
export { quickExit };
export const HARD_PAGES = { untangle: 'untangle.html', roomexit: 'roomexit.html', grief: 'grief.html', widow: 'widowed.html', medical: 'medicalbills.html', sayno: 'sayno.html', crisis: 'crisis.html', safety: 'safety.html' };

const tool = typeof document !== 'undefined' ? document.documentElement.dataset.hard : null;
if (tool) {
  const D = await fetch('data/sources/hard-2026.json').then(r => r.json());
  const S = hardSpecs(D);
  if (S[tool]) calcPage(tool, S[tool]);
}
