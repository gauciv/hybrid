import { useEffect, useRef, useState } from "react";
import type { DeepLang, Severity } from "@kontrata/core";
import { deepCheck, type DeepCheckRun } from "../ai/cloud";
import { coverSuspects, evaluate, findPeopleOnDevice, type Analysis } from "./pipeline";
import { T, type UiLang } from "./i18n";
import { SAMPLE_CONTRACT, SAMPLE_POST } from "./samples";
import { BrandMark, FindingItem, LockIcon, Redacted, SeverityMark, VaultRow } from "./components";
import "./product.css";

type Phase = "input" | "working" | "results";

/** Text handed over by the Chrome extension in the URL fragment (#check=…), which browsers never send to servers. */
function takeHandoff(): string {
  const m = location.hash.match(/^#check=(.*)$/s);
  if (!m) return "";
  history.replaceState(null, "", location.pathname + location.search); // don't leave it in the address bar/history entry
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return "";
  }
}

function loadLang(): UiLang {
  try {
    return localStorage.getItem("k-lang") === "en" ? "en" : "tl";
  } catch {
    return "tl";
  }
}

export default function Product() {
  const [lang, setLang] = useState<UiLang>(loadLang);
  const [text, setText] = useState(takeHandoff);
  const [phase, setPhase] = useState<Phase>("input");
  const [step, setStep] = useState(1);
  const [a, setA] = useState<Analysis | null>(null);
  const [inputError, setInputError] = useState(false);
  const t = <K extends keyof typeof T>(k: K) => (T[k] as Record<UiLang, never>)[lang];

  useEffect(() => {
    try {
      localStorage.setItem("k-lang", lang);
    } catch {
      /* private mode: fine */
    }
    document.documentElement.lang = lang === "tl" ? "fil" : "en";
  }, [lang]);

  async function analyse() {
    if (!text.trim()) {
      setInputError(true);
      return;
    }
    setInputError(false);
    setPhase("working");
    setStep(1);
    const ner = await findPeopleOnDevice(text);
    setStep(2);
    const result = evaluate(text, ner, []);
    setStep(3);
    setA(result);
    setPhase("results");
    window.scrollTo({ top: 0 });
  }

  function restart() {
    setA(null);
    setText("");
    setPhase("input");
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="k-root">
      <header className="k-header">
        <div className="k-wrap">
          <a className="k-brand" href="/" onClick={(e) => (e.preventDefault(), restart())}>
            <BrandMark />
            Kontrata
          </a>
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
        {phase === "input" && (
          <>
            <section className="k-intro">
              <h1 className="k-title">{t("tagline")}</h1>
              <p className="k-lede">{t("intro")}</p>
            </section>
            <div className="k-composer">
              <label htmlFor="k-text">{t("inputLabel")}</label>
              <textarea
                id="k-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("placeholder")}
                spellCheck={false}
                aria-describedby="k-privacy"
              />
              <div className="k-composer-bar">
                <div className="k-samples">
                  <button className="k-link" onClick={() => setText(SAMPLE_CONTRACT)}>
                    {t("useSample")}
                  </button>
                  <button className="k-link" onClick={() => setText(SAMPLE_POST)}>
                    {t("useSamplePost")}
                  </button>
                </div>
                <button className="k-btn" onClick={analyse}>
                  {t("check")}
                </button>
              </div>
            </div>
            {inputError && (
              <p className="k-error" role="alert">
                {t("emptyInput")}
              </p>
            )}
            <div className="k-privacy" id="k-privacy">
              <LockIcon />
              <div>
                <strong>{t("privacyTitle")}</strong>
                <p>{t("privacyBody")}</p>
              </div>
            </div>
          </>
        )}

        {phase === "working" && (
          <ol className="k-steps" aria-live="polite">
            {(["step1", "step2", "step3"] as const).map((k, i) => (
              <li key={k} data-state={i + 1 < step ? "done" : i + 1 === step ? "active" : "todo"}>
                <span>{t(k)}</span>
              </li>
            ))}
          </ol>
        )}

        {phase === "results" && a && <Results a={a} setA={setA} lang={lang} onRestart={restart} />}
      </main>

      <footer className="k-footer">
        <div className="k-wrap">
          <h2>{t("helpTitle")}</h2>
          <p>{t("helpBody")}</p>
          <p>{t("disclaimer")}</p>
        </div>
      </footer>
    </div>
  );
}

// ------------------------------------------------------------------ results

