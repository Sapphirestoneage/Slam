// SPDX-License-Identifier: AGPL-3.0-only
// The front door: every module as a card you can tap, in order, each carrying its answers to the next. With an account
// (kept on this device until the server is connected) it shows what is done and what carrying answers forward saved.
import { h } from '../ui/dom.js';
import { Store, newHousehold } from '../records.js';
import { pack, unpack } from '../start/link.js';
import { SOLO, soloProgress, carryUrl, SECONDS_EACH } from '../solo.js';
import { progressOf } from '../journey.js';
import { newAccount, activeSpace, addShared, switchTo, removeSpace, deviceAdapter } from '../accounts.js';
import { cloudConfig } from '../cloud.js';

const $ = id => document.getElementById(id), device = deviceAdapter();
const btn = (label, onClick, kind = '') => h(`button.st-btn${kind ? '.' + kind.split(' ').join('.') : ''}`, { type: 'button', onClick }, label);
const ref = await fetch('data/reference-2026.json').then(r => r.json()), cloud = await cloudConfig();
const HERE = '#/d/';

async function draw() {
  let acct = device.loadAccount(); const space = activeSpace(acct);
  let doc = null, packed = null;
  if (location.hash.startsWith(HERE)) { packed = location.hash.slice(HERE.length); try { doc = await unpack(packed); } catch { doc = null; packed = null; } }
  if (!doc && space) { packed = device.loadSpace(space.id); if (packed) { try { doc = await unpack(packed); } catch { doc = null; packed = null; } } }
  const store = new Store(doc ?? newHousehold({ name: 'My plan' }));
  const P = soloProgress(store.doc, ref, { planDone: (() => { try { return progressOf(store.doc, ref).done && store.doc.profile?.birthYear != null; } catch { return false; } })() });
  const save = a => { device.saveAccount(a); if (packed && !device.loadSpace(activeSpace(a).id) && a.spaces.length === 1) device.saveSpace(activeSpace(a).id, packed); history.replaceState(null, '', location.pathname); draw(); };
  $('step').textContent = `${P.done} of ${P.of} done`;
  const href = s => (packed ? carryUrl(s.id, packed) : s.page);
  const word = s => (s.done ? 'Done' : s.started ? 'Started' : s.needs && s.ready ? `${s.ready} of ${s.needs} answers already in` : 'Start');
  const accountCard = !acct
    ? h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, 'Keep your place'), h('p.st-small', {}, 'Make an account on this device and every step remembers where you left off, shows what is done, and counts what you did not have to type twice. No email, no password.'),
        h('div.st-row', {}, btn('Make my account', () => save(newAccount('Me')), 'primary'), h('span.st-small.st-soft', {}, cloud ? 'Sign-in across devices is on.' : 'Sign-in across devices comes when the server is connected.')))
    : h('div.st-card', {}, h('div.st-eyebrow', {}, 'Your account, on this device'), h('h2', { style: { margin: '0 0 6px' } }, `${P.done} of ${P.of} done`),
        h('div.st-pips', { 'aria-hidden': 'true' }, P.steps.map(s => h(`i${s.done ? '.on' : ''}`))),
        h('p', { style: { fontWeight: 700, margin: '8px 0' } }, P.reused ? `${P.answers} answers on file, used again ${P.reused} ${P.reused === 1 ? 'time' : 'times'} across the steps. That is about ${P.minutesSaved < 1 ? `${P.reused * SECONDS_EACH} seconds` : `${P.minutesSaved} ${P.minutesSaved === 1 ? 'minute' : 'minutes'}`} of finding and typing you did not repeat.` : 'Each answer you give is used again by the steps after it. The count shows here.'),
        h('div.st-field', {}, h('div.st-flabel', {}, 'Whose plan'), h('div.st-chips', {}, acct.spaces.map(s => h('button.st-chip', { type: 'button', 'aria-pressed': s.id === acct.active ? 'true' : 'false', onClick: () => save(switchTo(acct, s.id)) }, s.kind === 'mine' ? 'Mine' : `Ours (${s.members.join(' and ')})`)),
          acct.spaces.some(s => s.kind === 'shared') ? null : h('button.st-chip', { type: 'button', 'aria-pressed': 'false', onClick: () => save(addShared(acct)) }, '+ One we share'))),
        space?.kind === 'shared' ? h('p.st-small', {}, 'A shared plan is one set of numbers you both fill in. Until sign-in is connected, send it with "Copy my link" on any step and they open it on their phone. ', btn('Remove the shared one', () => save(removeSpace(acct, space.id)), 'slim text')) : null,
        h('div.st-row', {}, btn('Sign out on this device', () => { device.signOut(); draw(); }, 'slim text')));
  $('main').replaceChildren(
    h('div.st-card.hero', {}, h('div.st-eyebrow', {}, 'Stress Less About Money'), h('h1', {}, 'One thing at a time'), h('p', { style: { marginBottom: 0 } }, 'Each module is one question, answered properly, in a few minutes. Your answers ride along to the next one, so nothing is typed twice. Start anywhere.')),
    acct ? accountCard : null,
    h('ol.st-hub', {}, P.steps.map((s, i) => h('li', {}, h(`a.st-hubcard${s.done ? '.done' : ''}${P.next?.id === s.id ? '.st-pulse' : ''}`, { href: href(s) }, h('span.st-hubnum', { 'aria-hidden': 'true' }, s.done ? '✓' : i + 1), h('span', {}, h('strong', {}, s.title), h('small', {}, s.blurb)), h(`span.st-hubword${s.done ? '.ok' : ''}`, {}, word(s)))))),
    acct ? null : accountCard,
    h('div.st-card', {}, h('h2', { style: { marginTop: 0 } }, 'More to explore'), h('p.st-small', {}, 'Inside the whole plan: fire drills to practice a hard month, a map of everything, a money meeting for two, and twenty what-if tools.'), h('div.st-row', {}, h('a.st-btn.slim', { href: href(SOLO.at(-1)) }, 'Open the whole plan'))));
  $('foot').replaceChildren(h('p.st-small', {}, 'Education, not advice. Nothing is uploaded: your answers stay in your browser and in the link you choose to share.'));
}
draw();
