// SPDX-License-Identifier: AGPL-3.0-only
// The self-serve journey's screen (start.html). It only shows what js/journey.js returns: no math here. The household
// lives in the same browser storage as the coach app (js/storage.js), so both read one file and nothing is asked twice.
import { h, clear } from '../ui/dom.js';
import { Store, exportFile, importFile } from '../records.js';
import { localAdapter, memoryAdapter, loadClient, saveClient, createClient, autosave } from '../storage.js';
import { SITUATIONS, situationOf, situationSet, setSituation, questionsFor, benefitOnFile, answerBenefit, startJob, STAGES, QUESTIONS, PAY_WAYS, PAY_FREQUENCIES, SPEND_PARTS, sumParts, answerPay, payOnFile, progressOf, onFile, answer, quickPicks, planOf, movedWords, numbersOf, statementsOf, blurOf, tweaksOf, setTweak, resetTweaks, previewTweak, whatIf, spanWords, monthWords } from '../journey.js';
import { SOURCES, IDEAS, ideaOf, ideasBy, creditWords } from '../registry/credits.js';
import { fmt } from '../math/result.js';
import { LEVELS, levelsOf, sharpnessOf, levelOf } from '../sharpen.js';
import { growthOf, flowOf, debtOf, timelineOf } from '../charts.js';
import { growthChart, flowChart, debtChart, timelineChart } from './charts-ui.js';
import { lifeScreen } from './life-ui.js';
import { drillsOf, skillsOf, priceTagOf } from '../drills.js';
import { lifeOf } from '../lifetime/inputs.js';
import { WORRIES, WORRY_GROUPS, worryOf } from '../worries.js';
import { homeOf, scheduleOf, rentOrBuy, HOME_PRICES, HOME_DOWNS, HOME_RATES, HOME_NOW, HOME_PMI, HOME_CLOSING, HOME_GUESS, HOME_GROWTHS, HOME_INVEST, HOME_HORIZONS, HOME_RENT_GROWTHS, HOME_SELLING, interestNote } from '../home.js';
import { MIRRORS, mirrorOf, pctToFi, snapshotOf, auditOf, auditWords, FEELINGS, valuesOf, sinceWords } from '../mirror.js';
import { readFile } from '../import/apps.js';
import { spendMoreOf, SPEND_AGES, feesOf, FEE_PICKS, FEE_YEARS, movesOf, LIFE_SIDES, CHECKUP, CHECK_ANSWERS, checkupOf, HAPPENS, MEET, meetOf, packMeet, unpackMeet, NEXT_ASKS, nextDollarOf, climbOf, RAISES, KEPT, raiseOf, RAISE_SCRIPT, HABITS, SPANS, startedOf, FEEL, datesOf, PARENT_ASKS, PARENT_HELP } from '../extras.js';
import { dedupe, importTransactions } from '../import/csv.js';

const [ref, priors, flags] = await Promise.all([fetch('data/reference-2026.json').then(r => r.json()), fetch('data/priors-2026.json').then(r => r.json()), fetch('data/flags.json').then(r => r.json())]);
const hist = await fetch('data/history-returns.json').then(r => r.json());

let adapter;
try { localStorage.setItem('slam.test', '1'); localStorage.removeItem('slam.test'); adapter = localAdapter(); } catch { adapter = memoryAdapter(); }
// What this screen remembers about itself (never money): which plan is open, where you were, whether the tour ran.
const MINE = 'slam.start';
const here = () => adapter.get(MINE) || {};
const pin = patch => adapter.set(MINE, { ...here(), ...patch });
// What the person chose along the way (their worry, what matters most, a home priced, drills done) is theirs, so it
// lives in their file and travels with a backup.
const mine = () => store?.doc.settings?.start || {};
const remember = patch => store.setDoc('settings', { start: { ...mine(), ...patch } });

let store, saver;
function open(doc) {
  saver?.flush(); saver?.stop();
  store = new Store(doc);
  store.who = 'Client';
  saver = autosave(store, adapter);
  pin({ clientId: doc.id });
  const old = here(), keep = ['worry', 'home', 'parts', 'life', 'done', 'elsewhere'].filter(k => old[k] != null);
  if (!doc.settings?.start && keep.length) remember(Object.fromEntries(keep.map(k => [k, old[k]]))); // choices made before they moved into the file
}
open((here().clientId && loadClient(adapter, here().clientId)) || createClient(adapter, 'My plan', new Date().toISOString()));

// Closing the tab or switching apps saves right away (a phone may never come back to finish the usual one-second wait).
for (const ev of ['pagehide', 'visibilitychange']) window.addEventListener(ev, () => saver?.flush());

