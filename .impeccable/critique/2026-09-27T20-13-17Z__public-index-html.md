---
target: homepage (public/index.html)
total_score: 20
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/Snapforgelab/public/index.html"
target_fingerprint: "sha256:69a6eee33649979796f68523e1d864797acf79f476fe98ed16d2b6e5f61769bd"
target_path: /home/user/Snapforgelab/public/index.html
timestamp: 2026-09-27T20-13-17Z
slug: public-index-html
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score (Persuade, applicable max 32; n/a: 7, 10)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Form states OK; no active nav state |
| 2 | Match system / real world | 3 | "50/50", "Care", "MTD" unexplained; "we" vs solo founder |
| 3 | User control and freedom | 2 | $199 button jumps straight to paypal.me, no summary / next steps |
| 4 | Consistency and standards | 2 | 5 CTA labels for 2 actions; same-sounding CTAs go to different places |
| 5 | Error prevention | 2 | Payment without qualification |
| 6 | Recognition rather than recall | 3 | Credit/Care terms scattered across cards |
| 7 | Flexibility and efficiency | n/a | Single-visit marketing page |
| 8 | Aesthetic and minimalist design | 2 | 11 same-weight card sections |
| 9 | Error recovery | 3 | Keeps input, offers email; reason hidden |
| 10 | Help and documentation | n/a | Marketing surface |
| Total | | 20/32 (62%) | Acceptable |

## Design specificity
Copy specific; visuals category-interchangeable (dark SaaS template: glow, gradient H1 text, pulse pill, fake Acme dashboard mock, 6 icon-tile cards).
Detector: 43 CLI findings / 31 desktop / 32 mobile. Real: low-contrast (#fff on #2997ff 3.0:1, hover 2.5:1; --mute #6e6e73 3.7-4.0:1; placeholders 4.2:1). Style tells: icon-tile-stack x6, kicker-above-heading x9, dark-glow, gradient-text, gpt-thin-border-wide-shadow, radial-spotlight-glow, aphoristic-cadence. False positives: cramped-padding (.table-scroll), skipped-heading (footer h4), radial glow (intentional).

## Priority issues
- [P1] $199 review (primary conversion) buried as .hero-alt text link; [data-buy] sends straight to paypal.me with no pre-purchase step (buyers not told to invite hello@ to their Repl). Fix: two equal hero doors; confirmation step before PayPal; "Paid securely via PayPal". Commands: clarify, layout.
- [P1] No verifiable proof: monogram avatar, top-1% unlinked, fake Acme mock. Fix: anonymised Ship-Ready Review excerpt as hero visual (.sev tags), sample report link by the $199 card. Commands: shape, delight.
- [P2] CTA vocabulary inconsistent/dense (6 CTAs in pricing; "Ask about Care" gets build confirmation copy). Fix: 2 canonical labels, hidden interest field. Command: clarify.
- [P2] Length and sameness; pricing ~4 screens (desktop) / 8 (mobile) down; comparison after pricing. Fix: reorder hero→proof→pricing→how→compare→FAQ→form; compress pains and "What we build". Commands: distill, layout.
- [P2] Contrast failures and crowded mobile first viewport (3 blue CTAs). Fix: darker button blue or dark text; --mute ~#8a8a90; hide nav CTA on mobile when .m-cta visible; 44px footer targets. Commands: audit, adapt.

## Persona red flags
Jordan: H1 sells new builds; Sprint vs Review names blur; no post-PayPal instructions; How it works covers build only.
Riley: "we" vs solo; unverifiable scarcity counters; comparison tie row; ?paid=1 spoofable.
Casey: review is a small 2-line link; sticky CTA always to build form; paypal.me app bounce.

## Minor observations
Inline link colors without underline; static "live" green dot; no scroll hint on mobile table; desktop footer bottom padding; FAQ silent on Replit hosting costs.

## Questions
1. Why does the headline sell the build if the review is the front door?
2. Which artifact is uniquely yours (real audit excerpt) and why isn't it the hero?
3. Does a solo specialist gain from looking like a SaaS company?
