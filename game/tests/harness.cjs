/* ============================================================================
   SLAM the Game: tests/harness.cjs (the test harness)
   PURPOSE     Load all game scripts in one Node.js process, then run test files in the same scope.
   USAGE       node game/tests/harness.cjs game/tests/fork-theory.js [more files]
   INPUT       ../index.html gives the script list and the load order.
   OUTPUT      One line for each failed check, then "<n> ok, <m> failed".
   DEPENDS ON  All game scripts. No package from npm.
   HOW         The game uses classic browser scripts with one global scope.
               The harness makes a small stand-in for the browser (document, localStorage).
               It runs each script in the load order, one at a time, in the global scope.
               The browser does the same. Thus a function from a later file does not exist
               while an earlier file runs. Then the harness runs the test files in the same scope.
   HELPERS     X(action, v, k, extra)  Send a tap to ACT[action].
               app()                   The HTML of the main screen.
               ov()                    The HTML of the open sheet.
               chk(name, ok, info)     Record one check.
               clean(html)             False if the HTML shows undefined, NaN or null.
               junk(html)              The text near the first such defect.
               skip(why)               Say that this file cannot run here. The runner shows the reason.
               GAME_DIR                The path of the folder game/.
   PRIVATE     The add-on content is not in this repository. To test it, set the environment
               variable SLAM_PACKS_BOOT to a private file that exports a function. The function
               returns the add-on start-up code. A test that needs add-ons examines
               "typeof PKSET" and does nothing when it is absent.
   ========================================================================= */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const GAME_DIR = process.env.GD || path.join(__dirname, "..") + path.sep;

// A minimal browser stand-in. Each selector gets one element with innerHTML.
const els = {};
const makeEl = () => ({ innerHTML: "", querySelector: () => null });
global.els = els;
global.document = {
  querySelector: s => (els[s] = els[s] || makeEl()),
  addEventListener: () => {},
  getElementById: () => null,
};
global.window = global;
global.scrollTo = () => {};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.navigator = { clipboard: { writeText: () => Promise.resolve() } };
global.require = require; // A private test can read files.

// The script list comes from index.html, so the tests always use the real load order.
const order = fs
  .readFileSync(GAME_DIR + "index.html", "utf8")
  .match(/<script src="([a-z0-9\/]+\.js)(\?v=[0-9a-f]*)?"/g)
  .map(s => s.match(/"([^"?]+)/)[1]);

// Run one text as a classic script. Its top-level names stay in the global scope for the next script.
const run = (code, name) => vm.runInThisContext(code, { filename: name });

for (const f of order) run(fs.readFileSync(GAME_DIR + f, "utf8"), GAME_DIR + f);
if (process.env.SLAM_PACKS_BOOT) run(require(process.env.SLAM_PACKS_BOOT)(fs), "add-on start-up code");

// The helpers for the test files. They are text, because they must run in the global scope, after the game scripts.
global.GAME_DIR = GAME_DIR;
run(
  `
/* X(action, v, k, extra): send one tap to ACT[action]. v and k are the data-v and data-k values of the button. */
const X = (a, v, k, x) => ACT[a]({ dataset: Object.assign({ a, v, k }, x || {}) });

/* app(): the HTML of the main screen. ov(): the HTML of the open sheet. */
const app = () => els['#app'].innerHTML,
  ov = () => els['#ov'].innerHTML;

/* chk(name, cond, info): record one check. A failed check prints its name and the info. */
let fails = 0,
  oks = 0;
const chk = (name, cond, info) => {
  if (!cond) {
    console.log('FAIL', name, info === undefined ? '' : info);
    fails++;
  } else oks++;
};

/* skip(why): say that this file cannot run here. The runner shows the reason. */
const skip = why => console.log('SKIP ' + why);

/* clean(html): false if the HTML shows undefined, NaN, null or [object. The values of data-v are ignored. */
const clean = h => !/undefined|NaN|\\bnull\\b|\\[object/.test(h.replace(/data-v="[^"]*"/g, ''));

/* junk(html): the 40 characters before and after the first such defect. */
const junk = h => (h.replace(/data-v="[^"]*"/g, '').match(/.{40}(undefined|NaN|\\bnull\\b|\\[object).{40}/) || [''])[0];

/* Switches in screens/ux.js. HOME_MORE and ME_MORE: show all parts of the Home tab and the Me tab.
   UX_NOSAMPLE = false: the sample game shows with no welcome screen in front of it.
   BIG: no game script in this repository reads it. */
BIG = true;
HOME_MORE = true;
ME_MORE = true;
UX_NOSAMPLE = false;

/* crawl(): an older helper for private test files. It does nothing. */
const crawl = () => 0;
`,
  "test helpers"
);
for (const f of process.argv.slice(2)) run(fs.readFileSync(f, "utf8"), f);
run(`console.log(oks+' ok, '+fails+' failed');`, "totals");
