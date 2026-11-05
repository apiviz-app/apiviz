# Prompt Claude Code — IT-28 Stores et international

> Copier tout le bloc ci-dessous dans Claude Code, à la racine du dépôt `apidoo/apidoo.github.io`.

```text
Tu travailles sur Apidoo, application de gestion apicole (PWA JavaScript sans framework, Supabase, GitHub Pages).
Mission de cette session : réaliser UNIQUEMENT l'itération IT-28 — Stores et international. Ne commence aucune autre itération.

A. CONTEXTE
- Vision : docs/ROADMAP/00_VISION_PRODUIT.md. État de l'existant : docs/ROADMAP/01_AUDIT_EXISTANT.md.
- Architecture cible : docs/ROADMAP/03_ARCHITECTURE_CIBLE.md ; modèle de données : docs/ROADMAP/04_MODELE_DONNEES_CIBLE.md.
- Fiche de l'itération (à lire en entier) : docs/ROADMAP/ITERATIONS/ITERATION_28.md.
- Objectif : Être trouvé dans les stores et préparer l'ouverture à d'autres pays.
- Règles du dépôt (CLAUDE.md) : branche claude/…, pull request, rien n'est fusionné, publié ni appliqué sur la base apidoo (production) sans l'accord de Pierre-Louis ; toute migration d'abord sur apidoo-test ; aucun secret dans le dépôt.
- À préserver : Publication web inchangée ; les 18 tests de bout en bout ; le circuit recette → production.

B. PÉRIMÈTRE
- À réaliser : AP-FEAT-100 Échéances réglementaires et cadre par pays ; AP-FEAT-120 Publication Google Play ; AP-FEAT-121 Internationalisation des textes.
- User stories et critères (source de vérité, docs/ROADMAP/06_BACKLOG_MASTER.md) : AP-US-110, AP-US-133, AP-US-134.
- Explicitement exclu : Traduction complète. Si un besoin hors périmètre apparaît, note-le dans le rapport final, ne le réalise pas.

C. ANALYSE PRÉALABLE OBLIGATOIRE (avant toute modification)
1. Lis les fichiers concernés qui existent déjà (les autres sont à créer) : scripts/assembler-site.sh (assetlinks), src/noyau/textes.js, src/domaines/registre (pays).
2. Identifie, pour chaque écran touché, TOUTES les définitions successives (recherche window.<nom> = et ACT.<nom>) et l'ordre de chargement dans index.html.
3. Vérifie le modèle SQL : migrations/000 puis migrations/004 à la dernière ; ne suppose pas que la base réelle y correspond. Si tu as un accès Supabase, relève l'état d'apidoo-test en lecture seule.
4. Liste les risques de régression et les tests existants qui couvrent la zone (tests/etapes_*.txt).
5. Présente ton plan d'intervention (étapes, fichiers, migration, tests) et ATTENDS ma validation avant de coder.

D. DÉVELOPPEMENT
- Étapes : suis les tâches techniques de la fiche, une par commit lisible.
- SQL : Colonne pays sur exploitations. Migration numérotée à la suite, relançable (if not exists / create or replace), additive sauf mention contraire, avec en tête : contenu, dépendances, « casse ou non l'ancienne version ».
- Opérations multi-tables : fonction SQL transactionnelle, security invoker, idempotente par identifiant fourni par le client, contrôle de l'exploitation des objets référencés.
- Interface : ne crée PAS de nouvelle surcharge window.render / window.shell / window.view* ; si le noyau (src/noyau) existe, enregistre l'écran dans la table des écrans ; sinon modifie l'implémentation effective et documente-le.
- Textes : tutoiement dans l'application, vouvoiement dans les documents émis ; erreurs en français.
- Hors ligne : toute nouvelle saisie terrain passe par la file d'envoi ; une saisie ne doit jamais être perdue.
- Sanitaire et réglementaire : aucune posologie, aucun seuil, aucune obligation sans source officielle citée et datée dans le code ou la doc. En cas de doute, laisse le champ à saisir par l'utilisateur.
- Sécurité : RLS sur toute nouvelle table (exploitation_id = exploitation_courante()), pas de security definer sans nécessité justifiée, search_path fixé.
- Tests : ajoute un scénario tests/etapes_<code>.txt par parcours nouveau ; ajoute les tests SQL et unitaires si l'infrastructure existe (IT-03, IT-04).
- Documentation : CHANGELOG (version, migration, rubrique « À vérifier »), migrations/README.md, a-appliquer-en-production.txt, statuts dans 06_BACKLOG_MASTER.md, docs/TECHNIQUE.md si l'architecture change.

E. VALIDATION
- Scénarios : Test fermé Google Play (12 testeurs, 14 jours). ; Capture de tous les écrans après extraction des textes..
- Critères d'acceptation : chaque GIVEN/WHEN/THEN des user stories du périmètre, plus : Fiche store publiée..
- Non-régression : sh scripts/assembler-site.sh . . _site puis sh tests/lancer.sh _site/recette ; tous verts.
- Sécurité : aucune donnée d'une autre exploitation visible ; aucun secret ajouté ; garde-fous d'assemblage intacts.
- Responsive : vérifie à 375 px et 1280 px (captures Playwright).
- Hors ligne (si concerné) : scénario coupure réseau → saisie → retour réseau.

F. LIVRAISON (rapport final attendu)
- Résumé des changements ; fichiers modifiés ; migration créée et si elle casse l'ancienne version.
- Tests réalisés (avec résultat) et tests NON réalisés (en particulier ceux qui demandent un vrai téléphone ou la base de production).
- Points de vigilance ; instructions de déploiement (apidoo-test, recette, puis production après accord) ; procédure de retour arrière : Retrait du store sans effet sur le web.
- Mise à jour de la documentation et des statuts du backlog.
- Ne fusionne pas, ne publie pas en production, n'applique rien sur la base apidoo.
```
