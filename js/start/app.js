// SPDX-License-Identifier: AGPL-3.0-only
// The self-serve journey's screen (start.html). It only shows what js/journey.js returns: no math here. The household
// lives in the same browser storage as the coach app (js/storage.js), so both read one file and nothing is asked twice.
import { h, clear } from '../ui/dom.js';
import { Store, exportFile } from '../records.js';
import { localAdapter, memoryAdapter, loadClient, createClient, autosave } from '../storage.js';
import { SITUATIONS, situationOf, situationSet, setSituation, questionsFor, benefitOnFile, answerBenefit, startJob, STAGES, QUESTIONS, PAY_WAYS, PAY_FREQUENCIES, SPEND_PARTS, sumParts, answerPay, payOnFile, progressOf, onFile, answer, quickPicks, planOf, movedWords, numbersOf, tweaksOf, setTweak, resetTweaks, previewTweak, whatIf, spanWords, monthWords } from '../journey.js';
import { SOURCES, IDEAS, ideaOf, ideasBy, creditWords } from '../registry/credits.js';
import { fmt } from '../math/result.js';
import { LEVELS, levelsOf, sharpnessOf, levelOf } from '../sharpen.js';
import { growthOf, flowOf, debtOf, timelineOf } from '../charts.js';
import { growthChart, flowChart, debtChart, timelineChart } from './charts-ui.js';

const [ref, priors, flags] = await Promise.all([fetch('data/reference-2026.json').then(r => r.json()), fetch('data/priors-2026.json').then(r => r.json()), fetch('data/flags.json').then(r => r.json())]);

let adapter;
try { localStorage.setItem('slam.test', '1'); localStorage.removeItem('slam.test'); adapter = localAdapter(); } catch { adapter = memoryAdapter(); }
// What this screen remembers about itself (never money): which plan is open, where you were, whether the tour ran.
const MINE = 'slam.start';
const mine = () => adapter.get(MINE) || {};
const remember = patch => adapter.set(MINE, { ...mine(), ...patch });

let store, saver;
function open(doc) {
  saver?.flush(); saver?.stop();
  store = new Store(doc);
  store.who = 'Client';
  saver = autosave(store, adapter);
  remember({ clientId: doc.id });
}
open((mine().clientId && loadClient(adapter, mine().clientId)) || createClient(adapter, 'My plan', new Date().toISOString()));

// Closing the tab or switching apps saves right away (a phone may never come back to finish the usual one-second wait).
for (const ev of ['pagehide', 'visibilitychange']) window.addEventListener(ev, () => saver?.flush());

const $ = id => document.getElementById(id);
const ui = { stage: 'you', q: null, note: null, flash: null, lever: { spendLess: 0, earnMore: 0 }, decade: null, confirmReset: false, way: null, addUp: false, freq: '2 weeks', hours: 40, level: null, form: null, noteAt: null, weeks: null, benefitDraft: null };
const money = v => fmt.money(v);
const P = () => progressOf(store.doc, ref);
const plan = () => planOf(store.doc, ref, priors, { flags });

// Every move is a step in the browser's history, so the phone's Back button (and the Back button on each screen) goes
// to the screen you were on. The address says where you are (#/tune, #/numbers/spending), so a link opens there too.
const hashOf = (stage, q) => `#/${stage}${stage === 'numbers' && q ? `/${q}` : ''}`;
let depth = 0;
function show(stage, { q = null, flash = null } = {}) {
  ui.stage = stage; ui.flash = flash; ui.confirmReset = false; ui.way = null; ui.addUp = false; ui.form = null; ui.benefitDraft = null;
  ui.level = stage === 'sharpen' && levelOf(flash) ? levelOf(flash).id : null; ui.noteAt = null;
  if (q) ui.q = q;
  if (stage !== 'numbers' && stage !== 'sharpen') ui.note = null;
  remember({ stage });
  render();
  window.scrollTo({ top: 0 });
  $('main').focus({ preventScroll: true });
}
function go(stage, { q = null, flash = null, note = null } = {}) {
  const same = stage === ui.stage && (stage !== 'numbers' || !q || q === ui.q);
  ui.note = note;
  if (!same) history.pushState({ stage, q: q ?? ui.q, depth: ++depth }, '', hashOf(stage, q ?? ui.q));
  show(stage, { q, flash });
}
window.addEventListener('popstate', e => {
  const st = e.state ?? (() => { const [, stage, q] = location.hash.split('/'); return { stage: STAGES.some(x => x.id === stage) ? stage : 'you', q: q ?? null, depth: 0 }; })();
  depth = st.depth ?? 0;
  show(st.stage, { q: st.q });
});
const back = () => (depth > 0 ? history.back() : go(STAGES[Math.max(0, STAGES.findIndex(x => x.id === ui.stage) - 1)].id));
const backBar = () => (ui.stage === 'you' ? null : h('div.st-back', {}, h('button.st-btn.slim', { type: 'button', onClick: back }, '‹ Back')));

// ---------- pieces ----------
const btn = (label, onClick, kind = '') => h(`button.st-btn${kind ? '.' + kind.split(' ').join('.') : ''}`, { type: 'button', onClick }, label);
const chip = (label, on, onClick) => h('button.st-chip', { type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick }, label);
const credit = id => { const i = ideaOf(id); return i ? h('button.st-credit', { type: 'button', title: `Where this idea comes from: ${creditWords(id)}`, onClick: () => go('credits', { flash: i.by[0] }) }, `From ${creditWords(id)}`) : null; };
const basisTag = p => h(`span.st-tag${p.basis === 'yours' ? '.yours' : ''}`, {}, p.basis === 'yours' ? 'From your numbers' : p.basis === 'typical' ? p.label : `Part yours, part typical (${p.typical} to go)`);

