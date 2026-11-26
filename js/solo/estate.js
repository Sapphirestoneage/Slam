// SPDX-License-Identifier: AGPL-3.0-only
// Estate and marriage (run Finish everything partly built, Part 11): two private pages next to the chosen-family
// summary (kin.html, the estate basics): What would my people receive? (heirs.html, the inheritance simulator: who gets
// what, the step-up in basis, the 10 years of an inherited account, the federal and New York lines) and Married or
// partners? (married.html: the federal tax, job health cover and Social Security, New York first). The math is
// js/math/estate.js (M8E) with tests; the rules are data/reference-2026.json (estate) and the dated words
// data/sources/estate-2026.json. Private like the other Your own path pages: nothing is kept unless the person turns on
// Keep this (js/solo/keepthis.js), and Leave this page sits in the top bar. Not legal advice: each page says to bring it
// to a lawyer.
import { boot, h, btn, chip, money, numBox, foot } from './shell.js';
import { keepCard, withExit } from './keepthis.js';
import { esHeirs, esTenYear, esCompare, ES_KINDS, ES_HEIRS, ES_BASIS, ES_WAYS } from '../math/estate.js';
import { federalTax } from '../math/income.js';
import { spousalExcess } from '../math/socialsecurity.js';

const $ = id => document.getElementById(id);
const big = v => money(Math.round(v));
const pct = v => `${Math.round(v * 100)}%`;
const dateWords = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const uid = list => `x${Date.now().toString(36)}${list.length}`;
// One tax engine: the federal income tax of the whole app (income.js, M10), on a year's income before taxes.
const taxOf = ref => (gross, status) => federalTax({ gross, filingStatus: status }, ref).value ?? 0;

// ---------- shared cards (also used by kin.html) ----------
// The dated sources of these pages, collapsed: who said it, in plain words, and where, with the day it was checked.
export function estateSources(D, keys, title = 'Where these rules come from') {
  const list = keys.map(k => D.facts[k]).filter(Boolean);
  return h('div.st-card', { id: 'estsources' }, h('details.st-fold', {}, h('summary', {}, title),
    h('p.st-small.st-soft', {}, `Checked on ${dateWords(D.checked)}, by search on each agency's own site. Rules change: check the page on the day you use it.`),
    h('ul.st-list', {}, list.map(f => h('li', {}, h('span.dot', {}, ''), h('span', { style: { minWidth: 0, overflowWrap: 'anywhere' } }, f.text, h('small', {}, f.source), h('small', {}, h('a', { href: f.url, target: '_blank', rel: 'noopener' }, 'Their own page'))))))));
}
const PAGES = [['kin', 'kin.html', 'Who decides for me, and who gets what?', 'The summary for a lawyer: health care proxy, power of attorney, will, and who is named on each account.'],
  ['heirs', 'heirs.html', 'What would my people receive?', 'Who gets what, the step-up in basis, the 10 years of an inherited account.'],
  ['married', 'married.html', 'Married or partners?', 'The tax, job health cover and Social Security differences, New York first.'],
  ['grief', 'grief.html', 'After a death: the first 90 days', 'When money arrives and the choices can wait.'],
  ['widow', 'widowed.html', 'When your person has died', 'Social Security, the accounts, the first steps.']];
export function estateLinks(D, here) {
  return h('div.st-card', { id: 'estlinks' }, h('h2', { style: { marginTop: 0 } }, 'Estate and marriage'),
    h('p.st-small', { style: { marginTop: 0 } }, D.lawyer),
    h('ul.st-list', {}, PAGES.filter(p => p[0] !== here).map(([, href, title, what]) => h('li', {}, h('span.dot', {}, ''), h('span', {}, h('a', { href }, title), h('small', {}, what)), h('span.when', {}, '')))));
}
const lawyerNote = D => h('p.st-small.st-soft', { style: { marginBottom: 0 } }, D.lawyer);

