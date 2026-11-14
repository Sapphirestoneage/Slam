// SPDX-License-Identifier: AGPL-3.0-only
// Read my papers: pick the PDF of a tax return (Form 1040), a W-2, a pay stub or a New York return. Each is read on
// this device (js/import/pdf-text.js) and is not uploaded. Reading: js/import/tax1040.js and js/import/papers.js. The
// numbers that follow: js/math/taxreturn.js. Where a paper and the plan disagree: js/lifetime/inputs.js gapsOf. This
// page shows them, points out the gaps, and keeps only the totals in the plan.
import { h } from '../ui/dom.js';
import { Store, newHousehold } from '../records.js';
import { pack, unpack } from '../start/link.js';
import { activeSpace, deviceAdapter } from '../accounts.js';
import { planOf, answer } from '../journey.js';
import { money, btn, chip } from './shell.js';
import { LINES } from '../import/tax1040.js';
import { readPaper, W2_BOXES, STUB_LINES, NY_LINES } from '../import/papers.js';
import { returnPicture, w2Picture, stubPicture, nyPicture } from '../math/taxreturn.js';
import { gapsOf } from '../lifetime/inputs.js';
import { flagCard } from './papers-ui.js';

const $ = id => document.getElementById(id), device = deviceAdapter(), HERE = '#/d/';
const [ref, priors, flags] = await Promise.all([fetch('data/reference-2026.json').then(r => r.json()), fetch('data/priors-2026.json').then(r => r.json()), fetch('data/flags.json').then(r => r.json())]);
let doc = null;
if (location.hash.startsWith(HERE)) { try { doc = await unpack(location.hash.slice(HERE.length)); } catch { doc = null; } }
const space = activeSpace(device.loadAccount());
if (!doc && space) { const kept = device.loadSpace(space.id); if (kept) { try { doc = await unpack(kept); } catch { doc = null; } } }
const store = new Store(doc ?? newHousehold({ name: 'My plan' }));
const mine = () => store.doc.settings?.start || {}, remember = patch => store.setDoc('settings', { start: { ...mine(), ...patch } });
const save = async () => { const packed = await pack(store.doc); history.replaceState(null, '', `${location.pathname}${HERE}${packed}`); const sp = activeSpace(device.loadAccount()); if (sp) device.saveSpace(sp.id, packed); };
const STATUS = ['Single', 'Married jointly', 'Head of household'], PAYS = [[52, 'Every week'], [26, 'Every two weeks'], [24, 'Twice a month'], [12, 'Once a month']];
const KEY = { return: 'return', w2: 'w2', stub: 'stub', ny: 'ny' }, NAME = { return: 'tax return', w2: 'W-2', stub: 'pay stub', ny: 'New York return' };
const pct = r => `${Math.round(r * 1000) / 10}%`, near = v => money(Math.round(v / 100) * 100), whole = v => money(Math.round(v)), today = () => new Date().toISOString().slice(0, 10);
const ui = { fresh: {}, busy: false, note: null, status: store.doc.taxes?.filingStatus ?? mine().return?.filingStatus ?? null, perYear: mine().stub?.perYear ?? null };

async function pick(files) {
  if (!files?.length) return; ui.busy = true; ui.note = null; draw();
  const missed = [];
  try { const { pdfPages } = await import('../import/pdf-text.js');
    for (const f of files) { let R = null; try { R = readPaper(await pdfPages(await f.arrayBuffer())); } catch { R = null; } if (R?.kind && R.found) ui.fresh[R.kind] = R; else missed.push(f.name); } }
  catch { missed.push(...[...files].map(f => f.name)); }
  ui.note = missed.length ? `Nothing could be read from ${missed.length === 1 ? 'that file' : `${missed.length} of the files`}. A scan or a photo has no text in it to read: the PDF your tax or payroll site saved works.` : null;
  ui.busy = false; draw();
}
const keep = async () => { const patch = {};
  for (const [k, R] of Object.entries(ui.fresh)) patch[KEY[k]] = { year: R.year ?? null, lines: R.lines, on: today(), ...(k === 'return' ? { filingStatus: ui.status } : {}), ...(k === 'stub' ? { perYear: ui.perYear } : {}) };
  if (mine().return && !ui.fresh.return && ui.status) patch.return = { ...mine().return, filingStatus: ui.status };
  if (mine().stub && !ui.fresh.stub && ui.perYear) patch.stub = { ...mine().stub, perYear: ui.perYear };
  remember(patch); if (ui.status) store.setDoc('taxes', { ...(store.doc.taxes || {}), filingStatus: ui.status }); ui.fresh = {}; await save(); ui.note = 'Kept. The totals are in your plan; the files themselves were not.'; draw(); };

