# Prompt Claude Code — IT-01 Correctifs de fiabilité

> Copier tout le bloc ci-dessous dans Claude Code, à la racine du dépôt `apidoo/apidoo.github.io`.

```text
Tu travailles sur Apidoo, application de gestion apicole (PWA JavaScript sans framework, Supabase, GitHub Pages).
Mission de cette session : réaliser UNIQUEMENT l'itération IT-01 — Correctifs de fiabilité. Ne commence aucune autre itération.

A. CONTEXTE
- Vision : docs/ROADMAP/00_VISION_PRODUIT.md. État de l'existant : docs/ROADMAP/01_AUDIT_EXISTANT.md.
- Architecture cible : docs/ROADMAP/03_ARCHITECTURE_CIBLE.md ; modèle de données : docs/ROADMAP/04_MODELE_DONNEES_CIBLE.md.
- Fiche de l'itération (à lire en entier) : docs/ROADMAP/ITERATIONS/ITERATION_01.md.
- Objectif : Supprimer les pertes de données et les fuites identifiées par l'audit avant la bascule en production.
- Règles du dépôt (CLAUDE.md) : branche claude/…, pull request, rien n'est fusionné, publié ni appliqué sur la base apidoo (production) sans l'accord de Pierre-Louis ; toute migration d'abord sur apidoo-test ; aucun secret dans le dépôt.
- À préserver : Idempotence de creer_visite / creer_vente ; Interface v5 ; les 18 tests de bout en bout ; le circuit recette → production.

B. PÉRIMÈTRE
- À réaliser : AP-BUG-002 Données tronquées au-delà du plafond de lignes ; AP-BUG-003 Données gardées après la déconnexion ; AP-BUG-001 Saisie hors ligne perdue sur erreur serveur ; AP-BUG-004 Photos orphelines après suppression d'une ruche ; AP-BUG-005 Écritures écrasées à plusieurs (réglages, entrée de stock) ; AP-BUG-007 Facture sans adresse du client ; AP-FEAT-036 Messages d'erreur en français ; AP-BUG-006 Nom d'exploitation par défaut codé en dur.
- User stories et critères (source de vérité, docs/ROADMAP/06_BACKLOG_MASTER.md) : AP-US-012, AP-US-027, AP-US-051, AP-US-057, AP-US-085, AP-US-098, AP-US-123, AP-US-126.
- Explicitement exclu : Refonte de la file hors ligne (IT-09) ; Modèle de données colonies. Si un besoin hors périmètre apparaît, note-le dans le rapport final, ne le réalise pas.

C. ANALYSE PRÉALABLE OBLIGATOIRE (avant toute modification)
1. Lis les fichiers concernés qui existent déjà (les autres sont à créer) : offline.js, photos.js, app.js, essentiels.js, exploitations.js, migrations/012-correctifs.sql, tests/etapes_*.txt.
2. Identifie, pour chaque écran touché, TOUTES les définitions successives (recherche window.<nom> = et ACT.<nom>) et l'ordre de chargement dans index.html.
3. Vérifie le modèle SQL : migrations/000 puis migrations/004 à la dernière ; ne suppose pas que la base réelle y correspond. Si tu as un accès Supabase, relève l'état d'apidoo-test en lecture seule.
4. Liste les risques de régression et les tests existants qui couvrent la zone (tests/etapes_*.txt).
5. Présente ton plan d'intervention (étapes, fichiers, migration, tests) et ATTENDS ma validation avant de coder.

D. DÉVELOPPEMENT
- Étapes : suis les tâches techniques de la fiche, une par commit lisible.
- SQL : Migration 012 (additive) : adresse et champs pro de base sur clients, fonction de nettoyage des fichiers orphelins (lecture), réglage par clé `regler()`. Migration numérotée à la suite, relançable (if not exists / create or replace), additive sauf mention contraire, avec en tête : contenu, dépendances, « casse ou non l'ancienne version ».
- Opérations multi-tables : fonction SQL transactionnelle, security invoker, idempotente par identifiant fourni par le client, contrôle de l'exploitation des objets référencés.
- Interface : ne crée PAS de nouvelle surcharge window.render / window.shell / window.view* ; si le noyau (src/noyau) existe, enregistre l'écran dans la table des écrans ; sinon modifie l'implémentation effective et documente-le.
- Textes : tutoiement dans l'application, vouvoiement dans les documents émis ; erreurs en français.
- Hors ligne : toute nouvelle saisie terrain passe par la file d'envoi ; une saisie ne doit jamais être perdue.
- Sanitaire et réglementaire : aucune posologie, aucun seuil, aucune obligation sans source officielle citée et datée dans le code ou la doc. En cas de doute, laisse le champ à saisir par l'utilisateur.
- Sécurité : RLS sur toute nouvelle table (exploitation_id = exploitation_courante()), pas de security definer sans nécessité justifiée, search_path fixé.
- Tests : ajoute un scénario tests/etapes_<code>.txt par parcours nouveau ; ajoute les tests SQL et unitaires si l'infrastructure existe (IT-03, IT-04).
- Documentation : CHANGELOG (version, migration, rubrique « À vérifier »), migrations/README.md, a-appliquer-en-production.txt, statuts dans 06_BACKLOG_MASTER.md, docs/TECHNIQUE.md si l'architecture change.

E. VALIDATION
- Scénarios : Nouveau scénario : renvoi refusé par le serveur → quarantaine visible. ; Scénario : déconnexion avec et sans saisies en attente. ; Scénario : plus de 1 000 visites simulées..
- Critères d'acceptation : chaque GIVEN/WHEN/THEN des user stories du périmètre, plus : Tous les AP-BUG de l'itération fermés. ; Tests existants et nouveaux verts. ; Migration 012 appliquée sur apidoo-test..
- Non-régression : sh scripts/assembler-site.sh . . _site puis sh tests/lancer.sh _site/recette ; tous verts.
- Sécurité : aucune donnée d'une autre exploitation visible ; aucun secret ajouté ; garde-fous d'assemblage intacts.
- Responsive : vérifie à 375 px et 1280 px (captures Playwright).
- Hors ligne (si concerné) : scénario coupure réseau → saisie → retour réseau.

F. LIVRAISON (rapport final attendu)
- Résumé des changements ; fichiers modifiés ; migration créée et si elle casse l'ancienne version.
- Tests réalisés (avec résultat) et tests NON réalisés (en particulier ceux qui demandent un vrai téléphone ou la base de production).
- Points de vigilance ; instructions de déploiement (apidoo-test, recette, puis production après accord) ; procédure de retour arrière : Revert du code ; migration 012 additive laissée en place (sans effet sur l'ancienne version).
- Mise à jour de la documentation et des statuts du backlog.
- Ne fusionne pas, ne publie pas en production, n'applique rien sur la base apidoo.
```
