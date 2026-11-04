# Web et mobile : architecture

Proposition du 4 novembre 2026 : Apidoo reste un seul code, publié sur le web et installé depuis le site. Pas de réécriture.

## Aujourd'hui, 0 €

| Brique | Rôle | Service |
|---|---|---|
| Application | Site installable (PWA), hors ligne compris | GitHub Pages |
| Données, comptes, photos | Postgres, Auth, Storage | Supabase, offre gratuite |
| Mise en ligne, tests, réveil des bases | Actions manuelles et planifiées | GitHub Actions |

Une version publiée arrive sur le web et sur les téléphones en même temps, sans passer par une revue de store.

## Pourquoi pas Expo, comme Gladoo

Gladoo est écrit en Expo depuis le début. Apidoo est du JavaScript sans framework : y passer voudrait dire réécrire tous les écrans, sans gain pour l'utilisateur à ce stade. La méthode de Gladoo (un dépôt, recette, pull requests, mise en ligne en deux clics) reste appliquée.

## Si Apidoo passe sur les stores

Chaque étape est facultative et n'impose pas de réécriture.

| | Google Play | App Store |
|---|---|---|
| Coût | 25 $ une fois | 99 $ par an |
| Technique | Trusted Web Activity : Chrome affiche le site en plein écran | Capacitor : le site dans une coquille iOS |
| Mises à jour | Automatiques avec le site | Automatiques tant que l'app charge le site, revue d'Apple sinon |
| Fonctions | Celles de Chrome, à retester sur l'app | Dictée, GPS et photos à retester, modules natifs possibles |
| Principal obstacle | Compte personnel récent : test fermé avec 12 testeurs pendant 14 jours | Règle 4.2 d'Apple : une app qui ressemble à un site peut être refusée |
| Machine | Rien de plus | macOS, poste ou machine GitHub |

Ordre conseillé : Google Play d'abord, moins cher et moins risqué. App Store quand des utilisateurs le réclament.

Pour Google Play, `scripts/assembler-site.sh` devra publier `/.well-known/assetlinks.json`, ce que permet l'adresse `apidoo.github.io` puisqu'elle est à la racine du domaine.

## Limites de la version gratuite

- **Supabase :** 2 projets actifs par organisation, 500 Mo de base, 1 Go de fichiers, 5 Go de trafic par mois. Les photos sont le premier poste à surveiller.
- **Mise en pause :** un projet inactif une semaine se met en pause. L'action « Réveil Supabase » l'évite chaque jour.
- **Sauvegardes :** l'offre gratuite n'a pas de sauvegarde automatique, et celles de la base n'incluent pas les photos. Le dépôt étant public, une sauvegarde ne doit jamais y être stockée en clair, artefacts d'Actions compris.
- **Notifications :** pas de notification envoyée par un serveur pour l'instant. Sur iPhone, elles exigeront l'application installée.

## Sources

- [Inscription à Google Play](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- [Test fermé de Google Play](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB)
- [Programme développeur Apple](https://developer.apple.com/programs/whats-included/)
- [Sauvegardes Supabase](https://supabase.com/docs/guides/platform/backups)
