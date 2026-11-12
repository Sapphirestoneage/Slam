// SPDX-License-Identifier: AGPL-3.0-only
// Fire drills and skills (start.html, Drills): the fears and the unused skills a plan can see, each turned into a
// number and one small practice rep. Eli's "financial exposure therapy": a rehearsal of the bad thing with the real
// figures, so it stops being a fog, plus a tiny safe dose in real life. Nothing here leaves a lasting mark.
// Pure: no DOM. Every figure comes from the engines (js/math, js/lifetime) on the household as it stands.
import { fmt } from './math/result.js';
import { employerMatch } from './math/income.js';
import { cardCost } from './math/transitions.js';
import { lifetime, worked } from './math/lifetime.js';
import { whatIf, monthWords, spanWords, situationOf, jobAheadOf } from './journey.js';

const $ = v => fmt.money(Math.round(v));
const months = v => (v >= 24 ? `${(v / 12).toFixed(1)} years` : `${(Math.round(v * 10) / 10).toFixed(1)} months`);
// How many months cash lasts when `out` leaves each month and `inFor` comes in for the first `forMonths` (120 at most).
function lasts(cash, out, inFor = 0, forMonths = 0) {
  let c = cash, k = 0;
  while (k < 120) { const net = out - (k < forMonths ? inFor : 0); if (net <= 0) { k++; continue; } if (c < net) return k + c / net; c -= net; k++; }
  return null;
}
const earliest = (x, ref, returns) => { for (let a = x.age; a <= 80; a++) { if (worked(lifetime({ ...x, retireAge: a }, ref, { returns }), x)) return a; } return null; };

