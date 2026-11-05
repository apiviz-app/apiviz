# 09 — Stratégie de tests et de non-régression

## 1. État de départ (vérifié le 5 nov. 2026)

- 18 scénarios Playwright de bout en bout, **tous verts** en local (`sh tests/lancer.sh _site/recette`), lancés en CI sur chaque PR.
- Base Supabase **simulée** par interception réseau (`tests/test_hl.py`) : le SQL, la RLS, les fonctions et déclencheurs ne sont jamais exécutés.
- Pas de tests unitaires, pas de tests SQL, pas de tests visuels automatisés (des captures sont produites par `test_v4` mais non comparées).

## 2. Pyramide cible

| Niveau | Outil | Ce qu'il couvre | Quand | Itération d'introduction |
|---|---|---|---|---|
| Unitaires | `node --test` (sans dépendance) | fonctions pures : formats, finances, varroa, créneaux météo, récurrence, alertes | chaque PR, < 10 s | IT-03 |
| SQL / RLS | Postgres 15 en conteneur CI, `auth.jwt()` simulé par `request.jwt.claims`, assertions SQL (pgTAP possible) | politiques, fonctions `creer_*` et métier, contraintes, déclencheurs, migrations relançables | chaque PR qui touche `migrations/` | IT-04 |
| Bout en bout | Playwright + base simulée (existant) | parcours utilisateur, hors ligne, multi-exploitation | chaque PR | existant |
| Bout en bout réels | Playwright contre `apidoo-test` | 3 parcours critiques (P1, P2, P5 du doc 02) sur la vraie base de recette, données de démo | à chaque mise en recette (workflow Mise en ligne) | IT-04 |
| Visuels | captures Playwright comparées (seuil de pixels) à 375 px et 1280 px | régressions d'affichage pendant la migration du noyau | chaque PR | IT-03 |
| Manuels sur téléphone | rubrique « À vérifier » du CHANGELOG | voix, photo, HEIC, installation, push, plein soleil | avant chaque production | existant |

## 3. Tests par type de risque

| Risque | Test obligatoire |
|---|---|
| Permissions | matrice tables × rôles (responsable, membre, lecteur, saisonnier, non-membre, anonyme) × opérations (select, insert, update, delete) ; résultats attendus dans un fichier de référence |
| Isolation | pour chaque table : un membre de A ne lit ni n'écrit rien de B, même en forçant l'en-tête `x-exploitation` |
| Migrations | 000 + toutes les migrations appliquées **deux fois** sans erreur ; reprise de données vérifiée par des comptes avant/après ; l'ancienne version de l'app (étiquette `deploiement`) passe ses tests e2e sur la base migrée, sauf migration déclarée non rétrocompatible |
| Hors ligne | coupure → N saisies mixtes → retour ; renvoi refusé → quarantaine ; renvoi double → pas de doublon ; changement d'exploitation avec file non vide ; déconnexion avec file non vide |
| Synchronisation | deux contextes navigateur modifiant la même ligne (conflit présenté) |
| Calculs | jeux de données de référence avec résultats attendus écrits à la main (finances, rendements, taux varroa, coûts) |
| Réglementaire | relecture humaine contre la source citée ; la date de vérification figure dans le code ou la doc |
| Responsive | chaque écran migré à 375 et 1280 px |
| Performance | jeu de 300 colonies / 5 000 visites : ouverture < 3 s en 4G simulée, nombre de requêtes par écriture ≤ 2 |

## 4. Données de test

- **Une seule source** de données de démonstration (AP-FEAT-018) : fichier JSON versionné, utilisé par les tests simulés, la recette et le rucher d'exemple.
- Exploitation de démonstration marquée `demo = true` ; les indicateurs et l'assistant excluent les exploitations de démo hors de la démo elle-même.
- **Aucune donnée réelle** dans le dépôt, les artefacts d'Actions ou les captures (le dépôt est public).
- Le script de génération refuse de s'exécuter sur l'URL de production.

## 5. Règles de non-régression

1. Une PR ne supprime ni ne modifie un scénario existant sans le justifier dans la description.
2. Toute anomalie corrigée reçoit un test qui échouait avant la correction.
3. Pendant IT-03 (noyau), chaque écran migré passe les captures visuelles avant fusion.
4. Les rubriques « À vérifier » du CHANGELOG sont cochées par le responsable avant chaque production.

## 6. Définition de terminé (globale)

Une fonctionnalité est terminée seulement si :

- [ ] le parcours utilisateur fonctionne (téléphone et ordinateur si concerné) ;
- [ ] les règles métier des user stories sont respectées ;
- [ ] les données sont enregistrées correctement (vérifiées dans `apidoo-test`) ;
- [ ] les permissions sont contrôlées (tests SQL si la base change) ;
- [ ] les erreurs sont gérées et affichées en français ;
- [ ] les tests (unitaires, SQL, e2e) sont écrits et passent ;
- [ ] les régressions sont vérifiées ;
- [ ] la documentation (CHANGELOG, migrations, backlog, TECHNIQUE) est à jour ;
- [ ] l'interface est utilisable sur mobile ;
- [ ] les limites connues sont écrites.
