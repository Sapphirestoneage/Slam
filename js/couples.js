// SPDX-License-Identifier: AGPL-3.0-only
// The household mode on the file (overnight F2). One place sets it, from About you or a test: the mode, Solo or
// couple (for every older reader of profile.household and client.couple), and the default person view. Nothing
// else changes: every row and every Owner tag stays, so switching Dating to Engaged to Married merged loses nothing.
import { MODES } from './registry/couples.js';

export function setHouseholdMode(store, mode) {
  if (mode != null && !MODES[mode]) throw new Error(`Unknown household mode ${mode}`);
  store.transaction('Household mode', () => {
    store.setDoc('profile', { mode, household: mode == null ? null : MODES[mode].couple ? 'Couple' : 'Solo' });
    store.setDoc('client', { couple: mode != null && MODES[mode].couple });
    store.setDoc('settings', { person: mode == null ? undefined : MODES[mode].view });
  });
}
