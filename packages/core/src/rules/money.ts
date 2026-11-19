// Salary extraction and USD conversion. Runs on-device, offline.
// Gulf currencies are pegged to USD (exact). Others are approximate reference rates and labelled as such.

export interface RateTable {
  asOf: string; // ISO date the rates were set
  /** units of currency per 1 USD */
  perUsd: Record<string, { rate: number; pegged: boolean }>;
}

export const DEFAULT_RATES: RateTable = {
  asOf: "2026-11-19",
  perUsd: {
    USD: { rate: 1, pegged: true },
    SAR: { rate: 3.75, pegged: true },
    AED: { rate: 3.6725, pegged: true },
    QAR: { rate: 3.64, pegged: true },
    BHD: { rate: 0.376, pegged: true },
    OMR: { rate: 0.3845, pegged: true },
    KWD: { rate: 0.307, pegged: false }, // basket peg; approximate
    HKD: { rate: 7.8, pegged: true }, // linked exchange rate band
    SGD: { rate: 1.3, pegged: false },
    MYR: { rate: 4.4, pegged: false },
    TWD: { rate: 32, pegged: false },
    PHP: { rate: 58, pegged: false },
  },
};

const CURRENCY_ALIASES: [RegExp, string][] = [
  [/^(?:USD|US\$|US \$|\$|DOLLARS?)$/i, "USD"],
  [/^(?:SAR|SR|RIYALS?|SAUDI RIYALS?)$/i, "SAR"],
  [/^(?:AED|DHS?|DIRHAMS?)$/i, "AED"],
  [/^(?:QAR|QR)$/i, "QAR"],
  [/^(?:KWD|KD)$/i, "KWD"],
  [/^(?:BHD|BD)$/i, "BHD"],
  [/^(?:OMR|RO)$/i, "OMR"],
  [/^(?:HKD|HK\$)$/i, "HKD"],
  [/^(?:SGD|S\$|SGD\$)$/i, "SGD"],
  [/^(?:MYR|RM)$/i, "MYR"],
  [/^(?:TWD|NT\$|NTD)$/i, "TWD"],
  [/^(?:PHP|₱|PESOS?|P)$/i, "PHP"],
];

export function normaliseCurrency(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, " ");
  for (const [re, code] of CURRENCY_ALIASES) if (re.test(t)) return code;
  return null;
}

const CUR = String.raw`(?:US\s?\$|HK\$|S\$|NT\$|USD|SAR|SR|AED|DHS?|QAR|QR|KWD|KD|BHD|BD|OMR|RO|HKD|SGD|MYR|RM|TWD|NTD|PHP|₱|\$)`;
const AMT = String.raw`(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)`;
const AMOUNT_RE = new RegExp(String.raw`(${CUR})\s?${AMT}|${AMT}\s?(${CUR}|riyals?|dirhams?|dollars?|pesos?)\b`, "gi");

export interface Money {
  amount: number;
  currency: string;
  text: string; // as written
  index: number;
}

export function findAmounts(text: string): Money[] {
  const out: Money[] = [];
  for (const m of text.matchAll(AMOUNT_RE)) {
    const curRaw = m[1] ?? m[4];
    const amtRaw = m[2] ?? m[3];
    const currency = curRaw ? normaliseCurrency(curRaw) : null;
    if (!currency || !amtRaw) continue;
    out.push({ amount: parseFloat(amtRaw.replace(/,/g, "")), currency, text: m[0], index: m.index! });
  }
  return out;
}

export function toUsd(m: Money, rates: RateTable = DEFAULT_RATES): { usd: number; exact: boolean } | null {
  const r = rates.perUsd[m.currency];
  if (!r) return null;
  return { usd: m.amount / r.rate, exact: r.pegged };
}

export type Period = "month" | "week" | "day" | "hour" | "unknown";
export function periodNear(text: string, from: number): Period {
  const w = text.slice(from, from + 60).toLowerCase();
  if (/\b(?:per|a|\/|kada|bawat)\s*(?:month|mo\b|buwan)|monthly|kada buwan/.test(w)) return "month";
  if (/\b(?:per|a|\/)\s*week|weekly|kada linggo/.test(w)) return "week";
  if (/\b(?:per|a|\/)\s*day|daily|kada araw/.test(w)) return "day";
  if (/\b(?:per|an|\/)\s*hour|hourly/.test(w)) return "hour";
  return "unknown";
}

export function monthlyUsd(usd: number, period: Period): number | null {
  switch (period) {
    case "month":
    case "unknown": // contracts state monthly salary by default
      return usd;
    case "week":
      return (usd * 52) / 12;
    default:
      return null; // day/hour rates can't be compared without hours/days worked
  }
}
