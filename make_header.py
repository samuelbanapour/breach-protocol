#!/usr/bin/env python3
"""Render Game Jolt page header banners (2000x500, 4:1) as lossless PNGs.

Reuses make_thumbs.py's renderer/primitives so headers match the rest of the
press kit. Game Jolt recommends 2000x500 (ratio 4:1), PNG preferred.

    python3 make_header.py
      -> assets/header_2000x500.png           (wordmark left, emblem right)
      -> assets/header_2000x500_centered.png  (emblem + wordmark grouped, centered)
"""
import os
import pygame
from make_thumbs import make, bg, shield, fit, ltext, NEON, DIM, OUT


def make_centered(W, H):
    """Emblem + wordmark as one group, centered — safe against mobile edge-crop."""
    s = bg(W, H)
    cy = H // 2
    R = int(H * 0.32)
    f = fit("PROTOCOL", int(W * 0.42), H * 0.30)   # size on the longer word, reuse for both
    bh = f.get_height()
    tw = max(f.size("BREACH")[0], f.size("PROTOCOL")[0])
    gap = int(W * 0.03)
    x0 = (W - (2 * R + gap + tw)) // 2             # left edge of the centered group
    shield(s, x0 + R, cy, R)                       # emblem on the left of the group
    tx = x0 + 2 * R + gap                          # wordmark to its right
    block = bh * 1.9 + bh * 0.7
    y = cy - block / 2 + bh * 0.5
    ltext(s, "BREACH", tx, int(y), f, NEON);   y += bh * 0.95
    ltext(s, "PROTOCOL", tx, int(y), f, NEON); y += bh * 0.95
    tag = "Cyber tower-defense — defend or breach"
    ltext(s, tag, tx, int(y), fit(tag, tw, H * 0.07), DIM)
    return s


for surf, name in [(make(2000, 500), "header_2000x500"),
                   (make_centered(2000, 500), "header_2000x500_centered")]:
    path = os.path.join(OUT, name + ".png")
    pygame.image.save(surf, path)
    print("rendered", path)
pygame.quit()
