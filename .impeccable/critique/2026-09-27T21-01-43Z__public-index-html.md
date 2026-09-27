---
target: homepage (public/index.html)
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:/home/user/Snapforgelab/public/index.html"
target_fingerprint: "sha256:4654347d1f39838e44980e780194ea3b2aa1bd65a15996a446a15f56e254cee5"
target_path: /home/user/Snapforgelab/public/index.html
timestamp: 2026-09-27T21-01-43Z
slug: public-index-html
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score (Persuade, applicable max 32; n/a: 7, 10)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Book CTA jumps to another page unannounced |
| 2 | Match system / real world | 3 | "Repl", "read access", "/api/generate" unexplained |
| 3 | User control and freedom | 3 | Ask-before-you-pay and email escape; no mobile nav |
| 4 | Consistency and standards | 2 | Header CTA sells build; 24h vs 48h; two buy paths for review |
| 5 | Error prevention | 3 | Interest preselect, booking step |
| 6 | Recognition rather than recall | 3 | Price on every CTA |
| 7 | Flexibility | n/a | Marketing page |
| 8 | Aesthetic and minimalist | 2 | Still long; 4 offers at equal weight |
| 9 | Error recovery | 3 | Keeps input, email fallback |
| 10 | Help | n/a | Marketing page |
| Total | | 22/32 (69%) | Acceptable (from 20/32) |

## Design specificity
Hero example report is specific and honest; below the fold reverts to generic dark SaaS cards; report language not carried through.
Detector: CLI 2 (cramped-padding false positive; aphoristic-cadence "No X." closers). Browser: line-length ~86ch in FAQ payment answer (desktop); radial-spotlight-glow on .contact-box. Down from 43.

## Priority issues
- [P1] Header CTA sells secondary offer (Get a fixed-price plan); no persistent review CTA; no mobile header nav. Fix: header -> Book the $199 review, build as text link. clarify, layout.
- [P1] Review purchase has two parallel paths (booking page lower form "Request my review, $199"; homepage form review radio promising 24h vs 48h heading); Sprint button on booking page -> #contact not #book. Fix: #book the single path; lower form -> "Questions before you pay?"; unify timings. clarify, harden.
- [P1] Honesty drift: "In the apps we review" on offer page; top 1% not linked to proof on homepage; unsourced comparison cells. Fix: rewrite, link /about/, soften table. clarify.
- [P2] Long/uniform below hero; Care at equal weight; 3 filled blue CTAs; sticky CTA duplicates in-card button over pricing. Fix: Care one-liner, ghost "Get my score", hide sticky over #pricing, reuse report styling. distill, bolder.
- [P3] Duplicate "How it works" nav link (offer, hire pages); duplicate class attr on "All guides"; og:title pitches builds; refund micro-line under both doors. polish.

## Persona red flags
Jordan: Repl collaborator jargon; pay button below fold on mobile booking; 3 manual post-payment steps.
Riley: 24h vs 48h; "we review"; unlinked top 1%; unverifiable spots; duplicate nav link.
Casey: no mobile nav; sticky CTA duplicates on pricing; partial comparison table.

## Minor observations
Hero lede 36ch -> 5 lines; .plan .for min-height gaps; founding banner duplicates badge; footer blurb omits review.

## Questions
1. Does the homepage need to sell build, retainer, quiz and guides at equal weight?
2. Open payment in-page next to the example report?
3. Carry the report's visual language through the whole page?
