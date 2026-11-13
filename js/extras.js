// SPDX-License-Identifier: AGPL-3.0-only
// Six small tools on the self-serve journey. Pure: no DOM. The numbers come from the journey's own what-if (the same
// engine as the plan), so nothing here is a second way to work out a date.
import { whatIf } from './journey.js';

// ---------- How much more could I spend? The most a month that still leaves work optional by an age. ----------
export const SPEND_AGES = [55, 60, 65, 67];
export function spendMoreOf(doc, ref, priors, { age, byAge = 65, now = new Date(), run = whatIf } = {}) {
  const target = (byAge - age) * 12, base = run(doc, ref, priors, {}, { now });
  if (!base || age == null || target <= 0) return null;
  if (base.before == null || base.before > target) return { amount: 0, byAge, on: false };
  const ok = x => { const w = run(doc, ref, priors, { spendLess: -x }, { now }); return w && w.after != null && w.after <= target; };
  let lo = 0, hi = Math.max(0, Math.floor(base.surplus ?? 0));
  if (hi > 0 && ok(hi)) lo = hi;
  else for (let i = 0; i < 12 && hi - lo > 10; i++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; }
  return { amount: Math.floor(lo / 10) * 10, byAge, on: true };
}

// ---------- What fees cost: the same money grown with and without a yearly fee. ----------
export const FEE_PICKS = [0.0005, 0.0025, 0.005, 0.01, 0.015, 0.02];
export const FEE_YEARS = [10, 20, 30, 40];
const grown = (balance, yearly, years, r) => balance * (1 + r) ** years + (r === 0 ? yearly * years : yearly * (((1 + r) ** years - 1) / r));
export function feesOf({ balance = 0, monthly = 0, years = 30, ret = 0.05, fee = 0.01, low = 0.0005 } = {}) {
  const yearly = monthly * 12, without = grown(balance, yearly, years, ret - low), withFee = grown(balance, yearly, years, ret - fee);
  return { withFee, without, cost: Math.max(0, without - withFee), share: without > 0 ? Math.max(0, without - withFee) / without : 0, years, fee, low };
}

// ---------- Which move fits my life? Each move's date change is worked out from this household's numbers. Its usual
// effect on the rest of life (-1 costs you, 0 about the same, 1 helps) comes from the SPARKS tradeoff notes. ----------
export const LIFE_SIDES = [['time', 'Free time'], ['stress', 'Calm'], ['people', 'Time with people'], ['health', 'Health'], ['freedom', 'Freedom to move'], ['cushion', 'Cushion']];
export const MOVES = [
  { id: 'raise', name: 'Earn 10% more at work', size: x => ({ earnMore: 0.10 * x.takeHome }), sides: { time: -1, stress: 0, people: -1, health: -1, freedom: -1, cushion: 1 } },
  { id: 'trim', name: 'Spend 10% less', size: x => ({ spendLess: 0.10 * x.spending }), sides: { time: 1, stress: 0, people: 1, health: 1, freedom: 1, cushion: 1 } },
  { id: 'side', name: 'Side work, $750 a month', size: () => ({ earnMore: 750 }), sides: { time: -1, stress: 0, people: -1, health: -1, freedom: 0, cushion: 1 } },
  { id: 'move', name: 'Move somewhere a quarter cheaper', size: x => ({ spendLess: 0.25 * x.spending }), sides: { time: 1, stress: 1, people: 0, health: 1, freedom: 1, cushion: 1 } },
  { id: 'hack', name: 'Share or rent out part of your home', size: x => ({ spendLess: 0.4 * (x.housing ?? 0.3 * x.spending) }), sides: { time: -1, stress: 0, people: 0, health: 0, freedom: -1, cushion: 1 } },
  { id: 'taxes', name: 'Tune your taxes (a 3% lift, a guess)', size: x => ({ earnMore: 0.03 * x.takeHome }), sides: { time: 0, stress: 0, people: 0, health: 0, freedom: 0, cushion: 0 } },
];
export function movesOf(doc, ref, priors, pl, { care = [], housing = null, now = new Date(), run = whatIf } = {}) {
  const x = { takeHome: pl?.m?.inputs?.takeHome ?? 0, spending: pl?.m?.inputs?.spending ?? 0, housing };
  if (!(x.takeHome > 0) || !(x.spending > 0)) return [];
  return MOVES.map(m => {
    const change = m.size(x), w = run(doc, ref, priors, change, { now });
    const costs = care.filter(k => m.sides[k] < 0);
    return { id: m.id, name: m.name, amount: Math.round(change.earnMore ?? change.spendLess ?? 0), kind: change.earnMore != null ? 'more' : 'less', moved: w?.moved ?? null, date: w?.date ?? null, sides: m.sides, costs, fits: costs.length === 0 };
  }).sort((a, b) => (b.fits - a.fits) || ((b.moved ?? -1) - (a.moved ?? -1)));
}

