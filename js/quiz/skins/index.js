// SPDX-License-Identifier: AGPL-3.0-only
// The list of quiz skins, in the order they show. To add one: write its file here, add it to this list, then run
// `node tools/game_quiz_build.mjs` (docs/QUIZ-ENGINE.md has the five steps). The Money Chart is the first quiz of the
// page and has its own file (js/quiz.js); it is scored by the same engine.
import { LETTERS } from './letters.js';
import { ADDRESS } from './address.js';
import { HOUSES } from './houses.js';
import { AVATARS } from './avatars.js';
import { SHEET } from './sheet.js';
import { PYRAMID } from './pyramid.js';
import { MOUNTAIN } from './mountain.js';
import { STARS } from './stars.js';
import { SINS } from './sins.js';

export const SKINS = [LETTERS, ADDRESS, HOUSES, AVATARS, SHEET, PYRAMID, MOUNTAIN, STARS, SINS];
export const skinOf = id => SKINS.find(s => s.id === id) ?? null;
