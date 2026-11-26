// SPDX-License-Identifier: AGPL-3.0-only
// Your own path (run Not built, groups 1 to 5, Part 6): nine small private pages drawn by the one renderer
// (js/solo/calc.js), plus the chosen-family summary (js/solo/kin.js, its own page because it holds names).
// Every page is private (spec.private, boot's private mode shared with the hard moments): nothing is kept unless the
// person turns on Keep this, the tab title is neutral, and Leave this page sits in the top bar (js/solo/keepthis.js). The math is in js/math/ownpath.js (M8P) with tests;
// the dated fees in data/reference-2026.json; the dated resource lists in js/ownpath-sources.js. No cost here is a
// guess: a box for a cost has no amounts to tap and asks for the person's own quote.
import { h, money } from './shell.js';
import { keepCard, withExit } from './keepthis.js';
import { opTransitionOf, opPapersOf, opTwoSidesOf, opPackageOf, opOwnWayOf, opSearchFundOf, opPlanCheckOf, opFamilyOf, opAgeCareOf, OP_CHECKS } from '../math/ownpath.js';
import { HAVE } from '../benefits.js';
import { money as moneyOf } from '../format.js';
import { OP_CHECKED_WORDS, OP_CARE_HELP, OP_PAPERS_RULES, OP_PLAN_RULES, OP_FAMILY_RULES, OP_OWN_RULES, OP_TALK, OP_AGE_RULES, OP_KIN_RULES } from '../ownpath-sources.js';

const fee = v => moneyOf(v, { cents: v % 1 !== 0 }), big = v => money(Math.round(v)), pct = v => `${Math.round(v * 100)}%`;
const months = m => (m === 0 ? 'already there' : `${m} ${m === 1 ? 'month' : 'months'}`);
const SAVE = [{ key: 'saved', label: 'Saved toward it so far', picks: [0, 500, 1000, 2500, 5000], start: 0, optional: true }, { key: 'monthly', label: 'What you could put toward it a month', picks: [50, 100, 250, 500, 1000], optional: true, help: 'Leave it empty to see the amount only.' }];
const QUOTE = 'From a quote, a letter or a bill. No typical amounts here: costs differ too much to guess.';
const AGES = [22, 25, 30, 35, 40, 45, 50, 55, 60];

// A collapsed card of dated sources: who said it, in plain words, and where. Shown with its Checked on date.
export function sourcesCard(title, list, id = null) {
  return h('div.st-card', id ? { id } : {}, h('details.st-fold', {}, h('summary', {}, title),
    h('p.st-small.st-soft', {}, `Checked on ${OP_CHECKED_WORDS}, by search on each one's own site. Rules and fees change: check the page on the day you use it.`),
    h('ul.st-list', {}, list.map(r => h('li', {}, h('span.dot', {}, ''), h('span', { style: { minWidth: 0, overflowWrap: 'anywhere' } }, r.who ?? r.name, h('small', {}, r.said || r.what), r.phone ? h('small', { style: { fontWeight: 700 } }, r.phone) : null, h('small', {}, r.where)))))));
}
const saveRow = S => (S?.ready && S.left > 0 ? [['Still to find', S.saved ? `after the ${money(S.saved)} saved` : null, big(S.left)], ...(S.months != null ? [['At your monthly amount', `${money(S.monthly)} a month`, months(S.months)]] : [])] : S?.there ? [['Saved already covers it', null, 'already there']] : []);
const PRIVATE_FOLD = ['What this page keeps', 'Nothing, unless you turn on Keep this at the bottom. The answers stay in this open page only: not in the address, not on the device, not with a coach or a shared plan. Kept, a coach sees it only if you let them, and a partner\'s view and anything shared never do. Leave this page, at the top (or Shift three times), opens a weather page in this tab.'];

const STEP_WORDS = { court: 'The court petition', orderCopies: 'Certified copies of the court order', birth: 'The birth certificate', ssa: 'Social Security card', dmv: 'Driver license or ID', passport: 'Passport', other: 'Anything else you added' };
const STEP_SMALL = { court: { nyc: 'NYC Civil Court', ny: 'Supreme or County Court, New York State', other: 'your state\'s court, your number' }, orderCopies: 'the county clerk sets this fee: your number', ssa: 'a new card with the new name', other: 'your number' };

