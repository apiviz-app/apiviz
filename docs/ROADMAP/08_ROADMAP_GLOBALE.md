<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# 08 — Roadmap globale

Découpage en 10 phases et 29 itérations. Chaque itération est livrable seule, passe par la recette puis la production (doc 10).

Tailles : XS (quelques heures) · S (1 à 3 sessions de travail) · M (une à deux semaines de travail) · L (plusieurs semaines) · XL (à redécouper). Aucune durée calendaire n'est donnée : l'effort réel dépend du temps disponible et des validations sur téléphone.

## 1. Vue d'ensemble

| Phase | Itération | Nom | Taille | Fonctionnalités | Dépend de |
|---|---|---|---|---|---|
| Phase 0 | [IT-00](ITERATIONS/ITERATION_00.md) | Mise à plat de l'existant | S | 3 | — |
| Phase 0 | [IT-01](ITERATIONS/ITERATION_01.md) | Correctifs de fiabilité | S | 8 | IT-00 |
| Phase 0 | [IT-02](ITERATIONS/ITERATION_02.md) | Réalignement de la production et sauvegardes | S | 2 | IT-00, IT-01 |
| Phase 0 | [IT-03](ITERATIONS/ITERATION_03.md) | Noyau applicatif | L | 9 | IT-00, IT-01 |
| Phase 0 | [IT-04](ITERATIONS/ITERATION_04.md) | Sécurité de la base et tests SQL | M | 7 | IT-00 |
| Phase 1 | [IT-05](ITERATIONS/ITERATION_05.md) | Ruchers | M | 3 | IT-03, IT-04 |
| Phase 1 | [IT-06](ITERATIONS/ITERATION_06.md) | Emplacements, transhumance et contenants | L | 4 | IT-05 |
| Phase 1 | [IT-07](ITERATIONS/ITERATION_07.md) | Reines et liens de colonies | M | 3 | IT-06 |
| Phase 2 | [IT-08](ITERATIONS/ITERATION_08.md) | Visite rapide et modèles de visite | M | 5 | IT-03, IT-07 |
| Phase 2 | [IT-09](ITERATIONS/ITERATION_09.md) | Hors ligne v2 | L | 3 | IT-01, IT-03 |
| Phase 2 | [IT-10](ITERATIONS/ITERATION_10.md) | QR codes et tournée enchaînée | M | 3 | IT-03, IT-05, IT-06, IT-08 |
| Phase 2 | [IT-11](ITERATIONS/ITERATION_11.md) | Photos et voix consolidées | S | 3 | IT-01, IT-04, IT-08 |
| Phase 3 | [IT-12](ITERATIONS/ITERATION_12.md) | Santé : varroa et observations sanitaires | M | 4 | IT-04, IT-05, IT-08 |
| Phase 3 | [IT-13](ITERATIONS/ITERATION_13.md) | Traitements et registre d'élevage | L | 6 | IT-06, IT-12 |
| Phase 3 | [IT-14](ITERATIONS/ITERATION_14.md) | Nourrissement | M | 2 | IT-12 |
| Phase 3 | [IT-15](ITERATIONS/ITERATION_15.md) | Tâches récurrentes, calendrier et notifications | L | 5 | — |
| Phase 4 | [IT-16](ITERATIONS/ITERATION_16.md) | Événements biologiques et généalogie | M | 3 | IT-07 |
| Phase 4 | [IT-17](ITERATIONS/ITERATION_17.md) | Élevage des reines | L | 3 | IT-07, IT-15 |
| Phase 5 | [IT-18](ITERATIONS/ITERATION_18.md) | Récolte, extraction, lots et traçabilité | L | 6 | IT-05, IT-13 |
| Phase 6 | [IT-19](ITERATIONS/ITERATION_19.md) | Stocks par mouvements et matériel | M | 3 | IT-01 |
| Phase 6 | [IT-20](ITERATIONS/ITERATION_20.md) | Finances et coûts de production | M | 4 | IT-11, IT-18 |
| Phase 7 | [IT-21](ITERATIONS/ITERATION_21.md) | Clients professionnels, produits et factures conformes | L | 8 | IT-01 |
| Phase 8 | [IT-22](ITERATIONS/ITERATION_22.md) | Météo historisée et environnement | M | 3 | IT-05, IT-08 |
| Phase 8 | [IT-23](ITERATIONS/ITERATION_23.md) | Tableau de bord et statistiques | M | 9 | IT-03, IT-06, IT-08, IT-12, IT-17, IT-18, IT-19 |
| Phase 8 | [IT-24](ITERATIONS/ITERATION_24.md) | Assistant API : lecture | L | 2 | IT-03, IT-04 |
| Phase 8 | [IT-25](ITERATIONS/ITERATION_25.md) | Assistant API : actions et analyses | M | 4 | IT-11, IT-24 |
| Phase 9 | [IT-26](ITERATIONS/ITERATION_26.md) | Rôles avancés, RGPD, documents et exports | M | 7 | IT-04, IT-20 |
| Phase 9 | [IT-27](ITERATIONS/ITERATION_27.md) | Plans et abonnements | L | 3 | IT-03, IT-26 |
| Phase 9 | [IT-28](ITERATIONS/ITERATION_28.md) | Stores et international | M | 3 | IT-02, IT-03, IT-13 |

