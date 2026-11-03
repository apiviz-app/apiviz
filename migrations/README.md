# Migrations de la base Apidoo

`schema.sql` (à la racine) crée la base de départ. Les fichiers de ce dossier
s'appliquent ensuite, dans l'ordre, dans Supabase > SQL Editor.

| Fichier | Contenu | Appliquée |
|---|---|---|
| 004-photos-visites.sql | Table `visite_photos`, espace « photos-visites », `photos_espace()` | 3 nov. 2026 |
| 005-securite-et-ping.sql | `est_membre()` réservée aux connectés, fonction `ping()` | 3 nov. 2026 |

Les migrations 001 à 003 ne sont pas dans ce dépôt : elles font partie de `schema.sql`
ou ont été appliquées directement dans Supabase.
