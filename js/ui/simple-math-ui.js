// SPDX-License-Identifier: AGPL-3.0-only
// Batch 23: Your Shockingly Simple Math, a caret section on Report › Overview (closed, one line: "At your 29% savings
// rate: about 24 years to FI from $0"). Mr. Money Mustache's savings-rate table re-run on this client's return and
// withdrawal rate, their own rate as a highlighted row, and the assumption waterfall from the original table to their
// own FI date. The numbers come from js/math/simple.js (M72); this file only shows them.
import { h } from './dom.js';
import * as S from './staples.js';
import { simpleTable, simpleWaterfall } from '../math/simple.js';
import { pct } from '../format.js';

const CREDIT = 'The idea and the table come from Mr. Money Mustache, "The Shockingly Simple Math Behind Early Retirement" (2012): your savings rate alone sets how many years work takes, starting from $0. His table uses 5% a year after inflation and a 4% withdrawal rate; this one uses yours.';
const yrs = v => (v == null ? 'Not on this path' : v < 0.05 ? 'Now' : `${v.toFixed(1)} years`);
const rateText = r => `${Math.round(r * 100)}%`;

export function simpleMathSection(ctx) {
  const m = ctx.metrics(), x = m.inputs;
  const sr = m.savingsRate.value;
  const t = simpleTable({ savingsRate: sr, realReturn: x.realReturn, withdrawalRate: x.withdrawalRate });
  const w = simpleWaterfall(m, { now: ctx.now() });
  const plan = m.monthsToFi.value != null ? (m.monthsToFi.value / 12).toFixed(1) : null;
  const summary = t.you?.years != null ? `At your ${rateText(sr)} savings rate: about ${Math.round(t.you.years)} years to FI from $0${plan ? `; your plan says ${plan}` : ''}`
    : sr != null && sr <= 0 ? 'Your savings rate is at or below zero: the table shows where each rate gets you' : 'Your row appears once there is a savings rate';
  return S.sec('overview:simple-math', { title: 'Your Shockingly Simple Math', summary, tip: CREDIT }, () => h('div.card.sm-card', {},
    h('p.muted.small.sm-credit', {}, h('span.has-tip', { title: CREDIT, tabindex: '0' }, 'The idea: Mr. Money Mustache'), ` · from $0, ${pct(x.realReturn)} a year after inflation, a ${pct(x.withdrawalRate)} withdrawal rate`),
    h('div.sm-grid', {},
      h('div.sm-tablewrap', {}, h('table.sm-table', { 'aria-label': 'Savings rate to years to FI' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Savings rate'), h('th.num', {}, `Years to FI at ${pct(x.realReturn)}`), h('th.num', {}, h('span.has-tip', { title: 'The original table: 5% after inflation, a 4% withdrawal rate' }, 'At 5% (the original)')))),
        h('tbody', {}, t.rows.map(r => h(`tr${r.you ? '.sm-you' : ''}`, {},
          h('td', {}, r.you ? h('strong', {}, `${pct(r.rate)} (you)`) : rateText(r.rate)),
          h('td.num', {}, r.you ? S.mathButton({ ...t, value: r.years }, yrs(r.years)) : yrs(r.years)),
          h('td.num.muted', {}, yrs(r.original))))))),
      waterfallCard(w))));
}

function waterfallCard(w) {
  if (!w.steps.length) return h('div.sm-fall', {}, h('h3', {}, 'What each assumption does'), h('p.muted', {}, `Needs ${w.needs.join(' and ')}.`));
  return h('div.sm-fall', {}, h('h3', {}, 'What each assumption does'),
    h('ol.sm-steps', {}, w.steps.map((st, i) => h(`li.sm-step${i === w.steps.length - 1 ? '.sm-last' : ''}`, {},
      h('div.sm-step-text', {}, h('span', {}, st.label), h('span.muted.small', {}, st.note)),
      h('div.sm-step-num', {}, h('strong', {}, yrs(st.years)), st.change == null ? null : h('span.muted.small', {}, Math.abs(st.change) < 0.05 ? 'no change' : `${st.change > 0 ? '+' : '−'}${Math.abs(st.change).toFixed(1)} years`))))),
    h('p.muted.small', { style: { margin: '8px 0 0' } }, S.mathButton(w, 'Show the math'), ' The last line is your FI date on Goals.'));
}
