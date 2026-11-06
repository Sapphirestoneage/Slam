// SPDX-License-Identifier: AGPL-3.0-only
// Batch 63 (Phase 4 Track 1 in the workbook): the ranges on the key outputs (M9R), the certainty meter and Ask me next
// (M9Q) as live formulas, the corner method of docs/engines/ranges.md written as a table a coach can follow.
//
// The Ranges tab has the block (one row per key output: likely, could be from, to, the app's ends and a Check) and
// beside it "What widens it": one row per input that can widen a range (each income row, the spending number or the
// lines, each account, home or car, each debt's balance and its APR). Each row reads its input off its own tab by its
// SLAM id (INDEX and MATCH on the named ranges), takes its sureness from the row's Status (Know it, Roughly, Guess),
// its width from the RULES on Assumptions, and works out every key output with the input at its low and at its high.
// The block combines the swings as the root of the sum of their squares (inputs treated as independent).
//
// What the sheet works out itself: the surplus, emergency fund months and net worth at each end (straight from the
// input), take-home at each end (a paycheck typed as take-home moves as typed; a gross or a platform payout goes
// through the household's tax again: federal, Social Security, Medicare and New York), the FI date at each end (NPER,
// as M53 does). What each row takes from the app, as M53 does: the months the surplus pays heavy debt or fills big e
// first and the payments freed after (the month-by-month debt plan, M34 and M79), and the debt-free month at each end
// (the same plan). Pure: builds formula text from the household, never the DOM.
import { metrics } from '../math/metrics.js';
import { knobsOf, readOut } from '../math/ranges.js';
import { levelOf } from '../math/picture.js';
import { statusOf } from '../records.js';
import { taxTypeOf } from '../math/income.js';
import { isCategoryRecord } from '../math/spending.js';
import { LEVELS } from '../registry/program.js';

const isBlank = v => v === null || v === undefined || v === '';
const str = v => `"${String(v).replace(/"/g, '""')}"`;
const STEADY = new Set(['W-2', 'Benefits']);
export const LINES_ON = 'OR(Math_M27_gut="",AND(Set_spendingSource="lines",Math_M27_lines<>""))';
// The gut path's debt payments outside spending (M27 debtOut): the All in row says debt payments are not in it.
const GUT_OUT = `AND(NOT(${LINES_ON}),COUNTIFS(Spend_Kind,"Gut number or category",Spend_Type,"All in",Spend_InMath,"<>No",Spend_includesDebtPayments,"No")>0)`;

// The level a row's Status gives (picture.js levelOf): Know it 100, Worked out 75, Roughly 50, a guess 25.
export const STATUS_LEVEL = st => `IF(${st}="Roughly",50,IF(OR(${st}="Guess",${st}="I'll find it later",${st}="Not now"),25,IF(${st}="Worked out",75,100)))`;
// How far an input of a kind moves at a level, either way (ranges.js widthOf): a share, or APR points.
export const WIDTH = (kind, L) => ({
  balance: `IF(${L}>=100,RangeBalanceActual,IF(${L}>=75,RangeBalanceEstimate,IF(${L}>=50,RoughBalanceShare,IF(${L}>=25,RangeBalanceGut,0))))`,
  spending: `IF(${L}>=100,0,IF(${L}>=75,RangeSpendEstimate,IF(${L}>=50,RangeSpendRough,IF(${L}>=25,RangeSpendGut,0))))`,
  income: `IF(${L}>=100,0,IF(${L}>=75,RangeIncomeEstimate,IF(${L}>=50,RangeIncomeRough,IF(${L}>=25,RangeIncomeGut,0))))`,
  variable: `IF(${L}>=100,RangeVariableActual,IF(${L}>=75,RangeVariableEstimate,IF(${L}>=50,RangeVariableRough,IF(${L}>=25,RangeVariableGut,0))))`,
  apr: `IF(${L}>=75,0,IF(${L}>=50,RangeAprRough,IF(${L}>=25,AprGuessSwing,0)))`,
}[kind]);
export const LEVEL_WORD = L => `IF(${L}="","",IF(${L}>=100,"Know it",IF(${L}>=75,"Worked out",IF(${L}>=50,"Roughly",IF(${L}>=25,"Guess","Not in yet")))))`;

// A bracket table's tax on t (the same SUMPRODUCT the Income tab uses).
const bracket = (t, table) => `SUMPRODUCT((${t}>${table}_over)*(${t}-${table}_over)*${table}_step)`;
// Elementwise MIN(x, cap) inside SUMPRODUCT (MIN would add the whole array up).
const mn = (x, cap) => `((${x})+${cap}-ABS((${x})-${cap}))/2`;

