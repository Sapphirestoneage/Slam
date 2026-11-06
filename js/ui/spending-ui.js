// SPDX-License-Identifier: AGPL-3.0-only
// Spending (build phase 6): Budget with five passes, irregular costs, the cash flow calendar and month-end close.
// Every screen is a view of the same records (R117); the month model lives in js/month.js.
import { fillCounter } from './counts-ui.js';
import { budgetCompletion } from '../completion.js';
import { h, clear, icon } from './dom.js';
import { institutionsOf } from '../institutions.js';
import { parseCsv, guessMap, toTransactions, dedupe, suggestLine, matchIncome, importTransactions, saveBankMap, bankMapOf, PDF_WHY } from '../import/csv.js';
import { layersOf } from '../math/layers.js';
import { categoriesOf, categoryJoyOf, rateCategoryJoy } from '../capture.js';
import { maaserOf, KOSHER_NOTE } from '../community.js';
import { drafttName } from '../math/spending.js';
import * as S from './staples.js';
import { spendingList, categoryList, irregularList, IRREGULAR, lineMonthlyOf } from './lists.js';
import { ensureCategories } from '../presets.js';
import { ymOf, addMonths, monthName, daysIn, dateOf, instances, balances, monthView, closeMonth, reopenMonth, carry,
  closedMonths, mark, bonusPaycheck, startBalance, gutRecord, GROUPS, planDiffs, closeStreak, collapseSpread, dayTotals, recurringBills } from '../month.js';
import { gutAccuracy, DRAFTT, gutVsLinesWords } from '../math/spending.js';
import { statements, BUCKETS, defaultBucket } from '../math/statements.js';
import { calendarMarkers } from '../math/markers.js';
import { money, pct } from '../format.js';

