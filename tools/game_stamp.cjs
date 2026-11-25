#!/usr/bin/env node
/* ============================================================================
   tools/game_stamp.cjs
   PURPOSE   Put a version stamp on each local script address in game/index.html, game/admin.html, game/coach.html, game/privacy.html and game/session.html.
   USAGE     node tools/game_stamp.cjs            Write the stamps.
             node tools/game_stamp.cjs --check    Change nothing. Exit 1 when a stamp is old or absent.
   INPUT     The two pages, and the script files that they load.
   OUTPUT    Each local script address ends with "?v=" and 8 characters, for example core/engine.js?v=1a2b3c4d.
   WHY       GitHub Pages lets a browser keep a file for 10 minutes. The stamp is made from the content of
             the file. When the content changes, the address changes, and the browser gets the new file.
   RULE      Run this tool after each change of a game script. "npm run test:game" runs the check
             and fails when a stamp is old.
   LIMIT     The browser can keep index.html itself for 10 minutes. After that time, each changed script
             has a new address.
   ========================================================================= */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const GAME = path.join(__dirname, '..', 'game');
const PAGES = ['index.html', 'admin.html', 'coach.html', 'privacy.html', 'session.html'];
const TAG = /(<script src=")([a-z0-9/-]+\.js)(?:\?v=[0-9a-f]*)?(")/g;

/* stampOf(file): 8 characters from the SHA-1 of the file content. The line ends are made the same first,
   thus a computer that stores CRLF line ends gets the same stamp. */
function stampOf(rel) {
  const text = fs.readFileSync(path.join(GAME, rel), 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha1').update(text).digest('hex').slice(0, 8);
}
/* stamped(html): the page text with the correct stamp on each local script address. */
function stamped(html) {
  return html.replace(TAG, (m, a, rel, z) => a + rel + '?v=' + stampOf(rel) + z);
}
/* check(): the list of pages with an old stamp. An empty list means that all stamps are correct. */
function check() {
  return PAGES.filter(p => { const h = fs.readFileSync(path.join(GAME, p), 'utf8'); return stamped(h) !== h; });
}
module.exports = { check, stamped };

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const old = check();
    if (old.length) { console.log('Version stamps: OLD in ' + old.join(', ') + '. Run: node tools/game_stamp.cjs'); process.exit(1); }
    console.log('Version stamps: correct.');
  } else {
    for (const p of PAGES) {
      const f = path.join(GAME, p), h = fs.readFileSync(f, 'utf8'), n = stamped(h);
      if (n !== h) fs.writeFileSync(f, n);
      console.log(p + ': ' + (n.match(TAG) || []).length + ' script addresses, ' + (n !== h ? 'stamps written' : 'no change'));
    }
  }
}
