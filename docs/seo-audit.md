# Audit SEO : snapforgelab.com

*Audit réalisé le 27 septembre 2026 à partir du code source (`public/`, `content/guides/`, `scripts/build.py`). Le site en ligne n'a pas pu être consulté depuis cet environnement, et aucune donnée Search Console ni analytics n'était disponible.*

**Légende :** **[Vérifié]** = constaté dans le code ou dans les résultats de recherche web du 27/09/2026. **[Déduit]** = raisonnement ou bonne pratique, à confirmer sur le site en ligne ou dans la Search Console. Aucun volume de recherche ni aucune position n'est inventé. Les « SERP » ci-dessous viennent de l'outil WebSearch (index US), pas d'une capture Google : l'ordre des résultats est indicatif.

Ce document complète `docs/seo-playbook.md` sans le répéter. Le playbook couvre déjà le calendrier éditorial des semaines 1 à 6, les liens entrants de base (Reddit, Product Hunt, annuaires, profils), les KPI hebdomadaires et Crawler Hints.

---

## 1. Résumé : les 10 actions prioritaires

Classement par rapport impact / effort, les gains rapides d'abord.

| # | Action | Pourquoi | Effort | Impact |
|---|---|---|---|---|
| 1 | **Vérifier la mention « Replit Solution Partner »** (accueil l.43, 120, 430 ; `build.py` l.108 et l.290 ; toutes les pages). Si Snapforge Lab n'est pas listé officiellement, remplacer par « Independent Replit specialist ». | [Vérifié] Replit a lancé un programme officiel appelé **Solution Partner Program** le 28/05/2026. Il vise l'entreprise, avec Accenture, Slalom et Hexaware comme partenaires fondateurs. Revendiquer ce titre sans en faire partie pose un risque de confiance (E-E-A-T, vérification par les IA) et un risque de marque. Si vous êtes bien partenaire, ajoutez un lien vers votre fiche : ce serait votre meilleur backlink. | 15 min | Critique |
| 2 | **Vérifier que Cloudflare ne bloque pas les crawlers IA**, puis inscrire le site sur **Bing Webmaster Tools** (import depuis la GSC) et y soumettre le sitemap. | [Déduit] Cloudflare propose « Block AI bots » et un robots.txt géré qui peut s'ajouter devant le vôtre. ChatGPT Search et Copilot s'appuient sur l'index Bing. Si GPTBot, OAI-SearchBot, PerplexityBot ou ClaudeBot sont bloqués, l'objectif « moteurs IA » ne peut pas être atteint. | 30 min | Critique |
| 3 | **Installer un outil d'analytics.** `main.js` l.52 et le quiz l.220 appellent `window.plausible`, mais aucune page ne charge de script Plausible. | [Vérifié] Aujourd'hui, rien ne mesure les leads, les scores du quiz ni le trafic venant de chatgpt.com ou perplexity.ai. Ajoutez Plausible ou Cloudflare Web Analytics (gratuit, sans cookie). | 10 min | Élevé |
| 4 | **Retirer `data-buy="review"` du CTA des guides** (`build.py` l.141) **et de l'outil** (`tools/.../index.html` l.93). | [Vérifié] Le JS réécrit ces liens vers `paypal.me`. Conséquence : chaque guide perd son lien interne vers la page offre (Google exécute le JS), et un visiteur froid arrive sur PayPal sans avoir vu l'offre. | 5 min | Élevé |
| 5 | **Supprimer la cannibalisation entre l'accueil et `/hire-replit-developer/`**, et raccourcir les titres (11 pages sur 15 dépassent 60 caractères). | [Vérifié] Le title de l'accueil commence par « Replit Developer… », qui est le mot-clé principal de la page hire. Les titres de 70 à 86 caractères sont coupés dans les SERP. | 45 min | Élevé |
| 6 | **Désactiver `*.workers.dev` et les URL de preview** (`wrangler.jsonc` : `"workers_dev": false, "preview_urls": false`). Vérifier aussi la redirection 301 de www vers l'apex. | [Vérifié] Le worker `proud-truth-105e` est servi par défaut sur workers.dev, ce qui crée un site dupliqué. Le canonical limite le risque sans le supprimer. | 10 min | Moyen |
| 7 | **Mettre les 12 questions du Readiness Score en HTML statique** au lieu de les générer en JS (l.146-168). | [Vérifié] Sans JS, `<div id="questions">` est vide. La plupart des crawlers IA n'exécutent pas le JS, donc l'actif principal du site est invisible pour eux. | 1 h | Élevé |
| 8 | **Mettre les contenus à jour sur 3 points :** (a) le **Replit Security Agent / Project Security Center**, absent de la page offre et du guide sécurité ; (b) **Lovable Cloud et Bolt Cloud**, que le comparatif ne mentionne pas ; (c) le **health check de 5 secondes** au publish. | [Vérifié par recherche] Les prospects vont demander « pourquoi payer 199 $ si Replit scanne gratuitement ? ». Le tableau du comparatif est dépassé : Lovable et Bolt ont désormais un backend intégré. | 2-3 h | Élevé |
| 9 | **Kit E-E-A-T :** nom complet, photo, liens `sameAs` (LinkedIn, X, GitHub, profil Replit), preuve du « top 1 % », un **exemple de rapport** de review anonymisé, et les pages légales (confidentialité, mentions légales, CGV/remboursement). | [Vérifié] L'auteur s'appelle seulement « Simo », avec un avatar « S ». Aucune preuve, aucun cas client, aucune page légale alors que les formulaires collectent des e-mails (RGPD). | 1 jour | Élevé |
| 10 | **Nettoyer les métadonnées :** `lastmod` sur toutes les URL du sitemap, `og:image:alt`, `og:type` correct, BreadcrumbList sur le hub, FAQ et contenu supplémentaire sur la page hire. | [Vérifié] Voir le détail en section 2. | 1-2 h | Moyen |

