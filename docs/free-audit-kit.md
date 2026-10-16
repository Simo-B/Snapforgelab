# Kit de livraison du free audit

La page `/free-audit` promet un audit **en 24 h**. Le free audit est une porte d'entrée : il montre ce que tu sais faire, puis il mène au **Deploy Fix (49 $)** si l'app ne se déploie pas, ou à la **review (199 $)** pour tout ce qui ne se voit pas de l'extérieur.

Temps visé : **15 à 25 minutes par audit**.

## 1. Règles (non négociables)
- **Uniquement l'app de la personne qui demande.** Ajoute au formulaire Google une case obligatoire « I own or run this app ». En cas de doute, demande-lui de confirmer avant d'envoyer le détail des failles.
- **Observation passive.** Tu regardes ce qu'un visiteur voit : aucune tentative de connexion forcée, aucun formulaire envoyé avec de fausses données, aucune recherche de fichiers cachés.
- **Une clé trouvée ne se copie, ne se teste et ne se publie jamais.** Le script affiche seulement ses 6 premiers caractères. Dans l'audit, recommande de la remplacer (« rotate »).
- **Livraison privée** : un Google Doc partagé seulement avec son e-mail, ou un PDF. Jamais de page publique sur ton site.
- **Ne promets que ce que tu as vu.** Ce que tu n'as pas pu vérifier va dans la section « Not checked from outside ».

## 2. Déroulé d'un audit

**a. Tri (2 min).** L'app est-elle en ligne ? Est-ce bien la sienne ? Si elle n'est pas en ligne, utilise le modèle « pas encore en ligne » (§4).

**b. Script (1 min).** Ce conteneur cloud ne peut pas joindre les sites des clients : lance le script sur ton ordinateur (Python 3) ou dans un Repl Python.
```
python3 scripts/free_audit_check.py https://son-app.replit.app -o audit.md
```
Si tu repères un appel d'API dans l'onglet Réseau (étape c), relance avec `--api https://son-app.replit.app/api/...` pour vérifier le CORS.

Le script vérifie :
- le HTTPS et une URL de développement partagée à la place d'un déploiement ;
- le temps de réponse ;
- les en-têtes de sécurité et les cookies ;
- les clés secrètes visibles dans le code du navigateur (OpenAI, Anthropic, Stripe, Supabase service_role, AWS, GitHub, base de données…) ;
- Stripe en mode test, les source maps publiques ;
- robots.txt, sitemap et les pages inexistantes.

Il produit un brouillon d'audit en anglais, avec pour chaque problème une consigne à coller dans Replit Agent.

**c. Vérifications à la main dans Chrome (10 min)** : ouvre son app, puis les outils de développement (F12).
1. **Console :** erreurs rouges au chargement. Note les deux plus importantes.
2. **Réseau :** requêtes en 4xx ou 5xx. Copie l'URL d'un appel `/api/...` pour l'option `--api`.
3. **Vue mobile** (icône téléphone) : texte coupé, boutons trop petits, page qui déborde.
4. **Pages d'inscription et de connexion** : en HTTPS, avec un lien « mot de passe oublié ».
5. **Paiement** (s'il y en a) : Stripe Checkout hébergé (`checkout.stripe.com`) ou formulaire maison. Les webhooks ne se vérifient pas de l'extérieur : section « Not checked ».

**d. Rédaction (5 min).**
- Remplace la ligne « DRAFT » du verdict par une phrase humaine, par exemple : « Your app works, but two things could cost you real money before launch. »
- Mets en avant **3 problèmes au maximum**, et laisse le reste dans les listes.
- Garde la section « Not checked from outside » : c'est le pont vers la review.
- Colle le tout dans un Google Doc, partagé seulement avec son e-mail.

**e. Envoi** avec le modèle §3, puis relances à J+2 et J+7 (§5).

## 3. E-mail de livraison (anglais)
```
Subject: Your free audit: [app name]

Hi [first name],

Here is your audit of [app URL]: [link to the private doc]

Short version: [verdict sentence]. Fix this one first: [top must-fix, one line].

Every issue comes with a prompt you can paste into Replit Agent, so you can fix most of this yourself.

What I couldn't check from the outside: whether one user can read another user's data, your database rules and your backups. That is what my 48-hour review covers ($199, full refund if I find fewer than 3 real issues): https://snapforgelab.com/replit-app-to-production/

[Only if the deploy is broken] If you'd rather I fix the deploy for you: $49, fixed within 48 hours of access or refunded: https://snapforgelab.com/deploy-fix/

Any question about the findings? Just reply.

Simo
```

**Quelle offre proposer**

| Ce que tu as vu | Offre à mettre en avant |
|---|---|
| L'app ne se déploie pas, renvoie une erreur ou tourne sur une URL de développement | Deploy Fix 49 $ (`/deploy-fix/`) |
| Clés exposées, CORS ouvert, ou lancement imminent avec de vrais utilisateurs | Review 199 $ (ou 99 $ fondateur via `/founding-review/`, en message privé, tant qu'il reste des places) |
| Beaucoup de problèmes et pas le temps de les corriger | Review d'abord, puis Sprint 990 $ (review déduite) |

## 4. Autres réponses
**Pas encore en ligne :**
```
Thanks for the request! [App] doesn't seem to be live yet (I got [error / no page]). Send me the live URL when it's deployed and I'll run the audit within 24 hours. If the deploy itself is the problem, I fix one deployment blocker for $49: https://snapforgelab.com/deploy-fix/
```
**Ce n'est pas son app :**
```
Thanks! For privacy reasons I only audit apps run by the person asking. If you work on [app], just confirm it and I'll send the audit within 24 hours.
```

## 5. Relances
**J+2**
```
Hi [first name], did the prompts for [top issue] work? Happy to look at what's left.
```
**J+7, dernière**
```
Last note from me: if you want the parts I couldn't check from outside (data access between users, database rules, backups) covered before launch, the review is here: https://snapforgelab.com/replit-app-to-production/ Good luck with [app]!
```

## 6. Suivi
| Date | App | E-mail | Envoyé le | Top problème | Offre proposée | Relance J+2 | Relance J+7 | Résultat |
|---|---|---|---|---|---|---|---|---|
