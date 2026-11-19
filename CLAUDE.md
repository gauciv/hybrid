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
- 2026-11-19 (later): Firebase project `kontrata-hybrid` (Spark) + web app + AI Logic provisioned (Gemini Developer API).
  Hybrid lab page (`apps/web/src/App.tsx`) deployed to https://kontrata-hybrid.web.app. Cloud path ✓, PREFER_ON_DEVICE→cloud fallback ✓.
  Facts learned: SDK firebase@13.4 · `response.inferenceSource` = "on_device" | "in_cloud" · `initializeDeviceModel()` needs a user click ·
  default cloud model `gemini-3.5-flash-lite` · **on-device output languages = de, en, es, fr, ja only (no Tagalog)**.
  Arch laptop: Chrome perf class "very low" → no Nano (bypass flag optional). Claude's DevTools Chrome has no Nano either.
  **ASUS TUF (borrowed, perf class Medium, `availability()`="downloadable") = on-device test + demo-filming machine.** Never put credentials on it.
  App Check: debug token registered, stored in `apps/web/.env.development.local` (gitignored; verified absent from prod bundle).
  App Check provider = **reCAPTCHA Enterprise / "Fraud Defense"** (`ReCaptchaEnterpriseProvider`, site key 6LepDSgu…QN8, public).
  Live site token exchange verified 200 + cloud call OK. Billing verified `billingEnabled: false` via gcloud.
  ✅ TUF on-device verified: ONLY_ON_DEVICE 1517 ms vs cloud 7298 ms (~5× faster). Use in video/write-up.
- `packages/core` redaction engine ✓: regex + form-label detectors, vault, partial-name sub-placeholders `[[PERSON_1.2]]`,
  rehydrate, fail-closed `leakGate`. 30-case golden corpus + 5 fast-check properties (500 runs) all pass (`npm test`).
  Nano NER plugs in via `redact(text, entities)`.
  Security-review hardening done (case-insensitive name parts, shape-validated label values). 48 tests pass.
  ✅ App Check ENFORCED for AI Logic (service id `firebaseml.googleapis.com`); no-token request → 401 verified; live site OK.
  Replay protection = monitoring only (limited-use tokens would burn the 10k/month Fraud Defense free tier per call).
- Nano NER layer ✓ (`packages/core/src/redact/ner.ts` + `apps/web/src/ai/onDevice.ts`, ONLY_ON_DEVICE + responseConstraint schema,
  hallucinated entities dropped, chunked). `airlockVerdict()` = safe | needs_review | blocked: **never "safe" unless NER ran fully**
  (found in browser: gate alone said PASS with unlabeled names visible). Identifier regexes no longer span newlines. 62 tests.
  Redaction lab panel on live site for TUF testing. Hosting: index no-cache, /assets immutable.
  **Next:** test NER on TUF → rules engine (needs docs/sources) → real product UI (frontend-design).
