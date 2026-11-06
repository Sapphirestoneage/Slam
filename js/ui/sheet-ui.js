// SPDX-License-Identifier: AGPL-3.0-only
// Open the books: the two buttons (Open in a spreadsheet, Bring a spreadsheet back) and the review of every change
// before anything is saved. The workbook and the change list come from js/sheet/; this file only shows them.
import { h, icon } from './dom.js';
import { button, checkbox, toast } from './staples.js';
import { saveFile, saveWords } from './save-file.js';
import { buildWorkbook } from '../sheet/workbook.js';
import { workbookBuffer, readWorkbook } from '../sheet/excel.js';
import { compare, applyChanges, linesOf, unpicked } from '../import-sheet.js';
import { loadExcelJS } from '../sheet/load.js';
import { keyNumbers } from '../math/metrics.js';
import { money, pct } from '../format.js';
import { intakeButton } from './intake-ui.js';

export const WORDS = {
  open: 'Open in a spreadsheet',
  openLine: 'Download a file with every number and formula. Opens in Excel, or upload it to Google Drive to open in Google Sheets.',
  back: 'Bring a spreadsheet back',
  backLine: "Been using your spreadsheet? Upload it here. You'll see every change before anything is saved.",
  backTip: 'From Google Sheets, download it first: File, Download, Microsoft Excel (.xlsx).',
  coach: 'Include coach-only notes',
};
const UI = { coach: false };
const slug = s => String(s || 'client').replace(/\W+/g, '-').replace(/^-|-$/g, '').toLowerCase();

// The two buttons, each with its one line under it. coachBox: the coach-only checkbox (hidden in client view).
export function sheetButtons(app, { coachBox = true } = {}) {
  const clientView = !!app.prefs?.clientView;
  return h('div.sheet-actions', {},
    h('div.btn-line', {}, button(WORDS.open, { iconName: 'sheet', onClick: e => exportSheet(app, e.currentTarget) }), h('span.muted.small', {}, WORDS.openLine),
      coachBox && !clientView ? h('span.coach-only', {}, checkbox(WORDS.coach, UI.coach, v => { UI.coach = v; }, { key: 'sheet:coach' })) : null),
    h('div.btn-line', {}, button(WORDS.back, { iconName: 'upload', onClick: () => importSheet(app), tip: WORDS.backTip }), h('span.muted.small', { title: WORDS.backTip }, WORDS.backLine)),
    intakeButton(app));
}

