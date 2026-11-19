// The Airlock's final say. "safe" is only possible when EVERY protection layer actually ran.
// The leak gate can only catch PII it can recognise; names outside labeled fields need the model.
// So if the on-device model did not run, we never claim safety. The user must review the payload.
import type { GateResult } from "./types";
import type { NerStatus } from "./ner";

export type AirlockVerdict =
  | { kind: "safe" }
  | { kind: "needs_review"; reason: "model_unavailable" | "model_partial" }
  | { kind: "blocked"; leaks: GateResult["leaks"] };

export function airlockVerdict(gate: GateResult, nerStatus: NerStatus): AirlockVerdict {
  if (!gate.ok) return { kind: "blocked", leaks: gate.leaks };
  if (nerStatus === "unavailable") return { kind: "needs_review", reason: "model_unavailable" };
  if (nerStatus === "partial") return { kind: "needs_review", reason: "model_partial" };
  return { kind: "safe" };
}
