# 00 — Vision produit

## 1. En une phrase

**Apidoo est le carnet de bord et le tableau de pilotage de l'apiculteur : on note au rucher en moins de deux minutes, même sans réseau, et l'application en déduit ce qu'il faut faire, ce que l'on a produit et ce que cela rapporte.**

Apidoo est **une seule application**, disponible sur le web et sur les stores (iPhone, Android), gratuite pour démarrer et **payante pour aller plus loin** (révision du 6 nov. 2026, voir `12_DISTRIBUTION_ET_MONETISATION.md`).

## 2. Constat de départ

Apidoo est né pour une exploitation familiale réelle (6 ruches au départ, « Bee's Brothers ») et s'est enrichi très vite : en 5 jours de versions, il couvre déjà le terrain, le miel, la gestion et le registre. Le passage au multi-exploitation (migration 008) ouvre la voie à d'autres apiculteurs. La vision ci-dessous assume ce changement : **passer d'un outil personnel très bien fait à un produit que d'autres peuvent adopter seuls.**

## 3. Profils visés et ordre de conquête

| Ordre | Profil | Colonies | Besoin dominant | Ce qu'Apidoo doit lui montrer d'abord |
|---|---|---|---|---|
| 1 | Amateur | 1 à 10 | Ne rien oublier, comprendre ses colonies, respecter la déclaration | Accueil « quoi faire », visite guidée, rappel de déclaration |
| 2 | Passionné | 10 à 50 | Suivi par colonie, varroa, reines, vente aux proches | Fiches colonie, santé, miel et ventes |
| 3 | Pluriactif | 50 à 150 | Gagner du temps, traçabilité, rentabilité | Tournées, opérations groupées, lots, coûts |
| 4 | Professionnel | 150 et plus | Registre conforme, élevage, transhumance, équipe | Registre, élevage, emplacements, rôles |
| 5 | Exploitation structurée | variable | Plusieurs personnes, droits, pilotage | Rôles, journal, tableaux comparés |

**Arbitrage :** les profils 1 à 3 sont la cible des 12 prochains mois. Les profils 4 et 5 guident le **modèle de données** dès maintenant (pour ne pas devoir le refaire), mais leurs écrans avancés viennent ensuite. Un amateur ne doit jamais voir la complexité d'un professionnel : elle se dévoile par **niveaux d'usage** (voir §6).

## 4. Proposition de valeur

Apidoo répond aux questions de l'apiculteur, du terrain au bureau :

| Question | Réponse attendue dans Apidoo | Disponible aujourd'hui |
|---|---|---|
| Où sont mes ruches ? | Carte des ruchers, emplacement actuel de chaque colonie et historique | Partiel (position par ruche) |
| Quel est l'état de mes colonies ? Lesquelles demandent une intervention ? | Accueil « priorité du jour », lentilles état/provisions/varroa | Oui |
| Quelles sont les prochaines actions ? | Tâches, rappels, conseils du mois, créneau météo | Oui, rappels limités |
| Quand ai-je traité, avec quoi ? Mes comptages varroa ? | Historique sanitaire par colonie et par exploitation, registre | Partiel |
| Quelles colonies viennent de quelles souches ? Quelles reines sont performantes ? | Généalogie, fiche reine, statistiques par lignée | Non |
| Combien de miel, par rucher, par miellée ? | Récoltes, extraction, lots, rendements | Partiel |
| Quels coûts, quelle rentabilité ? | Dépenses, coût par kg, par rucher, marge | Partiel |
| Quels stocks me restent ? | Consommables, matériel, pots, seuils | Partiel |
| Qu'ai-je vendu, à qui, qu'est-ce qui reste dû ? | Ventes, encaissements, livraisons, factures | Oui |
| Quelles obligations ? | Déclaration annuelle, registre, échéances | Partiel |

## 5. Principes produit (règles de décision)

1. **Le terrain d'abord.** Toute fonction utilisée au rucher marche d'une main, avec des gants, au soleil, sans réseau.
2. **Ne jamais redemander ce qu'on sait.** Une visite part de la précédente ; on ne saisit que ce qui change.
3. **Rien n'est perdu.** Aucune saisie ne disparaît sans que l'utilisateur l'ait décidé (hors ligne compris).
4. **L'historique est sacré.** On ne modifie pas le passé biologique : on ajoute un événement.
5. **Des faits, puis des conseils sourcés.** Apidoo distingue toujours la donnée, l'hypothèse et la recommandation. Aucun seuil sanitaire ni obligation sans source datée.
6. **Progressivité.** Les fonctions avancées (élevage, transhumance, équipe) restent masquées tant qu'on n'en a pas besoin.
7. **Un écran, une implémentation.** Pas de nouvelle couche sur l'ancienne : on remplace et on supprime.
8. **Sobre à faire tourner.** Toute dépense d'infrastructure est justifiée par un besoin utilisateur ou par une obligation (conditions d'hébergement, stores, sauvegardes).
9. **Données à l'utilisateur.** Export complet à tout moment, suppression réelle.

