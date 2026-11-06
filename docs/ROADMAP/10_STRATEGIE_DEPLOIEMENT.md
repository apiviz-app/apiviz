# 10 — Stratégie de déploiement

Le circuit actuel (`docs/PROCESSUS.md`) est **conservé** : il est sûr et adapté. Ce document le complète.

## 1. Environnements

| | Développement | Recette | Production |
|---|---|---|---|
| Où | poste ou session Claude Code, site assemblé en local | https://apidoo.github.io/recette/, puis sous-domaine de recette du domaine propre après IT-29 | https://apidoo.github.io/, puis domaine propre après IT-29 |
| Base | aucune (base simulée) ou Postgres local (tests SQL) | Supabase `apidoo-test`, données de démonstration | Supabase `apidoo`, données réelles |
| Qui publie | — | Actions › Mise en ligne › recette | Actions › Mise en ligne › production, après accord du responsable |
| Repère | branche `claude/…` | étiquette `recette` | étiquette `deploiement` |

## 2. Promotion d'une version

1. Branche `claude/…` → PR → **Vérifier** vert (unitaires, SQL, e2e, visuels).
2. Migration éventuelle appliquée sur `apidoo-test` (à la main aujourd'hui ; par la CLI Supabase depuis le workflow après IT-04), notée dans `migrations/README.md` et `a-appliquer-en-production.txt`.
3. Mise en recette (branche ou `main`), tests e2e réels sur la recette.
4. Validation sur téléphone (rubrique « À vérifier »).
5. Fusion sur `main` avec l'accord du responsable.
6. **Sauvegarde** de la production (automatique, vérifiée datée du jour), puis migrations en attente sur `apidoo`.
7. Mise en production (version identique à la recette, case « migrations faites »).
8. Contrôle de santé, CHANGELOG « en production », liste d'attente vidée.

## 3. Règles sur les migrations

- **Jamais appliquée automatiquement en production** si elle est destructive (suppression ou renommage de colonne ou table, changement de type, contrainte sur données existantes).
- **Additive par défaut**, relançable, en-tête « casse ou non l'ancienne version ».
- **Ne jamais supposer** que la base réelle correspond aux fichiers : relevé de structure avant chaque migration sensible (comparaison automatisée après IT-04).
- **Réversible quand c'est possible** : un script `down` est fourni pour les migrations additives ; pour les autres, le retour arrière est la restauration de la sauvegarde (doit être écrit dans la fiche).
- Une migration non rétrocompatible (modèle 008) part **avec** la version d'app correspondante, file hors ligne purgée au préalable.
- **Dès que des applications mobiles sont publiées (IT-28)**, une migration non rétrocompatible n'est appliquée qu'après publication **et adoption** d'une version mobile compatible, et relèvement de la version minimale acceptée (§8).

## 4. Sauvegardes

| Élément | Fréquence | Où | Rétention | Contrôle |
|---|---|---|---|---|
| Base `apidoo` (pg_dump) | quotidienne + avant chaque migration | stockage hors dépôt (décision D-03), chiffré | 30 jours | restauration trimestrielle sur projet vide |
| Fichiers photos | hebdomadaire | idem | 30 jours | comptage des fichiers |

Le dépôt étant public, aucune sauvegarde ni artefact ne doit y apparaître en clair (déjà noté dans `MOBILE.md`).

## 5. Retour arrière

| Cas | Procédure |
|---|---|
| Version sans migration | republier l'étiquette `deploiement` précédente par le même circuit (revert → recette → production) |
| Migration additive | revert du code ; la migration reste (sans effet sur l'ancienne version) |
| Migration non rétrocompatible | restauration de la sauvegarde d'avant migration + republication de la version précédente ; saisies faites entre-temps récupérées depuis le journal d'audit si possible |
| Edge Function | désactivation ou redéploiement de la version précédente ; l'app doit fonctionner sans elle |

## 6. Réalignement IT-02 (cas particulier)

Relevé du 5 nov. 2026 : la v5.14 est déjà publiée et 008 appliquée en production ; 010 et 011 manquent partout. Étapes : sauvegarde → 010 puis 011 sur `apidoo-test` → vérification des parcours déplacement, intervention, facture en recette → mêmes migrations sur `apidoo` (accord du responsable) → relevé de structure identique sur les deux bases → documentation corrigée. Les deux migrations sont additives : pas de retour arrière côté base nécessaire.

**Leçon :** la case « migrations faites » du workflow a pu être cochée sans que 010 soit appliquée. IT-04 remplace cette case par un contrôle automatique de structure.

## 7. Surveillance après mise en production

- Contrôle de santé du workflow (existant).
- `journal_erreurs` consulté à J+1 et J+7 (après IT-03).
- Réveil quotidien des projets (existant).
- Espace photos et volumétrie relevés chaque mois.

## 8. Applications iOS et Android (à partir d'IT-30)

Voir `12_DISTRIBUTION_ET_MONETISATION.md` §7.

| | Test | Production |
|---|---|---|
| iOS | TestFlight (interne puis externe) | App Store, après revue d'Apple |
| Android | test interne puis test fermé Google Play | Google Play, après revue de Google |
| Base | `apidoo-test` (build de recette) | `apidoo` |
| Qui publie | workflow de build mobile, déclenché à la main | soumission par le responsable ou avec son accord explicite |

Promotion d'une version mobile :

1. Même PR que le web : une fonctionnalité est livrée une fois pour les trois plateformes.
2. Build de recette (pointant `apidoo-test`) → TestFlight et test interne → rubrique « À vérifier » sur un iPhone et un Android réels.
3. Mise en production web d'abord (circuit §2), puis build de production → soumission aux stores avec l'accord du responsable.
4. Après publication : suivre l'adoption ; relever la version minimale acceptée seulement quand la version précédente n'est plus nécessaire.

Retour arrière : on ne retire pas une version installée. Corriger par une nouvelle version (revue accélérée possible chez Apple en cas de défaut grave), et en attendant, désactiver la fonction fautive côté base ou par un réglage. Les clés de signature et certificats sont dans les secrets GitHub, sauvegardés hors dépôt (perdre la clé Android empêche toute mise à jour).

