// SPDX-License-Identifier: AGPL-3.0-only
// Joy and enough (run Finish everything partly built, Part 8, Nov 26 2026), on the Budget and on Goals.
//   Budget: "Joy per dollar" (each line's own joy tap, or its category's rating: share of joy, joy per $100, the hours
//   of work, joy per hour of work), and "Subscriptions in days" (each line of Bills and subscriptions as days added
//   to the FI date). Goals: "Fulfillment curve and the Enough meter" (each category on survival, comforts, luxuries,
//   past enough), and "Rich-life list" (things with a price and a joy, memory dividends, the regret view).
// Formatting only: js/enough.js and js/math/enough.js work everything out. The joy, the curve and the regret are the
// person's own taps: no verdict on what anyone enjoys. Every change is undoable like any other.
import { h } from './dom.js';
import * as S from './staples.js';
import { joyOf, curveOf, richOf, subsOf, richListOf, enoughChoicesOf } from '../enough.js';
import { EN_JOY, EN_CURVE, EN_REGRET, EN_KIND, EN_RULES, EN_SOURCES } from '../math/enough.js';
import { money, pct } from '../format.js';

const one = v => (v == null ? '–' : (Math.round(v * 10) / 10).toLocaleString('en-US'));
const days = d => (d == null ? '–' : d === 0 ? 'Under a day' : `${Math.abs(d).toLocaleString('en-US')} ${Math.abs(d) === 1 ? 'day' : 'days'}`);
const safe = f => { try { return f(); } catch (e) { console.error(e); return null; } };
const joyTap = (value, onChange, label) => S.toggle(EN_JOY.map(([v]) => [v, String(v)]), value ?? null, onChange, { label, clearable: true });

// ---------- Budget: Joy per dollar ----------
function joyBody(ctx, categoryBlock) {
  const m = ctx.metrics(), J = joyOf(ctx.store.doc, m);
  const own = new Map(J.lines.map(l => [l.name + '|' + l.amt, l]));
  const tapFor = name => J.lines.find(l => l.name === name);
  const intro = h('p.muted.small', { style: { margin: 0 } }, 'Tap how much joy each line brings you: 1 a little, 5 you love it. Your taps, your call. A line with no tap of its own uses its category\'s rating below.');
  if (!J.of) return h('div.stack', { style: { gap: '8px' } }, h('p.muted', { style: { margin: 0 } }, 'Add amounts to your Budget lines and they show up here to tap.'));
  const rows = J.rows.map(r => {
    const L = own.get(r.name + '|' + r.amt) ?? tapFor(r.name);
    return h('tr', { 'data-joy-line': r.name },
      h('td', {}, r.name, r.from === 'category' ? h('span.tag.plain', { style: { marginLeft: '8px' }, title: 'From the category rating below. Tap a number to give the line its own' }, 'From its category') : null),
      h('td.num', {}, money(r.amt)),
      h('td', {}, L ? joyTap(L.joyRate, v => ctx.store.update(L.id, { joyRate: v }), `${r.name} joy`) : null),
      h('td.num', {}, r.joyShare == null ? '–' : pct(r.joyShare)),
      h('td.num', {}, one(r.per100)),
      h('td.num', {}, one(r.hours)),
      h('td.num', {}, r.perHour == null ? '–' : (Math.round(r.perHour * 100) / 100).toLocaleString('en-US')));
  });
  const tiles = J.ready ? h('div.row-line', { style: { gap: '28px', alignItems: 'flex-start', flexWrap: 'wrap' } },
    h('div', {}, h('span.label', {}, 'A dollar\'s joy'), h('div.creep-big', {}, `${one(J.dollarJoy)} of 5`), h('span.muted.small', {}, 'Your spending, weighted by its joy')),
    h('div', {}, h('span.label', {}, 'On what you love'), h('div.creep-big', {}, pct(J.lovedShare)), h('span.muted.small', {}, `${money(J.lovedTotal)} a month on lines at ${EN_RULES.loved} or 5`)),
    h('div', {}, h('span.label', {}, 'Lines tapped'), h('div.creep-big', {}, `${J.rated} of ${J.of}`), J.fromCategory ? h('span.muted.small', {}, `${J.fromCategory} from a category`) : null)) : null;
  const most = J.ready && J.most ? h('p', { style: { margin: 0 } }, h('strong', {}, `Most joy per dollar: ${J.most.name}`), ` (${J.most.joy} of 5 for ${money(J.most.amt)} a month).`,
    J.least ? ` Least: ${J.least.name} (${J.least.joy} of 5 for ${money(J.least.amt)} a month).` : null) : null;
  return h('div.stack', { style: { gap: '12px' } }, intro, tiles, most,
    h('div.creep-wrap', {}, h('table.data.creep-table.joy-table', { 'aria-label': 'Joy per dollar, each line' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Line'), h('th.num', {}, 'A month'), h('th', {}, 'Joy'), h('th.num', {}, 'Share of joy'), h('th.num', {}, 'Joy per $100'),
        h('th.num', { title: J.wageGuess ? 'Hours at a guessed hourly wage until your hours are in' : 'Hours at your hourly wage' }, J.wageGuess ? 'Hours of work (a guess)' : 'Hours of work'), h('th.num', {}, 'Joy per hour'))),
      h('tbody', {}, rows))),
    S.moreBlock('budget:joy:cats', categoryBlock, { label: 'Rate by category' }),
    S.moreBlock('budget:joy:math', () => h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, 'Share of joy: a line\'s joy ÷ the joy of every tapped line added up.'),
      h('span', {}, 'Joy per $100: a line\'s joy ÷ (its month ÷ $100). A dollar\'s joy: each line\'s joy weighted by its month.'),
      h('span', {}, J.wage == null ? 'Hours of work need your hourly wage (take-home and the hours you work, on About you).' : `Hours of work: a line's month ÷ ${money(J.wage, { exact: true })} an hour${J.wageGuess ? ' (a guess until your hours are in)' : ''}. Joy per hour: its joy ÷ those hours.`),
      h('span', {}, 'A line with no tap and no category rating is left out of the joy, never counted as no joy.'),
      h('span', {}, `${EN_SOURCES.sethi}.`)), { label: 'Show the math' }));
}
export const joySection = (ctx, categoryBlock) => S.sec('budget:joy', { title: 'Joy per dollar', summary: safe(() => { const J = joyOf(ctx.store.doc, ctx.metrics()); return J.ready ? `A dollar's joy ${one(J.dollarJoy)} of 5, ${J.rated} of ${J.of} lines tapped` : 'Tap the joy of each line'; }), tip: 'Joy tags per line: share of joy, joy per dollar, joy per hour of work' }, () => S.live(ctx, () => joyBody(ctx, categoryBlock)));

