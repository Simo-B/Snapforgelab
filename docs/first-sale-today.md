# Première vente aujourd'hui : mode opératoire

**Offre du jour : Review « client fondateur » à 99 $ (3 places).**
Ta page à envoyer : `https://snapforgelab.com/founding-review/` (privée : non indexée, liée nulle part sur le site).
Paiement : `https://paypal.me/mbsimo/99USD`, à donner **seulement après un « oui » explicite**.
Preuve du livrable : `https://snapforgelab.com/replit-app-to-production/example-report/`.

Le site public reste à 199 $. Quand 3 places sont vendues : mets `open: false` dans `FOUNDING` (`public/assets/main.js`) ou demande-le-moi. La page redirige alors vers l'offre à 199 $. Ne laisse jamais un faux compteur de places.

Réalité : un « oui » aujourd'hui est possible, surtout via ton réseau. Avec des inconnus, compte plutôt 2 à 5 jours de ce même travail. Le SEO ne joue pas ici, c'est de la conversation directe.

---

## 0. Avant le premier message (10 min)

1. Une à deux minutes après le déploiement, ouvre la page sur ton téléphone. Clique « Pay $99 with PayPal » : la page PayPal doit afficher 99 USD pour mbsimo, en paiement **« Biens et services »** (protection acheteur). Si PayPal ne propose que « Envoyer à un proche », un inconnu n'osera pas payer : crée alors une **facture PayPal** de 99 USD (« Ship-Ready Review, founding client ») et envoie son lien à la place.
2. Notifications PayPal activées sur ton téléphone, et hello@snapforgelab.com transféré vers ton Gmail (Cloudflare Email Routing).
3. Copie les messages du §2 dans les notes de ton téléphone.
4. Ouvre `docs/review-delivery-kit.md` : tu y trouves ton message post-paiement et la checklist d'audit.

## 1. Le plan du jour (4 blocs, environ 3 h)

| Bloc | Durée | Quoi | Cible |
|---|---|---|---|
| 1. Réseau chaud | 30 min | Message perso (§2.1) à tes contacts qui construisent, freelancent ou ont un projet | 30 messages |
| 2. Demande en direct | 75 min | Recherches du §3 (X, Reddit, forum Replit, Discord). Réponse utile publique d'abord (§2.2), DM ensuite (§2.3) | 20 réponses utiles, 10 DMs |
| 3. Vitrines | 30 min | Contra (en ligne tout de suite), gig Fiverr, profil Upwork. Pipeline de demain, pas de cash aujourd'hui | 3 profils |
| 4. Closing + post du soir | 30 min | Réponds à tout le monde (§2.4 à §2.7). Publie le post « free teardown » (§2.8) sur X et LinkedIn | 1 post |

Règle d'or : **réponds en moins de 15 minutes** à toute personne qui te répond aujourd'hui.

Ordres de grandeur (règles de pouce, pas une garantie) : réseau chaud, 30 messages donnent environ 10 réponses, 2 à 3 intros ou pistes, environ 1 acheteur possible. Inconnus, 20 réponses publiques donnent environ 5 conversations, 1 à 2 teardowns acceptés, et 20 à 30 % d'entre eux paient.

---

## 2. Les messages (à copier, à personnaliser en 1re ligne)

### 2.1 Réseau chaud

**FR**
```
Salut [prénom] ! Petit message perso : je viens de lancer Snapforge Lab. Je fais la revue « prêt pour la prod » d'apps créées avec Replit (sécurité, base de données, déploiement) : rapport écrit + vidéo en 48h.
Toi, ou quelqu'un que tu connais, a une app faite avec Replit / Lovable / Bolt qu'il veut lancer sans mauvaise surprise ? Je prends 3 clients fondateurs à 99 $ au lieu de 199 $.
Même un simple partage ou une intro m'aiderait énormément 🙏 Le détail : https://snapforgelab.com/founding-review/
```

**EN**
```
Hey [name]! Quick personal note: I just launched Snapforge Lab. I review apps built with Replit before launch (security, database, deployment) and send a written report + video in 48h.
Do you, or someone you know, have an app built with Replit / Lovable / Bolt that they want to launch without nasty surprises? I'm taking 3 founding clients at $99 instead of $199.
Even a share or an intro would help me a lot 🙏 Details: https://snapforgelab.com/founding-review/
```

À qui : contacts WhatsApp / LinkedIn / Instagram qui construisent, freelancent ou ont un side project ; anciens collègues ; communautés (Discord, Slack) où l'auto-promo est autorisée.

### 2.2 Réponse publique utile (X, Reddit, forum Replit)

