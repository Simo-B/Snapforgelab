# Checklist de mise en ligne

## 1. Offres & prix (validés)
| Offre | Prix | Conditions |
|---|---|---|
| Ship-Ready Review | 199 $ (10 places, puis 390 $) | 48h, payé d'avance, remboursé si < 3 vrais problèmes |
| Ship-It Sprint | 990 $ | 5 jours, review créditée, 1ᵉʳ mois Care inclus, 50/50 |
| Starter Build | 2 500 $ · 1 500 $ pour 3 fondateurs | ~7 jours, case study en échange, 1ᵉʳ mois Care inclus, 50/50 |
| Care | 249 $/mois | 1ᵉʳ mois inclus, sans engagement |

**Paiement Stripe (priorité n°1)**
- [ ] Stripe → Payment Links → « Ship-Ready Review » 199 $ USD, collecter l'email, champ personnalisé « Replit app URL », page de confirmation → `https://snapforgelab.com/replit-app-to-production/?paid=1`
- [ ] Coller l'URL dans `public/assets/main.js` → `const STRIPE_REVIEW_URL = 'https://buy.stripe.com/...'` (tous les boutons « Get my review » deviennent des boutons d'achat direct)
- [ ] Créer aussi des Payment Links 50 % (Sprint 495 $, Build fondateur 750 $) et un abonnement Care 249 $/mois, à envoyer par email
- [ ] Quand les 10 places Review sont vendues : passer le prix à 390 $ (Stripe + `index.html` + page review + JSON-LD)

## 2. Déploiement Cloudflare Pages
1. Cloudflare → Workers & Pages → Create → Pages → **Connect to Git** → `Simo-B/Snapforgelab`
2. Build command : *(vide)* · **Build output directory : `public`**
3. Custom domains → ajouter `snapforgelab.com` et `www.snapforgelab.com`
4. Redirection `www` → apex : Rules → Redirect Rules → `www.snapforgelab.com/*` → `https://snapforgelab.com/${1}` (301)
5. Vérifier : `https://snapforgelab.com/x` redirige bien avec les UTM

> Si le site actuel est un déploiement « direct upload », remplace-le par ce projet Git (ou upload le dossier `public/`).

## 3. Formulaire (Formspree `xjybzkza`)
- [ ] Envoyer un test depuis le site en ligne → vérifier que `email`, `workflow`, `attr_source`, `page` arrivent
- [ ] Dans Formspree : activer la notification email + domaine autorisé `snapforgelab.com`

## 4. SEO — indexation (le site n'est pas indexé aujourd'hui)
- [ ] **Google Search Console** → ajouter la propriété Domain `snapforgelab.com` (vérif DNS TXT dans Cloudflare)
- [ ] Soumettre `https://snapforgelab.com/sitemap.xml`
- [ ] Inspection d'URL → « Demander l'indexation » pour les 3 pages
- [ ] **Bing Webmaster Tools** → importer depuis Search Console (alimente aussi ChatGPT/Copilot search)
- [ ] Tester le schema : https://search.google.com/test/rich-results
- [ ] Tester l'aperçu X : poster le lien en brouillon / https://www.opengraph.xyz

## 5. Analytics (gratuit)
- [ ] Cloudflare → Web Analytics → activer sur le projet Pages (un clic, pas de cookie, pas de bannière RGPD)

## 6. Backlinks rapides (autorité de domaine)
- [ ] Profil **Replit Solution Partner** / annuaire partenaires Replit avec lien vers le site
- [ ] Profil X, LinkedIn, GitHub (`Simo-B`) → lien site
- [ ] Indie Hackers (produit + post de lancement), Product Hunt (page « Ship-Ready Review »)
- [ ] Répondre sur Replit Community / Reddit r/replit avec de vraies réponses (lien en signature/profil)

## 7. Contenu SEO — prochaines pages (1/semaine)
Mots-clés à faible concurrence, forte intention :
1. `replit agent security checklist` (article → CTA review)
2. `deploy replit app to production` (guide)
3. `replit internal tool` / `build dashboard on replit`
4. `replit developer for hire` → déjà couvert par `/hire-replit-developer/`
5. `replit vs bubble for business apps`
Ajouter chaque nouvelle page à `public/sitemap.xml` et au footer.
