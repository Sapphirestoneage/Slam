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

// A W-2 in plain numbers: the share of wages withheld for federal tax, what went into the plan at work, and state tax.
export function w2Picture(lines) {
  const L = lines || {}, has = k => typeof L[k] === 'number', w = has('wages') ? L.wages : null;
  return { wages: w, withheldShare: w > 0 && has('fedTax') ? L.fedTax / w : null, saved: (L.k401 ?? 0) + (L.roth401 ?? 0) || null, savedShare: has('medWages') && L.medWages > 0 && ((L.k401 ?? 0) + (L.roth401 ?? 0)) > 0 ? ((L.k401 ?? 0) + (L.roth401 ?? 0)) / L.medWages : null,
    hsa: has('hsa') ? L.hsa : null, stateTax: has('stateTax') || has('localTax') ? (L.stateTax ?? 0) + (L.localTax ?? 0) : null };
}
// A pay stub over a year: perYear is how many of these pays there are (52, 26, 24 or 12). Money a month is the pay
// times perYear over twelve. Shares are of gross pay.
export function stubPicture(lines, perYear) {
  const L = lines || {}, g = typeof L.gross === 'number' && L.gross > 0 ? L.gross : null, n = perYear > 0 ? perYear : null, month = v => (typeof v === 'number' && n ? v * n / 12 : null);
  const taxes = (L.fedTax ?? 0) + (L.ssTax ?? 0) + (L.medTax ?? 0) + (L.stateTax ?? 0);
  return { grossMonth: month(L.gross), netMonth: month(L.net), grossYear: g && n ? g * n : null, taxShare: g && taxes > 0 ? taxes / g : null, savedShare: g && L.k401 > 0 ? L.k401 / g : null, keptShare: g && typeof L.net === 'number' ? L.net / g : null,
    other: g && typeof L.net === 'number' ? Math.max(0, g - L.net - taxes - (L.k401 ?? 0) - (L.health ?? 0) - (L.hsa ?? 0)) : null };
}
// A state return: state (and city) tax together as a share of that state's income, and a refund or balance a month.
export function statePicture(lines) {
  const L = lines || {}, has = k => typeof L[k] === 'number', tax = has('total') ? L.total : has('stateTax') ? L.stateTax + (L.cityTax ?? 0) : null;
  return { tax, effective: tax != null && has('agi') && L.agi > 0 ? tax / L.agi : null, city: has('cityTax') && L.cityTax > 0 ? L.cityTax : null,
    refund: has('refund') && L.refund > 0 ? { amount: L.refund, perMonth: L.refund / 12 } : null, owe: has('owe') && L.owe > 0 ? { amount: L.owe, perMonth: L.owe / 12 } : null };
}
// Where the papers and the plan disagree. Each gap: { id, paper, plan, by (paper minus plan), share (of the larger) }.
// Only gaps wider than the tolerance are returned: 10% for a yearly figure against the plan's estimate, 5% for
// take-home (the number the whole plan stands on), 1% for two papers that should agree to the dollar.
export function paperGaps({ ret = null, w2 = null, stub = null, perYear = null } = {}, { planGross = null, takeHome = null } = {}) {
  const out = [], add = (id, paper, plan, tol) => { if (typeof paper !== 'number' || typeof plan !== 'number' || !(Math.max(Math.abs(paper), Math.abs(plan)) > 0)) return; const share = Math.abs(paper - plan) / Math.max(Math.abs(paper), Math.abs(plan)); if (share > tol) out.push({ id, paper, plan, by: paper - plan, share }); };
  const S = stub ? stubPicture(stub, perYear) : null;
  add('takeHome', S?.netMonth ?? null, takeHome, 0.05);
  // once a pay stub and the plan's take-home agree, the plan is standing on today's pay: last year's wages no longer argue with it
  const settled = typeof S?.netMonth === 'number' && typeof takeHome === 'number' && !out.some(g => g.id === 'takeHome');
  if (!settled) add('wagesPlan', ret?.wages ?? w2?.wages ?? null, planGross, 0.10);
  add('stubYear', S?.grossYear ?? null, ret?.wages ?? w2?.wages ?? null, 0.10);
  add('w2Return', w2?.wages ?? null, ret?.wages ?? null, 0.01);
  return out;
}
