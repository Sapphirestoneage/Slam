// SPDX-License-Identifier: AGPL-3.0-only
// M74: the scorecard. Eleven areas rated Strong, OK or Hole from the data where a clear rule exists (the thresholds
// are in js/registry/scorecard.js), the coach's override where there is one, each hole's payoff (dollars a year,
// hours of work and FI days), its effort and the best-return score (payoff over effort), and the holes ranked: the
// ones before the client's current FOO step first, then by score. Pure: never the DOM.
import { metrics } from './metrics.js';
import { foo } from './foo.js';
import { layersOf } from './layers.js';
import { gatesOf, visible } from '../gates.js';
import { ruleOf5 } from './assets.js';
import { utilization, debtToIncome } from './debt.js';
import { moneyAsTime } from './fi.js';
// The latest Confidence (answer 164; the old money feeling in session.feelings reads as Confidence), read here so the Scorecard never imports the program.
const confidenceLatest = doc => { const own = Object.entries(doc.session?.confidence || {}).map(([k, v]) => [Number(k), v?.Me ?? null]); const old = Object.entries(doc.session?.feelings || {}).map(([k, v]) => [Number(k), v]); const all = [...own, ...old].filter(([, v]) => v != null).sort((a, b) => a[0] - b[0]); return all.length ? all.at(-1)[1] : null; };
import { taxRates } from './income.js';
import { fmt } from './result.js';
import { projection } from '../plan.js';
import { AREAS, RATINGS, THRESHOLDS as T, PAYOFF, FOO_ORDER } from '../registry/scorecard.js';
import { LISTS, RULES } from '../registry/assumptions.js';

const money = v => fmt.money(v), pct = v => fmt.pct(v);
const sum = (list, f) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const rate = (rating, reason) => ({ rating, reason });
const RETIREMENT_TYPES = new Set([...LISTS.pretaxTypes, ...LISTS.rothTypes, 'HSA']);

// The goals on Plan (milestones), each complete when it has a horizon, a tag, an amount and a date (S4).
export function goalsOf(doc, ref, m, now = new Date()) {
  const live = visible(doc.records, gatesOf(doc.profile, doc.client), ref).filter(r => r.kind === 'milestone');
  const list = live.map(r => {
    const p = projection(m, doc, r, now);
    const amount = r.amount ?? p.target ?? null;
    const date = r.values.date ?? p.date ?? null;
    return { id: r.id, name: r.name || r.type, horizon: r.values.horizon ?? null, tag: r.values.tag ?? null, amount, date, complete: !!(r.values.horizon && r.values.tag && amount != null && date) };
  });
  const count = h => list.filter(x => x.complete && x.horizon === h).length;
  return { list, short: count('Short term'), long: count('Long term'), need: T.goals.count };
}

