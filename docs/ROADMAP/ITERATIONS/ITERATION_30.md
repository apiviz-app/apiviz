<!-- Ajoutée le 6 nov. 2026 (révision « application web et stores », voir 12_DISTRIBUTION_ET_MONETISATION.md). Maintenue à la main. -->

# IT-30 — Applications iOS et Android : socle

| | |
|---|---|
| Identifiant | IT-30 |
| Phase | Phase 2 — Expérience terrain |
| Taille | L |
| Hypothèse de taille | Capacitor autour du site existant, fichiers embarqués ; modules natifs pour les fonctions déjà présentes sur le web. Aucune réécriture d'écran. Builds distribués en test interne seulement. |
| Migration | `0xx` (version minimale de l'application) |

## 1. Objectif

Disposer d'applications iOS et Android construites depuis le même code que le site, qui fonctionnent hors ligne dès le premier lancement et utilisent les fonctions natives du téléphone.

## 2. Résultat utilisateur attendu

Apidoo installable par TestFlight et le test interne Google Play ; ouverture hors ligne ; photo, QR, position et dictée natives ; liens d'e-mail ouverts dans l'application.

## 3. Fonctionnalités concernées

| ID | Titre | Prio | Statut de départ |
|---|---|---|---|
| AP-FEAT-123 | Applications iOS et Android (Capacitor) | P1 | NON IMPLÉMENTÉ |
| AP-FEAT-124 | Liens de connexion et d'invitation ouverts dans l'application | P1 | NON IMPLÉMENTÉ |

## 4. User stories associées

- **AP-US-137** (AP-FEAT-123) — En tant qu'apiculteur, je veux ouvrir l'application au rucher sans réseau, même juste après l'avoir installée, afin de saisir ma visite.
- **AP-US-138** (AP-FEAT-123) — En tant qu'apiculteur, je veux prendre une photo et scanner un QR code avec les outils natifs de mon téléphone afin d'aller vite avec des gants.
- **AP-US-139** (AP-FEAT-124) — En tant qu'apiculteur invité, je veux que le lien reçu par e-mail ouvre l'application si elle est installée afin de rejoindre l'exploitation sans passer par le navigateur.

## 5. Tâches techniques

- AP-TECH-386 (AP-FEAT-123) — Projets Capacitor `ios/` et `android/` dans le dépôt ; le dossier web assemblé par `scripts/assembler-site.sh` est la seule source.
- AP-TECH-387 (AP-FEAT-123) — Détection de la plateforme (`web`, `ios`, `android`) dans le noyau ; aucune condition de plateforme dans les écrans.
- AP-TECH-388 (AP-FEAT-123) — Modules natifs : appareil photo, scanner de QR, géolocalisation, partage de fichiers (exports) ; repli web conservé.
- AP-TECH-389 (AP-FEAT-123) — Stockage local (IndexedDB) et file d'envoi vérifiés dans les vues web iOS et Android ; purge à la déconnexion inchangée.
- AP-TECH-390 (AP-FEAT-123) — Version minimale acceptée exposée par la base ; écran « mise à jour nécessaire » qui garde la file d'envoi.
- AP-TECH-391 (AP-FEAT-123) — Builds signés par GitHub Actions (macOS pour iOS) ; certificats et clés de signature dans les secrets uniquement.
- AP-TECH-392 (AP-FEAT-123) — Comptes Apple Developer et Google Play Console (D-13) ; distribution TestFlight et test interne.
- AP-TECH-393 (AP-FEAT-123) — Icônes, écran de lancement, barre d'état, zones sûres (encoche).
- AP-TECH-394 (AP-FEAT-124) — `/.well-known/apple-app-site-association` et `/.well-known/assetlinks.json` publiés sur le domaine (IT-29).
- AP-TECH-395 (AP-FEAT-124) — Supabase Auth : adresses de redirection de l'application ; traitement des liens de confirmation, de mot de passe et d'invitation à l'ouverture.
- AP-TECH-396 (AP-FEAT-124) — Repli : sans application installée, le lien ouvre le site.

## 6. Fichiers et modules potentiellement concernés

- `capacitor.config.*`, `ios/`, `android/`
- `scripts/assembler-site.sh`
- `src/noyau/plateforme.js`
- `photos.js`, `voix.js`, `tournee.js` (QR), carte
- `.github/workflows/` (builds mobiles)
- `migrations/0xx-version-minimale.sql`

## 7. Évolutions SQL nécessaires

Migration additive : réglage public « version minimale de l'application » lisible sans connexion.

## 8. Dépendances

- Itérations préalables : IT-03, IT-09, IT-11, IT-29.
- Décisions : D-13 (au moins pour ouvrir les comptes développeur).

## 9. Risques

- Différences de comportement des vues web (stockage, appareil photo, dictée) entre iOS et Android.
- Clés de signature perdues : impossible de publier une mise à jour Android avec une autre clé.
- Le dépôt est public : aucun fichier de signature ni mot de passe ne doit y entrer.

## 10. Plan de tests

- 18 tests e2e inchangés sur le web.
- Recette manuelle sur un iPhone et un Android réels : premier lancement en mode avion, visite complète hors ligne, retour réseau, photo, QR, dictée, lien d'invitation.
- Vérification qu'une version inférieure à la version minimale affiche l'écran de mise à jour sans perdre la file.
- AP-FEAT-123 : Manuel sur vrais téléphones.
- AP-FEAT-124 : Manuel (e-mail réel).

## 11. Critères d'acceptation

Les critères GIVEN/WHEN/THEN des user stories listées au §4, tels qu'écrits dans `06_BACKLOG_MASTER.md` (source de vérité), plus :
- Builds disponibles en TestFlight et en test interne Google Play.

## 12. Définition de terminé

- [ ] Le parcours utilisateur fonctionne sur téléphone et ordinateur.
- [ ] Les règles métier des user stories sont respectées.
- [ ] Les données sont correctement enregistrées (vérifiées en base de recette).
- [ ] Les permissions sont contrôlées (tests SQL si la base change).
- [ ] Les erreurs sont gérées et affichées en français.
- [ ] Les 18 tests de bout en bout et les nouveaux tests passent.
- [ ] Les régressions sont vérifiées (liste « À vérifier » du CHANGELOG).
- [ ] CHANGELOG, migrations/README.md et le backlog (statuts) sont à jour.
- [ ] Les limites connues sont documentées.

## 13. Livrables

- Code sur une branche `claude/…` et pull request vers `main`.
- Migration additive (version minimale), d'abord sur `apidoo-test`.
- Entrée du CHANGELOG avec rubrique « À vérifier ».
- Statuts mis à jour dans le backlog master.
- Builds de test iOS et Android.

## 14. Conditions de validation

- Vérifier vert sur la PR.
- Rubrique « À vérifier » parcourue sur un iPhone et un Android réels par le responsable.
- Accord explicite du responsable avant fusion et avant production (CLAUDE.md).
- Jalon J7 : Capacitor suffit-il ?

## 15. Conditions de retour arrière

Le site web n'est pas touché par les projets mobiles : supprimer les builds de test suffit. La migration est additive.

## 16. Éléments à préserver

- Un seul code pour le web et les applications
- Publication web inchangée
- Aucune saisie perdue

## 17. Hors périmètre

- Publication publique sur les stores (IT-28)
- Notifications natives (IT-15)
- Achats intégrés (IT-27)

## 18. Itération suivante

[IT-28](ITERATION_28.md) — Publication sur les stores.