function top() {
  const p = P();
  clear($('top'),
    h('a.st-brand', { href: '#', onClick: e => { e.preventDefault(); go('you'); } }, 'Stress Less About Money'),
    btn('How this works', () => tour(0), 'slim'),
    h('nav.st-stages', { 'aria-label': 'Steps' }, STAGES.map((s, i) => {
      const locked = s.needs === 'age' && !p.hasAge;
      const done = (s.id === 'you' && p.hasAge) || (s.id === 'numbers' && p.done);
      return h(`button.st-stage${done ? '.done' : ''}`, { type: 'button', disabled: locked, title: locked ? 'Pick the year you were born first' : null, 'aria-current': ui.stage === s.id ? 'step' : null, onClick: () => go(s.id) }, h('span.n', {}, done ? '✓' : i + 1), s.label);
    })));
}

function track(p, pl) {
  if (!p.hasAge) return clear($('track'));
  const toFi = pl.m.fiNumber.value ? Math.min(1, (pl.m.inputs.invested ?? 0) / pl.m.fiNumber.value) : null;
  clear($('track'),
    h('span.st-meter', {}, 'Your picture', h('span.st-pips', { role: 'img', 'aria-label': `${p.count} of ${p.total} answered` }, QUESTIONS.map(q => h(`i${p.answered[q.key] ? '.on' : ''}`))), `${p.count} of ${p.total}`),
    toFi != null && p.done ? h('span.st-meter', {}, 'On the way to FI', h('span.st-bar', {}, h('b', { style: { width: `${Math.max(2, toFi * 100)}%` } })), fmt.pct(toFi)) : null,
    p.done ? (() => { const sh = sharpnessOf(store.doc, true); return h('span.st-meter', {}, 'Sharpness', h('strong', {}, `Level ${sh.done} of ${sh.total}`)); })() : null,
    h('span.st-meter', {}, 'Wins so far', h('strong', {}, String(pl.wins))),
    !p.done ? btn(p.count ? 'Keep going' : 'Start the 5 questions', () => go('numbers', { q: p.next }), 'slim primary') : null);
}

// ---------- 1. You ----------
function you(p) {
  const prof = store.doc.profile || {}, now = new Date().getFullYear();
  const decades = []; for (let d = Math.floor((now - 16) / 10) * 10; d >= 1940; d -= 10) decades.push(d);
  const decade = ui.decade ?? (prof.birthYear ? Math.floor(prof.birthYear / 10) * 10 : null);
  const years = decade == null ? [] : Array.from({ length: 10 }, (_, i) => decade + i).filter(y => y <= now - 16);
  const setYear = y => { store.setDoc('profile', { birthYear: y }); render(); };
  const place = prof.state === 'NY' ? (prof.nyc ? 'nyc' : 'ny') : prof.state === 'NJ' ? 'nj' : mine().elsewhere ? 'else' : null;
  const setPlace = k => { remember({ elsewhere: k === 'else' }); store.setDoc('profile', k === 'nyc' ? { state: 'NY', nyc: true } : k === 'ny' ? { state: 'NY', nyc: false } : k === 'nj' ? { state: 'NJ', nyc: null } : { state: null, nyc: null }); render(); };
  return [
    h('div.st-card.hero', {},
      h('div.st-eyebrow', {}, 'Step 1'),
      h('h1', {}, 'A money plan, starting from one tap'),
      h('p', {}, 'Tell us when you were born and you get a plan right away, built from what is typical at your age. Then five quick questions turn it into yours.')),
    h('div.st-card', {},
      h('h2', {}, 'When were you born?'),
      h('div.st-chips', {}, decades.map(d => chip(`${d}s`, decade === d, () => { ui.decade = d; render(); }))),
      years.length ? h('div.st-years', {}, years.map(y => chip(String(y), prof.birthYear === y, () => setYear(y)))) : h('p.st-soft.st-small', { style: { marginTop: '10px' } }, 'Pick the decade, then the year.')),
    h('div.st-card', {},
      h('h2', {}, 'Where do you live?'),
      h('p.st-soft.st-small', {}, 'Costs differ by place, so the typical numbers do too. Skip it if you like.'),
      h('div.st-chips', {}, [['nyc', 'New York City'], ['ny', 'New York, outside the city'], ['nj', 'New Jersey'], ['else', 'Somewhere else']].map(([k, l]) => chip(l, place === k, () => setPlace(k))))),
    h('div.st-card', {},
      h('h2', {}, 'Your work right now'),
      h('p.st-soft.st-small', {}, 'The questions change to fit. You can switch any time, and nothing you entered is asked again.'),
      h('div.st-chips', {}, SITUATIONS.map(([k, l]) => chip(l, situationSet(store.doc) && situationOf(store.doc) === k, () => { setSituation(store, k); render(); })))),
    p.hasAge
      ? h('div.st-row', {}, btn(`I'm ${p.age}. Show my plan`, () => go('numbers', { q: p.next ?? QUESTIONS[0].key }), 'primary big'))
      : h('p.st-soft', {}, 'Your plan shows as soon as you pick a year.'),
  ];
}

// ---------- the plan so far (side card on Your numbers) ----------
function planCard(pl, p) {
  return h('div.st-card.st-sticky', {},
    h('div.st-eyebrow', {}, 'Your plan so far'),
    h('div.st-soft.st-small', {}, 'Work becomes optional'),
    h('div.st-big', {}, !p.done && /^Past /.test(pl.words.fi ?? '') ? 'Taking shape' : pl.words.fi ?? 'Not yet known'),
    basisTag(pl),
    h('dl.st-kv', {},
      h('dt', {}, 'Debt free'), h('dd', {}, pl.words.debtFree ?? 'Not yet known'),
      h('dt', {}, 'Emergency cash'), h('dd', {}, pl.words.efMonths ?? 'Not yet known'),
      h('dt', {}, 'Left each month'), h('dd', {}, pl.words.surplus ?? 'Not yet known')),
    h('p.st-soft.st-small', { style: { marginTop: '12px', marginBottom: 0 } }, p.done ? 'All five answered. These ranges come from your numbers.' : 'Wide ranges are normal at the start. Every answer narrows them.'),
    credit('quantum'));
}

