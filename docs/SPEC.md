# Kontrata: Product & Technical Spec

> A private bodyguard for Overseas Filipino Workers' contracts.
> Your contract is read **on your device**. Only anonymous clauses ever reach the cloud.

Hackathon: #BuildHybridAI 2026 (Firebase AI Logic hybrid inference)
Deadline: **Nov 30, 2026 2:00 PM PT = Dec 1, 2026 6:00 AM PHT**
Judging: Tech Implementation · Design · Potential Impact · Quality of Idea (equal, 1–5 each)

---

## 1. Problem

- ~2M+ OFWs deploy yearly; household service workers (HSWs) are the most exposed.
- Documented harms: **illegal recruitment**, **illegal placement fees** (HSWs: zero placement fee),
  **contract substitution** (the contract abroad differs from the one approved at home),
  **passport confiscation**, unpaid/underpaid salary, no rest day.
- Contracts arrive as photos/PDFs over Messenger, in English or Arabic, with pressure to sign fast.
- Existing help (DMW hotline 1348, agency lookup site) requires knowing *what to ask*.
- The worker's contract is full of sensitive data (passport no., name, family contact).
  Uploading it to a random AI service is itself a risk, and trust is the barrier.

## 2. Users

| Persona | Context | Need |
|---|---|---|
| **Aspiring OFW (primary)** | Province, prepaid data, mid-range Android, Tagalog/Bisaya | "Is this offer legit? Is this contract fair? What should I ask?" |
| **Family member** | Helps relative review offers, often on a laptop / Facebook | Check recruiter posts and agencies |
| **Deployed OFW** | Abroad, suspects contract substitution | Compare current contract vs. original approved one |

## 3. Core idea: the **Airlock**

Hybrid inference here is the **privacy architecture**, not just a fallback.
Each task is routed deliberately:

```
            ON-DEVICE (Gemini Nano)                        CLOUD (Gemini, Developer API)
 ┌──────────────────────────────────────┐
 │ 1. Ingest: text / photo / PDF→text   │
 │ 2. Redact: regex + Nano NER          │
 │    "Maria Santos" → [[PERSON_1]]     │
 │    vault stays in memory only        │
 │ 3. Leak gate: re-scan; fail = block  │──── redacted clauses only ────►┌───────────────────────────┐
 │ 4. Quick red flags (offline, free)   │                                │ 5. Deep check vs DMW       │
 │                                      │◄─── findings w/ placeholders ──│    standard contract + law │
 │ 6. Rehydrate: [[PERSON_1]] → Maria   │                                │    explain in Tagalog/     │
 │ 7. Show report + Airlock panel       │                                │    Bisaya/English          │
 └──────────────────────────────────────┘                                └───────────────────────────┘
```

**Routing policy (per task, not global):**

| Task | Mode | Why |
|---|---|---|
| Transcribe photo, redact, leak-gate | `ONLY_ON_DEVICE` | Raw PII must never leave. If Nano unavailable → deterministic redaction only + stricter gate |
| Quick red-flag scan | `PREFER_ON_DEVICE` | Free, offline, instant |
| Deep clause comparison, explanation | `PREFER_IN_CLOUD` | Needs bigger model + long context; input is already anonymous |
| Offline | on-device only | Report marked "deep check pending"; auto-runs when back online |

Policy values live in **Remote Config** (`routing_policy`, `rules_version`, `cloud_model`),
so it can change without shipping a new app.

**The Airlock panel** (always visible): shows *exactly* the text that was sent to the cloud,
with every placeholder highlighted. This is how the user (and judges) *see* the boundary.

## 4. Features (MVP)

1. **Check a contract**: paste text, upload photo (JPEG/PNG) or PDF.
   Output: traffic-light report per clause (✅ matches standard / ⚠️ unclear / 🚩 violates),
   each finding citing its source (`docs/sources/...`), plus "Questions to ask your agency".
2. **Check a recruiter / job post**: paste a post or (extension) right-click a Facebook post.
   Flags: fees for HSWs, "tourist visa" deployment, GCash payment requests, no license no., etc.
3. **Check an agency**: license no. / name → Firestore registry → status (Valid / Suspended / Cancelled / Banned).
4. **Language**: UI + explanations in Tagalog, Cebuano, English.
5. **Escalate**: one tap → DMW hotline 1348 / report template prefilled (rehydrated *locally*).

Stretch: compare two contracts (substitution detector), voice read-aloud.

**Non-goals:** legal advice (clear disclaimer), storing user documents (we store **nothing** about the user).

## 5. Redaction design (the thing that must not fail)

Layered, fail-closed:

- **Layer A: deterministic detectors** (`packages/core/redact/detectors`):
  PH passport (`[A-Z]{1,2}\d{6,7}[A-Z]?`), PH/foreign phones (`+63 9xx`, `09xx`, `+966`, `+965`, `+971`…),
  emails, dates of birth, government IDs (SSS, PhilHealth, TIN, UMID), bank/IBAN, addresses with barangay/city patterns.
