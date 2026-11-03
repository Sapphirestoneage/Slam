// Field IDs moved when data/fields.json was rebuilt from the spec (Nov 3 2026): the spec added Retire by (age) (F215)
// and Inflation (F217), so F216 to F263 moved up by two, and Return (real) became Return (after inflation) (F216).
// Saved clients and backup files name a field only on a filed parking-lot note (parking[].filedTo); migrate() moves
// those once (doc.fieldsVersion), so an old file still points each note at the field it was filed to.
export const FIELDS_VERSION = 2;
export const FIELD_MOVES = {
  F215: 'F216',
  F216: 'F218',
  F217: 'F219',
  F218: 'F220',
  F219: 'F221',
  F220: 'F222',
  F221: 'F223',
  F222: 'F224',
  F223: 'F225',
  F224: 'F226',
  F225: 'F227',
  F226: 'F228',
  F227: 'F229',
  F228: 'F230',
  F229: 'F231',
  F230: 'F232',
  F231: 'F233',
  F232: 'F234',
  F233: 'F235',
  F234: 'F236',
  F235: 'F237',
  F236: 'F238',
  F237: 'F239',
  F238: 'F240',
  F239: 'F241',
  F240: 'F242',
  F241: 'F243',
  F242: 'F244',
  F243: 'F245',
  F244: 'F246',
  F245: 'F247',
  F246: 'F248',
  F247: 'F249',
  F248: 'F250',
  F249: 'F251',
  F250: 'F252',
  F251: 'F253',
  F252: 'F254',
  F253: 'F255',
  F254: 'F256',
  F255: 'F257',
  F256: 'F258',
  F257: 'F259',
  F258: 'F260',
  F259: 'F261',
  F260: 'F262',
  F261: 'F263',
  F262: 'F264',
  F263: 'F265',
};
export function moveFieldIds(doc) {
  if ((doc.fieldsVersion ?? 1) >= FIELDS_VERSION) return doc;
  for (const n of doc.parking || []) if (n.filedTo && FIELD_MOVES[n.filedTo]) n.filedTo = FIELD_MOVES[n.filedTo];
  doc.fieldsVersion = FIELDS_VERSION;
  return doc;
}
