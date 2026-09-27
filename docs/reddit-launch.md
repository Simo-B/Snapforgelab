# Reddit launch kit : Replit Readiness Score

Outil promu : https://snapforgelab.com/tools/replit-readiness-score/
Objectif : visiteurs, backlinks, retours concrets, DM de personnes qui ont une vraie app. **Aucune mention de l'offre payante ($199 Ship-Ready Review) dans les posts ni dans les commentaires publics.** Si quelqu'un demande en DM « tu fais ça en service ? », tu peux répondre en DM, pas en public.

Principe directeur : chaque post doit être utile **même si personne ne clique**. On met donc la checklist elle-même dans le post, et l'outil devient « la version interactive qui calcule le score ».

---

## 0. Ce qui est vérifié et ce qui ne l'est pas (à lire en premier)

Vérification faite le 2026-09-27. **Je n'ai pu lire directement les règles d'aucun subreddit** : reddit.com est bloqué depuis mon environnement (WebFetch refusé), et les sites tiers qui recopient les règles (redditmaster, redditgrowthdb) sont aussi bloqués. Je n'ai eu accès qu'aux extraits de moteur de recherche de sites tiers.

| Sub | Statut | Source |
|---|---|---|
| r/replit | **Non vérifié.** Aucune source trouvée sur ses règles. | — |
| r/vibecoding | **Non vérifié.** Seule info : une page de stats (gummysearch) décrit l'autopromotion et les demandes de conseil comme les types de discussion les plus fréquents. Ça ne dit rien des règles. | gummysearch.com/r/vibecoding |
| r/SideProject | **Partiellement, via des tiers (non confirmé sur Reddit).** Autopromotion bienvenue (c'est le but du sub). Il faut montrer quelque chose de réel (démo, captures), pas juste une idée. Pas de lien dans le titre ; format de titre conseillé « Nom - courte description ». Le même projet pas plus d'une fois par mois environ. | rankhog, growreddit, launchwake, mediafa.st (extraits de recherche) |
| r/indiehackers | **Partiellement, via des tiers (non confirmé sur Reddit).** Autopromotion autorisée **une seule fois par produit**, avec le flair **« SHOW IH »**, présentée comme une demande de retours. Les chiffres de MRR doivent être prouvés. Selon cette source, pas de minimum de karma ou d'ancienneté. | gofindevo, oneup.today (extraits de recherche) |
| Règle Reddit générale | Recommandation « 90/10 » (au plus environ 10 % de ton activité renvoie vers ton site). Reprise par tous les guides ; c'est une norme, pas une règle automatique. | redship.io, founderreply (extraits de recherche) |

**Action obligatoire avant chaque post (5 min) :** ouvre `reddit.com/r/<sub>/about/rules` + la barre latérale + les posts épinglés (souvent un « weekly self-promo thread »). Si la règle dit « promo seulement dans le thread hebdo », poste **là** et pas en post normal. En cas de doute, envoie un modmail court (modèle en section 2.6). Tout ce qui suit sur r/replit et r/vibecoding est **supposé** et doit être confirmé ainsi.

---

## 1. Titre : amélioration du brouillon

Brouillon : *"I made a free 2-min 'readiness score' for Replit Agent apps (security, data, deploy)"*

Problèmes : « I made a free… » est la formule la plus vue sur ces subs (ça sonne pub), et le titre parle de l'outil au lieu du problème du lecteur.

Règle : le titre annonce **l'insight** ; l'outil est la conséquence. Variantes ci-dessous par sub. Pas de majuscules partout, pas d'emoji, pas de lien dans le titre.

---

## 2. Posts par subreddit

Ordre conseillé (un sub par jour max, jamais deux le même jour) :
1. r/replit (audience la plus ciblée) → 2. r/vibecoding → 3. r/SideProject → 4. r/indiehackers → 5. options (r/nocode, r/webdev Showoff Saturday).

Si le premier post est supprimé : **ne pas reposter ailleurs le même jour**. Lire le motif, corriger, modmail si besoin.

**Heures de publication :** je n'ai pas de données vérifiées par sub. Hypothèse raisonnable pour une audience internationale mais majoritairement nord-américaine : **mardi à jeudi, 13:00–15:00 UTC** (matin côte Est US, après-midi Europe). Mieux : regarde l'heure des 10 posts « Top – this week » du sub et cale-toi dessus. Reste disponible **3 heures après publication** pour répondre vite : c'est le facteur que tu contrôles le plus.

### Bloc commun réutilisable : la checklist (à coller dans les posts)

Questions identiques à celles de l'outil (vérifié dans le code, 12 questions, même ordre).

```
The 12 questions (be honest; "not sure" usually means it isn't set up):

Security
1. Are all API keys and passwords stored in Replit Secrets (never in code or chat)?
2. Are secret keys kept off the frontend (no third-party API calls with secret keys from the browser)?
3. Have you tested that user B cannot see or edit user A's data by changing an ID?
4. Are admin features protected on the server, not just hidden in the UI?
5. Does the server validate every input (forms, API bodies, uploads)?

Data
6. Does the published app use its own production database, with the reference data it needs?
7. Have you actually tested restoring a backup?

Reliability
8. Do you get alerted when the app errors or goes down?
9. Can you roll back a bad release in minutes?

Costs
10. Do AI and paid-API endpoints have rate limits and a spending cap?

Deployment
11. Does your deployment type fit the app (no background jobs or websockets on Autoscale)?
12. Is the app on a custom domain with HTTPS, using live production keys?
```

### 2.1 r/replit

- **Lien autorisé ?** Non vérifié. Hypothèse : un outil gratuit, sans inscription, spécifique à Replit, est généralement accepté s'il apporte de la valeur, mais vérifie s'il existe un flair type « Share / Showcase » ou un thread dédié.
- **Format :** post **texte**. Checklist complète dans le corps, **un seul lien** vers l'outil vers la fin. Flair : celui qui correspond le mieux à « Tips / Resources / Share » s'il existe.
- **Divulgation :** dire clairement que c'est ton site.
- **Heure :** mar–jeu 13:00–15:00 UTC (supposé).

**Titre :**
> The 12 things I check before calling a Replit Agent app "production ready"

Alternative : *"Most Replit Agent apps I see break on the same 5 things after launch. Here's my pre-launch checklist"* (n'utilise cette version que si c'est vrai pour toi).

**Corps :**
```
I build a lot with Replit Agent, and the pattern I keep seeing is: the app works
great in the preview, then something boring breaks after real users show up.
Usually it's not the code the Agent wrote, it's the stuff around it: secrets,
the database, deploys, costs.

So I wrote down the checklist I go through before I'd put real users on an app.

[paste the 12-question block here]

If you answered "no" or "not sure" to 3+ of these, that's normal for an app built
in a weekend, but fix those before you share it widely.

I also turned this into a small interactive version that gives you a 0-100 score
per area and a prioritized "fix this first" list: [link with UTM]
It runs in your browser, no signup. Disclosure: it's on my own site.

Two things I'd like feedback on:
- Is there a question you'd add or remove?
- Does the scoring feel fair for your app, or does it over-weight something?
```

### 2.2 r/vibecoding

- **Lien autorisé ?** Non vérifié. L'autopromo semble fréquente sur ce sub (source tierce), mais ce n'est pas une règle. Vérifie flair et thread épinglé.
- **Format :** texte. Angle **plus large que Replit** : le public utilise aussi Lovable, Bolt, Cursor. Précise honnêtement que le score est calibré pour Replit mais que la plupart des questions s'appliquent partout.
- **Heure :** mar–jeu 13:00–15:00 UTC (supposé).

**Titre :**
> Your vibe-coded app works in preview. Here are 12 questions to check it'll survive real users

**Corps :**
```
The gap between "it works on my screen" and "strangers can use it" is where most
vibe-coded apps get hurt: leaked keys, one shared database for dev and prod,
surprise AI bills, no way to roll back after the agent "fixes" something.

Here's the list I run through. It's written for Replit Agent because that's what I
use most, but almost all of it applies to Lovable/Bolt/Cursor apps too.

[paste the 12-question block here]

The one people skip most often in my experience: #5 (restore yesterday's data).
Agents are good at confidently rewriting a schema.

If you want the scored version (0-100 per area + what to fix first, with links to
free guides for each fix): [link with UTM]. Browser-only, no signup, my own site.

What would you add? I'm especially curious what broke first for people who
already launched.
```

### 2.3 r/SideProject

- **Lien autorisé ?** D'après des sources tierces, oui : c'est l'objet du sub. Non confirmé sur Reddit.
- **Format :** texte (ou image + texte) avec **une capture d'écran du résultat** (score + liste « what to fix »). Pas de lien dans le titre. Titre au format « Nom - description » (conseil tiers).
- **Angle :** le récit de construction + demande de retours précise. Pas la checklist complète ici, un résumé suffit.
- **Heure :** mar–jeu 13:00–15:00 UTC (supposé).

**Titre :**
> Replit Readiness Score - a 12-question check for whether an AI-built app is ready for real users

**Corps :**
```
What it is: 12 yes/no/not-sure questions about an app built with Replit Agent.
You get a 0-100 score across Security, Data, Reliability, Costs and Deployment,
plus a prioritized list of what to fix first. Each fix links to a free guide.

Why I built it: I kept answering the same pre-launch questions for people building
with Replit Agent (secrets, dev vs prod database, which deployment type, runaway AI
costs). A checklist in a doc didn't get used, a score did.

How it's built: static page, all scoring happens in the browser, nothing is sent
anywhere unless you choose to leave an email at the end.

Link: [link with UTM]  (screenshot of a result below)

Feedback I'm looking for:
- Did any question feel unclear or not applicable to your app?
- Did your score match your gut feeling about how ready your app is?
```

### 2.4 r/indiehackers

- **Lien autorisé ?** D'après des sources tierces : **une seule fois par produit**, flair **SHOW IH**, format « demande de retours ». Non confirmé sur Reddit. Comme c'est ta seule cartouche ici, garde ce post pour quand l'outil aura intégré les retours des subs précédents.
- **Format :** texte, récit + leçon. Pas de chiffres de revenus (sinon preuve exigée).
- **Heure :** mar–jeu 13:00–15:00 UTC (supposé).

**Titre :**
> Show IH: I replaced my "pre-launch checklist" doc with a 2-minute score. People actually finish it now

(Garde la deuxième phrase uniquement si tu as observé que les gens le terminent ; sinon : *"Show IH: a free readiness score for AI-built apps. Looking for feedback on the scoring"*.)

**Corps :**
```
Context: solo founder, I help people ship apps built with Replit Agent.

Lesson that led to this: I used to send people a long checklist. Nobody finished
it. Turning the same content into 12 yes/no/not-sure questions with a score at the
end changed the behavior: a number is easier to act on than a doc.

What it does: 0-100 score across Security, Data, Reliability, Costs, Deployment,
then a "fix this first" list linking to free guides. No signup, runs in the browser.

[link with UTM]

Where I'd love critique:
1. The weighting: should security count more than deployment?
2. Is "not sure" treated fairly? (It gets 30% of the points: unchecked usually means not done.)
3. Anything that makes it feel like a lead magnet rather than a tool?
```

(Dernière question volontaire : ça désamorce le soupçon de marketing et donne des retours utiles.)

### 2.5 Subs complémentaires suggérés (règles non vérifiées)

- **r/nocode** : public proche, beaucoup d'utilisateurs de builders IA. Réutilise le post r/vibecoding. Vérifie s'il y a un thread promo.
- **r/webdev, « Showoff Saturday »** : convention connue de ce sub (promo uniquement le samedi), **non vérifiée cette fois**. Public de devs plus exigeant : insiste sur « ce que le score ne mesure pas ».
- À éviter au début : r/SaaS, r/startups, r/Entrepreneur (réputés stricts sur l'autopromo, et ton outil y est hors cible).

### 2.6 Modmail si les règles sont floues

```
Hi mods, I built a free, no-signup tool that scores how production-ready a
Replit Agent app is (12 questions, runs in the browser). I'd like to share it as a
text post with the full checklist in the body so it's useful without clicking.
Is that OK here, and is there a flair or thread you'd prefer? Thanks.
```

---

## 3. Plan d'échauffement 7 jours (avant le premier post)

But : un historique crédible, un peu de karma de commentaire, et comprendre la culture de chaque sub. **Aucun lien vers snapforgelab.com pendant ces 7 jours.**

Profil : pseudo neutre et humain, bio courte (« Solo builder. I help people ship Replit Agent apps. »), lien du site dans le profil uniquement. Vérifie ton email Reddit (souvent requis par les filtres anti-spam).

| Jour | Où | Quoi | Volume |
|---|---|---|---|
| J1 | r/replit, r/vibecoding | Rejoindre, lire règles + top de la semaine/du mois. Noter les questions récurrentes. Commenter des questions de débutants où tu sais répondre précisément. | 3–4 commentaires |
| J2 | r/replit | Répondre à des posts « mon déploiement ne marche pas », « la DB a disparu », « l'Agent tourne en boucle ». Réponse concrète en étapes. | 4–5 |
| J3 | r/vibecoding, r/SideProject | Donner un vrai retour sur 2–3 projets partagés (un point positif précis + une amélioration concrète). | 4–5 |
| J4 | r/replit, r/indiehackers | Commentaires d'expérience (« ce qui m'a coûté le plus cher avec l'Agent », etc.). | 4–5 |
| J5 | Un sub au choix | **Un post texte sans aucun lien** : une astuce utile (ex. « How I stop Replit Agent from rewriting my schema » ou « dev vs prod database on Replit, explained simply »). Teste la réception. | 1 post + réponses |
| J6 | Tous | Répondre à tous les commentaires de ton post J5. Continuer à aider. | 4–5 |
| J7 | Tous | Idem, repérer les meilleures heures (quand les posts du jour prennent). Préparer les liens UTM et la capture d'écran. | 3–4 |

Total ≈ 25–30 commentaires utiles + 1 post sans lien. Qualité > volume : 3 bonnes réponses valent mieux que 10 « great project! ».

Bonnes pratiques de commentaire :
- Répondre à la question posée d'abord, en étapes numérotées.
- Pas de copier-coller identique entre threads (détecté comme spam).
- Après le lancement, tu pourras citer un guide **seulement quand il répond exactement à la question**, en le signalant : « I wrote a guide on this (my site): … ». Reste sous environ 1 commentaire avec lien pour 10.

Si ton compte est très récent et que tes commentaires n'apparaissent pas (vérifie en navigation privée), c'est probablement un filtre AutoModerator d'ancienneté/karma : continue l'échauffement quelques jours de plus avant de poster.

---

## 4. Modèles de réponses (en anglais, à personnaliser)

Adapte toujours la première phrase au commentaire précis. Aucune ne se termine par un pitch.

**1. Compliment**
```
Thanks, appreciate it. Out of curiosity, which area came out lowest for you?
That's the part I'm trying to make the "what to fix" list most useful for.
```

**2. « C'est juste du marketing »**
```
Fair to be skeptical, it's on my own site and there's an optional email box at
the end. But the whole checklist is in the post, the score runs in your browser,
and nothing is sent unless you type an email. If the questions are useful without
the tool, that's fine by me. Anything in the list you think is wrong?
```

**3. « Il manque X » / « Qu'est-ce qui manque ? »**
```
Good call, [X] is a real gap. Right now it's partly covered by #[n], but not
explicitly. Would you check it as a yes/no question, or is it more nuanced than
that? I'd rather add it properly than as a vague question.
```
(Et si tu l'ajoutes vraiment, reviens dans le thread dire « added, thanks ».)

**4. « Comment le score est calculé ? »**
```
Each question has a weight based on how much damage the gap can cause, and the
weights add up to 100. Yes = full points, no = zero, "not sure" = 30% of the
points (an unchecked item is usually an open one, but not always).
Roughly: Security is 48 points (the ownership check alone is 14, secrets 12),
Data 18, Deployment 14, Reliability 11, Costs 9. Anything that costs you 8+
points shows up as "must-fix", the rest as "fix soon".
Happy to be told the weights are off. Which one would you change?
```

**5. Quelqu'un partage son score / son app**
```
Nice, [score] with [strong area] already solid is a good place to be. From what
you described, I'd do [their lowest item] first, since [one concrete reason].
The rest can wait until you have real users.
```

**6. Quelqu'un demande de l'aide sur un problème précis**
```
[Direct answer in 2-4 numbered steps.]
If that doesn't fix it, post the error message (with any keys removed) and
I'll take a look here.
```
(Garder l'aide en public : elle profite à tout le thread et construit ta réputation. Si la personne t'écrit en DM, réponds en DM.)

**7. « Pourquoi Replit seulement ? / Et Lovable, Bolt ? »**
```
It's tuned for Replit because the fixes are platform-specific (Secrets, deployment
types, the separate prod database). Most of the questions still apply elsewhere.
I did write up how the three compare on these points if useful: [guide link]
```

**8. Critique d'une question (« #8 n'a pas de sens pour mon app »)**
```
That's useful, thanks. You're right that [question] assumes [assumption], which
doesn't hold for [their case]. I'll reword it. How would you phrase it?
```

---

## 5. À ne pas faire (suppressions, bans, shadowban)

- Poster le **même texte** dans plusieurs subs le même jour, ou crossposter en masse.
- Mettre un lien dans le titre, ou un post « lien seul » sans explication.
- Poster un lien dans un sub qui limite la promo à un thread hebdo.
- Demander des upvotes, faire voter des amis, utiliser un 2e compte (vote manipulation = ban site-wide).
- Supprimer un post qui marche mal pour le reposter (vu comme contournement).
- Commenter avec un lien vers ton site sur des threads qui ne le demandent pas.
- Mentionner l'offre payante ou « DM me for a review » en public.
- Des chiffres inventés ou non prouvés (« 500 apps auditées », MRR) : la crédibilité se perd vite et r/indiehackers exige des preuves pour le MRR.
- Répondre sur la défensive à une critique.
- Utiliser un raccourcisseur d'URL (bit.ly, etc.) : souvent filtré automatiquement. Les paramètres UTM sur le vrai domaine sont OK.
- Enchaîner beaucoup de commentaires en peu de temps depuis un compte neuf (rate limit + filtre spam).

---

## 6. Mesure des résultats

### Liens UTM (un par sub, et un pour les commentaires)

Format : `?utm_source=reddit&utm_medium=social&utm_campaign=<sub>&utm_content=<post|comment>`

```
https://snapforgelab.com/tools/replit-readiness-score/?utm_source=reddit&utm_medium=social&utm_campaign=replit&utm_content=post
https://snapforgelab.com/tools/replit-readiness-score/?utm_source=reddit&utm_medium=social&utm_campaign=vibecoding&utm_content=post
https://snapforgelab.com/tools/replit-readiness-score/?utm_source=reddit&utm_medium=social&utm_campaign=sideproject&utm_content=post
https://snapforgelab.com/tools/replit-readiness-score/?utm_source=reddit&utm_medium=social&utm_campaign=indiehackers&utm_content=post
https://snapforgelab.com/tools/replit-readiness-score/?utm_source=reddit&utm_medium=social&utm_campaign=nocode&utm_content=post
```
Pour un lien vers un guide dans un commentaire : même schéma sur l'URL du guide, avec `utm_content=comment`.

Note : une partie du trafic Reddit arrive sans référent (applis mobiles). Les UTM compensent ça ; vérifie aussi que l'outil enregistre bien les événements « quiz terminé » et « email laissé » avec la source (sinon, tu ne verras que des visites).

### À suivre après 48 h, par sub (tableau simple)

| Mesure | Où la lire |
|---|---|
| Post toujours en ligne (vérifié en navigation privée) | Reddit |
| Ratio d'upvotes + score | Reddit (affiché sur le post) |
| Nombre de commentaires **substantiels** (pas « nice ») | Reddit |
| Visites de l'outil par `utm_campaign` | Analytics |
| Quiz terminés / visites | Analytics (événement) |
| Emails laissés | Ton outil d'email |
| DM de personnes avec une vraie app en cours | Reddit |
| Backlinks / mentions (quelqu'un recopie ou cite l'outil) | Recherche Google « snapforgelab », Search Console |
| Idées concrètes d'amélioration de l'outil | Tes notes |

### Ce qui compte comme un succès à 48 h

Je ne fixe pas de chiffres « normaux » : je n'ai pas de données fiables pour ces subs. Fixe **tes propres seuils** avant de poster, puis compare les subs entre eux. Critères qualitatifs :

- **Minimum :** post non supprimé, ratio d'upvotes positif, au moins quelques commentaires de fond, et au moins une amélioration concrète à apporter à l'outil.
- **Bon :** des gens partagent leur score dans les commentaires, au moins un DM d'une personne avec une app réelle, taux de complétion du quiz correct par rapport aux visites.
- **Excellent :** quelqu'un sauvegarde/cite la checklist ailleurs (backlink), un modérateur ou un membre régulier recommande l'outil.

Décision après chaque post : si un sub donne des DM qualifiés mais peu de visites, c'est quand même un bon sub pour toi (c'est l'objectif réel). Si un post est supprimé, note le motif ici avant de passer au suivant.

### Journal de lancement (à remplir)

| Date (UTC) | Sub | Titre utilisé | En ligne à 48 h ? | Upvotes / ratio | Commentaires utiles | Visites | Quiz terminés | Emails | DM qualifiés | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| | r/replit | | | | | | | | | |
| | r/vibecoding | | | | | | | | | |
| | r/SideProject | | | | | | | | | |
| | r/indiehackers | | | | | | | | | |

---

Sources consultées (extraits de recherche uniquement, pages non lues en entier) : rankhog.com/subreddits/sideproject, growreddit.com, launchwake.com/channels/r-sideproject, mediafa.st/subreddit/sideproject, gofindevo.com/subreddits/indiehackers, oneup.today/best-subreddits-indie-hackers, gummysearch.com/r/vibecoding, redship.io/blog/reddit-self-promotion-rules, founderreply.com/guides/reddit-self-promotion-rules.
