# 12 — Distribution et monétisation

Rédigé le 6 novembre 2026 à la demande du responsable : **Apidoo devient une application utilisable sur le web et publiée sur les stores (iOS et Android), monétisable à terme.** Ce document remplace la position précédente (« GitHub Pages inchangé », « application native hors roadmap ») et fait foi pour tout ce qui touche à l'hébergement, aux applications mobiles et aux paiements. Les autres documents y renvoient.

## 1. Cible

| | Aujourd'hui | Cible |
|---|---|---|
| Web | PWA sur `apidoo.github.io` | même application sur un **domaine propre**, chez un hébergeur qui autorise un usage commercial |
| iPhone / iPad | PWA ajoutée à l'écran d'accueil | **application App Store** |
| Android | PWA installée depuis Chrome | **application Google Play** |
| Code | un seul code JavaScript | **toujours un seul code** : le même site, embarqué dans les applications mobiles |
| Données | Supabase offre gratuite | Supabase **Pro** pour la production avant l'ouverture large |
| Revenus | aucun | offre gratuite + offre payante, payable sur le web **et** dans les applications |

Principe : **un seul produit, trois vitrines.** Une fonctionnalité est développée une fois et livrée partout ; seules les briques propres à une plateforme (paiement, notifications, appareil photo natif) diffèrent, derrière une même interface.

## 2. Pourquoi quitter GitHub Pages

Les conditions de GitHub Pages excluent son usage comme hébergement gratuit pour faire tourner une activité en ligne ou un logiciel commercial vendu en tant que service (SaaS) ([GitHub Docs, limites de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), consulté le 6 nov. 2026). Dès qu'Apidoo propose un abonnement, il doit être hébergé ailleurs.

Il faut changer **tôt**, pas au moment de la monétisation :

- **Les données locales sont liées à l'adresse du site.** File d'envoi hors ligne, photos en attente, cache : tout ce que le navigateur garde (IndexedDB) appartient à `apidoo.github.io` et ne suit pas un changement de domaine. Aujourd'hui la production compte 2 membres ; plus on attend, plus la bascule est risquée.
- **Les applications mobiles ont besoin du domaine** pour les liens de connexion et d'invitation qui s'ouvrent dans l'application (`/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json`) et pour la politique de confidentialité exigée par les stores.
- Les adresses de redirection de Supabase Auth (confirmation d'e-mail, mot de passe oublié, invitation) devront changer une fois ; autant le faire avec peu d'utilisateurs.

GitHub reste l'outil du code, des pull requests et des Actions. Seule la **publication** du site change.

### Hébergeur recommandé : Cloudflare (Workers, fichiers statiques)

| Option | Usage commercial sur l'offre gratuite | Remarque |
|---|---|---|
| **Cloudflare Workers (fichiers statiques)** | oui | requêtes de fichiers statiques gratuites et illimitées ; Cloudflare oriente les nouveaux projets vers Workers plutôt que Pages ; un connecteur Cloudflare est déjà disponible dans les sessions Claude |
| Cloudflare Pages | oui | fonctionne, mais en maintenance : préférer Workers pour un nouveau projet |
| Vercel Hobby | **non** (usage personnel et non commercial seulement) | écarté |
| Netlify | oui (offre gratuite à crédits) | alternative valable |

Sources : comparatifs d'hébergeurs vérifiés en juin à septembre 2026 ([flaviocopes.com](https://flaviocopes.com/hosting-free-tiers.md), [morphllm.com](https://www.morphllm.com/comparisons/cloudflare-pages-vs-workers)). À revérifier sur les pages officielles au moment d'IT-29.

## 3. Comment faire une « vraie » application sans tout réécrire

### Options étudiées

| Option | Code | Passe la revue Apple ? | Coût de réalisation | Décision |
|---|---|---|---|---|
| A. PWA seule | 1 | — (pas de store) | nul | **insuffisant** : pas de présence en store, notifications limitées sur iPhone |
| B. Google Play en TWA (Chrome plein écran) + rien sur iOS | 1 | — | faible | **abandonnée** (était le plan de `MOBILE.md`) : couvre Android seulement, chaîne d'outils séparée |
| C. **Capacitor** : le site embarqué dans une application iOS et Android, avec modules natifs | 1 | **oui, si** l'application fonctionne hors ligne et utilise des fonctions de l'appareil (voir §4) | moyen (IT-30) | **retenue** |
| D. Réécriture en Expo / React Native (comme Gladoo) | 2 pendant la transition | oui | très élevé : tous les écrans, arrêt des livraisons plusieurs mois | **écartée pour l'instant**, réexaminée au jalon J7 si C échoue |
| E. Natif Swift + Kotlin | 3 | oui | hors de portée | écartée |

**Pourquoi Capacitor.** Apidoo est déjà une application de terrain : hors ligne, photos, dictée, QR codes, géolocalisation. Ce sont exactement les fonctions qui distinguent une application d'un « site reconditionné ». Capacitor les rend natives sans toucher au reste du code, et le même dossier web est publié sur le site et dans les deux applications. Capacitor 8 est la version stable depuis décembre 2025 ; une version 9 est annoncée pour fin novembre 2026 (à vérifier au démarrage d'IT-30).

