// The 60-second demo "Find your era" (game/era/, run CC-1, item 7, Nov 27 2026). Two generated things must stay
// current: game/era/gamecopy.js (a word-for-word copy of the range chips and the money words of the game, made by
// tools/game_era_build.mjs) and the QR picture inside game/era/print.html (made by tools/qr_era.py with the
// functions of tools/qr_slam.py). The math of the demo is examined in game/tests/find-your-era-demo.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const at = f => fileURLToPath(new URL('../' + f, import.meta.url));
const read = f => readFileSync(at(f), 'utf8');

test('game/era/gamecopy.js is a current copy of the game (node tools/game_era_build.mjs)', () => {
  const r = spawnSync(process.execPath, [at('tools/game_era_build.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const copy = read('game/era/gamecopy.js');
  for (const [file, name] of [['game/features/couldbe.js', 'const CB_RNG = {'], ['game/features/couldbe.js', 'function cbRows(a) {'], ['game/screens/ui.js', 'const money = n =>']]) {
    assert.ok(read(file).includes(name) && copy.includes(name), `${name} is in ${file} and in the copy`);
  }
  assert.doesNotMatch(read('game/index.html'), /era\/gamecopy\.js/, 'the game does not load the copy');
});

test('the print page of the demo: one letter page, the link in words, the owner line, one QR picture', () => {
  const page = read('game/era/print.html'), tool = read('tools/qr_era.py');
  const link = (tool.match(/^LINK = "([^"]+)"/m) || [])[1];
  assert.equal(link, 'https://play.stresslessaboutmoney.com/game/era/');
  assert.ok(page.includes(link.replace('https://', '')), 'the address is on the page in words');
  assert.match(page, /@page\{size:letter/);
  assert.match(page, /Built by Eli Saperstein, money coach\. 250\+ people coached\./);
  assert.equal((page.match(/<svg /g) || []).length, 1, 'one QR picture, inline, so the page prints with no network');
  assert.doesNotMatch(page, /<img|src="https?:/, 'no picture from outside');
  assert.match(tool, /import qr_slam/, 'the picture comes from the one QR maker of the repository');
  assert.match(read('tools/qr_slam.py'), /^LINK = "https:\/\/[^"]+\/game\/"$/m, 'the link of the game itself is not this one');
});

test('the QR picture in the print page reads back as the exact link (python3 tools/qr_era.py --check)', t => {
  const has = spawnSync('python3', ['-c', 'import qrcode, cv2, numpy'], { encoding: 'utf8' });
  if (has.status !== 0) return t.skip('python3 with qrcode and OpenCV is not on this machine');
  const r = spawnSync('python3', [at('tools/qr_era.py'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /gives the exact link https:\/\/play\.stresslessaboutmoney\.com\/game\/era\/\n/);
});
