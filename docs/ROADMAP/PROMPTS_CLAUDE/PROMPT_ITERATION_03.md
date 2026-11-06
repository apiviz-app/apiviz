# Prompt Claude Code — IT-03 Noyau applicatif

> Copier tout le bloc ci-dessous dans Claude Code, à la racine du dépôt `apidoo/apidoo.github.io`.

```text
Tu travailles sur Apidoo, application de gestion apicole (PWA JavaScript sans framework, Supabase ; publiée sur le web et, à partir d'IT-30, en applications iOS et Android construites avec Capacitor depuis le même code ; voir docs/ROADMAP/12_DISTRIBUTION_ET_MONETISATION.md).
Mission de cette session : réaliser UNIQUEMENT l'itération IT-03 — Noyau applicatif. Ne commence aucune autre itération.

A. CONTEXTE
- Vision : docs/ROADMAP/00_VISION_PRODUIT.md. État de l'existant : docs/ROADMAP/01_AUDIT_EXISTANT.md.
- Architecture cible : docs/ROADMAP/03_ARCHITECTURE_CIBLE.md ; modèle de données : docs/ROADMAP/04_MODELE_DONNEES_CIBLE.md.
- Fiche de l'itération (à lire en entier) : docs/ROADMAP/ITERATIONS/ITERATION_03.md.
- Objectif : Remplacer les surcharges en chaîne par un noyau d'écrans enregistrés et une couche de données ciblée, puis supprimer le code mort.
- Règles du dépôt (CLAUDE.md) : branche claude/…, pull request, rien n'est fusionné, publié ni appliqué sur la base apidoo (production) sans l'accord de Pierre-Louis ; toute migration d'abord sur apidoo-test ; aucun secret dans le dépôt.
- À préserver : Tous les parcours v5 ; Textes (hors harmonisation du ton) ; Identité Alvéoles ; les 18 tests de bout en bout ; le circuit recette → production.

B. PÉRIMÈTRE
- À réaliser : AP-FEAT-002 Noyau d'écrans enregistrés ; AP-FEAT-007 Retrait des modules et écrans obsolètes ; AP-FEAT-014 Chargement ciblé et paginé des données ; AP-FEAT-015 Styles par composant ; AP-FEAT-017 Service worker à liste générée ; AP-FEAT-013 Tests unitaires des règles métier ; AP-FEAT-016 Journal des erreurs de production ; AP-FEAT-112 Charte de ton unique ; AP-FEAT-113 Arborescence stable et aide à jour.
- User stories et critères (source de vérité, docs/ROADMAP/06_BACKLOG_MASTER.md) : AP-US-006, AP-US-007, AP-US-008, AP-US-009, AP-US-010, AP-US-011, AP-US-014, AP-US-016, AP-US-124, AP-US-125.
- Explicitement exclu : Nouvelles fonctionnalités ; Changement du modèle de données métier. Si un besoin hors périmètre apparaît, note-le dans le rapport final, ne le réalise pas.

C. ANALYSE PRÉALABLE OBLIGATOIRE (avant toute modification)
1. Lis les fichiers concernés qui existent déjà (les autres sont à créer) : index.html, src/noyau/*, src/donnees/*, src/domaines/*, tous les modules *.js existants, sw.js, styles/*, tests/unitaires/*.
2. Identifie, pour chaque écran touché, TOUTES les définitions successives (recherche window.<nom> = et ACT.<nom>) et l'ordre de chargement dans index.html.
3. Vérifie le modèle SQL : migrations/000 puis migrations/004 à la dernière ; ne suppose pas que la base réelle y correspond. Si tu as un accès Supabase, relève l'état d'apidoo-test en lecture seule.
4. Liste les risques de régression et les tests existants qui couvrent la zone (tests/etapes_*.txt).
5. Présente ton plan d'intervention (étapes, fichiers, migration, tests) et ATTENDS ma validation avant de coder.

D. DÉVELOPPEMENT
- Étapes : suis les tâches techniques de la fiche, une par commit lisible.
- SQL : Vue `colonies_resume` (dernière visite par colonie) et table `journal_erreurs` (migration 013, additive). Migration numérotée à la suite, relançable (if not exists / create or replace), additive sauf mention contraire, avec en tête : contenu, dépendances, « casse ou non l'ancienne version ».
- Opérations multi-tables : fonction SQL transactionnelle, security invoker, idempotente par identifiant fourni par le client, contrôle de l'exploitation des objets référencés.
- Interface : ne crée PAS de nouvelle surcharge window.render / window.shell / window.view* ; si le noyau (src/noyau) existe, enregistre l'écran dans la table des écrans ; sinon modifie l'implémentation effective et documente-le.
- Textes : tutoiement dans l'application, vouvoiement dans les documents émis ; erreurs en français.
- Hors ligne : toute nouvelle saisie terrain passe par la file d'envoi ; une saisie ne doit jamais être perdue.
- Sanitaire et réglementaire : aucune posologie, aucun seuil, aucune obligation sans source officielle citée et datée dans le code ou la doc. En cas de doute, laisse le champ à saisir par l'utilisateur.
- Sécurité : RLS sur toute nouvelle table (exploitation_id = exploitation_courante()), pas de security definer sans nécessité justifiée, search_path fixé.
- Tests : ajoute un scénario tests/etapes_<code>.txt par parcours nouveau ; ajoute les tests SQL et unitaires si l'infrastructure existe (IT-03, IT-04).
- Documentation : CHANGELOG (version, migration, rubrique « À vérifier »), migrations/README.md, a-appliquer-en-production.txt, statuts dans 06_BACKLOG_MASTER.md, docs/TECHNIQUE.md si l'architecture change.

E. VALIDATION
- Scénarios : 18 tests de bout en bout verts à chaque étape. ; Tests unitaires des fonctions pures (format, finances, varroa, météo). ; Captures avant/après de chaque écran migré..
- Critères d'acceptation : chaque GIVEN/WHEN/THEN des user stories du périmètre, plus : Aucune réaffectation de window.render/shell/view* restante. ; Modules obsolètes retirés. ; Temps d'ouverture mesuré et non dégradé..
- Non-régression : sh scripts/assembler-site.sh . . _site puis sh tests/lancer.sh _site/recette ; tous verts.
- Sécurité : aucune donnée d'une autre exploitation visible ; aucun secret ajouté ; garde-fous d'assemblage intacts.
- Responsive : vérifie à 375 px et 1280 px (captures Playwright).
- Hors ligne (si concerné) : scénario coupure réseau → saisie → retour réseau.

F. LIVRAISON (rapport final attendu)
- Résumé des changements ; fichiers modifiés ; migration créée et si elle casse l'ancienne version.
- Tests réalisés (avec résultat) et tests NON réalisés (en particulier ceux qui demandent un vrai téléphone ou la base de production).
- Points de vigilance ; instructions de déploiement (apidoo-test, recette, puis production après accord) ; procédure de retour arrière : Chaque écran migré l'est dans un commit séparé : revert ciblé. Drapeau `?ancien=1` conservé jusqu'à la fin de l'itération.
- Mise à jour de la documentation et des statuts du backlog.
- Ne fusionne pas, ne publie pas en production, n'applique rien sur la base apidoo.
```
