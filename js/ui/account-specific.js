// Brandon section 3: fields only some accounts have. 401(k): Roth or traditional, per paycheck and % of salary,
// match tiers, vesting. HSA: cash vs invested, self-directed vs managed with a fee comparison.
import { h } from './dom.js';
import { moneyInput, pctInput, textInput, toggle, select, labelled, moreBlock, button, iconButton, warnTag } from './staples.js';
import { uninvestedOf, matchFromTiers, contributionSplit, vestedOf, hsaFeeCompare, paychecksPerYear } from '../math/portfolio.js';
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
  const perPaycheck = v.contribution != null && v.contributionPer === 'Paycheck' ? v.contribution : null;
  const split = contributionSplit({ perPaycheck, pct: perPaycheck == null ? v.salaryPct ?? null : null, gross, payFrequency: freq });
  const tiers = v.matchTiers || [];
  const setTier = (i, patch) => up({ matchTiers: tiers.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const m = matchFromTiers({ contributionPct: split.pct, tiers, gross });
  const vest = vestedOf(v.balance ?? null, v.unvested);
  return h('div.stack', { style: { gap: '12px' } },
    h('div.form-grid', {},
      labelled('Roth or traditional', toggle(['Traditional', 'Roth', 'Both'], { Pretax: 'Traditional', Roth: 'Roth', Both: 'Both' }[v.taxType] ?? null,
        x => up({ taxType: { Traditional: 'Pretax', Roth: 'Roth', Both: 'Both' }[x] ?? null }), { label: 'Roth or traditional', clearable: true }), { later: L('taxType') }),
      labelled('Per paycheck', split.computed === 'perPaycheck' ? shown(`${money(split.perPaycheck)} (worked out)`) : moneyInput(perPaycheck, x => up({ contribution: x, contributionPer: 'Paycheck' }), { hint: 'Add amount' }), { later: L('contribution') }),
      labelled('% of salary', split.computed === 'pct' ? shown(`${pct(split.pct)} (worked out)`) : pctInput(v.salaryPct ?? null, x => up({ salaryPct: x, ...(x != null && v.contributionPer === 'Paycheck' ? { contribution: null } : {}) }), { hint: 'e.g. 6' }),
        { note: gross === null ? 'Add gross pay on Income to work out the other' : freq === null ? 'Add pay frequency on Income to work out the other' : 'Type either one' })),
    h('div.stack', { style: { gap: '6px' } }, h('span.label', {}, 'Employer match'),
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
  const cmp = hsaFeeCompare({ invested: v.hsaInvested ?? null, managedPct: v.hsaManagedFee ?? null, selfPct: v.hsaSelfFee ?? null });
  const un = uninvestedOf('HSA', v, v.balance ?? null, null);
  return h('div.form-grid', {},
    labelled('Invested and cash', row(moneyInput(v.hsaInvested ?? null, x => up({ hsaInvested: x }), { hint: 'Invested' }), moneyInput(v.hsaCash ?? null, x => up({ hsaCash: x }), { hint: 'Cash' })),
      { note: un ? `${money(un.cash)} in cash: invest what you won't spend this year` : null, later: L('hsaInvested') }),
    labelled('How it is invested', toggle(['Self-directed', 'Managed'], v.hsaStyle ?? null, x => up({ hsaStyle: x }), { label: 'Self-directed or managed', clearable: true })),
    labelled('Fee a year: managed vs self-directed', row(pctInput(v.hsaManagedFee ?? null, x => up({ hsaManagedFee: x }), { hint: 'Managed' }), pctInput(v.hsaSelfFee ?? null, x => up({ hsaSelfFee: x }), { hint: 'Self' })),
      { later: L('hsaManagedFee') }),
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

export function specificBlocks(ctx, r, up, L, id) {
  return [is401k(r) ? moreBlock(id('match'), () => matchBlock(ctx, r, up, L), { label: 'Contribution, match and vesting' }) : null,
    r.type === 'HSA' ? moreBlock(id('hsa'), () => hsaBlock(ctx, r, up, L), { label: 'HSA: cash, invested and fees' }) : null];
}
