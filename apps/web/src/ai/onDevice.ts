// On-device-only model calls. These handle raw, un-redacted text, so they use ONLY_ON_DEVICE:
// if Gemini Nano is unavailable the call throws. It never silently falls back to the cloud.
import { getGenerativeModel, InferenceMode, Schema } from "firebase/ai";
import { NER_TYPES, runNer, type NerResult } from "@kontrata/core";
import { ai } from "../firebase";

const nerSchema = Schema.object({
  properties: {
    entities: Schema.array({
      items: Schema.object({
        properties: {
          text: Schema.string(),
          type: Schema.enumString({ enum: [...NER_TYPES] }),
        },
      }),
    }),
  },
});

export const nanoNerModel = getGenerativeModel(ai, {
  mode: InferenceMode.ONLY_ON_DEVICE,
  onDeviceParams: {
    createOptions: {
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    },
    promptOptions: { responseConstraint: nerSchema },
  },
});

/** Must be called from a user gesture (click) before the first on-device call. */
export function initOnDevice(onProgress?: (p: number) => void) {
  return nanoNerModel.initializeDeviceModel(onProgress);
}

export async function nanoNer(text: string): Promise<NerResult & { ms: number }> {
  const t0 = performance.now();
  const result = await runNer(text, async (prompt) => {
    const res = await nanoNerModel.generateContent(prompt);
    if (res.response.inferenceSource !== "on_device") throw new Error("Refusing non-device inference for raw text");
    return res.response.text();
  });
  return { ...result, ms: Math.round(performance.now() - t0) };
}
