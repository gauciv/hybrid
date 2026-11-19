// The Airlock's final say. "safe" is only possible when EVERY protection layer actually ran AND
// an independent, model-free check finds no surviving name signals in the outbound payload.
import type { GateResult } from "./types";
import type { NerStatus } from "./ner";
import { suspectNames } from "./suspects";

export type AirlockVerdict =
  | { kind: "safe" }
  | { kind: "needs_review"; reason: "model_unavailable" | "model_partial" }
  | { kind: "needs_review"; reason: "possible_names"; suspects: string[] }
  | { kind: "blocked"; leaks: GateResult["leaks"] };

/** @param payload the exact redacted text that would leave the device (required: the model-free name check runs on it). */
export function airlockVerdict(gate: GateResult, nerStatus: NerStatus, payload: string): AirlockVerdict {
  if (!gate.ok) return { kind: "blocked", leaks: gate.leaks };
  if (nerStatus === "unavailable") return { kind: "needs_review", reason: "model_unavailable" };
  if (nerStatus === "partial") return { kind: "needs_review", reason: "model_partial" };
  const suspects = suspectNames(payload);
  if (suspects.length) return { kind: "needs_review", reason: "possible_names", suspects };
  return { kind: "safe" };
}
