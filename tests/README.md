# Tests

Tests de bout en bout (Playwright, base Supabase simulée). Aucun ne touche une vraie base.

Lancer tout : `sh tests/lancer.sh` (prérequis : python3, playwright, google-chrome, npm).
Ils tournent aussi automatiquement sur chaque pull request du dépôt de recette.

`fabrique_tests.py` crée un `test_<nom>.py` par fichier `etapes_<nom>.txt`, à partir de `test_hl.py`.

`lancer.sh` lance aussi, sans toucher aucune base :
- les tests SQL de `tests/sql/` (Postgres en mémoire) ;
- le **contrôle de structure** : pour chaque relevé de `migrations/releves/`, 000 et les migrations sont rejouées
  jusqu'à la `derniere_migration` du relevé, et la structure obtenue doit être identique à celle relevée sur les
  vraies bases (`scripts/rejouer-migrations.mjs`). Une migration modifiée ou mal ordonnée fait échouer « Vérifier ».

Scénarios IT-04 : `etapes_iv` (invitations : rôle, usage unique, révocation, rôle d'un membre, lien déjà servi),
`etapes_lc` (lecteur : aucun bouton de saisie, action forcée refusée), `etapes_au` (« Supprimé récemment » et
restauration), `etapes_cf` (page de confidentialité et ses liens) ; `etapes_vx` vérifie l'information avant la première
dictée. Avec la variable `CAPTURES=<dossier>`, ces scénarios enregistrent des captures à 390 et 1 280 px.

Scénario IT-07 : `etapes_rn` (en-tête de la fiche colonie, nouvelle reine qui clôture l'ancienne, correction, « Issue de
Ruche 2 le 12 mai », onglets Santé et Reine & lignée, journal unifié, saisie sans réseau, aucune écriture directe de
`annee_reine`, base sans 019). Avec `CAPTURES=<dossier>` : captures à 375 et 1 280 px.

Scénario v5.35 : `etapes_cp` (menu latéral qui garde sa position, « Nouvelle visite » à côté d'API, liens sans
soulignement, sélecteur de date maison, agenda en calendrier : jour, mois, semaine, tâche en retard, ajout prérempli).

Scénario v5.36 : `etapes_tb` (Ruchers en tableau : bascule gardée sur l'appareil, recherche, filtres et puces, tri,
colonnes, colonne Colonie fixe au défilement, synthèse en bas, sélection et visite groupée, fiche rapide, cartes, version
ordinateur). Avec `CAPTURES=<dossier>` : captures à 390 et 1 280 px.

Tests SQL seuls : `sh tests/sql/lancer.sh` (voir `migrations/README.md`). En CI, ils ont leur job (« Tests SQL ») et
`lancer.sh` les saute (`SANS_SQL=1`).

Données de démonstration : `APIDOO_DEMO_EMAIL=… APIDOO_DEMO_MOT_DE_PASSE=… node scripts/demo.mjs` (apidoo-test par
défaut ; refuse la production).

`tests/production/` ne contient pas de test automatique : ce sont les données d'essai à charger à la main dans la base
de production pour vérifier les parcours qui n'ont pas de base simulée fidèle (voir son README).
