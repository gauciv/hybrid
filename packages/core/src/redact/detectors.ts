// Layer A: deterministic PII detectors. Fast, offline, explainable.
// Tuned for OFW documents: PH IDs and phones, Gulf/Asia phone formats, form-style contracts.
// Bias: over-redact identifiers, but never touch the facts needed for analysis
// (salary amounts, currencies, durations, countries, clause text).
import type { PiiType, Span } from "./types";

interface PatternDetector {
  type: PiiType;
  re: RegExp; // must be global
  /** Optional post-filter on the matched text. */
  accept?: (m: string) => boolean;
  /** Capture group holding the PII (default: whole match). */
  group?: number;
}

const digits = (s: string) => s.replace(/\D/g, "").length;

// Money like "1,500" / "1,500,000.00" (comma-grouped) is never an ID.
const looksLikeMoney = (s: string) => /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s.trim());

export const PATTERNS: PatternDetector[] = [
  { type: "EMAIL", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },

  // PH mobile: +63 917 123 4567 / 0917-123-4567 / 09171234567
  { type: "PHONE", re: /(?:\+?63[\s-]?|\b0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g },
  // PH landline: (02) 8123-4567
  { type: "PHONE", re: /\(0\d{1,2}\)\s?\d{3,4}[\s-]?\d{4}\b/g },
  // International with +country code: +966 55 123 4567, +971-50-123-4567, +852 9123 4567
  {
    type: "PHONE",
    re: /\+\d{1,3}[\s.-]?\(?\d[\d\s().-]{6,16}\d/g,
    accept: (m) => digits(m) >= 8 && digits(m) <= 15,
  },

  // PH passport: P1234567A (new), EB1234567 / XX1234567 (old)
  { type: "PASSPORT", re: /\b[A-Z]{1,2}\d{7}[A-Z]?\b/g },

  // PH government IDs
  { type: "GOV_ID", re: /\b\d{2}-\d{7}-\d\b/g }, // SSS
  { type: "GOV_ID", re: /\b\d{2}-\d{9}-\d\b/g }, // PhilHealth
  { type: "GOV_ID", re: /\b\d{3}-\d{3}-\d{3}(?:-\d{3,5})?\b/g }, // TIN
  { type: "GOV_ID", re: /\b\d{4}-\d{7}-\d\b/g }, // UMID CRN
  { type: "GOV_ID", re: /\b\d{4}-\d{4}-\d{4}\b/g }, // Pag-IBIG MID

  // IBAN (Gulf banks use these heavily)
  { type: "BANK", re: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/g },

  // Any other long number (≥9 digits): account nos., Iqama, civil IDs, OEC… Not money.
  {
    type: "ID_NUMBER",
    re: /\b\d[\d\s-]{7,}\d\b/g,
    accept: (m) => digits(m) >= 9 && !looksLikeMoney(m),
  },
];

// Form-style labels ("Name of Worker: Maria Santos"). Standard contracts are forms,
// so labels are the most reliable signal for names and addresses.
const LABELS: { type: PiiType; labels: string[] }[] = [
  {
    type: "PERSON",
    labels: [
      "name of worker", "worker's name", "workers name", "name of employee", "employee's name", "employee name",
      "name of employer", "employer's name", "employers name", "employer name", "full name", "printed name",
      "signature over printed name", "beneficiary", "next of kin", "contact person", "recruiter", "pangalan",
      "name of sponsor", "sponsor's name", "sponsor name", "kafeel",
    ],
  },
  {
    type: "ADDRESS",
    labels: [
      "address", "home address", "permanent address", "present address", "employer's address", "worker's address",
      "residence", "tirahan", "place of birth",
    ],
  },
  { type: "DOB", labels: ["date of birth", "birthdate", "birth date", "birthday", "kaarawan", "dob"] },
  {
    type: "GOV_ID",
    labels: [
      "iqama no", "iqama number", "civil id", "civil id no", "emirates id", "national id", "id no", "id number",
      "sss no", "tin", "philhealth no", "pag-ibig no", "oec no", "visa no", "visa number",
    ],
  },
  { type: "PASSPORT", labels: ["passport no", "passport number", "passport #", "passport"] },
  { type: "PHONE", labels: ["contact no", "contact number", "tel no", "tel", "telephone", "mobile no", "mobile", "phone"] },
  { type: "EMAIL", labels: ["email", "e-mail", "email address"] },
  { type: "BANK", labels: ["account no", "account number", "bank account", "iban"] },
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Longest labels first so "employer's address" wins over "address".
const LABEL_RE = (() => {
  const all = LABELS.flatMap(({ type, labels }) => labels.map((l) => ({ type, l })));
  all.sort((a, b) => b.l.length - a.l.length);
  const alt = all.map(({ l }) => escapeRe(l).replace(/'/g, "['’]?").replace(/\\\./g, "\\.?")).join("|");
  // Optional "No." after label, then ":" or "-", then the value up to line end / ; / |
  // Bare "name:" is handled separately so "Company Name:" / "Agency Name:" stay intact.
  return {
    re: new RegExp(`(?<![A-Za-z])(${alt})\\.?(?:\\s*(?:no\\.?|#))?\\s*[:：][ \\t]*([^\\n;|]{1,120})`, "gi"),
    typeOf: (label: string) => {
      const norm = label.toLowerCase().replace(/[’]/g, "'");
      return (
        all.find(({ l }) => l === norm)?.type ??
        all.find(({ l }) => norm.replace(/'/g, "") === l.replace(/'/g, ""))?.type ??
        "PERSON"
      );
    },
  };
})();

// Bare "Name:" but not "Company Name:", "Agency Name:", "Name of Agency:", "Business Name:" etc.
const BARE_NAME_RE = /(?<!(?:company|agency|business|establishment|bank|hospital|school|vessel|trade|brand|file|user)\s)(?<![A-Za-z])name\s*[:：][ \t]*([^\n;|]{1,120})/gi;

const ID_TYPES = new Set<PiiType>(["PASSPORT", "GOV_ID", "BANK", "PHONE", "EMAIL", "ID_NUMBER"]);

/** Clean a captured form value: drop blanks like "______", trailing punctuation, and trailing context. */
function cleanValue(raw: string, type: PiiType): { offset: number; text: string } | null {
  // 1. Skip what is *not* the value: whitespace, separators, parentheticals like "(Ms.)", and
  //    placeholders of already-redacted values. Never treat the field as empty just because of
  //    how it starts; we keep looking at whatever real text follows.
  const lead = raw.match(/^(?:[\s,.;:]+|\([^()\n]{0,40}\)|\[\[[A-Z_]+_[\d.]+\]\])*/)![0];
  let v = raw.slice(lead.length);
  // 2. The remainder is another field ("Age: 29"), not this field's value.
  if (/^[A-Z][A-Za-z'’]*(?: [A-Za-z'’]+){0,3}\.?\s*[:：]/.test(v)) return null;
  // 3. Cut at the next "Label:" on the same line (e.g. "Name: Maria Santos   Age: 34").
  const nextLabel = v.search(/\s{2,}[A-Z][A-Za-z' ]{1,30}\s*[:：]|\t/);
  if (nextLabel > 0) v = v.slice(0, nextLabel);
  // 4. Identifiers are a single token: "EB7654321, issued Manila" → "EB7654321".
  //    Names stop before a parenthetical or a non-name continuation: "Pedro Santos (husband), +63…".
  const cut =
    ID_TYPES.has(type) ? v.search(/,\s|\.\s|\s\(|\s{2,}/) :
    type === "PERSON" ? v.search(/\s*\(|,\s*(?=[^A-Z\s])|\s{2,}/) : -1;
  if (cut > 0) v = v.slice(0, cut);
  v = v.trimEnd().replace(/[\s_.,]+$/, "");
  if (!v || /^[_\-.\s]+$/.test(v)) return null;
  // 5. Shape check: the value must look like the field's type. This rejects trailing context
  //    ("issued Manila" is not a passport number) without ever skipping real values.
  if (!looksLike(type, v)) return null;
  return { offset: lead.length, text: v };
}

function looksLike(type: PiiType, v: string): boolean {
  switch (type) {
    case "EMAIL":
      return v.includes("@");
    case "PASSPORT":
    case "GOV_ID":
    case "BANK":
    case "PHONE":
    case "ID_NUMBER":
      return /\d/.test(v);
    case "PERSON":
      return /^\p{L}/u.test(v);
    default: // ADDRESS, DOB: any real text
      return /[\p{L}\p{N}]/u.test(v);
  }
}

export function detectPatterns(text: string): Span[] {
  const spans: Span[] = [];
  for (const d of PATTERNS) {
    d.re.lastIndex = 0;
    for (const m of text.matchAll(d.re)) {
      const t = m[d.group ?? 0];
      if (!t || (d.accept && !d.accept(t))) continue;
      const start = m.index! + (d.group ? m[0].indexOf(t) : 0);
      spans.push({ start, end: start + t.length, type: d.type, source: "regex" });
    }
  }
  return spans;
}

export function detectLabeled(text: string): Span[] {
  const spans: Span[] = [];
  for (const m of text.matchAll(LABEL_RE.re)) {
    const type = LABEL_RE.typeOf(m[1]);
    const v = cleanValue(m[2], type);
    if (!v) continue;
    const start = m.index! + m[0].length - m[2].length + v.offset;
    spans.push({ start, end: start + v.text.length, type, source: "label" });
  }
  for (const m of text.matchAll(BARE_NAME_RE)) {
    const v = cleanValue(m[1], "PERSON");
    if (!v) continue;
    const start = m.index! + m[0].length - m[1].length + v.offset;
    spans.push({ start, end: start + v.text.length, type: "PERSON", source: "label" });
  }
  return spans;
}

export function detectAll(text: string): Span[] {
  return [...detectPatterns(text), ...detectLabeled(text)];
}
