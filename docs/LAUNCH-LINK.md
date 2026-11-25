# The link for the slide, and its QR code

**The link:** https://sapphirestoneage.github.io/Slam/game/

**The QR code:** `docs/qr-slam.png` (1025 x 1025 pixels, black on white, with the white edge that a phone camera
needs). Put the picture on the slide as it is. Do not crop the white edge and do not put a logo on it.

## What a person sees

| Who opens the link | What they see |
|--------------------|---------------|
| A new person (no account on this phone) | The landing screen: one line, **Start**, "What is this?" and "I have an account. Sign in". |
| A person who is signed in | Their game. The landing screen does not show. |
| A person who tapped Start before and has a game on this phone, with no account yet | Their game, with one row on Home: "Keep this game: make a free account". |

Start needs no account and no typing. It opens the setup by taps under the question "Am I okay?" (7 short pages,
about 20 taps). The last tap opens the answer: what the taps say about the cushion, a surprise bill, the money left
from each paycheck, debt and investing, and the one next step. The answer is a Guess and says so. Then it offers to
save the game by making a free account. Until then the game is on that phone only.

## Marks in the link

Text after the link stays in the address while the landing screen and the sign-in screen are open, so the parts
that read it still find it: `?ref=code` (a share link), `?as=` (the admin opens a game). Example:
https://sapphirestoneage.github.io/Slam/game/?ref=abc123

## When the link changes

The link is written in three places, and `node --test` fails when they differ (`test/launch-link.test.js`):

1. This file (the line "The link" above).
2. `DOOR_LINK` in `game/account/door.js`.
3. `LINK` in `tools/qr_slam.py`.

Then make the picture again, on your own machine, with no web service:

```
pip install qrcode pillow opencv-python-headless
python3 tools/qr_slam.py --check
```

`--check` reads the picture back and compares it with the link. The public site serves the branch `release`
(`docs/RELEASE.md`): the landing screen is public after the next promote.
