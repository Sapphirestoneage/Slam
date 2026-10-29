// Compares the app's answers to a fixture's expected outputs (within $1 or 1 month).
import { metrics, firstDebt } from './metrics.js';
import { householdFromInputs } from '../demo.js';

export function appAnswers(doc, ref, now) {
  const m = metrics(doc, ref, { now });
  const card = firstDebt(m, 'Credit card'), student = firstDebt(m, 'Student loan'), car = firstDebt(m, 'Car loan');
  return {
    netWorth: m.netWorth, runwayMonths: m.runwayMonths, surplus: m.surplus, savingsRate: m.savingsRate,
    housingPct: m.housingPct, cardPayoffMonths: card.payoff, cardInterest: card.interest,
    studentLoanPayoffMonths: student.payoff, studentLoanInterest: student.interest, carLoanPayoffMonths: car.payoff,
    realReturn: { value: m.inputs.realReturn, needs: [] },
    ruleOf5Months: { value: m.ruleOf5.months ?? null, needs: m.ruleOf5.months === undefined ? m.ruleOf5.needs : [] },
    ruleOf5Target: m.ruleOf5, ruleOf5KeepPace: { value: m.ruleOf5.keepPace ?? null, needs: m.ruleOf5.needs },
    fiNumber: m.fiNumber, monthsToFi: m.monthsToFi, coastFi: m.coastFi, supportReceived: m.supportReceived,
  };
}

// Percentages are compared on the percent shown (one decimal), money within $1, months within 1.
export function compare(fixture, ref, now = new Date('2026-11-01T12:00:00')) {
  const doc = householdFromInputs(fixture.inputs, { now: now.toISOString() });
  const got = appAnswers(doc, ref, now);
  return Object.entries(fixture.expected).map(([key, exp]) => {
    const r = got[key];
    const tol = exp.tolerance === '1 month' ? 1 : ['savingsRate', 'housingPct', 'realReturn'].includes(key) ? 0.0005 : 1;
    if (exp.needs) {
      const pass = r.value === null && r.needs.length > 0;
      return { key, label: exp.label, expected: exp.needs, got: r.value === null ? `Needs ${r.needs.join(', ')}` : r.value, pass };
    }
    const pass = r.value !== null && Math.abs(r.value - exp.value) <= tol;
    return { key, label: exp.label, expected: exp.value, got: r.value, diff: r.value === null ? null : r.value - exp.value, pass };
  });
}
