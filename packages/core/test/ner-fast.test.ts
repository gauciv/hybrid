import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { airlockVerdict, leakGate, parseNerLines, redact, runNer, selectNerLines } from "../src";

const SAMPLE = `EMPLOYMENT CONTRACT
This agreement is made between Mr. Hamad Al-Kuwari of Street 12, Al Wakra, Doha (the Employer)
and Liza Mendoza, a Filipino household service worker (the Worker).
Passport No.: P4829173B   Mobile No.: +63 917 555 0142

1. The Employer shall pay the Worker a monthly salary of QAR 1,200 for 24 months.
2. Hamad shall keep the Worker's passport for safekeeping during employment.
3. Liza shall work 14 hours per day with one rest day per month.
4. The agency, Golden Hands Manpower Services Inc., charged a placement fee of PHP 45,000.`;

describe("selectNerLines", () => {
  it("keeps every line with a name or address and drops pure clause/ID lines", () => {
    const sel = selectNerLines(SAMPLE);
    for (const must of ["Hamad Al-Kuwari", "Street 12", "Liza Mendoza", "2. Hamad shall", "3. Liza shall"]) expect(sel).toContain(must);
    for (const drop of ["EMPLOYMENT CONTRACT", "monthly salary of QAR 1,200", "P4829173B"]) expect(sel).not.toContain(drop);
    expect(sel.length).toBeLessThan(SAMPLE.length * 0.75);
  });
  it("never drops a line containing a capitalised non-vocabulary word (property)", () => {
    const names = ["Rowena", "Jericho", "Abdullah", "Peñaflor", "Kuwari"];
    fc.assert(
      fc.property(fc.array(fc.constantFrom("The Employer shall pay.", "Rest day per week.", "QAR 1,200 monthly."), { maxLength: 6 }), fc.constantFrom(...names), fc.nat(6), (lines, name, at) => {
        const doc = [...lines.slice(0, at), `Signed by ${name} today.`, ...lines.slice(at)].join("\n");
        return selectNerLines(doc).includes(name);
      }),
    );
  });
});

describe("parseNerLines", () => {
  it("parses TYPE | text lines and validates against the source", () => {
    const r = parseNerLines("PERSON | Hamad Al-Kuwari\nADDRESS | Street 12, Al Wakra, Doha\nPERSON | Juan Hallucinated", SAMPLE);
    expect(r).toEqual({ ok: true, entities: [{ text: "Hamad Al-Kuwari", type: "PERSON" }, { text: "Street 12, Al Wakra, Doha", type: "ADDRESS" }] });
  });
  it("NONE is a valid empty answer; prose is a failure", () => {
    expect(parseNerLines("NONE", SAMPLE)).toEqual({ ok: true, entities: [] });
    expect(parseNerLines("Sorry, I cannot help with that.", SAMPLE).ok).toBe(false);
  });
});

describe("fast variants keep the same safety guarantees", () => {
  for (const opts of [{ format: "lines" as const, focus: "people" as const, filterLines: true }, { focus: "people" as const, filterLines: true }]) {
    it(`${JSON.stringify(opts)}: a model miss is still caught by the always-on scan`, async () => {
      const missLiza = async () => (opts.format === "lines" ? "PERSON | Hamad Al-Kuwari\nADDRESS | Street 12, Al Wakra, Doha" : JSON.stringify({ entities: [{ text: "Hamad Al-Kuwari", type: "PERSON" }, { text: "Street 12, Al Wakra, Doha", type: "ADDRESS" }] }));
      const ner = await runNer(SAMPLE, missLiza, opts);
      expect(ner.status).toBe("ok");
      const { redacted, vault } = redact(SAMPLE, ner.entities);
      expect(airlockVerdict(leakGate(redacted, vault), ner, redacted).kind).toBe("needs_review");
    });
  }
  it("an input with no name-like lines skips the model entirely", async () => {
    let called = false;
    const r = await runNer("1. The Employer shall pay QAR 1,200.\n2. Rest day per week.", async () => ((called = true), "NONE"), { filterLines: true });
    expect(called).toBe(false);
    expect(r.status).toBe("ok");
  });
});
