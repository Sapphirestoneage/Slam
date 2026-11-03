// Comes out of your paycheck (answer to 58 and the health-premium note): everything taken before the money reaches
// you, in one place. Income holds the pay; this section pulls together what the paycheck pays first: taxes, the
// 401(k), HSA or FSA, the health premium (owned by the Health row), the Benefits at work answers. Read-only here:
// each line says where it is changed. The Budget only holds what leaves the day-to-day account.
import { h } from './dom.js';
import { moreBlock, fromButton } from './staples.js';
import { takeHomeFromGross } from '../math/income.js';
import { money } from '../format.js';

export function paycheckSection(ctx) {
  const m = ctx.metrics();
  const x = m.inputs;
  const jobs = x.income.filter(i => i.taxType && i.gross != null && i.parts);
  if (!jobs.length) return null;
  return h('section.section.area-income', {}, h('div.section-title', {}, h('h2', {}, 'Comes out of your paycheck')),
    h('div.card', {}, h('p.muted', { style: { marginTop: 0 } }, 'Taken before the money reaches your account. You never see it, so it is not a Budget line.'),
      h('div.stack', { style: { gap: '12px' } }, jobs.map(i => jobBlock(ctx, x, i)))));
}

function jobBlock(ctx, x, i) {
  const n = i.parts.paychecks;
  const t = takeHomeFromGross({ gross: i.gross, pretax: i.pretax, roth: (i.roth ?? 0) + (i.afterTax ?? 0), filingStatus: x.filingStatus, selfEmployed: i.taxType === '1099', place: x.place }, ctx.ref);
  const per = v => (v ?? 0) / n;
  const acct = x.link?.job?.id === i.r.id ? x.link.acct : null;
  const k401From = acct ? fromButton('401(k)', '#/net-worth/assets', acct.id, { tag: true }) : null;
  const rows = [
    ['Taxes', [
      ['Federal income tax', per(t.federal?.value)],
      [i.taxType === '1099' ? 'Self-employment tax' : 'Social Security and Medicare', per(t.fica?.value)],
      [x.place ? 'New York State tax' : null, per(t.stateTax?.state)],
      [x.place?.nyc ? 'New York City tax' : null, per(t.stateTax?.local)]]],
    ['Saved for you', [
      ['401(k), traditional', per(i.parts.k401), k401From],
      ['401(k), Roth', per(i.parts.k401Roth), k401From],
      [ctx.gates().hsa ? 'HSA' : 'HSA or FSA', per(i.parts.hsaFsa)]]],
    ['Insurance and benefits', [
      ['Health premium', per(i.parts.premium), x.health ? fromButton('Health', '#/net-worth/protection', x.health.id, { tag: true }) : null],
      ['Commuter and FSAs', per(i.parts.benefitPretax), fromButton('Benefits at work', '#/home/profile', 'benefits', { tag: true })],
      ['ESPP and after-tax 401(k)', per(i.parts.afterTax), fromButton('Benefits at work', '#/home/profile', 'benefits', { tag: true })],
      ['Other before-tax', per(i.parts.otherPretax)]]],
  ];
  const taken = rows.reduce((s, [, list]) => s + list.reduce((q, [label, v]) => q + (label ? v : 0), 0), 0);
  const grossPer = per(i.gross);
  const lands = grossPer - taken;
  const typed = i.computed === 'takeHome' ? null : i.takeHome?.value != null ? i.takeHome.value * 12 / n : null;
  const gap = typed != null ? typed - lands : null;
  const name = i.r.name || i.r.type || 'Paycheck';
  const line = (label, v, from) => h('div.pay-line', {}, h('span', {}, label), from, h('span.num', {}, `−${money(v)}`));
  return h('div.pay-job', {},
    h('p', { style: { margin: 0 } }, h('strong', {}, name), `: from ${money(grossPer)} gross a paycheck, ${money(taken)} comes out before you see it, and ${money(lands)} lands.`),
    moreBlock(`paycheck:${i.r.id}`, () => h('div.stack', { style: { gap: '10px' } },
      h('div.pay-line.pay-total', {}, h('span', {}, 'Gross pay'), null, h('span.num', {}, money(grossPer))),
      ...rows.map(([group, list]) => {
        const shown = list.filter(([label, v]) => label && Math.abs(v) >= 0.5);
        return shown.length ? h('div.stack', { style: { gap: '4px' } }, h('span.label', {}, group), shown.map(([label, v, from]) => line(label, v, from))) : null;
      }),
      h('div.pay-line.pay-total', {}, h('span', {}, 'Lands in your account'), null, h('span.num', {}, money(lands))),
      gap != null && Math.abs(gap) >= 5 ? h('p.muted.small', { style: { margin: 0 } }, `You typed ${money(typed)} take-home a paycheck, ${money(Math.abs(gap))} ${gap < 0 ? 'less' : 'more'} than this adds up to. `,
        gap < 0 ? 'Something else comes out too (state disability, union dues, a loan): add it under Other before-tax on the job.' : 'Check the gross, or a deduction typed twice.') : null),
    { label: 'Every line' }));
}
