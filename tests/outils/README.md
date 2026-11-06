# Outils de mesure (IT-03)

Aucun de ces outils ne touche une vraie base : ils reprennent la base simulée de `test_hl.py` et les données de
`etapes_v4.txt`. Prérequis : ceux de `tests/lancer.sh`, plus `supabase.js` et, pour l'écran Carte, le dossier `dist/`
de `leaflet@1.9.4` dans la variable `APIDOO_LEAFLET` (tous deux obtenus par `npm pack`, comme dans `lancer.sh`).

| Outil | Rôle |
|---|---|
| `captures.py <site> <supabase.js> <sortie> [ancien]` | Ouvre les 29 écrans à 375 px et 1 280 px ; PNG et HTML normalisé de `#app`. Identifiants et heure figés : deux séries sont comparables ligne à ligne. |
| `comparer_captures.py <avant> <après> [écran…]` | Diff du HTML normalisé, écran par écran. Sortie 0 si tout est identique. |
| `mesure_ouverture.py <site> <supabase.js> [gros] [ancien]` | Temps médian d'ouverture (5 essais) et nombre de lectures de données. `gros` : 300 colonies, 5 000 visites, 4G simulée. |
| `couverture.py <site> <supabase.js> <sortie.json>` | Couverture des fonctions (Chrome, CDP) sur tous les tests et les captures ; liste des fonctions nommées jamais appelées. |

## Relevés de départ (6 nov. 2026, `main` = `ab93c53`, site de recette assemblé)

- Tests : 25 de bout en bout, 2 SQL, 2 contrôles de structure, tous verts (2 min 45).
- Ouverture, données des tests : médiane 0,55 s, 16 lectures de données.
- Ouverture, 300 colonies et 5 000 visites, 4G simulée : médiane 1,20 s, 20 lectures.
  Limite : les réponses de la base simulée ne passent pas par la limitation de débit de Chrome ; seuls les fichiers
  de l'application la subissent. Le chiffre sert à comparer avant / après, pas à prédire un vrai téléphone.
- Couverture : les écrans `viewDash`, `viewRuche`, `viewVisite`, `viewClients`, `viewPlus`, `viewRuches` et
  `quickSheet` de `app.js`, `viewPlus` de `ux.js`, `viewGestion` de `nav4.js` et
  `viewRuches` de `v3.js` ne sont jamais appelés : ce sont les implémentations recouvertes (voir `docs/TECHNIQUE.md`).

Limite de la couverture : c'est un indice, pas une preuve. Quelques fonctions bien exécutées (par exemple
`viewPrevisions`, affichée par les captures) ressortent à zéro appel. Avant toute suppression, la chaîne des surcharges
est vérifiée à la main et les tests repassent.

## Relevés après IT-03 (6 nov. 2026, branche `claude/it-03-noyau`, même machine que `main` mesurée en même temps)

- Tests : 28 de bout en bout, 38 unitaires, 3 SQL, 3 contrôles de structure, tous verts.
- Ouverture, données des tests : médiane 0,48 s (`main` : 0,48 s), 16 lectures. Avant le regroupement des styles et des
  modules à l'assemblage (`scripts/regrouper.py`), la branche ouvrait en 0,70 s : 37 feuilles et 25 modules chargés un
  par un.
- 300 colonies et 5 000 visites, 4G simulée : médiane 0,73 s (`main` : 0,68 s, écart dans le bruit), 20 lectures.
- Captures `main` → branche, 30 écrans × 2 largeurs : différences limitées aux textes passés au tutoiement, au bloc
  Registre de Gestion, aux liens « ‹ Gestion » du registre et de la déclaration, et à la classe d'animation `enter`
  désormais posée sur les 7 écrans d'`essentiels.js`, `alveoles.js` et `tournee.js` qui ne l'avaient pas.
