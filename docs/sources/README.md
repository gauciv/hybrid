# Source material

Kontrata must reason from **real, official documents**, never from what a model "remembers".
Every rule the app enforces should cite a file in this folder.

Prefer official `dmw.gov.ph` / `*.dmw.gov.ph` / `dfa.gov.ph` / `officialgazette.gov.ph` / `lawphil.net` sources.
Note the download date and URL in `SOURCES.csv` (one row per file).

## 1. `contracts/`: Standard Employment Contracts (the "golden" reference)

The app compares a worker's contract against these clause by clause.

| File | Where | Notes |
|---|---|---|
| HSW standard contract (Singapore, 2022) | https://mwosingapore.dmw.gov.ph/wp-content/uploads/2023/10/Standard-Employment-Contract-HSW2022.pdf | Household service workers, direct-hire |
| HSW standard contract, agency-hired (Singapore) | https://mwosingapore.dmw.gov.ph/wp-content/uploads/2023/10/Standard-Employment-Contract-HSW-AGENCY.pdf | Agency version |
| HSW standard contract (Milan, 2025) | https://mwomilan.dmw.gov.ph/wp-content/uploads/2025/01/SEC_HSW_.pdf | Newest one found |
| HSW standard contract (Tokyo, .doc) | https://mwotokyo.dmw.gov.ph/wp-content/uploads/2023/01/HSW-Standard-Employment-Contract.doc | Word format |
| DMW blank SEC (via DFA Guangzhou) | https://guangzhoupcg.dfa.gov.ph/images/Consular2023/DMW_Standard_Employment_Contract_blank_form.pdf | Generic blank form |
| Professional / skilled worker, agency-hired (Osaka) | https://mwoosaka.dmw.gov.ph/wp-content/uploads/2024/01/Agency-hired-EMPLOYMENT-CONTRACT-PROFESSIONAL-FORM-03.pdf | Non-HSW comparison |

**Priority destinations:** Saudi Arabia, Kuwait, UAE, Qatar, Hong Kong, Singapore. Most HSWs go there.
Look on each Migrant Workers Office (MWO) site (`mwo<city>.dmw.gov.ph`) for that country's SEC.
Saudi Arabia / Kuwait / UAE versions matter most. Grab them if you can find them.

## 2. `agencies/`: Licensed agency registry

- DMW **Licensed Recruitment Agencies** search on https://dmw.gov.ph (Landbased + Seabased).
  If there's an export/list page, save it (CSV/PDF/HTML). If it's search-only, save
  screenshots of how results look + 10–20 example rows incl. statuses
  (`Valid`, `Delisted`, `Cancelled`, `Suspended`, `Forever Banned`).
- DMW lists of **banned / cancelled agencies** and **illegal recruitment advisories**, if published.
- DMW "whitelist" for Saudi Arabia / Kuwait (news: https://philstar.com/headlines/2024/12/05/2405227/dmw-makes-whitelist-recruitment-agencies-saudi-arabia-kuwait). Find the original list.

## 3. `rules/`: The law behind each red flag

| What | Why we need it |
|---|---|
| **RA 8042** (Migrant Workers Act) as amended by **RA 10022** | Definition of illegal recruitment, prohibited practices |
| **RA 11641** (DMW charter) | DMW's mandate |
| **DMW Memorandum Circular 09-2022** (or current rule on HSW deployment) | Zero placement fee for HSWs |
| **2016 / current POEA–DMW Revised Rules on recruitment of landbased workers** | Allowed fees, prohibited acts, contract substitution |
| DMW advisory: **"20 mortal sins" of recruiters** (news: https://www.sunstar.com.ph/manila/local-news/dmw-bares-20-mortal-sins-for-recruiters) | Find the original DMW issuance. It's a ready-made red-flag checklist |
| Current **minimum monthly salary for HSWs** (historically US$400; verify the current figure) | Salary check |
| Host-country basics (optional): Saudi domestic worker regulation, Kuwait Law 68/2015, HK Standard Employment Contract (ID 407) | Rest day, hours, passport retention |

## 4. `real-samples/`: Real-world material (most important for judges)

- 3–5 **real recruiter posts** from Facebook groups / pages (screenshots). **Blur or crop personal data before saving.**
- 1–3 **real contracts** shared with consent from OFWs or their families. **Redact personal data first**, or keep them out of git (see below).
- Notes from **2–3 short interviews** with OFWs / family members: what confused them, what tricked them, what they wish they'd known. Their exact words → UI copy + demo video.

> ⚠️ Privacy: anything containing a real person's data must be redacted *before* it goes in this folder,
> because the repo is public. If you want to keep unredacted originals for testing, put them in
> `docs/sources/private/` (git-ignored).

## Checklist

- [ ] At least 3 standard contracts (incl. 1 Middle East destination)
- [ ] Agency registry sample with mixed statuses
- [ ] RA 8042/10022 + placement-fee rule + minimum HSW salary source
- [ ] "20 mortal sins" original issuance
- [ ] 3+ real recruiter posts (redacted)
- [ ] 1+ real contract (redacted, with consent)
- [ ] Interview notes
- [ ] `SOURCES.csv` filled in (file, url, date_downloaded, notes)
