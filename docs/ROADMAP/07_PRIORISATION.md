<!-- Généré depuis la structure du backlog le 5 nov. 2026. Après génération, ce fichier est maintenu à la main (voir README). -->

# 07 — Priorisation

## 1. Méthode

1. **Priorité (P0–P4)** fixée d'abord par la règle métier : P0 = fiabilité et intégrité des données, ou obligation ; P1 = forte valeur terrain ou prérequis d'autres P1 ; P2 = amélioration importante ; P3 = complémentaire ; P4 = futur.
2. **Dépendances** : aucune fonctionnalité n'est planifiée avant ses prérequis (contrôlé automatiquement à la génération).
3. **Score** pour ordonner à priorité égale : `(valeur × 2 + 2 si P0) / effort` avec XS=1, S=2, M=3, L=5, XL=8. Le score n'écrase jamais la priorité.
4. **Risque de réalisation** : ne change pas la priorité, mais un risque Élevé impose une revue humaine (réglementaire, sécurité, migration).

Une fonctionnalité intéressante techniquement mais sans problème utilisateur identifié n'entre pas dans le backlog.

## 2. Répartition

| Priorité | Nombre | Itérations principales |
|---|---|---|
| P0 | 13 | IT-00, IT-01, IT-02, IT-03, IT-04, IT-12, IT-13 |
| P1 | 49 | IT-01, IT-03, IT-04, IT-05, IT-06, IT-07, IT-08, IT-09, IT-10, IT-11, IT-12, IT-13, IT-14, IT-15, IT-16, IT-18, IT-19, IT-20, IT-21, IT-23, IT-24, IT-26 |
| P2 | 44 | IT-01, IT-03, IT-05, IT-06, IT-08, IT-09, IT-10, IT-11, IT-12, IT-13, IT-14, IT-15, IT-16, IT-17, IT-18, IT-19, IT-20, IT-21, IT-22, IT-23, IT-24, IT-25, IT-26 |
| P3 | 18 | IT-08, IT-12, IT-15, IT-17, IT-20, IT-21, IT-22, IT-23, IT-25, IT-26, IT-27, IT-28 |
| P4 | 4 | IT-25, IT-27, IT-28 |

## 3. Tableau complet