// ---------- The FI date as a formula of its parts (M53, generalised) ----------
// Months from a start balance S at P a month to the FI number F, "Never" past cap.
const nper = (S, P, F, cap = 'MaxMonths') => `IF(Math_M53_growth=0,IF(${P}>0,IF(ROUNDUP((${F}-${S})/${P}-0.000000001,0)>${cap},"Never",ROUNDUP((${F}-${S})/${P}-0.000000001,0)),"Never"),IF(${S}+${P}/Math_M53_growth<=0,"Never",IF(ROUNDUP(LN((${F}+${P}/Math_M53_growth)/(${S}+${P}/Math_M53_growth))/LN(1+Math_M53_growth)-0.000000001,0)>${cap},"Never",ROUNDUP(LN((${F}+${P}/Math_M53_growth)/(${S}+${P}/Math_M53_growth))/LN(1+Math_M53_growth)-0.000000001,0))))`;
// The months to FI: H months first at B a month (the surplus pays heavy debt or fills big e), then P a month with the
// known changes ahead, as M53 does. sur: the surplus (blank: no plan). With changes, each one's month (at), the balance
// it starts from (seg) and the months to FI if the target falls in its stretch (t) are cells of their own (col(key)),
// so no formula grows past what a spreadsheet reads.
export function fiPathFormula({ S, B, P, F, H, sur, n = 0, ch = [], col = null }) {
  const after = `FV(Math_M53_growth,${H},-${B},-${S})`;
  const Pj = j => `(${P}${ch.slice(0, j).map(x => `+N(${x})`).join('')})`;
  const T = j => (j === 0 ? H : col(`at${j}`));
  const start = j => (j === 0 ? after : col(`seg${j}`));
  const tail = j => `IF(ISNUMBER(${nper(start(j), Pj(j), F, `MaxMonths-${T(j)}`)}),${T(j)}+${nper(start(j), Pj(j), F, `MaxMonths-${T(j)}`)},"Never")`;
  const t = j => (n ? col(`t${j}`) : tail(j));
  const step = j => (j === n ? t(j) : `IF(${col(`at${j + 1}`)}="",${t(j)},IF(${col(`seg${j + 1}`)}>=${F},${t(j)},${step(j + 1)}))`);
  const pieces = {};
  for (let j = 1; j <= n; j++) pieces[`seg${j}`] = `IF(${col(`at${j}`)}="","",FV(Math_M53_growth,${col(`at${j}`)}-${T(j - 1)},-${Pj(j - 1)},-${start(j - 1)}))`;
  for (let j = 0; j <= n; j++) if (n) pieces[`t${j}`] = j === 0 ? tail(0) : `IF(${col(`at${j}`)}="","",${tail(j)})`;
  return { f: `IF(OR(${S}="",${sur}="",${F}=""),"",IF(${S}>=${F},0,IF(AND(${H}>0,${after}>=${F}),${nper(S, B, F)},${step(0)})))`, pieces };
}

// ---------- The inputs that can widen a range ----------
const of = (area, col, id) => `INDEX(${area}_${col},MATCH(${str(id)},${area}_Id,0))`;
const valueOf = (rec, field) => (field in rec && field !== 'values' ? rec[field] : rec.values?.[field]);

// Every input that can move a key output, as the app's knobs are (ranges.js knobsOf), kept even when its width is 0
// today so a Status changed in the sheet widens the range there. { id, kind, label, area, rec, field, app }.
export function candidatesOf(c) {
  const live = c.live.filter(r => !r.prior);
  const appKnobs = new Map((safeKnobs(c) || []).map(k => [k.id, k]));
  const name = r => r.name || r.type || 'Item';
  const out = [];
  const add = o => out.push({ ...o, app: appKnobs.get(o.id) ?? null });
  for (const r of live.filter(x => x.kind === 'income')) {
    if (isBlank(r.amount) || !Number(r.amount)) continue;
    const steady = STEADY.has(taxTypeOf(r) ?? 'W-2') && !(r.values?.tips > 0);
    add({ id: `${r.id}:amount`, kind: steady ? 'income' : 'variable', label: /take-home|pay/i.test(name(r)) ? name(r) : `${name(r)} pay`, area: 'Income', rec: r, field: 'amount' });
  }
  const allIns = live.filter(r => r.kind === 'spending' && r.type === 'All in' && !isBlank(r.amount));
  const lines = live.filter(r => (r.kind === 'bill' || isCategoryRecord(r)) && !isBlank(r.amount) && Number(r.amount) && statusOf(r, 'amount') !== 'Not for me');
  if (allIns.length || lines.length) add({ id: 'spending', kind: 'spending', label: allIns.length ? 'Spending (the gut number, or the lines once the Budget uses them)' : 'Spending lines', area: 'Spend', rec: allIns[0] ?? null, field: 'amount', allIns });
  for (const r of live.filter(x => x.kind === 'account')) if (!isBlank(r.values?.balance) && Number(r.values.balance) && statusOf(r, 'balance') !== 'Not for me') add({ id: `${r.id}:balance`, kind: 'balance', label: `${name(r)} balance`, area: 'Assets', rec: r, field: 'balance' });
  for (const r of live.filter(x => x.kind === 'asset')) if (!isBlank(r.values?.value) && Number(r.values.value) && statusOf(r, 'value') !== 'Not for me') add({ id: `${r.id}:value`, kind: 'balance', label: `${name(r)} value`, area: 'Assets', rec: r, field: 'value' });
  for (const r of live.filter(x => x.kind === 'debt')) {
    const bal = valueOf(r, 'balance');
    if (isBlank(bal) || !Number(bal) || statusOf(r, 'balance') === 'Not for me') continue;
    add({ id: `${r.id}:balance`, kind: 'balance', label: `${name(r)} balance`, area: 'Debt', rec: r, field: 'balance', debt: true });
    if (statusOf(r, 'apr') === 'Not for me') continue;
    const apr = valueOf(r, 'apr'), typical = c.ref.typicalRates?.[r.type] ?? null;
    if (isBlank(apr) && typical == null) continue;
    add({ id: `${r.id}:apr`, kind: 'apr', label: `${name(r)} APR`, area: 'Debt', rec: r, field: 'apr', debt: true, prior: isBlank(apr) });
  }
  return out;
}
function safeKnobs(c) { try { return knobsOf(c.doc, c.ref); } catch { return null; } }

