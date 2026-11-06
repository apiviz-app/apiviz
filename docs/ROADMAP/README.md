# Roadmap Apidoo — documentation de pilotage

Préparée le 5 novembre 2026 à partir de l'audit du dépôt (`main` @ `554f98f`) et d'un relevé en lecture seule des bases `apidoo` et `apidoo-test`. Aucune ligne de code applicatif, aucune migration et aucune donnée n'ont été modifiées.

**Révision du 6 novembre 2026 — application web et stores.** Apidoo devient une application disponible sur le web (domaine propre, hors GitHub Pages) et sur l'App Store et Google Play, monétisable à terme, toujours à partir d'un seul code. Référence : [12_DISTRIBUTION_ET_MONETISATION.md](12_DISTRIBUTION_ET_MONETISATION.md). Nouvelles itérations IT-29 (domaine) et IT-30 (applications), IT-28 avancée en phase 2 (publication gratuite), IT-31 (international, ex-IT-28), IT-27 étendue aux achats intégrés.

## 1. Contenu

| Fichier | Rôle |
|---|---|
| [00_VISION_PRODUIT.md](00_VISION_PRODUIT.md) | Vision, profils, principes, niveaux d'usage, décisions structurantes |
| [01_AUDIT_EXISTANT.md](01_AUDIT_EXISTANT.md) | État réel : inventaire, technique, UX, 20 risques classés |
| [02_CARTOGRAPHIE_FONCTIONNELLE.md](02_CARTOGRAPHIE_FONCTIONNELLE.md) | Modules A à P, transversaux, parcours critiques |
| [03_ARCHITECTURE_CIBLE.md](03_ARCHITECTURE_CIBLE.md) | Pile conservée, noyau, transition progressive, hors ligne, serveur |
| [04_MODELE_DONNEES_CIBLE.md](04_MODELE_DONNEES_CIBLE.md) | Colonies, ruches physiques, reines, opérations, traçabilité, historisation |
| [05_UX_UI_ET_NAVIGATION.md](05_UX_UI_ET_NAVIGATION.md) | Arborescence, écrans, parcours terrain, composants |
| [06_BACKLOG_MASTER.md](06_BACKLOG_MASTER.md) | **Source de vérité** : domaines, epics, fonctionnalités, user stories, tâches |
| [07_PRIORISATION.md](07_PRIORISATION.md) | Méthode, tableau complet, arbitrages |
| [08_ROADMAP_GLOBALE.md](08_ROADMAP_GLOBALE.md) | Phases, itérations, dépendances, jalons |
| [09_STRATEGIE_TESTS.md](09_STRATEGIE_TESTS.md) | Pyramide de tests, non-régression, définition de terminé |
| [10_STRATEGIE_DEPLOIEMENT.md](10_STRATEGIE_DEPLOIEMENT.md) | Environnements, migrations, sauvegardes, retour arrière |
| [11_FONCTIONNALITES_DIFFERENCIANTES.md](11_FONCTIONNALITES_DIFFERENCIANTES.md) | Ce qui peut faire d'Apidoo une référence |
| [12_DISTRIBUTION_ET_MONETISATION.md](12_DISTRIBUTION_ET_MONETISATION.md) | Web sur domaine propre, applications iOS et Android, règles des stores, paiements, coûts |
| [ITERATIONS/](ITERATIONS/) | 32 fiches (IT-00 à IT-31), 18 rubriques chacune |
| [PROMPTS_CLAUDE/](PROMPTS_CLAUDE/) | 32 prompts prêts à coller dans Claude Code, un par itération |

**Chiffres :** 19 domaines · 47 epics · 125 fonctionnalités · 8 anomalies · 141 user stories · 408 tâches techniques · 32 itérations en 10 phases. Priorités des fonctionnalités et anomalies : 13 P0, 53 P1, 45 P2, 17 P3, 5 P4 (AP-BUG-008 compris).

## 2. Réponses rapides

| Question | Où |
|---|---|
| Où en est réellement Apidoo ? | 01 §1 et §3 |
| Quelles sont ses forces ? | 01 §7 |
| Quels problèmes prioritaires ? | 01 §6 (R-01 à R-09) |
| À quoi ressemble le produit final ? | 00, 02 |
| Que reste-t-il à développer, à améliorer ? | 06 (statuts NON IMPLÉMENTÉ / PARTIEL / À AMÉLIORER) |
| Dans quel ordre ? Quelles dépendances ? | 08 §1–4 |
| Que contient chaque itération, quand est-elle terminée ? | ITERATIONS/ (§3 à §14) |
| Comment tester sans casser l'existant ? | 09 |
| Web, stores, paiements : quel plan ? | 12 |
| Quel prompt donner à Claude Code ? | PROMPTS_CLAUDE/ |

## 3. Conventions de mise à jour

