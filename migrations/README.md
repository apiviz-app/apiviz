# Migrations de la base Apidoo

`schema.sql` (à la racine) crée la base de départ. Les fichiers de ce dossier
s'appliquent ensuite, dans l'ordre, dans Supabase > SQL Editor.

| Fichier | Contenu | Appliquée |
|---|---|---|
| 004-photos-visites.sql | Table `visite_photos`, espace « photos-visites », `photos_espace()` | 3 nov. 2026 |
| 005-securite-et-ping.sql | `est_membre()` réservée aux connectés, fonction `ping()` | 3 nov. 2026 |
| 006-hors-ligne.sql | `creer_visite` et `creer_vente` acceptent un identifiant fourni par le téléphone (pas de doublon au renvoi) | 3 nov. 2026 |
| 007-registre.sql | Visites : dose, fin de traitement prévue, ordonnance gardée | 3 nov. 2026 |
| 009-colonie-varroa-recolte-livraison.sql | Reine, hausses, équipement, événements de ruche, méthode varroa, récolte et traçabilité, note de livraison | 3 nov. 2026 |
| 008-exploitations.sql | Plusieurs exploitations : membres avec rôles, invitations, données séparées par exploitation | Recette (apidoo-test) le 3 nov. 2026 · production : après validation |

Les migrations 001 à 003 ne sont pas dans ce dépôt : elles font partie de `schema.sql`
ou ont été appliquées directement dans Supabase.

`000-structure-au-3-nov-2026.sql` recrée une base vide identique à la base réelle au 3 novembre 2026 (après 007),
pour un projet de test. Ne pas la lancer sur la base réelle.
