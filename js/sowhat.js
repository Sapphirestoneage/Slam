// Every number says "so what" (polish item 6): one plain sentence of meaning, from the client's side, and one action
// link when something is off. Pure: takes the metrics (and a few extras), returns { text, action: { label, href } }.

const money = v => `$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
const pct = v => `${Math.round(v * 100)}%`;
const extraValue = e => (e?.value === null || e?.value === undefined ? null : e.value);

export function soWhat(key, m, { lowDay = null, first = null, last = null } = {}) {
  const x = m.inputs;
  const r = { netWorth: m.netWorth, surplus: m.surplus, savingsRate: m.savingsRate, fi: m.monthsToFi, liquid: m.liquidNetWorth, runway: m.runwayMonths, housing: m.housingPct, ruleOf5: m.ruleOf5 }[key];
  const v = r?.value ?? null;
  const guessed = x.spendingSource === 'lines' && x.guessLines > 0;
  switch (key) {
    case 'netWorth':
      if (v === null) return null;
      return v < 0 ? { text: 'You owe more than you own right now. Paying down debt moves this up every month.', action: { label: 'See your debts', href: '#/net-worth/debt' } }
        : { text: `What you own minus what you owe: ${money(v)} is yours.` };
    case 'surplus':
      if (v === null) return null;
      if (guessed) return { text: `This counts ${x.guessLines} guessed ${x.guessLines === 1 ? 'line' : 'lines'} on the high side, so it may look lower than it is.`, action: { label: 'Check the guessed lines', href: '#/cash-flow/budget' } };
      if (lowDay) return { text: `Your cash dips below ${money(lowDay.low)} on ${lowDay.label}, even with money left over this month.`, action: { label: 'See the calendar', href: '#/cash-flow/calendar' } };
      return v < 0 ? { text: `You spend ${money(v)} a month more than comes in.`, action: { label: 'Find what to trim', href: '#/cash-flow/budget' } }
        : { text: `What is left each month after everything is paid: ${money(v)} you can save.` };
    case 'savingsRate':
      if (v === null) return null;
      return v < 0.1 ? { text: `You save ${pct(v)} of what comes in. Getting to 10% is the first step.`, action: { label: 'Find money to save', href: '#/cash-flow/budget' } }
        : { text: `You save ${pct(v)} of what comes in${v >= 0.2 ? ', which is strong' : ''}.` };
    case 'fi':
      if (r?.never) return { text: 'At this pace you never quite get there. Saving a little more changes that.', action: { label: 'Try saving more', href: '#/plan/timeline' } };
      if (v === null) return null;
      return { text: `The day work becomes optional: about ${Math.round(v / 12)} years from now, if nothing changes.` };
    case 'liquid':
      if (v === null) return null;
      return v < 0 ? { text: 'Card and other quick debts are bigger than your cash.', action: { label: 'See your debts', href: '#/net-worth/debt' } }
        : { text: `Money you could reach this week, after quick debts: ${money(v)}.` };
    case 'runway':
      if (v === null) return null;
      return v < 3 ? { text: `If the paychecks stopped, your cash would last about ${v.toFixed(1)} months. Three months is a good first goal.`, action: { label: 'See your cash', href: '#/net-worth/assets' } }
        : { text: `If the paychecks stopped, your cash would last about ${v.toFixed(1)} months.` };
    case 'housing':
      if (v === null) return null;
      return v > 0.35 ? { text: `Housing takes ${pct(v)} of your pay, over the 35% line, so the rest has less room.`, action: { label: 'See housing costs', href: '#/cash-flow/budget' } }
        : { text: `Housing takes ${pct(v)} of your pay, inside the 35% line.` };
    case 'ruleOf5':
      if (v === null) return null;
      return x.cash !== null && x.cash < v ? { text: `A safe cushion for you is about ${money(v)}; you have ${money(x.cash)} in cash.`, action: { label: 'See your cash', href: '#/net-worth/assets' } }
        : { text: `A safe cushion for you is about ${money(v)}, and your cash covers it.` };
    case 'netWorthChange': {
      if (first?.netWorth == null || last?.netWorth == null) return null;
      const d = last.netWorth - first.netWorth;
      return d < 0 ? { text: `You are ${money(d)} behind where you started. One rough month can do that; the trend matters more.`, action: { label: 'See what changed', href: '#/report/overview' } }
        : { text: `You are ${money(d)} ahead of where you started.` };
    }
    case 'debtPaid': {
      if (first?.debtTotal == null || last?.debtTotal == null) return null;
      const d = first.debtTotal - last.debtTotal;
      return d < 0 ? { text: `You owe ${money(d)} more than at the first snapshot.`, action: { label: 'See your debts', href: '#/net-worth/debt' } }
        : { text: d ? `${money(d)} of debt is gone since the first snapshot.` : 'Your debt is where it was at the first snapshot.' };
    }
    case 'dti': {
      const d = extraValue(arguments[2]);
      if (d === null) return null;
      return d > 0.36 ? { text: `Debt payments take ${pct(d)} of your pay before tax. Lenders like to see under 36%.`, action: { label: 'See your debts', href: '#/net-worth/debt' } }
        : { text: `Debt payments take ${pct(d)} of your pay before tax.` };
    }
    case 'taxRate': { const t = extraValue(arguments[2]); return t === null ? null : { text: `About ${pct(t)} of your pay goes to tax.` }; }
    case 'util': {
      const u = extraValue(arguments[2]);
      if (u === null) return null;
      return u > 0.3 ? { text: `Your cards are ${pct(u)} used. Under 30% helps your credit score.`, action: { label: 'See your cards', href: '#/net-worth/credit-cards' } }
        : { text: `Your cards are ${pct(u)} used, which helps your credit score.` };
    }
    case 'drafttTop': { const t = arguments[2]?.top; return t ? { text: `${t[0]} takes the biggest share of your pay: ${pct(t[1])}.` } : null; }
    case 'ofFi': { const f = extraValue(arguments[2]); return f === null ? null : { text: `You are ${pct(Math.min(1, f))} of the way to work being optional.` }; }
    default: return null;
  }
}
