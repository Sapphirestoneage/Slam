// Turns a fixture's inputs (fixtures/demo.json, or the private file locally) into a household.
// The demo is made up; the published site shows it behind 'Try with example numbers'.
import { Store, newHousehold } from './records.js';

export function householdFromInputs(inputs, { name = 'Demo client', now } = {}) {
  const store = new Store(newHousehold({ name, now }), now ? { now: () => now } : {});
  const has = k => inputs[k] !== null && inputs[k] !== undefined;
  store.transaction('Example numbers', () => {
    store.setDoc('profile', { age: inputs.age ?? null, household: inputs.household ?? 'Solo' });
    store.setDoc('assumptions', { realReturn: inputs.realReturn ?? null, withdrawalRate: inputs.withdrawalRate ?? null, inflation: inputs.inflation ?? null });
    store.add('income', { name: 'Take-home pay', amount: inputs.takeHome ?? null, per: 'month' }, { type: 'Job' });
    if (has('spendingAllIn') || 'spendingAllIn' in inputs) {
      store.add('spending', { name: 'Monthly spending, all in', amount: inputs.spendingAllIn ?? null, values: { includesDebtPayments: true } }, { type: 'All in' });
    }
    if (has('rent')) store.add('bill', { name: 'Rent', amount: inputs.rent, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date', whoPays: 'Me' } });
    if (has('utilities')) store.add('bill', { name: 'Utilities', amount: inputs.utilities, values: { category: 'Electric, gas, water', draftt: 'Accommodation', amountType: 'Variable', timing: 'Fixed date', whoPays: 'Me' } });
    if (has('phoneCoveredByParents')) store.add('bill', { name: 'Phone', amount: inputs.phoneCoveredByParents, status: 'Roughly', values: { category: 'Internet, phone', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date', whoPays: 'Covered by someone', coveredBy: 'Parents' } });
    if (has('cash')) store.add('account', { name: 'Savings', values: { group: 'cash', balance: inputs.cash } }, { type: 'Savings or HYSA' });
    if (has('invested')) store.add('account', { name: 'Investments (all accounts)', values: { group: 'investment', balance: inputs.invested } }, { type: 'All investments' });
    let car = null;
    if (has('carValue')) car = store.add('asset', { name: 'Car', values: { value: inputs.carValue } }, { type: 'Car' });
    if (has('carLoanBalance')) store.add('debt', { name: 'Car loan', linkedTo: car?.id ?? null, values: { balance: inputs.carLoanBalance, apr: inputs.carLoanApr ?? null, payment: inputs.carLoanPayment ?? null } }, { type: 'Car loan' });
    if (has('studentLoanBalance')) store.add('debt', { name: 'Student loan', values: { balance: inputs.studentLoanBalance, apr: inputs.studentLoanApr ?? null, payment: inputs.studentLoanPayment ?? null } }, { type: 'Student loan' });
    if (has('cardBalance')) store.add('debt', { name: 'Credit card', values: { balance: inputs.cardBalance, apr: inputs.cardApr ?? null, payment: inputs.cardPayment ?? null } }, { type: 'Credit card' });
  });
  store.undoStack = [];
  return store.doc;
}
