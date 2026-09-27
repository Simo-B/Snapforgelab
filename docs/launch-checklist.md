# Checklist de mise en ligne

## 1. Offres & prix (validés)
| Offre | Prix | Conditions |
|---|---|---|
| Ship-Ready Review | 199 $ (10 places, puis 390 $) | 48h, payé d'avance, remboursé si < 3 vrais problèmes |
| Ship-It Sprint | 990 $ | 5 jours, review créditée, 1ᵉʳ mois Care inclus, 50/50 |
| Starter Build | 2 500 $ · 1 500 $ pour 3 fondateurs | ~7 jours, case study en échange, 1ᵉʳ mois Care inclus, 50/50 |
| Care | 249 $/mois | 1ᵉʳ mois inclus, sans engagement |

**Paiement (priorité n°1) : PayPal uniquement**

Option A (recommandée) : lien de paiement PayPal Business
- [ ] Compte PayPal **Business** (gratuit ; un compte perso peut être converti)
- [ ] PayPal → **Pay & Get Paid** → **Payment links and buttons** → **Create payment link**
- [ ] Produit « Ship-Ready Review », prix **199 USD**, quantité fixe
- [ ] Si proposé : demander une note au client « Replit app URL », et page de retour → `https://snapforgelab.com/replit-app-to-production/?paid=1`
- [ ] Copier le lien (`https://www.paypal.com/ncp/payment/...`)

Option B (1 min) : PayPal.me
- [ ] Créer `paypal.me/<nom>` → lien `https://paypal.me/<nom>/199USD`
- [ ] Limite : pas de page produit ni de retour sur le site ; le client doit choisir « biens et services »

Sprint / Build (50/50) : **facture PayPal** (PayPal → Invoicing → Create invoice)

Ensuite :
- [ ] Coller le lien dans `public/assets/main.js` → `const PAYMENT_URL = '...'` (tous les boutons « Get my review » deviennent des boutons d'achat)
- [ ] Quand les 10 places Review sont vendues : passer le prix à 390 $ (lien PayPal + `index.html` + page review + JSON-LD)

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

## 8. SEO « all-in » : contenu en place
- 6 guides dans `content/guides/` → générés dans `public/guides/` par `python3 scripts/build.py`
- Outil gratuit : `/tools/replit-readiness-score/` (aimant à liens + leads)
- `llms.txt` pour les moteurs IA (ChatGPT, Perplexity, Claude)
- ⚠️ Cloudflare → ton domaine → **Security → Bots / AI Crawl Control** : vérifier que les crawlers IA (GPTBot, PerplexityBot, ClaudeBot, Google-Extended) ne sont **pas bloqués** et que le « managed robots.txt » n'interdit pas l'accès, sinon les moteurs IA ne te citeront jamais
- Voir `docs/seo-playbook.md` pour le plan des 90 jours
