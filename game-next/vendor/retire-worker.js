/* SLAM the Game: vendor/retire-worker.js. Made by tools/retire_engine_build.mjs. Do not edit.
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
