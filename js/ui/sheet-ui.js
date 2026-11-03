// Open the books: the two buttons (Open in a spreadsheet, Bring a spreadsheet back) and the review of every change
// before anything is saved. The workbook and the change list come from js/sheet/; this file only shows them.
import { h, icon } from './dom.js';
import { button, checkbox, toast } from './staples.js';
import { buildWorkbook } from '../sheet/workbook.js';
import { workbookBuffer, readWorkbook } from '../sheet/excel.js';
import { changesFrom, applyChanges } from '../sheet/import.js';
import { loadExcelJS } from '../sheet/load.js';
import { keyNumbers } from '../math/metrics.js';
import { money, pct } from '../format.js';

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
    h('div.btn-line', {}, button(WORDS.back, { iconName: 'upload', onClick: () => importSheet(app), tip: WORDS.backTip }), h('span.muted.small', { title: WORDS.backTip }, WORDS.backLine)));
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
    const a = h('a', { href: URL.createObjectURL(blob), download: `slam-${slug(plan.client)}-${now.toISOString().slice(0, 10)}.xlsx` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    toast(`Spreadsheet downloaded${coach ? ', with coach-only notes' : ''}. Open it in Excel, or upload it to Google Drive.`);
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
      review(app, changesFrom(grid, app.store.doc), file.name);
    } catch (e) {
      toast(/zip|central directory|end of data/i.test(e.message || '') ? 'That file is not an .xlsx spreadsheet. From Google Sheets, use File, Download, Microsoft Excel (.xlsx).' : e.message || 'That file could not be read.');
    }
  };
  input.click();
}

// One value in words, by the field's type.
function shown(v, type) {
  if (v === null || v === undefined || v === '') return '(blank)';
  if (type === 'money') return money(v);
  if (type === 'pct') return pct(v);
  if (type === 'yesno') return v === true ? 'Yes' : v === false ? 'No' : String(v);
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return Object.entries(v).filter(([, x]) => x != null).map(([k, x]) => `${k} ${x}`).join(', ');
  return String(v);
}
const typeOf = c => c.fld?.type ?? (c.op === 'status' ? 'text' : 'text');
function newRowText(c) {
  if (!c.values) return '';
  const label = k => c.fields?.find(f => f.key === k)?.label ?? k;
  const type = k => c.fields?.find(f => f.key === k)?.type ?? 'text';
  return Object.entries(c.values).filter(([k]) => k !== 'name').map(([k, v]) => `${label(k)} ${shown(v, type(k))}`).join(', ') || 'No numbers yet';
}

// The review: every change, grouped by tab, each with a box to tick. Nothing is saved until Save.
export function review(app, { changes, warnings, ignored }, fileName = 'the spreadsheet') {
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  const count = () => changes.filter(c => c.ok && !c.bad).length;
  const saveText = h('span', {}, 'Save');
  const save = button(saveText, { kind: 'primary', iconName: 'check', onClick: () => {
    const n = applyChanges(app.store, changes, { metrics: keyNumbers(app.ctx.metrics()) });
    close();
    toast(n ? `Saved ${n} ${n === 1 ? 'change' : 'changes'} from the spreadsheet. A snapshot was taken first.` : 'Nothing saved.', n ? { undo: () => app.store.undo() } : {});
  } });
  const label = () => { const n = count(); saveText.textContent = n ? `Save ${n} ${n === 1 ? 'change' : 'changes'}` : 'Nothing ticked'; save.disabled = !n; };
  const tabs = [...new Set(changes.map(c => c.tab))];
  const row = c => {
    const box = h('input', { type: 'checkbox', checked: c.ok && !c.bad, disabled: !!c.bad, 'aria-label': `Save: ${c.name}, ${c.label}` });
    box.onchange = () => { c.ok = box.checked; label(); };
    const what = c.op === 'add' ? h('span', {}, h('strong', {}, `${c.label}: ${c.name}`), h('br'), h('span.muted.small', {}, newRowText(c)))
      : c.op === 'remove' ? h('span', {}, h('strong', {}, c.name), h('br'), h('span.muted.small', {}, 'Taken out of the spreadsheet. Tick to delete it in SLAM too.'))
        : h('span', {}, h('strong', {}, c.name), ` · ${c.label}`);
    const notes = [c.bad ? h('span.tag.warn', {}, `Not saved: ${c.bad}`) : null,
      c.changedInSlam ? h('span.tag.warn', {}, 'Changed in SLAM after the file was made. Tick to use the spreadsheet\'s.') : null,
      c.note ? h('span.muted.small', {}, c.note) : null].filter(Boolean);
    return h('tr', {}, h('td', {}, box), h('td', { style: { whiteSpace: 'normal' } }, what, notes.length ? h('div.stack', { style: { gap: '4px', marginTop: '4px' } }, notes) : null),
      h('td.num', {}, c.op === 'edit' || c.op === 'status' ? shown(c.from, typeOf(c)) : ''),
      h('td.num', {}, c.op === 'edit' || c.op === 'status' ? h('strong', {}, shown(c.to, typeOf(c))) : ''));
  };
  const body = changes.length
    ? tabs.map(t => h('section', { style: { marginTop: '16px' } }, h('h3', {}, t),
      h('table.rows.sheet-changes', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Save'), h('th', {}, 'What changed'), h('th.num', {}, 'Now in SLAM'), h('th.num', {}, 'In the spreadsheet'))),
        h('tbody', {}, changes.filter(c => c.tab === t).map(row)))))
    : [h('p', { style: { marginTop: '16px' } }, 'No changes: every number in the spreadsheet is the same as in SLAM.')];
  const left = ignored.length ? h('details', { style: { marginTop: '16px' } }, h('summary', {}, `Left out (${ignored.length})`), h('ul.small', {}, ignored.map(x => h('li', {}, x)))) : null;
  const box = h('div.ft-box', { style: { width: 'min(960px, 100%)' } },
    h('div.ft-head', {}, icon('upload'), h('h2', { style: { margin: 0 } }, 'Bring a spreadsheet back'), h('span', { style: { flex: 1 } }), button('Cancel', { onClick: close })),
    h('p.muted', {}, `${fileName}: ${changes.length} ${changes.length === 1 ? 'change' : 'changes'} found. Nothing is saved until you press Save. Untick anything you do not want.`),
    ...warnings.map(w => h('div.nudge', { style: { marginTop: '8px' } }, w)),
    ...body, left,
    h('div.ft-foot', {}, save, button('Cancel', { onClick: close }), h('span.muted.small', {}, 'A snapshot is taken first, and Undo puts everything back.')));
  const overlay = h('div.ft-overlay', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Bring a spreadsheet back' }, box);
  overlay.onclick = e => { if (e.target === overlay) close(); };
  document.addEventListener('keydown', onKey);
  label();
  document.body.append(overlay);
  return overlay;
}
