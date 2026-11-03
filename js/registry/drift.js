// SPDX-License-Identifier: AGPL-3.0-only
// Spec drift: the registries against spec/csv/Fields.csv and spec/csv/Math.csv. In code but not in the spec, in the
// spec but not in code. test/coverage.test.js writes it to SPEC-DRIFT.md; it warns, it never fails the run.
// A field matches the spec when its label is the spec's field name (case and punctuation aside), or it names the
// spec row with spec: 'F012' in js/registry/fields.js. Words in brackets are left out, and a spec name that starts with
// the label counts (Dependents matches Dependents (count and ages)).
import { AREAS } from './fields.js';
import { MATH } from './math.js';

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

export function specDrift(fieldsCsv, mathCsv) {
  const specFields = fieldsCsv.split(/\r?\n/).filter(l => /^F\d{3},/.test(l)).map(csvCells).map(c => ({ id: c[0], area: c[3], name: c[5], scope: c[15] }));
  const specMath = mathCsv.split(/\r?\n/).filter(l => /^M[0-9][0-9A-Z],/.test(l)).map(csvCells).map(c => ({ id: c[0], name: c[1] }));
  const code = AREAS.flatMap(a => a.fields.filter(f => f.sheet === true && f.where !== 'top').map(f => ({ id: f.id, tab: a.tab, label: f.label, spec: f.spec ?? null })));
  const byName = new Map(specFields.map(s => [norm(s.name), s]));
  const matched = new Set();
  const codeOnly = [];
  for (const f of code) {
    const bare = norm(String(f.label).replace(/\([^)]*\)/g, ''));
    const s = f.spec ? specFields.find(x => x.id === f.spec)
      : byName.get(norm(f.label)) ?? specFields.find(x => !matched.has(x.id) && (norm(String(x.name).replace(/\([^)]*\)/g, '')) === bare || norm(x.name).startsWith(`${bare} `)));
    if (s) matched.add(s.id); else codeOnly.push(f);
  }
  const specOnly = specFields.filter(s => !matched.has(s.id));
  const ids = new Set(MATH.map(e => e.id));
  return {
    fields: { codeOnly, specNow: specOnly.filter(s => s.scope === 'Now'), specLater: specOnly.filter(s => s.scope !== 'Now'), matched: matched.size, total: specFields.length },
    math: { codeOnly: MATH.filter(e => !specMath.some(s => s.id === e.id)), specOnly: specMath.filter(s => !ids.has(s.id)),
      renamed: specMath.filter(s => ids.has(s.id) && norm(MATH.find(e => e.id === s.id).name) !== norm(s.name)).map(s => ({ ...s, code: MATH.find(e => e.id === s.id).name })) },
  };
}

export function driftMarkdown(d) {
  const L = [];
  L.push('# Spec drift', '', 'Written by `node --test` (test/coverage.test.js) from the registries and spec/csv. It warns; it never fails the run.',
    'Clear a line by adding the row to the spec (spec/SLAM Build Spec.xlsx, then `python3 tools/xlsx_to_csv.py`) or by naming the spec row on the field (`spec: \'F012\'` in js/registry/fields.js).', '');
  L.push(`## Fields (${d.fields.matched} of ${d.fields.total} spec fields matched)`, '');
  L.push(`### In code, not in the spec (${d.fields.codeOnly.length})`, '', ...d.fields.codeOnly.map(f => `- ${f.tab} › ${f.label} (\`${f.id}\`)`), '');
  L.push(`### In the spec, not in code (${d.fields.specNow.length})`, '', ...d.fields.specNow.map(s => `- ${s.id} ${s.area} › ${s.name}`), '');
  L.push(`### In the spec as Later or Parked, not in code yet (${d.fields.specLater.length})`, '', ...d.fields.specLater.map(s => `- ${s.id} ${s.area} › ${s.name} (${s.scope})`), '');
  L.push('## Math', '');
  L.push(`### In code, not in the spec (${d.math.codeOnly.length})`, '', ...d.math.codeOnly.map(e => `- ${e.id} ${e.name}`), '');
  L.push(`### In the spec, not in code (${d.math.specOnly.length})`, '', ...d.math.specOnly.map(s => `- ${s.id} ${s.name}`), '');
  L.push(`### Named differently (${d.math.renamed.length})`, '', ...d.math.renamed.map(s => `- ${s.id}: spec "${s.name}", code "${s.code}"`), '');
  return `${L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}
