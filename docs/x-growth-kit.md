# Kit growth X — Snapforge Lab

Objectif : **1ʳᵉ prestation signée en 30 jours**. Le levier le plus rapide n'est pas l'audience, c'est **les conversations**.
Cible prioritaire sur X : les gens qui construisent avec **Replit Agent / vibe coding** et bloquent avant la mise en prod.
Cible secondaire : fondateurs / ops de petites boîtes qui veulent un outil interne.

### L'échelle d'offres
| Offre | Prix | Lien |
|---|---|---|
| Free Teardown (Loom 5 min) | 0 $ | réponse / DM sur X |
| Ship-Ready Review | **199 $** (10 places, puis 390 $) · 48h · remboursé si < 3 vrais problèmes | `snapforgelab.com/review` |
| Ship-It Sprint | **990 $** · 5 jours · review créditée · 1ᵉʳ mois Care inclus | après la review |
| Starter Build | **2 500 $** · **1 500 $** pour 3 fondateurs (contre case study) | `snapforgelab.com/x` |
| Care | **249 $/mois** · 1ᵉʳ mois inclus dans Sprint & Build | upsell auto |

Parcours type : Teardown gratuit → Review 199 $ → Sprint 990 $ → Care 249 $/mois.

Tout le contenu est en **anglais** (audience internationale).

---

## 1. Profil (jour 1)

