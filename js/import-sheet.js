// SPDX-License-Identifier: AGPL-3.0-only
// Bring a spreadsheet back: read an edited workbook and compare it with SLAM. Pure: no DOM. Reads only the Assumptions
// and Inputs tabs, through the field registry (a tab or column is found by its registry label), and ignores every
// formula tab. The review screen (js/ui/sheet-ui.js) shows the result; applyChanges saves what was kept.
//
// compare(grid, doc) returns, by area: Changed (field, old, new), New rows, Removed rows; Changed assumptions;
// Couldn't tell what this is; typed over a formula; bad values with their cell; columns left alone. Each line has a
// decision: 'keep' or 'skip' (a conflict starts with none and needs a pick). Nothing is saved here.
import { AREAS, sheetFields } from './registry/fields.js';
import { ASSUMPTIONS } from './registry/assumptions.js';
import { DATA_TAB, OLD_DATA_TAB, STATUS_WORDS, toCell, partOf, rowsForArea, formulaCols, colLetter } from './sheet/workbook.js';
import { fingerprint, FORMAT_VERSION } from './sheet/format.js';

const STATUS_BACK = Object.fromEntries(Object.entries(STATUS_WORDS).map(([k, v]) => [v.toLowerCase(), k]));
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

export function compare(grid, doc, { asNew = false } = {}) {
  const meta = asNew ? null : metaOf(grid);
  const base = meta?.baseline ?? null;
  const fps = meta?.fingerprints ?? {};
  const formulas = grid._formulas || null;
  const out = { meta: metaOf(grid), wrongClient: false, noMeta: !metaOf(grid), areas: [], assumptions: [], unknown: [], typedOver: [], bad: [], leftAlone: [] };
  out.wrongClient = !asNew && !!out.meta?.clientId && out.meta.clientId !== doc.id;
  out.olderFormat = out.meta?.version != null && out.meta.version < FORMAT_VERSION;
  let n = 0;
  const line = x => ({ id: `c${n++}`, decision: x.conflict ? null : x.op === 'remove' ? 'skip' : 'keep', ...x });
  const allCols = formulaCols();

  for (const area of AREAS) {
    const rows = grid[area.tab];
    const group = { id: area.id, tab: area.tab, changed: [], added: [], removed: [] };
    if (!rows) { if (base?.areas?.[area.id] && Object.keys(base.areas[area.id]).length) out.leftAlone.push(`The ${area.tab} tab is not in the file, so nothing on it changed.`); continue; }
    out.areas.push(group);
    const head = (rows[0] || []).map(v => (v == null ? '' : String(v).trim()));
    const fields = sheetFields(area, { coach: true });
    const colOf = label => head.findIndex(h => h.toLowerCase() === label.toLowerCase());
    const cols = fields.map(f => ({ f, i: colOf(f.label) })).filter(x => x.i >= 0);
    const fCols = allCols.filter(x => x.area === area.id).map(x => ({ col: x, i: colOf(x.label) })).filter(x => x.i >= 0);
    for (const f of fields) if (colOf(f.label) < 0 && !f.coach) out.leftAlone.push(`${area.tab}: no ${f.label} column, so it was left alone.`);
    const known = new Set([...fields.map(f => f.label.toLowerCase()), ...BUILTIN_LABELS, ...allCols.filter(x => x.area === area.id).map(x => x.label.toLowerCase())]);
    head.forEach((h, i) => { if (h && !known.has(h.toLowerCase())) out.unknown.push(line({ op: 'column', area: area.id, tab: area.tab, name: `${area.tab}: the column "${h}"`, cell: `${area.tab}!${colLetter(i + 1)}1`, note: 'SLAM has no field with this name, so it was not read.' })); });
    const idCol = colOf('SLAM id (leave as is)'), kindCol = colOf('Kind'), typeCol = colOf('Type'), statusCol = colOf('Status');
    const baseArea = base?.areas?.[area.id] ?? null;
    const current = new Map((asNew ? [] : rowsForArea(area, doc)).map(r => [r.id, r]));
    const nowOf = (item, f) => (item ? item.get(f) ?? null : null);
    const seen = new Set();
    const cellOf = (ri, ci) => `${area.tab}!${colLetter(ci + 1)}${ri + 1}`;
    const tab = area.tab;
    const typedOver = (ri, rowName) => {
      if (!formulas?.[area.tab]) return;
      for (const { col, i } of fCols) {
        const v = rows[ri]?.[i];
        if (!isBlankCell(v) && !formulas[area.tab].has(`${ri}:${i}`)) out.typedOver.push({ cell: cellOf(ri, i), name: `${rowName}: ${col.label}`, value: v, text: `You typed over ${rowName}: ${col.label}. SLAM keeps its math; your number was ${v}.` });
      }
    };
    const changedInSlam = recId => !!(meta && fps[recId] && fps[recId] !== fingerprint(doc.records.find(r => r.id === recId)));
    const fieldLine = (x, row, ri, { item, wasStored, recId, conflict }) => {
      const { f, i } = x;
      const r = fromCell(f.type, row[i], f);
      if (r.bad) { out.bad.push({ cell: cellOf(ri, i), tab, name: x.rowName, label: f.label, value: row[i], text: `${cellOf(ri, i)} (${x.rowName}, ${f.label}): ${r.bad}. Skipped.` }); return; }
      if (same(r.value, wasStored)) return;
      const nowV = asStored(f.type, nowOf(item, f), f);
      if (same(r.value, nowV)) return;
      group.changed.push(line({ op: 'edit', area: area.id, tab, recId, field: f.key, fld: f, label: f.label, name: x.rowName, from: nowOf(item, f), to: r.value, note: r.note, cell: cellOf(ri, i), conflict }));
    };

    if (area.source === 'doc') {
      const row = rows[1] || [];
      const item = asNew ? null : current.get('doc');
      for (const x of cols) {
        const was = baseArea ? baseArea.doc?.[x.f.key] ?? null : undefined;
        const wasStored = was === undefined ? asStored(x.f.type, nowOf(item, x.f), x.f) : fromCell(x.f.type, was, x.f).value ?? null;
        const nowV = asStored(x.f.type, nowOf(item, x.f), x.f);
        fieldLine({ ...x, rowName: tab }, row, 1, { item, wasStored, recId: 'doc', conflict: was !== undefined && !same(nowV, wasStored) });
      }
      typedOver(1, tab);
      continue;
    }

    for (let ri = 1; ri < rows.length; ri++) {
      const row = rows[ri] || [];
      const rawId = idCol >= 0 && !isBlankCell(row[idCol]) ? String(row[idCol]).trim() : null;
      const id = asNew ? null : rawId;
      const filled = cols.filter(({ i }) => !isBlankCell(row[i]));
      if (!rawId && !filled.length) continue; // a blank row (Kind and In the math are filled in for you)
      const nameCell = cols.find(x => x.f.key === 'name');
      const typeWord = typeCol >= 0 && !isBlankCell(row[typeCol]) ? String(row[typeCol]).trim() : null;
      const rowName = (nameCell && !isBlankCell(row[nameCell.i]) ? String(row[nameCell.i]) : null) ?? typeWord ?? `row ${ri + 1}`;
      typedOver(ri, rowName);
      if (id) {
        seen.add(id);
        const item = current.get(id);
        const wasRow = baseArea?.[id];
        if (!item) { out.unknown.push(line({ op: 'row', area: area.id, tab, name: `${tab}: ${rowName}`, cell: cellOf(ri, idCol), decision: 'skip', note: wasRow ? 'Deleted in SLAM after the file was made, so its edits were not read.' : 'Its SLAM id is not one SLAM knows.' })); continue; }
        const kind = item.rec?.kind;
        const conflict = changedInSlam(id);
        for (const x of cols) {
          if (x.f.kinds && kind && !x.f.kinds.includes(kind)) continue;
          const wasStored = wasRow ? fromCell(x.f.type, wasRow[x.f.key] ?? null, x.f).value ?? null : asStored(x.f.type, nowOf(item, x.f), x.f);
          fieldLine({ ...x, rowName }, row, ri, { item, wasStored, recId: id, conflict });
        }
        if (statusCol >= 0 && item.rec) {
          const word = isBlankCell(row[statusCol]) ? null : String(row[statusCol]).trim();
          const st = word === null ? null : STATUS_BACK[word.toLowerCase()];
          const wasWord = wasRow ? wasRow._status ?? null : STATUS_WORDS[item.rec.status] ?? null;
          if (word !== null && !st) out.bad.push({ cell: cellOf(ri, statusCol), tab, name: rowName, label: 'Status', value: word, text: `${cellOf(ri, statusCol)} (${rowName}, Status): ${word} is not a status. Skipped.` });
          else if ((word ?? null) !== (wasWord ?? null) && (st ?? null) !== (item.rec.status ?? null)) group.changed.push(line({ op: 'status', area: area.id, tab, recId: id, label: 'Status', name: rowName, from: STATUS_WORDS[item.rec.status] ?? null, to: st, cell: cellOf(ri, statusCol), conflict }));
        }
        if (typeWord && item.rec && typeWord !== (item.rec.type ?? '')) group.changed.push(line({ op: 'edit', area: area.id, tab, recId: id, field: 'type', fld: { key: 'type', where: 'top', type: 'text' }, label: 'Type', name: rowName, from: item.rec.type, to: typeWord, cell: cellOf(ri, typeCol), conflict }));
        continue;
      }
      // A row with no ID: a new record when its type is filled in (or the area has no types); else, ask.
      const values = {};
      for (const { f, i } of filled) { const r = fromCell(f.type, row[i], f); if (r.bad) out.bad.push({ cell: cellOf(ri, i), tab, name: rowName, label: f.label, value: row[i], text: `${cellOf(ri, i)} (${rowName}, ${f.label}): ${r.bad}. Skipped.` }); else values[f.key] = r.value; }
      if (area.source === 'records') {
        const kindWord = kindCol >= 0 && !isBlankCell(row[kindCol]) ? String(row[kindCol]).trim().toLowerCase() : null;
        const kind = Object.entries(area.kinds).find(([, w]) => w.toLowerCase() === kindWord)?.[0] ?? Object.keys(area.kinds)[0];
        for (const k of Object.keys(values)) { const f = fields.find(x => x.key === k); if (f.kinds && !f.kinds.includes(kind)) delete values[k]; }
        const word = statusCol >= 0 && !isBlankCell(row[statusCol]) ? String(row[statusCol]).trim().toLowerCase() : null;
        const types = area.types?.[kind] ?? null;
        const x = { op: 'add', area: area.id, tab, kind, type: typeWord, status: word ? STATUS_BACK[word] ?? null : null, values, fields, label: `New ${area.kinds[kind].toLowerCase()}`, name: values.name ?? rowName, to: values, cell: `${tab}!A${ri + 1}` };
        if (types && !typeWord) out.unknown.push(line({ ...x, decision: 'skip', needsType: types, note: `A new row with no type. Pick what it is to bring it in.` }));
        else group.added.push(line(x));
      } else if (area.source === 'months') {
        const mo = colOf('Month (YYYY-MM)'), li = colOf('Budget line');
        const ym = fromCell('month', row[mo]).value;
        const lineRec = doc.records.find(r => r.kind === 'bill' && String(r.name || r.values?.category || '').toLowerCase() === String(row[li] ?? '').trim().toLowerCase());
        const x = { op: 'add', area: area.id, tab, values, ym, lineId: lineRec?.id ?? null, label: 'New month line', name: `${row[li] ?? 'A line'}, ${ym ?? 'no month'}`, to: values, cell: `${tab}!A${ri + 1}` };
        if (!ym || !lineRec) out.unknown.push(line({ ...x, decision: 'skip', note: !ym ? 'It needs a month (YYYY-MM).' : `There is no Budget line called ${row[li] ?? '(blank)'}.` }));
        else group.added.push(line(x));
      } else {
        group.added.push(line({ op: 'add', area: area.id, tab, values, label: `New ${area.tab.toLowerCase().replace(/s$/, '')}`, name: values.name ?? values.kind ?? rowName, to: values, cell: `${tab}!A${ri + 1}` }));
      }
    }
    // In SLAM but not in the spreadsheet: Removed in the spreadsheet, never deleted unless kept.
    if (idCol >= 0 && !asNew) {
      for (const [id, item] of current) {
        if (seen.has(id) || (base && !baseArea?.[id])) continue; // added in SLAM after the export: not in the file, not removed
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
  out.areas = out.areas.filter(g => g.changed.length || g.added.length || g.removed.length);
  return out;
}

// Every line in one list (the review counts and the save read this).
export const linesOf = res => [...res.areas.flatMap(g => [...g.changed, ...g.added, ...g.removed]), ...res.assumptions, ...res.unknown.filter(u => u.op === 'add')];
// A conflict is kept only when the spreadsheet's side was picked.
const kept = l => l.decision === 'keep' || l.decision === 'sheet';
export const unpicked = res => linesOf(res).filter(l => l.conflict && !l.decision);

// Save what was kept: a snapshot first, then one undo step. Every kept change is in the record's history with
// source "spreadsheet", and the record says From your spreadsheet. A new Calendar entries row comes in logged
// (Got it / Paid on its date), so a month tracked in the sheet can be closed in SLAM.
export function applyChanges(store, res, { metrics = null } = {}) {
  const list = linesOf(res).filter(l => kept(l) && (l.op !== 'add' || !l.needsType || l.type));
  if (!list.length) return 0;
  store.snapshot('Before spreadsheet import', metrics);
  const was = store.source;
  store.source = 'spreadsheet';
  try {
    store.transaction('Spreadsheet import', () => {
      const lists = {};
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
        if (area?.source === 'records') {
          if (c.op === 'edit') { store.update(c.recId, { [c.field]: c.to }); touched.add(c.recId); }
          else if (c.op === 'status') { store.update(c.recId, { status: c.to }); touched.add(c.recId); }
          else if (c.op === 'remove') store.remove(c.recId);
          else if (c.op === 'add') {
            const top = {}, values = {};
            for (const [k, v] of Object.entries(c.values)) { const f = c.fields.find(x => x.key === k); (f?.where === 'top' ? top : values)[k] = v; }
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
      for (const id of touched) if (store.get(id)) store.update(id, { source: 'spreadsheet' });
    });
  } finally { store.source = was; }
  return list.length;
}
