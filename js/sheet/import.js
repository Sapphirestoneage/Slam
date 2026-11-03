// Bring a spreadsheet back: read an edited workbook (as plain rows, js/sheet/excel.js readWorkbook), list every change
// against what the file held when SLAM made it (the hidden SLAM data tab), and save only the changes the coach ticks.
// Pure: the review screen (js/ui/sheet-ui.js) shows the list; applyChanges writes them in one undoable step.
// Reads the field registry only, like the export: a tab, column or field is found by its registry label.
import { AREAS, sheetFields } from '../registry/fields.js';
import { ASSUMPTIONS } from '../registry/assumptions.js';
import { DATA_TAB, OLD_DATA_TAB, STATUS_WORDS, toCell, partOf, rowsForArea } from './workbook.js';

const STATUS_BACK = Object.fromEntries(Object.entries(STATUS_WORDS).map(([k, v]) => [v.toLowerCase(), k]));
const getPath = (o, path) => path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const isBlankCell = v => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

// A cell back to what SLAM stores. Returns { value } or { bad: 'why' }.
export function fromCell(type, v, fld = {}) {
  if (isBlankCell(v)) return { value: null };
  if (['money', 'number', 'day', 'pct'].includes(type)) {
    let n = typeof v === 'number' ? v : Number(String(v).replace(/[$,\s]/g, '').replace(/%$/, ''));
    if (!Number.isFinite(n)) return { bad: `${v} is not a number` };
    if (type === 'pct' && typeof v === 'string' && /%\s*$/.test(v)) n /= 100; // "6%" typed as text
    else if (type === 'pct' && Math.abs(n) > 1.5) return { value: n / 100, note: `read ${n} as ${n}%` }; // 6 typed into a % cell
    if (type === 'day' && !(Number.isInteger(n) && n >= 1 && n <= 31)) return { bad: `${v} is not a day of the month (1 to 31)` };
    return { value: n };
  }
  if (type === 'date' || type === 'month') {
    let iso = null;
    if (v instanceof Date) iso = v.toISOString().slice(0, 10);
    else if (typeof v === 'number') iso = new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10); // a spreadsheet day number
    else {
      const s = String(v).trim();
      const ymd = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(s), mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s), my = /^(\d{1,2})\/(\d{4})$/.exec(s);
      if (ymd) iso = `${ymd[1]}-${ymd[2].padStart(2, '0')}-${(ymd[3] || '1').padStart(2, '0')}`;
      else if (mdy) iso = `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
      else if (my) iso = `${my[2]}-${my[1].padStart(2, '0')}-01`;
    }
    if (!iso) return { bad: `${v} is not a date (YYYY-MM-DD)` };
    return { value: type === 'month' ? iso.slice(0, 7) : iso };
  }
  if (type === 'yesno') {
    const s = String(v).trim().toLowerCase();
    if (v === true || ['yes', 'y', 'true'].includes(s)) return { value: true };
    if (v === false || ['no', 'n', 'false'].includes(s)) return { value: false };
    return { bad: `${v} is not Yes or No` };
  }
  if (type === 'list') return { value: String(v).split(/\s*,\s*/).filter(Boolean).map(x => (Number.isFinite(Number(x)) && fld.numbers ? Number(x) : x)) };
  if (type === 'choice') {
    const hit = (fld.options || []).find(o => String(o).toLowerCase() === String(v).trim().toLowerCase());
    return hit === undefined ? { bad: `${v} is not one of: ${fld.options.join(', ')}` } : { value: hit };
  }
  return { value: String(v).trim() };
}
// A stored value the way the sheet showed it, then read back: what the cell "is" for comparing.
const asStored = (type, v, fld) => { const c = toCell(type, v); return fromCell(type, c instanceof Date ? c.toISOString().slice(0, 10) : c, fld).value ?? null; };

// The baseline the export kept in the hidden tab, or null.
export function baselineOf(grid) {
  const meta = grid[DATA_TAB], old = grid[OLD_DATA_TAB];
  const rows = meta ? meta.slice(meta.findIndex(r => r?.[0] === 'Baseline') + 1) : old ? old.slice(1) : null;
  if (!rows) return null;
  try { return JSON.parse(rows.map(r => r?.[0] ?? '').join('')); } catch { return null; }
}

// Every change in the workbook. Each: { id, tab, area, op ('edit' | 'add' | 'remove' | 'status'), recId, field, label,
// name (the row), from (SLAM now), to (the sheet), changedInSlam (SLAM changed it after the export too), ok (ticked),
// note }. Plus warnings and what was left out.
export function changesFrom(grid, doc) {
  const base = baselineOf(grid);
  const warnings = [], ignored = [];
  if (!base) warnings.push('This file has no _meta tab (it was not made by Open in a spreadsheet, or the tab was deleted), so every cell is compared with what SLAM has now.');
  else if (base.clientId && base.clientId !== doc.id) warnings.push(`This file was made for a different client file. Check every change before you save.`);
  const out = [];
  let n = 0;
  const push = c => out.push({ id: `c${n++}`, ok: !c.changedInSlam && c.op !== 'remove' && !c.bad, ...c });

  for (const area of AREAS) {
    const rows = grid[area.tab];
    if (!rows) { if (base?.areas?.[area.id]) ignored.push(`The ${area.tab} tab is missing, so nothing on it was read.`); continue; }
    const head = (rows[0] || []).map(v => (v == null ? '' : String(v).trim()));
    const fields = sheetFields(area, { coach: !!base?.coach });
    const colOf = label => head.findIndex(h => h.toLowerCase() === label.toLowerCase());
    const cols = fields.map(f => ({ f, i: colOf(f.label) })).filter(x => x.i >= 0);
    for (const f of fields) if (colOf(f.label) < 0) ignored.push(`${area.tab}: no ${f.label} column, so it was left as it is.`);
    const known = new Set([...fields.map(f => f.label.toLowerCase()), 'slam id (leave as is)', 'kind', 'type', 'status', 'in the math', 'month (yyyy-mm)', 'budget line']);
    const extra = head.filter(h => h && !known.has(h.toLowerCase()) && !/\(M\d|used|worked out|line from debt|counted|statement line|taxed as|files jointly|filing status used|heavy debt|low-rate|consumer debt|housing|food, housing|into the 401|before-tax a year|taxable a year|state and city|on the card minimum|covered by others/i.test(h));
    if (extra.length) ignored.push(`${area.tab}: columns SLAM does not keep were left out (${extra.join(', ')}).`);
    const idCol = colOf('SLAM id (leave as is)'), kindCol = colOf('Kind'), typeCol = colOf('Type'), statusCol = colOf('Status');
    const baseArea = base?.areas?.[area.id] ?? null;
    const current = new Map(rowsForArea(area, doc).map(r => [r.id, r]));
    const nowOf = (item, f) => (item ? item.get(f) ?? null : null);
    const seen = new Set();
    const tab = area.tab;

    if (area.source === 'doc') {
      const row = rows[1] || [];
      const item = current.get('doc');
      for (const { f, i } of cols) {
        const r = fromCell(f.type, row[i], f);
        const was = baseArea ? baseArea.doc?.[f.key] ?? null : null;
        const wasStored = baseArea ? fromCell(f.type, was, f).value ?? null : asStored(f.type, nowOf(item, f), f);
        if (r.bad) { push({ tab, area: area.id, op: 'edit', field: f.key, fld: f, label: f.label, name: tab, from: nowOf(item, f), to: row[i], bad: r.bad }); continue; }
        if (same(r.value, wasStored)) continue;
        const nowV = asStored(f.type, nowOf(item, f), f);
        if (same(r.value, nowV)) continue;
        push({ tab, area: area.id, op: 'edit', recId: 'doc', field: f.key, fld: f, label: f.label, name: tab, from: nowOf(item, f), to: r.value, note: r.note, changedInSlam: baseArea ? !same(nowV, wasStored) : false });
      }
      continue;
    }

    for (let ri = 1; ri < rows.length; ri++) {
      const row = rows[ri] || [];
      const id = idCol >= 0 && !isBlankCell(row[idCol]) ? String(row[idCol]).trim() : null;
      const filled = cols.filter(({ i }) => !isBlankCell(row[i]));
      if (!id && !filled.length) continue; // a blank row (Kind and In the math are filled in for you)
      const nameCell = cols.find(x => x.f.key === 'name') ?? cols[0];
      const rowName = (nameCell && !isBlankCell(row[nameCell.i]) ? String(row[nameCell.i]) : null) ?? (typeCol >= 0 && !isBlankCell(row[typeCol]) ? String(row[typeCol]) : null) ?? `row ${ri + 1}`;
      if (id) {
        seen.add(id);
        const item = current.get(id);
        const wasRow = baseArea?.[id];
        if (!item) { if (wasRow) ignored.push(`${tab}: ${rowName} was deleted in SLAM after the file was made, so its edits were left out.`); else ignored.push(`${tab}: row ${ri + 1} has a SLAM id SLAM does not know, so it was left out.`); continue; }
        const kind = item.rec?.kind;
        for (const { f, i } of cols) {
          if (f.kinds && kind && !f.kinds.includes(kind)) { if (!isBlankCell(row[i])) ignored.push(`${tab}: ${rowName} does not use ${f.label}, so it was left out.`); continue; }
          const r = fromCell(f.type, row[i], f);
          if (r.bad) { push({ tab, area: area.id, op: 'edit', recId: id, field: f.key, fld: f, label: f.label, name: rowName, from: nowOf(item, f), to: row[i], bad: r.bad }); continue; }
          const wasStored = wasRow ? fromCell(f.type, wasRow[f.key] ?? null, f).value ?? null : asStored(f.type, nowOf(item, f), f);
          if (same(r.value, wasStored)) continue;
          const nowV = asStored(f.type, nowOf(item, f), f);
          if (same(r.value, nowV)) continue;
          push({ tab, area: area.id, op: 'edit', recId: id, field: f.key, fld: f, label: f.label, name: rowName, from: nowOf(item, f), to: r.value, note: r.note, changedInSlam: wasRow ? !same(nowV, wasStored) : false });
        }
        if (statusCol >= 0 && item.rec) {
          const word = isBlankCell(row[statusCol]) ? null : String(row[statusCol]).trim();
          const st = word === null ? null : STATUS_BACK[word.toLowerCase()];
          const wasWord = wasRow ? wasRow._status ?? null : STATUS_WORDS[item.rec.status] ?? null;
          if (word !== null && !st) push({ tab, area: area.id, op: 'status', recId: id, label: 'Status', name: rowName, from: item.rec.status, to: word, bad: `${word} is not a status (Know it, Roughly, Guess, Not for me, I'll find it later, Not now)` });
          else if ((word ?? null) !== (wasWord ?? null) && (st ?? null) !== (item.rec.status ?? null)) push({ tab, area: area.id, op: 'status', recId: id, label: 'Status', name: rowName, from: item.rec.status, to: st, changedInSlam: wasRow ? (STATUS_WORDS[item.rec.status] ?? null) !== (wasWord ?? null) : false });
        }
        if (typeCol >= 0 && item.rec && !isBlankCell(row[typeCol]) && String(row[typeCol]).trim() !== (item.rec.type ?? '')) {
          push({ tab, area: area.id, op: 'edit', recId: id, field: 'type', fld: { key: 'type', where: 'top', type: 'text' }, label: 'Type', name: rowName, from: item.rec.type, to: String(row[typeCol]).trim() });
        }
        continue;
      }
      // A new row.
      const values = {}, bad = [];
      for (const { f, i } of filled) { const r = fromCell(f.type, row[i], f); if (r.bad) bad.push(`${f.label}: ${r.bad}`); else values[f.key] = r.value; }
      if (area.source === 'records') {
        const kindWord = kindCol >= 0 && !isBlankCell(row[kindCol]) ? String(row[kindCol]).trim().toLowerCase() : null;
        const kind = Object.entries(area.kinds).find(([, w]) => w.toLowerCase() === kindWord)?.[0] ?? Object.keys(area.kinds)[0];
        for (const k of Object.keys(values)) { const f = fields.find(x => x.key === k); if (f.kinds && !f.kinds.includes(kind)) delete values[k]; }
        const word = statusCol >= 0 && !isBlankCell(row[statusCol]) ? String(row[statusCol]).trim().toLowerCase() : null;
        push({ tab, area: area.id, op: 'add', kind, type: typeCol >= 0 && !isBlankCell(row[typeCol]) ? String(row[typeCol]).trim() : null, status: word ? STATUS_BACK[word] ?? null : null,
          values, fields, label: `New ${area.kinds[kind].toLowerCase()}`, name: values.name ?? rowName, to: values, bad: bad.length ? bad.join('; ') : null });
      } else if (area.source === 'months') {
        const mo = colOf('Month (YYYY-MM)'), li = colOf('Budget line');
        const ym = fromCell('month', row[mo]).value;
        const line = doc.records.find(r => r.kind === 'bill' && String(r.name || r.values?.category || '').toLowerCase() === String(row[li] ?? '').trim().toLowerCase());
        push({ tab, area: area.id, op: 'add', values, ym, lineId: line?.id ?? null, label: 'New month line', name: `${row[li] ?? 'A line'}, ${ym ?? 'no month'}`, to: values,
          bad: !ym ? 'needs a month (YYYY-MM)' : !line ? `no Budget line called ${row[li] ?? '(blank)'}` : bad.length ? bad.join('; ') : null });
      } else {
        push({ tab, area: area.id, op: 'add', values, label: `New ${area.tab.toLowerCase().replace(/s$/, '')}`, name: values.name ?? values.kind ?? rowName, to: values, bad: bad.length ? bad.join('; ') : null });
      }
    }
    // Rows in the file when it was made that are gone now: offered as removals, not ticked.
    if (baseArea && idCol >= 0) {
      for (const id of Object.keys(baseArea)) {
        if (seen.has(id) || !current.has(id)) continue;
        const item = current.get(id);
        push({ tab, area: area.id, op: 'remove', recId: id, label: 'Row taken out of the spreadsheet', name: item.rec?.name || item.rec?.type || item.get({ key: 'name' }) || id, from: null, to: null });
      }
    }
  }

  // Assumptions: the blue This client column.
  const aRows = grid.Assumptions;
  if (aRows) {
    const headAt = aRows.findIndex(r => r?.[0] === 'What');
    for (const a of ASSUMPTIONS.filter(x => x.client)) {
      const r = aRows.find((row, i) => i > headAt && row?.[0] === a.label);
      if (!r) continue;
      const fld = { type: a.unit === 'pct' ? 'pct' : 'money' };
      const got = fromCell(fld.type === 'pct' ? 'pct' : 'number', r[2]);
      const nowV = doc.assumptions?.[a.client] ?? null;
      const was = base ? base.assumptions?.[a.client] ?? null : nowV;
      if (got.bad) { push({ tab: 'Assumptions', area: 'assumptions', op: 'edit', field: a.client, label: a.label, name: 'Assumptions', from: nowV, to: r[2], bad: got.bad }); continue; }
      if (same(got.value, was) || same(got.value, nowV)) continue;
      push({ tab: 'Assumptions', area: 'assumptions', op: 'edit', recId: 'assumptions', field: a.client, fld: { key: a.client, type: a.unit === 'pct' ? 'pct' : a.unit === 'number' ? 'number' : 'money' }, label: a.label, name: 'Assumptions', from: nowV, to: got.value, note: got.note, changedInSlam: base ? !same(nowV, was) : false });
    }
  }
  return { changes: out, warnings, ignored: [...new Set(ignored)], baseline: base };
}

