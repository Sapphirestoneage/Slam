// My Money › Profile (build phase 5): why now, what applies (the gates hub, R015), about you, work and home,
// the accounts gate with counts (R001 to R003), and the couples split (R177 to R179). Answers live in doc.profile.
import { h } from './dom.js';
import { textInput, toggle, select, stepper, checkbox, labelled, moreBlock, pctInput, toast, laterButton, button } from './staples.js';
import { gatesOf, syncCount, WORK, HOUSING, COVERAGE, AREAS, REAL_TYPES, recordFor } from '../gates.js';
import { ageOf } from '../math/metrics.js';
import { profileCompletion } from '../profile-completion.js';

export const STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI',
  'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// Every Profile answer can be taken back: click the picked one again.
const yesNo = (v, on, label) => toggle([[true, 'Yes'], [false, 'No']], v ?? null, on, { label, clearable: true });
const pick = (opts, v, on, label) => toggle(opts, v ?? null, on, { label, clearable: true });
const section = (title, area, ...kids) => h(`section.section.area-${area}`, {}, h('div.section-title', {}, h('h2', {}, title)), h('div.card.profile-card', {}, ...kids));

export function profileScreen(app, ctx) {
  const store = ctx.store;
  const p = store.doc.profile;
  const g = gatesOf(p, store.doc.client);
  // A typed answer comes off the homework list (Brandon B1.2).
  const set = patch => {
    const later = p.later || {};
    const cleared = Object.keys(patch).filter(k => later[k] && patch[k] !== null && patch[k] !== undefined);
    store.setDoc('profile', cleared.length ? { ...patch, later: Object.fromEntries(Object.entries(later).filter(([k]) => !cleared.includes(k))) } : patch);
  };
  const later = key => ({ on: !!p.later?.[key], set: on => store.setDoc('profile', { later: { ...(p.later || {}), [key]: on || undefined } }) });
  // A labelled box whose answer can be parked for later.
  const field = (label, key, input, opts = {}) => labelled(label, input, { ...opts, later: later(key) });
  // A gate that adds rows says where they went, with one click to go there (R015).
  const told = (text, route) => toast(text, { action: route ? { label: 'Go there', run: () => app.go(route) } : null });
  const birth = (mKey, yKey, who) => h('span.row-line', { style: { gap: '8px', flexWrap: 'nowrap' } },
    select(MONTHS.map((m, i) => [String(i + 1), m]), p[mKey] ? String(p[mKey]) : null, v => set({ [mKey]: v ? Number(v) : null }), { label: `${who} birth month`, hint: 'Month', width: 140, key: `p:${mKey}` }),
    textInput(p[yKey] ?? null, v => set({ [yKey]: v && /^\d{4}$/.test(v) ? Number(v) : null }), { hint: 'Year', width: 96, key: `p:${yKey}` }));
  const age = ageOf(p, ctx.now());

  // ---------- Why now ----------
  const whyNow = section('Why now', 'needs',
    h('div.form-grid', {},
      field('What prompted this call', 'whyNow', textInput(p.whyNow, v => set({ whyNow: v }), { hint: 'In their words', width: 320, key: 'p:whyNow' })),
      field('Biggest worry', 'worry', textInput(p.worry, v => set({ worry: v }), { hint: 'In their words', width: 320, key: 'p:worry' })),
      field('Goal in their words', 'goalWords', textInput(p.goalWords, v => set({ goalWords: v }), { hint: 'In their words', width: 320, key: 'p:goalWords' }))));

  // ---------- What applies to me: every gate in one place ----------
  const setCar = v => {
    set({ hasCar: v });
    if (v && !store.find(r => r.kind === 'asset' && r.type === 'Car').length) { store.add('asset', { name: 'Car', values: {} }, { type: 'Car' }); told('Car added to Assets; car lines are back in the Budget.', '#/my-money/assets'); }
    else if (v === false) told('Car rows and car lines are hidden. Nothing is deleted.');
  };
  const setKids = v => { set({ dependents: v === null ? null : v ? Math.max(1, p.dependents ?? 0) : 0 }); if (v) told('Kids lines are in the Budget.', '#/spending/budget'); };
  const setHousing = v => {
    set({ housing: v });
    if (v === 'Own' && !store.find(r => r.kind === 'asset' && r.type === 'Home').length) { store.add('asset', { name: 'Home', values: {} }, { type: 'Home' }); told('Home added to Assets, with room for the mortgage.', '#/my-money/assets'); }
    if (v === 'Family') { // R008: the housing line starts as covered by someone
      for (const r of store.find(x => x.kind === 'bill' && x.values.category === 'Rent or mortgage' && (x.values.whoPays ?? 'Me') === 'Me')) store.update(r.id, { whoPays: 'Covered by someone' });
    }
  };
  const setCouple = v => { store.transaction('Solo or couple', () => { set({ household: v }); store.setDoc('client', { couple: v === 'Couple' }); }); };
  const gate = (label, control, note = null, key = null) => h('div.gate', {}, h('span.gate-label', {}, label), control, note ? h('span.muted.small', {}, note) : null, key ? laterButton(later(key), label) : null);
  const hub = section('What applies to me', 'needs',
    h('p.muted', {}, 'Each answer adds or removes those sections everywhere. Nothing is deleted when something is turned off.'),
    h('div.gates', {},
      gate('Car', yesNo(g.car, setCar, 'Has a car'), null, 'hasCar'),
      gate('Kids', yesNo(g.kids, setKids, 'Has kids'), g.kids ? `${p.dependents} under About you` : null),
      gate('Pets', yesNo(g.pets, v => set({ hasPets: v }), 'Has pets'), null, 'hasPets'),
      gate('Housing', pick(HOUSING.slice(0, 3), g.housing, setHousing, 'Housing')),
      gate('Work', select(WORK, g.work, v => set({ workSituation: v }), { label: 'Work situation', width: 190, key: 'p:hub-work' })),
      gate('HSA-eligible plan', yesNo(p.hsaEligible ?? null, v => set({ hsaEligible: v }), 'HSA-eligible'), null, 'hsaEligible'),
      gate('FSA at work', yesNo(p.fsa ?? null, v => set({ fsa: v }), 'FSA'), null, 'fsa'),
      gate('Equity pay (ESPP, RSU)', yesNo(p.equityPay ?? null, v => set({ equityPay: v }), 'Equity pay'), null, 'equityPay'),
      gate('Solo or couple', pick(['Solo', 'Couple'], g.couple ? 'Couple' : p.household ? 'Solo' : null, setCouple, 'Solo or couple'))));

  // ---------- About you ----------
  const about = section('About you', 'needs',
    h('div.form-grid', {},
      field('First name', 'firstName', textInput(p.firstName, v => set({ firstName: v }), { hint: 'First name', width: 200, key: 'p:firstName' })),
      field('Last name', 'lastName', textInput(p.lastName, v => set({ lastName: v }), { hint: 'Last name', width: 200, key: 'p:lastName' })),
      field('Birth month and year', 'birthYear', birth('birthMonth', 'birthYear', 'Your'), { note: age !== null ? `Age ${age}` : 'Works out age' }),
      field('State', 'state', select(STATES, p.state ?? null, v => set({ state: v }), { label: 'State', hint: 'State', width: 110, key: 'p:state' }), { note: 'Tax rules' }),
      field('Solo or couple', 'household', pick(['Solo', 'Couple'], g.couple ? 'Couple' : p.household ? 'Solo' : null, setCouple, 'Solo or couple'))),
    moreBlock('profile:about', () => h('div.form-grid', {},
      g.couple ? field('Partner first name', 'partnerName', textInput(p.partnerName, v => set({ partnerName: v }), { hint: 'Partner name', width: 200, key: 'p:partnerName' })) : null,
      g.couple ? field('Partner birth month and year', 'partnerBirthYear', birth('partnerBirthMonth', 'partnerBirthYear', 'Partner')) : null,
      field('Dependents', 'dependents', stepper(p.dependents ?? null, n => set({ dependents: n, kidAges: (p.kidAges || []).slice(0, n) }), { label: 'Dependents', key: 'p:dependents' })),
      ...(p.dependents ? Array.from({ length: p.dependents }, (_, i) => labelled(`Child ${i + 1} age`, textInput(p.kidAges?.[i] ?? null, v => {
        const ages = [...(p.kidAges || [])]; ages[i] = v === null ? null : Number(v); set({ kidAges: ages });
      }, { hint: 'Age', width: 80, key: `p:kid${i}` }))) : []),
      field('Health coverage', 'healthCoverage', select(COVERAGE, p.healthCoverage ?? null, v => set({ healthCoverage: v }), { label: 'Health coverage', width: 170, key: 'p:health' })),
      field('Email', 'email', textInput(p.email, v => set({ email: v }), { hint: 'Add email', width: 240, key: 'p:email' })),
      field('Phone', 'phone', textInput(p.phone, v => set({ phone: v }), { hint: 'Add phone', width: 160, key: 'p:phone' })))));

  // ---------- Work and home ----------
  const work = section('Work and home', 'needs',
    h('div.form-grid', {},
      field('Work situation', 'workSituation', select(WORK, g.work, v => set({ workSituation: v }), { label: 'Work situation', width: 200, key: 'p:work' }),
        { note: g.betweenJobs ? 'Unemployment and runway show on Income' : g.variable ? 'Variable income shows on Income' : null }),
      field('Housing', 'housing', pick(HOUSING, g.housing, setHousing, 'Housing'))),
    moreBlock('profile:work', () => h('div.form-grid', {},
      field('Roommates', 'roommates', stepper(p.roommates ?? null, n => set({ roommates: n }), { label: 'Roommates', key: 'p:roommates' }), { note: 'Splits housing cost' }),
      field('Worst case: all on me', 'worstCase', yesNo(p.worstCase ?? null, v => set({ worstCase: v }), 'Worst case'), { note: 'Counts housing with no roommate share' }),
      field('Income stability', 'incomeStability', pick(['Steady', 'Varies', 'Unpredictable'], p.incomeStability, v => set({ incomeStability: v }), 'Income stability'), { note: 'Moves the Rule of 5 target' }))));

  // ---------- Accounts gate: which areas, then how many of each type (R001 to R003) ----------
  const areas = p.areas || {};
  const rowsIn = k => store.find(r => (k === 'debt' ? r.kind === 'debt' : k === 'real' ? r.kind === 'asset' : r.kind === 'account' && (r.values.group === 'investment') === (k === 'investments'))).length;
  const setArea = (k, on) => {
    const n = rowsIn(k);
    // Ticking one answers all four; an area not answered yet counts as ticked when it already has rows.
    set({ areas: { ...Object.fromEntries(AREAS.map(([a]) => [a, areas[a] ?? rowsIn(a) > 0])), [k]: on }, noneOfThese: false });
    if (!on && n) toast(`${n} ${n === 1 ? 'row is' : 'rows are'} hidden, not deleted. Tick it again to bring ${n === 1 ? 'it' : 'them'} back.`);
  };
  const types = { cash: ctx.ref.lists.cashTypes, investments: ctx.ref.lists.investmentTypes.filter(t => t !== 'HSA' || g.hsa), real: REAL_TYPES, debt: [...ctx.ref.lists.debtTypesTop, ...ctx.ref.lists.debtTypesOther] };
  const countOf = t => { const spec = recordFor(t, ctx.ref); return store.find(r => r.kind === spec.kind && r.type === t).length; };
  const setCount = (t, n) => {
    const res = syncCount(store, t, n, ctx.ref);
    if (res.kept) toast(`Kept ${res.kept} ${t} ${res.kept === 1 ? 'row that has' : 'rows that have'} numbers. Delete ${res.kept === 1 ? 'it' : 'them'} on the list if ${res.kept === 1 ? 'it is' : 'they are'} gone.`);
  };
  const accounts = section('Which do you have today', 'assets',
    h('div.row-line', { style: { gap: '20px' } },
      AREAS.map(([k, label]) => checkbox(label, (areas[k] ?? rowsIn(k) > 0) === true && !p.noneOfThese, on => setArea(k, on), { key: `p:area-${k}` })),
      checkbox('None of these', !!p.noneOfThese, on => set({ noneOfThese: on, areas: on ? { cash: false, investments: false, real: false, debt: false } : {} }), { key: 'p:none' })),
    p.noneOfThese ? h('p.muted', { style: { marginTop: '12px' } }, 'All four count as done; net worth is $0.') : null,
    AREAS.some(([k]) => (areas[k] ?? rowsIn(k) > 0) === true) ? h('div.type-counts', {}, AREAS.filter(([k]) => (areas[k] ?? rowsIn(k) > 0) === true).map(([k, label]) =>
      h('div.type-group', {}, h('h3', {}, `${label}: how many of each`),
        h('div.type-grid', {}, types[k].map(t => h(`div.type-count${countOf(t) ? '.on' : ''}`, {}, h('span', {}, t),
          stepper(countOf(t) || null, n => setCount(t, n), { label: `${t} count`, max: 15, key: `p:count-${t}` }))))))) : null);

  // ---------- Couples split (couples only, R177 to R179) ----------
  const couple = g.couple ? section('Couples split', 'needs',
    h('div.form-grid', {},
      field('How they run money', 'moneyStyle', pick(['Joint', 'Separate', 'Mix'], p.moneyStyle, v => set({ moneyStyle: v }), 'How they run money')),
      field('Split: my share', 'splitMine', pctInput(p.splitMine ?? null, v => set({ splitMine: v }), { hint: 'e.g. 50', key: 'p:split' }), { note: 'Housing, food and bills. Blank is 50/50' })),
    moreBlock('profile:couple', () => {
      const accts = store.find(r => r.kind === 'account');
      const joint = new Set(p.jointAccounts || []);
      return accts.length ? labelled('Joint accounts', h('div.row-line', {}, accts.map(a => checkbox(a.name || a.type, joint.has(a.id), on => {
        on ? joint.add(a.id) : joint.delete(a.id); set({ jointAccounts: [...joint] });
      })))) : h('p.muted', {}, 'Add accounts under Assets to mark which are joint.');
    })) : null;

  // Next (Brandon B1.1): once every core answer is in, or parked for later.
  const c = profileCompletion(store.doc);
  const next = h('div.next-step', {}, c.core.ready
    ? button('Next: Income', { kind: 'primary', iconName: 'right', onClick: () => app.go('#/my-money/income') })
    : h('p.muted', {}, `${c.core.missing.length} to go before Next (${c.core.missing.slice(0, 3).join(', ')}${c.core.missing.length > 3 ? ' and more' : ''}). Answer each, or tap I'll find it later.`));
  return [whyNow, hub, about, work, accounts, couple, next];
}

export { profileCompletion } from '../profile-completion.js';
