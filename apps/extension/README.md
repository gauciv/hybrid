# Kontrata Chrome extension

Right-click a recruiter post, chat, or contract on any website → **I-check sa Kontrata**. A side panel shows DMW red
flags (tourist visa, GCash payment, fixer, placement fee, no license, low salary, passport, rest day) with Taglish/English
explanations and the official source for each.

**Privacy:** the extension has **no network access in its code**. It uses the same tested redaction + rules engine as
the web app (`packages/core`), fully offline. "Buksan ang buong check" opens the web app with the text in the URL
*fragment* (`#check=…`), which browsers never send to servers; the web app then runs Gemini Nano on-device and the
optional cloud explanation, and removes the fragment from the address bar.

## Install (unpacked)
```
npm install
npm run build:ext            # from the repo root
```
Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → choose `apps/extension/dist`.

Permissions: `contextMenus` (right-click item), `sidePanel` (the panel), `storage` (hand the selection to the panel,
session memory only).
