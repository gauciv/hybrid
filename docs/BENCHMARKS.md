# On-device benchmarks (Gemini Nano via Firebase AI Logic, Chrome)

Hardware: ASUS TUF gaming laptop (Chrome "device performance class: Medium"), 2026-11-19.
Input: the 10-line demo contract in `apps/web/src/RedactionLab.tsx` (2 unlabeled names + 1 address).
Ground truth: `Hamad Al-Kuwari`, `Liza Mendoza`, `Street 12, Al Wakra, Doha`.

| Variant | Output format | Types asked | Input | Run 1 | Run 2 | Found (run 1 / run 2) | Verdict |
|---|---|---|---|---|---|---|---|
| A (original) | JSON (schema-constrained) | all 5 | full text | 4,984 ms | 3,830 ms | missed Liza / missed Liza | needs_review |
| B | JSON | PERSON, ADDRESS | filtered lines | 2,758 ms | 3,845 ms | 3/3 / 3/3 + agency mis-tagged as PERSON | safe |
| **C (chosen)** | **`TYPE \| text` lines** | **PERSON, ADDRESS** | **filtered lines** | **1,336 ms** | **1,356 ms** | **3/3 / 3/3** | **safe** |
| D | lines | PERSON, ADDRESS | full text | 2,513 ms | 2,403 ms | 3/3 / 3/3 | safe |

Earlier single runs of the original variant took 23.8 s (first, cold) and 18.6 s.

**Findings**
1. Schema-constrained JSON was the slowest and the *least consistent* on-device; plain line output was ~2–3× faster and stable.
2. Only sending lines that can contain a name (`selectNerLines`) roughly halves latency (C vs D).
3. Narrowing the task to PERSON + ADDRESS (phones, emails, IDs are already caught deterministically) improved accuracy.
4. Net: **~14× faster than the first measurement, with better recall.** Every variant still passes through the same
   validation, leak gate, and always-on model-free name scan, so speed did not trade away safety.

For comparison, the cloud round-trip for a one-sentence prompt was 2–30 s (variable) in our tests.
