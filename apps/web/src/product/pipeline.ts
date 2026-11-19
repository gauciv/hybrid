// Orchestrates the Airlock for the product UI. Raw text never leaves this module except through deepCheck(),
// which only accepts redacted text that passed the verdict.
import {
  airlockVerdict,
  checkDocument,
  guessKind,
  leakGate,
  redact,
  type AirlockVerdict,
  type DocKind,
  type ExternalEntity,
  type Finding,
  type NerResult,
  type Vault,
} from "@kontrata/core";
import { initOnDevice, nanoNer } from "../ai/onDevice";
import { rulesConfig } from "../config";
import { fingerprint, MemoryCache } from "../cache";

// Same text → same on-device result; skip re-running Gemini Nano. Memory only (contains real names).
const nerCache = new MemoryCache<NerResult & { ms: number }>();

export interface Analysis {
  text: string;
  kind: DocKind;
  ner: NerResult & { ms: number };
  confirmed: ExternalEntity[];
  redacted: string;
  vault: Vault;
  verdict: AirlockVerdict;
  findings: Finding[];
}

const UNAVAILABLE = (ms = 0): NerResult & { ms: number } => ({ entities: [], chunks: 0, failedChunks: 0, status: "unavailable", ms });

async function onDeviceAvailability(): Promise<string> {
  const lm = (self as unknown as { LanguageModel?: { availability: (o?: unknown) => Promise<string> } }).LanguageModel;
  if (!lm) return "absent";
  try {
    return await lm.availability({ expectedInputs: [{ type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: ["en"] }] });
  } catch {
    return "absent";
  }
}

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

/** Must be started from a click (Chrome requires a user gesture to prepare the on-device model). */
export async function findPeopleOnDevice(text: string): Promise<NerResult & { ms: number }> {
  const key = await fingerprint(text);
  const hit = nerCache.get(key);
  if (hit) return hit;
  const result = await detectPeople(text);
  if (result.status === "ok") nerCache.set(key, result); // never cache a failure
  return result;
}

async function detectPeople(text: string): Promise<NerResult & { ms: number }> {
  const availability = await onDeviceAvailability();
  if (availability !== "available") {
    // Start a download in the background for next time; don't make the worker wait for it now.
    if (availability === "downloadable" || availability === "downloading") initOnDevice().catch(() => {});
    return UNAVAILABLE();
  }
  try {
    await initOnDevice();
    return await withTimeout(nanoNer(text), 30_000);
  } catch {
    return UNAVAILABLE();
  }
}

export function evaluate(text: string, ner: NerResult & { ms: number }, confirmed: ExternalEntity[]): Analysis {
  const entities = [...ner.entities, ...confirmed];
  const { redacted, vault } = redact(text, entities);
  const kind = guessKind(text);
  return {
    text,
    kind,
    ner,
    confirmed,
    redacted,
    vault,
    verdict: airlockVerdict(leakGate(redacted, vault), { ...ner, entities }, redacted),
    // Rules run on the REDACTED text: identical results (tested), and nothing private is needed.
    findings: checkDocument(redacted, kind, rulesConfig()),
  };
}

// A suspect that comes shortly after an address word ("Street 12, Al Wakra, Doha") is a place, not a person.
// Only affects the label shown to the user; either way it is covered.
const ADDRESS_WORD = /\b(?:street|st\.|road|avenue|ave\.|villa|block|blk|building|district|brgy|barangay|city|village)\b/i;
function suspectType(text: string, suspect: string): "PERSON" | "ADDRESS" {
  const at = text.indexOf(suspect);
  if (at < 0) return "PERSON";
  const before = text.slice(Math.max(0, at - 40), at);
  return ADDRESS_WORD.test(before) ? "ADDRESS" : "PERSON";
}

export function coverSuspects(a: Analysis): Analysis {
  if (a.verdict.kind !== "needs_review") return a;
  const extra = a.verdict.suspects.map((t) => ({ text: t, type: suspectType(a.text, t) }));
  return evaluate(a.text, a.ner, [...a.confirmed, ...extra]);
}
