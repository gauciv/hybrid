// Demo autopilot: films the real app on the machine that has Gemini Nano, with no extra tools or credentials.
// Open /#demo (product, Taglish), /#demo-en (product, English) or /#demo-lab (on-device vs cloud timings),
// press "Start recording", pick THIS tab, and the page drives itself with a visible cursor, then downloads a .webm.
// Lazy-loaded only for those fragments; it clicks the same buttons a person would and changes no app logic.

type Scenario = "product-tl" | "product-en" | "lab";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 90_000, label = "element"): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (performance.now() - t0 > timeout) throw new Error(`autopilot: timed out waiting for ${label}`);
    await sleep(150);
  }
}

const byText = (sel: string, text: string) =>
  [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.textContent?.trim().startsWith(text) && e.offsetParent !== null);

// ------------------------------------------------------------------ cursor

let cursor: HTMLDivElement;
let cx = innerWidth * 0.6;
let cy = innerHeight * 0.55;

function makeCursor() {
  cursor = document.createElement("div");
  cursor.setAttribute("aria-hidden", "true");
  cursor.style.cssText = "position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;will-change:transform";
  cursor.innerHTML =
    '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M3 2l17 9.5-7.4 1.7L9 20.5z" fill="#1c2733" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.append(cursor);
  place();
}
const place = () => (cursor.style.transform = `translate(${cx - 3}px, ${cy - 2}px)`);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function animate(ms: number, step: (k: number) => void) {
  return new Promise<void>((done) => {
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      step(ease(k));
      if (k < 1) requestAnimationFrame(tick);
      else done();
    };
    requestAnimationFrame(tick);
  });
}

async function moveTo(el: Element, ms = 750) {
  const r = el.getBoundingClientRect();
  const [x0, y0] = [cx, cy];
  const [x1, y1] = [r.left + Math.min(r.width / 2, 60), r.top + r.height / 2];
  await animate(ms, (k) => ((cx = x0 + (x1 - x0) * k), (cy = y0 + (y1 - y0) * k), place()));
}

async function click(el: HTMLElement, pauseAfter = 900) {
  await scrollIntoView(el);
  await moveTo(el);
  await sleep(250);
  const ring = document.createElement("div");
  ring.style.cssText = `position:fixed;left:${cx - 16}px;top:${cy - 16}px;width:32px;height:32px;border-radius:50%;
    border:2px solid #1f4e5f;z-index:2147483646;pointer-events:none;transition:transform .45s ease-out,opacity .45s ease-out`;
  document.body.append(ring);
  requestAnimationFrame(() => ((ring.style.transform = "scale(1.8)"), (ring.style.opacity = "0")));
  setTimeout(() => ring.remove(), 500);
  el.click();
  await sleep(pauseAfter);
}

/** Smooth scroll so `el` sits near the top third of the screen (only if it isn't comfortably visible already). */
async function scrollIntoView(el: Element, ms = 1100) {
  const r = el.getBoundingClientRect();
  if (r.top > 80 && r.bottom < innerHeight - 80) return;
  await scrollBy(r.top - innerHeight * 0.28, ms);
}
async function scrollBy(dy: number, ms = 1400) {
  const y0 = scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  const y1 = Math.max(0, Math.min(max, y0 + dy));
  await animate(ms, (k) => scrollTo(0, y0 + (y1 - y0) * k));
}
/** Read-along scroll: move down `px` at a calm pace. */
const glide = (px: number) => scrollBy(px, Math.max(1200, Math.abs(px) * 4.5));

// ------------------------------------------------------------------ scenarios

