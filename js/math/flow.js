// SPDX-License-Identifier: AGPL-3.0-only
// M79: freed money follows the FOO (batch 12, RULES.freedFollowsFoo; Eli, Nov 5: "freed money follows the FOO, but
// actually measure the next best opportunity"). While heavy debt is carried the surplus pays it first (the debt rule,
// M34). Once it is gone, the surplus and the freed heavy payments fill big e (the Rule of 5 target, M43, minus the cash
// already in the layers), then Tax-Free Growth (the Roth IRA and the HSA to this year's limits), then the rest is
// invested. Low-rate debt keeps its own payment. Pure: no DOM; js/math/metrics.js runs it and every screen reads it.
//
// The next best opportunity (M80): at each FOO step the money is going to, the step's yearly value is compared with
// the best alternative (the employer match not yet taken, a debt above what the step earns, a 0% promo ending). An
// alternative that beats the step by RULES.nextBestMin or more a year becomes a one-line note on the step. The order
// never changes.
import { RULES } from '../registry/assumptions.js';
import { matchFromTiers } from './portfolio.js';
import { addMonths, ymOf, monthName } from '../month.js';

const sum = (list, f = v => v) => list.reduce((s, v) => s + (f(v) ?? 0), 0);
const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
const money = v => `$${Math.round(v).toLocaleString('en-US')}`;

// Tax-Free Growth room this year: the Roth IRA limit and (with an HSA) the HSA limit, minus what is in already.
export function taxFreeRoom(doc, x, ref, now = new Date()) {
  const recOf = id => (doc.records || []).find(r => r.id === id);
  const job = x.income.find(i => i.r === x.link.job);
  const n = PAYS[job?.r.values.payFrequency] ?? 26;
  const iraLimit = ref.limits.ira.base;
  const rothRec = x.accounts.filter(a => a.type === 'Roth IRA').map(a => recOf(a.id));
  const rothThisYear = sum(rothRec, r => sum((r?.values.rothLog || []).filter(e => e.taxYear === now.getFullYear()), e => e.amount) || (r?.values.contribution ?? 0) * (r?.values.contributionPer === 'Paycheck' ? 26 : 1));
  const hsaLimit = ref.limits.hsa[x.gates.couple ? 'family' : 'self'];
  const hsaIn = sum(x.accounts.filter(a => a.type === 'HSA').map(a => recOf(a.id)), r => r?.values.contributionsYtd ?? r?.values.contribution ?? 0) + (x.gates.hsa ? sum(x.income, i => (i.r.values.hsaFsa ?? 0) * n) : 0);
  const rothLeft = Math.max(0, iraLimit - rothThisYear), hsaLeft = x.gates.hsa ? Math.max(0, hsaLimit - hsaIn) : 0;
  return { iraLimit, rothThisYear, hsaLimit, hsaIn, hsa: !!x.gates.hsa, rothLeft, hsaLeft, left: rothLeft + hsaLeft };
}

// The flow, in whole months from today. surplus: what the debt rule sends to heavy debt (the surplus less the
// contributions already invested); heavyMonths: when the heavy debt is gone on the one plan (0 when there is none,
// null when the payments never clear it); freed: the heavy payments that free up; bigELeft and taxFreeLeft: dollars.
// Each phase ends at the first whole month its dollars are in (a part month rounds up), like every FOO date.
export function freedFlow({ surplus, heavyMonths = 0, freed = 0, bigELeft = 0, taxFreeLeft = 0 }) {
  if (surplus == null) return null;
  const toDebt = Math.max(0, surplus), monthly = toDebt + Math.max(0, freed || 0);
  const H = heavyMonths;
  const span = left => (!(left > 0.5) ? 0 : monthly > 0 ? Math.ceil(left / monthly - 1e-9) : null);
  const bigE = span(bigELeft), taxFree = span(taxFreeLeft);
  const bigEEnd = H == null || bigE == null ? null : H + bigE;
  const taxFreeEnd = bigEEnd == null || taxFree == null ? null : bigEEnd + taxFree;
  const steps = [
    { id: '3', from: 0, to: H, monthly: toDebt, left: null },
    { id: '4', from: H, to: bigEEnd, monthly, left: Math.max(0, bigELeft || 0) },
    { id: '5', from: bigEEnd, to: taxFreeEnd, monthly, left: Math.max(0, taxFreeLeft || 0) },
    { id: 'rest', from: taxFreeEnd, to: null, monthly, left: null },
  ];
  const bits = [H ? `${money(toDebt)} a month pays heavy debt first (${H} ${H === 1 ? 'month' : 'months'})` : null,
    bigE ? `${money(monthly)} a month${H ? ' (the surplus plus the freed payments)' : ''} fills big e (${bigE} ${bigE === 1 ? 'month' : 'months'})` : null,
    taxFree ? `Tax-Free Growth takes ${money(taxFreeLeft)} of Roth IRA and HSA room (${taxFree} ${taxFree === 1 ? 'month' : 'months'})` : null].filter(Boolean);
  return { id: 'M79', monthly, toDebt, freed: Math.max(0, freed || 0), heavyMonths: H, bigEMonths: bigE, taxFreeMonths: taxFree, bigEEnd, taxFreeEnd,
    waitMonths: bigEEnd, // the months before the surplus is invested (heavy debt, then big e); Tax-Free Growth is invested
    steps, text: bits.length ? `${bits.join(', ')}, then the rest is invested.` : 'The surplus is invested.' };
}

