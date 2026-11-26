# Passkeys and app lock: what Eli does

Run Not built, groups 1 to 5, Part 10b (Nov 26 2026).

## App lock (on now, nothing to do)

App lock works today, on each device by itself: Menu, Settings and account, App lock. A person sets a PIN by taps, and can add the device's own lock (fingerprint, face or the device PIN) where the browser has it. The setting stays in that browser only. It hides the game; it does not scramble what the browser keeps. The PIN is kept only as a salted SHA-256.

## Passkey sign-in (built, switched off)

The code is in `game/account/lock.js` (`lkPasskeySignIn`, `lkPasskeyAdd`). The switch `PASSKEY_READY` at the top of that file is `false`. While it is false, no passkey call is made, and the button under App lock says it is coming.

To turn it on:

1. In the Supabase dashboard of the game's project, open Authentication and turn on passkeys (WebAuthn) for sign-in, if the project offers it. Supabase listed passkeys as beta when this was built.
2. Set the relying party (the site) to `sapphirestoneage.github.io`, and add `https://sapphirestoneage.github.io` to the allowed origins and redirect addresses.
3. Check the names of the passkey calls in the supabase-js version the game loads (`game/index.html` loads `@supabase/supabase-js@2`). `lkPasskeyApi()` looks for `signInWithPasskey` or `signInWithWebAuthn`, and `registerPasskey` or `addPasskey`. If Supabase named them differently, change those two lists.
4. Set `PASSKEY_READY = true`, run the game steps (prettier, `node tools/game_stamp.cjs`, `python3 tools/game_codemap.py`, `npm run test:game`), and test one sign-in with a test account on the live site before telling players.

No secret key is needed in the repository. The game uses only the public key that is already in `game/account/supa.js`.
