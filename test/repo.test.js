// Phase 0 checks: the spec is there, private data is not.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const SPEC_TABS = ['Start here', 'Roadmap', 'Feature list', 'Visualizations', 'Build phases', 'QA checklist',
  'Look and feel', 'Words and states', 'Navigation', 'DMMT check', 'Screens', 'Mockup', 'Staples', 'Rules',
  'Rules summary', 'Math', 'Reference data', 'Fields', 'Feature details', 'Tags and layers', 'Demo client',
  'Open questions'];

test('spec/csv has one file per spreadsheet tab', () => {
  for (const tab of SPEC_TABS) assert.ok(existsSync(join(root, 'spec/csv', `${tab}.csv`)), tab);
});

test('.gitignore keeps private fixtures out', () => {
  const ignore = readFileSync(join(root, '.gitignore'), 'utf8');
  assert.match(ignore, /^fixtures\/\*\.local\.json$/m);
  assert.match(ignore, /^fixtures\/\*private\*$/m);
});

test('no private file is tracked by git', () => {
  let tracked;
  try { tracked = execSync('git ls-files', { cwd: root }).toString().split('\n'); }
  catch { return; } // not a git checkout
  const bad = tracked.filter(f => /\.local\.json$|private/i.test(f));
  assert.deepEqual(bad, []);
});

// Our own files only: the spec CSVs are the owner's words and stay as written.
function ownFiles(dir = root, out = []) {
  for (const name of readdirSync(dir)) {
    if (['.git', 'node_modules', 'spec', 'shots'].includes(name) || name.includes('private') || name.endsWith('.local.json')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) ownFiles(p, out);
    else if (/\.(js|html|css|md|json|py)$/.test(name)) out.push(p);
  }
  return out;
}

test('no em dashes anywhere', () => {
  const hits = ownFiles().filter(p => readFileSync(p, 'utf8').includes(String.fromCharCode(0x2014))).map(p => p.slice(root.length));
  assert.deepEqual(hits, []);
});
