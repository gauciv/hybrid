#!/usr/bin/env python3
"""Assemble the Kontrata demo video from: narration (work/vo2/*.wav), screen recordings (work/*.mp4),
cards (cards/*.png). Output: kontrata-demo.mp4 (1920x1080, 30 fps, H.264 + AAC).
Run from docs/media/video/. Everything here is git-ignored except this script and cards/cards.html."""
import json, subprocess, os, sys

FPS = 30
FONT = os.path.abspath("../../../apps/android/app/src/main/res/font/public_sans.ttf")
PAPER = "0xf5f6f4"
TL = "work/kontrata-product-tl-025849.mp4"
LAB = "work/kontrata-lab-025527.mp4"
REVIEW = "work/review.mp4"
EXT = "work/extfeed.mp4"  # mock feed + the REAL extension side panel bundle (work/fbdemo)
os.makedirs("work/scenes", exist_ok=True)


def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                                capture_output=True, text=True).stdout)


def run(args):
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", *args])
    if r.returncode:
        sys.exit("ffmpeg failed: " + " ".join(args))


# Row 06 is split so its second sentence lands on "What the cloud will see", following the page top to bottom.
ROWS = ["01", "02", "03", "04", "05", "06a", "07", "06b", "08", "09", "10", "11", "12a", "13"]
LEAD = {"01": 0.9}           # silence before the voice starts in a scene
TAIL = {"13": 2.6, "08": 2.6}           # extra hold after the voice
VO = {r: dur(f"work/vo2/{r}.wav") for r in ROWS}
D = {r: round(LEAD.get(r, 0.2) + VO[r] + TAIL.get(r, 0.35), 3) for r in ROWS}

# crops are (w, h, x, y) on the 1920x1080 recording, scaled up to 1920x1080
WIDE = (1280, 720, 310, 0)
MID = (1280, 720, 310, 120)


def drawtext(text, x="44", y="h-th-40", size=26):
    t = text.replace(":", r"\:").replace("'", "’")
    return (f"drawtext=fontfile='{FONT}':text='{t}':x={x}:y={y}:fontsize={size}:fontcolor=0xe7ecea:"
            f"box=1:boxcolor=0x1c2733d9:boxborderw=12")


def clip(src, t0, t1, speed=1.0, crop=WIDE, label=None):
    """One piece of a scene: source time range, playback speed, crop, optional label."""
    return dict(src=src, t0=t0, t1=t1, speed=speed, crop=crop, label=label)


def still(png, seconds, zoom=0.035, label=None):
    return dict(png=png, seconds=seconds, zoom=zoom, label=label)


def reveal(a, b, seconds, at, fade=0.7):
    """Still a, cross-fading into still b at `at` seconds (same layout, so only the new part appears)."""
    return dict(reveal=(a, b), seconds=seconds, at=at, fade=fade)