// ---------- What would my people receive? (heirs.html) ----------
const PEOPLE_TAPS = [['A spouse', 'spouse'], ['A partner', 'other'], ['A child', 'child'], ['A friend', 'other'], ['A sibling', 'other'], ['A parent', 'other'], ['Someone else', 'other']];
const THING_TAPS = [['Savings', 'cash'], ['Brokerage account', 'taxable'], ['The home', 'home'], ['401(k) or IRA', 'pretax'], ['Roth IRA', 'roth'], ['Life insurance', 'life'], ['Something else', 'other']];
const EXAMPLE = {
  people: [{ id: 'p1', name: 'Sam', heir: 'close' }, { id: 'p2', name: 'Jo', heir: 'other' }],
  items: [{ id: 'i1', name: 'Savings', kind: 'cash', value: 20000, to: { p1: 1 } }, { id: 'i2', name: 'Brokerage account', kind: 'taxable', value: 80000, basis: 30000, to: { p1: 1, p2: 1 } },
    { id: 'i3', name: '401(k) or IRA', kind: 'pretax', value: 150000, to: { p2: 1 } }, { id: 'i4', name: 'Roth IRA', kind: 'roth', value: 40000, to: { p1: 1 } }, { id: 'i5', name: 'Life insurance', kind: 'life', value: 250000, to: { p1: 1 } }],
};
const RULE_WORDS = {
  own: () => 'As a spouse, they can treat it as their own account.',
  life: () => 'They may take it out over their own life expectancy (or within the 10 years).',
  child: r => `Over their life expectancy until ${r.childAge}, then 10 more years to empty it.`,
  ten: r => `Emptied by December 31 ${r.lastYear ?? 'of the 10th year after the death'}${r.yearly ? ', with a withdrawal every year until then' : ''}.`,
};
function heirsDraw(api, D) {
  foot();
  const ref = api.ref, R0 = ref.estate, M = api.mine(), people = M.people || [], items = M.items || [];
  const year = new Date().getFullYear(), when = M.when ?? 0, deathYear = year + when;
  const put = patch => { api.remember(patch); api.render(); };
  const sim = () => esHeirs({ items: api.mine().items || [], people: api.mine().people || [], deathYear, started: api.mine().started === true }, R0);

  const peopleCard = h('div.st-card', { id: 'people' }, h('h2', { style: { marginTop: 0 } }, 'Your people'),
    h('p.st-small.st-soft', { style: { marginTop: 0 } }, 'Anyone you would leave something to: chosen family counts. Tap to add, then change the name.'),
    h('div.st-chips', {}, PEOPLE_TAPS.map(([l, heir]) => chip(`+ ${l}`, false, () => { const list = [...people]; list.push({ id: uid(list), name: l.replace(/^A /, ''), heir }); put({ people: list }); }))),
    people.map((p, i) => h('div.st-field', { style: { borderTop: '2px solid var(--border-row)', paddingTop: '10px' } },
      h('div.st-flabel', {}, 'Name'), h('div.st-box', {}, h('div.in', {}, h('input', { type: 'text', autocomplete: 'off', id: `hp_${p.id}`, 'aria-label': 'Name', value: p.name ?? '',
        onInput: e => { const list = [...(api.mine().people || [])]; list[i] = { ...list[i], name: e.target.value }; api.remember({ people: list }); api.save(); } }))),
      h('div.st-flabel', { style: { marginTop: '8px' } }, 'Who they are to you, for an inherited account'),
      h('div.st-chips', {}, Object.entries(ES_HEIRS).map(([k, l]) => chip(l, p.heir === k, () => { const list = [...people]; list[i] = { ...p, heir: k }; put({ people: list }); }))),
      h('div.st-row', { style: { marginTop: '6px' } }, btn('Remove', () => put({ people: people.filter((_, k) => k !== i), items: items.map(it => { const to = { ...(it.to || {}) }; delete to[p.id]; return { ...it, to }; }) }), 'slim')))));

  let ans = null;
  const refresh = () => { const f = answerCard(); ans.replaceWith(f); ans = f; };
  const thingRow = (it, i) => {
    const change = (patch, typing) => { const list = [...(api.mine().items || [])]; list[i] = { ...list[i], ...patch }; api.remember({ items: list }); if (typing) { api.save(); refresh(); } else api.render(); };
    return h('div.st-field', { style: { borderTop: '2px solid var(--border-row)', paddingTop: '10px' } }, h('div.st-flabel', {}, it.name, h('span.st-soft', { style: { fontWeight: 500 } }, ` · ${ES_KINDS[it.kind]}`)),
      numBox('What it is worth today', it.value ?? null, [], (v, typing) => change({ value: v }, typing), { id: `hv_${it.id}`, help: it.kind === 'life' ? 'What the policy pays out.' : null }),
      ES_BASIS.includes(it.kind) ? numBox('What you paid for it', it.basis ?? null, [], (v, typing) => change({ basis: v }, typing), { id: `hb_${it.id}`, help: 'With improvements, for a home. Leave it empty if you do not know: the step-up shows once it is in.' }) : null,
      h('div.st-flabel', { style: { marginTop: '8px' } }, people.length ? 'Who gets it (tap more than one to share it equally)' : 'Who gets it: add your people above first'),
      h('div.st-chips', {}, people.map(p => chip(p.name || 'No name yet', !!(it.to || {})[p.id], () => { const to = { ...(it.to || {}) }; if (to[p.id]) delete to[p.id]; else to[p.id] = 1; change({ to }); }))),
      h('div.st-row', { style: { marginTop: '6px' } }, btn('Remove', () => put({ items: items.filter((_, k) => k !== i) }), 'slim')));
  };
  const thingsCard = h('div.st-card', { id: 'things' }, h('h2', { style: { marginTop: 0 } }, 'What you would leave'),
    h('p.st-small.st-soft', { style: { marginTop: 0 } }, 'Tap each thing. Rough values are fine.'),
    h('div.st-chips', {}, THING_TAPS.map(([name, kind]) => chip(`+ ${name}`, false, () => { const list = [...items]; list.push({ id: uid(list), name, kind, value: null, basis: null, to: {} }); put({ items: list }); }))),
    items.map(thingRow),
    h('div.st-field', {}, h('div.st-flabel', {}, 'If it happened'), h('div.st-chips', {}, [[0, `This year (${year})`], [10, `In 10 years (${year + 10})`], [20, `In 20 years (${year + 20})`]].map(([v, l]) => chip(l, when === v, () => put({ when: v }))))),
    h('div.st-field', {}, h('div.st-flabel', {}, 'Had you started your required withdrawals by then?'), h('div.st-chips', {}, [[false, 'Not yet'], [true, 'Yes']].map(([v, l]) => chip(l, (M.started === true) === v, () => put({ started: v })))),
      h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'They start at 73 or 75, by the year you were born. It changes the rule for some heirs.')),
    people.length || items.length ? null : h('div.st-row', {}, btn('Try with example numbers', () => put({ ...EXAMPLE }), 'slim')));

  function answerCard() {
    const S = sim();
    if (!S.ready) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'What each person receives shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'Add a person and one thing with a value, and tap who gets it.'));
    const E = S.estate, rows = S.people.map(r => {
      const bits = [r.pretax ? `${big(r.pretax)} from a traditional account: income tax when they take it out. ${RULE_WORDS[r.rule](r)}` : null,
        r.roth ? `${big(r.roth)} from a Roth account: no tax on it. ${RULE_WORDS[r.rule](r)}` : null,
        r.erased ? `The step-up wipes out ${big(r.erased)} of gain: sold soon after, little or no tax on it.` : null,
        r.basisUnknown ? `${big(r.basisUnknown)} with no price paid typed: the step-up shows once it is in.` : null,
        r.life ? `${big(r.life)} of life insurance: not income for them.` : null].filter(Boolean);
      return h('li', {}, h('span.dot', {}, ''), h('span', {}, r.name || 'No name yet', bits.map(b => h('small', {}, b))), h('span.when', {}, big(r.gets)));
    });
    const fed = E.federal, ny = E.ny;
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, `If it happened in ${deathYear}`),
      h('div.st-soft', {}, 'Your people receive'), h('div.st-big', {}, big(S.assigned)),
      h('p', { style: { fontWeight: 700 } }, S.erased ? `And the step-up wipes out ${big(S.erased)} of gain nobody pays income tax on.` : 'Each person\'s part, and the rule that comes with it, is below.'),
      h('ul.st-list', {}, rows,
        S.unassigned.length ? h('li', {}, h('span.dot', {}, ''), h('span', {}, 'Not given to anyone yet', h('small', {}, 'With no form and no will, state law decides. In New York that leaves out partners you are not married to and friends.')), h('span.when', {}, big(S.total - S.assigned))) : null,
        S.noValue.length ? h('li', {}, h('span.dot', {}, ''), h('span', {}, 'A value to look up', h('small', {}, `${S.noValue.length} ${S.noValue.length === 1 ? 'thing has' : 'things have'} no value yet`)), h('span.when', {}, '')) : null),
      h('div.st-eyebrow', { style: { marginTop: '12px' } }, 'Estate tax lines'),
      h('ul.st-list', {}, [
        fed ? ['Federal line', `${big(fed.line)} for ${deathYear === year ? 'a death in 2026' : '2026; it moves with inflation'}${E.toSpouse ? `. What goes to a spouse (${big(E.toSpouse)}) comes off first.` : ''}`, fed.state === 'over' ? `${big(fed.over)} over` : `${big(fed.room)} under`] : null,
        ny ? ['New York line', ny.state === 'cliff' ? `Between the line and the cliff (${big(ny.cliff)}): the credit shrinks fast here. Bring this to a lawyer.` : ny.state === 'over' ? 'Over the cliff: the whole estate is taxed by New York, not only the part over the line. Bring this to a lawyer.' : `${big(ny.line)} for 2026, before any deductions; the cliff is at ${big(ny.cliff)}.`, ny.state === 'under' ? `${big(ny.room)} under` : big(E.total)] : null,
      ].filter(Boolean).map(([l, s, v]) => h('li', {}, h('span.dot', {}, ''), h('span', {}, l, h('small', {}, s)), h('span.when', {}, v)))),
      h('details.st-fold', {}, h('summary', {}, 'Show the math'),
        h('p.st-small', {}, 'Each thing is shared equally among the people you tapped for it. The step-up: its value today less what you paid, for shares and a home; the gain while you owned it is not taxed as income for them.'),
        h('p.st-small', {}, `The 10 years: December 31 of the 10th year after the year of death (${deathYear} + 10 = ${deathYear + 10}).`),
        h('p.st-small', {}, `The federal line: everything you leave (${big(E.total)}) less what goes to a spouse (${big(E.toSpouse)}) = ${big(E.fedBase)}, against ${big(R0.federalExclusion)}. New York: ${big(E.total)} against ${big(R0.nyExclusion)}, and the cliff at ${pct(R0.nyCliffShare)} of it. A lawyer works out the real taxable estate (debts, costs and gifts change it).`)),
      lawyerNote(D));
  }
  ans = answerCard();

  // the 10 years, for one person with a traditional account
  const S = sim(), withPre = S.ready ? S.people.filter(r => r.pretax > 0) : [];
  const T = M.ten || {}, pick = withPre.find(r => r.id === T.who) ?? withPre[0] ?? null;
  const setT = (patch, typing) => { api.remember({ ten: { ...(api.mine().ten || {}), ...patch } }); if (typing) { api.save(); const f = tenCard(); tenEl.replaceWith(f); tenEl = f; } else api.render(); };
  function tenCard() {
    if (!pick) return h('div.st-card', { id: 'ten' }, h('h2', { style: { marginTop: 0 } }, 'The 10 years of an inherited account'), h('p.st-small', { style: { margin: 0 } }, 'Give someone a 401(k) or a traditional IRA above, and how and when they take it out shows here, with the federal tax on each way.'));
    const t = api.mine().ten || {}, status = t.status ?? 'single', growth = t.growth ?? 0;
    const X = esTenYear({ balance: pick.pretax, growth, other: t.other ?? null, status, deathYear, started: S.started && pick.rule === 'ten' }, taxOf(ref));
    const ruleLine = pick.rule === 'ten' ? null : h('p.st-small', {}, `${pick.name || 'This person'}: ${RULE_WORDS[pick.rule](pick)} The 10 years below are one way they may choose.`);
    return h('div.st-card', { id: 'ten' }, h('h2', { style: { marginTop: 0 } }, 'The 10 years of an inherited account'),
      withPre.length > 1 ? h('div.st-field', {}, h('div.st-flabel', {}, 'For'), h('div.st-chips', {}, withPre.map(r => chip(r.name || 'No name yet', r.id === pick.id, () => setT({ who: r.id }))))) : null,
      ruleLine,
      numBox(`${pick.name || 'Their'}${pick.name ? '\'s' : ''} own income a year, before taxes`, t.other ?? null, [0, 30000, 50000, 75000, 100000, 150000], (v, typing) => setT({ other: v }, typing), { id: 'ten_other', help: 'Their pay and other income. 0 is an answer.' }),
      h('div.st-field', {}, h('div.st-flabel', {}, 'They file'), h('div.st-chips', {}, [['single', 'Single'], ['joint', 'Married, jointly'], ['head', 'Head of household']].map(([v, l]) => chip(l, status === v, () => setT({ status: v }))))),
      h('div.st-field', {}, h('div.st-flabel', {}, 'It grows a year, after inflation'), h('div.st-chips', {}, [[0, '0%'], [0.04, '4%'], [ref.presets.realReturn.default, `${pct(ref.presets.realReturn.default)} (the plan's)`]].map(([v, l]) => chip(l, growth === v, () => setT({ growth: v }))))),
      !X.ready ? h('p.st-soft', { style: { marginBottom: 0 } }, 'Their own income, and the three ways appear.') : [
        h('ul.st-list', {}, Object.keys(ES_WAYS).map(w => { const Y = X.ways[w];
          return h(`li${X.best === w ? '.done' : ''}`, {}, h('span.dot', {}, X.best === w ? '✓' : ''), h('span', {}, ES_WAYS[w], h('small', {}, Y.ready ? `${big(Y.out)} out, ${big(Y.tax)} federal tax (${pct(Y.share)}), ${big(Y.kept)} kept` : 'Not open here: the owner had started required withdrawals, so one comes out every year.')), h('span.when', {}, Y.ready ? big(Y.tax) : '')); })),
        h('p', { style: { fontWeight: 700, margin: '8px 0 0' } }, X.saves > 0 ? `${ES_WAYS[X.best]} keeps ${big(X.saves)} more than the costliest way, at today's tax brackets.` : 'The three ways come out the same here.'),
        X.started ? h('p.st-small', {}, D.facts.tenYearYearly.text) : null,
        h('details.st-fold', {}, h('summary', {}, 'Show the math'),
          h('p.st-small', {}, `Each year it grows ${pct(X.growth)}, then the withdrawal comes out at the end of the year. Spread over the 10 years: the balance divided by the years left, so year 10 empties it. The tax on a withdrawal is the federal tax on their income plus it, less the tax on their income alone (2026 brackets, the standard deduction, in today's dollars). No state tax here.`),
          h('ul.st-list', {}, X.ways.even.rows.map(r => h('li', {}, h('span.dot', {}, ''), h('span', {}, `Year ${r.k}${r.year ? `, ${r.year}` : ''}`, h('small', {}, `${big(r.tax)} tax`)), h('span.when', {}, big(r.out))))))]);
  }
  let tenEl = tenCard();

  $('main').replaceChildren(h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Estate and marriage'), h('h1', {}, 'What would my people receive?'),
    h('p', { style: { marginBottom: 0 } }, 'Who gets what you leave, what the step-up in basis saves them, and the 10 years of an inherited account. Made-up or rough numbers are fine: nothing here is kept unless you turn it on.')),
  peopleCard, thingsCard, ans, tenEl, estateLinks(D, 'heirs'),
  estateSources(D, ['beneficiaryWins', 'stepUp', 'inheritIncome', 'lifeInsurance', 'tenYear', 'tenYearYearly', 'eligible', 'federalExclusion', 'marital', 'nyExclusion', 'nyCliff', 'noWillNy']), keepCard(api));
  withExit({ neutral: true });
}

