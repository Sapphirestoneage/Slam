// SPDX-License-Identifier: AGPL-3.0-only
// The public page /coaching/ (run CC-1, item 22): what the file holds, read as text. The browser walk is
// tools/e2e/coaching_walk.cjs. The chart's math is js/math/coachfee.js (test/coachfee.test.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const page = read('coaching/index.html'), offerSrc = read('game/data/offer.js');
const words = page.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ');

test('the offer is one file of settings, and each one is empty until the owner fills it', () => {
  const box = {};
  vm.runInNewContext(`${offerSrc}\nthis.O = COACH_OFFER;`, box);
  assert.deepEqual(Object.keys(box.O).sort(), ['bookUrl', 'cohort', 'fee', 'guarantee', 'plan', 'what']);
  for (const [k, v] of Object.entries(box.O)) assert.equal(v, null, `${k} is a placeholder: no value is made up in code`);
  assert.match(page, /<script src="\.\.\/game\/data\/offer\.js"><\/script>/, 'the page reads the same file as the game');
});

test('the page has each part of the brief, and its math comes from js/math', () => {
  for (const id of ['what', 'price', 'plan', 'guarantee', 'chart', 'cohort', 'bookwrap']) assert.match(page, new RegExp(`id="${id}"`), id);
  assert.match(page, /import \{ coFlatVsAum \} from '\.\.\/js\/math\/coachfee\.js'/);
  assert.match(page, /Show the math/); assert.match(page, /Assumptions: /); assert.match(page, /An example with round numbers, not a promise/);
  assert.doesNotMatch(page.match(/<script type="module">[\s\S]*<\/script>/)[0], /Math\.pow|\*\* ?\d|1\.07|0\.01\b|0\.07/, 'no rate and no growth math is typed on the page');
  assert.equal((page.match(/class="(btn )?primary"/g) || []).length, 2, 'one filled button: the link, or the same button off while there is no link');
});

test('a placeholder is marked, and no price, guarantee or link is made up', () => {
  for (const what of ['what the offer is', 'the price', 'the payment-plan line', 'the guarantee, in Eli\\\'s words', 'the founding-cohort note', 'the booking link']) assert.ok(page.includes(`ph('${what}')`) || page.includes(`'${what}')`), what);
  assert.doesNotMatch(words, /\$\s?\d{3,}/, 'no dollar amount is written in the words of the page');
  assert.doesNotMatch(words, /money[- ]back|refund|risk[- ]free/i, 'the guarantee has no made-up text');
  assert.doesNotMatch(page, /href="https?:\/\//, 'no outside link is written in the file');
  assert.match(page, /<meta name="robots" content="noindex">/, 'a draft stays out of search engines');
});

test('the words: no promise of a result, no named firm, no verdict word, no em dash', () => {
  assert.doesNotMatch(words, /\b(you will (earn|make|save)|guaranteed returns?|get rich|double your|beat the market)\b/i);
  assert.doesNotMatch(page, /\b(Vanguard|Fidelity|Schwab|Betterment|Wealthfront|Edward Jones|Merrill|Morgan Stanley|Empower|Facet)\b/i, 'a 1% AUM advisor is generic');
  assert.doesNotMatch(words, /\b(mistake|failed|behind|off track)\b/i);
  assert.doesNotMatch(page, /—/);
  assert.doesNotMatch(page, /#(f00|ff0000|e5484d|d32f2f)\b|\bred\b/i, 'no red');
});
