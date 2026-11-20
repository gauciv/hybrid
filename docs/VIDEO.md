# Demo video: script, shot list, production plan

Target **2:50** (hard limit 3:00), English narration, English burned-in captions, 1920×1080, YouTube public.
Narration ≈ 410 words at ~150 wpm. Tone: calm, plain, no hype, no music swells. Optional quiet ambient bed at −30 dB.

Judging map: **Tech** = 0:40–1:25 + 1:45–2:15 · **Design** = the whole product flow · **Impact** = 0:00–0:35 + close ·
**Idea** = "hybrid is the privacy architecture" (0:30, 1:45). Multi-platform = 2:15–2:35.

Rules we keep (CLAUDE.md): quotes are "published by Amnesty", never "we interviewed". Never claim on-device Nano on Android.
Sample contract and post are fictional/synthetic and are labelled so on screen.

---

## Script

| # | Time | Picture | Narration |
|---|---|---|---|
| 1 | 0:00–0:13 | Paper-white title card, quote typeset in IBM Plex Serif, appears line by line. Small source line: *Amnesty International, MDE 23/1197/2026* | "In a report published by Amnesty International, a Filipino domestic worker in Saudi Arabia put it simply: *'If you are a domestic helper there, the boss is the contract.'*" |
| 2 | 0:13–0:23 | Second card: *"I didn't reject because it was my first time being abroad."* (Eliza) | "Another worker, Eliza, gave up her passport on arrival. Not because she agreed, but because she didn't know it wasn't allowed." |
| 3 | 0:23–0:35 | The sample contract photo slides in, as if just received. Caption: *Fictional sample* | "The rule exists. But the contract arrives as a photo, the recruiter says sign today, and it carries her name, her passport number, her phone. Uploading that to an AI website is exactly what a careful person shouldn't do." |
| 4 | 0:35–0:42 | Kontrata home screen (Taglish), slow push-in | "This is Kontrata. It checks the contract before she signs, and her personal details never leave her device." |
| 5 | 0:42–1:00 | **TUF clip T1**: Try a sample → Photo → "On-device AI is reading the photo…" → text appears | "She adds the photo. Gemini Nano, running inside Chrome on her laptop, reads it right there. The image is never uploaded." |
| 6 | 1:00–1:14 | **TUF clip T1 cont.**: Check → Airlock panel: ink bars *Person 1*, *Passport 1*, *Phone 1*; zoom on "On-device AI looked for names (1.3 seconds)" | "Nano finds the names and addresses; plain code covers passport, phone and ID numbers. Before anything leaves, she sees exactly what the cloud will see." |
| 7 | 1:14–1:30 | Findings: salary, passport, rest day, placement fee, each with its *Source* quote expanded | "The DMW rule checks run offline, and every finding quotes the official document it comes from. Twelve hundred Qatari riyals is about three hundred thirty dollars, below the minimum. Keeping her passport: against the rules." |
| 8 | 1:30–1:47 | Explain (Taglish) → detailed explanation → "Ask your agency before signing" | "Only then does the cloud help. Gemini gets the anonymous text and explains it in everyday Taglish, the way Filipinos actually text. Her name is restored only on her device, and she gets questions to ask the agency." |
| 9 | 1:47–2:05 | Architecture diagram (`docs/media/11-architecture.png`), highlight on-device column, then the arrow, then cloud | "This is the Airlock. With Firebase AI Logic, every call that sees the raw contract runs only on the device. The one cloud call runs only in the cloud, and the app checks where every answer actually came from." (On screen: `ONLY_ON_DEVICE` / `ONLY_IN_CLOUD` labels.) |
| 10 | 2:05–2:17 | Review state on a laptop without Nano: "Please check before sending" → "Cover these too" | "And it fails closed. Nano is nondeterministic. Once, it missed a name. So a model-free scan runs on every request, and if something looks uncovered, or Nano isn't available, she covers it in one tap." |
| 11 | 2:17–2:35 | Split: Chrome extension (right-click a synthetic recruiter post → side panel), then Android emulator | "The same tested engine runs everywhere: a Chrome extension that checks a recruiter's post offline with a right-click, and a native Android app. On Android, on-device Nano is built in but unverified; I had no supported phone, so here it uses the code layers and the cloud." |
| 12 | 2:35–2:47 | **TUF clip T2**: lab at `/#lab`, same prompt ONLY_ON_DEVICE vs ONLY_IN_CLOUD timings. Then stat strip: 14× · 144 tests · zero red flags on DMW's own contracts | "On this laptop, on-device answered in [X] seconds, the cloud in [Y]. Every rule cites a real DMW document, and all of it runs on Firebase's free plan." **Fill X/Y from what T2 actually shows** (cloud latency varies: 7.3 s cold on 2026-11-19, 1.4 s warm on 2026-11-20; if cloud wins, say "and the raw contract never left the laptop" instead of comparing speed). |
| 13 | 2:47–2:53 | End card: wordmark, *Check the contract before you sign.*, kontrata-hybrid.web.app, github.com/gauciv/kontrata | "Kontrata. Check the contract before you sign." |