export async function exportSheet(app, btn = null) {
  if (!app.hasClient) { toast('Open a client first.'); return; }
  const doc = app.store.doc;
  const now = new Date();
  const coach = UI.coach && !app.prefs?.clientView; // the client view never carries coach-only notes
  if (btn) btn.disabled = true;
  try {
    const ExcelJS = await loadExcelJS();
    const plan = buildWorkbook(doc, app.ctx.ref, { now, coach, flags: app.flags || [] });
    const blob = new Blob([await workbookBuffer(ExcelJS, plan)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const result = await saveFile(blob, `slam-${slug(plan.client)}-${now.toISOString().slice(0, 10)}.xlsx`); // batch 7, item 1: works inside the artifact too
    toast(saveWords(result, 'The spreadsheet') ?? `Spreadsheet downloaded${coach ? ', with coach-only notes' : ''}. Open it in Excel, or upload it to Google Drive.`);
  } catch (e) {
    toast(e.message || 'The spreadsheet could not be made.');
  } finally { if (btn) btn.disabled = false; }
}

export function importSheet(app) {
  if (!app.hasClient) { toast('Open a client first: changes are saved to the open client.'); return; }
  const input = h('input', { type: 'file', accept: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const ExcelJS = await loadExcelJS();
      const grid = await readWorkbook(ExcelJS, await file.arrayBuffer());
      const res = compare(grid, app.store.doc, { ref: app.ctx.ref });
      if (res.wrongClient) askWhichClient(app, grid, res, file.name);
      else review(app, res, file.name);
    } catch (e) {
      toast(/zip|central directory|end of data/i.test(e.message || '') ? 'That file is not an .xlsx spreadsheet. From Google Sheets, use File, Download, Microsoft Excel (.xlsx).' : e.message || 'That file could not be read.');
    }
  };
  input.click();
}

export function overlayOf(label, box, onClose) {
  const overlay = h('div.ft-overlay', { role: 'dialog', 'aria-modal': 'true', 'aria-label': label }, box);
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); onClose?.(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  overlay.onclick = e => { if (e.target === overlay) close(); };
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  return close;
}

// The file is for another client: ask first.
export function askWhichClient(app, grid, res, fileName) {
  const theirs = res.meta?.client || 'another client';
  const mine = app.store.doc.client?.name || 'this client';
  let close;
  const box = h('div.ft-box', { style: { width: 'min(560px, 100%)' } },
    h('h2', { style: { marginTop: 0 } }, `This file is for ${theirs}`),
    h('p', {}, `${mine} is open. Bring the spreadsheet into ${mine} anyway, or start a new client from it?`),
    h('div.ft-foot', {},
      button(`Bring it into ${mine}`, { kind: 'primary', onClick: () => { close(); review(app, compare(grid, app.store.doc, { ref: app.ctx.ref }), fileName); } }),
      button('Start a new client from it', { onClick: () => { close(); const store = app.newClientNamed(res.meta?.client || 'From a spreadsheet'); review(app, compare(grid, store.doc, { asNew: true, ref: app.ctx.ref }), fileName); } }),
      button('Cancel', { onClick: () => close() })));
  close = overlayOf('Which client', box);
  return box;
}

// One value in words, by the field's type.
function shown(v, type) {
  if (v === null || v === undefined || v === '') return '(blank)';
  if (type === 'money') return money(v);
  if (type === 'pct') return pct(v);
  if (type === 'yesno') return v === true ? 'Yes' : v === false ? 'No' : String(v);
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}
function newRowText(c) {
  if (!c.values) return '';
  const f = k => c.fields?.find(x => x.key === k);
  return Object.entries(c.values).filter(([k]) => k !== 'name').map(([k, v]) => `${f(k)?.label ?? k} ${shown(v, f(k)?.type ?? 'text')}`).join(', ') || 'No numbers yet';
}
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// What changed, and Yes or No on keeping it. A conflict says what each side did and needs an answer.
function question(l) {
  const t = l.fld?.type;
  if (l.op === 'add') return 'Add it to SLAM?';
  if (l.op === 'remove') return 'Delete it in SLAM too?';
  if (l.conflict) return "Keep your spreadsheet's number?";
  return 'Keep this change?';
}
function whatChanged(l) {
  const t = l.fld?.type;
  if (l.op === 'add') return newRowText(l);
  if (l.op === 'remove') return 'Taken out of your spreadsheet. It stays in SLAM unless you say Yes.';
  if (l.conflict) return `Both changed it after the file was made. In SLAM: ${shown(l.was, t)} to ${shown(l.from, t)}. In your spreadsheet: ${shown(l.was, t)} to ${shown(l.to, t)}.`;
  return `${shown(l.from, t)} to ${shown(l.to, t)}`;
}
function choice(l, redraw) {
  return h('span.row-line', { style: { gap: '8px', flexWrap: 'nowrap' } }, h('span.small', {}, question(l)),
    h('span.seg', { role: 'group', 'aria-label': question(l) }, [['keep', 'Yes'], ['skip', 'No']].map(([v, label]) =>
      h('button', { type: 'button', 'aria-pressed': String(l.decision === v), onclick: () => { l.decision = v; redraw(); } }, label))));
}

// The review: grouped by area, collapsed to counts. Nothing is saved until Save these changes.
export function review(app, res, fileName = 'the spreadsheet') {
  let close;
  const open = new Set();
  const body = h('div');
  const saveText = h('span', {}, 'Save these changes');
  const save = button(saveText, { kind: 'primary', iconName: 'check', onClick: () => {
    const n = applyChanges(app.store, res, { metrics: keyNumbers(app.ctx.metrics()) });
    close();
    toast(n ? `Saved ${plural(n, 'change')} from your spreadsheet. A snapshot was taken first.` : 'Nothing saved.', n ? { undo: () => app.store.undo() } : {});
  } });
  const status = h('span.muted.small');
  const keepAll = list => { for (const l of list) if (!l.conflict && !l.needsType && !l.needsCategory) l.decision = 'keep'; draw(); };
  const lineRow = l => h('div.review-line', {},
    h('div', {}, h('strong', {}, l.op === 'add' ? `${l.label}: ${l.name}` : l.op === 'remove' ? l.name : `${l.name} · ${l.label}`),
      h('div.small', {}, whatChanged(l)), l.note ? h('div.small.muted', {}, l.note) : null),
    l.needsType || l.needsCategory ? h('span.row-line', { style: { gap: '6px' } }, picker(l)) : choice(l, draw));
  // A new row SLAM could not place: pick its type (or a Budget line's category), then Yes or No.
  const picker = l => {
    const list = l.needsType ?? l.needsCategory, now = l.needsType ? l.type : l.values.category;
    const sel = h('select', { 'aria-label': `What ${l.name} is` }, h('option', { value: '' }, l.needsType ? 'Pick the type' : 'Pick the category'), list.map(t => h('option', { value: t, selected: now === t }, t)));
    sel.onchange = () => { const v = sel.value || null; if (l.needsType) l.type = v; else l.values.category = v; l.decision = v ? 'keep' : 'skip'; draw(); };
    return [sel, now ? choice(l, draw) : null];
  };
  const groupBox = (key, title, counts, lines, extra = null) => {
    const d = h('details.review-group', { open: open.has(key) });
    d.ontoggle = () => { if (d.open) open.add(key); else open.delete(key); };
    d.append(h('summary', {}, h('strong', {}, title), h('span.muted', {}, `  ${counts}`)),
      h('div.review-body', {}, lines.length ? h('div.row-line', { style: { margin: '8px 0' } }, button('Yes to all', { size: 'small', onClick: () => keepAll(lines) })) : null, extra));
    return d;
  };
  const sub = (title, lines) => (lines.length ? [h('h4', {}, title), ...lines.map(lineRow)] : []);
  function draw() {
    const lines = linesOf(res);
    const kept = lines.filter(l => l.decision === 'keep' || l.decision === 'sheet').length;
    const left = unpicked(res).length;
    saveText.textContent = 'Save these changes';
    save.disabled = !kept || left > 0;
    status.textContent = left ? `Answer Yes or No for ${plural(left, 'number')} changed in both places first.` : `${plural(kept, 'change')} to save.`;
    body.replaceChildren(...[
      ...res.areas.map(g => groupBox(g.id, g.tab, [g.changed.length && `${g.changed.length} changed`, g.added.length && plural(g.added.length, 'new row'), g.removed.length && `${g.removed.length} removed`].filter(Boolean).join(', '),
        [...g.changed, ...g.added, ...g.removed], h('div', {}, ...sub('Changed', g.changed), ...sub('New rows', g.added), ...sub('Removed rows', g.removed)))),
      res.assumptions.length ? groupBox('assumptions', 'Changed assumptions', `${res.assumptions.length} changed`, res.assumptions, h('div', {}, ...res.assumptions.map(lineRow))) : null,
      res.unknown.length ? groupBox('unknown', "Couldn't tell what this is", `${res.unknown.length}`, [], h('div', {}, ...res.unknown.map(u => (u.op === 'add' ? lineRow(u) : h('div.review-line', {}, h('div', {}, h('strong', {}, u.name), h('div.muted.small', {}, `${u.cell}: ${u.note}`))))))) : null,
      res.typedOver.length ? groupBox('typed', 'Typed over a formula', `${res.typedOver.length}`, [], h('ul.small', {}, res.typedOver.map(t => h('li', {}, t.text)))) : null,
      res.bad.length ? groupBox('bad', "Couldn't read these (skipped)", `${res.bad.length}`, [], h('ul.small', {}, res.bad.map(b => h('li', {}, b.text)))) : null,
      res.leftAlone.length ? groupBox('alone', 'Left alone', `${res.leftAlone.length}`, [], h('ul.small', {}, res.leftAlone.map(x => h('li', {}, x)))) : null,
      !lines.length && !res.unknown.length ? h('p', {}, 'No changes: every number in the spreadsheet is the same as in SLAM.') : null].filter(Boolean));
  }
  const all = linesOf(res);
  const box = h('div.ft-box', { style: { width: 'min(960px, 100%)' } },
    h('div.ft-head', {}, icon('upload'), h('h2', { style: { margin: 0 } }, "What's changed"), h('span', { style: { flex: 1 } }), button('Cancel', { onClick: () => close() })),
    h('p.muted', {}, `${fileName}: ${plural(all.length, 'change')}. Answer Yes to keep a change, No to leave SLAM as it is. Nothing is saved until you press Save these changes.`),
    res.noMeta ? h('div.nudge', {}, 'This file has no _meta tab (it was made or rebuilt outside SLAM), so tabs and columns were matched by their headers and every cell is compared with what SLAM has now.') : null,
    res.olderFormat ? h('div.nudge', {}, `This file was made by an older SLAM (format ${res.meta.version}). Columns added since are left alone.`) : null,
    h('div.row-line', { style: { margin: '8px 0' } }, button('Yes to all changes', { size: 'small', onClick: () => keepAll(all.filter(l => l.op !== 'remove')) })),
    body,
    h('div.ft-foot', {}, save, button('Cancel', { onClick: () => close() }), status, h('span.muted.small', {}, 'A snapshot is taken first, and Undo puts everything back.')));
  draw();
  close = overlayOf('Bring a spreadsheet back', box);
  return box;
}
