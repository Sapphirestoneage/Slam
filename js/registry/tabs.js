// SPDX-License-Identifier: AGPL-3.0-only
// The workbook's tabs follow the session (batch 59; Eli, Nov 6 3:30 pm: "sheet for me, app for clients", in Google
// Sheets; the app's nav will be made to match): You, Money in, Money out, Own and owe, The plan, The future, Statements,
// One-pager, then Assumptions and the engine room (Math). Each input tab reads top to bottom as "fill it out and fill it
// out some more": one line saying what to do, the tab's result at the top (it fills in as the boxes do), then the boxes
// in the order a coach asks them. js/sheet/workbook.js builds the tabs from this list only, and js/import-sheet.js reads
// them back by the hidden keys the build writes (never by position). docs/WORKBOOK.md "Tabs follow the session".
//
// A tab is { name, screens (the app's routes it holds), about, blocks }. A block is one of:
//   { form: area, title, fields: [field ids], cols: [formula column keys] }   label and value rows (a doc area's fields)
//   { table: area, title }                                                    the area's rows, in the screen's sections
//   { math: title, rows: [math ids] }                                         live formulas off the Math tab, with a Check
//                                                                             ('M27=Surplus': the row in the app's words)
//   { report: tab id, tables: 'years' | 'debts' }                             a report's tables (js/registry/reports.js)
//   { note: text }                                                            a plain line
// test/coverage.test.js checks that every doc field the workbook carries has exactly one form row here, every table area
// one home, every screen of the app a tab (or a reason), and every tab name is one Excel and Google Sheets take.
import { adultsOf, multiAdult } from './couples.js';
import { CATEGORIES, categoryName, categoryKeyOf, isCategoryRecord } from '../math/spending.js';

const P = k => `profile.${k}`;
const keys = (prefix, list) => list.map(k => P(`${prefix}.${k}`));

