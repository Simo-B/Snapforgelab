# Kit de livraison : Ship-Ready Review (199 $)

Objectif : livrer une Review **pro en 2–3h**, toujours pareille, qui donne envie d'acheter le Sprint.

## 0. Après le paiement (message automatique ou manuel, < 1h)
```
Thanks [name], your Ship-Ready Review is booked.

Next step: invite hello@snapforgelab.com as a collaborator on your Repl
(read access is enough), and reply with:
1. Who uses the app (you, your team, customers?) and roughly how many
2. What data it stores (emails, payments, files…)
3. Anything that already feels fragile

Your report and video land within 48h of access.
```

## 1. Checklist d'audit (60–90 min)
Noter chaque point : ✅ OK · ⚠️ Fix soon · 🔴 Must-fix · — N/A

**Sécurité & accès**
- [ ] Secrets : aucune clé API / mot de passe dans le code ou l'historique ; tout dans Replit Secrets
- [ ] Auth : login robuste (Replit Auth, Clerk, Supabase…), sessions qui expirent, pas de mot de passe en clair
- [ ] Autorisation : chaque route vérifie que la ressource appartient à l'utilisateur (tester en changeant un ID)
- [ ] Rôles admin : protégés côté serveur, pas seulement cachés dans l'UI
- [ ] Validation des entrées côté serveur (formulaires, API, uploads)
- [ ] Dépendances : `npm audit` / `pip-audit`, versions obsolètes critiques
- [ ] CORS, en-têtes de sécurité, HTTPS forcé

**Données**
- [ ] Base de prod séparée de la base de dev
- [ ] Migrations versionnées (pas de schéma modifié à la main)
- [ ] Sauvegardes activées et testées
- [ ] Données personnelles : minimisées, suppression possible

**Fiabilité & coûts**
- [ ] Gestion d'erreurs (pas d'écran blanc / stack trace exposée)
- [ ] Logs exploitables + alerte en cas d'erreur (Sentry ou équivalent)
- [ ] Requêtes lentes / N+1, pages lourdes
- [ ] Appels IA / API externes : rate limit, cache, plafond de coût
- [ ] Ce qui se passe si une API externe tombe

**Déploiement Replit**
- [ ] Bon type de déploiement (Autoscale / Reserved VM / Static) pour l'usage
- [ ] Variables d'env de prod correctes, domaine personnalisé
- [ ] Health check / monitoring de disponibilité
- [ ] Le build de prod part d'un état propre (pas de fichiers de dev)

## 2. Rapport (30–45 min), modèle
```
# Ship-Ready Review: [App name]
Date · Reviewed by Snapforge Lab

## Verdict
[Not ready / Ready with fixes / Ready] for real users. [1–2 phrases.]

## Scorecard
| Area | Status |
| Security & access | 🔴 / ⚠️ / ✅ |
| Data | … |
| Reliability & costs | … |
| Deployment | … |

## 🔴 Must-fix before launch
### 1. [Titre clair, ex: "Any logged-in user can read every invoice"]
- What: [ce qui se passe]
- Why it matters: [impact business, en mots simples]
- How to fix: [étapes concrètes]
- Effort: [S / M / L]

## ⚠️ Fix soon
…

## ✅ What's solid
[2–4 points positifs, ça rassure et ça rend crédible le reste]

## Next steps
Option A: Fix it yourself with this list.
Option B: Ship-It Sprint: we fix every 🔴 and ⚠️ item and deploy to production in 5 days.
$990, your $199 review is credited → $791. First month of Care included.
```

## 3. Vidéo Loom (10–15 min)
1. Verdict en 30 secondes
2. Les 🔴 un par un, **en le montrant dans l'app** (ex : changer un ID dans l'URL → voir les données d'un autre)
3. Ce qui est solide
4. « Si tu veux que je m'en occupe, c'est le Sprint, 5 jours, la review est déduite. »

## 4. Message de livraison + proposition du Sprint
```
Hi [name], your Ship-Ready Review is ready:
📄 Report: [lien]
🎥 Walkthrough: [Loom]

Short version: [X] must-fix items, [Y] fix-soon. The most urgent is [#1 en une phrase].

If you'd like us to handle it, the Ship-It Sprint covers every item on the list
and puts the app in production in 5 days: $990, minus your $199 → $791.
50% to start, 50% when it's live. I can start [jour].
```
**Relance J+2** si pas de réponse : « Any questions on the report? Happy to walk you through #1. »

## 5. Garantie
Moins de 3 vrais problèmes trouvés → remboursement complet, sans discussion. (Ça n'arrivera presque jamais.)

## 6. Après chaque client
- [ ] Demander un témoignage (2 phrases) + autorisation de citer le prénom / l'app
- [ ] Transformer le problème n°1 (anonymisé) en post X / thread
- [ ] Compter : place Review utilisée (x/10) → à 10, passer à 390 $
