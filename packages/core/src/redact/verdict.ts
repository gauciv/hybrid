// The Airlock's final say. "safe" is only possible when EVERY protection layer actually ran AND
// an independent, model-free check finds no surviving name signals in the outbound payload.
import type { GateResult } from "./types";
import type { NerResult } from "./ner";
import { suspectNames, unverifiedNameCandidates } from "./suspects";

export type AirlockVerdict =
  | { kind: "safe" }
  | { kind: "needs_review"; reason: "model_unavailable" | "model_partial" }
  | { kind: "needs_review"; reason: "possible_names"; suspects: string[] }
  | { kind: "needs_review"; reason: "unverified_no_names"; candidates: string[] }
  | { kind: "blocked"; leaks: GateResult["leaks"] };

/**
 * @param ner what the on-device model reported (status + entities).
 * @param payload the exact redacted text that would leave the device (model-free checks run on it).
 */
export function airlockVerdict(
  gate: GateResult,
  ner: Pick<NerResult, "status" | "entities">,
  payload: string,
): AirlockVerdict {
  if (!gate.ok) return { kind: "blocked", leaks: gate.leaks };
  if (ner.status === "unavailable") return { kind: "needs_review", reason: "model_unavailable" };
  if (ner.status === "partial") return { kind: "needs_review", reason: "model_partial" };
  const suspects = suspectNames(payload);
  if (suspects.length) return { kind: "needs_review", reason: "possible_names", suspects };
  // The document is attacker-controlled. If the model found nobody, that silence is unverified:
  // any remaining name-like phrase must be confirmed by the user.
  if (!ner.entities.some((e) => e.type === "PERSON")) {
    const candidates = unverifiedNameCandidates(payload);
    if (candidates.length) return { kind: "needs_review", reason: "unverified_no_names", candidates };
  }
  return { kind: "safe" };
}
