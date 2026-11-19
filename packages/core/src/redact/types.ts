export type PiiType =
  | "PERSON"
  | "PASSPORT"
  | "PHONE"
  | "EMAIL"
  | "GOV_ID"
  | "BANK"
  | "ADDRESS"
  | "DOB"
  | "ID_NUMBER";

export type SpanSource = "regex" | "label" | "model" | "vault";

export interface Span {
  start: number;
  end: number; // exclusive
  type: PiiType;
  source: SpanSource;
}

/** A PII span found by an external detector (e.g. Gemini Nano), given as text not offsets. */
export interface ExternalEntity {
  text: string;
  type: PiiType;
}

/** placeholder (e.g. "[[PERSON_1]]") → original text. Lives only in memory on the device. */
export type Vault = Map<string, string>;

export interface RedactionResult {
  redacted: string;
  vault: Vault;
  spans: Span[];
}

export interface GateResult {
  ok: boolean;
  leaks: { type: PiiType | "VAULT_VALUE"; text: string }[];
}
