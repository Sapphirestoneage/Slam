// Writes supabase/admin/002_seed.sql from game/registry/modules.json and game/registry/fields.json.
// Run: node scripts/registry-to-sql.mjs
// The output is idempotent: insert ... on conflict do update. A second run changes the content columns only and
// keeps what the admin set (enabled, sort_order, placement_tab, placement_area, admin_note).
// If the SQL is larger than 2 MB, it is split into 002_seed_1.sql, 002_seed_2.sql, ... (run them in order).
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = join(ROOT, 'game/registry');
const OUT = join(ROOT, 'supabase/admin');
const LIMIT = 2 * 1024 * 1024;
const BATCH = 50;

const M = JSON.parse(readFileSync(join(REG, 'modules.json'), 'utf8'));
const F = JSON.parse(readFileSync(join(REG, 'fields.json'), 'utf8'));

// ---- SQL literals
const str = v => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const num = v => (v === null || v === undefined ? 'null' : String(Number(v)));
const json = v => (v === null || v === undefined ? 'null' : `${str(JSON.stringify(v))}::jsonb`);

// One upsert statement per batch of rows. keep = columns that a second run must not change.
const KEEP = ['sort_order', 'enabled', 'placement_tab', 'placement_area', 'admin_note'];
function upserts(table, cols, key, rows) {
  const out = [];
  const upd = cols.filter(c => !key.includes(c) && !KEEP.includes(c));
  const q = c => (c === 'when' ? '"when"' : c);
  for (let i = 0; i < rows.length; i += BATCH) {
    const vals = rows.slice(i, i + BATCH).map(r => `  (${r.join(', ')})`).join(',\n');
    out.push(
      `insert into public.${table} (${cols.map(q).join(', ')}) values\n${vals}\n` +
        `on conflict (${key.join(', ')}) do update set\n  ` +
        (upd.length ? upd.map(c => `${q(c)} = excluded.${q(c)}`).join(', ') : 'updated_at = now()') +
        ';'
    );
  }
  return out;
}

const fieldModule = new Map();
for (const m of M.modules) for (const s of m.flow) for (const id of s.field_ids) fieldModule.set(id, m.id);

// ---- rows
const modules = M.modules.map(m => [
  str(m.id), str(m.name), str(m.purpose), str(m.status), json(m.evidence), json(m.who), str(m.addon_gate),
  json(m.screen_ids), json(m.entry_points), json(m.files), num(m.field_count),
  num(m.sort_order), 'true', str(m.placement.tab), str(m.placement.area),
]);
const steps = M.modules.flatMap(m =>
  m.flow.map(s => [
    str(`${m.id}:${s.step}`), str(m.id), num(s.step), str(s.screen_id), str(s.does), json(s.field_ids),
    num(s.step * 10), 'true', str(m.placement.tab), str(m.placement.area),
  ])
);
const features = M.modules.flatMap(m =>
  m.features.map((f, i) => [
    str(`${m.id}:${i + 1}`), str(m.id), str(f.name), str(f.status), json(f.field_ids),
    num((i + 1) * 10), 'true', str(m.placement.tab), str(m.placement.area),
  ])
);
const parseSource = s => {
  const m = /^(.*?):(\d+(?:-\d+)?)$/.exec(s || '');
  return m ? { file: m[1], lines: m[2], raw: s } : { file: s, lines: null, raw: s };
};
const fields = F.fields.map((f, i) => [
  str(f.id), str(fieldModule.get(f.id) ?? null), str(f.label), str(f.what), str(f.io), str(f.status),
  str(f.confidence ?? null), str(f.why), str(f.help ?? null), str(f.where.subtab ?? null),
  json(f.facts ?? []), json(f.who ?? []), json(f.options), json(f.when), json(f.how), json(parseSource(f.source)),
  json(f.missing_behavior ?? null), json(f.depends_on ?? []), json(f.feeds_into ?? []), str(f.note ?? null),
  num((i + 1) * 10), 'true', str(f.where.tab), str(f.where.area),
]);

