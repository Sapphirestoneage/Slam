/* ============================================================================
   SLAM the Game: core/estate.js
   PURPOSE     The math and the rules of Estate and marriage (run Finish everything partly built, Part
               11): who gets what you leave, the step-up in basis, the 10 years of an inherited account,
               the federal and New York estate lines, and married or partners (federal tax, partner
               cover, the Social Security spousal top-up and survivor benefit).
   INPUT       Plain numbers and lists from the caller. It reads no profile and no screen.
   OUTPUT      ES_RULES (data/reference-2026.json estate), ES_SS, ES_REF (data/sources/estate-2026.json),
               spousalExcess (js/math/socialsecurity.js), ES_KINDS, ES_BASIS, ES_FORM, ES_HEIRS, ES_RULE_OF, esHeirs, ES_WAYS, esTenYear, 
               esCompare
   DEPENDS ON  Nothing. esTenYear and esCompare take the tax engine from the caller (features/retire.js
               retireTax).
   RULES       GENERATED FILE. Do not edit it. tools/game_estate_build.mjs makes it from the main app.
               Change the source, then run the tool. Prettier does not format this file (.prettierignore).
   SOURCE-HASH  24be67bb043eb0a5
   ========================================================================= */
/* The rules, each with its source on the assumptions list of the main app (js/registry/assumptions.js). */
const ES_RULES = {"federalExclusion":15000000,"giftAnnual":19000,"nyExclusion":7350000,"nyCliffShare":1.05,"tenYears":10,"minorAge":21,"nycPartnerFee":35};
const ES_SS = {"spousalShare":0.5};
/* The dated words and sources (data/sources/estate-2026.json). */
const ES_REF = {"about":"Estate and marriage (run Finish everything partly built, Part 11): the rules the estate basics, the inheritance simulator and Married or partners? stand on. Each line names its source, the page and the day it was checked. The numbers themselves are in data/reference-2026.json (estate), with the same sources on the assumptions list.","checked":"2026-11-26","how":"Checked on 2026-11-26 by a web search limited to each agency's own site (irs.gov, federalregister.gov, ssa.gov, tax.ny.gov, nyc.gov, finra.org, nycourts.gov); the pages could not be opened directly from the build machine. Rules change: check the page on the day you use it.","lawyer":"This is not legal or tax advice. It is a summary to bring to a lawyer, who turns it into the real papers and checks it against the law on the day you sign.","facts":{"beneficiaryWins":{"text":"The beneficiary form on a retirement account, and a transfer-on-death form on a brokerage account, usually beat what a will says. Check who is named on each account.","source":"FINRA, Retirement Accounts; Plan Now to Smooth the Transfer of Your Brokerage Account Assets on Death","url":"https://www.finra.org/investors/investing/investment-accounts/retirement-accounts","checked":"2026-11-26"},"noWillNy":{"text":"With no will, New York law gives what you leave to a spouse and children, then parents, then brothers and sisters. A partner you are not married to, and friends, get nothing by default.","source":"New York courts, CourtHelp: Intestacy, When There Is No Will","url":"https://ww2.nycourts.gov/courthelp/WhenSomeoneDies/intestacy.shtml","checked":"2026-11-26"},"stepUp":{"text":"For something inherited (shares, a home), the starting point for tax is usually its value on the date of death, not what the person paid. The gain while they owned it is never taxed as income.","source":"IRS, Gifts and inheritances FAQ","url":"https://www.irs.gov/faqs/interest-dividends-other-types-of-income/gifts-inheritances","checked":"2026-11-26"},"inheritIncome":{"text":"An inheritance is not income for federal income tax. What comes out of an inherited traditional IRA or 401(k) is, in the year it comes out.","source":"IRS, Gifts and inheritances FAQ; Publication 590-B (2025)","url":"https://www.irs.gov/publications/p590b","checked":"2026-11-26"},"lifeInsurance":{"text":"Life insurance paid to you because the insured person died is generally not income, and you do not report it. Interest on it is.","source":"IRS, Life Insurance and Disability Insurance Proceeds FAQ","url":"https://www.irs.gov/faqs/interest-dividends-other-types-of-income/life-insurance-disability-insurance-proceeds/life-insurance-disability-insurance-proceeds","checked":"2026-11-26"},"tenYear":{"text":"Most people who inherit a traditional IRA or 401(k) must empty it by December 31 of the 10th year after the year of death. A death in 2026: by December 31 2036.","source":"IRS, Retirement topics: Beneficiary; Publication 590-B (2025)","url":"https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-beneficiary","checked":"2026-11-26"},"tenYearYearly":{"text":"If the owner had already started their required withdrawals, the heir also takes a withdrawal every year in years 1 to 9, and empties it in year 10. The final regulations (July 19 2024) apply from 2025; for 2021 to 2024 the IRS did not count the missed yearly ones (Notices 2022-53 and 2024-35). The yearly minimum comes from the IRS life expectancy table: the account firm works it out.","source":"Federal Register, Required Minimum Distributions, final regulations, July 19 2024 (TD 10001); IRS Notice 2024-35","url":"https://www.federalregister.gov/documents/2024/07/19/2024-14542/required-minimum-distributions","checked":"2026-11-26"},"eligible":{"text":"Five kinds of heir have more choices than the 10 years: a surviving spouse, the owner's child under 21, a disabled or chronically ill person, and anyone not more than 10 years younger than the owner. A spouse can also treat the IRA as their own. A child's 10 years start at 21.","source":"IRS, Retirement topics: Beneficiary; Publication 590-B (2025); final regulations July 19 2024 (age 21)","url":"https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-beneficiary","checked":"2026-11-26"},"federalExclusion":{"text":"Federal estate tax starts only above $15,000,000 for a death in 2026 (the basic exclusion amount, set by Public Law 119-21 of July 4 2025). Most estates owe none.","source":"IRS, What's new: Estate and gift tax; 2026 Instructions for Form 709","url":"https://www.irs.gov/businesses/small-businesses-self-employed/whats-new-estate-and-gift-tax","checked":"2026-11-26"},"marital":{"text":"What passes outright to a surviving spouse who is a US citizen comes off the estate for federal estate tax (the marital deduction). A spouse can also keep the unused part of the exclusion (portability) if the executor files Form 706 for it. None of this is open to partners who are not married.","source":"IRS, Frequently asked questions on estate taxes; Publication 559 (2025)","url":"https://www.irs.gov/businesses/small-businesses-self-employed/frequently-asked-questions-on-estate-taxes","checked":"2026-11-26"},"giftAnnual":{"text":"You can give each person up to $19,000 in 2026 with no gift tax form. Between spouses who are US citizens, gifts have no limit.","source":"IRS, What's new: Estate and gift tax","url":"https://www.irs.gov/businesses/small-businesses-self-employed/whats-new-estate-and-gift-tax","checked":"2026-11-26"},"nyExclusion":{"text":"New York estate tax starts above $7,350,000 for a death from January 1 to December 31 2026 (the New York basic exclusion amount). New York has no portability between spouses.","source":"NY Department of Taxation and Finance, Estate tax","url":"https://www.tax.ny.gov/pit/estate/etidx.htm","checked":"2026-11-26"},"nyCliff":{"text":"The New York cliff: between $7,350,000 and 105% of it ($7,717,500) the credit shrinks fast, and above 105% it is gone, so the whole estate is taxed, not only the part over the line.","source":"NY Department of Taxation and Finance, Instructions for Form ET-706 (line 3 and its worksheet); TSB-M-14(6)M","url":"https://www.tax.ny.gov/pdf/current_forms/et/et706i.pdf","checked":"2026-11-26"},"dpFederal":{"text":"Registered domestic partners are not married for federal tax. They cannot file jointly or as married filing separately; each files single, or head of household if they qualify.","source":"IRS, Answers to frequently asked questions for registered domestic partners and individuals in civil unions; Publication 555","url":"https://www.irs.gov/newsroom/answers-to-frequently-asked-questions-for-registered-domestic-partners-and-individuals-in-civil-unions","checked":"2026-11-26"},"dpCover":{"text":"Job health cover is tax-free for you, your spouse, your dependents and your children under 27. Cover for a partner who is none of these counts as taxable pay (imputed income).","source":"IRS, Publication 15-B (2026), accident and health benefits","url":"https://www.irs.gov/publications/p15b","checked":"2026-11-26"},"dpCoverNy":{"text":"On the New York State employee plan (NYSHIP), cover for a domestic partner who is not a tax dependent is a taxable benefit for federal and New York tax, and for Social Security and Medicare.","source":"NY Department of Civil Service, PS-425 (4/2026) NYSHIP Domestic Partner Enrollment Application","url":"https://www.cs.ny.gov/forms/ps425.pdf","checked":"2026-11-26"},"nycRegister":{"text":"New York City registers domestic partnerships at the City Clerk: both 18 or older, unmarried, living together, both NYC residents (or one a City employee), in person by appointment, $35. There is no statewide registry in New York.","source":"NYC Office of the City Clerk, Domestic Partnership Registration","url":"https://www.cityclerk.nyc.gov/content/domestic-partnership-registration","checked":"2026-11-26"},"ssSpouse":{"text":"A spouse can get up to half of the other's full benefit, after one year of marriage (sooner as the parent of their child). A divorced spouse needs 10 years of marriage.","source":"Social Security Administration, What are the marriage requirements to receive spouse's benefits? (KA-01999)","url":"https://www.ssa.gov/faqs/en/questions/KA-01999.html","checked":"2026-11-26"},"ssSurvivor":{"text":"A surviving spouse can get the larger benefit of the one who died, after 9 months of marriage (with exceptions, such as an accident), from 60 (50 with a disability).","source":"Social Security Administration, Who can get Survivor benefits","url":"https://www.ssa.gov/survivor/eligibility","checked":"2026-11-26"},"ssPartner":{"text":"Social Security counts a domestic partnership or civil union as a marriage only where the state would give the partner a spouse's share with no will. New York gives an unmarried partner no share, so a New York partnership gets no spouse or survivor benefit.","source":"Social Security Administration, POMS GN 00210.004 Non-Marital Legal Relationships; New York courts, Intestacy","url":"https://secure.ssa.gov/poms.nsf/lnx/0200210004","checked":"2026-11-26"}}};
/* ---------- js/math/socialsecurity.js: spousalExcess ---------- */
function spousalExcess(ownPia, otherPia, ss) {
  return Math.max(0, ss.spousalShare * (otherPia ?? 0) - (ownPia ?? 0));
}
/* ---------- js/math/estate.js ---------- */
// Estate and marriage (run Finish everything partly built, Part 11; M8E): the few numbers behind the estate basics,
// the inheritance simulator and Married or partners?. No imports, numbers in and out, so the game loads the same code
// (tools/game_estate_build.mjs writes game/core/estate.js from this file). The rules are data/reference-2026.json
// (estate) and their words and sources data/sources/estate-2026.json. Not legal or tax advice: every screen says
// "bring this to a lawyer".
//
//   who gets what      each thing you leave (cash, investments, a home, a traditional or Roth account, life
//                      insurance), shared among your people by the parts you tap: what each person receives, the gain
//                      the step-up in basis wipes out (value on the date of death less what you paid), what comes out
//                      of a traditional account as income later, the rule each person's inherited account follows and
//                      its last year; the estate against the federal line and the New York line and its cliff: esHeirs
//   the 10 years       an inherited traditional account taken out in year 1, spread evenly over the 10 years, or all
//                      in year 10 (only when the owner had not started required withdrawals): the federal tax on each
//                      way, on top of the heir's own income, from the caller's tax engine (taxOf): esTenYear
//   married or not     two people's pay taxed as two single returns or one joint return, the tax on job health cover
//                      for a partner who is not a spouse (imputed income), and the Social Security spousal top-up and
//                      survivor benefit marriage opens (spousalOf from the caller, js/math/socialsecurity.js): esCompare
//
// Empty is not zero: a value not typed gives no number, never one made from 0.

