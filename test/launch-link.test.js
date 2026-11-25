// The link for the slide (the front door of SLAM the Game) is written in three places: docs/LAUNCH-LINK.md,
// DOOR_LINK in game/account/door.js, and LINK in tools/qr_slam.py (which makes docs/qr-slam.png). They must be the
// same, and the picture must be a PNG of at least 1000 pixels. The read-back of the picture is in the tool
// (python3 tools/qr_slam.py --check): it needs OpenCV, which this test does not ask for.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = f => readFileSync(new URL('../' + f, import.meta.url));
const doc = read('docs/LAUNCH-LINK.md').toString();
const door = read('game/account/door.js').toString();
const tool = read('tools/qr_slam.py').toString();

test('the link for the slide is the same in the doc, in the game and in the QR tool', () => {
  const inDoc = (doc.match(/\*\*The link:\*\* (\S+)/) || [])[1];
  const inGame = (door.match(/const DOOR_LINK = "([^"]+)"/) || [])[1];
  const inTool = (tool.match(/^LINK = "([^"]+)"/m) || [])[1];
  assert.ok(inDoc && inGame && inTool, 'each place has the link');
  assert.equal(inGame, inDoc, 'game/account/door.js');
  assert.equal(inTool, inDoc, 'tools/qr_slam.py');
  assert.match(inDoc, /^https:\/\/sapphirestoneage\.github\.io\/Slam\/game\/$/, 'the public address of the game');
  assert.ok(read('docs/RELEASE.md').toString().includes(inDoc), 'docs/RELEASE.md names the same public link');
});

test('docs/qr-slam.png is a square PNG, at least 1000 pixels wide, made by the tool', () => {
  const png = read('docs/qr-slam.png');
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'a PNG file');
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  assert.ok(w >= 1000, `width ${w}`);
  assert.equal(w, h, 'square');
  assert.match(tool, /QUIET = 4\b/, 'the white edge is 4 modules');
  assert.match(tool, /fill_color="black", back_color="white"/, 'dark on white');
  assert.match(tool, /docs", "qr-slam\.png"/, 'the tool writes this file');
});

test('the landing screen uses the shared blank FIRE sheet button, and has no second copy of the link', () => {
  assert.doesNotMatch(door, /docs\.google\.com/, 'the link is in game/features/firelink.js only');
  assert.match(door, /fireBlankButton\(\{ button: "door-sheet", line: "door-tiny" \}\)/);
});
