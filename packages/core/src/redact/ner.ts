// Layer B: named-entity recognition by the ON-DEVICE model (Gemini Nano).
// The model never sees anything that leaves the device: this runs before the Airlock.
// Model output is untrusted: every entity must literally occur in the source text.
import type { ExternalEntity, PiiType } from "./types";

export const NER_TYPES = ["PERSON", "ADDRESS", "PHONE", "EMAIL", "ID_NUMBER"] as const satisfies readonly PiiType[];
export type NerType = (typeof NER_TYPES)[number];

/** JSON shape we ask the model for. Mirrored as a Firebase `Schema` in the web adapter. */
export interface NerResponse {
  entities: { text: string; type: NerType }[];
}

/** On-device context is small (~9k tokens incl. output). ~2,500 chars ≈ well under 1k tokens of input. */
export const NER_CHUNK_CHARS = 2500;

export function buildNerPrompt(chunk: string): string {
  return [
    "You find personal information in an overseas employment contract or a recruiter message.",
    "List every piece of text that identifies a specific private person:",
    "- PERSON: names of people (workers, employers, sponsors, relatives, witnesses), including Arabic and Filipino names.",
    "- ADDRESS: home or street addresses of people.",
    "- PHONE, EMAIL, ID_NUMBER: phone numbers, emails, passport/ID/account numbers.",
    "Do NOT list: company or agency names, countries, cities on their own, job titles, salaries, dates of the contract, or law names.",
    "Copy each item EXACTLY as written in the text. If there is nothing, return an empty list.",
    "",
    "TEXT:",
    '"""',
    chunk,
    '"""',
  ].join("\n");
}

/** Split on paragraph/line boundaries so names are not cut in half. */
export function chunkText(text: string, max = NER_CHUNK_CHARS): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  let cur = "";
  for (const line of text.split(/(?<=\n)/)) {
    if (cur.length + line.length > max && cur) {
      chunks.push(cur);
      cur = "";
    }
    // A single enormous line: hard-split on spaces.
    if (line.length > max) {
      for (const piece of line.match(new RegExp(`[\\s\\S]{1,${max}}(?=\\s|$)|[\\s\\S]{1,${max}}`, "g")) ?? [])
        chunks.push(piece);
      continue;
    }
    cur += line;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/**
 * Parse + validate model output. Drops anything malformed, of an unknown type, or not
 * literally present in the source (hallucinations). Never throws on bad model output.
 */
export function parseNerResponse(raw: string, source: string): ExternalEntity[] {
  let data: unknown;
  try {
    data = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return [];
  }
  const list = (data as Partial<NerResponse>)?.entities;
  if (!Array.isArray(list)) return [];
  const lower = source.toLowerCase();
  const out: ExternalEntity[] = [];
  const seen = new Set<string>();
  for (const e of list) {
    if (!e || typeof e.text !== "string" || !NER_TYPES.includes(e.type as NerType)) continue;
    const text = e.text.trim();
    if (text.length < 2 || text.length > 120) continue;
    if (!lower.includes(text.toLowerCase())) continue; // not in the document → hallucinated
    const key = `${e.type}:${text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text, type: e.type as PiiType });
  }
  return out;
}

export type NerStatus = "ok" | "unavailable" | "partial";

export interface NerResult {
  entities: ExternalEntity[];
  status: NerStatus;
  chunks: number;
  failedChunks: number;
}

/**
 * Run NER over the whole text with an injected on-device model call.
 * `callModel` must return the raw JSON string, or throw if the on-device model is unavailable.
 */
export async function runNer(text: string, callModel: (prompt: string) => Promise<string>): Promise<NerResult> {
  const chunks = chunkText(text);
  const entities: ExternalEntity[] = [];
  let failed = 0;
  for (const chunk of chunks) {
    try {
      entities.push(...parseNerResponse(await callModel(buildNerPrompt(chunk)), chunk));
    } catch {
      failed++;
    }
  }
  return {
    entities,
    chunks: chunks.length,
    failedChunks: failed,
    status: failed === 0 ? "ok" : failed === chunks.length ? "unavailable" : "partial",
  };
}