## 2. Graphe des dépendances entre itérations

```mermaid
flowchart LR
  IT00["IT-00 Mise à plat de l'existant"]
  IT01["IT-01 Correctifs de fiabilité"]
  IT02["IT-02 Réalignement de la production et sauvegardes"]
  IT03["IT-03 Noyau applicatif"]
  IT04["IT-04 Sécurité de la base et tests SQL"]
  IT05["IT-05 Ruchers"]
  IT06["IT-06 Emplacements, transhumance et contenants"]
  IT07["IT-07 Reines et liens de colonies"]
  IT08["IT-08 Visite rapide et modèles de visite"]
  IT09["IT-09 Hors ligne v2"]
  IT10["IT-10 QR codes et tournée enchaînée"]
  IT11["IT-11 Photos et voix consolidées"]
  IT12["IT-12 Santé : varroa et observations sanitaires"]
  IT13["IT-13 Traitements et registre d'élevage"]
  IT14["IT-14 Nourrissement"]
  IT15["IT-15 Tâches récurrentes, calendrier et notifications"]
  IT16["IT-16 Événements biologiques et généalogie"]
  IT17["IT-17 Élevage des reines"]
  IT18["IT-18 Récolte, extraction, lots et traçabilité"]
  IT19["IT-19 Stocks par mouvements et matériel"]
  IT20["IT-20 Finances et coûts de production"]
  IT21["IT-21 Clients professionnels, produits et factures conformes"]
  IT22["IT-22 Météo historisée et environnement"]
  IT23["IT-23 Tableau de bord et statistiques"]
  IT24["IT-24 Assistant API : lecture"]
  IT25["IT-25 Assistant API : actions et analyses"]
  IT26["IT-26 Rôles avancés, RGPD, documents et exports"]
  IT27["IT-27 Plans et abonnements"]
  IT28["IT-28 Stores et international"]
  IT00 --> IT01
  IT00 --> IT02
  IT01 --> IT02
  IT00 --> IT03
  IT01 --> IT03
  IT00 --> IT04
  IT03 --> IT05
  IT04 --> IT05
  IT05 --> IT06
  IT06 --> IT07
  IT03 --> IT08
  IT07 --> IT08
  IT01 --> IT09
  IT03 --> IT09
  IT03 --> IT10
  IT05 --> IT10
  IT06 --> IT10
  IT08 --> IT10
  IT01 --> IT11
  IT04 --> IT11
  IT08 --> IT11
  IT04 --> IT12
  IT05 --> IT12
  IT08 --> IT12
  IT06 --> IT13
  IT12 --> IT13
  IT12 --> IT14
  IT07 --> IT16
  IT07 --> IT17
  IT15 --> IT17
  IT05 --> IT18
  IT13 --> IT18
  IT01 --> IT19
  IT11 --> IT20
  IT18 --> IT20
  IT01 --> IT21
  IT05 --> IT22
  IT08 --> IT22
  IT03 --> IT23
  IT06 --> IT23
  IT08 --> IT23
  IT12 --> IT23
  IT17 --> IT23
  IT18 --> IT23
  IT19 --> IT23
  IT03 --> IT24
  IT04 --> IT24
  IT11 --> IT25
  IT24 --> IT25
  IT04 --> IT26
  IT20 --> IT26
  IT03 --> IT27
  IT26 --> IT27
  IT02 --> IT28
  IT03 --> IT28
  IT13 --> IT28
```

## 3. Phases

### Phase 0 — Sécuriser et maîtriser l'existant

- **IT-00 — Mise à plat de l'existant** (S) : Disposer d'une source lisible du cœur, d'un relevé fidèle des deux bases et d'une documentation de base exacte.
- **IT-01 — Correctifs de fiabilité** (S) : Supprimer les pertes de données et les fuites identifiées par l'audit avant la bascule en production.
- **IT-02 — Réalignement de la production et sauvegardes** (S) : Faire correspondre base de production et version publiée, corriger la documentation d'état, et mettre en place une sauvegarde restaurable.
- **IT-03 — Noyau applicatif** (L) : Remplacer les surcharges en chaîne par un noyau d'écrans enregistrés et une couche de données ciblée, puis supprimer le code mort.
- **IT-04 — Sécurité de la base et tests SQL** (M) : Garantir par des tests automatiques que chaque exploitation ne voit et ne modifie que ses données, et maîtriser les accès.

### Phase 1 — Socle métier : ruchers, colonies, reines

- **IT-05 — Ruchers** (M) : Faire du rucher une entité avec position, accès et informations, sans casser l'existant.
- **IT-06 — Emplacements, transhumance et contenants** (L) : Savoir où était chaque colonie à toute date, déplacer des lots de colonies, et suivre les ruches physiques.
- **IT-07 — Reines et liens de colonies** (M) : Historiser les reines et structurer la filiation entre colonies.

### Phase 2 — Expérience terrain

