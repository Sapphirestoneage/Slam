// SPDX-License-Identifier: AGPL-3.0-only
// The hand-built projection spreadsheets (Batch 50, ROADMAP Phase 5 "done means"): for Maya, Alexis, Tom and Priya
// and Dev (couple-joint), the projection worked out again in a real xlsx with plain formulas, the way a coach would
// build it by hand: the typed numbers on Inputs, year 1 month by month (a debt's interest and payment, the surplus,
// cash, invested), then years 1 to 30 with closed-form formulas (an amount a month for n months grows to
// f x (g^n - 1) / (g - 1); a loan's balance from FV, its months from NPER). test/projection.test.js builds them fresh,
// lets LibreOffice recalculate every formula (its own profile) and checks the engine (js/math/projection.js, M9P)
// against them: to the dollar in year 1, within 1% at year 30.
//   node tools/projection/build.mjs     writes docs/engines/projection-check/<id>.xlsx (recalculated when LibreOffice is here)
// What the sheet takes from the app, each labelled on Inputs: big e and FOO step 1 still to fill (the cash layers,
// M68), this year's Tax-Free Growth room (flow.js), and take-home once work stops (SLAM's tax function, M10). Everything
// else is typed numbers and formulas.
import { readFileSync, mkdirSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importFile } from '../../js/records.js';
import { metrics } from '../../js/math/metrics.js';
import { project } from '../../js/math/projection.js';
import { loadExcel, soffice } from '../workbook-check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REF = JSON.parse(readFileSync(join(root, 'data', 'reference-2026.json'), 'utf8'));
export const NOW = new Date('2026-11-05T12:00:00.000Z'); // the personas' moment (tools/personas/build.mjs)
export const CHECK_IDS = ['maya', 'alexis', 'tom', 'couple-joint'];
export const OUT_DIR = join(root, 'docs', 'engines', 'projection-check');
export const personaDoc = id => { const r = importFile(readFileSync(join(root, 'fixtures', 'personas', `${id}.json`), 'utf8')); return r.doc ?? r; };
const PAYS = { week: 52, '2 weeks': 26, 'twice a month': 24, month: 12 };

// The numbers the sheet starts from, read the way every screen reads the household (metrics, M27).
export function sheetInputs(doc, ref = REF, now = NOW) {
  const m = metrics(doc, ref, { now }), x = m.inputs, P = project(doc, ref, { now, m });
  const job = x.income.find(i => i.r === x.link.job), v = job?.r.values ?? {};
  const tiers = x.link.incomeTiers || [];
  const me = P.people[0];
  const earner = P.people.find(p => x.income.some(i => (i.r.owner ?? 'Me') === p.key && ['Job', 'Partner job', 'Side hustle', 'Self-employed', 'Platform'].includes(i.r.type))) ?? me;
  const debts = m.debtPlan.debts.map((d, i) => ({ ...d, order: i }));
  const nowYm = now.toISOString().slice(0, 7);
  const B = P.start;
  return {
    name: doc.profile?.firstName ?? doc.id, nowYear: Number(nowYm.slice(0, 4)), nowMonth: Number(nowYm.slice(5, 7)),
    birthYear: Math.floor(earner.bornIndex / 12), birthMonth: (earner.bornIndex % 12) + 1, stopAge: earner.stopAge, meBirthYear: Math.floor(me.bornIndex / 12), meBirthMonth: (me.bornIndex % 12) + 1,
    takeHome: x.takeHome, spending: x.spending, debtOut: x.debtPaymentsOutsideSpending ?? 0, sinking: x.sinkingMonthly ?? 0,
    gross: job?.gross ?? 0, pct: v.contributionPct ?? x.link.incomePct ?? 0, hsaPerPay: x.gates.hsa ? v.hsaFsa ?? 0 : 0, paychecks: PAYS[v.payFrequency] ?? 26,
    matchPct: tiers[0]?.rate ?? 0, matchCap: tiers[0]?.upTo ?? 0, // one tier for these four (more tiers: the match formula on the Math tab)
    contributions: m.investing.contributions ?? 0, goal: x.goalSaving ?? 0, investSurplus: m.investing.investSurplus ? 1 : 0, debtRule: m.debtRule.on ? 1 : 0,
    cash: B.cash, setAside: B.setAside, invested: B.invested, earmarked: B.earmarked, other: B.netWorth - B.cash - B.setAside - B.invested - B.earmarked + B.debt, // things and other accounts (no growth)
    realReturn: x.realReturn, extra: m.debtPlan.extra ?? 0,
    bigELeft: m.fooFlow ? m.fooFlow.bigELeft : 0, firstLeft: m.debtRule.firstLeft ?? 0, flow: m.fooFlow ? 1 : 0,
    takeHomeAfter: P.schedule.takeHomeAfterStop ?? x.takeHome,
    debts, alreadyIn: m.investing.alreadyIn,
  };
}