// ---------- Married or partners? (married.html) ----------
function marriedDraw(api, D) {
  foot();
  const ref = api.ref, M = api.mine(), P = M.p || [{ name: '' }, { name: '' }];
  const nameOf = i => (P[i]?.name || '').trim() || (i === 0 ? 'You' : 'Your person');
  const whose = (i, low = false) => ((P[i]?.name || '').trim() ? `${nameOf(i)}'s` : `${low ? 'y' : 'Y'}our${i === 0 ? '' : ' person\'s'}`);
  let ans = null;
  const set = (i, patch, typing) => { const list = [0, 1].map(k => ({ ...(api.mine().p || [{}, {}])[k] })); list[i] = { ...list[i], ...patch }; api.remember({ p: list }); if (typing) { api.save(); const f = answerCard(); ans.replaceWith(f); ans = f; } else api.render(); };
  const run = () => { const m = api.mine(), p = m.p || [{}, {}];
    return esCompare({ people: [0, 1].map(i => ({ name: nameOf(i), pay: p[i]?.pay ?? null, pia: p[i]?.pia ?? null })), cover: m.coverBy === 0 || m.coverBy === 1 ? m.cover ?? 0 : 0, coverBy: m.coverBy === 1 ? 1 : 0 },
      { taxOf: taxOf(ref), spousalOf: (own, other) => spousalExcess(own, other, ref.socialSecurity) }); };
  const personCard = i => h('div.st-card', { id: `person${i}` }, h('h2', { style: { marginTop: 0 } }, nameOf(i)),
    numBox('Pay a year, before taxes', P[i]?.pay ?? null, [0, 30000, 50000, 75000, 100000, 150000, 250000], (v, typing) => set(i, { pay: v }, typing), { id: `mp_${i}`, help: '0 is an answer.' }),
    numBox('Social Security at full retirement age, a month (optional)', P[i]?.pia ?? null, [], (v, typing) => set(i, { pia: v }, typing), { id: `ms_${i}`, help: 'From the statement at ssa.gov/myaccount. Leave it empty to skip Social Security.' }));
  const namesCard = h('div.st-card', { id: 'names' }, h('h2', { style: { marginTop: 0 } }, 'The two of you'), h('p.st-small.st-soft', { style: { marginTop: 0 } }, 'Names are optional: they only label the cards below.'),
    [0, 1].map(i => h('div.st-field', {}, h('div.st-flabel', {}, i === 0 ? 'Your name' : 'Your person\'s name'), h('div.st-box', {}, h('div.in', {}, h('input', { type: 'text', autocomplete: 'off', id: `mn_${i}`, 'aria-label': i === 0 ? 'Your name' : 'Your person\'s name', value: P[i]?.name ?? '', onInput: e => set(i, { name: e.target.value }, true) }))))));
  const by = M.coverBy === 0 || M.coverBy === 1 ? M.coverBy : null;
  const coverCard = h('div.st-card', { id: 'cover' }, h('h2', { style: { marginTop: 0 } }, 'Job health cover'),
    h('div.st-field', {}, h('div.st-flabel', {}, 'Does one job cover the other person?'), h('div.st-chips', {}, [[null, 'No'], [0, `${whose(0)} job`], [1, `${whose(1)} job`]].map(([v, l]) => chip(l, by === v, () => { api.remember({ coverBy: v }); api.render(); })))),
    by == null ? null : numBox('What the employer pays for that cover, a year', M.cover ?? null, [], (v, typing) => { api.remember({ cover: v }); if (typing) { api.save(); const f = answerCard(); ans.replaceWith(f); ans = f; } else api.render(); }, { id: 'mc', help: 'On the pay stub or from HR: the employer\'s part for the other person. Unmarried, it is added to taxable pay.' }));

  function answerCard() {
    const R = run();
    if (!R.ready) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'The difference shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'Both people\'s pay a year (0 is an answer), and it appears.'));
    const d = R.taxDiff, ss = R.ss;
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'Federal income tax, 2026'),
      h('div.st-soft', {}, Math.abs(d) < 1 ? 'Married or not, the federal tax is about the same' : d > 0 ? 'Married and filing jointly, the federal tax is lower by' : 'Married and filing jointly, the federal tax is higher by'),
      h('div.st-big', {}, Math.abs(d) < 1 ? big(0) : `${big(Math.abs(d))} a year`),
      h('ul.st-list', {}, [
        ['Two single returns', `${nameOf(0)}: ${big(R.single[0])}, ${nameOf(1)}: ${big(R.single[1])}`, big(R.single[0] + R.single[1])],
        R.coverTax ? ['Tax on the partner cover', `${big(R.cover)} added to ${whose(R.coverBy, true)} taxable pay while you are not married`, big(R.coverTax)] : null,
        ['One joint return', 'Married filing jointly', big(R.joint)],
        ss ? ['Social Security: the spousal top-up', ss.map(s => `${s.name}: ${big(s.spousal)} a month`).join(', '), `${big(R.ssYear)} a year`] : null,
        ss ? ['Social Security: if one of you dies', ss.map(s => `${s.name}: ${big(s.survivor)} a month${s.survivorMore ? ` (${big(s.survivorMore)} more)` : ''}`).join(', '), ''] : null,
      ].filter(Boolean).map(([l, s, v]) => h('li', {}, h('span.dot', {}, ''), h('span', {}, l, h('small', {}, s)), h('span.when', {}, v)))),
      h('p.st-small', {}, ss ? 'As domestic partners in New York, the Social Security lines are 0: Social Security does not count a New York partnership as a marriage.' : 'Add both Social Security amounts to see the spousal top-up and the survivor benefit.'),
      h('details.st-fold', {}, h('summary', {}, 'Show the math'),
        h('p.st-small', {}, 'Each tax is the federal income tax of the whole app on pay before taxes, with the 2026 standard deduction and brackets for that filing status. Head of household, credits and state tax are left out: New York\'s joint brackets wait for a check.'),
        h('p.st-small', {}, `The partner cover: the tax on ${whose(R.coverBy, true)} pay plus the cover, less the tax on the pay alone, on a single return.`),
        h('p.st-small', {}, `The spousal top-up at full retirement age: half the other person's amount, less your own, never below 0. The survivor keeps the larger of the two. Both need the marriage to have lasted (1 year for the top-up, 9 months for a survivor).`)),
      lawyerNote(D));
  }
  ans = answerCard();

  const F = D.facts;
  const DIFF = [
    ['Filing taxes', 'File jointly or separately as married.', F.dpFederal.text, 'dpFederal'],
    ['Job health cover', 'Tax-free for a spouse.', `${F.dpCover.text} ${F.dpCoverNy.text}`, 'dpCover'],
    ['Social Security', `${F.ssSpouse.text} ${F.ssSurvivor.text}`, F.ssPartner.text, 'ssPartner'],
    ['With no will', 'A spouse is first on New York\'s list.', F.noWillNy.text, 'noWillNy'],
    ['Estate and gift tax', F.marital.text, `Gifts over ${big(ref.estate.giftAnnual)} a person a year go on a gift tax form; there is no marital deduction.`, 'marital'],
    ['An inherited IRA', 'A spouse can treat it as their own.', 'A partner follows the 10 years, unless not more than 10 years younger, disabled or chronically ill.', 'eligible'],
    ['Making it official in New York', 'A marriage license, statewide.', F.nycRegister.text, 'nycRegister'],
  ];
  const diffCard = h('div.st-card', { id: 'diff' }, h('h2', { style: { marginTop: 0 } }, 'What changes, New York first'),
    DIFF.map(([topic, wed, dp]) => h('details.st-fold', {}, h('summary', {}, topic), h('p.st-small', {}, h('b', {}, 'Married: '), wed), h('p.st-small', {}, h('b', {}, 'Domestic partners: '), dp))),
    h('p.st-small.st-soft', { style: { marginBottom: 0 } }, 'Married or not, the papers are how your people get a say: a health care proxy, a power of attorney, a will and the forms on each account. ', h('a', { href: 'kin.html' }, 'Write the summary for a lawyer'), '.'));

  $('main').replaceChildren(h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Estate and marriage'), h('h1', {}, 'Married or partners?'),
    h('p', { style: { marginBottom: 0 } }, 'What marriage changes for two people, next to a domestic partnership: federal tax, job health cover and Social Security, New York first. Your numbers stay on this page unless you keep them.')),
  namesCard, personCard(0), personCard(1), coverCard, ans, diffCard, estateLinks(D, 'married'),
  estateSources(D, ['dpFederal', 'dpCover', 'dpCoverNy', 'ssSpouse', 'ssSurvivor', 'ssPartner', 'noWillNy', 'marital', 'giftAnnual', 'eligible', 'nycRegister']), keepCard(api));
  withExit({ neutral: true });
}

const DRAW = { heirs: heirsDraw, married: marriedDraw };
const page = document.documentElement.dataset.estate;
if (DRAW[page]) fetch('data/sources/estate-2026.json').then(r => r.json()).then(D => boot(page, api => DRAW[page](api, D), { private: true }));