- **Layer B: Nano NER** with JSON-schema structured output: `{ spans: [{text, type}] }` for names (incl. Arabic-script),
  employer names, addresses the regex missed.
- **Merge → placeholders** `[[PERSON_1]]`, `[[PASSPORT_1]]`… Salary amounts and country are **kept** (needed for analysis, not identifying).
- **Leak gate:** re-run Layer A on the outbound payload + check no vault value appears verbatim. Any hit → **block cloud call**.
- **Tests:**
  - Golden corpus: 30+ hand-written tricky cases (`packages/core/test/redaction.cases.ts`).
  - **Property-based tests** (fast-check): inject random generated PII into real SEC templates →
    assert outbound payload contains none of it. Runs in CI.
- On-device token limit for multimodal ≈ 9,216 → **chunk per page / section**.

## 6. Architecture

```
kontrata/
├─ packages/core/          # TS: pipeline (ingest, redact, gate, rules, rehydrate), AI Logic wrappers, i18n strings
├─ apps/web/               # Vite + React PWA, Firebase Hosting (primary demo URL)
├─ apps/extension/         # Chrome MV3 extension: side panel + context menu, reuses core
├─ apps/android/           # Kotlin + Compose, Firebase AI Logic Android SDK (hybrid w/ Gemini Nano)
├─ firebase/               # firestore.rules, remoteconfig.template.json, seed scripts for agencies
└─ docs/                   # SPEC, sources/, demo script
```

**Firebase products:**

| Product | Use |
|---|---|
| **AI Logic** (`GoogleAIBackend`, hybrid) | All inference. Free Spark tier. **Never Vertex** (needs billing) |
| **App Check** | reCAPTCHA v3 (web), Play Integrity / debug provider (Android) |
| **Firestore** | Public read-only: `agencies`, `rules` (rule text + citations). **No user data** |
| **Remote Config** | Routing policy, rules version, model name, feature flags |
| **Hosting** | Web app |

**Rules engine:** deterministic checks first (salary ≥ HSW minimum, placement fee = 0 for HSW,
passport held by worker, rest day present, contract duration, repatriation cost on employer),
each with `citation` → source file. The LLM explains and catches what rules can't. It never invents rules.

Web on-device requirements: Chrome Desktop ≥139, flag
`chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` enabled, model download on first use
(`model.initializeDeviceModel()` after a user click).
On-device does **not** support: multi-turn chat, tools, audio/PDF input → PDFs are converted to text locally (pdf.js).

## 7. Design direction

- Audience: anxious, non-technical, on a mid-range phone, possibly reading in a second language.
- Tone: a calm, trusted *kababayan* (fellow Filipino) who knows the rules. Not a cybersecurity product, not a cute chatbot.
- Large type, plain words, Tagalog-first, one action per screen.
- Visual identity: built from Philippine document culture (official stamps, *sedula*/passport textures, the red "🚩" as a stamp mark).
  No generic purple gradients, no robot icons.
- The Airlock is a visible physical metaphor: a sealed envelope where personal data is "kept at home".

## 8. Schedule (12 days)

| Date (PHT) | Goal |
|---|---|
| Nov 19 (Thu) | Repo, Firebase project, App Check, hybrid "hello world" on this laptop. **Confirm Nano runs** |
| Nov 20 | `core`: detectors + golden redaction corpus + PBT |
| Nov 21 | Nano NER redaction + leak gate; rules engine v1 from sources |
| Nov 22 | Cloud deep-check prompt + JSON schema + rehydrate; end-to-end in CLI test |
| Nov 23 | Web app UI: check contract flow + Airlock panel |
| Nov 24 | Web: recruiter-post + agency check; Firestore seed; Remote Config |
| Nov 25 | Chrome extension (side panel + context menu) |
| Nov 26–27 | Android app (contract photo → report), same pipeline |
| Nov 28 | Polish, i18n (Tagalog/Cebuano), real-user test with 1–2 OFWs/families |
| Nov 29 | **Record demo video**, write description |
| Nov 30 | Buffer → submit by **Nov 30 evening PHT** (don't wait for the 6 AM cutoff) |

## 9. Demo video (≤3 min) outline

1. (0:00) A real OFW's words (voice/quote): the contract they almost signed.
2. (0:20) Photo of a contract → Kontrata. **Airplane mode on**: quick red flags appear offline.
3. (0:50) Airplane mode off → deep check. **Airlock panel**: "this is everything the cloud saw", with no name and no passport number.
4. (1:30) Facebook recruiter post → extension flags "placement fee for HSW" + agency "Suspended".
5. (2:00) Same pipeline on Android.
6. (2:30) Why hybrid: privacy where it matters, power where it's needed, free for the worker.

## 10. Open questions

- Team members and roles?
- Which Android phone is available for testing (Gemini Nano support)?
- Does on-device Nano run on this laptop (Intel UHD, 16 GB RAM)? Test on day 1.
