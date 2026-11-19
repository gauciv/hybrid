// Dev-only panel: run the on-device redaction pipeline on a sample contract and inspect the result.
import { useState } from "react";
import {
  airlockVerdict,
  checkDocument,
  leakGate,
  redact,
  type AirlockVerdict,
  type DeepLang,
  type ExternalEntity,
  type NerResult,
} from "@kontrata/core";
import { deepCheck, type DeepCheckRun } from "./ai/cloud";
import { initOnDevice, nanoNer, NER_VARIANTS } from "./ai/onDevice";

// Fictional sample. Names deliberately appear OUTSIDE labeled fields so only the model can catch them.
const SAMPLE = `EMPLOYMENT CONTRACT
This agreement is made between Mr. Hamad Al-Kuwari of Street 12, Al Wakra, Doha (the Employer)
and Liza Mendoza, a Filipino household service worker (the Worker).
Passport No.: P4829173B   Mobile No.: +63 917 555 0142

1. The Employer shall pay the Worker a monthly salary of QAR 1,200 for 24 months.
2. Hamad shall keep the Worker's passport for safekeeping during employment.
3. Liza shall work 14 hours per day with one rest day per month.
4. The agency, Golden Hands Manpower Services Inc., charged a placement fee of PHP 45,000.`;

function evaluate(text: string, ner: NerResult & { ms: number }, confirmed: ExternalEntity[]) {
  const entities = [...ner.entities, ...confirmed];
  const { redacted, vault } = redact(text, entities);
  return { redacted, vault: [...vault], verdict: airlockVerdict(leakGate(redacted, vault), { ...ner, entities }, redacted), ner, confirmed };
}

