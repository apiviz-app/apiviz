# Registre des traitements (RGPD, art. 30) — document interne

*Projet du 24 nov. 2026, d'après le code (main `9ca73b4` + PR #126, #127) et `confidentialite.html`. À tenir à jour à
chaque migration qui ajoute une donnée personnelle. Non publié.*

**Responsable** : [DÉNOMINATION], [ADRESSE], représenté par [NOM]. **Contact** : [E-MAIL]. Pas de délégué à la protection
des données obligatoire (pas de suivi à grande échelle ni de données sensibles) ; [NOM] est le référent.

## Traitements dont Apiviz est responsable

| # | Traitement | Personnes | Données | Finalité | Base légale | Durée | Destinataires |
|---|---|---|---|---|---|---|---|
| 1 | Comptes et accès | Utilisateurs | E-mail, mot de passe (haché), prénom, nom, rôle dans l'exploitation | Se connecter, partager une exploitation | Contrat (CGU) | Durée du compte ; suppression en 30 jours annulables (041) ; compte sans activité depuis 3 ans : préavis par e-mail, suppression un mois après (042) | Membres de l'exploitation (prénom, nom) ; Supabase |
| 2 | Carnet de l'exploitation | Utilisateurs | Ruchers (position), colonies, visites, traitements, récoltes, stock, dépenses, factures d'achat, photos, tâches, fil de l'équipe | Le service lui-même | Contrat | Tant que l'exploitation existe | Membres ; Supabase ; Cloudflare (fichiers de l'app) |
| 3 | Assistant API, lecture de factures et de carnets | Utilisateurs | Question, extraits utiles des données de l'exploitation, factures et pages de carnet envoyées | Répondre, lire les documents | Contrat (fonction demandée par l'utilisateur) | Historique gardé jusqu'à effacement par l'utilisateur ; Anthropic : 30 jours au plus | Anthropic (États-Unis) |
| 4 | Profil facultatif et statistiques | Utilisateurs ayant répondu | Tranche d'âge, code postal (département), ancienneté, activité, nombre de colonies, source, attente | Statistiques d'ensemble (groupes ≥ 5) | Consentement (réponses facultatives, effaçables) | Jusqu'à effacement ou suppression du compte | Équipe Apiviz (agrégats) |
| 5 | Mesure de l'utilisation (039) | Utilisateurs n'ayant pas refusé | Jours d'ouverture, grandes rubriques, type d'appareil | Améliorer l'application | [À TRANCHER avec le juriste : intérêt légitime avec opposition (interrupteur « statistiques ») ou consentement préalable] | 400 jours | Équipe Apiviz (agrégats, écran administrateurs) |
| 6 | Rappels (040) | Utilisateurs abonnés | Abonnement Web Push de l'appareil, préférences | Envoyer au plus un rappel par matin | Consentement (autorisation du navigateur) | Jusqu'au désabonnement | Service de notification du navigateur (Google, Apple, Mozilla) |
| 7 | Journal des modifications | Utilisateurs | Ancienne valeur, auteur, date | Réparer une erreur | Intérêt légitime | 1 an | Responsables de l'exploitation |
| 8 | Journal des erreurs | Utilisateurs | Version, écran, message (sans e-mail ni donnée d'exploitation) | Corriger les pannes | Intérêt légitime | 90 jours | Équipe Apiviz |
| 9 | Offres et facturation (à venir, D-14) | Clients payants | Offre, dates, factures ; paiement chez [PRESTATAIRE] | Vendre les offres, obligations comptables | Contrat ; obligation légale | Factures : 10 ans (Code de commerce, art. L123-22) | [PRESTATAIRE], comptable |
| 11 | Dernière activité et e-mails (042) | Utilisateurs | Dernier jour d'ouverture ; journal des e-mails (nature, date) ; e-mail et prénom transmis à Brevo à l'envoi | Durée de conservation des comptes, préavis, confirmation de suppression | Obligation légale (limitation de la conservation) ; contrat | Dernier jour : jusqu'à suppression du compte ; journal : 2 ans | Brevo (France) |
| 10 | Sauvegardes | Tous | Copie chiffrée de la base et des fichiers | Reprise après incident | Intérêt légitime | 30 jours (base), 4 semaines (fichiers) | Cloudflare R2 (chiffré, clé chez le responsable) |

## Traitements où Apiviz est sous-traitant (annexe des CGU)

| Traitement | Responsable | Personnes | Données | Durée |
|---|---|---|---|---|
| Clients et ventes de l'apiculteur | L'apiculteur | Ses clients | Nom, téléphone, e-mail, adresse, achats, préférences, carte de fidélité | Tant que l'apiculteur les garde |
| Commandes en ligne (027) | L'apiculteur | Acheteurs | Nom, téléphone, lieu de retrait, note, pots | Idem |
| Traçabilité d'un lot (v5.83) | L'apiculteur | Clients ayant acheté le lot | Liste des clients à prévenir | Idem |

## Sous-traitants d'Apiviz

| Sous-traitant | Rôle | Lieu | Garanties | Accord signé |
|---|---|---|---|---|
| Supabase, Inc. | Base, comptes, fichiers, fonctions serveur | Projet hébergé dans l'UE ; société aux États-Unis | Accord de traitement (DPA) de Supabase, clauses contractuelles types | [ ] [DATE] |
| Cloudflare, Inc. | Hébergement des fichiers de l'app, sauvegardes R2 | Réseau mondial ; États-Unis | DPA de Cloudflare ; certifiée Data Privacy Framework [À VÉRIFIER sur dataprivacyframework.gov] | [ ] [DATE] |
| Anthropic, PBC | Modèle Claude (API, factures, carnets) | États-Unis | Conditions commerciales et DPA d'Anthropic, clauses contractuelles types ; pas d'entraînement sur les données de l'API | [ ] [DATE] |
| Brevo (Sendinblue SAS) | Envoi des e-mails d'Apiviz | France, Allemagne | DPA de Brevo | [ ] [DATE] |
| GitHub, Inc. | Code, actions (sauvegarde : données chiffrées en transit seulement) | États-Unis | DPA de GitHub | [ ] [DATE] |
| IGN, Open-Meteo, jsDelivr | Carte, météo, bibliothèques | France, UE, mondial | Reçoivent l'adresse IP ou la position des ruchers, aucune donnée de compte | Sans objet |

## Sécurité (art. 32)

Protection par ligne sur toutes les tables, fonctions vérifiant les droits, connexions chiffrées, mots de passe hachés
par Supabase, sauvegardes chiffrées avec `age` et restauration essayée chaque nuit, journal des modifications,
relevé des conseillers de sécurité (`docs/TECHNIQUE.md` § Sécurité), accès administrateurs limités à
`administrateurs_apiviz`.

## Violation de données (art. 33 et 34)

1. Constater et contenir (couper la fonction en cause : réglages `*_ACTIF = non`, révoquer une clé).
2. Noter dans le tableau ci-dessous : date, nature, données et personnes touchées, conséquences, mesures.
3. Si un risque existe pour les personnes : notifier la CNIL **dans les 72 heures** (notifications.cnil.fr).
4. Si le risque est élevé : prévenir les personnes concernées (bandeau dans Apiviz, e-mail).
5. Si des données de clients d'apiculteurs sont touchées : prévenir les apiculteurs sous 48 heures (annexe des CGU).

| Date | Nature | Données / personnes | Mesures | CNIL notifiée |
|---|---|---|---|---|
| | | | | |

## Analyse d'impact (AIPD)

Non requise à ce jour : pas de données sensibles, pas de suivi systématique à grande échelle, pas de décision
automatisée. À réexaminer si les statistiques d'usage s'étendent ou si des données de santé humaine apparaissaient.