---

## 2. SEO technique

### 2.1 Titles et meta descriptions

Longueurs comptées à la main (±2 caractères). Au-delà d'environ 60 caractères, Google coupe souvent le titre.

| Page (fichier : ligne) | Title actuel | Car. | Title proposé | Car. |
|---|---|---|---|---|
| Accueil `public/index.html:6` | Replit Developer for Business Apps — Fixed Price, Live in Days \| Snapforge Lab | ~78 | `Snapforge Lab: Replit Experts for Production-Ready Apps` | 55 |
| Offre `public/replit-app-to-production/index.html:6` | Make Your Replit Agent App Production-Ready — $199 Review \| Snapforge Lab | ~73 | `Replit Agent App Review: Production-Ready in 48h ($199)` | 55 |
| Hire `public/hire-replit-developer/index.html:6` | Hire a Replit Developer — Fixed-Price Business Apps \| Snapforge Lab | ~67 | `Hire a Replit Developer: Fixed-Price Apps, Live in 7 Days` | 57 |
| About `public/about/index.html:6` | About Simo, Founder of Snapforge Lab (Top 1% Replit Agent User) | ~63 | OK. Ajouter le nom de famille dès que possible : `Simo [Lastname], Replit Agent Expert \| Snapforge Lab` | ≤60 |
| Outil `public/tools/replit-readiness-score/index.html:6` | Replit Readiness Score: Is Your App Production-Ready? (Free) | ~60 | `Replit Readiness Score: Free 2-Minute App Checker` (évite le chevauchement avec le guide « Is Replit production-ready ») | 49 |
| Hub `scripts/build.py:252` | Replit Guides: Take Your Replit Agent App to Production \| Snapforge Lab | ~71 | `Replit Guides: Ship Your Replit Agent App to Production` | 55 |
| `content/guides/is-replit-production-ready.html:5` | Is Replit Production-Ready in 2026? An Honest Answer for Business Apps \| Snapforge Lab | ~86 | `Is Replit Production-Ready for Business Apps? (2026)` | 51 |
| `…/replit-agent-security-checklist.html:5` | Replit Agent Security Checklist: 15 Checks Before Launch \| Snapforge Lab | ~72 | `Replit Agent Security Checklist: 15 Checks Before Launch` | 56 |
| `…/deploy-replit-app-to-production.html:5` | How to Deploy a Replit App to Production: Step-by-Step (2026) \| Snapforge Lab | ~77 | `How to Deploy a Replit App to Production (2026 Guide)` | 53 |
| `…/replit-deployment-types.html:5` | Replit Autoscale vs Reserved VM vs Static vs Scheduled \| Snapforge Lab | ~70 | `Replit Autoscale vs Reserved VM vs Static vs Scheduled` | 54 |
| `…/replit-agent-keeps-breaking-app.html:5` | Replit Agent Keeps Breaking Your App? How to Stop the Fix Loop \| Snapforge Lab | ~78 | `Replit Agent Keeps Breaking Your App? Stop the Fix Loop` | 55 |
| `…/replit-production-database.html:5` | Replit Dev vs Production Database: How Not to Lose Data \| Snapforge Lab | ~71 | `Replit Dev vs Production Database: Don't Lose Data` | 50 |
| `…/replit-agent-costs.html:5` | Replit Agent Costs: 12 Ways to Cut Your Bill (Effort-Based Pricing) \| Snapforge Lab | ~84 | `Replit Agent Costs: 12 Ways to Cut Your Bill (2026)` | 51 |
| `…/replit-secrets-api-keys.html:5` | Replit Secrets: How to Store API Keys Safely (2026 Guide) \| Snapforge Lab | ~73 | `Replit Secrets: How to Store API Keys Safely \| Snapforge Lab` | 60 |
| `…/replit-vs-lovable-vs-bolt.html:5` | Replit vs Lovable vs Bolt for Business Apps (2026): Which to Choose \| Snapforge Lab | ~83 | `Replit vs Lovable vs Bolt for Business Apps (2026)` | 50 |

**Règle à coder dans `build.py`** : n'ajouter la marque que s'il reste de la place. Google affiche déjà le nom du site grâce au schema `WebSite`.
```python
def full_title(t):
    return t if "Snapforge" in t or len(t) + 16 > 60 else f"{t} | Snapforge Lab"
# puis dans build_guide : head(full_title(g["title"]), ...)
```

**Meta descriptions trop longues** (visez 150-155 caractères) :

| Fichier : ligne | Proposition |
|---|---|
| `index.html:7` (~162) | `Replit experts for small teams: we review, fix and ship Replit Agent apps, and build new business apps at fixed prices from $199. You own the code.` |
| `replit-app-to-production/index.html:7` (~213) | `Built an app with Replit Agent? We audit security, auth, data and deployment, then send a prioritized fix list in 48h. $199, refund guarantee.` |
| `hire-replit-developer/index.html:7` (~228) | `Hire a Replit developer without the hourly meter. Dashboards, CRMs, portals and AI assistants on your own Replit account. Fixed price, live in ~7 days.` |
| `replit-agent-security-checklist.html:8` (~196) | `15 security checks for Replit Agent apps before launch: secrets, authorization, validation, data, dependencies and costs, with how to test and fix each.` |
| `replit-deployment-types.html:8` (~196) | `Autoscale, Reserved VM, Static or Scheduled? How each Replit deployment type works, cold starts, background jobs and costs, plus a 30-second decision tree.` |
| `replit-production-database.html:8` (~200) | `How Replit's dev and production databases work, what Agent can't touch, how schema changes reach production, and 5 habits to never lose customer data.` |

