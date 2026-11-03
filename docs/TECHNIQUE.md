# Documentation technique

- **Application** : PWA en JavaScript sans framework, publiée par GitHub Pages. `index.html` (styles), `app.js` (cœur),
  puis des modules qui remplacent ou complètent ses écrans, dans cet ordre : `photos.js` (PH), `registre.js` (RG),
  `rappels.js` (RP), `visites-groupees.js` (VR), `etiquettes.js` (ET), `ux.js` (UX, interface v2), `offline.js` (HL, hors ligne),
  `v3.js` (V3, colonie, varroa, récolte…), `nav4.js` (N4, navigation v4), `alveoles.js` (AL, interface Alvéoles et compagnon API). `sw.js` garde l'app sur le téléphone.
- **Configuration** : `config.js` (adresse et clé publique Supabase, environnement).
- **Données** : Supabase (Postgres + Auth + Storage). Accès réservé aux adresses de la table `membres` (`est_membre()`),
  règles RLS sur chaque table. Créations atomiques par `creer_visite` et `creer_vente`.
- **Migrations** : `migrations/`, numérotées, uniquement additives ; état d'application dans `migrations/README.md`.
- **Tests** : `tests/` (Playwright, base Supabase simulée), voir `tests/README.md`. Lancés automatiquement sur chaque pull request de la recette.
- **Environnements** : un seul dépôt, voir `PROCESSUS.md`. La racine porte la configuration de production, `environnements/recette/` celle de la recette.
