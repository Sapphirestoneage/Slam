// SPDX-License-Identifier: AGPL-3.0-only
// Open the books: the spreadsheet of one household, built only from the registries (js/registry/). Pure: returns a
// plan of sheets, cells, formulas and named ranges; js/sheet/excel.js writes it with ExcelJS. Nothing here names a
// tab, a column or a formula of its own: a new field, math entry or assumption lands in the workbook by being in its
// registry, and buildWorkbook throws when a formula points at a name that does not exist.
import { AREAS, sheetFields, fieldsFor } from '../registry/fields.js';
import { MATH, rowsOf } from '../registry/math.js';
import { ASSUMPTIONS, TABLES, sourceOf } from '../registry/assumptions.js';
import { REPORTS } from '../registry/reports.js';
import { sheetContext } from './context.js';
import { FORMAT_VERSION, APP_VERSION, shapeOf, fingerprint } from './format.js';

export const BLANK_ROWS = 20;
export const REPO = 'https://github.com/sapphirestoneage/slam';
export const DATA_TAB = '_meta';
export const OLD_DATA_TAB = 'SLAM data'; // the first files made (Nov 3 2026) kept it here
export const COACH_TAB = 'Coach notes';
// The stored statuses as the sheet shows them (one sureness system: Not sure is a Guess).
export const STATUS_WORDS = { 'Know it': 'Know it', Roughly: 'Roughly', 'Not sure': 'Guess', 'Not for me': 'Not for me', 'Will email': "I'll find it later", 'Not now': 'Not now', Computed: 'Worked out' };
export const STATUS_LIST = ['Know it', 'Roughly', 'Guess', 'Not for me', "I'll find it later", 'Not now'];
const FMT = { money: '"$"#,##0.00', pct: '0.00%', months: '0', number: 'General', years: '0.0', day: '0', date: 'yyyy-mm-dd', month: 'yyyy-mm', text: '@', choice: '@', yesno: '@', list: '@' };
const TOL = { money: 1, cents: 0.01, pct: 0.0005, months: 1, number: 0.01, years: 0.05 }; // within $1 or 1 month; a cent where the app shows cents (cents: true)
const BUILTIN = { Kind: 'Kind', Type: 'Type', Status: 'Status', InMath: 'In the math' };

export const colLetter = n => { let s = ''; for (let i = n; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
const q = name => `'${name.replace(/'/g, "''")}'`;
const absRange = (sheet, col, r1, r2 = r1) => (r1 === r2 ? `${q(sheet)}!$${col}$${r1}` : `${q(sheet)}!$${col}$${r1}:$${col}$${r2}`);
const str = v => `"${String(v).replace(/"/g, '""')}"`;
const lit = v => (v === null || v === undefined || v === '' ? '""' : typeof v === 'number' ? String(+v.toFixed(10)) : str(v));
export const nameOk = n => /^[A-Za-z_][A-Za-z0-9_]*$/.test(n) && !/^[A-Za-z]{1,3}\d+$/.test(n) && !/^[RrCc]\d*$/.test(n) && !/^R\d*C\d*$/i.test(n);
const getPath = (o, path) => path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);

// A field's named range: Area_key (a part other than the area's own, like spending.source on Profile, is in the name).
export const fieldName = (area, fld) => fld.named ?? `${area.prefix}_${fld.part && fld.part !== (area.part ?? 'profile') ? `${fld.part}_` : ''}${fld.key}`.replace(/\./g, '_');
export const partOf = (area, fld) => fld.part ?? area.part ?? 'profile';

// A stored value as a sheet cell value, and back (js/import-sheet.js reads with the same rules).
export function toCell(type, v) {
  if (v === null || v === undefined || v === '') return null;
  if (type === 'yesno') return v === true ? 'Yes' : v === false ? 'No' : String(v);
  if (type === 'list') return Array.isArray(v) ? v.filter(x => x != null && x !== '').join(', ') : String(v);
  if (type === 'date' || type === 'month') {
    const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(v));
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +(m[3] || 1))) : String(v);
  }
  if (['money', 'pct', 'number', 'day'].includes(type)) return typeof v === 'number' ? v : Number.isFinite(Number(v)) ? Number(v) : String(v);
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