// ---------- Budget: Subscriptions in days ----------
function subsBody(ctx) {
  const P = subsOf(ctx.store.doc, ctx.metrics(), { now: ctx.now() });
  if (!P.ready) return h('p.muted', { style: { margin: 0 } }, P.of ? `This needs ${P.need}: income, spending and an invested balance (Goals).` : 'Lines in Bills and subscriptions with an amount show up here.');
  return h('div.stack', { style: { gap: '12px' } },
    h('p', { style: { margin: 0 } }, h('strong', {}, `Together they add about ${days(P.days)} to your FI date`), `: ${money(P.total)} a month, ${money(P.year)} a year.`),
    h('div.creep-wrap', {}, h('table.data.creep-table.subs-table', { 'aria-label': 'Each subscription as days on the FI date' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Subscription'), h('th.num', {}, 'A month'), h('th.num', {}, 'A year'), h('th.num', {}, 'Days on your FI date'), h('th.num', {}, 'Hours of work a year'))),
      h('tbody', {}, P.rows.map(r => h('tr', { 'data-sub': r.name }, h('td', {}, r.name), h('td.num', {}, money(r.amt)), h('td.num', {}, money(r.year)), h('td.num', {}, days(r.days)), h('td.num', {}, one(r.hoursYear))))))),
    S.moreBlock('budget:subs:math', () => h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, 'Your FI date runs twice: as it is, and with every line of Bills and subscriptions cancelled. Cancelled, that money is invested each month, and the FI number is smaller, as you would not pay for them after work either.'),
      h('span', {}, `The gap between the two dates is ${days(P.days)}. Each subscription's part is its share of the ${money(P.total)} a month: the date moves in a near straight line for amounts this size.`),
      h('span', {}, 'Hours of work a year: its year ÷ your hourly wage.')), { label: 'Show the math' }));
}
export const subsSection = ctx => S.sec('budget:subs', { title: 'Subscriptions in days', summary: safe(() => { const P = subsOf(ctx.store.doc, ctx.metrics(), { now: ctx.now() }); return P.ready ? `${P.of} add ${days(P.days)} to your FI date` : null; }), tip: 'Every subscription as the days it adds to your FI date' }, () => S.live(ctx, () => subsBody(ctx)));

