// "I'll find it later" (Brandon B1.2, B1.3): any field can be parked on the Homework list, each with a hint on
// where to look. Record fields use the 'Will email' status (shown as "I'll find it later"); Profile answers live in
// doc.profile.later. Pure: no DOM.
import { BENEFITS } from './benefits.js';
import { lifeAdminItems } from './lifeadmin.js';

export const LATER = 'Will email';

// Where to find it, in the user's words. Keyed by field; a row type can override.
const WHERE = {
  // Profile
  birthYear: 'Driver\'s license or ID', state: 'Where you live and file taxes', dependents: 'Your last tax return',
  healthCoverage: 'Insurance card or benefits portal', email: 'Your inbox', phone: 'Your phone settings',
  roommates: 'Your lease', incomeStability: 'Last year\'s bank statements', partnerBirthYear: 'Partner\'s ID',
  filingStatus: 'Your last tax return, page 1',
  // Income
  amount: 'Pay stub: net pay (take-home) or gross pay', gross: 'Pay stub: gross pay, or your offer letter',
  payFrequency: 'Pay stub: pay period dates', paydays: 'Pay stub dates, or bank deposits', nextPayday: 'Pay stub dates, or bank deposits',
  incomeType: 'W-2 or 1099 from last year', contributionPct: 'Pay stub, or the 401(k) site',
  matchPct: 'Benefits portal or employee handbook', matchCapPct: 'Benefits portal or employee handbook',
  bonus: 'Offer letter or last year\'s pay stubs', premium: 'Pay stub deductions', hsaFsa: 'Pay stub deductions',
  vesting: 'Benefits portal: vesting schedule', equity: 'Equity site (e.g. the ESPP or RSU portal)',
  raisePct: 'Last review or offer letter', otherPretax: 'Pay stub deductions',
  // Accounts
  balance: 'The account\'s app or latest statement', institution: 'The account\'s app or statement',
  last4: 'The account\'s app or statement', apy: 'The bank\'s app: rate or APY', yield7: 'The fund page: 7-day yield',
  contribution: 'Pay stub, or the account\'s contributions page', taxType: 'The account\'s app: Roth or traditional',
  unvested: '401(k) site: vested balance', costBasis: 'Brokerage: cost basis or gains page', rothBasis: 'IRA site: contributions to date, or Form 5498s',
  contributionsToDate: 'The account\'s contributions page', dividends: 'Brokerage: income or dividends page',
  realized: 'Brokerage: realized gains page, or last 1099-B', fees: 'Fund page: expense ratio', accountFee: 'Statement: fees',
  beneficiary: 'The account\'s settings: beneficiaries', holdings: 'The account\'s holdings or positions page',
  allocation: 'The account\'s holdings page', hsaInvested: 'HSA site: invested vs cash', hsaCash: 'HSA site: invested vs cash',
  hsaManagedFee: 'HSA site: fee schedule', hsaSelfFee: 'HSA site: fee schedule', matchTiers: 'Benefits portal or plan summary',
  vestingSchedule: 'Benefits portal: vesting schedule',
  statementDay: 'Card app or statement: closing date', autopay: 'Card app: payments or autopay settings', rewards: 'Card app or the back of the card',
  lastYearAmount: 'Last year\'s tax return: refund or amount owed', w4Status: 'Your W-4, or the payroll site', w4Extra: 'Your W-4 step 4(c), or the payroll site',
  creditScore: 'Credit Karma, or your bank or card app (free)', value: 'A recent estimate (Kelley Blue Book, Zillow)',
};
const LABEL = {
  whyNow: 'What prompted this call', worry: 'Biggest worry', goalWords: 'Goal in their words', firstName: 'First name', lastName: 'Last name',
  birthYear: 'Birth month and year', state: 'State', household: 'Solo or couple', partnerName: 'Partner first name', partnerBirthYear: 'Partner birth year',
  dependents: 'Dependents', healthCoverage: 'Health coverage', email: 'Email', phone: 'Phone', workSituation: 'Work situation', housing: 'Housing',
  roommates: 'Roommates', worstCase: 'Worst case: all on me', incomeStability: 'Income stability', moneyStyle: 'How they run money', splitMine: 'Split: my share',
  amount: 'amount', gross: 'gross pay', payFrequency: 'pay frequency', paydays: 'paydays', nextPayday: 'next payday', incomeType: 'income type',
  contributionPct: '401(k) %', matchPct: 'employer match', matchCapPct: 'match limit', bonus: 'bonus', premium: 'health premium', hsaFsa: 'HSA or FSA amount',
  vesting: 'match vesting', equity: 'equity pay', raisePct: 'raise %', otherPretax: 'other before-tax', balance: 'balance', institution: 'institution',
  last4: 'last 4 digits', apy: 'APY', yield7: '7-day yield', contribution: 'putting in', taxType: 'Roth or traditional', unvested: 'unvested amount',
  costBasis: 'cost basis', rothBasis: 'Roth contributions so far', contributionsToDate: 'contributions to date', dividends: 'dividends', realized: 'realized gains',
  fees: 'expense ratio', accountFee: 'account fee', beneficiary: 'beneficiary', holdings: 'holdings', allocation: 'allocation', hsaInvested: 'invested amount',
  hsaCash: 'cash amount', hsaManagedFee: 'managed fee', hsaSelfFee: 'self-directed fee', matchTiers: 'match tiers', vestingSchedule: 'vesting schedule', value: 'value',
  statementDay: 'statement closing day', autopay: 'autopay', rewards: 'rewards type', creditScore: 'Credit score', lastYearAmount: 'Last year\'s refund or amount owed', w4Status: 'W-4 filing status', w4Extra: 'Extra withholding a paycheck',
};
const benefitOf = f => BENEFITS.find(b => f === `benefit.${b.key}`);
export const whereToFind = (field, type = null) => (type === 'HSA' && field === 'contribution' ? 'Pay stub: HSA deduction'
  : benefitOf(field)?.where ?? (field === 'benefit.esppDiscount' ? 'Equity or ESPP site' : null) ?? WHERE[field] ?? null);
