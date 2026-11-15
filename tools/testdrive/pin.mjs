// SPDX-License-Identifier: AGPL-3.0-only
// Signs off the Test Drive scripts: plays every made-up person (js/testdrive.js) and writes what the app says at the
// two checkpoints (the next step, and the age work becomes optional) to fixtures/testdrive-pins.json. Run it only
// after looking at a change in the math and agreeing with it: node tools/testdrive/pin.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { PERSONAS, pinsOf } from '../../js/testdrive.js';
const read = f => JSON.parse(readFileSync(new URL(`../../data/${f}`, import.meta.url)));
const ref = read('reference-2026.json'), priors = read('priors-2026.json'), flags = read('flags.json');
const out = Object.fromEntries(PERSONAS.map(p => [p.id, pinsOf(p, ref, priors, { flags })]));
writeFileSync(new URL('../../fixtures/testdrive-pins.json', import.meta.url), `${JSON.stringify(out, null, 1)}\n`);
console.log(`Signed off ${PERSONAS.length} scripts.`);
for (const [id, v] of Object.entries(out)) console.log(id, JSON.stringify(v));