// ---------- 2. Your numbers ----------
const WAY_BOX = { month: 'Take-home pay a month', paycheck: 'One paycheck, after taxes', salary: 'Yearly salary, before taxes', hourly: 'Pay an hour, before taxes' };
const WAY_MAX = { month: [15000, 100], paycheck: [8000, 50], salary: [300000, 1000], hourly: [150, 1] };
function numbers(p, pl) {
  const key = ui.q && QUESTIONS.some(q => q.key === ui.q) ? ui.q : p.next ?? QUESTIONS[0].key;
  const QS = questionsFor(store.doc), q = QS.find(x => x.key === key), at = QS.indexOf(q);
  const benefit = key === 'income' && p.situation === 'between'; // between jobs: what is coming in now, and for how many more weeks
  if (benefit && ui.weeks == null) ui.weeks = benefitOnFile(store.doc).weeks ?? 12;
  const file = onFile(store.doc, key, { ref });
  const how = key === 'income' && !benefit ? payOnFile(store.doc) : null;
  const way = key === 'income' && !benefit ? ui.way ?? 'month' : null; // how pay is given: a month, a paycheck, a salary, an hour
  const parts = key === 'spending' && ui.addUp; // spending, added up from the parts someone can name
  const boxes = way && way !== 'month' ? [{ id: 'takeHome', label: WAY_BOX[way] }] : parts ? SPEND_PARTS.map(([id, label]) => ({ id, label })) : q.boxes;
  const [max, step] = way ? WAY_MAX[way] : [q.max, q.step];
  const start = way && way !== 'month' ? { takeHome: how?.mode === way ? how.amount : null } : parts ? { ...(mine().parts || {}) } : file;
  const vals = Object.fromEntries(boxes.map(b => [b.id, start[b.id] ?? null]));
  if (benefit && ui.benefitDraft != null) vals.benefit = ui.benefitDraft; // a tap on the weeks redraws: keep what was typed
  const picks = way && way !== 'month' ? [] : parts ? [] : quickPicks(pl, key, { doc: store.doc, ref });
  const inputs = {};
  const total = h('strong', {}, money(sumParts(vals)));
  const set = (id, v, { from = null } = {}) => {
    vals[id] = v;
    const { text, range } = inputs[id];
    if (from !== 'text') text.value = v == null ? '' : Number(v).toLocaleString('en-US');
    if (benefit) ui.benefitDraft = v;
    if (range && from !== 'range') range.value = String(Math.min(max, v ?? 0));
    if (parts) total.textContent = money(sumParts(vals));
  };
  const box = (b, i) => {
    const text = h('input', { type: 'text', inputmode: 'numeric', id: `box-${i}`, autocomplete: 'off', placeholder: '0', 'aria-label': b.label, value: vals[b.id] == null ? '' : Number(vals[b.id]).toLocaleString('en-US'),
      onInput: e => { const n = e.target.value.replace(/[^\d.]/g, ''); set(b.id, n === '' ? null : Number(n), { from: 'text' }); }, onKeydown: e => { if (e.key === 'Enter') save(); } });
    const range = parts ? null : h('input', { type: 'range', min: 0, max, step, value: String(Math.min(max, vals[b.id] ?? 0)), 'aria-label': `${b.label}, slider`, onInput: e => set(b.id, Number(e.target.value), { from: 'range' }) });
    inputs[b.id] = { text, range };
    return h('div.st-box', {}, h('label', { for: `box-${i}` }, b.label), h('div.in', {}, h('span', {}, '$'), text), range);
  };
  const after = () => {
    const now = plan(), np = P();
    const note = movedWords(pl, now) ?? 'Saved.';
    if (np.done && !p.done) return go('plan');
    const next = at === QUESTIONS.length - 1 ? np.next ?? key : QUESTIONS[at + 1].key;
    if (next === key) { ui.note = note; ui.way = null; ui.addUp = false; render(); window.scrollTo({ top: 0 }); } else go('numbers', { q: next, note });
  };
  const same = () => p.answered[key] && !benefit && !way?.match(/paycheck|salary|hourly/) && !parts && q.boxes.every(b => (vals[b.id] ?? null) === (file[b.id] ?? null));
  const save = () => {
    if (same()) return after(); // nothing changed: go on without rewriting what is on file
    const ok = benefit ? answerBenefit(store, { weekly: vals.benefit, weeks: ui.weeks }) : way && key === 'income' ? answerPay(store, { mode: way, amount: vals.takeHome, frequency: ui.freq, hours: ui.hours })
      : parts ? (sumParts(vals) > 0 && (remember({ parts: vals }), answer(store, key, { gut: sumParts(vals) })))
        : answer(store, key, vals);
    if (ok) after(); else { $('need').hidden = false; inputs[boxes[0].id].text.focus(); }
  };
  const none = () => { if (benefit) answerBenefit(store, { weekly: 0 }); else answer(store, key, {}, { none: true }); after(); };
  const first = boxes[0].id;
  const pick = (list, on, onPick) => h('div.st-chips', {}, list.map(([k, l]) => chip(l, on === k, () => onPick(k))));
  const ways = key === 'income' && !benefit ? h('div.st-help', {}, h('div.st-small', { style: { fontWeight: 700, marginBottom: '6px' } }, 'Not sure of the monthly number? Tell us what you do know:'), pick(PAY_WAYS, way, k => { ui.way = k; render(); })) : null;
  const extra = benefit ? h('div.st-help', {}, h('div.st-small', { style: { fontWeight: 700, marginBottom: '6px' } }, 'How many more weeks will it last?'), pick([[4, '4'], [8, '8'], [12, '12'], [16, '16'], [20, '20'], [26, '26']], ui.weeks, k => { ui.weeks = k; render(); }))
    : way === 'paycheck' ? h('div.st-help', {}, h('div.st-small', { style: { fontWeight: 700, marginBottom: '6px' } }, 'How often do you get paid?'), pick(PAY_FREQUENCIES, ui.freq, k => { ui.freq = k; render(); }))
    : way === 'hourly' ? h('div.st-help', {}, h('div.st-small', { style: { fontWeight: 700, marginBottom: '6px' } }, 'Hours in a usual week'), pick([[20, '20'], [30, '30'], [40, '40'], [50, '50']], ui.hours, k => { ui.hours = k; render(); })) : null;
  const addUp = key === 'spending' ? h('div.st-help', {}, pick([[false, 'I have a rough number'], [true, 'Help me add it up']], ui.addUp, k => { ui.addUp = k; render(); })) : null;
  const onFileLine = how && way === 'month' ? h('p.st-small.st-soft', { style: { margin: '6px 0 0' } }, how.mode === 'salary' ? `From your ${money(how.amount)} salary, after taxes.` : `From your ${money(how.amount)} paycheck.`) : null;
  return h('div.st-two', {},
    h('div', {},
      ui.note ? h('div.st-note', { role: 'status' }, ui.note) : null,
      h('div.st-card', {},
        h('div.st-qdots', { role: 'tablist', 'aria-label': 'The five questions' }, QS.map((x, i) => h(`button${p.answered[x.key] ? '.done' : ''}`, { type: 'button', 'aria-current': x.key === key ? 'true' : null, title: p.answered[x.key] ? 'Answered. Tap to change it.' : 'Not answered yet', onClick: () => go('numbers', { q: x.key }) }, `${p.answered[x.key] ? '✓ ' : ''}${i + 1}`))),
        h('div.st-eyebrow', {}, `Question ${at + 1} of ${QUESTIONS.length}`),
        h('h1', {}, q.title),
        h('p.st-soft', {}, way === 'salary' || way === 'hourly' ? 'We work out the taxes for you.' : parts ? 'Fill in the ones you know. Leave the rest empty.' : q.help),
        addUp,
        h(`div.st-boxes${parts ? '.tight' : ''}`, {}, boxes.map(box)),
        parts ? h('p', { style: { margin: '8px 0 0' } }, 'That adds up to ', total, ' a month.') : null,
        onFileLine, extra,
        picks.length ? h('div.st-picks', {}, h('div.st-soft.st-small', {}, benefit ? 'Tap one to use it. The last is the most New York pays a week:' : q.boxes.length > 1 ? `Typical at your age for ${q.boxes[0].label.toLowerCase()}. Tap one to use it:` : 'Typical at your age. Tap one to use it:'), h('div.st-chips', {}, picks.map(v => chip(money(v), false, () => set(first, v))))) : null,
        ways,
        h('p.st-small', { id: 'need', hidden: true, role: 'alert', style: { margin: '10px 0 0', fontWeight: 700 } }, q.none ? `Type a number, drag the slider, or tap "${q.none}".` : 'Type a number or drag the slider first.'),
        h('div.st-row', { style: { marginTop: '16px' } },
          btn(p.answered[key] ? 'Save and go on' : at === QUESTIONS.length - 1 ? 'Save and see my plan' : 'Save and go on', save, 'primary big'),
          q.none ? btn(q.none, none) : null,
          !p.answered[key] && at < QUESTIONS.length - 1 ? btn('Skip for now', () => go('numbers', { q: QUESTIONS[at + 1].key, note: 'Skipped. A typical amount stands in until you come back.' }), 'text') : null)),
      p.done ? h('div.st-row', {}, btn('See my plan', () => go('plan'), 'primary')) : null),
    planCard(pl, p));
}

