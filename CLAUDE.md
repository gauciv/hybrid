# Kontrata: context for Claude

Entry for **#BuildHybridAI 2026** (Google / Devpost, https://firebasehybridaihackathon.devpost.com/).
Deadline: **Nov 30, 2026 2:00 PM PT = Dec 1, 2026 6:00 AM PHT**. Target submitting by Nov 30 evening PHT.
Full product/tech plan: `docs/SPEC.md`. Source-material checklist: `docs/sources/README.md`.

## Judging (equal weight, 1–5 each)
Tech Implementation (how well hybrid inference is used) · Design (complete product, not a proof of concept) ·
Potential Impact (real problem, real audience, *demonstrated*) · Quality of Idea (non-obvious use of hybrid, genuine problem understanding).
Multi-platform gets "strong consideration" for the Grand Prize. Video ≤3 min, English, YouTube public.
Repo must be public, OSS-licensed (Apache 2.0 ✓), and actually import + call Firebase AI Logic.

## The idea in one line
OFW contract checker where hybrid inference *is* the privacy architecture ("Airlock"): PII redacted **on-device**
(regex + Gemini Nano NER), a fail-closed leak gate, only anonymous clauses go to the **cloud** for deep comparison
against real DMW standard contracts, findings rehydrated locally. Visible "Airlock panel" shows exactly what the cloud saw.

## Hard constraints
- **Zero cost.** Firebase Spark plan only. Gemini **Developer API** (`GoogleAIBackend`), never Vertex. No billing account,
  no Cloud Functions, no phone/SMS auth, no image generation, no Play/Chrome Web Store publishing.
- **No invented legal facts.** Every rule cites a file in `docs/sources/`. LLM explains; it never makes up rules.
- **No user data stored.** Firestore holds only public data (agencies, rules).
- Real people's data never goes in git (`docs/sources/private/` is ignored).
- Quality bar: no generic AI-slop UI or copy. Tagalog-first, built for an anxious non-technical user. Use the frontend-design skill.

## Platform decisions
- **Primary: Web app (Vite + React PWA on Firebase Hosting) + Chrome MV3 extension**, sharing `packages/core`.
- Web on-device inference = **desktop Chrome only** (Chrome ≥139, flag `prompt-api-for-gemini-nano-multimodal-input` enabled ✓).
  On-device supports text + JPEG/PNG input, structured JSON output, ~9,216-token multimodal limit. No multi-turn, no tools, no PDF/audio.
- **Android: only if a supported physical phone is borrowed** (Pixel 9/10/11, Galaxy S26/Fold7/Fold8...). Emulator = cloud fallback only.
  Fallback option: Android Studio Device Streaming. Never overclaim on-device on Android in the video.
- Dev machine: Arch Linux, Chrome 157, Intel UHD iGPU, ~16 GB RAM: borderline for Nano. **Verify Nano actually runs.**

## Status log
- 2026-11-19: Spec + sources checklist + LICENSE pushed to https://github.com/gauciv/hybrid. `firebase login` done.
  MCPs connected: firebase, chrome-devtools, mobile, context7, playwright.
  **Next:** check Nano availability on laptop → create Firebase project (Spark) → App Check (reCAPTCHA v3 + debug token)
  → hybrid hello-world showing which tier answered → start `packages/core` redaction + golden corpus + fast-check PBT.
