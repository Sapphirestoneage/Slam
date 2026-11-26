// SPDX-License-Identifier: AGPL-3.0-only
// The chosen-family summary (run Not built, groups 1 to 5, Part 6): who decides, who hears, who handles money and who
// gets what, written in plain English for a lawyer to turn into the real papers (a will, a health care proxy, a power
// of attorney, a HIPAA release). Pure: no DOM. It is not a legal document and says so.
//
// Built to be extended: the estate basics of run 1 Part 11 add a section (kinAccountsSection, below: who is named on
// each account) and kinSummaryOf picks it up. Each box is a short text; empty boxes write nothing.
export const KIN_SECTIONS = [
  { key: 'you', title: 'About me', paper: null,
    boxes: [{ key: 'name', label: 'Your name, as you want it on the papers' }, { key: 'state', label: 'The state you live in', help: 'The papers follow your state\'s rules.' }],
    words: a => [a.name ? `My name is ${a.name}.` : null, a.state ? `I live in ${a.state}.` : null] },
  { key: 'proxy', title: 'Who decides about my health care', paper: 'Health care proxy',
    boxes: [{ key: 'agent', label: 'The person who decides if you cannot', help: 'A partner, a friend, chosen family: anyone 18 or older.' }, { key: 'agent2', label: 'If they cannot, the next person' }],
    words: a => [a.agent ? `If I cannot make my own health care decisions, I want ${a.agent} to make them for me.` : null, a.agent2 ? `If ${a.agent || 'that person'} cannot, I want ${a.agent2} to.` : null] },
  { key: 'hipaa', title: 'Who may hear about my health', paper: 'HIPAA authorization',
    boxes: [{ key: 'hear', label: 'People doctors may talk to about you', help: 'Names, with commas between them.' }],
    words: a => [a.hear ? `Doctors and hospitals may share my health information with ${a.hear}.` : null] },
  { key: 'poa', title: 'Who handles my money if I cannot', paper: 'Power of attorney',
    boxes: [{ key: 'money', label: 'The person who handles your money' }, { key: 'money2', label: 'If they cannot, the next person' }],
    words: a => [a.money ? `If I cannot handle my money, I want ${a.money} to handle it for me.` : null, a.money2 ? `If ${a.money || 'that person'} cannot, I want ${a.money2} to.` : null] },
  { key: 'will', title: 'Who gets what, and who carries it out', paper: 'Will',
    boxes: [{ key: 'gets', label: 'Who gets what', help: 'In your words: "Everything to Sam", "my records to Jo".' }, { key: 'executor', label: 'The person who carries out your will' },
      { key: 'care', label: 'Who looks after your children or pets', help: 'Leave it empty if it does not fit.' }],
    words: a => [a.gets ? `When I die, I want this: ${a.gets}.` : null, a.executor ? `I want ${a.executor} to carry out my will.` : null, a.care ? `I want ${a.care} to look after my children or pets.` : null] },
  { key: 'self', title: 'Me, in my words', paper: null,
    boxes: [{ key: 'called', label: 'The name and pronouns to use, at the hospital and after' }, { key: 'notThem', label: 'Anyone you do not want making decisions for you', help: 'A lawyer can tell you how to put this in writing.' }, { key: 'wishes', label: 'Anything else: a service, where you rest' }],
    words: a => [a.called ? `Use this name and these pronouns for me, in care and after I die: ${a.called}.` : null, a.notThem ? `I do not want ${a.notThem} to make decisions for me.` : null, a.wishes ? `My wishes: ${a.wishes}.` : null] },
];
export const KIN_NOTE = 'This is a summary of what I want, for a lawyer to turn into the real papers. It is not a will or a legal document by itself.';

// The estate basics (run Finish everything partly built, Part 11): one more section, made from the plan's own
// accounts. Each account with a beneficiary line in Life admin (js/lifeadmin.js lifeAdminItems: the retirement and
// investment accounts, their "Beneficiary named" answer) gets a box for the person you want named on its form. The
// form on the account, not the will, decides who gets it (data/sources/estate-2026.json, beneficiaryWins), so the
// summary lists each one apart. accounts: the life admin items with an accountId.
export function kinAccountsSection(accounts = []) {
  const list = accounts.filter(x => x.accountId);
  const nameOf = x => x.label.replace(/^Beneficiary on /, '');
  return { key: 'accounts', title: 'Who is named on each account', paper: 'Beneficiary forms',
    boxes: list.map(x => ({ key: x.accountId, label: `On ${nameOf(x)}, the person you want named`, help: x.status === 'Done' ? 'Life admin says a beneficiary is named. Check it is still the person you want.' : x.status === 'Not yet' ? 'Life admin says no one is named yet.' : 'Life admin does not say yet.' })),
    words: a => list.map(x => (a[x.accountId] ? `On my ${nameOf(x)}, I want ${a[x.accountId]} named as the beneficiary${x.status === 'Done' ? ' (someone is named now; I will check it is them)' : x.status === 'Not yet' ? ' (no one is named yet)' : ''}.` : null)) };
}
const clean = v => (typeof v === 'string' ? v.trim().replace(/[.\s]+$/, '') : '');

// answers: { 'proxy.agent': 'Sam', ... }. Returns the sections that have words, each with its sentences and the paper
// it becomes, the papers still to ask for, and the whole summary as plain text.
export function kinSummaryOf(answers = {}, sections = KIN_SECTIONS) {
  const parts = sections.map(s => {
    const a = Object.fromEntries(s.boxes.map(b => [b.key, clean(answers[`${s.key}.${b.key}`] ?? '')]));
    return { key: s.key, title: s.title, paper: s.paper, lines: s.words(a).filter(Boolean) };
  }).filter(p => p.lines.length);
  const papers = sections.filter(s => s.paper).map(s => ({ paper: s.paper, has: parts.some(p => p.key === s.key) }));
  const text = parts.length ? [KIN_NOTE, '', ...parts.flatMap(p => [`${p.title}${p.paper ? ` (${p.paper})` : ''}`, ...p.lines, ''])].join('\n').trim() : '';
  return { ready: parts.length > 0, parts, papers, text };
}
