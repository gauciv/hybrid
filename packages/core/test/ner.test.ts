import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { chunkText, leakGate, parseNerResponse, redact, runNer } from "../src";

const CONTRACT = `This agreement is made between Mr. Hamad Al-Kuwari, residing at Street 12, Al Wakra,
and the worker Liza Mendoza, who may be reached at liza.m@yahoo.com.
Golden Hands Manpower Services Inc. shall facilitate deployment to Qatar.`;

describe("parseNerResponse", () => {
  it("keeps entities that occur in the text", () => {
    const raw = JSON.stringify({
      entities: [
        { text: "Hamad Al-Kuwari", type: "PERSON" },
        { text: "Street 12, Al Wakra", type: "ADDRESS" },
      ],
    });
    expect(parseNerResponse(raw, CONTRACT)).toEqual([
      { text: "Hamad Al-Kuwari", type: "PERSON" },
      { text: "Street 12, Al Wakra", type: "ADDRESS" },
    ]);
  });
  it("drops hallucinated entities not present in the source", () => {
    const raw = JSON.stringify({ entities: [{ text: "Juan dela Cruz", type: "PERSON" }] });
    expect(parseNerResponse(raw, CONTRACT)).toEqual([]);
  });
  it("drops unknown types and junk without throwing", () => {
    expect(parseNerResponse("not json", CONTRACT)).toEqual([]);
    expect(parseNerResponse('{"entities": "nope"}', CONTRACT)).toEqual([]);
    expect(parseNerResponse('{"entities":[{"text":"Qatar","type":"COUNTRY"},null,{"type":"PERSON"}]}', CONTRACT)).toEqual([]);
  });
  it("accepts fenced JSON and dedupes", () => {
    const raw = '```json\n{"entities":[{"text":"Liza Mendoza","type":"PERSON"},{"text":"liza mendoza","type":"PERSON"}]}\n```';
    expect(parseNerResponse(raw, CONTRACT)).toEqual([{ text: "Liza Mendoza", type: "PERSON" }]);
  });
});

describe("chunkText", () => {
  it("never loses or reorders characters", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 12000 }), fc.integer({ min: 50, max: 3000 }), (text, max) => {
        const chunks = chunkText(text, max);
        return chunks.join("") === text && chunks.every((c) => c.length <= max);
      }),
      { numRuns: 300 },
    );
  });
  it("prefers line boundaries", () => {
    const text = "Name of Worker: Ana Reyes\n".repeat(200);
    for (const c of chunkText(text, 500)) expect(c.endsWith("\n")).toBe(true);
  });
});

describe("runNer → redact → leakGate (end to end with a fake on-device model)", () => {
  const fakeNano = async (prompt: string) => {
    const found = ["Hamad Al-Kuwari", "Street 12, Al Wakra", "Liza Mendoza", "Jessa Ramos"] // last one: hallucination
      .filter((n) => prompt.includes(n) || n === "Jessa Ramos")
      .map((text) => ({ text, type: text.startsWith("Street") ? "ADDRESS" : "PERSON" }));
    return JSON.stringify({ entities: found });
  };

  it("unlabeled names are redacted everywhere and the gate passes", async () => {
    const ner = await runNer(CONTRACT, fakeNano);
    expect(ner.status).toBe("ok");
    const { redacted, vault } = redact(CONTRACT, ner.entities);
    for (const s of ["Hamad", "Al-Kuwari", "Street 12", "Liza", "Mendoza", "liza.m@yahoo.com"]) expect(redacted).not.toContain(s);
    expect(redacted).toContain("Golden Hands Manpower Services Inc.");
    expect(redacted).toContain("Qatar");
    expect([...vault.values()]).not.toContain("Jessa Ramos");
    expect(leakGate(redacted, vault).ok).toBe(true);
  });

  it("reports unavailable when the on-device model throws, and partial when some chunks fail", async () => {
    const dead = async () => {
      throw new Error("on-device model unavailable");
    };
    expect((await runNer(CONTRACT, dead)).status).toBe("unavailable");

    let n = 0;
    const flaky = async (p: string) => {
      if (n++ % 2) throw new Error("boom");
      return fakeNano(p);
    };
    const long = (CONTRACT + "\n").repeat(40);
    const r = await runNer(long, flaky);
    expect(r.status).toBe("partial");
    expect(r.failedChunks).toBeGreaterThan(0);
  });
});
