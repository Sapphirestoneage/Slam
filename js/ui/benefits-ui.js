// SPDX-License-Identifier: AGPL-3.0-only
// Benefits and health (run Finish everything partly built, Part 10, Nov 26 2026), on About you.
//   Benefits at work: "Your employer" (tap your employer from the library to fill the match, the vesting and the ESPP
//   discount, each with its source and date) and "What your benefits are worth" (the HSA as a retirement account, the
//   dependent care FSA and the daycare years, the ESPP, commuter: dollars a year each).
//   Health coverage and plans: the coverage the household may qualify for at its income (Medicaid, the Essential Plan,
//   the marketplace credit), and two or three plans side by side.
// Formatting only: js/benefits.js and js/math/benefitsplan.js work everything out.
import { h } from './dom.js';
import * as S from './staples.js';
import { benefitsPlanOf, healthPlansOf, employerLibrary, loadEmployerLibrary, employerFillsOf, HSA_COVER, HSA_YEARS } from '../benefits.js';
import { bpEmployer, bpRules } from '../math/benefitsplan.js';
import { money, pct } from '../format.js';

const safe = f => { try { return f(); } catch (e) { console.error(e); return null; } };
const yr = v => (v == null ? '–' : `${money(v)} a year`);
const needWords = n => `Needs ${n.join(', ')}.`;
const tile = (label, big, sub) => h('div', {}, h('span.label', {}, label), h('div.creep-big', {}, big), sub ? h('span.muted.small', {}, sub) : null);

// ---------- Your employer ----------
function employerBlock(ctx, ben) {
  const lib = employerLibrary();
  if (!lib) { loadEmployerLibrary(() => ctx.refresh?.()); return h('p.muted.small', {}, 'Loading the employer library.'); }
  const R = bpRules(ctx.ref, lib), list = Object.entries(lib.rows).map(([id, e]) => [id, e.name]).sort((a, b) => a[1].localeCompare(b[1]));
  const pickIt = id => {
    if (!id) { ctx.store.setDoc('profile', { benefits: { ...ben, employer: null } }); return; }
    const e = bpEmployer(id, R), F = employerFillsOf(ctx.store.doc, ctx.store.records, e);
    ctx.store.transaction(`Employer: ${e.name}`, () => {
      for (const r of F.records) ctx.store.update(r.id, r.patch);
      ctx.store.setDoc('profile', F.profile);
    });
    S.toast(`${e.name}: filled ${[...F.records.map(r => r.what), F.profile.benefits.espp ? 'the ESPP discount' : null].filter(Boolean).join(', ') || 'nothing yet (add your job on Income)'}.${F.tiersWait ? ' Add your 401(k) on Assets to hold both match tiers.' : ''}`);
  };
  const e = ben.employer ? bpEmployer(ben.employer, R) : null;
  return h('div.stack', { style: { gap: '8px' } },
    S.labelled('Your employer', S.select(list, ben.employer ?? null, pickIt, { label: 'Your employer', hint: 'Pick yours, if listed', width: 240 }), { tip: `${list.length} large employers, each from its own benefits page or SEC filing. Not listed: answer the rows above yourself.` }),
    e ? h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, h('strong', {}, 'Match: '), e.match, e.fullAt > 0 && e.fullAt < 1 ? ` Put in ${pct(e.fullAt)} of pay to get all of it (${pct(e.fullPct)} of pay from ${e.name}).` : null),
      e.empty.length ? h('span.muted', {}, `Not found in a dated source, so left for you: ${e.empty.map(k => ({ tiers: 'the match', vest: 'the vesting', esppDiscount: 'an ESPP', hsaEmployer: 'an HSA contribution' })[k]).join(', ')}.`) : null,
      S.moreBlock('profile:employer:sources', () => h('div.stack.small', { style: { gap: '4px' } }, e.sources.map(s => h('span', {}, `${s.what}: ${s.source}${s.read ? ` (read ${s.read})` : ''}`))), { label: 'Where this is from' })) : null);
}