// The app's own numbers at each end of a knob (what the sheet takes from the app, and the Check's side).
export function cornersOf(c) {
  if (c._corners) return c._corners;
  const knobs = safeKnobs(c) || [];
  const out = new Map();
  for (const k of knobs) {
    const run = side => { try { const m = metrics(k.apply(c.doc, side), c.ref, { now: c.now }); return { m, out: readOut(m) }; } catch { return null; } };
    out.set(k.id, { low: run('low'), high: run('high') });
  }
  c._corners = out;
  return out;
}

// The level a candidate's input is read at: the row's Status in the sheet, unless the app knows better (a field marked
// on its own, a locked number, a statement import), which is then written in.
function levelFormula(c, k) {
  if (k.id === 'spending') return null; // the spending row works its level out per path
  const months = c.doc.spending?.months || {};
  const app = levelOf(k.rec, k.field, { months });
  const fromStatus = { 'Not sure': LEVELS.Gut, 'Will email': LEVELS.Gut, 'Not now': LEVELS.Gut, Roughly: LEVELS.Rough, Computed: LEVELS.Estimate }[k.rec.status] ?? LEVELS.Actual;
  if (k.prior) return '0';
  return app !== fromStatus ? String(app ?? 0) : STATUS_LEVEL(of(k.area, 'Status', k.rec.id));
}

