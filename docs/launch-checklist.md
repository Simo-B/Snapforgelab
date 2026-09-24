# Checklist de mise en ligne

## 1. Décisions business à confirmer AVANT de publier
Ces éléments ont été ajoutés pour convertir plus vite. Modifie-les dans `public/index.html` (+ JSON-LD) si tu n'es pas d'accord :

- [ ] **Ship-Ready Review à $290** (nouvelle offre d'entrée, 72h, crédité si fixes)
- [ ] **Offre fondateurs** : 3 prochains Starter à $990 contre un case study
- [ ] **Paiement 50 % / 50 %** (à la mise en ligne)
- [ ] **Délai « about 7 days »** pour un Starter
- [ ] **14 jours de corrections post-lancement** inclus
- [ ] **Run $300/mois** : support « 1 business day », mises à jour sécurité
- [ ] Templates $99 passés en « coming soon » (au lieu d'un bouton qui menait au formulaire)

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