- **IT-08 — Visite rapide et modèles de visite** (M) : Atteindre une visite courante en moins de deux minutes, adaptée aux pratiques de chacun.
- **IT-09 — Hors ligne v2** (L) : Permettre toutes les saisies terrain sans réseau et ne jamais perdre une saisie.
- **IT-10 — QR codes et tournée enchaînée** (M) : Ouvrir une colonie en scannant sa ruche et enchaîner les visites d'un rucher.
- **IT-11 — Photos et voix consolidées** (S) : Rendre photos et dictée fiables sur vrais téléphones et maîtriser le quota.

### Phase 3 — Santé et conduite du rucher

- **IT-12 — Santé : varroa et observations sanitaires** (M) : Suivre l'infestation et les signes sanitaires par colonie et par rucher, avec des seuils dont la source est affichée.
- **IT-13 — Traitements et registre d'élevage** (L) : Enregistrer un traitement une fois pour toutes les colonies concernées et produire un registre fiable.
- **IT-14 — Nourrissement** (M) : Enregistrer un nourrissement groupé avec quantités, coût et objectif.
- **IT-15 — Tâches récurrentes, calendrier et notifications** (L) : Planifier, répartir et être réellement rappelé, même application fermée.

### Phase 4 — Multiplication et élevage

- **IT-16 — Événements biologiques et généalogie** (M) : Diviser, réunir, enregistrer un essaim ou un remérage en une opération sûre, et voir la généalogie.
- **IT-17 — Élevage des reines** (L) : Suivre les séries d'élevage de reines et la réussite par lignée.

### Phase 5 — Production et traçabilité

- **IT-18 — Récolte, extraction, lots et traçabilité** (L) : Tracer chaque pot jusqu'aux colonies et à la récolte, et calculer les rendements.

### Phase 6 — Gestion de l'exploitation

- **IT-19 — Stocks par mouvements et matériel** (M) : Avoir un stock juste et savoir où est le matériel.
- **IT-20 — Finances et coûts de production** (M) : Connaître le coût par kg, par rucher et par colonie, et fournir des exports au comptable.

### Phase 7 — Commercialisation

- **IT-21 — Clients professionnels, produits et factures conformes** (L) : Vendre à des professionnels avec des factures fiables et suivre les paiements.

### Phase 8 — Pilotage et intelligence

- **IT-22 — Météo historisée et environnement** (M) : Relier observations et conditions, et préparer les miellées.
- **IT-23 — Tableau de bord et statistiques** (M) : Donner à chaque profil les bons indicateurs et comparer les saisons.
- **IT-24 — Assistant API : lecture** (L) : Répondre en langage naturel aux questions sur ses propres données, en séparant faits, hypothèses, recommandations et manques.
- **IT-25 — Assistant API : actions et analyses** (M) : Transformer une note vocale en visite, préparer une tournée, détecter données manquantes et anomalies.

### Phase 9 — Professionnalisation SaaS

- **IT-26 — Rôles avancés, RGPD, documents et exports** (M) : Permettre des équipes (saisonniers), garantir les droits des personnes et ranger les documents.
- **IT-27 — Plans et abonnements** (L) : Proposer une offre gratuite et une offre payante sans dégrader l'expérience gratuite.
- **IT-28 — Stores et international** (M) : Être trouvé dans les stores et préparer l'ouverture à d'autres pays.

## 4. Chemin critique

IT-00 → IT-01 → IT-02 (production unifiée) → IT-03 (noyau) → IT-04 (tests SQL) → IT-05 → IT-06 → IT-07 (modèle colonies) → IT-12 → IT-13 (santé et registre) → IT-16 → IT-18 (traçabilité). Tout retard sur IT-03 ou IT-07 décale l'ensemble des phases 3 à 5.

## 5. Parallélisation possible

- IT-08 (visite rapide) et IT-10 (QR) peuvent avancer pendant IT-09 si deux personnes travaillent.
- IT-19/IT-20 (gestion) ne dépendent pas de la phase 4 : elles peuvent passer avant l'élevage si le besoin est plus fort.
- IT-22 (météo) est indépendante après IT-08.
- IT-24/IT-25 (assistant) peuvent démarrer dès IT-14 si un prototype est souhaité, en lecture seule.

## 6. Jalons de décision

| Jalon | Après | Question à trancher |
|---|---|---|
| J1 | IT-02 | La production est-elle stable sur la v5 ? Ouvrir les inscriptions ? |
| J2 | IT-04 | Le noyau et les tests SQL suffisent-ils, ou faut-il réexaminer une étape de compilation ? |
| J3 | IT-07 | Le modèle colonies/contenants convient-il aux professionnels interrogés ? |
| J4 | IT-13 | Registre validé par un professionnel (GDS, vétérinaire) ? |
| J5 | IT-21 | Choix facturation électronique (D-05) |
| J6 | IT-23 | Budget IA (D-07) et modèle économique (D-08) |

## 7. Ce qui est volontairement hors roadmap

Réécriture en framework · base locale complète synchronisée · application native · comptabilité certifiée · plateforme de facturation agréée en propre · diagnostic de maladie automatique · capteurs connectés (balances) — à réexaminer après la phase 9 selon les retours utilisateurs.