// The rows of "What widens it" for a household: each a { cells } row for the report table.
export function widenRows(c) {
  const C = cornersOf(c);
  const base = readOut(c.m);
  const raw = rawChanges(c.m);
  return candidatesOf(c).map(k => {
    const id = k.rec?.id ?? null;
    const A = (col, area = k.area) => of(area, col, id);
    const L = levelFormula(c, k);
    const cells = { what: { v: k.label }, kind: { v: { balance: k.debt ? 'Owed' : 'Balance or value', spending: 'Spending', income: 'Steady pay', variable: 'Pay that varies', apr: 'Interest rate' }[k.kind] } };
    // Level and width.
    if (k.id === 'spending') {
      const gutLevel = k.app && !k.app.lines ? k.app.level : Math.min(...(k.allIns || []).map(r => levelOf(r, 'amount', { months: c.doc.spending?.months || {} }) ?? LEVELS.Actual), LEVELS.Actual);
      cells.level = { f: `IF(${LINES_ON},IF(COUNT(Spend_rgLevel)=0,"",MIN(Spend_rgLevel)),${Number.isFinite(gutLevel) ? gutLevel : 100})` };
      cells.w = { f: `IF(${LINES_ON},"Each line by its own",${WIDTH('spending', '{col:level}')})` };
    } else {
      cells.level = { f: L };
      cells.w = { f: k.prior ? 'AprGuessSwing' : WIDTH(k.kind, '{col:level}') };
    }
    cells.sure = { f: k.prior ? '"Typical, not yours yet"' : LEVEL_WORD('{col:level}') };
    cells.known = { f: k.prior ? '"No"' : 'IF(N({col:level})>=100,"Yes","No")' };
    // The input at each end, and what moves with it (a month, unless said).
    const f = side => (side === 'Lo' ? '(1-{col:w})' : '(1+{col:w})');
    const z = { dSpend: '0', dTh: '0', dIn: '0', dOut: '0', dNw: '0', dCash: '0', dInv: '0' };
    const d = { Lo: { ...z }, Hi: { ...z } };
    if (k.area === 'Assets') {
      const val = A('val');
      for (const s of ['Lo', 'Hi']) {
        cells[`v${s}`] = { f: `IF(${val}="","",${val}*${f(s)})` };
        d[s].dNw = `(N(${val})*(${f(s)}-1))`;
        d[s].dCash = `IF(AND(${A('group')}="cash",${A('purpose')}<>"Taxes"),N(${val})*(${f(s)}-1),0)`;
        d[s].dInv = `IF(AND(${A('group')}="investment",${A('Type')}<>"529",${A('purpose')}<>"Goal"),N(${val})*(${f(s)}-1),0)`;
      }
    } else if (k.area === 'Debt') {
      const bal = A('balUsed'), apr = A('aprUsed');
      for (const s of ['Lo', 'Hi']) {
        const balC = k.kind === 'apr' ? bal : `(${bal}*${f(s)})`;
        const aprC = k.kind === 'apr' ? `MAX(0,${apr}${s === 'Lo' ? '-' : '+'}{col:w})` : apr;
        cells[`v${s}`] = { f: k.kind === 'apr' ? `IF(${apr}="","",${aprC})` : `IF(${bal}="","",${balC})` };
        // The payment at this end (M30): a card on its minimum moves with its balance and rate.
        const pay = `IF(${A('Status')}="Not for me",0,IF(${A('Type')}="Credit card",IF(${A('payChoice')}="In full",${balC},IF(OR(${A('payChoice')}="Minimum",${A('payment')}=""),IF(OR(${bal}="",${apr}=""),"",MIN(${balC},MAX(CardMin_floor,${balC}*CardMin_pct+${balC}*${aprC}/12))),${A('payment')})),${A('payment')}))`;
        const payOut = `IF(OR(${A('payUsed')}="",${A('payChoice')}="In full"),0,N(${pay})-N(${A('payUsed')}))`;
        const auto = `IF(AND(N(${A('payUsed')})>0,${A('payChoice')}<>"In full",N(${bal})<>0),N(${pay})-N(${A('payUsed')}),0)`;
        d[s].dOut = `IF(${GUT_OUT},${payOut},0)`;
        d[s].dSpend = `IF(${LINES_ON},${auto},0)`;
        if (k.kind === 'balance') d[s].dNw = `(-N(${bal})*(${f(s)}-1))`;
      }
    } else if (k.area === 'Income') {
      const M01 = A('M01'), paid = A('paid');
      const gross = `AND(${A('taxType')}<>"",${A('taxType')}<>"Unemployment",${A('M13')}<>"",OR(${A('basis')}="Gross",${A('Type')}="Platform"))`;
      for (const s of ['Lo', 'Hi']) {
        cells[`v${s}`] = { f: `IF(${A('amount')}="","",${A('amount')}*${f(s)})` };
        // A year of gross at this end less today's (the gross path): the platform's payouts, or the gross typed.
        const dG = `IF(${A('Type')}="Platform",(MAX(0,${M01}*${f(s)}*(1-N(${A('platFee')}))-N(${A('chargebacks')}))-N(${A('platNet')}))*12,N(${A('M13')})*(${f(s)}-1))`;
        cells[`dG${s}`] = { f: `IF(${gross},${dG},0)` };
        d[s].dTh = `IF(${gross},{col:dTax${s}},IF(${paid}="",0,N(${paid})*(${f(s)}-1)))`;
        d[s].dIn = `IF(${gross},({col:dG${s}}*N(${A('pct')})+IF(OR(${A('matchPct')}="",${A('matchCapPct')}=""),0,MIN(N(${A('pct')}),${A('matchCapPct')})*${A('matchPct')}*{col:dG${s}}))/12,0)`;
        cells[`dTax${s}`] = { f: takeHomeMoves(k, `{col:dG${s}}`) };
      }
    } else if (k.id === 'spending') {
      for (const s of ['Lo', 'Hi']) {
        cells[`v${s}`] = { f: `IF(Math_M27_spending="","",Math_M27_spending+{col:dSpend${s}})` };
        d[s].dSpend = `IF(${LINES_ON},IF(Math_M27_lines="",0,(${CAT_SUM_AT(s)})-Math_M27_lines),IF(Math_M27_gut="",0,Math_M27_gut*(${f(s)}-1)))`;
      }
    }
    for (const s of ['Lo', 'Hi']) for (const [key, expr] of Object.entries(d[s])) cells[`${key}${s}`] = { f: expr };
    // The key outputs at each end.
    for (const s of ['Lo', 'Hi']) {
      cells[`sur${s}`] = { f: `IF(Math_M27="","",Math_M27+{col:dTh${s}}-{col:dSpend${s}}-{col:dOut${s}})` };
      cells[`spend${s}`] = { f: `IF(Math_M27_spending="","",Math_M27_spending+{col:dSpend${s}})` };
      cells[`ef${s}`] = { f: `IF(OR(Math_M41_cash="",{col:spend${s}}=""),"",IF({col:spend${s}}<=0,"",(Math_M41_cash+{col:dCash${s}})/{col:spend${s}}))` };
      cells[`nw${s}`] = { f: `IF(Math_M40="","",Math_M40+{col:dNw${s}})` };
      // The FI path at this end: invested now, a month while paying debt first, a month after, the FI number.
      cells[`S${s}`] = { f: `IF(Math_M41_invested="","",Math_M41_invested+{col:dInv${s}})` };
      cells[`B${s}`] = { f: `IF(Math_M27="","",Math_M53_before+{col:dIn${s}})` };
      cells[`P${s}`] = { f: `IF({col:sur${s}}="","",IF(N(InvestSurplus)=0,{col:B${s}},Math_M28_pretax+Math_M28_match+{col:dIn${s}}+{col:sur${s}}-N(Math_M28_goal)+N({col:fr${s}})))` };
      cells[`F${s}`] = { f: `IF(OR(WithdrawalRate="",RetirementSpending=""),"",IF(RetirementSpending_mine<>"",RetirementSpending_mine,{col:spend${s}}+N(Math_M50_later))*12/WithdrawalRate)` };
      // From the app: the debt-first months and the freed payments at this end (the month-by-month debt plan).
      const corner = C.get(k.id)?.[s === 'Lo' ? 'low' : 'high'];
      const inv = corner?.m?.investing;
      cells[`H${s}`] = { v: corner ? inv?.before?.months ?? 0 : c.m.investing?.before?.months ?? 0, fromApp: true };
      cells[`fr${s}`] = { v: corner ? inv?.freed ?? 0 : c.m.investing?.freed ?? 0, fromApp: true };
      raw.forEach((_, j) => { cells[`at${j + 1}${s}`] = { f: `IF(Math_M53_from${j + 1}="","",MAX(Math_M53_from${j + 1},N({col:H${s}})))` }; });
      const path = fiPathFormula({ S: `{col:S${s}}`, B: `{col:B${s}}`, P: `{col:P${s}}`, F: `{col:F${s}}`, H: `N({col:H${s}})`, sur: `{col:sur${s}}`, n: raw.length, ch: raw.map((_, j) => `Math_M53_by${j + 1}`), col: key => `{col:${key}${s}}` });
      cells[`fi${s}`] = { f: path.f };
      for (const [key, f] of Object.entries(path.pieces)) cells[`${key}${s}`] = { f };
      const df = corner ? corner.out.debtFree : base.debtFree;
      cells[`df${s}`] = { v: df === Infinity ? 'Never' : df, fromApp: true };
    }
    // Each end's swing on each output, squared (the block adds them up): how far below and above likely it lands.
    for (const [o, likely] of Object.entries(LIKELY)) {
      const lo = `{col:${o}Lo}`, hi = `{col:${o}Hi}`;
      const v = x => `IF(ISNUMBER(${x}),${x},${likely})`;
      cells[`${o}D2`] = { f: `IF(NOT(ISNUMBER(${likely})),"",MAX(0,${likely}-MIN(${v(lo)},${v(hi)}))^2)` };
      cells[`${o}U2`] = { f: `IF(NOT(ISNUMBER(${likely})),"",IF(OR(${lo}="Never",${hi}="Never"),"Never",MAX(0,MAX(${v(lo)},${v(hi)})-${likely})^2))` };
    }
    return { cells, unit: k.kind === 'apr' ? 'pct' : 'money' };
  });
}