Règles :
- Réponds à **leur** question en 3 à 5 lignes, avec un seul prochain pas concret.
- **Pas de pitch et pas de lien dans la 1re réponse.** Exception : sur X, un lien vers le guide qui répond exactement à la question.
- **Forum Replit et Reddit : jamais d'offre de service dans le fil.** Ton site va dans ton profil. Tu ne fais un DM que si la personne le demande ou répond à ta réponse.
- Vérifie chaque réponse avant de poster : ne donne que ce dont tu es sûr.

Squelette :
```
[Diagnostic en une phrase, précis à ce qu'ils ont décrit].
Premier truc à vérifier : [une chose concrète : logs de déploiement, secrets, DATABASE_URL, type de déploiement].
[La correction en une ligne, si tu la connais].
Si ça bloque encore après ça, envoie-moi l'erreur et je regarde.
```

Guides à citer selon le problème (sur X, ou en DM) :

| Problème vu | Guide |
|---|---|
| Marche dans l'espace de travail, casse une fois déployé | `/guides/deploy-replit-app-to-production/`, `/guides/replit-deployment-types/` |
| « Mon app est-elle sûre ? », clés exposées | `/guides/replit-agent-security-checklist/`, `/guides/replit-secrets-api-keys/` |
| Base de données vide ou perdue en prod | `/guides/replit-production-database/` |
| Facture qui explose | `/guides/replit-agent-costs/` |
| L'Agent casse l'app à chaque prompt | `/guides/replit-agent-keeps-breaking-app/` |
| Replit ou Lovable ou Bolt | `/guides/replit-vs-lovable-vs-bolt/` |

### 2.3 Premier DM (froid)

Seulement à : (a) quelqu'un qui a répondu à ta réponse publique, ou (b) quelqu'un qui vient de lancer publiquement une app faite avec Replit et dont les DMs sont ouverts. Jamais de DM Reddit non sollicité.

```
Hey [name], saw [app]: nice work getting it live. I review apps built with Replit before real users hit them (I'm a top 1% Replit Agent user). Want me to spot the 3 biggest risks from the outside and send you a 5-min video? Free, no strings.
```

### 2.4 Après leur « oui » : la vidéo, puis l'offre

