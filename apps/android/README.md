# Kontrata for Android

Native Kotlin + Jetpack Compose app using **Firebase AI Logic hybrid inference** (`firebase-ai` 18.2 +
`firebase-ai-ondevice` beta), App Check, and Remote Config.

## Architecture: one engine, three platforms
The redaction, leak gate, verdict, and DMW rules engine are **not re-implemented in Kotlin**. The app runs the exact
same tested TypeScript engine as the web app and Chrome extension (`packages/core`, 141 tests), bundled as
`assets/kontrata-core.js` and executed in **Jetpack JavaScriptSandbox**, an isolated JS engine with no network or
file access. The interface copy (Taglish/English) also comes from the engine, so all platforms say the same thing.

| Step | Android | Where it runs |
|---|---|---|
| Read a photo of a contract | Gemini Nano (`ONLY_ON_DEVICE`, Bitmap) → else ML Kit text recognition | On the device |
| Find names/addresses | Gemini Nano (`ONLY_ON_DEVICE`), line output, people only | On the device |
| Redact, leak gate, verdict, rules | Shared engine in JavaScriptSandbox | On the device |
| Explain in Taglish/Cebuano/English | Gemini (`ONLY_IN_CLOUD`) on the redacted text only | Cloud |

## Testing status (honest)
- ✅ Tested on the Android emulator (Android 17, Google Play image): engine in the sandbox, offline findings, Airlock
  view, review + "cover these too", App Check (debug provider), and the cloud explanation in Taglish.
- ⚠️ **On-device Gemini Nano on Android is implemented but NOT verified**: the emulator has no AICore model and no
  supported phone (Pixel 9/10/11, Galaxy S26, …) was available. Without it, the app falls back to the deterministic
  layers + human review, exactly like the web app on unsupported browsers. The web app's on-device path *was*
  verified on real hardware (see `docs/BENCHMARKS.md`).

## Build
```
npm install && npm -w packages/core run build:bridge   # refreshes assets/kontrata-core.js
cd apps/android && ./gradlew assembleDebug
```
Needs `app/google-services.json` (Firebase console → project settings) and, for App Check while enforcement is on,
`appCheckDebugToken=<registered debug token>` in `local.properties` (both gitignored).
**App Check trade-off (deliberate):** Play Integrity needs Play Store distribution (paid) and a custom attestation
server needs Cloud Functions (paid Blaze plan), which conflicts with this project's zero-cost constraint. So the
*debug* build, used for judging, carries a registered App Check debug token; release builds carry none (verified in
the APK). Worst case if extracted: use of the free-tier Gemini quota (the project has no billing account, so no cost).
**The token is revoked after judging.**

The emulator needs ≥3 GB RAM (`emulator -avd <name> -memory 3072`); with less, Android's low-memory killer stops the
app because the JavaScript sandbox runs as a separate process.

## Third-party
Fonts in `app/src/main/res/font/`: Public Sans (© The Public Sans Project Authors) and IBM Plex Serif (© IBM Corp.),
both under the SIL Open Font License 1.1.