**Condition indispensable :** les fichiers de l'application sont **embarqués dans le paquet** (et non chargés depuis l'adresse du site). C'est ce qui permet l'ouverture hors ligne dès le premier lancement et évite le refus « ce n'est qu'un site ». Conséquence : une nouvelle version de l'interface passe par la revue des stores (voir §7).

## 4. Règles des stores qui pèsent sur la roadmap

| Règle | Source | Conséquence pour Apidoo | Où |
|---|---|---|---|
| **Fonctionnalité minimale (Apple 4.2)** : une application doit offrir plus qu'un site reconditionné | [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) | fichiers embarqués, hors ligne dès le premier lancement, appareil photo et notifications natifs, QR, géolocalisation | IT-30 |
| **Suppression du compte dans l'application** (Apple 5.1.1(v)) si l'application permet d'en créer un | idem | AP-FEAT-020 avancée de IT-26 à IT-28 | IT-28 |
| **Contenus et abonnements débloqués dans l'application → achat intégré Apple** (3.1.1) | idem | l'offre payante doit aussi être vendue par achat intégré sur iOS | IT-27 |
| **Services multiplateformes** (3.1.3(b)) : un abonnement acheté sur le web peut être reconnu dans l'app, à condition qu'il soit aussi proposé en achat intégré | idem | un seul abonnement par exploitation, reconnu partout, quel que soit le canal d'achat | IT-27 |
| **Lien vers un paiement externe** : autorisé aux États-Unis ; dans l'UE avec une autorisation (« entitlement ») d'Apple et une commission ; interdit dans la plupart des autres pays | idem, 3.1.1(a) | possible plus tard pour la France ; pas de bouton « payer sur le site » dans l'app iOS sans cette autorisation | IT-27, D-14 |
| **Test fermé Google Play** : 12 testeurs pendant 14 jours d'affilée pour un compte développeur **personnel** créé après le 13 nov. 2023 ; les comptes **organisation** en sont dispensés | [Aide Play Console](https://support.google.com/googleplay/android-developer/answer/14151465) | à prévoir dans le calendrier, ou compte organisation (numéro D-U-N-S, donc structure juridique) | IT-28, D-13 |
| Politique de confidentialité publique, étiquettes de confidentialité (Apple) et section « Sécurité des données » (Google) | stores | `docs/CONFIDENTIALITE.md` publiée sur le domaine | IT-28 |

## 5. Monétisation : ce que prennent les stores (au 6 nov. 2026)

