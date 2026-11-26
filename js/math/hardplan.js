// SPDX-License-Identifier: AGPL-3.0-only
// Hard moments on the plan's own engines (run Not built, groups 1 to 5, Part 7; M8H): a roommate moving out, on the
// household split engine (M9N rowShare), the same split the quick roommate calculator uses (qcRoommates). The game
// passes its copy of rowShare (core/trip.js) to the same hmRoommateExit.
import { rowShare } from './household.js';
import { hmRoommateExit } from './hard.js';

export const roommateExit = x => hmRoommateExit(x, rowShare);