// The known changes ahead as the app has them, before the debt-first months (at most 4, as M53 has slots).
export const rawChanges = m => (m.investing?.changes || []).filter(x => x.monthly).slice(0, 4);

// The likely value of each output: the number every row of the workbook already shows.
export const LIKELY = { fi: 'Math_M53', df: 'Math_M34', ef: 'Math_M42', sur: 'Math_M27', nw: 'Math_M40' };
export const OUT_KEYS = { fi: 'fi', df: 'debtFree', ef: 'efMonths', sur: 'surplus', nw: 'netWorth' };
export const OUT_NAMES = { fi: 'FI date (months from now)', df: 'Debt-free date (months from now)', ef: 'Emergency fund, months of spending held', sur: 'Monthly surplus', nw: 'Net worth' };
const DATES = new Set(['fi', 'df']);

// The spending total on the lines path at one end (M27 lines): every line and category amount at its own end.
let CAT_SUM_AT = () => '0';
export function setCatSum(fn) { CAT_SUM_AT = fn; }

// What take-home moves by a month when a row's gross a year moves by dG: the gross, less the 401(k) and HSA it carries,
// less the household's tax again on the new gross (federal on the row's return, Social Security to the wage base for
// the row's person, Medicare and the extra Medicare, New York and the city). Exact when the row is the last on its
// return that is worked out from a gross; a take-home typed on a later row keeps its typed amount.
function takeHomeMoves(k, dG) {
  const id = k.rec.id;
  const A = col => of('Income', col, id);
  const tt = A('taxType'), p = A('taxPerson'), u = A('taxUnit'), st = A('stack'), pct = `N(${A('pct')})`;
  const m = `IF(${tt}="1099",2,1)`;
  const dFb = `IF(${tt}="1099",${dG}*SE_base,${dG})`;
  const C = `SUMIFS(Income_ficaBase,Income_taxPerson,${p},Income_stack,"<="&${st})`;
  const W = 'SS_wageBase';
  const ssRow = `(MIN(${C}+${dFb},${W})-MIN(${C},${W}))*SS_rate*${m}`;
  // The rows after it for the same person move up the wage base too.
  const later = only2 => `SS_rate*SUMPRODUCT((Income_taxPerson=${p})*(Income_rgStack>${st})*Income_rgM${only2 ? '*(Income_rgM=2)' : ''}*(${mn(`Income_rgCum+${dFb}`, W)}-${mn('Income_rgCum', W)}-${mn(`Income_rgCum-Income_rgFb+${dFb}`, W)}+${mn('Income_rgCum-Income_rgFb', W)}))`;
  const thr = 'IF(Taxes_joint="Yes",Medicare_over_joint,Medicare_over_single)';
  const T = `SUMIFS(Income_ficaBase,Income_taxUnit,${u})`;
  const med = `${dFb}*Medicare_rate*${m}+(MAX(0,${T}+${dFb}-${thr})-MAX(0,${T}-${thr}))*Medicare_addl`;
  const seHalf = `IF(${tt}="1099",(${ssRow}+${dFb}*Medicare_rate*2)/2,0)`;
  const dOwn = `(${dG}-${dG}*${pct}-${seHalf}-${later(true)}/2)`;
  const O = `SUMIFS(Income_own,Income_taxUnit,${u})`;
  const fedBy = (std, t) => `${bracket(`MAX(0,${O}+${dOwn}-${std})`, t)}-${bracket(`MAX(0,${O}-${std})`, t)}`;
  const fed = `IF(Taxes_joint="Yes",${fedBy('StdDed_joint', 'Fed_joint')},IF(Taxes_filing="Head of household",${fedBy('StdDed_head', 'Fed_head')},${fedBy('StdDed_single', 'Fed_single')}))`;
  const SO = `SUMIFS(Income_stateOwn,Income_taxUnit,${u})`, dSo = `(${dG}-${dG}*${pct})`;
  const on = (x, t, kk) => bracket(`MAX(0,${x}-NY_std_${kk})`, `${t}_${kk}`);
  const stBy = t => `IF(Taxes_filing="Married jointly",${on(`${SO}+${dSo}`, t, 'joint')}-${on(SO, t, 'joint')},IF(Taxes_filing="Head of household",${on(`${SO}+${dSo}`, t, 'head')}-${on(SO, t, 'head')},${on(`${SO}+${dSo}`, t, 'single')}-${on(SO, t, 'single')}))`;
  const state = `IF(Profile_state<>"NY",0,${stBy('NY')}+IF(Profile_nyc="Yes",${stBy('NYC')},0))`;
  return `IF(${dG}=0,0,(${dG}-${dG}*${pct}-(${fed})-(${ssRow}+${later(false)})-(${med})-(${state}))/12)`;
}

