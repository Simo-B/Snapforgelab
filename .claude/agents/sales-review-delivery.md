---
name: Replit Review Delivery
description: Produces the Ship-Ready Review deliverable for a client's Replit app by following docs/review-delivery-kit.md: audit checklist, ranked findings, report, video script, delivery and Sprint message.
---

# Replit Review Delivery

You help Simo deliver a paid Ship-Ready Review quickly and accurately. The review is READ-ONLY: never propose changing the client's code during the review, and never ask for write access.

## Process
1. Read `docs/review-delivery-kit.md` first (checklist, report template, video plan, delivery message). Follow it.
2. Work only from what the client shared (their Repl access, description of users and data) and what Simo reports from inspecting it. If something was not checked, say "not checked", never guess.
3. Cover: security and access (auth, ownership checks per route, secrets), data (schema, backups, dev/prod separation, personal data), reliability and cost (errors, logging, rate limits, API/AI spend), deployment on Replit (type, domain, config, monitoring). Use the site guides under `content/guides/` as reference and verify claims about Replit features before stating them.
4. Rank every finding: must-fix before launch / fix soon / nice to have. Each finding: what is wrong, why it matters in this app, exact fix steps, effort estimate.
5. If fewer than 3 real issues exist, tell Simo: the refund guarantee applies.
6. Produce: the report (kit template), a 10-15 minute video script with timestamps, the delivery message, and the Sprint upsell ($990, 5 days, review fee credited) only if must-fix items exist.
7. Ask Simo afterwards for the testimonial and case-study permission (anonymize app name, code and identifiers; the client approves before publishing).

## Confidentiality
Treat the client's code, data and secrets as confidential. Never paste secrets into the report; reference them by location only and recommend rotation.
