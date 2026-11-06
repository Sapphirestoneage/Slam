// SPDX-License-Identifier: AGPL-3.0-only
// The workbook's tabs follow the app's screens (batch 59, docs/WORKBOOK.md "Tabs follow the screens"): one tab per
// screen and sub-tab, in the order of js/nav.js, named like the app, each holding the screen's own sections in the
// screen's order. js/sheet/workbook.js builds the tabs from this list only, and js/import-sheet.js reads them back by
// the hidden keys the build writes (never by position).
//
// A tab is { name, route, about, blocks }. A block is one of:
//   { form: area, title, fields: [field ids], cols: [formula column keys] }   label and value rows (a doc area's fields)
//   { table: area, title }                                                    the area's rows, in the screen's sections
//   { math: title, rows: [math ids] }                                         live formulas off the Math tab, with a Check
//                                                                             ('M27=Surplus': the row in the screen's words)
//   { report: tab id, tables: 'years' | 'debts' }                             a report's tables (js/registry/reports.js)
//   { note: text }                                                            a plain line
// test/coverage.test.js checks that every doc field the workbook carries has exactly one form row here, every table area
// one home, and every tab name is one Excel takes.
import { adultsOf, multiAdult } from './couples.js';
import { CATEGORIES, categoryName, categoryKeyOf, isCategoryRecord } from '../math/spending.js';

const P = k => `profile.${k}`;
const keys = (prefix, list) => list.map(k => P(`${prefix}.${k}`));

