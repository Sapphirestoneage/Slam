// Quick add (R106): 'Netflix 15.99 monthly' or 'Chase card 3200 at 24%' picks the type and section; you confirm.

const PERIODS = [
  [/\b(every (2|two) weeks|biweekly|bi-weekly|fortnightly)\b/i, '2 weeks'],
  [/\b(twice a month|semi-?monthly)\b/i, 'twice a month'],
  [/\b(weekly|a week|per week|\/wk|\/week)\b/i, 'week'],
  [/\b(yearly|annual|annually|a year|per year|\/yr|\/year)\b/i, 'year'],
  [/\b(per paycheck|a paycheck|each paycheck)\b/i, 'paycheck'],
  [/\b(monthly|a month|per month|\/mo|\/month)\b/i, 'month'],
];
const KINDS = [
  { re: /\b(card|amex|visa|mastercard|discover)\b/i, kind: 'debt', type: 'Credit card', section: 'My Money › Debt' },
  { re: /\bstudent loan\b|\bnavient\b|\bnelnet\b|\bsallie\b/i, kind: 'debt', type: 'Student loan', section: 'My Money › Debt' },
  { re: /\b(car|auto) loan\b/i, kind: 'debt', type: 'Car loan', section: 'My Money › Debt' },
  { re: /\b(personal loan|loan)\b/i, kind: 'debt', type: 'Personal loan', section: 'My Money › Debt' },
  { re: /\b(401\(?k\)?|403\(?b\)?|roth|ira|brokerage|hsa|529)\b/i, kind: 'account', group: 'investment', section: 'My Money › Assets' },
  { re: /\b(savings|checking|hysa|money market|cd)\b/i, kind: 'account', group: 'cash', section: 'My Money › Assets' },
  { re: /\b(paycheck|salary|wages|job|side hustle|income)\b/i, kind: 'income', section: 'My Money › Income' },
];
const INVEST_TYPES = { '401k': '401(k)', '401(k)': '401(k)', '403b': '403(b)', '403(b)': '403(b)', roth: 'Roth IRA', ira: 'Traditional IRA', brokerage: 'Brokerage', hsa: 'HSA', '529': '529' };

export function parseQuickAdd(text) {
  const raw = (text || '').trim();
  if (!raw) return null;
  let rest = raw;
  let apr = null;
  const aprM = rest.match(/\bat\s+(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%\s*(apr)?/i);
  if (aprM) { apr = Number(aprM[1] ?? aprM[2]) / 100; rest = rest.replace(aprM[0], ' '); }
  let per = null;
  for (const [re, p] of PERIODS) if (re.test(rest)) { per = p; rest = rest.replace(re, ' '); break; }
  const amtM = rest.match(/\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\b/);
  const amount = amtM ? Number(`${amtM[1].replace(/,/g, '')}${amtM[2] ? `.${amtM[2]}` : ''}`) : null;
  if (amtM) rest = rest.replace(amtM[0], ' ');
  const name = rest.replace(/\s+/g, ' ').replace(/\b(at|for|per|a)\s*$/i, '').trim() || null;
  const k = KINDS.find(x => x.re.test(raw));
  if (k?.kind === 'debt') {
    return { kind: 'debt', type: k.type, name, values: { balance: amount, apr }, section: k.section,
      summary: `${k.type}${name ? ` "${name}"` : ''}, balance ${amount ?? 'not given'}${apr !== null ? `, APR ${+(apr * 100).toFixed(2)}%` : ''}` };
  }
  if (k?.kind === 'account') {
    const key = (raw.match(k.re)?.[0] || '').toLowerCase().replace(/\s/g, '');
    const type = k.group === 'cash' ? (/check/i.test(raw) ? 'Checking' : 'Savings or HYSA') : (INVEST_TYPES[key] || 'Other');
    return { kind: 'account', type, name, values: { group: k.group, balance: amount }, section: k.section,
      summary: `${type} account${name ? ` "${name}"` : ''}, balance ${amount ?? 'not given'}` };
  }
  if (k?.kind === 'income') {
    return { kind: 'income', type: 'Job', name, amount, per: per || 'month', section: k.section,
      summary: `Income${name ? ` "${name}"` : ''}, ${amount ?? 'amount not given'} per ${per || 'month'}` };
  }
  return { kind: 'bill', type: null, name, amount, per: per || 'month', section: 'Spending › Budget',
    summary: `Spending line${name ? ` "${name}"` : ''}, ${amount ?? 'amount not given'} per ${per || 'month'}` };
}
