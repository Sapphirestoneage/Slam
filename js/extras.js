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
