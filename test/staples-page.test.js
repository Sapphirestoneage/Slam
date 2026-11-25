// The Staples page (staples.html, the gallery of every shared piece) drew nothing: its spending list was asked for
// with no month, and the title of that list names the month. The page stopped at "Loading the example numbers."
// and, with nothing drawn, scrolled sideways on a phone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ymOf, monthName } from '../js/month.js';

test('staples page: the spending list gets a month, so its title can name it', () => {
  const src = readFileSync(new URL('../js/pages/staples-page.js', import.meta.url), 'utf8');
  assert.match(src, /spendingList\(ref, \{ ym: ymOf\(\) \}\)/);
  assert.ok(!/spendingList\(ref\)/.test(src), 'no call with no month');
  assert.match(monthName(ymOf(new Date(Date.UTC(2026, 10, 25)))), /November 2026/);
  assert.throws(() => monthName(null), 'a missing month is still an error, not a made-up month');
});