const $ = id => document.getElementById(id);
// A private link: the whole plan, squeezed into the link itself. Nothing is uploaded; whoever has the link has the plan.
const LINK = '#/open/';
async function pack(doc) {
  const file = exportFile(doc); file.household = { ...file.household, history: [], snapshots: [] };
  const zipped = new Uint8Array(await new Response(new Blob([JSON.stringify(file)]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  let bin = ''; for (const b of zipped) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function unpack(text) {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return importFile(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text());
}
const carried = location.hash.startsWith(LINK) ? location.hash.slice(LINK.length) : null;
const MEETLINK = '#/meet/', meetIn = location.hash.startsWith(MEETLINK) && location.hash.length > MEETLINK.length ? unpackMeet(location.hash.slice(MEETLINK.length)) : null;
if (carried) history.replaceState(null, '', location.pathname); // the plan does not stay in the address bar
const ui = { stage: 'you', q: null, note: null, flash: null, lever: { spendLess: 0, earnMore: 0 }, decade: null, confirmReset: false, way: null, addUp: false, freq: '2 weeks', hours: 40, level: null, form: null, noteAt: null, weeks: null, benefitDraft: null, price: null, more: false, pic: 'growth', drill: null, tweak: null, worryGroup: null, homeOpen: false, stepsOpen: false, stmtOpen: false, linkNote: null, openCard: null, meetNote: null, dateDraft: null, slot: 0, audit: null, auditNote: null, since: null, valuesOpen: false, loadNote: null };
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
  pin({ stage });
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

// Four tabs and More: everything fits a phone without sideways scrolling.
const TABS = [['plan', 'Plan'], ['see', 'See'], ['drills', 'Practice'], ['sharpen', 'Sharpen']];
const MORE = [['you', 'About you'], ['numbers', 'Your five numbers'], ['life', 'Lifetime plan'], ['tune', 'What if'], ['all', 'All your numbers'], ['summary', 'One-page summary'], ['date', 'Monthly money date'], ['meet', 'Money meeting for two'], ['credits', 'Credits']];
function top() {
  const p = P();
  const tab = (id, label) => h('button.st-stage', { type: 'button', disabled: !p.hasAge, title: p.hasAge ? null : 'Pick the year you were born first', 'aria-current': ui.stage === id ? 'page' : null, onClick: () => { ui.more = false; go(id); } }, label);
  const inMore = MORE.some(([id]) => id === ui.stage);
  clear($('top'),
    h('a.st-brand', { href: '#', onClick: e => { e.preventDefault(); ui.more = false; go('you'); } }, 'Stress Less About Money'),
    h('nav.st-stages', { 'aria-label': 'Sections' }, TABS.map(([id, label]) => tab(id, label)),
      h('button.st-stage', { type: 'button', 'aria-expanded': ui.more ? 'true' : 'false', 'aria-current': inMore ? 'page' : null, onClick: () => { ui.more = !ui.more; top(); } }, 'More')),
    ui.more ? h('div.st-more', {}, MORE.map(([id, label]) => h('button.st-btn', { type: 'button', disabled: !p.hasAge && STAGES.find(x => x.id === id)?.needs === 'age', 'aria-current': ui.stage === id ? 'page' : null, onClick: () => { ui.more = false; go(id); } }, label)),
      h('button.st-btn.text', { type: 'button', onClick: () => { ui.more = false; top(); tour(0); } }, 'How this works')) : null);
}

// One line that says where you are and what is left.
function track(p, pl) {
  if (!p.hasAge) return clear($('track'));
  const sh = p.done ? sharpnessOf(store.doc, true) : null;
  const line = p.done ? `Level ${sh.done} of ${sh.total}. ${pl.wins} ${pl.wins === 1 ? 'win' : 'wins'}.` : `${p.count} of ${p.total} answered.`;
  clear($('track'),
    h('span.st-pips', { role: 'img', 'aria-label': line }, p.done ? Array.from({ length: sh.total }, (_, i) => h(`i${i < sh.done ? '.on' : ''}`)) : QUESTIONS.map(q => h(`i${p.answered[q.key] ? '.on' : ''}`))),
    h('span.st-trackline', {}, line),
    !p.done && ui.stage !== 'numbers' ? btn(p.count ? 'Keep going' : 'Start', () => go('numbers', { q: p.next }), 'slim primary') : null);
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
      h('h1', {}, 'A money plan, starting from one tap'),
      h('p', { style: { marginBottom: 0 } }, 'Pick your birth year and a plan shows right away. Five quick questions make it yours.')),
    h('div.st-card', {},
      h('h2', {}, 'When were you born?'),
      h('div.st-chips', {}, decades.map(d => chip(`${d}s`, decade === d, () => { ui.decade = d; render(); }))),
      years.length ? h('div.st-years', {}, years.map(y => chip(String(y), prof.birthYear === y, () => setYear(y)))) : h('p.st-soft.st-small', { style: { marginTop: '10px' } }, 'Pick the decade, then the year.')),
    p.hasAge
      ? h('div.st-row', {}, btn(`I'm ${p.age}. Show my plan`, () => go('numbers', { q: p.next ?? QUESTIONS[0].key }), 'primary big'))
      : h('p.st-soft', {}, 'Your plan shows as soon as you pick a year.'),
    h('h2', { style: { marginTop: '8px' } }, 'Make it fit you'),
    h('p.st-soft.st-small', {}, 'All optional. Each one is a tap.'),
    h('div.st-card', {},
      h('h2', {}, 'Where do you live?'),
      h('div.st-chips', {}, [['nyc', 'New York City'], ['ny', 'New York, outside the city'], ['nj', 'New Jersey'], ['else', 'Somewhere else']].map(([k, l]) => chip(l, place === k, () => setPlace(k))))),
    h('div.st-card', {},
      h('h2', {}, 'Your work right now'),
      h('div.st-chips', {}, SITUATIONS.map(([k, l]) => chip(l, situationSet(store.doc) && situationOf(store.doc) === k, () => { setSituation(store, k); render(); })))),
    h('div.st-card', {},
      h('h2', {}, 'What matters most to you?'),
      h('div.st-chips', {}, MIRRORS.map(m => chip(m.label, mine().mirror === m.id, () => { remember({ mirror: m.id }); render(); })))),
    h('div.st-card', {},
      h('h2', {}, 'What brought you here?'),
      mine().worry ? h('div.st-row', {}, h('strong', {}, worryOf(mine().worry)?.label), btn('Change', () => { remember({ worry: null }); render(); }, 'slim')) : [
        h('p.st-soft.st-small', {}, 'Optional. Pick one and your plan opens on it.'),
        WORRY_GROUPS.map(([g, label]) => h('details.st-fold', { open: ui.worryGroup === g ? true : null, onToggle: e => { if (e.target.open) ui.worryGroup = g; } }, h('summary', {}, label),
          h('div.st-chips', {}, WORRIES.filter(w => w.group === g).map(w => chip(w.label, false, () => { remember({ worry: w.id }); if (w.sit) setSituation(store, w.sit); render(); })))))]),
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
        h('p.st-small', { id: 'need', hidden: true, role: 'alert', style: { margin: '10px 0 0', fontWeight: 700 } }, q.none ? `Type a number, drag the slider, or tap "${q.none}".` : key === 'income' ? 'Type a number or drag the slider first. No pay coming in right now? Open More, then About you, and pick "I am between jobs".' : 'Type a number or drag the slider first.'),
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
  const off = /^Past /.test(pl.words.fi ?? '') && !(pl.fi.date && !pl.fi.far); // nothing left to invest yet, so there is no date
  const fiLine = off ? 'Not on this path yet' : pl.basis === 'yours' && pl.fi.date && !pl.fi.far ? `around ${pl.fi.date}` : pl.words.fi;
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
  const W = worryOf(mine().worry), done = mine().done || {};
  const worry = W ? h('div.st-card', {},
    h('div.st-row.end', {}, h('div', {}, h('div.st-eyebrow', {}, 'You came here for'), h('h2', { style: { margin: 0 } }, W.label)), btn('Change', () => go('you'), 'slim')),
    h('div.st-row', { style: { marginTop: '10px' } }, W.see.map(([label, stage, at], i) => btn(label, () => (stage === 'numbers' ? go('numbers', { q: at ?? p.next ?? QUESTIONS[0].key }) : go(stage, { flash: at })), i ? 'slim' : 'primary'))),
    W.why ? h('details.st-fold', {}, h('summary', {}, 'Why many people leave it'), h('ul.st-why', {}, W.why.map(t => h('li', {}, t)))) : null,
    h('details.st-fold', { open: ui.stepsOpen ? true : null, onToggle: e => { ui.stepsOpen = e.target.open; } }, h('summary', {}, `First steps (${W.steps.filter((_, i) => done[`worry:${W.id}:${i}`]).length} of ${W.steps.length} done)`),
      h('div.st-ticks', {}, W.steps.map((text, i) => { const id = `worry:${W.id}:${i}`; return h('button.st-tick', { type: 'button', 'aria-pressed': done[id] ? 'true' : 'false', onClick: () => { remember({ done: { ...(mine().done || {}), [id]: !done[id] } }); render(); } }, h('span.box', {}, done[id] ? '✓' : ''), h('span', {}, text)); })))) : null;
  const pct = pctToFi(pl);
  const ring = v => { const r = 20, c = 2 * Math.PI * r, el = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); el.setAttribute('viewBox', '0 0 48 48'); el.setAttribute('width', '48'); el.setAttribute('height', '48');
    el.innerHTML = `<circle cx="24" cy="24" r="${r}" fill="none" stroke-width="6" class="st-ring-bg"/><circle cx="24" cy="24" r="${r}" fill="none" stroke-width="6" class="st-ring-on" stroke-dasharray="${Math.max(1.5, v * c)} ${c}" transform="rotate(-90 24 24)" stroke-linecap="round"/>`; return el; };
  const N2 = id => N(id)?.value ?? 'Needs an answer';
  const cards = {
    hero: h('div.st-card.hero', {},
      h('div.st-eyebrow', {}, B ? 'After that' : 'Your plan'),
      pct != null && !(B && !B.job) ? h('div.st-ring', { role: 'img', 'aria-label': `${fmt.pct(pct)} of the way there` }, ring(pct), h('span', {}, h('strong', {}, fmt.pct(pct)), ' of the way there')) : null,
      h('div.st-soft', {}, 'Work becomes optional'),
      h('div.st-big', {}, B && !B.job ? 'Shows with the job ahead' : fiLine ?? 'Not yet known'),
      B && !B.job ? h('p', {}, 'Benefits alone do not get there. Add when you expect to start and about what it pays, and this fills in.') : off ? h('p', {}, 'Right now little or nothing is left over to invest, so there is no date to show. Your next step is the way in.') : pl.basis === 'yours' && pl.fi.age && !pl.fi.far ? h('p', {}, `You would be ${pl.fi.age}. The likely range is ${pl.words.fi}.`) : null,
      h('div.st-row', {}, basisTag(pl), !p.done ? btn(`Answer ${p.total - p.count} more to make it yours`, () => go('numbers', { q: p.next }), 'slim primary') : null)),
    step: s ? h(`div.st-card${ui.flash === 'next' ? '.flash' : ''}`, {},
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
    tiles: h('div.st-tiles', {}, tile('Left over each month', N('surplus')), tile('Savings rate', N('savingsRate')), tile('How long your cash lasts', N('runway')), tile('Net worth', N('netWorth'))),
    milestones: h(`div.st-card${ui.flash === 'milestones' ? '.flash' : ''}`, {},
      h('div.st-eyebrow', {}, 'Milestones'),
      h('h2', {}, pl.wins ? `${pl.wins} already done. Here is what comes next.` : 'Wins on the way, soonest first'),
      (() => { const li = x => h(`li${x.done ? '.done' : ''}`, {}, h('span.dot', {}, x.done ? '✓' : ''), h('span', {}, x.name, h('small', {}, x.what)), h('span.when', {}, x.date));
        const next = pl.milestones.filter(x => !x.done).slice(0, 3), rest = pl.milestones.filter(x => !next.includes(x));
        return [h('ul.st-list', {}, next.map(li)), rest.length ? h('details.st-fold', {}, h('summary', {}, `Show all ${pl.milestones.length}`), h('ul.st-list', {}, rest.map(li))) : null]; })(),
      (() => { const C = climbOf(pl.m.netWorth?.value ?? null, pl.m.surplus?.value ?? 0); if (!C) return null; const next = C.find(x => !x.done);
        return h('details.st-fold', {}, h('summary', {}, next ? `Your climb: next is ${next.name.toLowerCase()}` : 'Your climb: past the first million'), h('ul.st-list', {}, C.map(x => h(`li${x.done ? '.done' : ''}`, {}, h('span.dot', {}, x.done ? '✓' : ''), h('span', {}, x.name), h('span.when', {}, x.done ? 'Done' : x.months == null ? 'Needs money left over' : x.months > 480 ? 'Growth gets you there' : monthWords(x.months))))), h('p.st-small.st-soft', {}, 'At what you keep each month, before any growth. Growth makes it sooner.')); })(),
      credit('milestones')),
    safe: h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'If something goes sideways'), h('div.st-soft', {}, 'Your cash covers'), h('div.st-big', {}, N2('runway')),
      h('p', {}, 'That is how long you could go with no pay coming in, at what you spend now.'),
      h('div.st-row', {}, btn('Practice it', () => go('drills'), 'primary'), btn('Test my plan against history', () => go('life', { flash: 'stress' })))),
    enjoy: h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Yours to enjoy'), h('div.st-soft', {}, 'Left over each month, after everything'), h('div.st-big', {}, N2('surplus')),
      (() => { const sm = p.done ? spendMoreOf(store.doc, ref, priors, { age: pl.age, byAge: mine().spendBy ?? 65 }) : null; return sm?.on && sm.amount > 0 ? h('p', { style: { fontWeight: 700 } }, `You could spend ${money(sm.amount)} more a month and work would still be optional by ${sm.byAge}.`) : null; })(),
      h('p', {}, 'See what you love spending on and what you only put up with, and what any monthly cost takes from your date.'),
      h('div.st-row', {}, btn('What do I love spending on?', () => go('tune', { flash: 'values' }), 'primary'), btn('Price a monthly cost', () => go('tune', { flash: 'price' })))),
  };
  return [
    ui.since ? h('div.st-note', { role: 'status' }, ui.since) : null,
    worry,
    gap,
    mirrorOf(mine().mirror).order.map(k => cards[k]),
    h('div.st-row', {}, btn('See it in pictures', () => go('see'), 'primary big')),
  ];
}

