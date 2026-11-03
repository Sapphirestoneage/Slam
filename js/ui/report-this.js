// Beta feedback (B9): a small "Report this" button on every screen. The note is saved with the screen and the time
// in the client file (session.feedback), so it goes out in the export.
import { h } from './dom.js';
import { popover, closePop, toast, button } from './staples.js';

export function reportThis(app) {
  const btn = h('button.report-this.no-print', { type: 'button', title: 'Something confusing or broken? Tell us here' }, 'Report this');
  btn.onclick = () => {
    if (!app.hasClient) { toast('Open a client first: the note is saved in their file.'); return; }
    const screen = { route: location.hash || '#/home/prep', title: document.querySelector('main h1')?.textContent?.trim() || null };
    const box = h('textarea.notes-box', { placeholder: 'What happened, or what did you expect?', 'aria-label': 'What happened', rows: 4 });
    const save = () => {
      const text = box.value.trim();
      if (!text) { box.focus(); return; }
      const list = [...(app.store.doc.session?.feedback || []), { at: new Date().toISOString(), screen: screen.route, title: screen.title, note: text }];
      app.store.setIn('session', ['feedback'], list, 'Report this');
      closePop();
      toast('Thanks. Saved with this screen and the time; it goes out with the export.');
    };
    box.onkeydown = e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); };
    popover(btn, h('div.stack', { style: { gap: '8px' } }, h('strong', {}, 'Report this'),
      h('span.muted.small', {}, `On ${screen.title || 'this screen'}. Saved with the time.`), h('label.field', { style: { width: '100%' } }, box),
      h('div.row-line', { style: { gap: '8px' } }, button('Save note', { kind: 'primary', size: 'small', onClick: save }), button('Cancel', { size: 'small', onClick: closePop }))), { width: 340 });
    setTimeout(() => box.focus());
  };
  document.body.append(btn);
}

// Coach tools › Session: the notes so far.
export function feedbackCard(ctx) {
  const list = ctx.store.doc.session?.feedback || [];
  return h('div.card', {}, h('h3', {}, `Beta notes (${list.length})`), list.length
    ? h('table.rows.mini', {}, h('tbody', {}, [...list].reverse().map(f => h('tr', {}, h('td', {}, new Date(f.at).toLocaleString()), h('td', {}, f.title || f.screen), h('td', { style: { whiteSpace: 'normal' } }, f.note)))))
    : h('p.muted.small', {}, 'None yet. The Report this button at the bottom right of every screen adds one; the export includes them.'));
}
