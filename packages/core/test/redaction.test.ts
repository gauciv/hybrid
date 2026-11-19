import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { leakGate, redact, rehydrate } from "../src";
import { CASES } from "./redaction.cases";

const has = (hay: string, needle: string) => hay.toLowerCase().includes(needle.toLowerCase());

describe("golden corpus", () => {
  for (const c of CASES) {
    it(c.name, () => {
      const { redacted, vault } = redact(c.input);
      for (const s of c.mustRedact) expect(redacted, `should redact "${s}"\n---\n${redacted}`).not.toContain(s);
      for (const s of c.mustKeep ?? []) expect(redacted, `should keep "${s}"\n---\n${redacted}`).toContain(s);
      expect(rehydrate(redacted, vault)).toBe(c.input);
      expect(leakGate(redacted, vault).leaks).toEqual([]);
    });
  }
});

describe("leak gate", () => {
  it("blocks a payload that still contains a vaulted value", () => {
    const { vault } = redact("Name of Worker: Maria Santos");
    expect(leakGate("Please review the contract of Maria Santos", vault).ok).toBe(false);
    expect(leakGate("Please review the contract of Ms. Santos", vault).ok).toBe(false);
  });
  it("blocks a payload with a raw identifier even if never vaulted", () => {
    expect(leakGate("Her passport is P7654321B", new Map()).ok).toBe(false);
  });
  it("passes a clean payload", () => {
    expect(leakGate("[[PERSON_1]] earns USD 400 per month for 24 months.", new Map()).ok).toBe(true);
  });
});

describe("model entities (Nano NER layer)", () => {
  it("redacts unlabeled names the model found, everywhere", () => {
    const text = "This contract is made between Mr. Hamad Al-Kuwari and the worker Liza Mendoza. Hamad agrees...";
    const { redacted, vault } = redact(text, [
      { text: "Hamad Al-Kuwari", type: "PERSON" },
      { text: "Liza Mendoza", type: "PERSON" },
    ]);
    for (const s of ["Hamad", "Al-Kuwari", "Liza", "Mendoza"]) expect(redacted).not.toContain(s);
    expect(rehydrate(redacted, vault)).toBe(text);
  });
});

// ---------- Property-based tests ----------

const FIRST = ["Maria", "Jose", "Rowena", "Analyn", "Cristina", "Jericho", "Liza", "Rosalinda", "Mark", "Divina", "Ma. Cecilia"];
const LAST = ["Santos", "Reyes", "Dela Cruz", "Bautista", "Villanueva", "Mendoza", "Peñaflor", "Ocampo", "Garcia", "Aquino"];
const GULF = ["Khalid Al-Harbi", "Abdullah bin Saeed", "Fatima Al-Sabah", "Hamad Al-Kuwari", "Noura Al-Qahtani"];

const personArb = fc.oneof(
  fc.tuple(fc.constantFrom(...FIRST), fc.constantFrom(...LAST)).map(([f, l]) => `${f} ${l}`),
  fc.constantFrom(...GULF),
);
const upper = fc.constantFrom(..."ABCDEFGHJKLMNPRSTUVWXYZ".split(""));
const digit = fc.integer({ min: 0, max: 9 }).map(String);
const nDigits = (n: number) => fc.array(digit, { minLength: n, maxLength: n }).map((a) => a.join(""));

const passportArb = fc.oneof(
  fc.tuple(nDigits(7), upper).map(([d, l]) => `P${d}${l}`),
  fc.tuple(upper, upper, nDigits(7)).map(([a, b, d]) => `${a}${b}${d}`),
);
const phMobileArb = fc
  .tuple(fc.constantFrom("+63 9", "09", "+639"), nDigits(2), nDigits(3), nDigits(4), fc.constantFrom(" ", "-", ""))
  .map(([p, a, b, c, sep]) => (p === "+63 9" ? `${p}${a} ${b} ${c}` : `${p}${a}${sep}${b}${sep}${c}`));
const gulfPhoneArb = fc
  .tuple(fc.constantFrom("+966", "+965", "+971", "+974", "+852"), nDigits(4), nDigits(4))
  .map(([cc, a, b]) => `${cc} ${a} ${b}`);
const emailArb = fc
  .tuple(fc.constantFrom("maria", "jose.r", "liza_m", "ofw2026"), nDigits(2), fc.constantFrom("gmail.com", "yahoo.com", "outlook.ph"))
  .map(([u, d, h]) => `${u}${d}@${h}`);
const salaryArb = fc.integer({ min: 300, max: 2500 });

const SAFE_FACTS = (salary: number) => [
  `USD ${salary}`,
  "24 months",
  "one rest day per week",
  "shall not withhold the worker's passport",
];

const contractArb = fc
  .record({
    worker: personArb,
    employer: personArb,
    passport: passportArb,
    workerPhone: phMobileArb,
    employerPhone: gulfPhoneArb,
    email: emailArb,
    salary: salaryArb,
  })
  .filter((r) => r.worker !== r.employer);

type Contract = typeof contractArb extends fc.Arbitrary<infer T> ? T : never;
const render = (r: Contract) => `STANDARD EMPLOYMENT CONTRACT
Name of Employer: ${r.employer}
Contact No.: ${r.employerPhone}
Name of Worker: ${r.worker}
Passport No.: ${r.passport}
Mobile No.: ${r.workerPhone}
Email: ${r.email}

1. The employer shall pay a monthly salary of USD ${r.salary} for 24 months.
2. The worker shall have one rest day per week.
3. The employer shall not withhold the worker's passport.
4. ${r.worker.split(" ").slice(-1)[0]} may contact the agency at any time.`;

describe("properties", () => {
  it("no injected PII survives redaction, and the gate passes", () => {
    fc.assert(
      fc.property(contractArb, (r) => {
        const text = render(r);
        const { redacted, vault } = redact(text);
        for (const pii of [r.worker, r.employer, r.passport, r.workerPhone, r.employerPhone, r.email]) {
          if (has(redacted, pii)) return false;
        }
        return leakGate(redacted, vault).ok;
      }),
      { numRuns: 500 },
    );
  });

  it("facts needed for analysis always survive", () => {
    fc.assert(
      fc.property(contractArb, (r) => {
        const { redacted } = redact(render(r));
        return SAFE_FACTS(r.salary).every((f) => redacted.includes(f));
      }),
      { numRuns: 500 },
    );
  });

  it("rehydrate(redact(x)) === x for any text", () => {
    fc.assert(
      fc.property(fc.oneof(contractArb.map(render), fc.string({ maxLength: 400 })), (text) => {
        const { redacted, vault } = redact(text);
        return rehydrate(redacted, vault) === text;
      }),
      { numRuns: 500 },
    );
  });

  it("redaction is idempotent (redacting twice changes nothing)", () => {
    fc.assert(
      fc.property(contractArb.map(render), (text) => {
        const once = redact(text).redacted;
        return redact(once).redacted === once;
      }),
      { numRuns: 300 },
    );
  });

  it("gate blocks any payload where a vaulted value is re-inserted", () => {
    fc.assert(
      fc.property(contractArb, fc.nat(), (r, k) => {
        const { redacted, vault } = redact(render(r));
        const values = [...vault.values()];
        const leaked = values[k % values.length];
        return !leakGate(`${redacted}\nNote: ${leaked}`, vault).ok;
      }),
      { numRuns: 300 },
    );
  });
});
