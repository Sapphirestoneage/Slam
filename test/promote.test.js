// SPDX-License-Identifier: AGPL-3.0-only
// tools/promote.sh: the decision logic, with no network. release is a branch the script builds: the files of main,
// plus game-next/ (the test build: game/ of main, staged before the suites run). Each test makes a small repository in a temporary
// folder, with a local bare repository as its remote, and runs a copy of the real script there. The small
// repository has its own `node --test` file and its own `npm run test:game`, so the two suites are real and fast.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'tools', 'promote.sh');
const has = cmd => spawnSync(cmd, ['--version'], { encoding: 'utf8' }).status === 0;
const CAN = has('git') && has('bash') && has('npm');
const skip = CAN ? false : 'git, bash and npm are needed for this test';

// The environment of each command: a fixed author, no test context of the outer run, no settings of the machine.
const ENV = { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' };
delete ENV.NODE_TEST_CONTEXT;

const PASS = "import { test } from 'node:test';\ntest('fine', () => {});\n";
const FAIL = "import { test } from 'node:test';\nimport assert from 'node:assert';\ntest('a real defect', () => assert.equal(1, 2));\n";

function sandbox(t) {
  const root = mkdtempSync(join(tmpdir(), 'slam-promote-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const remote = join(root, 'remote.git'), work = join(root, 'work');
  const git = (dir, ...args) => {
    const r = spawnSync('git', args, { cwd: dir, env: ENV, encoding: 'utf8' });
    assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
    return r.stdout.trim();
  };
  mkdirSync(remote); mkdirSync(join(work, 'tools'), { recursive: true }); mkdirSync(join(work, 'test')); mkdirSync(join(work, 'game'));
  git(remote, 'init', '--quiet', '--bare', '--initial-branch=main');
  git(work, 'init', '--quiet', '--initial-branch=main');
  git(work, 'remote', 'add', 'origin', remote);
  copyFileSync(SCRIPT, join(work, 'tools', 'promote.sh'));
  writeFileSync(join(work, 'package.json'), JSON.stringify({ name: 'small', private: true, type: 'module', scripts: { 'test:game': 'node game/check.cjs' } }));
  writeFileSync(join(work, 'test', 'small.test.js'), PASS);
  writeFileSync(join(work, 'game', 'check.cjs'), 'process.exit(0);\n');
  const commit = msg => { git(work, 'add', '-A'); git(work, 'commit', '--quiet', '-m', msg); git(work, 'push', '--quiet', 'origin', 'HEAD:main'); return git(work, 'rev-parse', 'HEAD'); };
  const first = commit('first');
  const promote = (...args) => {
    const r = spawnSync('bash', [join(work, 'tools', 'promote.sh'), ...args], { cwd: work, env: ENV, encoding: 'utf8' });
    const lines = r.stdout.trim().split('\n');
    return { code: r.status, last: lines[lines.length - 1], out: r.stdout + r.stderr };
  };
  const release = () => { const r = spawnSync('git', ['rev-parse', '--verify', '--quiet', 'refs/heads/release'], { cwd: remote, env: ENV, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };
  // What the public site holds: one file of release (null when it is not there), and the names of all its files.
  const on = path => { const r = spawnSync('git', ['show', `refs/heads/release:${path}`], { cwd: remote, env: ENV, encoding: 'utf8' }); return r.status === 0 ? r.stdout : null; };
  const files = ref => git(remote, 'ls-tree', '-r', '--name-only', ref).split('\n').sort();
  const has = (old, tip) => spawnSync('git', ['merge-base', '--is-ancestor', old, tip], { cwd: remote, env: ENV }).status === 0;
  return { root, remote, work, git, commit, promote, release, first, on, files, has };
}

const OK_GAME = 'process.exit(0);\n';
test('promote: the first run makes release with the files of main and the test build; a second run says it is already there', { skip }, t => {
  const s = sandbox(t);
  assert.equal(s.release(), null);
  const a = s.promote();
  assert.equal(a.code, 0, a.out);
  assert.equal(a.last, `release is now ${s.first}`);
  assert.deepEqual(s.files('release'), s.files('main').concat(['game-next/check.cjs']).sort());
  assert.equal(s.on('game/check.cjs'), OK_GAME);
  assert.equal(s.on('game-next/check.cjs'), OK_GAME);
  assert.ok(s.has(s.first, 'release'));
  const tip = s.release();
  const b = s.promote();
  assert.equal(b.code, 0, b.out);
  assert.equal(b.last, `release is already at main (${s.first}): nothing to promote`);
  assert.equal(s.release(), tip);
});

test('promote: new commits on main that pass put the files of that exact commit on release', { skip }, t => {
  const s = sandbox(t);
  s.promote();
  const before = s.release();
  writeFileSync(join(s.work, 'note.txt'), 'one\n'); s.commit('second');
  writeFileSync(join(s.work, 'note.txt'), 'two\n'); const third = s.commit('third');
  const r = s.promote();
  assert.equal(r.code, 0, r.out);
  assert.equal(r.last, `release is now ${third}`);
  assert.equal(s.on('note.txt'), 'two\n');
  assert.ok(s.has(third, 'release'));
  assert.ok(s.has(before, 'release')); // on top of the old release: nothing was forced
});

test('promote: a failure of node --test on main stops it; the public files stay as they were', { skip }, t => {
  const s = sandbox(t);
  s.promote();
  writeFileSync(join(s.work, 'test', 'small.test.js'), FAIL); const bad = s.commit('a defect');
  const r = s.promote();
  assert.notEqual(r.code, 0);
  assert.match(r.last, /^not promoted: node --test did not pass/);
  assert.ok(r.last.includes(bad));
  assert.equal(s.on('test/small.test.js'), PASS);
});

test('promote: a failure of npm run test:game stops it; /game/ stays as it was and the test build is at /game-next/', { skip }, t => {
  const s = sandbox(t);
  s.promote();
  const broken = 'console.log("1 failed"); process.exit(1);\n';
  writeFileSync(join(s.work, 'game', 'check.cjs'), broken); s.commit('a game defect');
  const r = s.promote();
  assert.notEqual(r.code, 0);
  assert.match(r.last, /^not promoted: npm run test:game did not pass/);
  assert.equal(s.on('game/check.cjs'), OK_GAME);
  assert.equal(s.on('game-next/check.cjs'), broken);
  // The repair on main, then a promote: both folders hold the repaired game.
  writeFileSync(join(s.work, 'game', 'check.cjs'), 'process.exit(0); // repaired\n'); const fixed = s.commit('repaired');
  const again = s.promote();
  assert.equal(again.last, `release is now ${fixed}`, again.out);
  assert.equal(s.on('game/check.cjs'), s.on('game-next/check.cjs'));
});

test('promote --next: the test build only. /game/ and the rest stay; a promote after it publishes', { skip }, t => {
  const s = sandbox(t);
  s.promote();
  writeFileSync(join(s.work, 'game', 'check.cjs'), 'process.exit(0); // new\n');
  writeFileSync(join(s.work, 'note.txt'), 'new\n'); const next = s.commit('a new build');
  const r = s.promote('--next');
  assert.equal(r.code, 0, r.out);
  assert.equal(r.last, `game-next is now ${next}: the test build only, /game/ is as it was`);
  assert.equal(s.on('game/check.cjs'), OK_GAME);
  assert.equal(s.on('note.txt'), null);
  assert.equal(s.on('game-next/check.cjs'), 'process.exit(0); // new\n');
  const p = s.promote();
  assert.equal(p.last, `release is now ${next}`, p.out);
  assert.equal(s.on('game/check.cjs'), 'process.exit(0); // new\n');
  assert.equal(s.on('note.txt'), 'new\n');
});

test('promote: a commit made on release directly is never forced away; its files give way to the files of main', { skip }, t => {
  const s = sandbox(t);
  s.promote();
  const tip = s.release();
  // Somebody commits on release directly. Main moves on too.
  s.git(s.work, 'fetch', '--quiet', 'origin', 'release');
  s.git(s.work, 'checkout', '--quiet', '-b', 'side', tip);
  writeFileSync(join(s.work, 'hotfix.txt'), 'x\n'); s.git(s.work, 'add', '-A'); s.git(s.work, 'commit', '--quiet', '-m', 'on release only');
  s.git(s.work, 'push', '--quiet', 'origin', 'HEAD:release');
  const onRelease = s.git(s.work, 'rev-parse', 'HEAD');
  s.git(s.work, 'checkout', '--quiet', 'main');
  writeFileSync(join(s.work, 'note.txt'), 'main moves\n'); const moved = s.commit('main moves');
  const r = s.promote();
  assert.equal(r.code, 0, r.out);
  assert.equal(r.last, `release is now ${moved}`);
  assert.ok(s.has(onRelease, 'release')); // still in the history
  assert.equal(s.on('hotfix.txt'), null); // the public site is main, nothing else
});

test('promote: it tests the commit on the remote, not the folder it is started from, and leaves that folder alone', { skip }, t => {
  const s = sandbox(t);
  // Work that is not committed: a test that would fail, and an edit of a tracked file.
  writeFileSync(join(s.work, 'test', 'draft.test.js'), FAIL);
  writeFileSync(join(s.work, 'game', 'check.cjs'), 'process.exit(1);\n');
  const before = s.git(s.work, 'status', '--porcelain');
  const r = s.promote();
  assert.equal(r.code, 0, r.out);
  assert.equal(r.last, `release is now ${s.first}`);
  assert.equal(s.on('game/check.cjs'), OK_GAME);
  assert.equal(s.on('test/draft.test.js'), null);
  assert.equal(s.git(s.work, 'status', '--porcelain'), before);
  assert.equal(readFileSync(join(s.work, 'game', 'check.cjs'), 'utf8'), 'process.exit(1);\n');
  assert.equal(s.git(s.work, 'rev-parse', '--abbrev-ref', 'HEAD'), 'main');
  assert.equal(s.git(s.work, 'worktree', 'list').split('\n').length, 1); // the temporary checkout is gone
});

test('promote: a remote that cannot be reached, or one with no main, says so and changes nothing', { skip }, t => {
  const s = sandbox(t);
  const gone = s.promote(join(s.root, 'no-such-remote.git'));
  assert.notEqual(gone.code, 0);
  assert.match(gone.last, /^not promoted: the remote .* cannot be reached/);
  const empty = join(s.root, 'empty.git'); mkdirSync(empty); s.git(empty, 'init', '--quiet', '--bare');
  const none = s.promote(empty);
  assert.notEqual(none.code, 0);
  assert.match(none.last, /^not promoted: the remote .* has no branch main/);
  assert.equal(existsSync(join(empty, 'refs', 'heads')) ? readdirSync(join(empty, 'refs', 'heads')).length : 0, 0);
});

test('promote: the script never forces, merges or rewrites, and never touches a working folder (its text has no such command)', () => {
  const code = readFileSync(SCRIPT, 'utf8').split('\n').filter(l => !l.trim().startsWith('#')).join('\n');
  for (const word of ['--force-with-lease', 'push -f', 'push --force', '+refs/', 'git merge ', 'rebase', 'reset --hard', 'git commit ', 'git checkout', 'git add '])
    assert.ok(!code.includes(word), `tools/promote.sh must not use "${word}"`);
  assert.match(code, /git push --quiet "\$REMOTE" "\$c:refs\/heads\/\$DST"/);
  assert.equal(code.split('git push').length - 1, 1, 'one push command, and it is the plain one');
});
