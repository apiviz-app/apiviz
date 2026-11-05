<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# IT-28 — Stores et international

| | |
|---|---|
| Identifiant | IT-28 |
| Phase | Phase 9 — Professionnalisation SaaS |
| Taille | M |
| Hypothèse de taille | Selon docs/MOBILE.md : Google Play (TWA) puis App Store ; internationalisation des textes et du cadre réglementaire. |
| Migration | aucune |

## 1. Objectif

Être trouvé dans les stores et préparer l'ouverture à d'autres pays.

## 2. Résultat utilisateur attendu

Apidoo installable depuis Google Play ; textes extraits ; réglementation par pays paramétrée.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-100 | Échéances réglementaires et cadre par pays | P3 | NON IMPLÉMENTÉ |
| AP-FEAT-120 | Publication Google Play | P3 | NON IMPLÉMENTÉ |
| AP-FEAT-121 | Internationalisation des textes | P4 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-110** (AP-FEAT-100) — En tant qu'apiculteur belge, je veux des échéances adaptées à mon pays afin d'utiliser Apidoo hors de France.
- **AP-US-133** (AP-FEAT-120) — En tant qu'apiculteur, je veux installer Apidoo depuis le Play Store afin de le trouver facilement.
- **AP-US-134** (AP-FEAT-121) — En tant que développeur, je veux des textes hors du code afin de pouvoir traduire.

## 5. Tâches techniques

- AP-TECH-314 (AP-FEAT-100) — Colonne exploitations.pays.
- AP-TECH-315 (AP-FEAT-100) — Table echeances par pays.
- AP-TECH-373 (AP-FEAT-120) — Bubblewrap.
- AP-TECH-374 (AP-FEAT-120) — assetlinks.json.
- AP-TECH-375 (AP-FEAT-120) — Test fermé 12 testeurs.
- AP-TECH-376 (AP-FEAT-121) — Fonction t().
- AP-TECH-377 (AP-FEAT-121) — Extraction progressive.

## 6. Fichiers et modules potentiellement concernés

- `scripts/assembler-site.sh (assetlinks)`
- `src/noyau/textes.js`
- `src/domaines/registre (pays)`

## 7. Évolutions SQL nécessaires

Colonne pays sur exploitations.

## 8. Dépendances

- Itérations préalables : IT-02, IT-03, IT-13.
- Fonctionnalités prérequises : AP-FEAT-002, AP-FEAT-005, AP-FEAT-098.

## 9. Risques

- Refus du store.
- Régression liée à l'extraction des textes.

## 10. Plan de tests

- Test fermé Google Play (12 testeurs, 14 jours).
- Capture de tous les écrans après extraction des textes.
- AP-FEAT-100 : Unitaires.
- AP-FEAT-120 : Test fermé.
- AP-FEAT-121 : Captures.

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Fiche store publiée.

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
- Version publiée en recette.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un vrai téléphone par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).

## 15. Conditions de retour arrière

Retrait du store sans effet sur le web.

## 16. Éléments à préserver

- Publication web inchangée

## 17. Hors périmètre

- Traduction complète

## 18. Itération suivante

Fin de la roadmap actuelle : réévaluer avec les retours utilisateurs.