def render_piece(p, out):
    if "reveal" in p:
        a, b = p["reveal"]
        n = max(1, round(p["seconds"] * FPS))
        run(["-loop", "1", "-framerate", str(FPS), "-t", str(p["seconds"]), "-i", a,
             "-loop", "1", "-framerate", str(FPS), "-t", str(p["seconds"]), "-i", b,
             "-filter_complex", f"[0]scale=1920:1080,format=yuv420p[a];[1]scale=1920:1080,format=yuv420p[b];"
             f"[a][b]xfade=transition=fade:duration={p['fade']}:offset={p['at']}",
             "-frames:v", str(n), "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "medium", out])
    elif "png" in p:
        n = max(1, round(p["seconds"] * FPS))
        # Perfectly still (a slow zoom here jittered: zoompan moves in whole pixels).
        vf = "scale=1920:1080" + (f",{drawtext(p['label'])}" if p["label"] else "")
        run(["-loop", "1", "-framerate", str(FPS), "-i", p["png"], "-vf", vf, "-frames:v", str(n), "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "medium", out])
    else:
        w, h, x, y = p["crop"]
        vf = f"crop={w}:{h}:{x}:{y},scale=1920:1080:flags=lanczos,setpts=(PTS-STARTPTS)/{p['speed']},fps={FPS}"
        if p["label"]:
            vf += "," + drawtext(p["label"])
        run(["-ss", str(p["t0"]), "-to", str(p["t1"]), "-i", p["src"], "-vf", vf, "-an", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "medium", out])


REAL = "Real recording · Gemini Nano in Chrome · mid-range laptop"
# Product walkthrough = ONE continuous take, top to bottom; only the playback speed changes between rows.
P0 = (1440, 810, 240, 0)                                  # top of the page (header + composer)
P = (1440, 810, 240, 135)                                 # page body, incl. the full questions box at the end
PAN = (1440, 810, 240, "min(135\\,135*n/75)")            # smooth pan between the two
fit = lambda t0, t1, row, extra=0.0: (t1 - t0) / (D[row] - extra)   # speed so the source fills the row exactly
SCENES = {
    "01": [still("cards/q1.png", D["01"])],
    # the rule fades in UNDER Eliza's quote, after "...it wasn't allowed", and stays into scene 03
    "02": [reveal("cards/q2.png", "cards/q2rule.png", D["02"], at=7.25)],
    "03": [still("cards/q2rule.png", 3.75), still("cards/photo.png", 3.35), still("cards/photohl.png", D["03"] - 7.1)],
    "04": [clip(TL, 0.0, 4.4, speed=0.56, crop=P0, label=REAL)],
    "05": [clip(TL, 4.4, 9.0, crop=PAN, label=REAL), clip(TL, 9.0, 31.0, speed=8, crop=P, label="Reading the photo on the device · 8× speed"),
           clip(TL, 31.0, 34.5, speed=fit(31.0, 34.5, "05", 4.6 + 22.0 / 8), crop=P, label=REAL)],
    "06a": [clip(TL, 34.5, 44.6, speed=fit(34.5, 44.6, "06a"), crop=P, label=REAL)],          # click I-check -> results (2.0 s)
    "07": [clip(TL, 44.6, 57.0, speed=fit(44.6, 57.0, "07"), crop=P, label="Offline DMW rule checks · real recording")],
    "06b": [clip(TL, 57.0, 62.5, speed=fit(57.0, 62.5, "06b"), crop=P, label="What the cloud will see · real recording")],
    "08": [clip(TL, 62.5, 70.0, speed=1.4, crop=P, label="Cloud: anonymous text only"),
           clip(TL, 70.0, 78.0, speed=8, crop=P, label="Gemini in the cloud · 8× speed"),
           clip(TL, 78.0, 98.2, speed=fit(78.0, 98.2, "08", 7.5 / 1.4 + 1.0), crop=P, label="Explained in Taglish · names restored on the device")],
    "09": [still("cards/diagram.png", D["09"], 0.06)],
    "10": [clip(REVIEW, 41.0, 58.5, speed=1.25, crop=(1280, 720, 170, 150), label="Recorded on a laptop WITHOUT on-device AI")],
    "11": [clip(EXT, 1.0, 12.0, speed=1.25, crop=(1920, 1080, 0, 0), label="Chrome extension · real extension code, offline · sample feed, menu drawn for the video"),
           still("cards/android.png", D["11"] - 8.8, label="Android app · Kotlin + Compose · same engine")],
    "12a": [clip(LAB, 3.0, 12.0, speed=1.12, label="Same prompt · same laptop"), clip(LAB, 19.0, 27.6, speed=1.12, label="Same prompt · same laptop")],
    "13": [still("cards/end.png", D["13"], 0.02)],
}
# no fades inside continuous stretches (Eliza card -> scene 03, and the whole product walkthrough)
NO_FADE_OUT = {"02", "04", "05", "06a", "07", "06b"}
NO_FADE_IN = {"03", "05", "06a", "07", "06b", "08"}
SCENE_ROW = {k: k for k in SCENES}


def build_scene(k):
    target = D[SCENE_ROW[k]]
    parts = []
    for i, p in enumerate(SCENES[k]):
        out = f"work/scenes/{k}-{i}.mp4"
        render_piece(p, out)
        parts.append(out)
    lst = f"work/scenes/{k}.txt"
    open(lst, "w").write("".join(f"file '{os.path.basename(x)}'\n" for x in parts))
    joined = f"work/scenes/{k}-joined.mp4"
    run(["-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined])
    have = dur(joined)
    pad = max(0.0, target - have + 0.05)
    vf = (f"tpad=stop_mode=clone:stop_duration={pad:.3f},trim=0:{target:.3f},setpts=PTS-STARTPTS"
          + ("" if k in NO_FADE_IN else f",fade=t=in:st=0:d=0.3:color={PAPER}")
          + ("" if k in NO_FADE_OUT else f",fade=t=out:st={target - 0.3:.3f}:d=0.3:color={PAPER}"))
    run(["-i", joined, "-vf", vf, "-r", str(FPS), "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "medium", f"work/scenes/{k}.mp4"])
    print(f"scene {k}: {target:.2f}s (source {have:.2f}s)", flush=True)


# ---------------------------------------------------------------- captions
LINES = {
"01": "In a report published by Amnesty International, a Filipino domestic worker in Saudi Arabia put it simply: “If you are a domestic helper there, the boss is the contract.”",
"02": "Another worker, Eliza, gave up her passport on arrival. Not because she agreed, but because she didn't know it wasn't allowed.",
"03": "The rule exists. But the contract arrives as a photo, the recruiter says sign today, and it carries her name, her passport number, her phone. Uploading that to an AI website is exactly what a careful person shouldn't do.",
"04": "This is Kontrata. It checks the contract before she signs, and her personal details never leave her device.",
"05": "She adds the photo. Gemini Nano, running inside Chrome on her laptop, reads it right there. The image is never uploaded.",
"06a": "Nano finds the names and addresses; plain code covers passport, phone and ID numbers.",
"06b": "Before anything leaves, she sees exactly what the cloud will see.",
"07": "The DMW rule checks run offline, and every finding quotes the official document it comes from. 1,200 Qatari riyals is about US$330, below the minimum. Keeping her passport: against the rules.",
"08": "Only then does the cloud help. Gemini gets the anonymous text and explains it in everyday Taglish, the way Filipinos actually text. Her name is restored only on her device, and she gets questions to ask the agency.",
"09": "This is the Airlock. With Firebase AI Logic, every call that sees the raw contract runs only on the device. The one cloud call runs only in the cloud, and the app checks where every answer actually came from.",
"10": "And it fails closed. Nano is nondeterministic. Once, it missed a name. So a model-free scan runs on every request, and if something looks uncovered, or Nano isn't available, she covers it in one tap.",
"11": "The same tested engine runs everywhere: a Chrome extension that checks a recruiter's post offline with a right-click, and a native Android app. On Android, on-device Nano is built in but unverified; I had no supported phone, so here it uses the code layers and the cloud.",
"12a": "On this laptop, on-device answered in 1.8 seconds, the cloud in 6.2 seconds. Every rule cites a real DMW document, and all of it runs on Firebase's free plan.",
"13": "Kontrata. Check the contract before you sign.",
}


def chunks(text, maxlen=62):
    """Split into sentences, then split long sentences into evenly sized parts (no orphan words)."""
    import math, re as _re
    out = []
    for sent in _re.split(r"(?<=[.:;?”])\s+", text):
        words = sent.split()
        n = math.ceil(len(sent) / maxlen)
        if n <= 1:
            out.append(sent); continue
        target, cur = len(sent) / n, ""
        for w in words:
            if cur and len(cur) + 1 + len(w) > target * 1.12 and len(out) < 999:
                out.append(cur); cur = w
            else:
                cur = f"{cur} {w}".strip()
        out.append(cur)
    merged = []
    for c in out:  # glue very short bits onto the previous chunk
        if merged and len(c) < 16 and len(merged[-1]) + len(c) < maxlen + 14:
            merged[-1] += " " + c
        else:
            merged.append(c)
    return merged


def ts(t):
    h, m, s = int(t // 3600), int(t % 3600 // 60), t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def write_ass(starts):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Public Sans,44,&H00FFFFFF,&H00FFFFFF,&H1A33271C,&H1A33271C,0,0,0,0,100,100,0,0,3,14,0,2,200,200,118,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for r in ROWS:
        t0 = starts[r] + LEAD.get(r, 0.2)
        cs = chunks(LINES[r])
        total = sum(len(c) for c in cs)
        t = t0
        for c in cs:
            d = VO[r] * len(c) / total
            ev.append(f"Dialogue: 0,{ts(t)},{ts(t + d - 0.05)},Cap,,0,0,0,,{c}")
            t += d
    open("work/captions.ass", "w").write(head + "\n".join(ev) + "\n")
    # Same cues as an .srt for YouTube's CC track (translation, search).
    def srt_ts(x):
        return f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round(x % 1 * 1000)) % 1000:03d}"
    cues = []
    for line in ev:
        _, a, b, *_rest = line.split(",", 9)
        text = line.split(",,0,0,0,,", 1)[1]
        to_s = lambda v: sum(float(x) * m for x, m in zip(v.split(":"), (3600, 60, 1)))
        cues.append(f"{len(cues) + 1}\n{srt_ts(to_s(a))} --> {srt_ts(to_s(b))}\n{text}\n")
    open("kontrata-demo.en.srt", "w").write("\n".join(cues))


def main():
    only = sys.argv[1:]
    for k in SCENES:
        if not only or k in only:
            build_scene(k)
    order = list(SCENES)
    open("work/scenes/all.txt", "w").write("".join(f"file '{k}.mp4'\n" for k in order))
    run(["-f", "concat", "-safe", "0", "-i", "work/scenes/all.txt", "-c", "copy", "work/video-silent.mp4"])
    # narration track: each row placed at its scene start + lead
    starts, t = {}, 0.0
    for k in order:
        starts[SCENE_ROW[k]] = t
        t += D[SCENE_ROW[k]]
    total = t
    write_ass(starts)
    ins, fl = [], []
    for i, r in enumerate(ROWS):
        ins += ["-i", f"work/vo2/{r}.wav"]
        ms = int((starts[r] + LEAD.get(r, 0.2)) * 1000)
        fl.append(f"[{i}]adelay={ms}|{ms}[a{i}]")
    mix = ";".join(fl) + ";" + "".join(f"[a{i}]" for i in range(len(ROWS))) + \
        f"amix=inputs={len(ROWS)}:normalize=0,apad,atrim=0:{total:.3f},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[out]"
    run([*ins, "-filter_complex", mix, "-map", "[out]", "-ac", "2", "-c:a", "pcm_s16le", "work/narration.wav"])
    # Background music: generated (gen_music.py), ~10 dB under the voice (measured), dipping gently while she speaks.
    subprocess.run([sys.executable, "gen_music.py", f"{total:.2f}", "work/music-raw.wav"], check=True)
    run(["-i", "work/narration.wav", "-i", "work/music-raw.wav", "-filter_complex",
         "[1]lowpass=f=3200,aecho=0.8:0.6:70|150|290:0.22|0.15|0.08,loudnorm=I=-22:LRA=7,aresample=48000[m];"
         "[0]asplit[v][key];[m][key]sidechaincompress=threshold=0.05:ratio=2:attack=200:release=1200:makeup=1[md];"
         "[v][md]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.89[out]",
         "-map", "[out]", "-c:a", "pcm_s16le", "work/mix.wav"])
    # No burned-in captions: kontrata-demo.en.srt goes to YouTube as optional CC.
    run(["-i", "work/video-silent.mp4", "-i", "work/mix.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy",
         "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", "kontrata-demo.mp4"])
    print(f"done: kontrata-demo.mp4 ({dur('kontrata-demo.mp4'):.1f}s)")


if __name__ == "__main__":
    main()
