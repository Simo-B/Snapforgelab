# Audit du site snapforgelab.com (16 octobre 2026)

Périmètre : les 21 pages de `public/` (identiques au déploiement), testées en local. Le site en ligne n'était pas joignable depuis l'environnement d'audit : je n'ai pas pu tester les pages PayPal ni l'envoi réel d'un formulaire Formspree, et je n'ai pas contrôlé les liens externes.

## Verdict
Techniquement, le site est excellent et n'est pas ce qui bloque la vente. Les manques sont ailleurs : rien ne mesure les visites, le parcours après paiement est incomplet, il n'y a aucune preuve sociale, et les guides proposent la même offre quel que soit le problème du lecteur.

## Mesures
| Contrôle | Résultat |
|---|---|
| Lighthouse mobile : accueil, offre, outil, guide sécurité | Performance 99 à 100 · Accessibilité 100 (95 sur le guide) · Bonnes pratiques 100 · SEO 100 |
| Temps d'affichage principal (LCP) / stabilité (CLS) | 1,1 à 1,4 s / 0 |
| Erreurs JS, ressources manquantes, débordement horizontal (390 et 1280 px, 13 pages) | 0 / 0 / 0 |
| Poids d'une page | 40 à 60 Ko, 3 requêtes |
| Liens internes cassés, ancres manquantes | 0 / 0 |
| H1 unique, canoniques, sitemap complet, JSON-LD valide | Oui sur toutes les pages indexables |
| Mentions interdites ou fausses preuves | Aucune ; voix « je » cohérente ; rareté réelle (3 et 10 places) |
| En-têtes de sécurité | HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy (pas de CSP) |

## P0 : à faire maintenant
1. **Vérifier que le site répond en ligne.** Un outil d'audit a renvoyé une erreur DNS. C'est probablement dû à l'environnement, mais il faut l'ouvrir en 4G et en wifi.
2. **Aucune mesure d'audience.** `main.js` appelle Plausible, mais aucun script n'est chargé, et il n'y a pas de Cloudflare Web Analytics. Le nombre de visiteurs, leur provenance et les pages vues sont inconnus. Correctif : activer Cloudflare Web Analytics, gratuit et sans cookie, déjà prévu dans la politique de confidentialité.
3. **Après le paiement, l'acheteur est seul.** Un lien paypal.me ne renvoie pas vers le site, donc la note `?paid=1` ne s'affiche jamais. Pour le Deploy Fix de l'accueil, aucune étape suivante n'est indiquée. Correctif immédiat : écrire au client dès la notification PayPal. Correctif durable : des boutons PayPal (compte Business) avec un nom d'article et une URL de retour vers une page de remerciement qui donne les étapes.

## P1 : conversion (cette semaine)
4. **Appel à l'action des guides selon l'intention.** Les 9 guides montrent tous la boîte « Ship-Ready Review · $199 ». Les guides Déploiement, Données et Dépannage (`deploy-replit-app-to-production`, `replit-deployment-types`, `replit-production-database`, `replit-agent-keeps-breaking-app`) attirent des gens bloqués : il faut leur proposer d'abord le Deploy Fix à 49 $. Le correctif se fait dans `build.py`, une boîte par sujet.
5. **Preuve sociale.** Aucun témoignage, et le rapport d'exemple est fictif (et indiqué comme tel). Dès la première review, ajouter le témoignage et le rapport anonymisé sur l'accueil et sur la page de l'offre.
6. **Identité vérifiable.** La page À propos n'a aucun lien externe (X, Replit) et pas de `sameAs` dans le JSON-LD. Ajouter le lien vers le compte X public.
7. **Image de partage et accueil.** `og.png` annonce « Deploy fix · $49 », alors que l'accueil met 199 $ en avant dans le hero et l'en-tête. Option : une ligne sous la porte Review, du type « Déploiement bloqué ? Deploy Fix à 49 $ ».

## P2 : petits correctifs
8. Guides : le lien d'auteur (`.author-name a`) ne se distingue que par sa couleur. C'est le seul point d'accessibilité relevé par Lighthouse (95/100) ; le souligner.
9. Huit meta descriptions dépassent 160 caractères et seront coupées par Google : six guides, le rapport d'exemple et l'outil.
10. Le titre de `/about/` fait 63 caractères, au-dessus de 60.
11. Le bouton mobile des guides dit « Get a $199 ship-ready review » et pointe vers le haut de l'offre. Ailleurs, le libellé est « Book the $199 review » et le bouton va vers `#book`.
12. Les images de partage des guides n'ont pas de `?v=2` : X et LinkedIn peuvent garder l'ancien logo en cache.
13. Pas de Content-Security-Policy. Le risque est faible : le site est statique et ne contient aucun contenu publié par des utilisateurs.
14. Choix assumé à garder en tête : sur mobile, l'en-tête n'a pas de menu, et les guides et l'outil ne sont accessibles que par le pied de page.

## À ne pas toucher
La performance, la structure SEO, les en-têtes, les conditions et la confidentialité (sous-traitants déclarés, section Deploy Fix), la cohérence des prix entre pages, le JSON-LD et `llms.txt`.

## Corrections appliquées (16 octobre)
- **Page `/deploy-fix/`** : page de vente du Deploy Fix à 49 $ (indexée, dans le sitemap et `llms.txt`), avec étapes, remboursement, FAQ et JSON-LD. Lighthouse mobile : 100 / 100 / 100 / 100.
- **Après le clic PayPal** (point 3) : chaque bouton PayPal s'ouvre dans un nouvel onglet, et le site affiche les étapes suivantes avec un e-mail pré-rempli (Deploy Fix, review, review fondateur).
- **Guides** (point 4) : les 4 guides Déploiement, Données et Dépannage proposent le Deploy Fix à 49 $ (encadré et bouton collant mobile). Les 5 autres gardent la review, avec un bouton mobile cohérent vers `#book`.
- **Accueil** (point 7) : une ligne Deploy Fix sous les deux portes du hero, et un lien « How the Deploy Fix works → » dans la carte de prix (aussi sur la page de l'offre).
- **À propos** (point 6) : lien vers @Simo_Bc et `sameAs` dans le JSON-LD (page À propos et auteur des guides). Titre ramené à 51 caractères.
- **Petits correctifs** : lien d'auteur souligné, meta descriptions ≤ 160 caractères, `?v=2` sur les images des guides, description de l'offre à la première personne, bouton mobile masqué tant qu'un appel à l'action est déjà à l'écran.

## Reste à faire (hors code)
- Activer Cloudflare Web Analytics (point 2).
- Premier témoignage et rapport anonymisé (point 5).
- Plus tard : boutons PayPal Business avec page de retour.