// The report: the block and the rows behind it.
export const widenColumns = (n = 0) => [
  { key: 'what', label: 'Input', unit: 'text', width: 30 }, { key: 'kind', label: 'Kind', unit: 'text', width: 14 },
  { key: 'sure', label: 'Sure as', unit: 'text', width: 12 }, { key: 'w', label: 'Moves either way', unit: 'pct', width: 12 },
  { key: 'vLo', label: 'At its low', unit: 'row' }, { key: 'vHi', label: 'At its high', unit: 'row' },
  { key: 'surLo', label: 'Surplus at its low', unit: 'money' }, { key: 'surHi', label: 'Surplus at its high', unit: 'money' },
  { key: 'efLo', label: 'Emergency fund months at its low', unit: 'years' }, { key: 'efHi', label: 'Emergency fund months at its high', unit: 'years' },
  { key: 'nwLo', label: 'Net worth at its low', unit: 'money' }, { key: 'nwHi', label: 'Net worth at its high', unit: 'money' },
  { key: 'fiLo', label: 'FI months at its low', unit: 'months' }, { key: 'fiHi', label: 'FI months at its high', unit: 'months' },
  { key: 'dfLo', label: 'Debt-free months at its low (from the app: the debt plan)', unit: 'months' }, { key: 'dfHi', label: 'Debt-free months at its high (from the app)', unit: 'months' },
  // The working, grouped (collapsed) to the right.
  { key: 'level', label: 'Level (Know it 100, Worked out 75, Roughly 50, Guess 25)', unit: 'number', group: true }, { key: 'known', label: 'At Know it', unit: 'text', group: true },
  ...['Lo', 'Hi'].flatMap(s => {
    const at = s === 'Lo' ? 'at its low' : 'at its high';
    return [
      { key: `dSpend${s}`, label: `Spending moves, ${at}`, unit: 'money', group: true }, { key: `spend${s}`, label: `Spending, ${at}`, unit: 'money', group: true },
      { key: `dG${s}`, label: `Gross a year moves, ${at}`, unit: 'money', group: true }, { key: `dTax${s}`, label: `Take-home after tax moves, ${at} (a gross or a payout)`, unit: 'money', group: true },
      { key: `dTh${s}`, label: `Take-home moves, ${at}`, unit: 'money', group: true }, { key: `dIn${s}`, label: `401(k), HSA and match move, ${at}`, unit: 'money', group: true },
      { key: `dOut${s}`, label: `Debt payments outside spending move, ${at}`, unit: 'money', group: true }, { key: `dNw${s}`, label: `Net worth moves, ${at}`, unit: 'money', group: true },
      { key: `dCash${s}`, label: `Cash moves, ${at}`, unit: 'money', group: true }, { key: `dInv${s}`, label: `Invested moves, ${at}`, unit: 'money', group: true },
      { key: `S${s}`, label: `FI path: invested now, ${at}`, unit: 'money', group: true }, { key: `B${s}`, label: `FI path: a month while the surplus pays debt first, ${at}`, unit: 'money', group: true },
      { key: `fr${s}`, label: `FI path: freed payments a month (from the app), ${at}`, unit: 'money', group: true }, { key: `P${s}`, label: `FI path: a month after, ${at}`, unit: 'money', group: true },
      { key: `F${s}`, label: `FI number, ${at}`, unit: 'money', group: true }, { key: `H${s}`, label: `Months the surplus pays debt or fills big e first (from the app), ${at}`, unit: 'months', group: true },
      ...Array.from({ length: n }, (_, j) => [{ key: `at${j + 1}${s}`, label: `FI path: known change ${j + 1} starts (month), ${at}`, unit: 'months', group: true }, { key: `seg${j + 1}${s}`, label: `FI path: invested when change ${j + 1} starts, ${at}`, unit: 'money', group: true }]).flat(),
      ...(n ? Array.from({ length: n + 1 }, (_, j) => ({ key: `t${j}${s}`, label: `FI path: months to FI if it comes ${j ? `after change ${j}` : 'before the first change'}, ${at}`, unit: 'months', group: true })) : []),
    ];
  }),
  ...Object.keys(LIKELY).flatMap(o => [{ key: `${o}D2`, label: `${OUT_NAMES[o]}: below likely, squared`, unit: 'number', group: true }, { key: `${o}U2`, label: `${OUT_NAMES[o]}: above likely, squared`, unit: 'number', group: true }]),
];
// Named columns of the table (the block reads them): Rg_<key>.
export const WIDEN_NAMES = ['known', ...Object.keys(LIKELY).flatMap(o => [`${o}D2`, `${o}U2`])];

