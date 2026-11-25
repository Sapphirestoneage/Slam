// The Job of Existing (js/math/jobs.js, run JOE-1): the six jobs from answers, the admin hours (Guess, Close,
// Exact), a task's minutes a month, Running it and Living it, "1% better". Worked by hand. The game runs a copy of
// the same file (game/core/jobs.js); the last tests hold the two together.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import * as JB from '../js/math/jobs.js';

const { JOB_IDS, JOB_DEFAULT, JOB_PRESETS, jobRoles, jobTop, jobState, jobAdmin, jobTaskMonthly, jobSaveWords, jobTaskMath, jobIsOff, jobLiving, jobHoursWords, jobBetterWords } = JB;

test('six jobs; the presets are 0, 15 min, 1 hr, 3 hrs, 5+ hrs', () => {
  assert.deepEqual(JOB_IDS, ['cfo', 'accountant', 'planner', 'insurance', 'health', 'deals']);
  assert.deepEqual(JOB_PRESETS.map(p => p[0]), [0, 15, 60, 180, 300]);
  assert.equal(Object.values(JOB_DEFAULT).reduce((t, v) => t + v, 0), 180);
});

test('which jobs: everyone holds six, each answer that counts adds 1', () => {
  const r = jobRoles({ home: 'Owning', debtKinds: ['Car loan'], deps: 'Kids', prot: { life: 'Yes' } });
  assert.equal(r.length, 6);
  assert.equal(r[0].id, 'insurance');
  assert.equal(r[0].score, 5);
  assert.deepEqual(r[0].why, ['Home insurance to keep current', 'A car to insure', 'People rely on your income', 'You have policies to renew']);
  assert.ok(r.every(x => x.score === 1 + x.why.length));
  assert.equal(jobTop({}, 3).map(x => x.id).join(), 'cfo,accountant,planner');
  assert.equal(jobRoles({ deps: 'Pets' }).find(x => x.id === 'insurance').why.length, 0, 'a pet is not a person who relies on your income');
});

test('admin hours: defaults are a Guess; taps are Close; all Exact is Exact', () => {
  assert.equal(jobState([]), 'Guess');
  assert.equal(jobState([2, 3]), 'Close');
  assert.equal(jobState([3, 3]), 'Exact');
  assert.equal(jobState([3, 1]), 'Guess');
  const a = jobAdmin({ cfo: { v: 180, cf: 2 }, deals: { v: 0, cf: 3 } });
  assert.equal(a.total, 180 + 60 + 15 + 15 + 15 + 0);
  assert.equal(a.st, 'Guess');
  assert.equal(a.rows.find(r => r.id === 'deals').given, true);
  const all = Object.fromEntries(JOB_IDS.map(id => [id, { v: 60, cf: 3 }]));
  assert.deepEqual([jobAdmin(all).total, jobAdmin(all).st], [360, 'Exact']);
});

test('a task: minutes each time x times a year / 12; saves you ~X min/month; the math', () => {
  const t = { per: 45, times: 2 };
  assert.equal(jobTaskMonthly(t), 7.5);
  assert.equal(jobSaveWords(7.5), 'saves you ~8 min/month');
  assert.equal(jobSaveWords(0.1), 'saves you ~1 min/month');
  assert.equal(jobSaveWords(0), null);
  assert.equal(jobTaskMonthly({ per: 5 }), 0);
  assert.match(jobTaskMath(t)[0], /45 min each time, 2 times a year = 90 min a year/);
  assert.match(jobTaskMath(t)[1], /90 min a year ÷ 12 months = about 8 min a month/);
  assert.ok(jobIsOff('auto') && jobIsOff('hand') && jobIsOff('drop') && !jobIsOff('do') && !jobIsOff(undefined));
});

test('Running it and Living it, by hand', () => {
  const admin = jobAdmin({ cfo: { v: 60, cf: 2 }, health: { v: 15, cf: 2 } });
  const tasks = [
    { id: 'a', role: 'cfo', per: 10, times: 26 }, // 21.67 a month
    { id: 'b', role: 'cfo', per: 20, times: 12 }, // 20
    { id: 'c', role: 'cfo', per: 120, times: 1 }, // 10
    { id: 'd', role: 'health', per: 90, times: 4 }, // 30, capped at the job's 15
  ];
  const L = jobLiving(admin, tasks, { a: 'auto', b: 'hand', c: 'do', d: 'drop' });
  assert.equal(L.before, 180);
  assert.ok(Math.abs(L.byRole.cfo.saved - (260 / 12 + 20)) < 1e-9);
  assert.equal(L.byRole.health.saved, 15);
  assert.deepEqual([L.byRole.cfo.n, L.byRole.cfo.m], [2, 3]);
  assert.ok(Math.abs(L.living - (260 / 12 + 35)) < 1e-9);
  assert.ok(Math.abs(L.running - (180 - 260 / 12 - 35)) < 1e-9);
  assert.equal(L.better, Math.round(((260 / 12 + 35) / 180) * 100));
  const tiny = jobLiving(jobAdmin({ cfo: { v: 300, cf: 2 } }), [{ id: 'x', role: 'cfo', per: 1, times: 6 }], { x: 'drop' });
  assert.equal(tiny.better, 1, 'half a minute of 405 still shows 1% better, never 0%');
  assert.match(jobBetterWords(tiny), /^1% better/);
  assert.equal(jobLiving(admin, tasks, {}).better, 0);
  assert.match(jobBetterWords(jobLiving(admin, tasks, {})), /starts at 1% better/);
  assert.equal(jobLiving(jobAdmin({}), [{ id: 'z', role: 'nobody', per: 9, times: 9 }], { z: 'drop' }).living, 0, 'a task of no job counts nowhere');
});

test('hours as words', () => {
  assert.deepEqual([0, 14.6, 60, 90, 300].map(jobHoursWords), ['0 min', '15 min', '1 hr', '1.5 hrs', '5 hrs']);
});

// ---------- one function for the web app and the game ----------
const src = readFileSync(new URL('../js/math/jobs.js', import.meta.url), 'utf8');
const copy = readFileSync(new URL('../game/core/jobs.js', import.meta.url), 'utf8');
test('the game\'s copy is made from this file and is current (node tools/game_jobs_build.mjs)', () => {
  const hash = createHash('sha256').update(src).digest('hex').slice(0, 16);
  assert.match(copy, new RegExp(`SOURCE-HASH  ${hash}`), 'js/math/jobs.js changed: run node tools/game_jobs_build.mjs, then the game steps (prettier, stamp, code map)');
});
test('the game\'s copy gives the same answers', () => {
  const box = {}; vm.createContext(box);
  vm.runInContext(`${copy}\n;this.out = { ${Object.keys(JB).join(', ')} };`, box);
  for (const k of Object.keys(JB)) assert.ok(k in box.out, `${k} is in the game copy`);
  const j = v => JSON.parse(JSON.stringify(v));
  const a = { home: 'Renting', live: ['Roommates'], deps: 'Kids', accts: ['HSA', 'Checking', 'Savings'], invest: 'Sometimes' };
  assert.deepEqual(j(box.out.jobRoles(a)), j(jobRoles(a)));
  const ad = { cfo: { v: 180, cf: 3 } }, T = [{ id: 'a', role: 'cfo', per: 10, times: 26 }];
  assert.deepEqual(j(box.out.jobLiving(box.out.jobAdmin(ad), T, { a: 'auto' })), j(jobLiving(jobAdmin(ad), T, { a: 'auto' })));
});
