# Household service worker minimum salary: what we know (as of 2026-11-19)

## Primary sources (in this folder)
- **DMW Advisory No. 25-2025** (22 Aug 2025): minimum monthly wage "from USD 400 to at least USD 500", integrated
  into "all employment contracts processed by the DMW". Applies to new hires / renewed contracts "60 days after
  issuance" (≈ 21 Oct 2025).
- **DMW MC No. 03-2025** (7 Oct 2025): **six-month transition**; increases "may be applied voluntarily"; afterwards
  DMW "may either extend the transition period or mandate full compliance". Contracts under review before issuance
  follow previous guidelines.

## Secondary sources (news; conflicting on the Gulf)
| Date | Claim | Source |
|---|---|---|
| 16 Sep 2025 | After consultations in Doha on 11 Sep 2025, "the DMW decided not to impose the $500 floor on GCC countries" | Gulf News: https://gulfnews.com/special-reports/hiring-a-filipina-helper-it-now-costs-500month-but-it-stays-at-400month-for-gcc-1.500270822 |
| 23 Dec 2025 | DMW "eyeing to ramp up the voluntary adoption of the US$500 minimum wage … in the Middle East next year"; Saudi Arabia "expressed concern or rejected" it | BusinessMirror: https://businessmirror.com.ph/2025/12/23/dmw-pushes-500-minimum-wage-for-ofws-in-middle-east/ |
| 23 Dec 2025 | Saudi talks: "negotiations remain ongoing"; DMW will audit after six months | SunStar: https://www.sunstar.com.ph/manila/dmw-higher-domestic-worker-wage-rate-on-the-right-track |
| 23 Dec 2025 | DMW policy institute *proposed* bands by 2027 (US$600 / 565 / 500), a proposal, not a rule | BusinessMirror (same) |

**Not found:** any 2026 decision on the audit (extend vs. mandate). Searched 2026-11-19.

## What Kontrata does (honest, configurable)
| Salary | Result | Message (gist) |
|---|---|---|
| < US$400 | 🚩 Red | Below even the old 2006 minimum. |
| US$400–499 | ⚠️ Amber | Meets the old minimum; DMW raised the floor to **at least US$500** (Advisory 25-2025). In the Gulf, the US$500 floor was reported as not imposed / voluntary. Ask your agency. |
| ≥ US$500 | ✅ Green | Meets the current DMW minimum. |

Thresholds live in **Remote Config** (`hsw_min_salary_usd`, `hsw_old_min_salary_usd`) so they can change the day
DMW announces the audit outcome, without shipping a new app. Currency conversion to USD uses a dated reference rate
shown to the user.