export const SCREEN_TABS = [
  { name: 'You', screens: ['#/home/profile', '#/tools/discovery', '#/tools/session'],
    about: 'You: who is in the plan and what applies. Fill in the blue boxes from the top; the tab\'s result above fills in as you go.',
    blocks: [
      { math: 'Where this stands', rows: ['M73=Picture', 'M73_answered=Answered', 'M73_solid=Solid', 'M9Q_ask=Ask next'] },
      { form: 'profile', title: 'About you', fields: [P('client.name'), ...['firstName', 'lastName', 'birthMonth', 'birthYear', 'age', 'state', 'nyc', 'partnerName', 'partnerBirthYear', 'kidAges', 'healthCoverage', 'email', 'phone'].map(P)], cols: ['ageUsed'] },
      { form: 'profile', title: 'What applies to me', fields: ['hasCar', 'dependents', 'hasPets', 'housing', 'workSituation', 'hsaEligible', 'fsa', 'equityPay', 'mode', 'household'].map(P) },
      { form: 'profile', title: 'Why now', fields: [P('whyNow'), P('worry'), P('goalWords'), ...keys('chips', ['whyNow', 'worry', 'goalWords']), ...keys('chipStar', ['whyNow', 'worry', 'goalWords']), ...keys('chipOther', ['whyNow', 'worry', 'goalWords'])] },
      { table: 'people', title: 'People' },
      { form: 'profile', title: 'Work and home', fields: ['worstCase', 'bigEMultiplier', 'incomeStability'].map(P) },
      { form: 'profile', title: 'Home and shared bills', fields: [P('roommates'), P('splitWays'), ...['rent', 'utilities', 'internet', 'renters', 'groceries', 'household'].flatMap(b => [P(`shared.${b}`), P(`sharedAs.${b}`)])] },
      { form: 'profile', title: 'Couples split', fields: ['moneyStyle', 'splitMine', 'splitMethod'].map(P) },
      { form: 'profile', title: 'Which do you have today', fields: [...keys('areas', ['cash', 'investments', 'real', 'debt']), P('noneOfThese')] },
      { form: 'profile', title: 'Your community and calendar', fields: keys('calendars', ['jewish', 'shabbat', 'muslim', 'christian', 'orthodox', 'us']) },
      { math: 'Who they are with money', rows: ['M95=Who they are with money', 'M95_address=FI Address', 'M95_weather=Money weather'] },
      { form: 'profile', title: 'Session', fields: [P('settings.phase4')] },
    ] },
  { name: 'Money in', screens: ['#/cash-flow/income', '#/cash-flow/taxes', '#/plan/cliff'],
    about: 'Money in: every paycheck and other money in, then how you file. Fill in the blue boxes from the top; take-home above fills in as you go.',
    blocks: [
      { math: 'Where this stands', rows: ['M12=Take-home a month', 'M13=Gross a year', 'M10=Federal income tax a year', 'M11=Social Security and Medicare a year', 'M14=Effective tax rate'] },
      { table: 'income', title: 'Income' },
      { form: 'taxes', title: 'Taxes', fields: ['taxes.filingStatus', 'taxes.w4Status', 'taxes.w4Extra', 'taxes.quarterlyPaid', 'taxes.lastYearTax', 'taxes.lastYearAmount', P('taxes.lastYear'), P('taxes.withholdingChanged')], cols: ['filing', 'joint'] },
      { form: 'profile', title: 'Variable income', fields: keys('variable', ['last12', 'typical', 'lowest', 'setAside', 'business', 'months']) },
      { form: 'profile', title: 'Work hours', fields: keys('hours', ['paidHours', 'commuteHours', 'prepHours', 'workCosts']) },
      { form: 'profile', title: 'Benefits now', fields: [...keys('cliff', ['snap', 'medicaid', 'essential', 'aca', 'kids', 'eitc', 'ccap', 'snapAmount', 'careCosts', 'careFull'])] },
      { math: 'More about money in', rows: ['M10_tips', 'M10_ctc=Child Tax Credit a year', 'M12_extra', 'M12_platform', 'M14_marginal=Marginal tax rate', 'M15=Employer match a year', 'M16=Variable income safe budget', 'M16_rate', 'M17=Real hourly wage', 'M9H_real', 'M9H'] },
      { math: 'What a raise does to your benefits', rows: ['M9B', 'M9B_snap', 'M9B_help', 'M9B_eitc', 'M9B_ccap', 'M9B_raise5k'] },
    ] },
  { name: 'Money out', screens: ['#/cash-flow/budget', '#/cash-flow/calendar', '#/cash-flow/close', '#/plan/next-12-months'],
    about: 'Money out: your gut number first, then each category and its lines. Fill in the blue boxes from the top; spending above fills in as you go.',
    blocks: [
      { math: 'Where this stands', rows: ['M27_spending=Spending a month', 'M27_gut=Your gut number', 'M27_lines=The categories add up to', 'M26=Gut accuracy'] },
      { table: 'spending', title: 'Your gut number, then the Budget' },
      { form: 'profile', title: 'Settings for this budget', fields: [P('spending.source'), P('spending.basis'), P('mostOnCards')] },
      { math: 'More about money out', rows: ['M20', 'M21', 'M22', 'M23', 'M24', 'M27_sinking', 'M61', 'M78'] },
      { table: 'calendar', title: 'Calendar: money in and out once, and wins' },
      { table: 'months', title: 'Month end: the plan and the actual, month by month' },
      { math: 'Month end', rows: ['M25', 'M25_byCategory', 'M77', 'M60'] },
    ] },
  { name: 'Own and owe', screens: ['#/net-worth/assets', '#/net-worth/debt', '#/net-worth/credit-cards', '#/net-worth/protection', '#/net-worth/fire-drill', '#/report/lender'],
    about: 'Own and owe: what you have, then what you owe, then your cover. Fill in the blue boxes from the top; net worth above fills in as you go.',
    blocks: [
      { math: 'Where this stands', rows: ['M40=Net worth', 'M41=Liquid net worth', 'M41_cash=Cash', 'M41_invested=Invested toward FI', 'M42=Runway (months)'] },
      { table: 'assets', title: 'Assets' },
      { form: 'profile', title: 'Order to pay off debt', fields: [P('settings.debtOrder')] },
      { table: 'debt', title: 'Debt (credit cards first)' },
      { math: 'What you owe comes to', rows: ['M30', 'M31', 'M32', 'M33', 'M36=Debt-to-income', 'M35=Utilization', 'M37'] },
      { form: 'profile', title: 'Your credit', fields: keys('credit', ['score', 'source', 'checked', 'scorePartner', 'sourcePartner', 'checkedPartner', 'latePayments', 'lateCount', 'oldestAccountYears', 'inquiries', 'freezeEquifax', 'freezeExperian', 'freezeTransUnion']) },
      { math: 'What your cards give you', rows: ['M9C', 'M9C_doubled', 'M9D'] },
      { table: 'protection', title: 'Protection' },
      { form: 'profile', title: 'Cash layers', fields: [P('sleepAtNight'), P('settings.layerMode')] },
      { math: 'Cash layers', rows: ['M43=Rule of 5 target', 'M43_months', 'M43_gap', 'M68_littleE'] },
      { table: 'gaps', title: 'Income gaps' },
      { table: 'backups', title: 'Backups' },
      { table: 'institutions', title: 'Institutions' },
      { math: 'If one account froze today', rows: ['M9F_outOfReach', 'M9F', 'M9F_withCard', 'M9F_mustPay'] },
      { math: 'What a lender sees', rows: ['M9W', 'M9W_counted', 'M9W_earned', 'M9W_gap', 'M9W_landlord', 'M9W_loan'] },
    ] },
  { name: 'The plan', screens: ['#/home/session', '#/plan/foo', '#/plan/scorecard', '#/plan/scenarios'],
    about: 'The plan: where each dollar goes, and the FOO step you are on. Fill in the blue boxes from the top; the surplus above fills in as you go.',
    blocks: [
      { math: 'Where this stands', rows: ['M27=Surplus', 'M28=Savings rate', 'M69=The FOO step you are on', 'M82=Your next 3 moves'] },
      { math: 'Where each dollar goes', rows: ['M12=Take-home a month', 'M27_spending=Spending a month', 'M27_debtOut=Debt payments not in spending', 'M27_sinking=Set aside for dated goals', 'M27_retire=Retirement on the Budget', 'M28_pretax', 'M28_match', 'M27=Surplus',
        'M29_Debt', 'M29_Retirement', 'M29_Accommodation', 'M29_Food', 'M29_Transportation', 'M29_Taxes', 'M29_Therapy', 'M2A'] },
      { form: 'profile', title: 'Extra to debt', fields: [P('settings.debtExtra')] },
      { form: 'profile', title: 'Giving, launch and the job', fields: [...keys('giving', ['on', 'mode', 'pct', 'base', 'amount']), P('keepJobAfterLaunch'), P('launch.move'), P('launch.date'), P('settings.qqOpensLaunch')] },
      { report: 'FOO' },
      { math: 'What the freed money does', rows: ['M79', 'M80', 'M81=What the month is short'] },
      { form: 'profile', title: 'What the Income area asks', fields: keys('incomeFacts', ['lastRaiseDate', 'lastRaiseAmount', 'marketRate']) },
      { report: 'Scorecard' },
      { math: 'Current vs Proposed', rows: ['M76', 'M76_nw5'] },
      { report: 'Proposed' },
    ] },
  { name: 'The future', screens: ['#/plan/goals', '#/plan/timeline', '#/plan/debt-payoff', '#/plan/transitions'],
    about: 'The future: the FI date and its range, the debt-free date, and your goals. Fill in the blue boxes from the top; the dates above fill in as you go.',
    blocks: [
      { math: 'Where this stands', rows: ['M53=Months to FI', 'M9R_fiLow=Months to FI, soonest likely', 'M9R_fiHigh=Months to FI, latest likely', 'M34=Months to debt free', 'M34_rangeLow=Debt free, soonest likely', 'M34_rangeHigh=Debt free, latest likely'] },
      { form: 'profile', title: 'FI date and assumptions', fields: [P('settings.dollars')] },
      { math: 'FI number', rows: ['M50=FI number', 'M50_later', 'M51=Lean FI number', 'M52=Barista FI number', 'M54=FI number in today\'s dollars', 'M55=Of the way to FI', 'M53_safer', 'M72=Years to FI from $0 at your savings rate', 'M70', 'M83'] },
      { table: 'goals', title: 'Goals: milestones and dated events' },
      { math: 'These are big deals', rows: ['M56', 'M75', 'M75_next', 'M75_marker'] },
      { report: 'Projections', tables: 'years' },
      { math: 'Debt free', rows: ['M34_heavy', 'M34_minimum', 'M9T', 'M9L', 'M9S'] },
      { report: 'Projections', tables: 'debts' },
      { math: 'Life Transitions', rows: ['M90', 'M90_full', 'M90_food'] },
    ] },
  { name: 'Statements', screens: ['#/report/statements'],
    about: 'Statements: net worth, income and spending, and cash flow, as formulas off the other tabs. Nothing to type here.',
    blocks: [{ report: 'Statements' }] },
  { name: 'One-pager', screens: ['#/report/one-pager', '#/report/overview'],
    about: 'One-pager: the numbers to share at the end of a session, with the program and the picture. Nothing to type here.',
    blocks: [
      { math: 'Metrics', rows: ['M27=Surplus', 'M28=Savings rate', 'M28_base=Savings rate, surplus only', 'M40=Net worth', 'M41=Liquid net worth', 'M42=Runway (months)', 'M36=Debt-to-income', 'M35=Utilization', 'M58=FI days for $100', 'M58_hours=Hours of work for $100', 'M53=Months to FI', 'M9E_netWorth=Typical net worth at your age'] },
      { math: 'Ranges', rows: ['M9R_surplusLow', 'M9R_surplusLikely', 'M9R_surplusHigh', 'M9R_netWorthLow', 'M9R_netWorthLikely', 'M9R_netWorthHigh', 'M9R_efMonthsLow', 'M9R_efMonthsLikely', 'M9R_efMonthsHigh'] },
      { math: 'Your next 3 moves', rows: ['M82', 'M80'] },
      { report: 'Program' },
    ] },
];

// Screens of the app with no tab, and why (docs/WORKBOOK.md).
export const NO_TAB = [
  ['Net worth › Money control', 'who is on each account and who can move or freeze it is private by design (batch 55): the workbook leaves it out'],
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
