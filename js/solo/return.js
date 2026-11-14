// SPDX-License-Identifier: AGPL-3.0-only
// Read my tax return: pick the PDF of a Form 1040, see its main lines and what they say. The file is read on this
// device (js/import/pdf-text.js) and is not uploaded. The reading is js/import/tax1040.js; the numbers that follow are
// js/math/taxreturn.js. This page only shows them and keeps the lines in the plan.
import { h } from '../ui/dom.js';
import { Store, newHousehold } from '../records.js';
import { pack, unpack } from '../start/link.js';
import { activeSpace, deviceAdapter } from '../accounts.js';
import { money, btn, chip } from './shell.js';
import { LINES, read1040 } from '../import/tax1040.js';
import { returnPicture } from '../math/taxreturn.js';

const $ = id => document.getElementById(id), device = deviceAdapter(), HERE = '#/d/';
const ref = await fetch('data/reference-2026.json').then(r => r.json());
let doc = null;
if (location.hash.startsWith(HERE)) { try { doc = await unpack(location.hash.slice(HERE.length)); } catch { doc = null; } }
const space = activeSpace(device.loadAccount());
if (!doc && space) { const kept = device.loadSpace(space.id); if (kept) { try { doc = await unpack(kept); } catch { doc = null; } } }
const store = new Store(doc ?? newHousehold({ name: 'My plan' }));
const mine = () => store.doc.settings?.start || {}, remember = patch => store.setDoc('settings', { start: { ...mine(), ...patch } });
const save = async () => { const packed = await pack(store.doc); history.replaceState(null, '', `${location.pathname}${HERE}${packed}`); const sp = activeSpace(device.loadAccount()); if (sp) device.saveSpace(sp.id, packed); return packed; };
const STATUS = ['Single', 'Married jointly', 'Head of household'], pct = r => `${Math.round(r * 1000) / 10}%`;
const ui = { read: null, busy: false, note: null, status: store.doc.taxes?.filingStatus ?? mine().return?.filingStatus ?? null };

async function pick(file) {
  if (!file) return; ui.busy = true; ui.note = null; draw();
  try { const { pdfPages } = await import('../import/pdf-text.js'); ui.read = read1040(await pdfPages(await file.arrayBuffer()));
    if (!ui.read.is1040) { ui.note = ui.read.found ? 'Only a few lines could be read. Check them below before keeping them.' : 'No Form 1040 lines could be read from this file. A scan or a photo of a return has no text in it to read: the PDF your tax software saved works.'; if (!ui.read.found) ui.read = null; } }
  catch { ui.read = null; ui.note = 'That file could not be opened as a PDF.'; }
  ui.busy = false; draw();
}

function draw() {
  const kept = mine().return ?? null, R = ui.read, shown = R ?? (kept ? { year: kept.year, lines: kept.lines } : null), status = ui.status, fresh = !!R;
  const P = shown ? returnPicture(shown.lines, status ?? 'Single', ref) : null, packed = store.doc;
  $('step').textContent = shown?.year ? `${shown.year} return` : '';
  const fileBtn = h(`label.st-btn.big${shown ? '' : '.primary.st-pulse'}`, { for: 'file' }, ui.busy ? 'Reading it...' : shown ? 'Pick a different PDF' : 'Pick the PDF of my return');
  const say = [];
  if (P?.effective != null) say.push(`Of every $100 that came in, about $${Math.round(P.effective * 100)} went to federal income tax (${pct(P.effective)}).`);
  if (P?.bracket) say.push(`Your last dollars were taxed at ${pct(P.bracket.rate)}.${P.bracket.room != null ? ` About ${money(Math.round(P.bracket.room / 100) * 100)} more would fit before the ${pct(P.bracket.nextRate)} bracket, measured against ${ref.year ?? 'this year'}'s brackets.` : ''}`);
  if (P?.refund) say.push(`You got ${money(P.refund.amount)} back. That is about ${money(Math.round(P.refund.perMonth))} a month that could have been in your pay instead.`);
  if (P?.owe) say.push(`You owed ${money(P.owe.amount)} at filing, about ${money(Math.round(P.owe.perMonth))} a month to set aside so it is not a surprise.`);
  if (P?.laterMoney > 0) say.push(`${money(P.laterMoney)} of taxed-later money came out (IRA or pension).`);
  $('main').replaceChildren(...[
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Read my tax return'), h('h1', {}, shown ? `Your ${shown.year ?? ''} return, in plain numbers`.replace('  ', ' ') : 'Let the return fill in the tax picture'),
      h('p', {}, 'Pick the PDF of your Form 1040. It is read on this device. It is not uploaded and not kept: only the handful of totals below go into your plan, and only if you say so.'),
      h('div.st-row', {}, fileBtn, h('input', { id: 'file', type: 'file', accept: 'application/pdf,.pdf', class: 'st-filehide', onChange: e => pick(e.target.files?.[0]) }))),
    ui.note ? h('p.st-note', { role: 'status' }, ui.note) : null,
    shown ? h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, 'What it says'),
      say.length ? h('ul.st-saylist', {}, say.map(t => h('li', {}, t))) : h('p.st-small', {}, 'Not enough lines were read to say more.'),
      h('div.st-field', {}, h('div.st-flabel', {}, 'How you filed'), h('div.st-row', {}, STATUS.map((s, i) => { const c = chip(s, status === s, () => { ui.status = s; draw(); }); if (!status && i === 0) c.classList.add('st-pulse'); return c; })), h('div.st-small.st-soft', { style: { marginTop: '4px' } }, 'The bracket depends on this. The reader does not pick it off the form.')),
      fresh || (kept && status && status !== kept.filingStatus) ? h('div.st-row', { style: { marginTop: '10px' } }, btn('Keep these in my plan', async () => { remember({ return: { year: shown.year ?? null, filingStatus: status, lines: shown.lines, on: new Date().toISOString().slice(0, 10) } }); if (status) store.setDoc('taxes', { ...(store.doc.taxes || {}), filingStatus: status }); ui.read = null; await save(); ui.note = 'Kept. The totals are in your plan; the file itself was not.'; draw(); }, `primary${status ? ' st-pulse' : ''}`), fresh ? btn('Do not keep', () => { ui.read = null; ui.note = null; draw(); }, 'slim text') : null) : null) : null,
    shown ? h('details.st-card', {}, h('summary', {}, `The lines that were read (${Object.keys(shown.lines).length} of ${LINES.length})`),
      h('dl.st-sheetlines', {}, LINES.map(L => [h('dt', {}, L.label), h('dd', {}, typeof shown.lines[L.id] === 'number' ? money(shown.lines[L.id]) : h('span.st-soft', {}, 'Blank or not read'))])),
      h('p.st-small.st-soft', { style: { marginBottom: 0 } }, 'A line is found by the words printed on the form and the amount at the right edge. An amount under $100 with no cents reads as blank. Check these against the return before relying on them.')) : null,
    h('div.st-row', {}, h('a.st-btn.slim', { href: 'one.html' }, 'Back to the front page'), kept && !fresh ? btn('Forget this return', async () => { const { return: _gone, ...rest } = mine(); store.setDoc('settings', { start: rest }); await save(); ui.note = 'Forgotten.'; draw(); }, 'slim text') : null),
  ].filter(Boolean));
  void packed;
}
draw();
