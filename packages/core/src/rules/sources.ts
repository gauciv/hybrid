// Every rule cites one of these. Quotes are verbatim from files in docs/sources/ (see SOURCES.csv).
// The app shows the quote and the file so a worker (or a judge) can check it.

export interface Citation {
  id: string;
  title: string;
  file: string; // path under docs/sources/
  quote: string; // verbatim
}

export const CITATIONS = {
  ADV25_WAGE: {
    id: "ADV25_WAGE",
    title: "DMW Advisory No. 25, s. 2025 (22 Aug 2025), item 1",
    file: "rules/DMW-ADVISORY-25-2025.txt",
    quote: "the Department shall implement an increase in the minimum monthly wage for Filipino domestic workers from USD 400 to at least USD 500",
  },
  MC03_TRANSITION: {
    id: "MC03_TRANSITION",
    title: "DMW Memorandum Circular No. 03, s. 2025 (7 Oct 2025), section IV",
    file: "rules/DMW-MC-03-2025.txt",
    quote: "a six (6)-month transition period to gradually adjust salaries for domestic workers earning less than USD 500 per month. During this transition period, wage increases may be applied voluntarily.",
  },
  ADV25_PASSPORT: {
    id: "ADV25_PASSPORT",
    title: "DMW Advisory No. 25, s. 2025, item 8",
    file: "rules/DMW-ADVISORY-25-2025.txt",
    quote: "passports are the property of the Philippine Government and must remain with the worker at all times … Employers, recruiters, and third parties are prohibited from withholding passports except for justified purposes such as visa stamping, after which they must be promptly returned.",
  },
  SEC_SG_PASSPORT: {
    id: "SEC_SG_PASSPORT",
    title: "Standard Employment Contract for HSW (Singapore), clause 15(e)",
    file: "contracts/sec-hsw-singapore-polo-2019.txt",
    quote: "It shall be unlawful for the Employer to hold or withhold the Helper’s passport with or without his/her consent.",
  },
  ADV25_REST_DAY: {
    id: "ADV25_REST_DAY",
    title: "DMW Advisory No. 25, s. 2025, item 8",
    file: "rules/DMW-ADVISORY-25-2025.txt",
    quote: "the Standard Employment Contract (SEC) for domestic workers to guarantee decent accommodation, adequate living conditions, and at least one full rest day per week",
  },
  SEC_DXB_REST: {
    id: "SEC_DXB_REST",
    title: "Standard Employment Contract for HSW (UAE, 2023), clauses 4–5",
    file: "contracts/sec-hsw-dubai-2023.txt",
    quote: "The Household Service Worker shall be provided with continuous rest of at least eight (8) hours per day. 5) Rest Day: At least one (1) rest day per week.",
  },
  SEC_DXB_LODGING: {
    id: "SEC_DXB_LODGING",
    title: "Standard Employment Contract for HSW (UAE, 2023), clause 7",
    file: "contracts/sec-hsw-dubai-2023.txt",
    quote: "The Employer shall furnish the Household Service Worker, free of charge, separate, suitable and sanitary living quarters as well as adequate food or food allowance.",
  },
  SEC_DXB_DEDUCTION: {
    id: "SEC_DXB_DEDUCTION",
    title: "Standard Employment Contract for HSW (UAE, 2023), clause 15(c)",
    file: "contracts/sec-hsw-dubai-2023.txt",
    quote: "The Employer shall not deduct any amount from the regular salary of the Household Service Worker other than compulsory contributions prescribed by law.",
  },
  SEC_DXB_TRANSPORT: {
    id: "SEC_DXB_TRANSPORT",
    title: "Standard Employment Contract for HSW (UAE, 2023), clause 6",
    file: "contracts/sec-hsw-dubai-2023.txt",
    quote: "Free transportation to the site of employment and back to the point of origin upon expiration of contract or when contract of employment is terminated through no fault of the Household Service Worker",
  },
  SEC_SG_FEES: {
    id: "SEC_SG_FEES",
    title: "Employer's undertaking, HSW contract package (Singapore), items 1–2",
    file: "contracts/sec-hsw-singapore-polo-2019.txt",
    quote: "That I will shoulder all expenses to be incurred in hiring … including recruitment agency fees, if applicable; That I shall not allow the deduction of any amount from the monthly salary/wages of above-named HSW as placement fee or refund of expenses and agency fees",
  },
  DMW_GMA_2026: {
    id: "DMW_GMA_2026",
    title: "DMW warning via GMA News, 4 May 2026",
    file: "real-samples/recruiter-red-flags.md",
    quote: "Avoid transacting with persons operating only through Facebook, Tiktok, Telegram, WhatsApp, or other unofficial channels. … Never pay placement fees without a valid employment contract and official receipt. … Do not accept arrangements involving tourist visas for employment purposes.",
  },
  DMW_GCASH_2025: {
    id: "DMW_GCASH_2025",
    title: "DMW Usec. Bernard Olalia via Daily Tribune, 3 Jun 2025",
    file: "real-samples/recruiter-red-flags.md",
    quote: "they'll send a GCash number where you're expected to send payment.",
  },
  DMW_FIXERS_2026: {
    id: "DMW_FIXERS_2026",
    title: "DMW warning via GMA News, 4 May 2026",
    file: "real-samples/recruiter-red-flags.md",
    quote: "Do not transact with travel agencies, fixers, or unauthorized representatives offering overseas jobs",
  },
} as const satisfies Record<string, Citation>;

export type CitationId = keyof typeof CITATIONS;
