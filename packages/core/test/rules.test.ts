import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDocument, findAmounts, redact } from "../src";

const SRC = fileURLToPath(new URL("../../../docs/sources/", import.meta.url));
const read = (p: string) => readFileSync(resolve(SRC, p), "utf8");
const ids = (f: { ruleId: string }[]) => f.map((x) => x.ruleId);
const reds = (f: { severity: string; ruleId: string }[]) => f.filter((x) => x.severity === "red").map((x) => x.ruleId);

describe("official DMW standard contracts are never flagged red (trust check)", () => {
  for (const f of ["contracts/sec-hsw-dubai-2023.txt", "contracts/sec-hsw-singapore-polo-2019.txt", "contracts/sec-hsw-poea-embassy-dc.txt"]) {
    it(f, () => {
      const r = checkDocument(read(f), "contract");
      expect(reds(r), JSON.stringify(r.filter((x) => x.severity === "red").map((x) => x.evidence), null, 1)).toEqual([]);
    });
  }
  it("recognises the protective passport and weekly rest-day clauses in the UAE contract", () => {
    const r = ids(checkDocument(read("contracts/sec-hsw-dubai-2023.txt"), "contract"));
    expect(r).toContain("passport.protected");
    expect(r).toContain("rest_day.weekly");
  });
});

const SAMPLE = `EMPLOYMENT CONTRACT
This agreement is made between Mr. Hamad Al-Kuwari of Street 12, Al Wakra, Doha (the Employer)
and Liza Mendoza, a Filipino household service worker (the Worker).
Passport No.: P4829173B   Mobile No.: +63 917 555 0142

1. The Employer shall pay the Worker a monthly salary of QAR 1,200 for 24 months.
2. Hamad shall keep the Worker's passport for safekeeping during employment.
3. Liza shall work 14 hours per day with one rest day per month.
4. The agency, Golden Hands Manpower Services Inc., charged a placement fee of PHP 45,000.`;

describe("demo contract", () => {
  const r = checkDocument(SAMPLE);
  it("is detected as a contract", () => expect(r.some((f) => f.ruleId === "post.no_license")).toBe(false));
  it("flags salary, passport, rest day, and placement fee", () => {
    expect(reds(r)).toEqual(expect.arrayContaining(["salary.below_old_min", "passport.withheld", "rest_day.insufficient", "fees.placement_fee"]));
  });
  it("works identically on the REDACTED text (what runs before the cloud)", () => {
    expect(ids(checkDocument(redact(SAMPLE).redacted))).toEqual(ids(r));
  });
  it("every finding carries Tagalog + English and a verbatim citation", () => {
    for (const f of r) {
      expect(f.title.tl && f.title.en && f.detail.tl && f.detail.en).toBeTruthy();
      expect(f.citations.length).toBeGreaterThan(0);
      for (const c of f.citations) expect(c.quote.length).toBeGreaterThan(20);
    }
  });
});

describe("salary thresholds (Advisory 25-2025 / MC 03-2025)", () => {
  const sal = (s: string) => checkDocument(`EMPLOYMENT CONTRACT\nThe Employer shall pay a monthly salary of ${s}.`, "contract").find((f) => f.ruleId.startsWith("salary."))!.ruleId;
  it.each([
    ["SAR 1,500", "salary.below_new_min"], // 400 USD
    ["SAR 1,875", "salary.ok"], // 500 USD
    ["USD 350", "salary.below_old_min"],
    ["US$ 500", "salary.ok"],
    ["AED 1,500", "salary.below_new_min"], // 408 USD
    ["KWD 120", "salary.below_old_min"], // 120 / 0.307 ≈ US$391
    ["HKD 4,990", "salary.ok"],
  ])("%s → %s", (s, expected) => expect(sal(s)).toBe(expected));
  it("weekly wages are converted to monthly", () => {
    expect(checkDocument("EMPLOYMENT CONTRACT\nWages: USD 100 per week.", "contract").find((f) => f.ruleId.startsWith("salary."))!.ruleId).toBe("salary.below_new_min");
  });
  it("missing salary is called out", () => {
    expect(ids(checkDocument("EMPLOYMENT CONTRACT\nThe Worker shall have one rest day per week.", "contract"))).toContain("salary.missing");
  });
  it("finds amounts in many notations", () => {
    expect(findAmounts("SAR 1,500 / 1500 riyals / US$400 / ₱45,000 / AED1,500").map((m) => m.currency)).toEqual(["SAR", "SAR", "USD", "PHP", "AED"]);
  });
});

describe("synthetic recruiter posts S1–S4 (docs/sources/real-samples/recruiter-red-flags.md)", () => {
  const md = read("real-samples/recruiter-red-flags.md");
  const post = (id: string) => md.split(`### ${id}`)[1].split("```")[1];
  it("S1 tourist visa + GCash + fee → red flags", () => {
    expect(reds(checkDocument(post("S1")))).toEqual(expect.arrayContaining(["post.tourist_visa", "post.ewallet_payment", "fees.placement_fee", "post.fixer"]));
  });
  it("S2 looks legit but no license, chat only → amber, no red", () => {
    const r = checkDocument(post("S2"));
    expect(reds(r)).toEqual([]);
    expect(ids(r)).toEqual(expect.arrayContaining(["post.no_license", "post.chat_only"]));
  });
  it("S3 fixer + third-country route → red", () => {
    expect(reds(checkDocument(post("S3")))).toEqual(expect.arrayContaining(["post.fixer"]));
  });
  it("S4 compliant post → no red, no amber (must not cry wolf)", () => {
    const r = checkDocument(post("S4"));
    expect(r.filter((f) => f.severity !== "green")).toEqual([]);
  });
});

describe("posts flattened by right-click selection (no newlines)", () => {
  const flat = "🔥URGENT HIRING🔥 DH for DUBAI ✅ Salary 1,500 AED ✅ Direct employer, NO NEED AGENCY ✅ Tourist visa muna, convert pagdating. Processing fee ₱25,000 lang, send via GCash 0917-000-1234. PM agad!";
  it("splits on bullet emoji so evidence stays short and specific", () => {
    const r = checkDocument(flat, "post");
    const visa = r.find((f) => f.ruleId === "post.tourist_visa")!;
    expect(visa.evidence).toBe("Tourist visa muna, convert pagdating.");
    expect(reds(r)).toEqual(expect.arrayContaining(["post.tourist_visa", "post.ewallet_payment", "post.fixer", "fees.placement_fee"]));
  });
});