Enregistre un Loom de 5 minutes sur leur app publique : 3 risques visibles de l'extérieur. Exemples à chercher : pages admin ou debug accessibles sans connexion, messages d'erreur qui exposent des détails, formulaires sans validation ni limite de requêtes, en-têtes de sécurité manquants, API qui renvoie plus de données que l'écran n'en affiche (visible dans l'onglet Réseau du navigateur). Ne prétends jamais avoir vu l'intérieur.

```
Here's the video: [loom link]. Those are the risks visible from the outside. The ones that usually hurt (access control on every route, secrets, database, cost limits) need a look inside, which is what my 48h review does. Normally $199.
I'm taking 3 founding clients at $99 in exchange for a short testimonial: https://snapforgelab.com/founding-review/ (example report: https://snapforgelab.com/replit-app-to-production/example-report/). Want a spot?
```

### 2.5 Closing (après un « oui » explicite)

```
Great, glad to do it. Three steps: 1) pay here: https://paypal.me/mbsimo/99USD 2) email your Repl link to hello@snapforgelab.com with one line on who uses the app 3) invite hello@snapforgelab.com as a collaborator (read access is enough). Report + video within 48h of access. Fewer than 3 real issues found = full refund.
```

### 2.6 Relances (une seule fois chacune)

À 24 h :
```
No pressure, just making sure the video didn't get buried. It's yours to keep either way.
```
À 5 jours (mets le **vrai** nombre de places restantes) :
```
Quick note: [N] of the 3 founding spots are still open. If your launch is further out, keep the video and ping me when it gets close.
```

### 2.7 Objections

| Ils disent | Tu réponds |
|---|---|
| « Pourquoi pas le Security Agent de Replit ou un scanner automatique ? » | « Bonne première passe, je le lance aussi. Il ne teste pas ton app avec plusieurs utilisateurs, ne regarde pas ta base de prod, tes sauvegardes, tes coûts ni ton déploiement. C'est ce que je regarde. » |
| « Tu peux aussi corriger ? » | « Oui : le Ship-It Sprint (990 $, 5 jours) corrige toute la liste, et ta review de 99 $ est déduite. » |
| « Trop cher / pas de budget » | « Compris. La vidéo de 5 minutes reste à toi. Recontacte-moi quand le lancement approche. » |
| « Qui es-tu ? » | Page `/about/` (badge Replit Agent top 1 %), rapport exemple, garantie remboursement, paiement PayPal en « Biens et services ». |
| « Mon code reste confidentiel ? » | « Accès en lecture seule, je ne modifie rien, et mes conditions (`/terms/`) disent que code et données restent confidentiels. » |
| « Je dois donner un témoignage ? » | « Seulement si la review t'a servi. Et tu valides tout cas d'étude avant publication. » |

### 2.8 Post « free teardown » (X et LinkedIn, ce soir)

```
This week I'm doing 3 free 5-minute teardowns of apps built with Replit: what I'd fix before real users show up.
Reply or DM me your app link. I'll pick 3 and send you a video.
(I'm Simo, top 1% Replit Agent user. Independent Replit specialist.)
```

Ensuite, tu ne fais que **3** teardowns (ceux qui répondent en premier), puis §2.4.

---

## 3. Où chercher les gens qui ont le problème maintenant

**X** (onglet « Récent » déjà appliqué) :
- Vient de lancer : https://x.com/search?q=%22built%20with%20replit%22%20(launched%20OR%20live%20OR%20%22just%20shipped%22)%20lang%3Aen&f=live
- Déploiement cassé : https://x.com/search?q=replit%20(deploy%20OR%20deployment%20OR%20deployed)%20(stuck%20OR%20broken%20OR%20error%20OR%20help)%20lang%3Aen&f=live
- Sécurité : https://x.com/search?q=%22replit%20agent%22%20(security%20OR%20secure%20OR%20hacked%20OR%20exposed%20OR%20leaked)%20lang%3Aen&f=live
- « Est-ce prêt ? » : https://x.com/search?q=replit%20(%22real%20users%22%20OR%20%22paying%20customers%22%20OR%20production)%20(worried%20OR%20nervous%20OR%20%22is%20it%20safe%22%20OR%20ready)%20lang%3Aen&f=live
- Base de données perdue : https://x.com/search?q=replit%20database%20(deleted%20OR%20lost%20OR%20wiped%20OR%20%22went%20down%22)%20lang%3Aen&f=live
- Vibe coding : https://x.com/search?q=(%22vibe%20coded%22%20OR%20%22vibe%20coding%22)%20replit%20(launch%20OR%20customers%20OR%20users)%20lang%3Aen&f=live

**Reddit** :
- https://www.reddit.com/r/replit/new/
- https://www.reddit.com/r/replit/search/?q=deploy%20OR%20production%20OR%20security&restrict_sr=1&sort=new
- https://www.reddit.com/r/vibecoding/search/?q=replit&restrict_sr=1&sort=new
- https://www.reddit.com/search/?q=replit%20agent%20production&sort=new&t=week

**Forum Replit** (sections Deployments et Agent) : https://replit.discourse.group/latest

**Google, sur la dernière semaine** : https://www.google.com/search?q=site%3Areddit.com+replit+%22production%22+help&tbs=qdr:w

Aussi : le Discord Replit (salons d'aide et de partage), les commentaires sous les lancements Product Hunt et Indie Hackers « built with Replit », et les posts LinkedIn « j'ai construit mon app avec Replit ».

Signal d'un bon prospect : app **déjà en ligne ou sur le point de l'être**, avec de vrais utilisateurs ou de l'argent en jeu. Un simple curieux ou un débutant en apprentissage n'achètera pas.

## 4. Vitrines (bloc 3)

- **Contra** : profil en ligne tout de suite ; texte dans `docs/cash-sprint-7-days.md` (J1).
- **Fiverr** : gig « I will review your Replit app for production in 48 hours », paquet à 199 $. La demande existe : des gigs « fix Replit AI app / app audit » se vendent déjà autour de 200 $.
- **Upwork** : approbation du profil en 1 à 3 jours, puis Project Catalog et candidatures (`cash-sprint-7-days.md`).

Concurrence à connaître : scanners automatiques (par exemple vibeappscanner.com) et gigs Fiverr. Ton angle : un humain qui teste les vrais scénarios, un rapport priorisé et une vidéo.

## 5. Après le paiement

1. Réponds **dans l'heure** avec le message post-paiement de `docs/review-delivery-kit.md`.
2. Livre en moins de 48 h après l'accès, avec le kit (audit environ 2 à 3 h).
3. À la livraison, demande le témoignage :
```
Glad it was useful. Could you write 2-3 sentences about the review that I can quote (name and role optional)? And are you OK with me publishing the report as an anonymous case study? You'll see it before it goes anywhere.
```
4. Propose le Sprint : « ta review de 99 $ est déduite des 990 $ ».
5. Dis-moi « première vente » : je remplace l'exemple fictif par le rapport anonymisé et j'ajoute le témoignage sur le site.

## 6. Suivi du jour

| Heure | Canal | Contact | Étape (contacté / répondu / vidéo / offre / payé) | Prochaine action |
|---|---|---|---|---|
| | | | | |
