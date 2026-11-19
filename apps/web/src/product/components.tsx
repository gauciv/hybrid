// Presentational pieces shared by the web app and the Chrome extension. No Firebase imports here.
import { PLACEHOLDER_RE, rehydrate, type Finding, type Severity, type Vault } from "@kontrata/core";
import { T, type UiLang } from "./i18n";

export function FindingItem({ f, vault, lang }: { f: Finding; vault: Vault; lang: UiLang }) {
  // Findings are computed on redacted text; on the device we can show the real words.
  const evidence = f.evidence ? rehydrate(f.evidence, vault) : null;
  return (
    <li className="k-finding" data-sev={f.severity}>
      <SeverityMark sev={f.severity} />
      <div>
        <span className="k-sev">{T.sevLabel[f.severity][lang]}</span>
        <h2>{f.title[lang]}</h2>
        <p>{f.detail[lang]}</p>
        {evidence && (
          <blockquote className="k-quote">
            <cite>{T.inContract[lang]}</cite>
            {evidence}
          </blockquote>
        )}
        <details className="k-basis">
          <summary>
            {T.basis[lang]}: {f.citations.map((c) => c.title).join("; ")}
          </summary>
          {f.citations.map((c) => (
            <blockquote key={c.id} lang="en">
              “{c.quote}”<footer>{c.title}</footer>
            </blockquote>
          ))}
        </details>
      </div>
    </li>
  );
}

// ------------------------------------------------------------------ redaction rendering

export function placeholderLabel(ph: string, lang: UiLang): string {
  const m = ph.match(/^\[\[([A-Z_]+)_(\d+)(?:\.\d+)?\]\]$/);
  if (!m) return ph;
  return `${T.chip[m[1]]?.[lang] ?? m[1]} ${m[2]}`;
}

export function Redacted({ text, lang }: { text: string; lang: UiLang }) {
  const parts: (string | { ph: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(new RegExp(PLACEHOLDER_RE.source, "g"))) {
    parts.push(text.slice(last, m.index), { ph: m[0] });
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          p
        ) : (
          <span key={i} className="k-bar" title={placeholderLabel(p.ph, lang)}>
            {placeholderLabel(p.ph, lang)}
          </span>
        ),
      )}
    </>
  );
}

export function VaultRow({ ph, value, lang }: { ph: string; value: string; lang: UiLang }) {
  return (
    <>
      <dt>
        <span className="k-bar">{placeholderLabel(ph, lang)}</span>
      </dt>
      <dd>{value}</dd>
    </>
  );
}

// ------------------------------------------------------------------ marks (shape + colour, never colour alone)

export function SeverityMark({ sev }: { sev: Severity }) {
  const c = { red: "var(--red)", amber: "var(--amber)", green: "var(--green)" }[sev];
  return (
    <svg className="k-mark" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      {sev === "red" && (
        <>
          <rect x="3.3" y="3.3" width="11.4" height="11.4" transform="rotate(45 9 9)" fill={c} />
          <rect x="8.2" y="4.6" width="1.6" height="5.4" fill="#fff" />
          <rect x="8.2" y="11.2" width="1.6" height="1.6" fill="#fff" />
        </>
      )}
      {sev === "amber" && (
        <>
          <path d="M9 2.2 16.4 15.4H1.6Z" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="8.2" y="6.6" width="1.6" height="4.6" fill={c} />
          <rect x="8.2" y="12.2" width="1.6" height="1.6" fill={c} />
        </>
      )}
      {sev === "green" && (
        <>
          <circle cx="9" cy="9" r="7.2" fill="none" stroke={c} strokeWidth="1.8" />
          <path d="M5.6 9.2 7.9 11.5 12.5 6.6" fill="none" stroke={c} strokeWidth="1.8" />
        </>
      )}
    </svg>
  );
}

export function BrandMark() {
  // A page with one line struck through by a redaction bar.
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true">
      <path d="M2 1h12l6 6v18H2z" fill="none" stroke="var(--ink)" strokeWidth="1.6" />
      <path d="M14 1v6h6" fill="none" stroke="var(--ink)" strokeWidth="1.6" />
      <rect x="5.5" y="11" width="11" height="1.5" fill="var(--rule-strong)" />
      <rect x="5.5" y="15" width="11" height="3.2" fill="var(--ink)" />
      <rect x="5.5" y="20.6" width="7" height="1.5" fill="var(--rule-strong)" />
    </svg>
  );
}

export function LockIcon({ small }: { small?: boolean }) {
  const s = small ? 14 : 20;
  return (
    <svg width={s} height={s} viewBox="0 0 20 20" aria-hidden="true" style={{ flex: "none", marginTop: small ? 0 : "0.15rem" }}>
      <rect x="3.5" y="8.5" width="13" height="9.5" rx="1.5" fill="none" stroke="var(--ledger)" strokeWidth="1.6" />
      <path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="var(--ledger)" strokeWidth="1.6" />
    </svg>
  );
}