// Every formula column on an Inputs tab: from the math registry and the report tabs, in registry order.
export function formulaCols() {
  return [...MATH.flatMap(e => (e.cols || []).map(col => ({ ...col, entry: e.id }))), ...REPORTS.flatMap(r => (r.cols || []).map(col => ({ ...col, entry: r.tab })))];
}

export function buildWorkbook(doc, ref, { now = new Date(), coach = false, flags = [] } = {}) {
  const c = sheetContext(doc, ref, { now, flags });
  c.coach = coach; // F6: the Captured tab keeps coach-only changes out of the client copy
  const names = new Map(); // name -> absolute reference
  const sheets = [];
  const baseline = { version: FORMAT_VERSION, exportedAt: now.toISOString(), clientId: doc.id, client: null, coach, areas: {}, assumptions: {} };
  const define = (name, ref1) => {
    if (!nameOk(name)) throw new Error(`Not a usable range name: ${name}`);
    if (names.has(name)) throw new Error(`Range name used twice: ${name}`);
    names.set(name, ref1);
  };
  const cols = formulaCols();

  // ---------- Start here ----------
  const client = doc.client?.name || [doc.profile?.firstName, doc.profile?.lastName].filter(Boolean).join(' ') || 'Client';
  baseline.client = client;
  const day = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  sheets.push({ name: 'Start here', kind: 'start', widths: [100], rows: [
    [{ v: `SLAM: the books for ${client}`, s: 'title' }],
    [{ v: `Made ${day}${coach ? ' (coach copy, with coach-only notes)' : ''}.`, s: 'text' }],
    [{ v: 'This file holds every number SLAM has for this household, and the math behind each one, as live formulas.', s: 'text' }],
    [],
    [{ v: 'How to use it', s: 'section' }],
    [{ v: 'Blue cells are your numbers. Change them and everything else updates.', s: 'text' }],
    [{ v: 'Black cells are formulas. Click one to see its math.', s: 'text' }],
    [{ v: 'Each Inputs tab ends with 20 blank blue rows for new entries.', s: 'text' }],
    [{ v: 'The Math tab checks each formula against the app: Matches, or the gap.', s: 'text' }],
    [{ v: "When you're ready, bring this file back into SLAM to save your changes.", s: 'text' }],
    [],
    [{ v: 'Tabs', s: 'section' }],
    ...['Assumptions', ...AREAS.map(a => a.tab), 'Math', ...REPORTS.map(r => r.tab)].map(t => [{ v: `${t}: ${tabAbout(t)}`, s: 'text' }]),
    [],
    [{ v: 'SLAM is open source (AGPL-3.0).', s: 'text' }],
    [{ v: REPO, s: 'link', link: REPO }],
    [{ v: 'Coach, not a licensed financial advisor.', s: 'note' }],
  ] });

  // ---------- Assumptions ----------
  const aRows = [[{ v: 'Assumptions and reference values', s: 'title' }], [{ v: 'Every rate, limit and rule the math uses, with where it comes from. Blue cells are yours: leave one blank to use the default.', s: 'about' }],
    ['What', 'Default', 'This client', 'Used', 'Source', 'Checked'].map(v => ({ v, s: 'head' }))];
  const aSheet = { name: 'Assumptions', kind: 'assumptions', widths: [52, 14, 14, 14, 60, 12], freeze: { rows: 3 }, rows: aRows };
  for (const a of ASSUMPTIONS) {
    const r = aRows.length + 1;
    const def = a.get(ref);
    const mine = a.client ? doc.assumptions?.[a.client] ?? null : null;
    if (a.client) baseline.assumptions[a.client] = mine;
    const fallback = def == null && a.fallback ? a.fallback : null;
    aRows.push([{ v: a.label, s: 'text' }, { v: def, s: 'text', fmt: a.unit },
      a.client ? { v: mine, s: 'input', fmt: a.unit, key: `assumption:${a.client}` } : { v: null, s: 'na' },
      a.client ? { f: `IF(C${r}<>"",C${r},${fallback ? `${fallback}` : `B${r}`})`, s: 'formula', fmt: a.unit } : { f: `B${r}`, s: 'formula', fmt: a.unit },
      { v: a.source, s: 'note' }, { v: a.date, s: 'note' }]);
    define(a.name, absRange(aSheet.name, 'D', r));
  }
  for (const t of TABLES) {
    aRows.push([]);
    aRows.push([{ v: t.label, s: 'section' }, { v: null }, { v: null }, { v: null }, { v: sourceOf(t, ref), s: 'note' }, { v: t.date, s: 'note' }]);
    aRows.push(t.columns.map(([, label]) => ({ v: label, s: 'head' })));
    const first = aRows.length + 1;
    for (const row of t.rows(ref)) aRows.push(row.map((v, i) => ({ v, s: 'formulaValue', fmt: t.columns[i][2] })));
    const last = aRows.length;
    t.columns.forEach(([key], i) => define(`${t.id}_${key}`, absRange(aSheet.name, colLetter(i + 1), first, last)));
  }
  sheets.push(aSheet);

  // ---------- Inputs: one tab per area ----------
  const inputTabs = [];
  for (const area of AREAS) {
    const fields = sheetFields(area, { coach });
    const myCols = cols.filter(x => x.area === area.id);
    const layout = []; // { key, label, kind: 'id'|'builtin'|'field'|'formula', fld, col }
    const isRecords = area.source === 'records';
    layout.push({ key: '_id', label: 'SLAM id (leave as is)', kind: 'id' }); // every row carries its record ID, hidden
    if (isRecords) for (const b of ['Kind', 'Type', 'Status', 'InMath']) layout.push({ key: b, label: BUILTIN[b], kind: 'builtin' });
    if (area.source === 'months') layout.push({ key: 'month', label: 'Month (YYYY-MM)', kind: 'month' }, { key: 'line', label: 'Budget line', kind: 'line' });
    for (const fld of fields) layout.push({ key: fld.key, label: fld.label, kind: 'field', fld });
    for (const col of myCols) layout.push({ key: col.key, label: col.label, kind: 'formula', col });
    layout.forEach((l, i) => { l.letter = colLetter(i + 1); });
    const letterOf = new Map(layout.map(l => [l.key, l.letter]));
    const rows = [layout.map(l => ({ v: l.label, s: 'head', key: l.key }))];
    const sheet = { name: area.tab, kind: 'inputs', area: area.id, layout, rows, freeze: { rows: 1, cols: isRecords ? 5 : 1 },
      hiddenCols: layout.filter(l => l.kind === 'id').map(l => l.letter), widths: layout.map(l => (l.kind === 'id' ? 10 : Math.min(36, Math.max(11, l.label.length + 2)))), validations: [] };
    const base = baseline.areas[area.id] = {};
    const data = rowsForArea(area, doc, c);
    const total = area.source === 'doc' ? 1 : data.length + BLANK_ROWS;
    const kindNames = isRecords ? Object.values(area.kinds) : [];
    for (let i = 0; i < total; i++) {
      const item = data[i] ?? null;
      const r = i + 2;
      const rowBase = item ? (base[item.id] = {}) : null;
      const cells = layout.map(l => {
        if (l.kind === 'id') return { v: item?.id ?? null, s: 'hidden', fmt: 'text' };
        if (l.kind === 'month') return { v: item?.ym ?? null, s: item ? 'text' : 'input', fmt: 'text' };
        if (l.kind === 'line') return { v: item?.lineName ?? null, s: item ? 'text' : 'input', fmt: 'text' };
        if (l.kind === 'builtin') {
          if (l.key === 'Kind') return { v: item ? area.kinds[item.rec.kind] : kindNames[0], s: item ? 'text' : 'input' };
          if (l.key === 'Type') return { v: item?.rec.type ?? null, s: 'input' };
          if (l.key === 'Status') { const st = item ? STATUS_WORDS[item.rec.status] ?? null : null; if (rowBase) rowBase._status = st; return { v: st, s: 'input' }; }
          return { v: item ? c.inMath(item.rec) : 'Yes', s: 'text' };
        }
        if (l.kind === 'field') {
          const applies = !item?.rec || !l.fld.kinds || l.fld.kinds.includes(item.rec.kind);
          const v = item ? toCell(l.fld.type, item.get(l.fld)) : null;
          if (rowBase && applies) rowBase[l.fld.key] = v instanceof Date ? v.toISOString().slice(0, 10) : v;
          return { v, s: applies ? 'input' : 'na', fmt: l.fld.type };
        }
        const tmpl = typeof l.col.f === 'function' ? l.col.f(item?.rec ?? { values: {}, kind: null }, c) : l.col.f;
        return { f: compileRowFormula(tmpl, { letterOf, row: r, app: l.col.app, rec: item?.rec ?? null, c, where: `${area.tab}: ${l.label}` }), s: 'formula', fmt: l.col.unit };
      });
      rows.push(cells);
    }
    const last = total + 1;
    for (const l of layout) {
      if (l.kind === 'id') { define(`${area.prefix}_Id`, area.source === 'doc' ? absRange(sheet.name, l.letter, 2) : absRange(sheet.name, l.letter, 2, last)); continue; }
      if (l.kind === 'month' || l.kind === 'line') continue;
      const name = l.kind === 'field' ? fieldName(area, l.fld) : l.kind === 'builtin' ? `${area.prefix}_${l.key}` : `${area.prefix}_${l.key}`;
      define(name, area.source === 'doc' ? absRange(sheet.name, l.letter, 2) : absRange(sheet.name, l.letter, 2, last));
      const list = l.kind === 'builtin' ? (l.key === 'Status' ? STATUS_LIST : l.key === 'Kind' && kindNames.length > 1 ? kindNames : l.key === 'Type' ? [...new Set(Object.values(area.types || {}).flat())] : null)
        : l.fld?.type === 'choice' ? l.fld.options : l.fld?.type === 'yesno' ? ['Yes', 'No'] : null;
      if (list?.length && list.join(',').length < 250) sheet.validations.push({ col: l.letter, from: 2, to: last, list });
    }
    sheets.push(sheet);
    inputTabs.push(sheet);
  }

  // ---------- Math ----------
  const mRows = [[{ v: 'Math: every formula', s: 'title' }], [{ v: 'One row per formula in SLAM. Formula is live; The app\'s value is what SLAM shows; Check says Matches, or the gap.', s: 'about' }],
    ['ID', 'In plain words', 'Formula', "The app's value", 'Check', 'Made of'].map(v => ({ v, s: 'head' }))];
  const mathSheet = { name: 'Math', kind: 'math', widths: [9, 60, 18, 18, 14, 36], freeze: { rows: 3, cols: 2 }, rows: mRows };
  const pending = [];
  for (const e of MATH) {
    for (const row of rowsOf(e)) {
      const r = mRows.length + 1;
      const unit = row.unit ?? e.unit;
      const appV = appValue(row, c);
      const id = row.key ? `${e.id} · ${row.key}` : e.id;
      const name = row.key ? `Math_${e.id}_${row.key}` : `Math_${e.id}`;
      if (row.fromApp) {
        mRows.push([{ v: id, s: 'text' }, { v: row.name, s: 'text' }, { v: `From the app: ${row.fromApp}`, s: 'note' }, { v: appV, s: 'app', fmt: unit }, { v: 'From the app', s: 'note' }, { v: row.key ? '' : e.inputs, s: 'note' }]);
        define(name, absRange(mathSheet.name, 'D', r));
      } else {
        mRows.push([{ v: id, s: 'text' }, { v: row.name, s: 'text' }, { f: row.sheet, s: 'formula', fmt: unit, cached: appV }, { v: appV, s: 'app', fmt: unit },
          { f: checkFormula(`C${r}`, `D${r}`, unit === 'money' && (row.cents ?? e.cents) ? 'cents' : unit), s: 'check' }, { v: row.key ? '' : e.inputs, s: 'note' }]);
        define(name, absRange(mathSheet.name, 'C', r));
        pending.push({ f: row.sheet, where: `Math ${id}` });
      }
    }
  }
  sheets.push(mathSheet);

  // ---------- Statements, FOO, Projections: each a tab of one or more tables ----------
  for (const rep of REPORTS) {
    const rows = [[{ v: rep.tab, s: 'title' }], [{ v: rep.about, s: 'about' }]];
    const sheet = { name: rep.tab, kind: 'report', widths: [], freeze: { rows: 3 }, rows };
    for (const t of rep.tables ? rep.tables(c) : [{ columns: rep.columns, sections: rep.sections(c) }]) {
      const head = t.columns;
      head.forEach((h, i) => { sheet.widths[i] = Math.max(sheet.widths[i] ?? 0, h.width ?? 16); });
      if (t.title) rows.push([{ v: t.title, s: 'section' }]);
      if (t.note) rows.push([{ v: t.note, s: 'note' }]);
      const letterOf = new Map(head.map((h, i) => [h.key, colLetter(i + 1)]));
      rows.push(head.map(h => ({ v: h.label, s: 'head' })));
      const first = rows.length + 1;
      const flat = [];
      for (const sec of t.sections) {
        if (sec.title) { rows.push([{ v: sec.title, s: 'section' }]); flat.push(null); }
        for (const row of sec.rows) { rows.push(null); flat.push({ row, r: rows.length }); }
      }
      const last = rows.length;
      let prevRow = null;
      for (const item of flat) {
        if (!item) { prevRow = null; continue; }
        const { row, r } = item;
        const cells = normalizeReportRow(row);
        rows[r - 1] = head.map(h => {
          if (h.check) return { f: reportCheck(h, letterOf, r, row.unit ?? head.find(x => x.key === h.check[0]).unit), s: 'check' };
          const cell = cells[h.key];
          const unit = h.unit === 'row' ? row.unit : h.unit;
          if (!cell) return { v: null };
          if (cell.f) {
            const f = compileReportFormula(cell.f, { letterOf, row: r, prev: prevRow, first, last, where: `${rep.tab}: ${row.name ?? row.key ?? r}` });
            pending.push({ f, where: `${rep.tab} row ${r}` });
            // The app's value is cached only in the cell the Check compares with it: a spreadsheet that shows cached values
            // until it recalculates (LibreOffice by default) would otherwise show it in every formula of the row (batch 38:
            // the age, contributions and growth on Projections all read as the year's balance).
            const chk = head.find(x => x.check);
            const pair = [chk?.check ?? ['f', 'app'], chk?.also].find(p => p?.[0] === h.key);
            return { f, s: row.total ? 'total' : 'formula', fmt: unit, cached: pair ? cells[pair[1]]?.v : undefined };
          }
          const v = unit === 'month' ? toCell('month', cell.v) : cell.v;
          return { v, s: cell.fromApp || h.key === 'app' || h.key.startsWith('app') ? 'app' : cell.note ? 'note' : 'text', fmt: unit };
        });
        const namedCol = head.find(h => cells[h.key]?.named) ?? head.find(h => h.named);
        if (row.key && namedCol) define(`${rep.prefix}_${row.key}`, absRange(sheet.name, letterOf.get(namedCol.key), r));
        prevRow = r;
      }
      rows.push([]);
    }
    sheets.push(sheet);
  }

  // ---------- Coach notes (coach copy only) ----------
  if (coach) {
    const fb = doc.session?.feedback || [];
    const t = doc.session?.timer || {};
    sheets.push({ name: COACH_TAB, kind: 'coach', widths: [22, 34, 80], rows: [
      [{ v: 'Coach notes', s: 'title' }], [{ v: 'Coach only: Report this notes and the onboarding timer. Not brought back in.', s: 'about' }],
      [{ v: 'Report this notes', s: 'section' }], ['When', 'Screen', 'Note'].map(v => ({ v, s: 'head' })),
      ...fb.map(n => [{ v: n.at, s: 'text' }, { v: n.title || n.screen, s: 'text' }, { v: n.note, s: 'text' }]),
      [], [{ v: 'Onboarding timer', s: 'section' }], ['Mark', 'When'].map(v => ({ v, s: 'head' })),
      ...Object.entries(t).map(([k, v]) => [{ v: k, s: 'text' }, { v: typeof v === 'object' ? JSON.stringify(v) : v, s: 'text' }]),
    ] });
  }

  // ---------- _meta (hidden, protected): who and when, the format version, a fingerprint of each record, and what
  // each cell held, so the import sees only real edits and knows what SLAM changed since ----------
  const json = JSON.stringify(baseline);
  const chunks = json.match(/[\s\S]{1,30000}/g) || [''];
  const prints = [...doc.records.map(r => [r.id, fingerprint(r)]), ...['profile', 'client', 'assumptions', 'settings'].map(p => [`doc:${p}`, fingerprint(doc[p] || {})])];
  sheets.push({ name: DATA_TAB, kind: 'data', hidden: true, protect: true, widths: [28, 40], rows: [
    [{ v: 'SLAM keeps what this file held when it was made here. Leave this tab as it is.', s: 'note' }],
    [{ v: 'Client ID', s: 'text' }, { v: doc.id, s: 'text', fmt: 'text' }],
    [{ v: 'Client', s: 'text' }, { v: client, s: 'text' }],
    [{ v: 'Export format version', s: 'text' }, { v: FORMAT_VERSION, s: 'text' }],
    [{ v: 'Exported at', s: 'text' }, { v: now.toISOString(), s: 'text', fmt: 'text' }],
    [{ v: 'App version', s: 'text' }, { v: APP_VERSION, s: 'text', fmt: 'text' }],
    [{ v: 'Registry shape', s: 'text' }, { v: shapeOf(), s: 'text', fmt: 'text' }],
    [{ v: 'Coach copy', s: 'text' }, { v: coach ? 'Yes' : 'No', s: 'text' }],
    [],
    [{ v: 'Fingerprints', s: 'section' }],
    [{ v: 'Record ID', s: 'head' }, { v: 'Fingerprint of its values', s: 'head' }],
    ...prints.map(([id, fp]) => [{ v: id, s: 'text', fmt: 'text' }, { v: fp, s: 'text', fmt: 'text' }]),
    [],
    [{ v: 'Baseline', s: 'section' }],
    ...chunks.map(ch => [{ v: ch, s: 'hidden', fmt: 'text' }]),
  ] });
  baseline.fingerprints = Object.fromEntries(prints);

  // Every name a formula uses must exist: the build fails here, never in the client's spreadsheet.
  for (const s of inputTabs) for (const row of s.rows.slice(1)) for (const cell of row) if (cell?.f) pending.push({ f: cell.f, where: s.name });
  for (const p of pending) checkNames(p.f, names, p.where);
  return { sheets, names: [...names].map(([name, refr]) => ({ name, ref: refr })), baseline, context: c, client, at: now };
}

