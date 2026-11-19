// On-device-only model calls. These handle raw, un-redacted text, so they use ONLY_ON_DEVICE:
// if Gemini Nano is unavailable the call throws. It never silently falls back to the cloud.
import { getGenerativeModel, InferenceMode, Schema, type GenerativeModel } from "firebase/ai";
import { NER_TYPES, runNer, type NerOptions, type NerResult } from "@kontrata/core";
import { ai } from "../firebase";

const TEXT_EN = {
  expectedInputs: [{ type: "text" as const, languages: ["en"] }],
  expectedOutputs: [{ type: "text" as const, languages: ["en"] }],
};

function nerSchema(types: readonly string[]) {
  return Schema.object({
    properties: {
      entities: Schema.array({
        items: Schema.object({ properties: { text: Schema.string(), type: Schema.enumString({ enum: [...types] }) } }),
      }),
    },
  });
}

const cache = new Map<string, GenerativeModel>();
function modelFor(opts: NerOptions): GenerativeModel {
  const key = `${opts.format ?? "json"}:${opts.focus ?? "all"}`;
  let m = cache.get(key);
  if (!m) {
    const types = opts.focus === "people" ? ["PERSON", "ADDRESS"] : NER_TYPES;
    m = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: {
        createOptions: TEXT_EN,
        ...(opts.format === "lines" ? {} : { promptOptions: { responseConstraint: nerSchema(types) } }),
      },
    });
    cache.set(key, m);
  }
  return m;
}

/** Must be called from a user gesture (click) before the first on-device call. */
export function initOnDevice(onProgress?: (p: number) => void) {
  return modelFor({}).initializeDeviceModel(onProgress);
}

export async function nanoNer(text: string, opts: NerOptions = {}): Promise<NerResult & { ms: number }> {
  const model = modelFor(opts);
  const t0 = performance.now();
  const result = await runNer(
    text,
    async (prompt) => {
      const res = await model.generateContent(prompt);
      if (res.response.inferenceSource !== "on_device") throw new Error("Refusing non-device inference for raw text");
      return res.response.text();
    },
    opts,
  );
  return { ...result, ms: Math.round(performance.now() - t0) };
}

export const NER_VARIANTS: { id: string; label: string; opts: NerOptions }[] = [
  { id: "A", label: "A · baseline (JSON, all types, full text)", opts: {} },
  { id: "B", label: "B · JSON, people only, filtered lines", opts: { focus: "people", filterLines: true } },
  { id: "C", label: "C · lines, people only, filtered lines", opts: { format: "lines", focus: "people", filterLines: true } },
  { id: "D", label: "D · lines, people only, full text", opts: { format: "lines", focus: "people" } },
];
