// SPDX-License-Identifier: AGPL-3.0-only
// About you › People (batch 49, households of any size): who is in the plan. This client, the partner (a couple mode),
// up to six adults in all and any dependents (a child, a parent you support), each a name and a role in taps. The
// partner's taxes are one tap (together or apart, the Filing status on Taxes); another adult files a return of their
// own. Roommates who are not in the plan stay the roommates count under Home. Slim: a closed caret section with one
// summary line ("Riley, Jules and Dev in the plan · 1 dependent"), like every About you section.
import { h } from './dom.js';
import { textInput, toggle, tapPick, button, iconButton, toast } from './staples.js';
import { adultsOf, dependentsOf, extraAdults, personLabels, householdSize, MAX_ADULTS, ADULT_ROLES, DEPENDENT_ROLES, MODES, modeOf } from '../registry/couples.js';
import { addPerson, setPerson, removePerson } from '../couples.js';

export const peopleSummary = doc => {
  const adults = adultsOf(doc), deps = dependentsOf(doc), H = householdSize(doc);
  const names = adults.map(a => a.name);
  const who = names.length === 1 ? `${names[0]} alone in the plan` : `${names.slice(0, -1).join(', ')} and ${names.at(-1)} in the plan`;
  const d = H.dependents ? ` · ${H.dependents} ${H.dependents === 1 ? 'dependent' : 'dependents'}` : '';
  const r = doc.profile.roommates ? ` · ${doc.profile.roommates} ${doc.profile.roommates === 1 ? 'roommate' : 'roommates'} outside it` : '';
  return deps.length || adults.length ? `${who}${d}${r}` : who;
};

export function peopleSection(ctx, { section }) {
  const store = ctx.store, doc = store.doc, p = doc.profile;
  const names = personLabels(doc), adults = adultsOf(doc), deps = dependentsOf(doc);
  const married = /^Married/.test(modeOf(p) ?? '');
  const couple = !!MODES[modeOf(p)]?.couple;
  // The partner's taxes in one tap: married, together (Married jointly) or apart (Married separately); not married, apart.
  const partnerTax = couple ? (married
    ? toggle([['Married jointly', 'Together'], ['Married separately', 'Apart']], p.filingStatus === 'Married separately' ? 'Married separately' : p.filingStatus === 'Married jointly' ? 'Married jointly' : null,
      v => store.setDoc('profile', { filingStatus: v }), { label: `${names.Partner} files`, clearable: true })
    : h('span.small', { title: 'Not married: each files a return of their own' }, 'Own return')) : null;
  const row = (cells, key) => h('div.people-row', { 'data-person': key }, ...cells);
  const head = h('div.people-row.people-head', {}, h('span.label', {}, 'Name'), h('span.label', {}, 'Role'), h('span.label', {}, 'Taxes'), h('span'));
  const meRow = row([h('strong.person-name', {}, names.Me), h('span.muted.small', { title: 'The name is typed under About you' }, 'This client'), h('span.small', { title: 'Filing status, on Taxes' }, p.filingStatus ?? 'On Taxes'), h('span')], 'Me');
  const partnerRow = couple ? row([h('strong.person-name', {}, names.Partner), h('span.muted.small', { title: 'The name is typed under About you' }, 'Partner'), married ? h('span.row-line', { style: { gap: '6px' }, title: `Does ${names.Partner} file with ${names.Me}?` }, partnerTax) : partnerTax, h('span')], 'Partner') : null;
  const extraRows = extraAdults(doc).map(x => row([
    textInput(x.name ?? null, v => setPerson(store, x.id, { name: v }), { hint: `${names[x.id]}: name`, width: 170, key: `p:person:${x.id}:name` }),
    tapPick(ADULT_ROLES, x.role ?? null, v => setPerson(store, x.id, { role: v }), { label: `${names[x.id]} role`, key: `p:person:${x.id}:role` }),
    h('span.small', { title: 'Files a return of their own (Single)' }, 'Own return'),
    iconButton('trash', `Take ${names[x.id]} out of the plan`, () => { const n = removePerson(store, x.id); toast(n ? `${names[x.id]} is out of the plan; ${n} ${n === 1 ? 'row is' : 'rows are'} now ${names.Me}'s. Undo puts it back.` : `${names[x.id]} is out of the plan.`); })], x.id));
  const depRows = deps.map(x => row([
    textInput(x.name ?? null, v => setPerson(store, x.id, { name: v }), { hint: 'Name', width: 170, key: `p:person:${x.id}:name` }),
    tapPick(DEPENDENT_ROLES, x.role ?? null, v => setPerson(store, x.id, { role: v }), { label: `${x.name || 'Dependent'} role`, key: `p:person:${x.id}:role` }),
    textInput(x.age == null ? null : String(x.age), v => { const n = v == null ? null : Number(v); setPerson(store, x.id, { age: Number.isFinite(n) ? n : null }); }, { hint: 'Age', width: 80, key: `p:person:${x.id}:age` }),
    iconButton('trash', `Take ${x.name || 'this dependent'} off`, () => { removePerson(store, x.id); toast(`${x.name || 'The dependent'} is off the list. Undo puts it back.`); })], x.id));
  const full = adults.length >= MAX_ADULTS;
  const body = h('div.stack.people', { style: { gap: '8px' } },
    h('div.people-table', {}, head, meRow, partnerRow, ...extraRows),
    deps.length ? h('div.people-table', {}, h('div.people-row.people-head', {}, h('span.label', {}, 'Dependent'), h('span.label', {}, 'Role'), h('span.label', {}, 'Age'), h('span')), ...depRows) : null,
    h('div.row-line', { style: { gap: '8px' } },
      button('Add an adult', { iconName: 'plus', size: 'small', disabled: full, why: full ? `${MAX_ADULTS} adults is the most for now` : null, tip: 'Someone in the plan with a view of their own: a sibling, a parent, a friend who shares the bills and the money', onClick: () => addPerson(store, 'Adult') }),
      button('Add a dependent', { iconName: 'plus', size: 'small', tip: 'A child or a parent you support: in the household, with no view of their own', onClick: () => addPerson(store, 'Dependent') })),
    h('p.muted.small', {}, `Roommates who share bills but are not in the plan stay the roommates count under Home${p.roommates ? ` (${p.roommates})` : ''}.`));
  return section('People', 'needs', body);
}