// ---------- The checkup: what a planner would ask about that is not a number. ----------
export const CHECK_ANSWERS = [['yes', 'Have it'], ['no', 'Not yet'], ['unsure', 'Not sure'], ['na', 'Does not apply']];
export const CHECKUP = [
  { id: 'match', q: 'I take every dollar of my employer\'s match', next: 'Log in to your plan at work and set your contribution to at least the match.' },
  { id: 'term', q: 'If someone relies on my income, I have term life cover', next: 'Get two term life quotes. Cover of 10 to 12 times your pay is a common starting point.' },
  { id: 'disability', q: 'I have disability cover (most often through work)', next: 'Check your benefits for long-term disability and what share of pay it replaces.' },
  { id: 'home', q: 'I have renters or homeowners insurance', next: 'Price a renters policy. It is often under $20 a month.' },
  { id: 'named', q: 'Every account and policy names who gets it', next: 'Log in to each retirement account and policy and fill in the beneficiary.' },
  { id: 'will', q: 'I have a will', next: 'A basic will can be done online in an evening. Kids or property make it matter more.' },
  { id: 'proxy', q: 'Someone is named to make health choices for me if I cannot', next: 'Fill in your state\'s health care proxy form. It is free.' },
  { id: 'freeze', q: 'My credit is frozen at all three bureaus', next: 'Freeze it at Equifax, Experian and TransUnion. It is free and takes about ten minutes each.' },
  { id: 'old', q: 'I know where every old 401(k) is', next: 'List past jobs and find each plan. Moving them into one place makes them easier to watch.' },
  { id: 'hsa', q: 'If my health plan allows an HSA, I use it', next: 'Check whether your plan is HSA-eligible at the next open enrollment.' },
  { id: 'withhold', q: 'My last tax refund or bill was small', next: 'Run the IRS withholding estimator and update your W-4 if it was large either way.' },
];
export function checkupOf(answers = {}) {
  const asked = CHECKUP.filter(c => answers[c.id] !== 'na');
  const have = asked.filter(c => answers[c.id] === 'yes').length, todo = asked.filter(c => answers[c.id] === 'no' || answers[c.id] === 'unsure');
  return { have, of: asked.length, answered: CHECKUP.filter(c => answers[c.id]).length, todo };
}

