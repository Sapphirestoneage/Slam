// SPDX-License-Identifier: AGPL-3.0-only
// Who they are with money (batch 25, Phase 4): Coach tools › Discovery gets one collapsed section, and Fast Track an
// optional last step (Do this later is one tap). Three tap checks: the FI Address, the personality letters, the money
// weather; a couple answers the letters and the weather each, and sees them side by side with one ask each. Like a
// 16Personalities or YNAB onboarding quiz: one tap per line, the result as a card, nothing typed. Never a gate or a
// verdict: the letters only tilt which skills and which words lead, and Client view hides the raw scores.
// The math is js/math/identity.js (M95); this file shows it and saves the taps.
//
// Each tap redraws only this block (the root carries .list-wrap so the shell keeps the page, and the discovery table's
// typed boxes above it, as they are).
import { h, clear, icon } from './dom.js';
import * as S from './staples.js';
import { sec, sectionOpen, rememberSection } from './sections.js';
import { sessionNo, confidenceOf } from '../program.js';
import { identityOf, onePagerLine, setAddress, toggleModifier, setLetter, setWeather, setLater, treeName } from '../math/identity.js';
import {
  DISCLAIMER, ADDRESS_QUESTIONS, MODIFIERS, AXES, STATEMENTS, ANSWERS, WEATHER_QUESTIONS, WEATHER_ANSWERS, WEATHER_WINDOW, WEATHER_LEVELS, STORM_LINE,
} from '../registry/identity.js';

export const IUI = { person: 'Me' };
// A section that opens by itself (the next one to answer) stays open after: it never folds shut under a tap.
const openSticky = (id, dflt) => { if (dflt && sectionOpen(id, null) === null) rememberSection(id, true); return dflt; };
const levelWord = id => WEATHER_LEVELS.find(l => l.id === id)?.word ?? id;

export function identityNow(ctx) {
  const doc = ctx.store.doc;
  const c = confidenceOf(doc);
  return identityOf(doc, ctx.ref, { now: ctx.now(), m: ctx.metrics(), n: sessionNo(doc), confidence: { Me: c.value, Partner: c.partner } });
}
// Fast Track asks only while Phase 4 is on and the three are not done or set for later.
export function identityWanted(ctx) {
  if (ctx.store.doc.settings?.phase4 !== true) return false;
  const I = identityNow(ctx);
  return !I.done && !I.later;
}
const focusBack = (root, key) => { if (key) root.querySelector(`[data-focus="${CSS.escape(key)}"]`)?.focus(); };
const tapRedraw = (draw, key) => { draw(); requestAnimationFrame(() => focusBack(document, key)); };