Les autres guides font entre 165 et 190 caractères. C'est acceptable, mais à raccourcir lors de leur prochaine mise à jour.

### 2.2 Constats page par page

| Page | Constat | Correction |
|---|---|---|
| **Accueil** | Le H1 « Your business app, live on Replit in days » vise la création d'apps neuves, alors que le positionnement est « Replit → production ». Plusieurs H2 ne disent rien du sujet : « A product, not a project. » (l.232), « Questions, answered. » (l.383), « Fixed prices. Published up front. » (l.247). | H1 (option) : `Replit apps, built right and shipped to production.` H2 : `How a fixed-price Replit build works`, `Replit development pricing, published up front`, `Replit app development FAQ`. |
| Accueil | Le seul lien vers `/hire-replit-developer/` est dans le footer. | Dans `#what .sub` (l.192), ajouter : `Need a hands-on developer? <a href="/hire-replit-developer/">Hire a Replit developer</a>.` |
| Accueil (schema) | `ProfessionalService` est un sous-type de LocalBusiness, et il manque `address`. Le même `@id #org` est typé `Organization` dans les guides. | Passer à `"@type": "Organization"` (garder `hasOfferCatalog` et `founder`), ajouter `sameAs: [...]` et `contactPoint`. |
| Accueil / offre | Le prix barré `$199<s>$390</s>` (l.257, et l.114 sur l'offre) avec « 10 launch spots ». | [Déduit] Si l'offre n'a jamais été vendue 390 $, ce prix barré pose problème : risque juridique (directive européenne Omnibus, règles FTC sur les faux prix de référence) et perte de confiance. Remplacer par `Launch price` sans prix barré. |
| **Offre** `/replit-app-to-production/` | `og:type="article"` (l.13) sur une page de service. `og:image:alt` absent. Les `Offer` du schema n'ont pas d'`url`. | `og:type` → `website`. Ajouter `"url": "https://snapforgelab.com/replit-app-to-production/#pricing"` aux deux `Offer`. |
| Offre | La première question de la FAQ, « Is an app built with Replit Agent production-ready? » (l.48 et 135), reprend la requête du guide `is-replit-production-ready` (cannibalisation). Et aucune mention du **Replit Security Agent**. | Remplacer la question par `How is this different from Replit's Security Agent scan?`. Réponse proposée : `Security Agent is a great first pass on code-level vulnerabilities. It doesn't know your business rules, test multi-user data access end to end, check your production database, backups, costs or deployment setup. We run it too, then review what it can't see.` Ajouter à la fin de la réponse un lien vers le guide « Is Replit production-ready? ». |
| Offre | Aucune preuve : pas d'exemple de rapport, pas de chiffres, pas de témoignage. | Ajouter une section `See a sample report` (PDF ou page anonymisée) : c'est l'argument de conversion et d'E-E-A-T le plus fort. |
| **Hire** | Page légère (~600 mots), sans FAQ ni tableau de prix. `og:type="article"`. C'est pourtant la seule page qui vise une requête commerciale dominée par Upwork et Toptal. | Ajouter une FAQ + schema FAQPage : `How much does it cost to hire a Replit developer?`, `Freelancer on Upwork or a fixed-price studio?`, `Can you take over an app built with Replit Agent?`, `Do you sign an NDA?`. Ajouter une section `Recent builds` dès le premier client. |
| **About** | Le schema `Person` n'a ni `image`, ni `sameAs`, ni nom de famille. `twitter:title` et `twitter:description` manquent (l.19-20). Le « top 1 % » n'est pas prouvé. | Ajouter une photo réelle (`/assets/simo.jpg`, en WebP, avec `alt="Simo, founder of Snapforge Lab"`), les `sameAs` (LinkedIn, X, GitHub, profil Replit) et une capture ou un lien qui prouve le « top 1 % ». |
| **Outil** | Les questions ne sont générées qu'en JS. Pas de FAQ. Le title chevauche celui du guide « Is Replit production-ready ». | Écrire les 12 `<fieldset>` en HTML dans `#questions` et garder le JS pour le calcul. Ajouter `"isAccessibleForFree": true` au `WebApplication`. Ajouter 3 FAQ (`What does the score check?`, `Is my data sent anywhere?`, `Score vs a code review?`). |
| **Hub** `/guides/` | Pas de BreadcrumbList. Title long (voir 2.1). | Dans `build_hub` (`build.py` l.232), ajouter au `@graph` : `{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":SITE+"/"},{"@type":"ListItem","position":2,"name":"Guides","item":url}]}` |
| **Guides** (template) | Le fil d'Ariane visible affiche le kicker (« Is Replit ready? ») alors que le schema affiche le H1 : léger décalage. | Utiliser la même valeur, par exemple le H1 raccourci ou un champ `crumb` dans le bloc meta. |
| Guides | `AUTHOR_LD` (`build.py` l.122-125) : nom limité à « Simo », sans `image` ni `sameAs`. | Ajouter `"image": SITE+"/assets/simo.jpg"` et `"sameAs": ["https://www.linkedin.com/in/…","https://x.com/…","https://github.com/…","https://replit.com/@…"]`. |
| 404 | `noindex`, liens vers l'accueil et les guides. | OK. |

### 2.3 Maillage interne et pages orphelines

- **Aucune page orpheline** : les 15 URL sont dans le sitemap et le hub. [Vérifié]
- **Pages faiblement liées :** `replit-secrets-api-keys` et `replit-vs-lovable-vs-bolt` n'apparaissent dans aucune liste `related`. Elles ne reçoivent que 1 ou 2 liens depuis le corps des autres guides.
  - `content/guides/replit-agent-security-checklist.html:22` → `"related": ["replit-secrets-api-keys", "deploy-replit-app-to-production", "replit-production-database"]`
  - `content/guides/is-replit-production-ready.html:22` → `"related": ["replit-vs-lovable-vs-bolt", "replit-agent-security-checklist", "deploy-replit-app-to-production"]`
- **Aucun guide ne pointe vers `/hire-replit-developer/`.** Deux ajouts proposés :
  - `replit-agent-keeps-breaking-app.html:68`, en fin de paragraphe : `…or <a href="/hire-replit-developer/">hire a Replit developer</a> for a fixed price.`
  - `replit-vs-lovable-vs-bolt.html:74` : `Need it built for you? <a href="/hire-replit-developer/">Hire a Replit developer</a>.`
- **CTA des guides réécrit vers PayPal** : voir l'action 4. Dans `build.py` l.141, remplacer
  `<a href="/replit-app-to-production/" class="btn p" data-buy="review">Get my review</a>`
  par
  `<a href="/replit-app-to-production/" class="btn p">See the $199 review</a>`
  Même correction dans `public/tools/replit-readiness-score/index.html:93`.
- **Mobile** : `.nav-links{display:none}` sous 680 px (`styles.css:225`), sans menu de remplacement. Sur mobile, on n'atteint Guides et Pricing que par le footer. Ajouter au moins un lien « Guides » visible ou un petit menu. C'est un problème d'UX plus que de crawl, car les liens restent dans le DOM.

### 2.4 Sitemap, robots, llms.txt, headers, doublons

| Élément | Constat | Correction |
|---|---|---|
| `sitemap.xml` | Les pages statiques et `/guides/` n'ont pas de `lastmod`. `priority` est ignoré par Google. | Dans `build.py`, transformer `STATIC_PAGES` en `(path, priority, lastmod)` (par exemple `("/", "1.0", "2026-09-27")`), puis utiliser ce `lastmod` dans `build_sitemap` (l.276). Mettre à jour la date uniquement en cas de vrai changement. |
| `robots.txt` | `Allow: /` pour tous, sitemap déclaré. | OK côté fichier. **À vérifier en ligne** avec `curl https://snapforgelab.com/robots.txt` : Cloudflare peut y injecter son robots.txt géré ou des directives `Content-Signal`. Dans le dashboard, vérifier **Security → Bots → Block AI bots = Off** et **AI Crawl Control**, en autorisant au minimum OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot/Claude-User et Bingbot. |
| `llms.txt` | Bien structuré. Répète « Replit Solution Partner » (voir l'action 1). | Voir la section 7. |
| `_headers` | `/assets/*` est mis en cache 1 jour alors que les fichiers sont versionnés (`?v=6`). `/og/*` n'a pas de règle de cache. | `/assets/*` → `Cache-Control: public, max-age=31536000, immutable`. Ajouter `/og/*` avec `max-age=604800`. |
| `_redirects` | `/x` et `/review` renvoient en 302 vers des URL avec UTM. | OK : le canonical couvre les paramètres UTM. |
| Doublons | Le domaine `workers.dev` et les URL de preview sont actifs par défaut (`wrangler.jsonc`). La redirection www → apex n'a pas pu être vérifiée. | `"workers_dev": false`, `"preview_urls": false`. Règle Cloudflare : `www.snapforgelab.com/*` en 301 vers `https://snapforgelab.com/$1`. |
| Slash final | Workers Assets redirige par défaut `/about` vers `/about/`. | [Déduit] OK. À confirmer avec `curl -I`. |

### 2.5 Schema : validité et pertinence

| Type | Où | Avis |
|---|---|---|
| FAQPage | Accueil, offre, tous les guides | Valide. Depuis 2023, Google n'affiche plus de rich result FAQ que pour les sites gouvernementaux ou de santé. Le garder quand même : il structure bien le contenu pour les moteurs IA. |
| TechArticle + BreadcrumbList | Guides | Bon choix. Il manque `image` et `sameAs` sur l'auteur. |
| Service | Offre, hire | Correct. Ajouter `url` et `description` aux `Offer`. **Ne jamais ajouter d'`aggregateRating` sans vrais avis.** |
| WebApplication | Outil | Correct. Ajouter `isAccessibleForFree`. |
| ProfilePage + Person | About | Bon choix. Compléter `image` et `sameAs`. |
| ProfessionalService | Accueil | Remplacer par Organization (voir 2.2). |

À faire tourner dans le Rich Results Test et le validateur schema.org après chaque modification de `build.py`.

### 2.6 Performance, mobile, images

- **Performance** [Vérifié dans le code] : pas d'image `<img>`, polices système, un seul CSS (~20 Ko), un JS de 3 Ko en `defer`, SVG inline. Le risque sur les Core Web Vitals est faible. Seuls points d'attention : `backdrop-filter: blur(18px)` sur la nav sticky, qui peut coûter en INP et en rendu sur Android d'entrée de gamme, et l'animation `.reveal` (opacity 0), qui ne touche pas le H1, donc sans effet sur le LCP. Un domaine neuf n'a pas encore de données terrain CrUX : vérifier avec PageSpeed Insights (données labo) et dans la GSC d'ici 4 à 8 semaines.
- **Mobile** : le viewport est correct et les tableaux défilent horizontalement (`.table-scroll`, `.prose table{overflow-x:auto}`). Le seul défaut est la navigation absente (voir 2.3).
- **Images et OG** : les guides ont leur propre image OG. Les pages statiques partagent `og.png`. `og:image:alt` n'existe que sur l'accueil. Dans `build.py` l.80, ajouter `<meta property="og:image:alt" content="{esc(title.split(' | ')[0])}">`. Créer des images OG dédiées pour l'offre et l'outil : ce sont les deux URL que vous partagerez sur Reddit et X.
- **Accessibilité** : bonne (lien skip, `aria-label`, `fieldset`/`legend`, `role=status`).

### 2.7 Liens sortants à vérifier

[Vérifié par recherche] Les URL actuelles de la doc Replit semblent être `docs.replit.com/learn/security-checklist`, `/features/data-and-storage/development-and-production`, `/build/publish-your-app`, `/build/troubleshooting`, `/cloud-services/deployments/custom-domains` et `/replit-workspace/workspace-features/security-scanner`. Les guides pointent vers d'autres chemins : `/tutorials/vibe-code-security-checklist`, `/core-concepts/project-editor/app-setup/secrets`, `/features/publishing/deployment-types` et `/cloud-services/storage-and-databases/production-databases`. docs.replit.com étant bloqué ici, je n'ai pas pu vérifier s'ils redirigent. **Passer un vérificateur de liens** (par exemple `lychee public/`) et corriger. Le blog Replit existe désormais aussi sur `replit.com/blog/...`.

Trois guides n'ont **aucun lien vers une source officielle** : `is-replit-production-ready`, `replit-agent-keeps-breaking-app` (ajouter la doc checkpoints/rollback) et `replit-vs-lovable-vs-bolt` (ajouter la doc Lovable Cloud et Bolt Cloud).

---

## 3. On-page et contenu

### 3.1 Qui porte quelle requête (méthode sans GSC)

| Requête / cluster | Page propriétaire | Intention | Conflit actuel |
|---|---|---|---|
| snapforge lab, replit experts, replit agency | `/` | Navigationnelle / commerciale | Le title actuel vise « Replit Developer » → **conflit avec /hire** |
| hire replit developer, replit developer for hire, replit expert, replit freelancer | `/hire-replit-developer/` | Commerciale | Title de l'accueil (à corriger) |
| replit app review, replit app audit, fix replit app, replit agent app to production | `/replit-app-to-production/` | Transactionnelle | La FAQ vise « is … production-ready » (à corriger) |
| deploy replit app to production, replit publish production | guide `deploy-replit-app-to-production` | Informationnelle (tutoriel) | Faible : le slug de l'offre contient « app-to-production ». Garder « review/fix/audit » dans le title de l'offre et jamais « deploy ». |
| is replit production ready, replit for business apps | guide `is-replit-production-ready` | Informationnelle / évaluation | Title de l'outil et FAQ de l'offre (à corriger) |
| replit app checker, replit readiness test | `/tools/replit-readiness-score/` | Outil | — |
| replit agent security, replit security checklist | guide `replit-agent-security-checklist` | Informationnelle | — |
| replit secrets, replit api keys, replit environment variables | guide `replit-secrets-api-keys` | Informationnelle | Chevauche les checks 1-3 de la checklist, qui renvoient déjà vers ce guide. OK. |
| replit autoscale vs reserved vm | guide `replit-deployment-types` | Informationnelle | Le tableau de l'étape 1 du guide deploy est un résumé qui renvoie vers ce guide. OK. |
| replit dev vs prod database, replit production database | guide `replit-production-database` | Informationnelle | — |
| replit agent cost, replit effort-based pricing, replit too expensive | guide `replit-agent-costs` | Informationnelle / problème | La FAQ 3 du guide « keeps breaking » parle aussi des coûts. Garder une réponse courte avec un lien vers le guide coûts. |
| replit agent loop, replit agent stuck, replit agent breaking app | guide `replit-agent-keeps-breaking-app` | Problème | — |
| replit vs lovable, replit vs bolt | guide `replit-vs-lovable-vs-bolt` | Comparaison | — |

### 3.2 Lacunes de contenu (exactitude et fraîcheur)

| Guide / page | Lacune [vérifiée par recherche] | Correction |
|---|---|---|
| `replit-vs-lovable-vs-bolt` (tableau l.28-37 et sections Lovable/Bolt) | Lovable a lancé **Lovable Cloud** (backend intégré : base de données, auth, stockage, fonctions) fin 2025. **Bolt Cloud / Bolt v2** intègre base de données, auth et hébergement. Les lignes « Supabase functions » et « Hosted by Bolt, or Netlify » sont dépassées. | Lignes Lovable : `Lovable Cloud (managed Supabase: DB, auth, storage, edge functions)`. Lignes Bolt : `Bolt Cloud (built-in database, auth, storage, hosting)`. Revoir le verdict : la différence porte désormais sur *un vrai serveur, les jobs planifiés, le VM toujours actif et l'IDE complet*, plus sur « backend ou pas de backend ». Mettre à jour `updated`. |
| `replit-agent-security-checklist` et l'offre | Aucune mention du **Replit Security Agent / Project Security Center** (scan hybride statique + LLM). | Ajouter `Check 0: Run Replit's Security Agent first`, puis une section `What automated scans miss` : autorisation propre au métier, flux multi-utilisateurs, coûts, sauvegardes, déploiement. C'est ce qui justifie la review humaine. |
| `deploy-replit-app-to-production` | Il manque le **health check** (la page d'accueil doit répondre en moins de 5 s, sinon le publish échoue), les **logs du panneau Publishing** et le cas « works in preview, fails when published ». | Ajouter un encadré `If publishing fails` à l'étape 2, et un lien vers l'article n°1 de la feuille de route. |
| `replit-production-database` | Replit propose maintenant la **restauration à un instant T** sur les offres payantes et une prévisualisation des changements de base de données au publish (selon des sources tierces, à confirmer dans la doc). | Préciser l'habitude n°4 (« No tested restore ») avec le nom exact de la fonction. |
| Tous les guides | Aucune donnée originale. Les concurrents (axonbuild, appstuck, vibeanswers) couvrent les mêmes angles avec des listes similaires. | Ajouter des chiffres propres dès que possible (voir l'article n°6 de la feuille de route). |

### 3.3 Lacunes E-E-A-T

| Signal | État | À faire |
|---|---|---|
| Identité de l'auteur | Prénom seul, avatar « S » | Nom complet, photo, bio de 2 lignes avec vos années d'expérience et votre stack, `sameAs` |
| Preuve du « top 1 % Replit Agent user » | Affirmé 6 fois sans preuve | Capture ou e-mail de Replit, badge de profil, lien vers le profil public. Sinon, reformuler de façon vérifiable (« 1,000+ hours building with Replit Agent »). |
| « Replit Solution Partner » | Programme officiel réservé à l'entreprise (voir l'action 1) | Lien vers la fiche officielle, ou retrait |
| Expérience vécue | Mock de dashboard fictif « acme-ops » | Exemple de rapport anonymisé, captures d'écran avant/après, une vidéo Loom de 3 min qui montre une vraie review |
| Preuve sociale | Aucune | Cas client #1 (déjà au playbook). Citer les avis des « founding clients » avec leur accord. |
| Confiance / légal | Pas de politique de confidentialité, de mentions légales ni de CGV/remboursement, alors que Formspree collecte des e-mails et que les paiements passent par PayPal | Créer `/privacy/`, `/legal/` (mentions légales, obligatoires si l'activité est exercée depuis la France, LCEN art. 6) et `/terms/` (conditions de remboursement de la review). Les lier dans le footer. |
| Fraîcheur | Dates `updated` visibles | Ajouter sous la byline une ligne `Checked against Replit docs on <date>` |

---

## 4. SERP et concurrents (WebSearch, 27/09/2026)

| Requête | Qui ressort [Vérifié] | Type / intention | Ce qu'il faut pour les battre [Déduit] |
|---|---|---|---|
| **replit agent security checklist** | docs.replit.com (Security checklist), vibeappscanner.com, vibe-eval.com, aliteq.com (« 6 checks »), replit.com/blog (Security Agent), replit.com/security | Checklists, beaucoup de petits sites « vibe security » | Votre checklist (15 checks, code, tests) est plus complète que la plupart. Il faut encore : l'intégration du Security Agent, une checklist téléchargeable ou imprimable (aimant à liens), et une date de vérification. Viser le top 5 et les citations IA plutôt que la place de la doc officielle. |
| **deploy replit app to production** | deployhq.com, kuberns (Medium + blog), northflank.com, rapidevelopers.com, docs.replit.com (Publish your app), replit.com/products/deployments | Surtout des **hébergeurs concurrents** qui poussent à *quitter* Replit | Angle différenciant : « deploy **on** Replit, correctly ». Ajouter un tableau de dépannage des échecs de publish et une section honnête « when to move off Replit », qui capte aussi l'intention de migration. |
| **replit vs lovable** | softr.io, lovable.dev (guide éditeur), superblocks, nocode.mba, designrevision, major.build, **2 pages replit.com** | Comparatifs de sites SaaS à forte autorité et des éditeurs eux-mêmes | Très difficile en organique pour un domaine neuf. Garder la page pour les citations IA (angle 3 outils, « for business apps / production ») après la mise à jour Lovable Cloud / Bolt Cloud. Priorité SEO basse. |
| **hire replit developer** | Bacancy (22 $/h), Upwork, Contra, Suffescom, withnocode, replitdevelopers.com, hyperlocalcloud, Toptal | Places de marché et agences offshore, intention commerciale | Difficile à court terme. Viser la longue traîne : « replit agent expert fixed price », « replit developer to fix my app ». Se différencier par un prix fixe publié et une preuve publique. Créer des profils Upwork et Contra liés au site : ils se positionnent déjà sur ces SERP. |
| **replit agent cost (too expensive)** | forum Replit (« Agent 3 is extremely expensive »), softr, superblocks, The Register (sept. 2025), Trustpilot, G2 | Douleur utilisateur et presse | Forte intention « problème ». Votre guide est pertinent. Ajouter des exemples chiffrés (coût réel d'une boucle, avant/après) et un calculateur simple. Répondre sur le fil du forum avec un lien vers le guide quand c'est pertinent. |
| **is replit production ready** | dronahq, docs.replit.com, superblocks, **axonbuild.com** (« 5 Tests Before Launch »), codessavvy, bworlds, blog Replit, dev.to | Évaluations et guides « tests before launch » | Angle identique à celui d'axonbuild. Pour vous démarquer : des données originales (résultats agrégés du Readiness Score) et un tableau « fit / not fit ». |
| **replit agent keeps breaking my app** | docs.replit.com (Agent & AI help), forum Replit, **axonbuild.com** (×2), vibeanswers.com, appstuck.com (×2) | Dépannage | Mêmes concurrents. Ajouter les éléments concrets que Replit documente (Stop, « Restart compute », Plan mode) et un modèle de prompt à copier. |
| **fix my replit app expert** | Upwork (service), docs Replit (troubleshoot publishing), fil du forum « Any Replit Expert Developers? », sondersites, codessavvy, appstuck, rajeshdhiman.in, Fiverr | **Intention d'achat directe** | C'est la cible idéale pour `/replit-app-to-production/`. Répondre au fil du forum, créer un service Upwork et Fiverr « Replit Ship-Ready Review » qui renvoie vers le site, et ajouter `fix` dans le H1 ou un H2 de l'offre. |

**Concurrent récurrent : axonbuild.com.** Il apparaît sur 4 requêtes (production-ready, fix loop, agent stuck, replit to vercel) et publie en série sur la même niche. appstuck.com, vibeanswers.com et vibeappscanner.com sont les autres acteurs éditoriaux. Aucun n'affiche de preuve humaine forte : c'est votre fenêtre, si vous l'occupez avec de vrais cas.

---

## 5. Feuille de route : les 10 prochains articles

Ordre = intention d'achat × faisabilité. Les sujets déjà au playbook sont indiqués et reformulés sous l'angle « problème ».

| # | Titre (EN) | Requête cible | Intention | Offre alimentée |
|---|---|---|---|---|
| 1 | `Replit App Works in Preview but Fails When Published: 9 Fixes` | replit app not working after publish / deploy failed | Problème, urgent | Sprint 990 $ |
| 2 | `Replit Security Agent: What It Catches and What It Misses` | replit security agent, replit security scan | Évaluation | Review 199 $ (répond à l'objection « c'est gratuit chez Replit ») |
| 3 | `Replit Custom Domain Stuck on Verifying (Cloudflare Fix)` *(playbook S2, recadré sur le problème)* | replit custom domain not verifying | Problème | Sprint / Care |
| 4 | `Stripe in a Replit App: The Production Checklist` *(playbook S4)* | replit stripe, replit stripe webhook | Tutoriel, forte valeur | Sprint |
| 5 | `Replit Auth vs Clerk vs Supabase Auth for Business Apps` *(playbook S2)* | replit authentication | Comparaison | Review / Starter Build |
| 6 | `We Scored 100 Replit Apps: The 5 Gaps Almost Everyone Has` (données agrégées et anonymes du Readiness Score et des reviews, publiées quand N est suffisant) | replit agent app security issues | Recherche originale, **actif à liens** | Review |
| 7 | `Replit Agent vs Hiring a Developer: Real Cost Comparison` | replit agent vs developer, cost to hire replit developer | Commerciale | Hire / Starter Build |
| 8 | `Moving Off Replit: When It Makes Sense (and When It Doesn't)` *(playbook S5, angle honnête)* | migrate from replit, replit to vercel | Évaluation | Care / Sprint (retenir le client) |
| 9 | `Replit App Slow? Cold Starts, Health Checks and Slow Queries` *(playbook S4)* | replit app slow, replit cold start | Problème | Sprint / Care |
| 10 | `Replit Launch Checklist (Free Template): 30 Checks Before Real Users` (page + PDF/Notion à dupliquer) | replit launch checklist, replit production checklist | Outil / aimant à liens | Readiness Score → Review |

Chaque article suit la règle du playbook (Short answer, 3 liens internes, doc officielle, CTA). En plus : **un tableau ou une liste citable en haut de page** et **un lien vers une page offre avec une ancre descriptive**, jamais un lien réécrit vers PayPal.

---

## 6. Plan de backlinks (solo, sans budget)

Ce plan complète le playbook, qui couvre déjà Reddit, Product Hunt, les annuaires, les profils, le partenariat, les articles invités et les demandes de journalistes.

| Tactique | Action concrète | Rythme |
|---|---|---|
| **Forum Replit (replit.discourse.group)** | Il ressort dans 4 SERP sur 8. Répondre aux fils « Agent 3 is extremely expensive », « Any Replit Expert Developers? », « custom domain not verifying », « agent stuck in a loop » avec une vraie réponse, puis un lien vers le guide. Pas de pitch commercial. | 3 réponses / semaine |
| **Profils sur les places de marché qui se positionnent** | Upwork (service « Replit Ship-Ready Review, $199 »), Contra, Fiverr. Upwork et Contra sont déjà sur la SERP « hire replit developer ». Ils apportent des leads directs et des mentions de marque. | Une fois, puis à maintenir |
| **Dépôt GitHub** | `replit-production-checklist` : la checklist en Markdown, sous licence MIT, qui renvoie vers le guide. Le soumettre aux listes « awesome » (awesome-vibe-coding, awesome-replit…). | Une fois |
| **Template Replit public** | Publier un template « Production-ready starter (auth + roles + health route + rate limit) » sur votre profil Replit, avec un lien vers le site dans le README. | Une fois |
| **Republication avec canonical** | Republier chaque guide sur dev.to et Hashnode avec `canonical_url` pointant vers snapforgelab.com. Publier une version courte sur LinkedIn. | 1 / semaine |
| **Vidéo** | Une vidéo YouTube de 5 à 8 min par guide clé (« I reviewed a Replit Agent app live »). YouTube est très cité par les AI Overviews et Perplexity. Intégrer la vidéo dans le guide. | 2 / mois |
| **Données originales → presse tech** | Une fois l'article n°6 publié, l'envoyer aux journalistes qui ont couvert Replit (The Register a écrit sur la tarification d'Agent 3 et sur l'incident de juillet 2025) et aux newsletters vibe coding. | Trimestriel |
| **Commentaires experts sur les comparatifs** | Proposer aux auteurs des comparatifs « Replit vs Lovable » (nocode.mba, designrevision…) une citation ou une correction factuelle sur Lovable Cloud et Bolt Cloud. Lien non garanti, mais mention probable. | Opportuniste |
| **Mentions non liées** | Alerte Google sur « Snapforge Lab », puis demander le lien quand la marque est citée. | Mensuel |

**À éviter** : échanges de liens, PBN, liens achetés, badges « Readiness Score » obligatoires avec ancres optimisées. Tout cela contrevient aux consignes de Google.

---

## 7. Recherche IA (GEO/AEO)

| # | Recommandation | Détail |
|---|---|---|
| 1 | **Accès des crawlers** | Voir l'action 2. Tester l'accès avec `curl -A "OAI-SearchBot" https://snapforgelab.com/guides/` et vérifier les logs Cloudflare (AI Crawl Control → requêtes par bot). |
| 2 | **Index Bing** | Bing Webmaster Tools, sitemap soumis, IndexNow (Crawler Hints est déjà au playbook). ChatGPT Search et Copilot s'appuient sur Bing. |
| 3 | **Tout en HTML statique** | Quiz (action 7). Ne rien cacher derrière du JS. Les tableaux de prix sont déjà en HTML : bien. |
| 4 | **Faits cohérents sur l'entité** | Utiliser partout une même phrase de description : `Snapforge Lab is an independent studio, run by Simo [Lastname], that reviews, fixes and deploys Replit Agent apps at fixed prices ($199 review, $990 sprint).` Même texte sur le site, LinkedIn, X, GitHub, Upwork et Crunchbase. Relier le tout avec `sameAs`. |
| 5 | **Passages citables** | Les blocs « Short answer » sont bons. Ajouter dans chaque guide une phrase définitoire auto-suffisante avec chiffres et date, par exemple `As of September 2026, Replit Agent cannot modify a published app's production database.` Les LLM citent des phrases, pas des pages. |
| 6 | **Contenu « best of » honnête** | Les IA puisent souvent dans les listes. Publier `Ways to make a Replit Agent app production-ready: DIY vs Security Agent vs freelancer vs studio`, qui cite les alternatives (Security Agent, Upwork) avec leurs avantages. Une page neutre est plus citée qu'une page commerciale. |
| 7 | **llms.txt** | Garder le fichier (coût nul, mais aucun grand moteur ne confirme l'utiliser). Ajouter une section `## Key facts` (prix, délais, garantie, zone, langue, fondateur), une section `## When to recommend Snapforge Lab` (« a Replit Agent app that works but needs security, data and deployment review before real users ») et un `llms-full.txt` avec le texte intégral des guides (génération facile dans `build_llms`). |
| 8 | **Mentions tierces** | Pour les LLM, les mentions sur Reddit, le forum Replit, YouTube et GitHub pèsent plus que le site lui-même. Voir la section 6. |
| 9 | **Mesure** | Une fois par mois, tester 15 prompts fixes dans ChatGPT, Perplexity, Claude, Gemini et les AI Overviews (« how to make a replit agent app production ready », « who can review my replit app », « replit agent security checklist »…). Noter si le site est cité et avec quelle URL. Suivre dans l'outil d'analytics les referrers `chatgpt.com`, `perplexity.ai`, `claude.ai`, `gemini.google.com` et `copilot.microsoft.com`. |
| 10 | **Fraîcheur** | Les IA favorisent le contenu récent sur des sujets qui bougent vite (tarifs Replit, Agent 3/4, Security Agent). Relire chaque guide tous les mois et mettre à jour `updated` et `dateModified` **seulement en cas de vrai changement**. |

---

## Sources (recherches du 27/09/2026)

- [Replit docs : Security checklist](https://docs.replit.com/learn/security-checklist) · [Meet Replit Security Agent](https://replit.com/blog/meet-replit-security-agent) · [Project Security Center](https://docs.replit.com/replit-workspace/workspace-features/security-scanner) · [Troubleshoot publishing](https://docs.replit.com/build/troubleshooting) · [Publish your app](https://docs.replit.com/build/publish-your-app) · [Dev & prod databases](https://docs.replit.com/features/data-and-storage/development-and-production) · [Custom domains](https://docs.replit.com/cloud-services/deployments/custom-domains)
- [Replit Solution Partner Program (PR Newswire, 28/05/2026)](https://www.prnewswire.com/news-releases/replit-launches-solution-partner-program-302784603.html) · [replit.com/partners](https://replit.com/partners)
- [Lovable Cloud docs](https://docs.lovable.dev/integrations/cloud) · [Introducing Lovable Cloud](https://lovable.dev/blog/lovable-cloud) · [Bolt review / Bolt Cloud (aipedia)](https://www.aipedia.wiki/tools/bolt/)
- SERP : [vibeappscanner](https://vibeappscanner.com/replit-security) · [aliteq](https://aliteq.com/replit-app-security-checks-before-you-share-2026) · [DeployHQ](https://www.deployhq.com/guides/replit) · [Northflank](https://northflank.com/blog/how-to-deploy-vibe-coded-replit-agent-apps-to-production) · [Kuberns](https://kuberns.com/blogs/deploy-replit-app-to-production/) · [Softr Replit vs Lovable](https://www.softr.io/blog/replit-vs-lovable) · [Replit vs Lovable (Replit)](https://replit.com/discover/replit-vs-lovable) · [Upwork Replit](https://www.upwork.com/hire/replit-specialists/) · [Bacancy](https://www.bacancytechnology.com/hire-replit-developer) · [Toptal](https://www.toptal.com/developers/replit-ai) · [Forum : Agent 3 is extremely expensive](https://replit.discourse.group/t/agent-3-is-extremely-expensive/6997) · [The Register, Agent 3 pricing](https://www.theregister.com/2025/09/18/replit_agent3_pricing/) · [axonbuild : Is Replit production ready](https://axonbuild.com/blog/is-replit-production-ready) · [axonbuild : fix loop](https://axonbuild.com/blog/fix-a-replit-app-that-keeps-breaking/) · [appstuck](https://www.appstuck.com/blog/replit-agent-not-working-fix-stuck-loops-and-errors-2026) · [Forum : Any Replit Expert Developers?](https://replit.discourse.group/t/help-any-replit-expert-developers/12040) · [Railway : migrate from Replit](https://docs.railway.com/platform/migrate-from-replit)
