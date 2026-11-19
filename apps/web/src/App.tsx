// Hybrid inference lab: a dev-only page proving which tier (device vs cloud) answers.
// Not the product UI. That comes later with a deliberate design pass.
import { useMemo, useState } from "react";
import { getGenerativeModel, InferenceMode } from "firebase/ai";
import { ai } from "./firebase";

type Mode = (typeof InferenceMode)[keyof typeof InferenceMode];

type Run = { mode: Mode; source: string; ms: number; text: string; error?: string };

const ON_DEVICE_OPTS = {
  createOptions: {
    expectedInputs: [{ type: "text" as const, languages: ["en"] }],
    expectedOutputs: [{ type: "text" as const, languages: ["en"] }],
  },
};

export default function App() {
  const [prompt, setPrompt] = useState(
    "Contract clause: 'The employer shall keep the worker's passport for safekeeping.' Is this a red flag for an OFW? Answer in one sentence.",
  );
  const [status, setStatus] = useState("Device model not initialized.");
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);

  const models = useMemo(() => {
    const make = (mode: Mode) =>
      getGenerativeModel(ai, {
        mode,
        onDeviceParams: ON_DEVICE_OPTS,
        inCloudParams: { model: "gemini-3.5-flash-lite" },
      });
    return {
      [InferenceMode.ONLY_ON_DEVICE]: make(InferenceMode.ONLY_ON_DEVICE),
      [InferenceMode.PREFER_ON_DEVICE]: make(InferenceMode.PREFER_ON_DEVICE),
      [InferenceMode.ONLY_IN_CLOUD]: make(InferenceMode.ONLY_IN_CLOUD),
    } as Record<string, ReturnType<typeof make>>;
  }, []);

  async function initDevice() {
    setStatus("Checking on-device model…");
    try {
      const availability =
        "LanguageModel" in self
          ? await (self as unknown as { LanguageModel: { availability: () => Promise<string> } }).LanguageModel.availability()
          : "Prompt API not present (wrong Chrome / flag off)";
      setStatus(`Availability: ${availability}. Initializing…`);
      await models[InferenceMode.ONLY_ON_DEVICE].initializeDeviceModel((p) =>
        setStatus(`Downloading model: ${(p * 100).toFixed(1)}%`),
      );
      setStatus(`Device model ready (was: ${availability}).`);
    } catch (e) {
      setStatus(`Device init failed: ${(e as Error).message}`);
    }
  }

  async function run(mode: Mode) {
    setBusy(true);
    const t0 = performance.now();
    try {
      const res = await models[mode].generateContent(prompt);
      const r = res.response;
      setRuns((rs) => [
        { mode, source: r.inferenceSource ?? "unknown", ms: Math.round(performance.now() - t0), text: r.text() },
        ...rs,
      ]);
    } catch (e) {
      setRuns((rs) => [
        { mode, source: "—", ms: Math.round(performance.now() - t0), text: "", error: (e as Error).message },
        ...rs,
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22 }}>Kontrata · hybrid inference lab</h1>
      <p>{status}</p>
      <button onClick={initDevice}>1. Initialize on-device model</button>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        style={{ display: "block", width: "100%", margin: "16px 0", fontSize: 15 }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button disabled={busy} onClick={() => run(InferenceMode.ONLY_ON_DEVICE)}>Only on-device</button>
        <button disabled={busy} onClick={() => run(InferenceMode.PREFER_ON_DEVICE)}>Prefer on-device</button>
        <button disabled={busy} onClick={() => run(InferenceMode.ONLY_IN_CLOUD)}>Only cloud</button>
      </div>
      {runs.map((r, i) => (
        <section key={i} style={{ borderTop: "1px solid #ccc", marginTop: 16, paddingTop: 8 }}>
          <strong data-testid="source">
            {r.source === "on_device" ? "🔒 ON DEVICE" : r.source === "in_cloud" ? "☁️ IN CLOUD" : r.source}
          </strong>{" "}
          · mode <code>{r.mode}</code> · {r.ms} ms
          {r.error ? <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{r.error}</pre> : <p>{r.text}</p>}
        </section>
      ))}
    </main>
  );
}
