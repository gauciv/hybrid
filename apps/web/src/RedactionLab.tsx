// Dev-only panel: run the on-device redaction pipeline on a sample contract and inspect the result.
import { useState } from "react";
import { airlockVerdict, leakGate, redact, type AirlockVerdict, type NerResult } from "@kontrata/core";
import { initOnDevice, nanoNer } from "./ai/onDevice";

// Fictional sample. Names deliberately appear OUTSIDE labeled fields so only the model can catch them.
const SAMPLE = `EMPLOYMENT CONTRACT
This agreement is made between Mr. Hamad Al-Kuwari of Street 12, Al Wakra, Doha (the Employer)
and Liza Mendoza, a Filipino household service worker (the Worker).
Passport No.: P4829173B   Mobile No.: +63 917 555 0142

1. The Employer shall pay the Worker a monthly salary of QAR 1,200 for 24 months.
2. Hamad shall keep the Worker's passport for safekeeping during employment.
3. Liza shall work 14 hours per day with one rest day per month.
4. The agency, Golden Hands Manpower Services Inc., charged a placement fee of PHP 45,000.`;

export default function RedactionLab() {
  const [text, setText] = useState(SAMPLE);
  const [log, setLog] = useState("");
  const [out, setOut] = useState<{ redacted: string; vault: [string, string][]; verdict: AirlockVerdict; ner: NerResult & { ms: number } } | null>(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    setOut(null);
    try {
      setLog("Preparing on-device model…");
      await initOnDevice((p) => setLog(`Downloading on-device model: ${(p * 100).toFixed(1)}%`)).catch(() => {});
      setLog("Finding names on-device…");
      const ner = await nanoNer(text);
      const { redacted, vault } = redact(text, ner.entities);
      setOut({ redacted, vault: [...vault], verdict: airlockVerdict(leakGate(redacted, vault), ner.status, redacted), ner });
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
      <button disabled={busy} onClick={go}>Redact on this device</button> <span>{log}</span>
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
                    : "REVIEW REQUIRED: names were not fully checked by the on-device model"}
            </strong>
          </p>
          {out.verdict.kind === "blocked" && <pre style={{ color: "crimson" }}>{JSON.stringify(out.verdict.leaks, null, 1)}</pre>}
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