// The drills for this household. Each: { id, fear, headline, lines: [words], happens: [what actually happens, in
// order], rep: { text, minutes }, calm: true when the numbers say this one is already covered }.
export function drillsOf(plan, doc, ref, priors, { life = null, now = new Date() } = {}) {
  const m = plan.m, x = m.inputs, out = [];
  const cash = x.cash ?? 0, spend = x.spending ?? 0;
  const line = letter => (x.lines || []).filter(l => (l.draftt ?? l.values?.draftt) === letter && l.amount != null).reduce((s, l) => s + (l.monthly ?? l.amount ?? 0), 0);
  const needs = line('Accommodation') + line('Food') + line('Transportation');
  const between = situationOf(doc) === 'between';
  // 1. The job
  if (!between && spend > 0) {
    const gross = x.income?.[0]?.gross ?? null, ny = doc.profile?.state === 'NY', U = ref.limits?.unemployment?.NY;
    const weekly = ny && gross && U ? Math.min(U.maxWeekly, gross / 52 / 2) : 0, benefit = weekly * 52 / 12, weeks = U?.weeks ?? 26;
    const plainRun = lasts(cash, spend), withBenefit = benefit ? lasts(cash, spend, benefit, weeks * 12 / 52) : null, lean = needs > 0 ? lasts(cash, needs, benefit, weeks * 12 / 52) : null;
    out.push({ id: 'job', fear: 'Your job ends tomorrow', calm: (withBenefit ?? plainRun ?? 0) >= 6 || withBenefit === null && benefit > 0,
      headline: plainRun === null ? 'Your cash carries you past ten years' : `Your cash alone carries you ${months(plainRun)}`,
      lines: [
        benefit ? `Unemployment in New York would pay about ${$(weekly)} a week for up to ${weeks} weeks (about half your pay, up to ${$(U.maxWeekly)}). With it, your cash lasts ${withBenefit === null ? 'more than ten years' : months(withBenefit)}.` : 'Unemployment benefits would stretch this. Your state sets the amount.',
        lean !== null || needs > 0 ? `Cut to needs only (${$(needs)} a month for housing, food and getting around) and it lasts ${lean === null ? 'more than ten years' : months(lean)}.` : 'Answer "Where it goes" in Sharpen it to see how long a needs-only month would last.',
        x.invested ? `You also have ${$(x.invested)} invested. It is the last thing to touch, and it is there.` : null].filter(Boolean),
      happens: ['Your last paycheck arrives on the usual day, often with unused vacation paid out.', 'You file for unemployment the first week. The first payment usually takes two to three weeks.', 'Health cover through work ends at the end of the month or sooner. Losing it opens a window to buy a marketplace plan.', 'Your 401(k) stays yours. Nothing has to be done with it right away.'],
      rep: { text: 'Find your state unemployment site and save the link. Then find where your last pay stub lives. You are done.', minutes: 10 } });
  }
  if (between) {
    const j = jobAheadOf(doc, ref, { now }), B = plan.between;
    out.push({ id: 'gap', fear: 'The job search takes three months longer', calm: B?.runway == null || B.runway >= (j?.months ?? 0) + 3,
      headline: B?.runway == null ? 'Your money lasts more than ten years as things stand' : `Your money lasts until ${B.lasts}`,
      lines: [j ? `The job you expect starts ${monthWords(j.months, now)}. Three months later is ${monthWords(j.months + 3, now)}.` : 'Add the job ahead in Sharpen it to see the gap in months.', B?.runway != null && j ? (B.runway >= j.months + 3 ? 'Your money covers the longer search.' : `It would run short by about ${months(j.months + 3 - B.runway)}. Cutting to needs only, part-time work, or asking family are the levers, in that order.`) : null].filter(Boolean),
      happens: ['Benefits keep paying each week you certify, until they run out.', 'A gap on a resume of a few months is common and rarely needs explaining.', 'Part-time pay lowers your benefit that week. It does not end your claim.'],
      rep: { text: 'Write down the one bill you would pause first if the search ran long. Just the name of it.', minutes: 5 } });
  }
  // 2. The surprise bill
  { const bill = 2000, short = Math.max(0, bill - cash), card = x.debts.find(d => d.type === 'Credit card'), apr = card?.apr ?? ref.typicalRates?.['Credit card'] ?? null;
    const cost = short > 0 ? cardCost(apr, { amount: short, months: 3 }) : null;
    out.push({ id: 'bill', fear: `A ${$(bill)} bill lands this week`, calm: short === 0,
      headline: short === 0 ? `You can pay it in cash and still have ${$(cash - bill)}` : `Your cash covers ${$(cash)} of it`,
      lines: short === 0 ? ['No card, no loan, no interest. That is what emergency cash is for.'] : [`The other ${$(short)} would go on a card. Paid back over three months, that costs about ${cost?.cost != null ? $(cost.cost) : 'a few percent'} in interest.`, 'That is the whole cost. It is a fee, and you can price it.'],
      happens: ['Most medical and repair bills can be split into payments if you ask before the due date.', 'A bill paid a few weeks late usually costs a late fee, and nothing reaches your credit report until it is 30 days past due.'],
      rep: { text: short === 0 ? 'Rename your savings account "little e" so you know what it is for.' : 'Move $20 into savings today and name the account "little e".', minutes: 5 } }); }
  // 3. The pay cut
  if (!between && x.takeHome > 0) {
    const cut = x.takeHome * 0.2, w = whatIf(doc, ref, priors, { earnMore: -cut }, { now });
    out.push({ id: 'cut', fear: 'Your pay drops by a fifth', calm: (w?.surplus ?? -1) >= 0,
      headline: w?.surplus == null ? 'Needs your spending' : w.surplus >= 0 ? `You would still have ${$(w.surplus)} left each month` : `You would be ${$(-w.surplus)} short each month`,
      lines: [w?.moved != null && w.before != null ? `Work becoming optional moves from ${w.beforeDate} to ${w.date}, ${spanWords(w.moved)} later.` : null, w?.surplus != null && w.surplus < 0 ? `Closing the gap means trimming ${$(-w.surplus)} a month, about ${fmt.pct(-w.surplus / spend)} of what you spend.` : 'Nothing has to change in your life. The plan just takes longer.'].filter(Boolean),
      happens: ['A pay cut does not touch what you have already saved.', 'Fixed bills stay the same, so the cut lands on the flexible part of your spending first.'],
      rep: { text: 'For one week, spend as if the cut had happened. Notice the first thing you reach for and cannot have.', minutes: 0 } });
  }
  // 4. The crash (needs the whole-life plan)
  if (life?.x && life.smooth?.age != null) {
    const X = life.x, drop = -0.35, after = earliest(X, ref, k => (k === 0 ? drop : X.realReturn)), today = (X.start.taxable + X.start.pretax + X.start.roth);
    const shift = after == null ? null : after - life.smooth.age;
    out.push({ id: 'crash', fear: 'The market falls by a third this year', calm: shift !== null && shift <= 1,
      headline: shift === null ? 'It would push work-optional past 80 on these numbers' : shift <= 0 ? 'It would not move the age work becomes optional' : `It would move work-optional by ${shift} ${shift === 1 ? 'year' : 'years'}`,
      lines: [`Your ${$(today)} invested would show as ${$(today * (1 + drop))}. That is the number you would see on the screen.`, shift !== null && shift <= 1 ? 'Most of your money has not gone in yet, so a fall now mostly means buying cheaper for years.' : 'The closer you are to stopping work, the more a fall matters. That is what the stress test on Whole life measures.',
        life.safe?.replay ? `Your plan at ${life.age} already held through ${fmt.pct(life.safe.replay.success)} of history, including 1929, 1973 and 2008.` : null].filter(Boolean),
      happens: ['Nothing is lost unless you sell. The shares are the same shares.', 'Every deposit you make during a fall buys more than it did the month before.', 'Falls of a third have happened several times in a century. Each one ended.'],
      rep: { text: 'Next time the market is down for the day, open your account, look at the number, and close it without doing anything.', minutes: 2 } });
  }
  // 5. The missed payment
  if (x.debts.length) out.push({ id: 'miss', fear: 'You miss a card payment', calm: null,
    headline: 'It costs a late fee, and usually nothing else if you fix it within the month',
    lines: ['This is the one people fear most and price worst. Here is the real sequence.'],
    happens: ['Day 1: a late fee is added. Many card companies remove a first one if you call and ask.', 'Day 1 to 29: nothing is reported to the credit bureaus.', 'Day 30: it can be reported as late, and that does mark your credit for years. This is the line that matters.', 'Day 60: the card can raise your rate to a penalty rate.'],
    rep: { text: 'Turn on autopay for the minimum on every card. It makes day 30 close to impossible.', minutes: 5 } });
  return out;
}