// ---------- The blocks (shared by Discovery and Fast Track) ----------
function codeCard(I) {
  const A = I.address;
  return h('div.id-code-card', {},
    h('div.id-code', { role: 'group', 'aria-label': `FI Address ${A.full}` },
      A.chars.map(c => h('div.id-char', { title: c.from }, h('strong.id-ch', {}, c.ch ?? '?'), h('span.id-word', {}, c.word))),
      A.motion ? h('div.id-char.id-flag', { title: 'The motion flag: something is changing' }, h('strong.id-ch', {}, A.motion), h('span.id-word', {}, A.motionWord)) : null,
      A.mods.length ? h('div.id-char.id-flag', { title: 'Modifiers' }, h('strong.id-ch.id-mods', {}, A.mods.join('')), h('span.id-word', {}, A.mods.map(id => MODIFIERS.find(x => x.id === id).word).join(', '))) : null),
    A.route ? h('p.id-route', {}, h('strong', {}, 'The route: '), A.route) : null);
}
function addressBlock(ctx, I, draw) {
  const A = I.address;
  const a = ctx.store.doc.profile?.identity?.address || {};
  const qs = ADDRESS_QUESTIONS.filter(q => q.only !== 'transition' || A.moving);
  const mods = a.mods || [];
  return h('div.stack.id-block', { style: { gap: '12px' } },
    codeCard(I),
    h('div.id-rows', {}, qs.map(q => {
      const cur = q.key === 'feel' ? a.feel ?? null : a[q.key] ?? null;
      const label = `Address: ${q.ask}`;
      return h('div.id-row', {}, h('span.id-text', {}, q.ask, q.key === 'feel' && !a.feel && A.feelFrom === 'confidence' ? h('span.muted.small', {}, ` Read from Confidence for now: ${A.feel}.`) : null),
        S.toggle(q.options, cur, v => { setAddress(ctx.store, q.key, v); tapRedraw(draw, `seg:${label}:${v}`); }, { label, clearable: true }));
    })),
    h('div.id-row.id-mods-row', {}, h('span.id-text', {}, 'Also true (optional)'),
      h('div.picks', { role: 'group', 'aria-label': 'Modifiers' }, MODIFIERS.map(x => {
        const fromProfile = x.id === 'q' && ctx.store.doc.profile?.equityPay === true;
        const on = mods.includes(x.id) || fromProfile;
        return h('button.pick', { type: 'button', 'aria-pressed': String(on), disabled: fromProfile, title: fromProfile ? 'From About you: equity pay' : null, 'data-focus': `id:mod:${x.id}`,
          onclick: () => { toggleModifier(ctx.store, x.id); tapRedraw(draw, `id:mod:${x.id}`); } }, on ? icon('check') : null, x.word);
      }))));
}
function lettersResult(L) {
  if (!L.ready) return h('p.muted.small', {}, `${L.count} of ${L.of} answered. The letters show after the first 8 (two for each part); all 12 make them sharper.`);
  return h('div.id-result', {},
    h('div.id-type', {}, h('strong.id-big', {}, L.type), h('span.id-type-name', {}, L.info.name), L.count < L.of ? h('span.muted.small', {}, `From ${L.count} of ${L.of}; the rest make it sharper`) : null),
    h('div.id-kv', {}, h('span.label', {}, 'Superpower'), h('span', {}, L.info.superpower)),
    h('div.id-kv', {}, h('span.label', {}, 'Shadow'), h('span', {}, L.info.shadow)),
    h('div.id-kv', {}, h('span.label', {}, 'Skills to lead with'), h('span.id-trees', {}, L.info.trees.map(t => h('span.tag.plain', {}, treeName(t))))),
    h('div.id-kv.coach-only', {}, h('span.label', {}, 'How it scored'), h('span.muted.small', {}, L.axes.map((x, i) => `${x.word} ${x.tie ? '(a tie, from what SLAM knows)' : `${Math.abs(x.score)} of 3${x.light ? ', a light lean' : ''}`}`).join(' · '))));
}
function lettersBlock(ctx, I, person, draw) {
  const P = I.people.find(p => p.person === person) ?? I.people[0];
  const answers = ctx.store.doc.profile?.identity?.letters?.[P.person] || [];
  const n = sessionNo(ctx.store.doc);
  return h('div.stack.id-block', { style: { gap: '12px' } },
    h('div.id-rows', {}, STATEMENTS.map((s, i) => {
      const label = `${P.name}: statement ${i + 1}`;
      return h('div.id-row', {}, h('span.id-text', {}, h('span.id-n', {}, `${i + 1}`), s.text),
        S.toggle(ANSWERS, answers[i] ?? null, v => { setLetter(ctx.store, ctx.ref, P.person, i, v, { now: ctx.now(), n }); tapRedraw(draw, `seg:${label}:${v}`); }, { label, clearable: true }));
    })),
    lettersResult(P.letters));
}
function weatherResult(ctx, I, P) {
  const W = P.weather;
  const c = confidenceOf(ctx.store.doc);
  const conf = P.person === 'Partner' ? c.partner : c.value;
  if (!W.level) return h('p.muted.small', {}, `${W.answered} of ${W.of} answered. The weather shows after four.`);
  return h('div.id-result', {},
    h('div.id-type', {}, h('strong.id-big', {}, W.level), h('span.id-type-name', {}, levelWord(W.level)), h('span.muted.small.coach-only', {}, `${W.score} of 12`)),
    W.level === 'Storm' ? h('p.id-calm', { role: 'note' }, STORM_LINE) : null,
    h('p.muted.small', {}, `Session ${W.n}. ${conf != null ? `Confidence ${conf} of 10 this session.` : 'Confidence is asked on Home at the start of each session.'}`));
}
function weatherBlock(ctx, I, person, draw) {
  const P = I.people.find(p => p.person === person) ?? I.people[0];
  const n = sessionNo(ctx.store.doc);
  const answers = P.weather.answers;
  return h('div.stack.id-block', { style: { gap: '12px' } },
    h('p.muted.small', {}, `${WEATHER_WINDOW}, for ${P.name}.`),
    h('div.id-rows', {}, WEATHER_QUESTIONS.map((q, i) => {
      const label = `${P.name}: weather ${i + 1}`;
      return h('div.id-row', {}, h('span.id-text', {}, q.text),
        S.toggle(WEATHER_ANSWERS, answers[i] ?? null, v => { setWeather(ctx.store, n, P.person, i, v, { now: ctx.now() }); tapRedraw(draw, `seg:${label}:${v}`); }, { label, clearable: true }));
    })),
    weatherResult(ctx, I, P));
}
function pairBlock(I) {
  return h('div.id-pair', {}, I.people.map(P => h('div.id-side', {},
    h('h3', {}, P.name),
    h('div.id-kv', {}, h('span.label', {}, 'Letters'), h('span', {}, P.letters.type ? `${P.letters.type}, ${P.letters.info.name}` : `${P.letters.count} of 12 answered`)),
    h('div.id-kv', {}, h('span.label', {}, 'Weather'), h('span', {}, P.weather.level ? levelWord(P.weather.level) : `${P.weather.answered} of 6 answered`)),
    I.asks ? h('div.id-kv', {}, h('span.label', {}, 'One ask'), h('span', {}, I.asks[P.person])) : null)),
  I.asks ? h('p.muted.small.id-pair-why', {}, `The asks come from ${I.asks.differ ? 'where the two of you differ most' : 'where you both lean hardest'}: ${I.asks.axisName.toLowerCase()}.`) : null);
}
function whoToggle(I, draw) {
  if (!I.couple) return null;
  return h('div.id-row', {}, h('span.id-text', {}, 'Who is answering'),
    S.toggle(I.people.map(p => [p.person, p.name]), IUI.person, v => { IUI.person = v || 'Me'; tapRedraw(draw, `seg:Who is answering:${IUI.person}`); }, { label: 'Who is answering' }));
}
const lettersSum = (I, P) => (P.letters.type ? `${P.letters.type}, ${P.letters.info.name}` : `${P.letters.count} of 12`);
const weatherSum = P => (P.weather.level ? `${P.weather.level}, session ${P.weather.n}` : P.weather.latest ? `${P.weather.latest}, session ${P.weather.latestN}` : `${P.weather.answered} of 6`);