const estHas = x => x !== null && x !== undefined && x !== '' && !Number.isNaN(Number(x));
const estNum = x => (estHas(x) ? Number(x) : null);

const ES_KINDS = {
  cash: 'Cash and savings',
  taxable: 'Investments outside retirement',
  home: 'A home or land',
  pretax: 'Traditional IRA or 401(k)',
  roth: 'Roth IRA or Roth 401(k)',
  life: 'Life insurance',
  other: 'Something else',
};
// The kinds with a step-up in basis (a starting point for tax), and the kinds that pass by a beneficiary form.
const ES_BASIS = ['taxable', 'home'];
const ES_FORM = ['pretax', 'roth', 'life'];
// Who a person is to you, for the inherited account rules (IRS, Retirement topics: Beneficiary).
const ES_HEIRS = {
  spouse: 'My spouse',
  close: 'Not more than 10 years younger than me',
  child: 'My child under 21',
  disabled: 'Disabled or chronically ill',
  other: 'Anyone else',
};
// The rule an inherited traditional or Roth account follows, by who the heir is.
//   own: a spouse can treat it as their own. life: take it out over their own life expectancy (or the 10 years).
//   child: life expectancy until 21, then 10 years. ten: empty it by the end of the 10th year after the death.
const ES_RULE_OF = { spouse: 'own', close: 'life', disabled: 'life', child: 'child', other: 'ten' };

