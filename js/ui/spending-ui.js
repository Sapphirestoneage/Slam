// Spending (build phase 6): Budget with five passes, irregular costs, the cash flow calendar and month-end close.
// Every screen is a view of the same records (R117); the month model lives in js/month.js.
import { h, clear, icon } from './dom.js';
import * as S from './staples.js';
import { spendingList, irregularList, IRREGULAR } from './lists.js';
import { PASSES, ymOf, addMonths, monthName, daysIn, dateOf, instances, balances, monthView, closeMonth, reopenMonth, carry,
  closedMonths, mark, bonusPaycheck, startBalance, gutRecord, GROUPS } from '../month.js';
import { gutAccuracy, DRAFTT } from '../math/spending.js';
import { money, pct } from '../format.js';

// Screen state that is about looking, not the client's numbers (kept for this browser tab).
export const UI = { pass: 'Rough', ym: null, period: 'Monthly', groupBy: 'DRAFTT', calYm: null, range: 'Month', show: new Set(GROUPS), openDay: null, review: null };
const thisYm = ctx => ymOf(ctx.now());
const head = (title, sub, ...right) => h('div.page-head', {}, h('div', {}, h('h1', {}, title), sub ? h('p', {}, sub) : null), h('div.row-line', {}, ...right));
const sum = (list, f) => list.reduce((s, x) => s + (f(x) ?? 0), 0);
const short = v => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(Math.abs(v) >= 10000 ? 0 : 1)}k` : money(v));
const PERIOD = { Monthly: 1, '3 months': 3, '6 months': 6, Annual: 12 };
const WHAT = {
  Gut: 'One number: what do you think you spend a month? Kept to compare later, never overwritten.',
  Basics: 'Totals by area, not line items. The quick pass Fast Track uses.',
  Rough: 'Line by line, what it usually is. Placeholders meant to be replaced.',
  Estimate: 'The plan for one month. Starts from Rough until you confirm each line.',
  Actual: 'What really happened. Lines marked Paid on the calendar fill in on their own.',
};
const monthStepper = (ym, onChange) => h('span.row-line.month-step', { style: { gap: '6px', flexWrap: 'nowrap' } },
  S.iconButton('left', 'Previous month', () => onChange(addMonths(ym, -1))), h('strong', { style: { minWidth: '130px', textAlign: 'center' } }, monthName(ym)),
  S.iconButton('right', 'Next month', () => onChange(addMonths(ym, 1))));

// ---------- Budget ----------
export function budgetScreen(app, ctx) {
  UI.ym ??= thisYm(ctx);
  const doc = ctx.store.doc;
  const m = ctx.metrics();
  const redraw = () => app.render();
  const cardsMost = !!doc.profile.mostOnCards;
  const passBar = h('div.card.pass-bar', {},
    h('div.row-line', { style: { gap: '12px' } },
      h('span.label', {}, 'Pass'), S.toggle(PASSES, UI.pass, v => { UI.pass = v; redraw(); }, { label: 'Which pass you are filling' }),
      ['Estimate', 'Actual'].includes(UI.pass) ? monthStepper(UI.ym, v => { UI.ym = v; redraw(); }) : null,
      h('span.spacer', { style: { flex: 1 } }),
      ['Rough', 'Estimate', 'Actual'].includes(UI.pass) ? h('span.row-line', { style: { gap: '8px' } }, h('span.label', {}, 'Group by'),
        S.toggle(['DRAFTT', 'Category'], UI.groupBy, v => { UI.groupBy = v; redraw(); }, { label: 'Group by' })) : null),
    h('p.muted.pass-what', {}, WHAT[UI.pass]),
    S.moreBlock('budget:settings', () => h('div.row-line', { style: { gap: '20px', alignItems: 'flex-start' } },
      S.labelled('Use for surplus and FI', S.toggle([['gut', 'Gut number'], ['lines', 'The lines']], m.inputs.spendingSource, v => ctx.store.setDoc('spending', { source: v }), { label: 'Spending used for the math' }),
        { note: m.inputs.gutTotal === null ? 'No gut number yet, so the lines are used' : `Gut ${money(m.inputs.gutTotal)} · lines ${money(m.inputs.lineTotal ?? 0)}` }),
      S.labelled('Basis', S.toggle([['accrual', 'Accrual'], ['cash', 'Cash']], doc.spending.basis || 'accrual', v => ctx.store.setDoc('spending', { basis: v }), { label: 'Cash or accrual' }),
        { note: 'Accrual spreads yearly and prepaid costs across the months' }),
      S.labelled('Period', S.select(Object.keys(PERIOD), UI.period, v => { UI.period = v || 'Monthly'; redraw(); }, { label: 'Period', hint: 'Monthly', width: 140 })),
      S.labelled('Cards', S.checkbox('Most spending goes on cards', cardsMost, v => ctx.store.setDoc('profile', { mostOnCards: v })), { note: 'Shows Paid with on every line' })), { label: 'Settings for this budget' }));
  const view = monthView(doc, ctx.ref, UI.ym, { now: ctx.now() });
  const body = UI.pass === 'Gut' ? gutPass(app, ctx, view)
    : UI.pass === 'Basics' ? basicsPass(ctx)
      : h('div.visuals', {}, S.recordList(ctx, spendingList(ctx.ref, { pass: UI.pass, ym: UI.ym, groupBy: UI.groupBy, paidWithColumn: cardsMost })),
        S.visualsPanel(ctx, { charts: budgetCharts, area: 'needs' }));
  return [head('Budget', 'Every spending line and the five passes'), passBar, budgetStrip(ctx, view), body,
    S.recordList(ctx, irregularList(ctx.ref, { onWalk: a => walkIrregular(ctx, a) }))];
}

// R146, R147: fixed and variable side by side with % of take-home; the fixed total is the floor.
function budgetStrip(ctx, view) {
  const m = ctx.metrics();
  const k = PERIOD[UI.period] || 1;
  const th = m.inputs.takeHome;
  const lines = ctx.visible(r => r.kind === 'bill' && !r.values.irregular && r.status !== 'Not for me');
  const cash = (ctx.store.doc.spending.basis || 'accrual') === 'cash';
  const monthlyOf = r => (cash && (r.per === 'year' || r.covers) ? 0 : view.rows.find(x => x.line.id === r.id)?.[UI.pass === 'Rough' ? 'rough' : 'estimate'] ?? 0);
  const fixed = sum(lines.filter(r => r.values.amountType === 'Fixed'), monthlyOf);
  const variable = sum(lines.filter(r => r.values.amountType !== 'Fixed'), monthlyOf);
  const yearly = ctx.visible(r => r.kind === 'bill' && r.values.irregular && r.amount != null);
  const setAside = cash ? sum(yearly.filter(r => String(r.values.monthDue) === String(Number(UI.ym.slice(5)))), r => r.amount) : sum(yearly, r => r.amount / 12);
  const res = (v, text) => ({ id: 'M23', value: v * k, needs: [], unit: 'money', text });
  const share = v => (th ? ` · ${pct(v / th)} of take-home` : '');
  const items = [
    { label: `Fixed${k > 1 ? `, ${UI.period}` : ''}`, result: res(fixed, `Lines tagged Fixed amount, ${UI.pass === 'Rough' ? 'their usual number' : `the ${monthName(UI.ym)} estimate`}: ${money(fixed)} a month. This is the floor you pay no matter what; it feeds runway and Lean FI.`), note: `The floor${share(fixed)}`, home: '#/spending/budget' },
    { label: `Variable${k > 1 ? `, ${UI.period}` : ''}`, result: res(variable, `Lines tagged Variable amount: ${money(variable)} a month.`), note: share(variable).replace(' · ', '') || null },
    { label: `Yearly costs set aside${k > 1 ? `, ${UI.period}` : ''}`, result: res(setAside, cash ? `Yearly costs due in ${monthName(UI.ym)}: ${money(setAside)} (cash view).` : `Each yearly cost divided by 12: ${money(setAside)} a month.`) },
  ];
  if (UI.pass === 'Actual') {
    const diff = view.totals.actual === null ? null : view.totals.actual - view.totals.estimate;
    items.push({ label: 'Estimate vs actual', result: diff === null ? { id: 'M25', value: null, needs: ['an actual'], unit: 'money' } : { id: 'M25', value: diff, needs: [], unit: 'money', text: `Actual ${money(view.totals.actual)} minus estimate ${money(view.totals.estimate)} for ${monthName(UI.ym)}.` },
      note: diff === null ? null : diff > 0 ? 'Over the plan' : 'Under the plan' });
  } else {
    const per = perPaycheck(m);
    items.push(per ? { label: 'Per paycheck', result: { id: 'M20', value: (fixed + variable + setAside) / per.per, needs: [], unit: 'money', text: `Spending ${money(fixed + variable + setAside)} a month over ${per.per.toFixed(2)} paychecks a month (${per.label}).` }, note: 'What each paycheck has to cover' }
      : { label: 'Gut vs lines', result: view.gut === null ? { id: 'M26', value: null, needs: ['a gut number'], unit: 'money' } : { id: 'M26', value: fixed + variable + setAside - view.gut, needs: [], unit: 'money', text: `Lines ${money(fixed + variable + setAside)} minus the gut number ${money(view.gut)}.` }, note: 'Lines minus the first guess' });
  }
  return S.summaryStrip(ctx, items);
}
function perPaycheck(m) {
  const f = m.inputs.income.find(x => x.r.values.payFrequency)?.r.values.payFrequency;
  const per = { week: 52 / 12, '2 weeks': 26 / 12, 'twice a month': 2, month: 1 }[f];
  return per && per !== 1 ? { per, label: { week: 'weekly', '2 weeks': 'every 2 weeks', 'twice a month': 'twice a month' }[f] } : null;
}

// Gut: one number. The All in record (Fast Track writes the same one).
function gutPass(app, ctx, view) {
  const rec = gutRecord(ctx.store.doc);
  const set = v => {
    if (rec) ctx.store.update(rec.id, { amount: v, status: rec.status || 'Roughly' });
    else ctx.store.add('spending', { name: 'Monthly spending, all in', amount: v, status: 'Roughly', values: { includesDebtPayments: true, pass: 'Gut' } }, { type: 'All in' });
  };
  const lineTotal = view.totals.rough;
  return h('div.card.gut-card', {},
    h('h2', {}, 'What do you think you spend in a month?'),
    h('div.row-line', { style: { gap: '12px', marginTop: '12px' } }, S.moneyInput(rec?.amount ?? null, set, { hint: 'Your gut number', key: 'gut' }),
      rec ? S.toggle([[true, 'Includes debt payments'], [false, 'Not debt payments']], rec.values.includesDebtPayments !== false, v => ctx.store.update(rec.id, { includesDebtPayments: v }), { label: 'Includes debt payments' }) : null),
    h('p.muted', { style: { marginTop: '12px' } }, rec?.amount != null && lineTotal ? `The lines add up to ${money(lineTotal)} a month, ${money(Math.abs(lineTotal - rec.amount))} ${lineTotal > rec.amount ? 'more' : 'less'} than the gut number.` : 'Ask before looking at anything. It is a test of how well we know our own spending.'),
    h('div.row-line', { style: { marginTop: '8px' } }, S.button('Next: Basics', { iconName: 'right', onClick: () => { UI.pass = 'Basics'; app.render(); } })));
}

// Basics: one total per area (R132). Typed totals, with what the lines say beside them.
function basicsPass(ctx) {
  const doc = ctx.store.doc;
  const basics = doc.spending.basics || {};
  const lines = ctx.visible(r => r.kind === 'bill' && r.status !== 'Not for me');
  const areas = [...new Set(['Accommodation', 'Food', 'Transportation', 'Therapy', 'Other', 'Wants', ...lines.map(r => r.values.draftt).filter(Boolean)])];
  const fromLines = a => sum(lines.filter(r => (r.values.draftt || 'Other') === a), r => (r.per === 'year' ? (r.amount ?? 0) / 12 : r.amount));
  const total = sum(areas, a => basics[a]);
  return h('div.card', {}, h('div.basics-grid', {}, areas.map(a => h('div.basics-row', {},
    h('span.basics-name', {}, a),
    S.moneyInput(basics[a] ?? null, v => ctx.store.setIn('spending', ['basics', a], v === null ? undefined : v, `Basics: ${a}`), { hint: 'Add total', key: `basics:${a}` }),
    h('span.muted', {}, fromLines(a) ? `Lines say ${money(fromLines(a))}` : '')))),
  h('p', { style: { marginTop: '12px', fontWeight: 600 } }, Object.keys(basics).length ? `Basics total: ${money(total)} a month` : 'Type a total for each area that applies; skip the rest.'));
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
      ctx.store.add('bill', { name: item.name, amount: yearly, per: 'year', values: { irregular: true, monthDue: month ? Number(month) : null, draftt: 'Other', amountType: 'Fixed', timing: 'Fixed date' } }, { type: 'Yearly cost' });
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
        .map(([a, t]) => { const ls = lines.filter(r => r.values.amountType === a && r.values.timing === t); return { a, t, total: sum(ls, r => (r.per === 'year' ? r.amount / 12 : r.amount)), n: ls.length }; });
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
      for (const r of lines) { const k = r.values.draftt || 'Other'; by.set(k, (by.get(k) || 0) + (r.per === 'year' ? r.amount / 12 : r.amount)); }
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
  const doc = ctx.store.doc;
  const cal = doc.spending.calendar || {};
  const redraw = () => app.render();
  const range = { Month: 1, '3 mo': 3, '6 mo': 6, Year: 12 }[UI.range] || 1;
  const b = balances(doc, ctx.ref, UI.calYm, range, { now: ctx.now(), autoWins: milestoneWins(ctx) });
  const list = b.list || instances(doc, ctx.ref, UI.calYm, { now: ctx.now() });
  const monthList = list.filter(i => i.date.startsWith(UI.calYm) || i.origDate?.startsWith(UI.calYm));
  if (!monthList.some(i => i.kind !== 'win')) {
    return [head('Cash flow calendar', 'Day by day, with a running balance'), h('div.card', {}, h('div.empty.center', {},
      h('span.title', {}, 'Add your paychecks and bills to see your month'),
      h('div.row-line', {}, S.button('Add a paycheck', { iconName: 'plus', onClick: () => app.go('#/my-money/income') }), S.button('Add a bill', { iconName: 'plus', onClick: () => app.go('#/spending/budget') }),
        S.button('Add entry', { iconName: 'plus', onClick: e => entryForm(ctx, e.currentTarget, { date: dateOf(UI.calYm, 1) }) }))))];
  }
  const st = startBalance(doc, ctx.ref, ctx.now());
  const header = h('div.card.cal-head', {},
    h('div.row-line', { style: { gap: '10px' } },
      monthStepper(UI.calYm, v => { UI.calYm = v; UI.openDay = null; redraw(); }),
      S.button('Today', { onClick: () => { UI.calYm = thisYm(ctx); redraw(); } }),
      S.toggle(['Month', '3 mo', '6 mo', 'Year'], UI.range, v => { UI.range = v; redraw(); }, { label: 'How far ahead the balance looks' }),
      h('span', { style: { flex: 1 } }),
      S.button('Add a win', { iconName: 'plus', onClick: e => winForm(ctx, e.currentTarget) }),
      S.button('Add entry', { kind: 'primary', iconName: 'plus', onClick: e => entryForm(ctx, e.currentTarget, { date: UI.calYm === thisYm(ctx) ? ctx.now().toISOString().slice(0, 10) : dateOf(UI.calYm, 1) }) })),
    S.moreBlock('cal:settings', () => h('div.row-line.cal-settings', { style: { gap: '16px', marginTop: '10px', alignItems: 'flex-end' } },
      S.labelled('Starting balance', S.moneyInput(cal.start ?? null, v => { ctx.store.setIn('spending', ['calendar', 'start'], v === null ? undefined : v, 'Starting balance'); ctx.store.setIn('spending', ['calendar', 'startYm'], v === null ? undefined : UI.calYm); },
        { hint: st.value == null ? 'Add balance' : `${moneyText(st.value)} (checking)`, key: 'cal:start' }), { note: cal.start != null ? `As of the start of ${monthName(cal.startYm || UI.calYm)}` : 'Pulled from checking; type to change' }),
      S.labelled('Low balance line', S.moneyInput(cal.low ?? null, v => ctx.store.setIn('spending', ['calendar', 'low'], v === null ? undefined : v, 'Low balance line'), { hint: moneyText(ctx.ref.defaults.lowBalanceLine), key: 'cal:low' })),
      S.labelled('Show', h('div.seg.multi', { role: 'group', 'aria-label': 'Show' }, GROUPS.map(gp => h('button', { type: 'button', 'aria-pressed': String(UI.show.has(gp)),
        onclick: () => { UI.show.has(gp) ? UI.show.delete(gp) : UI.show.add(gp); redraw(); } }, gp)))),
      S.checkbox('Count maybe money', !!cal.countMaybe, v => ctx.store.setIn('spending', ['calendar', 'countMaybe'], v, 'Count maybe')),
      S.checkbox('Wins on their own', cal.autoWins !== false, v => ctx.store.setIn('spending', ['calendar', 'autoWins'], v, 'Auto wins'))),
    { label: `Balance ${st.value == null ? 'not set' : money(st.value)} · low line ${money(cal.low ?? ctx.ref.defaults.lowBalanceLine)} · ${UI.show.size === GROUPS.length ? 'showing all' : `showing ${UI.show.size} of ${GROUPS.length}`}` }));
  const notes = [];
  if (bonusPaycheck(monthList)) notes.push(h('div.banner-inline.good', {}, icon('check'), ` Bonus paycheck month: three paydays land in ${monthName(UI.calYm, 'long')}.`));
  if (b.firstLow) notes.push(h('div.banner-inline', {}, '⚠ ', `Below ${money(b.low)} on ${dayLabel(b.firstLow.date)}: ${money(b.firstLow.balance)}.`));
  if (b.needs) notes.push(h('div.banner-inline', {}, `The running balance needs ${b.needs.join(' and ')}.`));
  // One quiet line for the smaller warnings: large amounts on no fixed date (R142), and days that are guesses.
  const risky = [...new Set(monthList.filter(i => i.risk && i.status === 'Planned').map(i => i.name))];
  const guessN = new Set(monthList.filter(i => i.guessDate).map(i => i.recId)).size;
  const heads = [risky.length ? `Timing risk: ${risky.slice(0, 3).join(', ')}${risky.length > 3 ? ` and ${risky.length - 3} more` : ''} are large with no fixed date` : null,
    guessN ? `${guessN} ${guessN === 1 ? 'item sits' : 'items sit'} on a guessed day (dotted); click one to set its day` : null].filter(Boolean);
  if (heads.length) notes.push(h('div.banner-inline.soft', {}, heads.join('. ') + '.'));
  const byDay = new Map();
  for (const i of monthList) { if (!UI.show.has(i.group)) continue; const k = i.date.startsWith(UI.calYm) ? i.date : i.origDate; if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(i); }
  const endOf = new Map((b.rows || []).map(r => [r.date, r.balance]));
  return [head('Cash flow calendar', 'Day by day, with a running balance'), header, ...notes,
    monthGrid(ctx, byDay, endOf, b.low), dayList(ctx, byDay, endOf, b.low),
    h('div.card.cal-chart', {}, h('div.bar-top', {}, h('strong', {}, `Running balance, ${UI.range === 'Month' ? monthName(UI.calYm) : `${UI.range} from ${monthName(UI.calYm)}`}`)), balanceChart(ctx, b))];
}
const dayLabel = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const moneyText = v => S.moneyText(v);

function chipOf(ctx, i) {
  const cls = [CHIP[i.group] || 'out', i.onCard ? 'oncard' : '', i.status === 'Paid' ? 'done' : '', i.status === "Didn't happen" ? 'missed' : '', i.status === 'Partial' ? 'partial' : '',
    i.status === 'Moved' && !i.date.startsWith(UI.calYm) ? 'moved-away' : '', i.guessDate ? 'guess' : ''].filter(Boolean).join('.');
  const amt = i.kind === 'win' ? '' : ` ${sign(i.planned)}${money(Math.abs(i.status === 'Paid' && i.paid != null ? i.paid : i.planned))}`;
  const label = i.kind === 'win' ? `★ ${i.name}` : i.maybe ? `~ ${i.name}` : `${i.name}`;
  return h(`button.chip.${cls}`, { type: 'button', title: `${i.name}${amt}${i.onCard ? ` · on ${i.onCard}` : ''} · ${i.status}${i.guessDate ? ' · day not set' : ''}`,
    onclick: e => { e.stopPropagation(); instancePanel(ctx, e.currentTarget, i); } },
  i.status === 'Paid' ? icon('check') : null, h('span.chip-name', {}, label), amt ? h('span.chip-amt', {}, amt) : null);
}
function monthGrid(ctx, byDay, endOf, low) {
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
    const shown = open ? items : items.slice(0, 4);
    cells.push(h(`div.day${date === today ? '.today' : ''}${bal != null && bal < low ? '.low' : ''}`, {},
      h('div.day-top', {}, h('span.day-n', {}, d), S.iconButton('plus', `Add an entry on ${dayLabel(date)}`, e => entryForm(ctx, e.currentTarget, { date }), { tiny: true })),
      h('div.chips', {}, shown.map(i => chipOf(ctx, i)),
        items.length > shown.length ? h('button.more-chips', { type: 'button', onclick: () => { UI.openDay = date; ctx.refresh(); } }, `+${items.length - shown.length} more`) : null),
      bal != null ? h('div.day-bal', {}, bal < low ? '⚠ ' : '', money(bal)) : null));
  }
  return h('div.cal-grid.card', {}, h('div.dow', {}, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(x => h('span', {}, x))), h('div.days', {}, cells));
}
// Phone: the same month as a list of days (grids do not fit a phone).
function dayList(ctx, byDay, endOf, low) {
  const days = [...byDay.keys()].sort();
  return h('div.cal-list.card', {}, days.length ? days.map(d => h('div.list-day', {},
    h('div.list-day-top', {}, h('strong', {}, dayLabel(d)), endOf.get(d) != null ? h(`span.day-bal${endOf.get(d) < low ? '.lowtext' : ''}`, {}, endOf.get(d) < low ? '⚠ ' : '', money(endOf.get(d))) : null),
    h('div.chips', {}, byDay.get(d).map(i => chipOf(ctx, i))))) : h('p.muted', {}, 'Nothing shown. Check the Show filters.'));
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
        S.button('Move to this day', { onClick: () => set({ status: 'Moved', date: dateBox.value }, `Moved to ${dayLabel(dateBox.value)}.`) }),
        i.status !== 'Planned' ? S.button('Back to planned', { onClick: () => set({ status: 'Planned' }, 'Back to planned.') }) : null),
      i.guessDate && rec ? setDay(ctx, rec, i) : null,
      rec?.kind === 'entry' ? S.button('Edit entry', { iconName: 'note', onClick: e => entryForm(ctx, anchor, { rec }) }) : null,
      rec && rec.kind !== 'entry' ? h('a', { href: { income: '#/my-money/income', debt: '#/my-money/debt', bill: '#/spending/budget', event: '#/plan/next-12-months' }[rec.kind] || '#/spending/budget', onclick: () => S.closePop() }, `Open ${rec.name || rec.type || 'it'} where it lives`) : null);
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
  const ends = h('input', { type: 'date', value: v.endsOn || '', 'aria-label': 'Ends on' });
  const lines = ctx.visible(r => r.kind === 'bill');
  const cat = h('select', { 'aria-label': 'Budget line' }, h('option', { value: '' }, 'No budget line'), h('option', { value: 'Savings', selected: v.category === 'Savings' }, 'Savings'), lines.map(l => h('option', { value: l.id, selected: v.lineId === l.id }, l.name || l.values.category)));
  const save = () => {
    const amount = S.parseNum(amt.querySelector('input').value);
    if (!day.value) { day.focus(); return; }
    const values = { date: day.value, direction: dir, repeats: rep.value, endsOn: ends.value || null, category: cat.value === 'Savings' ? 'Savings' : null, lineId: cat.value && cat.value !== 'Savings' ? cat.value : null };
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
    h('div.row-line', { style: { gap: '8px' } }, h('label.field', { style: { width: '170px' } }, day), h('label.field', { style: { width: '170px' } }, rep)),
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
  if (!any) return [head('Month-end close', 'Actuals vs estimates'), h('div.list', {}, h('div.empty', {}, h('span.title', {}, 'No closed months yet'),
    h('span.muted', {}, 'Plan a month on Budget, mark what was paid on the calendar, then close it here.'), S.button('Open Budget', { iconName: 'right', onClick: () => app.go('#/spending/budget') })))];
  UI.review ??= views.find(v => !v.closed)?.ym ?? now;
  const acc = gutAccuracy(closedMonths(doc));
  return [head('Month-end close', 'Actuals vs estimates'),
    acc.hidden ? null : S.summaryStrip(ctx, [{ label: 'Gut accuracy', result: acc, note: 'How far the first guess was off, on average' }]),
    h('div.close-list', {}, views.map(v => closeRow(app, ctx, v)))];
}
function closeRow(app, ctx, v) {
  const withEst = v.rows.filter(r => (r.estimate ?? 0) > 0);
  const filled = withEst.filter(r => r.actual != null).length;
  const open = UI.review === v.ym;
  const doClose = e => {
    const go = () => { closeMonth(ctx.store, ctx.ref, v.ym, { now: ctx.now() }); S.toast(`${monthName(v.ym)} closed. Variable misses carried to next month.`, { undo: () => ctx.store.undo() }); };
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
        : S.button('Close month', { kind: 'primary', iconName: 'check', onClick: doClose })),
    open ? review(app, ctx, v) : null);
}
function review(app, ctx, v) {
  const set = (r, val) => ctx.store.setIn('spending', ['months', v.ym, 'lines', r.line.id, 'actual'], val === null ? undefined : val, 'Actual');
  const top = v.misses.slice(0, 3);
  const rows = [...v.rows.filter(r => (r.estimate ?? 0) > 0 || r.actual != null)].sort((a, b) => (b.variable - a.variable) || Math.abs(b.diff ?? 0) - Math.abs(a.diff ?? 0));
  return h('div.review', {},
    top.length ? h('div.misses', {}, h('span.label', {}, 'Biggest misses'), top.map(r => h('span.miss', {}, h('strong', {}, r.line.name || r.line.values.category), ` ${r.diff > 0 ? '+' : '−'}${money(Math.abs(r.diff))}`,
      r.variable ? null : h('span.muted', {}, ' (fixed)')))) : h('p.muted', {}, v.rows.some(r => r.actual != null) ? 'Everything landed on plan.' : 'No actuals yet. Mark entries Paid on the calendar, or type them here.'),
    h('div.list-scroll', {}, h('table.rows.review-table', {},
      h('thead', {}, h('tr', {}, ['Line', 'Estimate', 'Actual', 'Difference', ''].map((x, k) => h(`th${k && k < 4 ? '.num' : ''}`, {}, x)))),
      h('tbody', {}, rows.map(r => h('tr.row', {},
        h('td.col-first', {}, h('span', {}, r.line.name || r.line.values.category), r.variable ? null : h('span.muted.small', {}, ' fixed'), r.priceUp ? h('span.tag.warn', { style: { marginLeft: '6px' } }, 'Price went up') : null),
        h('td.num', {}, money(r.estimate ?? 0), r.fromRough ? h('span.muted.small', {}, ' from Rough') : null),
        h('td.num', {}, v.closed ? money(r.actual) : S.moneyInput(r.actualFrom === 'typed' ? r.actual : null, val => set(r, val), { hint: r.actual == null ? 'Add actual' : moneyText(r.actual), key: `close:${v.ym}:${r.line.id}` })),
        h('td.num', {}, r.diff == null ? '' : h(`span.diff${r.diff > 0.5 ? '.over' : r.diff < -0.5 ? '.under' : ''}`, {}, Math.abs(r.diff) < 0.5 ? 'On plan' : `${r.diff > 0 ? '+' : '−'}${money(Math.abs(r.diff))}`)),
        h('td', {}, r.actual != null && r.diff && Math.abs(r.diff) >= 1 ? S.button('Carry →', { size: 'small', tip: `Use ${money(r.actual)} as next month's estimate`, onClick: () => { carry(ctx.store, v.ym, r.line.id, r.actual); S.toast(`${money(r.actual)} set as ${monthName(addMonths(v.ym, 1))}'s estimate.`, { undo: () => ctx.store.undo() }); } }) : null)))))),
    bulletChart(ctx, rows.filter(r => r.actual != null).slice(0, 12), v.gut));
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
      series: [{ name: 'Estimate', type: 'bar', data: rows.map(r => Math.round(r.estimate ?? 0)), barWidth: 18, itemStyle: { color: t.text2, opacity: 0.3, borderRadius: 4 } },
        { name: 'Actual', type: 'bar', data: rows.map(r => Math.round(r.actual)), barWidth: 8, barGap: '-72%', itemStyle: { color: t.area, borderRadius: 4 } }],
    });
    new ResizeObserver(() => c.resize()).observe(host);
  });
  return h('div', { style: { marginTop: '12px' } }, h('span.label', {}, 'Estimate vs actual'), host);
}

// Home and Report read the first low day (R096).
export function firstLowDay(ctx) {
  const b = balances(ctx.store.doc, ctx.ref, thisYm(ctx), 2, { now: ctx.now(), autoWins: milestoneWins(ctx) });
  return b.firstLow ? { ...b.firstLow, low: b.low, label: dayLabel(b.firstLow.date) } : null;
}