// ---------- What actually happens: the real order of events when a money fear comes true. ----------
export const HAPPENS = [
  { id: 'cardLate', title: 'I miss a credit card payment', steps: [
    'Day 1: the payment is late. Most cards add a late fee to the next statement.',
    'Up to day 29: nothing goes on your credit reports. Pay in this window and the reports never show it.',
    'Day 30: the card can report it as 30 days late. That mark can stay for seven years, and it fades in weight over time.',
    'Day 60: the card can raise your rate to its penalty rate. Six on-time payments in a row brings the old rate back on the balance you had.',
    'Around day 180: the card can close the account and pass the debt to a collector. You still owe it.',
    'What to do first: pay the minimum today, then call and ask them to waive the fee. A first miss is often waived.'] },
  { id: 'collector', title: 'A debt collector calls me', steps: [
    'They may call between 8 in the morning and 9 at night, your time. Not at work if you tell them your employer does not allow it.',
    'Within five days of first contact they owe you a written notice: the amount, and who it is owed to.',
    'You have 30 days from that notice to dispute it in writing. Once you do, they stop collecting until they prove the debt.',
    'You can tell them in writing to stop contacting you. They can still take you to court, so do not ignore court papers.',
    'An old debt can be past the time limit to sue in your state. A payment on it can restart that clock.',
    'What to do first: say "send me the written notice", write down the date and the name, and pay nothing on the first call.'] },
  { id: 'taxBill', title: 'I owe taxes I cannot pay', steps: [
    'File on time anyway. The charge for not filing is about ten times the charge for not paying.',
    'Not filing: 5% of what you owe for each month late, up to 25%.',
    'Not paying: half a percent a month on what is unpaid, plus interest.',
    'The IRS sends letters by mail first. It does not open with a phone call, a text, or a demand for gift cards.',
    'You can set up a monthly payment plan on the IRS website, most of the time without talking to anyone.',
    'What to do first: file, pay what you can with the return, and set up the plan for the rest.'] },
  { id: 'lostJob', title: 'My job ends', steps: [
    'Day 1: ask HR, in writing, for the date of your last paycheck, whether unused vacation is paid out, any severance terms, and the day your health cover ends (often the last day of that month).',
    'The first week: file for unemployment. In most states the clock starts the week you file, not the day the job ended, so waiting costs weeks.',
    'Health cover: losing a job plan opens a 60-day window to pick a Marketplace plan. COBRA keeps your same plan, usually for up to 18 months, at the full price plus a small fee. You have 60 days to choose COBRA and it reaches back to the day cover ended.',
    'Your 401(k) stays yours (the vested part). It can sit where it is or roll into an IRA. A loan from the plan can come due: what is not repaid by your tax filing deadline is taxed as a withdrawal.',
    'Severance is taxed like pay. Unemployment benefits are taxed by the federal government too, and nothing is held back unless you ask.',
    'What to do first: file for unemployment today, then write down the day your health cover ends.'] },
  { id: 'medicalBill', title: 'A medical bill I cannot pay arrives', steps: [
    'Before paying anything, ask for an itemized bill and set it beside the statement from your insurer. Billing errors are common.',
    'Ask the billing office for its financial assistance form. Nonprofit hospitals are required to have a written policy for it, and many forgive part or all of a bill by income.',
    'Ask for a payment plan with no interest. Most hospitals offer one when asked.',
    'Credit reports: the three bureaus wait a year before an unpaid medical collection can show, leave out ones under $500, and take a medical collection off once it is paid.',
    'A medical bill on a credit card becomes ordinary card debt, at the card\'s rate, and loses these protections.',
    'What to do first: call the billing office and ask for the itemized bill and the financial assistance form.'] },
  { id: 'overdraft', title: 'My checking account goes below zero', steps: [
    'The bank can pay the charge and add an overdraft fee, often around $35, or decline it.',
    'For debit card swipes and ATM withdrawals, a bank can only charge an overdraft fee if you opted in. Opted out, the card is declined at no cost.',
    'Checks and automatic payments are different: the bank can charge a fee either way.',
    'Left negative for weeks, the bank can close the account and report it to ChexSystems. That record can make it hard to open an account elsewhere for up to five years.',
    'Many banks refund a first fee when asked, and several large banks have dropped the fee or give a one-day grace period.',
    'What to do first: bring the balance back to zero, call and ask for the fee back, and turn off overdraft cover for your debit card.'] },
  { id: 'studentLate', title: 'I miss a federal student loan payment', steps: [
    'Day 1: the loan is past due. Late fees are rare on federal loans.',
    'Day 90: the servicer reports it to the credit bureaus.',
    'Day 270: the loan is in default. The whole balance comes due, and you lose access to payment plans, pauses and new federal aid.',
    'In default, the government can take up to 15% of your take-home pay and hold back tax refunds, with no court order.',
    'Two ways back: rehabilitation (nine agreed payments in ten months, which also removes the default from your credit reports) or consolidating into a new loan.',
    'What to do first: call your servicer before day 90 and ask for a payment tied to your income, or a pause.'] },
  { id: 'fraud', title: 'Someone uses my card or my name', steps: [
    'A credit card: by law you owe at most $50 of charges you did not make, and in practice $0. Call the number on the card.',
    'A debit card: report it within 2 business days and the most you can lose is $50. Within 60 days of the statement, up to $500. After that, the bank does not have to give any of it back.',
    'Freeze your credit at Equifax, Experian and TransUnion. It is free, takes minutes online, and stops new accounts in your name. You can lift it when you apply for something.',
    'Report it at identitytheft.gov. It builds a recovery plan and the report you may need for banks and lenders.',
    'Change the password on your email first, then your bank. Email is how the other passwords get reset.',
    'What to do first: call the card or bank now. The clock on what you can lose starts when you find out.'] },
];

