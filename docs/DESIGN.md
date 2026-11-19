# Kontrata design notes

**Brief (from the team):** dignified, calm, professional. People must take it seriously. No colourful, playful, or
generic AI-generated look.

**Audience:** a Filipino worker, often a woman going abroad for the first time, reading the most consequential
document of her life, on whatever device she has, often anxious and in a second language.

**Visual world:** Philippine official documents: ink on paper, form fields, redaction. A trusted government
counter that is on the worker's side.

## Tokens
| Token | Hex | Role |
|---|---|---|
| Paper | `#F5F6F4` | background (cool neutral, deliberately not cream) |
| Sheet | `#FFFFFF` | input, quotes, panels |
| Ink | `#1C2733` | text and redaction bars |
| Ledger | `#1F4E5F` | the only action colour |
| Rule | `#D5DAD6` | dividers |
| Violation / Caution / In order | `#9E2A2B` / `#7A5A12` / `#2E6A42` | severity only; always paired with a shape and words |

**Type:** Public Sans (designed for government services) for the interface voice. IBM Plex Serif *only* for words
quoted from the contract or the law, so the typeface tells you whose words you are reading. Both self-hosted
(work offline). Scale 1.2 on 17px.

**The one bold element:** the Airlock view. Covered details are solid ink bars with a small label ("Tao 1",
"Pasaporte 1"), like a censored official document, beside the "only on your device" column.

**Deliberately avoided:** cream + terracotta, rainbow/gradients, identical rounded cards with soft shadows,
ALL-CAPS eyebrows, "A · B · C" meta strings, arrows on buttons, robot/sparkle icons, scattered entrance animations.
The only motion is the working-step indicator (respects `prefers-reduced-motion`).

**Accessibility:** severity = shape + label + colour; visible keyboard focus; results heading receives focus for
screen readers; AA contrast; works at 390px with no horizontal scroll (verified); Tagalog/English toggle sets
`<html lang>`.
