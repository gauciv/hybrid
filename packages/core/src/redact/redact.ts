// The Airlock: redact → (cloud) → rehydrate, with a fail-closed leak gate in between.
import { detectAll, detectLabeled, detectPatterns } from "./detectors";
import type { ExternalEntity, GateResult, PiiType, RedactionResult, Span, Vault } from "./types";

// [[PERSON_1]] = a full value. [[PERSON_1.2]] = part of the same person's name (e.g. surname alone).
export const PLACEHOLDER_RE = /\[\[([A-Z_]+)_(\d+(?:\.\d+)?)\]\]/g;

// Name tokens that must not be propagated on their own (titles, particles, generic words).
const NAME_STOP = new Set([
  "mr", "mrs", "ms", "miss", "sir", "madam", "madame", "dr", "atty", "engr", "al", "el", "bin", "bint", "binti",
  "ibn", "abu", "umm", "de", "del", "dela", "delos", "los", "san", "santa", "sta", "sto", "jr", "sr", "ii", "iii",
  "the", "and", "employer", "worker", "employee", "sponsor", "name", "household", "service", "agency", "company",
]);

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word occurrence finder. Unicode-aware (Arabic, ñ, etc.). */
function findAll(text: string, needle: string, caseSensitive = false): [number, number][] {
  if (!needle.trim()) return [];
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(needle)}(?![\\p{L}\\p{N}])`, caseSensitive ? "gu" : "giu");
  return [...text.matchAll(re)].map((m) => [m.index!, m.index! + m[0].length]);
}

const isNameWord = (t: string) => t.length >= 3 && /^\p{Lu}/u.test(t) && !NAME_STOP.has(t.toLowerCase());

/** Single name tokens worth hunting for elsewhere ("Santos" from "Maria Santos"). */
export function nameTokens(name: string): string[] {
  return name
    .split(/[\s,./()]+/)
    .map((t) => t.replace(/^['’-]+|['’-]+$/g, ""))
    .filter(isNameWord);
}

/**
 * Every partial form of a name that could appear on its own, longest first:
 * "Josefina Dela Cruz" → ["Josefina Dela", "Dela Cruz", "Josefina", "Cruz"].
 * Multi-word parts must contain a real name word (so "Dela" alone is never hunted).
 */
export function nameVariants(name: string): string[] {
  const words = name.split(/\s+/).map((w) => w.replace(/[,()]+$/g, "")).filter(Boolean);
  const out = new Set<string>();
  for (let len = words.length - 1; len >= 1; len--) {
    for (let i = 0; i + len <= words.length; i++) {
      const part = words.slice(i, i + len);
      const phrase = part.join(" ").replace(/\.$/, "");
      if (len === 1 ? isNameWord(phrase) : part.some((w) => isNameWord(w.replace(/\.$/, "")))) out.add(phrase);
    }
  }
  return [...out].sort((a, b) => b.length - a.length);
}

/** Merge overlapping spans; the longer span wins the type. */
function mergeSpans(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Span[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) {
      if (s.end - s.start > last.end - last.start) last.type = s.type;
      last.end = Math.max(last.end, s.end);
    } else out.push({ ...s });
  }
  return out;
}

/**
 * Redact PII from `text`.
 * @param entities extra entities from the on-device model (Gemini Nano NER). Optional: regex/labels alone still run.
 */
export function redact(text: string, entities: ExternalEntity[] = []): RedactionResult {
  let spans: Span[] = detectAll(text);

  for (const e of entities) {
    for (const [s, en] of findAll(text, e.text.trim())) spans.push({ start: s, end: en, type: e.type, source: "model" });
  }

  // Propagate: once something is known PII, redact every occurrence, including partial names
  // ("Ms. Dela Cruz", "Josefina") later in the document.
  const known = new Map<string, PiiType>();
  for (const s of spans) known.set(text.slice(s.start, s.end), s.type);
  for (const [value, type] of known) {
    for (const [s, e] of findAll(text, value)) spans.push({ start: s, end: e, type, source: "vault" });
    if (type === "PERSON")
      for (const v of nameVariants(value))
        for (const [s, e] of findAll(text, v, true)) spans.push({ start: s, end: e, type, source: "vault" });
  }

  // Never redact inside existing placeholders.
  const existing = [...text.matchAll(PLACEHOLDER_RE)].map((m) => [m.index!, m.index! + m[0].length]);
  spans = spans.filter((s) => !existing.some(([a, b]) => s.start < b && s.end > a));

  const merged = mergeSpans(spans);

  // Assign placeholders. Same text → same placeholder. Partial names → linked sub-placeholder [[PERSON_n.k]].
  const vault: Vault = new Map();
  const byKey = new Map<string, string>();
  const counters = new Map<string, number>();
  const next = (key: string) => {
    const n = (counters.get(key) ?? 0) + 1;
    counters.set(key, n);
    return n;
  };
  const placeholderFor = (type: PiiType, value: string): string => {
    const key = `${type}:${norm(value)}`;
    const hit = byKey.get(key);
    if (hit) return hit;
    let ph: string | undefined;
    if (type === "PERSON") {
      for (const [p, original] of vault) {
        if (/^\[\[PERSON_\d+\]\]$/.test(p) && nameVariants(original).some((v) => norm(v) === norm(value))) {
          const parent = p.slice(2, -2); // PERSON_n
          ph = `[[${parent}.${next(parent)}]]`;
          break;
        }
      }
    }
    ph ??= `[[${type}_${next(type)}]]`;
    byKey.set(key, ph);
    vault.set(ph, value);
    return ph;
  };

  // Longest values first so full names exist before their parts.
  const phOf = new Map<Span, string>();
  for (const s of [...merged].sort((a, b) => b.end - b.start - (a.end - a.start)))
    phOf.set(s, placeholderFor(s.type, text.slice(s.start, s.end)));

  let out = "";
  let cursor = 0;
  for (const s of merged) {
    out += text.slice(cursor, s.start) + phOf.get(s);
    cursor = s.end;
  }
  out += text.slice(cursor);

  return { redacted: out, vault, spans: merged };
}

/** Put the real values back. Runs on the device only. */
export function rehydrate(text: string, vault: Vault): string {
  return text.replace(PLACEHOLDER_RE, (ph) => vault.get(ph) ?? ph);
}

/**
 * Fail-closed check before anything leaves the device.
 * Re-runs every deterministic detector on the outbound payload and checks that no vaulted value
 * (or any part of a vaulted name) survived. Any hit → do NOT send.
 */
export function leakGate(outbound: string, vault: Vault): GateResult {
  const leaks: GateResult["leaks"] = [];
  const stripped = outbound.replace(PLACEHOLDER_RE, " ");

  for (const s of detectPatterns(stripped)) leaks.push({ type: s.type, text: stripped.slice(s.start, s.end) });
  // Labels are checked with placeholders intact, so "Passport No.: [[PASSPORT_1]], issued Manila" is not a leak.
  for (const s of detectLabeled(outbound)) leaks.push({ type: s.type, text: outbound.slice(s.start, s.end) });

  for (const [ph, value] of vault) {
    if (findAll(stripped, value).length) leaks.push({ type: "VAULT_VALUE", text: value });
    if (ph.startsWith("[[PERSON_"))
      for (const v of nameVariants(value))
        if (findAll(stripped, v, true).length) leaks.push({ type: "VAULT_VALUE", text: v });
  }
  return { ok: leaks.length === 0, leaks };
}
