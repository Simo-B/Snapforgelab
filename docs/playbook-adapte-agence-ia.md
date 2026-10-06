# Méthode « Agence IA » adaptée à la Ship-Ready Review Replit

Source : la formation gratuite « Agence IA » (Scalify). Elle vend des automatisations à des patrons de PME locales (Make, Twilio, SMS). Ton service est différent : une review de production pour des apps Replit. On garde la **méthode de vente**, pas les offres.

## Ce qui se transfère, ce qui ne se transfère pas
| Idée de la formation | Chez toi |
|---|---|
| Vendre un problème réglé, pas de la technique | « Lancer ton app sans fuite de données ni panne », pas « audit de sécurité » |
| Équation de valeur : résultat × probabilité ÷ (délai × effort) | Résultat : app sûre au lancement. Probabilité : un fait vérifiable sur SON app. Délai : 48 h. Effort : inviter en collaborateur + une ligne |
| Test « client mystère » : un fait sur eux avant de vendre | Observation passive de leur app publique (règle d'éthique ci-dessous) |
| L'échantillon directement dans le message | Les 3 constats dans le premier message, pas « tu veux une vidéo ? » |
| Un prix unique, jamais de remise : on retire du périmètre, pas des euros | 99 $ fondateur pour 3 clients seulement, puis 199 $, puis 390 $ (déjà sur le site) |
| Offre pilote pour les 3 premiers, en échange de la preuve | Déjà fait : page `/founding-review/` |
| Volume chiffré : liste, 150 contacts en 2 semaines, créneau quotidien fixe | Liste de 100 apps, 10 contacts par jour, 20 minutes |
| Revenu récurrent : mise en place + abonnement | Review 199 $ → Sprint 990 $ → Care mensuel |
| Rapport mensuel de 5 lignes, 2e offre au 3e mois | Même chose pour les clients Care |
| Offres Make/Twilio, SMS, appels à froid vers artisans, créas pub | **Non adapté** : autre métier |

## 1. Le test « app mystère » (3 minutes par prospect)
Règle d'éthique, non négociable : **observation passive uniquement**. Tu regardes ce qu'un visiteur normal voit. Tu ne tentes aucune injection, aucun accès à des données d'autrui, aucun scan de chemins cachés. Sinon, c'est de l'intrusion, pas un audit.

Ce que tu peux noter depuis l'extérieur :
1. Le Repl est-il public avec son code visible ? (secrets potentiellement exposés dans les fichiers)
2. Les erreurs affichées à l'écran révèlent-elles des détails techniques ?
3. Les en-têtes de sécurité de base sont-ils absents ? (un outil gratuit comme securityheaders.com le montre)
4. L'onglet Réseau du navigateur : l'API renvoie-t-elle plus de données que l'écran n'en affiche, avec ton propre compte de test ?
5. Aucun mot de passe oublié, aucune limite visible sur les formulaires, etc.

Tu n'écris au prospect que ce que tu as **vraiment** vu. Rien trouvé : tu ne le contactes pas.

## 2. Les 4 messages (en anglais, à personnaliser)
Cadre : « juste pour comprendre », ton parlé, une seule question à la fin, pas de prix dans le premier message.

**Message 1 : l'échantillon**
```
Hi [name], I looked at [app] from the outside, as a regular visitor. Just to understand, is it already used by real customers? Three things I noticed that you may want to check before more users arrive: [1], [2], [3]. Happy to explain any of them.
```
**Message 2, J+4 : un deuxième constat**
```
One more thing I noticed on [app]: [constat]. Does that match what you expected?
```
**Message 3, J+9 : la sortie facile**
```
No worries if the timing isn't right. Should I check back when you're closer to launch, or is this not a priority?
```
**Message 4, J+30 : une phrase**
```
Hi [name], still thinking about [app]. Has anything changed on your side?
```
Après chaque réponse : miroir de leur dernière phrase + « c'est-à-dire ? », puis l'offre en chiffres seulement quand ils parlent de risque ou de lancement.

## 3. L'échange qui signe (chat ou appel de 15 à 20 minutes)
Ordre fixe, comme dans la formation :
1. **Comprendre (6 questions)** : qui utilise l'app ? quelles données (emails, paiements, santé) ? as-tu des utilisateurs payants ? que se passe-t-il si l'app tombe ou perd des données ? qui peut lire les données de qui ? quand lances-tu ou montes-tu en charge ?
2. **Calculer avec lui, sans chiffre inventé** : « Combien d'utilisateurs ? Combien vaut un utilisateur ? Que coûte une journée d'arrêt ? Un remboursement ? » Tu fais le calcul **sur ses chiffres à lui**.
3. **Preuve** : l'exemple de rapport (fictif, indiqué comme tel) et les 3 constats.
4. **Le prix, une fois, sans t'excuser** : « La review est à 99 $ pour les trois premiers clients, ensuite 199 $. Rapport et vidéo en 48 h, remboursement si je trouve moins de 3 vrais problèmes. »
5. **La question de fin** : « Je t'envoie le lien de paiement maintenant ? »

## 4. Objections (question d'abord)
Déjà dans `docs/first-sale-today.md` §2.7. Ajoute : « Replit a déjà un Security Agent » → « Qu'est-ce qu'il t'a remonté sur tes permissions entre utilisateurs ? ».

## 5. Livraison et fidélisation
- Livre avec `docs/review-delivery-kit.md`. Toujours : lecture seule, « non vérifié » plutôt qu'une supposition, secrets jamais recopiés dans le rapport.
- **Revue humaine obligatoire** avant envoi : tu inspectes toi-même le Repl.
- Si le client a des problèmes à corriger : **Sprint à 990 $**, review déduite.
- Après le Sprint : **Care mensuel** (surveillance, mises à jour, rapport de 5 lignes : incidents, correctifs, risques, prochaine action). Seule voie vers un revenu récurrent.
- Cadre légal minimal : périmètre écrit (lecture seule), confidentialité (déjà dans `/terms/`), aucune promesse d'absence de faille, remboursement clair.

## 6. Ton calendrier de 30 jours
| Semaine | Objectif | Actions chiffrées |
|---|---|---|
| 1 | Liste + preuve | 40 apps listées, 10 tests « app mystère », message au réseau |
| 2 | Contacter | 10 messages 1 par jour ouvré, 3 candidatures annonces Replit |
| 3 | Échanger | Relances J+4 et J+9, toutes les réponses traitées sous 15 min |
| 4 | Signer et livrer | 1 à 3 reviews fondateur livrées, témoignages demandés, site mis à jour |

Créneau fixe : 20 minutes par jour. Corrige le **message**, pas l'offre, tant que moins de 50 contacts n'ont pas été faits.

## 7. Construire ta liste de 100 apps
Sources : recherche X « replit.app » et « built with replit », r/replit (showcase), Product Hunt « built with Replit », le Discord Replit, la page Showcase du forum. Colonnes : nom, lien, source, date, constats, statut, dernier contact, prochaine relance.