export const fieldLabel = field => LABEL[field] ?? benefitOf(field)?.label ?? (field === 'benefit.esppDiscount' ? 'ESPP discount' : field);

// Every parked item: Profile answers first, then rows (whole row or one field).
// records should already be the visible ones (gated-out rows count nowhere).
export function homeworkList(doc, records) {
  const out = [];
  const later = doc.profile?.later || {};
  for (const key of Object.keys(later)) if (later[key]) out.push({ r: null, profileKey: key, label: fieldLabel(key), where: whereToFind(key), due: doc.profile?.laterDue?.[key] ?? null });
  for (const x of lifeAdminItems(doc, records)) if (x.status === 'Not yet') out.push({ r: null, lifeKey: x.key, label: x.label, where: x.where, due: doc.profile?.laterDue?.[x.key] ?? null }); // M8.2
  for (const r of records) {
    const name = r.name || r.values?.category || r.type || 'Item';
    if (r.status === LATER) out.push({ r, label: name, where: whereToFind(r.kind === 'account' || r.kind === 'debt' ? 'balance' : r.kind === 'asset' ? 'value' : 'amount', r.type), due: r.values?.homeworkDue ?? null });
    for (const [f, st] of Object.entries(r.fieldStatus || {})) if (st === LATER && r.status !== LATER) out.push({ r, field: f, label: `${name}: ${fieldLabel(f)}`, where: whereToFind(f, r.type), due: r.values?.homeworkDue ?? null });
  }
  return out;
}

// The copy that goes to the client.
export function homeworkText(name, items) {
  return [`Homework for ${name || 'you'}:`, ...items.map(x => `- ${x.label}${x.where ? ` (look on: ${x.where})` : ''}${x.due ? ` by ${x.due}` : ''}`)].join('\n');
}
