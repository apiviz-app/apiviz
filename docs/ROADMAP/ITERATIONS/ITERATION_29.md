<!-- Ajoutée le 6 nov. 2026 (révision « application web et stores », voir 12_DISTRIBUTION_ET_MONETISATION.md). Maintenue à la main. -->

# IT-29 — Domaine propre et hébergement commercial

| | |
|---|---|
| Identifiant | IT-29 |
| Phase | Phase 0 — Sécuriser et maîtriser l'existant |
| Taille | S |
| Hypothèse de taille | Site statique inchangé ; nouvel hébergeur (D-12), nom de domaine (D-11), redirection de l'ancienne adresse. À faire tant que la production compte peu d'utilisateurs. |
| Migration | aucune (réglages Supabase Auth seulement) |

## 1. Objectif

Publier Apidoo sur un domaine propre, chez un hébergeur qui autorise un usage commercial, sans perdre aucune saisie des utilisateurs actuels.

## 2. Résultat utilisateur attendu

Apidoo s'ouvre à la nouvelle adresse, la recette sur un sous-domaine ; l'ancienne adresse redirige ; les e-mails de connexion et d'invitation pointent vers la nouvelle adresse.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-122 | Domaine propre et hébergement compatible avec un usage commercial | P1 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-136** (AP-FEAT-122) — En tant qu'apiculteur déjà inscrit, je veux retrouver Apidoo à sa nouvelle adresse sans rien perdre afin de continuer à travailler normalement.

## 5. Tâches techniques

- AP-TECH-380 (AP-FEAT-122) — Décisions D-11 (domaine) et D-12 (hébergeur) ; achat du domaine au nom de la structure (D-13 si déjà tranchée).
- AP-TECH-381 (AP-FEAT-122) — Publication par le workflow « Mise en ligne » vers l'hébergeur (production à la racine, recette sur sous-domaine), jeton d'API dans les secrets GitHub uniquement.
- AP-TECH-382 (AP-FEAT-122) — Supabase Auth : adresse du site et adresses de redirection des deux projets (garder l'ancienne pendant la transition).
- AP-TECH-383 (AP-FEAT-122) — Page de bascule sur `apidoo.github.io` : si la file d'envoi locale et les photos en attente sont vides, redirection vers le nouveau domaine ; sinon envoi d'abord, avec message clair.
- AP-TECH-384 (AP-FEAT-122) — Désinscription de l'ancien service worker après bascule ; en-têtes de sécurité et de cache sur le nouvel hébergeur.
- AP-TECH-385 (AP-FEAT-122) — Mise à jour de `docs/PROCESSUS.md`, `docs/TECHNIQUE.md`, `docs/MOBILE.md`, `10_STRATEGIE_DEPLOIEMENT.md` ; adresses dans les tests e2e réels.

## 6. Fichiers et modules potentiellement concernés

- `.github/workflows/` (mise en ligne)
- `scripts/assembler-site.sh`
- `sw.js`, `offline.js` (bascule)
- `config.js` (aucune clé secrète)
- `docs/PROCESSUS.md`, `docs/TECHNIQUE.md`, `docs/MOBILE.md`

## 7. Évolutions SQL nécessaires

Aucune. Réglages Auth dans le tableau de bord Supabase (ou par l'API de gestion), sur `apidoo-test` puis `apidoo`.

## 8. Dépendances

- Itérations préalables : IT-02.
- Décisions : D-11, D-12.

## 9. Risques

- Perte de saisies locales restées sur l'ancienne adresse (IndexedDB liée au domaine).
- Liens d'e-mail cassés pendant la transition.
- Session à rouvrir sur la nouvelle adresse (attendu, à annoncer).

## 10. Plan de tests

- e2e complets sur la recette au nouveau sous-domaine.
- Scénario de bascule : saisie hors ligne sur l'ancienne adresse → retour réseau → envoi → redirection ; vérifier en base que rien n'est perdu.
- Lien « mot de passe oublié » et lien d'invitation ouverts depuis un e-mail réel.
- AP-FEAT-122 : Manuel sur vrai téléphone (Android et iPhone, PWA installée).

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- `apidoo.github.io` n'héberge plus que la page de bascule.

## 12. Définition de terminé

- [ ] Le parcours utilisateur fonctionne sur téléphone et ordinateur.
- [ ] Les règles métier des user stories sont respectées.
- [ ] Les données sont correctement enregistrées (vérifiées en base de recette).
- [ ] Les permissions sont contrôlées (tests SQL si la base change).
- [ ] Les erreurs sont gérées et affichées en français.
- [ ] Les 18 tests de bout en bout et les nouveaux tests passent.
- [ ] Les régressions sont vérifiées (liste « À vérifier » du CHANGELOG).
- [ ] CHANGELOG, migrations/README.md et le backlog (statuts) sont à jour.
- [ ] Les limites connues sont documentées.

## 13. Livrables

- Code sur une branche `claude/…` et pull request vers `main`.
- Aucune migration.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Version publiée en recette au nouveau sous-domaine.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion, avant production et avant la bascule de l'ancienne adresse (CLAUDE.md).

## 15. Conditions de retour arrière

GitHub Pages reste publié en parallèle jusqu'à la validation : retirer la redirection suffit à revenir en arrière.

## 16. Éléments à préserver

- Aucune saisie perdue
- Circuit recette → production
- Aucun secret dans le dépôt public

## 17. Hors périmètre

- Applications mobiles (IT-30)
- Passage de Supabase en offre payante (décision séparée, voir 12 §6)

## 18. Itération suivante

[IT-03](ITERATION_03.md) — Noyau applicatif (ou IT-04 en parallèle).
