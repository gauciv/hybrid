# Extension demo harness (for the video)

A neutral, unbranded social-feed mock-up with the synthetic recruiter post, plus the **real** extension side panel bundle
in an iframe. Only `chrome.storage` is stubbed so the unmodified panel code runs in a page. The right-click menu and
side-panel frame are drawn for the video (the video labels this).

Run: `npm run build:ext`, then make `panel.html` from `apps/extension/dist/sidepanel.html` with the storage stub inserted
before the module script (see build notes in the repo history), symlink `assets/` and `icons/` from `apps/extension/dist`,
serve this folder (`python3 -m http.server 5176`), open `index.html`, and call `run()` while screen-recording.