function tabAbout(t) {
  if (t === 'Assumptions') return 'every rate, limit and rule, with its source and date';
  if (t === 'Math') return 'every formula, its value in the app, and a check';
  return AREAS.find(a => a.tab === t)?.about ?? REPORTS.find(r => r.tab === t)?.about ?? '';
}

// The rows of one Inputs tab: { id, rec?, get(fld) }.
export function rowsForArea(area, doc, c) {
  if (area.source === 'doc') return [{ id: 'doc', get: fld => getPath(doc[partOf(area, fld)] || {}, fld.key) }];
  if (area.source === 'records') {
    return doc.records.filter(r => area.kinds[r.kind]).map(rec => ({ id: rec.id, rec, get: fld => (fld.where === 'top' ? rec[fld.key] : rec.values?.[fld.key]) }));
  }
  if (area.source === 'list') {
    const list = getPath(doc[area.part] || {}, area.path) || [];
    return list.map((it, i) => ({ id: area.keyField ? it[area.keyField] : it.id ?? String(i), get: fld => it[fld.key] }));
  }
  if (area.source === 'months') {
    const months = doc.spending?.months || {};
    const lineName = id => { const r = doc.records.find(x => x.id === id); return r ? r.name || r.values?.category || r.type || 'Budget line' : /^cat:/.test(id) ? `${id.slice(4)} (gut-only category)` : id; }; // batch 33: Month end's gut-only categories
    return Object.keys(months).sort().flatMap(ym => Object.entries(months[ym].lines || {}).filter(([, l]) => l && (l.estimate != null || l.actual != null))
      .map(([lineId, l]) => ({ id: `${ym}|${lineId}`, ym, lineId, lineName: lineName(lineId), get: fld => l[fld.key] })));
  }
  return [];
}

