// The Airlock's final say. "safe" is only possible when EVERY protection layer actually ran AND
// an independent, model-free check finds no surviving name signals in the outbound payload.
import type { GateResult } from "./types";
import type { NerResult } from "./ner";
import { nameLikePhrases, suspectNames } from "./suspects";

export type AirlockVerdict =
  | { kind: "safe" }
  | { kind: "needs_review"; reason: "model_unavailable" | "model_partial" | "possible_names"; suspects: string[] }
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
  // Model-free checks ALWAYS run on the outbound payload. The document is attacker-controlled, so what the
  // model reported (e.g. one decoy name) must never switch these off. Their suspects are always reported so the
  // user can redact them in one click, which matters most when the on-device model is unavailable.
  const suspects = [...new Set([...suspectNames(payload), ...nameLikePhrases(payload)])];
  if (ner.status === "unavailable") return { kind: "needs_review", reason: "model_unavailable", suspects };
  if (ner.status === "partial") return { kind: "needs_review", reason: "model_partial", suspects };
  if (suspects.length) return { kind: "needs_review", reason: "possible_names", suspects };
  return { kind: "safe" };
}
