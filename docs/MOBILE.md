# Web et mobile : architecture

Révisé le 6 novembre 2026. La proposition du 4 novembre (« rester sur le web, stores facultatifs, Google Play en TWA ») est remplacée : **Apidoo devient une application publiée sur le web et sur les stores, à partir d'un seul code.** Le détail, les règles des stores, les paiements et les sources sont dans [`docs/ROADMAP/12_DISTRIBUTION_ET_MONETISATION.md`](ROADMAP/12_DISTRIBUTION_ET_MONETISATION.md).

## Aujourd'hui

| Brique | Rôle | Service |
|---|---|---|
| Application | Site installable (PWA), hors ligne compris | GitHub Pages |
| Données, comptes, photos | Postgres, Auth, Storage | Supabase, offre gratuite |
| Mise en ligne, tests, réveil des bases | Actions manuelles et planifiées | GitHub Actions |

## Cible

| Brique | Cible | Itération |
|---|---|---|
| Site web | domaine propre, hébergeur autorisant un usage commercial (Cloudflare recommandé) | IT-29 |
| iPhone / iPad | application App Store, construite avec Capacitor à partir du site | IT-30, IT-28 |
| Android | application Google Play, construite avec Capacitor à partir du site | IT-30, IT-28 |
| Données | Supabase ; production en offre Pro avant l'ouverture large | J1 |
| Paiement | web et achats intégrés, une seule table de droits | IT-27 |

GitHub reste l'outil du code, des pull requests et des Actions ; seule la publication du site quitte GitHub Pages, dont les conditions excluent un logiciel commercial vendu en tant que service.

## Pourquoi Capacitor, et pas Expo comme Gladoo

Gladoo est écrit en Expo depuis le début. Apidoo est du JavaScript sans framework : passer à Expo voudrait dire réécrire tous les écrans. Capacitor embarque le site existant dans une vraie application iOS et Android et donne accès aux fonctions du téléphone (photo, QR, position, notifications, achats intégrés). Un seul code continue de servir le web et les deux stores. Si Capacitor ne tient pas sur vrais téléphones, une réécriture sera réexaminée au jalon J7 (après IT-30).

La Trusted Web Activity (Chrome en plein écran sur Android) prévue dans la version précédente de ce document est abandonnée : elle ne couvrait qu'Android.

## Stores : coûts et obstacles

| | Google Play | App Store |
|---|---|---|
| Coût | 25 $ une fois | 99 $ par an |
| Technique | Capacitor | Capacitor |
| Mises à jour | revue de Google à chaque version | revue d'Apple à chaque version |
| Principal obstacle | compte personnel récent : test fermé avec 12 testeurs pendant 14 jours (dispense pour un compte organisation) | règle 4.2 d'Apple : une application qui ressemble à un site peut être refusée ; d'où les fichiers embarqués, le hors ligne et les fonctions natives |
| Machine | rien de plus | macOS : poste ou machine GitHub Actions |
| Obligations | politique de confidentialité, section « Sécurité des données » | politique de confidentialité, étiquettes de confidentialité, suppression du compte dans l'application |

## Limites de la version gratuite (inchangé)

- **Supabase :** 2 projets actifs par organisation, 500 Mo de base, 1 Go de fichiers, 5 Go de trafic par mois. Les photos sont le premier poste à surveiller.
- **Mise en pause :** un projet inactif une semaine se met en pause. L'action « Réveil Supabase » l'évite chaque jour. L'offre Pro ne se met pas en pause.
- **Sauvegardes :** l'offre gratuite n'a pas de sauvegarde automatique, et celles de la base n'incluent pas les photos. Le dépôt étant public, une sauvegarde ne doit jamais y être stockée en clair, artefacts d'Actions compris.
- **Notifications :** pas de notification envoyée par un serveur pour l'instant. Elles arrivent avec IT-15 : push web sur le site, notifications natives dans les applications.

## Sources

- [Limites de GitHub Pages (usage commercial)](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Règles de revue de l'App Store](https://developer.apple.com/app-store/review/guidelines/)
- [Inscription à Google Play](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- [Test fermé de Google Play](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB)
- [Programme développeur Apple](https://developer.apple.com/programs/whats-included/)
- [Tarifs Supabase](https://supabase.com/pricing)
- [Sauvegardes Supabase](https://supabase.com/docs/guides/platform/backups)
