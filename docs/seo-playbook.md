# SEO Playbook : 90 jours « all-in »

## La thèse
Une seule niche, dominée à fond : **« Replit / Replit Agent → production »**.
- Faible concurrence : quelques blogs (axonbuild, vibeappscanner, shipai…) mais aucun acteur installé
- Intention d'achat forte : quelqu'un qui cherche « deploy replit app to production » a une app et un problème
- Chaque guide mène au même endroit : **Readiness Score (gratuit) → Review 199 $ → Sprint 990 $**

Réalisme : domaine neuf = premiers clics en 4–8 semaines sur la longue traîne, trafic réel à 3–6 mois.
Les moteurs IA (ChatGPT, Perplexity) peuvent citer plus tôt : d'où les blocs « Short answer », FAQ et `llms.txt`.

## Ce qui est en ligne (semaine 0)
| Page | Requête cible |
|---|---|
| `/guides/is-replit-production-ready/` | is replit production ready, replit for business apps |
| `/guides/replit-agent-security-checklist/` | replit agent security, replit security checklist |
| `/guides/deploy-replit-app-to-production/` | deploy replit app, replit production deployment |
| `/guides/replit-deployment-types/` | replit autoscale vs reserved vm |
| `/guides/replit-agent-keeps-breaking-app/` | replit agent broke my app, replit agent loop |
| `/guides/replit-production-database/` | replit production database, replit dev vs prod database |
| `/tools/replit-readiness-score/` | replit app checker, is my app production ready |
| `/replit-app-to-production/` | replit app review, fix replit app |
| `/hire-replit-developer/` | hire replit developer, replit expert |

## Publier un nouvel article (15 min une fois le texte écrit)
1. Copier un fichier de `content/guides/` → renommer `<slug>.html` (le slug = l'URL)
2. Modifier le bloc `<!--meta … -->` (title ≤ 65 car., description ≤ 160, tldr, faq, related)
3. `python3 scripts/build.py` → page + hub + sitemap + llms.txt mis à jour
4. Commit + push → Cloudflare déploie → Search Console → Inspection d'URL → « Demander l'indexation »

## Calendrier : 2 articles / semaine pendant 6 semaines
| Sem. | Article | Requête |
|---|---|---|
| 1 | Replit Agent pricing & how to cut your credit bill | replit agent cost, replit effort based pricing |
| 1 | Replit Secrets: how to store API keys safely | replit secrets, replit environment variables |
| 2 | Replit Auth vs Clerk vs Supabase Auth for business apps | replit authentication |
| 2 | How to connect a custom domain to Replit (+ Cloudflare) | replit custom domain |
| 3 | Replit vs Lovable vs Bolt for business apps | replit vs lovable, replit vs bolt |
| 3 | Build an internal dashboard on Replit from Google Sheets | replit dashboard, google sheets dashboard app |
| 4 | Replit app slow? Fix cold starts and slow queries | replit app slow, replit cold start |
| 4 | Stripe payments in a Replit app: the production checklist | replit stripe |
| 5 | Export your Replit app / move off Replit | replit export code, migrate from replit |
| 5 | Build a client portal on Replit | client portal builder |
| 6 | Replit Agent prompts that ship production code | replit agent prompts |
| 6 | Case study #1 (premier client, anonymisé si besoin) | preuve + E-E-A-T |

Règle : chaque article = une vraie réponse en haut (Short answer), du concret testable (code, étapes), 3 liens internes, 1–2 liens vers la doc officielle Replit, 1 CTA Review.

## Liens entrants (autorité) : 30 min / jour
1. **Readiness Score** = l'actif à faire circuler :
   - Post sur r/replit, r/vibecoding, r/SideProject, r/indiehackers : « I built a free readiness score for Replit apps »
   - Forum Replit (ask.replit.com) : réponses utiles + lien quand c'est pertinent
   - Product Hunt (lancement de l'outil), Indie Hackers, Hacker News (Show HN)
   - Annuaires d'outils IA / no-code (There's An AI For That, Futurepedia, etc.)
2. **Profils** qui pointent vers le site : X, LinkedIn, GitHub, Upwork, Contra, Crunchbase
3. **Partenaire Replit** : demander à figurer dans l'annuaire des partenaires avec lien
4. **Contenu invité** : proposer « The Replit Agent security checklist » à des newsletters no-code / vibe coding
5. **Réponses aux journalistes** (Qwoted, Featured.com) sur l'IA et le no-code

## Suivi hebdo (Search Console, 15 min le lundi)
| KPI | S4 | S8 | S12 |
|---|---|---|---|
| Pages indexées | 10 | 18 | 22 |
| Impressions / semaine | 200 | 1 500 | 5 000 |
| Clics / semaine | 5 | 40 | 150 |
| Readiness Scores complétés | 5 | 30 | 100 |
| Reviews vendues (cumul) | 1 | 5 | 12 |

- Requête avec beaucoup d'impressions mais position 8–20 → enrichir l'article (FAQ, section, exemple) et mettre à jour `updated`
- Page avec clics mais pas de conversion → renforcer le CTA / lien vers le Readiness Score

## E-E-A-T (ce qui fera la différence)
- **Mettre un vrai auteur** : prénom, photo, 2 lignes de bio, lien X/LinkedIn → dis-le-moi et je l'ajoute sur tous les guides (schema `Person`)
- Ajouter des **exemples réels** (captures, extraits anonymisés) dès les premières reviews
- Mettre à jour les guides quand Replit change (dates `updated` visibles)