// Everything the rules look at, worked out once.
export function factsOf(doc, ref, { now = new Date(), flags = [] } = {}) {
  const m = metrics(doc, ref, { now }), x = m.inputs;
  const p = doc.profile || {};
  const g = gatesOf(p, doc.client), live = visible(doc.records, g, ref);
  let F = null, L = null;
  try { F = foo(doc, ref, { now, flags }); } catch { F = null; }
  try { L = layersOf(doc, ref, now); } catch { L = null; }
  const littleE = L?.layers.find(l => l.id === 'little-e') ?? null, bigE = L?.layers.filter(l => l.id.startsWith('big-e')) ?? [];
  const step = id => F?.steps.find(s => s.id === id) ?? null;
  const gross = x.grossAnnual == null ? null : x.grossAnnual / 12;
  const heavyTypes = new Set(LISTS.heavyDebt);
  const heavy = x.debts.filter(d => (d.balance ?? 0) > 0 && (heavyTypes.has(d.type) || (d.apr ?? 0) >= RULES.heavyApr));
  const payments = x.debts.some(d => d.payment != null) ? x.debts.reduce((s, d) => s + (d.inFull ? 0 : d.payment ?? 0), 0) : null;
  const cards = live.filter(r => r.kind === 'debt' && r.type === 'Credit card').map(r => ({ balance: r.values.balance, limit: r.values.limit }));
  const util = utilization(cards);
  const coverage = live.filter(r => r.kind === 'coverage');
  return {
    m, x, F, here: F?.here ?? null, gross, heavy, payments,
    debtTotal: sum(x.debts, d => d.balance),
    dti: debtToIncome({ monthlyDebtPayments: payments, grossMonthly: gross }).value,
    util: util.hidden ? null : util.value, score: p.credit?.score ?? null, scorePartner: p.credit?.scorePartner ?? null, credit: p.credit || {}, taxes: p.taxes || {}, incomeFacts: p.incomeFacts || {},
    r5: m.ruleOf5,
    months: m.runwayMonths.value, littleE, bigE, littleFull: !!littleE?.full, bigFull: !L?.needsAge && bigE.length > 0 && bigE.every(l => l.full), bigMonths: L?.months ?? null, needsAge: !!L?.needsAge,
    marginal: x.grossAnnual ? taxRates({ gross: x.grossAnnual, filingStatus: x.filingStatus, place: x.place }, ref).marginal ?? null : null,
    retirementSaving: (m.pretaxSaving ?? 0) + (x.afterTaxSaving ?? 0), // a month
    retirementAccounts: x.accounts.filter(a => RETIREMENT_TYPES.has(a.type)),
    matchOffered: (x.link.incomeTiers || []).length > 0, matchLeft: step('2')?.left ?? 0, // dollars a year
    employed: g.employer && x.income.length > 0, betweenJobs: g.betweenJobs, stability: p.incomeStability ?? null,
    coverage, have: type => coverage.find(r => r.type === type)?.values.have ?? null, dependents: p.dependents ?? null,
    goals: goalsOf(doc, ref, m, now), feeling: confidenceLatest(doc), // answer 164: Confidence rates Mindset (Joy is the local measure, not an input here)
    typicalCardApr: ref.typicalRates['Credit card'], realReturn: x.realReturn,
  };
}

