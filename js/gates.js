// Gates (R001 to R023): what applies to this household. One place reads the Profile answers and says which
// areas, rows and fields appear. An unanswered gate shows everything; only a 'no' takes things away (R001: absent,
// not hidden, but nothing disappears before it is asked). Pure: no DOM, no storage.

export const WORK = ['Employed (W-2)', 'Self-employed', 'Mixed', 'Between jobs', 'Student', 'Retired'];
export const HOUSING = ['Rent', 'Own', 'Family', 'Other'];
export const COVERAGE = ['Employer', 'ACA', "Parent's plan", 'Medicaid', 'None', 'Other'];
export const AREAS = [['cash', 'Cash'], ['investments', 'Investments'], ['real', 'Home or car'], ['debt', 'Debt']];
export const REAL_TYPES = ['Car', 'Home', 'Other property', 'Business', 'Valuables', 'Money owed to you'];
export const PROTECTION_TYPES = ['Health', 'Life', 'Disability', 'Renters or home', 'Car', 'Umbrella'];
// Debts that ride on a home or car (R049): the same loan shows on the asset and on Debt.
export const LOAN_FOR = { Car: 'Car loan', Home: 'Mortgage' };

export function gatesOf(profile = {}, client = {}) {
  const p = profile || {};
  const work = p.workSituation ?? null;
  // Only a 'no' takes an area away (R001). The Profile checkboxes answer all four at once; a step skipped in
  // Fast Track leaves its area unanswered, so it still shows.
  const area = k => (p.noneOfThese ? false : p.areas?.[k] ?? null);
  return {
    couple: p.household ? p.household === 'Couple' : !!client.couple, // R007
    car: p.hasCar ?? null, // R009
    pets: p.hasPets ?? null, // R011
    kids: p.dependents === null || p.dependents === undefined ? null : p.dependents > 0, // R010
    housing: p.housing ?? null, // R008
    work,
    employer: !work || ['Employed (W-2)', 'Mixed'].includes(work), // R004: match, 401(k) %, deductions, vesting, equity
    variable: ['Self-employed', 'Mixed'].includes(work), // R005
    betweenJobs: work === 'Between jobs', // R006
    hsa: p.hsaEligible === true, // R012: only once confirmed
    fsa: p.fsa === true, // R013
    equity: p.equityPay === true, // R014
    areas: { cash: area('cash'), investments: area('investments'), real: area('real'), debt: area('debt') }, // R001
    none: p.noneOfThese === true, // R002
  };
}

// The area an asset, account or debt belongs to.
export function areaOf(r) {
  if (r.kind === 'account') return r.values?.group === 'investment' ? 'investments' : 'cash';
  if (r.kind === 'asset') return 'real';
  if (r.kind === 'debt') return 'debt';
  return null;
}

// Why a record is gated out, or null when it shows. Bills read their category's gate from Reference data.
export function gatedOut(r, g, ref = null) {
  const a = areaOf(r);
  if (a && g.areas[a] === false) return a;
  if (r.kind === 'bill') {
    const gate = ref?.categoryDefaults?.find(c => c.category === r.values?.category)?.gate
      ?? (/^kids/i.test(r.values?.category || '') ? 'kids' : /^pets/i.test(r.values?.category || '') ? 'pets' : null);
    if (gate && g[gate] === false) return gate;
    // R008: renting has a rent line and renters insurance; owning carries the mortgage on the home instead.
    if (g.housing === 'Own' && (r.values?.category === 'Rent or mortgage' && /rent/i.test(r.name || '') || /renters/i.test(r.name || ''))) return 'housing';
  }
  return null;
}
export const visible = (records, g, ref) => records.filter(r => !gatedOut(r, g, ref));

// What a picked type becomes as a record (R003: count first, then rows).
export function recordFor(type, ref) {
  const L = ref.lists;
  if (L.cashTypes.includes(type)) return { kind: 'account', type, values: { group: 'cash' } };
  if (L.investmentTypes.includes(type)) return { kind: 'account', type, values: { group: 'investment' } };
  if (REAL_TYPES.includes(type)) return { kind: 'asset', type, values: {} };
  return { kind: 'debt', type, values: {} };
}
const blankRow = r => r.amount == null && r.name == null && Object.values(r.values || {}).every(v => v == null || v === 'cash' || v === 'investment');

// Make the rows of one type match a count: add blank ones; take away only blank ones, never a row with numbers.
export function syncCount(store, type, n, ref) {
  const spec = recordFor(type, ref);
  return store.transaction(`${type}: ${n}`, () => {
    const rows = store.find(r => r.kind === spec.kind && r.type === type);
    for (let i = rows.length; i < n; i++) store.add(spec.kind, { values: { ...spec.values } }, { type });
    const extra = rows.length - n;
    if (extra > 0) {
      const gone = rows.filter(blankRow).slice(-extra).map(r => r.id);
      if (gone.length) store.remove(gone);
      return { kept: extra - gone.length };
    }
    return { kept: 0 };
  });
}

// Fields that only apply to some rows (R004, R005, R012, R013, R014, R016, R017, R018, R020, R021).
export function applies(field, { g, r = null, taxTypes = [] } = {}) {
  switch (field) {
    case 'match': case '401k': case 'premium': case 'vesting': case 'otherPretax': return g.employer;
    case 'equity': return g.employer && g.equity;
    case 'hsaFsa': return g.hsa || g.fsa;
    case 'variable': return g.variable;
    case 'unemployment': return g.betweenJobs;
    case 'repaymentPlan': case 'pslf': return r?.values?.federal !== 'Private';
    case 'customPayment': return r?.values?.payChoice === 'Custom';
    case 'costBasis': return r?.type === 'Brokerage';
    case 'rothBasis': return /Roth/.test(r?.type || '');
    case 'hsaInvested': return r?.type === 'HSA';
    case 'twoBalances': return r?.values?.taxType === 'Both';
    case 'quarterly': case 'seTax': return taxTypes.includes('1099') || g.variable;
    case 'partner': case 'owner': case 'split': return g.couple;
    default: return true;
  }
}

// The answers the Profile asks, so the gates hub can list each with its answer (R015).
export function gateList(g) {
  const yn = v => (v === null ? 'not asked' : v ? 'yes' : 'no');
  return [
    ['Car', yn(g.car)], ['Kids', yn(g.kids)], ['Pets', yn(g.pets)], ['Housing', g.housing ?? 'not asked'],
    ['Work', g.work ?? 'not asked'], ['HSA-eligible', g.hsa ? 'yes' : 'no'], ['Equity pay', g.equity ? 'yes' : 'no'], ['Couple', g.couple ? 'yes' : 'no'],
  ];
}