async function product(lang: "tl" | "en") {
  const L = lang === "tl";
  const langBtn = byText(".k-lang button", L ? "Taglish" : "English");
  if (langBtn && langBtn.getAttribute("aria-pressed") !== "true") langBtn.click();
  await sleep(2500); // hold on the home screen

  await click(await waitFor(() => byText(".k-tool", L ? "Subukan ang sample" : "Try a sample"), 5000, "sample menu"), 700);
  await click(await waitFor(() => byText(".k-menu-list button", L ? "Photo ng contract" : "Photo of a contract"), 5000, "photo item"), 600);

  // Reading on the device: wait until the text is in and the status is no longer "reading".
  await waitFor(() => document.querySelector(".k-reading"), 10_000, "reading status").catch(() => null);
  await waitFor(() => !document.querySelector(".k-reading") && document.querySelector("textarea")?.value.trim(), 120_000, "photo text");
  await sleep(1800);
  const ta = document.querySelector("textarea")!;
  await moveTo(ta, 900);
  await sleep(2200);

  await click(await waitFor(() => byText(".k-check", L ? "I-check" : "Check"), 5000, "check button"), 300);
  const verdict = await waitFor(() => document.querySelector(".k-verdict"), 120_000, "results");
  await sleep(1200);
  const model = document.querySelector(".k-model");
  if (model) await moveTo(model, 900);
  await sleep(3000);

  // Findings: read down, open the salary/passport source quote.
  await moveTo(verdict, 500);
  await glide(260);
  await sleep(1500);
  const basis = document.querySelector<HTMLElement>(".k-finding[data-sev=red] .k-basis summary");
  if (basis) {
    await click(basis, 2800);
  }
  await glide(380);
  await sleep(1500);

  // The Airlock: what the cloud will see.
  const air = document.getElementById("k-airlock-h");
  if (air) {
    await scrollBy(air.getBoundingClientRect().top - 90, 1500);
    await sleep(1500);
    const bar = document.querySelector(".k-payload .k-bar");
    if (bar) await moveTo(bar, 900);
    await sleep(2500);
    const vault = document.querySelector(".k-vault");
    if (vault) await moveTo(vault, 900);
    await sleep(2500);
  }

  // If this machine has no Nano (or Nano missed something), the honest path: cover suspects, confirm.
  // This is the "fails closed" moment: give it screen time.
  const review = document.querySelector(".k-review");
  if (review) {
    await scrollBy(review.getBoundingClientRect().top - innerHeight * 0.2, 1400);
    await sleep(800);
    await moveTo(review.querySelector("h3") ?? review, 800);
    await sleep(2500);
    const suspects = review.querySelector(".k-suspects");
    if (suspects) {
      await moveTo(suspects, 800);
      await sleep(3500); // let the viewer read the names that were caught
    }
    const cover = byText(".k-review button", L ? "Takpan" : "Cover");
    if (cover) {
      await click(cover, 1200);
      // Show the result: the names are now ink bars in what the cloud will see.
      const payload = document.querySelector(".k-payload");
      if (payload) {
        await scrollBy(payload.getBoundingClientRect().top - 110, 1400);
        await sleep(600);
        await moveTo(payload.querySelector(".k-bar") ?? payload, 900);
        await sleep(3500);
      }
    }
    const confirm = await waitFor(() => document.querySelector<HTMLInputElement>(".k-confirm input"), 3000, "confirm").catch(() => null);
    if (confirm && !confirm.checked) {
      await click(confirm, 400);
      await sleep(1800);
    }
  }

  // Detailed explanation from the cloud.
  const explain = await waitFor(() => byText(".k-deep-controls .k-btn", L ? "Ipaliwanag" : "Explain"), 5000, "explain button");
  await scrollBy(document.getElementById("k-deep-h")!.getBoundingClientRect().top - 90, 1400);
  await sleep(1200);
  await click(explain, 500);
  const deep = await waitFor(() => document.querySelector(".k-deep"), 120_000, "explanation");
  await sleep(1500);
  await moveTo(deep, 700);
  for (let i = 0; i < 6; i++) {
    const q = document.querySelector(".k-questions");
    if (q && q.getBoundingClientRect().top < innerHeight * 0.35) break;
    await glide(320);
    await sleep(1400);
  }
  const q = document.querySelector(".k-questions");
  if (q) {
    await scrollIntoView(q);
    await moveTo(q, 800);
  }
  await sleep(4000);
}