// ---------- What your benefits are worth ----------
function worthBody(ctx, { rates, transit }) {
  const doc = ctx.store.doc, ben = doc.profile?.benefits || {}, plan = ben.plan || {};
  const setPlan = patch => ctx.store.setDoc('profile', { benefits: { ...ben, plan: { ...plan, ...patch } } });
  const O = benefitsPlanOf(doc, ctx.ref, ctx.metrics(), { rates, transit, lib: employerLibrary() }), P = O.parts;
  const row = (title, part, inputs, said) => h('div.card.stack', { style: { gap: '8px' }, 'data-benefit-worth': title },
    h('div.row-line', { style: { gap: '10px', alignItems: 'center' } }, h('strong', {}, title), h('span.spacer'), h('span.num', {}, part?.ready ? yr(part.yearly) : '–')),
    h('div.row-line', { style: { gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' } }, inputs),
    part && !part.ready ? h('span.muted.small', {}, needWords(part.needs)) : part?.ready ? h('span.small', {}, said(part)) : null);
  const H = P.hsa, D = P.dcfsa, E = P.espp, M = P.commuter;
  return h('div.stack', { style: { gap: '12px' } },
    h('p.muted.small', { style: { margin: 0 } }, `What each benefit is worth to you in dollars a year, for plan year ${O.plan}. ${rates ? `Your tax rate on the last dollar: ${pct(rates.marginal)} (Income).` : 'Add your pay on Income for your tax rate.'}`),
    O.ready ? h('div.row-line', { style: { gap: '28px', alignItems: 'flex-start', flexWrap: 'wrap' } }, tile('All together', yr(O.yearly), `${O.of} of 4 worked out`)) : null,
    row('HSA as a retirement account', H, [
      S.labelled('Your cover', S.toggle(HSA_COVER, plan.hsaCover ?? null, v => setPlan({ hsaCover: v }), { label: 'HSA cover', clearable: true })),
      S.labelled('You put in a year', S.moneyInput(plan.hsaYou ?? null, v => setPlan({ hsaYou: v }), { hint: H?.ready ? '' : `Up to ${money(ctx.ref.benefits.hsa[plan.hsaCover === 'family' ? 'family' : 'self'])}` })),
      S.labelled('Left invested for', S.toggle(HSA_YEARS.map(y => [y, `${y} years`]), plan.hsaYears ?? null, v => setPlan({ hsaYears: v }), { label: 'Years invested', clearable: true })),
      S.labelled('Care you pay yourself a year, receipts kept', S.moneyInput(plan.hsaReceipts ?? null, v => setPlan({ hsaReceipts: v }), { hint: 'Optional' }))],
      x => `${money(x.taxSaved)} less tax and ${money(x.employer)} from your employer.${x.grows != null ? ` Invested, ${money(x.each)} a year grows to about ${money(x.grows)} in ${x.years} years, in today's money.` : ''}${x.receiptsBank ? ` Receipts you keep let you take ${money(x.receiptsBank)} out tax free later.` : ''}${x.over > 0 ? ` Your limit leaves room for ${money(x.room)}: ${money(x.over)} over it does not count.` : ''}`),
    O.kids ? row('Dependent care FSA', D, [
      ben.dependentFsa?.have === 'Yes' ? h('span.muted.small', {}, 'Child care from your answer above.') : S.labelled('Child care a year', S.moneyInput(plan.careYear ?? null, v => setPlan({ careYear: v }), { hint: 'Add amount' }))],
      x => `${money(x.put)} of care paid before tax saves ${money(x.yearly)} a year, for ${x.years} more years of care before your youngest turns ${x.ageUnder}: about ${money(x.total)} in all. The child care credit on your return is not counted here, and the same dollar cannot count for both.`) : null,
    row('ESPP', E, [
      ben.espp?.have === 'Yes' ? h('span.muted.small', {}, 'What you put in and the discount come from your ESPP answer above.') : S.labelled('You would put in a year', S.moneyInput(plan.esppPut ?? null, v => setPlan({ esppPut: v }), { hint: 'Add amount' })),
      ben.espp?.have === 'Yes' ? null : S.labelled('Discount', S.toggle([[0.05, '5%'], [0.1, '10%'], [0.15, '15%']], plan.esppDiscount ?? null, v => setPlan({ esppDiscount: v }), { label: 'ESPP discount', clearable: true }))],
      x => `Sold when you buy, ${money(x.put)} buys stock worth ${money(x.stock)}: ${money(x.gain)} more, ${money(x.yearly)} after tax.${x.over > 0 ? ` The law caps the stock at ${money(x.cap)} a year, so ${money(x.maxPut)} of pay counts.` : ''} Holding the stock instead is a bet on one company.`),
    row('Commuter', M, [h('span.muted.small', {}, transit > 0 ? `Transit from your Budget: ${money(transit)} a month.` : 'Add transit or parking lines on your Budget.')],
      x => `${money(x.covered)} a year paid before tax saves ${money(x.yearly)}.${ben.commuter?.have === 'Yes' ? '' : ' Ask HR whether your job offers it.'}`),
    S.moreBlock('profile:benefits:math', () => h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, `HSA: what you put in (up to the limit, less the employer's part) × your tax rate, plus the employer's dollars. Invested: each year's money grows at your real return (Assumptions). Limits ${O.plan}: ${money(ctx.ref.benefits.hsa.self)} just you, ${money(ctx.ref.benefits.hsa.family)} family, ${money(ctx.ref.benefits.hsa.catchUp55)} more at 55.`),
      h('span', {}, `Dependent care FSA: the care, up to ${money(ctx.ref.benefits.dcfsa.limit)} (${money(ctx.ref.benefits.dcfsa.separate)} filing separately), × your tax rate, for each year until the youngest turns ${ctx.ref.benefits.dcfsa.ageUnder}.`),
      h('span', {}, `ESPP: what you put in ÷ (1 − the discount) buys the stock; the gain, taxed as pay with no Social Security or Medicare, is what is left. At most ${money(ctx.ref.benefits.espp.cap)} of stock a year.`),
      h('span', {}, `Commuter: up to ${money(ctx.ref.benefits.commuterMonthly)} a month × 12 × your tax rate.`),
      h('span', {}, `${ctx.ref.benefits.hsa.source} ${ctx.ref.benefits.dcfsa.source} ${ctx.ref.benefits.espp.source} ${ctx.ref.benefits.commuterSource}`)), { label: 'Show the math' }));
}
export function benefitsWorthBlock(ctx, opts) {
  const ben = ctx.store.doc.profile?.benefits || {};
  return h('div.stack', { style: { gap: '12px', marginTop: '12px' } },
    employerBlock(ctx, ben),
    S.moreBlock('profile:benefits:worth', () => S.live(ctx, () => worthBody(ctx, opts)), { label: 'What your benefits are worth' }));
}

// ---------- Health coverage and plans ----------
function healthBody(ctx) {
  const doc = ctx.store.doc, ben = doc.profile?.benefits || {};
  const { E, P, plans, BP_ON: ON } = healthPlansOf(doc, ctx.ref, ctx.metrics(), { now: ctx.now() });
  const setPlans = next => ctx.store.setDoc('profile', { benefits: { ...ben, plans: next } });
  const edit = (i, patch) => setPlans(plans.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const cover = E.ready ? h('div.stack', { style: { gap: '6px' } },
    h('p', { style: { margin: 0 } }, h('strong', {}, `At ${money(E.magi)} a year, you may qualify for ${ON[E.now.on]}`), E.now.on === 'aca' ? `: the credit is about ${money(E.now.help)} a year, so the benchmark plan costs you about ${money(E.now.cost)}.` : '.'),
    h('div.stack.small', { style: { gap: '4px' } }, E.lines.map(l => h('span', { 'data-line': l.id }, `${l.name}: up to ${money(l.upTo)} a year (${Math.round(l.multiple * 100)}% of the poverty line for ${E.h.size})`))),
    E.next ? h('span.muted.small', {}, `${E.next.name} ends ${money(E.toNext)} above what you make now. Raise and benefits (Plan) shows what a raise does to every benefit.`) : null,
    h('span.muted.small', {}, `Plan year ${E.plan}. These are the income lines only; the program decides on your application.`))
    : h('p.muted', { style: { margin: 0 } }, needWords(E.needs));
  const planCol = (p, i) => h('div.card.stack', { style: { gap: '8px', minWidth: '220px', flex: '1 1 220px' }, 'data-plan': i },
    S.labelled('Name', S.textInput(p.name ?? null, v => edit(i, { name: v }), { hint: `Plan ${i + 1}`, width: 180 })),
    S.labelled('Premium a month, before any credit', S.moneyInput(p.premium ?? null, v => edit(i, { premium: v }), { hint: 'Add premium' })),
    S.labelled('Deductible', S.moneyInput(p.deductible ?? null, v => edit(i, { deductible: v }), { hint: 'Add deductible' })),
    S.labelled('Out-of-pocket max', S.moneyInput(p.oop ?? null, v => edit(i, { oop: v }), { hint: 'Add max' })),
    S.labelled('Bought on the marketplace', S.toggle([[true, 'Yes'], [false, 'No, through work']], p.market ?? null, v => edit(i, { market: v }), { label: `Plan ${i + 1} marketplace` })),
    plans.length > 2 ? S.iconButton('trash', `Remove plan ${i + 1}`, () => setPlans(plans.filter((_, k) => k !== i)), { tiny: true }) : null);
  const R = P.rows, best = (k, i) => (P.cheapest[k] === i ? h('span.tag.plain', {}, 'Least') : null);
  const table = P.ready ? h('div.creep-wrap', {}, h('table.data.creep-table', { 'aria-label': 'Plans side by side' },
    h('thead', {}, h('tr', {}, h('th', {}, 'A year'), ...R.map(r => h('th.num', {}, r.name)))),
    h('tbody', {},
      h('tr', {}, h('td', {}, 'Premiums after the credit'), ...R.map(r => h('td.num', {}, r.ready ? money(r.year) : '–'))),
      h('tr', {}, h('td', {}, 'Light year (a checkup)'), ...R.map(r => h('td.num', {}, r.ready ? money(r.light) : '–', best('light', r.i)))),
      h('tr', {}, h('td', {}, 'Typical year (the deductible met)'), ...R.map(r => h('td.num', {}, r.ready ? money(r.typical) : '–', best('typical', r.i)))),
      h('tr', {}, h('td', {}, 'Heavy year (the most you pay)'), ...R.map(r => h('td.num', {}, r.ready ? money(r.heavy) : '–', best('heavy', r.i))))))) : h('p.muted.small', { style: { margin: 0 } }, 'Type the premium, deductible and out-of-pocket max of two plans to see them side by side. Your summary of benefits (SBC) has all three.');
  return h('div.stack', { style: { gap: '12px' } }, cover,
    h('div.row-line', { style: { gap: '12px', alignItems: 'stretch', flexWrap: 'wrap' } }, plans.map(planCol)),
    plans.length < 3 ? S.button('Add a third plan', { iconName: 'plus', onClick: () => setPlans([...plans, {}]) }) : null,
    table,
    S.moreBlock('profile:health:math', () => h('div.stack.small', { style: { gap: '4px' } },
      h('span', {}, 'The credit: the benchmark plan (the second-lowest silver plan in your state) less the share of income your household pays at its multiple of the poverty line; none over 400%. It counts only on a marketplace plan, and never past the premium.'),
      h('span', {}, 'Light year: premiums alone. Typical year: premiums and the deductible. Heavy year: premiums and the out-of-pocket max. Copays before the deductible are not counted.'),
      h('span', {}, 'The lines: Medicaid 138% (states that expanded it), the Essential Plan 200% (New York, free since July 1 2026), the credit to 400%; the 2026 poverty guideline (HHS). Sources on the Assumptions tab.')), { label: 'Show the math' }));
}
export const healthSection = (ctx, section) => section('Health coverage and plans', 'needs',
  h('p.muted', {}, 'What you may qualify for at your income, and the plans you are choosing between, side by side.'),
  S.live(ctx, () => safe(() => healthBody(ctx)) ?? h('p.muted', {}, 'Add your pay on Income first.')));
