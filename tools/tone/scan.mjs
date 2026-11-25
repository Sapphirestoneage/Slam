// SPDX-License-Identifier: AGPL-3.0-only
// The tone scan. Eli's rule for the whole app: "Recalculating", not mistakes. The app never says mistake, failed,
// behind or off track about the person. This file finds those words in the copy a person can read: the text inside
// string literals of the scripts, the text of the HTML pages, and the string values of the data files.
// Code is not copy: identifiers, object keys, comments and a string that is one bare key ('behind') are skipped.
// test/tone.test.js runs it and fails when a word comes back. Usage: node tools/tone/scan.mjs (lists what it finds).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const BLAME = /\b(mistak(?:e|es|en|enly)|failed|behind|off[ -]track)\b/gi;

// Where the Mistake audit lives. It is opt-in, and it is the one place that uses the word.
export const AUDIT_FILES = ['js/ui/audit-ui.js', 'game/features/audit.js'];
// Words that are not about the person. Each entry: a pattern, and why it may stay.
export const ALLOWED = [
  [/Math Behind Early Retirement/g, 'the title of an article by Mr. Money Mustache'],
  [/\b(numbers?|math|idea|story|reason|thinking|formula|skill|habit|risk|chain|ways|cushion|stands?|sits?) behind\b/gi, 'what stands behind a thing (the formula behind a number, a cushion behind you), not a person behind on a plan'],
  [/\b(leav(?:e|ing)|left)(?: (?!you\b)[\w']+){0,6} behind\b/gi, 'what is left to others, or money left on the table (leave a book behind, free money left behind)'],
  [/'?(Behind on saving or retirement|Feeling behind)'?/g, 'two answers stored in files saved before Nov 25 2026; js/whynow.js reads them as the new words and never shows them (the test checks the chips themselves)'],
  [/waiting behind\b/gi, 'an era that waits for the era before it'],
  [/\bfailed (save|saves|to load|to send|to read)\b/gi, 'a technical event (a save that did not reach the server), in admin text'],
  [/\b(save|sign-in|request|upload|download|import|export|check|connection) failed\b/gi, 'a technical event, not the person'],
  [/Failed to fetch/g, 'the browser\'s own message when the network is down, in a test stand-in of the database'],
  [/Mistake audit/g, 'the name of the opt-in audit, on the button that opens it'],
];
// Folders and files that hold no copy a person reads in the app.
const SKIP = [/^game\/vendor\//, /^game\/tests\//, /^game\/unused\//, /^vendor\//, /^node_modules\//, /^js\/registry\//, /^data\/sources\//, /^data\/fields\.json$/, /^fixtures\//, /^tools\//, /^test\//, /^docs\//, /^spec\//, /^audits\//, /^supabase\//];
const walk = dir => readdirSync(join(ROOT, dir)).flatMap(f => { const p = dir ? `${dir}/${f}` : f; if (SKIP.some(r => r.test(`${p}/`) || r.test(p)) || f.startsWith('.')) return []; return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p]; });
export const filesToScan = () => walk('').filter(f => /\.(js|cjs|mjs|html|json)$/.test(f) && !/^package(-lock)?\.json$/.test(f) && !AUDIT_FILES.includes(f));

// The string literals of one script, with the line each starts on. Comments and code are left out. Inside a
// template literal, the parts in ${ } are code.
export function literalsOf(src) {
  const out = []; let i = 0, line = 1; const n = src.length;
  const stack = []; // open template literals: { depth of braces when the ${ started }
  let brace = 0, lastSig = '';
  const readQuoted = q => { let s = ''; const at = line; i++; while (i < n && src[i] !== q) { if (src[i] === '\\') { s += src[i + 1] === 'n' ? ' ' : src[i + 1] ?? ''; i += 2; continue; } if (src[i] === '\n') line++; s += src[i++]; } i++; out.push({ text: s, line: at }); };
  const readTemplate = () => { // from the character after ` or after the } that ends a ${ }
    let s = ''; const at = line;
    while (i < n) {
      const ch = src[i];
      if (ch === '\\') { s += src[i + 1] === 'n' ? ' ' : src[i + 1] ?? ''; i += 2; continue; }
      if (ch === '`') { i++; out.push({ text: s, line: at }); return; }
      if (ch === '$' && src[i + 1] === '{') { i += 2; out.push({ text: s, line: at }); stack.push(brace); brace++; return; }
      if (ch === '\n') line++;
      s += ch; i++;
    }
    out.push({ text: s, line: at });
  };
  while (i < n) {
    const ch = src[i], nx = src[i + 1];
    if (ch === '\n') { line++; i++; continue; }
    if (ch === '/' && nx === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (ch === '/' && nx === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
    if (ch === '/' && /[(,=:[!&|?{};\n]|^$|return/.test(lastSig)) { // a regular expression, not a division
      i++; let cls = false; while (i < n && (src[i] !== '/' || cls) && src[i] !== '\n') { if (src[i] === '\\') i++; else if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; i++; } i++; lastSig = 'x'; continue;
    }
    if (ch === '\'' || ch === '"') { readQuoted(ch); lastSig = 'x'; continue; }
    if (ch === '`') { i++; readTemplate(); lastSig = 'x'; continue; }
    if (ch === '{') { brace++; i++; lastSig = '{'; continue; }
    if (ch === '}') { brace--; i++; if (stack.length && stack[stack.length - 1] === brace) { stack.pop(); readTemplate(); lastSig = 'x'; } else lastSig = '}'; continue; }
    if (/\s/.test(ch)) { i++; continue; }
    if (/[A-Za-z_$]/.test(ch)) { let w = ''; while (i < n && /[\w$]/.test(src[i])) w += src[i++]; lastSig = w === 'return' || w === 'typeof' || w === 'case' ? 'return' : 'x'; continue; }
    lastSig = ch; i++;
  }
  return out;
}
// The text of an HTML page: what is between the tags, and the inline scripts' literals.
export function textsOfHtml(src) {
  const out = []; const lineOf = idx => src.slice(0, idx).split('\n').length;
  const noScript = src.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (m, body, idx) => { for (const l of literalsOf(body)) out.push({ text: l.text, line: lineOf(idx) + l.line - 1 }); return m.replace(/[^\n]/g, ' '); })
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, m => m.replace(/[^\n]/g, ' ')).replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
  for (const m of noScript.matchAll(/>([^<]+)</g)) if (m[1].trim()) out.push({ text: m[1], line: lineOf(m.index) });
  for (const m of noScript.matchAll(/\b(?:title|alt|placeholder|aria-label|content)="([^"]*)"/g)) out.push({ text: m[1], line: lineOf(m.index) });
  return out;
}
// The string values of a data file (keys are code).
export function textsOfJson(src) {
  const out = []; let data; try { data = JSON.parse(src); } catch { return out; }
  const go = v => { if (typeof v === 'string') out.push({ text: v, line: 0 }); else if (Array.isArray(v)) v.forEach(go); else if (v && typeof v === 'object') Object.values(v).forEach(go); };
  go(data); return out;
}
const isKey = t => /^[a-z][A-Za-z0-9_]*$/.test(t) || /^[\w.-]+\.(js|json|html|css)$/.test(t); // one bare word in lower or camel case is a key, not a sentence
// The blame words left in one text after the allowed phrases are taken out.
export function blameIn(text) {
  if (isKey(text.trim())) return [];
  let t = text; for (const [re] of ALLOWED) t = t.replace(re, ' ');
  return [...t.matchAll(BLAME)].map(m => m[0]);
}
export function scan(files = filesToScan()) {
  const hits = [];
  for (const f of files) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    const texts = f.endsWith('.html') ? textsOfHtml(src) : f.endsWith('.json') ? textsOfJson(src) : literalsOf(src);
    for (const t of texts) { const words = blameIn(t.text); if (words.length) hits.push({ file: f, line: t.line, words, text: t.text.replace(/\s+/g, ' ').trim() }); }
  }
  return hits;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const hits = scan();
  for (const h of hits) { const at = h.text.search(BLAME); console.log(`${h.file}:${h.line}: [${h.words.join(', ')}] ...${h.text.slice(Math.max(0, at - 70), at + 90)}...`); }
  console.log(`${hits.length} ${hits.length === 1 ? 'string' : 'strings'} with a blame word.`);
  process.exit(hits.length ? 1 : 0);
}