// ---------- A money meeting for two: each answers alone, then the answers sit side by side. ----------
export const MEET = [
  { id: 'for', q: 'Money is mostly for', a: ['Safety', 'Freedom', 'Experiences', 'Family', 'Giving'] },
  { id: 'windfall', q: 'A surprise $5,000 goes to', a: ['Debt', 'Savings', 'Investing', 'Something fun', 'A bit of each'] },
  { id: 'worry', q: 'My biggest money worry', a: ['Debt', 'Not enough saved', 'Losing a job', 'A big bill', 'How we spend'] },
  { id: 'free', q: 'Either of us can spend this much without checking in', a: ['$50', '$100', '$250', '$500', '$1,000'] },
  { id: 'accounts', q: 'Our accounts', a: ['All shared', 'Mostly shared', 'Shared for bills only', 'All separate'] },
  { id: 'stop', q: 'Work becomes optional by', a: ['Our 50s', '60', '65', 'I have not thought about it'] },
  { id: 'goal', q: 'Our next big goal', a: ['A home', 'Kids', 'Travel', 'Pay off debt', 'A job change'] },
  { id: 'who', q: 'Day to day, the money is handled by', a: ['Me', 'You', 'Both of us', 'Nobody really'] },
];
export function meetOf(mine = {}, theirs = {}) {
  const rows = MEET.map(m => ({ id: m.id, q: m.q, mine: mine[m.id] ?? null, theirs: theirs[m.id] ?? null })).map(r => ({ ...r, same: r.mine != null && r.mine === r.theirs }));
  // "Me" and "You" point at each other, so they agree when they differ.
  const who = rows.find(r => r.id === 'who'); if (who && who.mine && who.theirs) who.same = (who.mine === 'Me' && who.theirs === 'You') || (who.mine === 'You' && who.theirs === 'Me') || (who.mine === who.theirs && !['Me', 'You'].includes(who.mine));
  const both = rows.filter(r => r.mine && r.theirs);
  return { rows, done: both.length === MEET.length, same: both.filter(r => r.same).length, differ: both.filter(r => !r.same) };
}
export const packMeet = a => btoa(JSON.stringify(a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export function unpackMeet(t) { try { const o = JSON.parse(atob(String(t).replace(/-/g, '+').replace(/_/g, '/'))); return o && typeof o === 'object' ? Object.fromEntries(MEET.filter(m => m.a.includes(o[m.id])).map(m => [m.id, o[m.id]])) : null; } catch { return null; } }

// ---------- Which account next? The usual order for the next dollar, shaped by five taps. ----------
// Roth IRA income limit for 2026: the phase-out starts near $153,000 on your own and $242,000 filing jointly.
export const NEXT_ASKS = [
  { id: 'match', q: 'My job matches what I put in a retirement plan', a: [['all', 'Yes, and I take all of it'], ['some', 'Yes, I take some'], ['none', 'No match']] },
  { id: 'debt', q: 'I carry debt above about 8% a year', a: [['yes', 'Yes'], ['no', 'No']] },
  { id: 'cushion', q: 'Cash on hand covers', a: [['low', 'Under a month'], ['some', '1 to 3 months'], ['full', 'More than 3 months']] },
  { id: 'hsa', q: 'My health plan allows an HSA', a: [['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']] },
  { id: 'over', q: 'My income is over the Roth limit (about $153,000 on my own, $242,000 together)', a: [['yes', 'Yes'], ['no', 'No']] },
];
export function nextDollarOf(ans = {}) {
  const steps = [
    { id: 'starter', name: 'A month of cash', why: 'So one surprise does not land on a card.', done: ans.cushion === 'some' || ans.cushion === 'full' },
    { id: 'match', name: 'Your job\'s full match', why: 'It is the only place a dollar doubles the day you put it in.', done: ans.match === 'all', skip: ans.match === 'none' },
    { id: 'debt', name: 'Debt above about 8%', why: 'Paying it off earns that rate, for sure.', done: ans.debt === 'no' },
    { id: 'cushion', name: 'Three months or more of cash', why: 'So a job loss is a pause in the plan.', done: ans.cushion === 'full' },
    { id: 'hsa', name: 'Your HSA', why: 'No tax going in, growing, or coming out for health costs.', done: false, skip: ans.hsa === 'no', check: ans.hsa === 'unsure' },
    { id: 'roth', name: ans.over === 'yes' ? 'A Roth IRA by the back door' : 'A Roth IRA', why: ans.over === 'yes' ? 'Over the income limit, the route is a traditional IRA with no deduction, then a conversion.' : 'Growth and withdrawals later are tax-free.', done: false },
    { id: 'plan', name: 'The rest of your plan at work, up to the limit', why: 'More room for money that grows without a yearly tax bill.', done: false, skip: false },
    { id: 'taxable', name: 'A regular investment account', why: 'No limits and no lock. Low-fee index funds keep the tax small.', done: false },
  ].filter(s => !s.skip);
  const answered = NEXT_ASKS.every(q => ans[q.id]);
  const here = answered ? steps.find(s => !s.done) ?? steps.at(-1) : null;
  return { steps, here, answered };
}

// ---------- The climb: net worth today and the marks ahead, at what is kept each month (before any growth). ----------
export const CLIMB_MARKS = [[0, 'Above zero'], [10000, 'First $10,000'], [100000, 'First $100,000'], [1000000, 'First million']];
export function climbOf(netWorth, monthly) {
  if (netWorth == null) return null;
  return CLIMB_MARKS.map(([at, name]) => ({ at, name, done: netWorth >= at, months: netWorth >= at ? 0 : monthly > 0 ? Math.ceil((at - netWorth) / monthly) : null }));
}

// ---------- What a raise is worth: after tax, in days of freedom, with the words to ask for it. ----------
export const RAISES = [2000, 5000, 10000, 20000];
export const KEPT = 0.7; // about 30% of a raise goes to taxes: a guess the screen names
export function raiseOf(doc, ref, priors, { raise = 5000, kept = KEPT, now = new Date(), run = whatIf } = {}) {
  const monthly = raise * kept / 12, w = run(doc, ref, priors, { earnMore: monthly }, { now });
  const moved = w?.moved ?? null;
  return { raise, monthly, moved, date: w?.date ?? null, daysPerThousand: moved != null && raise > 0 ? Math.round(moved * 30.44 / (raise / 1000)) : null };
}
export const RAISE_SCRIPT = ['Start with what you did: two or three results from the last year, with numbers where you have them.', 'Name the number: "Based on that, I am asking for a raise of $X."', 'Then stop talking. Let them answer first.', 'If it is a no: "What would I need to show for this to be a yes in six months?" and get a date.'];

// ---------- If I had started, and if I start now: the same monthly amount, then and from today. ----------
export const HABITS = [50, 100, 200, 500, 1000];
export const SPANS = [1, 3, 5, 10, 20];
export function startedOf({ monthly = 200, years = 5, ret = 0.05 } = {}) {
  const put = monthly * 12 * years, value = ret === 0 ? put : monthly * 12 * (((1 + ret) ** years - 1) / ret);
  return { put, value, growth: value - put, monthly, years };
}

// ---------- Spending creeping up: this visit against the last one. ----------
export function creepOf(before, after, { line = 0.05 } = {}) {
  if (!(before > 0) || !(after > 0)) return null;
  const change = (after - before) / before;
  return { change, more: after - before, up: change >= line };
}

// ---------- The money date: five taps, once a month. ----------
export const FEEL = [1, 2, 3, 4, 5];
export function datesOf(list = []) {
  const all = [...list].sort((a, b) => a.at.localeCompare(b.at)), last = all.at(-1) ?? null, prev = all.at(-2) ?? null;
  return { count: all.length, last, prev, calm: last && prev ? last.calm - prev.calm : null, joy: last && prev ? last.joy - prev.joy : null };
}

// ---------- My parents: six taps, and what helping them would do to my date. ----------
export const PARENT_ASKS = [
  { id: 'income', q: 'They have enough coming in to live on' }, { id: 'docs', q: 'I know where their documents and accounts are' },
  { id: 'will', q: 'They have a will' }, { id: 'proxy', q: 'Someone is named to make health and money choices for them' },
  { id: 'care', q: 'There is a plan for care if they need help at home' }, { id: 'talk', q: 'We have talked about money at least once' },
];
export const PARENT_HELP = [0, 250, 500, 1000, 2000];

// ---------- Where each month's money goes, over time: the plan's own order (M79), as phases with dates. ----------
export function flowTimeOf(pl) {
  const f = pl?.m?.fooFlow, fi = pl?.milestones?.find(x => x.id === 'fi')?.months ?? null;
  if (!f?.steps?.length || !(f.monthly > 0)) return null;
  const nameOf = id => (id === 'rest' ? 'Invest for the day work is optional' : pl.steps?.find(s => s.id === id)?.name ?? `Step ${id}`);
  const phases = f.steps.map(s => ({ id: s.id, name: nameOf(s.id), from: s.from, to: s.to ?? (fi != null && fi > s.from ? fi : null), monthly: s.monthly, target: s.left ?? null }))
    .filter(p => p.to == null || p.to > p.from)
    .map(p => ({ ...p, months: p.to == null ? null : p.to - p.from, total: p.to == null ? null : p.monthly * (p.to - p.from) }));
  return phases.length ? { monthly: f.monthly, phases, end: phases.at(-1).to } : null;
}

// ---------- Design the life, get the bill: a life at an age, priced, and what it asks of each month from now. ----------
export const LIFE_AGES = [35, 40, 45, 50, 55, 60];
export const LIFE_PLACE = [['less', 'Somewhere cheaper', 0.75], ['same', 'Like where I am now', 1], ['more', 'Somewhere pricier', 1.3]];
export const LIFE_WORK = [['none', 'Not working', 0], ['some', 'A little, for fun', 1500], ['half', 'Half-time work I like', 3000]];
export const LIFE_TRAVEL = [['none', 'Close to home', 0], ['some', 'A few trips a year', 400], ['lots', 'On the road a lot', 1200]];
export const LIFE_GIVE = [['none', 'Just us', 0], ['some', 'Helping family or giving', 500], ['lots', 'Giving a lot', 1500]];
const pickOf = (list, id) => list.find(x => x[0] === id) ?? list[0];
export function designOf({ age, spending, invested = 0, surplus = 0, ret = 0.05, rate = 0.04 }, pick = {}) {
  const at = pick.age ?? null;
  if (age == null || !(spending > 0) || at == null || at <= age) return null;
  const place = pickOf(LIFE_PLACE, pick.place ?? 'same'), work = pickOf(LIFE_WORK, pick.work ?? 'none'), travel = pickOf(LIFE_TRAVEL, pick.travel ?? 'none'), give = pickOf(LIFE_GIVE, pick.give ?? 'none');
  const cost = spending * place[2] + travel[2] + give[2], fromWork = work[2], fromMoney = Math.max(0, cost - fromWork);
  const number = fromMoney * 12 / rate;
  const need = years => { const g = (1 + ret) ** years, grownNow = invested * g; return Math.max(0, (number - grownNow) * (ret === 0 ? 1 / years : ret / (g - 1)) / 12); };
  const years = at - age, monthly = need(years), gap = Math.max(0, monthly - surplus);
  let ageOnPace = null; for (let a = age + 1; a <= 80; a++) if (need(a - age) <= surplus) { ageOnPace = a; break; }
  return { at, years, cost, fromWork, fromMoney, number, monthly, surplus, gap, on: gap <= 0, ageOnPace, lines: [['Everyday life', spending * place[2]], ['Travel', travel[2]], ['Family and giving', give[2]]].filter(l => l[1] > 0) };
}

// ---------- Decision receipts: two choices, side by side, and a record of which one you picked. ----------
export const CHOICES = ['Stay as I am', 'A new job', 'A move', 'Buying a home', 'A baby', 'Back to school', 'My own business', 'Time off'];
export const PAY_STEPS = [-3000, -1500, -500, 0, 500, 1500, 3000];
export const COST_STEPS = [-1500, -500, 0, 500, 1500, 3000];
export const FEELS = [[-1, 'Worse'], [0, 'Same'], [1, 'Better']];
export const FEEL_SIDES = [['time', 'Free time'], ['calm', 'Calm'], ['people', 'Time with people']];
export function receiptOf(doc, ref, priors, a = {}, b = {}, { now = new Date(), run = whatIf } = {}) {
  const side = c => { const w = run(doc, ref, priors, { earnMore: c.pay ?? 0, spendLess: -(c.cost ?? 0) }, { now }); const life = FEEL_SIDES.reduce((s, [k]) => s + (c[k] ?? 0), 0);
    return { name: c.name ?? null, pay: c.pay ?? 0, cost: c.cost ?? 0, months: w?.after ?? null, date: w?.date ?? null, moved: w?.moved ?? null, life }; };
  const A = side(a), B = side(b);
  const sooner = A.months == null || B.months == null ? null : A.months === B.months ? 'same' : A.months < B.months ? 'a' : 'b';
  const kinder = A.life === B.life ? 'same' : A.life > B.life ? 'a' : 'b';
  return { a: A, b: B, sooner, kinder, gap: A.months != null && B.months != null ? Math.abs(A.months - B.months) : null, split: sooner !== 'same' && kinder !== 'same' && sooner != null && sooner !== kinder };
}

// ---------- Your money, line by line: a plain walk of the plan, a point a year. ----------
// What is kept each month pays debt first, then fills cash until the plan starts investing (M79's wait), then is
// invested. Lines: what you put in (what is invested today plus what you add), growth on it, the two together, cash,
// debt, and net worth. Debt interest and minimum payments are already inside spending, so they are not walked here.
export const LINES = [['invested', 'Invested'], ['putIn', 'What you put in'], ['growth', 'Growth'], ['cash', 'Cash'], ['debt', 'Debt'], ['netWorth', 'Net worth']];
export function seriesOf(pl, { maxYears = 40 } = {}) {
  const x = pl?.m?.inputs; if (!x) return null;
  const f = pl.m.fooFlow, monthly = Math.max(0, f?.monthly ?? pl.m.surplus?.value ?? 0), wait = f?.waitMonths ?? 0;
  const r = (1 + (x.realReturn ?? 0.05)) ** (1 / 12) - 1, fi = pl.milestones?.find(m => m.id === 'fi')?.months ?? null;
  const end = Math.min(maxYears * 12, Math.max(12, Math.ceil((fi ?? maxYears * 12) / 12) * 12));
  let cash = x.cash ?? 0, inv = x.invested ?? 0, putIn = inv, debt = 0;
  // Each debt walks on its own payment and rate when they are on file; without them it holds flat until it is paid from what is kept.
  const owed = (x.debts || []).map(d => ({ left: d.balance ?? 0, apr: d.apr ?? 0, payment: d.payment ?? 0 })), sum = () => owed.reduce((t, d) => t + d.left, 0);
  debt = sum();
  const point = m => ({ month: m, year: m / 12, age: pl.age != null ? pl.age + m / 12 : null, invested: inv, putIn, growth: inv - putIn, cash, debt, netWorth: cash + inv - debt });
  const points = [point(0)];
  for (let m = 1; m <= end; m++) {
    inv *= 1 + r;
    for (const d of owed) if (d.left > 0 && d.payment > 0) d.left = Math.max(0, d.left * (1 + d.apr / 12) - d.payment);
    if (m <= wait) { let extra = monthly; for (const d of owed) { const pay = Math.min(d.left, extra); d.left -= pay; extra -= pay; } cash += extra; } else { inv += monthly; putIn += monthly; }
    debt = sum();
    if (m % 12 === 0) points.push(point(m));
  }
  return { points, monthly, wait, end };
}

// ---------- Can I afford this? One purchase, against the cash on hand and what is kept each month. ----------
export const PRICES = [200, 500, 1000, 2500, 5000, 10000, 25000];
export function affordOnce({ price, cash = 0, spending = 0, surplus = 0, ret = 0.05, years = 20 }) {
  if (!(price > 0)) return null;
  const left = cash - price, monthsLeft = spending > 0 ? left / spending : null;
  return { price, fromCash: left >= 0, cashLeft: left, monthsLeft, monthsOfKeeping: surplus > 0 ? price / surplus : null, later: price * (1 + ret) ** years, years };
}

// ---------- Uneven pay: a steady paycheck to yourself, a buffer, and where a good month goes. ----------
export const PAY_PICKS = [1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000];
export function unevenOf({ low, usual, high, spending = 0 }) {
  if (!(low > 0) || !(usual >= low) || !(high >= usual)) return null;
  const pay = Math.min(usual, Math.max(low, Math.round((low + usual) / 2 / 50) * 50)); // between a slow month and a usual one
  const buffer = Math.max(spending, pay) * 2, shortInLow = Math.max(0, pay - low);
  return { pay, buffer, shortInLow, extraInHigh: high - pay, covers: spending > 0 ? pay >= spending : null, lowMonthsCovered: shortInLow > 0 ? Math.floor(buffer / shortInLow) : null };
}

// ---------- Subscriptions that do the same job. ----------
export const OVERLAPS = [['video', 'Streaming video'], ['music', 'Music'], ['cloud', 'Cloud storage'], ['news', 'News and magazines'], ['fitness', 'Fitness apps and gyms'], ['delivery', 'Delivery passes'], ['games', 'Games'], ['software', 'Apps that do the same job']];
export const SUB_PRICES = [8, 12, 15, 20, 30];
export function overlapOf(marked = {}, each = 12, { doc, ref, priors, now = new Date(), run = whatIf } = {}) {
  const groups = OVERLAPS.filter(([k]) => marked[k]), monthly = groups.length * each;
  const w = monthly > 0 && doc ? run(doc, ref, priors, { spendLess: monthly }, { now }) : null;
  return { groups: groups.map(g => g[1]), monthly, yearly: monthly * 12, moved: w?.moved ?? null, date: w?.date ?? null };
}

// ---------- You are here: one next thing to do, and what is already done. ----------
// facts: { hasAge, answered, total, nextQ, worry: { label, ticked, steps } | null, levels: [{ id, n, title, state }],
//          statement, checkup: { answered, of }, dates, lastDate, today, drills, receipts }
export function guideOf(f) {
  const done = [], open = (f.levels || []).filter(l => l.state === 'open'), finished = (f.levels || []).filter(l => l.state !== 'open');
  if (f.hasAge) done.push('Picked your birth year: your plan exists');
  if (f.answered > 0) done.push(`Answered ${f.answered} of ${f.total} questions`);
  if (f.worry?.ticked > 0) done.push(`${f.worry.ticked} of ${f.worry.steps} first steps on "${f.worry.label}"`);
  if (f.statement) done.push('Put your real spending in from a statement');
  if (finished.length) done.push(`Finished ${finished.length} of ${f.levels.length} levels`);
  if (f.checkup?.answered > 0) done.push(`Checkup: ${f.checkup.answered} of ${f.checkup.of} answered`);
  if (f.drills > 0) done.push(`Practiced ${f.drills} ${f.drills === 1 ? 'drill or skill' : 'drills and skills'}`);
  if (f.receipts > 0) done.push(`Made ${f.receipts} ${f.receipts === 1 ? 'choice' : 'choices'} with a receipt`);
  if (f.dates > 0) done.push(`${f.dates} money ${f.dates === 1 ? 'date' : 'dates'}`);
  const thisMonth = f.lastDate && f.today && f.lastDate.slice(0, 7) === f.today.slice(0, 7);
  const next = !f.hasAge ? { here: 'The very start', label: 'Pick the year you were born', stage: 'you', minutes: 1 }
    : f.answered < f.total ? { here: `Question ${f.answered + 1} of ${f.total}`, label: `Answer question ${f.answered + 1}`, stage: 'numbers', q: f.nextQ, minutes: 1 }
    : f.worry && f.worry.ticked === 0 ? { here: 'Your plan is yours. Now the thing you came for', label: `Do the first step on "${f.worry.label}"`, stage: 'plan', flash: 'worry', minutes: 5 }
    : !f.statement && open.some(l => l.id === 'where') ? { here: 'Your plan runs on a spending number from memory', label: 'Firm up your spending number', stage: 'sharpen', flash: 'statement', minutes: 5 }
    : open.length ? { here: `Level ${open[0].n} of ${f.levels.length + 1} is next`, label: `Level ${open[0].n}: ${open[0].title}`, stage: 'sharpen', flash: open[0].id, minutes: 3 }
    : (f.checkup?.answered ?? 0) < (f.checkup?.of ?? 0) ? { here: 'Every level is done', label: 'Do the checkup: what a planner would ask', stage: 'sharpen', flash: 'checkup', minutes: 3 }
    : !thisMonth ? { here: 'Your plan is sharp', label: 'Do this month\'s money date', stage: 'date', minutes: 5 }
    : { here: 'You are all caught up', label: 'See your plan', stage: 'plan', minutes: 0, caughtUp: true };
  // The counter: every step on the path, in the same order, and how many are behind you.
  const whereDone = (f.levels || []).length > 0 && !f.levels.some(l => l.id === 'where' && l.state === 'open');
  const path = [!!f.hasAge, ...Array.from({ length: f.total ?? 0 }, (_, i) => (f.answered ?? 0) > i), ...(f.worry ? [f.worry.ticked > 0] : []), !!f.statement || whereDone,
    ...(f.levels || []).map(l => l.state !== 'open'), (f.checkup?.of ?? 0) > 0 && f.checkup.answered >= f.checkup.of, !!thisMonth];
  const behind = path.filter(Boolean).length;
  return { next, done, step: Math.min(path.length, behind + 1), of: path.length, behind };
}

// ---------- When can I stop? Every finish line on the way, soonest first ----------
// The plan's own rungs (js/math/ladder.js), in the words of someone asking "when can I quit?".
export const QUIT_WORDS = {
  qq: ['Ease off', 'Save only the yearly minimum from here and you still get there. Room to take a calmer job.'],
  coast: ['Stop saving for later', 'What is invested grows into enough on its own. Your pay only has to cover today, so part-time or lower-paid work is on the table.'],
  lean: ['Stop, on needs only', 'Investments cover food, housing and getting around, and nothing else.'],
  fi: ['Stop for good', 'Investments cover everything you spend today. Work is a choice.'],
  fat: ['Stop, with room to spare', 'Everything you spend today and half again as much.'],
};
export function quitOf(milestones = []) {
  const rows = Object.keys(QUIT_WORDS).map(id => { const m = milestones.find(x => x.id === id); return m ? { id, name: QUIT_WORDS[id][0], means: QUIT_WORDS[id][1], done: !!m.done, date: m.date ?? null, months: m.done ? 0 : m.months ?? null, target: m.target ?? null } : null; }).filter(Boolean);
  rows.sort((a, b) => (a.months ?? Infinity) - (b.months ?? Infinity));
  return { rows, next: rows.find(r => !r.done && r.months != null) ?? null, done: rows.filter(r => r.done).length };
}

// ---------- Before the year ends: the moves with a deadline, and what each is worth ----------
// A dollar put in before tax saves about your marginal rate on it. limits: ref.limits (2026). k401Year: what goes into
// the work plan in a year now. Deadlines: paycheck plans close with the last paycheck of the year; an IRA and an HSA
// stay open until the tax filing day the next April (IRS Publication 590-A; Publication 969).
export function yearEndOf({ marginal = null, age = null, limits, k401Year = 0, hasWorkPlan = true, payFrequency = '2 weeks', now = new Date() } = {}) {
  const year = now.getFullYear(), end = new Date(year, 11, 31), daysLeft = Math.max(0, Math.round((end - new Date(year, now.getMonth(), now.getDate())) / 86400000));
  const perYear = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 }[payFrequency] ?? 26, paychecksLeft = Math.max(0, Math.floor(daysLeft / (365 / perYear)));
  const saves = amount => (marginal == null ? null : Math.round(amount * marginal));
  const k401Limit = limits['401k'].base + (age >= 60 && age <= 63 ? limits['401k'].catchUp60to63 : age >= 50 ? limits['401k'].catchUp50 : 0);
  const iraLimit = limits.ira.base + (age >= 50 ? limits.ira.catchUp50 : 0), hsaLimit = limits.hsa.self + (age >= 55 ? limits.hsa.catchUp55 : 0);
  const room = Math.max(0, k401Limit - (k401Year ?? 0));
  const moves = [
    hasWorkPlan ? { id: 'k401', name: 'Raise your 401(k) for the last paychecks', by: `Dec 31, ${year}`, limit: k401Limit, room, perThousand: saves(1000), perPaycheck: paychecksLeft ? Math.round(room / paychecksLeft) : null,
      text: room > 0 ? `You have room for $${Math.round(room).toLocaleString('en-US')} more this year.` : 'You are already at the limit for the year.' } : null,
    { id: 'hsa', name: 'Fill a health savings account, if your plan allows one', by: `Apr 15, ${year + 1}`, limit: hsaLimit, room: hsaLimit, perThousand: saves(1000), text: 'Only with a high-deductible health plan. It is the one account that is never taxed, going in or coming out for health costs.' },
    { id: 'ira', name: 'Put this year\'s money in an IRA', by: `Apr 15, ${year + 1}`, limit: iraLimit, room: iraLimit, perThousand: null, text: 'A Roth IRA saves no tax now and is never taxed again. A traditional IRA may lower this year\'s tax, but with a plan at work that break fades out as income rises.' },
    { id: 'fsa', name: 'Spend what is left in a flexible spending account', by: `Dec 31, ${year}`, limit: null, room: null, perThousand: null, text: 'Most plans take back what is not used. Check the balance and the plan\'s own last day.' },
    { id: 'give', name: 'Giving and selling at a loss count this year only if done this year', by: `Dec 31, ${year}`, limit: null, room: null, perThousand: null, text: 'A gift to a charity, or selling an investment that is down in a regular brokerage account, has to settle by the last day.' },
  ].filter(Boolean);
  return { year, daysLeft, paychecksLeft, marginal, moves, best: marginal != null && room > 0 && hasWorkPlan ? { id: 'k401', saves: saves(Math.min(room, 1000)) } : null };
}