// ---------- See it: the four pictures ----------
function see(p, pl) {
  const hold = h('div'), res = h('p.st-readout', { role: 'status' });
  const leanT = pl.milestones.find(x => x.id === 'lean')?.target ?? null;
  const draw = () => {
    const on = ui.lever.spendLess || ui.lever.earnMore, w = on ? whatIf(store.doc, ref, priors, ui.lever) : null;
    const g = growthOf(w?.m ?? pl.m, { age: pl.age });
    if (g) g.marks = [[100000, 'First $100K'], [leanT, 'Needs only']].filter(([v]) => v > 0 && v < g.target * 0.9);
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
  const PICS = [['growth', 'Growth'], ['flow', 'Where it goes'], ['timeline', 'Your path'], ['debt', 'Debt']];
  const pic = PICS.some(([k]) => k === ui.flash) ? (ui.pic = ui.flash) : ui.pic;
  const shown = pic === 'growth' ? card('growth', 'Picture 1 of 4', 'How your money grows', [hold,
      h('h3', { style: { marginTop: '14px' } }, 'Try it'), lever('spendLess', 'Spend less', 1500, 50), lever('earnMore', 'Earn more', 3000, 100), res,
      h('details.st-fold', {}, h('summary', {}, 'Change the growth rate'),
        h('div.st-chips', {}, ret.options.map(o => chip(o.label, ret.value === o.value, () => { setTweak(store, ret, o.value); render(); }))))], 'growthChart')
    : pic === 'flow' ? card('flow', 'Picture 2 of 4', 'Where your money goes each month', f ? flowChart(f) : h('p.st-soft', {}, 'This picture needs your pay and your spending.'), 'sankey')
    : pic === 'timeline' ? card('timeline', 'Picture 3 of 4', 'Your path, one win at a time', t ? timelineChart(t) : h('p.st-soft', {}, 'Every milestone on your list is done.'), 'milestones')
    : d ? card('debt', 'Picture 4 of 4', 'Your debt, falling to zero', debtChart(d, monthWords), 'avalanche') : card('debt', 'Picture 4 of 4', 'Your debt', h('p', { style: { marginBottom: 0 } }, pl.m.inputs.debts.length ? 'Add each debt\'s rate and payment in Sharpen to see it fall to zero.' : 'No debt on file. Nothing to draw here.'), null);
  return [
    h('h1', {}, 'Your plan in pictures'),
    h('div.st-chips', { style: { marginBottom: '12px' } }, PICS.map(([k, l]) => chip(l, pic === k, () => { ui.pic = k; ui.flash = null; render(); }))),
    shown,
    h('div.st-row', {}, btn('Your lifetime plan', () => go('life'), 'primary big'), btn('Sharpen it', () => go('sharpen'))),
  ];
}

// ---------- A statement, read in the browser: spending a month by category, next to the number from memory ----------
function statementCard(p, pl) {
  const saved = mine().audit, a = ui.audit ?? saved, gut = onFile(store.doc, 'spending', { ref }).gut ?? pl.m.inputs.spending ?? null;
  const pickFile = h('input', { type: 'file', accept: '.csv,text/csv', id: 'stmt-file', class: 'st-file', onChange: async e => { const f = e.target.files[0]; if (!f) return; const read0 = readFile(await f.text(), ref, { doc: store.doc }), out = auditOf(read0, ref); ui.audit = out.problem ? null : out; ui.read = out.problem ? null : read0; ui.auditNote = out.problem ?? null; render(); document.getElementById('stmt')?.scrollIntoView({ block: 'start' }); } });
  const use = () => { answer(store, 'spending', { gut: a.monthly });
    const kept = ui.read ? importTransactions(store, dedupe(ui.read.transactions.filter(t => !t.ignored), store.doc.spending?.transactions || []), { bank: a.name }) : null; ui.read = null; remember({ audit: { name: a.name, months: a.months, count: a.count, monthly: a.monthly, rows: a.rows.slice(0, 12) } }); ui.audit = null; ui.auditNote = `Saved. Your plan now runs on your statement.${kept?.imported ? ` ${kept.imported} transactions are kept in your file.` : ''}`; render(); };
  return h(`details.st-card${ui.flash === 'statement' ? '.flash' : ''}`, { id: 'stmt', open: ui.flash === 'statement' || ui.audit || ui.auditNote || ui.stmtOpen ? true : null, onToggle: e => { ui.stmtOpen = e.target.open; } },
    h('summary.st-sum', {}, h('strong', {}, saved && !ui.audit ? 'Your spending, from your statement' : 'Use a statement, skip the guessing'), h('span.st-soft', {}, saved ? `${money(saved.monthly)} a month` : 'Fastest')),
    a ? [h('p', { style: { fontWeight: 700 } }, auditWords(a, ui.audit ? gut : null)),
      h('div.st-rows', {}, a.rows.slice(0, 6).map(r => h('div.st-srow', {}, h('span', {}, r.name), h('span.v', {}, money(r.monthly)))), a.rows.length > 6 ? h('details.st-fold', {}, h('summary', {}, `Show all ${a.rows.length}`), a.rows.slice(6).map(r => h('div.st-srow', {}, h('span', {}, r.name), h('span.v', {}, money(r.monthly))))) : null),
      ui.audit ? h('div.st-row', { style: { marginTop: '12px' } }, btn(`Use ${money(a.monthly)} a month`, use, 'primary big'), btn('Keep my number', () => { ui.audit = null; render(); }, 'text')) : null]
      : h('p', {}, 'Export your transactions from Rocket Money or Monarch as a .csv file and pick it here. It is read on this device and is not sent anywhere. Transfers and card payments are left out so nothing counts twice.'),
    ui.audit ? h('p.st-small.st-soft', {}, 'Use it only if the file covers every account you spend from. One card alone will read low.') : null,
    ui.auditNote ? h('p.st-note', { role: 'status' }, ui.auditNote) : null,
    h('div.st-row', { style: { marginTop: '10px' } }, h('label.st-btn', { for: 'stmt-file', class: a ? '' : 'primary' }, a ? 'Pick a different file' : 'Pick a file'), pickFile));
}

// ---------- Sharpen it: levels 2 to 10 ----------
function sharpen(p, pl) {
  const L = levelsOf(store.doc), sh = sharpnessOf(store.doc, p.done);
  // Every field is drawn; one that does not apply yet is hidden, so typing a loan balance shows its rate and payment
  // boxes at once without the box being typed in losing its place.
  const field = (f, v, redraw, sync) => {
    const set = (val, { keep = false } = {}) => { v[f.id] = val; if (keep) sync(); else redraw(); };
    const wrap = el => { el.dataset.field = f.id; el.hidden = !!(f.when && !f.when(v)); return el; };
    const label = f.labelOf ? f.labelOf(v) : f.label;
    if (f.type === 'pick') return wrap(h('div.st-field', {}, h('div.st-flabel', {}, label), h('div.st-chips', {}, f.options.map(([val, label]) => chip(label, v[f.id] === val, () => set(val))))));
    const pct = f.type === 'pct', shown = v[f.id] == null ? '' : pct ? String(+(v[f.id] * 100).toFixed(2)) : Number(v[f.id]).toLocaleString('en-US');
    const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: '0', 'aria-label': label, value: shown, onInput: e => { const n = e.target.value.replace(/[^\d.]/g, ''); set(n === '' ? null : pct ? Number(n) / 100 : Number(n), { keep: true }); } });
    const picks = pct ? f.options.map(o => [o, `${+(o * 100).toFixed(1)}%`]) : (f.picks || []).map(o => [o, money(o)]);
    return wrap(h('div.st-field', {}, h('div.st-flabel', {}, label),
      h('div.st-box.narrow', {}, h('div.in', {}, pct ? null : h('span', {}, '$'), input, pct ? h('span', {}, '%') : null)),
      picks.length ? h('div.st-chips', { style: { marginTop: '8px' } }, picks.map(([val, label]) => chip(label, v[f.id] === val, () => set(val)))) : null));
  };
  const form = lv => {
    const def = levelOf(lv.id);
    if (!ui.form || ui.form.id !== lv.id) { const start = def.read(store.doc, ref); if (lv.id === 'where' && mine().parts) { const pt = mine().parts; start.rent ??= pt.housing ?? null; start.food ??= pt.food ?? null; start.transport ??= pt.transport ?? null; } ui.form = { id: lv.id, v: start }; }
    const v = ui.form.v, box = h('div');
    const fields = def.fields(store.doc, ref);
    // A level with several cards or loans shows one at a time, so the screen stays short.
    const slotOf = f => /^(?:bal|apr|pay|promo):(.+:\d+)$/.exec(f.id)?.[1] ?? null;
    const slots = () => [...new Set(fields.filter(f => slotOf(f) && !(f.when && !f.when(v))).map(slotOf))];
    const nav = h('div.st-row.st-slotnav');
    const hidden = f => { const S = slots(), at = Math.min(ui.slot, S.length - 1); return !!(f.when && !f.when(v)) || (S.length > 1 && slotOf(f) != null && slotOf(f) !== S[at]); };
    const sync = () => { for (const f of fields) { const el = box.querySelector(`[data-field="${CSS.escape(f.id)}"]`); if (el) el.hidden = hidden(f); }
      const S = slots(), at = Math.min(ui.slot, S.length - 1); nav.hidden = S.length < 2;
      nav.replaceChildren(btn('‹ Back one', () => { ui.slot = Math.max(0, at - 1); sync(); }, 'slim'), h('strong', {}, `${at + 1} of ${S.length}`), btn('Next one ›', () => { ui.slot = Math.min(S.length - 1, at + 1); sync(); nav.scrollIntoView({ block: 'center' }); }, at < S.length - 1 ? 'slim primary' : 'slim')); };
    const redraw = () => { box.replaceChildren(...fields.map(f => field(f, v, redraw, sync))); sync(); };
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
    return h('div.st-form', {}, box, nav, h('div.st-row', { style: { marginTop: '14px' } }, btn('Save', save, 'primary big'), btn('Close', () => { ui.level = null; ui.form = null; ui.note = null; ui.noteAt = null; render(); }, 'text')));
  };
  const nextOpen = L.find(x => x.state === 'open')?.id ?? null;
  const card = lv => {
    const open = ui.level === lv.id;
    return h(`div.st-card.st-level${lv.state !== 'open' ? '.done' : ''}${ui.flash === lv.id ? '.flash' : ''}${open || lv.id === nextOpen ? '' : '.compact'}`, { id: `level-${lv.id}` },
      ui.note && ui.noteAt === lv.id ? h('div.st-note', { role: 'status' }, ui.note) : null,
      h('div.st-levelhead', {}, h('span.st-lvl', {}, lv.state === 'open' ? lv.n : '✓'),
        h('div', {}, h('h2', { style: { margin: 0 } }, `Level ${lv.n}: ${lv.title}`), lv.id === nextOpen || open ? [h('div.st-soft.st-small', {}, lv.note ?? lv.why), h('div.st-small', { style: { marginTop: '4px' } }, h('strong', {}, 'Unlocks: '), lv.unlocks.join(', '))] : null),
        lv.state === 'skip' ? h('span.st-tag.yours', {}, 'Nothing to do') : open ? null : btn(lv.state === 'done' ? 'Change' : 'Answer', () => { ui.level = lv.id; ui.slot = 0; ui.form = null; ui.note = null; ui.noteAt = null; render(); document.getElementById(`level-${lv.id}`)?.scrollIntoView({ block: 'start' }); }, lv.state === 'done' || lv.id !== nextOpen ? 'slim' : 'slim primary')),
      open ? form(lv) : null);
  };
  return [
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Sharpen it'), h('h1', {}, `You are at level ${sh.done} of ${sh.total}`),
      h('span.st-pips.big', { role: 'img', 'aria-label': `${sh.done} of ${sh.total} levels` }, Array.from({ length: sh.total }, (_, i) => h(`i${i < sh.done ? '.on' : ''}`)))),
    (() => { const b = p.done ? blurOf(pl) : null; if (!b || !b.guess || b.top.share < 0.5 || !(b.top.spanMonths > 12)) return null;
      const open = L.find(x => x.id === b.fix && x.state === 'open');
      return h('div.st-card', {}, h('div.st-eyebrow', {}, 'What is blurring your plan most'),
        h('p', { style: { fontWeight: 700 } }, `Your date can land anywhere in a ${spanWords(b.top.spanMonths)} window, and ${fmt.pct(b.top.share)} of that comes from one number: ${b.top.label.toLowerCase()}.`),
        b.fix === 'statement' ? h('p', { style: { marginBottom: 0 } }, 'It is a number from memory, and memory is usually off. A bank or card statement is what pins it down. That upload is the next thing being built. Until then, "Help me add it up" on question 2 gets it closer.', ' ', btn('Add it up', () => go('numbers', { q: 'spending' }), 'slim primary'))
          : open ? h('div.st-row', {}, h('span', {}, `Level ${open.n} fixes it.`), btn('Answer it', () => go('sharpen', { flash: open.id }), 'slim primary')) : null); })(),
    ui.note && !ui.noteAt ? h('div.st-note', { role: 'status' }, ui.note) : null,
    !p.done ? h('div.st-card', {}, h('div.st-levelhead', {}, h('span.st-lvl', {}, 1), h('div', {}, h('h2', { style: { margin: 0 } }, 'Level 1: the five questions'), h('div.st-soft.st-small', {}, `${p.count} of ${p.total} answered.`)), btn('Finish it', () => go('numbers', { q: p.next }), 'slim primary'))) : null,
    statementCard(p, pl),
    (() => { const ans = mine().checkup || {}, C = checkupOf(ans);
      return foldCard('checkup', 'The checkup: what a planner would ask', C.answered ? `${C.have} of ${C.of} covered` : '11 taps', [
        CHECKUP.map(c => h('div.st-field', {}, h('div.st-flabel', {}, c.q), h('div.st-chips', {}, CHECK_ANSWERS.map(([k, l]) => chip(l, ans[c.id] === k, () => { remember({ checkup: { ...ans, [c.id]: k } }); ui.flash = null; ui.openCard = 'checkup'; render(); }))),
          ans[c.id] === 'no' || ans[c.id] === 'unsure' ? h('p.st-small', { style: { margin: '6px 0 0' } }, c.next) : null)),
        C.todo.length ? h('p.st-readout', { role: 'status' }, `${C.todo.length} to look into. Each one shows its first step above.`) : C.answered === CHECKUP.length ? h('p.st-readout', { role: 'status' }, 'Everything here is covered.') : null]); })(),
    L.filter(x => x.state === 'open' || ui.level === x.id || ui.flash === x.id).map(card),
    (() => { const rest = L.filter(x => x.state !== 'open' && ui.level !== x.id && ui.flash !== x.id); return rest.length ? h('details.st-card', {}, h('summary.st-sum', {}, h('strong', {}, 'Levels you finished'), h('span.st-soft', {}, String(rest.length))), rest.map(card)) : null; })(),
    h('div.st-row', {}, btn('See all your numbers', () => go('all'), 'primary'), btn('See it in pictures', () => go('see'))),
  ];
}