---

## Who captures what

| Shot | Source | How |
|---|---|---|
| 1, 2, 3, 13 title/quote/end cards | Claude, this laptop | HTML cards → Chrome DevTools screencast or ffmpeg stills with fades |
| 4, 7, 8 | Claude (live site, cloud path) **or** from T1 | DevTools screencast at 1920×1080 |
| 5, 6 (Nano reads + covers) | **You, on the TUF** (clip T1) | Needs real Gemini Nano; this laptop and Claude's Chrome have none |
| 9 diagram | Claude | Still + pan/zoom in ffmpeg |
| 10 review state | Claude | Natural on this laptop (no Nano → review path), an honest demo of the fallback |
| 11 extension | Claude | Synthetic post page (clearly labelled), extension side panel |
| 11 Android | Claude | Emulator screen recording (mobile MCP) |
| 12 lab timings | **You, on the TUF** (clip T2) | Same prompt, on-device vs cloud |
| Narration | Decide: your voice (recommended) or local TTS | See below |

### TUF recording: demo autopilot (clips T1 and T2)
The site films itself: `apps/web/src/demo/autopilot.ts`, live on https://kontrata-hybrid.web.app. Nothing to install or clone.
1. Plug in power, close other apps. Chrome (your normal profile, where Nano is downloaded), one tab, zoom 100%.
2. Warm Nano once: open https://kontrata-hybrid.web.app, Subukan ang sample → Photo ng contract → I-check. Close the tab.
3. Open **https://kontrata-hybrid.web.app/#demo**. A dark "Demo autopilot" panel appears bottom-right with three scenes:
   **Product · Taglish**, **Product · English**, **Lab · on-device vs cloud**. Click a scene (the page reloads into it).
4. Press **F11** → **● Start recording** → choose **This tab** → Share. Hands off the mouse until the .webm downloads.
   Record all three scenes (T1 = Taglish, T1-en = English, T2 = Lab). Refreshing keeps the panel.
5. Check the T1 file shows "On-device AI looked for names (… seconds)" under the heading. If it shows the "Please check
   before sending" box instead, Nano didn't run: redo step 2 and record again.
6. Use **Practice run** first if you want to watch without recording. Send me the .webm files (Drive/USB/git-ignored folder).

## Your voice: recording guide

**What to make:** 13 files, one per row, plus one room-noise file. Put them in `docs/media/video/voice/`
(git-ignored, never pushed). Any format your phone saves is fine (`.mp3`, `.m4a`, `.wav`).

| File | What |
|---|---|
| `01.mp3` … `13.mp3` | One file per script row below (two digits: `01`, not `1`) |
| `12a.mp3`, `12b.mp3` | Row 12 has two versions, record both (see the row) |
| `room.mp3` | 10 seconds of silence: same spot, same phone position, you not speaking. Used to remove background noise |

**Before you start**
- Pick one spot and record **every** file there, at the same distance, so the voice sounds the same across rows.
- Turn off the electric fan / aircon if you can, close windows. Soft things around you (bed, curtains, closet of
  clothes) cut echo. A blanket over your head and the phone works surprisingly well.
