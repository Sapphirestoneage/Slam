# Launch checklist for Eli (soft launch, Nov 30 2026)

Six steps, in this order. Steps 1 to 5 are for you to do by hand. Step 6 can wait.
The link for the slide is **https://sapphirestoneage.github.io/Slam/game/** and its QR picture is `docs/qr-slam.png`
(`docs/LAUNCH-LINK.md`). No key or password belongs in this file, in the repository or in a chat.

## 1. Switch the public site to the branch `release` (about a minute)

Where: https://github.com/Sapphirestoneage/Slam, then **Settings**, **Pages**, **Branch**: choose `release`, the
second box stays `/ (root)`, **Save**. The same clicks, with more words, are in `docs/RELEASE.md`.

How to know it worked: wait a minute, open the link above in a private window. You see one screen with the line
"Find out if you're okay with money in 2 minutes, no typing, free." and a big **Start** button. From then on the
public site only changes when a run ends with a promote.

## 2. Paste the three database files (about five minutes)

Where: https://supabase.com/dashboard, the project of the game, then **SQL Editor**, **New query**. For each file:
open it on GitHub (the folder `supabase/migrations`), copy all of it, paste it, press **Run**, and wait for
"Success". One at a time, in this order. Each is safe to run two times.

| Order | File | What it turns on | How to know it worked | How it was checked |
|-------|------|------------------|-----------------------|--------------------|
| 1 | `20261125190000_reports.sql` | The Report button sends to you. | In the game tap **Report**, **Idea**, **Send report**: it says "Sent. Thank you." (before: "Saved on this device"). On `game/admin.html` the section **Reports inbox** shows the report (before: "This part waits for the database file"). | Run two times on a test database on the build machine, with each kind of visitor. Not run on your database. |
| 2 | `20261125190000_founding_and_referrals.sql` | The Founding Tester mark and card, and who joined through whom. | On `game/admin.html` the section reads **Founding Testers: N of 50** (before: it says that it waits). A new account that finishes setup gets the card "You're one of the first 50" on Home. | **Only read, never run anywhere.** If the SQL Editor shows a message in place of "Success", copy the message to Claude and change nothing. |
| 3 | `20261125200000_delete_my_account.sql` | **Delete my account** removes the sign-in too. | With a test account (not yours): Menu, **Privacy**, **Delete my account**, both asks. It ends with "Your account is deleted" (before: "Your saved game is deleted", and the sign-in stays). | Only read, and its words checked with a stand-in for the database. Not run anywhere. |

After file 3 has run, tell Claude: one sentence on the privacy page ("Today your sign-in ... stay until Eli removes
them by hand") is then out of date and gets changed.

## 3. Email (one switch now, the rest can be after the launch)

Where: `docs/EMAIL-SETUP.md` has each click (a free Resend account, the domain, the SMTP settings in Supabase, a
test).

Still open, and it comes first: do you own `stresslessaboutmoney.com`, and can you sign in to the place where its
DNS is managed? The steps cannot start without it (QUESTIONS 582 (a)).

**Do this part before the launch, even if the rest of the email waits:** in Supabase open **Authentication**,
then **Sign In / Providers**, then **Email**, and look at **Confirm email**. Until email works it has to be
**off**, so a new person is signed in right after sign-up. If it is on and no email service is set up, a new
person waits for an email that never arrives (the built-in sender of Supabase only writes to your own team, two
emails an hour). Nobody could look at this switch from the build machine. The
sign-in screen says "Forgot your password? Contact Eli." Nothing in the app can set a new password without an
email, so a person who is locked out before email works writes to you (QUESTIONS 591 (c)). When the two test
emails of the doc arrive, tell Claude, and the "Forgot my password" email is switched on.

How to know it worked: make an account with an address you can read. With "Confirm email" off you land in the game
at once. With it on, an email arrives within a minute.

## 4. One check by hand with a fresh account (about ten minutes)

It checks that extra content cannot be seen by a new person. The steps are in `QUESTIONS.md`, item 589 (h):

1. In a private window open the link and make a new account with an address that never had extra content.
2. Look through Home, Next Steps, My Money, My Goals, Me, the Menu, the Glossary, Theme and What's built: nothing
   extra shows, and Me has no card "Add-ons".
3. On `game/admin.html` that account shows both switches off.
4. Turn one on there, reload the game in the private window: it shows. Turn it off, reload: it is gone.
5. Sign in to `game/admin.html` with the fresh account: it says "Not the admin".

How to know it worked: each of the five lines is true. If one is not, stop and tell Claude before the launch.

## 5. A real phone (about five minutes)

1. Type the link into a phone (private window) and tap **Start**. Answer the four taps to your first number, then go on to "Finish setup" and answer the taps to the reveal. Time
   it: the promise on the first screen is 2 minutes.
2. Open `docs/qr-slam.png` on a laptop screen and point the phone camera at it. It opens the same first screen.
3. On that phone tap **Report**, **Confusing**, write three words, **Send report**. After step 2 of this list it
   says "Sent. Thank you." and the report is in your inbox on `game/admin.html`.

An iPhone with Safari is the one thing no check on the build machine could stand in for.

## 6. When there is time (does not block the launch)

- Read the phone scripts for creditors (they wait behind a "Coming soon" tag until you have read them).
- Read the thirteen entries of **What's new** (Menu). They are in Claude's words, from the run summaries.
- The open questions of the launch run: `QUESTIONS.md`, items 582, 583, 586, 587, 589, 590 and 591.
