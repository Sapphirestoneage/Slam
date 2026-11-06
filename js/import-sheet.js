// SPDX-License-Identifier: AGPL-3.0-only
// Bring a spreadsheet back: read an edited workbook and compare it with SLAM. Pure: no DOM. Reads the Assumptions tab
// and every screen tab through the field registry: a row by the hidden key in its column A (a field, a record's id, a
// section band, a blank row), a column by the hidden row of keys above its header (batch 59), never by position. A
// file of format 49 or before (one tab per area) is read by its tab names and headers. The review screen
// (js/ui/sheet-ui.js) shows the result; applyChanges saves what was kept.
//
// compare(grid, doc) returns, by area: Changed (field, old, new), New rows, Removed rows; Changed assumptions;
// Couldn't tell what this is; typed over a formula; bad values with their cell; columns left alone. Each line has a
// decision: 'keep' (Yes) or 'skip' (No). A conflict (the same number changed in SLAM and in the spreadsheet) starts
// with none and needs an answer. Nothing is saved here.
import { nightsStale, hasNights, nightsRollUp, NIGHT_KEYS, setNight, addNight, removeNight } from './math/earnings.js';
import { AREAS, sheetFields } from './registry/fields.js';
import { ASSUMPTIONS } from './registry/assumptions.js';
import { DATA_TAB, OLD_DATA_TAB, STATUS_WORDS, KEY, toCell, partOf, rowsForArea, formulaCols, colLetter } from './sheet/workbook.js';
import { decodeDefaults, tabOfArea, SCREEN_TABS } from './registry/tabs.js';
import { foldDoc, SHARE } from './privacy.js';
import { addInstitution } from './institutions.js';
import { fingerprint, FORMAT_VERSION } from './sheet/format.js';
const OLD_TYPES = { 'Savings or HYSA': 'Savings' };

const STATUS_BACK = { ...Object.fromEntries(Object.entries(STATUS_WORDS).map(([k, v]) => [v.toLowerCase(), k])), "i'll find it later": 'Will email' }; // the old word, in files of format 49 and before
const getPath = (o, path) => path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const isBlankCell = v => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const BUILTIN_LABELS = ['slam id (leave as is)', 'kind', 'type', 'status', 'in the math', 'month (yyyy-mm)', 'budget line'];