// ---------- 3. Your plan ----------
const STEP_WHY = {
  1: 'A small cushion comes first, so one surprise bill does not land on a credit card.',
  2: 'An employer match is money you get for free. Take all of it before anything else.',
  3: 'Debt at a high rate costs more than investing earns. Clearing it is the best return you have.',
  4: 'A job-loss fund means a rough patch is a pause in the plan, and the plan itself holds.',
  5: 'Tax-free accounts let every dollar grow without tax taking a share later.',
  6: 'Enough invested early can pay for retirement on its own, which frees every later dollar.',
  9: 'From here each dollar invested moves the day work becomes optional.',
};
const STEP_DO = {
  1: 'Open a savings account and move your first $100 into it.',
  2: 'Log in to your plan at work and set your contribution to at least the match.',
  3: 'Set up an automatic extra payment on your highest-rate debt, for the day after payday.',
  4: 'Set up an automatic transfer to savings, for the day after payday.',
  5: 'Open a Roth IRA and set up a monthly deposit.',
  6: 'Raise your 401(k) contribution by 1% of your pay.',
  9: 'Raise what you invest each month by an amount you will not miss.',
};
function yourPlan(p, pl) {
  const fiLine = pl.basis === 'yours' && pl.fi.date && !pl.fi.far ? `around ${pl.fi.date}` : pl.words.fi;
  const tile = (label, n) => h('div.st-tile', {}, h('div.st-soft.st-small', {}, label), h('div.v', {}, n.value ?? 'Needs an answer'), n.idea ? credit(n.idea) : null);
  const nums = numbersOf(pl, store.doc, ref), N = id => nums.find(n => n.id === id);
  const s = pl.step, B = pl.between;
  const gap = B ? h('div.st-card.hero', {},
    h('div.st-eyebrow', {}, 'Between jobs'),
    h('div.st-soft', {}, 'At what you spend now, your money lasts until'),
    h('div.st-big', {}, B.lasts ?? 'Needs your spending'),
    h('p', {}, 'That counts your cash, your benefits until they end, and then your savings and investments, in the order you would use them.'),
    B.job ? h('p', { style: { fontWeight: 700 } }, `Job expected ${B.job.date}, about ${money(Math.round(B.job.monthly))} a month after taxes. `, B.job.covered ? 'Your money covers the gap.' : 'Your money runs short before then, so the first step below matters most.')
      : h('div.st-row', {}, h('span', {}, 'Have a start date or an offer in mind?'), btn('Add the job ahead', () => go('sharpen', { flash: 'ahead' }), 'slim primary')),
    B.job ? h('div.st-row', {}, btn('I started this job', () => { startJob(store, ref); ui.note = null; render(); window.scrollTo({ top: 0 }); }), btn('Change the job ahead', () => go('sharpen', { flash: 'ahead' }), 'text')) : null) : null;
  return [
    gap,
    h('div.st-card.hero', {},
      h('div.st-eyebrow', {}, B ? 'After that' : 'Your plan'),
      h('div.st-soft', {}, 'Work becomes optional'),
      h('div.st-big', {}, B && !B.job ? 'Shows with the job ahead' : fiLine ?? 'Not yet known'),
      B && !B.job ? h('p', {}, 'Benefits alone do not get there. Add when you expect to start and about what it pays, and this fills in.') : pl.basis === 'yours' && pl.fi.age && !pl.fi.far ? h('p', {}, `You would be ${pl.fi.age}. The likely range is ${pl.words.fi}.`) : null,
      h('div.st-row', {}, basisTag(pl), !p.done ? btn(`Answer ${p.total - p.count} more to make it yours`, () => go('numbers', { q: p.next }), 'slim primary') : null)),
    s ? h(`div.st-card${ui.flash === 'next' ? '.flash' : ''}`, {},
      h('div.st-eyebrow', {}, 'Your next step'),
      h('h1', {}, s.name),
      h('p', {}, STEP_WHY[s.id] ?? 'This is where your next dollar does the most.'),
      h('dl.st-kv', { style: { maxWidth: '420px' } },
        s.left != null && s.left > 0 ? [h('dt', {}, 'Left to go'), h('dd', {}, money(Math.round(s.left)))] : null,
        s.date ? [h('dt', {}, 'Done by about'), h('dd', {}, s.date)] : null),
      B ? h('div.st-do', {}, h('div.st-eyebrow', {}, 'Do this week'), h('div', {}, 'Certify for your unemployment benefits, and if you have no health cover, look at a Marketplace plan: losing a job opens a window to sign up.'))
        : STEP_DO[s.id] ? h('div.st-do', {}, h('div.st-eyebrow', {}, 'Do this week'), h('div', {}, STEP_DO[s.id])) : null,
      credit('foo'),
      h('details.st-fold', { style: { marginTop: '10px' } }, h('summary', {}, 'See the whole order'),
        h('ol.st-list', {}, pl.steps.map((x, i) => h(`li${x.status === 'Done' ? '.done' : x.status === 'You are here' ? '.here' : ''}`, {}, h('span.dot', {}, x.status === 'Done' ? '✓' : i + 1), h('span', {}, x.name), h('span.when', {}, x.status)))))) : null,
    h('div.st-tiles', {}, tile('Left over each month', N('surplus')), tile('Savings rate', N('savingsRate')), tile('How long your cash lasts', N('runway')), tile('Net worth', N('netWorth'))),
    h(`div.st-card${ui.flash === 'milestones' ? '.flash' : ''}`, {},
      h('div.st-eyebrow', {}, 'Milestones'),
      h('h2', {}, pl.wins ? `${pl.wins} already done. Here is what comes next.` : 'Wins on the way, soonest first'),
      h('ul.st-list', {}, pl.milestones.map(x => h(`li${x.done ? '.done' : ''}`, {}, h('span.dot', {}, x.done ? '✓' : ''), h('span', {}, x.name, h('small', {}, x.what)), h('span.when', {}, x.date)))),
      credit('milestones')),
    h('div.st-row', {}, btn('See it in pictures', () => go('see'), 'primary big'), btn('Sharpen it', () => go('sharpen')), btn('Tune it', () => go('tune'))),
  ];
}

