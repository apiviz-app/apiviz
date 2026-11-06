# Prompt Claude Code — IT-00 Mise à plat de l'existant

> Copier tout le bloc ci-dessous dans Claude Code, à la racine du dépôt `apidoo/apidoo.github.io`.

```text
Tu travailles sur Apidoo, application de gestion apicole (PWA JavaScript sans framework, Supabase ; publiée sur le web et, à partir d'IT-30, en applications iOS et Android construites avec Capacitor depuis le même code ; voir docs/ROADMAP/12_DISTRIBUTION_ET_MONETISATION.md).
Mission de cette session : réaliser UNIQUEMENT l'itération IT-00 — Mise à plat de l'existant. Ne commence aucune autre itération.

A. CONTEXTE
- Vision : docs/ROADMAP/00_VISION_PRODUIT.md. État de l'existant : docs/ROADMAP/01_AUDIT_EXISTANT.md.
- Architecture cible : docs/ROADMAP/03_ARCHITECTURE_CIBLE.md ; modèle de données : docs/ROADMAP/04_MODELE_DONNEES_CIBLE.md.
- Fiche de l'itération (à lire en entier) : docs/ROADMAP/ITERATIONS/ITERATION_00.md.
- Objectif : Disposer d'une source lisible du cœur, d'un relevé fidèle des deux bases et d'une documentation de base exacte.
- Règles du dépôt (CLAUDE.md) : branche claude/…, pull request, rien n'est fusionné, publié ni appliqué sur la base apidoo (production) sans l'accord de Pierre-Louis ; toute migration d'abord sur apidoo-test ; aucun secret dans le dépôt.
- À préserver : Comportement exact de app.js ; Garde-fous d'assemblage ; les 18 tests de bout en bout ; le circuit recette → production.

B. PÉRIMÈTRE
- À réaliser : AP-FEAT-001 Source lisible du cœur app.js ; AP-FEAT-003 Documentation de base fidèle ; AP-FEAT-004 Relevé de l'état réel des bases.
- User stories et critères (source de vérité, docs/ROADMAP/06_BACKLOG_MASTER.md) : AP-US-001, AP-US-002, AP-US-003, AP-US-004.
- Explicitement exclu : Toute modification fonctionnelle ; Toute migration. Si un besoin hors périmètre apparaît, note-le dans le rapport final, ne le réalise pas.

C. ANALYSE PRÉALABLE OBLIGATOIRE (avant toute modification)
1. Lis les fichiers concernés qui existent déjà (les autres sont à créer) : app.js (source lisible), schema.sql, migrations/README.md, migrations/a-appliquer-en-production.txt, docs/TECHNIQUE.md, docs/ROADMAP/01_AUDIT_EXISTANT.md.
2. Identifie, pour chaque écran touché, TOUTES les définitions successives (recherche window.<nom> = et ACT.<nom>) et l'ordre de chargement dans index.html.
3. Vérifie le modèle SQL : migrations/000 puis migrations/004 à la dernière ; ne suppose pas que la base réelle y correspond. Si tu as un accès Supabase, relève l'état d'apidoo-test en lecture seule.
4. Liste les risques de régression et les tests existants qui couvrent la zone (tests/etapes_*.txt).
5. Présente ton plan d'intervention (étapes, fichiers, migration, tests) et ATTENDS ma validation avant de coder.

D. DÉVELOPPEMENT
- Étapes : suis les tâches techniques de la fiche, une par commit lisible.
- SQL : Aucune migration. Relevés en lecture seule (structure, migrations appliquées, volumétrie, plafond de lignes). Migration numérotée à la suite, relançable (if not exists / create or replace), additive sauf mention contraire, avec en tête : contenu, dépendances, « casse ou non l'ancienne version ».
- Opérations multi-tables : fonction SQL transactionnelle, security invoker, idempotente par identifiant fourni par le client, contrôle de l'exploitation des objets référencés.
- Interface : ne crée PAS de nouvelle surcharge window.render / window.shell / window.view* ; si le noyau (src/noyau) existe, enregistre l'écran dans la table des écrans ; sinon modifie l'implémentation effective et documente-le.
- Textes : tutoiement dans l'application, vouvoiement dans les documents émis ; erreurs en français.
- Hors ligne : toute nouvelle saisie terrain passe par la file d'envoi ; une saisie ne doit jamais être perdue.
- Sanitaire et réglementaire : aucune posologie, aucun seuil, aucune obligation sans source officielle citée et datée dans le code ou la doc. En cas de doute, laisse le champ à saisir par l'utilisateur.
- Sécurité : RLS sur toute nouvelle table (exploitation_id = exploitation_courante()), pas de security definer sans nécessité justifiée, search_path fixé.
- Tests : ajoute un scénario tests/etapes_<code>.txt par parcours nouveau ; ajoute les tests SQL et unitaires si l'infrastructure existe (IT-03, IT-04).
- Documentation : CHANGELOG (version, migration, rubrique « À vérifier »), migrations/README.md, a-appliquer-en-production.txt, statuts dans 06_BACKLOG_MASTER.md, docs/TECHNIQUE.md si l'architecture change.

E. VALIDATION
- Scénarios : Les 18 tests de bout en bout passent avant et après la dé-minification. ; Comparaison du relevé de structure avec 000 + migrations..
- Critères d'acceptation : chaque GIVEN/WHEN/THEN des user stories du périmètre, plus : Source lisible de app.js committée, tests verts. ; Relevé des deux bases ajouté à migrations/README.md. ; schema.sql remplacé par un renvoi..
- Non-régression : sh scripts/assembler-site.sh . . _site puis sh tests/lancer.sh _site/recette ; tous verts.
- Sécurité : aucune donnée d'une autre exploitation visible ; aucun secret ajouté ; garde-fous d'assemblage intacts.
- Responsive : vérifie à 375 px et 1280 px (captures Playwright).
- Hors ligne (si concerné) : scénario coupure réseau → saisie → retour réseau.

F. LIVRAISON (rapport final attendu)
- Résumé des changements ; fichiers modifiés ; migration créée et si elle casse l'ancienne version.
- Tests réalisés (avec résultat) et tests NON réalisés (en particulier ceux qui demandent un vrai téléphone ou la base de production).
- Points de vigilance ; instructions de déploiement (apidoo-test, recette, puis production après accord) ; procédure de retour arrière : Revert des commits (aucune donnée touchée).
- Mise à jour de la documentation et des statuts du backlog.
- Ne fusionne pas, ne publie pas en production, n'applique rien sur la base apidoo.
```