async function lab() {
  await sleep(1500);
  await click(byText("button", "1. Initialize")!, 500);
  await waitFor(() => /ready|failed/i.test(document.querySelector("main > p")?.textContent ?? ""), 600_000, "device model");
  await sleep(1500);
  const before = () => document.querySelectorAll("[data-testid=source]").length;
  for (const label of ["Only on-device", "Only cloud"]) {
    const n = before();
    await click(byText("button", label)!, 300);
    await waitFor(() => before() > n, 120_000, label);
    await sleep(2000);
    const first = document.querySelector("[data-testid=source]");
    if (first) await moveTo(first, 800);
    await sleep(2500);
  }
  await sleep(2500);
}

// ------------------------------------------------------------------ recording

async function record(run: () => Promise<void>, name: string) {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: "include",
  } as DisplayMediaStreamOptions);
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m))!;
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((r) => (rec.onstop = r));
  rec.start(1000);
  await sleep(1200);
  let error: unknown;
  try {
    await run();
  } catch (e) {
    error = e;
  }
  await sleep(1500);
  rec.stop();
  stream.getTracks().forEach((t) => t.stop());
  await stopped;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(chunks, { type: "video/webm" }));
  a.download = `${name}-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}.webm`;
  a.click();
  if (error) throw error;
}

const SCENARIOS: [Scenario, string, string][] = [
  ["product-tl", "Product · Taglish", "#demo"],
  ["product-en", "Product · English", "#demo-en"],
  ["lab", "Lab · on-device vs cloud", "#demo-lab"],
];

export function mount(hash: string) {
  const scenario: Scenario = hash === "#demo-lab" ? "lab" : hash === "#demo-en" ? "product-en" : "product-tl";
  const run = scenario === "lab" ? lab : () => product(scenario === "product-en" ? "en" : "tl");

  const panel = document.createElement("div");
  panel.style.cssText = `position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#1c2733;color:#e7ecea;
    font:600 14px/1.4 system-ui,sans-serif;padding:14px;border-radius:8px;display:grid;gap:8px;width:290px;box-shadow:0 6px 24px #0004`;
  const head = document.createElement("div");
  head.textContent = "Demo autopilot";
  const hint = document.createElement("div");
  hint.style.cssText = "font-weight:400;opacity:.8";
  hint.textContent = 'Pick a scene, press F11 (fullscreen), then Start recording and choose "This tab".';
  panel.append(head, hint);

  // Scene picker. The lab is a different page, so switching scenes reloads (a hash change alone would not).
  const picker = document.createElement("div");
  picker.style.cssText = "display:grid;gap:4px;padding:6px 0";
  for (const [id, label, h] of SCENARIOS) {
    const b = document.createElement("button");
    b.textContent = (id === scenario ? "● " : "○ ") + label;
    b.style.cssText = `font:inherit;font-weight:${id === scenario ? 700 : 400};text-align:left;padding:6px 8px;border-radius:5px;cursor:pointer;
      border:1px solid ${id === scenario ? "#e7ecea" : "#e7ecea44"};background:transparent;color:#e7ecea`;
    b.onclick = () => {
      if (id === scenario) return;
      location.hash = h;
      location.reload();
    };
    picker.append(b);
  }
  panel.append(picker);

  const btn = (label: string, fn: () => void, primary = false) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = `font:inherit;padding:8px 10px;border-radius:5px;border:0;cursor:pointer;
      background:${primary ? "#e7ecea" : "#ffffff22"};color:${primary ? "#1c2733" : "#e7ecea"}`;
    b.onclick = fn;
    panel.append(b);
  };
  const go = async (rec: boolean) => {
    panel.remove();
    await sleep(400);
    makeCursor();
    try {
      if (rec) await record(run, `kontrata-${scenario}`);
      else await run();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      cursor.remove();
    }
  };
  btn("● Start recording", () => void go(true), true);
  btn("Practice run (no recording)", () => void go(false));
  document.body.append(panel);
}
