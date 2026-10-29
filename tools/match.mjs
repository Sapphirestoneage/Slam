// Prints the Demo client match table (and the private Test client's when present).
// node tools/match.mjs [--private]
import { readFileSync, existsSync } from 'node:fs';
import { compare } from '../js/math/match.js';

const ref = JSON.parse(readFileSync(new URL('../data/reference-2026.json', import.meta.url)));
const show = v => (typeof v === 'number' ? (Math.abs(v) < 1 ? v.toFixed(4) : v.toFixed(2)) : String(v));
function table(name, path) {
  if (!existsSync(path)) { console.log(`${name}: skipped, ${path.pathname.split('/').pop()} is missing.`); return true; }
  const rows = compare(JSON.parse(readFileSync(path)), ref);
  console.log(`\n${name}\n| Output | Expected | App | Match |\n|---|---|---|---|`);
  for (const r of rows) console.log(`| ${r.label} | ${show(r.expected)} | ${show(r.got)} | ${r.pass ? 'yes' : 'NO'} |`);
  return rows.every(r => r.pass);
}
let ok = table('Demo client', new URL('../fixtures/demo.json', import.meta.url));
if (process.argv.includes('--private')) ok = table('Test client (private)', new URL('../fixtures/eli.local.json', import.meta.url)) && ok;
process.exitCode = ok ? 0 : 1;