| Canal | Commission | Source |
|---|---|---|
| Web (paiement chez un prestataire) | 0 % de commission de store ; frais du prestataire seulement | — |
| Apple, achat intégré, UE, depuis le 1er oct. 2026 | 26 % standard ; **15 %** pour le programme Small Business (moins de 1 M$ de revenus annuels) et pour les abonnements après la première année | [Apple Newsroom, 18 août 2026](https://www.apple.com/newsroom/2026/08/apple-announces-changes-for-apps-in-the-european-union/) et presse spécialisée |
| Apple, lien vers le web, UE | 15 % (10 % au taux réduit) sur les ventes dans les 7 jours suivant le clic | idem |
| Google Play, abonnement, UE/R.-U./É.-U., depuis le 30 juin 2026 | 10 % de frais de service **+ 5 %** si Google Play Billing est utilisé ; 10 % seulement avec une facturation alternative ou un lien vers le web | [Android Developers Blog, juin 2026](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html) |

Ces règles changent souvent (procédures judiciaires aux États-Unis, accords avec la Commission européenne) : **à revérifier avant IT-27**.

### Architecture de paiement retenue

- **Une table des droits par exploitation** (`abonnements` : offre, statut, échéance, **canal** web / apple / google, identifiant externe). L'application ne regarde que cette table, jamais le canal.
- **Trois sources**, chacune reçue par une Edge Function idempotente : webhooks du prestataire web, notifications serveur de l'App Store, notifications en temps réel de Google Play.
- Web : prestataire de paiement à choisir (D-14). Un prestataire « marchand officiel » (qui gère la TVA européenne à la place d'Apidoo) simplifie la comptabilité ; un prestataire classique coûte moins cher mais laisse la TVA à gérer.
- Mobile : achats intégrés natifs via un module Capacitor, ou un service tiers qui unifie Apple, Google et le web (à évaluer en IT-27 : coût contre simplicité).
- Les limites de l'offre gratuite ne bloquent **jamais** la lecture ni une saisie au rucher (AP-US-130 inchangée).

## 6. Coûts fixes prévisibles

| Poste | Coût | Quand | Source |
|---|---|---|---|
| Nom de domaine | quelques euros à dizaines d'euros par an selon l'extension (à relever à l'achat) | IT-29 | — |
| Hébergement web Cloudflare | 0 € (offre gratuite) | IT-29 | §2 |
| Supabase Pro (production) | à partir de 25 $ par mois : pas de mise en pause, sauvegardes quotidiennes gardées 7 jours, 8 Go de base, 100 Go de fichiers | avant l'ouverture large (J1) ou au plus tard avant IT-28 | [supabase.com/pricing](https://supabase.com/pricing), consulté le 6 nov. 2026 |
| Apple Developer Program | 99 $ par an | IT-30 (TestFlight) | `docs/MOBILE.md` |
| Google Play Console | 25 $ une fois | IT-30 (test interne) | `docs/MOBILE.md` |
| Compilation iOS | un Mac est nécessaire : poste personnel ou machines macOS de GitHub Actions | IT-30 | à confirmer à IT-30 |

Supabase Pro répond aussi en partie à D-03 (sauvegardes) ; les photos restent à sauvegarder à part.

## 7. Conséquences sur le cycle de livraison

| | Web | Applications mobiles |
|---|---|---|
| Mise en ligne | immédiate (recette puis production, comme aujourd'hui) | build signé → test interne (TestFlight, Play test interne) → revue du store → publication |
| Délai | minutes | heures à jours (revue) |
| Retour arrière | republier la version précédente | publier une version corrigée ; on ne retire pas une version déjà installée |
| Base de données | — | **les anciennes versions installées restent en circulation des semaines** : toute migration doit rester compatible avec la version mobile la plus ancienne encore acceptée |

D'où trois règles nouvelles, reportées dans `10_STRATEGIE_DEPLOIEMENT.md` :

1. **Version minimale acceptée** : la base expose la version minimale de l'application ; en dessous, l'application affiche « mise à jour nécessaire » sans perdre la file d'envoi.
2. **Migrations non rétrocompatibles** (modèle 008) : seulement après qu'une version compatible a été publiée **et adoptée** sur les stores.
3. Les mises à jour de contenu web sans revue (« live updates ») sont une option à étudier plus tard, dans le respect des règles d'Apple ; elles ne sont pas prévues dans cette roadmap.

## 8. Itérations concernées

| Itération | Phase | Rôle |
|---|---|---|
| [IT-29](ITERATIONS/ITERATION_29.md) Domaine propre et hébergement commercial | 0 | quitter GitHub Pages pendant que la base d'utilisateurs est petite |
| [IT-30](ITERATIONS/ITERATION_30.md) Applications iOS et Android : socle | 2 | Capacitor, fonctions natives, liens dans l'app, builds de test |
| [IT-28](ITERATIONS/ITERATION_28.md) Publication sur les stores | 2 | fiches, confidentialité, suppression de compte, revue, publication gratuite |
| [IT-15](ITERATIONS/ITERATION_15.md) Tâches récurrentes, calendrier et notifications | 3 | notifications natives en plus du push web |
| [IT-27](ITERATIONS/ITERATION_27.md) Plans et abonnements | 9 | droits uniques, paiement web et achats intégrés |
| [IT-31](ITERATIONS/ITERATION_31.md) International | 9 | reprend la partie internationale de l'ancienne IT-28 |

Ordre : **gratuit sur les stores d'abord, payant ensuite.** Être présent sur les stores n'attend pas la monétisation ; la monétisation attend un produit stable (V-7 inchangée).

## 9. Décisions associées

| # | Décision | Recommandation | Avant |
|---|---|---|---|
| D-08 | Modèle économique (gratuit, freemium, payant) et calendrier | freemium, limites sur le volume (colonies, membres, photos), jamais sur la lecture | IT-27 |
| D-11 | Nom de domaine | un domaine en `.fr` ou `.app` au nom d'Apidoo, acheté au nom de la structure qui portera l'activité | IT-29 |
| D-12 | Hébergeur web | Cloudflare Workers (fichiers statiques) | IT-29 |
| D-13 | Structure juridique et comptes développeur (personnel ou organisation) | décider avant IT-28 : un compte organisation évite le test fermé Google et sera de toute façon nécessaire pour vendre (CGV, TVA, prestataire de paiement) | IT-28 |
| D-14 | Prestataire de paiement web et stratégie mobile (achats intégrés seuls, ou aussi lien vers le web dans l'UE) | achats intégrés sur mobile au lancement, prestataire « marchand officiel » sur le web ; lien externe réexaminé après un an de chiffres | IT-27 |
