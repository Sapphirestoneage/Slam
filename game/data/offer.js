/* ============================================================================
   SLAM the Game: data/offer.js
   PURPOSE     The coaching offer of the owner, in one place (run CC-1, items 21 and 22, Nov 28 2026).
               The coach view of the game ("Pays for itself") and the public page /coaching/ read
               this one file.
   INPUT       None.
   OUTPUT      Data: COACH_OFFER.
   DEPENDS ON  Nothing. The page coaching/index.html loads this file too.
   RULES       PLACEHOLDERS FOR THE OWNER. Each value is null until Eli fills it. A null value shows
               as a marked placeholder, and a number that needs it is not worked out: no price is
               guessed in code. No add-on is named here.
   ========================================================================= */
const COACH_OFFER = {
  /* What the one offer is, in the owner's words (one or two sentences). null: not set yet. */
  what: null,
  /* The one price, in dollars, as a number (3000, not "$3,000"). null: not set yet. */
  fee: null,
  /* The payment-plan line, in the owner's words. null: not set yet. */
  plan: null,
  /* The guarantee, in the owner's words. null: not set yet. No text is made up for it. */
  guarantee: null,
  /* The address of the booking page (https://...). null: not set yet. */
  bookUrl: null,
  /* The founding-cohort note, in the owner's words (for example how many places and until when). null: not set. */
  cohort: null,
};