// ---- Who gets what ----
// items: [{ id, name, kind, value, basis, to: { personId: part } }]. A part is a weight (1 and 1 is half each).
// people: [{ id, name, heir }] (heir: a key of ES_HEIRS). deathYear: the year for the 10-year line. started: the owner
// had already started required withdrawals. rules: ref.estate.
function esHeirs({ items = [], people = [], deathYear = null, started = false } = {}, rules) {
  const R = rules || {}, ten = estNum(R.tenYears) ?? 10, minorAge = estNum(R.minorAge) ?? 21;
  const rows = people.map(p => ({ id: p.id, name: p.name, heir: ES_HEIRS[p.heir] ? p.heir : 'other', gets: 0, byKind: {}, erased: 0, basisUnknown: 0, pretax: 0, roth: 0, life: 0, items: [] }));
  const at = id => rows.find(r => r.id === id);
  const noValue = [], unassigned = [];
  let total = 0, toSpouse = 0, erased = 0;
  for (const it of items) {
    const v = estNum(it.value), kind = ES_KINDS[it.kind] ? it.kind : 'other';
    if (v == null) { noValue.push(it.id); continue; }
    total += v;
    const parts = Object.entries(it.to || {}).map(([id, w]) => [id, estNum(w) ?? 0]).filter(([id, w]) => w > 0 && at(id));
    const sum = parts.reduce((s, [, w]) => s + w, 0);
    if (!sum) { unassigned.push(it.id); continue; }
    const b = estNum(it.basis), gain = ES_BASIS.includes(kind) && b != null ? Math.max(0, v - b) : null;
    for (const [id, w] of parts) {
      const r = at(id), share = w / sum, amt = v * share;
      r.gets += amt;
      r.byKind[kind] = (r.byKind[kind] ?? 0) + amt;
      r.items.push({ id: it.id, name: it.name, kind, amount: amt, share });
      if (ES_BASIS.includes(kind)) { if (gain == null) r.basisUnknown += amt; else { r.erased += gain * share; erased += gain * share; } }
      if (kind === 'pretax') r.pretax += amt;
      if (kind === 'roth') r.roth += amt;
      if (kind === 'life') r.life += amt;
      if (r.heir === 'spouse') toSpouse += amt;
    }
  }
  const y = estNum(deathYear);
  for (const r of rows) {
    r.rule = ES_RULE_OF[r.heir];
    const accounts = r.pretax + r.roth;
    // The last year: 10 years after the death for 'ten'; for a child, 10 years after 21 (their age is not asked, so
    // no year is given); none for a spouse or a life-expectancy heir, who may take it out over their own life.
    r.lastYear = accounts > 0 && r.rule === 'ten' && y != null ? y + ten : null;
    r.yearly = accounts > 0 && r.rule === 'ten' && !!started && r.pretax > 0;
    r.childAge = r.rule === 'child' && accounts > 0 ? minorAge : null;
    r.cashLike = r.gets - r.pretax; // what is not income tax later: everything but the traditional account
  }
  const fed = estNum(R.federalExclusion), ny = estNum(R.nyExclusion), cliff = ny != null ? ny * (estNum(R.nyCliffShare) ?? 1.05) : null;
  const fedBase = total - toSpouse;
  const estate = {
    total, toSpouse, fedBase,
    federal: fed == null ? null : { line: fed, over: Math.max(0, fedBase - fed), room: Math.max(0, fed - fedBase), state: fedBase > fed ? 'over' : 'under' },
    ny: ny == null ? null : { line: ny, cliff, state: total > cliff ? 'over' : total > ny ? 'cliff' : 'under', room: Math.max(0, ny - total), toCliff: Math.max(0, cliff - total) },
  };
  return { ready: total > 0 && rows.length > 0, total, erased, people: rows, noValue, unassigned, assigned: total - items.filter(i => unassigned.includes(i.id)).reduce((s, i) => s + (estNum(i.value) ?? 0), 0), estate, deathYear: y, started: !!started };
}

