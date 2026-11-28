# Paiement (v5.91, migration 043)

Paiement des offres (Rucher, Exploitation) et des recharges de gouttes par carte, avec **Stripe**. Les applications
iPhone et Android passeront par l'achat intégré d'Apple et de Google (voir la fin).

## Comment ça marche

```
Apiviz (Mon offre)  ──►  fonction « paiement »  ──►  Stripe Checkout / espace client
                                                          │  paie, change d'offre, résilie
Base (abonnements,  ◄──  fonction « stripe-webhook »  ◄───┘  notification signée
gouttes_mouvements)
```

- L'application ne voit jamais la carte ni la clé Stripe. Elle demande une adresse à « paiement » et y envoie la personne.
- Seul « stripe-webhook » écrit l'abonnement (`appliquer_abonnement_externe`, canal `web`) et les gouttes achetées
  (`crediter_gouttes_payees`, une fois par paiement). Il relit toujours l'abonnement chez Stripe.
- Statuts : `trialing` → essai ; `active`, `past_due` → actif ; résiliation demandée → résilié avec l'échéance (l'offre
  court jusque-là) ; `canceled`, `unpaid` → résilié tout de suite. Paiement initial pas abouti : rien n'est écrit.
- Un essai gratuit en cours (sans carte) : l'abonnement pris pendant l'essai ne débite qu'à sa fin (48 h minimum).
- Prix : lus chez Stripe par leur *lookup key* (`rucher_mois`, `rucher_an`, `exploitation_mois`, `exploitation_an`).
  Changer un prix = créer un nouveau prix dans Stripe et lui donner la *lookup key* (case « transférer »). Le prix
  affiché dans Apiviz vient de la table `offres` : les garder égaux.
- Recharges : prix et gouttes dans `supabase/functions/paiement/stripe.js`, identiques à
  `src/domaines/compte/regles-offre.js` (un test le vérifie).

## Mise en place sur un projet (recette, puis production)

1. **Migration 043** : mise en ligne en recette (`apidoo-test`), en production avec l'accord de Pierre-Louis.
2. **Fonctions** : action « Fonctions serveur », cible voulue (« stripe-webhook » est dans `sans-jeton.txt`).
3. **Stripe** (environnement de test pour la recette, mode réel pour la production) :
   - Produits et prix avec leurs *lookup keys* (faits en test le 27 nov. 2026).
   - **Espace client** (Paramètres › Billing › Portail client) : mise à jour de la carte, historique des factures,
     annulation **à la fin de la période**, changement d'offre entre les quatre prix.
   - **Point de terminaison webhook** : `https://<projet>.supabase.co/functions/v1/stripe-webhook`, événements
     `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`,
     `customer.subscription.resumed`.
4. **Secrets Supabase** du projet (collés par Pierre-Louis, jamais dans le dépôt) :
   - `STRIPE_CLE` : clé secrète (`sk_test_…` en recette ; en production une clé restreinte `rk_live_…` suffit :
     Customers, Checkout Sessions, Customer portal, Prices en lecture, Subscriptions en lecture) ;
   - `STRIPE_WEBHOOK_SECRET` : secret de signature du point de terminaison (`whsec_…`) ;
   - `APP_URL` : déjà en place (retour vers l'application).
   - `CGV_URL` (v5.92, facultatif) : adresse des CGV publiées ; par défaut `https://app.apiviz.fr/cgv.html` ;
   - `TVA_MENTION` (v5.92, facultatif) : texte imprimé en pied des factures, `TVA non applicable, art. 293 B du CGI`
     en franchise en base ; l'écran Recharger retire alors sa ligne « TVA (20 %) ». À laisser vide si assujetti.
5. Essai : rubrique « À vérifier » de la v5.91 dans `CHANGELOG.md`.

Sans `STRIPE_CLE`, rien ne change pour l'utilisateur : « Le paiement arrive bientôt ».

## Avant le mode réel

- **CGV et rétractation (v5.92)** : Stripe › Paramètres › Informations publiques › *Conditions d'utilisation* = la même
  adresse que `CGV_URL`, sinon Stripe refuse la case d'acceptation (`consent_collection`). La case vaut acceptation
  des CGV et demande d'exécution immédiate ; Stripe garde `consent.terms_of_service = accepted` dans la session, et
  les métadonnées `cgv` (version) et `execution_immediate`.
- **Factures** : le pied (mention de TVA + rappel de l'exécution immédiate) est posé sur chaque client Stripe ; les
  recharges créent une facture après paiement (`invoice_creation`), ce que Stripe peut facturer (tarif Invoicing, à
  vérifier dans le compte).
- **Résiliation** : « Résilier mon abonnement » ouvre l'espace client sur `flow_data.subscription_cancel` ; il faut donc
  l'annulation activée dans le portail, « à la fin de la période ».
- Bloquants restants (bouton « Me rétracter », e-mails de résiliation et de préavis annuel) : `docs/juridique/README.md`.

- Statut juridique, SIRET et compte bancaire dans Stripe ; mentions légales et CGV publiées (`LANCEMENT.md`).
- Reçus par e-mail (Paramètres › E-mails clients) ; factures Stripe si un client professionnel en demande.
- TVA : franchise en base au départ (micro-entreprise) ; au-delà, activer Stripe Tax ou la gérer à la main.

## Applications mobiles (Apple et Google)

Une offre numérique vendue dans une application iPhone ou Android passe par l'achat intégré du store. La base est prête :
`abonnements.canal` accepte `apple` et `google`, `appliquer_abonnement_externe` et `crediter_gouttes_payees` servent
aux trois canaux, et `resilier_abonnement` renvoie vers les réglages du téléphone. Plan détaillé (RevenueCat ou
StoreKit et Play Billing, TestFlight, test interne Google Play) : document « apiviz-paiement-stores » du projet.
