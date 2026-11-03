// SPDX-License-Identifier: AGPL-3.0-only
// Brandon section 3: fields only some accounts have. 401(k): Roth or traditional, per paycheck and % of salary,
// match tiers, vesting. HSA: cash vs invested, self-directed vs managed with a fee comparison.
import { h } from './dom.js';
import { moneyInput, pctInput, textInput, toggle, select, labelled, moreBlock, button, iconButton, warnTag, park } from './staples.js';
import { uninvestedOf, matchFromTiers, contributionSplit, vestedOf, hsaFeeCompare, paychecksPerYear, link401k, hsaProgress, rothLog } from '../math/portfolio.js';
import { benefitYearly } from '../benefits.js';
import { money, pct } from '../format.js';

const row = (...kids) => h('span.row-line', { style: { gap: '6px', flexWrap: 'nowrap' } }, ...kids);
const shown = (text, title = null) => h('span.computed', { title }, text);
const numInput = (value, onChange, { hint, width = 90 } = {}) => textInput(value == null ? null : String(value), v => { const n = v === null ? null : Number(String(v).replace(/[,$\s]/g, '')); onChange(n === null || Number.isNaN(n) ? null : n); }, { hint, width });

// ---------- 401(k): contribution, match tiers, vesting (B3.1 to B3.4) ----------
const K401 = new Set(['401(k)', '403(b)', '457', 'TSP', 'Solo 401(k)']);
export const is401k = r => K401.has(r.type);
function matchBlock(ctx, r, up, L) {
  const v = r.values;
  const job = ctx.metrics().inputs.income.find(x => x.taxType === 'W-2' && x.gross !== null);
  const gross = job?.gross ?? null;
  const freq = job?.r.values.payFrequency ?? null;
  const link = link401k(ctx.visible(() => true)); // B3.10: blank here borrows from Income
  const own = link.acct?.id === r.id;
  // Income's first pass (dollars a paycheck) fills this in until the 401(k) has its own answer.
  const perPaycheck = v.contribution != null && v.contributionPer === 'Paycheck' ? v.contribution : own ? link.acctPerPaycheck : null;
  const salaryPct = v.salaryPct ?? (own ? link.acctPct : null);
  const split = contributionSplit({ perPaycheck, pct: perPaycheck == null ? salaryPct : null, gross, payFrequency: freq });
  const tiers = (v.matchTiers || []).length ? v.matchTiers : own ? link.acctTiers : [];
  const fromIncome = text => h('span.tag.plain', { title: 'Filled in from Income. Type here to change it on this account.' }, text);
  const setTier = (i, patch) => up({ matchTiers: tiers.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const m = matchFromTiers({ contributionPct: split.pct, tiers, gross });
  const vest = vestedOf(v.balance ?? null, v.unvested);
  return h('div.stack', { style: { gap: '12px' } },
    h('div.form-grid', {},
      labelled('Roth or traditional', toggle(['Traditional', 'Roth', 'Both'], { Pretax: 'Traditional', Roth: 'Roth', Both: 'Both' }[v.taxType] ?? null,
        x => up({ taxType: { Traditional: 'Pretax', Roth: 'Roth', Both: 'Both' }[x] ?? null }), { label: 'Roth or traditional', clearable: true }), { later: L('taxType') }),
      // Both: blank counts it all as traditional (pretax); a Roth part, as dollars a paycheck or a % of what goes in, is taxed first.
      v.taxType === 'Both' ? labelled('Roth part', row(toggle([['Amount', '$ a paycheck'], ['Percent', '% of it']], v.rothSplitBy ?? 'Percent', x => up({ rothSplitBy: x }), { label: 'Roth part as' }),
        (v.rothSplitBy ?? 'Percent') === 'Amount' ? moneyInput(v.rothPerPaycheck ?? null, x => up({ rothPerPaycheck: x }), { hint: 'Add amount' }) : pctInput(v.rothPct ?? null, x => up({ rothPct: x }), { hint: 'e.g. 50' })),
        { note: (v.rothSplitBy ?? 'Percent') === 'Amount' ? (v.rothPerPaycheck == null ? 'Blank: all traditional' : 'The rest is traditional') : v.rothPct == null ? 'Blank: all traditional' : `${pct(1 - v.rothPct)} traditional` }) : null,
      labelled('Per paycheck', split.computed === 'perPaycheck' ? shown(`${money(split.perPaycheck)} (worked out)`) : moneyInput(perPaycheck, x => up({ contribution: x, contributionPer: 'Paycheck' }), { hint: 'Add amount' }), { note: own && link.acctPerPaycheckFrom ? 'From Income' : null, later: L('contribution') }),
      labelled('% of salary', split.computed === 'pct' ? shown(`${pct(split.pct)} (worked out)`) : pctInput(salaryPct, x => up({ salaryPct: x, ...(x != null && v.contributionPer === 'Paycheck' ? { contribution: null } : {}) }), { hint: 'e.g. 6' }),
        { note: own && (link.acctPctFrom || link.acctPerPaycheckFrom) ? 'From Income' : gross === null ? 'Add gross pay on Income to work out the other' : freq === null ? 'Add pay frequency on Income to work out the other' : 'Type either one' })),
    h('div.stack', { style: { gap: '6px' } }, h('span.row-line', { style: { gap: '6px' } }, h('span.label', {}, 'Employer match'), own && link.acctTiersFrom ? fromIncome('From Income') : null),
      ...tiers.map((t, i) => row(pctInput(t.rate ?? null, x => setTier(i, { rate: x }), { hint: 'e.g. 100' }), h('span.muted', {}, i === 0 ? 'of the first' : 'of the next'),
        pctInput(t.upTo ?? null, x => setTier(i, { upTo: x }), { hint: 'e.g. 3' }), h('span.muted', {}, 'of pay'),
        iconButton('trash', 'Remove this tier', () => up({ matchTiers: tiers.filter((_, j) => j !== i) }), { tiny: true }))),
      row(button(tiers.length ? 'Add a tier' : 'Add the match', { size: 'small', iconName: 'plus', onClick: () => up({ matchTiers: [...tiers, {}] }) }),
        m ? shown(`Match: ${money(m.dollars)} a year (${pct(m.pctOfPay)} of pay)`) : tiers.length ? h('span.muted.small', {}, 'Needs your % of salary and gross pay') : null,
        m?.leftOnTable ? warnTag(`Put in ${pct(m.fullMatchAt)} to get the full match`) : null)),
    h('div.form-grid', {},
      labelled('Vesting schedule', select(['Immediate', 'Cliff', 'Graded'], v.vestingSchedule ?? null, x => up({ vestingSchedule: x }), { label: 'Vesting schedule', width: 140 }), { later: L('vestingSchedule') }),
      v.vestingSchedule && v.vestingSchedule !== 'Immediate' ? labelled('Fully vested after', row(numInput(v.vestYears ?? null, x => up({ vestYears: x }), { hint: 'Years', width: 72 }), h('span.muted', {}, 'years'))) : null,
      labelled('Unvested (match not yours yet)', moneyInput(v.unvested ?? null, x => up({ unvested: x }), { hint: 'Add amount' }), { later: L('unvested') }),
      vest ? labelled('Vested (yours if you leave)', shown(money(vest.vested), 'Balance minus unvested')) : null));
}

// ---------- HSA: cash vs invested, managed vs self-directed (B3.5 to B3.7) ----------
function hsaBlock(ctx, r, up, L) {
  const v = r.values;
  const m = ctx.metrics();
  const freq = m.inputs.income.find(x => x.r.values.payFrequency)?.r.values.payFrequency ?? null;
  const age = m.inputs.age;
  const limit = ctx.ref.limits.hsa.self + (age != null && age >= 55 ? ctx.ref.limits.hsa.catchUp55 : 0);
  const prog = hsaProgress({ ytd: v.hsaYtd ?? null, employer: benefitYearly(ctx.store.doc.profile.benefits?.employerHsa, freq), limit, payFrequency: freq, now: ctx.now() });
  const cmp = hsaFeeCompare({ invested: v.hsaInvested ?? null, managedPct: v.hsaManagedFee ?? null, selfPct: v.hsaSelfFee ?? null });
  const un = uninvestedOf('HSA', v, v.balance ?? null, null);
  return h('div.form-grid', {},
    labelled('Invested and cash', row(moneyInput(v.hsaInvested ?? null, x => up({ hsaInvested: x }), { hint: 'Invested' }), moneyInput(v.hsaCash ?? null, x => up({ hsaCash: x }), { hint: 'Cash' })),
      { note: un ? `${money(un.cash)} in cash: invest what you won't spend this year` : null, later: L('hsaInvested') }),
    labelled('How it is invested', toggle(['Self-directed', 'Managed'], v.hsaStyle ?? null, x => up({ hsaStyle: x }), { label: 'Self-directed or managed', clearable: true })),
    labelled('Fee a year: managed vs self-directed', row(pctInput(v.hsaManagedFee ?? null, x => up({ hsaManagedFee: x }), { hint: 'Managed' }), pctInput(v.hsaSelfFee ?? null, x => up({ hsaSelfFee: x }), { hint: 'Self' })),
      { later: L('hsaManagedFee') }),
    labelled('Put in so far this year', moneyInput(v.hsaYtd ?? null, x => up({ hsaYtd: x }), { hint: 'Add amount' }), { note: 'Yours, not the employer\'s', ...park(ctx, r, 'hsaYtd') }),
    prog ? labelled('Progress to the limit', h('span.stack', { style: { gap: '2px' } }, shown(`${money(prog.inSoFar)} of ${money(prog.limit)}${prog.maxed ? ' ✓ maxed' : ''}`),
      !prog.maxed && prog.paychecksLeft ? h('span.muted.small', {}, `${prog.paychecksLeft} paychecks left this year: ${money(prog.perPaycheckToMax)} each to max it`)
        : !prog.maxed ? h('span.muted.small', {}, 'Add pay frequency on Income to see paychecks left') : null)) : null,
    cmp?.saves != null ? labelled('Difference', shown(cmp.saves > 0 ? `Self-directed saves ${money(cmp.saves)} a year` : cmp.saves < 0 ? `Managed saves ${money(-cmp.saves)} a year` : 'Same cost')) : null);
}

// A 401(k)'s yearly contribution, from per paycheck or % of salary.
export function yearly401k(ctx, r) {
  const v = r.values;
  const job = ctx.metrics().inputs.income.find(x => x.taxType === 'W-2' && x.gross !== null);
  const freq = job?.r.values.payFrequency ?? null;
  if (v.contribution != null) return v.contributionPer === 'Paycheck' ? v.contribution * (paychecksPerYear(freq) ?? 26) : v.contribution;
  return v.salaryPct != null && job ? v.salaryPct * job.gross : null;
}

// ---------- Roth IRA: contribution log by tax year (B3.9) ----------
function rothBlock(ctx, r, up) {
  const v = r.values;
  const age = ctx.metrics().inputs.age;
  const limit = ctx.ref.limits.ira.base + (age != null && age >= 50 ? ctx.ref.limits.ira.catchUp50 : 0);
  const log = v.rothLog || [];
  const res = rothLog(log, { limit, now: ctx.now() });
  const set = (i, patch) => up({ rothLog: log.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const y = ctx.now().getFullYear();
  const rows = log.map((e, i) => {
    const d = h('input', { type: 'date', value: e.date || '', 'aria-label': 'Date put in' });
    d.onchange = () => set(i, { date: d.value || null });
    return h('tr', {}, h('td', {}, select([y, y - 1, y - 2, y - 3].map(n => [n, String(n)]), e.taxYear ?? null, x => set(i, { taxYear: x == null ? null : Number(x) }), { label: 'Tax year', width: 100 })),
      h('td', {}, h(`label.field${e.date ? '.filled' : ''}`, { style: { width: '160px' } }, d)),
      h('td.num', {}, moneyInput(e.amount ?? null, x => set(i, { amount: x }), { hint: 'Amount' })),
      h('td', {}, iconButton('trash', 'Remove this contribution', () => up({ rothLog: log.filter((_, j) => j !== i) }), { tiny: true })));
  });
  return h('div.stack', { style: { gap: '10px' } },
    h('div.row-line', { style: { gap: '8px' } }, res.years.filter(x => x.open || x.total).map(x => h(`span.tag${x.maxed ? '.plain.ok-tag' : '.plain'}`, {},
      x.maxed ? `${x.taxYear}: ✓ maxed (${money(x.total)})` : `${x.taxYear}: ${money(x.total)} of ${money(limit)}, ${money(x.left)} to go${x.open && x.taxYear < y ? ' (until Apr 15)' : ''}`)),
      ...res.years.filter(x => x.over).map(x => warnTag(`${x.taxYear}: ${money(x.over)} over the limit. Ask the broker to remove the extra before tax day to avoid a penalty`))),
    log.length ? h('table.rows.mini', {}, h('thead', {}, h('tr', {}, ['Tax year', 'Date', 'Amount', ''].map(t => h('th', {}, t)))), h('tbody', {}, rows)) : null,
    row(button('Log a contribution', { size: 'small', iconName: 'plus', onClick: () => up({ rothLog: [...log, { taxYear: y }] }) }),
      res.basis && v.rothBasis == null ? h('span.muted.small', {}, `Contributions logged: ${money(res.basis)}. This is your contribution basis.`) : null));
}

export function specificBlocks(ctx, r, up, L, id) {
  return [is401k(r) ? moreBlock(id('match'), () => matchBlock(ctx, r, up, L), { label: 'Contribution, match and vesting' }) : null,
    r.type === 'HSA' ? moreBlock(id('hsa'), () => hsaBlock(ctx, r, up, L), { label: 'HSA: cash, invested, fees and limit' }) : null,
    r.type === 'Roth IRA' ? moreBlock(id('roth'), () => rothBlock(ctx, r, up), { label: `Contributions by tax year${r.values.rothLog?.length ? ` (${r.values.rothLog.length})` : ''}` }) : null];
}