// ---- The 10 years: one inherited traditional account ----
// balance: what the heir inherits. growth: a year, after inflation (0.05 is 5%). other: the heir's own yearly income
// before taxes. status: 'single', 'joint' or 'head'. taxOf(gross, status): the federal income tax on a year's income,
// from the caller's tax engine (the web app: income.js federalTax, M10; the game: retireTax). Each withdrawal comes at
// the end of its year. In today's dollars, at the 2026 brackets.
//   first: all at the end of year 1.  even: each year the balance divided by the years left, so year 10 empties it.
//   last: nothing until the end of year 10 (only when the owner had not started required withdrawals).
const ES_WAYS = { first: 'All in the first year', even: 'Spread over the 10 years', last: 'All in year 10' };
function esTenYear({ balance = null, growth = 0, other = null, status = 'single', years = 10, deathYear = null, started = false } = {}, taxOf) {
  const B = estNum(balance), g = estNum(growth) ?? 0, inc = estNum(other), N = Math.max(1, Math.round(estNum(years) ?? 10)), y0 = estNum(deathYear);
  if (!(B > 0) || inc == null || inc < 0 || typeof taxOf !== 'function') return { ready: false };
  const base = taxOf(inc, status);
  const run = way => {
    let left = B;
    const rows = [];
    for (let k = 1; k <= N; k++) {
      left *= 1 + g;
      const out = way === 'first' ? (k === 1 ? left : 0) : way === 'last' ? (k === N ? left : 0) : left / (N - k + 1);
      left -= out;
      const tax = out > 0 ? taxOf(inc + out, status) - base : 0;
      rows.push({ k, year: y0 != null ? y0 + k : null, out, tax });
    }
    const out = rows.reduce((s, r) => s + r.out, 0), tax = rows.reduce((s, r) => s + r.tax, 0);
    return { way, ready: !(way === 'last' && started), rows, out, tax, kept: out - tax, share: out > 0 ? tax / out : 0 };
  };
  const ways = Object.fromEntries(Object.keys(ES_WAYS).map(w => [w, run(w)]));
  const open = Object.values(ways).filter(w => w.ready);
  const best = open.reduce((a, w) => (w.tax < a.tax ? w : a), open[0]);
  return { ready: true, balance: B, growth: g, other: inc, status, years: N, lastYear: y0 != null ? y0 + N : null, started: !!started, ways, best: best.way, saves: Math.max(...open.map(w => w.tax)) - best.tax };
}

