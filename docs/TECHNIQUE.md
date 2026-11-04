# Documentation technique

- **Application** : PWA en JavaScript sans framework, publiée par GitHub Pages. `index.html` (styles), `app.js` (cœur),
  puis des modules qui remplacent ou complètent ses écrans, dans cet ordre : `photos.js` (PH), `registre.js` (RG),
  `rappels.js` (RP), `visites-groupees.js` (VR), `etiquettes.js` (ET), `ux.js` (UX, interface v2), `offline.js` (HL, hors ligne),
  `v3.js` (V3, colonie, varroa, récolte…), `nav4.js` (N4, navigation v4), `meteo.js` (MT, météo par rucher), `alveoles.js` (AL, interface Alvéoles, rubriques, fiche rucher, compagnon API). `sw.js` garde l'app sur le téléphone.
- **Mobile** : un seul code pour le web et le téléphone, installé depuis le site. Choix et étapes vers les stores : `MOBILE.md`.
- **Configuration** : `config.js` (adresse et clé publique Supabase, environnement).
- **Données** : Supabase (Postgres + Auth + Storage). Accès réservé aux adresses de la table `membres` (`est_membre()`),
  règles RLS sur chaque table. Créations atomiques par `creer_visite` et `creer_vente`.
- **Migrations** : `migrations/`, numérotées, uniquement additives ; état d'application dans `migrations/README.md`.
- **Tests** : `tests/` (Playwright, base Supabase simulée), voir `tests/README.md`. Lancés automatiquement sur chaque pull request de la recette.
- **Environnements** : un seul dépôt, voir `PROCESSUS.md`. La racine porte la configuration de production, `environnements/recette/` celle de la recette.
- **Créneaux météo** (`meteo.js`, `SEUILS`), cherchés entre 10 h et 16 h sur 3 jours :
  - Température : 15 °C pour une visite normale ([BeekeepingInsider](https://beekeepinginsider.com/whats-the-ideal-hive-inspection-temperature/)), 13 °C pour une visite rapide (55 °F, [Utah State University](https://extension.usu.edu/answers/articles/how-often-should-i-inspect-my-beehive)).
  - Pluie : ces sources disent de ne pas ouvrir sous la pluie, sans chiffre. Apidoo refuse dès 30 % de risque ou de la pluie prévue.
  - Vent : elles disent d'éviter le vent, sans chiffre. Apidoo refuse dès 25 km/h. Ces deux valeurs sont des choix, à ajuster à l'usage.
