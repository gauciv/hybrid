import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { airlockVerdict, leakGate, redact } from "../src";

const UNLABELED = "This agreement is made between Mr. Hamad Al-Kuwari and Liza Mendoza.";

describe("airlockVerdict", () => {
  it("never says safe when the model did not run, even if the gate passes (regression: found in browser test)", () => {
    const { redacted, vault } = redact(UNLABELED); // regex-only: names survive
    const gate = leakGate(redacted, vault);
    expect(gate.ok).toBe(true); // the gate alone cannot know about unlabeled names…
    expect(airlockVerdict(gate, "unavailable")).toEqual({ kind: "needs_review", reason: "model_unavailable" });
  });
  it("partial model coverage also requires review", () => {
    expect(airlockVerdict({ ok: true, leaks: [] }, "partial").kind).toBe("needs_review");
  });
  it("a gate failure always blocks, whatever the model status", () => {
    fc.assert(
      fc.property(fc.constantFrom("ok", "partial", "unavailable") as fc.Arbitrary<"ok" | "partial" | "unavailable">, (s) => {
        return airlockVerdict({ ok: false, leaks: [{ type: "PHONE", text: "x" }] }, s).kind === "blocked";
      }),
    );
  });
  it("safe only when gate passes AND model ran fully", () => {
    expect(airlockVerdict({ ok: true, leaks: [] }, "ok")).toEqual({ kind: "safe" });
  });
});
