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
import { SCRIPTS } from './scripts.js';
import { ENNEAGRAM } from './enneagram.js';
import { FIRE } from './fire.js';
import { SNACK } from './snack.js';
import { TRAITS } from './traits.js';
import { COLLAPSE_SKIN } from './collapse.js';

// A skin with where: 'game' shows only in the game (Quantum collapse: the web app asks it on its own first screen).
export const SKINS = [LETTERS, ADDRESS, HOUSES, AVATARS, SHEET, PYRAMID, MOUNTAIN, STARS, SINS, SCRIPTS, ENNEAGRAM, FIRE, SNACK, TRAITS, COLLAPSE_SKIN];
export const WEB_SKINS = SKINS.filter(s => s.where !== 'game');
export const skinOf = id => SKINS.find(s => s.id === id) ?? null;
