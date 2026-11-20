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
| 9 | 1:47–2:05 | Architecture diagram (`docs/media/11-architecture.png`), highlight on-device column, then the arrow, then cloud | "This is the Airlock. With Firebase AI Logic, every call that sees raw text is ONLY_ON_DEVICE. The one cloud call is ONLY_IN_CLOUD, and the app checks where every answer actually came from." |
| 10 | 2:05–2:17 | Review state on a laptop without Nano: "Please check before sending" → "Cover these too" | "And it fails closed. Nano is nondeterministic. Once, it missed a name. So a model-free scan runs on every request, and if something looks uncovered, or Nano isn't available, she covers it in one tap." |
| 11 | 2:17–2:35 | Split: Chrome extension (right-click a synthetic recruiter post → side panel), then Android emulator | "The same tested engine runs everywhere: a Chrome extension that checks a recruiter's post offline with a right-click, and a native Android app. On Android, on-device Nano is built in but unverified; I had no supported phone, so here it uses the code layers and the cloud." |
| 12 | 2:35–2:47 | **TUF clip T2**: lab at `/#lab`, same prompt ONLY_ON_DEVICE vs ONLY_IN_CLOUD timings. Then stat strip: 14× · 144 tests · zero red flags on DMW's own contracts | "On real hardware, on-device answered in one and a half seconds, the cloud in seven. Every rule cites a real DMW document, and all of it runs on Firebase's free plan." |
| 13 | 2:47–2:53 | End card: wordmark, *Check the contract before you sign.*, kontrata-hybrid.web.app, github.com/gauciv/hybrid | "Kontrata. Check the contract before you sign." |

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

### TUF recording instructions (clips T1 and T2)
No credentials needed on the TUF: only the public site.
1. Chrome on the TUF, window maximised, zoom 100%, close other tabs, hide bookmarks bar (Ctrl+Shift+B).
2. Open https://kontrata-hybrid.web.app once and click anything so Nano is warm (the first run is slower).
3. Record the screen with **Win+Alt+R** (Xbox Game Bar, built in) or OBS, 1080p 30 fps, no mic.
4. **T1** (about 40 s): language Tagalog → *Subukan ang sample* → *Photo ng contract* → wait → *I-check* → scroll slowly
   through the Airlock panel (pause 3 s on the "seconds" line) → findings → open one *Source* → *Ipaliwanag* (Taglish) →
   wait → scroll to the questions. Move the mouse slowly; pause 2 s after each click.
5. **T2** (about 15 s): open https://kontrata-hybrid.web.app/#lab → run the same prompt ONLY_ON_DEVICE, then ONLY_IN_CLOUD,
   so both timings are on screen.
6. Send me the two files (Drive, USB, anything). I cut, caption and assemble everything else.

### Narration options
- **Your own voice (recommended).** A real Filipino student telling this story is worth more to judges than any synthetic voice.
  Phone voice memo in a quiet room, 20 cm from the mouth, one take per row. I'll clean it (noise reduction, loudness −14 LUFS).
- **Local TTS** (free, offline): Kokoro or Piper. Sounds good, but it is a synthetic voice; judges may notice.

## Assembly (Claude)
ffmpeg: 1920×1080 30 fps H.264 + AAC, burned-in captions (Public Sans), gentle zooms on key UI, 0.3 s crossfades,
loudness normalised. Output `docs/media/video/kontrata-demo.mp4` (git-ignored if large). You upload it to YouTube (public).