export default function RedactionLab() {
  const [text, setText] = useState(SAMPLE);
  const [log, setLog] = useState("");
  const [out, setOut] = useState<{
    redacted: string;
    vault: [string, string][];
    verdict: AirlockVerdict;
    ner: NerResult & { ms: number };
    confirmed: ExternalEntity[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [bench, setBench] = useState<string[]>([]);
  const [lang, setLang] = useState<DeepLang>("tl");
  const [reviewed, setReviewed] = useState(false);
  const [deep, setDeep] = useState<DeepCheckRun | null>(null);
  const [deepErr, setDeepErr] = useState("");

  async function runDeep() {
    if (!out) return;
    setBusy(true);
    setDeep(null);
    setDeepErr("");
    try {
      const vault = new Map(out.vault);
      setDeep(await deepCheck(out.redacted, vault, checkDocument(out.redacted), lang));
    } catch (e) {
      setDeepErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function benchmark() {
    setBusy(true);
    const rows: string[] = [];
    try {
      await initOnDevice().catch(() => {});
      setLog("Warm-up…");
      await nanoNer("Warm up.", NER_VARIANTS[2].opts).catch(() => {});
      for (const v of NER_VARIANTS) {
        for (const run of [1, 2]) {
          setLog(`Running ${v.id} (run ${run})…`);
          const r = await nanoNer(text, v.opts);
          const found = r.entities.map((e) => e.text).join("; ");
          const verdict = airlockVerdict(leakGate(redact(text, r.entities).redacted, redact(text, r.entities).vault), r, redact(text, r.entities).redacted).kind;
          rows.push(`${v.label} · run ${run}: ${r.ms} ms · ${r.status} · ${r.entities.length} found [${found}] · verdict ${verdict}`);
          setBench([...rows]);
        }
      }
      setLog("Benchmark done: copy the lines below and send them over.");
    } catch (e) {
      setLog(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function go() {
    setBusy(true);
    setOut(null);
    try {
      setLog("Preparing on-device model…");
      await initOnDevice((p) => setLog(`Downloading on-device model: ${(p * 100).toFixed(1)}%`)).catch(() => {});
      setLog("Finding names on-device…");
      const ner = await nanoNer(text);
      setOut(evaluate(text, ner, []));
      setReviewed(false);
      setDeep(null);
      setLog("");
    } catch (e) {
      setLog(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginTop: 40, borderTop: "2px solid #222", paddingTop: 16 }}>
      <h2 style={{ fontSize: 18 }}>Redaction lab (on-device)</h2>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} style={{ width: "100%", fontSize: 14 }} />
      <button disabled={busy} onClick={go}>Redact on this device</button>{" "}
      <button disabled={busy} onClick={benchmark}>Benchmark speed (A–D)</button> <span>{log}</span>
      {bench.length > 0 && <pre style={{ whiteSpace: "pre-wrap", background: "#fff8e1", padding: 12 }}>{bench.join("\n")}</pre>}
      {out && (
        <>
          <p>
            Model layer: <strong>{out.ner.status}</strong> ({out.ner.entities.length} entities, {out.ner.chunks} chunk(s),{" "}
            {out.ner.ms} ms) · Airlock:{" "}
            <strong style={{ color: { safe: "green", needs_review: "darkorange", blocked: "crimson" }[out.verdict.kind] }}>
              {out.verdict.kind === "safe"
                ? "SAFE to send"
                : out.verdict.kind === "blocked"
                  ? "BLOCKED"
                  : out.verdict.reason === "possible_names"
                    ? `REVIEW REQUIRED: possible names left: ${out.verdict.suspects.join(", ")}`
                    : `REVIEW REQUIRED: names were not fully checked by the on-device model${out.verdict.suspects.length ? `; possible names: ${out.verdict.suspects.join(", ")}` : ""}`}
            </strong>
          </p>
          {out.verdict.kind === "needs_review" && out.verdict.suspects.length > 0 && (
            <button
              onClick={() => {
                if (out.verdict.kind !== "needs_review") return;
                const extra = out.verdict.suspects.map((t) => ({ text: t, type: "PERSON" as const }));
                setOut(evaluate(text, out.ner, [...out.confirmed, ...extra]));
                setReviewed(false);
              }}
            >
              Also redact these
            </button>
          )}
          {out.verdict.kind === "blocked" && <pre style={{ color: "crimson" }}>{JSON.stringify(out.verdict.leaks, null, 1)}</pre>}
          <h3 style={{ fontSize: 15 }}>Offline findings (no cloud, no AI)</h3>
          <ul>
            {checkDocument(out.redacted).map((f) => (
              <li key={f.ruleId}>
                {{ red: "🚩", amber: "⚠️", green: "✅" }[f.severity]} <strong>{f.title.tl}</strong>: {f.detail.tl}{" "}
                <em style={{ color: "#666" }}>({f.citations.map((c) => c.title).join("; ")})</em>
              </li>
            ))}
          </ul>
          <h3 style={{ fontSize: 15 }}>Deep check (cloud, redacted text only)</h3>
          {out.verdict.kind === "needs_review" && (
            <label style={{ display: "block" }}>
              <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> I checked "What the cloud would
              see" below and it contains no private details
            </label>
          )}
          <select value={lang} onChange={(e) => setLang(e.target.value as DeepLang)}>
            <option value="tl">Tagalog</option>
            <option value="ceb">Cebuano</option>
            <option value="en">English</option>
          </select>{" "}
          <button
            disabled={busy || out.verdict.kind === "blocked" || (out.verdict.kind === "needs_review" && !reviewed)}
            onClick={runDeep}
          >
            Send redacted text for deep check
          </button>
          {deepErr && <pre style={{ color: "crimson" }}>{deepErr}</pre>}
          {deep && (
            <div style={{ background: "#eef6ff", padding: 12, marginTop: 8 }}>
              <p>
                <strong>{deep.result.summary}</strong> <em>({deep.source}, {deep.ms} ms, {deep.result.dropped} invalid item(s) dropped)</em>
              </p>
              <ul>
                {deep.result.clauses.map((c, i) => (
                  <li key={i}>
                    {{ violates: "🚩", unclear: "⚠️", ok: "✅" }[c.status]} “{c.quote}”: {c.explanation}
                    {c.sourceId && <em style={{ color: "#666" }}> [{c.sourceId}]</em>}
                  </li>
                ))}
              </ul>
              <p>Questions to ask your agency:</p>
              <ol>{deep.result.questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
              <details>
                <summary>Exactly what was sent to the cloud</summary>
                <pre style={{ whiteSpace: "pre-wrap" }}>{deep.sentPrompt}</pre>
              </details>
            </div>
          )}
          <h3 style={{ fontSize: 15 }}>What the cloud would see</h3>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f4f4f4", padding: 12 }}>{out.redacted}</pre>
          <h3 style={{ fontSize: 15 }}>Kept on this device only</h3>
          <ul>
            {out.vault.map(([ph, v]) => (
              <li key={ph}>
                <code>{ph}</code> → {v}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