// The match not yet taken, as a yearly alternative: the contribution still needed for the full match and the match it brings.
export function matchRoom(x) {
  const job = x.income.find(i => i.r === x.link.job);
  const gross = job?.gross ?? null, n = PAYS[job?.r.values.payFrequency] ?? 26;
  const tiers = x.link.incomeTiers || [];
  if (!gross || !tiers.length) return null;
  const pctIn = x.link.incomePct ?? (x.link.incomePerPaycheck != null ? x.link.incomePerPaycheck * n / gross : 0);
  const now = matchFromTiers({ contributionPct: pctIn ?? 0, tiers, gross });
  if (!now?.leftOnTable) return null;
  const full = matchFromTiers({ contributionPct: now.fullMatchAt, tiers, gross });
  const contribution = Math.max(0, (now.fullMatchAt - (pctIn ?? 0)) * gross), gain = Math.max(0, full.dollars - now.dollars);
  return contribution > 0 && gain > 0 ? { contribution, gain, rate: gain / contribution, fullMatchAt: now.fullMatchAt } : null;
}

// M80: the next best opportunity for one step. step: { id, rate, monthly, target, from } (from: the month the step starts) (rate: what a dollar earns there a
// year: the debt's APR on heavy debt, the expected return on Tax-Free Growth and investing, 0 on big e, which is a
// safety step); options: { debts, match, realReturn, now }. Returns the best alternative that beats the step by at
// least RULES.nextBestMin a year, or null.
export function nextBest(step, { debts = [], match = null, realReturn = 0, now = new Date() } = {}) {
  const yearly = Math.max(0, step.monthly ?? 0) * 12;
  if (!yearly) return null;
  const safety = step.id === '4';
  const alts = [];
  if (match) { const c = Math.min(match.contribution, yearly), gain = match.gain * c / match.contribution; alts.push({ kind: 'match', name: 'the full employer match', dollars: c, value: gain + c * realReturn }); }
  if (!safety) {
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    for (const d of debts) {
      if (!(d.balance > 0) || d.apr == null || d.inFull || d.id === step.target) continue;
      if (step.from && d.planMonths != null && d.planMonths <= step.from) continue; // paid off on the plan before this step starts
      const promo = d.promoEnd && String(d.promoEnd).slice(0, 7) >= ym ? String(d.promoEnd).slice(0, 7) : null;
      const c = Math.min(d.balance, yearly);
      alts.push({ kind: promo ? 'promo' : 'debt', id: d.id, name: promo ? `${d.name} before its promo rate ends (${promo})` : `paying ${d.name} (${(d.apr * 100).toFixed(1)}%)`, dollars: c, value: c * d.apr, promo });
    }
  }
  const best = alts.map(a => ({ ...a, by: a.value - a.dollars * (step.rate ?? 0) })).sort((a, b) => b.by - a.by)[0];
  if (!best || best.by < RULES.nextBestMin) return null;
  return { id: 'M80', ...best, text: `Worth a look: ${best.name} beats this by ${money(best.by)} a year.`,
    how: `${money(best.dollars)} a year there earns about ${money(best.value)}${best.kind === 'match' ? ' (the match plus the return on the contribution)' : ' of interest not paid'}; on this step the same dollars ${safety ? 'are your safety cushion and earn nothing counted here' : `earn about ${money(best.dollars * (step.rate ?? 0))}`}.` };
}

// The flow in words, with months (Plan › Goals, the FI card, Report, the debt-free card): "pays heavy debt until
// Mar 2027, fills big e until Jan 2028, then is invested".
export function flowWords(flow, now = new Date(), { invested = true } = {}) {
  if (!flow) return null;
  const at = n => monthName(addMonths(ymOf(now), n), 'short');
  const bits = [flow.heavyMonths ? `pays heavy debt until ${at(flow.heavyMonths)}` : flow.heavyMonths == null ? 'pays heavy debt until it is gone' : null,
    flow.bigEMonths ? `fills big e until ${flow.bigEEnd == null ? 'it is full' : at(flow.bigEEnd)}` : null].filter(Boolean);
  const tail = invested ? 'is invested (Roth IRA and HSA first)' : 'stays in checking';
  return bits.length ? `${bits.join(', ')}, then ${tail}` : tail;
}
