# Migrations de la base Apidoo

## Recréer une base

Point d'entrée unique : `000-structure-au-3-nov-2026.sql`, puis les migrations **dans cet ordre** :

```
000 → 004 → 005 → 006 → 007 → 009 → 008 → 010 → 011
```

- **009 avant 008** : c'est l'ordre réel des deux bases, et il est obligatoire. 008 ajoute `exploitation_id` à
  `ruche_evenements`, table créée par 009 ; appliquée avant, 008 échoue (« relation public.ruche_evenements does not exist »).
- 000 recrée la base telle qu'elle était au 3 novembre 2026 après 007 ; 004 à 007 sont relançables et n'y changent rien.
- Les migrations 001 à 003 n'existent pas dans ce dépôt : elles sont comprises dans 000.
- `schema.sql` (racine) n'est plus à utiliser : il décrit la toute première version et renvoie ici.
- Ne jamais lancer 000 sur une base qui contient des données.

Contrôle sans toucher aucune base : `node scripts/rejouer-migrations.mjs migrations/releves/structure-2026-11-06.json`
(prérequis : `npm i @electric-sql/pglite@0.2` hors du dépôt). Le script rejoue 000 puis les migrations dans l'ordre
ci-dessus sur une base Postgres vide en mémoire et compare la structure obtenue au relevé. Résultat du 6 nov. 2026 :
**aucun écart** (tables, colonnes, vue, fonctions, politiques, espace de stockage).

## État des migrations

| Fichier | Contenu | `apidoo-test` (recette) | `apidoo` (production) |
|---|---|---|---|
| 000-structure-au-3-nov-2026.sql | Base de départ (état après 007) | 3 nov. 2026 | — (base créée avant ce fichier) |
| 004-photos-visites.sql | Table `visite_photos`, espace « photos-visites », `photos_espace()` | 3 nov. 2026 (regroupée « 004_a_007 ») | 3 nov. 2026 |
| 005-securite-et-ping.sql | `est_membre()` réservée aux connectés, fonction `ping()` | 3 nov. 2026 (regroupée) | 3 nov. 2026 (en deux temps : 005 puis `ping`) |
| 006-hors-ligne.sql | `creer_visite` et `creer_vente` acceptent un identifiant fourni par le téléphone | 3 nov. 2026 (regroupée) | 3 nov. 2026 |
| 007-registre.sql | Visites : dose, fin de traitement prévue, ordonnance gardée | 3 nov. 2026 (regroupée) | 3 nov. 2026 |
| 009-colonie-varroa-recolte-livraison.sql | Reine, hausses, équipement, événements de ruche, méthode varroa, récolte et traçabilité, note de livraison | 3 nov. 2026, partie 6 relancée le 6 nov. 2026 (écart E1 corrigé) | 3 nov. 2026 |
| 008-exploitations.sql | Plusieurs exploitations : membres avec rôles, invitations, données séparées par exploitation | 3 nov. 2026 | présente, **date inconnue** (appliquée hors historique, écart E2) |
| 010-registre-factures.sql | Déplacements et interventions au registre, numéro de facture | 5 nov. 2026 | 5 nov. 2026 |
| 011-invitation-avant-connexion.sql | Le nom de l'exploitation s'affiche sur le lien d'invitation avant la connexion | 5 nov. 2026 | 5 nov. 2026 |

Aucune migration en attente : `a-appliquer-en-production.txt` est vide.

## Relevé des deux bases — 6 novembre 2026

Fait en lecture seule (requêtes `select` sur les catalogues et `count(*)`), sur `apidoo` (`xkucyqzlqfeyuomrtjbu`)
et `apidoo-test` (`zaaaiqyhxehvgowlgztx`). Structure détaillée : `releves/structure-2026-11-06.json`.

### Structure

Empreintes calculées catégorie par catégorie sur les deux bases :