const COL = n => { let s = ''; for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

// The workbook, as ExcelJS objects (formulas only, no cached values).
export function buildBook(ExcelJS, id, I) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SLAM'; wb.calcProperties = { fullCalcOnLoad: true };
  const names = [];
  const bold = { font: { bold: true } };
  // ---------- Inputs ----------
  const inp = wb.addWorksheet('Inputs');
  inp.columns = [{ width: 52 }, { width: 16 }, { width: 70 }];
  inp.addRow(['Projection check: ' + I.name + ' (' + id + ')', null, 'Made-up household. Every number below is typed from the household or worked out with a formula.']).font = { bold: true };
  inp.addRow(['Input', 'Value', 'Where it comes from']).font = { bold: true };
  const put = (name, label, value, note) => { const r = inp.addRow([label, value, note]); names.push([name, `'Inputs'!$B$${r.number}`]); return r; };
  const f = s => ({ formula: s });
  put('NowYear', 'This year', I.nowYear, 'Today: Nov 5 2026');
  put('NowMonth', 'This month (1 to 12)', I.nowMonth, '');
  put('BirthYear', 'Birth year of the person whose pay stops', I.birthYear, 'About you');
  put('BirthMonth', 'Birth month', I.birthMonth, 'About you');
  put('StopAge', 'Work stops at this age', I.stopAge, 'Plan › Retire by or the FI age (65 when blank)');
  put('MeBirthYear', 'Client birth year', I.meBirthYear, 'About you');
  put('MeBirthMonth', 'Client birth month', I.meBirthMonth, 'About you');
  put('TakeHome', 'Take-home a month', I.takeHome, 'Income');
  put('Spending', 'Spending a month', I.spending, 'The gut number (Budget)');
  put('DebtOut', 'Debt payments outside spending, a month', I.debtOut, 'Debt (the gut number leaves them out)');
  put('Sinking', 'Sinking funds a month', I.sinking, 'Next 12 months');
  put('Gross', 'Gross pay a year (the job the 401(k) is on)', I.gross, 'Income');
  put('Pct', '401(k) share of pay', I.pct, 'Income');
  put('HsaPerPay', 'HSA from each paycheck', I.hsaPerPay, 'Income');
  put('Paychecks', 'Paychecks a year', I.paychecks, 'Income');
  put('MatchPct', 'Employer match rate', I.matchPct, 'Income');
  put('MatchCap', 'Match on pay up to', I.matchCap, 'Income');
  put('Contributions', 'Saved into accounts out of the surplus, a month', I.contributions, 'Accounts (after-tax contributions) and Retirement lines');
  put('Goal', 'Into a 529 or a goal account, a month', I.goal, 'Accounts');
  put('Cash0', 'Cash today (not set aside for taxes)', I.cash, 'Accounts');
  put('SetAside', 'Set aside for taxes', I.setAside, 'Accounts');
  put('Invested0', 'Invested today (529 and goal money left out)', I.invested, 'Accounts');
  put('Earmarked0', '529 and goal accounts today', I.earmarked, 'Accounts');
  put('Things', 'Home, car and other things, and other accounts (no growth in real terms)', I.other, 'Net worth');
  put('RealRet', 'Return a year after inflation', I.realReturn, 'Plan › Assumptions');
  put('BigELeft', 'Big e still to fill', I.bigELeft, 'From the app: the cash layers (M68), Rule of 5 target less cash already in the layers');
  put('FirstLeft', 'FOO step 1 still to fill (buffer and little e)', I.firstLeft, 'From the app: the cash layers (M68)');
  put('Flow', 'The FOO flow runs (1: the surplus is invested and is not short)', I.flow, 'Plan › Goals: Invest my surplus');
  put('DebtRule', 'Surplus to heavy debt first (1 yes)', I.debtRule, 'Plan › Goals');
  put('THAfter', 'Take-home a month once work stops', I.takeHomeAfter, 'From the app: SLAM\'s tax function (M10) on the income that keeps going');
  put('Extra', 'Extra to debt a month', I.extra, 'Debt payoff');
  inp.addRow([]); inp.addRow(['Worked out', null, null]).font = { bold: true };
  put('Gm', 'Growth a month', f('(1+RealRet)^(1/12)'), '(1 + return)^(1/12), as the FI date (M53) grows it');
  put('Surplus', 'Surplus a month', f('TakeHome-Spending-DebtOut-Sinking'), 'Take-home less spending, debt outside it and sinking funds (M27)');
  put('Payroll', 'Into the 401(k) and HSA from pay, and the match, a month', f('Gross*Pct/12+HsaPerPay*Paychecks/12+MIN(Pct,MatchCap)*MatchPct*Gross/12'), 'Gross x share / 12 + HSA x paychecks / 12 + match');
  put('SF', 'Surplus the FOO routes, a month', f('Surplus-Contributions-Goal'), 'Surplus less what is already saved out of it');
  put('NowIdx', 'This month as a number', f('NowYear*12+NowMonth-1'), 'year x 12 + month - 1');
  put('TMonths', 'Months until work stops', f('MAX(0,(BirthYear+StopAge)*12+BirthMonth-1-NowIdx)'), 'From the birth month and the stop age');
  // ---------- Debts: each segment between two payoffs (Debt plan tab) ----------
  const D = I.debts;
  const dp = wb.addWorksheet('Debt plan');
  dp.columns = [{ width: 34 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
  dp.addRow(['Each debt: balance, APR, payment, heavy (1) and its place in the payoff order. A debt paid off passes its payment to the next one in the order (the plan, M34); the surplus goes to heavy debt first.']);
  dp.addRow(['Debt', 'Balance', 'APR', 'Payment', 'Heavy', 'Order', 'Paid off (month)']).font = { bold: true };
  const dn = (i, k) => `Debt${i + 1}_${k}`;
  D.forEach((d, i) => {
    const r = dp.addRow([d.name, d.balance, d.apr, d.payment, d.heavy ? 1 : 0, d.order + 1, null]);
    for (const [k, c] of [['Bal', 'B'], ['Apr', 'C'], ['Pmt', 'D'], ['Heavy', 'E']]) names.push([dn(i, k), `'Debt plan'!$${c}$${r.number}`]);
    names.push([dn(i, 'End'), `'Debt plan'!$G$${r.number}`]);
  });
  // Segments, in the order the debts finish (the plan says which finishes first; the months come from NPER here).
  const finish = [...D].filter(d => d.paidOffMonth != null).sort((a, b) => a.paidOffMonth - b.paidOffMonth || a.order - b.order).map(d => D.indexOf(d));
  dp.addRow([]); dp.addRow(['Segment: from the month one debt is gone until the next is gone']).font = { bold: true };
  const segHead = dp.addRow(['', 'Starts (month)', 'Ends (month)', ...D.map(d => `${d.name}: pays a month`), ...D.map(d => `${d.name}: owed at start`)]);
  segHead.font = { bold: true };
  const segs = [];
  let startName = '0';
  const done = new Set();
  const heavyToDebt = 'IF(DebtRule=1,MAX(0,SF),0)'; // the surplus to heavy debt (the gut and FOO step 1 months aside: none for these four)
  finish.forEach((fi, j) => {
    const open = D.map((d, i) => !done.has(i));
    // the pool: payments of debts already gone roll to the first open debt of the same kind in the order; the surplus goes to the first open heavy debt
    const firstOpen = heavy => D.map((d, i) => i).filter(i => open[i] && !!D[i].heavy === heavy).sort((a, b) => D[a].order - D[b].order)[0];
    const pays = D.map((d, i) => {
      if (!open[i]) return '0';
      let s = dn(i, 'Pmt');
      const heavyFirst = firstOpen(true), lowFirst = firstOpen(false);
      const goneSame = [...done].filter(q => !!D[q].heavy === !!d.heavy).map(q => dn(q, 'Pmt'));
      if (d.heavy && i === heavyFirst) { s += `+${heavyToDebt}`; if (goneSame.length) s += `+${goneSame.join('+')}`; }
      if (!d.heavy && i === lowFirst) { s += '+Extra'; if (goneSame.length) s += `+${goneSame.join('+')}`; if (!I.debtRule) { const goneHeavy = [...done].filter(q => D[q].heavy).map(q => dn(q, 'Pmt')); if (goneHeavy.length) s += `+${goneHeavy.join('+')}`; } }
      return s;
    });
    const row = dp.addRow([`Segment ${j + 1}`, null, null, ...D.map(() => null), ...D.map(() => null)]);
    const R = row.number;
    names.push([`Seg${j + 1}_Start`, `'Debt plan'!$B$${R}`], [`Seg${j + 1}_End`, `'Debt plan'!$C$${R}`]);
    row.getCell(2).value = f(startName);
    D.forEach((d, i) => {
      row.getCell(4 + i).value = f(pays[i]); names.push([`Seg${j + 1}_Pay${i + 1}`, `'Debt plan'!$${COL(3 + i)}$${R}`]);
      const prev = j === 0 ? dn(i, 'Bal') : `Seg${j}_Owed${i + 1}`;
      // owed at this segment's start: last segment's start balance grown and paid down (FV), less what the debt that
      // just finished had left over from its last payment (it rolls to the next debt that same month).
      let owed;
      if (j === 0) owed = dn(i, 'Bal');
      else if (!open[i]) owed = '0';
      else {
        const gone = finish[j - 1];
        const left = `(Seg${j}_Pay${gone + 1}-(-FV(${dn(gone, 'Apr')}/12,Seg${j}_End-Seg${j}_Start-1,-Seg${j}_Pay${gone + 1},Seg${j}_Owed${gone + 1}))*(1+${dn(gone, 'Apr')}/12))`;
        const takes = D[gone].heavy ? (!!d.heavy && i === firstOpen(true)) : (!d.heavy && i === firstOpen(false));
        owed = `MAX(0,-FV(${dn(i, 'Apr')}/12,Seg${j}_End-Seg${j}_Start,-Seg${j}_Pay${i + 1},${prev})${takes ? `-${left}` : ''})`;
      }
      row.getCell(4 + D.length + i).value = f(owed); names.push([`Seg${j + 1}_Owed${i + 1}`, `'Debt plan'!$${COL(3 + D.length + i)}$${R}`]);
    });
    row.getCell(3).value = f(`Seg${j + 1}_Start+ROUNDUP(NPER(${dn(fi, 'Apr')}/12,-Seg${j + 1}_Pay${fi + 1},Seg${j + 1}_Owed${fi + 1}),0)`);
    segs.push({ j: j + 1, fi });
    done.add(fi);
    startName = `Seg${j + 1}_End`;
  });
  // each debt's payoff month on its row
  D.forEach((d, i) => { const s = segs.find(q => q.fi === i); dp.getCell(`G${3 + i}`).value = s ? f(`Seg${s.j}_End`) : 'Never'; });
  const last = segs.at(-1);
  put('DebtFree', 'Debt free (month)', f(last ? `Seg${last.j}_End` : '0'), 'The last segment\'s end (Debt plan)');
  const heavyIdx = D.map((d, i) => i).filter(i => D[i].heavy);
  const heavySeg = heavyIdx.length ? segs.find(q => q.fi === heavyIdx.sort((a, b) => (D[b].paidOffMonth ?? 1e9) - (D[a].paidOffMonth ?? 1e9))[0]) : null;
  put('HMonths', 'Heavy debt gone (month; 0 when none or the rule is off)', f(heavyIdx.length && I.debtRule ? (heavySeg ? `Seg${heavySeg.j}_End` : '100000') : '0'), 'Debt plan');
  put('Freed', 'Heavy payments freed once heavy debt is gone, a month', f(I.debtRule && heavyIdx.length ? heavyIdx.map(i => dn(i, 'Pmt')).join('+') : '0'), 'They follow the FOO (M79)');
  put('Ended', 'Payments that come back once every debt is gone, a month', f([...D.map((d, i) => (I.debtRule && d.heavy ? null : dn(i, 'Pmt'))).filter(Boolean), 'Extra'].join('+')), 'Plan mode: the low-rate payments the plan was still rolling');
  put('LastPay', 'Left over from the last debt\'s last payment', f(last ? `Seg${last.j}_Pay${last.fi + 1}-(-FV(${dn(last.fi, 'Apr')}/12,Seg${last.j}_End-Seg${last.j}_Start-1,-Seg${last.j}_Pay${last.fi + 1},Seg${last.j}_Owed${last.fi + 1}))*(1+${dn(last.fi, 'Apr')}/12)` : '0'), 'It stays in checking');
  put('FMonths', 'FOO step 1 months (the surplus fills the buffer and little e)', f('IF(AND(DebtRule=1,FirstLeft>0.5,MAX(0,SF)>0),ROUNDUP(FirstLeft/MAX(0,SF),0),0)'), 'Before heavy debt');
  put('WMonths', 'Months before the surplus is invested (heavy debt, then big e)', f('IF(Flow=1,HMonths+IF(BigELeft>0.5,ROUNDUP(BigELeft/(SF+Freed),0),0),HMonths)'), 'Big e left over the surplus plus the freed payments (M79)');
  put('Wait', 'Going into investments a month before then', f('Payroll+Contributions'), 'Payroll saving, the match and contributions (M53)');
  put('Pinv', 'Going into investments a month after', f('Payroll+Contributions+MAX(0,SF+Freed)'), 'Plus the surplus and the freed payments');
  put('N1', 'Drawn a month once work stops, before the debts are gone', f('Spending+DebtOut+Sinking-THAfter-Freed'), 'Spending less the take-home that keeps going');
  put('N2', 'Drawn a month once work stops and the debts are gone', f('N1-Ended'), '');
  put('Need0', 'Short a month while working, while heavy debt is paid', f('MAX(0,-SF)'), 'No borrowing: cash covers it while it lasts, then it is not covered');
  put('Need1', 'Short a month while working, after', f('MAX(0,-(SF+Freed))'), '');
  // ---------- Year 1, month by month ----------
  const y1 = wb.addWorksheet('Year 1');
  const heads = ['Month', 'k', 'Phase', 'Surplus', 'To route', ...D.flatMap(d => [`${d.name} owed`, `${d.name} interest`, `${d.name} paid`]), 'Unused debt money', 'Short', 'Cash', 'Not covered', 'Invested', 'Earmarked', 'Debt', 'Net worth'];
  y1.addRow(['Year 1, a month at a time (k is months from now; the month\'s growth comes first, then its money, as M53)']);
  y1.addRow(heads).font = { bold: true };
  y1.columns = heads.map(() => ({ width: 14 }));
  const cIdx = Object.fromEntries(heads.map((h, i) => [h, COL(i)]));
  for (let k = 0; k < 12; k++) {
    const R = 3 + k, P = R - 1, first = k === 0;
    const c = h => `${cIdx[h]}${R}`, p = h => `${cIdx[h]}${P}`;
    const row = y1.getRow(R);
    row.getCell(1).value = k + 1; row.getCell(2).value = k;
    const set = (h, s) => { y1.getCell(c(h)).value = f(s); };
    set('Phase', `IF(B${R}<FMonths,"cash",IF(B${R}<HMonths,"debt",IF(B${R}<WMonths,"cash","invest")))`);
    set('Surplus', `Surplus+IF(B${R}>=DebtFree,Ended,0)*(DebtFree>0)`);
    set('To route', `${c('Surplus')}-Contributions-Goal+IF(B${R}>=HMonths,Freed,0)`);
    const paidCells = [];
    D.forEach((d, i) => {
      const owed = c(`${d.name} owed`), int = c(`${d.name} interest`), paid = c(`${d.name} paid`);
      const start = first ? dn(i, 'Bal') : `(${p(`${d.name} owed`)}+${p(`${d.name} interest`)}-${p(`${d.name} paid`)})`;
      set(`${d.name} owed`, `MAX(0,${start})`);
      set(`${d.name} interest`, `IF(${owed}>0.005,${owed}*${dn(i, 'Apr')}/12,0)`);
      // what this debt is paid this month: its segment's payment (the segment the month is in)
      const segPay = segs.length ? segs.reduceRight((acc, s) => `IF(B${R}<Seg${s.j}_End,Seg${s.j}_Pay${i + 1},${acc})`, '0') : dn(i, 'Pmt');
      set(`${d.name} paid`, `MIN(${owed}+${int},${segPay})`);
      paidCells.push(paid);
    });
    const budget = segs.length ? segs.reduceRight((acc, s) => `IF(B${R}<Seg${s.j}_End,${D.map((d, i) => `Seg${s.j}_Pay${i + 1}`).join('+')},${acc})`, '0') : '0';
    set('Unused debt money', D.length ? `IF(B${R}<DebtFree,MAX(0,${budget}-(${paidCells.join('+')})),0)` : '0');
    set('Short', `IF(${c('Phase')}="debt",Need0,IF(${c('To route')}<0,-${c('To route')},0))`);
    const prevCash = first ? 'Cash0' : p('Cash');
    set('Cash', `MAX(0,${prevCash}-${c('Short')})+IF(AND(${c('Phase')}="cash",${c('To route')}>0),${c('To route')},0)+${c('Unused debt money')}`);
    set('Not covered', `${first ? '0' : p('Not covered')}+MAX(0,${c('Short')}-${prevCash})`);
    set('Invested', `${first ? 'Invested0' : p('Invested')}*Gm+Payroll+Contributions+IF(AND(${c('Phase')}="invest",${c('To route')}>0),${c('To route')},0)`);
    set('Earmarked', `${first ? 'Earmarked0' : p('Earmarked')}*Gm+Goal`);
    set('Debt', D.length ? D.map(d => `(${c(`${d.name} owed`)}+${c(`${d.name} interest`)}-${c(`${d.name} paid`)})`).join('+') : '0');
    set('Net worth', `${c('Cash')}+SetAside+${c('Invested')}+${c('Earmarked')}+Things-${c('Debt')}`);
  }
  // ---------- Years 1 to 30 ----------
  const ys = wb.addWorksheet('Years');
  const yh = ['Year', 'Months to its end', 'Age at its end', 'Cash before work stops', 'Cash', 'Not covered (so far)', 'Invested', 'Earmarked', 'Debt', 'Net worth'];
  ys.addRow(['Years 1 to 30. An amount a month over months a to b of a year ending at month e grows to f x g^(e - b) x (g^(b - a) - 1) / (g - 1).']);
  ys.addRow(yh).font = { bold: true };
  ys.columns = yh.map(() => ({ width: 16 }));
  const yc = Object.fromEntries(yh.map((h, i) => [h, COL(i)]));
  // FVseg(f, a, b): what f a month over months [a, b) of this year (months A to E) is worth at E.
  const seg = (fa, a, b, A, E) => `IF(MIN(${b},${E})>MAX(${a},${A}),(${fa})*Gm^(${E}-MIN(${b},${E}))*(Gm^(MIN(${b},${E})-MAX(${a},${A}))-1)/(Gm-1),0)`;
  const months = (a, b, A, E) => `MAX(0,MIN(${b},${E})-MAX(${a},${A}))`;
  // cash before work stops, at month E: today's cash, FOO step 1 and big e money, the last debt's leftover, less what
  // a short month took (no borrowing)
  const cashPre = E => `(Cash0+IF(Flow=1,MAX(0,SF)*${months('0', 'FMonths', '0', E)}+(SF+Freed)*${months('HMonths', 'WMonths', '0', E)},0)+IF(AND(DebtFree>0,${E}>=DebtFree),LastPay,0)-Need0*MIN(${E},HMonths)-Need1*MAX(0,MIN(${E},TMonths)-HMonths))`;
  put('CashT', 'Cash the month work stops', f(`MAX(0,${cashPre('TMonths')})`), 'Cash goes first once work stops');
  put('NT', 'Drawn a month just after work stops', f('IF(TMonths>=DebtFree,N2,N1)'), '');
  put('XMonth', 'Month the cash runs out once work stops', f('TMonths+CashT/NT'), 'Then the investments pay (withdrawal order: cash, then the accounts)');
  for (let y = 1; y <= 30; y++) {
    const R = 2 + y, P = R - 1, first = y === 1;
    const A = `${12 * (y - 1)}`, E = `${12 * y}`;
    const c = h => `${yc[h]}${R}`, p = h => `${yc[h]}${P}`;
    ys.getCell(c('Year')).value = y;
    ys.getCell(c('Months to its end')).value = 12 * y;
    ys.getCell(c('Age at its end')).value = f(`INT((NowIdx+${E}-1-(MeBirthYear*12+MeBirthMonth-1))/12)`);
    ys.getCell(c('Cash before work stops')).value = f(cashPre(`MIN(${E},TMonths)`));
    ys.getCell(c('Cash')).value = f(`IF(${E}<=TMonths,MAX(0,${c('Cash before work stops')}),MAX(0,CashT-NT*(${E}-TMonths)))`);
    ys.getCell(c('Not covered (so far)')).value = f(`MAX(0,-${c('Cash before work stops')})`);
    const prevInv = first ? 'Invested0' : p('Invested');
    // the last debt's leftover, when it lands after the cash is gone, takes that much off the next month's draw
    const lastBack = `IF(AND(DebtFree>0,DebtFree>=TMonths,DebtFree>INT(XMonth)),${seg('LastPay', 'DebtFree', 'DebtFree+1', A, E)},0)`;
    const draws = [seg('(1-(XMonth-INT(XMonth)))*IF(INT(XMonth)>=DebtFree,N2,N1)', 'INT(XMonth)', 'INT(XMonth)+1', A, E), seg('N1', 'INT(XMonth)+1', 'MAX(DebtFree,INT(XMonth)+1)', A, E), seg('N2', 'MAX(DebtFree,INT(XMonth)+1)', '100000', A, E), `-${lastBack}`].join('+');
    ys.getCell(c('Invested')).value = f(`${prevInv}*Gm^12+${seg('Wait', '0', 'MIN(WMonths,TMonths)', A, E)}+${seg('Pinv', 'WMonths', 'TMonths', A, E)}+IF(DebtFree>0,${seg('Ended', 'MAX(DebtFree,WMonths)', 'TMonths', A, E)},0)-(${draws})`);
    ys.getCell(c('Earmarked')).value = f(`${first ? 'Earmarked0' : p('Earmarked')}*Gm^12+${seg('Goal', '0', 'TMonths', A, E)}`);
    const bal = (i, M) => { // debt i owed at month M, from its segments
      let s = '0';
      for (const q of [...segs].reverse()) s = `IF(${M}<Seg${q.j}_End,MAX(0,-FV(${dn(i, 'Apr')}/12,${M}-Seg${q.j}_Start,-Seg${q.j}_Pay${i + 1},Seg${q.j}_Owed${i + 1})),${s})`;
      return `IF(${M}<=0,${dn(i, 'Bal')},${s})`;
    };
    ys.getCell(c('Debt')).value = f(D.length ? D.map((d, i) => bal(i, E)).join('+') : '0');
    ys.getCell(c('Net worth')).value = f(`${c('Cash')}+SetAside+${c('Invested')}+${c('Earmarked')}+Things-${c('Debt')}`);
  }
  for (const [name, refr] of names) wb.definedNames.add(refr, name);
  return wb;
}

// Recalculate with LibreOffice (its own profile, Nov 6 build notes) and read every value back.
export async function recalculated(ExcelJS, wb, { dir = mkdtempSync(join(tmpdir(), 'slam-proj-')), name = 'book' } = {}) {
  const file = join(dir, `${name}.xlsx`);
  await wb.xlsx.writeFile(file);
  execFileSync(soffice, [`-env:UserInstallation=file://${join(dir, 'lo-profile')}`, '--headless', '--calc', '--convert-to', 'xlsx', '--outdir', join(dir, 'out'), file], { stdio: 'ignore', timeout: 120000 });
  const out = new ExcelJS.Workbook();
  await out.xlsx.readFile(join(dir, 'out', `${name}.xlsx`));
  return { book: out, file: join(dir, 'out', `${name}.xlsx`) };
}
// LibreOffice writes a formula's 0 with no cached value, which ExcelJS reads as no result (tools/workbook-check.mjs).
export const valueOf = cell => { const v = cell?.value; return v && typeof v === 'object' && !(v instanceof Date) ? (v.formula || v.sharedFormula ? v.result ?? v.error ?? 0 : v.result ?? null) : v; };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ExcelJS = loadExcel();
  if (!ExcelJS) { console.error('ExcelJS is not installed (npm install)'); process.exit(1); }
  mkdirSync(OUT_DIR, { recursive: true });
  for (const id of CHECK_IDS) {
    const wb = buildBook(ExcelJS, id, sheetInputs(personaDoc(id)));
    if (soffice) { const dir = mkdtempSync(join(tmpdir(), 'slam-proj-')); const { file } = await recalculated(ExcelJS, wb, { dir, name: id }); copyFileSync(file, join(OUT_DIR, `${id}.xlsx`)); rmSync(dir, { recursive: true, force: true }); }
    else await wb.xlsx.writeFile(join(OUT_DIR, `${id}.xlsx`));
    console.log(`${id}.xlsx${soffice ? ' (recalculated)' : ''}`);
  }
}