// Save the ticked changes: a snapshot first, then one undo step.
export function applyChanges(store, changes, { metrics = null } = {}) {
  const list = changes.filter(c => c.ok && !c.bad);
  if (!list.length) return 0;
  store.snapshot('Before spreadsheet import', metrics);
  store.transaction('Spreadsheet import', () => {
    const lists = {};
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
        if (c.fld.key === 'household') store.setDoc('client', { couple: c.to === 'Couple' }); // Solo or couple sets both, as on About you
        continue;
      }
      if (area?.source === 'records') {
        if (c.op === 'edit') store.update(c.recId, { [c.field]: c.to });
        else if (c.op === 'status') store.update(c.recId, { status: c.to });
        else if (c.op === 'remove') store.remove(c.recId);
        else if (c.op === 'add') {
          const top = {}, values = {};
          for (const [k, v] of Object.entries(c.values)) { const f = c.fields.find(x => x.key === k); (f?.where === 'top' ? top : values)[k] = v; }
          store.add(c.kind, { ...top, status: c.status ?? null, values }, { type: c.type });
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
      if (area?.source === 'list') { // collected, then the list is written once
        const now = lists[area.id] ??= JSON.parse(JSON.stringify(getPath(store.doc[area.part] || {}, area.path) || []));
        const key = x => (area.keyField ? x[area.keyField] : x.id);
        if (c.op === 'add') now.push({ ...(area.keyField ? {} : { id: store.makeId() }), ...c.values });
        else if (c.op === 'remove') lists[area.id] = now.filter(x => String(key(x)) !== c.recId);
        else { const it = now.find(x => String(key(x)) === c.recId); if (it) it[c.field] = c.to; }
      }
    }
    for (const [id, list2] of Object.entries(lists)) { const area = AREAS.find(a => a.id === id); store.setDoc(area.part, { [area.path]: list2 }); }
  });
  return list.length;
}