// ---- Married or partners? ----
// people: two, [{ name, pay, pia }]: pay a year before taxes; pia: the Social Security benefit at full retirement age
// a month, off the person's statement (or null). cover: the yearly value of job health cover one gives the other
// (imputed income when they are not married), coverBy: 0 or 1, whose job. taxOf(gross, status) as above; spousalOf(own,
// other): the spousal top-up a month (js/math/socialsecurity.js spousalExcess, with the reference data).
// Federal only: the New York joint brackets wait for Eli's check (STATUS), so no state tax is compared here.
function esCompare({ people = [], cover = 0, coverBy = 0 } = {}, { taxOf, spousalOf } = {}) {
  if (people.length !== 2 || typeof taxOf !== 'function') return { ready: false };
  const pay = people.map(p => estNum(p.pay));
  if (pay.some(v => v == null || v < 0)) return { ready: false, needs: 'pay' };
  const cv = Math.max(0, estNum(cover) ?? 0), by = coverBy === 1 ? 1 : 0;
  const single = pay.map(v => taxOf(v, 'single'));
  const coverTax = cv > 0 ? taxOf(pay[by] + cv, 'single') - single[by] : 0;
  const apart = single[0] + single[1] + coverTax, joint = taxOf(pay[0] + pay[1], 'joint');
  const pia = people.map(p => estNum(p.pia));
  const ss = pia.every(v => v != null) && typeof spousalOf === 'function'
    ? people.map((p, i) => { const own = pia[i], oth = pia[1 - i], top = spousalOf(own, oth); return { name: p.name, own, spousal: top, survivor: Math.max(own, oth), survivorMore: Math.max(0, oth - own) }; })
    : null;
  return {
    ready: true, pay, single, coverTax, cover: cv, coverBy: by, apart, joint,
    // more than 0: the joint return owes less (a marriage bonus); less than 0: it owes more (a marriage penalty)
    taxDiff: apart - joint,
    ss, ssYear: ss ? ss.reduce((s, r) => s + r.spousal, 0) * 12 : null,
  };
}