// Skills this household has not used yet, each with what it is worth here and a three-step rep.
// { id, title, why, steps: [three], minutes }.
export function skillsOf(plan, doc, ref) {
  const m = plan.m, x = m.inputs, recs = doc.records || [], out = [];
  const accts = recs.filter(r => r.kind === 'account'), job = recs.find(r => r.kind === 'income' && r.type !== 'Unemployment'), v = job?.values || {};
  const gross = x.income?.[0]?.gross ?? null;
  if (v.hasMatch === 'Yes' && gross && (v.contributionPct ?? 0) < (v.matchCapPct ?? 0)) {
    const now = employerMatch({ contributionPct: v.contributionPct ?? 0, matchPct: v.matchPct, matchCapPct: v.matchCapPct, gross }).value ?? 0, full = employerMatch({ contributionPct: v.matchCapPct, matchPct: v.matchPct, matchCapPct: v.matchCapPct, gross }).value ?? 0;
    out.push({ id: 'match', title: 'Take the full match at work', why: `You are leaving about ${$(full - now)} a year of free money on the table.`, steps: ['Log in to your plan at work (the site is on your pay stub).', `Change your contribution to ${fmt.pct(v.matchCapPct)}.`, 'Save. It starts with your next paycheck.'], minutes: 10 });
  }
  if (v.hasMatch === "Don't know" || (job && v.hasMatch == null)) out.push({ id: 'askMatch', title: 'Find out if your job matches', why: 'A match is the best return you will ever be offered, and many people never check.', steps: ['Search your work email for "401(k)" or "benefits".', 'Look for a line like "50% of the first 6%".', 'Come back and tell Sharpen it what you found.'], minutes: 10 });
  if (!accts.some(r => r.type === 'Roth IRA') && (m.surplus.value ?? 0) > 0) out.push({ id: 'roth', title: 'Open a Roth IRA', why: `Money in it grows and comes out untaxed. Your plan could put up to ${$(Math.min((m.surplus.value ?? 0) * 12, ref.limits?.ira?.base ?? 0))} a year there.`, steps: ['Pick any large low-cost brokerage and choose "Open an account", then "Roth IRA".', 'Link your checking account.', 'Set a monthly transfer, even $25. Opening it is the skill.'], minutes: 20 });
  const hot = x.debts.filter(d => d.type === 'Credit card' && (d.apr ?? 0) >= 0.2 && d.balance > 0).sort((a, b) => b.balance - a.balance)[0];
  if (hot) out.push({ id: 'rate', title: 'Call and ask for a lower rate', why: `${hot.aprGuess ? 'Cards usually charge more than 20%' : `${hot.name.replace(/ \(total\)$/, '')} charges ${fmt.pct(hot.apr)}`}. Three points lower saves about ${$(hot.balance * 0.03)} a year on what you owe, for one phone call.`, steps: ['Call the number on the back of the card.', 'Say: "I have been a customer for a while and I am paying this down. Can you lower my rate?"', 'If they say no, ask once more for a hardship or promotional rate. Then thank them either way.'], minutes: 10 });
  if (x.debts.some(d => d.type === 'Credit card' && d.balance > 0)) out.push({ id: 'autopay', title: 'Turn on autopay for the minimum', why: 'It takes the 30-day late mark off the table. You can still pay more by hand.', steps: ['Open each card\'s app.', 'Find "Autopay" and choose "Minimum payment".', 'Check that the checking account it pulls from is the right one.'], minutes: 5 });
  if (!accts.some(r => r.values?.group === 'cash' && r.type !== 'Checking' && (r.values.balance ?? 0) > 0)) out.push({ id: 'savings', title: 'Give your emergency cash its own account', why: 'Money in checking gets spent. A separate account, named for its job, mostly does not.', steps: ['Open a savings account at any bank that pays interest.', 'Name it "little e".', 'Move your first $20 in.'], minutes: 15 });
  if (accts.some(r => r.type === 'All investments' && (r.values.balance ?? 0) > 0)) out.push({ id: 'types', title: 'Find out what kind of accounts you have', why: 'Whether money is taxed later, never again, or reachable any time changes when you can stop work.', steps: ['Log in to each investing account.', 'Read its name: 401(k), Roth IRA, traditional IRA, brokerage.', 'Enter the split in Sharpen it, level "Where your investments sit".'], minutes: 10 });
  if (doc.profile?.credit?.score == null) out.push({ id: 'report', title: 'Pull your free credit report', why: 'It lists every debt in your name. People often find one they forgot, or one that is not theirs.', steps: ['Go to annualcreditreport.com (the official free site).', 'Pull one bureau\'s report.', 'Read the list of accounts. That is all.'], minutes: 15 });
  return out;
}

// What a monthly cost really is: the extra invested needed to pay for it forever ($100 a month is $30,000 at 4%), the
// hours of work it takes each month, and how far dropping it moves the day work becomes optional.
export function priceTagOf(plan, doc, ref, priors, amount, { now = new Date() } = {}) {
  const x = plan.m.inputs, hourly = plan.m.hourly?.value ?? null;
  const w = whatIf(doc, ref, priors, { spendLess: amount }, { now });
  return { amount, forever: amount * 12 / x.withdrawalRate, hours: hourly ? amount / hourly : null, hourlyGuess: !!plan.m.hourly?.guess,
    moved: w?.moved ?? null, date: w?.date ?? null, beforeDate: w?.beforeDate ?? null, rate: x.withdrawalRate };
}