function appValue(row, c) {
  try {
    if (row.never?.(c)) return 'Never';
    const v = row.app ? row.app(c) : null;
    return typeof v === 'number' && !Number.isFinite(v) ? null : v ?? null;
  } catch { return null; }
}

// {field} is this row's cell; {@key} another formula column; {Kind} and the other built-ins; {app:name} the app's value.
export function compileRowFormula(tmpl, { letterOf, row, app = {}, rec, c, where }) {
  return tmpl.replace(/\{(@?)(app:)?([A-Za-z0-9_]+)\}/g, (all, at, isApp, key) => {
    if (isApp) {
      const fn = app?.[key];
      if (!fn) throw new Error(`${where}: no app value called ${key}`);
      return lit(rec ? fn(rec, c) : '');
    }
    const letter = letterOf.get(key);
    if (!letter) throw new Error(`${where}: no column ${at}${key} on this tab`);
    return `${letter}${row}`;
  });
}
function compileReportFormula(tmpl, { letterOf, row, prev, first, last, where }) {
  // {col:key} this row, {prev:key} the row above, {range:key} the whole table column, {above:key} the column down to
  // the row above this one (no formula ever reads its own cell).
  return tmpl.replace(/\{(col|prev|range|above):([A-Za-z0-9_]+)\}/g, (all, kind, key) => {
    const letter = letterOf.get(key);
    if (!letter) throw new Error(`${where}: no column ${key}`);
    if (kind === 'col') return `${letter}${row}`;
    if (kind === 'range') return `$${letter}$${first}:$${letter}$${last}`;
    if (kind === 'above') return `$${letter}$${first}:$${letter}$${row - 1}`;
    if (!prev) throw new Error(`${where}: no row above for {prev:${key}}`);
    return `${letter}${prev}`;
  });
}
// A short row ({ name, f | fromApp, app }) as cells. A row from the app shows the app's number in the Formula column.
function normalizeReportRow(row) {
  if (row.cells) return row.cells;
  return { name: { v: row.name }, f: row.fromApp ? { v: row.app ?? null, fromApp: true } : { f: row.f }, app: { v: row.app ?? null } };
}
export function checkFormula(a, b, unit) {
  const tol = TOL[unit] ?? 0.01;
  return `IF(AND(ISNUMBER(${a}),ISNUMBER(${b})),IF(ABS(${a}-${b})<=${tol},"Matches",${a}-${b}),IF(${a}&""=${b}&"","Matches","Differs"))`;
}
function reportCheck(h, letterOf, r, unit) {
  const [a, b] = h.check.map(k => `${letterOf.get(k)}${r}`);
  const main = checkFormula(a, b, unit);
  if (!h.also) return main;
  const [x, y] = h.also.map(k => `${letterOf.get(k)}${r}`);
  return `IF(${x}&""<>${y}&"","Differs",${main})`;
}