- Phone on **airplane mode** (no notification sounds mid-take). Phone on a table or stack of books, mic pointing at your
  mouth, about a hand-span away (15–20 cm), slightly to the side so your breath doesn't hit it. Don't hold or touch it.
- Drink water first. Avoid recording right after eating (mouth clicks).

**While recording**
- Wait 1 second, speak, wait 1 second, stop.
- Say each line **2–3 times in the same file**, with a pause between takes. I'll pick the best one, so stumbles are fine:
  just pause and restart the sentence.
- Calm, slower than normal conversation, like explaining to a friend's mom. Smile slightly on rows 4 and 13.
- Don't worry about exact timing; I fit the pictures to your voice. Small wording changes are OK if a line feels
  unnatural in your mouth: keep the facts the same.
- Pronunciation: **Kontrata** = kon-TRA-ta · **Gemini** = JEM-in-eye · **DMW** = D-M-W · **Qatari riyals** = KA-ta-ree ree-YALS.

**The lines** (same as the Narration column above; read these)

01. In a report published by Amnesty International, a Filipino domestic worker in Saudi Arabia put it simply: "If you are a domestic helper there, the boss is the contract."
02. Another worker, Eliza, gave up her passport on arrival. Not because she agreed, but because she didn't know it wasn't allowed.
03. The rule exists. But the contract arrives as a photo, the recruiter says sign today, and it carries her name, her passport number, her phone. Uploading that to an AI website is exactly what a careful person shouldn't do.
04. This is Kontrata. It checks the contract before she signs, and her personal details never leave her device.
05. She adds the photo. Gemini Nano, running inside Chrome on her laptop, reads it right there. The image is never uploaded.
06. Nano finds the names and addresses; plain code covers passport, phone and ID numbers. Before anything leaves, she sees exactly what the cloud will see.
07. The DMW rule checks run offline, and every finding quotes the official document it comes from. Twelve hundred Qatari riyals is about three hundred thirty dollars, below the minimum. Keeping her passport: against the rules.
08. Only then does the cloud help. Gemini gets the anonymous text and explains it in everyday Taglish, the way Filipinos actually text. Her name is restored only on her device, and she gets questions to ask the agency.
09. This is the Airlock. With Firebase AI Logic, every call that sees the raw contract runs only on the device. The one cloud call runs only in the cloud, and the app checks where every answer actually came from.
10. And it fails closed. Nano is nondeterministic. Once, it missed a name. So a model-free scan runs on every request, and if something looks uncovered, or Nano isn't available, she covers it in one tap.
11. The same tested engine runs everywhere: a Chrome extension that checks a recruiter's post offline with a right-click, and a native Android app. On Android, on-device Nano is built in but unverified; I had no supported phone, so here it uses the code layers and the cloud.
12. Open your **Lab** clip and note the two numbers (on-device ms, cloud ms; e.g. 1517 ms ≈ "one point five seconds").
    - `12a.mp3`: On this laptop, on-device answered in **[on-device]** seconds, the cloud in **[cloud]**. Every rule cites a real DMW document, and all of it runs on Firebase's free plan.
    - `12b.mp3`: On this laptop, the on-device model answered in **[on-device]** seconds, without the contract ever leaving it. Every rule cites a real DMW document, and all of it runs on Firebase's free plan.
    - I'll use 12a if on-device was clearly faster in the clip, otherwise 12b.
13. Kontrata. Check the contract before you sign.

**Then:** copy the voice files into `docs/media/video/voice/` and the three .webm takes into `docs/media/video/clips/`
(keep their names), and tell me. Optional but welcome: if any take or line felt off, tell me which.

## Assembly (Claude)
ffmpeg: 1920×1080 30 fps H.264 + AAC, burned-in captions (Public Sans), gentle zooms on key UI, 0.3 s crossfades,
loudness normalised. Output `docs/media/video/kontrata-demo.mp4` (git-ignored if large). You upload it to YouTube (public).
