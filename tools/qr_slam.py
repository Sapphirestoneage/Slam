#!/usr/bin/env python3
"""Make docs/qr-slam.png: the QR code of the link for the slide (the front door of SLAM the Game).

Run:    python3 tools/qr_slam.py            writes docs/qr-slam.png
        python3 tools/qr_slam.py --check    also reads the picture back and compares it with the link
Needs:  pip install qrcode pillow           (and, for --check only: pip install opencv-python-headless)

The link is LINK below. It must be the same as DOOR_LINK in game/account/door.js and the link in
docs/LAUNCH-LINK.md: test/launch-link.test.js fails when the three differ. When the link changes, change
all three, then run this file again. No web service is used: the picture is made on this machine.
"""
import os
import sys

LINK = "https://sapphirestoneage.github.io/Slam/game/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "qr-slam.png")
MIN_WIDTH = 1000  # pixels
QUIET = 4  # modules of white around the code (the QR standard asks for 4)


def make():
    import qrcode
    from qrcode.constants import ERROR_CORRECT_Q

    # Q: a quarter of the code can be covered or blurred (a projector, a phone held at an angle) and it still reads.
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_Q, border=QUIET, box_size=1)
    qr.add_data(LINK)
    qr.make(fit=True)
    modules = qr.modules_count + 2 * QUIET
    qr.box_size = -(-MIN_WIDTH // modules)  # round up, so each module is a whole number of pixels
    img = qr.make_image(fill_color="black", back_color="white").convert("L")
    img.save(OUT, optimize=True)
    return img.size[0], qr.modules_count


def check():
    import cv2

    # Two readers of OpenCV, at full size and at a phone-screen size. One exact read is enough.
    img = cv2.imread(OUT)
    got = ""
    for reader in (cv2.QRCodeDetectorAruco(), cv2.QRCodeDetector()):
        for width in (img.shape[1], 600, 300):
            small = cv2.resize(img, (width, width), interpolation=cv2.INTER_AREA)
            got = reader.detectAndDecode(small)[0]
            if got:
                return got
    return got


if __name__ == "__main__":
    width, n = make()
    print(f"docs/qr-slam.png: {width} x {width} pixels, {n} x {n} modules, link {LINK}")
    if "--check" in sys.argv:
        got = check()
        if got != LINK:
            print(f"READ BACK DIFFERS: {got!r}")
            sys.exit(1)
        print("read back: the picture gives the exact link")
