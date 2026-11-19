// Side panel: instant, fully offline red-flag check of selected text using the same tested engine as the web app.
// No network access. "Buksan ang buong check" hands the text to the web app via the URL fragment.
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { checkDocument, guessKind, redact, type Severity } from "@kontrata/core";
import { BrandMark, FindingItem, LockIcon } from "../../web/src/product/components";
import { T, type UiLang } from "../../web/src/product/i18n";
import "../../web/src/product/product.css";
import "./sidepanel.css";

const WEB_APP = "https://kontrata-hybrid.web.app/";

const X = {
  howTitle: { tl: "I-check ang job offer habang nagba-browse", en: "Check a job offer while you browse" },
  how: {
    tl: "I-highlight ang post, chat, o contract sa kahit anong website. I-right-click, tapos piliin ang “I-check sa Kontrata”. Pwede ka ring mag-paste dito.",
    en: "Highlight a post, chat, or contract on any website. Right-click, then choose “I-check sa Kontrata”. You can also paste it here.",
  },
  pasteLabel: { tl: "Text na iche-check", en: "Text to check" },
  offline: {
    tl: "Walang ipinapadala ang extension. Dito lang sa computer mo ginagawa ang check.",
    en: "The extension sends nothing. The check happens only on your computer.",
  },
  full: { tl: "Buksan ang buong check", en: "Open the full check" },
  fullWhy: {
    tl: "Sa buong check, tinatakpan ng AI sa device mo ang mga pangalan, at may detalyadong paliwanag at mga tanong para sa agency.",
    en: "The full check uses on-device AI to cover names, and adds a detailed explanation and questions for the agency.",
  },
  clear: { tl: "Burahin", en: "Clear" },
} as const;

function loadLang(): UiLang {
  try {
    return localStorage.getItem("k-lang") === "en" ? "en" : "tl";
  } catch {
    return "tl";
  }
}

function Panel() {
  const [lang, setLang] = useState<UiLang>(loadLang);
  const [text, setText] = useState("");

  useEffect(() => {
    const take = (v?: { text?: string }) => v?.text && setText(v.text);
    chrome.storage.session.get("pending").then((r) => take(r.pending as { text?: string }));
    const onChange = (c: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "session" && c.pending) take(c.pending.newValue as { text?: string });
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("k-lang", lang);
    } catch {
      /* fine */
    }
  }, [lang]);

  const result = useMemo(() => {
    if (!text.trim()) return null;
    const { redacted, vault } = redact(text);
    const findings = checkDocument(redacted, guessKind(text));
    const order: Severity[] = ["red", "amber", "green"];
    return { vault, findings: findings.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity)) };
  }, [text]);

  const reds = result?.findings.filter((f) => f.severity === "red").length ?? 0;
  const ambers = result?.findings.filter((f) => f.severity === "amber").length ?? 0;
  const heading = reds ? T.resultsRed[lang](reds) : ambers ? T.resultsAmber[lang](ambers) : T.resultsClear[lang];

  function openFull() {
    chrome.tabs.create({ url: `${WEB_APP}#check=${encodeURIComponent(text)}` });
    chrome.storage.session.remove("pending");
  }

  return (
    <div className="k-root k-panel">
      <header className="k-header">
        <div className="k-wrap">
          <span className="k-brand">
            <BrandMark />
            Kontrata
          </span>
          <div className="k-lang" role="group" aria-label="Wika / Language">
            <button aria-pressed={lang === "tl"} onClick={() => setLang("tl")}>
              Taglish
            </button>
            <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>
              English
            </button>
          </div>
        </div>
      </header>
      <main className="k-wrap">
        {!result && (
          <section className="k-panel-intro">
            <h1>{X.howTitle[lang]}</h1>
            <p>{X.how[lang]}</p>
          </section>
        )}
        <div className="k-composer">
          <label htmlFor="k-ext-text">{X.pasteLabel[lang]}</label>
          <textarea id="k-ext-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={T.placeholder[lang]} spellCheck={false} />
          {text && (
            <div className="k-composer-bar">
              <button className="k-link" onClick={() => (setText(""), chrome.storage.session.remove("pending"))}>
                {X.clear[lang]}
              </button>
            </div>
          )}
        </div>
        <div className="k-privacy">
          <LockIcon />
          <p>{X.offline[lang]}</p>
        </div>

        {result && (
          <>
            <section className="k-verdict">
              <h1>{heading}</h1>
              <p>{reds || ambers ? T.resultsSub[lang] : T.resultsClearSub[lang]}</p>
            </section>
            <ul className="k-findings">
              {result.findings.map((f) => (
                <FindingItem key={f.ruleId} f={f} vault={result.vault} lang={lang} />
              ))}
            </ul>
            <section className="k-panel-full">
              <button className="k-btn" onClick={openFull}>
                {X.full[lang]}
              </button>
              <p>{X.fullWhy[lang]}</p>
            </section>
          </>
        )}
      </main>
      <footer className="k-footer">
        <div className="k-wrap">
          <h2>{T.helpTitle[lang]}</h2>
          <p>{T.helpBody[lang]}</p>
          <p>{T.disclaimer[lang]}</p>
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Panel />
  </StrictMode>,
);