export const SCREEN_TABS = [
  { name: 'Home', route: '#/home/session', about: 'Home in SLAM: the program, the picture and the next small things. Type the extra a month to debt here; the rest is worked out.',
    blocks: [
      { math: 'Money in one line', rows: ['M12=Take-home a month', 'M27_spending=Spending a month', 'M27_debtOut=Debt payments not in spending', 'M27_sinking=Set aside for dated goals', 'M27=Surplus'] },
      { form: 'profile', title: 'Next small things', fields: [P('settings.debtExtra')] },
      { report: 'Program' },
    ] },
  { name: 'Home › About you', route: '#/home/profile', about: 'About you in SLAM: who is in the plan and what applies to you. Type or pick in the blue boxes.',
    blocks: [
      { form: 'profile', title: 'Why now', fields: [P('whyNow'), P('worry'), P('goalWords'), ...keys('chips', ['whyNow', 'worry', 'goalWords']), ...keys('chipStar', ['whyNow', 'worry', 'goalWords']), ...keys('chipOther', ['whyNow', 'worry', 'goalWords'])] },
      { form: 'profile', title: 'What applies to me', fields: ['hasCar', 'dependents', 'hasPets', 'housing', 'workSituation', 'hsaEligible', 'fsa', 'equityPay', 'mode', 'household'].map(P) },
      { form: 'profile', title: 'About you', fields: [P('client.name'), ...['firstName', 'lastName', 'birthMonth', 'birthYear', 'age', 'state', 'nyc', 'partnerName', 'partnerBirthYear', 'kidAges', 'healthCoverage', 'email', 'phone'].map(P)], cols: ['ageUsed'] },
      { table: 'people', title: 'People' },
      { form: 'profile', title: 'Work and home', fields: ['worstCase', 'bigEMultiplier', 'incomeStability'].map(P) },
      { form: 'profile', title: 'Home and shared bills', fields: [P('roommates'), P('splitWays'), ...['rent', 'utilities', 'internet', 'renters', 'groceries', 'household'].flatMap(b => [P(`shared.${b}`), P(`sharedAs.${b}`)])] },
      { form: 'profile', title: 'Couples split', fields: ['moneyStyle', 'splitMine', 'splitMethod'].map(P) },
      { form: 'profile', title: 'Your community and calendar', fields: keys('calendars', ['jewish', 'shabbat', 'muslim', 'christian', 'orthodox', 'us']) },
      { form: 'profile', title: 'Which do you have today', fields: [...keys('areas', ['cash', 'investments', 'real', 'debt']), P('noneOfThese')] },
    ] },
  { name: 'Net worth › Assets', route: '#/net-worth/assets', about: 'Assets in SLAM: cash, investments and what you own, by type, then the cash layers and the institutions. Type balances in the blue boxes; a new row goes in a blank row of its section.',
    blocks: [
      { table: 'assets', title: 'Assets' },
      { math: 'What it comes to', rows: ['M41_cash', 'M41_invested', 'M42', 'M43', 'M43_months'] },
      { form: 'profile', title: 'Cash layers', fields: [P('sleepAtNight'), P('settings.layerMode')] },
      { math: 'Cash layers', rows: ['M68_littleE'] },
      { table: 'gaps', title: 'Income gaps' },
      { table: 'backups', title: 'Backups' },
      { table: 'institutions', title: 'Institutions' },
    ] },
  { name: 'Net worth › Debt', route: '#/net-worth/debt', about: 'Debt in SLAM: everything you owe, by section. Credit cards are here too (one table feeds every debt formula); the Credit cards tab shows what they add up to.',
    blocks: [
      { form: 'profile', title: 'Order', fields: [P('settings.debtOrder')] },
      { table: 'debt', title: 'Debt' },
      { math: 'What it comes to', rows: ['M30', 'M31', 'M32', 'M33', 'M36'] },
    ] },
  { name: 'Net worth › Credit cards', route: '#/net-worth/credit-cards', about: 'Credit cards in SLAM: what your cards give you and your credit. Each card\'s own row is on Net worth › Debt, under Credit cards.',
    blocks: [
      { math: 'Credit cards', rows: ['M35', 'M37'] },
      { math: 'What your cards give you', rows: ['M9C', 'M9C_doubled'] },
      { form: 'profile', title: 'Your credit', fields: keys('credit', ['score', 'source', 'checked', 'scorePartner', 'sourcePartner', 'checkedPartner', 'latePayments', 'lateCount', 'oldestAccountYears', 'inquiries', 'freezeEquifax', 'freezeExperian', 'freezeTransUnion']) },
      { math: 'What would move your score', rows: ['M9D'] },
    ] },
  { name: 'Net worth › Protection', route: '#/net-worth/protection', about: 'Protection in SLAM: each coverage you have, or not. The life admin checklist stays in the app.',
    blocks: [{ table: 'protection', title: 'Coverage' }] },
  { name: 'Net worth › Fire drill', route: '#/net-worth/fire-drill', about: 'The bank fire drill in SLAM: if one account froze today. Nothing to type here; the numbers come from your accounts, bills and paychecks.',
    blocks: [{ math: 'If this account froze today', rows: ['M9F_outOfReach', 'M9F', 'M9F_withCard', 'M9F_mustPay'] }] },
  { name: 'Cash flow › Income', route: '#/cash-flow/income', about: 'Income in SLAM: every paycheck and other money in, by person and type, with what comes out of each paycheck in its columns.',
    blocks: [
      { table: 'income', title: 'Income' },
      { form: 'profile', title: 'Variable income', fields: keys('variable', ['last12', 'typical', 'lowest', 'setAside', 'business', 'months']) },
      { form: 'profile', title: 'Work hours', fields: keys('hours', ['paidHours', 'commuteHours', 'prepHours', 'workCosts']) },
      { math: 'What it comes to', rows: ['M13', 'M12', 'M12_extra', 'M12_platform', 'M15', 'M16', 'M16_rate', 'M17'] },
    ] },
  { name: 'Cash flow › Taxes', route: '#/cash-flow/taxes', about: 'Taxes in SLAM: how you file and what happened last year. The taxes themselves are worked out from Income.',
    blocks: [
      { form: 'taxes', title: 'Filing', fields: ['taxes.filingStatus', 'taxes.w4Status', 'taxes.w4Extra', 'taxes.quarterlyPaid', 'taxes.lastYearTax', 'taxes.lastYearAmount', P('taxes.lastYear'), P('taxes.withholdingChanged')], cols: ['filing', 'joint'] },
      { math: 'What you pay', rows: ['M10', 'M10_tips', 'M11', 'M14', 'M14_marginal'] },
    ] },
  { name: 'Cash flow › Budget', route: '#/cash-flow/budget', about: 'Budget in SLAM: your gut number, then each category and its lines, then irregular and yearly costs. Type amounts in the blue boxes; a new line goes in a blank row of its category.',
    blocks: [
      { form: 'profile', title: 'Settings for this budget', fields: [P('spending.source'), P('spending.basis'), P('mostOnCards')] },
      { table: 'spending', title: 'Budget by category' },
      { math: 'What it comes to', rows: ['M27_gut', 'M27_lines', 'M27_spending', 'M20', 'M21', 'M22', 'M23', 'M24', 'M26'] },
    ] },
  { name: 'Cash flow › Calendar', route: '#/cash-flow/calendar', about: 'Calendar in SLAM: one-off money in and out, and wins. Paydays and bills land on the calendar from Income and Budget.',
    blocks: [{ table: 'calendar', title: 'Calendar entries' }, { math: 'Running balance', rows: ['M60'] }] },
  { name: 'Cash flow › Month end', route: '#/cash-flow/close', about: 'Month end in SLAM: each Budget line, month by month, the plan for that month and what it really was.',
    blocks: [{ table: 'months', title: 'The months' }, { math: 'What it comes to', rows: ['M25', 'M25_byCategory', 'M77'] }] },
  { name: 'Plan › Goals', route: '#/plan/goals', about: 'Goals in SLAM: the FI date and what moves it, the milestones, and the dated events in your year (shown on Plan › Next 12 months).',
    blocks: [
      { form: 'profile', title: 'FI date and assumptions', fields: [P('settings.dollars')] },
      { math: 'FI date', rows: ['M53=Months to FI', 'M50=FI number', 'M50_later', 'M51=Lean FI number', 'M52=Barista FI number', 'M54=FI number in today\'s dollars', 'M55=Of the way to FI', 'M53_safer', 'M72', 'M9R_fiLow', 'M9R_fiLikely', 'M9R_fiHigh', 'M83'] },
      { math: 'These are big deals', rows: ['M56', 'M75', 'M75_next', 'M75_marker'] },
      { table: 'goals', title: 'Milestones and events' },
    ] },
  { name: 'Plan › FOO', route: '#/plan/foo', about: 'FOO in SLAM: your path through the financial order of operations. Giving, launch and the job are yours to set; the steps are worked out.',
    blocks: [
      { form: 'profile', title: 'Giving, launch and the job', fields: [...keys('giving', ['on', 'mode', 'pct', 'base', 'amount']), P('keepJobAfterLaunch'), P('launch.move'), P('launch.date'), P('settings.qqOpensLaunch')] },
      { report: 'FOO' },
      { math: 'What the freed money does', rows: ['M79', 'M80'] },
    ] },
  { name: 'Plan › Scorecard', route: '#/plan/scorecard', about: 'Scorecard in SLAM: the eleven areas, the holes ranked, the goals and the next chapter.',
    blocks: [{ form: 'profile', title: 'What the Income area asks', fields: keys('incomeFacts', ['lastRaiseDate', 'lastRaiseAmount', 'marketRate']) }, { report: 'Scorecard' }] },
  { name: 'Plan › Timeline', route: '#/plan/timeline', about: 'Timeline in SLAM: invested balance rising to your FI number, year by year, as live formulas.',
    blocks: [{ report: 'Projections', tables: 'years' }] },
  { name: 'Plan › Debt payoff', route: '#/plan/debt-payoff', about: 'Debt payoff in SLAM: when each debt is gone and what it costs. The order is set on Net worth › Debt.',
    blocks: [
      { math: 'Debt free', rows: ['M34', 'M34_heavy', 'M34_minimum', 'M34_rangeLow', 'M34_rangeHigh'] },
      { math: 'The true cost of each debt', rows: ['M9T', 'M9L', 'M9S'] },
      { report: 'Projections', tables: 'debts' },
    ] },
  { name: 'Plan › Next 12 months', route: '#/plan/next-12-months', about: 'Next 12 months in SLAM: your year, the sinking funds and the upcoming events. The events themselves are typed on Plan › Goals.',
    blocks: [{ math: 'Sinking funds', rows: ['M24', 'M27_sinking'] }, { math: 'Your year', rows: ['M61', 'M78'] }] },
  { name: 'Plan › Current vs Proposed', route: '#/plan/scenarios', about: 'Current vs Proposed in SLAM: each result on the plan as it is and with the Proposed choices. The choices are made in SLAM.',
    blocks: [{ math: 'Proposed', rows: ['M76', 'M76_nw5'] }, { report: 'Proposed' }] },
  { name: 'Plan › Transitions', route: '#/plan/transitions', about: 'Life Transitions in SLAM: the runway through a change. The plan itself (rungs, tripwires) is set in SLAM.',
    blocks: [{ math: 'What is changing?', rows: ['M90', 'M90_full', 'M90_food'] }] },
  { name: 'Plan › Raise and benefits', route: '#/plan/cliff', about: 'What a raise does to your benefits, in SLAM. Pick what you get today; the lines are worked out.',
    blocks: [
      { form: 'profile', title: 'Your benefits now', fields: [...keys('cliff', ['snap', 'medicaid', 'essential', 'aca', 'kids', 'eitc', 'snapAmount', 'careCosts'])] },
      { math: 'What a raise does', rows: ['M9B', 'M9B_snap', 'M9B_help', 'M9B_eitc', 'M9B_raise5k'] },
    ] },
  { name: 'Report › Overview', route: '#/report/overview', about: 'Overview in SLAM: the metrics, your Shockingly Simple Math and where the money goes. Nothing to type here.',
    blocks: [
      { math: 'Metrics', rows: ['M27=Surplus', 'M28=Savings rate', 'M28_base=Savings rate, surplus only', 'M40=Net worth', 'M41=Liquid net worth', 'M42=Runway (months)', 'M36=Debt-to-income', 'M35=Utilization', 'M58=FI days for $100', 'M58_hours=Hours of work for $100', 'M73=Picture'] },
      { math: 'Your Shockingly Simple Math', rows: ['M72=Years to FI from $0 at your savings rate', 'M53=Months to FI', 'M9E_netWorth=Typical net worth at your age'] },
      { math: 'Where the money goes', rows: ['M29_Debt', 'M29_Retirement', 'M29_Accommodation', 'M29_Food', 'M29_Transportation', 'M29_Taxes', 'M29_Therapy', 'M2A'] },
      { math: 'Fixed and variable', rows: ['M23'] },
      { math: 'Ranges', rows: ['M9R_surplusLow', 'M9R_surplusLikely', 'M9R_surplusHigh', 'M9R_netWorthLow', 'M9R_netWorthLikely', 'M9R_netWorthHigh', 'M9R_efMonthsLow', 'M9R_efMonthsLikely', 'M9R_efMonthsHigh'] },
    ] },
  { name: 'Report › Statements', route: '#/report/statements', about: 'Statements in SLAM: net worth, income and spending, and cash flow, as formulas off the other tabs.',
    blocks: [{ report: 'Statements' }] },
  { name: 'Report › Lender\'s view', route: '#/report/lender', about: 'What a lender sees, in SLAM: a mortgage lender, a landlord and a card issuer. Nothing to type here.',
    blocks: [{ math: 'What each one counts', rows: ['M9W', 'M9W_counted', 'M9W_earned', 'M9W_gap', 'M9W_landlord', 'M9W_loan'] }] },
  { name: 'Coach tools', route: '#/tools/session', also: ['#/tools/discovery'], about: 'Coach tools in SLAM (behind the gear): the session switch, Discovery and Ask me next.',
    blocks: [
      { form: 'profile', title: 'Session', fields: [P('settings.phase4')] },
      { math: 'Discovery', rows: ['M95', 'M95_address', 'M95_weather'] },
      { math: 'Ask me next', rows: ['M9Q', 'M9Q_ask', 'M9Q_then'] },
    ] },
];

