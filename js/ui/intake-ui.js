// SPDX-License-Identifier: AGPL-3.0-only
// Import intake (CSV): the button beside Bring a spreadsheet back, the pick of which response (by name and when it
// was sent), and the review (Yes or No on each line) before anything is saved. The mapping is js/intake.js; this file
// only shows it.
import { h, icon } from './dom.js';
import { button, toast } from './staples.js';
import { readIntake, planIntake, applyIntake, keptLines, landsAs, wasWords } from '../intake.js';
import { keyNumbers } from '../math/metrics.js';
import { sessionCount } from '../program.js';
import { overlayOf } from './sheet-ui.js';

export const INTAKE_WORDS = {
  button: 'Import intake (CSV)',
  line: 'Answers from the intake form. You see every one before anything is saved.',
  tip: 'In the intake form\'s responses Sheet: File, Download, Comma-separated values (.csv).',
};
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export function intakeButton(app) {
  return h('div.btn-line', {}, button(INTAKE_WORDS.button, { iconName: 'upload', onClick: () => importIntake(app), tip: INTAKE_WORDS.tip }),
    h('span.muted.small', { title: INTAKE_WORDS.tip }, INTAKE_WORDS.line));
}

export function importIntake(app) {
  const input = h('input', { type: 'file', accept: '.csv,text/csv' });
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const res = readIntake(await file.text());
      if (res.problem) { toast(res.problem); return; }
      if (res.responses.length === 1) whichClient(app, res.responses[0], res);
      else pickResponse(app, res);
    } catch (e) { toast(e.message || 'That file could not be read.'); }
  };
  input.click();
}

// Several responses: pick one by name and when it was sent (newest first). The open client's name comes first.
export function pickResponse(app, res) {
  let close;
  const mine = app.hasClient ? app.store.doc.client?.name : null;
  const list = [...res.responses].sort((a, b) => (sameName(b.name, mine) ? 1 : 0) - (sameName(a.name, mine) ? 1 : 0));
  const box = h('div.ft-box.intake-box', {},
    h('div.ft-head', {}, icon('upload'), h('h2', { style: { margin: 0 } }, 'Which response?'), h('span', { style: { flex: 1 } }), button('Cancel', { onClick: () => close() })),
    h('p.muted', {}, `${plural(res.responses.length, 'response')} in this file, newest first.`),
    h('div.intake-pick', {}, list.map(r => h('button.btn.intake-row', { type: 'button', onclick: () => { close(); whichClient(app, r, res); } },
      h('strong', {}, r.name || 'No name given'), h('span.muted.small', {}, r.at ? `Sent ${r.at}` : `Row ${r.row}`), sameName(r.name, mine) ? h('span.tag', {}, 'Open now') : null))));
  close = overlayOf('Which response', box);
  return box;
}

// Into the open client, or a new client named from the form. A name that matches the open client goes straight in.
export function whichClient(app, response, res) {
  const name = response.name || 'From the intake';
  if (!app.hasClient) { app.newClientNamed(name); review(app, response, res, { fresh: true }); return null; }
  const mine = app.store.doc.client?.name || 'this client';
  if (sameName(mine, response.name)) { review(app, response, res); return null; }
  let close;
  const box = h('div.ft-box.intake-box', {},
    h('h2', { style: { marginTop: 0 } }, `These answers are from ${name}`),
    h('p', {}, `${mine} is open. Start a new client for ${name}, or bring the answers into ${mine}?`),
    h('div.ft-foot', {},
      button(`New client: ${name}`, { kind: 'primary', onClick: () => { close(); app.newClientNamed(name); review(app, response, res, { fresh: true }); } }),
      button(`Into ${mine}`, { onClick: () => { close(); review(app, response, res); } }),
      button('Cancel', { onClick: () => close() })));
  close = overlayOf('Which client', box);
  return box;
}

