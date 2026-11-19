import { describe, expect, it } from "vitest";
import { parseNerLines, parseNerResponse, selectNerLines } from "../src";

describe("security round 7: line filter is independent of the backstop vocabulary", () => {
  it("names made of month/place words are still sent to the model", () => {
    expect(selectNerLines("Signed by May June today.")).toContain("May June");
    expect(selectNerLines("Witness: April Doha")).toContain("April Doha");
  });
  it("pure structure lines are still skipped", () => {
    expect(selectNerLines("1. The Employer shall pay the Worker monthly.")).toBe("");
  });
});

describe("security round 7: malformed or all-hallucinated output is a failure", () => {
  const SRC = "The contract is with Liza Mendoza.";
  it("lines with unknown types do not count as a valid answer", () => {
    expect(parseNerLines("NOTE: nothing here\nSUMMARY: fine", SRC).ok).toBe(false);
  });
  it("valid lines still parse", () => {
    expect(parseNerLines("PERSON | Liza Mendoza", SRC)).toEqual({ ok: true, entities: [{ text: "Liza Mendoza", type: "PERSON" }] });
  });
  it("if every returned entity is hallucinated, the chunk is unverified", () => {
    expect(parseNerLines("PERSON | Juan Cruz", SRC).ok).toBe(false);
    expect(parseNerResponse('{"entities":[{"text":"Juan Cruz","type":"PERSON"}]}', SRC).ok).toBe(false);
  });
  it("a mix of real and hallucinated entities is ok (real ones kept)", () => {
    expect(parseNerLines("PERSON | Juan Cruz\nPERSON | Liza Mendoza", SRC)).toEqual({ ok: true, entities: [{ text: "Liza Mendoza", type: "PERSON" }] });
  });
});
