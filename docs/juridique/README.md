# Documents juridiques d'Apiviz

Rédigés le 24 nov. 2026, complétés le 28 nov. 2026 par Claude à la demande de Pierre-Louis. **Ce sont des projets,
pas des textes validés** : Claude n'est pas juriste. Ils doivent être relus par un avocat ou un juriste avant toute
publication (questions préparées : `questions-juriste.md`). Rien n'est publié sur apiviz.fr sans l'accord de
Pierre-Louis.

| Source | Page publiée | Rôle |
|---|---|---|
| `mentions-legales.md` | `mentions-legales.html` | Éditeur et hébergeurs (LCEN) |
| `cgu.md` | `cgu.html` | Règles d'utilisation, clause bêta, annexe « sous-traitance » (RGPD, art. 28) |
| `cgv.md` | `cgv.html` | Vente des offres et recharges, résiliation, rétractation |
| `../CONFIDENTIALITE.md` | `confidentialite.html` | Politique de confidentialité (les deux fichiers se modifient ensemble) |
| `registre-des-traitements.md` | non publié | Registre interne (RGPD, art. 30) |
| `accords-de-traitement.md` | non publié | DPA à accepter et archiver |
| `questions-juriste.md` | non publié | Questions pour la relecture |

Les pages sont produites par `node scripts/pages-juridiques.mjs` (racine du site, comme `confidentialite.html`,
donc servies sur app.apiviz.fr ; le pied de page d'apiviz.fr y renvoie). Les commentaires `<!-- … -->` des sources ne
sont pas publiés. `tests/unitaires/juridique.test.mjs` vérifie que les pages sont à jour, sans script, en vouvoiement,
que les prix des CGV sont ceux de l'application et que les seuls crochets restants sont ceux de la liste ci-dessous.

## Ce qui reste à fournir (crochets restants)

- **Structure** : `[DÉNOMINATION]`, `[FORME JURIDIQUE]`, `[CAPITAL]` (société seulement), `[ADRESSE DU SIÈGE]`,
  `[SIREN / RCS]`, `[DIRECTEUR DE LA PUBLICATION]`, `[TÉLÉPHONE]` (exigé dans les CGV et les mentions).
- **TVA** : `[MENTION TVA]` = « TVA non applicable, art. 293 B du CGI » en franchise en base, sinon le numéro de TVA
  intracommunautaire ; et, côté serveur, le secret `TVA_MENTION` (`docs/PAIEMENT.md`).
- **Médiateur** : `[MÉDIATEUR : nom, site internet, adresse postale]`, une fois l'adhésion faite.
- **Dates** : `[DATE DE PUBLICATION]` ; `[DATE DE DÉBUT DE LA BÊTA]` et `[DATE DE FIN DE LA BÊTA]`.
- **À vérifier** : téléphone de Cloudflare et de Supabase (mentions légales) ; entité Stripe de l'accord de services.

Décisions prises par défaut dans les textes, à confirmer : gouttes du mois non reportées et recharges sans date
limite (comme l'écran de l'application) ; préavis de 30 jours pour une modification des CGU ; tribunaux du siège pour
les professionnels ; prévenance de 3 mois en cas d'arrêt d'Apiviz.

## Bloquant avant le mode réel de Stripe

1. **Bouton « Me rétracter »** dans Mon offre pendant 14 jours, avec accusé de réception par e-mail (contenu, date,
   heure) : obligatoire depuis le 19 juin 2026 (art. L221-21, ordonnance n° 2026-2). Il n'existe pas encore ; les CGV
   (art. 7) le décrivent. PR à faire : demande enregistrée, e-mail par Brevo, remboursement au prorata.
2. **E-mail de confirmation de résiliation** (date d'effet) et **rappel annuel** 3 mois à 1 mois avant l'échéance
   (L215-1) : à envoyer par Brevo depuis « stripe-webhook », ou à vérifier dans les e-mails clients de Stripe.
3. **Stripe › Paramètres › Informations publiques** : adresse des CGV (même valeur que `CGV_URL`), sans quoi la case
   d'acceptation est refusée. Espace client : annulation « à la fin de la période » (déjà en place en test).
4. Structure immatriculée, médiateur choisi, relecture juridique faite, pages publiées.

## Vérification au 28 nov. 2026 (mentions obligatoires d'un abonnement en ligne B2C)

| Obligation | Source | Textes | Écrans |
|---|---|---|---|
| Résiliation en ligne « en 3 clics », mention claire, accès direct et facile | L215-1-1, décret n° 2023-417 ; economie.gouv.fr (DGCCRF) | CGV art. 6 | **v5.92** : bouton « Résilier mon abonnement » dans Mon offre, qui ouvre directement la confirmation Stripe. Confirmation par e-mail : bloquant n° 2 |
| Information avant reconduction d'un contrat annuel | L215-1 | CGV art. 6 | Bloquant n° 2 |
| Fonction de rétractation en ligne, accusé de réception | L221-21 (ord. n° 2026-2, depuis le 19 juin 2026) ; economie.gouv.fr | CGV art. 7 | Bloquant n° 1 |
| 14 jours ; demande expresse d'exécution immédiate ; prorata | L221-18, L221-25, L221-28 ; service-public.fr F10485 | CGV art. 7 | **v5.92** : case obligatoire de la page Stripe, rappel en pied de facture |
| Formulaire type de rétractation | Annexe à l'art. R221-1 | CGV art. 7 | — |
| Prix TTC, caractéristiques, durée, renouvellement | L111-1, L221-5 ; entreprendre.service-public.fr F23455 | CGV art. 2, 3, 6 | Prix et mention de TVA sur Choisir une offre et Recharger (v5.92) |
| Bouton « commande avec obligation de paiement » | L221-14 | CGV art. 5 | Bouton Stripe + texte au-dessus (question au juriste n° 8) |
| Médiateur de la consommation, coordonnées | L612-1, L616-1 | CGV art. 10 | Liens depuis Réglages, Mon offre |
| Plateforme européenne RLL | Supprimée (règl. (UE) 2024/3228, fin le 20 juil. 2025) | Mention retirée | — |
| Éditeur, directeur de la publication, hébergeur | LCEN | Mentions légales | Liens : inscription, Réglages, page de commande, apiviz.fr |
| Information sur les traitements, mesure d'usage | RGPD art. 13 ; CNIL (mesure d'audience) | Confidentialité, registre | « ni mesure d'audience » corrigé sur apiviz.fr et la politique (v5.86 mesure l'usage) |

## Règles d'écriture

Vouvoiement, phrases courtes, pas de jargon sans explication. Chaque document porte une date de version ; toute
modification qui touche les droits des utilisateurs est annoncée dans l'application 30 jours avant.