// The review: one line per answer, by the form's sections, collapsed to counts. Nothing is saved until Save.
export function review(app, response, res, { fresh = false } = {}) {
  let close;
  const plan = planIntake(response, app.store.doc);
  const open = new Set();
  const body = h('div');
  const status = h('span.muted.small');
  const save = button('Save these answers', { kind: 'primary', iconName: 'check', onClick: () => {
    const n = applyIntake(app.store, plan, { ref: app.ctx.ref, metrics: keyNumbers(app.ctx.metrics()), sid: `S${sessionCount(app.store.doc)}` });
    close();
    app.go('#/home/session');
    toast(n ? `Saved ${plural(n, 'answer')} from the intake. A snapshot was taken first.` : 'Nothing saved.', n ? { undo: () => app.store.undo() } : {});
  } });
  const seg = (l) => h('span.seg', { role: 'group', 'aria-label': `Keep: ${l.label}` }, [['keep', 'Yes'], ['skip', 'No']].map(([v, word]) =>
    h('button', { type: 'button', 'aria-pressed': String(l.decision === v), onclick: () => { l.decision = v; draw(); } }, word)));
  const row = l => h('div.review-line', {},
    h('div', {}, h('strong', {}, l.label), h('div.small', {}, `They said: ${l.said}`),
      h('div.small', {}, `In SLAM: ${landsAs(l)}`), wasWords(l) ? h('div.small.muted', {}, `SLAM has ${wasWords(l)} now. Yes replaces it.`) : null),
    l.kind === 'unknown' ? null : h('span.row-line', { style: { gap: '8px', flexWrap: 'nowrap' } }, h('span.small', {}, 'Keep it?'), seg(l)));
  const sections = [...new Set(plan.lines.map(l => l.section))];
  function draw() {
    const kept = keptLines(plan).length;
    save.disabled = !kept;
    status.textContent = `${plural(kept, 'answer')} to save.`;
    body.replaceChildren(...sections.map(sec => {
      const lines = plan.lines.filter(l => l.section === sec);
      const d = h('details.review-group', { open: open.has(sec) });
      d.ontoggle = () => { if (d.open) open.add(sec); else open.delete(sec); };
      const yes = lines.filter(l => l.decision === 'keep').length;
      d.append(h('summary', {}, h('strong', {}, sec), h('span.muted', {}, `  ${yes} of ${lines.length} kept`)), h('div.review-body', {}, ...lines.map(row)));
      return d;
    }));
  }
  const all = plan.lines.filter(l => l.kind !== 'unknown');
  const box = h('div.ft-box.intake-box', { style: { width: 'min(960px, 100%)' } },
    h('div.ft-head', {}, icon('upload'), h('h2', { style: { margin: 0 } }, `Intake: ${response.name || 'no name'}`), h('span', { style: { flex: 1 } }), button('Cancel', { onClick: () => close() })),
    h('p.muted', {}, `${response.at ? `Sent ${response.at}. ` : ''}${plural(all.length, 'answer')}. A range comes in as its middle, marked as a guess; a typed number as Roughly; "I'll find it" goes on the Homework list. Nothing is saved until you press Save.`),
    res.unknown.length ? h('div.nudge', {}, `${plural(res.unknown.length, 'column')} SLAM could not place (a question reworded in Google Forms?): ${res.unknown.join('; ')}.`) : null,
    h('div.row-line', { style: { margin: '8px 0' } }, button('Yes to all', { size: 'small', onClick: () => { for (const l of all) l.decision = 'keep'; draw(); } })),
    body,
    h('div.ft-foot', {}, save, button('Cancel', { onClick: () => close() }), status, h('span.muted.small', {}, 'A snapshot is taken first, and Undo puts everything back.')));
  draw();
  close = overlayOf('Import intake', box, () => { if (fresh && !app.store.canUndo && !keptLines(plan).length) toast('The new client is open, with nothing from the intake yet.'); });
  return box;
}