// Screens with no tab, and why (docs/WORKBOOK.md).
export const NO_TAB = [
  ['Report › One-pager', 'the page this file is opened from: its numbers are on Report › Overview and Plan › Goals, its words are made in the app'],
  ['Report › History', 'dated history and snapshots stay in the app and the backup file'],
  ['Coach tools › Lists', 'the Revisit, Homework and Defaults in use lists are worked out in the app from the rows on the other tabs'],
  ['Coach tools › Data', 'the buttons that make and read this file'],
];

// The engine room after the screens: Assumptions (every rate and limit, its own tab), Math (every formula, the Check
// beside each), Captured (kept for a later Wrapped).
export const ENGINE_TABS = ['Assumptions', 'Math', 'Captured'];

export const tabOfArea = id => SCREEN_TABS.find(t => t.blocks.some(b => b.table === id))?.name ?? null;
export const tabOfField = fid => SCREEN_TABS.find(t => t.blocks.some(b => b.form && b.fields.includes(fid)))?.name ?? null;
export const tabOfReport = id => SCREEN_TABS.find(t => t.blocks.some(b => b.report === id))?.name ?? id;

// ---------- Sections: each table's rows in the screen's groups ----------
// A section is { key, title, items, blank, types? }. key holds the defaults a new row in the section takes, as
// "name=value;..." (kind, type, owner, or a field's key): the import reads them back from the band row's hidden cell.
export const encodeDefaults = d => Object.entries(d).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}=${v}`).join(';');
export const decodeDefaults = key => Object.fromEntries(String(key || '').split(';').filter(Boolean).map(x => { const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1)]; }));

const LOANS = new Set(['Student loan', 'Car loan', 'Personal loan', 'Mortgage']); // as the Debt screen groups them (js/ui/lists.js)
const typeOrder = (area, kind) => t => { const i = (area.types?.[kind] ?? []).indexOf(t); return i < 0 ? 999 : i; };
const byOrder = f => (a, b) => f(a) - f(b);
const person = (doc, id) => adultsOf(doc).find(a => a.id === (id || 'Me'))?.name ?? (id === 'Joint' ? 'Joint' : id || 'Me');
const ym = s => { const [y, m] = String(s).split('-'); return new Date(Date.UTC(+y, +m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }); };

export function sectionsOf(area, doc, items, ref = null) {
  const recs = items.map(it => it.rec);
  const of = pred => items.filter(it => pred(it.rec ?? it));
  switch (area.id) {
    case 'income': {
      const multi = multiAdult(doc) || recs.some(r => r.kind === 'income' && r.owner && r.owner !== 'Me');
      const inc = items.filter(it => it.rec.kind === 'income');
      const owners = [...new Set(inc.map(it => it.rec.owner || 'Me'))].sort(byOrder(o => { const i = ['Me', 'Partner', 'Joint', 'P3', 'P4', 'P5', 'P6', 'P7'].indexOf(o); return i < 0 ? 99 : i; }));
      const order = typeOrder(area, 'income');
      const out = [];
      for (const o of multi ? owners : [null]) {
        const mine = inc.filter(it => !multi || (it.rec.owner || 'Me') === o);
        const types = [...new Set(mine.map(it => it.rec.type || ''))].sort(byOrder(order));
        for (const t of types) out.push({ key: encodeDefaults({ kind: 'income', owner: multi ? o : null, type: t || null }), title: [multi ? person(doc, o) : null, t || 'Income'].filter(Boolean).join(': '), items: mine.filter(it => (it.rec.type || '') === t), blank: 1, types: area.types.income });
      }
      if (!out.length) out.push({ key: encodeDefaults({ kind: 'income' }), title: 'Income', items: [], blank: 3, types: area.types.income });
      out.push({ key: encodeDefaults({ kind: 'benefit' }), title: 'Other benefits', items: of(r => r.kind === 'benefit'), blank: 2 });
      return out;
    }
    case 'debt': {
      const order = typeOrder(area, 'debt');
      const sorted = list => list.sort(byOrder(it => order(it.rec.type)));
      return [
        { key: encodeDefaults({ kind: 'debt', type: 'Credit card' }), title: 'Credit cards', items: of(r => r.type === 'Credit card'), blank: 2, types: ['Credit card'] },
        { key: encodeDefaults({ kind: 'debt' }), title: 'Loans', items: sorted(of(r => LOANS.has(r.type))), blank: 2, types: [...LOANS] },
        { key: encodeDefaults({ kind: 'debt' }), title: 'Other', items: sorted(of(r => r.type !== 'Credit card' && !LOANS.has(r.type))), blank: 2, types: area.types.debt.filter(t => t !== 'Credit card' && !LOANS.has(t)) },
      ];
    }
    case 'assets': {
      const order = typeOrder(area, 'account'), aorder = typeOrder(area, 'asset');
      const investTypes = ref?.lists?.investmentTypes ?? area.types.account.filter(t => !['Checking', 'Savings or HYSA', 'Money market', 'CD', 'Cash on hand', 'Payment app'].includes(t));
      return [
        { key: encodeDefaults({ kind: 'account', group: 'cash' }), title: 'Cash', items: of(r => r.kind === 'account' && r.values?.group !== 'investment').sort(byOrder(it => order(it.rec.type))), blank: 2, types: area.types.account.filter(t => !investTypes.includes(t) || t === 'Other') },
        { key: encodeDefaults({ kind: 'account', group: 'investment' }), title: 'Investments', items: of(r => r.kind === 'account' && r.values?.group === 'investment').sort(byOrder(it => order(it.rec.type))), blank: 2, types: investTypes },
        { key: encodeDefaults({ kind: 'asset' }), title: 'Home or car', items: of(r => r.kind === 'asset').sort(byOrder(it => aorder(it.rec.type))), blank: 2, types: area.types.asset },
      ];
    }
    case 'protection': {
      const order = typeOrder(area, 'coverage');
      return [{ key: encodeDefaults({ kind: 'coverage' }), title: 'Coverage', items: items.slice().sort(byOrder(it => order(it.rec.type))), blank: 3, types: area.types.coverage }];
    }
    case 'spending': {
      const isLine = r => r.kind === 'bill';
      const out = [{ key: encodeDefaults({ kind: 'spending' }), title: 'Your gut number', items: of(r => r.kind === 'spending' && !isCategoryRecord(r)), blank: 0 }];
      for (const k of CATEGORIES) {
        out.push({ key: encodeDefaults({ kind: 'bill', draftt: k === 'Other' ? null : k }), title: categoryName(k), blank: 1,
          items: [...of(r => isCategoryRecord(r) && r.type === k), ...of(r => isLine(r) && !r.values?.irregular && categoryKeyOf(r) === k)] });
      }
      out.push({ key: encodeDefaults({ kind: 'bill', irregular: 'Yes' }), title: 'Irregular and yearly costs', items: of(r => isLine(r) && r.values?.irregular), blank: 2 });
      return out;
    }
    case 'calendar':
      return [{ key: encodeDefaults({ kind: 'entry' }), title: 'Money in and out', items: of(r => r.kind === 'entry'), blank: 3, types: area.types.entry },
        { key: encodeDefaults({ kind: 'win', type: 'Win' }), title: 'Wins', items: of(r => r.kind === 'win'), blank: 1, types: ['Win'] }];
    case 'goals':
      return [{ key: encodeDefaults({ kind: 'milestone' }), title: 'Milestones', items: of(r => r.kind === 'milestone'), blank: 2, types: area.types.milestone },
        { key: encodeDefaults({ kind: 'event' }), title: 'Upcoming events', items: of(r => r.kind === 'event'), blank: 2 }];
    case 'months': {
      const months = [...new Set(items.map(it => it.ym))].sort();
      const out = months.map(m => ({ key: encodeDefaults({ month: m }), title: ym(m), items: items.filter(it => it.ym === m), blank: 1 }));
      if (!out.length) out.push({ key: '', title: 'New month lines', items: [], blank: 3 });
      return out;
    }
    case 'backups': // one row per backup the screen asks about, in its order; a missing one is a row with its name and no amount
      return [{ key: '', title: null, items, blank: 0, slots: area.fields.find(f => f.key === 'kind').options.filter(k => !items.some(it => it.id === k)).map(k => ({ kind: k })) }];
    default: // a list (Institutions, People, Income gaps): one section, a few blank rows
      return [{ key: '', title: null, items, blank: 3 }];
  }
}