| ID | Titre | Prio | Valeur | Effort | Risque | Score | Itération |
|---|---|---|---|---|---|---|---|
| AP-BUG-003 | Données gardées après la déconnexion | P0 | 4 | XS | Moyen | 10.0 | IT-01 |
| AP-FEAT-003 | Documentation de base fidèle | P0 | 3 | XS | Faible | 8.0 | IT-00 |
| AP-BUG-002 | Données tronquées au-delà du plafond de lignes | P0 | 5 | S | Moyen | 6.0 | IT-01 |
| AP-BUG-001 | Saisie hors ligne perdue sur erreur serveur | P0 | 5 | S | Moyen | 6.0 | IT-01 |
| AP-FEAT-005 | Réalignement base de production / version publiée | P0 | 5 | S | Moyen | 6.0 | IT-02 |
| AP-FEAT-006 | Sauvegardes automatiques et restauration testée | P0 | 5 | S | Moyen | 6.0 | IT-02 |
| AP-FEAT-052 | Seuils varroa sourcés par méthode et période | P0 | 5 | S | Élevé | 6.0 | IT-12 |
| AP-FEAT-001 | Source lisible du cœur app.js | P0 | 4 | S | Moyen | 5.0 | IT-00 |
| AP-FEAT-004 | Relevé de l'état réel des bases | P0 | 4 | S | Faible | 5.0 | IT-00 |
| AP-FEAT-014 | Chargement ciblé et paginé des données | P0 | 5 | M | Moyen | 4.0 | IT-03 |
| AP-FEAT-008 | Tests SQL et RLS en CI | P0 | 5 | M | Moyen | 4.0 | IT-04 |
| AP-FEAT-099 | Registre d'élevage vérifié | P0 | 5 | M | Élevé | 4.0 | IT-13 |
| AP-FEAT-002 | Noyau d'écrans enregistrés | P0 | 5 | L | Élevé | 2.4 | IT-03 |
| AP-BUG-004 | Photos orphelines après suppression d'une ruche | P1 | 3 | XS | Faible | 6.0 | IT-01 |
| AP-BUG-007 | Facture sans adresse du client | P1 | 3 | XS | Faible | 6.0 | IT-01 |
| AP-FEAT-036 | Messages d'erreur en français | P1 | 3 | XS | Faible | 6.0 | IT-01 |
| AP-FEAT-021 | Mentions de confidentialité et services tiers | P1 | 3 | XS | Faible | 6.0 | IT-04 |
| AP-FEAT-071 | Traçabilité ascendante et descendante | P1 | 5 | S | Faible | 5.0 | IT-18 |
| AP-FEAT-013 | Tests unitaires des règles métier | P1 | 4 | S | Faible | 4.0 | IT-03 |
| AP-FEAT-016 | Journal des erreurs de production | P1 | 4 | S | Faible | 4.0 | IT-03 |
| AP-FEAT-010 | Invitations maîtrisées | P1 | 4 | S | Moyen | 4.0 | IT-04 |
| AP-FEAT-030 | Colonie : statut et origine | P1 | 4 | S | Moyen | 4.0 | IT-06 |
| AP-FEAT-033 | Liens de filiation entre colonies | P1 | 4 | S | Moyen | 4.0 | IT-07 |
| AP-FEAT-038 | Nouveaux champs d'observation | P1 | 4 | S | Faible | 4.0 | IT-08 |
| AP-FEAT-040 | Brouillon de visite persistant | P1 | 4 | S | Faible | 4.0 | IT-08 |
| AP-FEAT-047 | Photos fiables sur téléphone | P1 | 4 | S | Moyen | 4.0 | IT-11 |
| AP-FEAT-056 | Suivi de fin de traitement et contrôle | P1 | 4 | S | Faible | 4.0 | IT-13 |
| AP-FEAT-098 | Déclaration annuelle accompagnée | P1 | 4 | S | Moyen | 4.0 | IT-13 |
| AP-FEAT-070 | Mise en lots contrôlée | P1 | 4 | S | Faible | 4.0 | IT-18 |
| AP-FEAT-073 | Étiquettes de pots conformes | P1 | 4 | S | Élevé | 4.0 | IT-18 |
| AP-FEAT-083 | Clients professionnels | P1 | 4 | S | Faible | 4.0 | IT-21 |
| AP-FEAT-108 | Réponses structurées et sourcées | P1 | 4 | S | Élevé | 4.0 | IT-24 |
| AP-FEAT-025 | Table des ruchers et reprise | P1 | 5 | M | Moyen | 3.3 | IT-05 |
| AP-FEAT-032 | Historique des reines | P1 | 5 | M | Moyen | 3.3 | IT-07 |
| AP-FEAT-037 | Visite rapide pré-remplie | P1 | 5 | M | Moyen | 3.3 | IT-08 |
| AP-FEAT-051 | Comptage varroa en opération | P1 | 5 | M | Moyen | 3.3 | IT-12 |
| AP-FEAT-061 | Opérations biologiques atomiques | P1 | 5 | M | Moyen | 3.3 | IT-16 |
| AP-FEAT-086 | Factures figées et avoirs | P1 | 5 | M | Élevé | 3.3 | IT-21 |
| AP-BUG-005 | Écritures écrasées à plusieurs (réglages, entrée de stock) | P1 | 3 | S | Faible | 3.0 | IT-01 |
| AP-FEAT-113 | Arborescence stable et aide à jour | P1 | 3 | S | Faible | 3.0 | IT-03 |
| AP-FEAT-018 | Données de démonstration reproductibles | P1 | 3 | S | Faible | 3.0 | IT-04 |
| AP-FEAT-011 | Rôle lecteur | P1 | 3 | S | Moyen | 3.0 | IT-04 |
| AP-FEAT-019 | Journal d'audit des modifications sensibles | P1 | 3 | S | Faible | 3.0 | IT-04 |
| AP-FEAT-020 | Suppression du compte et de l'exploitation | P1 | 3 | S | Élevé | 3.0 | IT-26 |
| AP-FEAT-009 | Intégrité entre exploitations | P1 | 4 | M | Moyen | 2.7 | IT-04 |
| AP-FEAT-028 | Historique des emplacements | P1 | 4 | M | Moyen | 2.7 | IT-06 |
| AP-FEAT-029 | Déplacement groupé (transhumance) | P1 | 4 | M | Moyen | 2.7 | IT-06 |
| AP-FEAT-034 | Fiche colonie complète | P1 | 4 | M | Faible | 2.7 | IT-07 |
| AP-FEAT-046 | QR codes des colonies | P1 | 4 | M | Faible | 2.7 | IT-10 |
| AP-FEAT-059 | Opération de nourrissement groupée | P1 | 4 | M | Faible | 2.7 | IT-14 |
| AP-FEAT-090 | Tâches récurrentes et générées | P1 | 4 | M | Faible | 2.7 | IT-15 |
| AP-FEAT-068 | Récolte rattachée au rucher et aux colonies | P1 | 4 | M | Faible | 2.7 | IT-18 |
| AP-FEAT-069 | Extraction (lot de miellerie) | P1 | 4 | M | Moyen | 2.7 | IT-18 |
| AP-FEAT-075 | Journal des mouvements de stock | P1 | 4 | M | Moyen | 2.7 | IT-19 |
| AP-FEAT-081 | Coût de revient par kg, rucher et colonie | P1 | 4 | M | Moyen | 2.7 | IT-20 |
| AP-FEAT-088 | Facturation électronique : position et export | P1 | 4 | M | Élevé | 2.7 | IT-21 |
| AP-FEAT-104 | Alertes calculées classées | P1 | 4 | M | Moyen | 2.7 | IT-23 |
| AP-FEAT-024 | Export complet de l'exploitation | P1 | 4 | M | Faible | 2.7 | IT-26 |
| AP-FEAT-007 | Retrait des modules et écrans obsolètes | P1 | 3 | M | Moyen | 2.0 | IT-03 |
| AP-FEAT-043 | File d'opérations : modifications et suppressions hors ligne | P1 | 5 | L | Élevé | 2.0 | IT-09 |
| AP-FEAT-054 | Opération de traitement multi-colonies | P1 | 5 | L | Élevé | 2.0 | IT-13 |
| AP-FEAT-092 | Notifications push | P1 | 5 | L | Moyen | 2.0 | IT-15 |
| AP-FEAT-017 | Service worker à liste générée | P2 | 3 | XS | Moyen | 6.0 | IT-03 |
| AP-FEAT-045 | État de synchronisation lisible | P2 | 3 | XS | Faible | 6.0 | IT-09 |
| AP-FEAT-093 | Préférences de notification | P2 | 3 | XS | Faible | 6.0 | IT-15 |
| AP-FEAT-065 | Calendrier d'élevage calculé | P2 | 4 | S | Moyen | 4.0 | IT-17 |
| AP-FEAT-072 | Rendements | P2 | 4 | S | Faible | 4.0 | IT-18 |
| AP-FEAT-106 | Indicateurs colonies et mortalité hivernale | P2 | 4 | S | Faible | 4.0 | IT-23 |
| AP-FEAT-109 | Visite créée depuis une note vocale | P2 | 5 | M | Moyen | 3.3 | IT-25 |
| AP-FEAT-026 | Fiche rucher complète | P2 | 3 | S | Faible | 3.0 | IT-05 |
| AP-FEAT-027 | Carte globale des ruchers | P2 | 3 | S | Faible | 3.0 | IT-05 |
| AP-FEAT-041 | Tournée : enchaînement et ordre | P2 | 3 | S | Faible | 3.0 | IT-10 |
| AP-FEAT-042 | Actions groupées sur plusieurs colonies | P2 | 3 | S | Faible | 3.0 | IT-10 |
| AP-FEAT-048 | Surveillance et nettoyage du stockage | P2 | 3 | S | Faible | 3.0 | IT-11 |
| AP-FEAT-049 | Dictée vocale fiable | P2 | 3 | S | Moyen | 3.0 | IT-11 |
| AP-FEAT-053 | Évolution et comparaison du varroa | P2 | 3 | S | Faible | 3.0 | IT-13 |
| AP-FEAT-060 | Bilan de nourrissement | P2 | 3 | S | Faible | 3.0 | IT-14 |
| AP-FEAT-062 | Essaim capturé et origine | P2 | 3 | S | Faible | 3.0 | IT-16 |
| AP-FEAT-076 | Inventaire | P2 | 3 | S | Faible | 3.0 | IT-19 |
| AP-FEAT-079 | Justificatifs joints aux dépenses | P2 | 3 | S | Faible | 3.0 | IT-20 |
| AP-FEAT-080 | Export comptable | P2 | 3 | S | Faible | 3.0 | IT-20 |
| AP-FEAT-085 | Commandes et préparation | P2 | 3 | S | Faible | 3.0 | IT-21 |
| AP-FEAT-087 | Paiements partiels et relances | P2 | 3 | S | Faible | 3.0 | IT-21 |
| AP-FEAT-095 | Météo enregistrée avec la visite | P2 | 3 | S | Faible | 3.0 | IT-22 |
| AP-FEAT-097 | Alertes météo et conditions d'usage | P2 | 3 | S | Moyen | 3.0 | IT-22 |
| AP-FEAT-105 | Comparaison avec l'année précédente | P2 | 3 | S | Faible | 3.0 | IT-23 |
| AP-FEAT-114 | Recherche globale étendue | P2 | 3 | S | Faible | 3.0 | IT-23 |
| AP-FEAT-022 | Journal d'activité par membre | P2 | 3 | S | Faible | 3.0 | IT-26 |
| AP-FEAT-057 | Observations sanitaires structurées | P2 | 4 | M | Élevé | 2.7 | IT-12 |
| AP-FEAT-055 | Catalogue de produits sanitaires sourcé | P2 | 4 | M | Élevé | 2.7 | IT-13 |
| AP-FEAT-063 | Arbre généalogique des colonies | P2 | 4 | M | Moyen | 2.7 | IT-16 |
| AP-FEAT-103 | Accueil selon le niveau d'usage | P2 | 4 | M | Moyen | 2.7 | IT-23 |
| AP-FEAT-110 | Synthèses et données manquantes | P2 | 4 | M | Moyen | 2.7 | IT-25 |
| AP-BUG-006 | Nom d'exploitation par défaut codé en dur | P2 | 1 | XS | Faible | 2.0 | IT-01 |
| AP-FEAT-112 | Charte de ton unique | P2 | 2 | S | Faible | 2.0 | IT-03 |
| AP-FEAT-031 | Ruches physiques (contenants) | P2 | 3 | M | Moyen | 2.0 | IT-06 |
| AP-FEAT-039 | Modèles de visite personnalisables | P2 | 3 | M | Moyen | 2.0 | IT-08 |
| AP-FEAT-044 | Conflits de modification | P2 | 3 | M | Moyen | 2.0 | IT-09 |
| AP-FEAT-091 | Vue calendrier | P2 | 3 | M | Faible | 2.0 | IT-15 |
| AP-FEAT-077 | Matériel localisé et entretenu | P2 | 3 | M | Faible | 2.0 | IT-19 |
| AP-FEAT-084 | Catalogue de produits et tarifs | P2 | 3 | M | Moyen | 2.0 | IT-21 |
| AP-FEAT-107 | Questions sur ses données | P2 | 5 | L | Élevé | 2.0 | IT-24 |
| AP-FEAT-012 | Rôle saisonnier et droits fins | P2 | 3 | M | Moyen | 2.0 | IT-26 |
| AP-FEAT-101 | Coffre de documents | P2 | 3 | M | Faible | 2.0 | IT-26 |
| AP-FEAT-064 | Séries d'élevage de reines | P2 | 4 | L | Moyen | 1.6 | IT-17 |
| AP-FEAT-015 | Styles par composant | P2 | 2 | M | Moyen | 1.3 | IT-03 |
| AP-FEAT-035 | Notes de caractère de la colonie | P3 | 2 | XS | Faible | 4.0 | IT-08 |
| AP-FEAT-082 | Recettes hors ventes | P3 | 2 | XS | Faible | 4.0 | IT-20 |
| AP-FEAT-089 | Historique client | P3 | 2 | XS | Faible | 4.0 | IT-21 |
| AP-FEAT-058 | Signalement aux autorités sanitaires (aide) | P3 | 3 | S | Élevé | 3.0 | IT-12 |
| AP-FEAT-066 | Lignées et reines souches | P3 | 3 | S | Faible | 3.0 | IT-17 |
| AP-FEAT-078 | Prévision des besoins en matériel | P3 | 3 | S | Moyen | 3.0 | IT-23 |
| AP-FEAT-116 | Prise en main par niveau | P3 | 3 | S | Faible | 3.0 | IT-23 |
| AP-FEAT-119 | Suivi de l'usage | P3 | 3 | S | Moyen | 3.0 | IT-27 |
| AP-FEAT-067 | Performances des reines et lignées | P3 | 4 | M | Moyen | 2.7 | IT-23 |
| AP-FEAT-094 | Conseils de saison sourcés | P3 | 2 | S | Moyen | 2.0 | IT-15 |
| AP-FEAT-074 | Produits de la ruche hors miel | P3 | 2 | S | Faible | 2.0 | IT-21 |
| AP-FEAT-096 | Floraisons et miellées | P3 | 3 | M | Moyen | 2.0 | IT-22 |
| AP-FEAT-115 | Aide contextuelle | P3 | 2 | S | Faible | 2.0 | IT-23 |
| AP-FEAT-050 | Note vocale enregistrée | P3 | 2 | S | Moyen | 2.0 | IT-25 |
| AP-FEAT-023 | Gérer ses exploitations | P3 | 2 | S | Faible | 2.0 | IT-26 |
| AP-FEAT-102 | Exports métier enrichis | P3 | 2 | S | Faible | 2.0 | IT-26 |
| AP-FEAT-120 | Publication Google Play | P3 | 3 | M | Moyen | 2.0 | IT-28 |
| AP-FEAT-100 | Échéances réglementaires et cadre par pays | P3 | 2 | M | Moyen | 1.3 | IT-28 |
| AP-FEAT-111 | Analyse de photo assistée | P4 | 3 | M | Élevé | 2.0 | IT-25 |
| AP-FEAT-117 | Offres et limites | P4 | 3 | M | Moyen | 2.0 | IT-27 |
| AP-FEAT-118 | Abonnement et paiement | P4 | 3 | L | Élevé | 1.2 | IT-27 |
| AP-FEAT-121 | Internationalisation des textes | P4 | 2 | L | Moyen | 0.8 | IT-28 |

## 4. Arbitrages de priorité

- **Fiabilité avant nouveautés** : la phase 0 ne contient que des P0/P1 de fiabilité, sécurité et maîtrise. Aucune fonction nouvelle avant la bascule en production (IT-02).
- **Modèle de données avant écrans** : ruchers, colonies, reines (phase 1) avant santé et élevage, qui en dépendent.
- **Sanitaire et réglementaire en P0 quand une donnée est présentée comme un conseil ou une obligation** (seuils varroa, registre) : risque de nuire à l'utilisateur.
- **IA et monétisation tardives** : forte valeur perçue, mais elles exigent un socle de données fiable et un produit stable.
- **Contenants (ruches physiques) en P2** : indispensables au professionnel, inutiles à l'amateur ; le modèle les prévoit dès la phase 1.