// ---------- The value matrix: what you love spending on, and what you only put up with ----------
function valueCard(pl) {
  const pt = mine().parts || {}, audit = mine().audit?.rows;
  const rows = audit?.length ? audit : SPEND_PARTS.map(([id, label]) => ({ name: label, monthly: pt[id] ?? 0 })).filter(r => r.monthly > 0);
  const feel = mine().values || {}, V = valuesOf(rows, feel);
  const w = V.half > 0 ? whatIf(store.doc, ref, priors, { spendLess: V.half }) : null;
  return h(`details.st-card${ui.flash === 'values' ? '.flash' : ''}`, { open: ui.flash === 'values' || ui.valuesOpen ? true : null },
    h('summary.st-sum', {}, h('strong', {}, 'What do I love spending on?'), h('span.st-soft', {}, rows.length ? `${V.marked} of ${V.of} marked` : 'Needs your spending')),
    !rows.length ? h('div.st-row', {}, h('span', {}, 'This needs your spending in parts.'), btn('Use a statement', () => go('sharpen', { flash: 'statement' }), 'slim primary'), btn('Add it up', () => { ui.addUp = true; go('numbers', { q: 'spending' }); ui.addUp = true; render(); }, 'slim'))
      : [h('p.st-soft.st-small', {}, 'Tap how each one feels. Nothing changes in your plan.'),
        rows.map(r => h('div.st-field', {}, h('div.st-flabel', {}, `${r.name}: ${money(r.monthly)} a month`), h('div.st-chips', {}, FEELINGS.map(([k, l]) => chip(l, feel[r.name] === k, () => { remember({ values: { ...feel, [r.name]: k } }); ui.flash = null; ui.valuesOpen = true; render(); }))))),
        V.marked ? h('dl.st-kv', {}, FEELINGS.map(([k, l]) => [h('dt', {}, l), h('dd', {}, `${money(V.totals[k])} a month`)])) : null,
        V.loose > 0 ? h('p.st-readout', { role: 'status' }, `${money(V.loose)} a month goes to things you tolerate or dislike. `, w?.moved > 0 ? `Trimming half of it moves your date ${spanWords(w.moved)} sooner, to ${w.date}.` : `Half of it is ${money(V.half)} a month.`) : null,
        credit('valueMatrix')]);
}

