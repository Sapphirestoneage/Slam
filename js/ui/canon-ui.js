// SPDX-License-Identifier: AGPL-3.0-only
// Eli's frameworks and the canon in the whole plan (run "Not built, groups 1 to 5", Part 4): the one line of the next
// dollar at the top of Home, the Baby Steps next to the SLAM FOO on Plan › FOO, and the Advice translator under the
// steps. Formatting only: js/math/frameworks.js and js/math/frameworks-plan.js work every number out.
import { h } from './dom.js';
import * as S from './staples.js';
import { money } from '../format.js';
import { foo } from '../math/foo.js';
import { ORDER, stepHeadline } from '../registry/foo.js';
import { fwBabySteps, fwTranslate, FW_BABY_SOURCE } from '../math/frameworks.js';
import { fwFooNext, fwBabyInputs } from '../math/frameworks-plan.js';
import { skillLibrary, loadSkillLibrary } from '../library.js';

// One line at the top of Home: where the next dollar goes, the match included. Nothing when there is no step yet.
export function nextDollarLine(app, ctx, f = null) {
  let line = null;
  try { line = fwFooNext(f ?? foo(ctx.store.doc, ctx.ref, { now: ctx.now(), flags: app.flags || [] }), money); } catch { line = null; }
  if (!line) return null;
  return h('div.row-line.next-dollar', { style: { gap: '8px', flexWrap: 'wrap' } }, h('strong', {}, line), S.button('See the order', { size: 'small', iconName: 'right', onClick: () => app.go('#/plan/foo') }));
}

// The Baby Steps, side by side with the SLAM FOO: which Baby Step the plan's numbers place you on, and the SLAM step
// that covers the same ground.
export function babyStepsCard(ctx, f) {
  const B = fwBabySteps(fwBabyInputs(ctx.store.doc, ctx.ref, { now: ctx.now() }));
  const word = (s, i) => (s.skip ? 'No kids' : s.done === true ? 'Done' : s.done === null ? 'Not known yet' : i === B.here ? 'You are here' : 'Ahead');
  return h('div.card.foo-original.foo-baby', {}, h('h2', {}, 'The Baby Steps'),
    h('ol', {}, B.steps.map((s, i) => h('li', {}, h('strong', {}, s.name), ` · ${word(s, i)}`, h('div.muted.small', {}, `SLAM step ${s.foo}, ${stepHeadline(s.foo)}${f?.here === s.foo ? ' (you are here on the SLAM path)' : ''}. ${s.slam}`)))),
    h('p.muted.small', {}, B.here == null ? `Add ${B.unknown.length === 1 ? 'one more number' : 'a few numbers'} to place you (Baby Step ${B.unknown.join(', ')}).` : B.here >= 6 ? 'You have done every Baby Step.' : `On these numbers you are on Baby Step ${B.here + 1}.`),
    h('p.muted.small', {}, `From ${FW_BABY_SOURCE}, in SLAM's words. For comparison: the two orders agree on most steps and differ on the match, which debts come first, and the size of the fund.`));
}

// The Advice translator: every piece of popular advice in the unlearn list, read at the step you are on.
export function translatorSection(app, ctx, f) {
  if (!f?.here) return null;
  const lib = skillLibrary();
  if (!lib) { loadSkillLibrary(() => app.render()); return null; }
  const T = fwTranslate(f.here, lib.unlearn || [], ORDER);
  if (!T.ready) return null;
  const item = e => h('li', {}, h('strong', {}, `"${e.advice}"`), h('div.muted.small', {}, `It fits at ${e.rightWords}.${e.from ? ` Usually heard from ${e.from}.` : ''}`));
  const group = (title, list) => (list.length ? h('div', {}, h('h3', {}, `${title} (${list.length})`), h('ul.op-list', {}, list.map(item))) : null);
  return S.sec('foo:translate', { title: 'Advice translator', summary: `At step ${f.here}: ${T.now.length} fit now, ${T.before.length} from before, ${T.later.length} for later` },
    h('div.stack', { style: { gap: '10px' } },
      T.unlearn ? h('div.banner-inline', {}, h('strong', {}, `To unlearn now: "${T.unlearn.advice}"`), h('p.small', { style: { margin: '4px 0 0' } }, T.unlearn.line)) : null,
      group('Fits you now', T.now), group('Fit you before', T.before), group('For later', T.later),
      h('p.muted.small', {}, 'The same list as Learn and unlearn on each step. Advice is often right at one stage and not at another; this sorts it by yours.')));
}
