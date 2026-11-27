#!/usr/bin/env python3
"""Put the QR code of the demo "Find your era" into game/era/print.html (the printable one-pager).

Run:    python3 tools/qr_era.py            writes the QR picture (inline SVG) into game/era/print.html
        python3 tools/qr_era.py --check    changes nothing; reads the picture in the page back and compares it
                                           with the link (exit 1 when it differs or when the page is stale)

The link is LINK below: the address of the demo for the Nov 30 2026 event. The picture is made by the functions
of tools/qr_slam.py (the one QR maker of this repository: the same error level and white edge), with this link in
place of its own. tools/qr_slam.py, its LINK and game/data/qr.js are not changed. No web service is used.
Needs:  pip install qrcode pillow           (and, for --check only: pip install opencv-python-headless)
"""
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qr_slam  # noqa: E402

LINK = "https://play.stresslessaboutmoney.com/game/era/"
PAGE = os.path.join(HERE, "..", "game", "era", "print.html")
MARK = re.compile(r"(<!-- QR:START[^>]*-->)(.*?)(<!-- QR:END -->)", re.S)


def svg():
    """The SVG of qr_slam.game() for LINK: the tool writes its file to a temporary place, and the SVG is read from it."""
    with tempfile.TemporaryDirectory() as d:
        qr_slam.LINK, qr_slam.GAME_JS = LINK, os.path.join(d, "qr.js")
        n = qr_slam.game()
        js = open(qr_slam.GAME_JS, encoding="utf-8").read()
    pic = re.search(r"'(<svg.*?</svg>)'", js, re.S).group(1)
    return pic.replace('aria-label="QR code for the game"', 'aria-label="QR code for Find your era"'), n


def page_with(pic):
    html = open(PAGE, encoding="utf-8").read()
    if not MARK.search(html):
        sys.exit("game/era/print.html has no QR:START and QR:END marks")
    return MARK.sub(lambda m: m.group(1) + "\n" + pic + "\n" + m.group(3), html)


def read_back():
    """Read the picture that is in the page now, with the reader of qr_slam (OpenCV)."""
    html = open(PAGE, encoding="utf-8").read()
    pic = MARK.search(html).group(2)
    with tempfile.TemporaryDirectory() as d:
        qr_slam.GAME_JS = os.path.join(d, "qr.js")
        with open(qr_slam.GAME_JS, "w", encoding="utf-8") as f:
            f.write(pic)
        return qr_slam.check_game()


if __name__ == "__main__":
    pic, n = svg()
    want = page_with(pic)
    if "--check" in sys.argv:
        if open(PAGE, encoding="utf-8").read() != want:
            print("game/era/print.html is stale: run python3 tools/qr_era.py")
            sys.exit(1)
        got = read_back()
        if got != LINK:
            print(f"READ BACK DIFFERS: {got!r}")
            sys.exit(1)
        print(f"read back: the picture in game/era/print.html gives the exact link {got}")
    else:
        with open(PAGE, "w", encoding="utf-8") as f:
            f.write(want)
        print(f"game/era/print.html: {n} x {n} modules, link {LINK}")
