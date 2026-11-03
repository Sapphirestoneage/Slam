// SPDX-License-Identifier: AGPL-3.0-only
// Spec drift: the registries against the spec, row by row. Every row on the spec's Fields tab names, in its SLAM id
// column, exactly what it is in code (tools/spec_link.py lists the forms); every field in js/registry/fields.js is named
// by a row; every M number on the Math tab is in js/registry/math.js with the same name. test/coverage.test.js fails
// the run on any drift and writes SPEC-DRIFT.md. Rows the spec has and the app has not built yet say so (notyet: why),
// and are listed there too, as known gaps rather than drift.
import { AREAS, KINDS, NOT_IN_SHEET } from './fields.js';
import { MATH } from './math.js';
import { ASSUMPTIONS } from './assumptions.js';

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// One CSV line to cells (quotes and doubled quotes).
export function csvCells(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}
// CSV text to rows (quoted cells may hold new lines).
function csvRows(text) {
  const rows = []; let cur = '', q = false;
  for (const line of text.split(/\r?\n/)) { cur = cur ? `${cur}\n${line}` : line; q = (cur.match(/"/g) || []).length % 2 === 1; if (!q) { rows.push(csvCells(cur)); cur = ''; } }
  return rows;
}

// Does one SLAM id token name something that exists? Returns null, or why not.
export function tokenProblem(token, ref) {
  const fieldIds = new Set(AREAS.flatMap(a => a.fields.map(f => f.id)));
  const [kind, ...rest] = token.split(':');
  const val = rest.join(':').trim();
  if (!rest.length) return fieldIds.has(token) ? null : `no field ${token} in js/registry/fields.js`;
  if (kind === 'type') { const [area, ...t] = val.split(':'); const a = AREAS.find(x => x.id === area); return a && Object.values(a.types || {}).flat().includes(t.join(':')) ? null : `no type ${t.join(':')} on ${area}`; }
  if (kind === 'kind') return KINDS[val] ? null : `no record kind ${val}`;
  if (kind === 'line') return (ref?.spendingPresets?.lines || []).some(l => l.name === val) || (ref?.categoryDefaults || []).some(c => c.category === val) ? null : `no starter Budget line or category ${val}`;
  if (kind === 'math') return MATH.some(e => e.id === val) ? null : `no ${val} in js/registry/math.js`;
  if (kind === 'assumption') return ASSUMPTIONS.some(a => a.client === val) ? null : `no client assumption ${val}`;
  if (kind === 'ref') return ASSUMPTIONS.some(a => a.id === val || a.id.startsWith(`${val}.`)) ? null : `no Reference data value ${val}`;
  if (kind === 'app') return NOT_IN_SHEET[val] ? null : `no app data ${val} (NOT_IN_SHEET)`;
  if (kind === 'notyet') return val.length > 5 ? null : 'notyet needs the reason';
  return `${kind}: is not a kind of SLAM id`;
}

export function specDrift(fieldsCsv, mathCsv, ref) {
  const rows = csvRows(fieldsCsv);
  const head = rows.find(r => r[0] === 'ID') || [];
  const at = name => head.indexOf(name);
  const spec = rows.filter(r => /^F\d{3}$/.test(r[0])).map(r => ({ id: r[0], area: r[at('Area')], name: r[at('Field')], scope: r[at('Scope')], slam: at('SLAM id') >= 0 ? r[at('SLAM id')] ?? '' : '' }));
  const problems = [], notYet = [], later = [];
  const named = new Set();
  if (at('SLAM id') < 0) problems.push('The spec\'s Fields tab has no SLAM id column. Run tools/spec_link.py.');
  for (const s of spec) {
    const tokens = s.slam.split(';').map(t => t.trim()).filter(Boolean);
    if (!tokens.length) { if (s.scope === 'Now') problems.push(`${s.id} ${s.area} › ${s.name}: no SLAM id (name what it is in code, or notyet: why)`); else later.push(s); continue; }
    for (const t of tokens) {
      const why = tokenProblem(t, ref);
      if (why) problems.push(`${s.id} ${s.area} › ${s.name}: ${why}`);
      else if (t.startsWith('notyet:')) notYet.push({ ...s, why: t.slice(7).trim() });
      else named.add(t);
    }
  }
  const unnamed = AREAS.flatMap(a => a.fields.filter(f => !f.unused && !named.has(f.id)).map(f => ({ id: f.id, tab: a.tab, label: f.label })));
  for (const f of unnamed) problems.push(`${f.tab} › ${f.label} (${f.id}): no spec row names it. Add one (tools/spec_link.py adds it).`);
  const specMath = csvRows(mathCsv).filter(r => /^M[0-9][0-9A-Z]$/.test(r[0])).map(r => ({ id: r[0], name: r[1] }));
  for (const e of MATH) { const s = specMath.find(x => x.id === e.id); if (!s) problems.push(`${e.id} ${e.name}: not on the spec's Math tab`); else if (norm(s.name) !== norm(e.name)) problems.push(`${e.id}: spec "${s.name}", code "${e.name}" (use the spec's name)`); }
  for (const s of specMath) if (!MATH.some(e => e.id === s.id)) problems.push(`${s.id} ${s.name}: on the spec's Math tab, not in js/registry/math.js`);
  return { problems, notYet, later, rows: spec.length, named: named.size };
}

export function driftMarkdown(d) {
  const L = ['# Spec drift', '', 'Written by `node --test` (test/coverage.test.js). Every spec row names what it is in code (the SLAM id column on the Fields tab), and every field is on a spec row. Any drift fails the run.', ''];
  L.push(`## Drift (${d.problems.length})`, '', ...(d.problems.length ? d.problems.map(p => `- ${p}`) : ['None.']), '');
  L.push(`## In the spec, not built yet (${d.notYet.length})`, '', 'Known gaps, named on their spec rows (notyet: why).', '', ...d.notYet.map(s => `- ${s.id} ${s.area} › ${s.name}: ${s.why}`), '');
  L.push(`## In the spec as Later or Parked (${d.later.length})`, '', ...d.later.map(s => `- ${s.id} ${s.area} › ${s.name} (${s.scope})`), '');
  return `${L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}