// ---------- See it: the four pictures ----------
function see(p, pl) {
  const hold = h('div'), res = h('p.st-readout', { role: 'status' });
  const draw = () => {
    const on = ui.lever.spendLess || ui.lever.earnMore, w = on ? whatIf(store.doc, ref, priors, ui.lever) : null;
    const g = growthOf(w?.m ?? pl.m, { age: pl.age });
    hold.replaceChildren(g ? growthChart(g) : h('p.st-soft', {}, 'This picture shows once there is money left over to invest.'));
    res.textContent = !on ? 'Drag a slider and the picture redraws. Nothing here is saved.' : w?.moved == null ? `That leaves ${money(Math.round(w?.surplus ?? 0))} a month.` : w.moved > 0 ? `Work becomes optional ${w.date}, ${spanWords(w.moved)} sooner than ${w.beforeDate}.` : `The date stays at ${w.date}.`;
  };
  const lever = (id, label, max, step) => {
    const out = h('span', {}, `${money(ui.lever[id])} a month`);
    return h('div.st-slide', {}, h('div.top', {}, h('label', { for: `lv-${id}` }, label), out),
      h('input', { type: 'range', id: `lv-${id}`, min: 0, max, step, value: String(ui.lever[id]), onInput: e => { ui.lever[id] = Number(e.target.value); out.textContent = `${money(ui.lever[id])} a month`; draw(); } }));
  };
  draw();
  const ret = tweaksOf(store.doc, ref).find(t => t.id === 'realReturn');
  const f = flowOf(pl.m), d = debtOf(pl.m), t = timelineOf(pl);
  const card = (id, eyebrow, title, body, idea) => h(`div.st-card${ui.flash === id ? '.flash' : ''}`, {}, h('div.st-eyebrow', {}, eyebrow), h('h2', {}, title), body, idea ? credit(idea) : null);
  return [
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'See it'), h('h1', {}, 'Your plan in four pictures'), h('p', { style: { marginBottom: 0 } }, 'Each one is drawn from your numbers. ', pl.basis === 'yours' ? '' : 'Some are still typical for your age, so the pictures sharpen as you answer more.')),
    card('growth', 'Picture 1', 'How your money grows', [hold,
      h('h3', { style: { marginTop: '14px' } }, 'Try it'), lever('spendLess', 'Spend less', 1500, 50), lever('earnMore', 'Earn more', 3000, 100), res,
      h('h3', { style: { marginTop: '14px' } }, 'Growth a year, after inflation'),
      h('div.st-chips', {}, ret.options.map(o => chip(o.label, ret.value === o.value, () => { setTweak(store, ret, o.value); render(); })))], 'growthChart'),
    card('flow', 'Picture 2', 'Where your money goes each month', f ? flowChart(f) : h('p.st-soft', {}, 'This picture needs your pay and your spending.'), 'sankey'),
    card('timeline', 'Picture 3', 'Your path, one win at a time', t ? timelineChart(t) : h('p.st-soft', {}, 'Every milestone on your list is done.'), 'milestones'),
    d ? card('debt', 'Picture 4', 'Your debt, falling to zero', debtChart(d, monthWords), 'avalanche') : card('debt', 'Picture 4', 'Your debt', h('p', { style: { marginBottom: 0 } }, pl.m.inputs.debts.length ? 'Add each debt\'s rate and payment in Sharpen it to see it fall to zero.' : 'No debt on file. Nothing to draw here.'), null),
    h('div.st-row', {}, btn('Sharpen it', () => go('sharpen'), 'primary big'), btn('Tune it', () => go('tune'))),
  ];
}

