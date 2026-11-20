// JSON-in / JSON-out bridge so non-JS platforms (the Android app, via Jetpack JavaScriptSandbox) run the exact same
// tested engine as the web app. Bundled as an IIFE exposing globalThis.KontrataCore. Every call returns a JSON string;
// errors come back as {"error": "..."} instead of throwing across the boundary.
import {
  airlockVerdict,
  buildDeepCheckPrompt,
  buildNerPrompt,
  checkDocument,
  chunkText,
  DEFAULT_RULES_CONFIG,
  guessKind,
  leakGate,
  parseDeepCheck,
  parseNerLines,
  parseNerResponse,
  redact,
  rehydrate,
  selectNerLines,
  type DeepLang,
  type ExternalEntity,
  type Finding,
  type NerOptions,
  type NerStatus,
  T,
  type UiLang,
} from "./index";

const vaultOf = (pairs: [string, string][]) => new Map(pairs);
const wrap = (f: () => unknown) => {
  try {
    return JSON.stringify(f());
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : String(e) });
  }
};

/** Production NER setting (benchmarked on the web: line output, people only, filtered lines). */
const NER_OPTS: NerOptions = { format: "lines", focus: "people", filterLines: true };

export const KontrataCore = {
  /** Prompts for the on-device model: [{chunk, prompt}]. Empty list = nothing name-like to check. */
  nerPrompts: (text: string) =>
    wrap(() => {
      const input = selectNerLines(text);
      if (!input.trim()) return [];
      return chunkText(input).map((chunk) => ({ chunk, prompt: buildNerPrompt(chunk, NER_OPTS) }));
    }),

  parseNer: (raw: string, chunk: string) => wrap(() => (NER_OPTS.format === "lines" ? parseNerLines(raw, chunk) : parseNerResponse(raw, chunk))),

  /** Redact + verdict + offline findings. `config` = partial RulesConfig from Remote Config. */
  analyse: (text: string, entitiesJson: string, nerStatus: NerStatus, configJson: string) =>
    wrap(() => {
      const entities = JSON.parse(entitiesJson) as ExternalEntity[];
      const { redacted, vault, spans } = redact(text, entities);
      const kind = guessKind(text);
      const cfg = { ...DEFAULT_RULES_CONFIG, ...(JSON.parse(configJson || "{}") as object) };
      return {
        redacted,
        vault: [...vault],
        spans: spans.length,
        kind,
        verdict: airlockVerdict(leakGate(redacted, vault), { status: nerStatus, entities }, redacted),
        findings: checkDocument(redacted, kind, cfg),
      };
    }),

  deepPrompt: (redacted: string, findingsJson: string, lang: DeepLang) =>
    wrap(() => buildDeepCheckPrompt(redacted, JSON.parse(findingsJson) as Finding[], lang)),

  gate: (payload: string, vaultJson: string) => wrap(() => leakGate(payload, vaultOf(JSON.parse(vaultJson)))),

  parseDeep: (raw: string, redacted: string, vaultJson: string) => wrap(() => parseDeepCheck(raw, redacted, vaultOf(JSON.parse(vaultJson)))),

  rehydrate: (text: string, vaultJson: string) => wrap(() => rehydrate(text, vaultOf(JSON.parse(vaultJson)))),

  /**
   * The interface copy for one language, flattened to "a.b.c" → string. Functions become templates:
   * `{n}`/`{s}` placeholders, plus a ".one" variant for the singular form.
   */
  strings: (lang: UiLang) =>
    wrap(() => {
      const out: Record<string, string> = {};
      const walk = (node: unknown, path: string) => {
        if (node && typeof node === "object" && lang in (node as object)) {
          const v = (node as Record<string, unknown>)[lang];
          if (typeof v === "string") out[path] = v;
          else if (typeof v === "function") {
            const f = v as (x: number | string) => string;
            out[path] = f(987654).replace("987654", "{n}").replace("987654", "{n}");
            out[`${path}.one`] = f(1);
            out[`${path}.s`] = f("{s}");
          }
          return;
        }
        if (node && typeof node === "object") for (const [k, child] of Object.entries(node)) walk(child, path ? `${path}.${k}` : k);
      };
      walk(T, "");
      return out;
    }),
};

(globalThis as unknown as { KontrataCore: typeof KontrataCore }).KontrataCore = KontrataCore;
