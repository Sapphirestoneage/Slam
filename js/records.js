// One record type for every money item (R115), dated history on every change (R123),
// undo and redo over every change (R086), snapshots (R083, R085, R167), export and import.
// Pure: no DOM, no storage. js/storage.js saves it; the screens read it.

export const SCHEMA_VERSION = 1;
export const APP_ID = 'SLAM';

// R053. 'Not sure' shows as Guess once the app fills a typical value (R055).
export const STATUSES = ['Know it', 'Roughly', 'Not sure', 'Will email', 'Not now', 'Not for me', 'Computed'];
const DONE = new Set(['Know it', 'Roughly', 'Not sure', 'Not for me', 'Computed']); // R054, R055, R058
export const PERIODS = ['paycheck', 'week', '2 weeks', 'twice a month', 'month', 'year'];
export const SOURCES = ['manual', 'statement', 'bank']; // R116, R118

const UNDO_LIMIT = 200;
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
let counter = 0;
export const makeId = () => `r${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// A blank record. Every box starts empty, never 0 (R024).
export function blankRecord(kind, type = null) {
  return {
    id: null, kind, type,
    name: null, amount: null, per: 'month', owner: null,
    status: null, fieldStatus: {},
    paidWith: null, linkedTo: null, source: 'manual',
    covers: null, // { datePaid: 'YYYY-MM-DD', months: n } when paid in advance (R119)
    values: {},   // type-specific numbers: balance, apr, payment, value ...
    notes: null, privateNote: null, stress: null,
    createdAt: null, updatedAt: null,
  };
}

export function newHousehold({ name = null, now = new Date().toISOString(), id = makeId() } = {}) {
  return {
    app: APP_ID, schema: SCHEMA_VERSION, id,
    client: { name, couple: false },
    profile: {},
    assumptions: {}, // blank: defaults come from Reference data (R025)
    settings: { timeView: '$' }, // R154, remembered per client
    records: [], history: [], snapshots: [], parking: [],
    createdAt: now, updatedAt: now, lastBackupAt: null,
  };
}

// Status of one field: its own, else the row's (R059), else Know it once typed (R052).
export function statusOf(record, field) {
  const own = record.fieldStatus?.[field];
  if (own) return own;
  if (record.status) return record.status;
  const v = field in record ? record[field] : record.values?.[field];
  return v === null || v === undefined || v === '' ? null : 'Know it';
}
export const countsAsDone = status => DONE.has(status);

const isRecordField = f => ['name', 'amount', 'per', 'owner', 'status', 'paidWith', 'linkedTo', 'source',
  'covers', 'notes', 'privateNote', 'stress', 'type'].includes(f);

export class Store {
  constructor(doc, { now = () => new Date().toISOString(), id = makeId } = {}) {
    this.doc = doc;
    this.now = now;
    this.makeId = id;
    this.undoStack = [];
    this.redoStack = [];
    this.listeners = new Set();
    this._tx = null;
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit(change) { for (const fn of this.listeners) fn(change, this); }

  get records() { return this.doc.records; }
  get(id) { return this.doc.records.find(r => r.id === id) || null; }
  find(pred) { return this.doc.records.filter(pred); }

  // Every change runs inside one transaction: one undo step, one save, one history batch.
  transaction(label, fn) {
    if (this._tx) return fn();
    const before = this._state();
    this._tx = { label, at: this.now() };
    let result;
    try { result = fn(); }
    finally { this._tx = null; }
    const after = this._state();
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      this.doc.updatedAt = this.now();
      this.undoStack.push({ label, before, after });
      if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
      this.redoStack = [];
      this._emit({ type: 'change', label });
    }
    return result;
  }

  _state() { return clone({ records: this.doc.records, parking: this.doc.parking, profile: this.doc.profile,
    assumptions: this.doc.assumptions, client: this.doc.client }); }
  _log(entry) { this.doc.history.push({ at: this._tx?.at || this.now(), ...entry }); }

  // after: put the new row right below that one (Enter in a row, R168).
  add(kind, fields = {}, { type = fields.type ?? null, after = null } = {}) {
    return this.transaction(`Add ${kind}`, () => {
      const r = blankRecord(kind, type);
      const { values = {}, ...top } = fields;
      Object.assign(r, clone(top), { values: { ...clone(values) } });
      r.id = this.makeId();
      r.createdAt = r.updatedAt = this.now();
      const at = after ? this.doc.records.findIndex(x => x.id === after) : -1;
      if (at >= 0) this.doc.records.splice(at + 1, 0, r); else this.doc.records.push(r);
      this._log({ op: 'add', id: r.id, kind });
      for (const [f, v] of Object.entries({ ...top, ...values })) if (v !== null && v !== undefined) this._log({ op: 'set', id: r.id, field: f, from: null, to: clone(v) });
      return r;
    });
  }

  // Set one or more fields. Old values stay in history with their date (R123).
  update(id, patch) {
    return this.transaction('Edit', () => {
      const r = this.get(id);
      if (!r) throw new Error(`No record ${id}`);
      for (const [field, value] of Object.entries(patch)) {
        const top = isRecordField(field);
        const from = top ? r[field] : r.values[field];
        if (JSON.stringify(from) === JSON.stringify(value)) continue;
        if (top) r[field] = clone(value); else r.values[field] = clone(value);
        this._log({ op: 'set', id, field, from: clone(from ?? null), to: clone(value ?? null) });
      }
      r.updatedAt = this.now();
      return r;
    });
  }

  setFieldStatus(id, field, status) {
    if (status !== null && !STATUSES.includes(status)) throw new Error(`Unknown status ${status}`);
    return this.transaction('Set status', () => {
      const r = this.get(id);
      const from = r.fieldStatus[field] ?? null;
      if (status === null) delete r.fieldStatus[field]; else r.fieldStatus[field] = status;
      this._log({ op: 'status', id, field, from, to: status });
    });
  }

  // R114: one status for many rows.
  setStatus(ids, status) {
    if (status !== null && !STATUSES.includes(status)) throw new Error(`Unknown status ${status}`);
    return this.transaction(`Set status: ${status}`, () => {
      for (const id of [].concat(ids)) this.update(id, { status });
    });
  }

  duplicate(ids) {
    return this.transaction('Duplicate', () => [].concat(ids).map(id => {
      const src = this.get(id);
      const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = clone(src);
      return this.add(src.kind, { ...rest, name: src.name ? `${src.name} (copy)` : null });
    }));
  }

  // R080: removed, with an undo toast. withLinked also removes what it links to (R087).
  remove(ids, { withLinked = false } = {}) {
    const list = [].concat(ids);
    return this.transaction(list.length > 1 ? `Deleted ${list.length}` : 'Deleted', () => {
      const gone = new Set(list);
      if (withLinked) for (const id of list) { const r = this.get(id); if (r?.linkedTo) gone.add(r.linkedTo); }
      for (const id of gone) {
        const r = this.get(id);
        if (!r) continue;
        this._log({ op: 'remove', id, kind: r.kind, was: clone(r) });
      }
      this.doc.records = this.doc.records.filter(r => !gone.has(r.id));
      // Anything that pointed at a removed record now points nowhere.
      for (const r of this.doc.records) {
        if (gone.has(r.linkedTo)) this.update(r.id, { linkedTo: null });
        if (gone.has(r.paidWith)) this.update(r.id, { paidWith: null });
      }
      return gone.size;
    });
  }

  // Records linked to this one in either direction (car loan and car, R047).
  linked(id) {
    const r = this.get(id);
    return this.doc.records.filter(x => x.id !== id && (x.linkedTo === id || r?.linkedTo === x.id));
  }

  // R081: every box blank, status cleared, row kept.
  reset(ids) {
    const list = [].concat(ids);
    return this.transaction(list.length > 1 ? `Reset ${list.length}` : 'Reset', () => {
      for (const id of list) {
        const r = this.get(id);
        const blank = blankRecord(r.kind, r.type);
        const patch = {};
        for (const f of ['name', 'amount', 'owner', 'status', 'paidWith', 'covers', 'notes', 'stress']) patch[f] = blank[f];
        patch.per = blank.per;
        for (const f of Object.keys(r.values)) patch[f] = null;
        this.update(id, patch);
        r.fieldStatus = {};
        r.values = {};
      }
    });
  }

  // R082: a whole section, by kind (and type).
  resetSection(pred) {
    const ids = this.find(pred).map(r => r.id);
    return this.transaction('Cleared section', () => this.remove(ids));
  }

  setDoc(part, patch) { // profile, assumptions, client, settings
    return this.transaction(`Edit ${part}`, () => {
      for (const [k, v] of Object.entries(patch)) {
        const from = this.doc[part][k];
        if (JSON.stringify(from) === JSON.stringify(v)) continue;
        this.doc[part][k] = clone(v);
        if (part !== 'settings') this._log({ op: 'set', part, field: k, from: clone(from ?? null), to: clone(v ?? null) });
      }
    });
  }

  // Parking lot (R051): a quick note, later filed to a field.
  addNote(text) {
    return this.transaction('Note', () => {
      const n = { id: this.makeId(), text, at: this.now(), filedTo: null };
      this.doc.parking.push(n);
      return n;
    });
  }
  fileNote(noteId, fieldRef) {
    return this.transaction('Filed note', () => { this.doc.parking.find(n => n.id === noteId).filedTo = fieldRef; });
  }
  removeNote(noteId) {
    return this.transaction('Deleted', () => { this.doc.parking = this.doc.parking.filter(n => n.id !== noteId); });
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  undo() { return this._travel(this.undoStack, this.redoStack, 'before', 'undo'); }
  redo() { return this._travel(this.redoStack, this.undoStack, 'after', 'redo'); }
  _travel(from, to, side, op) {
    const step = from.pop();
    if (!step) return null;
    const current = this._state();
    this._restore(step[side], op, current);
    to.push(step);
    this.doc.updatedAt = this.now();
    this._emit({ type: op, label: step.label });
    return step.label;
  }
  _restore(state, op, current) {
    // History keeps the undo too: what each value went back to, and when.
    const byId = new Map(current.records.map(r => [r.id, r]));
    const at = this.now();
    for (const r of state.records) {
      const was = byId.get(r.id);
      if (!was) { this.doc.history.push({ at, op: `${op}:add`, id: r.id, kind: r.kind }); continue; }
      for (const f of new Set([...Object.keys(r.values), ...Object.keys(was.values)])) {
        if (JSON.stringify(r.values[f]) !== JSON.stringify(was.values[f])) this.doc.history.push({ at, op: `${op}:set`, id: r.id, field: f, from: was.values[f] ?? null, to: r.values[f] ?? null });
      }
      for (const f of ['name', 'amount', 'per', 'status', 'owner', 'paidWith', 'linkedTo']) {
        if (JSON.stringify(r[f]) !== JSON.stringify(was[f])) this.doc.history.push({ at, op: `${op}:set`, id: r.id, field: f, from: was[f] ?? null, to: r[f] ?? null });
      }
      byId.delete(r.id);
    }
    for (const id of byId.keys()) this.doc.history.push({ at, op: `${op}:remove`, id });
    Object.assign(this.doc, clone(state));
  }

  // Dated history of one field, oldest first.
  historyOf(id, field) {
    return this.doc.history.filter(h => h.id === id && h.field === field && (h.op === 'set' || h.op.endsWith(':set')))
      .map(h => ({ at: h.at, from: h.from, to: h.to }));
  }

  // Value of a field on a date, from history (null if it did not exist yet).
  valueAt(id, field, isoDate) {
    let v = null;
    for (const h of this.historyOf(id, field)) if (h.at <= isoDate) v = h.to;
    return v;
  }

  // Snapshots freeze the records (and any numbers worked out from them) for later comparison.
  snapshot(label, metrics = null) {
    const s = { id: this.makeId(), at: this.now(), label, records: clone(this.doc.records),
      profile: clone(this.doc.profile), assumptions: clone(this.doc.assumptions), metrics: clone(metrics) };
    this.doc.snapshots.push(s);
    this._emit({ type: 'snapshot', label });
    return s;
  }
  lastSnapshot() { return this.doc.snapshots[this.doc.snapshots.length - 1] || null; }
}

// R167: the difference under key numbers. No snapshot, or either side missing: nothing.
export function changeSince(current, snapshot, key) {
  const then = snapshot?.metrics?.[key];
  const now = current?.[key];
  if (then === null || then === undefined || now === null || now === undefined) return null;
  const diff = now - then;
  return { diff, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same', since: snapshot.at };
}

// Versioned export file.
export function exportFile(doc, now = new Date().toISOString()) {
  return { app: APP_ID, format: SCHEMA_VERSION, exportedAt: now, household: clone(doc) };
}

export function importFile(file) {
  const data = typeof file === 'string' ? JSON.parse(file) : file;
  if (!data || data.app !== APP_ID || !data.household) throw new Error('This is not a SLAM backup file.');
  if (data.format > SCHEMA_VERSION) throw new Error('This backup was made by a newer SLAM. Update first.');
  return migrate(clone(data.household));
}

export function migrate(doc) {
  // Version 1 is the first shape; later versions add steps here, oldest first.
  for (const k of ['records', 'history', 'snapshots', 'parking']) doc[k] ??= [];
  for (const k of ['profile', 'assumptions', 'settings', 'client']) doc[k] ??= {};
  doc.schema = SCHEMA_VERSION;
  return doc;
}

// R085: snapshot first, then replace, so an import can be undone.
export function importInto(store, file) {
  const incoming = importFile(file);
  store.snapshot('Before import');
  store.transaction('Import', () => {
    for (const k of ['records', 'parking', 'profile', 'assumptions', 'client']) store.doc[k] = incoming[k];
    store.doc.history.push(...incoming.history.filter(h => !store.doc.history.some(x => x.at === h.at && x.id === h.id && x.field === h.field)));
  });
  return store.doc;
}

// R149: older than 7 days, or never.
export function backupDue(doc, now = new Date().toISOString()) {
  if (!doc.lastBackupAt) return { due: true, days: null };
  const days = Math.floor((Date.parse(now) - Date.parse(doc.lastBackupAt)) / 86400000);
  return { due: days > 7, days };
}
