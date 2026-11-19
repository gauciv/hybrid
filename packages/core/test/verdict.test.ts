import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { airlockVerdict, leakGate, redact } from "../src";

const UNLABELED = "This agreement is made between Mr. Hamad Al-Kuwari and Liza Mendoza.";

describe("airlockVerdict", () => {
  it("never says safe when the model did not run, even if the gate passes (regression: found in browser test)", () => {
    const { redacted, vault } = redact(UNLABELED); // regex-only: names survive
    const gate = leakGate(redacted, vault);
    expect(gate.ok).toBe(true); // the gate alone cannot know about unlabeled names…
    const v = airlockVerdict(gate, { status: "unavailable", entities: [] }, redacted);
    expect(v).toMatchObject({ kind: "needs_review", reason: "model_unavailable" });
    // …and it still tells the user exactly which names look unredacted
    if (v.kind === "needs_review") expect(v.suspects).toEqual(expect.arrayContaining(["Hamad Al-Kuwari", "Liza Mendoza"]));
  });
  it("partial model coverage also requires review", () => {
    expect(airlockVerdict({ ok: true, leaks: [] }, { status: "partial", entities: [] }, "").kind).toBe("needs_review");
  });
  it("a gate failure always blocks, whatever the model status", () => {
    fc.assert(
      fc.property(fc.constantFrom("ok", "partial", "unavailable") as fc.Arbitrary<"ok" | "partial" | "unavailable">, (s) => {
        return airlockVerdict({ ok: false, leaks: [{ type: "PHONE", text: "x" }] }, { status: s, entities: [] }, "").kind === "blocked";
      }),
    );
  });
  it("safe only when gate passes AND model ran fully", () => {
    expect(airlockVerdict({ ok: true, leaks: [] }, { status: "ok", entities: [] }, "")).toEqual({ kind: "safe" });
  });
});
