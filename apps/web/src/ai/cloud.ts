// Cloud-only calls. They only ever receive REDACTED text that passed the Airlock (leak gate + verdict).
// ONLY_IN_CLOUD: Gemini Nano cannot write Tagalog/Cebuano, and the input is already anonymous.
import { getGenerativeModel, InferenceMode } from "firebase/ai";
import {
  buildDeepCheckPrompt,
  DEEP_CHECK_SCHEMA,
  leakGate,
  parseDeepCheck,
  type DeepCheckResult,
  type DeepLang,
  type Finding,
  type Vault,
} from "@kontrata/core";
import { ai } from "../firebase";

const deepModel = getGenerativeModel(ai, {
  mode: InferenceMode.ONLY_IN_CLOUD,
  inCloudParams: {
    model: "gemini-3.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      // Plain JSON schema object; the SDK forwards it as responseSchema.
      responseSchema: DEEP_CHECK_SCHEMA as unknown as never,
      temperature: 0.2,
    },
  },
});

export interface DeepCheckRun {
  result: DeepCheckResult;
  sentPrompt: string; // exactly what left the device, shown in the Airlock panel
  ms: number;
  source: string;
}

export async function deepCheck(redacted: string, vault: Vault, findings: Finding[], lang: DeepLang): Promise<DeepCheckRun> {
  const prompt = buildDeepCheckPrompt(redacted, findings, lang);
  // Last line of defence: re-check the ENTIRE outbound prompt, not just the contract part.
  const gate = leakGate(prompt, vault);
  if (!gate.ok) throw new Error(`Blocked by the Airlock: ${gate.leaks.map((l) => l.type).join(", ")}`);
  const t0 = performance.now();
  const res = await deepModel.generateContent(prompt);
  return {
    result: parseDeepCheck(res.response.text(), redacted, vault),
    sentPrompt: prompt,
    ms: Math.round(performance.now() - t0),
    source: res.response.inferenceSource ?? "unknown",
  };
}
