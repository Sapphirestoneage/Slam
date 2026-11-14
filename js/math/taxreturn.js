// SPDX-License-Identifier: AGPL-3.0-only
// What a tax return says in plain numbers. lines: the amounts read off a Form 1040 (js/import/tax1040.js).
import { bracketRoom } from './lifetime.js';
// effective: total tax over adjusted gross income. bracket: where taxable income sits against the brackets in ref
// (this year's, so a guide for an older return). perMonth: a refund or a balance owed, spread over twelve months.
// laterMoney: taxed-later money that came out (IRA, pensions). null wherever the return did not give the line.
export function returnPicture(lines, filingStatus, ref) {
  const L = lines || {}, has = k => typeof L[k] === 'number';
  return {
    effective: has('totalTax') && has('agi') && L.agi > 0 ? L.totalTax / L.agi : null,
    bracket: has('taxable') ? { taxable: L.taxable, ...bracketRoom(L.taxable, filingStatus, ref) } : null,
    refund: has('refund') && L.refund > 0 ? { amount: L.refund, perMonth: L.refund / 12 } : null,
    owe: has('owe') && L.owe > 0 ? { amount: L.owe, perMonth: L.owe / 12 } : null,
    laterMoney: has('ira') || has('pensions') ? (L.ira ?? 0) + (L.pensions ?? 0) : null,
    kept: has('agi') && has('totalTax') ? L.agi - L.totalTax : null,
  };
}