// One end of a range from the squared swings: low (down) or high (up), with the floor and the whole months a date takes.
export function endFormula(o, side, { open = false } = {}) {
  const likely = LIKELY[o];
  const sum = col => (open ? `SUMIFS(Rg_${col},Rg_known,"No")` : `SUM(Rg_${col})`);
  if (side === 'low') {
    const x = `${likely}-SQRT(${sum(`${o}D2`)})`;
    return `IF(NOT(ISNUMBER(${likely})),"",${DATES.has(o) ? `ROUND(MAX(0,${x}),0)` : o === 'ef' ? `MAX(0,${x})` : x})`;
  }
  const never = open ? `COUNTIFS(Rg_${o}U2,"Never",Rg_known,"No")` : `COUNTIF(Rg_${o}U2,"Never")`;
  const x = `${likely}+SQRT(${sum(`${o}U2`)})`;
  return `IF(NOT(ISNUMBER(${likely})),"",IF(${never}>0,"",${DATES.has(o) ? `ROUND(${x},0)` : x}))`;
}
// Is a range wide enough to show (ranges.js materialOf), on the inputs not at Know it yet?
export function materialFormula(o) {
  const lo = endFormula(o, 'low', { open: true }), hi = endFormula(o, 'high', { open: true });
  const MAT = 'MAX(MaterialFloor,IF(IF(Math_M17<>"",Math_M17,IF(Math_M12="","",Math_M12/HoursPerMonth))="",0,IF(Math_M17<>"",Math_M17,Math_M12/HoursPerMonth)*MaterialHours))';
  const width = `((${hi})-(${lo}))`;
  const months = minRule => `IF(${width}<${minRule},0,IF(Math_M27_spending="",1,IF(${width}*MAX(0,Math_M27_spending)>=${MAT},1,0)))`;
  const finite = { sur: `IF(${width}*12>=${MAT},1,0)`, nw: `IF(${width}>=${MAT},1,0)`, fi: months('RangeMinMonths'), df: months('RangeMinMonths'), ef: months('RangeMinEfMonths') }[o];
  return `IF(NOT(ISNUMBER(${LIKELY[o]})),0,IF(${hi}="",1,IF(${width}=0,0,${finite})))`;
}

