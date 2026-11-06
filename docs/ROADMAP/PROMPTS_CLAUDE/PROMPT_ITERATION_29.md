# Prompt Claude Code — IT-29 Domaine propre et hébergement commercial

> Copier tout le bloc ci-dessous dans Claude Code, à la racine du dépôt `apidoo/apidoo.github.io`.

```text
Tu travailles sur Apidoo, application de gestion apicole (PWA JavaScript sans framework, Supabase ; publiée sur le web et, à partir d'IT-30, en applications iOS et Android construites avec Capacitor depuis le même code ; voir docs/ROADMAP/12_DISTRIBUTION_ET_MONETISATION.md).
Mission de cette session : réaliser UNIQUEMENT l'itération IT-29 — Domaine propre et hébergement commercial. Ne commence aucune autre itération.

A. CONTEXTE
- Vision : docs/ROADMAP/00_VISION_PRODUIT.md. État de l'existant : docs/ROADMAP/01_AUDIT_EXISTANT.md.
- Architecture cible : docs/ROADMAP/03_ARCHITECTURE_CIBLE.md ; modèle de données : docs/ROADMAP/04_MODELE_DONNEES_CIBLE.md.
- Fiche de l'itération (à lire en entier) : docs/ROADMAP/ITERATIONS/ITERATION_29.md.
- Objectif : Publier Apidoo sur un domaine propre, chez un hébergeur qui autorise un usage commercial, sans perdre aucune saisie des utilisateurs actuels.
- Règles du dépôt (CLAUDE.md) : branche claude/…, pull request, rien n'est fusionné, publié ni appliqué sur la base apidoo (production) sans l'accord de Pierre-Louis ; toute migration d'abord sur apidoo-test ; aucun secret dans le dépôt.
- À préserver : Aucune saisie perdue ; aucun secret dans le dépôt public ; les 18 tests de bout en bout ; le circuit recette → production.

B. PÉRIMÈTRE
- À réaliser : AP-FEAT-122 Domaine propre et hébergement compatible avec un usage commercial.
- User stories et critères (source de vérité, docs/ROADMAP/06_BACKLOG_MASTER.md) : AP-US-136.
- Explicitement exclu : Applications mobiles (IT-30), passage de Supabase en offre payante. Si un besoin hors périmètre apparaît, note-le dans le rapport final, ne le réalise pas.

C. ANALYSE PRÉALABLE OBLIGATOIRE (avant toute modification)
1. Lis les fichiers concernés qui existent déjà (les autres sont à créer) : .github/workflows/, scripts/assembler-site.sh, sw.js, offline.js, config.js, docs/PROCESSUS.md, docs/TECHNIQUE.md.
2. Identifie, pour chaque écran touché, TOUTES les définitions successives (recherche window.<nom> = et ACT.<nom>) et l'ordre de chargement dans index.html.
3. Vérifie le modèle SQL : migrations/000 puis migrations/004 à la dernière ; ne suppose pas que la base réelle y correspond. Si tu as un accès Supabase, relève l'état d'apidoo-test en lecture seule.
4. Liste les risques de régression et les tests existants qui couvrent la zone (tests/etapes_*.txt).
5. Présente ton plan d'intervention (étapes, fichiers, migration, tests) et ATTENDS ma validation avant de coder.

D. DÉVELOPPEMENT
- Étapes : suis les tâches techniques de la fiche, une par commit lisible.
- SQL : Aucune migration. Réglages Supabase Auth (adresse du site, adresses de redirection) d'abord sur apidoo-test, puis sur apidoo avec mon accord ; garder les anciennes adresses pendant la transition.
- Opérations multi-tables : fonction SQL transactionnelle, security invoker, idempotente par identifiant fourni par le client, contrôle de l'exploitation des objets référencés.
- Interface : ne crée PAS de nouvelle surcharge window.render / window.shell / window.view* ; si le noyau (src/noyau) existe, enregistre l'écran dans la table des écrans ; sinon modifie l'implémentation effective et documente-le.
- Textes : tutoiement dans l'application, vouvoiement dans les documents émis ; erreurs en français.
- Hors ligne : toute nouvelle saisie terrain passe par la file d'envoi ; une saisie ne doit jamais être perdue.
- Sanitaire et réglementaire : aucune posologie, aucun seuil, aucune obligation sans source officielle citée et datée dans le code ou la doc. En cas de doute, laisse le champ à saisir par l'utilisateur.
- Sécurité : RLS sur toute nouvelle table (exploitation_id = exploitation_courante()), pas de security definer sans nécessité justifiée, search_path fixé.
- Tests : ajoute un scénario tests/etapes_<code>.txt par parcours nouveau ; ajoute les tests SQL et unitaires si l'infrastructure existe (IT-03, IT-04).
- Décisions préalables : D-11 (domaine) et D-12 (hébergeur) doivent être tranchées par moi ; demande-les si elles ne figurent pas dans docs/ROADMAP/README.md §4.
- Données locales : IndexedDB est liée au domaine ; la redirection ne part qu'une fois la file d'envoi et les photos en attente vides.
- Documentation : CHANGELOG (version, migration, rubrique « À vérifier »), migrations/README.md, a-appliquer-en-production.txt, statuts dans 06_BACKLOG_MASTER.md, docs/TECHNIQUE.md si l'architecture change.

E. VALIDATION
- Scénarios : e2e complets sur la nouvelle recette ; bascule avec une visite saisie hors ligne sur l'ancienne adresse ; liens « mot de passe oublié » et invitation depuis un e-mail réel.
- Critères d'acceptation : chaque GIVEN/WHEN/THEN des user stories du périmètre, plus : apidoo.github.io n'héberge plus que la page de bascule.
- Non-régression : sh scripts/assembler-site.sh . . _site puis sh tests/lancer.sh _site/recette ; tous verts.
- Sécurité : aucune donnée d'une autre exploitation visible ; aucun secret ajouté ; garde-fous d'assemblage intacts.
- Responsive : vérifie à 375 px et 1280 px (captures Playwright).
- Hors ligne (si concerné) : scénario coupure réseau → saisie → retour réseau.

F. LIVRAISON (rapport final attendu)
- Résumé des changements ; fichiers modifiés ; migration créée et si elle casse l'ancienne version.
- Tests réalisés (avec résultat) et tests NON réalisés (en particulier ceux qui demandent un vrai téléphone ou la base de production).
- Points de vigilance ; instructions de déploiement (apidoo-test, recette, puis production après accord) ; procédure de retour arrière : GitHub Pages reste publié en parallèle jusqu'à validation ; retirer la redirection suffit.
- Mise à jour de la documentation et des statuts du backlog.
- Ne fusionne pas, ne publie pas en production, n'applique rien sur la base apidoo.
```
