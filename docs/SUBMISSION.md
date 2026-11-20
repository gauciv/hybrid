# Devpost submission: copy-paste source

## Elevator pitch (183 chars)

Kontrata checks an overseas job contract against DMW rules before an OFW signs. Names and passport numbers are covered on-device by Gemini Nano; only anonymous text reaches the cloud.

---

## About the project

## Inspiration

> "If you are a domestic helper there, the boss is the contract. Whatever they want, they will get."
> Elena, former domestic worker in Saudi Arabia, quoted in Amnesty International's July 2026 report *"Once we step in their homes, we are no longer human"* (MDE 23/1197/2026)

Amnesty documented 19 Filipino women who returned from Saudi Arabia between 2023 and 2026. Nearly all of them were told to hand over their passports soon after arriving. One of them, Eliza, explained why she said yes: *"It seemed to be just the way it is done there. I didn't reject because it was my first time being abroad."*

She didn't refuse because **she didn't know it wasn't allowed.** The Philippine Department of Migrant Workers (DMW) is explicit that a worker's passport *"must remain with the worker at all times"* (Advisory No. 25, s. 2025). The rule exists, but it lives in circulars that a first-time worker never reads, written in legal English, and it arrives *after* she has already signed.

The moment that matters is **before signing**: the contract arrives as a photo on Messenger, the recruiter says "sign na, aalis ka na next week" (sign it now, you're leaving next week), and there is no one to ask. I wanted to build the person who reads it with her.

There was a second problem: **trust**. A contract is the most sensitive document a worker has. It carries her name, passport number, phone number and family address. "Upload it to an AI website" is exactly the kind of advice a careful person should refuse. That's what made hybrid inference the core of the idea rather than a feature: **the personal parts never leave her device; only the anonymous clauses go to the cloud.**

## What it does

Kontrata (Filipino for "contract") checks a job contract or a recruiter's post before an Overseas Filipino Worker signs.

- **Paste, photograph or upload** the contract (text, photo or PDF). Photos are read **on the device** (Gemini Nano multimodal, or in-browser OCR), never uploaded.
- **Personal details are covered on the device first**: names, passport, phone, IDs and addresses become labelled ink bars (`Person 1`, `Passport 1`), like a censored official document.
- **Offline DMW checks** with **verbatim citations**: salary below the DMW minimum (with currency conversion), passport kept by the employer, fewer than one rest day a week, illegal placement fees, salary deductions, paying for your own food, lodging or airfare. For recruiter posts: tourist visa for work, GCash payments, fixers, chat-only recruiters, no license number.
- **"What the cloud will see"**: before anything is sent, the worker sees exactly what would leave her device. If anything looks like a name that wasn't covered, she can cover it in one tap.
- **A detailed explanation in everyday Taglish, Cebuano or English** from Gemini in the cloud, plus **questions to ask the agency before signing**, and the DMW hotline.

It runs as a **web app**, a **Chrome extension** (right-click a recruiter's Facebook post → "I-check sa Kontrata"), and a **native Android app**, all sharing one tested engine.

## How we built it

**Hybrid inference is the privacy architecture (the "Airlock").** Every model call has a deliberate route:

| Step | Model / method | Mode | Why |
|---|---|---|---|
| Read a photo of the contract | Gemini Nano (multimodal) → else Tesseract (web) / ML Kit (Android) | `ONLY_ON_DEVICE` | The raw image holds everything personal |
| Find names and addresses | Gemini Nano | `ONLY_ON_DEVICE` | Raw text never leaves |
| Phones, passports, IDs, IBANs, form fields | Deterministic detectors | n/a | Exact, testable, no model needed |
| DMW rule checks | Deterministic engine with cited sources | n/a | Offline, explainable, never invents law |
| Explain in Taglish / Cebuano / English | Gemini (`gemini-3.5-flash-lite`) | `ONLY_IN_CLOUD` | Nano can't write Tagalog; input is already anonymous |

Every response's `inferenceSource` is checked: if raw text was somehow answered in the cloud, the result is refused.

**A fail-closed gate, not a hopeful one.** After redaction, a leak gate re-scans the *exact* outbound payload, and a model-free name scan runs on every request. A result is only marked safe when every layer agrees:

$$
\text{safe}(p) \iff \underbrace{G(p) = \varnothing}_{\text{leak gate}} \;\land\; \underbrace{\text{NER} = \text{ok}}_{\text{Nano ran fully}} \;\land\; \underbrace{S(p) = \varnothing}_{\text{model-free name scan}}
$$

Otherwise the worker reviews the payload before anything is sent.

**Grounded in real documents, not model memory.** The rules cite files in the repo: three DMW Standard Employment Contracts for household workers, RA 8042, RA 10022 and RA 11641, DMW Advisory 25-2025 and MC 03-2025 (transcribed from the official scans), and published DMW warnings. A trust test checks that DMW's own standard contracts produce **zero** red flags. For example, a monthly salary of QAR 1,200 is flagged because

$$
\frac{\text{QAR } 1{,}200}{3.64\ \text{QAR/USD}} \approx \text{US}\$330 < \text{US}\$400 \;(\text{old floor}) < \text{US}\$500 \;(\text{Advisory 25-2025})
$$

The thresholds live in **Firebase Remote Config**, because the outcome of DMW's six-month review of the US\$500 minimum isn't public yet. When it is, one value changes and every app updates.

**One engine, three platforms.** The redaction, verdict and rules engine is TypeScript in `packages/core` (**144 tests**, including property-based tests with fast-check that generate hundreds of random contracts). The web app and the Chrome extension import it directly. The **Android app runs the same bundle inside Jetpack JavaScriptSandbox**, an isolated JS engine, instead of a Kotlin rewrite, so a privacy fix ships everywhere at once. Even the interface text is shared.

**Stack:** Firebase AI Logic (hybrid, Gemini Developer API), App Check enforced with reCAPTCHA Enterprise, Remote Config and Hosting, all on the free Spark plan. React + Vite web app, MV3 Chrome extension (no network code at all), and a Kotlin + Jetpack Compose Android app with ML Kit.

## Challenges we ran into

- **Gemini Nano is nondeterministic.** On the same contract, one run found all 5 personal details and the next missed "Liza Mendoza", and my first version still said *safe*. That's why the model-free name scan now runs on **every** request, with a one-tap "cover these too". Both real runs are saved as regression tests.
- **The contract is attacker-controlled text.** A recruiter could write "ignore your instructions" into it. The fixes: a random per-call delimiter around the document, malformed model output treated as a failure (never as "no names found"), and detection that doesn't depend on the model at all. Seven rounds of security review found real bypasses (uppercase names, OCR spacing, Unicode spaces, words before an account number); each fix has a regression test.
- **Speed on real hardware.** On-device name detection first took **18.6 s**. Benchmarking four variants on a mid-range laptop showed that schema-constrained JSON was the slowest and least consistent. Plain `TYPE | text` lines, asking only for people and addresses, and sending only lines that can contain a name brought it to **1.3 s**, about **14× faster**, with better recall.
- **On-device output doesn't support Tagalog** (Chrome's model outputs de, en, es, fr and ja). So the work is split: Nano does detection in English, pre-written Taglish explains the offline findings, and the cloud writes the detailed Taglish explanation from anonymous text.
- **Formal Tagalog was harder to read than English.** Testing the app, the deep Tagalog was harder to understand than the English version. Filipinos write in **Taglish**, so all the interface, rule and cloud text was rewritten in everyday Taglish.
- **Zero budget.** No billing account, no Cloud Functions, no Play Store. App Check runs on reCAPTCHA Enterprise's free tier, and Android uses the App Check debug provider (debug build only). My own laptop couldn't run Nano (Chrome rated it "very low"), so on-device testing and filming happened on a borrowed laptop.

## Accomplishments that we're proud of

- A privacy guarantee you can **see**: the Airlock view shows exactly what the cloud receives.
- On real hardware, on-device inference answered in **1.5 s vs 7.3 s** for the same prompt in the cloud, and name detection got 14× faster through benchmarking.
- **Every legal claim is cited** to a real DMW document, and DMW's own contracts pass with zero red flags.
- **One engine running unchanged on web, Chrome and Android**, backed by 144 tests.
- A design that feels like a trusted government counter, not a chatbot, in the language people actually use.

## What we learned

- Hybrid isn't just "on-device when available, cloud otherwise." The real power is **routing by sensitivity**: personal data stays on the device, and the cloud gets anonymous text.
- Treat model output as untrusted input: validate it, cross-check it with code that doesn't use a model, and fail closed.
- Measure on the hardware people actually use. The fastest variant was also the most accurate, which I wouldn't have guessed.
- Language is part of accessibility: "correct" Tagalog was worse than the Taglish people actually speak.

## What's next for Kontrata

- **Verify on-device Gemini Nano on a supported Android phone.** The Android path is implemented, but the emulator has no Nano model, so it's tested only with the deterministic and cloud paths.
- **A licensed-agency lookup** against DMW's registry, and Standard Employment Contracts for more destination countries.
- **A Cebuano interface**, and **testing with OFW groups and returning workers.**
- Contract **substitution detection**: comparing the contract signed at home with the one presented abroad.

---

## Built with (24 tags)

firebase, firebase-ai-logic, gemini, gemini-nano, chrome-built-in-ai, prompt-api, app-check, recaptcha-enterprise, remote-config, firebase-hosting, typescript, react, vite, chrome-extension, android, kotlin, jetpack-compose, ml-kit, javascriptsandbox, pdf.js, tesseract.js, webassembly, vitest, fast-check

---

## Try it out

- **Web app:** https://kontrata-hybrid.web.app (on-device AI needs desktop Chrome with Gemini Nano enabled; everything else works in any modern browser and on phones)
- **Source code:** https://github.com/gauciv/kontrata
- **Chrome extension (zip + install steps):** https://github.com/gauciv/kontrata/releases/tag/v0.1.0