// ---------- Goals: the fulfillment curve and the Enough meter ----------
const setChoice = (ctx, patch) => ctx.store.setDoc('settings', { enough: { ...enoughChoicesOf(ctx.store.doc), ...patch } });
function curveBody(ctx) {
  const K = curveOf(ctx.store.doc, ctx.metrics()), ch = enoughChoicesOf(ctx.store.doc);
  if (!K.of) return h('p.muted', { style: { margin: 0 } }, 'Add amounts to your Budget lines and each category shows up here to place.');
  const place = (cat, v) => { const c = { ...(ch.curve ?? {}) }; if (v == null) delete c[cat]; else c[cat] = v; setChoice(ctx, { curve: c }); };
  const rows = K.cats.map(c => h('div.curve-row', { 'data-cat': c.cat }, h('span.curve-name', {}, c.cat), h('span.num', {}, money(c.amt)), S.toggle(EN_CURVE, c.at, v => place(c.cat, v), { label: `${c.cat} on the curve`, clearable: true })));
  const meter = K.ready ? h('div.stack', { style: { gap: '6px' } },
    h('div.row-line', { style: { gap: '28px', alignItems: 'flex-start', flexWrap: 'wrap' } },
      h('div', {}, h('span.label', {}, 'Enough meter'), h('div.creep-big', {}, pct(K.meter)), h('span.muted.small', {}, 'of what you placed still adds to the life you want')),
      h('div', {}, h('span.label', {}, 'Past enough'), h('div.creep-big', {}, money(K.past)), h('span.muted.small', {}, 'a month, by your own taps')),
      h('div', {}, h('span.label', {}, 'Placed'), h('div.creep-big', {}, `${K.placed} of ${K.of}`))),
    h('span.pareto-bar', { 'aria-hidden': 'true' }, h('i', { style: { width: `${Math.max(2, Math.round(K.meter * 100))}%` } })),
    h('div.stack.pareto-rows', { style: { gap: '6px' } }, K.levels.map(l => h('div.pareto-row', {}, h('span.pareto-name', {}, l.label), h('span.pareto-bar', { 'aria-hidden': 'true' }, h('i', { style: { width: `${K.placedTotal > 0 ? Math.max(l.amt > 0 ? 2 : 0, Math.round((l.amt / K.placedTotal) * 100)) : 0}%` } })), h('span.num', {}, money(l.amt)), h('span.muted.small.num', {}, K.placedTotal > 0 ? pct(l.amt / K.placedTotal) : '–')))),
    K.past > 0 && K.share != null ? h('div.row-line', { style: { gap: '12px', alignItems: 'center', flexWrap: 'wrap' } },
      h('span', {}, `Your curve calls ${pct(K.share)} of today's life enough.`),
      ch.share === K.share ? h('span.tag.plain', {}, 'Used for your enough number') : S.button('Use it for my enough number', { onClick: () => setChoice(ctx, { share: K.share }) })) : null) : null;
  return h('div.stack', { style: { gap: '12px' } },
    h('p.muted.small', { style: { margin: 0 } }, 'Place each category where it sits for you. Survival keeps you going, comforts make life easier, luxuries make it fun, and past enough is where more adds nothing for you.'),
    h('div.stack.curve-rows', { style: { gap: '8px' } }, rows), meter,
    S.moreBlock('goals:curve:math', () => h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, 'Enough meter: the spending on survival, comforts and luxuries ÷ all the spending you placed.'),
      h('span', {}, 'Your curve\'s enough: 1 − the spending past enough ÷ all your spending. Used for your enough number, it scales your FI number (Enough and room for error, above).'),
      h('span', {}, `${EN_SOURCES.ymoyl}.`)), { label: 'Show the math' }));
}
export const curveSection = ctx => S.sec('goals:curve', { title: 'Fulfillment curve and the Enough meter', summary: safe(() => { const K = curveOf(ctx.store.doc, ctx.metrics()); return K.ready ? `Enough meter ${pct(K.meter)}, ${K.placed} of ${K.of} placed` : 'Place each category on the curve'; }), tip: 'Each category on survival, comforts, luxuries or past enough (Your Money or Your Life)' }, () => S.live(ctx, () => curveBody(ctx)));