const FUNCS = /^(TRUE|FALSE)$/i;
// Functions newer than Excel 2010 are stored with an _xlfn. prefix and show #NAME? in some spreadsheets; use the
// older ones (SUMIFS, SUMPRODUCT, INDEX and MATCH) so the file opens the same in Excel, Google Sheets and LibreOffice.
const NEWER = /\b(MAXIFS|MINIFS|IFS|SWITCH|XLOOKUP|XMATCH|CONCAT|TEXTJOIN|LET|LAMBDA|FILTER|SORT|UNIQUE|SEQUENCE|IFNA)\s*\(/i;
export function checkNames(f, names, where) {
  if (/[{}]/.test(f)) throw new Error(`${where}: a token was left in the formula: ${f}`);
  if (NEWER.test(f.replace(/"(?:[^"]|"")*"/g, '""'))) throw new Error(`${where}: ${NEWER.exec(f)[1]} is too new for every spreadsheet: ${f}`);
  const bare = f.replace(/"(?:[^"]|"")*"/g, '""').replace(/'(?:[^']|'')*'!\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?/g, '');
  for (const m of bare.matchAll(/[A-Za-z_][A-Za-z0-9_.]*/g)) {
    const word = m[0];
    const after = bare.slice(m.index + word.length).trimStart()[0];
    if (after === '(' || FUNCS.test(word)) continue;
    if (/^\$?[A-Z]{1,3}\$?\d+$/.test(word) || /^[A-Z]{1,3}$/.test(word) && /^\$?\d/.test(bare.slice(m.index + word.length))) continue;
    if (/^[A-Z]{1,3}\d+$/.test(word)) continue;
    if (!names.has(word)) throw new Error(`${where}: the formula uses ${word}, which is not a named range in the workbook`);
  }
}
export { FMT, fieldsFor };
