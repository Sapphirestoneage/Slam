// Households for the spreadsheet tests (test/workbook.test.js, test/import.test.js): made up, built in code.
import { Store, newHousehold } from '../js/records.js';
import { AREAS } from '../js/registry/fields.js';

const NOW = new Date('2026-11-03T12:00:00Z');

// A household with a row of every kind and a value in every field the registry declares.
export function everyField() {
  const s = new Store(newHousehold({ name: 'Every field', now: NOW.toISOString() }), { now: () => NOW.toISOString() });
  const sample = (f, i = 0) => ({ money: 100 + i, pct: 0.05, date: '2026-12-15', month: '2027-03', day: 15, number: 2, text: `Text ${i}`, choice: f.options?.[0], yesno: true, list: ['a', 'b'] })[f.type];
  s.transaction('Every field', () => {
    for (const a of AREAS) {
      if (a.source === 'records') {
        for (const kind of Object.keys(a.kinds)) {
          const top = {}, values = {};
          a.fields.filter(f => f.sheet === true && (!f.kinds || f.kinds.includes(kind))).forEach((f, i) => { (f.where === 'top' ? top : values)[f.key] = sample(f, i); });
          s.add(kind, { ...top, values }, { type: a.types?.[kind]?.[0] ?? null });
        }
      } else if (a.source === 'doc') {
        for (const f of a.fields.filter(x => x.sheet === true)) {
          const part = f.part ?? a.part ?? 'profile';
          const path = f.key.split('.');
          const obj = JSON.parse(JSON.stringify(s.doc[part] || {}));
          let o = obj; for (const k of path.slice(0, -1)) o = (o[k] ??= {});
          o[path.at(-1)] = sample(f);
          s.setDoc(part, obj);
        }
      } else if (a.source === 'list') {
        s.setDoc(a.part, { [a.path]: [Object.fromEntries(a.fields.map((f, i) => [f.key, sample(f, i)]))].map(x => ({ id: 'g1', ...x })) });
      }
    }
    const bill = s.find(r => r.kind === 'bill')[0];
    s.setIn('spending', ['months', '2026-11', 'lines', bill.id], { estimate: 90, actual: 120 });
  });
  return s.doc;
}

// A household that uses most of the math: gross pay with a 401(k) and match, NY and NYC tax, a couple, lines
// instead of the gut, a split rent, a covered bill, a yearly cost, cards on the minimum and in full, a 0% promo.
export function richHousehold() {
  const s = new Store(newHousehold({ name: 'Rich example', now: NOW.toISOString() }), { now: () => NOW.toISOString() });
  s.transaction('x', () => {
    s.setDoc('profile', { age: 34, household: 'Couple', state: 'NY', nyc: true, roommates: 1, moneyStyle: 'Mix', shared: { internet: true, groceries: true }, sharedAs: { internet: 'The whole bill', groceries: 'The whole bill' }, incomeStability: 'Varies', variable: { lowest: 3000, typical: 4500 }, keepJobAfterLaunch: 'Yes' });
    s.setDoc('client', { couple: true });
    s.setDoc('assumptions', { realReturn: 0.06, fiAge: 55 });
    s.setDoc('spending', { source: 'lines' });
    s.add('income', { name: 'Job', amount: 120000, per: 'year', values: { basis: 'Gross', payFrequency: '2 weeks', contributionPct: 0.06, matchPct: 0.5, matchCapPct: 0.06, otherPretax: 20 } }, { type: 'Job' });
    s.add('income', { name: 'Side', amount: 800, per: 'month', values: {} }, { type: 'Side hustle' });
    s.add('income', { name: 'Partner', amount: 3100, per: '2 weeks', values: { payFrequency: '2 weeks' } }, { type: 'Partner job' });
    s.add('spending', { name: 'Gut', amount: 5000, values: { includesDebtPayments: false } }, { type: 'All in' });
    s.add('bill', { name: 'Rent', amount: 3200, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', whoPays: 'Split' } });
    s.add('bill', { name: 'Electric', amount: 60, values: { category: 'Electric, gas, water', draftt: 'Accommodation', amountType: 'Variable', whoPays: 'Split', amountIs: 'Your share' } });
    s.add('bill', { name: 'Groceries', amount: 200, per: 'week', values: { category: 'Groceries, dining out, coffee', draftt: 'Food', amountType: 'Variable' } });
    s.add('bill', { name: 'Phone', amount: 80, values: { category: 'Internet, phone', draftt: 'Accommodation', amountType: 'Fixed', whoPays: 'Covered by someone', coveredAmount: 50 } });
    s.add('bill', { name: 'Gym', amount: 90, values: { category: 'Gym or fitness', draftt: 'Therapy', amountType: 'Fixed', reimbursed: 30 } });
    s.add('bill', { name: 'Car insurance', amount: 150, values: { category: 'Car insurance', draftt: 'Transportation', amountType: 'Fixed', whoPays: 'Covered by someone', coveredBy: 'Parents', takeover: '2026-09' } }); // already mine
    s.add('bill', { name: 'Streaming', amount: 20, values: { category: 'Subscriptions', draftt: 'Other', amountType: 'Fixed', whoPays: 'Covered by someone', coveredBy: 'Partner', takeover: '2027-06' } }); // not yet
    s.add('bill', { name: 'Water', amount: 40, values: { category: 'Electric, gas, water', draftt: 'Accommodation', amountType: 'Fixed', whoPays: 'Included in rent' } });
    s.add('bill', { name: 'Insurance', amount: 1200, per: 'year', values: { draftt: 'Transportation', amountType: 'Fixed', irregular: true } });
    s.add('bill', { name: 'IRA', amount: 300, values: { draftt: 'Retirement', amountType: 'Fixed' } });
    s.add('account', { name: 'Checking', values: { group: 'cash', balance: 9000 } }, { type: 'Checking' });
    s.add('account', { name: '401k', values: { group: 'investment', balance: 60000, unvested: 4000 } }, { type: '401(k)' });
    s.add('account', { name: 'Brokerage', values: { group: 'investment', balance: 15000 } }, { type: 'Brokerage' });
    s.add('account', { name: 'Roth', values: { group: 'investment', balance: 12000 } }, { type: 'Roth IRA' });
    s.add('asset', { name: 'Car', values: { value: 14000 } }, { type: 'Car' });
    s.add('debt', { name: 'Visa', values: { balance: 3000, apr: 0.24, limit: 10000 } }, { type: 'Credit card' });
    s.add('debt', { name: 'Amex', values: { balance: 1500, apr: 0.2, payChoice: 'In full', limit: 5000 } }, { type: 'Credit card' });
    s.add('debt', { name: 'Student', values: { balance: 22000, apr: 0.045, payment: 250 } }, { type: 'Student loan' });
    s.add('debt', { name: 'Promo', values: { balance: 2400, apr: 0, payment: 100, promoEnd: '2027-09' } }, { type: 'Personal loan' });
    s.add('coverage', { name: 'Health', amount: 120, per: 'month', values: { have: 'Have it', deductible: 1500, paidFrom: 'Budget' } }, { type: 'Health' });
    s.setIn('spending', ['months', '2026-10', 'lines', s.find(r => r.name === 'Groceries')[0].id], { estimate: 800, actual: 950 });
  });
  return s.doc;
}

