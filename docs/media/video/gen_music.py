#!/usr/bin/env python3
"""Generate the background bed for the demo video: a calm, warm pad with sparse soft bell notes.
Synthesised from scratch (no samples, no third-party music), so there is no licensing or Content ID risk.
Usage: python gen_music.py <seconds> <out.wav>"""
import sys, wave
import numpy as np

SR = 48000
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 175.0
OUT = sys.argv[2] if len(sys.argv) > 2 else "music.wav"
rng = np.random.default_rng(7)


def hz(n):  # MIDI note -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)


# D major, slow and unresolved-but-calm: Dmaj9 - Bm9 - Gmaj9 - A6sus
CHORDS = [[50, 57, 61, 64, 66], [47, 54, 57, 61, 62], [43, 50, 54, 57, 62], [45, 52, 54, 59, 64]]
CHORD_LEN = 8.0
t = np.arange(int(DUR * SR)) / SR
L = np.zeros_like(t)
R = np.zeros_like(t)


def env(start, length, attack=2.4, release=3.0):
    e = np.zeros_like(t)
    i0, i1 = int(start * SR), int(min(DUR, start + length + release) * SR)
    seg = t[i0:i1] - start
    a = np.clip(seg / attack, 0, 1)
    r = np.clip((start + length + release - t[i0:i1]) / release, 0, 1)
    e[i0:i1] = np.minimum(a, r) ** 1.6
    return e


k = 0
start = 0.0
while start < DUR:
    chord = CHORDS[k % len(CHORDS)]
    e = env(start, CHORD_LEN)
    m = e > 0
    for j, n in enumerate(chord):
        f = hz(n)
        amp = 0.11 if j == 0 else 0.07
        for side, det in ((L, -3.5), (R, 3.5)):  # detune in cents for width
            ff = f * 2 ** (det / 1200)
            ph = rng.uniform(0, 2 * np.pi)
            tone = np.sin(2 * np.pi * ff * t[m] + ph) + 0.18 * np.sin(4 * np.pi * ff * t[m] + ph)
            side[m] += amp * e[m] * tone
    # sparse soft bell notes from the chord, one octave up
    for b in np.arange(start + 1.0, start + CHORD_LEN, 2.0):
        if rng.random() < 0.55 or b >= DUR:
            continue
        n = rng.choice(chord[2:]) + 12
        f = hz(n)
        i0 = int(b * SR)
        i1 = min(len(t), i0 + int(4.0 * SR))
        tt = t[i0:i1] - b
        d = np.exp(-tt * 1.6) * np.clip(tt / 0.01, 0, 1)
        note = 0.045 * d * (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 3))
        pan = rng.uniform(0.35, 0.65)
        L[i0:i1] += note * (1 - pan) * 2
        R[i0:i1] += note * pan * 2
    start += CHORD_LEN
    k += 1

# slow breathing movement + master fades
lfo = 0.85 + 0.15 * np.sin(2 * np.pi * t / 11.0)
fade = np.clip(t / 3.0, 0, 1) * np.clip((DUR - t) / 5.0, 0, 1)
L *= lfo * fade
R *= lfo * fade
mx = max(np.abs(L).max(), np.abs(R).max())
st = np.stack([L, R], axis=1) / mx * 0.7
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
print(f"wrote {OUT} ({DUR:.1f}s)")
