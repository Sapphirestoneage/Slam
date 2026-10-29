// M40 to M44: net worth, liquid net worth, runway, Rule of 5, contribution limits.
import { ok, needs, missing, fmt, isBlank } from './result.js';

const sum = (list, f) => list.reduce((s, x) => s + (f(x) ?? 0), 0);

// M40: assets (vested only) minus debts.
export function netWorth({ assets, debts }) {
  if (!assets.length && !debts.length) return needs('M40', ['an account or a debt']);
  const a = sum(assets, x => (isBlank(x.unvested) ? x.value : x.value - x.unvested));
  const d = sum(debts, x => x.balance);
  const v = a - d;
  const plus = assets.filter(x => !isBlank(x.value)).map(x => `${fmt.money(x.value)} ${x.name}`).join(' + ');
  const minus = debts.filter(x => !isBlank(x.balance)).map(x => ` ${'−'} ${fmt.money(x.balance)} ${x.name}`).join('');
  return ok('M40', v, `${plus || '$0 of assets'}${minus} = ${fmt.money(v)}.`);
}

// M41: cash + taxable brokerage + Roth contribution basis minus consumer debt.
export function liquidNetWorth({ cash, brokerage = 0, rothBasis = 0, consumerDebt = 0 }) {
  if (isBlank(cash)) return needs('M41', ['cash']);
  const v = cash + brokerage + rothBasis - consumerDebt;
  return ok('M41', v, `${fmt.money(cash)} cash + ${fmt.money(brokerage)} brokerage + ${fmt.money(rothBasis)} Roth contributions ${'−'} ${fmt.money(consumerDebt)} consumer debt = ${fmt.money(v)}. Home, car and retirement growth are left out.`);
}

// M42: runway months.
export function runway({ cash, spending, fixedFloor = null }) {
  const m = missing({ cash, spending });
  if (m.length) return needs('M42', m, { unit: 'months' });
  if (spending <= 0) return needs('M42', ['spending'], { unit: 'months' });
  const v = cash / spending;
  const floor = fixedFloor ? cash / fixedFloor : null;
  return { ...ok('M42', v, `${fmt.money(cash)} cash divided by ${fmt.money(spending)} spending a month = ${fmt.number(v, 1)} months.${floor ? ` On the fixed floor alone: ${fmt.number(floor, 1)} months.` : ''}`, { unit: 'months' }), onFloor: floor };
}

// M43: Rule of 5.
export function ruleOf5({ age, spending, emergencyCash = null }) {
  if (isBlank(age)) return needs('M43', ['age'], { unit: 'months' });
  const months = age / 5;
  if (isBlank(spending)) return { ...needs('M43', ['spending']), months };
  const target = months * spending;
  const keepPace = spending / 60;
  const gap = isBlank(emergencyCash) ? null : target - emergencyCash;
  return { ...ok('M43', target, `Age ${age} divided by 5 = ${fmt.number(months, 1)} months. ${fmt.number(months, 1)} x ${fmt.money(spending)} spending = ${fmt.money(target)}. To keep pace as you age, add ${fmt.money(keepPace)} a month (spending divided by 60).${gap === null ? '' : ` Gap: ${fmt.money(gap)}.`}`), months, keepPace, gap };
}

// M44: share of this year's limit used.
export function limitUsed({ contributions, type, age }, ref) {
  if (isBlank(contributions)) return needs('M44', ['contributions this year'], { unit: 'pct' });
  const L = ref.limits;
  let limit;
  if (L['401k'].appliesTo.includes(type)) limit = L['401k'].base + (age >= 60 && age <= 63 ? L['401k'].catchUp60to63 : age >= 50 ? L['401k'].catchUp50 : 0);
  else if (L.ira.appliesTo.includes(type)) limit = L.ira.base + (age >= 50 ? L.ira.catchUp50 : 0);
  else if (type === 'HSA') limit = L.hsa.self + (age >= 55 ? L.hsa.catchUp55 : 0);
  else return needs('M44', ['an account type with a limit'], { unit: 'pct' });
  const v = contributions / limit;
  return { ...ok('M44', v, `${fmt.money(contributions)} put in this year out of the ${fmt.money(limit)} limit = ${fmt.pct(v)}.`, { unit: 'pct' }), limit };
}