// Screen state that is about looking, not the client's numbers (kept for this browser tab).
export const UI = { pass: 'Plan', ym: null, period: 'Monthly', groupBy: 'DRAFTT', calYm: null, range: 'Month', show: new Set(GROUPS), openDay: null, review: null, markers: true, view: 'month', totalsOnly: false }; // batch 6: Month or Full list; Totals only
const thisYm = ctx => ymOf(ctx.now());
const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const sum = (list, f) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const short = v => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(Math.abs(v) >= 10000 ? 0 : 1)}k` : money(v));
const PERIOD = { Monthly: 1, '3 months': 3, '6 months': 6, Annual: 12 };
// Two passes (polish item 2): Plan (each line's usual number and this month's plan) and Actual. The gut number sits
// at the top of Plan; the old Basics totals are Fast Track's, behind a caret. Stored passes are unchanged.
const WHAT = {
  Plan: "What each line usually is, and this month's plan. A blank month uses the usual number.",
  Actual: 'What really happened. Lines marked Paid on the calendar fill in on their own.',
};
const monthStepper = (ym, onChange) => h('span.row-line.month-step', { style: { gap: '6px', flexWrap: 'nowrap' } },
  S.iconButton('left', 'Previous month', () => onChange(addMonths(ym, -1))), h('strong', { style: { minWidth: '130px', textAlign: 'center' } }, monthName(ym)),
  S.iconButton('right', 'Next month', () => onChange(addMonths(ym, 1))));

// ---------- Budget ----------
export function budgetScreen(app, ctx) {
  UI.ym ??= thisYm(ctx);
  UI.budgetView ??= 'categories'; // batch 8 (A1): one row per category by default; All lines is the old table
  if (UI.budgetView === 'categories') ensureCategories(ctx.store);
  const doc = ctx.store.doc;
  const m = ctx.metrics();
  const redraw = () => app.render();
  const cardsMost = !!doc.profile.mostOnCards;
  const passBar = h('div.card.pass-bar', {},
    h('div.row-line', { style: { gap: '12px' } },
      h('span.label', {}, 'Pass'), S.toggle(['Plan', 'Actual'], UI.pass === 'Actual' ? 'Actual' : 'Plan', v => { UI.pass = v; redraw(); }, { label: 'Which pass you are filling' }),
      monthStepper(UI.ym, v => { UI.ym = v; redraw(); }),
      UI.pass === 'Plan' ? S.toggle([['categories', 'By category'], ['lines', 'All lines']], UI.budgetView, v => { UI.budgetView = v; redraw(); }, { label: 'Budget view' }) : null,
      h('span.spacer', { style: { flex: 1 } })),
    h('p.muted.pass-what', {}, WHAT[UI.pass] ?? WHAT.Plan),
    S.moreBlock('budget:settings', () => h('div.row-line', { style: { gap: '20px', alignItems: 'flex-start' } },
      S.labelled('Use for surplus and FI', S.toggle([['gut', 'Gut number'], ['lines', 'The categories']], m.inputs.spendingSource, v => ctx.store.setDoc('spending', { source: v }), { label: 'Spending used for the math' }),
        { note: m.inputs.gutTotal === null ? 'No gut number yet, so the categories are used' : `Gut ${money(m.inputs.gutTotal)} · categories ${money(m.inputs.lineTotal ?? 0)}` }),
      S.labelled('Group by', S.toggle(['DRAFTT', 'Category', ['Who', 'Who covers it']], UI.groupBy, v => { UI.groupBy = v; redraw(); }, { label: 'Group by' }), { note: 'DRAFTT letters, plain categories, or who pays' }),
      S.labelled('Basis', S.toggle([['accrual', 'Accrual'], ['cash', 'Cash']], doc.spending.basis || 'accrual', v => ctx.store.setDoc('spending', { basis: v }), { label: 'Cash or accrual' }),
        { note: 'Accrual spreads yearly and prepaid costs across the months' }),
      S.labelled('Period', S.select(Object.keys(PERIOD), UI.period, v => { UI.period = v || 'Monthly'; redraw(); }, { label: 'Period', hint: 'Monthly', width: 140 })),
      S.labelled('Cards', S.checkbox('Most spending goes on cards', cardsMost, v => ctx.store.setDoc('profile', { mostOnCards: v })), { note: 'Shows Paid with on every line' })), { label: 'Settings for this budget' }));
  const view = monthView(doc, ctx.ref, UI.ym, { now: ctx.now() });
  if (UI.pass !== 'Actual') UI.pass = 'Plan';
  // Answer 89: the Plan column appears once a month differs from the usual for any line, and goes when none do.
  const payFreq = () => ctx.metrics().inputs.payFrequency ?? null;
  const planCol = () => planDiffs(doc, UI.ym, ctx.store.find(r => r.kind === 'bill' && !r.values.irregular), payFreq()).size > 0;
  const shownPlanCol = planCol();
  ctx.onRefresh(() => { if (UI.pass === 'Plan' && planCol() !== shownPlanCol) S.keepPlace(() => app.render()); });
  const body = [UI.pass === 'Plan' ? S.live(ctx, () => gutBox(ctx, monthView(doc, ctx.ref, UI.ym, { now: ctx.now() }))) : null,
    h('div.visuals', {}, UI.pass === 'Plan' && UI.budgetView === 'categories' ? S.recordList(ctx, categoryList(ctx.ref, { pass: UI.pass, ym: UI.ym }))
      : S.recordList(ctx, spendingList(ctx.ref, { pass: UI.pass, ym: UI.ym, groupBy: UI.groupBy, paidWithColumn: cardsMost, planColumn: shownPlanCol })),
      S.visualsPanel(ctx, { charts: budgetCharts, area: 'needs' })),
    UI.pass === 'Plan' ? S.moreBlock('budget:fast-track', () => fastTrackTotals(ctx), { label: 'Fast Track totals (by area)' }) : null];
  // The strip follows the lines as they change (the lists keep their own state, so the screen is not rebuilt).
  const strip = h('div', {}, budgetStrip(ctx, view));
  ctx.onRefresh(() => S.keepPlace(() => clear(strip, budgetStrip(ctx, monthView(doc, ctx.ref, UI.ym, { now: ctx.now() })))));
  // Batch 10: the one-time note for a file whose untouched starter amounts turned faded.
  const fadedNote = doc.settings?.fadedNote ? h('div.slim-note', { role: 'status' }, h('span', {}, 'Starter amounts you never changed are now shown faded. Use them with one click, or type the real number.'),
    h('button.icon-btn.tiny', { type: 'button', 'aria-label': 'Close this note', 'data-tip': 'Close', onclick: () => ctx.store.setDoc('settings', { fadedNote: null }) }, icon('x'))) : null;
  return [head('Budget', 'Every spending line, planned and actual', S.live(ctx, () => fillCounter(app, budgetCompletion(ctx)) ?? h('span'))), fadedNote, passBar, strip, doc.session?.community ? S.moreBlock('budget:community', () => S.live(ctx, () => communityCard(ctx)), { label: 'Community presets' }) : null, ...body, // batch 14: X of Y filled in the head
    S.recordList(ctx, irregularList(ctx.ref, { onWalk: a => walkIrregular(ctx, a) })),
    S.moreBlock('budget:joy', () => S.live(ctx, () => categoryJoyBlock(ctx)), { label: 'Joy by category' })]; // F6: captured for a later Wrapped
}

// Answer 168: each Income row's take-home a paycheck and its schedule, for matching money in.
const PAY_PER_YEAR = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };
function incomesForMatch(ctx) {
  return ctx.metrics().inputs.income.map(i => { const f = i.r.values?.payFrequency || 'month'; return { id: i.r.id, name: i.r.name || i.r.type, perPay: i.takeHome?.value != null ? i.takeHome.value * 12 / (PAY_PER_YEAR[f] ?? 12) : null, payFrequency: f, nextPayday: i.r.values?.nextPayday ?? null }; });
}
// J (overnight): a bank CSV in three steps: the file and the bank, the column map (kept per bank), then a review of
// each row with its Budget line (suggested from saved rules), duplicates left out; Import puts each amount on its
// line's month as an actual. PDF stays a stub with its reason on the button.
const CSV = { bank: '', rows: null, map: null, hasHeader: true, list: null, name: '' };
function csvImportBlock(app, ctx) {
  const doc = ctx.store.doc;
  const lines = ctx.visible(r => r.kind === 'bill');
  const redraw = () => app.render();
  const insts = institutionsOf(doc).map(i => i.name); // item 15: the column map is saved per institution
  const bankBox = insts.length ? S.select(insts, CSV.bank || null, v => { CSV.bank = v || ''; CSV.map = CSV.bank && bankMapOf(doc, CSV.bank) ? { ...bankMapOf(doc, CSV.bank) } : CSV.map; }, { label: 'Institution', hint: 'Pick the institution', width: 220 })
    : S.textInput(CSV.bank || null, v => { CSV.bank = v || ''; }, { hint: 'Bank name (add it under Institutions to keep the map)', width: 260, key: 'csv:bank' });
  const file = h('input', { type: 'file', accept: '.csv,text/csv', 'aria-label': 'CSV file' });
  file.onchange = () => { const f = file.files?.[0]; if (!f) return; CSV.name = f.name; f.text().then(text => { CSV.rows = parseCsv(text); const saved = CSV.bank ? bankMapOf(doc, CSV.bank) : null; CSV.map = saved ? { ...saved } : guessMap(CSV.rows[0] || []); CSV.hasHeader = saved?.hasHeader ?? true; CSV.list = null; redraw(); }); };
  const step1 = h('div.row-line', { style: { gap: '10px', flexWrap: 'wrap' } }, S.labelled('Bank', bankBox), S.labelled('CSV file', h('label.field', { style: { width: '260px' } }, file)),
    S.button('PDF statement', { disabled: true, why: PDF_WHY }), CSV.name ? h('span.muted.small', {}, `${CSV.name}: ${CSV.rows?.length ?? 0} rows`) : null);
  if (!CSV.rows) return h('div.stack', { style: { gap: '8px' } }, h('span.muted.small', {}, 'Export a CSV from the bank, name the bank, pick which column is which once; next time the map is remembered. Imported amounts land on the Budget as actuals.'), step1);
  const headers = CSV.hasHeader ? CSV.rows[0] : CSV.rows[0].map((_, i) => `Column ${i + 1}`);
  const colPick = role => S.select(headers.map((hd, i) => [String(i), hd || `Column ${i + 1}`]), CSV.map[role] == null ? null : String(CSV.map[role]), v => { CSV.map[role] = v == null ? null : Number(v); }, { label: role, hint: 'Not in this file', width: 170 });
  const step2 = h('div.stack', { style: { gap: '8px' } }, h('strong', {}, 'Which column is which'),
    h('div.row-line', { style: { gap: '10px', flexWrap: 'wrap' } }, S.labelled('Date', colPick('date')), S.labelled('Description', colPick('description')), S.labelled('Amount (signed)', colPick('amount')), S.labelled('or Debit', colPick('debit')), S.labelled('and Credit', colPick('credit')),
      S.labelled('First row', S.toggle([[true, 'Headers'], [false, 'Data']], CSV.hasHeader, v => { CSV.hasHeader = v; }, { label: 'First row' }))),
    h('div.row-line', { style: { gap: '8px' } }, S.button('Review the rows', { kind: 'primary', onClick: () => {
      if (CSV.map.date == null || (CSV.map.amount == null && CSV.map.debit == null && CSV.map.credit == null)) { S.toast('Pick the date column and an amount column.'); return; }
      if (CSV.bank) saveBankMap(ctx.store, CSV.bank, CSV.map, { hasHeader: CSV.hasHeader });
      const tx = dedupe(toTransactions(CSV.rows, CSV.map, { hasHeader: CSV.hasHeader, bank: CSV.bank || null }), doc.spending?.transactions || []);
      const incomes = incomesForMatch(ctx);
      CSV.list = tx.map(t => ({ ...t, ...suggestLine(t.description, { rules: doc.settings?.csvRules || [], transactions: doc.spending?.transactions || [] }), ...(matchIncome(t, incomes) || {}), skip: t.duplicate }));
      redraw(); } }), S.button('Start over', { onClick: () => { Object.assign(CSV, { rows: null, map: null, list: null, name: '' }); redraw(); } })));
  if (!CSV.list) return h('div.stack', { style: { gap: '10px' } }, step1, step2);
  const dupes = CSV.list.filter(t => t.duplicate).length;
  const rowOf = (t, i) => h(`div.row-line.csv-row${t.duplicate ? '.muted' : ''}`, { style: { gap: '8px', flexWrap: 'wrap' } },
    S.checkbox('', !t.skip, v => { t.skip = !v; }, { key: `csv:${i}:keep` }), h('span.small', { style: { minWidth: '86px' } }, t.date), h('span', { style: { flex: '1 1 200px' } }, t.description || '(no description)'), h('span.num', {}, money(t.amount)),
    t.amount > 0 ? S.select([['', 'Money in, no paycheck'], ...incomesForMatch(ctx).map(i => [i.id, `Paycheck: ${i.name}`])], t.incomeId ?? '', v => { t.incomeId = v || null; }, { label: `Paycheck for ${t.description}`, width: 200 }) // answer 168
      : S.select([['', 'Skip (no line)'], ...lines.map(l => [l.id, l.name || l.values.category || l.type])], t.lineId ?? '', v => { t.lineId = v || null; }, { label: `Line for ${t.description}`, width: 200 }),
    t.duplicate ? h('span.tag.plain', {}, 'Already imported') : t.incomeId ? h('span.muted.small', {}, 'within 5% of a paycheck, near payday') : t.why ? h('span.muted.small', {}, t.why) : null);
  const step3 = h('div.stack', { style: { gap: '6px' } }, h('div.row-line', { style: { gap: '10px' } }, h('strong', {}, `Review ${CSV.list.length} rows`), dupes ? h('span.muted.small', {}, `${dupes} already imported, left out`) : null, h('span.spacer'),
    S.button(`Import ${CSV.list.filter(t => !t.skip && !t.duplicate).length}`, { kind: 'primary', onClick: () => { const r = importTransactions(ctx.store, CSV.list, { bank: CSV.bank || null, now: ctx.now().toISOString() }); Object.assign(CSV, { rows: null, map: null, list: null, name: '' }); S.toast(`${r.imported} imported as actuals; ${r.skipped} left out.`, { undo: () => ctx.store.undo() }); redraw(); } })),
    h('span.muted.small', {}, 'Money out goes onto its Budget line for that month as an actual (the line counts as Actual); a paycheck lands on its Income row as the last pay matched. Each line you pick becomes a rule for next time.'),
    ...CSV.list.map(rowOf));
  return h('div.stack', { style: { gap: '10px' } }, step1, step3);
}

// F6: a dated joy rating, 1 to 5, per spending category on the Budget. Kept with its date; the latest shows.
function categoryJoyBlock(ctx) {
  const cats = categoriesOf(ctx.visible(() => true));
  const rated = categoryJoyOf(ctx.store.doc);
  if (!cats.length) return h('p.muted', { style: { margin: 0 } }, 'Rate each category once the Budget has lines.');
  return h('div.stack', { style: { gap: '6px' } }, h('span.muted.small', {}, 'How much joy does this spending bring? 1 little, 5 a lot. Each rating keeps its date.'),
    ...cats.map(cat => h('div.row-line', { style: { gap: '10px' } }, h('span', { style: { minWidth: '200px', fontWeight: 600 } }, cat),
      S.toggle(['1', '2', '3', '4', '5'], rated[cat] ? String(rated[cat].value) : null, v => rateCategoryJoy(ctx.store, cat, v == null ? null : Number(v), { now: ctx.now().toISOString() }), { label: `${cat} joy`, clearable: true }),
      rated[cat] ? h('span.muted.small', {}, `${new Date(rated[cat].at).toLocaleDateString()}${rated[cat].history.length > 1 ? ` · ${rated[cat].history.length} ratings` : ''}`) : null)));
}

// M9: kosher grocery note and maaser, only when community presets are on.
function communityCard(ctx) {
  const m = ctx.metrics();
  const mz = ctx.store.doc.session.maaser || {};
  const r = maaserOf({ basis: mz.basis ?? 'Take-home', pct: mz.pct ?? null, grossAnnual: m.inputs.grossAnnual, takeHome: m.inputs.takeHome });
  const line = ctx.visible(x => x.kind === 'bill' && x.values.maaser)[0];
  const put = () => {
    if (line) ctx.store.update(line.id, { amount: Math.round(r.value), status: 'Computed' });
    else ctx.store.add('bill', { name: 'Maaser', amount: Math.round(r.value), status: 'Computed', values: { maaser: true, category: 'Giving', draftt: 'Other', amountType: 'Variable', timing: 'Variable date' } });
    S.toast(line ? 'Maaser line updated.' : 'Maaser added as a spending line.');
  };
  return h('div.card.community-card', {}, h('div.row-line', { style: { gap: '16px' } },
    h('span.stack', { style: { gap: '2px' } }, h('span.label', {}, 'Maaser a month'),
      r.value == null ? h('span.muted', {}, `Needs ${r.needs}`) : h('strong', {}, money(r.value)), r.text ? h('span.muted.small', {}, r.text) : null),
    r.value != null ? S.button(line ? (Math.round(line.amount ?? 0) === Math.round(r.value) ? 'Line is up to date' : 'Update the maaser line') : 'Add as a spending line',
      { size: 'small', iconName: 'plus', disabled: line && Math.round(line.amount ?? 0) === Math.round(r.value), onClick: put }) : null,
    h('span.muted.small', { style: { flex: 1 } }, KOSHER_NOTE)));
}

// R146, R147: fixed and variable side by side with % of take-home; the fixed total is the floor.
function budgetStrip(ctx, view) {
  const m = ctx.metrics();
  const k = PERIOD[UI.period] || 1;
  const th = m.inputs.takeHome;
  const lines = ctx.visible(r => r.kind === 'bill' && !r.values.irregular && r.status !== 'Not for me' && r.amount != null); // batch 10: a faded typical counts nowhere
  const cash = (ctx.store.doc.spending.basis || 'accrual') === 'cash';
  const monthlyOf = r => (cash && (r.per === 'year' || r.covers) ? 0 : view.rows.find(x => x.line.id === r.id)?.estimate ?? 0);
  const autos = m.inputs.autoLines ?? []; // debt payments, From Debt (entered once on Net worth)
  const fixed = sum(lines.filter(r => r.values.amountType === 'Fixed'), monthlyOf) + sum(autos, r => r.amount);
  const buckets = sum(m.inputs.categories ?? [], c => (c.else?.from === 'bucket' ? c.else.bucket : 0)); // batch 10: an Everything else rough amount, while none of its pieces has a number
  const variable = sum(lines.filter(r => r.values.amountType !== 'Fixed'), monthlyOf) + buckets;
  const yearly = ctx.visible(r => r.kind === 'bill' && r.values.irregular && r.amount != null);
  const setAside = cash ? sum(yearly.filter(r => String(r.values.monthDue) === String(Number(UI.ym.slice(5)))), r => r.amount) : sum(yearly, r => r.amount / 12);
  const res = (v, text) => ({ id: 'M23', value: v * k, needs: [], unit: 'money', text });
  // Batch 10: until a line has a real amount (or a category is typed), the gut number is the only spending number shown.
  const anyReal = lines.length > 0 || autos.length > 0 || (m.inputs.categories ?? []).some(c => c.typed != null || c.else?.bucket != null);
  if (!anyReal && UI.pass !== 'Actual') {
    const gut = m.inputs.gutTotal;
    return S.summaryStrip(ctx, [{ label: 'Spending, your gut number', result: gut == null ? { id: 'M27', value: null, needs: ['a gut number'], unit: 'money' } : { id: 'M27', value: gut * k, needs: [], unit: 'money', text: `Your gut number: ${money(gut)} a month. The lines take over once they hold real amounts.` }, note: gut == null ? null : 'Until the lines hold real amounts' },
      { label: `Yearly costs set aside${k > 1 ? `, ${UI.period}` : ''}`, result: res(setAside, `Each yearly cost divided by 12: ${money(setAside)} a month.`) }]);
  }
  const share = v => (th ? ` · ${pct(v / th)} of take-home` : '');
  const items = [
    { label: `Fixed${k > 1 ? `, ${UI.period}` : ''}`, result: res(fixed, `Lines tagged Fixed amount${autos.length ? ` and ${autos.length} debt ${autos.length === 1 ? 'payment' : 'payments'} from Debt` : ''}, the ${monthName(UI.ym)} plan: ${money(fixed)} a month. This is the floor you pay no matter what; it feeds runway and Lean FI.`), note: `The floor${share(fixed)}`, home: '#/cash-flow/budget' },
    { label: `Variable${k > 1 ? `, ${UI.period}` : ''}`, result: res(variable, `Lines tagged Variable amount: ${money(variable)} a month.`), note: share(variable).replace(' · ', '') || null },
    { label: `Yearly costs set aside${k > 1 ? `, ${UI.period}` : ''}`, result: res(setAside, cash ? `Yearly costs due in ${monthName(UI.ym)}: ${money(setAside)} (cash view).` : `Each yearly cost divided by 12: ${money(setAside)} a month.`) },
  ];
  if (UI.pass === 'Actual') {
    const diff = view.totals.actual === null ? null : view.totals.actual - view.totals.estimate;
    items.push({ label: 'Plan vs actual', result: diff === null ? { id: 'M25', value: null, needs: ['an actual'], unit: 'money' } : { id: 'M25', value: diff, needs: [], unit: 'money', text: `Actual ${money(view.totals.actual)} minus plan ${money(view.totals.estimate)} for ${monthName(UI.ym)}.` },
      note: diff === null ? null : diff > 0 ? 'Over the plan' : 'Under the plan' });
  } else {
    const per = perPaycheck(m);
    items.push(per ? { label: 'Per paycheck', result: { id: 'M20', value: (fixed + variable + setAside) / per.per, needs: [], unit: 'money', text: `Spending ${money(fixed + variable + setAside)} a month over ${per.per.toFixed(2)} paychecks a month (${per.label}).` }, note: 'What each paycheck has to cover' }
      : gutVsLines(fixed + variable + setAside, view.gut));
  }
  return S.summaryStrip(ctx, items);
}
// Words, not a bare negative: "Lines are $1,950 under your gut number".
export function gutWords(lines, gut) {
  const d = lines - gut;
  if (Math.abs(d) < 0.5) return 'Lines match your gut number';
  return `Lines are ${money(Math.abs(d))} ${d > 0 ? 'over' : 'under'} your gut number`;
}
function gutVsLines(lines, gut) {
  if (gut === null) return { label: 'Gut vs lines', result: { id: 'M26', value: null, needs: ['a gut number'], unit: 'money' } };
  const d = lines - gut;
  return { label: 'Gut vs lines', result: { id: 'M26', value: d, needs: [], unit: 'money', text: `Lines ${money(lines)} minus the gut number ${money(gut)}.` },
    render: () => (Math.abs(d) < 0.5 ? 'Same' : `${money(Math.abs(d))} ${d > 0 ? 'over' : 'under'}`), note: gutWords(lines, gut) };
}
function perPaycheck(m) {
  const f = m.inputs.income.find(x => x.r.values.payFrequency)?.r.values.payFrequency;
  const per = { week: 52 / 12, '2 weeks': 26 / 12, 'twice a month': 2, month: 1 }[f];
  return per && per !== 1 ? { per, label: { week: 'weekly', '2 weeks': 'every 2 weeks', 'twice a month': 'twice a month' }[f] } : null;
}

// The gut number: one money box at the top of Plan (the All in record; Fast Track writes the same one), with the
// lines compared to it in words.
function gutBox(ctx, view) {
  const rec = gutRecord(ctx.store.doc);
  const set = v => {
    if (rec) ctx.store.update(rec.id, { amount: v, status: rec.status || 'Roughly' });
    else ctx.store.add('spending', { name: 'Monthly spending, all in', amount: v, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } }, { type: 'All in' });
  };
  const lineTotal = view.totals.rough + sum(ctx.metrics().inputs.autoLines ?? [], a => a.amount); // with the debt payments, From Debt, as on the strip
  return h('div.card.gut-card', {},
    h('div.row-line', { style: { gap: '12px' } }, h('strong', {}, 'Your gut number'), S.moneyInput(rec?.amount ?? null, set, { hint: 'A month, all in', key: 'gut' }),
      rec ? S.toggle([[true, 'Includes debt payments'], [false, 'Not debt payments']], rec.values.includesDebtPayments !== false, v => ctx.store.update(rec.id, { includesDebtPayments: v }), { label: 'Includes debt payments' }) : null),
    h('p.muted', { style: { margin: '8px 0 0' } }, rec?.amount != null ? gutVsLinesWords({ gut: rec.amount, lineTotal, categories: ctx.metrics().inputs.categories }).text : 'What do you think you spend in a month? Ask before looking at anything; it is kept to compare later.')); // batch 12 (item 3)
}

// Fast Track totals (the old Basics pass): one total per area (R132), with what the lines say beside them.
function fastTrackTotals(ctx) {
  const doc = ctx.store.doc;
  const basics = doc.spending.basics || {};
  const lines = ctx.visible(r => r.kind === 'bill' && r.status !== 'Not for me');
  const areas = [...new Set(['Accommodation', 'Food', 'Transportation', 'Therapy', 'Other', 'Wants', ...lines.map(r => r.values.draftt).filter(Boolean)])];
  const fromLines = a => sum(lines.filter(r => (r.values.draftt || 'Other') === a), r => lineMonthlyOf(r) ?? 0);
  const total = sum(areas, a => basics[a]);
  return h('div.card', {}, h('div.basics-grid', {}, areas.map(a => h('div.basics-row', {},
    h('span.basics-name', {}, drafttName(a)),
    S.moneyInput(basics[a] ?? null, v => ctx.store.setIn('spending', ['basics', a], v === null ? undefined : v, `Fast Track: ${a}`), { hint: 'Add total', key: `basics:${a}` }),
    h('span.muted', {}, fromLines(a) ? `Lines say ${money(fromLines(a))}` : '')))),
  h('p', { style: { marginTop: '12px', fontWeight: 600 } }, Object.keys(basics).length ? `Fast Track total: ${money(total)} a month` : 'Type a total for each area that applies; skip the rest.'));
}

// Walk the list: one yearly cost at a time (Mockup: Irregular and yearly costs).
function walkIrregular(ctx, anchor) {
  const g = ctx.gates();
  const have = new Set(ctx.store.find(r => r.kind === 'bill' && r.values.irregular).map(r => (r.name || '').toLowerCase()));
  const todo = IRREGULAR.filter(x => !(x.gate && g[x.gate] === false) && !have.has(x.name.toLowerCase()));
  let i = 0;
  const box = h('div.stack', { style: { gap: '12px' } });
  const draw = () => {
    if (i >= todo.length) { clear(box, h('strong', {}, 'That is the whole list.'), S.button('Done', { kind: 'primary', onClick: S.closePop })); return; }
    const item = todo[i];
    let yearly = null, month = null;
    const amt = S.moneyInput(null, v => { yearly = v; }, { hint: 'Yearly $' });
    const mon = S.select(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((x, k) => [String(k + 1), x]), null, v => { month = v; }, { label: 'Month due', hint: 'Month', width: 100 });
    const add = () => {
      amt.querySelector('input').dispatchEvent(new Event('change'));
      ctx.store.add('bill', { name: item.name, amount: yearly, per: 'year', values: { irregular: true, trip: !!item.trip, monthDue: month ? Number(month) : null, draftt: 'Other', amountType: 'Fixed', timing: 'Fixed date' } }, { type: item.trip ? 'Trip or flight' : 'Yearly cost' });
      i++; draw();
    };
    clear(box, h('span.muted', {}, `${i + 1} of ${todo.length}`), h('strong', { style: { fontSize: '1.125rem' } }, `${item.name}?`),
      h('div.row-line', { style: { gap: '8px' } }, amt, mon),
      h('div.row-line', { style: { gap: '8px' } }, S.button('Add', { kind: 'primary', iconName: 'plus', onClick: add }), S.button('Skip', { onClick: () => { i++; draw(); } }), S.button('Stop', { onClick: S.closePop })));
    setTimeout(() => amt.querySelector('input')?.focus());
  };
  draw();
  S.popover(anchor, box, { width: 380 });
}

// Charts beside the budget: the amount and timing grid, and DRAFTT shares.
export const budgetCharts = [
  {
    name: 'Amount and timing grid',
    data: ctx => {
      const lines = ctx.visible(r => r.kind === 'bill' && !r.values.irregular && r.status !== 'Not for me' && r.amount != null && r.values.amountType && r.values.timing);
      if (!lines.length) return { needs: ['a line tagged Fixed or Variable'] };
      const cells = [['Fixed', 'Fixed date'], ['Variable', 'Fixed date'], ['Fixed', 'Variable date'], ['Variable', 'Variable date']]
        .map(([a, t]) => { const ls = lines.filter(r => r.values.amountType === a && r.values.timing === t); return { a, t, total: sum(ls, r => lineMonthlyOf(r) ?? 0), n: ls.length }; });
      return { cells };
    },
    option: (d, t) => {
      const max = Math.max(1, ...d.cells.map(c => c.total));
      return {
        textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 96, right: 24, top: 16, bottom: 40 },
        xAxis: { type: 'category', data: ['Fixed amount', 'Variable amount'], axisLabel: { color: t.text, fontWeight: 600 }, axisLine: { lineStyle: { color: t.line } } },
        yAxis: { type: 'category', data: ['Variable date', 'Fixed date'], axisLabel: { color: t.text, fontWeight: 600 }, axisLine: { lineStyle: { color: t.line } } },
        tooltip: { formatter: p => `${p.data.label}<br>${money(p.data.total)} a month, ${p.data.n} lines` },
        series: [{ type: 'scatter', data: d.cells.map(c => ({ value: [c.a === 'Fixed' ? 0 : 1, c.t === 'Fixed date' ? 1 : 0], total: c.total, n: c.n, label: `${c.a} amount, ${c.t.toLowerCase()}`,
          symbolSize: c.total ? 18 + 70 * Math.sqrt(c.total / max) : 0, itemStyle: { color: c.a === 'Variable' && c.t === 'Variable date' ? t.text2 : t.area, opacity: 0.85 } })),
          label: { show: true, formatter: p => (p.data.total ? short(p.data.total) : ''), color: t.card, fontWeight: 700 } }],
      };
    },
  },
  {
    name: 'DRAFTT shares',
    data: ctx => {
      const lines = ctx.visible(r => r.kind === 'bill' && r.status !== 'Not for me' && r.amount != null);
      if (!lines.length) return { needs: ['a spending line'] };
      const by = new Map();
      for (const r of lines) { const k = r.values.draftt || 'Other'; by.set(k, (by.get(k) || 0) + (lineMonthlyOf(r) ?? 0)); }
      const order = [...DRAFTT, 'Other', 'Wants'];
      return { rows: [...by].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])) };
    },
    option: (d, t) => ({
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 110, right: 24, top: 8, bottom: 24 },
      xAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      yAxis: { type: 'category', inverse: true, data: d.rows.map(r => r[0]), axisLabel: { color: t.text, fontWeight: 600 } },
      tooltip: { valueFormatter: v => `${money(v)} a month` },
      series: [{ type: 'bar', data: d.rows.map(r => Math.round(r[1])), itemStyle: { color: t.area, borderRadius: [0, 6, 6, 0] }, barWidth: 16 }],
    }),
  },
];

// ---------- Cash flow calendar ----------
const CHIP = { Income: 'in', Bills: 'out', Debt: 'out', Savings: 'save', Maybe: 'maybe', Wins: 'win' };
const sign = v => (v > 0 ? '+' : v < 0 ? '−' : '');
export function calendarScreen(app, ctx) {
  UI.calYm ??= thisYm(ctx);
  if (location.hash !== UI.calHash) { UI.calHash = location.hash; if (/[?&]view=bills/.test(location.hash)) UI.view = 'bills'; } // Find: bills, subscriptions, recurring
  if (UI.view === 'bills') return billsScreen(app, ctx);
  const doc = ctx.store.doc;
  const cal = doc.spending.calendar || {};
  const redraw = () => app.render();
  const range = { Month: 1, '3 mo': 3, '6 mo': 6, Year: 12 }[UI.range] || 1;
  const b = balances(doc, ctx.ref, UI.calYm, range, { now: ctx.now(), autoWins: milestoneWins(ctx), low: bufferLine(ctx) }); // I: days under the Buffer are flagged
  const list = b.list || instances(doc, ctx.ref, UI.calYm, { now: ctx.now() });
  const monthList = list.filter(i => i.date.startsWith(UI.calYm) || i.origDate?.startsWith(UI.calYm));
  if (!monthList.some(i => i.kind !== 'win')) {
    return [head('Calendar', 'Day by day, with a running balance'), h('div.card', {}, h('div.empty.center', {},
      h('span.title', {}, 'Add your paychecks and bills to see your month'),
      h('div.row-line', {}, S.button('Add a paycheck', { iconName: 'plus', onClick: () => app.go('#/cash-flow/income') }), S.button('Add a bill', { iconName: 'plus', onClick: () => app.go('#/cash-flow/budget') }),
        S.button('Add entry', { iconName: 'plus', onClick: e => entryForm(ctx, e.currentTarget, { date: dateOf(UI.calYm, 1) }) }))))];
  }
  const st = startBalance(doc, ctx.ref, ctx.now());
  const header = h('div.card.cal-head', {},
    h('div.row-line', { style: { gap: '10px' } },
      monthStepper(UI.calYm, v => { UI.calYm = v; UI.openDay = null; redraw(); }),
      S.button('Today', { onClick: () => { UI.calYm = thisYm(ctx); redraw(); } }),
      S.toggle(['Month', '3 mo', '6 mo', 'Year'], UI.range, v => { UI.range = v; redraw(); }, { label: 'How far ahead the balance looks' }),
      S.toggle([['month', 'Month'], ['list', 'Full list'], ['bills', 'Bills list']], UI.view, v => { UI.view = v; redraw(); }, { label: 'View' }), // item 28; batch 15: the Bills list
      UI.view === 'month' ? S.checkbox('Totals only', UI.totalsOnly, v => { UI.totalsOnly = v; redraw(); }) : null,
      h('span', { style: { flex: 1 } }),
      S.button('Add a win', { iconName: 'plus', onClick: e => winForm(ctx, e.currentTarget) }),
      S.button('Add entry', { kind: 'primary', iconName: 'plus', onClick: e => entryForm(ctx, e.currentTarget, { date: UI.calYm === thisYm(ctx) ? ctx.now().toISOString().slice(0, 10) : dateOf(UI.calYm, 1) }) })),
    S.moreBlock('cal:settings', () => h('div.row-line.cal-settings', { style: { gap: '16px', marginTop: '10px', alignItems: 'flex-end' } },
      S.labelled('Starting balance', S.moneyInput(cal.start ?? null, v => { ctx.store.setIn('spending', ['calendar', 'start'], v === null ? undefined : v, 'Starting balance'); ctx.store.setIn('spending', ['calendar', 'startYm'], v === null ? undefined : UI.calYm); },
        { hint: st.value == null ? 'Add balance' : `${moneyText(st.value)} (checking)`, key: 'cal:start' }), { note: cal.start != null ? `As of the start of ${monthName(cal.startYm || UI.calYm)}` : 'Pulled from checking; type to change' }),
      S.labelled('Low balance line', S.moneyInput(cal.low ?? null, v => ctx.store.setIn('spending', ['calendar', 'low'], v === null ? undefined : v, 'Low balance line'), { hint: bufferLine(ctx) != null ? `Buffer ${moneyText(bufferLine(ctx))}` : moneyText(ctx.ref.defaults.lowBalanceLine), key: 'cal:low' }), { note: 'Blank: the Buffer layer (two weeks of spending)' }),
      S.labelled('Markers', h('div.seg.multi', { role: 'group', 'aria-label': 'Markers' }, h('button', { type: 'button', 'aria-pressed': String(UI.markers), title: 'FOO dates, the month-end close day, and your holidays (About you › Your calendar)', onclick: () => { UI.markers = !UI.markers; redraw(); } }, 'Markers'))),
      S.checkbox('Count maybe money', !!cal.countMaybe, v => ctx.store.setIn('spending', ['calendar', 'countMaybe'], v, 'Count maybe')),
      S.checkbox('Wins on their own', cal.autoWins !== false, v => ctx.store.setIn('spending', ['calendar', 'autoWins'], v, 'Auto wins'))),
    { label: `Balance ${st.value == null ? 'not set' : money(st.value)} · low line ${money(cal.low ?? bufferLine(ctx) ?? ctx.ref.defaults.lowBalanceLine)}${cal.low == null && bufferLine(ctx) != null ? ' (the Buffer)' : ''} · ${UI.show.size === GROUPS.length ? 'showing all' : `showing ${UI.show.size} of ${GROUPS.length}`}` }));
  // Item 28: filter chips by type sit on the header, not in the settings.
  const filters = h('div.row-line.cal-filters', { style: { gap: '6px', marginTop: '8px', flexWrap: 'wrap' } }, h('span.muted.small', {}, 'Show'), GROUPS.map(gp => h(`button.btn.small.filter-chip.${CHIP[gp] || 'out'}`, { type: 'button', 'aria-pressed': String(UI.show.has(gp)), onclick: () => { UI.show.has(gp) ? UI.show.delete(gp) : UI.show.add(gp); redraw(); } }, h('span.dot'), gp)));
  header.append(filters);
  const notes = [];
  if (bonusPaycheck(monthList)) notes.push(h('div.banner-inline.good', {}, icon('check'), ` Bonus paycheck month: three paydays land in ${monthName(UI.calYm, 'long')}.`));
  if (b.firstLow) notes.push(h('div.banner-inline', {}, '⚠ ', `Below ${money(b.low)} on ${dayLabel(b.firstLow.date)}: ${money(b.firstLow.balance)}.`));
  if (b.needs) notes.push(h('div.banner-inline', {}, `The running balance needs ${b.needs.join(' and ')}.`));
  // One quiet line for the smaller warnings: large amounts on no fixed date (R142), and days that are guesses.
  const risky = [...new Set(monthList.filter(i => i.risk && i.status === 'Planned').map(i => i.name))];
  const guessN = new Set(monthList.filter(i => i.guessDate).map(i => i.recId)).size;
  const heads = [risky.length ? `Timing risk: ${risky.slice(0, 3).join(', ')}${risky.length > 3 ? ` and ${risky.length - 3} more` : ''} are large with no fixed date` : null,
    guessN ? `${guessN} ${guessN === 1 ? 'item sits' : 'items sit'} on a guessed day (marked ?); click one to set its day` : null].filter(Boolean); // item 30
  if (heads.length) notes.push(h('div.banner-inline.soft', {}, heads.join('. ') + '.'));
  const byDay = new Map();
  for (const i of collapseSpread(monthList)) { if (!UI.show.has(i.group)) continue; const k = i.date.startsWith(UI.calYm) ? i.date : i.origDate; if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(i); } // item 29: one Spending money bar a week
  const endOf = new Map((b.rows || []).map(r => [r.date, r.balance]));
  const marks = new Map();
  if (UI.markers) for (const mk of calendarMarkers(doc, ctx.ref, UI.calYm, { now: ctx.now(), flags: app.flags || [] })) { if (!marks.has(mk.date)) marks.set(mk.date, []); marks.get(mk.date).push(mk); if (!byDay.has(mk.date)) byDay.set(mk.date, []); }
  return [head('Calendar', 'Day by day, with a running balance'), header, ...notes,
    UI.view === 'list' ? null : monthGrid(ctx, byDay, endOf, b.low, marks), dayList(ctx, byDay, endOf, b.low, marks, { force: UI.view === 'list' }), // item 28: Month, or the Full list on any width
    h('div.card.cal-chart', {}, h('div.bar-top', {}, h('strong', {}, `Running balance, ${UI.range === 'Month' ? monthName(UI.calYm) : `${UI.range} from ${monthName(UI.calYm)}`}`)), balanceChart(ctx, b))];
}
// Batch 15, item 9: the Bills list (Monarch recurring, Rocket Money subscriptions). Every repeating charge by its next
// date, with how often, paid with, and Keep or Try to cut on what can be cut.
function billsScreen(app, ctx) {
  const redraw = () => app.render();
  const b = recurringBills(ctx.store.doc, ctx.ref, ctx.now());
  const when = d => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : null);
  const home = i => (i.kind === 'debt' ? '#/net-worth/debt' : i.kind === 'coverage' ? '#/net-worth/protection' : '#/cash-flow/budget');
  const header = h('div.card.cal-head', {}, h('div.row-line', { style: { gap: '10px' } },
    S.toggle([['month', 'Month'], ['list', 'Full list'], ['bills', 'Bills list']], 'bills', v => { UI.view = v; redraw(); }, { label: 'View' }),
    h('span', { style: { flex: 1 } }),
    h('span.muted', {}, `${b.items.length} repeating ${b.items.length === 1 ? 'charge' : 'charges'}, ${money(b.monthly)} a month${b.toCut ? ` · trying to cut ${money(b.toCut)}` : ''}`)));
  if (!b.items.length) return [head('Calendar', 'Every repeating charge, by its next date'), header, h('div.card', {}, h('div.empty.center', {}, h('span.title', {}, 'No repeating bills yet'),
    h('span.muted', {}, 'Mark a Budget line Fixed or give it a due day and it shows here.'), S.button('Open the budget', { iconName: 'right', onClick: () => app.go('#/cash-flow/budget') })))];
  const table = h('table.rows.bills-list', {}, h('thead', {}, h('tr', {}, [['Charge', 'th'], ['Amount', 'th.num'], ['How often', 'th.col-often'], ['Next', 'th'], ['Paid with', 'th.col-paid'], ['Keep or cut', 'th']].map(([t, tag]) => h(tag, {}, t)))),
    h('tbody', {}, b.items.map(i => h('tr', { 'data-id': i.id }, h('td', {}, S.fromButton(i.name, home(i), i.kind === 'debt' ? i.id : i.id)),
      h('td.num', {}, money(i.amount)), h('td.col-often', {}, i.often), h('td', {}, when(i.next) ?? h('span.muted.small', { title: 'Add a due day on the line to place it' }, 'Day not set')),
      h('td.col-paid', {}, i.paidWith ?? h('span.muted.small', {}, 'Not set')),
      h('td', {}, i.cut ? S.toggle([['Keep', 'Keep'], ['Cancel', 'Try to cut']], i.decision, v => ctx.store.update(i.id, { decision: v }), { label: `Keep or try to cut: ${i.name}`, clearable: true }) : h('span.muted.small', {}, 'A payment you owe'))))));
  return [head('Calendar', 'Every repeating charge, by its next date'), header, h('div.card', { style: { overflowX: 'auto' } }, table)];
}
const dayLabel = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const moneyText = v => S.moneyText(v);

function chipOf(ctx, i) {
  const cls = [CHIP[i.group] || 'out', i.onCard ? 'oncard' : '', i.status === 'Paid' ? 'done' : '', i.status === "Didn't happen" ? 'missed' : '', i.status === 'Partial' ? 'partial' : '',
    i.status === 'Moved' && !i.date.startsWith(UI.calYm) ? 'moved-away' : '', i.guessDate ? 'guess' : ''].filter(Boolean).join('.');
  const amt = i.kind === 'win' ? '' : ` ${sign(i.planned)}${money(Math.abs(i.status === 'Paid' && i.paid != null ? i.paid : i.planned))}`;
  const label = i.kind === 'win' ? `★ ${i.name}` : i.maybe ? `~ ${i.name}` : `${i.name}`;
  if (i.kind === 'spread') { // item 29: one bar for the week's spending money, expandable by category
    const bar = h('button.chip.spread.out', { type: 'button', title: `Spending money this week: ${i.parts.length} ${i.parts.length === 1 ? 'line' : 'lines'}`, onclick: e => { e.stopPropagation(); spreadPanel(ctx, e.currentTarget, i); } }, h('span.chip-name', {}, `Spending money${i.weekly ? ' this week' : ''}`), h('span.chip-amt', {}, `${sign(i.planned)}${money(Math.abs(i.planned))}`));
    return bar;
  }
  const canMove = i.kind !== 'win' && i.status !== 'Paid';
  // Item 27: drag by the handle only (no text gets selected); the chip itself is a button.
  const handle = canMove ? h('span.drag-handle', { draggable: 'true', title: 'Drag to another day', 'aria-hidden': 'true',
    ondragstart: e => { dragging = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', i.key); document.body.classList.add('cal-dragging'); try { e.dataTransfer.setDragImage(e.currentTarget.parentNode, 10, 10); } catch {} },
    ondragend: () => { dragging = null; document.body.classList.remove('cal-dragging'); document.querySelectorAll('.day.drop').forEach(d => d.classList.remove('drop')); } }, '⋮⋮') : null;
  const btn = h(`button.chip.${cls}`, { type: 'button',
    title: `${i.name}${amt}${i.onCard ? ` · on ${i.onCard}` : ''} · ${i.status}${i.guessDate ? ' · guessed day' : ''}`,
    onclick: e => { e.stopPropagation(); instancePanel(ctx, e.currentTarget, i); } },
  handle, i.guessDate ? h('span.guess-badge', { title: 'Guessed day: the line has no due day yet' }, '?') : null, i.status === 'Paid' ? icon('check') : null, h('span.chip-name', {}, label), amt ? h('span.chip-amt', {}, amt) : null); // item 30
  return btn;
}
// Item 29: what a week's spending money is made of, by category; each line opens its own panel.
function spreadPanel(ctx, anchor, w) {
  S.popover(anchor, h('div.stack', { style: { gap: '6px' } }, h('strong', {}, `Spending money, week of ${dayLabel(w.date)}`), h('span.muted.small', {}, w.parts.some(p => p.gut) ? 'Your gut number, less what the lines and the debt payments already hold, spread week by week until the lines say where it goes.' : 'Variable lines with no set day, spread week by week. A line with a due day sits on its day instead.'),
    ...w.parts.map(p => h('div.row-line', { style: { gap: '8px' } }, p.gut ? h('a.btn.small', { href: '#/cash-flow/budget', onclick: () => S.closePop() }, p.name) : h('button.btn.small', { type: 'button', onclick: e => { S.closePop(); instancePanel(ctx, anchor, p); } }, p.name), /* batch 12 (item 2): the gut part opens the Budget */ h('span.spacer'), h('span.num', {}, `${sign(p.planned)}${money(Math.abs(p.planned))}`))),
    h('div.row-line', { style: { gap: '8px', fontWeight: 700 } }, h('span', {}, 'This week'), h('span.spacer'), h('span.num', {}, `${sign(w.planned)}${money(Math.abs(w.planned))}`))), { width: 340 });
}
const markerRow = list => (list?.length ? h('div.day-marks', {}, list.map(mk => h(`span.day-mark.${mk.kind}`, { title: mk.name }, mk.name))) : null);
// Drag a chip to another day (desktop). Dropping it back on its own day puts it back as planned. Undo in the toast.
function moveTo(ctx, i, date) {
  if (!i || date === i.date) return;
  if (date === i.origDate) mark(ctx.store, i.key, { status: 'Planned', date: undefined });
  else mark(ctx.store, i.key, { status: 'Moved', date });
  S.toast(`Moved ${i.name} to ${dayLabel(date)}.`, { undo: () => ctx.store.undo() });
}
let dragging = null;
function monthGrid(ctx, byDay, endOf, low, marks = new Map()) {
  const ym = UI.calYm;
  const first = new Date(`${ym}-01T12:00:00Z`).getUTCDay();
  const cells = [];
  for (let k = 0; k < first; k++) cells.push(h('div.day.blank'));
  const today = ctx.now().toISOString().slice(0, 10);
  for (let d = 1; d <= daysIn(ym); d++) {
    const date = dateOf(ym, d);
    const items = byDay.get(date) || [];
    const bal = endOf.get(date);
    const open = UI.openDay === date;
    const shown = open ? items : UI.totalsOnly ? [] : items.slice(0, 3); // item 28: the top 3, then +N more
    const cell = h(`div.day${date === today ? '.today' : ''}${bal != null && bal < low ? '.low' : ''}`, { onclick: e => { if (e.target.closest('button, .chip, .icon-btn, .drag-handle')) return; UI.openDay = open ? null : date; ctx.refresh(); } },
      h('div.day-top', {}, h('span.day-n', {}, d), S.iconButton('plus', `Add an entry on ${dayLabel(date)}`, e => entryForm(ctx, e.currentTarget, { date }), { tiny: true })),
      markerRow(marks.get(date)),
      totalsLine(items),
      h('div.chips', {}, shown.map(i => chipOf(ctx, i)),
        items.length > shown.length ? h('button.more-chips', { type: 'button', onclick: e => { e.stopPropagation(); UI.openDay = date; ctx.refresh(); } }, UI.totalsOnly && !open ? `${items.length} ${items.length === 1 ? 'item' : 'items'}` : `+${items.length - shown.length} more`) : null),
      bal != null ? h('div.day-bal', {}, bal < low ? '⚠ ' : '', money(bal)) : null);
    cell.ondragover = e => { if (dragging) { e.preventDefault(); if (!cell.classList.contains('drop')) { document.querySelectorAll('.day.drop').forEach(x => x.classList.remove('drop')); cell.classList.add('drop'); } } }; // item 27: only the hovered day
    cell.ondragleave = () => cell.classList.remove('drop');
    cell.ondrop = e => { e.preventDefault(); cell.classList.remove('drop'); const i = dragging; dragging = null; moveTo(ctx, i, date); };
    cells.push(cell);
  }
  return h('div.cal-grid.card', {}, h('div.dow', {}, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(x => h('span', {}, x))), h('div.days', {}, cells));
}
// Phone: the same month as a list of days (grids do not fit a phone).
function dayList(ctx, byDay, endOf, low, marks = new Map(), { force = false } = {}) { // item 28: the Full list, every item with day totals
  const days = [...byDay.keys()].sort();
  return h(`div.cal-list.card${force ? '.force-list' : ''}`, {}, days.length ? days.map(d => h('div.list-day', {},
    h('div.list-day-top', {}, h('strong', {}, dayLabel(d)), totalsLine(byDay.get(d)), endOf.get(d) != null ? h(`span.day-bal${endOf.get(d) < low ? '.lowtext' : ''}`, {}, endOf.get(d) < low ? '⚠ ' : '', money(endOf.get(d))) : null),
    markerRow(marks.get(d)), h('div.chips', {}, byDay.get(d).map(i => chipOf(ctx, i))))) : h('p.muted', {}, 'Nothing shown. Check the Show filters.'));
}
// Item 28: one line of totals by type for a day (income, spending, debt, savings), each with its color dot.
const TOT_WORDS = { in: 'in', out: 'spending', debt: 'debt', save: 'saving', maybe: 'maybe' };
function totalsLine(items) {
  const t = dayTotals(items);
  const keys = Object.keys(t);
  if (!keys.length) return null;
  return h('div.day-totals', {}, keys.map(k => h(`span.tot.${k}`, { title: TOT_WORDS[k] }, h('span.dot'), `${sign(t[k])}${money(Math.abs(t[k]))}`)));
}

// One instance: Got it / Paid, Partial, Didn't happen, Moved (R091 to R094), and setting a missing day.
function instancePanel(ctx, anchor, i) {
  const box = h('div.stack', { style: { gap: '10px' } });
  const rec = i.recId ? ctx.store.get(i.recId) : null;
  const isIn = i.planned > 0;
  const draw = () => {
    const amtBox = S.moneyInput(Math.abs(i.paid ?? i.planned), null, { hint: 'Actual amount' });
    const read = () => S.parseNum(amtBox.querySelector('input').value);
    const dateBox = h('input', { type: 'date', value: i.date, 'aria-label': 'Date' });
    const set = (patch, label) => { mark(ctx.store, i.key, patch); S.closePop(); S.toast(label, { undo: () => ctx.store.undo() }); };
    if (i.kind === 'win') {
      clear(box, h('strong', {}, `★ ${i.name}`), h('span.muted', {}, dayLabel(i.date)), i.auto ? h('span.muted', {}, 'From the plan. It moves when the plan moves.')
        : S.button('Delete win', { kind: 'danger', iconName: 'trash', onClick: () => { ctx.store.remove(i.recId); S.closePop(); S.toast('Deleted.', { undo: () => ctx.store.undo() }); } }));
      return;
    }
    clear(box,
      h('strong', { style: { fontSize: '1.0625rem' } }, i.name),
      h('span.muted', {}, `${dayLabel(i.origDate)} · planned ${sign(i.planned)}${money(Math.abs(i.planned))}${i.onCard ? ` · charged to ${i.onCard}` : ''}`),
      h('div.row-line', { style: { gap: '6px' } }, h('span.tag.plain', {}, i.status === 'Paid' && isIn ? 'Got it' : i.status)),
      S.labelled('Actual amount', amtBox),
      h('div.row-line', { style: { gap: '6px' } },
        S.button(isIn ? 'Got it' : 'Paid', { kind: 'primary', iconName: 'check', onClick: () => set({ status: 'Paid', paid: (isIn ? 1 : -1) * (read() ?? Math.abs(i.planned)) }, isIn ? 'Marked Got it.' : 'Marked Paid.') }),
        S.button('Partial', { onClick: () => set({ status: 'Partial', paid: (isIn ? 1 : -1) * (read() ?? 0) }, 'Marked Partial. The rest stays planned.') }),
        S.button("Didn't happen", { onClick: () => set({ status: "Didn't happen" }, "Marked Didn't happen. It counts as $0 at month-end.") })),
      h('div.row-line', { style: { gap: '6px' } }, h('label.field', { style: { width: '170px' } }, dateBox),
        S.button('Move', { iconName: 'right', onClick: () => { if (!dateBox.value) return; if (dateBox.value === i.origDate) set({ status: 'Planned', date: undefined }, 'Back on its own day.'); else set({ status: 'Moved', date: dateBox.value }, `Moved to ${dayLabel(dateBox.value)}.`); } }),
        i.status !== 'Planned' ? S.button('Back to planned', { onClick: () => set({ status: 'Planned' }, 'Back to planned.') }) : null),
      S.labelled('Cash flow bucket', S.toggle(BUCKETS, ctx.store.doc.spending.calendar?.marks?.[i.key]?.bucket || defaultBucket(i, ctx.store.doc),
        v => { mark(ctx.store, i.key, { bucket: v }); S.toast(`Counted as ${v} on the cash flow statement.`, { undo: () => ctx.store.undo() }); }, { label: 'Cash flow bucket' }),
        { note: i.kind === 'debt' ? 'Set by type. A loan payment splits: interest is Everyday, principal is Debt.' : 'Set by type; change it for this one if it belongs elsewhere' }),
      i.guessDate && rec ? setDay(ctx, rec, i) : null,
      rec?.kind === 'entry' ? S.button('Edit entry', { iconName: 'note', onClick: e => entryForm(ctx, anchor, { rec }) }) : null,
      rec && rec.kind !== 'entry' ? h('a', { href: (rec.kind === 'debt' && rec.type === 'Credit card' ? '#/net-worth/credit-cards' : { income: '#/cash-flow/income', debt: '#/net-worth/debt', bill: '#/cash-flow/budget', event: '#/plan/next-12-months' }[rec.kind]) || '#/cash-flow/budget', onclick: () => S.closePop() }, `Open ${rec.name || rec.type || 'it'} where it lives`) : null);
  };
  draw();
  S.popover(anchor, box, { width: 380 });
}
// A guessed day: set the real one right here (due day for bills and debts, next payday for income).
function setDay(ctx, rec, i) {
  if (rec.kind === 'income') {
    const d = h('input', { type: 'date', 'aria-label': 'Next payday' });
    return S.labelled('Day not set. Next payday', h('span.row-line', { style: { gap: '6px' } }, h('label.field', { style: { width: '170px' } }, d),
      S.button('Save', { onClick: () => { if (d.value) { ctx.store.update(rec.id, { nextPayday: d.value }); S.closePop(); S.toast('Payday saved.'); } } })));
  }
  const n = h('input', { inputmode: 'numeric', placeholder: '1 to 31', 'aria-label': 'Due day' });
  return S.labelled('Day not set. Due day of the month', h('span.row-line', { style: { gap: '6px' } }, h('label.field', { style: { width: '90px' } }, n),
    S.button('Save', { onClick: () => { const v = Number(n.value); if (v >= 1 && v <= 31) { ctx.store.update(rec.id, { dueDay: v }); S.closePop(); S.toast('Due day saved.'); } } })));
}

// Entry form (Mockup: Cash flow calendar › Entry form).
export function entryForm(ctx, anchor, { date = null, rec = null } = {}) {
  const v = rec ? { ...rec.values, name: rec.name, amount: rec.amount } : { date, direction: 'Out', repeats: 'Never' };
  const name = h('input', { placeholder: 'Name', 'aria-label': 'Name', value: v.name ?? '' });
  const amt = S.moneyInput(v.amount ?? null, null, { hint: 'Amount' });
  let dir = v.direction || 'Out';
  const day = h('input', { type: 'date', value: v.date || date || '', 'aria-label': 'Date' });
  const rep = h('select', { 'aria-label': 'Repeats' }, ['Never', 'Weekly', 'Every 2 weeks', 'Twice a month', 'Monthly', 'Yearly'].map(x => h('option', { selected: x === (v.repeats || 'Never') }, x)));
  const tripBox = h('input', { type: 'checkbox', checked: v.trip === true ? 'checked' : null, 'aria-label': 'Trip' }); // F6: the Trip tag
  const ends = h('input', { type: 'date', value: v.endsOn || '', 'aria-label': 'Ends on' });
  const lines = ctx.visible(r => r.kind === 'bill');
  const cat = h('select', { 'aria-label': 'Budget line' }, h('option', { value: '' }, 'No budget line'), h('option', { value: 'Savings', selected: v.category === 'Savings' }, 'Savings'), lines.map(l => h('option', { value: l.id, selected: v.lineId === l.id }, l.name || l.values.category)));
  const save = () => {
    const amount = S.parseNum(amt.querySelector('input').value);
    if (!day.value) { day.focus(); return; }
    const values = { date: day.value, direction: dir, repeats: rep.value, endsOn: ends.value || null, category: cat.value === 'Savings' ? 'Savings' : null, lineId: cat.value && cat.value !== 'Savings' ? cat.value : null, trip: tripBox.checked || null };
    if (rec) ctx.store.update(rec.id, { name: name.value.trim() || null, amount, ...values });
    else ctx.store.add('entry', { name: name.value.trim() || null, amount, values }, { type: dir === 'In' ? 'Money in' : dir === 'Maybe' ? 'Maybe' : 'Money out' });
    S.closePop(); S.toast(rec ? 'Saved.' : 'Entry added.', { undo: () => ctx.store.undo() });
  };
  name.onkeydown = e => { if (e.key === 'Enter') save(); };
  S.popover(anchor, h('div.stack', { style: { gap: '10px' } },
    h('strong', {}, rec ? 'Edit entry' : 'New entry'),
    h('label.field', {}, name),
    h('div.row-line', { style: { gap: '8px' } }, amt, S.toggle(['In', 'Out', 'Maybe'], dir, x => { dir = x; }, { label: 'In, out or maybe' })),
    h('span.muted.small', {}, 'Maybe = expected but not certain. It stays out of the balance unless Count maybe is on.'),
    h('div.row-line', { style: { gap: '8px' } }, h('label.field', { style: { width: '170px' } }, day), h('label.field', { style: { width: '170px' } }, rep), h('label.check-inline', {}, tripBox, ' Trip')), // F6
    S.moreBlock('entry:more', () => h('div.stack', { style: { gap: '8px' } }, S.labelled('Budget line', h('label.field', { style: { width: '260px' } }, cat)), S.labelled('Ends on', h('label.field', { style: { width: '170px' } }, ends)))),
    h('div.row-line', { style: { gap: '8px' } }, S.button('Save', { kind: 'primary', onClick: save }), S.button('Cancel', { onClick: S.closePop }),
      rec ? S.iconButton('copy', 'Duplicate', () => { ctx.store.duplicate(rec.id); S.closePop(); S.toast('Duplicated.', { undo: () => ctx.store.undo() }); }) : null,
      rec ? S.iconButton('trash', 'Delete', () => { ctx.store.remove(rec.id); S.closePop(); S.toast('Deleted.', { undo: () => ctx.store.undo() }); }) : null)), { width: 400 });
  setTimeout(() => name.focus());
}
function winForm(ctx, anchor) {
  const what = h('input', { placeholder: 'What happened', 'aria-label': 'What happened' });
  const day = h('input', { type: 'date', value: ctx.now().toISOString().slice(0, 10), 'aria-label': 'Date' });
  const save = () => { if (!what.value.trim()) { what.focus(); return; } ctx.store.add('win', { name: what.value.trim(), values: { date: day.value } }, { type: 'Win' }); S.closePop(); S.toast('Win added.', { undo: () => ctx.store.undo() }); };
  what.onkeydown = e => { if (e.key === 'Enter') save(); };
  S.popover(anchor, h('div.stack', { style: { gap: '10px' } }, h('strong', {}, 'Add a win'), h('label.field', {}, what), h('label.field', { style: { width: '170px' } }, day),
    h('span.muted.small', {}, 'Payoff dates, milestones and FI steps appear on their own.'),
    h('div.row-line', { style: { gap: '8px' } }, S.button('Save', { kind: 'primary', onClick: save }), S.button('Cancel', { onClick: S.closePop }))), { width: 340 });
  setTimeout(() => what.focus());
}
// Milestone dates from the Plan become wins too (R095). Filled in by the Plan module when it loads.
export const winSources = [];
const milestoneWins = ctx => winSources.flatMap(f => f(ctx));

function balanceChart(ctx, b) {
  const host = h('div.chart', { style: { height: '220px' } });
  if (b.needs) { clear(host, S.chartEmpty(ctx, b.needs)); host.style.height = 'auto'; return host; }
  queueMicrotask(() => {
    if (!window.echarts || !host.isConnected) return;
    const t = S.chartTheme('needs');
    const c = window.echarts.init(host, null, { renderer: 'svg' });
    c.setOption({
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 64, right: 16, top: 16, bottom: 28 },
      tooltip: { trigger: 'axis', valueFormatter: v => money(v) },
      xAxis: { type: 'category', data: b.rows.map(r => r.date.slice(5)), axisLabel: { color: t.text2 }, axisLine: { lineStyle: { color: t.line } } },
      yAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      series: [{ type: 'line', data: b.rows.map(r => Math.round(r.balance)), showSymbol: false, lineStyle: { width: 2.5, color: t.area }, areaStyle: { color: t.area, opacity: 0.08 },
        markLine: { symbol: 'none', silent: true, lineStyle: { type: 'dashed', color: t.text2 }, label: { formatter: `Low line ${money(b.low)}`, color: t.text2, position: 'insideEndTop' }, data: [{ yAxis: b.low }] } }],
    });
    new ResizeObserver(() => c.resize()).observe(host);
  });
  return host;
}

// ---------- Month-end close ----------
export function closeScreen(app, ctx) {
  const doc = ctx.store.doc;
  const now = thisYm(ctx);
  const since = ymOf(new Date(doc.createdAt || ctx.now())); // nothing to close before the client existed
  const months = Array.from({ length: 6 }, (_, k) => addMonths(now, -k)).filter(ym => ym >= since);
  const views = months.map(ym => monthView(doc, ctx.ref, ym, { now: ctx.now() }));
  const any = views.some(v => v.rows.some(r => (r.estimate ?? 0) > 0));
  if (!any) return [head('Month end', 'Plan vs actual'), h('div.list', {}, h('div.empty', {}, h('span.title', {}, 'No closed months yet'),
    h('span.muted', {}, 'Plan a month on Budget, mark what was paid on the calendar, then close it here.'), S.button('Open Budget', { iconName: 'right', onClick: () => app.go('#/cash-flow/budget') })))];
  UI.review ??= views.find(v => !v.closed)?.ym ?? now;
  const acc = gutAccuracy(closedMonths(doc));
  const streak = closeStreak(doc, ctx.now());
  return [head('Month end', 'Plan vs actual'),
    h('p.muted', { style: { margin: '0 0 8px' } }, h('strong', {}, streak.words), streak.months ? ` · ${monthName(streak.first)} to ${monthName(streak.last)}. One missed month inside a run is a grace month.` : ' Close a month to start the streak.'), // L (overnight)
    S.moreBlock('close:import', () => csvImportBlock(app, ctx), { label: 'Import a bank statement (CSV)' }), // J (overnight)
    acc.hidden ? null : S.summaryStrip(ctx, [{ label: 'Gut accuracy', result: acc, note: 'How far the first guess was off, on average' }]),
    h('div.close-list', {}, views.map(v => closeRow(app, ctx, v)))];
}
function closeRow(app, ctx, v) {
  const withEst = v.rows.filter(r => (r.estimate ?? 0) > 0);
  const filled = withEst.filter(r => r.actual != null).length;
  const open = UI.review === v.ym;
  const doClose = e => {
    // One click: close, the three statements for the month (kept with it) and a snapshot (Phase 3.5).
    const go = () => {
      closeMonth(ctx.store, ctx.ref, v.ym, { now: ctx.now() });
      const st = statements(ctx.store.doc, ctx.ref, { kind: 'month', ym: v.ym }, { now: ctx.now() });
      ctx.store.setIn('spending', ['months', v.ym, 'statements'], { netWorth: st.netWorth.netWorth, liquid: st.netWorth.liquid, surplus: st.income.surplus, startCash: st.cash.start, endCash: st.cash.end, unexplainedCash: st.tie.unexplainedCash }, 'Statements');
      app.snapshot(`Month-end ${monthName(v.ym)}`); /* M6.1 */
      S.toast(`${monthName(v.ym)} closed: statements made and a snapshot saved.`, { undo: () => ctx.store.undo(), action: { label: 'See statements', run: () => app.go('#/report/statements') } });
    };
    if (v.gaps.length) S.confirmBox(e.currentTarget, { text: `${v.gaps.length} ${v.gaps.length === 1 ? 'line has' : 'lines have'} no actual. Close anyway? ${v.gaps.length === 1 ? 'It counts' : 'They count'} as $0.`, yes: 'Close month', no: 'Not yet', onYes: go });
    else go();
  };
  return h(`div.card.close-row${v.closed ? '.closed' : ''}`, {},
    h('div.row-line', { style: { gap: '14px' } },
      h('strong.close-month', {}, monthName(v.ym)),
      h('span', {}, v.closed ? icon('check') : null, `Actuals ${filled} of ${withEst.length}`),
      v.gaps.length && !v.closed ? h('span.tag.warn', {}, `Gaps: ${v.gaps.length} ${v.gaps.length === 1 ? 'line' : 'lines'}`) : null,
      v.closed ? h('span.tag.good', {}, '✓ Closed') : null,
      h('span', { style: { flex: 1 } }),
      S.button(open ? 'Hide review' : 'Review', { iconName: open ? 'down' : 'right', onClick: () => { UI.review = open ? null : v.ym; app.render(); } }),
      v.closed ? S.button('Reopen', { onClick: () => { reopenMonth(ctx.store, v.ym); S.toast('Reopened.', { undo: () => ctx.store.undo() }); } })
        : open ? null : S.button('Close month', { kind: open ? 'secondary' : 'primary', iconName: 'check', onClick: doClose })), // open: the steps hold the one primary button
    open ? review(app, ctx, v, doClose) : null);
}
// Guided close (polish item 8): 1 Confirm actuals, 2 Review biggest misses (variable first), 3 Carry forward.
const CLOSE_STEPS = ['Confirm actuals', 'Review biggest misses', 'Carry forward'];
UI.closeStep = {};
function stepper(app, v, step) {
  return h('ol.close-steps', { 'aria-label': 'Month end steps' }, CLOSE_STEPS.map((name, i) => h(`li${i + 1 === step ? '.on' : i + 1 < step ? '.done' : ''}`, {},
    h('button', { type: 'button', 'aria-current': i + 1 === step ? 'step' : null, onclick: () => { UI.closeStep[v.ym] = i + 1; app.render(); } }, h('span.n', {}, String(i + 1)), name))));
}
function review(app, ctx, v, doClose) {
  const step = UI.closeStep[v.ym] ?? 1;
  const go = n => () => { UI.closeStep[v.ym] = n; app.render(); };
  const set = (r, val) => ctx.store.setIn('spending', ['months', v.ym, 'lines', r.line.id, 'actual'], val === null ? undefined : val, 'Actual');
  const top = v.misses.slice(0, 3); // variable misses first (R145)
  const rows = [...v.rows.filter(r => (r.estimate ?? 0) > 0 || r.actual != null)].sort((a, b) => (b.variable - a.variable) || Math.abs(b.diff ?? 0) - Math.abs(a.diff ?? 0));
  const name = r => [h('span', {}, r.line.name || r.line.values.category), r.variable ? null : h('span.muted.small', {}, ' fixed'), r.priceUp ? h('span.tag.warn', { style: { marginLeft: '6px' } }, 'Price went up') : null];
  const diff = r => (r.diff == null ? '' : h(`span.diff${r.diff > 0.5 ? '.over' : r.diff < -0.5 ? '.under' : ''}`, {}, Math.abs(r.diff) < 0.5 ? 'On plan' : `${r.diff > 0 ? '+' : '−'}${money(Math.abs(r.diff))}`));
  const table = (heads, list, cells) => h('div.list-scroll', {}, h('table.rows.review-table', {},
    h('thead', {}, h('tr', {}, heads.map((x, k) => h(`th${k && x ? '.num' : ''}`, {}, x)))),
    h('tbody', {}, list.map(r => h('tr.row', {}, cells(r))))));
  const nav = (primary, back = null) => h('div.row-line.close-nav', {}, back ? S.button('Back', { iconName: 'left', onClick: back }) : null, h('span', { style: { flex: 1 } }), primary);
  let body;
  if (step === 1) {
    const missing = rows.filter(r => r.actual == null).length;
    body = [h('p.muted', {}, missing ? `${missing} ${missing === 1 ? 'line has' : 'lines have'} no actual yet. Lines marked Paid on the calendar are already in; type the rest.` : 'Every line has an actual.'),
      table(['Line', 'Plan', 'Actual'], rows, r => [h('td.col-first', {}, name(r)), h('td.num', {}, money(r.estimate ?? 0), r.fromRough ? h('span.muted.small', {}, ' usual') : null),
        h('td.num', {}, v.closed ? money(r.actual) : S.moneyInput(r.actualFrom === 'typed' ? r.actual : null, val => set(r, val), { hint: r.actual == null ? 'Add actual' : moneyText(r.actual), key: `close:${v.ym}:${r.line.id}` }))]),
      nav(S.button('Next: review the misses', { kind: 'primary', iconName: 'right', onClick: go(2) }))];
  } else if (step === 2) {
    const shown = rows.filter(r => r.actual != null && r.diff != null && Math.abs(r.diff) >= 0.5);
    body = [top.length ? h('div.misses', {}, h('span.label', {}, 'Biggest misses'), top.map(r => h('span.miss', {}, h('strong', {}, r.line.name || r.line.values.category), ` ${r.diff > 0 ? '+' : '−'}${money(Math.abs(r.diff))}`,
      r.variable ? null : h('span.muted', {}, ' (fixed)')))) : h('p.muted', {}, v.rows.some(r => r.actual != null) ? 'Everything landed on plan.' : 'No actuals yet. Go back a step to add them.'),
      shown.length ? table(['Line', 'Plan', 'Actual', 'Difference'], shown, r => [h('td.col-first', {}, name(r)), h('td.num', {}, money(r.estimate ?? 0)), h('td.num', {}, money(r.actual)), h('td.num', {}, diff(r))]) : null,
      bulletChart(ctx, rows.filter(r => r.actual != null).slice(0, 12), v.gut),
      nav(S.button('Next: carry forward', { kind: 'primary', iconName: 'right', onClick: go(3) }), go(1))];
  } else {
    const carryable = rows.filter(r => r.actual != null && r.diff && Math.abs(r.diff) >= 1);
    body = [h('p.muted', {}, carryable.length ? "Use what really happened as next month's plan, one line at a time. Closing carries the variable misses on its own." : v.rows.some(r => r.actual != null) ? 'Nothing to carry: every line landed on plan.' : 'No actuals yet, so nothing to carry. Closing counts blank lines as $0.'),
      carryable.length ? table(['Line', 'Actual', 'Difference', ''], carryable, r => [h('td.col-first', {}, name(r)), h('td.num', {}, money(r.actual)), h('td.num', {}, diff(r)),
        h('td', {}, S.button('Carry →', { size: 'small', tip: `Use ${money(r.actual)} as next month's plan`, onClick: () => { carry(ctx.store, v.ym, r.line.id, r.actual); S.toast(`${money(r.actual)} set as ${monthName(addMonths(v.ym, 1))}'s plan.`, { undo: () => ctx.store.undo() }); } }))]) : null,
      nav(v.closed ? S.button('Done', { kind: 'primary', iconName: 'check', onClick: () => { UI.review = null; app.render(); } }) : S.button('Close month', { kind: 'primary', iconName: 'check', onClick: doClose }), go(2))];
  }
  return h('div.review', {}, stepper(app, v, step), ...body);
}
function bulletChart(ctx, rows, gut) {
  if (!rows.length) return null;
  const host = h('div.chart', { style: { height: `${Math.max(160, rows.length * 34 + 50)}px` } });
  queueMicrotask(() => {
    if (!window.echarts || !host.isConnected) return;
    const t = S.chartTheme('needs');
    const c = window.echarts.init(host, null, { renderer: 'svg' });
    c.setOption({
      textStyle: { fontFamily: t.font, color: t.text }, grid: { left: 150, right: 24, top: 28, bottom: 24 }, legend: { top: 0, textStyle: { color: t.text2 } },
      tooltip: { trigger: 'axis', valueFormatter: v => money(v) },
      xAxis: { type: 'value', axisLabel: { color: t.text2, formatter: v => short(v) }, splitLine: { lineStyle: { color: t.line } } },
      yAxis: { type: 'category', inverse: true, data: rows.map(r => r.line.name || r.line.values.category), axisLabel: { color: t.text, fontWeight: 600 } },
      series: [{ name: 'Plan', type: 'bar', data: rows.map(r => Math.round(r.estimate ?? 0)), barWidth: 18, itemStyle: { color: t.text2, opacity: 0.3, borderRadius: 4 } },
        { name: 'Actual', type: 'bar', data: rows.map(r => Math.round(r.actual)), barWidth: 8, barGap: '-72%', itemStyle: { color: t.area, borderRadius: 4 } }],
    });
    new ResizeObserver(() => c.resize()).observe(host);
  });
  return h('div', { style: { marginTop: '12px' } }, h('span.label', {}, 'Plan vs actual'), host);
}

// Home and Report read the first low day (R096).
export function firstLowDay(ctx) {
  const b = balances(ctx.store.doc, ctx.ref, thisYm(ctx), 2, { now: ctx.now(), autoWins: milestoneWins(ctx), low: bufferLine(ctx) });
  return b.firstLow ? { ...b.firstLow, low: b.low, label: dayLabel(b.firstLow.date) } : null;
}
// I (overnight): the Buffer layer's target (two weeks of spending), the low line unless one is typed on the calendar.
export function bufferLine(ctx) {
  try { const t = layersOf(ctx.store.doc, ctx.ref, ctx.now()).layers.find(l => l.id === 'buffer')?.target; return t != null && t > 0 ? Math.round(t) : null; } catch { return null; }
}