function draw() {
  const st = mine(), shown = {}; for (const k of Object.keys(KEY)) { const R = ui.fresh[k] ?? (st[KEY[k]] ? { ...st[KEY[k]], kept: true } : null); if (R) shown[k] = R; }
  const any = Object.keys(shown).length > 0, fresh = Object.keys(ui.fresh).length > 0, status = ui.status, perYear = ui.perYear;
  // gaps are worked out on the plan as it would be with these papers kept, so they show before the Keep tap too
  const trial = { ...store.doc, settings: { ...(store.doc.settings || {}), start: { ...st, ...Object.fromEntries(Object.entries(shown).map(([k, R]) => [KEY[k], { lines: R.lines, year: R.year ?? null, perYear: k === 'stub' ? perYear : undefined }])) } } };
  let plan = null; try { plan = planOf(store.doc, ref, priors, { flags }); } catch { plan = null; }
  const gaps = any ? gapsOf(plan, trial, ref) : [];
  $('step').textContent = any ? `${Object.keys(shown).length} ${Object.keys(shown).length === 1 ? 'paper' : 'papers'}` : '';
  const dirty = fresh || (st.return && status && status !== st.return.filingStatus) || (st.stub && perYear && perYear !== st.stub.perYear);
  const needs = shown.return && !status ? 'status' : shown.stub && !perYear ? 'pays' : dirty ? 'keep' : null; // the one thing that pulses

  const cards = [];
  if (shown.return) { const R = shown.return, P = returnPicture(R.lines, status ?? 'Single', ref), say = [];
    if (P.effective != null) say.push(`Of every $100 that came in, about $${Math.round(P.effective * 100)} went to federal income tax (${pct(P.effective)}).`);
    if (P.bracket) say.push(`Your last dollars were taxed at ${pct(P.bracket.rate)}.${P.bracket.room != null ? ` About ${near(P.bracket.room)} more would fit before the ${pct(P.bracket.nextRate)} bracket, measured against ${ref.year ?? 'this year'}'s brackets.` : ''}`);
    if (P.refund) say.push(`You got ${whole(P.refund.amount)} back. That is about ${whole(P.refund.perMonth)} a month that could have been in your pay instead.`);
    if (P.owe) say.push(`You owed ${whole(P.owe.amount)} at filing, about ${whole(P.owe.perMonth)} a month to set aside so it does not arrive all at once.`);
    if (P.laterMoney > 0) say.push(`${whole(P.laterMoney)} of taxed-later money came out (IRA or pension).`);
    cards.push(paper('return', `Your ${R.year ?? ''} tax return`.replace('  ', ' '), say, LINES, R,
      h('div.st-field', {}, h('div.st-flabel', {}, 'How you filed'), h('div.st-row', {}, STATUS.map((s, i) => { const c = chip(s, status === s, () => { ui.status = s; draw(); }); if (needs === 'status' && i === 0) c.classList.add('st-pulse'); return c; })), h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'The bracket depends on this. The reader does not pick it off the form.')))); }
  if (shown.w2) { const R = shown.w2, P = w2Picture(R.lines), say = [];
    if (P.wages != null) say.push(`${whole(P.wages)} in taxable wages${P.withheldShare != null ? `, with ${pct(P.withheldShare)} of it held back for federal income tax` : ''}.`);
    if (P.saved) say.push(`${whole(P.saved)} went into the retirement plan at work${P.savedShare != null ? ` (${pct(P.savedShare)} of pay)` : ''}.`);
    if (P.hsa) say.push(`${whole(P.hsa)} went into a health savings account.`);
    if (P.stateTax) say.push(`${whole(P.stateTax)} was held back for state and local income tax.`);
    cards.push(paper('w2', `Your ${R.year ?? ''} W-2`.replace('  ', ' '), say, [...W2_BOXES, { id: 'k401', label: 'Box 12: retirement plan, before tax' }, { id: 'roth401', label: 'Box 12: retirement plan, Roth' }, { id: 'hsa', label: 'Box 12: health savings account' }, { id: 'healthCost', label: 'Box 12: cost of health cover' }], R)); }
  if (shown.stub) { const R = shown.stub, P = stubPicture(R.lines, perYear), say = [];
    if (P.netMonth != null) say.push(`About ${whole(P.netMonth)} lands in your bank a month, from ${whole(P.grossMonth)} before anything comes out.`);
    if (P.keptShare != null) say.push(`You keep ${pct(P.keptShare)} of each pay.${P.taxShare != null ? ` Taxes take ${pct(P.taxShare)}.` : ''}${P.savedShare != null ? ` ${pct(P.savedShare)} goes to the retirement plan.` : ''}`);
    if (P.other > 1) say.push(`${whole(P.other)} of this pay went to something the reader did not name. Check the stub for it.`);
    cards.push(paper('stub', 'Your pay stub', say, STUB_LINES, R,
      h('div.st-field', {}, h('div.st-flabel', {}, 'How often you get paid'), h('div.st-row', {}, PAYS.map(([n, label], i) => { const c = chip(label, perYear === n, () => { ui.perYear = n; draw(); }); if (needs === 'pays' && i === 0) c.classList.add('st-pulse'); return c; })), h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'This turns one pay into money a month.')))); }
  if (shown.ny) { const R = shown.ny, P = nyPicture(R.lines), say = [];
    if (P.tax != null) say.push(`${whole(P.tax)} went to New York${P.city ? ' State and City' : ''} income tax${P.effective != null ? `, ${pct(P.effective)} of your New York income` : ''}.`);
    if (P.city) say.push(`${whole(P.city)} of that was the New York City resident tax.`);
    if (P.refund) say.push(`New York sent ${whole(P.refund.amount)} back, about ${whole(P.refund.perMonth)} a month.`);
    if (P.owe) say.push(`You owed New York ${whole(P.owe.amount)} at filing, about ${whole(P.owe.perMonth)} a month to set aside.`);
    cards.push(paper('ny', `Your ${R.year ?? ''} New York return`.replace('  ', ' '), say, NY_LINES, R)); }

  function paper(k, title, say, defs, R, extra = null) {
    return h('div.st-card.st-paper', { 'data-paper': k }, h('h2', {}, title, R.kept ? null : h('span.st-booktag', { style: { marginLeft: '8px' } }, 'Just read')),
      say.length ? h('ul.st-saylist', {}, say.map(t => h('li', {}, t))) : h('p.st-small', {}, 'Not enough lines were read to say more.'), extra,
      h('details', {}, h('summary', {}, `The lines that were read (${Object.keys(R.lines).length} of ${defs.length})`), h('dl.st-sheetlines', {}, defs.map(L => [h('dt', {}, L.label), h('dd', {}, typeof R.lines[L.id] === 'number' ? money(R.lines[L.id]) : h('span.st-soft', {}, 'Blank or not read'))])),
        h('p.st-small.st-soft', { style: { marginBottom: 0 } }, 'Each line is found by the words printed on the paper. Check these against the paper before relying on them.')),
      R.kept ? h('div.st-row', { style: { marginTop: '8px' } }, btn(`Forget this ${NAME[k]}`, async () => { const { [KEY[k]]: _gone, ...rest } = mine(); store.setDoc('settings', { start: rest }); await save(); ui.note = 'Forgotten.'; draw(); }, 'slim text')) : null);
  }
  const useIt = g => (g.id === 'takeHome' && !fresh ? h('div.st-row', {}, btn(`Use ${whole(g.paper)} a month in my plan`, async () => { answer(store, 'income', { takeHome: Math.round(g.paper) }); await save(); ui.note = `Done. Your plan now works from ${whole(g.paper)} a month.`; draw(); }, `primary${needs ? '' : ' st-pulse'}`)) : null);
  $('main').replaceChildren(...[
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Read my papers'), h('h1', {}, any ? 'Your papers, in plain numbers' : 'Let your papers fill in the picture'),
      h('p', {}, 'Pick the PDF of a tax return (Form 1040), a W-2, a pay stub or a New York return. More than one at a time is fine. Each is read on this device. Nothing is uploaded, and only the totals go into your plan, if you say so.'),
      h('div.st-row', {}, h(`label.st-btn.big${any ? '' : '.primary.st-pulse'}`, { for: 'file' }, ui.busy ? 'Reading...' : any ? 'Read another PDF' : 'Pick a PDF'), h('input', { id: 'file', type: 'file', accept: 'application/pdf,.pdf', multiple: '', class: 'st-filehide', onChange: e => pick(e.target.files) }))),
    ui.note ? h('p.st-note', { role: 'status' }, ui.note) : null,
    flagCard(gaps, { action: useIt }),
    dirty ? h('div.st-row', {}, btn(fresh ? 'Keep these in my plan' : 'Save the change', keep, `primary${needs === 'keep' ? ' st-pulse' : ''}`), fresh ? btn('Do not keep', () => { ui.fresh = {}; ui.note = null; draw(); }, 'slim text') : null) : null,
    ...cards,
    h('div.st-row', {}, h('a.st-btn.slim', { href: 'one.html' }, 'Back to the front page')),
  ].filter(Boolean));
}
draw();