// A cell back to what SLAM stores: { value } or { bad: 'why' }.
export function fromCell(type, v, fld = {}) {
  if (isBlankCell(v)) return { value: null };
  if (['money', 'number', 'day', 'pct'].includes(type)) {
    let n = typeof v === 'number' ? v : Number(String(v).replace(/[$,\s]/g, '').replace(/%$/, ''));
    if (!Number.isFinite(n)) return { bad: `${v} is not a number` };
    if (type === 'pct' && typeof v === 'string' && /%\s*$/.test(v)) n /= 100;
    else if (type === 'pct' && Math.abs(n) > 1.5) return { value: n / 100, note: `read ${n} as ${n}%` };
    if (type === 'day' && !(Number.isInteger(n) && n >= 1 && n <= 31)) return { bad: `${v} is not a day of the month (1 to 31)` };
    return { value: n };
  }
  if (type === 'date' || type === 'month') {
    let iso = null;
    if (v instanceof Date) iso = v.toISOString().slice(0, 10);
    else if (typeof v === 'number') iso = new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10);
    else {
      const s = String(v).trim();
      const ymd = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(s), mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s), my = /^(\d{1,2})\/(\d{4})$/.exec(s);
      if (ymd) iso = `${ymd[1]}-${ymd[2].padStart(2, '0')}-${(ymd[3] || '1').padStart(2, '0')}`;
      else if (mdy) iso = `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
      else if (my) iso = `${my[2]}-${my[1].padStart(2, '0')}-01`;
      if (iso && Number.isNaN(Date.parse(iso))) iso = null;
    }
    if (!iso) return { bad: `${v} is not a date` };
    return { value: type === 'month' ? iso.slice(0, 7) : iso };
  }
  if (type === 'yesno') {
    const s = String(v).trim().toLowerCase();
    if (v === true || ['yes', 'y', 'true'].includes(s)) return { value: true };
    if (v === false || ['no', 'n', 'false'].includes(s)) return { value: false };
    return { bad: `${v} is not Yes or No` };
  }
  if (type === 'list') return { value: String(v).split(/\s*,\s*/).filter(Boolean) };
  if (type === 'choice') {
    const hit = (fld.options || []).find(o => String(o).toLowerCase() === String(v).trim().toLowerCase());
    return hit === undefined ? { bad: `${v} is not one of: ${fld.options.join(', ')}` } : { value: hit };
  }
  return { value: String(v).trim() };
}
const asStored = (type, v, fld) => { const c = toCell(type, v); return fromCell(type, c instanceof Date ? c.toISOString().slice(0, 10) : c, fld).value ?? null; };

// What _meta says: who the file is for, when it was made, its format, each record's fingerprint, and the baseline.
export function metaOf(grid) {
  const rows = grid[DATA_TAB];
  if (!rows) {
    const old = grid[OLD_DATA_TAB]; // the first files made kept only the baseline
    if (!old) return null;
    try { const b = JSON.parse(old.slice(1).map(r => r?.[0] ?? '').join('')); return { clientId: b.clientId, client: null, version: b.version ?? 1, exportedAt: b.exportedAt, fingerprints: {}, baseline: b }; } catch { return null; }
  }
  const val = label => rows.find(r => r?.[0] === label)?.[1] ?? null;
  const fpAt = rows.findIndex(r => r?.[0] === 'Record ID'), bAt = rows.findIndex(r => r?.[0] === 'Baseline');
  const fingerprints = {};
  for (let i = fpAt + 1; fpAt >= 0 && i < rows.length && rows[i]?.[0] != null && rows[i][0] !== 'Baseline'; i++) fingerprints[String(rows[i][0])] = String(rows[i][1]);
  let baseline = null;
  try { baseline = bAt >= 0 ? JSON.parse(rows.slice(bAt + 1).map(r => r?.[0] ?? '').join('')) : null; } catch { baseline = null; }
  return { clientId: val('Client ID'), client: val('Client'), version: Number.isFinite(Number(val('Export format version'))) && val('Export format version') !== null ? Number(val('Export format version')) : null, exportedAt: val('Exported at'), appVersion: val('App version'), fingerprints, baseline };
}

// A workbook plan as a spreadsheet hands it back (formula cells marked), for tests and for checking a file before saving.
export function gridFromPlan(plan) {
  const grid = {};
  Object.defineProperty(grid, '_formulas', { value: {}, enumerable: false });
  for (const s of plan.sheets) {
    const f = grid._formulas[s.name] = new Set();
    grid[s.name] = s.rows.map((r, ri) => (r || []).map((c, ci) => { if (c?.f) { f.add(`${ri}:${ci}`); return c.cached ?? null; } return c?.v ?? null; }));
  }
  return grid;
}

// Where each area's rows and fields are in a grid. The screen tabs (batch 59 on) are read by their hidden column A:
// a table by its #keys and #head rows, its sections by their bands, a doc field by its field: row, a result by its
// math: row. A file of format 49 or before has one tab per area (area.tab) with its header on the first row.
export function locate(grid) {
  const out = { layout: null, tables: {}, fields: new Map(), formulaRows: [] };
  for (const tab of Object.keys(grid)) {
    const rows = grid[tab] || [];
    let section = null; // the section a field row sits in (About you, Your credit ...), for the review's words
    for (let ri = 0; ri < rows.length; ri++) {
      const key = rows[ri]?.[0];
      if (typeof key !== 'string') continue;
      if (key.startsWith(KEY.block)) section = key.slice(KEY.block.length);
      if (key.startsWith(KEY.field)) { out.fields.set(key.slice(KEY.field.length), { tab, ri, ci: 2, v: rows[ri][2] ?? null, section }); out.layout = 'screens'; }
      else if (key.startsWith(KEY.col) || key.startsWith(KEY.math)) out.formulaRows.push({ tab, ri, ci: 2, label: rows[ri][1] ?? key, key });
      else if (key.startsWith(KEY.keys) && String(rows[ri + 1]?.[0] ?? '').startsWith(KEY.head)) {
        const id = key.slice(KEY.keys.length);
        const keys = (rows[ri] || []).map((k, i) => (i === 0 ? '_id' : k == null ? '' : String(k)));
        const data = [];
        let r = ri + 2;
        for (; r < rows.length; r++) {
          const k = rows[r]?.[0];
          if (typeof k === 'string' && [KEY.end, KEY.keys, KEY.head, KEY.field, KEY.col, KEY.math, KEY.block].some(p => k.startsWith(p))) break;
          data.push(r);
        }
        out.tables[id] = { tab, head: rows[ri + 1].map(v => (v == null ? '' : String(v).trim())), headAt: ri + 1, keys, data, screens: true };
        out.layout = 'screens';
        ri = r;
      }
    }
  }
  if (out.layout) return out;
  for (const area of AREAS) { // the old layout: a tab per area, the header on row 1, every row under it
    const rows = grid[area.tab];
    if (!rows) continue;
    out.layout = 'areas';
    if (area.source === 'doc') {
      const head = (rows[0] || []).map(v => (v == null ? '' : String(v).trim().toLowerCase()));
      for (const f of area.fields) { const i = head.indexOf(f.label.toLowerCase()); if (i >= 0) out.fields.set(f.id, { tab: area.tab, ri: 1, ci: i, v: rows[1]?.[i] ?? null }); }
      out.tables[area.id] = { tab: area.tab, head: (rows[0] || []).map(v => (v == null ? '' : String(v).trim())), headAt: 0, keys: null, data: [], screens: false };
      continue;
    }
    out.tables[area.id] = { tab: area.tab, head: (rows[0] || []).map(v => (v == null ? '' : String(v).trim())), headAt: 0, keys: null, data: rows.map((_, i) => i).slice(1), screens: false };
  }
  return out;
}

export function compare(grid, doc, { asNew = false, ref = null } = {}) {
  const catDefaults = ref?.categoryDefaults ?? [];
  const meta = asNew ? null : metaOf(grid);
  const base = meta?.baseline ?? null;
  const fps = meta?.fingerprints ?? {};
  const formulas = grid._formulas || null;
  const where = locate(grid);
  const out = { meta: metaOf(grid), wrongClient: false, noMeta: !metaOf(grid), layout: where.layout, areas: [], assumptions: [], unknown: [], typedOver: [], bad: [], leftAlone: [] };
  // Batch 59: a copy made Without private rows (its own id, this client's id plus -shared) is this client's file. Its
  // private rows carry neutral names there: they are never read, renamed or deleted from it.
  const sharedCopy = !!out.meta?.baseline?.shared && !asNew;
  out.shared = sharedCopy;
  out.wrongClient = !asNew && !!out.meta?.clientId && out.meta.clientId !== doc.id && !(sharedCopy && out.meta.clientId === `${doc.id}-shared`);
  out.olderFormat = out.meta?.version != null && out.meta.version < FORMAT_VERSION;
  const privateIds = sharedCopy ? new Set(foldDoc(doc, SHARE, ref).records.filter(r => r.folded).map(r => r.id)) : new Set();
  const neutral = sharedCopy ? new Map(foldDoc(doc, SHARE, ref).records.filter(r => r.folded).map(r => [r.id, r.name])) : new Map();
  let n = 0;
  const line = x => ({ id: `c${n++}`, decision: x.conflict ? null : x.op === 'remove' ? 'skip' : 'keep', ...x });
  const allCols = formulaCols();
  const groups = new Map(); // by tab, in the order the tabs come
  const groupOf = tab => { if (!groups.has(tab)) groups.set(tab, { id: tab, tab, changed: [], added: [], removed: [] }); return groups.get(tab); };
  const cellOf = (tab, ri, ci) => `${tab}!${colLetter(ci + 1)}${ri + 1}`;
  const changedInSlam = recId => !!(meta && fps[recId] && fps[recId] !== fingerprint(doc.records.find(r => r.id === recId)));
  const isFormula = (tab, ri, ci) => !!formulas?.[tab]?.has(`${ri}:${ci}`);
  // A changed value: one line, a conflict only when SLAM changed this same number after the file was made.
  const fieldLine = (area, f, raw, { tab, ri, ci, rowName, item, wasStored, recId, gate }) => {
    const r = fromCell(f.type, raw, f);
    const stored = item ? toCell(f.type, item.get(f) ?? null) : null;
    if (r.bad && String(raw ?? '').trim() === String(stored instanceof Date ? stored.toISOString().slice(0, 10) : stored ?? '').trim()) return; // as SLAM has it: never a change
    if (r.bad) { out.bad.push({ cell: cellOf(tab, ri, ci), tab, name: rowName, label: f.label, value: raw, text: `${cellOf(tab, ri, ci)} (${rowName}, ${f.label}): ${r.bad}. Skipped.` }); return; }
    if (same(r.value, wasStored)) return;
    const nowV = asStored(f.type, item ? item.get(f) ?? null : null, f);
    if (same(r.value, nowV)) return;
    const conflict = !!gate && !same(nowV, wasStored);
    groupOf(tab).changed.push(line({ op: 'edit', area: area.id, tab, recId, field: f.key, fld: f, label: f.label, name: rowName, was: wasStored, from: item ? item.get(f) ?? null : null, to: r.value, note: r.note, cell: cellOf(tab, ri, ci), conflict }));
  };

  // Typed over a formula: a result row (math:, col:) or a formula column whose cell is a plain value now.
  for (const fr of where.formulaRows) {
    const v = grid[fr.tab]?.[fr.ri]?.[fr.ci];
    if (formulas?.[fr.tab] && !isBlankCell(v) && !isFormula(fr.tab, fr.ri, fr.ci) && fr.key.startsWith(KEY.col)) out.typedOver.push({ cell: cellOf(fr.tab, fr.ri, fr.ci), name: fr.label, value: v, text: `You typed over ${fr.label}. SLAM keeps its math; your number was ${v}.` });
    if (formulas?.[fr.tab] && !isBlankCell(v) && !isFormula(fr.tab, fr.ri, fr.ci) && fr.key.startsWith(KEY.math) && !(grid[fr.tab]?.[fr.ri]?.[4] === 'From the app')) out.typedOver.push({ cell: cellOf(fr.tab, fr.ri, fr.ci), name: fr.label, value: v, text: `You typed over ${fr.label} (${fr.tab}). SLAM keeps its math; your number was ${v}.` });
  }

  for (const area of AREAS) {
    const fields = sheetFields(area, { coach: true });
    const baseArea = base?.areas?.[area.id] ?? null;
    if (area.source === 'doc') {
      const item = asNew ? null : rowsForArea(area, doc)[0];
      let any = false;
      for (const f of fields) {
        const loc = where.fields.get(f.id);
        if (!loc) { if (where.layout && !f.coach && (where.layout === 'areas' ? where.tables[area.id] : true)) out.leftAlone.push(`${where.layout === 'areas' ? area.tab : 'The file'}: no ${f.label} ${where.layout === 'areas' ? 'column' : 'row'}, so it was left alone.`); continue; }
        any = true;
        const was = baseArea ? baseArea.doc?.[f.key] ?? null : undefined;
        const wasStored = was === undefined ? asStored(f.type, item ? item.get(f) ?? null : null, f) : fromCell(f.type, was, f).value ?? null;
        fieldLine(area, f, loc.v, { tab: loc.tab, ri: loc.ri, ci: loc.ci, rowName: where.layout === 'areas' ? area.tab : loc.section ?? loc.tab, item, wasStored, recId: 'doc', gate: was !== undefined });
      }
      const t = where.tables[area.id];
      if (t && !t.screens) { // the old layout: the formula columns on row 2, and the columns SLAM does not know
        const known = new Set([...fields.map(f => f.label.toLowerCase()), ...BUILTIN_LABELS, ...allCols.filter(x => x.area === area.id).map(x => x.label.toLowerCase())]);
        t.head.forEach((h, i) => { if (h && !known.has(h.toLowerCase())) out.unknown.push(line({ op: 'column', area: area.id, tab: t.tab, name: `${t.tab}: the column "${h}"`, cell: cellOf(t.tab, 0, i), note: 'SLAM has no field with this name, so it was not read.' })); });
        for (const col of allCols.filter(x => x.area === area.id)) { const i = t.head.findIndex(h => h.toLowerCase() === col.label.toLowerCase()); const v = grid[t.tab]?.[1]?.[i]; if (i >= 0 && formulas?.[t.tab] && !isBlankCell(v) && !isFormula(t.tab, 1, i)) out.typedOver.push({ cell: cellOf(t.tab, 1, i), name: `${t.tab}: ${col.label}`, value: v, text: `You typed over ${t.tab}: ${col.label}. SLAM keeps its math; your number was ${v}.` }); }
      }
      if (!any && !t && base?.areas?.[area.id]) out.leftAlone.push(`The ${area.tab} rows are not in the file, so nothing on them changed.`);
      continue;
    }

    const t = where.tables[area.id];
    if (!t) { if (baseArea && Object.keys(baseArea).length) out.leftAlone.push(`The ${tabOfArea(area.id) ?? area.tab} rows are not in the file, so nothing on them changed.`); continue; }
    const rows = grid[t.tab];
    const tab = t.tab;
    // A column by its key (the screen tabs) or its header (the old layout).
    const byLabel = label => t.head.findIndex(h => h.toLowerCase() === label.toLowerCase());
    const colOf = (key, label) => (t.keys ? t.keys.indexOf(key) : byLabel(label));
    const cols = fields.map(f => ({ f, i: colOf(f.key, f.label) })).filter(x => x.i >= 0);
    const fCols = allCols.filter(x => x.area === area.id).map(x => ({ col: x, i: colOf(`@${x.key}`, x.label) })).filter(x => x.i >= 0);
    for (const f of fields) if (colOf(f.key, f.label) < 0 && !f.coach) out.leftAlone.push(`${tab}: no ${f.label} column, so it was left alone.`);
    const known = t.keys ? new Set([...fields.map(f => f.key), '_id', 'Kind', 'Type', 'Status', 'InMath', 'month', 'line', ...allCols.filter(x => x.area === area.id).map(x => `@${x.key}`)])
      : new Set([...fields.map(f => f.label.toLowerCase()), ...BUILTIN_LABELS, ...allCols.filter(x => x.area === area.id).map(x => x.label.toLowerCase())]);
    t.head.forEach((h, i) => { const k = t.keys ? t.keys[i] ?? '' : h.toLowerCase(); if (h && !known.has(k)) out.unknown.push(line({ op: 'column', area: area.id, tab, name: `${tab}: the column "${h}"`, cell: cellOf(tab, t.headAt, i), note: 'SLAM has no field with this name, so it was not read.' })); });
    const idCol = 0;
    const kindCol = colOf('Kind', 'Kind'), typeCol = colOf('Type', 'Type'), statusCol = colOf('Status', 'Status');
    const current = new Map((asNew ? [] : rowsForArea(area, doc)).map(r => [r.id, r]));
    const nowOf = (item, f) => (item ? item.get(f) ?? null : null);
    const seen = new Set();
    const group = groupOf(tab);
    const typedOver = (ri, rowName) => {
      if (!formulas?.[tab]) return;
      for (const { col, i } of fCols) {
        const v = rows[ri]?.[i];
        if (!isBlankCell(v) && !isFormula(tab, ri, i)) out.typedOver.push({ cell: cellOf(tab, ri, i), name: `${rowName}: ${col.label}`, value: v, text: `You typed over ${rowName}: ${col.label}. SLAM keeps its math; your number was ${v}.` });
      }
    };
    let sec = {}; // the defaults of the section a row sits in (from its band)
    const nightRows = {}; // batch 60: a shift row's kinds of night, as rows under it
    const nightParents = new Map(); // a row with nights: its row index and name
    for (const ri of t.data) {
      const row = rows[ri] || [];
      const a = row[idCol];
      const key = typeof a === 'string' ? a.trim() : a == null ? '' : String(a);
      if (t.screens && key.startsWith(KEY.sec)) { sec = decodeDefaults(key.slice(KEY.sec.length)); continue; }
      if (t.screens && key === KEY.gap) continue;
      if (t.screens && key.startsWith(KEY.night)) { const [recId, nightId] = key.slice(KEY.night.length).split(':'); (nightRows[recId] ??= []).push({ ri, nightId, row }); continue; } // read with its row, below
      const slot = t.screens && key.startsWith(`${KEY.blank}:`) ? decodeDefaults(key.slice(KEY.blank.length + 1)) : {};
      const rawId = !key || (t.screens && key.startsWith(KEY.blank)) ? null : key;
      const id = asNew ? null : rawId;
      // A cell counts as typed when it holds something other than what the row was given (a backup's name).
      const isTyped = ({ f, i }) => !isBlankCell(row[i]) && !(slot[f.key] != null && String(row[i]).trim().toLowerCase() === String(slot[f.key]).toLowerCase());
      const filled = cols.filter(isTyped);
      if (!rawId && !filled.length) continue; // a blank row (Kind and In the math are filled in for you)
      const nameCell = cols.find(x => x.f.key === 'name');
      const typed = typeCol >= 0 && !isBlankCell(row[typeCol]) ? String(row[typeCol]).trim() : null;
      const typeWord = OLD_TYPES[typed] ?? typed; // batch 55 (QUESTIONS 400): an older workbook's Savings or HYSA reads as Savings, as js/records.js migrates it
      const rowName = (nameCell && !isBlankCell(row[nameCell.i]) ? String(row[nameCell.i]) : null) ?? typeWord ?? `row ${ri + 1}`;
      if (id && privateIds.has(id)) { // a private row in a copy without private rows: shown there by a neutral name only
        seen.add(id);
        const wasRow = baseArea?.[id];
        const edited = cols.some(({ f, i }) => { const r = fromCell(f.type, row[i], f); return !r.bad && wasRow && !same(r.value, fromCell(f.type, wasRow[f.key] ?? null, f).value ?? null); });
        if (edited) out.leftAlone.push(`${tab}: ${neutral.get(id) ?? 'a private row'} is kept private, so what changed on it in this copy was not read. Change it in SLAM.`);
        continue;
      }
      typedOver(ri, rowName);
      if (id) {
        seen.add(id);
        const item = current.get(id);
        const wasRow = baseArea?.[id];
        if (!item) { out.unknown.push(line({ op: 'row', area: area.id, tab, name: `${tab}: ${rowName}`, cell: cellOf(tab, ri, idCol), decision: 'skip', note: wasRow ? 'Deleted in SLAM after the file was made, so its edits were not read.' : 'Its SLAM id is not one SLAM knows.' })); continue; }
        const kind = item.rec?.kind;
        const conflict = changedInSlam(id);
        const rolled = t.screens && item.rec && hasNights(item.rec.values) ? new Set(Object.keys(nightsRollUp(item.rec.values))) : null;
        if (rolled) nightParents.set(id, { ri, rowName, item });
        for (const x of cols) {
          if (x.f.kinds && kind && !x.f.kinds.includes(kind)) continue;
          if (rolled?.has(x.f.key)) { // worked out from the nights under it: typing over it is listed, never saved
            const v = row[x.i];
            if (formulas?.[tab] && !isBlankCell(v) && !isFormula(tab, ri, x.i) && !x.f.key.endsWith('Per') && !same(fromCell(x.f.type, v, x.f).value, asStored(x.f.type, nowOf(item, x.f), x.f))) out.typedOver.push({ cell: cellOf(tab, ri, x.i), name: `${rowName}: ${x.f.label}`, value: v, text: `You typed over ${rowName}: ${x.f.label}. SLAM adds it up from the nights under it; your number was ${v}.` });
            continue;
          }
          const wasStored = wasRow ? fromCell(x.f.type, wasRow[x.f.key] ?? null, x.f).value ?? null : asStored(x.f.type, nowOf(item, x.f), x.f);
          fieldLine(area, x.f, row[x.i], { tab, ri, ci: x.i, rowName, item, wasStored, recId: id, gate: conflict });
        }
        if (statusCol >= 0 && item.rec) {
          const word = isBlankCell(row[statusCol]) ? null : String(row[statusCol]).trim();
          const st = word === null ? null : STATUS_BACK[word.toLowerCase()];
          const wasWord = wasRow ? STATUS_WORDS[STATUS_BACK[String(wasRow._status ?? '').toLowerCase()]] ?? wasRow._status ?? null : STATUS_WORDS[item.rec.status] ?? null;
          if (word !== null && !st) out.bad.push({ cell: cellOf(tab, ri, statusCol), tab, name: rowName, label: 'Status', value: word, text: `${cellOf(tab, ri, statusCol)} (${rowName}, Status): ${word} is not a status. Skipped.` });
          else if ((st ? STATUS_WORDS[st] : null) !== (wasWord ?? null) && (st ?? null) !== (item.rec.status ?? null)) group.changed.push(line({ op: 'status', area: area.id, tab, recId: id, label: 'Status', name: rowName, was: wasWord, from: STATUS_WORDS[item.rec.status] ?? null, to: st, cell: cellOf(tab, ri, statusCol), conflict: conflict && (STATUS_WORDS[item.rec.status] ?? null) !== (wasWord ?? null) }));
        }
        if (typeWord && item.rec && typeWord !== (item.rec.type ?? '')) group.changed.push(line({ op: 'edit', area: area.id, tab, recId: id, field: 'type', fld: { key: 'type', where: 'top', type: 'text' }, label: 'Type', name: rowName, from: item.rec.type, to: typeWord, cell: cellOf(tab, ri, typeCol), conflict }));
        continue;
      }
      // A row with no ID: a new record. Its section gives what it is (a card, a cash account, a line under Food) unless
      // a cell says otherwise; with no type to go on, ask.
      const values = {};
      for (const x of filled) { const r = fromCell(x.f.type, row[x.i], x.f); if (r.bad) out.bad.push({ cell: cellOf(tab, ri, x.i), tab, name: rowName, label: x.f.label, value: row[x.i], text: `${cellOf(tab, ri, x.i)} (${rowName}, ${x.f.label}): ${r.bad}. Skipped.` }); else values[x.f.key] = r.value; }
      for (const [k, v] of Object.entries(slot)) { const f = fields.find(x => x.key === k); if (f && values[k] === undefined) values[k] = fromCell(f.type, v, f).value; }
      if (area.source === 'records') {
        const kindWord = kindCol >= 0 && !isBlankCell(row[kindCol]) ? String(row[kindCol]).trim().toLowerCase() : null;
        const fromType = typeWord ? Object.keys(area.kinds).find(k => (area.types?.[k] ?? []).includes(typeWord)) : null;
        const kind = Object.entries(area.kinds).find(([, w]) => w.toLowerCase() === kindWord)?.[0] ?? (sec.kind && area.kinds[sec.kind] ? sec.kind : null) ?? fromType ?? Object.keys(area.kinds)[0];
        for (const k of Object.keys(values)) { const f = fields.find(x => x.key === k); if (f.kinds && !f.kinds.includes(kind)) delete values[k]; }
        const defaults = {}; // the section's own answers (group, letter, owner, irregular): used unless the row says otherwise
        for (const [k, v] of Object.entries(sec)) { const f = fields.find(x => x.key === k); if (f && (!f.kinds || f.kinds.includes(kind)) && values[k] === undefined) defaults[k] = fromCell(f.type, v, f).value; }
        const type = typeWord ?? (sec.type && sec.kind === kind ? sec.type : null);
        const word = statusCol >= 0 && !isBlankCell(row[statusCol]) ? String(row[statusCol]).trim().toLowerCase() : null;
        const types = area.types?.[kind] ?? null;
        const x = { op: 'add', area: area.id, tab, kind, type, status: word ? STATUS_BACK[word] ?? null : null, values, defaults, fields, label: `New ${area.kinds[kind].toLowerCase()}`, name: values.name ?? rowName, to: values, cell: cellOf(tab, ri, 1) };
        // A new Budget line needs its category most: it decides the DRAFTT letter, Fixed or Variable, and the date.
        if (kind === 'bill') x.categoryDefaults = catDefaults;
        const sectionCats = kind === 'bill' && defaults.draftt ? catDefaults.filter(c => c.draftt === defaults.draftt).map(c => c.category) : [];
        if (types && !type) out.unknown.push(line({ ...x, decision: 'skip', needsType: types, note: 'A new row with no type. Pick what it is to bring it in.' }));
        else if (kind === 'bill' && !values.category && catDefaults.length) out.unknown.push(line({ ...x, decision: 'skip', needsCategory: [...sectionCats, ...catDefaults.map(c => c.category).filter(c => !sectionCats.includes(c))], note: 'A new line with no category. Pick its category to bring it in.' }));
        else group.added.push(line(x));
      } else if (area.source === 'months') {
        const mo = colOf('month', 'Month (YYYY-MM)'), li = colOf('line', 'Budget line');
        const ym = fromCell('month', isBlankCell(row[mo]) ? sec.month ?? null : row[mo]).value;
        const lineRec = doc.records.find(r => r.kind === 'bill' && String(r.name || r.values?.category || '').toLowerCase() === String(row[li] ?? '').trim().toLowerCase());
        const x = { op: 'add', area: area.id, tab, values, ym, lineId: lineRec?.id ?? null, label: 'New month line', name: `${row[li] ?? 'A line'}, ${ym ?? 'no month'}`, to: values, cell: cellOf(tab, ri, 1) };
        if (!ym || !lineRec) out.unknown.push(line({ ...x, decision: 'skip', note: !ym ? 'It needs a month (YYYY-MM).' : `There is no Budget line called ${row[li] ?? '(blank)'}.` }));
        else group.added.push(line(x));
      } else {
        group.added.push(line({ op: 'add', area: area.id, tab, values, label: `New ${area.tab.toLowerCase().replace(/s$/, '')}`, name: values.name ?? values.kind ?? rowName, to: values, cell: cellOf(tab, ri, 1) }));
      }
    }
    // Batch 60 (QUESTIONS 448): each night under a shift row: a changed number, a night added in the blank night row (or
    // any row inserted among them), a night deleted (offered, No by default, like a row).
    for (const [recId, list] of Object.entries(nightRows)) {
      const parent = nightParents.get(recId);
      if (!parent) continue;
      const { item, rowName } = parent;
      const was = baseArea?.[recId]?._nights ?? item.rec.values.nights.map(n => ({ ...n }));
      const nightFields = ['name', ...NIGHT_KEYS].map(k => fields.find(f => f.key === k)).filter(Boolean);
      const at = k => cols.find(x => x.f.key === k)?.i ?? -1;
      const seenN = new Set();
      for (const { ri, nightId, row } of list) {
        const values = {};
        for (const f of nightFields) { const i = at(f.key); if (i < 0 || isBlankCell(row[i])) continue; const r = fromCell(f.type, row[i], f); if (r.bad) out.bad.push({ cell: cellOf(tab, ri, i), tab, name: rowName, label: f.label, value: row[i], text: `${cellOf(tab, ri, i)} (${rowName}, a night, ${f.label}): ${r.bad}. Skipped.` }); else values[f.key] = r.value; }
        const old = was.find(n => n.id === nightId);
        if (!old || nightId === 'new') {
          if (!Object.keys(values).some(k => k !== 'name')) continue;
          group.changed.push(line({ op: 'night', how: 'add', area: area.id, tab, recId, values, label: `New night: ${values.name ?? 'a kind of night'}`, name: rowName, from: null, to: Object.entries(values).filter(([k]) => k !== 'name').map(([k, v]) => `${nightFields.find(f => f.key === k).label} ${v}`).join(', '), cell: cellOf(tab, ri, 1) }));
          continue;
        }
        seenN.add(nightId);
        for (const f of nightFields) {
          const i = at(f.key);
          if (i < 0) continue;
          const to = values[f.key] ?? null, from = old[f.key] ?? null;
          if (same(to, from)) continue;
          const now = item.rec.values.nights.find(n => n.id === nightId)?.[f.key] ?? null;
          if (same(to, now)) continue;
          group.changed.push(line({ op: 'night', how: 'edit', area: area.id, tab, recId, nightId, field: f.key, fld: f, label: `${old.name ?? 'Night'}: ${f.label}`, name: rowName, from: now, to, cell: cellOf(tab, ri, i) }));
        }
      }
      for (const n of was) if (!seenN.has(n.id) && item.rec.values.nights.some(x => x.id === n.id)) group.changed.push(line({ op: 'night', how: 'remove', decision: 'skip', area: area.id, tab, recId, nightId: n.id, label: `${n.name ?? 'Night'}: taken out of your spreadsheet`, name: rowName, from: n.name ?? 'a night', to: '(deleted)' }));
    }
    // In SLAM but not in the spreadsheet: Removed in the spreadsheet, never deleted unless kept. A private row of a copy
    // without private rows is never offered.
    if (!asNew) {
      for (const [id, item] of current) {
        if (seen.has(id) || (base && !baseArea?.[id])) continue; // added in SLAM after the export: not in the file, not removed
        if (privateIds.has(id)) { out.leftAlone.push(`${tab}: ${neutral.get(id) ?? 'a private row'} is kept private; it is not in this copy, and it stays in SLAM.`); continue; }
        group.removed.push(line({ op: 'remove', area: area.id, tab, recId: id, label: 'Removed in the spreadsheet', name: item.rec?.name || item.rec?.type || item.get({ key: 'name' }) || id }));
      }
    }
  }


  // Assumptions: the blue This client column (the Used column is a formula).
  const aRows = grid.Assumptions;
  if (aRows) {
    const headAt = aRows.findIndex(r => r?.[0] === 'What');
    for (const a of ASSUMPTIONS) {
      const ri = aRows.findIndex((row, i) => i > headAt && row?.[0] === a.label);
      if (ri < 0) continue;
      const r = aRows[ri];
      if (formulas?.Assumptions && !isBlankCell(r[3]) && !formulas.Assumptions.has(`${ri}:3`)) out.typedOver.push({ cell: `Assumptions!D${ri + 1}`, name: a.label, value: r[3], text: `You typed over ${a.label}. SLAM keeps its math; your number was ${r[3]}.` });
      if (!a.client) continue;
      const type = a.unit === 'pct' ? 'pct' : 'number';
      const got = fromCell(type, r[2]);
      const nowV = asNew ? null : doc.assumptions?.[a.client] ?? null;
      const was = base ? base.assumptions?.[a.client] ?? null : nowV;
      if (got.bad) { out.bad.push({ cell: `Assumptions!C${ri + 1}`, tab: 'Assumptions', name: a.label, label: a.label, value: r[2], text: `Assumptions!C${ri + 1} (${a.label}): ${got.bad}. Skipped.` }); continue; }
      if (same(got.value, was) || same(got.value, nowV)) continue;
      out.assumptions.push(line({ op: 'edit', area: 'assumptions', tab: 'Assumptions', recId: 'assumptions', field: a.client, fld: { key: a.client, type }, label: a.label, name: 'Assumptions', from: nowV, to: got.value, note: got.note, cell: `Assumptions!C${ri + 1}`, conflict: !!base && !same(nowV, was) }));
    }
  }
  const order = t => { const i = SCREEN_TABS.findIndex(x => x.name === t); return i < 0 ? 999 : i; }; // in the app's order
  out.areas = [...groups.values()].filter(g => g.changed.length || g.added.length || g.removed.length).sort((x, y) => order(x.tab) - order(y.tab));
  return out;
}

// Every line in one list (the review counts and the save read this).
export const linesOf = res => [...res.areas.flatMap(g => [...g.changed, ...g.added, ...g.removed]), ...res.assumptions, ...res.unknown.filter(u => u.op === 'add')];
// Kept: answered Yes (for a conflict, Yes keeps the spreadsheet's number).
const kept = l => l.decision === 'keep';
export const unpicked = res => linesOf(res).filter(l => l.conflict && !l.decision);

// Save what was kept: a snapshot first, then one undo step. Every kept change is in the record's history with
// source "spreadsheet", and the record says From your spreadsheet. A new Calendar entries row comes in logged
// (Got it / Paid on its date), so a month tracked in the sheet can be closed in SLAM.
export function applyChanges(store, res, { metrics = null } = {}) {
  const list = linesOf(res).filter(l => kept(l) && (l.op !== 'add' || ((!l.needsType || l.type) && (!l.needsCategory || l.values.category))));
  if (!list.length) return 0;
  store.snapshot('Before spreadsheet import', metrics);
  const was = store.source;
  store.source = 'spreadsheet';
  try {
    store.transaction('Spreadsheet import', () => {
      const lists = {};
      const nightOps = {};
      const touched = new Set();
      for (const c of list) {
        const area = AREAS.find(a => a.id === c.area);
        if (c.area === 'assumptions') { store.setDoc('assumptions', { [c.field]: c.to }); continue; }
        if (area?.source === 'doc') {
          const part = partOf(area, c.fld);
          const path = c.fld.key.split('.');
          if (path.length === 1) store.setDoc(part, { [path[0]]: c.to });
          else {
            const top = JSON.parse(JSON.stringify(store.doc[part]?.[path[0]] ?? {}));
            let o = top; for (const k of path.slice(1, -1)) o = (o[k] ??= {});
            o[path.at(-1)] = c.to;
            store.setDoc(part, { [path[0]]: top });
          }
          if (c.fld.key === 'household') store.setDoc('client', { couple: c.to === 'Couple' }); // as on About you
          continue;
        }
        if (c.op === 'night') { (nightOps[c.recId] ??= []).push(c); continue; } // applied together, below
        if (area?.source === 'records') {
          if (c.op === 'edit' && c.field === 'institution' && (c.area === 'assets' || c.area === 'debt')) { // batch 59 (QUESTIONS 460): the bank by name, on the Institutions list
            const inst = c.to ? addInstitution(store, { name: c.to, kind: c.area === 'debt' && store.get(c.recId)?.type !== 'Credit card' ? 'Lender' : 'Bank' }) : null;
            store.update(c.recId, { institutionId: inst?.id ?? null, institution: inst?.name ?? null }); touched.add(c.recId);
          } else if (c.op === 'edit') { store.update(c.recId, { [c.field]: c.to }); touched.add(c.recId); }
          else if (c.op === 'status') { store.update(c.recId, { status: c.to }); touched.add(c.recId); }
          else if (c.op === 'remove') store.remove(c.recId);
          else if (c.op === 'add') {
            const top = {}, values = {};
            for (const [k, v] of Object.entries(c.values)) { const f = c.fields.find(x => x.key === k); (f?.where === 'top' ? top : values)[k] = v; }
            if (c.kind === 'bill' && values.category) { // the category's own letter, amount and date, unless typed
              const d = (c.categoryDefaults || []).find(x => x.category === values.category);
              if (d) { values.draftt ??= d.draftt; values.amountType ??= d.amount; values.timing ??= d.timing; }
            }
            for (const [k, v] of Object.entries(c.defaults || {})) { const f = c.fields.find(x => x.key === k); if (f?.where === 'top') top[k] ??= v; else values[k] ??= v; } // batch 59: what its section says
            const type = c.type ?? (c.kind === 'entry' ? (values.direction === 'In' ? 'Money in' : values.direction === 'Maybe' ? 'Maybe' : 'Money out') : null);
            if (c.kind === 'entry') { values.direction ??= type === 'Money in' ? 'In' : type === 'Maybe' ? 'Maybe' : 'Out'; values.repeats ??= 'Never'; }
            const rec = store.add(c.kind, { ...top, status: c.status ?? null, source: 'spreadsheet', values }, { type });
            if (c.kind === 'entry' && values.date) store.setIn('spending', ['calendar', 'marks', `${rec.id}@${values.date}`], { status: 'Got it / Paid', paid: rec.amount ?? null }, 'Logged from your spreadsheet');
          }
          continue;
        }
        if (area?.source === 'months') {
          if (c.op === 'add') { for (const [k, v] of Object.entries(c.values)) store.setIn('spending', ['months', c.ym, 'lines', c.lineId, k], v, 'Spreadsheet import'); continue; }
          const [ym, lineId] = c.recId.split('|');
          if (c.op === 'remove') store.setIn('spending', ['months', ym, 'lines', lineId], undefined, 'Spreadsheet import');
          else store.setIn('spending', ['months', ym, 'lines', lineId, c.field], c.to ?? undefined, 'Spreadsheet import');
          continue;
        }
        if (area?.source === 'list') {
          const now = lists[area.id] ??= JSON.parse(JSON.stringify(getPath(store.doc[area.part] || {}, area.path) || []));
          const key = x => (area.keyField ? x[area.keyField] : x.id);
          if (c.op === 'add') now.push({ ...(area.keyField ? {} : { id: store.makeId() }), ...c.values });
          else if (c.op === 'remove') lists[area.id] = now.filter(x => String(key(x)) !== c.recId);
          else { const it = now.find(x => String(key(x)) === c.recId); if (it) it[c.field] = c.to; }
        }
      }
      for (const [id, l] of Object.entries(lists)) { const area = AREAS.find(a => a.id === id); store.setDoc(area.part, { [area.path]: l }); }
      // Batch 60: a row's nights, edited, added and deleted in one go, with the row's shift boxes added up again.
      for (const [id, ops] of Object.entries(nightOps)) {
        const rec = store.get(id);
        if (!rec) continue;
        let v = { ...rec.values };
        const step = patch => { v = { ...v, ...patch }; };
        for (const c of ops.filter(x => x.how === 'edit')) if (hasNights(v)) step(setNight(v, c.nightId, { [c.field]: c.to }));
        for (const c of ops.filter(x => x.how === 'add')) { step(addNight(v)); step(setNight(v, v.nights.at(-1).id, c.values)); }
        for (const c of ops.filter(x => x.how === 'remove')) if (hasNights(v)) step(removeNight(v, c.nightId));
        store.update(id, { nights: v.nights ?? null, ...Object.fromEntries([...NIGHT_KEYS, 'cardTipsPer', 'cashTipsPer'].map(k => [k, v[k] ?? null])) });
        touched.add(id);
      }
      for (const id of touched) if (store.get(id)) store.update(id, { source: 'spreadsheet' });
      for (const id of touched) if (nightsStale(store.get(id)?.values)) store.update(id, { nights: null }); // batch 60: a typed Shifts a week or Pay a shift wins over the row's kinds of night
    });
  } finally { store.source = was; }
  return list.length;
}
