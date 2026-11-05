// SPDX-License-Identifier: AGPL-3.0-only
// Two measures (answer 164), asked together at the start of every session in one small prompt, kept per session
// (and per person in a couple), stored in every snapshot, charted from Day 0 on Home as a slim pair:
//   Confidence (the meta measure; the old money feeling): how confident, vs afraid, the client feels about money.
//   It rates the Mindset area and drives the debt method suggestion.
//   Joy (the local measure): how much joy the money brings; it pairs with the category joy ratings on the Budget.
// The wording lives here.
export const CONFIDENCE = {
  question: 'How confident (vs afraid) do you feel about your money?',
  label: 'Confidence',
  min: 1, max: 10,
  low: 'Afraid', high: 'Confident',
  perPerson: true,
  key: 'confidence', // doc.session.confidence[n]; older files hold session.feelings[n] (a number), read as this client's Confidence
};
export const JOY = {
  question: 'How much joy do you get from your money?',
  label: 'Joy',
  min: 1, max: 10,
  low: 'Little joy', high: 'Full of joy',
  perPerson: true, // a couple answers one each
  key: 'joy',
};
export const MEASURES = [CONFIDENCE, JOY];