// The rules: a rating and a plain reason from the data, or null when the data cannot say.
const RULE = {
  cashFlow: f => {
    const sr = f.m.savingsRate.value, s = f.m.surplus.value;
    if (sr == null) return null;
    if (s < 0) return rate('Hole', `You spend ${money(-s)} a month more than comes in.`);
    if (sr >= T.cashFlow.strong) return rate('Strong', `You save ${pct(sr)} of what comes in, past the ${pct(T.cashFlow.strong)} line.`);
    if (sr >= T.cashFlow.ok) return rate('OK', `You save ${pct(sr)} of what comes in; ${pct(T.cashFlow.strong)} is the strong line.`);
    return rate('Hole', `You save ${pct(sr)} of what comes in, under the ${pct(T.cashFlow.ok)} line.`);
  },
  emergency: f => { // answer 132: the cash layers decide (little e, then big e)
    if (f.x.cash == null || !f.littleE) return null;
    const cash = money(f.x.cash), months = f.months == null ? '' : ` (${f.months.toFixed(1)} months of spending)`;
    if (!f.littleFull) return rate('Hole', `${cash}${months}: little e (${money(f.littleE.target ?? 0)}) is not full yet.`);
    if (f.bigFull) return rate('Strong', `${cash}${months}: big e is full (${f.bigMonths.toFixed(1)} months of spending, your age over 5).`);
    return rate('OK', `${cash}${months}: little e is full; big e (${f.needsAge ? 'add your age to set it' : money(f.bigE.reduce((s, l) => s + (l.target ?? 0), 0))}) is not yet.`);
  },
  debt: f => {
    if (f.x.gates.areas.debt === false || f.x.none) return rate('Strong', 'No debt, per About you.');
    const owed = f.x.debts.filter(d => (d.balance ?? 0) > 0);
    if (!f.x.debts.length) return null;
    if (!owed.length) return rate('Strong', 'Every debt is at $0.');
    if (f.heavy.length) return rate('Hole', `${money(sum(f.heavy, d => d.balance))} of heavy debt: ${f.heavy.map(d => `${d.name} at ${pct(d.apr ?? 0)}`).join(', ')}.`);
    if (f.dti != null && f.dti > T.debt.dti) return rate('OK', `Only low-rate debt, but payments take ${pct(f.dti)} of gross, over the ${pct(T.debt.dti)} line.`);
    return rate('Strong', `Only low-rate debt${f.dti != null ? `; payments take ${pct(f.dti)} of gross` : ''}.`);
  },
  credit: f => { // item 34: the score(s), utilization, late payments, the oldest account, hard inquiries
    const scores = [f.score, f.scorePartner].filter(v => v != null);
    const low = scores.length ? Math.min(...scores) : null;
    const late = f.credit.latePayments === true;
    if (f.util != null && f.util > T.credit.utilizationHole) return rate('Hole', `Cards ${pct(f.util)} used, over the ${pct(T.credit.utilizationHole)} line.`);
    if (late) return rate('Hole', `${f.credit.lateCount ? `${f.credit.lateCount} late ${f.credit.lateCount === 1 ? 'payment' : 'payments'}` : 'A late payment'} in the last two years.`);
    if (low != null && low < T.credit.ok) return rate('Hole', `A score of ${low}, under ${T.credit.ok}.`);
    if (low != null && low >= T.credit.strong) return rate((f.credit.inquiries ?? 0) > T.credit.inquiriesOk ? 'OK' : 'Strong', `${scores.length > 1 ? `Scores of ${scores.join(' and ')}` : `A score of ${low}`}, at or over ${T.credit.strong}${(f.credit.inquiries ?? 0) > T.credit.inquiriesOk ? `, but ${f.credit.inquiries} hard inquiries this year` : ''}${f.credit.oldestAccountYears != null ? `; oldest account ${f.credit.oldestAccountYears} years` : ''}.`);
    if (low != null) return rate('OK', `A score of ${low}; ${T.credit.strong} is the strong line.`);
    return null;
  },
  retirement: f => {
    if (f.matchOffered && f.matchLeft > 0) return rate('Hole', `${money(f.matchLeft)} a year of employer match left on the table.`);
    const share = f.gross ? f.retirementSaving / f.gross : null;
    if (share == null) return f.employed && !f.retirementAccounts.length ? rate('Hole', 'No retirement account yet.') : null;
    if (share >= T.retirement.strongPct) return rate('Strong', `${pct(share)} of gross goes to retirement accounts${f.matchOffered ? ', with the full match' : ''}.`);
    if (share > 0) return rate('OK', `${pct(share)} of gross goes to retirement accounts; ${pct(T.retirement.strongPct)} is the strong line.`);
    return f.employed ? rate('Hole', 'Nothing goes into a retirement account yet.') : null;
  },
  investing: f => {
    const inv = f.x.invested, going = f.m.investing?.monthly ?? 0, th = f.x.takeHome;
    const share = th ? going / th : null;
    if (share != null && share >= T.investing.strongPct) return rate('Strong', `${money(going)} a month goes into investments, ${pct(share)} of take-home.`);
    if ((inv ?? 0) > 0 || going > 0) return rate('OK', `${money(inv ?? 0)} invested, ${money(going)} a month going in; ${pct(T.investing.strongPct)} of take-home is the strong line.`);
    if (th != null) return rate('Hole', f.m.investing?.investSurplus === false && (f.m.surplus.value ?? 0) > 0 ? 'Nothing invested and nothing going in; the surplus sits in cash.' : 'Nothing invested and nothing going in.');
    return null;
  },
  taxes: f => { // item 35: last year's refund or amount owed, and whether withholding changed since
    const v = f.taxes.lastYear;
    if (v == null) return null;
    const changed = f.taxes.withholdingChanged === true;
    const band = f.x.takeHome != null ? T.taxes.closeEnoughShare * f.x.takeHome * 12 : T.taxes.closeEnough; // answer 179: the band scales with income
    if (Math.abs(v) <= band) return rate('Strong', `Last year came within ${money(band)} (${f.x.takeHome != null ? `about ${pct(T.taxes.closeEnoughShare)} of a year's take-home` : 'the usual band'}): ${v >= 0 ? `a ${money(v)} refund` : `${money(-v)} owed`}.`);
    if (changed) return rate('OK', `Last year ${v >= 0 ? `a ${money(v)} refund` : `${money(-v)} owed`}, but withholding changed since.`);
    return rate('Hole', `Last year ${v >= 0 ? `a ${money(v)} refund (an interest-free loan to the IRS)` : `${money(-v)} owed`}, and withholding has not changed.`);
  },
  protection: f => {
    if (!f.coverage.length) return null;
    const gaps = f.coverage.filter(r => r.values.have === "Don't").map(r => r.type);
    const unsure = f.coverage.filter(r => r.values.have === 'Not sure').map(r => r.type);
    const must = ['Health', ...(f.dependents > 0 ? ['Life', 'Disability'] : [])];
    const holes = gaps.filter(t => must.includes(t));
    if (holes.length) return rate('Hole', `No ${holes.join(', ').toLowerCase()} coverage${f.dependents > 0 && holes.some(t => t !== 'Health') ? ', with dependents' : ''}.`);
    if (gaps.length || unsure.length) return rate('OK', `${gaps.length ? `Missing: ${gaps.join(', ')}` : ''}${gaps.length && unsure.length ? '; ' : ''}${unsure.length ? `not sure about: ${unsure.join(', ')}` : ''}.`);
    return rate('Strong', 'Every coverage on the list is in place.');
  },
  income: f => {
    if (f.betweenJobs) return rate('Hole', 'Between jobs.');
    if (f.x.takeHome == null) return null;
    const mk = f.incomeFacts.marketRate ?? null; // item 35: paid at market rate, and the last raise
    if (mk === 'No') return rate('Hole', `${money(f.x.takeHome)} a month take-home, under market rate.`);
    if (f.stability === 'Steady' && mk !== 'Unsure') return rate('Strong', `${money(f.x.takeHome)} a month take-home, steady${mk === 'Yes' ? ', at market rate' : ''}.`);
    if (f.stability === 'Varies' || f.stability === 'Unpredictable' || mk === 'Unsure') return rate('OK', `${money(f.x.takeHome)} a month take-home, ${f.stability ? f.stability.toLowerCase() : 'steady'}${mk === 'Unsure' ? ', unsure about market rate' : ''}.`);
    return null;
  },
  goals: f => {
    const { short, long, need, list } = f.goals;
    if (short >= need && long >= need) return rate('Strong', `${short} short-term and ${long} long-term goals, each with an amount, a date and a tag.`);
    if (list.length) return rate('OK', `${short} of ${need} short-term and ${long} of ${need} long-term goals complete.`);
    return rate('Hole', 'No goals named yet.');
  },
  mindset: f => {
    if (f.feeling == null) return null;
    if (f.feeling >= T.mindset.strong) return rate('Strong', `Confidence ${f.feeling} of 10.`);
    if (f.feeling <= T.mindset.hole) return rate('Hole', `Confidence ${f.feeling} of 10.`);
    return rate('OK', `Confidence ${f.feeling} of 10; ${T.mindset.strong} is the strong line.`);
  },
};

// A hole's payoff, dollars a year, with the math in words. Null when there is no rule (the coach types one).
const PAYOFFS = {
  cashFlow: f => {
    const s = f.m.surplus.value, th = f.x.takeHome;
    if (s == null || th == null) return null;
    const v = Math.max(0, T.cashFlow.ok * th - s) * 12;
    return { value: v, text: `Getting to a ${pct(T.cashFlow.ok)} savings rate: ${money(T.cashFlow.ok * th)} a month minus the ${money(s)} surplus, times 12 = ${money(v)} a year.` };
  },
  emergency: f => {
    if (f.x.cash == null || f.x.spending == null) return null;
    const gap = Math.max(0, PAYOFF.emergency.months * f.x.spending - f.x.cash), v = gap * f.typicalCardApr;
    return { value: v, text: `A ${money(gap)} gap to ${PAYOFF.emergency.months} months of spending, carried on a card at ${pct(f.typicalCardApr)} = ${money(v)} a year.` };
  },
  debt: f => {
    const v = sum(f.heavy, d => d.balance * (d.apr ?? 0));
    return { value: v, text: `Interest a year on the heavy debt: ${f.heavy.map(d => `${money(d.balance)} at ${pct(d.apr ?? 0)}`).join(' + ')} = ${money(v)}.` };
  },
  credit: f => {
    const v = f.debtTotal * PAYOFF.credit.aprPoints;
    return { value: v, text: `About ${pct(PAYOFF.credit.aprPoints)} more APR on ${money(f.debtTotal)} of debt = ${money(v)} a year.` };
  },
  retirement: f => {
    let v = f.matchLeft;
    const parts = f.matchLeft ? [`${money(f.matchLeft)} of match left on the table`] : [];
    if (f.retirementSaving === 0 && f.gross && f.marginal) {
      const t = PAYOFF.retirement.targetPct * f.gross * 12 * f.marginal;
      v += t;
      parts.push(`${money(t)} of tax saved by putting ${pct(PAYOFF.retirement.targetPct)} of gross away before tax at a ${pct(f.marginal)} marginal rate`);
    }
    return parts.length ? { value: v, text: `${parts.join(' + ')} = ${money(v)} a year.` } : null;
  },
  investing: f => {
    const target = Math.max(f.r5.value ?? 0, PAYOFF.emergency.months * (f.x.spending ?? 0));
    const idle = Math.max(0, (f.x.cash ?? 0) - target);
    const out = f.m.investing?.investSurplus ? 0 : Math.max(0, f.m.surplus.value ?? 0) * 12;
    const v = (idle + out) * f.realReturn;
    return { value: v, text: `(${money(idle)} of cash above the emergency target + ${money(out)} a year of surplus not invested) at ${pct(f.realReturn)} = ${money(v)} a year.` };
  },
};

// The scorecard: every area with its rating, reason and source, each hole's payoff, effort and score, the holes
// ranked, and the counts Home shows. doc.scorecard holds the coach's overrides, efforts, typed payoffs and picks.
export function scorecardOf(doc, ref, { now = new Date(), flags = [] } = {}) {
  const f = factsOf(doc, ref, { now, flags });
  const sc = doc.scorecard || {};
  const chosen = sc.chosen || [];
  const hourly = f.m.hourly?.value ?? null, annualSpending = f.m.annualSpending;
  const hereAt = f.here == null ? -1 : FOO_ORDER.indexOf(f.here);
  const areas = AREAS.map(a => {
    const auto = RULE[a.id]?.(f) ?? null;
    const o = sc.areas?.[a.id] || {};
    const override = RATINGS.includes(o.rating) ? o.rating : null;
    const rating = override ?? auto?.rating ?? null;
    const source = override ? 'coach' : auto ? 'auto' : 'unrated';
    const reason = override ? (o.reason || "The coach's call.") : auto?.reason ?? 'Not rated yet: add the inputs it needs on the Scorecard, or rate it.';
    const payoff = rating !== 'Hole' ? null : o.payoff != null ? { value: o.payoff, text: `${money(o.payoff)} a year, the coach's estimate.`, typed: true } : PAYOFFS[a.id]?.(f) ?? null;
    const effort = o.effort ?? a.effort;
    const score = payoff && effort > 0 ? payoff.value / effort : null;
    const time = payoff ? moneyAsTime({ amount: payoff.value, hourlyWage: hourly, annualSpending }).value : null;
    const foo = a.fooWhen ? a.fooWhen(f) : a.foo; // the step on SLAM's own FOO, moved by the facts (little e then big e)
    const beforeHere = hereAt >= 0 && FOO_ORDER.indexOf(foo) < hereAt;
    // Batch 11, the debt rule: while the surplus goes to heavy debt first, a hole at a later FOO step waits behind it.
    const waits = !!f.m.debtRule?.on && FOO_ORDER.indexOf(foo) > FOO_ORDER.indexOf('3');
    const parked = o.parked ? { at: o.parked.at, note: o.parked.note ?? null, back: o.parked.back ?? { kind: 'next' }, atSession: o.parked.atSession ?? null } : null;
    const math = [
      `${a.name}: ${rating ?? 'not rated'}${source === 'coach' ? " (the coach's call)" : source === 'auto' ? ' (from the numbers)' : ''}. ${reason}`,
      payoff ? `Payoff: ${payoff.text}${time?.fiDays != null ? ` That is ${fmt.number(time.fiDays, 1)} FI days${time.hours != null ? ` or ${fmt.number(time.hours, 1)} hours of work` : ''}.` : ''}` : rating === 'Hole' ? 'Payoff: no rule for this area; type one on the Scorecard.' : null,
      rating === 'Hole' ? `Effort: ${effort} ${effort === 1 ? 'hour' : 'hours'}${o.effort != null ? ' (set by the coach)' : ' (the usual)'}.` : null,
      score != null ? `Best return: ${money(payoff.value)} a year over ${effort} hours = ${money(score)} a year per hour.` : null,
      rating === 'Hole' ? `FOO step ${foo} (${a.fooWords}); ${f.here == null ? 'the FOO has no step yet' : `you are on step ${f.here}`}: ${beforeHere ? 'before your step, so it ranks first' : waits ? 'after heavy debt: the surplus goes to heavy debt first, so it ranks after Debt' : 'at or after your step'}.` : null,
      parked ? `Parked${parked.note ? `: ${parked.note}` : ''}. It ranks last until it is unparked.` : null,
    ].filter(Boolean);
    return { ...a, foo, rating, reason, source, auto, override, coachReason: o.reason ?? null, payoff, fiDays: time?.fiDays ?? null, hours: time?.hours ?? null, effort, effortSet: o.effort != null, score, beforeHere, waits, chosen: chosen.includes(a.id), parked, math };
  });
  // Ranked: parked holes last (answer 136), a hole with no payoff last before them (133), then the ones before the
  // client's FOO step first, then best return.
  const holes = areas.filter(a => a.rating === 'Hole')
    .sort((a, b) => (Number(!!a.parked) - Number(!!b.parked)) || (Number(!a.payoff) - Number(!b.payoff)) || (Number(b.beforeHere) - Number(a.beforeHere)) || (Number(a.waits) - Number(b.waits)) || ((b.score ?? -1) - (a.score ?? -1)) || ((b.payoff?.value ?? 0) - (a.payoff?.value ?? 0)));
  holes.forEach((h, i) => { h.rank = i + 1; });
  const okCount = areas.filter(a => a.rating === 'Strong' || a.rating === 'OK').length;
  return { areas, holes, ok: areas.filter(a => a.rating === 'OK'), strong: areas.filter(a => a.rating === 'Strong'), unrated: areas.filter(a => !a.rating),
    okCount, of: areas.length, rated: areas.filter(a => a.rating).length, here: f.here, chosen: holes.filter(h => h.chosen), open: holes.filter(h => !h.parked), parkedHoles: holes.filter(h => h.parked), facts: f };
}
export const ratingOf = (sc, id) => sc.areas.find(a => a.id === id)?.rating ?? null;
