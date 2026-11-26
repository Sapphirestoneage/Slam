// SPDX-License-Identifier: AGPL-3.0-only
// The chosen-family summary page (kin.html, run Not built, groups 1 to 5, Part 6): who decides, who hears, who
// handles money and who gets what, in plain English for a lawyer. Private like the other Your own path pages: nothing
// is kept unless the person turns on Keep this (js/solo/keepthis.js, boot's private mode). The words are built by js/kin.js; this page only asks and shows.
import { boot, h, btn, foot } from './shell.js';
import { keepCard, withExit } from './keepthis.js';
import { KIN_SECTIONS, kinSummaryOf, kinAccountsSection } from '../kin.js';
import { lifeAdminItems } from '../lifeadmin.js';
import { sourcesCard } from './ownpath.js';
import { OP_KIN_RULES } from '../ownpath-sources.js';
import { estateSources, estateLinks } from './estate.js';

const $ = id => document.getElementById(id);
// The estate basics (run Finish everything partly built, Part 11): the plan's accounts from Life admin add the section
// Who is named on each account, right after the will; Life admin's own answers for a will and a health care proxy show
// on the list of papers. Nothing here writes the plan: Life admin (Protection) stays the one place for those answers.
let EST = null;
function draw(api) {
  foot();
  const life = lifeAdminItems(api.store.doc, api.store.doc.records || []);
  const acc = kinAccountsSection(life), at = KIN_SECTIONS.findIndex(s => s.key === 'will') + 1;
  const SECTIONS = acc.boxes.length ? [...KIN_SECTIONS.slice(0, at), acc, ...KIN_SECTIONS.slice(at)] : KIN_SECTIONS;
  const LIFE_OF = { 'Will': life.find(x => x.key === 'will'), 'Health care proxy': life.find(x => x.key === 'proxy') };
  const k = (s, b) => `kin_${s}.${b}`, mine = () => api.mine();
  const answers = () => Object.fromEntries(SECTIONS.flatMap(s => s.boxes.map(b => [`${s.key}.${b.key}`, mine()[k(s.key, b.key)] ?? b.start ?? ''])));
  const out = h('span.st-small', { role: 'status', style: { marginLeft: '8px' } }, '');
  const summary = () => {
    const S = kinSummaryOf(answers(), SECTIONS);
    if (!S.ready) return h('div.st-card', { id: 'answer' }, h('h2', { style: { marginTop: 0 } }, 'Your summary shows here'), h('p.st-soft', { style: { marginBottom: 0 } }, 'Fill in any box above. Names are enough.'));
    return h('div.st-card.hero', { id: 'answer', 'aria-live': 'polite' }, h('div.st-eyebrow', {}, 'For your lawyer'),
      S.parts.map(p => h('div', {}, h('h3', { style: { margin: '10px 0 4px' } }, p.title, p.paper ? h('span.st-soft', { style: { fontWeight: 500 } }, ` · ${p.paper}`) : null), p.lines.map(l => h('p', { style: { margin: '0 0 4px' } }, l)))),
      h('p.st-small.st-soft', {}, 'A summary of what you want, not a legal document by itself.'),
      h('ul.st-list', {}, S.papers.map(p => h(`li${p.has ? '.done' : ''}`, {}, h('span.dot', {}, p.has ? '✓' : ''), h('span', {}, p.paper, h('small', {}, [p.has ? 'In the summary' : 'Not filled in yet', LIFE_OF[p.paper]?.status ? `Life admin: ${LIFE_OF[p.paper].status}` : null].filter(Boolean).join('. '))), h('span.when', {}, '')))),
      h('div.st-row', { style: { marginTop: '10px' } }, btn('Copy the summary', async () => { try { await navigator.clipboard.writeText(S.text); out.textContent = 'Copied.'; } catch { out.replaceChildren(h('textarea', { readonly: '', 'aria-label': 'Your summary', rows: 8, style: { width: '100%' } }, S.text)); } }, 'primary'), btn('Print it', () => window.print(), 'slim'), out));
  };
  let card = summary();
  const box = (s, b) => h('div.st-field', {}, h('div.st-flabel', {}, b.label), h('div.st-box', {}, h('div.in', {}, h('input', { type: 'text', autocomplete: 'off', id: `kin_${s.key}_${b.key}`, 'aria-label': b.label, value: mine()[k(s.key, b.key)] ?? b.start ?? '',
    onInput: e => { api.remember({ [k(s.key, b.key)]: e.target.value }); api.save(); const fresh = summary(); card.replaceWith(fresh); card = fresh; } }))), b.help ? h('div.st-small.st-soft', { style: { marginTop: '4px' } }, b.help) : null);
  const noAccounts = () => h('div.st-card', { id: 'noaccounts' }, h('h2', { style: { marginTop: 0 } }, 'Who is named on each account'), h('p.st-small', { style: { margin: 0 } }, 'The form on a retirement or investment account decides who gets it, not the will. Add your accounts to the plan and each one shows up here with a box.'), h('div.st-row', { style: { marginTop: '8px' } }, h('a.st-btn.slim', { href: 'index.html#/net-worth/protection' }, 'Open Life admin')));
  const inputs = SECTIONS.flatMap(s => [h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, s.title), s.paper ? h('p.st-small.st-soft', {}, `Becomes: ${s.paper}`) : null, s.boxes.map(b => box(s, b))), ...(s.key === 'will' && !acc.boxes.length ? [noAccounts()] : [])]);
  $('main').replaceChildren(h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Estate basics, chosen family'), h('h1', {}, 'Who decides for me, and who gets what?'),
    h('p', { style: { marginBottom: 0 } }, 'The law\'s default list is family by blood or marriage. Write down your people in plain words, and bring the summary to a lawyer to make it real.')),
  ...inputs, card, EST ? estateLinks(EST, 'kin') : null, sourcesCard('Why the papers matter, in the rules\' words', OP_KIN_RULES, 'kinrules'), EST ? estateSources(EST, ['beneficiaryWins', 'noWillNy'], 'The forms on your accounts') : null, keepCard(api));
  withExit({ neutral: true });
}
fetch('data/sources/estate-2026.json').then(r => r.json()).then(D => { EST = D; }).catch(() => { EST = null; }).finally(() => boot('kin', draw, { private: true }));