// ---------- Coach tools › Discovery: one collapsed section ----------
export function identitySection(app, ctx) {
  if (!app.hasClient || ctx.store.doc.settings?.phase4 !== true) return null;
  const root = h('div.list-wrap.id-root');
  const draw = () => {
    const I = identityNow(ctx);
    if (!I.couple) IUI.person = 'Me';
    const P = I.people.find(p => p.person === IUI.person) ?? I.people[0];
    const summary = I.done ? `${I.address.full} · ${I.people.map(p => p.letters.type).join(' and ')} · ${I.people.map(p => p.weather.level).join(' and ')}`
      : I.later && !I.started ? 'Set for later · about 2 minutes of taps' : I.started ? `${I.taps} taps in · ${I.address.full}` : 'Optional · about 2 minutes of taps';
    clear(root, sec('disc:identity', { title: 'Who they are with money', summary, card: true, tip: 'The FI Address, the personality letters and the money weather. Optional; it only changes which skills and words lead' },
      h('p.id-disclaimer', {}, `For ${I.couple ? `${I.people[0].name} and ${I.people[1].name}` : I.people[0].name}, the client that is open. ${DISCLAIMER}`),
      whoToggle(I, draw),
      sec('disc:identity:address', { title: 'FI Address', level: 'h3', summary: I.address.done ? `${I.address.full}: ${I.address.meaning}` : `${I.address.asks.length} ${I.address.asks.length === 1 ? 'tap' : 'taps'} to go`, open: openSticky('disc:identity:address', !I.address.done) }, addressBlock(ctx, I, draw)),
      sec(`disc:identity:letters:${P.person}`, { title: I.couple ? `Personality letters: ${P.name}` : 'Personality letters', level: 'h3', summary: lettersSum(I, P), open: openSticky(`disc:identity:letters:${P.person}`, I.address.done && !P.letters.ready) }, lettersBlock(ctx, I, P.person, draw)),
      sec(`disc:identity:weather:${P.person}`, { title: I.couple ? `Money weather: ${P.name}` : 'Money weather', level: 'h3', summary: weatherSum(P), open: openSticky(`disc:identity:weather:${P.person}`, P.letters.ready && !P.weather.level) }, weatherBlock(ctx, I, P.person, draw)),
      I.couple ? sec('disc:identity:pair', { title: 'Side by side', level: 'h3', summary: I.people.map(p => `${p.name} ${p.letters.type ?? '...'}`).join(' · '), open: openSticky('disc:identity:pair', I.done) }, pairBlock(I)) : null,
      I.lead ? h('p.muted.small', {}, `One-pager: ${I.lead}`) : null));
    root.querySelector('[data-sec="disc:identity"] .sec-caret')?.setAttribute('data-focus', 'identity');
  };
  draw();
  return root;
}