// ---------- How much more could I spend, what my fees cost, and which move fits my life ----------
const foldCard = (id, title, right, body) => h(`details.st-card${ui.flash === id ? '.flash' : ''}`, { open: ui.flash === id || ui.openCard === id ? true : null, onToggle: e => { if (e.target.open) ui.openCard = id; else if (ui.openCard === id) ui.openCard = null; } }, h('summary.st-sum', {}, h('strong', {}, title), h('span.st-soft', {}, right)), body);
const chipRow = (label, list, on, words, onPick) => h('div.st-field', {}, h('div.st-flabel', {}, label), h('div.st-chips', {}, list.map(v => chip(words(v), on === v, () => onPick(v)))));
function spendCard(p, pl) {
  const by = mine().spendBy ?? 65, sm = p.done ? spendMoreOf(store.doc, ref, priors, { age: pl.age, byAge: by }) : null;
  return foldCard('spendMore', 'How much more could I spend?', sm?.on ? `${money(sm.amount)} a month` : '', [
    chipRow('And still have work optional by age', SPEND_AGES.filter(a => a > pl.age), by, v => String(v), v => { remember({ spendBy: v }); ui.flash = null; ui.openCard = 'spendMore'; render(); }),
    h('p.st-readout', { role: 'status' }, !p.done ? 'Answer the five questions first.' : !sm ? 'Pick a later age.' : !sm.on ? `On your numbers today, work is not optional by ${by} yet, so there is no room to add. Your next step is what moves it.` : sm.amount > 0 ? `You could spend ${money(sm.amount)} more a month, every month, and still get there by ${by}. That is ${money(sm.amount * 12)} a year.` : `You are right on the line for ${by}.`),
    h('p.st-small.st-soft', {}, 'It counts the higher spending for the rest of your life, not only now.'), credit('dieWithZero')]);
}
function feesCard(pl) {
  const f = mine().fees || {}, fee = f.fee ?? 0.01, years = f.years ?? 30, x = pl.m.inputs;
  const R = feesOf({ balance: x.invested ?? 0, monthly: pl.m.investing?.monthly ?? 0, years, ret: x.realReturn ?? 0.05, fee });
  const pickFee = patch => { remember({ fees: { ...f, ...patch } }); ui.flash = null; ui.openCard = 'fees'; render(); };
  return foldCard('fees', 'What are my fees costing me?', `${money(Math.round(R.cost))} over ${years} years`, [
    chipRow('What you pay a year, all in (advisor plus funds)', FEE_PICKS, fee, v => `${+(v * 100).toFixed(2)}%`, v => pickFee({ fee: v })),
    chipRow('Over how many years', FEE_YEARS, years, v => String(v), v => pickFee({ years: v })),
    h('dl.st-kv', {}, h('dt', {}, `At ${+(fee * 100).toFixed(2)}% a year`), h('dd', {}, money(Math.round(R.withFee))), h('dt', {}, 'In a low-fee index fund (0.05%)'), h('dd', {}, money(Math.round(R.without))), h('dt', {}, 'The difference'), h('dd', {}, h('strong', {}, money(Math.round(R.cost))))),
    h('p.st-readout', { role: 'status' }, R.cost > 0 ? `That is ${fmt.pct(R.share)} of what you would have had. It uses what you have invested today and what your plan adds each month.` : 'At that fee there is nothing to save.'),
    h('p.st-small.st-soft', {}, 'Find the fee on your statement: an advisory fee is a percent of your balance, and each fund lists its expense ratio.')]);
}
function movesCard(pl) {
  const care = mine().care || [], M = movesOf(store.doc, ref, priors, pl, { care, housing: mine().parts?.housing ?? null });
  const toggle = k => { remember({ care: care.includes(k) ? care.filter(x => x !== k) : [...care, k] }); ui.flash = null; ui.openCard = 'moves'; render(); };
  const mark = v => (v > 0 ? 'helps' : v < 0 ? 'costs you' : 'about the same');
  return foldCard('moves', 'Which move fits my life?', M.length ? `${M.filter(m => m.fits).length} of ${M.length} fit` : '', !M.length ? h('p', {}, 'This needs your pay and your spending.') : [
    h('div.st-field', {}, h('div.st-flabel', {}, 'What I will not give up (tap any)'), h('div.st-chips', {}, LIFE_SIDES.map(([k, l]) => chip(l, care.includes(k), () => toggle(k))))),
    M.map(m => h(`details.st-tweak`, {}, h('summary.st-sum', {}, h('strong', {}, m.name), h('span.st-soft', {}, m.moved > 0 ? `${spanWords(m.moved)} sooner` : 'No change')),
      h('p.st-small', {}, `${money(m.amount)} a month ${m.kind === 'more' ? 'more coming in' : 'less going out'}. `, m.date ? `Work becomes optional ${m.date}. ` : '', m.fits ? '' : `It usually costs you: ${m.costs.map(k => LIFE_SIDES.find(s => s[0] === k)[1].toLowerCase()).join(', ')}.`),
      h('dl.st-kv', {}, LIFE_SIDES.map(([k, l]) => [h('dt', {}, l), h('dd', {}, mark(m.sides[k]))])))),
    h('p.st-small.st-soft', {}, 'The dates are worked out from your numbers. The effects on the rest of life are the usual ones, from the SPARKS tradeoff notes. Yours may differ.')]);
}

function nextCard() {
  const ans = mine().next || {}, N = nextDollarOf(ans);
  return foldCard('next', 'Which account gets my next dollar?', N.here ? N.here.name : '5 taps', [
    NEXT_ASKS.map(q => h('div.st-field', {}, h('div.st-flabel', {}, q.q), h('div.st-chips', {}, q.a.map(([k, l]) => chip(l, ans[q.id] === k, () => { remember({ next: { ...ans, [q.id]: k } }); ui.flash = null; ui.openCard = 'next'; render(); }))))),
    N.answered ? [h('p.st-readout', { role: 'status' }, `Your next dollar: ${N.here.name.toLowerCase()}. ${N.here.why}`, N.here.check ? ' Check with your plan first whether it allows one.' : ''),
      h('ol.st-list', {}, N.steps.map((x, i) => h(`li${x.done ? '.done' : x === N.here ? '.here' : ''}`, {}, h('span.dot', {}, x.done ? '✓' : i + 1), h('span', {}, x.name, h('small', {}, x.why)), h('span.when', {}, x.done ? 'Done' : x === N.here ? 'You are here' : ''))))] : h('p.st-soft', {}, 'Answer all five and the order shows.'),
    credit('foo')]);
}
function raiseCard(pl) {
  const raise = mine().raise ?? 5000, R = raiseOf(store.doc, ref, priors, { raise });
  return foldCard('raise', 'What is a raise worth to me?', R.moved > 0 ? `${spanWords(R.moved)} sooner` : '', [
    chipRow('A raise of, a year before taxes', RAISES, raise, v => money(v), v => { remember({ raise: v }); ui.flash = null; ui.openCard = 'raise'; render(); }),
    h('p.st-readout', { role: 'status' }, R.moved > 0 ? `About ${money(Math.round(R.monthly))} more a month after taxes. Invested, work becomes optional ${R.date}, ${spanWords(R.moved)} sooner. Each $1,000 of raise buys about ${R.daysPerThousand} days.` : `About ${money(Math.round(R.monthly))} more a month after taxes.`),
    h('p.st-small.st-soft', {}, `It counts ${Math.round((1 - KEPT) * 100)}% going to taxes, a guess, and all of the rest being invested.`),
    h('details.st-fold', {}, h('summary', {}, 'How to ask'), h('ol.st-steps', {}, RAISE_SCRIPT.map(t => h('li', {}, t))))]);
}
function startedCard(pl) {
  const st = mine().habit || {}, monthly = st.monthly ?? 200, years = st.years ?? 5, S = startedOf({ monthly, years, ret: pl.m.inputs.realReturn ?? 0.05 });
  const pickIt = patch => { remember({ habit: { ...st, ...patch } }); ui.flash = null; ui.openCard = 'started'; render(); };
  return foldCard('started', 'If I start now', `${money(Math.round(S.value))} in ${years} years`, [
    chipRow('A month', HABITS, monthly, v => money(v), v => pickIt({ monthly: v })), chipRow('For this many years', SPANS, years, v => String(v), v => pickIt({ years: v })),
    h('p.st-readout', { role: 'status' }, `${money(monthly)} a month for ${years} ${years === 1 ? 'year' : 'years'} is ${money(S.put)} put in and about ${money(Math.round(S.value))} at the end, in today's dollars.`),
    h('p.st-small', {}, `Started ${years} ${years === 1 ? 'year' : 'years'} ago, it would be about that much today. That window is closed. This one is open.`)]);
}
function parentsCard() {
  const st = mine().parents || {}, ans = st.ans || {}, help = st.help ?? 0, w = help > 0 ? whatIf(store.doc, ref, priors, { spendLess: -help }) : null;
  const save = patch => { remember({ parents: { ...st, ...patch } }); ui.flash = null; ui.openCard = 'parents'; render(); };
  const yes = PARENT_ASKS.filter(q => ans[q.id] === 'yes').length;
  return foldCard('parents', 'My parents and my plan', Object.keys(ans).length ? `${yes} of ${PARENT_ASKS.length} in place` : '', [
    PARENT_ASKS.map(q => h('div.st-field', {}, h('div.st-flabel', {}, q.q), h('div.st-chips', {}, [['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']].map(([k, l]) => chip(l, ans[q.id] === k, () => save({ ans: { ...ans, [q.id]: k } })))))),
    chipRow('If I helped them with this much a month', PARENT_HELP, help, v => (v ? money(v) : 'Nothing'), v => save({ help: v })),
    help > 0 ? h('p.st-readout', { role: 'status' }, w?.moved != null && w.moved < 0 ? `Work becomes optional ${w.date}, ${spanWords(-w.moved)} later. Knowing the number is what lets you choose it.` : w?.moved === 0 ? 'Your date holds.' : 'At that amount nothing is left to invest on your numbers today.') : null,
    PARENT_ASKS.some(q => ans[q.id] === 'no' || ans[q.id] === 'unsure') ? h('p.st-small', {}, 'One talk covers most of these. Start with where the documents are. It is the easiest to ask.') : null]);
}

