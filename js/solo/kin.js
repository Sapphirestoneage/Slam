// SPDX-License-Identifier: AGPL-3.0-only
// The chosen-family summary page (kin.html, run Not built, groups 1 to 5, Part 6): who decides, who hears, who
// handles money and who gets what, in plain English for a lawyer. Private like the other Your own path pages: nothing
// is kept unless the person turns on Keep this (js/solo/private.js, boot's private mode). The words are built by js/kin.js; this page only asks and shows.
import { boot, h, btn, foot } from './shell.js';
import { keepCard, withExit } from './private.js';
import { KIN_SECTIONS, kinSummaryOf } from '../kin.js';
import { sourcesCard } from './ownpath.js';
import { OP_KIN_RULES } from '../ownpath-sources.js';

const $ = id => document.getElementById(id);
function draw(api) {
  foot();
  const k = (s, b) => `kin_${s}.${b}`, mine = () => api.mine();
  const answers = () => Object.fromEntries(KIN_SECTIONS.flatMap(s => s.boxes.map(b => [`${s.key}.${b.key}`, mine()[k(s.key, b.key)] ?? b.start ?? ''])));
  const out = h('span.st-small', { role: 'status', style: { marginLeft: '8px' } }, '');
  const summary = () => {
    const S = kinSummaryOf(answers());
    if (!S.ready) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your summary shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'Fill in any box above. Names are enough.'));
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'For your lawyer'),
      S.parts.map(p => h('div', {}, h('h3', { style: { margin: '10px 0 4px' } }, p.title, p.paper ? h('span.st-soft', { style: { fontWeight: 500 } }, ` · ${p.paper}`) : null), p.lines.map(l => h('p', { style: { margin: '0 0 4px' } }, l)))),
      h('p.st-small.st-soft', {}, 'A summary of what you want, not a legal document by itself.'),
      h('ul.st-list', {}, S.papers.map(p => h(`li${p.has ? '.done' : ''}`, {}, h('span.dot', {}, p.has ? '✓' : ''), h('span', {}, p.paper, h('small', {}, p.has ? 'In the summary' : 'Not filled in yet')), h('span.when', {}, '')))),
      h('div.st-row', { style: { marginTop: '10px' } }, btn('Copy the summary', async () => { try { await navigator.clipboard.writeText(S.text); out.textContent = 'Copied.'; } catch { out.replaceChildren(h('textarea', { readonly: '', 'aria-label': 'Your summary', rows: 8, style: { width: '100%' } }, S.text)); } }, 'primary'), btn('Print it', () => window.print(), 'slim'), out));
  };
  let card = summary();
  const box = (s, b) => h('div.st-field', {}, h('div.st-flabel', {}, b.label), h('div.st-box', {}, h('div.in', {}, h('input', { type: 'text', autocomplete: 'off', id: `kin_${s.key}_${b.key}`, 'aria-label': b.label, value: mine()[k(s.key, b.key)] ?? b.start ?? '',
    onInput: e => { api.remember({ [k(s.key, b.key)]: e.target.value }); api.save(); const fresh = summary(); card.replaceWith(fresh); card = fresh; } }))), b.help ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, b.help) : null);
  const inputs = KIN_SECTIONS.map(s => h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, s.title), s.paper ? h('p.st-small.st-soft', {}, `Becomes: ${s.paper}`) : null, s.boxes.map(b => box(s, b))));
  $('main').replaceChildren(h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Chosen family'), h('h1', {}, 'Who decides for me, and who gets what?'),
    h('p', { style: { marginBottom: 0 } }, 'The law\'s default list is family by blood or marriage. Write down your people in plain words, and take the summary to a lawyer to make it real.')),
  ...inputs, card, sourcesCard('Why the papers matter, in the rules\' words', OP_KIN_RULES, 'kinrules'), keepCard(api));
  withExit({ neutral: true });
}
boot('kin', draw, { private: true });