## 6. Niveaux d'usage

| Niveau | Activé par | Ce qui apparaît |
|---|---|---|
| Essentiel (défaut) | inscription | Ruchers, ruches, visites, tâches, récoltes simples, ventes simples, déclaration |
| Suivi | réglage ou ≥ 10 colonies | Varroa et traitements détaillés, lots, dépenses, matériel |
| Professionnel | réglage | Contenants distincts des colonies, emplacements et transhumance, registre complet, factures, élevage, rôles |

Le niveau ne change **pas** le modèle de données, seulement ce que l'interface montre.

## 7. Positionnement

- **Face aux carnets papier et tableurs :** saisie plus rapide, rappels, calculs automatiques, registre prêt.
- **Face aux applications apicoles existantes :** la qualité du parcours terrain (tournée guidée, voix, hors ligne) et la continuité terrain → miel → ventes → rentabilité dans un seul outil. À confirmer par une veille concurrentielle (non réalisée dans cet audit).
- **Ce qu'Apidoo n'est pas :** un logiciel de comptabilité certifié, un outil de facturation électronique agréé, un vétérinaire.

## 8. Indicateurs de réussite produit

| Indicateur | Cible à 12 mois | Mesure |
|---|---|---|
| Temps médian d'une visite courante | < 2 min | horodatage début/fin de saisie |
| Saisies perdues | 0 | file hors ligne et quarantaine |
| Utilisateurs actifs pendant la saison (avril–sept.) | à fixer | connexions hebdomadaires |
| Part des colonies visitées < 30 jours en saison | > 80 % | données |
| Nouveaux comptes autonomes (sans aide) jusqu'à la 1re visite | > 60 % | parcours de prise en main |

## 9. Décisions structurantes prises dans cette roadmap

| # | Décision | Justification |
|---|---|---|
| V-1 | Conserver JS sans framework, PWA, Supabase. ~~GitHub Pages~~ : remplacé par un domaine propre (V-8) | Fonctionne, l'équipe le maîtrise ; aucun besoin utilisateur n'exige un framework. Révisée le 6 nov. 2026 : GitHub Pages exclut un usage commercial |
| V-2 | Remplacer les surcharges par un noyau d'écrans enregistrés, module par module | Arrêter l'accumulation sans réécriture |
| V-3 | La table `ruches` devient la **colonie** ; ajout de `ruchers`, `contenants`, `reines` | Garde tous les liens existants (visites, récoltes, photos) |
| V-4 | Traitements, comptages varroa et nourrissements deviennent des **opérations** distinctes de la visite | Une opération concerne souvent plusieurs colonies ; registre fiable |
| V-5 | Pas de facturation électronique agréée en propre ; export et partenaire le moment venu | Obligation d'émission PME au 1er sept. 2027, coût d'agrément disproportionné |
| V-6 | Assistant IA en lecture seule d'abord, actions seulement avec validation | Sécurité et confiance |
| V-7 | Monétisation après stabilisation du produit (phase 9) | Pas de valeur à facturer avant le socle |
| V-8 | **Un seul code, trois vitrines** : web sur domaine propre, applications iOS et Android (Capacitor) publiées sur les stores | Être une vraie application sans maintenir deux codes ; décidé le 6 nov. 2026 (12 §3) |
| V-9 | **Distribution tôt, paiement tard** : domaine en phase 0, stores gratuits en phase 2, abonnement (web et achats intégrés) en phase 9 | Chaque nouvel utilisateur rend la bascule de domaine plus coûteuse ; la présence en store n'attend pas la monétisation (12 §8) |