// ---------- What if ----------
function tune(p, pl) {
  const tweaks = tweaksOf(store.doc, ref).filter(t => t.show !== false);
  const base = pl.fi.months;
  return [
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'What if'), h('h1', {}, 'Change one thing, watch the date move'),
      h('p', { style: { marginBottom: 0 } }, 'Each choice shows the date it gives you. Tap one to use it. To try spending less or earning more, use the sliders on See it. ', base != null && !pl.fi.far ? `Right now: ${pl.fi.date}.` : `Right now: ${pl.words.fi}.`)),
    (() => { const amount = ui.price ?? 100, t = priceTagOf(pl, store.doc, ref, priors, amount);
      return h(`div.st-card${ui.flash === 'price' ? '.flash' : ''}`, {}, h('h2', {}, 'What does a monthly cost really cost?'), h('div.st-soft.st-small', {}, 'Pick an amount: a subscription, a car payment, a habit.'),
        h('div.st-chips', { style: { margin: '8px 0' } }, [10, 25, 50, 100, 200, 500].map(v => chip(`${money(v)} a month`, amount === v, () => { ui.price = v; render(); }))),
        h('dl.st-kv', {}, h('dt', {}, 'Invested, to pay for it forever'), h('dd', {}, money(t.forever)),
          t.hours != null ? [h('dt', {}, `Hours of your work each month${t.hourlyGuess ? ' (at a 40-hour week)' : ''}`), h('dd', {}, `${(Math.round(t.hours * 10) / 10).toFixed(1)}`)] : null,
          t.moved != null && t.moved > 0 ? [h('dt', {}, 'Without it, work becomes optional'), h('dd', {}, `${spanWords(t.moved)} sooner`)] : null),
        h('p.st-small.st-soft', { style: { margin: '8px 0 0' } }, `${money(amount)} a month is ${money(amount * 12)} a year. At a ${fmt.pct(t.rate)} withdrawal rate, that takes ${money(t.forever)} invested.`), credit('priceTag')); })(),
    (() => { const pick = mine().home || {}, H = homeOf(store.doc, ref, priors, pl, pick), choose = patch => { remember({ home: { ...pick, ...patch } }); ui.flash = null; ui.homeOpen = true; render(); };
      const row = (label, list, on, words, key) => h('div.st-field', {}, h('div.st-flabel', {}, label), h('div.st-chips', {}, list.map(v => chip(words(v), on === v, () => choose({ [key]: v })))));
      return h(`details.st-card${ui.flash === 'home' ? '.flash' : ''}`, { open: ui.flash === 'home' || ui.homeOpen ? true : null },
        h('summary.st-sum', {}, h('strong', {}, 'What if I buy a home?'), h('span.st-soft', {}, `${money(Math.round(H.all))} a month`)),
        row('Price', HOME_PRICES, H.price, v => money(v), 'price'),
        row('Down payment', HOME_DOWNS, H.down, v => `${+(v * 100).toFixed(1)}%`, 'down'),
        row('Rate', HOME_RATES, pick.rate ?? null, v => `${+(v * 100).toFixed(1)}%`, 'rate'),
        row('Housing I pay today, a month', HOME_NOW, H.today, v => (v ? money(v) : 'Nothing'), 'now'),
        H.insured ? row('Mortgage insurance a year, as a share of the loan', HOME_PMI, H.pmiRate, v => `${+(v * 100).toFixed(1)}%`, 'pmi') : null,
        row('Closing costs, as a share of the price', HOME_CLOSING, H.closingShare, v => `${+(v * 100).toFixed(0)}%`, 'closing'),
        h('dl.st-kv', { style: { marginTop: '12px' } },
          h('dt', {}, 'Cash down'), h('dd', {}, money(Math.round(H.cash))),
          h('dt', {}, 'Closing costs, about'), h('dd', {}, money(Math.round(H.closing))),
          h('dt', {}, 'Cash up front'), h('dd', {}, h('strong', {}, money(Math.round(H.upfront)))),
          h('dt', {}, 'Loan'), h('dd', {}, money(Math.round(H.loan))),
          h('dt', {}, `Loan payment at ${+(H.rate * 100).toFixed(2)}%`), h('dd', {}, money(Math.round(H.pi))),
          h('dt', {}, 'Taxes and insurance, about'), h('dd', {}, money(Math.round(H.taxIns))),
          H.pmi ? [h('dt', {}, 'Mortgage insurance, about'), h('dd', {}, money(Math.round(H.pmi)))] : null,
          h('dt', {}, 'All in, a month'), h('dd', {}, h('strong', {}, money(Math.round(H.all)))),
          H.share != null ? [h('dt', {}, 'Share of your take-home pay'), h('dd', {}, fmt.pct(H.share))] : null),
        h('p.st-readout', { role: 'status' }, H.line),
        H.notes.map(n => h('p.st-small.st-soft', { style: { margin: '4px 0 0' } }, n)),
        (() => { const G = { ...HOME_GUESS, ...(pick.guess || {}) }, guess = patch => choose({ guess: { ...(pick.guess || {}), ...patch } });
          const R = H.today > 0 ? rentOrBuy({ price: H.price, down: H.down, rate: H.rate, pmi: H.insured ? H.pmiRate : 0, closing: H.closingShare, rent: H.today, ...G }) : null;
          const IN = interestNote(H.loan, H.rate, ref, !!G.joint);
          const pc = v => `${+(v * 100).toFixed(0)}%`;
          return h('details.st-fold', { open: ui.rentOpen ? true : null, onToggle: e => { ui.rentOpen = e.target.open; } }, h('summary', {}, 'Own it or keep renting?'),
            R ? [h('dl.st-kv', {}, h('dt', {}, `Own: what you have after ${R.horizon} years`), h('dd', {}, money(Math.round(R.owner))), h('dt', {}, `Rent at ${money(H.today)} and invest the rest`), h('dd', {}, money(Math.round(R.renter)))),
              h('p.st-readout', {}, R.even ? `On these guesses, owning pulls even with renting in year ${R.even}.` : 'On these guesses, renting stays ahead for 30 years.'),
            ] : h('p.st-soft', {}, 'Tap a rent above (what you pay for housing today) to compare.'),
            h('div.st-field', {}, h('div.st-flabel', {}, 'Homes go up, a year'), h('div.st-chips', {}, HOME_GROWTHS.map(v => chip(pc(v), G.homeGrowth === v, () => guess({ homeGrowth: v }))))),
            h('div.st-field', {}, h('div.st-flabel', {}, 'Investments go up, a year'), h('div.st-chips', {}, HOME_INVEST.map(v => chip(pc(v), G.investGrowth === v, () => guess({ investGrowth: v }))))),
            R ? h('div.st-field', {}, h('div.st-flabel', {}, 'Years you would stay'), h('div.st-chips', {}, HOME_HORIZONS.map(v => chip(String(v), G.horizon === v, () => guess({ horizon: v }))))) : null,
            h('div.st-field', {}, h('div.st-flabel', {}, 'Rent goes up, a year'), h('div.st-chips', {}, HOME_RENT_GROWTHS.map(v => chip(pc(v), G.rentGrowth === v, () => guess({ rentGrowth: v }))))),
            h('div.st-field', {}, h('div.st-flabel', {}, 'Selling costs, as a share of the sale'), h('div.st-chips', {}, HOME_SELLING.map(v => chip(pc(v), (G.selling ?? 0.06) === v, () => guess({ selling: v }))))),
            h('div.st-field', {}, h('div.st-flabel', {}, 'Taxes filed'), h('div.st-chips', {}, [[false, 'On my own'], [true, 'Jointly']].map(([v, l]) => chip(l, !!G.joint === v, () => guess({ joint: v }))))),
            R ? h('p.st-small', {}, `Selling takes about ${money(Math.round(R.cost))}. `, R.gainTax > 0 ? `Tax on the gain is about ${money(Math.round(R.gainTax))}.` : 'The gain is inside the tax-free amount for a home you lived in.') : null,
            IN ? h('p.st-small', {}, `Year one's loan interest is about ${money(Math.round(IN.interest))}. The standard deduction is ${money(IN.standard)}, so the interest ${IN.itemize ? 'could lower your tax if you itemize' : 'alone does not lower your tax'}. It is not counted above.`) : null,
            h('p.st-small.st-soft', {}, 'These are starting guesses. Tap any of them to use your own. Whoever pays less in a month invests the difference. Tax on investment growth is left out on both sides.')); })(),
        h('details.st-fold', {}, h('summary', {}, 'The loan, year by year'),
          h('div.st-rows', {}, h('div.st-srow4.head', {}, h('span', {}, 'Year'), h('span', {}, 'Interest'), h('span', {}, 'Paid down'), h('span', {}, 'Still owed')),
            scheduleOf(H.loan, { rate: H.rate }).filter(r => r.year <= 5 || r.year % 5 === 0).map(r => h('div.st-srow4', {}, h('span', {}, String(r.year)), h('span', {}, money(Math.round(r.interest))), h('span', {}, money(Math.round(r.paid))), h('span', {}, money(Math.round(r.balance)))))))); })(),
    valueCard(pl),
    spendCard(p, pl), feesCard(pl), movesCard(pl), nextCard(), raiseCard(pl), startedCard(pl), parentsCard(),
    h('div.st-card', {}, tweaks.map(t => h(`details.st-tweak${ui.flash === t.id ? '.flash' : ''}`, { open: ui.flash === t.id || ui.tweak === t.id ? true : null, onToggle: e => { if (e.target.open) ui.tweak = t.id; } },
      h('summary.st-sum', {}, h('strong', {}, t.label), h('span.st-soft', {}, t.options.find(o => o.value === t.value)?.label ?? '')), h('div.st-soft.st-small', {}, t.help),
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
    (() => { const snap = snapshotOf(pl); return snap ? h('div.st-card', {}, h('div.st-eyebrow', {}, 'One year at a glance'), h('div.st-rows', {}, snap.map(r => h(`div.st-srow.${r.kind}`, {}, h('span', {}, r.label), h('span.v', {}, `${r.sign ? `${r.sign} ` : ''}${r.value}`))))) : null; })(),
    h(`div.st-card${ui.flash === 'statements' ? '.flash' : ''}`, {}, h('div.st-eyebrow', {}, 'Your statements'), h('h2', {}, 'The full picture, line by line'),
      statementsOf(pl, store.doc, ref).map(st => h('details.st-fold.st-stmt', { open: ui.flash === 'statements' ? true : null }, h('summary', {}, `${st.title} (${st.sub.toLowerCase()})`),
        h('div.st-rows', {}, st.rows.map(r => h(`div.st-srow.${r.kind}`, {}, h('span', {}, r.label), h('span.v', {}, `${r.sign ? `${r.sign} ` : ''}${r.value}`)))),
        st.note ? h('p.st-small.st-soft', { style: { margin: '6px 0 0' } }, st.note) : null))),
    groups.map(g => { const list = nums.filter(n => n.group === g); return h('details.st-card.st-group', { open: list.some(n => n.id === ui.flash) ? true : null }, h('summary.st-sum', {}, h('strong', {}, g), h('span.st-soft', {}, `${list.filter(n => n.value).length} of ${list.length}`)), list.map(row)); }),
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
      return h(`details.st-card${ui.flash === k ? '.flash' : ''}`, { open: ui.flash === k ? true : null },
        h('summary.st-sum', {}, h('strong', {}, s.name), h('span.st-soft', {}, `${ideasBy(k).length} ${ideasBy(k).length === 1 ? 'idea' : 'ideas'}`)), h('div.st-soft.st-small', {}, s.who), h('p', { style: { margin: '8px 0 0' } }, s.best),
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
  ['See it, sharpen it, ask what if', 'Four pictures of your plan. Short levels that unlock more numbers. Things you can change to watch the date move. Every number says how it is worked out and whose idea it is.'],
];
function tour(i) {
  const close = () => { pin({ tour: true }); clear($('overlay')); };
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
  const over = () => { open(createClient(adapter, 'My plan', new Date().toISOString())); Object.assign(ui, { q: null, note: null, decade: null, lever: { spendLess: 0, earnMore: 0 } }); go('you'); };
  clear($('foot'),
    h('span.grow', {}, 'Your numbers stay in this browser. Nothing is sent anywhere. This is education, not personal financial advice.'),
    btn('Download a backup', download, 'slim'),
    btn('Copy a private link', async () => {
      try { const url = `${location.origin}${location.pathname}${LINK}${await pack(store.doc)}`;
        try { await navigator.clipboard.writeText(url); ui.linkNote = 'Link copied. It carries this whole plan, so send it only to someone you want to see it. Nothing was uploaded.'; foot(); }
        catch { clear($('overlay'), h('div.st-shade', {}, h('div.st-tour', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Your private link' }, h('h1', {}, 'Your private link'), h('p', {}, 'Press and hold to copy it. It carries this whole plan, so send it only to someone you want to see it.'), h('textarea.st-linkbox', { readonly: true, rows: 5, 'aria-label': 'Your private link', onFocus: e => e.target.select() }, url), h('div.st-row.end', {}, btn('Done', () => clear($('overlay')), 'primary'))))); }
      } catch { ui.linkNote = 'This browser cannot make a link. Use Download a backup.'; foot(); } }, 'slim'),
    ui.linkNote ? h('span', { role: 'status' }, ui.linkNote) : null,
    h('label.st-btn.slim', { for: 'load-file' }, 'Load a backup'),
    h('input', { type: 'file', accept: '.json,application/json', id: 'load-file', class: 'st-file', onChange: async e => { const f = e.target.files[0]; if (!f) return;
      try { const doc = importFile(await f.text()); saveClient(adapter, doc); open(doc); ui.loadNote = null; go('plan'); } catch (err) { ui.loadNote = err.message || 'That file could not be read.'; foot(); } } }),
    ui.loadNote ? h('span', { role: 'alert' }, ui.loadNote) : null,
    h('a.st-btn.slim', { href: 'index.html' }, 'Open the full app'),
    ui.confirmReset ? h('span.st-row', {}, 'Start a new plan? This one stays saved in the full app.', btn('Yes, start over', over, 'slim primary'), btn('Keep this one', () => { ui.confirmReset = false; foot(); }, 'slim'))
      : btn('Start over', () => { ui.confirmReset = true; foot(); }, 'slim'));
}

const LIFE_KEYS = { strategy: 'lifeStrategy', rate: 'lifeRate', claimAge: 'lifeClaimAge', fill: 'lifeFill', stocks: 'lifeStocks', health: 'lifeHealth', eras: 'lifeEras', retireAge: 'lifeRetireAge' };
const lifeOn = () => { const a = store.doc.assumptions || {}, out = { ...(mine().life || {}) }; for (const [k, f] of Object.entries(LIFE_KEYS)) if (a[f] !== undefined && a[f] !== null) out[k] = a[f]; return out; };
const lifeMine = () => ({ ...mine(), life: lifeOn() });
const lifeRemember = patch => {
  if (!patch.life) return remember(patch);
  const rest = { ...patch.life }, v = k => { const x = rest[k]; delete rest[k]; return x ?? null; };
  store.setDoc('assumptions', { lifeStrategy: v('strategy'), lifeRate: v('rate'), lifeClaimAge: v('claimAge'), lifeFill: v('fill'), lifeStocks: v('stocks'), lifeHealth: v('health'), lifeEras: v('eras'), lifeRetireAge: v('retireAge') });
  remember({ life: rest });
};
const life = (p, pl) => lifeScreen({ pl, store, ref, hist, mine: lifeMine, remember: lifeRemember, render, go, btn, chip, credit, flash: ui.flash });
// ---------- Fire drills and skills ----------
function drills(p, pl) {
  const done = mine().done || {}, tick = id => { remember({ done: { ...(mine().done || {}), [id]: !done[id] } }); render(); };
  let life = null; try { life = lifeOf(pl, store.doc, ref, hist, lifeOn()); } catch { life = null; }
  const D = drillsOf(pl, store.doc, ref, priors, { life }), S = skillsOf(pl, store.doc, ref);
  const all = [...D.map(d => `drill:${d.id}`), ...S.map(k => `skill:${k.id}`)], n = all.filter(id => done[id]).length;
  const doneBtn = id => h('button.st-btn.slim', { type: 'button', 'aria-pressed': done[id] ? 'true' : 'false', class: done[id] ? 'primary' : '', onClick: () => tick(id) }, done[id] ? '✓ Done' : 'I did it');
  const firstOpen = D.find(d => !done[`drill:${d.id}`])?.id ?? null;
  const drill = d => h(`details.st-card.st-level.st-drill${done[`drill:${d.id}`] ? '.done' : ''}`, { open: (ui.drill ?? firstOpen) === d.id ? true : null, onToggle: e => { if (e.target.open) ui.drill = d.id; } },
    h('summary.st-levelhead', {}, h('span.st-lvl', {}, done[`drill:${d.id}`] ? '✓' : '!'), h('div', {}, h('div.st-soft.st-small', {}, d.fear), h('h2', { style: { margin: 0 } }, d.headline)), d.calm ? h('span.st-tag.yours', {}, 'Covered') : null),
    h('div', { style: { marginTop: '10px' } }, d.lines.map(l => h('p', { style: { margin: '0 0 6px' } }, l))),
    h('details.st-fold', {}, h('summary', {}, 'What actually happens'), h('ol.st-steps', {}, d.happens.map(x => h('li', {}, x)))),
    h('div.st-do', {}, h('div.st-eyebrow', {}, d.rep.minutes ? `Your rep, ${d.rep.minutes} minutes` : 'Your rep'), h('div', {}, d.rep.text), h('div', { style: { marginTop: '8px' } }, doneBtn(`drill:${d.id}`))));
  const skill = k => h(`details.st-card.st-level.st-drill${done[`skill:${k.id}`] ? '.done' : ''}`, {},
    h('summary.st-levelhead', {}, h('span.st-lvl', {}, done[`skill:${k.id}`] ? '✓' : '+'), h('div', {}, h('h2', { style: { margin: 0 } }, k.title), h('div.st-soft.st-small', {}, `${k.minutes} minutes`))),
    h('p', { style: { margin: '8px 0' } }, k.why), h('ol.st-steps', {}, k.steps.map(x => h('li', {}, x))), doneBtn(`skill:${k.id}`));
  return [
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Fire drills'), h('h1', {}, 'Practice it before it happens'),
      h('p', {}, 'A money fear, run on your own numbers. Then one small rep in real life.'),
      h('span.st-meter', {}, `${n} of ${all.length} done`, h('span.st-bar', {}, h('b', { style: { width: `${all.length ? Math.max(2, n / all.length * 100) : 0}%` } })))),
    D.map(drill),
    h('h2', { style: { marginTop: '8px' } }, 'What actually happens'),
    h('p.st-soft.st-small', {}, 'The real order of events, so the fear has edges.'),
    HAPPENS.map(x => h('details.st-card', {}, h('summary.st-sum', {}, h('strong', {}, x.title), h('span.st-soft', {}, `${x.steps.length} steps`)), h('ol.st-steps', {}, x.steps.map(t => h('li', {}, t))))),
    S.length ? h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Skills'), h('h2', {}, `${S.length} money ${S.length === 1 ? 'skill' : 'skills'} your plan says you have not used yet`), h('p', { style: { marginBottom: 0 } }, 'Each is a few minutes, and each is worth a number on your plan.')) : null,
    S.map(skill),
    h('div.st-row', {}, btn('Sharpen it', () => go('sharpen'), 'primary'), btn('Your lifetime plan', () => go('life'))),
  ];
}

// ---------- One page, to print or save as a PDF ----------
function summary(p, pl) {
  const nums = numbersOf(pl, store.doc, ref), N = id => nums.find(n => n.id === id)?.value ?? 'Needs an answer';
  const W = worryOf(mine().worry), snap = snapshotOf(pl), s = pl.step, pct = pctToFi(pl);
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return [
    h('div.st-row.st-noprint', {}, btn('Print or save as a PDF', () => window.print(), 'primary big')),
    h('div.st-card.st-page', {},
      h('div.st-eyebrow', {}, `Stress Less About Money, ${today}`), h('h1', {}, 'My plan on one page'),
      h('dl.st-kv', {},
        h('dt', {}, 'Work becomes optional'), h('dd', {}, pl.basis === 'yours' && pl.fi.date && !pl.fi.far ? pl.fi.date : pl.words.fi ?? 'Not yet known'),
        pct != null ? [h('dt', {}, 'Of the way there'), h('dd', {}, fmt.pct(pct))] : null,
        h('dt', {}, 'Left over each month'), h('dd', {}, N('surplus')),
        h('dt', {}, 'Savings rate'), h('dd', {}, N('savingsRate')),
        h('dt', {}, 'How long my cash lasts'), h('dd', {}, N('runway')),
        h('dt', {}, 'Net worth'), h('dd', {}, N('netWorth'))),
      basisTag(pl),
      s ? [h('h2', { style: { marginTop: '16px' } }, `My next step: ${s.name}`), h('p', {}, STEP_DO[s.id] ?? STEP_WHY[s.id] ?? '')] : null,
      W ? [h('h2', {}, W.label), h('ul', {}, W.steps.map((t, i) => h('li', {}, `${(mine().done || {})[`worry:${W.id}:${i}`] ? '✓ ' : ''}${t}`)))] : null,
      h('h2', {}, 'What comes next'), h('ul', {}, pl.milestones.filter(x => !x.done).slice(0, 5).map(x => h('li', {}, `${x.name}: ${x.date}`))),
      snap ? [h('h2', {}, 'One year at a glance'), h('div.st-rows', {}, snap.map(r => h(`div.st-srow.${r.kind}`, {}, h('span', {}, r.label), h('span.v', {}, `${r.sign ? `${r.sign} ` : ''}${r.value}`))))] : null,
      h('p.st-small.st-soft', { style: { marginTop: '16px' } }, 'This is education, not personal financial advice. Numbers marked typical are stand-ins until you answer them.')),
    h('div.st-row.st-noprint', {}, h('a.st-btn', { href: 'https://stresslessaboutmoney.com', target: '_blank', rel: 'noopener' }, 'Talk it through with Eli')),
  ];
}

// ---------- A money meeting for two ----------
function meet() {
  const st = mine().meet || {}, a = st.mine || {}, theirs = st.theirs || null, M = meetOf(a, theirs || {});
  const mineDone = MEET.every(m => a[m.id]);
  const pick = (id, v) => { remember({ meet: { ...st, mine: { ...a, [id]: v } } }); render(); };
  const link = `${location.origin}${location.pathname}${MEETLINK}${packMeet(a)}`;
  const copy = async () => { try { await navigator.clipboard.writeText(link); ui.meetNote = 'Link copied. Send it to them. It carries your eight answers and nothing else.'; } catch { ui.meetNote = link; } render(); };
  return [
    h('div.st-card.hero', {}, h('h1', {}, 'A money meeting for two'), h('p', { style: { marginBottom: 0 } }, theirs && !mineDone ? 'Their answers are in. Yours first, on your own. Then you see both.' : 'Eight taps each, on your own phones. Then the answers sit side by side, and you talk about the ones that differ.')),
    !mineDone || !theirs ? h('div.st-card', {}, MEET.map(m => h('div.st-field', {}, h('div.st-flabel', {}, m.q), h('div.st-chips', {}, m.a.map(v => chip(v, a[m.id] === v, () => pick(m.id, v))))))) : null,
    mineDone && !theirs ? h('div.st-card', {}, h('h2', {}, 'Now send it to them'), h('p', {}, 'They answer on their phone without seeing yours, then send the link back.'), btn('Copy the link', copy, 'primary big'), ui.meetNote ? h('p.st-note', { role: 'status', style: { wordBreak: 'break-all' } }, ui.meetNote) : null) : null,
    mineDone && theirs ? h('div.st-card', {}, h('div.st-eyebrow', {}, 'Side by side'), h('h2', {}, `You match on ${M.same} of ${MEET.length}`),
      M.rows.map(r => h(`div.st-meet${r.same ? '' : '.differ'}`, {}, h('div.st-flabel', {}, r.q), h('div.st-srow', {}, h('span', {}, 'You'), h('span.v', {}, r.mine)), h('div.st-srow', {}, h('span', {}, 'Them'), h('span.v', {}, r.theirs ?? 'No answer')))),
      M.differ.length ? h('p.st-readout', {}, `Start with: ${M.differ[0].q.toLowerCase()}. Each of you says why, before anyone answers back.`) : h('p.st-readout', {}, 'You match on all of it.'),
      h('div.st-row', {}, btn('Send mine back to them', copy, 'primary'), btn('Start over', () => { remember({ meet: null }); ui.meetNote = null; render(); }, 'text')),
      ui.meetNote ? h('p.st-note', { role: 'status', style: { wordBreak: 'break-all' } }, ui.meetNote) : null) : null,
  ];
}

// ---------- The monthly money date: five taps ----------
function moneyDate(p, pl) {
  const list = mine().dates || [], D = datesOf(list), today = new Date().toISOString().slice(0, 10), draft = ui.dateDraft || {};
  const feel = (key, label, lo, hi) => h('div.st-field', {}, h('div.st-flabel', {}, label), h('div.st-chips', {}, FEEL.map(v => chip(v === 1 ? `1 ${lo}` : v === 5 ? `5 ${hi}` : String(v), draft[key] === v, () => { ui.dateDraft = { ...draft, [key]: v }; render(); }))));
  const s = pl.step, doneToday = D.last?.at === today;
  const finish = () => { if (!(draft.calm && draft.joy)) return; remember({ dates: [...list.filter(x => x.at !== today), { at: today, calm: draft.calm, joy: draft.joy, did: !!draft.did, fi: pl.fi?.date ?? pl.words.fi ?? null }].slice(-24) }); ui.dateDraft = null; render(); window.scrollTo({ top: 0 }); };
  const word = v => (v > 0 ? `up ${v}` : v < 0 ? `down ${-v}` : 'the same');
  return [
    h('div.st-card.hero', {}, h('h1', {}, 'Your monthly money date'), h('p', { style: { marginBottom: 0 } }, doneToday ? `Done for today. ${D.count} so far.` : 'Five taps. Same day each month works well.')),
    ui.since ? h('div.st-note', { role: 'status' }, ui.since) : null,
    doneToday ? h('div.st-card', {}, h('h2', {}, 'How it is going'), h('dl.st-kv', {}, h('dt', {}, 'Calm about money'), h('dd', {}, `${D.last.calm} of 5${D.calm != null ? `, ${word(D.calm)} since last time` : ''}`), h('dt', {}, 'Joy from how I use it'), h('dd', {}, `${D.last.joy} of 5${D.joy != null ? `, ${word(D.joy)} since last time` : ''}`), h('dt', {}, 'Work becomes optional'), h('dd', {}, D.last.fi ?? 'Not yet known')),
      h('div.st-row', { style: { marginTop: '12px' } }, btn('See my plan', () => go('plan'), 'primary'))) : h('div.st-card', {},
      h('div.st-field', {}, h('div.st-flabel', {}, '1. Did anything change this month?'), h('div.st-row', {}, btn('My pay', () => go('numbers', { q: 'income' }), 'slim'), btn('My spending', () => go('numbers', { q: 'spending' }), 'slim'), btn('What I have', () => go('numbers', { q: 'cash' }), 'slim'), btn('What I owe', () => go('numbers', { q: 'card' }), 'slim'))),
      s ? h('div.st-field', {}, h('div.st-flabel', {}, `2. Your step was: ${s.name}. Did you move on it?`), h('div.st-chips', {}, [[true, 'Yes'], [false, 'Not this month']].map(([v, l]) => chip(l, draft.did === v, () => { ui.dateDraft = { ...draft, did: v }; render(); })))) : null,
      feel('calm', '3. How calm do you feel about money?', 'tense', 'calm'), feel('joy', '4. How much joy is your money buying?', 'little', 'a lot'),
      h('div.st-flabel', {}, '5. One win this month, said out loud.'),
      h('div.st-row', { style: { marginTop: '12px' } }, btn('Done', finish, draft.calm && draft.joy ? 'primary big' : 'big'), !(draft.calm && draft.joy) ? h('span.st-small.st-soft', {}, 'Tap 3 and 4 first.') : null)),
  ];
}

const SCREENS = { date: moneyDate, meet, summary, you, numbers, plan: yourPlan, see, life, drills, sharpen, tune, all: allNumbers, credits };
function render() {
  const p = P();
  if (!p.hasAge && STAGES.find(s => s.id === ui.stage)?.needs === 'age') ui.stage = 'you';
  const pl = p.hasAge ? plan() : null;
  top(); track(p, pl);
  clear($('main'), backBar(), SCREENS[ui.stage](p, pl));
  foot();
  const lit = $('main').querySelector('.flash');
  if (lit) { lit.querySelector('details')?.setAttribute('open', ''); lit.closest('details')?.setAttribute('open', ''); setTimeout(() => lit.scrollIntoView({ block: 'center' }), 0); }
}

// Come back where you left off: the plan when the picture is done, the next question when it is not.
const start = P();
const [, linked, linkedQ] = location.hash.split('/'); // a link to a screen (#/tune) opens there
ui.stage = STAGES.some(x => x.id === linked) ? linked : !start.hasAge ? 'you' : start.done ? (['plan', 'see', 'life', 'drills', 'sharpen', 'tune', 'all', 'summary', 'meet', 'date', 'credits'].includes(here().stage) ? here().stage : 'plan') : 'numbers';
ui.q = QUESTIONS.some(x => x.key === linkedQ) ? linkedQ : start.next;
if (start.hasAge && start.done) {
  const pl0 = plan(), nw = numbersOf(pl0, store.doc, ref).find(n => n.id === 'netWorth');
  const now = { at: new Date().toISOString().slice(0, 10), fi: pl0.fi?.date ?? pl0.words.fi ?? null, worth: pl0.m.netWorth?.value ?? null, spend: pl0.m.inputs.spending ?? null };
  ui.since = sinceWords(mine().last, now);
  if (mine().last?.at !== now.at) remember({ last: now });
}
if (meetIn) { remember({ meet: { ...(mine().meet || {}), theirs: meetIn } }); ui.stage = 'meet'; }
history.replaceState({ stage: ui.stage, q: ui.q, depth: 0 }, '', hashOf(ui.stage, ui.q));
render();
if (carried) clear($('overlay'), h('div.st-shade', {}, h('div.st-tour', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Open a plan from a link' },
  h('h1', {}, 'This link carries a plan'), h('p', {}, 'Open it on this device? It is saved here, in this browser.'),
  h('div.st-row.end', {}, btn('Not now', () => clear($('overlay')), 'text'), btn('Open it', async () => {
    try { const doc = await unpack(carried); saveClient(adapter, doc); open(doc); clear($('overlay')); go('plan'); }
    catch { clear($('overlay'), h('div.st-shade', {}, h('div.st-tour', { role: 'alert' }, h('h1', {}, 'That link did not open'), h('p', {}, 'It may have been cut short when it was sent. Ask for it again, or use a backup file.'), btn('OK', () => clear($('overlay')), 'primary')))); } }, 'primary')))));