// ---------- Sharpen it: levels 2 to 10 ----------
function sharpen(p, pl) {
  const L = levelsOf(store.doc), sh = sharpnessOf(store.doc, p.done);
  // Every field is drawn; one that does not apply yet is hidden, so typing a loan balance shows its rate and payment
  // boxes at once without the box being typed in losing its place.
  const field = (f, v, redraw, sync) => {
    const set = (val, { keep = false } = {}) => { v[f.id] = val; if (keep) sync(); else redraw(); };
    const wrap = el => { el.dataset.field = f.id; el.hidden = !!(f.when && !f.when(v)); return el; };
    if (f.type === 'pick') return wrap(h('div.st-field', {}, h('div.st-flabel', {}, f.label), h('div.st-chips', {}, f.options.map(([val, label]) => chip(label, v[f.id] === val, () => set(val))))));
    const pct = f.type === 'pct', shown = v[f.id] == null ? '' : pct ? String(+(v[f.id] * 100).toFixed(2)) : Number(v[f.id]).toLocaleString('en-US');
    const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: '0', 'aria-label': f.label, value: shown, onInput: e => { const n = e.target.value.replace(/[^\d.]/g, ''); set(n === '' ? null : pct ? Number(n) / 100 : Number(n), { keep: true }); } });
    const picks = pct ? f.options.map(o => [o, `${+(o * 100).toFixed(1)}%`]) : (f.picks || []).map(o => [o, money(o)]);
    return wrap(h('div.st-field', {}, h('div.st-flabel', {}, f.label),
      h('div.st-box.narrow', {}, h('div.in', {}, pct ? null : h('span', {}, '$'), input, pct ? h('span', {}, '%') : null)),
      picks.length ? h('div.st-chips', { style: { marginTop: '8px' } }, picks.map(([val, label]) => chip(label, v[f.id] === val, () => set(val)))) : null));
  };
  const form = lv => {
    const def = levelOf(lv.id);
    if (!ui.form || ui.form.id !== lv.id) { const start = def.read(store.doc, ref); if (lv.id === 'where' && mine().parts) { const pt = mine().parts; start.rent ??= pt.housing ?? null; start.food ??= pt.food ?? null; start.transport ??= pt.transport ?? null; } ui.form = { id: lv.id, v: start }; }
    const v = ui.form.v, box = h('div');
    const fields = def.fields(store.doc, ref);
    const sync = () => { for (const f of fields) { const el = box.querySelector(`[data-field="${CSS.escape(f.id)}"]`); if (el) el.hidden = !!(f.when && !f.when(v)); } };
    const redraw = () => box.replaceChildren(...fields.map(f => field(f, v, redraw, sync)));
    redraw();
    // Save goes straight on to the next level that still needs an answer (no trip back to the top): it opens, with
    // what this one unlocked said just above it, and the screen moves to it.
    const save = () => {
      const before = pl; def.write(store, v, ref);
      const after = plan(), moved = movedWords(before, after);
      const open = levelsOf(store.doc).filter(x => x.state === 'open' && x.id !== lv.id);
      const next = open.find(x => x.n > lv.n) ?? open[0] ?? null;
      ui.note = `Level ${lv.n} done. Unlocked: ${lv.unlocks.join(', ')}.${moved ? ` ${moved}` : ''}${next ? '' : ' That was the last level.'}`;
      ui.form = null; ui.level = next?.id ?? null; ui.noteAt = next?.id ?? null; render();
      const el = next ? document.getElementById(`level-${next.id}`) : null;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (document.getElementById('top').offsetHeight + 12) }); else window.scrollTo({ top: 0 });
    };
    return h('div.st-form', {}, box, h('div.st-row', { style: { marginTop: '14px' } }, btn('Save', save, 'primary big'), btn('Close', () => { ui.level = null; ui.form = null; ui.note = null; ui.noteAt = null; render(); }, 'text')));
  };
  const card = lv => {
    const open = ui.level === lv.id;
    return h(`div.st-card.st-level${lv.state !== 'open' ? '.done' : ''}${ui.flash === lv.id ? '.flash' : ''}`, { id: `level-${lv.id}` },
      ui.note && ui.noteAt === lv.id ? h('div.st-note', { role: 'status' }, ui.note) : null,
      h('div.st-levelhead', {}, h('span.st-lvl', {}, lv.state === 'open' ? lv.n : '✓'),
        h('div', {}, h('h2', { style: { margin: 0 } }, `Level ${lv.n}: ${lv.title}`), h('div.st-soft.st-small', {}, lv.note ?? lv.why), h('div.st-small', { style: { marginTop: '4px' } }, h('strong', {}, 'Unlocks: '), lv.unlocks.join(', '))),
        lv.state === 'skip' ? h('span.st-tag.yours', {}, 'Nothing to do') : open ? null : btn(lv.state === 'done' ? 'Change' : 'Answer', () => { ui.level = lv.id; ui.form = null; ui.note = null; ui.noteAt = null; render(); document.getElementById(`level-${lv.id}`)?.scrollIntoView({ block: 'start' }); }, lv.state === 'done' ? 'slim' : 'slim primary')),
      open ? form(lv) : null);
  };
  return [
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Sharpen it'), h('h1', {}, `You are at level ${sh.done} of ${sh.total}`),
      h('p', {}, 'Each level is a few taps and unlocks new numbers. Do them in any order, or stop whenever the plan is clear enough for you.'),
      h('span.st-pips.big', { role: 'img', 'aria-label': `${sh.done} of ${sh.total} levels` }, Array.from({ length: sh.total }, (_, i) => h(`i${i < sh.done ? '.on' : ''}`)))),
    ui.note && !ui.noteAt ? h('div.st-note', { role: 'status' }, ui.note) : null,
    !p.done ? h('div.st-card', {}, h('div.st-levelhead', {}, h('span.st-lvl', {}, 1), h('div', {}, h('h2', { style: { margin: 0 } }, 'Level 1: the five questions'), h('div.st-soft.st-small', {}, `${p.count} of ${p.total} answered.`)), btn('Finish it', () => go('numbers', { q: p.next }), 'slim primary'))) : null,
    L.map(card),
    h('div.st-row', {}, btn('See all your numbers', () => go('all'), 'primary'), btn('See it in pictures', () => go('see'))),
  ];
}

