// SPDX-License-Identifier: AGPL-3.0-only
// Test Drive on start.html: a slim bar docked at the bottom, shown only after the page was opened once with ?dev=1 on
// this device (?dev=0 turns it off). Pick a made-up person, load them in one tap or walk their answers one step at a
// time: each step is saved through the journey's own functions, the thing that changed pulses, and a card says what
// happened, what moved, why, and whether the numbers match a check by hand. One tap flags a step for the fix list.
// Nothing here calculates: every number comes from js/testdrive.js, which reads the journey's own plan.
import { h, clear } from '../ui/dom.js';
import { PERSONAS, personaOf, applyStep, numbersNow, changesOf, whyOf, whatOf, whereOf, levelNumber, checksOf, runPersona, stepBeforeLevel, REASONS, SEVERITIES, issuesCsv, fixPrompt } from '../testdrive.js';
import { levelOf } from '../sharpen.js';
import { saveClient, loadClient, removeClient, createClient } from '../storage.js';
import { exportFile, importFile } from '../records.js';
import { fmt } from '../math/result.js';

const KEY = 'slam.testdrive', ISSUES = 'slam.testdrive.issues', SNAPS = 'slam.testdrive.snaps', MAX_SNAPS = 6, AUTO_MS = 3500;

export function testDrive(app) {
  const { ref, priors, flags, adapter } = app;
  const st = () => adapter.get(KEY) || {};
  const keep = patch => adapter.set(KEY, { ...st(), ...patch });
  const dev = new URLSearchParams(location.search).get('dev');
  if (dev === '1') keep({ on: true });
  if (dev === '0') keep({ on: false });
  const on = () => !!st().on;
  const issues = () => adapter.get(ISSUES) || [];
  const snaps = () => adapter.get(SNAPS) || [];
  let pins = null;
  if (on()) fetch('fixtures/testdrive-pins.json').then(r => (r.ok ? r.json() : null)).then(j => { pins = j; }).catch(() => {});

  const v = { open: false, tab: 'people', persona: st().persona ?? PERSONAS[0].id, walk: null, flag: null, mode: 'step', voice: st().voice ?? 'tester', note: null, confirmClear: false, prompt: null, timer: null };
  const opts = () => ({ flags, pins });
  const btn = (label, onClick, kind = '', attrs = {}) => h(`button.st-btn.slim${kind ? '.' + kind.split(' ').join('.') : ''}`, { type: 'button', onClick, ...attrs }, label);
  const chip = (label, pressed, onClick, attrs = {}) => h('button.st-chip', { type: 'button', 'aria-pressed': pressed ? 'true' : 'false', onClick, ...attrs }, label);
  const showV = (val, unit) => (val == null ? 'none yet' : unit === 'money' ? fmt.money(val) : String(val));
  const secs = ms => { const s = Math.round(ms / 1000); return s < 60 ? `${s} sec` : `${Math.floor(s / 60)} min ${s % 60} sec`; };

  // ---------- The made-up plan lives in its own file, so the person's real plan is never touched ----------
  function swap(doc) {
    const s = st(), old = s.client;
    if (!old) keep({ back: app.here().clientId ?? null });
    saveClient(adapter, doc);
    app.open(doc); // saves the plan that was open first
    if (old && old !== doc.id && old !== st().back) removeClient(adapter, old);
    keep({ client: doc.id, persona: v.persona });
  }
  function leave() {
    stopTimer();
    const s = st(), mineDoc = s.back ? loadClient(adapter, s.back) : null;
    app.open(mineDoc || createClient(adapter, 'My plan', new Date().toISOString()));
    if (s.client && s.client !== s.back) removeClient(adapter, s.client);
    keep({ client: null, back: null });
    v.walk = null; v.flag = null; v.note = 'Back on your own plan. The made-up one is gone.';
    app.go('plan');
  }
  const inTest = () => !!st().client;

  // ---------- Load, jump, reset ----------
  function load(upTo = null, note = null) {
    stopTimer();
    const p = personaOf(v.persona), r = runPersona(p, ref, priors, { ...opts(), upTo: upTo ?? p.steps.length - 1 });
    swap(r.store.doc);
    v.walk = null; v.flag = null; v.note = note;
    return r;
  }
  function loadAll() { const p = personaOf(v.persona); load(null, `${p.name} is loaded: all ${p.steps.length} answers, saved through the journey's own steps.`); v.open = false; app.go('plan'); }
  function reset() { const p = personaOf(v.persona); load(-1, `${p.name} starts from a blank plan.`); v.open = false; app.go('you'); }
  function jump(n) {
    const p = personaOf(v.persona), at = stepBeforeLevel(p, n, ref), r = load(at, `${p.name} is ready at level ${n}: everything before it is answered.`);
    const next = p.steps[at + 1]; v.open = false;
    if (n <= 1 || !next) return app.go(r.progress.hasAge ? 'numbers' : 'you');
    const w = whereOf(next); app.go(w.stage, { q: w.q, flash: w.flash });
  }
  const levelCount = p => runPersona(p, ref, priors, opts()).levels.length + 1;

  // ---------- The walk ----------
  const stopTimer = () => { if (v.timer) { clearTimeout(v.timer); v.timer = null; } };
  function stamp() { const w = v.walk; if (w?.shownAt && w.i >= 0 && w.trail[w.i]) { const k = w.trail[w.i].level ?? 1; w.times[k] = (w.times[k] || 0) + (performance.now() - w.shownAt); w.shownAt = null; } }
  function startWalk(from = -1) {
    const p = personaOf(v.persona), r = load(from);
    v.walk = { id: p.id, i: from, trail: r.trail, times: {}, shownAt: null, done: false, total: p.steps.length };
    v.open = false; v.mode = v.mode === 'instant' ? 'step' : v.mode;
    next();
  }
  function play(i) {
    const w = v.walk, p = personaOf(w.id), step = p.steps[i], store = app.store();
    const before = numbersNow(store.doc, ref, priors, { flags });
    const saved = applyStep(store, step, ref);
    const after = numbersNow(store.doc, ref, priors, { flags });
    w.trail[i] = { i, step, saved, level: levelNumber(store.doc, step), what: whatOf(step, store.doc), why: whyOf(step), changes: changesOf(before, after), numbers: after, checks: checksOf(p, i, after, pins) };
    w.i = i;
  }
  function next() {
    const w = v.walk; if (!w) return;
    stopTimer(); stamp(); v.flag = null;
    if (w.i >= w.total - 1) { w.done = true; app.go('plan'); return; }
    play(w.i + 1);
    if (v.mode === 'instant') { while (w.i < w.total - 1) play(w.i + 1); w.done = true; app.go('plan'); return; }
    present();
  }
  function prev() {
    const w = v.walk; if (!w || w.i <= 0) return;
    stopTimer(); stamp(); v.flag = null;
    const p = personaOf(w.id), r = runPersona(p, ref, priors, { ...opts(), upTo: w.i - 1 });
    swap(r.store.doc);
    w.trail = r.trail; w.i -= 1; w.done = false;
    present();
  }
  function present() {
    const w = v.walk, t = w.trail[w.i], where = whereOf(t.step);
    w.shownAt = performance.now();
    app.go(where.stage, { q: where.q, flash: where.flash });
    if (v.mode === 'auto') v.timer = setTimeout(next, AUTO_MS);
  }
  function endWalk() { stopTimer(); stamp(); v.walk = null; v.flag = null; draw(); }

  // ---------- Flag a step, keep the list ----------
  function saveFlag() {
    const f = v.flag, w = v.walk, t = w && w.i >= 0 ? w.trail[w.i] : null, p = personaOf(inTest() ? v.persona : null);
    adapter.set(ISSUES, [...issues(), { when: new Date().toISOString(), severity: f.severity, reason: f.reason, persona: p ? `${p.name} (${p.id})` : 'My own plan', level: t?.level ?? '', step: t ? `${t.i + 1} of ${w.total}` : '',
      screen: location.hash || '#/', what: t?.what ?? '', changed: t ? t.changes.map(c => `${c.label}: ${showV(c.before, c.unit)} to ${showV(c.after, c.unit)}`).join('; ') : '',
      checks: t ? t.checks.map(c => `${c.label} ${c.kind === 'hand' ? 'by hand' : 'signed off'} ${showV(c.expected, c.unit)}, app ${showV(c.got, c.unit)}${c.ok ? '' : ' (differs)'}`).join('; ') : '', width: innerWidth, note: f.note.trim() }]);
    v.flag = null; v.note = 'Flagged. It is on the issue list.'; draw();
  }
  const sorted = () => issues().map((x, i) => ({ ...x, i })).sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || a.when.localeCompare(b.when));
  function download(name, text, type) { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name }); document.body.append(a); a.click(); a.remove(); }
  async function copyPrompt() {
    const text = fixPrompt(issues());
    if (!text) { v.note = 'Nothing is marked "Breaks the task" yet, so there is nothing to put in a fix prompt.'; return draw(); }
    try { await navigator.clipboard.writeText(text); v.note = 'Fix prompt copied. Paste it into Claude Code.'; v.prompt = null; } catch { v.prompt = text; }
    draw();
  }

  // ---------- Snapshots: the plan as it stands, to come back to ----------
  function saveSnap() {
    const p = inTest() ? personaOf(v.persona) : null, d = new Date(), w = v.walk;
    const name = `${p ? p.name : 'My plan'}${w && w.i >= 0 ? `, step ${w.i + 1}` : ''}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    try { adapter.set(SNAPS, [...snaps(), { name, at: d.toISOString(), persona: p?.id ?? null, file: exportFile(app.store().doc) }].slice(-MAX_SNAPS)); v.note = `Saved "${name}". The newest ${MAX_SNAPS} are kept.`; }
    catch { v.note = 'This browser is out of room for another snapshot. Remove one first.'; }
    draw();
  }
  function restoreSnap(i) {
    const s = snaps()[i]; if (!s) return;
    stopTimer();
    const doc = importFile(JSON.stringify(s.file));
    doc.id = `td-${Date.now().toString(36)}`; doc.client = { ...doc.client, name: `Snapshot: ${s.name}` }; // always a copy, so a real plan is never written over
    if (s.persona) v.persona = s.persona;
    swap(doc); v.walk = null; v.flag = null; v.open = false; v.note = `Opened a copy of "${s.name}".`;
    app.go('plan');
  }

  // ---------- Drawing ----------
  function dock() { let el = document.getElementById('td'); if (!el) { el = h('aside.td', { id: 'td', 'aria-label': 'Test Drive' }); document.body.append(el); } return el; }
  const head = (title, kids) => h('div.td-sec', {}, h('div.td-h', {}, title), kids);

  function card() {
    const w = v.walk, p = personaOf(w.id);
    if (w.done) {
      const all = w.trail.filter(Boolean).flatMap(t => t.checks), off = all.filter(c => !c.ok), unsaved = w.trail.filter(t => t && !t.saved);
      const r = runPersona(p, ref, priors, opts()), times = Object.entries(w.times).sort((a, b) => a[0] - b[0]);
      return h('div.td-card', { role: 'region', 'aria-label': 'Walk finished' },
        h('div.td-top', {}, h('strong', {}, `${p.name}: all ${w.total} steps done`), btn('Close', endWalk, 'text')),
        h('ul.td-list', {},
          h('li', {}, `Levels: ${r.levels.filter(l => l.state === 'done').length + 1} answered, ${r.levels.filter(l => l.state === 'skip').length} skipped because they do not apply${r.open.length ? `, ${r.open.length} left open on purpose (${r.open.map(id => levelOf(id).title).join(', ')})` : ''}.`),
          h('li', {}, all.length ? (off.length ? h('span.td-off', {}, `Checks: ${all.length - off.length} of ${all.length} match. ${off.length} differ: ${off.map(c => c.label).join(', ')}.`) : `Checks: all ${all.length} match.`) : 'No checks ran.'),
          unsaved.length ? h('li', {}, h('span.td-off', {}, `${unsaved.length} ${unsaved.length === 1 ? 'answer was' : 'answers were'} not saved by the journey: step ${unsaved.map(t => t.i + 1).join(', ')}.`)) : null,
          times.length ? h('li', {}, `Your time on each level: ${times.map(([k, ms]) => `level ${k} ${secs(ms)}`).join(', ')}.`) : null,
          h('li', {}, `Flagged so far: ${issues().length}.`)),
        h('div.st-row', {}, btn('Look around this plan', endWalk, 'primary'), btn('Walk again', () => startWalk(-1)), btn('See the issue list', () => { endWalk(); v.open = true; v.tab = 'issues'; draw(); })));
    }
    const t = w.trail[w.i], tester = v.voice === 'tester', L = t.step.kind === 'level' ? levelOf(t.step.id) : null;
    const moved = t.changes.filter(c => tester || c.key !== 'sharp');
    const via = t.step.kind === 'level' ? `the "${L.title}" level's own save (js/sharpen.js)` : t.step.kind === 'benefit' ? 'answerBenefit (js/journey.js)' : t.step.kind === 'answer' ? `answer("${t.step.key}") (js/journey.js)` : 'the About you screen (profile)';
    return h('div.td-card', { role: 'region', 'aria-label': 'Test Drive step' },
      h('div.td-top', {},
        h('strong', {}, `${p.name} · Step ${t.i + 1} of ${w.total}${t.level ? ` · Level ${t.level}` : ''}`),
        h('span.td-seg', { role: 'group', 'aria-label': 'Wording' }, chip('Plain', !tester, () => { v.voice = 'plain'; keep({ voice: 'plain' }); draw(); }), chip('Tester', tester, () => { v.voice = 'tester'; keep({ voice: 'tester' }); draw(); })),
        h('span.td-seg', { role: 'group', 'aria-label': 'Speed' }, [['step', 'Step'], ['auto', 'Auto'], ['instant', 'Instant']].map(([k, label]) => chip(label, v.mode === k, () => { v.mode = k; stopTimer(); if (k === 'auto') v.timer = setTimeout(next, AUTO_MS); if (k === 'instant') return next(); draw(); }, { title: k === 'step' ? 'Waits for Next' : k === 'auto' ? 'Moves on by itself every few seconds' : 'Runs the rest at once' }))),
        btn('Stop', endWalk, 'text', { title: 'Stop the walk and keep the plan as it is' })),
      head('What happened', h('p', {}, t.what, t.saved ? null : h('span.td-off', {}, ' The journey did not save this answer.'))),
      head('What changed', moved.length
        ? h('div.td-moves', {}, moved.map(c => h('div.td-move', {}, h('span.td-k', {}, c.label), h('span.td-v', {}, c.before == null && t.i === 0 ? null : [h('span.td-was', {}, showV(c.before, c.unit)), ' → '], h('strong', {}, showV(c.after, c.unit))), tester && c.rule ? h('span.td-rule', {}, c.rule) : null)))
        : h('p', {}, 'None of the headline numbers moved.', L ? ` This level unlocks: ${L.unlocks.join(', ')}.` : '')),
      t.numbers?.typical > 0 && t.i > 0 ? h('p.td-fine', {}, `${t.numbers.typical} of the five answers ${t.numbers.typical === 1 ? 'is' : 'are'} still a typical amount, so these numbers keep moving until they are answered.`) : null,
      head('Why', [h('p', {}, t.why.plain), tester ? h('p.td-fine', {}, `Saved through ${via}. Rules: ${t.why.rules.map(r => `${r.id} ${r.name}`).join(', ') || 'none'}.`) : null]),
      t.checks.length ? head('Check', h('div.td-moves', {}, t.checks.filter(c => tester || c.kind === 'hand').map(c => h(`div.td-move${c.ok ? '.ok' : '.off'}`, { title: c.note },
        h('span.td-k', {}, `${c.ok ? '✓' : '!'} ${c.label}`), h('span.td-v', {}, c.ok ? `Matches ${c.kind === 'hand' ? 'by hand' : 'the signed-off run'}: ${showV(c.got, c.unit)}` : `Differs. ${c.kind === 'hand' ? 'By hand' : 'Signed off'}: ${showV(c.expected, c.unit)}. App: ${showV(c.got, c.unit)}`),
        tester && c.kind === 'hand' ? h('span.td-rule', {}, c.note) : null)))) : null,
      v.flag ? flagForm() : h('div.st-row.td-actions', {}, btn('‹ Back', prev, '', { disabled: w.i <= 0 }), btn(w.i >= w.total - 1 ? 'Finish' : 'Next ›', next, 'primary', { id: 'td-next' }), btn('Flag this', () => { stopTimer(); v.flag = { reason: null, severity: null, note: '' }; draw(); })));
  }
  function flagForm() {
    const f = v.flag, ready = f.reason && f.severity;
    return h('div.td-flag', {},
      head('What is it?', h('div.td-chips', {}, REASONS.map(r => chip(r, f.reason === r, () => { f.reason = r; draw(); })))),
      head('How much does it matter?', h('div.td-chips', {}, SEVERITIES.map(s => chip(s, f.severity === s, () => { f.severity = s; draw(); })))),
      h('input.td-note', { type: 'text', 'aria-label': 'A short note, if you want one', placeholder: 'A short note, if you want one', value: f.note, onInput: e => { f.note = e.target.value; } }),
      h('div.st-row.td-actions', {}, btn('Cancel', () => { v.flag = null; draw(); }), btn('Save flag', saveFlag, 'primary', { disabled: !ready, title: ready ? null : 'Pick what it is and how much it matters' })));
  }
  function panel() {
    const p = personaOf(v.persona), tab = (id, label) => chip(label, v.tab === id, () => { v.tab = id; v.confirmClear = false; v.prompt = null; draw(); });
    const body = v.tab === 'people' ? [
      h('div.td-chips', { role: 'group', 'aria-label': 'Pick a person' }, PERSONAS.map(x => chip(x.name, x.id === v.persona, () => { v.persona = x.id; draw(); }, { title: x.short }))),
      h('p.td-fine', {}, h('strong', {}, `${p.name}: ${p.short}. `), p.about, ` ${p.steps.length} steps.`),
      h('div.st-row', {}, btn('Walk me through', () => startWalk(-1), 'primary', { title: 'One step at a time, with what happened and why' }), btn('Load instantly', loadAll, '', { title: 'Every answer at once' }), btn('Start blank', reset, '', { title: 'This person with nothing answered yet' })),
      head('Jump to a level (everything before it is answered)', h('div.td-chips', {}, Array.from({ length: levelCount(p) }, (_, i) => chip(String(i + 1), false, () => jump(i + 1), { 'aria-label': `Jump to level ${i + 1}` })))),
    ] : v.tab === 'issues' ? [
      issues().length ? h('ul.td-issues', {}, sorted().map(x => h('li', {}, h('span.td-tag', {}, x.severity), h('span.td-what', {}, h('strong', {}, x.reason), ` ${x.persona}${x.level ? `, level ${x.level}` : ''}${x.step ? `, step ${x.step}` : ''}, ${x.screen}${x.note ? `. ${x.note}` : ''}`),
        btn('Remove', () => { adapter.set(ISSUES, issues().filter((_, i) => i !== x.i)); draw(); }, 'text')))) : h('p', {}, 'Nothing flagged yet. Tap "Flag this" on any step, or "Flag this screen" below.'),
      h('div.st-row', {}, btn('Export as a spreadsheet (CSV)', () => download(`slam-issues-${new Date().toISOString().slice(0, 10)}.csv`, issuesCsv(sorted()), 'text/csv'), '', { disabled: !issues().length }),
        btn('Copy as a fix prompt', copyPrompt, 'primary', { disabled: !issues().length, title: 'Only the ones marked Breaks the task, as one batch' }),
        v.confirmClear ? [h('span', {}, 'Clear the whole list?'), btn('Yes, clear it', () => { adapter.set(ISSUES, []); v.confirmClear = false; draw(); }), btn('Keep it', () => { v.confirmClear = false; draw(); })] : btn('Clear all', () => { v.confirmClear = true; draw(); }, 'text', { disabled: !issues().length })),
      v.prompt ? h('textarea.td-prompt', { readonly: true, rows: 6, 'aria-label': 'The fix prompt', onFocus: e => e.target.select() }, v.prompt) : null,
    ] : [
      h('div.st-row', {}, btn('Save a snapshot of this plan', saveSnap, 'primary')),
      snaps().length ? h('ul.td-issues', {}, snaps().map((s, i) => h('li', {}, h('span.td-what', {}, h('strong', {}, s.name)), btn('Open a copy', () => restoreSnap(i)), btn('Remove', () => { adapter.set(SNAPS, snaps().filter((_, k) => k !== i)); draw(); }, 'text')))) : h('p', {}, 'No snapshots yet. A snapshot keeps the plan exactly as it is right now, so you can come back to this moment.'),
    ];
    return h('div.td-panel', {},
      h('div.st-row.td-tabs', { role: 'group', 'aria-label': 'Test Drive sections' }, tab('people', 'People'), tab('issues', `Issues (${issues().length})`), tab('snaps', `Snapshots (${snaps().length})`)),
      body,
      h('div.st-row.td-foot', {}, inTest() ? btn('Back to my own plan', leave, '', { title: 'Removes the made-up plan and opens yours' }) : null, btn('Flag this screen', () => { v.open = false; v.flag = { reason: null, severity: null, note: '' }; draw(); }),
        btn('Turn Test Drive off', () => { if (inTest()) leave(); keep({ on: false }); draw(); }, 'text', { title: 'Hides this bar. Open the page with ?dev=1 to bring it back.' })));
  }
  function draw() {
    const el = document.getElementById('td');
    if (!on()) { el?.remove(); document.body.style.paddingBottom = ''; return; }
    const p = inTest() ? personaOf(v.persona) : null, w = v.walk;
    const line = w && !w.done && w.i >= 0 ? `${personaOf(w.id).name}, step ${w.i + 1} of ${w.total}` : p ? `Made-up plan: ${p.name}` : 'Your own plan';
    clear(dock(),
      w ? card() : v.flag ? h('div.td-card', {}, h('div.td-top', {}, h('strong', {}, `Flag this screen (${location.hash || '#/'})`)), flagForm()) : null,
      v.open && !w ? panel() : null,
      v.note ? h('div.td-status', { role: 'status' }, v.note) : null,
      w ? null : h('div.td-bar', {}, h('button.td-toggle', { type: 'button', 'aria-expanded': v.open ? 'true' : 'false', disabled: !!w, title: w ? 'Stop the walk to open the menu' : null, onClick: () => { v.open = !v.open; v.note = null; draw(); } }, `${v.open ? '▾' : '▸'} Test Drive`), h('span.td-line', {}, line)));
    const key = w ? `${w.id}:${w.i}:${w.done}:${!!v.flag}` : `${v.open}:${v.tab}`;
    if (key !== v.drawn) { dock().scrollTop = 0; v.drawn = key; } // a new step starts at the top of its card
    document.body.style.paddingBottom = `${dock().offsetHeight + 12}px`;
  }
  // After every screen draw: move the pulse to the thing this step changed, and redraw the dock.
  function after() {
    if (!on()) return;
    const w = v.walk;
    draw();
    if (!w || w.done || w.i < 0) return;
    const where = whereOf(w.trail[w.i].step), at = w.i;
    if (app.ui.stage !== where.stage) return;
    // Parts of a screen draw themselves a moment later and pulse their own button, so the pulse is settled a few times.
    const settle = scroll => {
      if (v.walk !== w || w.i !== at || w.done || app.ui.stage !== where.stage) return;
      const main = document.getElementById('main'), target = where.anchor.split(',').map(s => main.querySelector(s.trim())).find(Boolean);
      if (!target) return;
      for (const el of document.querySelectorAll('.st-pulse')) if (el !== target) el.classList.remove('st-pulse');
      target.classList.add('st-pulse', 'td-target');
      if (scroll) target.scrollIntoView({ block: 'start' });
    };
    settle(false);
    for (const [ms, scroll] of [[40, true], [160, false], [400, false]]) setTimeout(() => settle(scroll), ms);
  }
  if (on() && inTest() && !loadClient(adapter, st().client)) keep({ client: null, back: null }); // the made-up file is gone (storage cleared)
  return { on, after, draw };
}
