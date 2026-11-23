// Rebuild the retirement engine of SLAM the Game from Zack Williams' RetirementPlanner (MIT license).
//
// USAGE   node tools/retire_engine_build.mjs                 Clone the repository into a temp folder, then build.
//         node tools/retire_engine_build.mjs <path>          Build from a clone that you already have.
// OUTPUT  game/vendor/retire-engine.js         One plain script (IIFE). It sets the global RetireEngine.
//         game/vendor/retire-worker.js         A Web Worker that loads the bundle and runs one simulation.
//         game/vendor/RETIRE-ENGINE-LICENSE.txt The MIT license text, with the copyright line.
//         game/data/retire-*.json              The tax data of the engine, changed from YAML to JSON.
// RULES   Only src/engine/ (and the types and defaults of src/models/ that it imports) go into the bundle.
//         The React app does not. The bundle reads its tax data from the JSON files in game/data/.
//         After a rebuild: node tools/game_stamp.cjs, python3 tools/game_codemap.py, npm run test:game.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const REPO = 'https://github.com/boatbomber/RetirementPlanner';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME = path.join(ROOT, 'game');
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'slam-retire-'));

// 1. The source: a clone that the caller gives, or a fresh shallow clone outside the repository.
let src = process.argv[2];
if (!src) {
  src = path.join(WORK, 'RetirementPlanner');
  execFileSync('git', ['clone', '-q', '--depth', '1', REPO, src], { stdio: 'inherit' });
}
src = path.resolve(src);
const commit = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const engine = path.join(src, 'src', 'engine');

// 2. The build tools, in the temp folder only (nothing is added to package.json).
const tools = path.join(WORK, 'tools');
fs.mkdirSync(tools);
fs.writeFileSync(path.join(tools, 'package.json'), '{"private":true}');
execFileSync('npm', ['install', '--silent', '--no-audit', '--no-fund', 'esbuild@0.25.10', 'zod@4.4.1', 'yaml@2.8.1'], {
  cwd: tools,
  stdio: 'inherit',
});
const need = createRequire(path.join(tools, 'package.json'));
const YAML = need('yaml');
const esbuild = need('esbuild');

// 3. The tax data: each YAML file of src/engine/data becomes game/data/retire-<name>.json.
const dataOut = {};
const dataInfo = {};
for (const f of fs.readdirSync(path.join(engine, 'data')).filter((f) => f.endsWith('.yaml'))) {
  const json = path.join(GAME, 'data', 'retire-' + f.replace(/\.yaml$/, '.json'));
  const obj = YAML.parse(fs.readFileSync(path.join(engine, 'data', f), 'utf8'));
  fs.writeFileSync(json, JSON.stringify(obj, null, 2) + '\n');
  dataOut[f] = json;
  dataInfo[f.replace(/\.yaml$/, '')] = { source: obj.source_url || obj.source || '', updated: String(obj.last_updated || '') };
}

// 4. The entry point: the parts of the engine that the adapter (game/features/retire.js) uses.
const entry = path.join(WORK, 'entry.ts');
fs.writeFileSync(
  entry,
  `export { runSimulation, runIterations } from '@/engine/simulation';
export { solve, applyTargetSpend, setTotalContribution } from '@/engine/solver';
export { estimateEarliestRetirementAge } from '@/engine/retirement-age-search';
export { blanchettSpendingMultiplier } from '@/engine/spending-smile';
export { computeAnnualSSBenefit, claimingAdjustment } from '@/engine/social-security';
export { interpolateGlidePath } from '@/engine/glide-path';
export { computeFederalTax, computeStandardDeduction } from '@/engine/tax';
export { computeAnnualSpending } from '@/engine/withdrawals';
export * as data from '@/engine/data';
export * as defaults from '@/models/defaults';
export const source = { repo: ${JSON.stringify(REPO)}, commit: ${JSON.stringify(commit)} };
export const dataInfo = ${JSON.stringify(dataInfo)};
`
);

// 5. The bundle. "@/" points at src/. A YAML import reads the JSON file of step 3.
const license = fs.readFileSync(path.join(src, 'LICENSE'), 'utf8').trim();
const banner =
  '/* Retirement engine by Zack Williams (RetirementPlanner, ' + REPO + ', commit ' + commit + ').\n' +
  '   Only src/engine/ is bundled here, for SLAM the Game. Rebuild: node tools/retire_engine_build.mjs\n\n' +
  license.replace(/\*\//g, '* /') + '\n*/';
await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  globalName: 'RetireEngine',
  platform: 'browser',
  target: 'es2019',
  outfile: path.join(GAME, 'vendor', 'retire-engine.js'),
  banner: { js: banner },
  legalComments: 'none',
  minify: true,
  logLevel: 'warning',
  nodePaths: [path.join(tools, 'node_modules')],
  plugins: [
    {
      name: 'slam-paths',
      setup(b) {
        b.onResolve({ filter: /^@\// }, (a) => {
          const base = path.join(src, 'src', a.path.slice(2));
          for (const c of [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) if (fs.existsSync(c)) return { path: c };
          return { path: base };
        });
        b.onResolve({ filter: /\.yaml$/ }, (a) => ({ path: dataOut[path.basename(a.path)] }));
      },
    },
  ],
  loader: { '.json': 'json' },
});

// 6. The worker and the license text.
fs.writeFileSync(
  path.join(GAME, 'vendor', 'retire-worker.js'),
  `/* SLAM the Game: vendor/retire-worker.js. Made by tools/retire_engine_build.mjs. Do not edit.
   A Web Worker. It loads the retirement engine of Zack Williams (MIT license), runs one simulation for each
   message { id, kind: "run", scenario }, or the solver for { id, kind: "solve", scenario, input, opts }, and posts back
   { id, result } or { id, error }. features/retire.js sends the messages. */
importScripts("retire-engine.js");
/* A trial of the solver: the same scenario with the iterations and the seed of the trial. */
function slamTrial(scenario, o) {
  var x = JSON.parse(JSON.stringify(scenario));
  x.simulationConfig.iterations = o.iterations;
  x.simulationConfig.seed = o.seed;
  return Promise.resolve(RetireEngine.runSimulation(x));
}
self.onmessage = function (e) {
  var m = e.data || {};
  var done = function (r) {
    self.postMessage({ id: m.id, result: r });
  };
  var fail = function (err) {
    self.postMessage({ id: m.id, error: String((err && err.message) || err) });
  };
  try {
    if (m.kind === "solve") RetireEngine.solve(m.scenario, m.input, slamTrial, m.opts || {}).then(done, fail);
    else done(RetireEngine.runSimulation(m.scenario));
  } catch (err) {
    fail(err);
  }
};
`
);
fs.writeFileSync(path.join(GAME, 'vendor', 'RETIRE-ENGINE-LICENSE.txt'), license + '\n\nSource: ' + REPO + ' (commit ' + commit + ')\n');
console.log('retire-engine.js built from commit ' + commit + ' (' + Math.round(fs.statSync(path.join(GAME, 'vendor', 'retire-engine.js')).size / 1024) + ' KB)');
fs.rmSync(WORK, { recursive: true, force: true });