const fieldIds = new Set(F.fields.map(f => f.id));
const screenIds = new Set(F.screens.map(s => s.id));
const moduleIds = new Set(M.modules.map(m => m.id));
const typeOf = id => (fieldIds.has(id) ? 'field' : screenIds.has(id) ? 'screen' : moduleIds.has(id) ? 'module' : null);
const linkSet = new Map();
const unknown = new Set();
const addLink = (ft, fid, tid, kind) => {
  const tt = ft === 'module' ? 'module' : typeOf(tid);
  if (!tt) return unknown.add(tid);
  const k = [ft, fid, tt, tid, kind].join('|');
  if (!linkSet.has(k)) linkSet.set(k, [ft, fid, tt, tid, kind]);
};
for (const m of M.modules) {
  m.depends_on.forEach(t => addLink('module', m.id, t, 'depends_on'));
  m.feeds_into.forEach(t => addLink('module', m.id, t, 'feeds_into'));
}
for (const f of F.fields) {
  (f.depends_on || []).forEach(t => addLink('field', f.id, t, 'depends_on'));
  (f.feeds_into || []).forEach(t => addLink('field', f.id, t, 'feeds_into'));
}
const links = [...linkSet.values()].map((l, i) => [...l.map(str), num((i + 1) * 10), 'true']);

// ---- statements
const S = [
  ...upserts('reg_modules',
    ['id', 'name', 'purpose', 'status', 'evidence', 'who', 'addon_gate', 'screen_ids', 'entry_points', 'files', 'field_count',
      'sort_order', 'enabled', 'placement_tab', 'placement_area'], ['id'], modules),
  ...upserts('reg_flow_steps',
    ['id', 'module_id', 'step', 'screen_id', 'does', 'field_ids', 'sort_order', 'enabled', 'placement_tab', 'placement_area'], ['id'], steps),
  ...upserts('reg_features',
    ['id', 'module_id', 'name', 'status', 'field_ids', 'sort_order', 'enabled', 'placement_tab', 'placement_area'], ['id'], features),
  ...upserts('reg_fields',
    ['id', 'module_id', 'label', 'what', 'io', 'status', 'confidence', 'why', 'help', 'where_subtab', 'facts', 'who', 'options',
      'when', 'how', 'source', 'missing_behavior', 'depends_on', 'feeds_into', 'note', 'sort_order', 'enabled', 'placement_tab',
      'placement_area'], ['id'], fields),
  ...upserts('reg_links',
    ['from_type', 'from_id', 'to_type', 'to_id', 'kind', 'sort_order', 'enabled'], ['from_type', 'from_id', 'to_type', 'to_id', 'kind'], links),
];

const head = n =>
  `-- SLAM the Game: the rows of the registry tables${n ? ` (part ${n})` : ''}.\n` +
  '-- MADE BY scripts/registry-to-sql.mjs from game/registry/modules.json and fields.json. Do not edit by hand.\n' +
  '-- NOT APPLIED. Run supabase/admin/001_registry.sql first, then this file. Safe to run two times.\n' +
  `-- ${M.modules.length} modules, ${steps.length} flow steps, ${features.length} features, ${fields.length} fields, ${links.length} links.\n\n` +
  'begin;\n\n';

// split into parts under the limit
const parts = [];
let cur = [];
let size = 0;
for (const s of S) {
  if (size + s.length > LIMIT - 4096 && cur.length) {
    parts.push(cur);
    cur = [];
    size = 0;
  }
  cur.push(s);
  size += s.length + 2;
}
if (cur.length) parts.push(cur);

for (const f of readdirSync(OUT)) if (/^002_seed(_\d+)?\.sql$/.test(f)) unlinkSync(join(OUT, f));
const names = [];
parts.forEach((p, i) => {
  const name = parts.length === 1 ? '002_seed.sql' : `002_seed_${i + 1}.sql`;
  writeFileSync(join(OUT, name), head(parts.length === 1 ? 0 : i + 1) + p.join('\n\n') + '\n\ncommit;\n');
  names.push(name);
});
const total = names.reduce((a, n) => a + readFileSync(join(OUT, n)).length, 0);
console.log(`wrote ${names.join(', ')}: ${total} bytes; ${modules.length} modules, ${steps.length} steps, ${features.length} features, ${fields.length} fields, ${links.length} links`);
if (unknown.size) console.log(`links to ${unknown.size} unknown ids were left out: ${[...unknown].slice(0, 20).join(', ')}`);
