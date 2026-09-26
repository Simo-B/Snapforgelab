# Checklist de mise en ligne

## 1. Offres & prix (validés)
| Offre | Prix | Conditions |
|---|---|---|
| Ship-Ready Review | 199 $ (10 places, puis 390 $) | 48h, payé d'avance, remboursé si < 3 vrais problèmes |
| Ship-It Sprint | 990 $ | 5 jours, review créditée, 1ᵉʳ mois Care inclus, 50/50 |
| Starter Build | 2 500 $ · 1 500 $ pour 3 fondateurs | ~7 jours, case study en échange, 1ᵉʳ mois Care inclus, 50/50 |
| Care | 249 $/mois | 1ᵉʳ mois inclus, sans engagement |

**Paiement (priorité n°1), sans Stripe**

Option recommandée : **Gumroad** (≈10 min, pas de validation de compte, TVA mondiale gérée, virement bancaire ou PayPal ; frais ≈ 10 % + 0,50 $)
- [ ] gumroad.com → New product → type « Coaching / Call » ou « Digital product » → nom « Ship-Ready Review », prix 199 $
- [ ] Description : livrables + « Next step: invite hello@snapforgelab.com to your Repl »
- [ ] Ajouter un champ personnalisé obligatoire « Replit app URL »
- [ ] Copier le lien produit (`https://xxx.gumroad.com/l/...`)

Alternatives :
- **Lemon Squeezy** : frais plus bas (5 % + 0,50 $), TVA gérée, redirection après paiement possible (`https://snapforgelab.com/replit-app-to-production/?paid=1`), mais la boutique doit être validée (quelques jours)
- **PayPal** (lien de paiement / bouton « Pay now ») : tout le monde connaît, frais ≈ 4–5 % à l'international, pas de gestion de TVA
- Sprint / Build (50/50) : **facture PayPal** ou **Wise / Payoneer**, envoyée par email

Ensuite :
- [ ] Coller le lien dans `public/assets/main.js` → `const PAYMENT_URL = '...'` (tous les boutons « Get my review » deviennent des boutons d'achat)
- [ ] Quand les 10 places Review sont vendues : passer le prix à 390 $ (plateforme + `index.html` + page review + JSON-LD)

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
