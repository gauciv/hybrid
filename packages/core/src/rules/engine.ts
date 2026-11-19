// Deterministic contract & recruiter-post rules. Offline, on-device, explainable.
// Messages are pre-written (everyday Taglish + English) so they work without the cloud and without on-device
// Tagalog generation (Gemini Nano can't output Tagalog). The cloud model adds explanation later; it
// never invents rules. Every finding cites a verbatim source in docs/sources/.
import { CITATIONS, type Citation } from "./sources";
import { DEFAULT_RATES, findAmounts, monthlyUsd, periodNear, toUsd, type RateTable } from "./money";

export type Severity = "red" | "amber" | "green";
export type Lang = "tl" | "en";

export interface Finding {
  ruleId: string;
  severity: Severity;
  title: Record<Lang, string>;
  detail: Record<Lang, string>;
  evidence?: string; // the clause that triggered it (redacted text is fine)
  citations: Citation[];
}

export interface RulesConfig {
  hswMinSalaryUsd: number; // current DMW floor
  hswOldMinSalaryUsd: number; // pre-2025 floor
  rates: RateTable;
}

export const DEFAULT_RULES_CONFIG: RulesConfig = { hswMinSalaryUsd: 500, hswOldMinSalaryUsd: 400, rates: DEFAULT_RATES };