const PLAN_B = {
  account: ['A bank account in your name only', 'At a bank your family does not use, with statements online only.'],
  papers: ['Your own papers where you can reach them', 'ID, birth certificate, Social Security card, passport, or photos of each.'],
  phone: ['A phone in your name', 'Or know what moving your number off a family plan takes.'],
  health: ['Your health cover', 'A parent\'s plan can usually run to 26, and its claim letters go to the parent. In New York you can ask the insurer to send them elsewhere if sending them home could put you in danger.'],
  school: ['Student aid', 'If home is abusive or you are estranged from your parents, the FAFSA lets you apply without their information. The aid office asks for proof.'],
  place: ['A place to stay for a few weeks', 'And what getting there costs.'],
  people: ['One or two people who know', 'And the numbers below.'],
};
const CHECK = {
  noExclusion: ['No line in the plan papers leaves out transition care', 'Is there any exclusion for gender transition care in the plan papers?'],
  hormones: ['Hormones are covered at the pharmacy', 'Are hormones covered, and at what tier?'],
  surgery: ['Surgery is covered when your doctor says it is needed', 'Which surgeries are covered, and what approval do they need first?'],
  mental: ['Mental health care is covered', 'What does mental health care cost me in this plan?'],
  labs: ['Visits and lab work for this care are covered', 'Are visits and lab work for transition care covered?'],
  leave: ['Short-term leave covers time off for surgery', 'Does short-term leave cover recovery from surgery, and how much of my pay?'],
  documents: ['The plan papers say it in writing', 'Where in the plan papers is this written?'],
  fullyInsured: ['The plan is bought from an insurer', 'Is our plan fully insured or self-funded?', 'New York\'s rules on this care reach plans bought from an insurer, not a self-funded one.'],
};
export const OWN_SPECS = {
  carecost: {
    private: true, keep: keepCard, drawn: () => withExit({ neutral: true }),
    title: 'What would my care cost me?', why: 'Your quotes, your plan\'s deductible and share, and any help from a fund. It shows what the plan pays, what is yours, and how long saving for it takes.',
    fields: [{ key: 'covered', label: 'Quotes for care your plan covers', picks: [], help: QUOTE },
      { key: 'coinsurance', label: 'Your share after the deductible', options: [0, 0.1, 0.2, 0.3, 0.4, 0.5].map(v => [pct(v), v]), help: 'Coinsurance, on your plan\'s summary of benefits.' },
      { key: 'deductible', label: 'Your deductible', picks: [], start: 0, optional: true, help: 'On your plan\'s summary. $0 if it has none.' },
      { key: 'oopMax', label: 'Your out-of-pocket max', picks: [], optional: true, help: 'The most you pay in a plan year. Leave it empty if you do not know it.' },
      { key: 'metSoFar', label: 'Paid toward it already this plan year', picks: [], start: 0, optional: true },
      { key: 'notCovered', label: 'Costs the plan does not cover', picks: [], start: 0, optional: true, help: 'Travel, nights near the surgeon, time off without pay, care outside the plan.' },
      { key: 'help', label: 'Help from a fund or a grant', picks: [], start: 0, optional: true, help: 'Only an award you have. The funds are listed below.' }, ...SAVE],
    run: v => opTransitionOf(v),
    answer: R => ({ lead: 'What is yours to pay, in your numbers', big: big(R.yours), line: `Of ${money(R.total)} in all, the plan pays ${big(R.planPays)}.${R.capped ? ' Your out-of-pocket max caps your share of the covered care.' : ''}${R.help ? ` ${money(R.help)} of help comes off.` : ''}`,
      rows: [['The plan pays', null, big(R.planPays)], ['Your share of the covered care', 'deductible, then your share', big(R.coveredYours)], ['What the plan does not cover', null, big(R.notCovered)], ...(R.help ? [['Help from a fund', null, `${big(R.help)} less`]] : []), ...saveRow(R.save)],
      fold: [['How it is worked out', 'The deductible comes first, then your share of the rest. Your out-of-pocket max is the most you pay for covered care in a plan year. What the plan does not cover is all yours, less any help you were awarded.', 'Before care, the plan can ask for approval first (prior authorization). A no can be appealed: New York\'s Department of Financial Services says so for plans bought in New York.'], PRIVATE_FOLD] }),
    more: () => [sourcesCard('Help paying for care', OP_CARE_HELP, 'carehelp'), sourcesCard('What the rules say about plans', OP_PLAN_RULES)],
  },
  idpapers: {
    private: true, keep: keepCard, drawn: () => withExit({ neutral: true }),
    title: 'What does changing my name and marker cost?', why: 'Each step, who sets it, and its fee. New York first: the court, the birth certificate, Social Security, the DMV and the passport.',
    fields: [{ key: 'court', label: 'Where you file', options: [['New York City', 'nyc'], ['New York, outside the city', 'ny'], ['Another state', 'other']] },
      { key: 'courtFee', label: 'Your state\'s court fee', picks: [], when: v => v.court === 'other', help: 'From your court\'s own page. The other states\' fees are not in here yet.' },
      { key: 'born', label: 'Where you were born', options: [['New York City', 'nyc'], ['New York, outside the city', 'nys'], ['Somewhere else', 'other']] },
      { key: 'birthFee', label: 'The birth certificate fee you were told', picks: [], when: v => v.born && v.born !== 'nys', optional: true, help: 'New York City\'s own pages differ ($0 or $40). Another state: its own office.' },
      { key: 'copies', label: 'Extra copies of the new birth certificate', unit: 'copies', options: [0, 1, 2, 3].map(n => [String(n), n]), start: 0, when: v => v.born === 'nys', help: 'One copy comes free.' },
      { key: 'idDoc', label: 'At the DMV', options: [['A driver license', 'license'], ['A non-driver ID', 'id'], ['Not now', 'none']], start: 'none' },
      { key: 'passport', label: 'Your passport', options: [['Issued under a year ago', 'within'], ['Older, renewing', 'renew'], ['A first one', 'new'], ['Not now', 'none']], start: 'none' },
      { key: 'orderCopies', label: 'Certified copies of the court order', picks: [], optional: true, help: 'Each office wants one. The county clerk sets the fee.' },
      { key: 'other', label: 'Anything else', picks: [], optional: true, help: 'Bank, school, work, a lawyer, travel to the court.' }],
    run: (v, ref) => opPapersOf({ court: v.court, born: v.born, id: v.idDoc, passport: v.passport, copies: v.copies, own: { court: v.courtFee, orderCopies: v.orderCopies, birth: v.birthFee, other: v.other } }, ref.idChangeNY),
    answer: (R, V) => ({ lead: 'The fees you can count so far', big: fee(R.total), line: `${fee(R.dated)} is from the offices' own pages${R.yours ? ` and ${fee(R.yours)} is your numbers` : ''}.${R.toAdd.length ? ` ${R.toAdd.length === 1 ? 'One step needs' : `${R.toAdd.length} steps need`} your number before the total is whole.` : ''}`,
      rows: R.steps.map(s => [STEP_WORDS[s.key], s.key === 'court' ? STEP_SMALL.court[V.court] : s.from === 'dated' ? 'from the office\'s own page' : STEP_SMALL[s.key] ?? 'your number', s.fee == null ? 'add your number' : s.fee === 0 ? 'no fee' : fee(s.fee)]),
      small: 'Fee waivers: you can ask the court to waive its fee. Trans Lifeline\'s Microgrants help pay for US documents (below).',
      fold: [['The passport, today', OP_PAPERS_RULES.find(r => r.key === 'passport').said], ['Social Security', OP_PAPERS_RULES.find(r => r.key === 'ssa').said], PRIVATE_FOLD] }),
    more: () => [sourcesCard('Who sets each step, in their own words', OP_PAPERS_RULES, 'papersrules'), sourcesCard('Help paying for it', OP_CARE_HELP.filter(o => /Microgrants/.test(o.name)))],
  },
  twosides: {
    private: true, keep: keepCard, drawn: () => withExit({ neutral: true }),
    title: 'What does each side cost me?', why: 'Only your numbers: what staying quiet costs you, next to what being out could cost you. Money is one side of this; the timing and the choice are yours.',
    fields: [{ key: 'quietMonthly', label: 'What staying quiet costs you a month', picks: [], help: 'A second phone, a place to be yourself, travel to see people, things paid in cash so nobody sees, care paid outside insurance. $0 is an answer.' },
      { key: 'quietOnce', label: 'And once', picks: [], start: 0, optional: true },
      { key: 'outMonthly', label: 'What being out could cost you a month', picks: [], help: 'Family help that might stop, a move, a new phone plan in your name. $0 is an answer.' },
      { key: 'outOnce', label: 'And once', picks: [], start: 0, optional: true, help: 'A deposit, moving, papers.' }],
    picks: [{ key: 'years', label: 'Over', start: 1, options: [1, 3, 5, 10].map(y => [`${y} ${y === 1 ? 'year' : 'years'}`, y]) }],
    run: v => opTwoSidesOf(v),
    answer: R => ({ lead: `Over ${R.years} ${R.years === 1 ? 'year' : 'years'}, in your own numbers`, big: R.more === 'even' ? 'The same' : `${big(R.gap)} apart`,
      line: `Staying quiet: ${big(R.quiet)}. Being out: ${big(R.out)}.`, rows: [['Staying quiet', null, big(R.quiet)], ['Being out', null, big(R.out)]],
      small: 'This counts dollars only. Safety, people and peace are yours to weigh, and so is when.', fold: [PRIVATE_FOLD] }),
    more: () => [sourcesCard('People to talk to', OP_TALK)],
  },
  package: {
    private: true, keep: keepCard, drawn: () => withExit({ neutral: true }),
    title: 'What is my whole package worth?', why: 'An inclusive employer\'s benefits are money too. Put both jobs side by side, pay and benefits in dollars, before a move.',
    fields: [{ key: 'payNow', label: 'Pay now, a year before taxes', picks: [40000, 60000, 80000, 100000, 150000] },
      { key: 'healthNow', label: 'What your employer pays toward your health cover, a month', picks: [], start: 0, optional: true, help: 'On your benefits statement or pay stub.' },
      { key: 'careNow', label: 'Care your plan covers that you would pay yourself, a year', picks: [], start: 0, optional: true, help: 'Hormones, visits, a surgery you have planned: your quotes.' },
      { key: 'familyNow', label: 'A family-building benefit, a year', picks: [], start: 0, optional: true, help: 'Fertility, surrogacy or adoption help.' },
      { key: 'otherNow', label: 'Anything else in dollars, a year', picks: [], start: 0, optional: true, help: 'Partner cover, paid leave, a match.' },
      { key: 'payNext', label: 'Pay at the new job, a year', picks: [40000, 60000, 80000, 100000, 150000] },
      { key: 'healthNext', label: 'New job: toward your health cover, a month', picks: [], start: 0, optional: true },
      { key: 'careNext', label: 'New job: care its plan covers, a year', picks: [], start: 0, optional: true, help: 'The plan check page helps you find out.' },
      { key: 'familyNext', label: 'New job: family-building benefit, a year', picks: [], start: 0, optional: true },
      { key: 'otherNext', label: 'New job: anything else, a year', picks: [], start: 0, optional: true }],
    run: v => opPackageOf({ now: { pay: v.payNow, health: v.healthNow, care: v.careNow, family: v.familyNow, other: v.otherNow }, next: { pay: v.payNext, health: v.healthNext, care: v.careNext, family: v.familyNext, other: v.otherNext } }),
    answer: R => ({ lead: R.gap > 0 ? 'The new job is worth less, all in, by' : R.gap < 0 ? 'The new job is worth more, all in, by' : 'All in, the two come out', big: R.gap === 0 ? 'Even' : `${big(Math.abs(R.gap))} a year`,
      line: `Now: ${big(R.now.total)} (${big(R.now.benefits)} of it benefits). New: ${big(R.next.total)} (${big(R.next.benefits)} benefits).${R.payToMatch ? ` To match, the new pay would be about ${big(R.payToMatch)}.` : ''}`,
      rows: [['Pay', null, `${big(R.now.pay)} · ${big(R.next.pay)}`], ['Health cover from the employer', null, `${big(R.now.health)} · ${big(R.next.health)}`], ['Care the plan covers', null, `${big(R.now.care)} · ${big(R.next.care)}`], ['Family building', null, `${big(R.now.family)} · ${big(R.next.family)}`], ['Anything else', null, `${big(R.now.other)} · ${big(R.next.other)}`]],
      small: 'Each row: now · new. Benefits are counted at their dollars, before tax.',
      fold: [['Taxes and partner cover', 'Pay is taxed and most health benefits are not, so a dollar of benefits is often worth more than a dollar of pay.', 'Health cover for a partner who is not your spouse or tax dependent counts as taxable pay under federal rules (IRS, Box 12 code DD on the W-2, checked Nov 25 2026).', 'In New York, the rules on transition care reach plans bought from an insurer, not a self-funded employer plan (NY Department of Financial Services).'], PRIVATE_FOLD] }),
    more: () => [sourcesCard('What the rules say about plans', OP_PLAN_RULES)],
  },
  ownway: {
    private: true, keep: keepCard, drawn: () => withExit({ neutral: true }),
    title: 'How long could I stand on my own?', why: 'If family money stopped, how many months your own money carries you, and a quiet Plan B. The timing stays yours.',
    fields: [{ key: 'cash', label: 'Money you control yourself', picks: [0, 500, 1000, 2500, 5000], help: 'In an account only you can see or reach.' },
      { key: 'ownCosts', label: 'What life would cost you a month, paid by you alone', picks: [], help: 'Rent, food, phone, insurance, school, getting around. Your own numbers.' },
      { key: 'stillIn', label: 'Your own pay a month', picks: [0, 500, 1000, 2000], start: 0, optional: true },
      { key: 'onFamilyPlan', label: 'On a parent\'s health plan?', options: [['Yes', true], ['No', false]], optional: true },
      { key: 'student', label: 'In school, or going?', options: [['Yes', true], ['No', false]], optional: true }],
    waiting: 'Two numbers above and it appears. Rough is fine.',
    run: v => opOwnWayOf(v),
    answer: R => ({ lead: R.covered ? 'Your own pay covers it' : 'Your own money carries you about', big: R.covered ? 'It keeps going' : R.whole >= 1 ? `${R.whole} ${R.whole === 1 ? 'month' : 'months'}` : 'Under a month',
      line: R.covered ? 'What comes in covers what goes out, so your money is not drawn down.' : `${R.whole >= 1 ? `Through ${R.date}. ` : ''}${money(Math.round(R.gap))} a month more goes out than comes in. Each $1,000 you add is about ${Math.round(R.perThousand)} days.`,
      rows: R.planB.map(k => [PLAN_B[k][0], PLAN_B[k][1], '']),
      small: 'A Plan B is quiet. It is there so nothing has to happen before you are ready.', fold: [PRIVATE_FOLD] }),
    more: () => [sourcesCard('What the rules say', OP_OWN_RULES), sourcesCard('People to talk to', OP_TALK, 'talk')],
  },
  searchfund: {
    private: true, keep: keepCard, drawn: () => withExit({ neutral: true }),
    title: 'How big an emergency fund, for a longer search?', why: 'The usual target, with the extra months you add because a job search can take you longer. How many is yours to set.',
    fields: [{ key: 'age', label: 'Your age', options: AGES.map(a => [String(a), a]) }, { key: 'spending', plan: 'spending', label: 'What you spend in a month, all in', picks: [2000, 3000, 4000, 5000, 6500] },
      { key: 'cash', label: 'Cash set aside for emergencies', picks: [0, 1000, 5000, 10000, 20000], optional: true },
      { key: 'extraMonths', label: 'Months you add for a longer search', unit: 'months', options: [0, 1, 2, 3, 4, 6, 9, 12].map(n => [String(n), n]), start: 0, help: 'From what searches have looked like for you, in your field and your town.' }],
    run: v => opSearchFundOf(v),
    answer: R => ({ lead: `${R.months} months of spending`, big: big(R.target), line: `The Rule of 5 (age / 5) is ${R.baseMonths} months: ${big(R.baseTarget)}.${R.extraMonths ? ` Your ${R.extraMonths} more ${R.extraMonths === 1 ? 'month adds' : 'months add'} ${big(R.extra)}.` : ''}${R.gap != null ? (R.gap > 0 ? ` You have ${big(R.cash)}, ${big(R.gap)} to go.` : ` Your ${big(R.cash)} covers it.`) : ''}`,
      rows: [['The usual target', `${R.baseMonths} months`, big(R.baseTarget)], ['With your longer search', `${R.months} months`, big(R.target)], ...(R.covers != null ? [['What you have now covers', null, `${R.covers.toFixed(1)} months`]] : [])],
      fold: [['Where the target comes from', 'The whole plan uses the Rule of 5 for the big emergency fund: your age divided by 5, in months of spending. This page adds the months you choose on top, and the rest of the plan is unchanged.'], PRIVATE_FOLD] }),
  },
  plancheck: {
    private: true, keep: keepCard, drawn: () => withExit({ neutral: true }),
    title: 'Does this health plan cover transition care?', why: 'Eight things to look for in a plan, tapped as you find them. What is left is your list of questions for HR or the insurer.',
    fields: OP_CHECKS.map(k => ({ key: k, label: CHECK[k][0], options: HAVE.map(a => [a, a]), optional: true, help: CHECK[k][2] ?? null })),
    waiting: 'Tap an answer above and your list builds here.',
    run: v => opPlanCheckOf(v),
    answer: R => ({ lead: `${R.answered} of ${R.of} looked at`, big: `${R.yes.length} of ${R.of} found`, line: R.ask.length ? `${R.ask.length} ${R.ask.length === 1 ? 'thing' : 'things'} to ask about.` : 'Everything on the list is there, in writing.',
      rows: R.ask.map(k => [CHECK[k][1], null, '']), small: 'Ask for the plan\'s summary of benefits and its certificate of coverage. The answers are in writing there.', fold: [PRIVATE_FOLD] }),
    more: () => [sourcesCard('Where this list comes from', OP_PLAN_RULES)],
  },
  family: {
    private: true, keep: keepCard, drawn: () => withExit({ neutral: true }),
    title: 'What would growing our family cost?', why: 'IVF, surrogacy, adoption or fostering, on your quotes: what insurance and an employer pay, the adoption credit, and the months to save.',
    fields: [{ key: 'path', label: 'The path', options: [['IVF', 'ivf'], ['Surrogacy', 'surrogacy'], ['Adoption', 'adoption'], ['Fostering', 'foster']] },
      { key: 'cost', label: 'The whole cost from your quotes', picks: [], help: 'Clinic or agency, legal fees, medicine, travel. ' + QUOTE },
      { key: 'insurance', label: 'What insurance pays', picks: [], start: 0, optional: true },
      { key: 'employer', label: 'What an employer benefit pays', picks: [], start: 0, optional: true },
      { key: 'magi', label: 'Household income for the year (modified AGI)', picks: [50000, 100000, 150000, 250000, 300000], optional: true, when: v => v.path === 'adoption', help: 'The adoption credit shrinks at higher incomes. Leave it empty to see the full credit.' }, ...SAVE],
    run: (v, ref) => opFamilyOf(v, ref.adoptionCredit),
    answer: R => ({ lead: 'What is yours to pay', big: big(R.yours), line: `Of ${money(R.cost)}, ${big(R.paid)} is paid by insurance and an employer.${R.credit?.credit > 0 ? ` The adoption credit could be up to ${big(R.credit.credit)} at tax time, which would leave ${big(R.afterCredit)}.` : ''}`,
      rows: [...(R.credit ? [['Adoption credit, 2026', R.credit.magiKnown && R.credit.share < 1 ? `${pct(R.credit.share)} of it at your income` : 'up to $17,670 a child', big(R.credit.credit)], ['Of it, can come back with no tax owed', null, big(R.credit.refundable)], ['The rest lowers tax you owe', 'and can carry forward', big(R.credit.againstTax)]] : []), ...saveRow(R.save)],
      fold: [['The rules this uses', ...OP_FAMILY_RULES.map(r => `${r.who}: ${r.said}`)], PRIVATE_FOLD] }),
    more: () => [sourcesCard('What the rules say', OP_FAMILY_RULES)],
  },
  agecare: {
    private: true, keep: keepCard, drawn: () => withExit({ neutral: true }),
    title: 'What could care later in life cost me?', why: 'A month of care for some years, less what cover pays, in today\'s dollars, and what to set aside each month to have it.',
    fields: [{ key: 'monthly', label: 'Care a month, from a quote', picks: [], help: 'Home care, assisted living or a nursing home near you. ' + QUOTE },
      { key: 'years', label: 'For how many years', options: [1, 2, 3, 5, 10].map(n => [String(n), n]) },
      { key: 'covered', label: 'What cover pays a month', picks: [], start: 0, optional: true, help: 'Long-term care insurance, a pension, help from your people.' },
      { key: 'saved', label: 'Set aside for it already', picks: [0, 10000, 50000, 100000], start: 0, optional: true },
      { key: 'yearsUntil', label: 'Years until you might need it', unit: 'years', options: [5, 10, 15, 20, 25, 30, 40].map(n => [String(n), n]), optional: true }],
    run: v => opAgeCareOf(v),
    answer: R => ({ lead: 'Care for those years, in today\'s dollars', big: big(R.need), line: R.there ? 'What you have set aside covers it.' : R.perMonth != null ? `Setting aside ${big(R.perMonth)} a month for ${R.yearsUntil} years gets you there, before any growth.` : `${big(R.left)} still to find. Pick the years until you might need it to see a month.`,
      small: 'Who decides for you if you cannot: the chosen-family summary (kin.html) puts it in words for a lawyer.', fold: [PRIVATE_FOLD] }),
    more: () => [sourcesCard('What pays for care, and who helps', OP_AGE_RULES), sourcesCard('Papers for chosen family', OP_KIN_RULES)],
  },
};

export { PLAN_B, CHECK };