// ---------- The one-pager's one line ----------
export function identityLine(ctx) {
  if (ctx.store.doc.settings?.phase4 !== true) return null;
  const I = identityNow(ctx);
  const line = onePagerLine(I);
  if (!line) return null;
  const weather = I.people.filter(p => p.weather.latest).map(p => `${I.couple ? `${p.name} ` : ''}${p.weather.latest}`).join(', ');
  return h('p.op-identity', {}, h('strong', {}, 'Who you are with money: '), line, weather ? h('span.muted.coach-only', {}, ` · Weather: ${weather}`) : null);
}

// ---------- Fast Track: the optional last step ----------
// Pages: the address, then each person's letters and weather, then the result. Do this later is one tap on every page.
// The offer on Fast Track's done screen: one slim card, Start or Do this later (one tap each).
export function identityOffer(ctx, onStart, onLater) {
  return h('div.id-offer', { role: 'group', 'aria-label': 'Optional: who they are with money' },
    h('span.stack', { style: { gap: '2px', flex: 1, minWidth: '220px' } }, h('strong', {}, 'One more, optional: who they are with money'),
      h('span.muted.small', {}, 'The FI Address, the personality letters and the money weather. About 2 minutes of taps.')),
    h('button.btn', { type: 'button', 'data-focus': 'btn:Do this later', onclick: () => { setLater(ctx.store); onLater(); } }, 'Do this later'),
    h('button.btn', { type: 'button', 'data-focus': 'btn:Start who they are', onclick: onStart }, 'Start', icon('right')));
}
export function identityFastTrack(app, ctx, box, { onDone: done, onClose: shut }) {
  let page = 0;
  const esc = e => { if (e.key === 'Escape') onClose(); };
  const off = () => document.removeEventListener('keydown', esc);
  const onDone = () => { off(); done(); };
  const onClose = () => { off(); shut(); };
  document.addEventListener('keydown', esc);
  const pages = () => {
    const I = identityNow(ctx);
    const out = [{ title: 'Who they are with money (optional)', help: `${DISCLAIMER} About 2 minutes of taps; it changes which skills and words lead.`, body: draw => addressBlock(ctx, I, draw) }];
    for (const P of I.people) {
      out.push({ title: I.couple ? `Personality letters: ${P.name}` : 'Personality letters', help: 'One tap each. Agree, Neutral or Disagree; skip any that do not fit.', body: draw => lettersBlock(ctx, identityNow(ctx), P.person, draw) });
      out.push({ title: I.couple ? `Money weather: ${P.name}` : 'Money weather', help: 'Six taps about the last two weeks.', body: draw => weatherBlock(ctx, identityNow(ctx), P.person, draw) });
    }
    out.push({ title: 'Who they are with money', help: 'Saved on Coach tools › Discovery, and one line on the one-pager.', body: () => { const J = identityNow(ctx); return h('div.stack', { style: { gap: '14px' } }, codeCard(J), J.couple ? pairBlock(J) : h('div.id-pair', {}, lettersResult(J.people[0].letters), weatherResult(ctx, J, J.people[0]))); } });
    return out;
  };
  const draw = () => {
    const L = pages();
    const p = L[page], last = page === L.length - 1;
    clear(box,
      h('div.ft-head', {}, h('strong', {}, 'Fast Track'), h('span.muted', {}, `Optional step ${page + 1} of ${L.length}`), h('span', { style: { flex: 1 } }),
        h('button.icon-btn.tiny', { type: 'button', 'aria-label': 'Close', 'data-tip': 'Close (Fast Track is saved)', onclick: onClose }, icon('x'))),
      h('div.ft-progress', { role: 'progressbar', 'aria-valuenow': page + 1, 'aria-valuemin': 1, 'aria-valuemax': L.length }, h('span', { style: { width: `${((page + 1) / L.length) * 100}%` } })),
      h('h2', {}, p.title), h('p.muted', {}, p.help), p.body(draw),
      h('div.ft-foot', {},
        h('button.btn', { type: 'button', disabled: page === 0, onclick: () => { page -= 1; draw(); box.scrollIntoView?.({ block: 'start' }); } }, 'Back'),
        last ? null : h('button.btn', { type: 'button', 'data-focus': 'btn:Do this later', onclick: () => { setLater(ctx.store); onDone(); } }, 'Do this later'),
        h('span', { style: { flex: 1 } }),
        h('button.btn.primary', { type: 'button', onclick: () => { if (last) onDone(); else { page += 1; draw(); box.closest('.ft-overlay')?.scrollTo?.(0, 0); } } }, last ? 'Done' : 'Next', icon('right'))));
  };
  draw();
}
