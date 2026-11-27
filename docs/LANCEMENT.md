# Lancement public d'Apiviz : plan et listes à cocher

Établi le 24 nov. 2026 (analyse « mise sur le marché », validée par Pierre-Louis : « chacune des recommandations doit
être mise en place »). Objectif : **ouverture au public avant la reprise des visites, début mars 2027**, puis les
boutiques d'applications. Règles de travail jusque-là : `PROCESSUS.md` § Gel avant ouverture.

## Calendrier

| Période | Étape | Sortie attendue |
|---|---|---|
| Semaine du 24 nov. | Production à jour (v5.79 à v5.88), fonctions serveur alignées | Liste A cochée |
| Décembre | Sauvegardes actives, structure juridique, documents juridiques en ligne, paiement sur le web | Listes B et C cochées |
| Janvier – février | Bêta fermée : 20 à 30 apiculteurs, un point par semaine, corrections seulement | Liste D cochée |
| Début mars 2027 | Ouverture au public sur le web | — |
| Ensuite | Boutiques Apple et Google | Liste E cochée |

## A. Mise en production des versions en attente

**26 nov. 2026, 23 h** : production et recette en **v5.90** (`386214b`, migrations 039 à 042 appliquées sur `Apiviz`),
fonctions serveur déployées sur les deux projets, clés VAPID créées par l'action « Clés VAPID ». Restent l'essai sur
téléphone et le contrôle du lendemain.

État au 24 nov. 2026, 22 h : production et recette sur `0a9fb8a` (v5.78) jusqu'à 21 h 44, puis recette sur `main`
(`9ca73b4`, v5.79 à v5.86, migration 039 appliquée sur `Apiviz-test`).

Fonctions serveur relevées le 24 nov. : `Apiviz-test` a `assistant` et `lire-facture` ; **`Apiviz` n'a que
`lire-facture`** (API ne répond pas en production) ; `lire-carnet` et `nettoyer-stockage` ne sont déployées nulle part.

- [ ] Essai sur téléphone en recette : rubriques « À vérifier » v5.79 à v5.86 de `CHANGELOG.md`
- [x] Fusionner #126 (v5.87, migration 040) puis #127 (v5.88, migration 041) ; recette depuis `main` ; essai sur téléphone
- [x] Fusionner la PR « Fonctions serveur » ; secret `SUPABASE_ACCESS_TOKEN` ; lancer « Fonctions serveur » › recette
- [x] Secrets Supabase de `Apiviz-test`, puis de `Apiviz` :
  - v5.87 : `VAPID_PUBLIQUE`, `VAPID_PRIVEE`, `VAPID_SUJET`, `RAPPELS_SECRET` (et `RAPPELS_SECRET_RECETTE` /
    `RAPPELS_SECRET_PRODUCTION` dans GitHub)
  - v5.88 : `SUPPRESSION_CLE` (et `SUPPRESSION_CLE_RECETTE` / `SUPPRESSION_CLE_PRODUCTION` dans GitHub)
  - nettoyage : `NETTOYAGE_CLE` (et `NETTOYAGE_CLE_RECETTE` / `NETTOYAGE_CLE_PRODUCTION` dans GitHub)
  - `ANTHROPIC_API_KEY` existe déjà sur les deux projets (`lire-facture`) : `assistant` et `lire-carnet` s'en servent
- [x] « Mise en ligne » › production (applique 039 à 041 sur `Apiviz`), puis « Fonctions serveur » › production
- [x] Équipe Apiviz : `insert into public.administrateurs_apiviz values ('…')` sur `Apiviz` (tableau « Mes utilisateurs »)
- [ ] Le lendemain : résumé de l'action « Santé » vert ; une question à API depuis la production

## B. Sécurité et sauvegardes

- [ ] Sauvegarde activée (`PROCESSUS.md` § Sauvegardes) : résumé « restauration essayée »
- [ ] Copie des fichiers (photos, factures) activée : résumé avec le nombre de fichiers
- [ ] Premier exercice de restauration fait sur ton ordinateur, noté dans `PROCESSUS.md`
- [ ] Supabase › Authentication : « Prevent use of leaked passwords » sur les deux projets (`TECHNIQUE.md` § Sécurité)
- [x] E-mails (v5.90) : compte Brevo, domaine `apiviz.fr` vérifié (SPF, DKIM, DMARC), secrets `BREVO_CLE`,
      `COURRIEL_EXPEDITEUR`, `APP_URL` sur les deux projets ; SMTP de Supabase Auth branché sur Brevo
      (`TECHNIQUE.md` § E-mails)
- [ ] Clé privée `age` rangée hors ligne à deux endroits

## C. Juridique et commercial (`docs/juridique/`)

- [ ] Structure juridique choisie et immatriculée (D-12) : nom, forme, SIREN, adresse, directeur de la publication
- [ ] Remplir les `[CROCHETS]` : mentions légales, CGU, CGV, politique de confidentialité, registre des traitements
- [ ] Accords de traitement des données acceptés et archivés : Supabase, Cloudflare, Anthropic (`registre-des-traitements.md`)
- [ ] Médiateur de la consommation choisi (adhésion payante, obligatoire pour vendre aux particuliers)
- [ ] Relecture par un juriste ou un avocat (CGV, statistiques d'usage v5.86, rôle de sous-traitant)
- [ ] Paiement sur le web (D-14) : prestataire choisi, abonnements reliés aux offres de 029, résiliation en ligne testée
- [ ] Pages publiées sur apiviz.fr et liées depuis l'application (inscription, Réglages, page de commande publique)

## D. Bêta fermée

- [ ] 20 à 30 apiculteurs recrutés (débutants et confirmés, au moins 3 avec une exploitation partagée)
- [ ] Un canal de retour (fil de l'équipe ou formulaire) et un point hebdomadaire
- [ ] Indicateurs : première visite faite, retour à J+7 et J+30 (« Mes utilisateurs »), erreurs du journal
- [ ] Aucune erreur bloquante ouverte depuis deux semaines avant l'ouverture

## E. Boutiques d'applications (après l'ouverture web)

- [ ] Notifications natives (les rappels v5.87 passent par le navigateur)
- [ ] Apple : fiche « Confidentialité de l'app » ; Google : formulaire « Sécurité des données » ; adresse web de
      suppression du compte (exigée par Google Play)
- [ ] Abonnements dans l'application : achats intégrés Apple / Google, ou vente sur le web seulement — à décider avec
      le prestataire de paiement (commissions et règles des boutiques à revérifier au moment du dépôt)
- [ ] Captures, description, classement d'âge, compte de démonstration pour la relecture des boutiques