// ---------- 4. Tune it ----------
function tune(p, pl) {
  const tweaks = tweaksOf(store.doc, ref).filter(t => t.show !== false);
  const base = pl.fi.months;
  return [
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Tune it'), h('h1', {}, 'Change an assumption, watch the date move'),
      h('p', { style: { marginBottom: 0 } }, 'Each choice shows the date it gives you. Tap one to use it. To try spending less or earning more, use the sliders on See it. ', base != null && !pl.fi.far ? `Right now: ${pl.fi.date}.` : `Right now: ${pl.words.fi}.`)),
    h('div.st-card', {}, tweaks.map(t => h(`div.st-tweak${ui.flash === t.id ? '.flash' : ''}`, {},
      h('h2', { style: { marginBottom: '2px' } }, t.label), h('div.st-soft.st-small', {}, t.help),
      h('div.st-opts', {}, t.options.map(o => {
        const pv = previewTweak(store.doc, ref, priors, t, o.value);
        return h('button.st-opt', { type: 'button', 'aria-pressed': t.value === o.value ? 'true' : 'false', onClick: () => { setTweak(store, t, o.value); render(); } }, h('b', {}, o.label), o.note ? h('span', {}, o.note) : null, pv.date ? h('em', {}, pv.date) : null);
      })),
      credit(t.id === 'withdrawalRate' && t.value === 0.03 ? 'swrSeries' : t.id === 'withdrawalRate' && t.value === 0.047 ? 'bengen47' : t.id === 'debtOrder' && t.value === 'snowball' ? 'snowball' : t.idea)))),
    h('div.st-row', {}, btn('Back to the standard assumptions', () => { resetTweaks(store, ref); render(); }), btn('See all your numbers', () => go('all'), 'primary')),
  ];
}

// ---------- 5. All your numbers ----------
function allNumbers(p, pl) {
  const nums = numbersOf(pl, store.doc, ref);
  const groups = [...new Set(nums.map(n => n.group))];
  const row = n => h(`div.st-num${ui.flash === n.id ? '.flash' : ''}`, { id: `num-${n.id}` },
    h('div.line', {}, h('span', {}, n.label, n.typical && n.value ? h('span.st-tag', { style: { marginLeft: '8px' } }, 'Uses a typical amount') : null), h('span.v', {}, n.value ?? (n.level ? 'Locked' : 'Needs an answer'))),
    !n.value && n.level ? h('div.st-row', { style: { marginTop: '6px' } }, h('span.st-small.st-soft', {}, `Opens with level ${levelsOf(store.doc).find(l => l.id === n.level)?.n ?? ''}: ${levelOf(n.level).title}.`), btn('Answer it', () => go('sharpen', { flash: n.level }), 'slim primary')) : null,
    n.value && n.sharper ? h('div.st-row', { style: { marginTop: '6px' } }, h('span.st-small.st-soft', {}, 'A guess for now.'), btn('Make it real', () => go('sharpen', { flash: n.sharper }), 'slim')) : null,
    n.ask.length ? h('div.st-row', { style: { marginTop: '6px' } }, n.ask.map(k => btn(`Answer: ${QUESTIONS.find(q => q.key === k).boxes[0].label.toLowerCase()}`, () => go('numbers', { q: k }), 'slim primary'))) : null,
    n.text ? h('details', {}, h('summary', {}, 'How this is worked out'), h('p.st-small', { style: { margin: '4px 0 0' } }, n.text)) : null,
    n.idea ? credit(n.idea) : null);
  return [
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'All your numbers'), h('h1', {}, `${nums.filter(n => n.value).length} numbers, each one explained`),
      h('p', { style: { marginBottom: 0 } }, 'Tap "How this is worked out" on any of them. A tag shows when a number still leans on a typical amount.')),
    groups.map(g => h('div.st-card', {}, h('h2', {}, g), nums.filter(n => n.group === g).map(row))),
    h('div.st-row', {}, btn('Who these ideas come from', () => go('credits'), 'primary')),
  ];
}