// ---------- Goals: the rich-life list ----------
const newId = () => `rl${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
function richBody(ctx) {
  const doc = ctx.store.doc, list = richListOf(doc), R = richOf(doc, ctx.ref, ctx.metrics(), { now: ctx.now() });
  const put = next => ctx.store.setDoc('settings', { richLife: next });
  const edit = (id, patch) => put(list.map(i => (i.id === id ? { ...i, ...patch } : i)));
  const byId = new Map(R.items.map(i => [i.id, i]));
  let name = null;
  const add = h('div.row-line', { style: { gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' } },
    S.labelled('Something for your rich life', S.textInput(null, v => { name = v; }, { hint: 'A trip, a class, a good chair', width: 240 })),
    S.button('Add it', { onClick: () => { if (name) put([...list, { id: newId(), name, price: null, joy: null, kind: null, done: false, regret: null }]); } }));
  const card = i => {
    const r = byId.get(i.id) ?? {};
    return h('div.card.rich-item', { 'data-rich': i.name },
      h('div.row-line', { style: { gap: '10px', alignItems: 'center' } }, h('strong', {}, i.name), h('span.spacer'), S.iconButton('trash', `Remove ${i.name}`, () => put(list.filter(x => x.id !== i.id)), { tiny: true })),
      h('div.row-line', { style: { gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap', marginTop: '8px' } },
        S.labelled('Price', S.moneyInput(i.price ?? null, v => edit(i.id, { price: v }), { hint: 'Add price' })),
        S.labelled('Joy', joyTap(i.joy, v => edit(i.id, { joy: v }), `${i.name} joy`)),
        S.labelled('It is', S.toggle(EN_KIND, i.kind ?? null, v => edit(i.id, { kind: v }), { label: `${i.name} kind`, clearable: true })),
        S.labelled('Would you regret missing it?', S.toggle(EN_REGRET, i.regret ?? null, v => edit(i.id, { regret: v }), { label: `${i.name} regret`, clearable: true })),
        S.labelled('Done', S.toggle([[false, 'Not yet'], [true, 'Done']], i.done === true, v => edit(i.id, { done: v === true }), { label: `${i.name} done` }))),
      h('div.row-line.small', { style: { gap: '18px', flexWrap: 'wrap', marginTop: '6px' } },
        r.per100 != null ? h('span', {}, `Joy per $100: ${one(r.per100)}`) : null,
        r.memYears != null ? h('span', { title: 'Memory dividends: an experience pays back every year you remember it' }, `Memory dividends for ${r.memYears} years${r.laterYears != null ? ` (${r.laterYears} if it waits ${EN_RULES.later} years)` : ''}`) : null,
        r.days != null ? h('span', {}, `Adds ${days(r.days)} to your FI date`) : null));
  };
  const regret = R.regret.filter(i => i.regret);
  return h('div.stack', { style: { gap: '12px' } },
    h('p.muted.small', { style: { margin: 0 } }, 'The things that make your life rich, with what they cost. Spend a lot on what you love; the list is yours.'),
    R.count ? h('div.row-line', { style: { gap: '28px', alignItems: 'flex-start', flexWrap: 'wrap' } },
      h('div', {}, h('span.label', {}, 'Still to do'), h('div.creep-big', {}, money(R.plannedTotal)), h('span.muted.small', {}, `${R.planned} on the list${R.noPrice ? `, ${R.noPrice} with no price yet` : ''}`)),
      h('div', {}, h('span.label', {}, 'Done'), h('div.creep-big', {}, money(R.doneTotal)), h('span.muted.small', {}, `${R.done} done`))) : null,
    h('div.stack', { style: { gap: '10px' } }, list.map(card)), add,
    regret.length ? h('div.stack', { style: { gap: '6px' } }, h('span.label', {}, 'The regret view'),
      h('p.muted.small', { style: { margin: 0 } }, R.alot ? `You would regret missing ${R.alot} a lot: ${money(R.alotTotal)}${R.alotDays != null ? `, ${days(R.alotDays)} on your FI date` : ''}.` : 'What you would regret missing, most first.'),
      regret.map(i => h('div.row-line.small', { style: { gap: '10px' }, 'data-regret': i.name }, h('span.tag.plain', {}, EN_REGRET.find(x => x[0] === i.regret)[1]), h('span', {}, i.name), h('span.spacer'), h('span.num', {}, i.price == null ? 'No price yet' : money(i.price)), i.done ? h('span.muted', {}, 'Done') : null))) : null,
    S.moreBlock('goals:rich:math', () => h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, 'Joy per $100: its joy ÷ (its price ÷ $100).'),
      h('span', {}, `Memory dividends: an experience pays back each year you remember it, here the years from your age to ${R.memYears == null ? 'the age your plan runs to' : `the age your plan runs to (${R.memYears} years)`}. Waiting ${EN_RULES.later} years leaves ${EN_RULES.later} fewer.`),
      h('span', {}, 'Days on your FI date: the plan run again with the price paid now from what is invested.'),
      h('span', {}, `${EN_SOURCES.perkins}. ${EN_SOURCES.sethi}.`)), { label: 'Show the math' }));
}
export const richSection = ctx => S.sec('goals:rich', { title: 'Rich-life list', summary: safe(() => { const R = richOf(ctx.store.doc, ctx.ref, ctx.metrics(), { now: ctx.now() }); return R.count ? `${R.planned} to do, ${money(R.plannedTotal)}` : 'The things that make your life rich, with prices'; }), tip: 'Things with prices and joy, memory dividends, a regret view' }, () => S.live(ctx, () => richBody(ctx)));
