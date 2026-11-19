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
  (found in browser: gate alone said PASS with unlabeled names visible). Identifier regexes no longer span newlines.
  Security round 3: malformed NER output = failed chunk; prompt fences untrusted text; model-free `suspectNames()` backstop
  (honorifics, bin/Al-, role patterns) forces review even if a prompt injection silences Nano; Unicode spaces (NBSP etc.) handled.
  Round 4: per-call random nonce fence. Round 5: model-free `nameLikePhrases()` scan ALWAYS runs on the outbound payload
  (Title Case + ALL CAPS phrases, "<Name> shall", org-suffix only if it ends the word) + big contract-vocabulary allowlist.
  **Nano is nondeterministic:** 2nd TUF run found 4/5 (missed "Liza Mendoza") → old logic said SAFE; new logic flags it.
  Lab has "Also redact these" (human-in-the-loop confirm). Org suffix case-sensitive. 89 tests. See docs/THREAT-MODEL.md
  (realistic risk = accidental model misses; injection gains attacker nothing → avoid review-fatigue heuristics). Warm NER time on TUF ≈ 18.6 s (too slow → optimise).
  ✅ **Real Nano run on TUF: 5/5 entities (incl. unlabeled names + address), verdict SAFE, facts preserved. 23.8 s cold**
  (check warm time; optimise if still slow). Saved as regression fixture in `test/security-round4.test.ts`.
  Redaction lab panel on live site for TUF testing. Hosting: index no-cache, /assets immutable.
  Sources: 3 HSW contracts + RA 8042/10022/11641 in docs/sources (+ .txt). **HSW min salary: US$500 per MC 03-2025
  (new contracts from ~Oct 2025; $400 may persist for older; status after ~Apr 2026 transition UNKNOWN → need official advisory).**
  User uploaded DMW Advisory 25-2025 + MC 03-2025 (scans; verbatim transcriptions in .txt). Rules from Advisory 25: min ≥US$500,
  passport stays with worker (exc. visa stamping), ≥1 full rest day/week, mandatory KYE video call, employer pays work-injury care.
  GCC $500 status conflicting (see rules/HSW-SALARY-STATUS.md) → Red <400, Amber 400–499, Green ≥500 via Remote Config.
  No real OFW contacts/posts: use Amnesty MDE 23/1197/2026 verbatim testimony (real-samples/testimonies.md; say "published by
  Amnesty", never "we interviewed") + official DMW red flags + SYNTHETIC labelled posts S1–S4 (real-samples/recruiter-red-flags.md).
  Pitch line: "the boss is the contract" (Elena, Amnesty p.17); Eliza gave up passport because she didn't know it was not allowed.
- NER: variant C (lines, people-only, filtered) is default: 1.3 s on TUF, 3/3 consistent (docs/BENCHMARKS.md, ~14× faster).
- Rules engine ✓ `packages/core/src/rules/` (offline, TL+EN pre-written, every finding cites verbatim `CITATIONS` from docs/sources):
  salary (USD conversion, Remote-Config-ready thresholds), passport, rest day, hours, placement fee, deductions, food/lodging,
  airfare; post rules: tourist visa, GCash/e-wallet, fixer, chat-only, no license. Trust test: official SECs → zero red flags.
  Works identically on redacted text. 118 tests.
- Cloud deep check ✓ (`packages/core/src/cloud/deepCheck.ts`, `apps/web/src/ai/cloud.ts`, ONLY_IN_CLOUD gemini-3.5-flash-lite, JSON schema):
  whole outbound prompt re-gated; output validated + rehydrated on-device. Live E2E (no Nano → scan suspects → "Also redact these"
  → confirm review → send): natural Tagalog, 4/4 correct citations, 8.9 s, 0 dropped. Review verdicts always carry scan suspects.
  Offline findings shown in Tagalog in lab. 132 tests.
- Product UI ✓ (`apps/web/src/product/`): dignified ink-on-paper design per docs/DESIGN.md (user brief: dignified, calm,
  professional, no AI slop). Tagalog/English UI, Cebuano explanations. Lab moved to /#lab. Verified desktop + 390px mobile.
  **User testing: formal Tagalog was harder to read than English → all Filipino copy is everyday Taglish** (UI, rules, deep check).
- Chrome extension ✓ (`apps/extension`, MV3, side panel + right-click "I-check sa Kontrata"): offline core rules + redaction,
  NO network code (verified bundle), hand-off to web app via `#check=` fragment (cleared on load). Note: extension counts within
  the Web/Chrome category; hackathon "multi-platform" = Android/iOS. Install: `npm run build:ext`, load unpacked apps/extension/dist.
- Remote Config ✓ (`apps/web/src/config.ts`, template `firebase/remoteconfig.template.json`, deploy `--only remoteconfig`):
  hsw_min_salary_usd 500, hsw_old_min_salary_usd 400, cloud_model. Verified live fetch. Extension uses compiled defaults (offline).
  Working steps reworded (step 1 sounded like scanning the user's device); rotating ring spinner.
- Photo/PDF input ✓ (`apps/web/src/ai/readDocument.ts`, lazy-loaded): PDF text layer via pdf.js; photo/scanned PDF via
  Gemini Nano multimodal ONLY_ON_DEVICE (desktop Chrome w/ Nano; untested here, test on TUF) else Tesseract.js OCR in WASM
  (verified: sample photo read perfectly in 1.5–3 s; network log = only GETs of OCR engine from jsDelivr, image never uploaded).
  User proofreads extracted text before checking. "Subukan ang sample photo" uses public/samples/sample-contract-photo.png.
  User has NO supported Android phone.
- Composer redesign (`apps/web/src/product/Composer.tsx`): Upload + "Subukan ang sample ▾" menu + Check; responsive (stacks
  <560px); preview card (thumbnail, read method, proofread hint, Alisin); all inputs locked while reading + stale results
  discarded (fixes race bug). Caching (`apps/web/src/cache.ts`): NER + readings memory-only; cloud responses sessionStorage
  (placeholders only) → repeat explain 8.6 s → 0.25 s. Fixed OCR single-space field bug (passport swallowed phone). 136 tests.
  TUF test of sample photo: on-device NER 2.9 s, 4 findings correct.
  **Next:** decide Android (emulator-only testing) → write-up + video script (redacted clauses vs SEC, explains in TL/CEB/EN) → product UI. (needs docs/sources) → real product UI (frontend-design).
