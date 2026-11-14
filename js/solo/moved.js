// SPDX-License-Identifier: AGPL-3.0-only
// Words for what moved between two marks (js/pro.js movedOf). The numbers come from the model; this only says them.
import { money } from './shell.js';
const n = (v, one, many) => `${v} ${v === 1 ? one : many}`;
export const movedWords = lines => lines.map(l => { const up = l.by > 0, a = Math.abs(l.by);
  return { owed: up ? `Debt is up ${money(a)}` : `Debt is down ${money(a)}`, debtAt: up ? `Debt free ${n(a, 'month', 'months')} later` : `Debt free ${n(a, 'month', 'months')} sooner`,
    cash: up ? `${money(a)} more on hand` : `${money(a)} less on hand`, runway: up ? `${n(a, 'more month', 'more months')} covered if the pay stopped` : `${n(a, 'fewer month', 'fewer months')} covered if the pay stopped`,
    done: up ? `${n(a, 'more step', 'more steps')} done` : null }[l.id]; }).filter(Boolean);