1. **Le backlog master est la source de vérité.** Les fiches et prompts citent ses identifiants ; en cas d'écart, le backlog fait foi et la fiche est corrigée.
2. **Identifiants stables** : `AP-EPIC-nnn`, `AP-FEAT-nnn`, `AP-BUG-nnn`, `AP-US-nnn`, `AP-TECH-nnn`, `IT-nn`. Un nouvel élément prend le **numéro suivant le plus grand existant** de son type ; un numéro n'est jamais réattribué ni renuméroté. Un élément abandonné passe au statut `ABANDONNÉ` avec la raison, il n'est pas supprimé.
3. **Statuts** (en plus de ceux de l'audit) : `PLANIFIÉ` → `EN COURS` → `EN RECETTE` → `EN PRODUCTION` (= terminé), ou `ABANDONNÉ`. Mettre à jour le statut dans le backlog à chaque étape, avec la date et la version.
4. **Fin d'itération** : la PR met à jour les statuts du backlog, coche la définition de terminé de la fiche, et ajoute une ligne « Réalisé le … , version … » en tête de la fiche.
5. **Nouvelle idée** : l'ajouter au backlog (epic existant ou nouveau), avec priorité et itération cible, avant tout développement ; si elle change l'ordre des itérations, mettre à jour 08.
6. **Numéros de migration** : indicatifs dans les fiches ; la migration prend le premier numéro libre au moment de sa réalisation.
7. Ces fichiers ont été générés une fois à partir d'une même structure de données pour garantir leur cohérence ; ils sont désormais **maintenus à la main**.

## 4. Décisions qui vous reviennent

| # | Décision | Pourquoi elle bloque | Avant |
|---|---|---|---|
| D-01 | ~~La source non minifiée de `app.js` existe-t-elle ?~~ **Non (réponse du 6 nov. 2026) : source reconstituée en IT-00** | — | IT-00 |
| D-02 | ~~Autoriser l'application de 010 et 011 en production~~ **Accordée et réalisée le 5 nov. 2026** | — | IT-02 |
| D-03 | Où stocker les sauvegardes chiffrées (hors dépôt public) et qui détient la clé. **6 nov. 2026 : reportée, pas de sauvegarde automatique pour le moment** ; recommandation : Cloudflare R2, clé `age` détenue hors ligne par le responsable | Pas de sauvegarde automatique sur l'offre gratuite (Supabase Pro en ferait une partie, voir 12 §6) | avant toute migration non additive |
| D-04 | Confirmer le tutoiement dans toute l'application | Charte de ton | IT-03 |
| D-05 | Facturation électronique 2027 : export Factur-X, partenaire agréé, ou hors périmètre (Apidoo ne facture qu'aux particuliers) | Obligation d'émission pour les PME au 1er sept. 2027 | IT-21 |
| D-06 | Cible des 12 prochains mois : amateurs et passionnés (recommandé), ou professionnels d'emblée | Ordre des phases 4 à 7 | IT-05 |
| D-07 | Budget et fournisseur du modèle de langage pour l'assistant | Coût par question | IT-24 |
| D-08 | Modèle économique (gratuit, freemium, payant) et calendrier ; recommandation : freemium (12 §9) | Phase 9 | IT-27 |
| D-09 | Usage commercial d'Open-Meteo, Nominatim et des tuiles OpenStreetMap : offres payantes ou alternatives | Conditions d'usage à respecter dès qu'Apidoo devient payant | IT-22 |
| D-10 | Ouvrir les inscriptions à tous, ou garder une liste d'adresses autorisées | Charge de support, données de tiers | après IT-04 |
| D-11 | Nom de domaine d'Apidoo | Adresse définitive du site, des liens d'e-mail et des applications | IT-29 |
| D-12 | Hébergeur web (recommandé : Cloudflare Workers, fichiers statiques) | GitHub Pages exclut un usage commercial | IT-29 |
| D-13 | Structure juridique et comptes développeur (personnel ou organisation) | Comptes Apple et Google, test fermé Google, CGV, TVA, prestataire de paiement | IT-30 (comptes), IT-28 (publication) |
| D-14 | Prestataire de paiement web et stratégie mobile (achats intégrés seuls, ou aussi lien vers le web dans l'UE) | Commissions et règles des stores (12 §5) | IT-27 |

## 5. Sources réglementaires consultées (5 nov. 2026)

- Déclaration annuelle des ruches, obligatoire dès la première colonie, entre le 1er septembre et le 31 décembre : [Chambre d'agriculture Pays de la Loire](https://pays-de-la-loire.chambres-agriculture.fr/sinformer/ressources-et-documentation/evenements-manifestations/detail-evenement-technique/apiculteurs-cest-le-moment-de-declarer-vos-ruches).
- Facturation électronique : réception obligatoire pour toutes les entreprises depuis le 1er septembre 2026, émission pour PME et micro-entreprises au 1er septembre 2027 : [Previssima](https://www.previssima.fr/actualite/facturation-electronique-ce-qui-change-pour-les-entreprises-des-le-1er-septembre-2026.html).
- Seuils varroa : les schémas régionaux donnent des seuils différents selon la méthode et la période (ex. [schéma de lutte 2025, DRAAF Bretagne](https://draaf.bretagne.agriculture.gouv.fr/IMG/pdf/schema-lutte-varroa-2025-bretagne-3.pdf)) ; d'où l'exigence de seuils paramétrables et sourcés (AP-FEAT-052).
- **À rechercher avant IT-13, IT-18 et IT-21** : texte en vigueur du registre d'élevage, mentions d'étiquetage du miel, mentions obligatoires des factures. Ces points ne sont pas tranchés dans cette roadmap.
