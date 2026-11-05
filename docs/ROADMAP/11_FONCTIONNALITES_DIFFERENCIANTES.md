# 11 — Fonctionnalités différenciantes

Ce qui peut faire d'Apidoo une référence, au-delà du carnet de rucher classique. Classement : **Immédiat** (réalisable avec les données actuelles), **Après socle** (après les phases 1–3), **Données** (nécessite un volume de données important), **Recherche** (nécessite une validation scientifique avant toute promesse).

| # | Idée | Problème résolu | Valeur | Faisabilité | Données nécessaires | Limites | Coût technique | Priorité | Classe | Backlog |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Tournée guidée à la voix** (existante, à pousser) | Saisir avec des gants | Très forte | Faite en partie | visites | reconnaissance vocale du navigateur | faible | P1 | Immédiat | AP-FEAT-041, 049 |
| 2 | **Visite différentielle** : on ne note que ce qui change | Visite trop longue | Très forte | Bonne | dernière visite | valeurs reprises à distinguer | faible | P1 | Immédiat | AP-FEAT-037 |
| 3 | **Priorité du jour expliquée** : chaque alerte dit pourquoi, avec sa source | Ne pas savoir par où commencer | Forte | Bonne | visites, opérations, météo, seuils sourcés | qualité des seuils | moyen | P1 | Après socle | AP-FEAT-104 |
| 4 | **Préparation automatique de tournée** : ordre, matériel à emporter (candi, hausses, traitements) | Oublis au rucher | Forte | Bonne | tâches, alertes, stocks | règles à paramétrer | moyen | P2 | Après socle | AP-FEAT-041, 078 |
| 5 | **Registre tenu tout seul** : traitements et mouvements alimentent le registre sans ressaisie | Obligation pénible | Très forte | Bonne | opérations | conformité à vérifier | moyen | P0 | Après socle | AP-FEAT-099 |
| 6 | **Traçabilité pot → colonies en un geste** | Retrouver clients et origine d'un lot | Forte (pro) | Bonne | chaîne récolte → lot → vente | saisie des colonies contributrices facultative | moyen | P1 | Après socle | AP-FEAT-071 |
| 7 | **Coût de revient par kilo et par rucher** | Fixer ses prix, choisir ses emplacements | Forte | Bonne | dépenses ventilées, récoltes | clé de répartition | moyen | P1 | Après socle | AP-FEAT-081 |
| 8 | **Généalogie visuelle** des colonies et lignées | Choisir quoi multiplier | Forte (passionné, pro) | Bonne | liens de filiation | lisibilité sur téléphone | moyen | P2 | Après socle | AP-FEAT-063 |
| 9 | **Performance des reines et lignées** | Sélection à l'intuition | Forte (éleveur) | Moyenne | plusieurs saisons | petits échantillons | moyen | P3 | Données | AP-FEAT-067 |
| 10 | **Efficacité des traitements mesurée** (avant/après) | Savoir si le traitement a marché | Forte | Bonne | comptages encadrant le traitement | protocole de comptage variable | faible | P2 | Après socle | AP-FEAT-053 |
| 11 | **Comparaison des ruchers** (rendement, pertes, varroa, coût) | Choisir ses emplacements | Forte | Bonne | 1–2 saisons | effets confondus (année, reines) | faible | P2 | Données | AP-FEAT-072, 081 |
| 12 | **Calendrier mellifère personnel** (floraisons notées d'une année sur l'autre) | Anticiper hausses et transhumances | Moyenne | Bonne | saisies de floraisons | discipline de saisie | faible | P3 | Données | AP-FEAT-096 |
| 13 | **Assistant API sur ses données** (faits / hypothèses / recommandations / manques) | Trouver une information vite, synthèses | Très forte | Moyenne | toutes | coût, hallucination | élevé | P2 | Après socle | AP-FEAT-107, 108 |
| 14 | **Visite depuis une parole libre** | Formulaires au rucher | Très forte | Moyenne | modèle de langage | validation obligatoire | moyen | P2 | Après socle | AP-FEAT-109 |
| 15 | **Comptes rendus automatiques** (saison, rucher, pour un GDS ou la famille) | Bilan fastidieux | Moyenne | Bonne | toutes | — | moyen | P2 | Après socle | AP-FEAT-110 |
| 16 | **Détection d'anomalies et de données manquantes** | Données fausses qui faussent les chiffres | Moyenne | Bonne (règles) | toutes | faux positifs | faible | P2 | Immédiat (règles) | AP-FEAT-110 |
| 17 | **Prévision de stocks** (pots, cire, candi) | Ruptures en pleine saison | Moyenne | Bonne | production prévue, stocks | hypothèses | faible | P3 | Après socle | AP-FEAT-078 |
| 18 | **Analyse assistée de photos de cadres** | Repérer des signes | Forte perçue | Faible à ce jour | photos annotées | risque de faux diagnostic | élevé | P4 | Recherche | AP-FEAT-111 |
| 19 | **Risque d'essaimage estimé** (cellules, force, date, météo) | Essaims perdus | Forte | Faible à moyenne | historique de cellules et essaimages | modèle non validé | élevé | P4 | Recherche | — (à créer après IT-08) |
| 20 | **Colonies à risque hivernal** (poids, force, varroa à l'automne) | Pertes hivernales | Forte | Faible à moyenne | plusieurs hivers | corrélations ≠ causes | élevé | P4 | Données + Recherche | — (à créer après IT-23) |

## Principes

- Une idée de classe **Recherche** ne devient une fonctionnalité qu'avec une source scientifique ou une validation sur données réelles, et s'affiche toujours comme une **hypothèse**.
- Les idées 1, 2, 5 et 6 forment le **cœur différenciant** à court terme : elles s'appuient sur des forces déjà présentes (tournée, voix, registre, lots).
- L'assistant (13–16) n'est différenciant que si le socle de données est fiable : il vient après les phases 1 à 5.
