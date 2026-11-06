// SPDX-License-Identifier: AGPL-3.0-only
// M82: your next 3 moves (batch 12, item 6), for the top of Report › One-pager. RightCapital's Snapshot opens with tiles
// that link to the detail; here each move is one sentence with a dollar amount and a date, and it links to its screen.
// Pulled in this order: the FOO step you are on (or the gap), a Scorecard hole before your step that has a payoff, a
// homework item (due by the next session), then the FOO steps the money goes to next. Pure: no DOM.
import { metrics, debtHeroOf } from './metrics.js';
import { foo } from './foo.js';
import { scorecardOf } from './scorecard.js';
import { homeworkList } from '../homework.js';
import { gatesOf, visible } from '../gates.js';
import { addMonths, ymOf } from '../month.js';

const money = v => `$${Math.round(v).toLocaleString('en-US')}`;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthWords = ym => (ym ? `${MON[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}` : null);

export function nextMoves(doc, ref, { now = new Date(), flags = [], limit = 3 } = {}) {
  const m = metrics(doc, ref, { now });
  const F = foo(doc, ref, { now, flags });
  const at = n => (n == null ? null : addMonths(ymOf(now), Math.max(0, Math.ceil(n))));
  const out = [], used = new Set();
  const push = mv => { if (out.length < limit && !used.has(mv.key)) { used.add(mv.key); out.push({ ...mv, when: monthWords(mv.ym) }); } };
  const step = id => F.steps.find(s => s.id === id);
  // So the move's dollars square with the surplus tile: the payments they make now plus what is left over each month.
  const split = monthly => { const left = m.debtRule?.toDebt ?? 0, now$ = monthly - left; return left > 0 && now$ > 0.5 ? ` (the ${money(now$)} going now plus the ${money(left)} left over)` : ''; };
  // What a FOO step asks for, as a move. A step with nothing to fund or no date gives none.
  const stepMove = (s, lead = '') => {
    if (!s || ['Done', 'Locked', 'Off', 'Optional'].includes(s.status)) return null;
    if (s.id === '1' && F.gap) return { key: 'foo:1', step: '1', amount: F.gap.short, ym: at(1), route: '#/home/session', text: `${lead}Close the ${money(F.gap.short)} a month gap: the gap card's levers, by ${monthWords(at(1))}` };
    if (s.id === '3') {
      const hero = debtHeroOf(doc, m), months = s.months ?? s.ifPaid ?? null;
      const monthly = hero?.monthly ?? m.debtPlan?.debts.reduce((t, d) => t + (d.payment ?? 0), 0) ?? null;
      if (monthly == null || months == null) return null;
      return { key: 'foo:3', step: '3', amount: monthly, ym: at(months), route: '#/plan/debt-payoff', text: `${lead}Pay ${money(monthly)} a month to the ${heavyWords(m)}${split(monthly)}: debt free ${monthWords(at(months))}${F.gap ? ' once the gap is closed' : ''}` };
    }
    if (s.date == null || !s.left) return null;
    const monthly = s.flowMonthly ?? null;
    const what = { '1': 'little e and the buffer', '2': 'the full employer match', '4': 'big e (your job-loss fund)', '5': 'a Roth IRA', '6': 'investing', '8': 'the next big goals', '9': 'investing' }[s.id] ?? s.name;
    if (s.id === '6' || s.id === '9') { const inv = m.investing?.monthly ?? null; const goal = s.id === '6' ? 'Coast FI' : 'your FI number';
      return { key: `foo:${s.id}`, step: s.id, amount: inv ?? s.left, ym: s.date, route: '#/plan/goals', text: inv ? `${lead}Invest ${money(inv)} a month until ${goal}: ${money(s.left)} more, ${monthWords(s.date)}` : `${lead}Invest until ${goal}: ${money(s.left)} more, ${monthWords(s.date)}` }; }
    if (s.id === '2') return { key: 'foo:2', step: '2', amount: s.left, ym: s.date, route: '#/cash-flow/income', text: `${lead}Raise the 401(k) to get the full match: ${money(s.left)} a year more going in, from ${monthWords(s.date)}` };
    return { key: `foo:${s.id}`, step: s.id, amount: monthly ?? s.left, ym: s.date, route: s.id === '4' || s.id === '1' ? '#/plan/foo' : '#/net-worth/assets',
      text: monthly ? `${lead}Put ${money(monthly)} a month into ${what}: ${money(s.left)} by ${monthWords(s.date)}` : `${lead}Fund ${what}: ${money(s.left)} by ${monthWords(s.date)}` };
  };
  // 1. Where you are.
  const here = step(F.here);
  const first = stepMove(here);
  if (first) push(first);
  // 2. A hole before your step, with dollars.
  let sc = null; try { sc = scorecardOf(doc, ref, { now, flags }); } catch { sc = null; }
  for (const hole of sc?.open ?? []) {
    if (!hole.beforeHere || !hole.payoff?.value || used.has(`foo:${hole.foo}`)) continue;
    push({ key: `hole:${hole.id}`, step: hole.foo, amount: hole.payoff.value, ym: nextSessionYm(doc, now), route: '#/plan/scorecard', text: `Fill the ${hole.name} hole: worth ${money(hole.payoff.value)} a year, by ${monthWords(nextSessionYm(doc, now))}` });
  }
  // 3. Homework the client owns, due by the next session (dollars when the number has a rough amount already).
  const live = visible(doc.records, gatesOf(doc.profile, doc.client), ref);
  for (const hw of homeworkList(doc, live).filter(x => x.status !== 'Confirmed' && x.owner !== 'coach').slice(0, 1)) {
    const amt = hw.r ? (hw.field ? hw.r.values?.[hw.field] : hw.r.amount ?? hw.r.values?.balance ?? hw.r.values?.value) ?? null : null;
    const ym = hw.due ? String(hw.due).slice(0, 7) : nextSessionYm(doc, now);
    push({ key: `hw:${hw.key}`, step: null, amount: amt, ym, route: '#/tools/lists', text: `${hw.label}${amt != null ? ` (about ${money(amt)} now)` : ''}, by ${monthWords(ym)}` });
  }
  // 4. The steps the money goes to next, in FOO order.
  const order = F.steps.map(s => s.id), from = Math.max(0, order.indexOf(F.here));
  for (const s of F.steps.slice(from + 1)) { const mv = stepMove(s, 'Then: '); if (mv) push(mv); }
  return out;
}
function heavyWords(m) {
  const heavy = (m.debtPlan?.debts || []).filter(d => d.heavy);
  if (heavy.length && heavy.every(d => d.type === 'Credit card')) return 'cards';
  return heavy.length === 1 ? heavy[0].name : 'heavy debt';
}
// The month of the next session when one is set, else next month.
function nextSessionYm(doc, now) { const n = doc.session?.next; return /^\d{4}-\d{2}/.test(n || '') && String(n).slice(0, 7) >= ymOf(now) ? String(n).slice(0, 7) : addMonths(ymOf(now), 1); }