function Results({ a, setA, lang, onRestart }: { a: Analysis; setA: (a: Analysis) => void; lang: UiLang; onRestart: () => void }) {
  const t = <K extends keyof typeof T>(k: K) => (T[k] as Record<UiLang, never>)[lang];
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reds = a.findings.filter((f) => f.severity === "red").length;
  const ambers = a.findings.filter((f) => f.severity === "amber").length;
  useEffect(() => headingRef.current?.focus(), []);

  const heading = reds ? T.resultsRed[lang](reds) : ambers ? T.resultsAmber[lang](ambers) : t("resultsClear");
  const order: Severity[] = ["red", "amber", "green"];
  const findings = [...a.findings].sort((x, y) => order.indexOf(x.severity) - order.indexOf(y.severity));

  return (
    <>
      <section className="k-verdict">
        <h1 ref={headingRef} tabIndex={-1}>
          {heading}
        </h1>
        <p>{reds || ambers ? t("resultsSub") : t("resultsClearSub")}</p>
        {a.ner.status === "ok" && <p className="k-model">{T.modelOk[lang]((a.ner.ms / 1000).toFixed(1))}</p>}
      </section>

      <ul className="k-findings">
        {findings.map((f) => (
          <FindingItem key={f.ruleId} f={f} vault={a.vault} lang={lang} />
        ))}
      </ul>

      <AirlockSection a={a} setA={setA} lang={lang} />

      <div className="k-restart">
        <button className="k-btn k-btn-quiet" onClick={onRestart}>
          {t("checkAnother")}
        </button>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ airlock + deep check

function AirlockSection({ a, setA, lang }: { a: Analysis; setA: (a: Analysis) => void; lang: UiLang }) {
  const t = <K extends keyof typeof T>(k: K) => (T[k] as Record<UiLang, never>)[lang];
  const [reviewed, setReviewed] = useState(false);
  const [deepLang, setDeepLang] = useState<DeepLang>(lang === "en" ? "en" : "tl");
  const [deep, setDeep] = useState<DeepCheckRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const v = a.verdict;
  const canSend = v.kind === "safe" || (v.kind === "needs_review" && reviewed);

  async function explain() {
    setBusy(true);
    setFailed(false);
    try {
      setDeep(await deepCheck(a.redacted, a.vault, a.findings, deepLang));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="k-section" aria-labelledby="k-airlock-h">
        <h2 id="k-airlock-h">{t("airlockTitle")}</h2>
        <p>{t("airlockBody")}</p>
        <div className="k-airlock">
          <div className="k-payload">
            <Redacted text={a.redacted} lang={lang} />
          </div>
          <div className="k-vault">
            <h3>
              <LockIcon small />
              {t("localOnly")}
            </h3>
            {a.vault.size ? (
              <dl>
                {[...a.vault]
                  .filter(([ph]) => !ph.includes("."))
                  .map(([ph, value]) => (
                    <VaultRow key={ph} ph={ph} value={value} lang={lang} />
                  ))}
              </dl>
            ) : (
              <p style={{ margin: 0 }}>{t("nothingCovered")}</p>
            )}
          </div>
        </div>

        {v.kind === "needs_review" && (
          <div className="k-review">
            <h3>{t("reviewTitle")}</h3>
            {v.reason === "model_unavailable" && <p>{t("modelOff")}</p>}
            {v.suspects.length > 0 && (
              <>
                <p>{t("reviewSuspects")}</p>
                <ul className="k-suspects">
                  {v.suspects.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <button className="k-btn k-btn-quiet" onClick={() => (setA(coverSuspects(a)), setReviewed(false))}>
                  {t("coverThese")}
                </button>
              </>
            )}
            <label className="k-confirm">
              <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
              <span>{t("confirmReview")}</span>
            </label>
          </div>
        )}
        {v.kind === "blocked" && (
          <div className="k-blocked" role="alert">
            {t("blocked")}
          </div>
        )}
      </section>

      <section className="k-section" aria-labelledby="k-deep-h">
        <h2 id="k-deep-h">{t("deepTitle")}</h2>
        <p>{t("deepBody")}</p>
        <div className="k-deep-controls">
          <div className="k-field">
            <label htmlFor="k-deep-lang">{t("deepLang")}</label>
            <select id="k-deep-lang" value={deepLang} onChange={(e) => setDeepLang(e.target.value as DeepLang)}>
              <option value="tl">Taglish</option>
              <option value="ceb">Cebuano / Bisaya</option>
              <option value="en">English</option>
            </select>
          </div>
          <button className="k-btn" disabled={!canSend || busy} onClick={explain}>
            {busy ? t("explaining") : t("explain")}
          </button>
        </div>
        {failed && (
          <p className="k-error" role="alert">
            {t("deepFailed")}
          </p>
        )}
        {deep && <DeepResult run={deep} lang={lang} />}
      </section>
    </>
  );
}

function DeepResult({ run, lang }: { run: DeepCheckRun; lang: UiLang }) {
  const t = <K extends keyof typeof T>(k: K) => (T[k] as Record<UiLang, never>)[lang];
  const [toast, setToast] = useState(false);
  const r = run.result;
  const sev = { violates: "red", unclear: "amber", ok: "green" } as const;

  async function copy() {
    try {
      await navigator.clipboard.writeText(r.questions.map((q, i) => `${i + 1}. ${q}`).join("\n"));
      setToast(true);
      setTimeout(() => setToast(false), 1800);
    } catch {
      /* clipboard blocked: the list is still selectable */
    }
  }

  return (
    <div className="k-deep" aria-live="polite">
      <p className="k-deep-summary">{r.summary}</p>
      <ul className="k-findings">
        {r.clauses.map((c, i) => (
          <li key={i} className="k-finding" data-sev={sev[c.status]}>
            <SeverityMark sev={sev[c.status]} />
            <div>
              <span className="k-sev">{T.clause[c.status][lang]}</span>
              <p style={{ marginTop: 0 }}>{c.explanation}</p>
              <blockquote className="k-quote">
                <cite>{T.inContract[lang]}</cite>“{c.quote}”
              </blockquote>
            </div>
          </li>
        ))}
      </ul>
      {r.questions.length > 0 && (
        <div className="k-questions">
          <h3>{t("questionsTitle")}</h3>
          <ol>
            {r.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
          <button className="k-btn k-btn-quiet" onClick={copy}>
            {t("copyQuestions")}
          </button>
        </div>
      )}
      <details className="k-sent">
        <summary>{t("sentDetails")}</summary>
        <pre>{run.sentPrompt}</pre>
      </details>
      {toast && (
        <div className="k-toast" role="status">
          {t("copied")}
        </div>
      )}
    </div>
  );
}