**Handle** (dans l'ordre de préférence, vérifier la dispo) : `@snapforgelab` · `@snapforge_lab` · `@snapforgehq`
> Conseil : poste aussi depuis ton compte perso « Prénom | Snapforge Lab ». Sur X, les gens suivent des personnes, pas des logos. Le compte marque sert de vitrine ; le compte perso fait la croissance.

**Nom affiché** : `Snapforge Lab — Replit apps that ship`

**Bio** (160 car.) :
```
I turn Replit Agent prototypes into production apps.
Dashboards · CRMs · portals · AI assistants.
Fixed price. Live in days. You own the code.
↓ $199 ship-ready review (48h)
```

**Lien** : `snapforgelab.com/x` (redirige vers la home avec `utm_source=x`, déjà configuré dans `_redirects`)

**Bannière** : réutiliser `public/og.png` (1500×500 recadré) ou faire une version avec « Your Replit app → production in days ».

**Post épinglé** (voir §3, post #1).

---

## 2. Routine quotidienne (45–60 min/jour)

| Bloc | Durée | Action |
|---|---|---|
| Chasse | 15 min | Recherches X ci-dessous → répondre à **10 posts** avec une vraie valeur (pas de pitch) |
| Création | 15 min | **1 post** (template §3) |
| Build in public | 10 min | 1 capture/vidéo de ce que tu construis (template, démo, fix) |
| DM | 10 min | Relancer les conversations chaudes (§4) |
| Suivi | 5 min | Noter leads dans un tableau (nom, source, étape) |

**Recherches X à sauvegarder** (onglet « Latest ») :
- `"replit agent" (stuck OR broken OR deploy OR production OR help)`
- `"built with replit" -giveaway`
- `"vibe coded" (app OR mvp) (security OR deploy OR production)`
- `"need a developer" (dashboard OR "internal tool" OR CRM)`
- `"replit" ("database" OR "auth" OR "login") (issue OR problem)`
- `"spreadsheet hell" OR "too many spreadsheets"`

**Comptes où répondre en premier** (être parmi les 10 premières réponses) : Replit officiel, @amasad, équipe Replit, créateurs vibe coding / indie hackers / no-code. Une réponse utile sous un gros post = la meilleure acquisition gratuite.

**Règle des réponses** : 1 insight concret + 1 question. Jamais de lien dans la réponse (X les pénalise) → le lien est dans la bio.

---

## 3. 14 posts prêts à publier

**#1 — Épinglé (offre)**
```
Built an app with Replit Agent?

It works. But before real users touch it, check:

→ API keys in code instead of Secrets
→ Users can read other users' data by changing an ID
→ Dev & prod share one database
→ No backups, no error alerts
→ Unlimited AI calls = surprise bill

I'll review yours in 48h. $199.
Fewer than 3 real issues? Full refund.

10 launch spots, then $390.

Link in bio.
```

**#2 — Checklist (sauvegardable)**
```
The 10-point checklist before you launch a Replit Agent app:

1. Secrets in Replit Secrets, not code
2. Every route checks WHO is asking
3. Inputs validated server-side
4. Separate dev/prod database
5. Daily backups
6. Error tracking
7. Rate limits on AI endpoints
8. Custom domain + HTTPS
9. Right deployment type (autoscale vs VM)
10. One person who knows how it works

Bookmark this.
```

**#3 — Build in public (lancement)**
```
Starting Snapforge Lab today.

The bet: AI makes building apps 10x faster,
but shipping them safely is still the bottleneck.

So I productized it:
• $199 ship-ready review (48h, refund guarantee)
• $990 sprint to fix & ship it
• custom business apps on Replit, live in ~7 days, you own the code

Documenting everything here. First client, first $, first mistakes.
```

**#4 — Contrarian**
```
Hot take: "anyone can build an app now" is true.

"Anyone can run an app in production" is not.

Auth. Permissions. Backups. Monitoring. Costs.
That's where 80% of AI-built apps quietly die.
```

**#5 — Démo (avec vidéo 30–60 s)**
```
Spreadsheet → live dashboard in one afternoon on Replit.

Before: 3 Google Sheets, copy-paste every Monday.
After: one URL the whole team opens.

Here's how it works ↓
[vidéo écran]
```

**#6 — Comparatif**
```
Getting an internal tool built in 2026:

Agency: $15k+, 3 months
Hourly freelancer: ??? , "almost done"
DIY with AI: 80% done, forever
Productized: fixed price, live in a week

Pick the one where you know the price before you start.
```

**#7 — Leçon technique**
```
The #1 security bug I see in AI-generated apps:

GET /api/invoices/123

The app checks you're logged in.
It never checks invoice 123 is YOURS.

Change the number → read everyone's invoices.

Fix: always filter by owner on the server. Every route.
```

**#8 — Offre fondateurs**
```
Taking 3 founding clients this month.

You get: a custom business app on Replit
(dashboard, CRM, client portal, AI assistant)
$1,500 instead of $2,500. Live in ~7 days.

I get: a short case study.

Reply "forge" or DM me.
```

**#9 — Question engagement**
```
What's the one spreadsheet your business would collapse without?

(I'm collecting ideas for the next Replit template I build, best answer gets it built free.)
```
> ⚠️ C'est un vrai lead magnet : construire la meilleure idée = démo + case study.

**#10 — Behind the scenes**
```
Every build at Snapforge Lab starts from the same base:

• auth + roles
• admin panel
• data connectors (Sheets, Airtable, Stripe, API)
• logging + backups

So clients pay for what's unique to them, not for login screens.

That's how fixed price actually works.
```

**#11 — Coût caché**
```
Your team spends 5 hours/week copying data between tools.

5h × 52 weeks × $40/h = $10,400/year.

A dashboard that does it automatically: $1,500 once (founding price).

Not a hard decision.
```

**#12 — Thread avant / après (après 1ʳᵉ review)**
```
Just reviewed a Replit Agent app for a founder.

Found 7 issues. 2 were critical.
Here's what they were (anonymized) and how we fixed them 🧵
```

**#13 — Preuve sociale (dès le 1ᵉʳ client)**
```
First Snapforge Lab client is live 🎉

[Client] needed [X].
Built on Replit in [N] days.
Result: [metric].

"[quote]"

2 founding spots left.
```

**#14 — Replit news-jacking**
Chaque annonce Replit (nouvelle feature Agent, pricing, déploiement…) → post dans l'heure : « What [feature] means for people shipping business apps: 3 things. »

**Cadence** : 1 post/jour + 1 thread/semaine (le mardi ou mercredi, 14h–16h UTC = matin US / après-midi EU).

---

## 3 bis. Le moteur : Free Teardown (2×/semaine)

**Post :**
```
Built something with Replit Agent?

Reply with the link. I'll record a free 5-min teardown
for the first 5: what's solid, what breaks in production, what to fix first.

No pitch. Just the video.
```

**Process :**
1. Choisis 5 réponses → enregistre un Loom de 5 min chacun (écran + voix).
2. Réponds en public avec le lien Loom (preuve de compétence visible par tous).
3. En DM : « Glad it helped. If you want the full audit (auth, data, costs, deploy) with a written fix list: $199, 48h, refund if I find fewer than 3 real issues. »
4. Demande l'autorisation de reposter un extrait → contenu gratuit pour la semaine.

Objectif : 10 teardowns → 3 reviews → 1 sprint.

---

## 4. Playbook DM (là où se signent les premiers clients)

**Déclencheur** : quelqu'un a posté un problème Replit / a répondu à un post / a liké 2+ posts.

**Message 1 (valeur, pas de pitch)**
```
Hey [name], saw your post about [problem].
Quick thought: [1 specific, actionable fix].
Happy to take a quick look at the Repl if you want, no strings.
```

**Si oui** → 10 min de regard gratuit, puis :
```
Took a look. The main thing is [issue], plus 3-4 smaller ones.
I do a full ship-ready review for $199 (48h, written report + video).
If I find fewer than 3 real issues, you get a full refund.
And if you want me to fix everything, the $199 is credited.
Want the link?
```

**Si client « outil interne »** :
```
Sounds like a good fit for a Starter Build: normally $2,500, $1,500 for my 3 founding clients (in exchange for a short case study). Live in ~7 days, on your own Replit account.
If you send me 3-4 lines on the workflow, I'll send a written scope + price in 48h. No call needed.
```

**Relance** : J+3 une seule fois, avec un élément de valeur (lien vers un post, une astuce).

**Objectif chiffré** : 5 conversations/jour → ~100 en 30 jours → 10 intéressés → 2–3 clients.

---

## 5. Suivi & KPI (chaque dimanche)

| KPI | Cible S1 | Cible S4 |
|---|---|---|
| Réponses postées | 70 | 70 |
| Nouvelles conversations DM | 20 | 35 |
| Visites site depuis X (`utm_source=x`) | 30 | 150 |
| Demandes formulaire | 1 | 5 |
| Teardowns envoyés | 5 | 10 |
| Reviews vendues (199 $) | 1 | 8 cumulées |
| Sprints / Builds signés | 0 | 3–4 cumulés |
| Abonnés Care | 0 | 3–4 |

Les soumissions Formspree incluent `attr_source`, `attr_utm_campaign` et `attr_landing` → tu sais quel lien a converti.

Liens courts à utiliser :
- `snapforgelab.com/x` → home (bio)
- `snapforgelab.com/review` → page Ship-Ready Review (DM, posts review)