| Catégorie | Nombre | Identique sur les deux bases |
|---|---|---|
| Colonnes (`public`) | 186 | oui |
| Contraintes | 82 | oui |
| Index | 55 | oui |
| Déclencheurs | 5 | oui |
| Vue (`lots_stock`, `security_invoker`) | 1 | oui |
| Politiques RLS (`public` et `storage`) | 27 | oui |
| Tables avec RLS activée | 20 sur 20 | oui |
| Droits accordés à `anon` et `authenticated` | 40 | oui |
| Espace de stockage (`photos-visites`, privé, 2 Mo, jpeg/webp) | 1 | oui |
| Fonctions | 16 | **non** : 10 ne diffèrent que par les fins de ligne Windows (texte collé dans l'éditeur SQL), **2 diffèrent vraiment** (écart E1) |

Les 16 fonctions ont toutes `search_path` fixé à vide. En `security definer` : `est_membre`, `est_responsable`,
`mes_exploitations`, `creer_exploitation`, `rejoindre`, `invitation_info`, `peut_photo`, `photos_espace`.
En `security invoker` : `creer_visite`, `creer_vente`, `numeroter_facture`, `exploitation_courante`, `mon_email`,
`ping`, `maj_stock_intrant`, `maj_stock_achat`.

### Politiques RLS (identiques sur les deux bases)

Toutes s'appliquent au rôle `authenticated` ; `anon` n'a aucune politique, donc aucun accès aux lignes.

| Table | Politique | Opération | Règle |
|---|---|---|---|
| `articles`, `budgets`, `clients`, `depenses`, `fournisseurs`, `lots`, `recoltes`, `reglages`, `ruche_evenements`, `ruches`, `taches`, `vente_lignes`, `ventes`, `visite_intrants`, `visite_photos`, `visites` | `exploitation_courante` | toutes | `exploitation_id = (select exploitation_courante())`, en lecture comme en écriture |
| `exploitations` | `voir` | lecture | `est_membre(id)` |
| `exploitations` | `renommer` | modification | `est_responsable(id)` |
| `invitations` | `responsables` | toutes | `est_responsable(exploitation_id)` |
| `membres` | `voir` | lecture | `est_membre(exploitation_id)` |
| `membres` | `ajouter` | ajout | responsable de l'exploitation, et rôle `membre` seulement |
| `membres` | `changer` | modification | responsable, et pas sa propre ligne |
| `membres` | `retirer` | suppression | responsable (pas sa propre ligne), ou un membre qui se retire lui-même |
| `membres_v1` | aucune | — | RLS activée sans politique : plus aucun accès (ancienne liste gardée pour mémoire par 008) |
| `storage.objects` | `photos_visites_lire`, `_ajouter`, `_modifier`, `_supprimer` | chacune la sienne | espace `photos-visites` et `peut_photo(name)` (le dossier de la photo appartient à l'exploitation courante) |

### Plafond de lignes et inscriptions

Relevés par Pierre-Louis dans le tableau de bord Supabase le 6 nov. 2026 (non lisibles en SQL) :

| Réglage | `apidoo` | `apidoo-test` |
|---|---|---|
| Settings › API › Max rows | **1 000** | **1 000** |
| Authentication › « Allow new users to sign up » | **activé** | **activé** |

Conséquence du plafond : une requête de `loadAll()` ne renvoie jamais plus de 1 000 lignes, sans erreur.
La plus grosse table compte aujourd'hui 8 lignes : aucun risque immédiat, voir AP-BUG-002 (IT-01).

### Volumétrie (nombre exact de lignes)

| Table | `apidoo` | `apidoo-test` |
|---|---|---|
| `exploitations` | 1 | 2 |
| `membres` | 2 | 6 |
| `membres_v1` | 2 | 5 |
| `invitations` | 0 | 0 |
| `ruches` | 6 | 8 |
| `ruche_evenements` | 0 | 0 |
| `visites` | 0 | 2 |
| `visite_intrants` | 0 | 1 |
| `visite_photos` | 0 | 0 |
| `recoltes` | 7 | 1 |
| `lots` | 2 | 1 |
| `clients` | 1 | 2 |
| `ventes` | 0 | 2 |
| `vente_lignes` | 0 | 2 |
| `depenses` | 1 | 1 |
| `fournisseurs` | 0 | 1 |
| `articles` | 2 | 1 |
| `taches` | 0 | 1 |
| `budgets` | 0 | 1 |
| `reglages` | 1 | 2 |
| Espace photos : fichiers / octets | 0 / 0 | 0 / 0 |
| Comptes (`auth.users`) | 3 | 1 |

### Écarts constatés

- **E1 — Recette : `creer_visite` et `creer_vente` en retard sur 009.** Sur `apidoo-test`, la 009 enregistrée dans
  l'historique ne contient pas la nouvelle version de ces deux fonctions (section 6 du fichier). Les colonnes
  existent, mais la recette n'enregistre pas `varroa_methode` ni `varroa_abeilles` à la création d'une visite, ni
  `livraison` à la création d'une vente : ces valeurs envoyées par l'application sont ignorées sans message.
  La production et les fichiers ont la bonne version. Correction proposée (hors périmètre d'IT-00) :
  relancer `009-colonie-varroa-recolte-livraison.sql` sur `apidoo-test` (relançable, n'ajoute rien d'autre). Suivi : AP-BUG-008.
  **Corrigé le 6 nov. 2026** (accord du responsable) en relançant **la partie 6 seulement** (entrée d'historique
  `009_relance_fonctions_ap_bug_008`) ; empreintes de `creer_visite` et `creer_vente` identiques à la production.
  Attention : « relançable » n'est vrai que sur une base sans 008. Après 008, relancer 009 en entier remettrait la vue
  `lots_stock` en version 009 et recréerait des politiques `membres_tout` (avec `est_membre()`, supprimée par 008) ;
  un essai a échoué sur ce point et a été entièrement annulé.
- **E2 — Production : 008 absente de l'historique des migrations.** La structure de 008 est bien en place, mais elle a
  été appliquée par l'éditeur SQL : sa date n'est pas connue. Aucune action nécessaire ; à savoir avant tout outil
  qui se fierait à l'historique de Supabase.
- **E3 — Fins de ligne.** 10 fonctions de la production ont des fins de ligne Windows. Sans effet sur le comportement.
- **E4 — Historiques différents.** La recette regroupe 004 à 007 en une seule entrée ; la production sépare 006 en deux
  (`006_ping`, `006_hors_ligne`). Sans effet : seule la structure compte, et elle est identique.
- **E5 — Recette : `creer_visite` et `creer_vente` exécutables par tous (`PUBLIC`).** Constaté le 6 nov. 2026, antérieur
  à la correction de E1 (droits conservés par `create or replace`). La production ne donne ce droit qu'à `authenticated`
  et `service_role`. Sans effet pratique (security invoker, aucune politique pour `anon`). Correction possible :
  `revoke execute on function public.creer_visite(jsonb), public.creer_vente(jsonb) from public;` sur `apidoo-test`
  (accord requis). `maj_stock_achat`, `maj_stock_intrant` et `numeroter_facture` sont exécutables par tous sur les deux bases.

### Points de vigilance (hors périmètre, à décider)

- Inscriptions ouvertes sur les deux projets : la production compte 3 comptes pour 2 membres. Un inconnu peut créer un
  compte et sa propre exploitation (`creer_exploitation`), sans voir les données des autres (RLS).
- Le rôle `anon` garde sur toutes les tables les droits accordés par défaut par Supabase (y compris `TRUNCATE`, que la RLS
  ne couvre pas). L'API REST ne propose pas `TRUNCATE` ; un retrait de ces droits serait plus sûr (AP-EPIC-004).
- `membres_v1` peut être supprimée une fois la bascule vers 008 confirmée sans retour arrière.