// ---------- 6. Credits ----------
function credits(p) {
  const order = Object.keys(SOURCES).sort((a, b) => ideasBy(b).filter(i => i.where).length - ideasBy(a).filter(i => i.where).length);
  return [
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Credits'), h('h1', {}, 'Who each idea comes from'),
      h('p', { style: { marginBottom: 0 } }, `${IDEAS.filter(i => i.where).length} ideas from the FIRE world are built into your plan. Here is who is best known for each, and where to find it.`)),
    h('div.st-people', {}, order.map(k => {
      const s = SOURCES[k];
      return h(`div.st-card${ui.flash === k ? '.flash' : ''}`, {},
        h('h2', { style: { marginBottom: '2px' } }, s.name), h('div.st-soft.st-small', {}, s.who), h('p', { style: { margin: '8px 0 0' } }, s.best),
        s.link ? h('a.st-small', { href: s.link, target: '_blank', rel: 'noopener' }, 'Read the original') : null,
        h('ul', {}, ideasBy(k).map(i => h('li', {}, h('div.st-row.end', {}, h('strong', {}, i.name),
          i.where ? (p.hasAge || i.where.stage === 'you' ? btn('Show me', () => go(i.where.stage, { flash: i.where.at }), 'slim') : null) : h('span.st-later', {}, 'Coming later')),
        h('div.st-soft.st-small', {}, i.plain)))));
    })),
  ];
}

// ---------- the tour ----------
const TOUR = [
  ['Pick the year you were born', 'That alone gives you a plan, built from what is typical at your age. It is a wide range on purpose.'],
  ['Answer five questions', 'Mostly taps and sliders. Rough numbers are fine, and you can skip one and come back. You are never asked the same thing twice.'],
  ['Get your plan', 'One clear next step, the milestones ahead, and the date work becomes optional.'],
  ['See it, sharpen it, tune it', 'Four pictures of your plan. Nine short levels that unlock more numbers. Assumptions you can change to watch the date move. Every number says how it is worked out and whose idea it is.'],
];
function tour(i) {
  const close = () => { remember({ tour: true }); clear($('overlay')); };
  const [title, text] = TOUR[i], last = i === TOUR.length - 1;
  clear($('overlay'), h('div.st-shade', { onClick: e => { if (e.target === e.currentTarget) close(); } },
    h('div.st-tour', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'How this works' },
      h('div.step', {}, i + 1), h('h1', {}, title), h('p', {}, text),
      h('div.st-row.end', {}, h('div.st-tourdots', {}, TOUR.map((_, k) => h(`i${k === i ? '.on' : ''}`))),
        h('div.st-row', {}, i ? btn('Back', () => tour(i - 1)) : btn('Skip', close, 'text'), btn(last ? 'Got it' : 'Next', () => (last ? close() : tour(i + 1)), 'primary'))))));
  $('overlay').querySelector('.primary').focus();
}

// ---------- foot ----------
function foot() {
  const download = () => {
    const blob = new Blob([JSON.stringify(exportFile(store.doc), null, 1)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `my-plan-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
  };
  const over = () => { open(createClient(adapter, 'My plan', new Date().toISOString())); Object.assign(ui, { q: null, note: null, decade: null, lever: { spendLess: 0, earnMore: 0 } }); remember({ elsewhere: false, parts: null }); go('you'); };
  clear($('foot'),
    h('span.grow', {}, 'Your numbers stay in this browser. Nothing is sent anywhere. This is education, not personal financial advice.'),
    btn('Download a backup', download, 'slim'),
    h('a.st-btn.slim', { href: 'index.html' }, 'Open the full app'),
    ui.confirmReset ? h('span.st-row', {}, 'Start a new plan? This one stays saved in the full app.', btn('Yes, start over', over, 'slim primary'), btn('Keep this one', () => { ui.confirmReset = false; foot(); }, 'slim'))
      : btn('Start over', () => { ui.confirmReset = true; foot(); }, 'slim'));
}

const SCREENS = { you, numbers, plan: yourPlan, see, sharpen, tune, all: allNumbers, credits };
function render() {
  const p = P();
  if (!p.hasAge && STAGES.find(s => s.id === ui.stage)?.needs === 'age') ui.stage = 'you';
  const pl = p.hasAge ? plan() : null;
  top(); track(p, pl);
  clear($('main'), backBar(), SCREENS[ui.stage](p, pl));
  foot();
  const lit = $('main').querySelector('.flash');
  if (lit) { lit.querySelector('details')?.setAttribute('open', ''); setTimeout(() => lit.scrollIntoView({ block: 'center' }), 0); }
}

// Come back where you left off: the plan when the picture is done, the next question when it is not.
const start = P();
const [, linked, linkedQ] = location.hash.split('/'); // a link to a screen (#/tune) opens there
ui.stage = STAGES.some(x => x.id === linked) ? linked : !start.hasAge ? 'you' : start.done ? (['plan', 'see', 'sharpen', 'tune', 'all', 'credits'].includes(mine().stage) ? mine().stage : 'plan') : 'numbers';
ui.q = QUESTIONS.some(x => x.key === linkedQ) ? linkedQ : start.next;
history.replaceState({ stage: ui.stage, q: ui.q, depth: 0 }, '', hashOf(ui.stage, ui.q));
render();
if (!mine().tour) tour(0);
