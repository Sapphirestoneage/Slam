// SPDX-License-Identifier: AGPL-3.0-only
// Your map: the whole journey as a web. Each thing you tell the app feeds the things it can then show you, and those
// feed the next ones. Pure: no DOM. needs: the nodes that feed this one. go: where tapping it takes you.
export const MAP_TIERS = [['tell', 'What you tell it'], ['plan', 'Your plan'], ['see', 'See it'], ['sharp', 'Make it sharp'], ['decide', 'Decide'], ['long', 'The long view']];
export const MAP_NODES = [
  { id: 'age', tier: 'tell', name: 'Birth year', gives: 'A plan from one tap', go: { stage: 'you' } },
  { id: 'income', tier: 'tell', name: 'Your pay', gives: 'What comes in', go: { stage: 'numbers', q: 'income' } },
  { id: 'spending', tier: 'tell', name: 'Your spending', gives: 'What goes out, and the number that moves your date most', go: { stage: 'numbers', q: 'spending' } },
  { id: 'cash', tier: 'tell', name: 'Your cash', gives: 'How long you could go without pay', go: { stage: 'numbers', q: 'cash' } },
  { id: 'invested', tier: 'tell', name: 'Your investments', gives: 'How far along you are', go: { stage: 'numbers', q: 'invested' } },
  { id: 'card', tier: 'tell', name: 'What you owe', gives: 'What to pay off, and in what order', go: { stage: 'numbers', q: 'card' } },

  { id: 'plan', tier: 'plan', name: 'Your plan', needs: ['age', 'income', 'spending', 'cash', 'invested', 'card'], soft: true, gives: 'The date work becomes optional, and your one next step', go: { stage: 'plan' } },

  { id: 'growth', tier: 'see', name: 'Growth', needs: ['plan'], gives: 'Your money against your freedom number', go: { stage: 'see', flash: 'growth' } },
  { id: 'flow', tier: 'see', name: 'Where it goes', needs: ['income', 'spending'], gives: 'Each month, split', go: { stage: 'see', flash: 'flow' } },
  { id: 'lines', tier: 'see', name: 'Line by line', needs: ['plan'], gives: 'What you put in, growth, cash, debt, net worth', go: { stage: 'see', flash: 'lines' } },
  { id: 'road', tier: 'see', name: 'Over time', needs: ['plan'], gives: 'Where each dollar goes first, then next, with dates', go: { stage: 'see', flash: 'money' } },
  { id: 'debt', tier: 'see', name: 'Debt to zero', needs: ['card'], gives: 'Your debt falling, and the month it ends', go: { stage: 'see', flash: 'debt' } },

  { id: 'statement', tier: 'sharp', name: 'A statement', needs: ['spending'], gives: 'Real spending in place of a guess', go: { stage: 'sharpen', flash: 'statement' } },
  { id: 'levels', tier: 'sharp', name: 'Levels 2 to 10', needs: ['plan'], gives: 'More numbers unlocked, and a tighter date', go: { stage: 'sharpen' } },
  { id: 'books', tier: 'sharp', name: 'Line by line', needs: ['plan'], gives: 'Every account, bill, debt and policy on its own line', go: { stage: 'books' } },
  { id: 'checkup', tier: 'sharp', name: 'The checkup', needs: ['plan'], gives: 'What a planner would ask that is not a number', go: { stage: 'sharpen', flash: 'checkup' } },

  { id: 'spendTools', tier: 'decide', name: 'Spending choices', needs: ['spending', 'plan'], gives: 'Afford it, cut it, love it, or spend more', go: { stage: 'tune', flash: 'afford' } },
  { id: 'earnTools', tier: 'decide', name: 'Earning choices', needs: ['income', 'plan'], gives: 'What a raise, side work or a move is worth', go: { stage: 'tune', flash: 'raise' } },
  { id: 'home', tier: 'decide', name: 'A home', needs: ['income', 'cash', 'plan'], gives: 'The payment, and what it does to your date', go: { stage: 'tune', flash: 'home' } },
  { id: 'fees', tier: 'decide', name: 'Fees and accounts', needs: ['invested', 'plan'], gives: 'What fees cost, and where the next dollar goes', go: { stage: 'tune', flash: 'fees' } },
  { id: 'design', tier: 'decide', name: 'Design my life', needs: ['spending', 'invested'], gives: 'A life at an age, priced', go: { stage: 'design' } },
  { id: 'decide', tier: 'decide', name: 'Compare two choices', needs: ['plan'], gives: 'Two paths side by side, and a receipt', go: { stage: 'decide' } },

  { id: 'life', tier: 'long', name: 'Lifetime plan', needs: ['plan', 'invested', 'levels'], softOn: ['levels'], gives: 'Every year to 90, with taxes and Social Security', go: { stage: 'life' } },
  { id: 'stress', tier: 'long', name: 'Test against history', needs: ['life'], gives: 'How your plan held up since 1871', go: { stage: 'life', flash: 'stress' } },
  { id: 'drills', tier: 'long', name: 'Practice', needs: ['plan', 'cash'], gives: 'Your fears, run on your numbers', go: { stage: 'drills' } },
  { id: 'date', tier: 'long', name: 'Money date', needs: ['plan'], gives: 'Five taps a month that keep it true', go: { stage: 'date' } },
  { id: 'summary', tier: 'long', name: 'One page', needs: ['plan'], gives: 'Your plan to print or send', go: { stage: 'summary' } },
];
const INPUTS = ['age', 'income', 'spending', 'cash', 'invested', 'card'];

// facts: { answered: { age, income, spending, cash, invested, card }, done: { [nodeId]: true } }
// A node is done when the person finished it, ready when everything it needs is in, and waiting when an input it
// needs is still missing. A soft need (the plan runs on typical numbers until yours are in) does not make it wait.
export function mapOf(facts = {}) {
  const ans = facts.answered || {}, done = facts.done || {}, by = Object.fromEntries(MAP_NODES.map(n => [n.id, n]));
  const state = {}, missing = {};
  const rootsOf = (id, seen = new Set()) => { if (seen.has(id)) return []; seen.add(id); const n = by[id]; if (INPUTS.includes(id)) return [id]; return (n.needs || []).flatMap(k => (n.soft && id === 'plan' ? [] : (n.softOn || []).includes(k) ? [] : rootsOf(k, seen))); };
  for (const n of MAP_NODES) {
    if (INPUTS.includes(n.id)) { state[n.id] = ans[n.id] ? 'done' : n.id === 'age' || ans.age ? 'ready' : 'waiting'; missing[n.id] = []; continue; }
    const need = n.id === 'plan' ? (ans.age ? [] : ['age']) : [...new Set([...(ans.age ? [] : ['age']), ...(n.needs || []).flatMap(k => rootsOf(k))])].filter(k => !ans[k]);
    missing[n.id] = need;
    state[n.id] = need.length ? 'waiting' : done[n.id] ? 'done' : 'ready';
  }
  const nodes = MAP_NODES.map(n => ({ ...n, needs: n.needs || [], state: state[n.id], missing: missing[n.id].map(k => by[k].name), feeds: MAP_NODES.filter(m => (m.needs || []).includes(n.id)).map(m => m.id) }));
  const count = s => nodes.filter(n => n.state === s).length;
  return { nodes, edges: nodes.flatMap(n => n.needs.map(from => ({ from, to: n.id }))), done: count('done'), ready: count('ready'), waiting: count('waiting'), next: nodes.find(n => n.state === 'ready' && INPUTS.includes(n.id)) ?? nodes.find(n => n.state === 'ready') ?? null };
}
