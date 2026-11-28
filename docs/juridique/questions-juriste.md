# Questions pour la relecture juridique

Préparées le 28 nov. 2026 pour le juriste ou l'avocat qui relira `cgv.md`, `cgu.md`, `mentions-legales.md`,
`confidentialite.html` et `registre-des-traitements.md`. Contexte en une phrase : Apiviz est un logiciel en ligne de
gestion de rucher, vendu par abonnement (3,90 €/mois ou 39 €/an ; 11,90 €/mois ou 119 €/an) et par recharges de
« gouttes » qui paient l'IA, à des apiculteurs amateurs (consommateurs) et professionnels, paiement par Stripe.

## A. CGV, abonnement et rétractation

1. **Qualification** : Apiviz est-il un « service numérique » (L224-25-1), la recharge de gouttes un service ou un
   « contenu numérique » ? La réponse décide si l'on applique L221-25 (prorata) ou l'exception du L221-28 13°.
2. **Case unique dans Stripe** : une seule case vaut acceptation des CGV *et* demande expresse d'exécution immédiate
   (texte exact dans `supabase/functions/paiement/stripe.js`, `textesCommande`). Ce regroupement est-il valable, ou
   faut-il une case distincte (dans Apiviz, avant la page Stripe) ?
3. **Exécution immédiate obligatoire** : peut-on exiger la demande d'exécution immédiate pour commander (le service
   ne peut pas être différé de 14 jours), ou faut-il proposer un démarrage différé ?
4. **Recharges** : la formule « je reconnais perdre mon droit de rétractation pour les gouttes que j'aurai utilisées »
   est-elle conforme pour un service exécuté en partie ? Le calcul « prix ÷ nombre de gouttes » des gouttes utilisées
   est-il acceptable ?
5. **Fonction de rétractation** (L221-21 modifié par l'ordonnance n° 2026-2, en vigueur depuis le 19 juin 2026) :
   le bouton « Me rétracter » placé dans l'application, réservé aux personnes connectées, suffit-il, ou doit-il être
   accessible sans compte ? Quelles mentions exactes pour l'accusé de réception ?
6. **Résiliation en ligne** (L215-1-1, D215-1 et suivants) : le parcours Réglages › Offre › « Résilier mon
   abonnement » → page Stripe de confirmation → retour dans Apiviz respecte-t-il le décret n° 2023-417, notamment
   l'intitulé (« Résilier mon abonnement » plutôt que « Résilier votre contrat »), l'accès depuis l'espace connecté et
   la confirmation de la notification sur support durable ?
7. **Préavis annuel** (L215-1) : le contenu d'un rappel e-mail envoyé de 3 mois à 1 mois avant l'échéance (encadré,
   date limite) — et peut-on s'appuyer sur l'e-mail de renouvellement de Stripe ?
8. **Bouton de commande** (L221-14) : le bouton de Stripe dit « S'abonner » ou « Payer », complété par un texte au-dessus
   (« Abonnement renouvelé automatiquement… »). Est-ce une formule « sans ambiguïté » au sens du texte ?
9. **Changement de prix** en cours d'abonnement : le préavis d'un mois avec faculté de résilier est-il suffisant ?
10. **Mineurs de 15 à 17 ans** (inscription permise dès 15 ans) : peuvent-ils souscrire seuls ? Faut-il réserver
    l'achat aux majeurs ?
11. **Garantie légale de conformité** : la rédaction de l'article 8 est-elle complète (durée, remèdes, information sur
    la garantie et sur les mises à jour, articles L224-25-12 et suivants) ?
12. **Clauses de responsabilité des CGU** (article 7) : lesquelles sont réputées non écrites face à un consommateur
    (R212-1) ? Pour un professionnel, faut-il un plafond chiffré ?
13. **Clause « version bêta »** : accès gratuit sur invitation, autorisation d'utiliser les retours, fin de bêta
    vers Découverte. Faut-il un document séparé signé par les testeurs ?
14. **TVA** : en franchise en base, la mention « TVA non applicable, art. 293 B du CGI » en pied des factures Stripe et
    l'affichage « prix en euros, TVA non applicable » suffisent-ils ? Une facture est-elle due pour chaque recharge
    (6 € à 25 €) ?
15. **Médiateur** : celui choisi couvre-t-il un logiciel en ligne vendu à des particuliers ? Mention à reprendre dans
    les CGV et sur le site ?

## B. Statistiques d'usage (v5.86, migration 039)

16. Apiviz note, par utilisateur et par jour d'ouverture, les grandes rubriques consultées et le type d'appareil,
    gardés 400 jours, pour des statistiques d'ensemble (groupes d'au moins 5), avec un interrupteur « ne plus compter »
    dans Mon profil. **Base légale** : intérêt légitime avec opposition, ou consentement préalable ?
17. Ces relevés passent par l'application elle-même (pas de cookie, pas d'outil tiers) : relèvent-ils de l'article 82
    de la loi Informatique et Libertés (lecture/écriture sur le terminal) et, si oui, de l'exemption « mesure
    d'audience » telle que la CNIL la décrit dans son outil d'auto-évaluation de juillet 2025 ?
18. Le « dernier jour d'ouverture », noté même pour qui refuse les statistiques (pour la suppression des comptes
    inactifs), peut-il reposer sur l'obligation de limiter la conservation ?
19. Les réponses facultatives du profil (tranche d'âge, département, activité, nombre de colonies) sont-elles bien
    présentées comme facultatives et sur la base du consentement ?

## C. Apiviz sous-traitant pour les clients des apiculteurs

20. Apiviz héberge les fiches clients, ventes et commandes en ligne que l'apiculteur saisit. La qualification
    « apiculteur responsable, Apiviz sous-traitant » est-elle la bonne, y compris pour la page de commande publique
    où l'acheteur saisit lui-même ses coordonnées sur un domaine d'Apiviz ?
21. L'annexe « article 28 » des CGU, acceptée par case à cocher, suffit-elle comme contrat de sous-traitance ? Pour un
    apiculteur amateur qui vend à ses proches, l'exemption « domestique » joue-t-elle, et que reste-t-il alors ?
22. Quand l'apiculteur interroge l'assistant API sur ses clients, des données passent chez Anthropic : faut-il une
    information ou un réglage particulier ?
23. Le délai de 48 heures pour prévenir l'apiculteur d'une violation, et la suppression dans les sauvegardes sous
    30 jours après la fin du service, sont-ils adaptés ?
24. La mention type proposée à l'apiculteur pour ses clients (annexe des CGU) est-elle suffisante ?

## D. Sous-traitants et transferts

25. Les accords listés dans `accords-de-traitement.md` (acceptés par adhésion, sans signature) suffisent-ils, et faut-il
    une analyse d'impact des transferts (TIA) pour Supabase (Singapour), Cloudflare, Anthropic et Stripe (États-Unis) ?
26. Stripe est en partie responsable de traitement (fraude, anti-blanchiment) : comment le dire dans la politique de
    confidentialité ?
27. Mentions légales : l'hébergeur à citer est-il Cloudflare, Supabase, ou les deux ; leur téléphone est-il exigé
    s'ils n'en publient pas ?
