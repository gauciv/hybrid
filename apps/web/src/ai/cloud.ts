// Cloud-only calls. They only ever receive REDACTED text that passed the Airlock (leak gate + verdict).
// ONLY_IN_CLOUD: Gemini Nano cannot write Tagalog/Cebuano, and the input is already anonymous.
import { getGenerativeModel, InferenceMode, type GenerativeModel } from "firebase/ai";
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
import { cloudModelName, configReady } from "../config";
import { fingerprint, session } from "../cache";

const models = new Map<string, GenerativeModel>();
const deepModel = (name: string) => {
  let m = models.get(name);
  if (!m) {
    m = makeModel(name);
    models.set(name, m);
  }
  return m;
};

const makeModel = (name: string) => getGenerativeModel(ai, {
  mode: InferenceMode.ONLY_IN_CLOUD,
  inCloudParams: {
    model: name,
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
  cached: boolean;
}

export async function deepCheck(redacted: string, vault: Vault, findings: Finding[], lang: DeepLang): Promise<DeepCheckRun> {
  const prompt = buildDeepCheckPrompt(redacted, findings, lang);
  // Last line of defence: re-check the ENTIRE outbound prompt, not just the contract part.
  const gate = leakGate(prompt, vault);
  if (!gate.ok) throw new Error(`Blocked by the Airlock: ${gate.leaks.map((l) => l.type).join(", ")}`);
  const t0 = performance.now();
  await configReady; // model name may come from Remote Config
  const model = cloudModelName();
  // The response only contains placeholders, never real data, so it may be cached for this tab session.
  const key = `k-deep:${await fingerprint(`${model}\n${prompt}`)}`;
  const cachedRaw = session.get(key);
  if (cachedRaw) {
    try {
      return { result: parseDeepCheck(cachedRaw, redacted, vault), sentPrompt: prompt, ms: 0, source: "in_cloud", cached: true };
    } catch {
      /* corrupt entry: fetch again */
    }
  }
  const res = await deepModel(model).generateContent(prompt);
  const raw = res.response.text();
  const result = parseDeepCheck(raw, redacted, vault); // throws on unusable output → not cached
  session.set(key, raw);
  return { result, sentPrompt: prompt, ms: Math.round(performance.now() - t0), source: res.response.inferenceSource ?? "unknown", cached: false };
}