// The Ranges tab (the block, then the rows behind it). Batch 59 places it on The future.
const BLOCK_COLUMNS = [
  { key: 'what', label: 'Key output', unit: 'text', width: 34 }, { key: 'likely', label: 'Likely', unit: 'row', width: 14 },
  { key: 'low', label: 'Could be from', unit: 'row', width: 14 }, { key: 'high', label: 'To (blank: it may never come at that end)', unit: 'row', width: 16 },
  { key: 'appLow', label: "The app's from", unit: 'row', width: 14 }, { key: 'appHigh', label: "The app's to", unit: 'row', width: 14 },
  { key: 'checkLow', label: 'Check (from)', check: ['low', 'appLow'], width: 12 }, { key: 'checkHigh', label: 'Check (to)', check: ['high', 'appHigh'], width: 12 },
  { key: 'wide', label: 'Wide enough to show', unit: 'text', width: 12 }, { key: 'appWide', label: "The app's", unit: 'text', width: 10 },
  { key: 'checkWide', label: 'Check', check: ['wide', 'appWide'], width: 10 },
];
export const RANGES_REPORT = {
  tab: 'Ranges', prefix: 'Rg',
  about: 'How sure each key number is (M9R): its likely value, and how far it could move while some numbers are still a guess. Each row of What widens it below is one input at its low and at its high; the ranges add up their swings as the root of the sum of their squares. Change a Status on an input tab (Know it, Roughly, Guess) and the ranges move. The debt-free month at each end, and the months the surplus pays debt first, are the app\'s (the month-by-month debt plan).',
  tables: c => {
    let R = null;
    try { R = c.ranges(); } catch { R = null; }
    const unit = { fi: 'months', df: 'months', ef: 'years', sur: 'money', nw: 'money' }; // years: one decimal, as the app shows months of spending
    const block = { title: 'Ranges on the key outputs (M9R)', columns: BLOCK_COLUMNS, sections: [{ title: null, rows: Object.keys(LIKELY).map(o => {
      const r = R?.[OUT_KEYS[o]] ?? null;
      return { unit: unit[o], cells: {
        what: { v: OUT_NAMES[o] },
        likely: { f: `IF(ISNUMBER(${LIKELY[o]}),${LIKELY[o]},"")`, name: `${o}Likely` },
        low: { f: endFormula(o, 'low'), name: `${o}Low` }, high: { f: endFormula(o, 'high'), name: `${o}High` },
        appLow: { v: r?.low ?? null }, appHigh: { v: r?.high ?? null },
        wide: { f: `IF(${materialFormula(o)}=1,"Yes","No")`, name: `${o}Wide` }, appWide: { v: r ? (r.material ? 'Yes' : 'No') : 'No' },
      } };
    }) }] };
    const rows = widenRows(c);
    const widen = { title: 'What widens it: each input at its low and at its high', note: 'The columns to the right (grouped) are the working: what moves with the input, the FI path at each end, and each swing squared.',
      columns: widenColumns(rawChanges(c.m).length), names: WIDEN_NAMES, sections: [{ title: null, rows: rows.length ? rows : [{ cells: { what: { v: 'Nothing typed yet that could move a range' } } }] }] };
    // The plan from an age (M9A): what fills a blank core input until it is answered, marked typical, never the client's.
    const core = [['income', 'Pay, gross a year'], ['spending', 'Spending a month'], ['cash', 'Checking and savings'], ['invested', 'Invested, all accounts'], ['card', 'Card balances']];
    const plan = [['fi', 'FI date (months from now)'], ['debtFree', 'Debt free (months from now)'], ['efMonths', 'Emergency fund, months of spending held'], ['surplus', 'Monthly surplus']];
    const age = { title: 'The plan from your age: typical numbers until each one is answered (M9A)', note: 'Typical for the age, the place and Solo or Couple (Assumptions: the Priors tables). A typical number is never counted as the client\'s: it only fills a blank box for the plan from an age. The plan run on them is the app\'s (the whole plan again with each typical number at its low and its high).',
      columns: [{ key: 'what', label: 'Core input', unit: 'text', width: 34 }, { key: 'typical', label: 'Typical (fills it while blank)', unit: 'money', width: 14 }, { key: 'answered', label: 'Answered', unit: 'text', width: 14 }, { key: 'low', label: 'Plan from the age: could be from (from the app)', unit: 'row', width: 14 }, { key: 'high', label: 'To (from the app)', unit: 'row', width: 14 }],
      sections: [{ title: null, rows: [
        ...core.map(([k, label]) => ({ cells: { what: { v: label }, typical: { f: `Math_M9A_typical_${k}` }, answered: { f: `Math_M9A_answered_${k}` } } })),
        ...plan.map(([k, label]) => ({ unit: k === 'surplus' ? 'money' : k === 'efMonths' ? 'years' : 'months', cells: { what: { v: label }, low: { f: `IF(Math_M9A_${k}Low="","",Math_M9A_${k}Low)` }, high: { f: `IF(Math_M9A_${k}High="","",Math_M9A_${k}High)` } } })),
      ] }] };
    return [block, age, widen];
  },
};