/** Split into clauses: lines, then sentences. Keeps evidence short and negation local. */
export function clauses(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((l) => l.split(/(?<=[.;!?])\s+(?=[A-Z0-9("“])/))
    .map((c) => c.trim())
    .filter((c) => c.length > 2);
}

// Protective wording that flips a risky-looking clause into a compliant one.
const NEGATION =
  /\b(?:shall not|must not|will not|may not|cannot|can not|not be|never|prohibited|unlawful|illegal to|free of charge|at no cost|zero|no placement|walang|hindi|bawal|libre)\b|remain (?:in|with) (?:her|his|the worker)|in (?:her|his|the worker'?s?) possession|custody of (?:her|his)/i;

const has = (re: RegExp, s: string) => re.test(s);
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

type Rule = (cls: string[], full: string, cfg: RulesConfig) => Finding[];

// ---------------------------------------------------------------- contract rules

const salaryRule: Rule = (cls, _full, cfg) => {
  for (const c of cls) {
    if (!/\b(?:salary|wage|wages|sweldo|sahod|pay(?:ment)? of|compensation)\b/i.test(c)) continue;
    if (/\b(?:placement|processing|agency|training|recruitment)\s+fee/i.test(c)) continue;
    const amounts = findAmounts(c);
    for (const m of amounts) {
      const usd = toUsd(m, cfg.rates);
      if (!usd) continue;
      const monthly = monthlyUsd(usd.usd, periodNear(c, m.index + m.text.length));
      if (monthly === null) continue;
      const approx = usd.exact ? "" : " (approx.)";
      const v = `${m.text} ≈ US$${fmt(monthly)}${approx}`;
      if (monthly < cfg.hswOldMinSalaryUsd)
        return [{
          ruleId: "salary.below_old_min", severity: "red", evidence: c, citations: [CITATIONS.ADV25_WAGE],
          title: { tl: "Masyadong mababa ang salary", en: "Salary is too low" },
          detail: {
            tl: `Ang ${v} kada buwan ay mas mababa pa sa dating minimum na US$${cfg.hswOldMinSalaryUsd} para sa household service workers.`,
            en: `${v} per month is below even the old US$${cfg.hswOldMinSalaryUsd} minimum for household service workers.`,
          },
        }];
      if (monthly < cfg.hswMinSalaryUsd)
        return [{
          ruleId: "salary.below_new_min", severity: "amber", evidence: c, citations: [CITATIONS.ADV25_WAGE, CITATIONS.MC03_TRANSITION],
          title: { tl: `Mas mababa sa bagong US$${cfg.hswMinSalaryUsd} na minimum`, en: `Below the new US$${cfg.hswMinSalaryUsd} minimum` },
          detail: {
            tl: `Pasok ang ${v} kada buwan sa dating US$${cfg.hswOldMinSalaryUsd}, pero tinaas na ng DMW ang minimum sa at least US$${cfg.hswMinSalaryUsd} (Advisory 25-2025). May transition period pa, at sa Gulf countries ay voluntary pa raw ito. Tanungin ang agency mo kung bakit hindi US$${cfg.hswMinSalaryUsd}.`,
            en: `${v} per month meets the old US$${cfg.hswOldMinSalaryUsd} floor, but DMW raised the minimum to at least US$${cfg.hswMinSalaryUsd} (Advisory 25-2025). There is a transition period, and in the Gulf it has been reported as voluntary. Ask your agency why it isn't US$${cfg.hswMinSalaryUsd}.`,
          },
        }];
      return [{
        ruleId: "salary.ok", severity: "green", evidence: c, citations: [CITATIONS.ADV25_WAGE],
        title: { tl: "Pasok sa minimum salary", en: "Salary meets the DMW minimum" },
        detail: { tl: `Ang ${v} kada buwan ay at least US$${cfg.hswMinSalaryUsd}.`, en: `${v} per month is at least US$${cfg.hswMinSalaryUsd}.` },
      }];
    }
  }
  return [];
};

const passportRule: Rule = (cls) => {
  const out: Finding[] = [];
  for (const c of cls) {
    if (!/\b(?:passport|travel documents?|pasaporte)\b/i.test(c)) continue;
    if (!/\b(?:keep|kept|keeps|hold|held|holds|withh[eo]ld|retain|safe-?keep(?:ing)?|surrender|deposit|custody|confiscat\w*|turn(?:ed)? over|hand(?:ed)? over|submit|itago|kunin|kukunin|isuko|possession|remain)\b/i.test(c)) continue;
    if (has(NEGATION, c))
      out.push({
        ruleId: "passport.protected", severity: "green", evidence: c, citations: [CITATIONS.ADV25_PASSPORT],
        title: { tl: "Sa iyo mananatili ang passport mo", en: "Your passport stays with you" },
        detail: { tl: "Tama ito: ayon sa DMW, dapat laging nasa iyo ang passport mo.", en: "Correct: DMW requires your passport to stay with you at all times." },
      });
    else
      out.push({
        ruleId: "passport.withheld", severity: "red", evidence: c, citations: [CITATIONS.ADV25_PASSPORT, CITATIONS.SEC_SG_PASSPORT],
        title: { tl: "Kukunin o itatago ang passport mo", en: "Your passport would be taken or kept" },
        detail: {
          tl: "Ayon sa DMW, dapat laging nasa iyo ang passport mo. Bawal itong kunin o itago ng employer o recruiter. Pwede lang itong hiramin saglit para sa visa stamping, at dapat ibalik agad.",
          en: "DMW requires your passport to stay with you at all times. Employers and recruiters may not take or keep it, except briefly for visa stamping, after which it must be returned promptly.",
        },
      });
  }
  return out.slice(0, 2);
};

const restDayRule: Rule = (cls) => {
  for (const c of cls) {
    if (!/\b(?:rest days?|days? off|day-off|dayoff|pahinga)\b/i.test(c)) continue;
    const bad = /\b(?:no (?:rest day|day off)|without (?:a )?(?:rest day|day off)|walang (?:day off|pahinga))\b|\b(?:per|a|every|each|kada|bawat) (?:month|two weeks|buwan)\b|\bmonthly\b/i.test(c);
    if (bad)
      return [{
        ruleId: "rest_day.insufficient", severity: "red", evidence: c, citations: [CITATIONS.ADV25_REST_DAY, CITATIONS.SEC_DXB_REST],
        title: { tl: "Kulang ang day off mo", en: "Not enough rest days" },
        detail: {
          tl: "Dapat may at least isang buong day off ka kada linggo. Ang isang day off kada buwan (o wala talaga) ay labag sa Standard Employment Contract.",
          en: "You must get at least one full rest day every week. One day off a month (or none) violates the Standard Employment Contract.",
        },
      }];
    if (/\b(?:per|a|every|each|kada|bawat) (?:week|linggo)\b|\bweekly\b/i.test(c))
      return [{
        ruleId: "rest_day.weekly", severity: "green", evidence: c, citations: [CITATIONS.ADV25_REST_DAY],
        title: { tl: "May day off kada linggo", en: "Weekly rest day included" },
        detail: { tl: "Tama ito: may isang day off kada linggo.", en: "Correct: one rest day every week." },
      }];
  }
  return [];
};

const hoursRule: Rule = (cls) => {
  for (const c of cls) {
    const work = c.match(/\b(\d{1,2})\s*(?:\(\d+\)\s*)?hours?\s+(?:per|a|each|every|kada)\s+day\b/i);
    const rest = c.match(/\brest of (?:at least )?(?:\w+ )?\(?(\d{1,2})\)?\s*hours?/i);
    if (rest && parseInt(rest[1]) < 8)
      return [hoursFinding(c, { tl: `${rest[1]} oras lang ang tuloy-tuloy na pahinga mo`, en: `Only ${rest[1]} hours of continuous rest` })];
    if (work && /\b(?:work|duty|duties|trabaho|serve|render)\b/i.test(c) && parseInt(work[1]) > 16)
      return [hoursFinding(c, { tl: `${work[1]} oras na trabaho kada araw`, en: `${work[1]} working hours per day` })];
  }
  return [];
};
function hoursFinding(c: string, title: Record<Lang, string>): Finding {
  return {
    ruleId: "hours.excessive", severity: "red", evidence: c, citations: [CITATIONS.SEC_DXB_REST],
    title,
    detail: {
      tl: "Ayon sa Standard Employment Contract, dapat may at least 8 oras kang tuloy-tuloy na pahinga kada araw.",
      en: "The Standard Employment Contract requires at least 8 hours of continuous rest every day.",
    },
  };
}

const placementFeeRule: Rule = (cls) => {
  for (const c of cls) {
    if (!/\b(?:placement|processing|agency|recruitment|training|deployment)\s+fees?\b|\bbayad sa agency\b/i.test(c)) continue;
    if (has(NEGATION, c)) continue;
    const charged = findAmounts(c).some((m) => m.amount > 0) || /\b(?:charge|charged|pay|paid|shoulder|bayad|babayaran|deduct)\b/i.test(c);
    if (!charged) continue;
    return [{
      ruleId: "fees.placement_fee", severity: "red", evidence: c, citations: [CITATIONS.SEC_SG_FEES, CITATIONS.DMW_GMA_2026],
      title: { tl: "Sinisingil ka ng placement fee", en: "You are being charged a placement fee" },
      detail: {
        tl: "Para sa household service workers, ang employer ang dapat magbayad ng lahat ng hiring costs, kasama ang agency fees. Huwag magbayad kung walang valid na contract at official receipt.",
        en: "For household service workers, the employer must shoulder all hiring costs, including agency fees. Never pay without a valid contract and an official receipt.",
      },
    }];
  }
  return [];
};

const deductionRule: Rule = (cls) => {
  for (const c of cls) {
    if (!/\b(?:deduct\w*|kaltas\w*|salary deduction)\b/i.test(c) || has(NEGATION, c)) continue;
    // Legally required contributions are allowed; only deductions FOR costs the worker shouldn't bear are flagged.
    if (/\b(?:legal|compulsory|mandatory|prescribed by law|required by law)\b/i.test(c)) continue;
    if (!/\b(?:fees?|food|meals?|accommodation|lodging|housing|ticket|air ?fare|loan|advance|training|placement|uniform|insurance|visa|medical|pagkain|tirahan|utang)\b/i.test(c)) continue;
    return [{
      ruleId: "salary.deduction", severity: "red", evidence: c, citations: [CITATIONS.SEC_DXB_DEDUCTION, CITATIONS.SEC_SG_FEES],
      title: { tl: "May kaltas sa salary mo", en: "Deductions from your salary" },
      detail: {
        tl: "Bawal kaltasan ang salary mo, maliban sa contributions na required ng batas, at dapat may resibo.",
        en: "Your salary may not be reduced except for legally required contributions, with a receipt.",
      },
    }];
  }
  return [];
};

const lodgingRule: Rule = (cls) => {
  for (const c of cls) {
    if (!/\b(?:food|meals|accommodation|lodging|housing|living quarters|pagkain|tirahan)\b/i.test(c)) continue;
    if (!/\b(?:worker|employee|applicant|you|ikaw)\b[^.]{0,40}\b(?:shall pay|pays|will pay|must pay|magbabayad)|\bat (?:her|his|the worker'?s|your) (?:own )?expense|\bcharged to (?:the )?(?:worker|employee)|\bsariling gastos/i.test(c)) continue;
    if (has(NEGATION, c)) continue;
    return [{
      ruleId: "costs.food_lodging", severity: "red", evidence: c, citations: [CITATIONS.SEC_DXB_LODGING],
      title: { tl: "Ikaw ang pinagbabayad sa pagkain o tirahan", en: "You are made to pay for food or lodging" },
      detail: { tl: "Dapat libre mula sa employer ang maayos na tirahan at sapat na pagkain (o food allowance).", en: "The employer must provide suitable lodging and adequate food (or a food allowance) free of charge." },
    }];
  }
  return [];
};

const airfareRule: Rule = (cls) => {
  for (const c of cls) {
    if (!/\b(?:air ?fare|plane ticket|air ticket|ticket|pamasahe|transportation)\b/i.test(c)) continue;
    if (!/\b(?:worker|employee|applicant|you|ikaw)\b[^.]{0,40}\b(?:shall pay|pays|will pay|must pay|reimburse|magbabayad)|\bat (?:her|his|the worker'?s|your) (?:own )?expense|\bsariling gastos/i.test(c)) continue;
    if (has(NEGATION, c)) continue;
    return [{
      ruleId: "costs.airfare", severity: "red", evidence: c, citations: [CITATIONS.SEC_DXB_TRANSPORT],
      title: { tl: "Ikaw ang pinagbabayad sa plane ticket", en: "You are made to pay your airfare" },
      detail: { tl: "Dapat libre ang ticket papunta sa trabaho at pauwi pagkatapos ng contract.", en: "Transport to the job and back home at the end of the contract must be free." },
    }];
  }
  return [];
};

// ---------------------------------------------------------------- recruiter-post rules

const touristVisaRule: Rule = (cls) => {
  for (const c of cls)
    if (/\b(?:tourist|visit|visitor|turista)\s*visa\b/i.test(c) && !/\b(?:do not|don't|never|huwag|bawal)\b/i.test(c))
      return [{
        ruleId: "post.tourist_visa", severity: "red", evidence: c, citations: [CITATIONS.DMW_GMA_2026],
        title: { tl: "Tourist visa ang gagamitin pang-trabaho", en: "A tourist visa would be used for work" },
        detail: {
          tl: "Warning ng DMW: huwag tanggapin ang tourist visa para magtrabaho. Dapat working visa ang gamit mo.",
          en: "DMW warns: never accept a tourist visa for work. You need an employment (working) visa.",
        },
      }];
  return [];
};

const ewalletRule: Rule = (cls) => {
  for (const c of cls)
    if (/\b(?:gcash|g-cash|maya|paymaya|palawan|cebuana|western union|remitly)\b/i.test(c) && !/\b(?:never|do not|don't|huwag|hindi kami)\b/i.test(c))
      return [{
        ruleId: "post.ewallet_payment", severity: "red", evidence: c, citations: [CITATIONS.DMW_GCASH_2025],
        title: { tl: "Pinapabayad ka sa GCash o e-wallet", en: "You're asked to pay via GCash or an e-wallet" },
        detail: { tl: "Ayon sa DMW, red flag ng illegal recruitment kapag pinapabayad ka sa isang GCash number.", en: "DMW calls payment to a GCash number a red flag for illegal recruitment." },
      }];
  return [];
};

const fixerRule: Rule = (cls) => {
  for (const c of cls)
    if (/\b(?:fixers?|no need (?:for )?(?:an? )?agency|walang agency|direct hire,? no agency|travel agency)\b/i.test(c))
      return [{
        ruleId: "post.fixer", severity: "red", evidence: c, citations: [CITATIONS.DMW_FIXERS_2026],
        title: { tl: "May fixer o walang licensed agency", en: "Fixer or no licensed agency" },
        detail: { tl: "Warning ng DMW: huwag makipag-deal sa fixer, travel agency, o sa taong hindi authorized.", en: "DMW warns against fixers, travel agencies, or unauthorised representatives." },
      }];
  return [];
};

const chatOnlyRule: Rule = (cls, full) => {
  if (/\b(?:office|tanggapan)\b/i.test(full)) return [];
  for (const c of cls)
    if (/\b(?:pm (?:me|agad|lang|us)?|dm (?:me|us)|message (?:me|us)|inbox|telegram|whatsapp|viber|tiktok|facebook page only)\b/i.test(c))
      return [{
        ruleId: "post.chat_only", severity: "amber", evidence: c, citations: [CITATIONS.DMW_GMA_2026],
        title: { tl: "Sa chat o social media lang ang usapan", en: "Only through chat or social media" },
        detail: { tl: "Warning ng DMW: iwasan ang recruiter na sa Facebook, TikTok, Telegram, o WhatsApp lang nakikipag-deal.", en: "DMW warns against recruiters who only deal through Facebook, TikTok, Telegram, or WhatsApp." },
      }];
  return [];
};

const licenseRule: Rule = (_cls, full) => {
  if (/\b(?:DMW|POEA)[\s-]*(?:License|Lic\.?)|\bLicense No\b|\bDMW-\d/i.test(full)) return [];
  return [{
    ruleId: "post.no_license", severity: "amber", citations: [CITATIONS.DMW_GMA_2026],
    title: { tl: "Walang DMW license number", en: "No DMW license number shown" },
    detail: { tl: "I-check muna sa dmw.gov.ph kung licensed ang agency bago magbigay ng kahit anong documents o bayad.", en: "Check that the agency is DMW-licensed (dmw.gov.ph) before giving any documents or money." },
  }];
};

// ---------------------------------------------------------------- entry point

export type DocKind = "contract" | "post";

/** Structural signals of a contract (a passing mention of "Standard Employment Contract" in a post is not one). */
export function guessKind(text: string): DocKind {
  const signals = [
    /^\s*(?:STANDARD\s+)?(?:EMPLOYMENT\s+CONTRACT|CONTRACT\s+OF\s+EMPLOYMENT)/im,
    /\bthis (?:agreement|contract) is (?:made|entered)/i,
    /\bthe (?:employer|worker|employee|household service worker) shall\b/i,
    /\bname of (?:employer|worker|employee)\s*:/i,
  ];
  return signals.some((re) => re.test(text)) ? "contract" : "post";
}

const CONTRACT_RULES: Rule[] = [salaryRule, passportRule, restDayRule, hoursRule, placementFeeRule, deductionRule, lodgingRule, airfareRule, touristVisaRule, ewalletRule, fixerRule];
const POST_RULES: Rule[] = [touristVisaRule, ewalletRule, fixerRule, placementFeeRule, passportRule, salaryRule, chatOnlyRule, licenseRule];

const ORDER: Record<Severity, number> = { red: 0, amber: 1, green: 2 };

export function checkDocument(text: string, kind: DocKind = guessKind(text), cfg: RulesConfig = DEFAULT_RULES_CONFIG): Finding[] {
  const cls = clauses(text);
  const findings = (kind === "contract" ? CONTRACT_RULES : POST_RULES).flatMap((r) => r(cls, text, cfg));
  if (kind === "contract" && !findings.some((f) => f.ruleId.startsWith("salary.")))
    findings.push({
      ruleId: "salary.missing", severity: "amber", citations: [CITATIONS.ADV25_WAGE],
      title: { tl: "Walang malinaw na salary", en: "No clear salary stated" },
      detail: { tl: "Hindi namin makita ang monthly salary at currency. Dapat malinaw itong nakasulat sa contract.", en: "We couldn't find a monthly salary with a currency. It must be written clearly in the contract." },
    });
  return findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}
