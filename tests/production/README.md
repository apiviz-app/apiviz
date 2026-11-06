# Essai en production : déplacement, intervention, facture (IT-02, AP-US-005)

La production n'a encore aucune vente : pour vérifier les trois fonctions de la migration 010 sans toucher aux vraies
données, on ajoute des données d'essai, on fait les parcours dans l'app, puis on retire tout.

**Accord de Pierre-Louis requis** : ces scripts écrivent dans la base `apidoo`. Les deux sont testés sur une base en
mémoire par `tests/sql/test_donnees_essai.mjs` (lancé par `tests/lancer.sh`), avec et sans 012.

## Ce qui est ajouté

Tout porte « ESSAI IT-02 » dans le nom et un identifiant commençant par `e55a1002-` :

- 3 ruches : « ESSAI IT-02 ruche 1 » et « ruche 2 » au rucher « ESSAI IT-02 départ », « ruche 3 » au rucher « ESSAI IT-02 arrivée » ;
- 1 client « ESSAI IT-02 client » avec adresse (012 est appliquée en production depuis le 6 nov. 2026) ;
- 1 lot « ESSAI-IT02 » de 5 pots de 500 g à 1 €, et 1 vente d'un pot à ce client, payée, sans facture.

Le script s'arrête sans rien écrire si la base compte plus d'une exploitation.

## Déroulé

1. Supabase › `apidoo` › SQL Editor : coller `donnees-essai.sql`, « Run ». Le tableau final liste les 3 ruches et la
   vente « pas encore de facture ». Le message indique le numéro que prendra la facture d'essai.
2. Sur https://apidoo.github.io/ (production), se connecter, puis :
   - **Déplacer des ruches** (Ruchers › Santé › Registre d’élevage, onglet Mouvements) : choisir « ESSAI IT-02 ruche 1 », vers
     « ESSAI IT-02 arrivée ». Attendu : « Déplacement noté au registre », la ruche change de rucher, la ligne apparaît
     dans Mouvements.
   - **Noter une intervention** (même registre, onglet Interventions) : ruche « ESSAI IT-02 ruche 2 », détail « Essai ».
     Attendu : « Intervention notée », la ligne apparaît.
   - **Créer la facture** : Miel, toucher la vente du client « ESSAI IT-02 client », puis « Créer la facture ». Attendu : un
     numéro `F-2026-000N` qui ne change pas quand on rouvre la facture ; Imprimer ou PDF fonctionne.
   - Ne pas ajouter de photo ni de visite aux ruches d'essai, et ne choisir que des ruches d'essai.
3. Relancer `donnees-essai.sql` (il n'ajoute rien de plus) : le tableau final montre maintenant le déplacement,
   l'intervention et le numéro de facture.
4. **Nettoyage** : coller `nettoyage-essai.sql`, « Run ». Le tableau final doit afficher 0 partout.
5. Recharger l'app : plus rien d'« ESSAI IT-02 ».

## Numéro de facture

Le numéro est donné une seule fois, à la suite des factures de l'année (`numeroter_facture`, migration 010). Le
nettoyage supprime la vente d'essai : son numéro redevient libre **tant qu'aucune vraie facture n'a été créée
entre-temps**. Faire l'essai et le nettoyage d'une traite. Si une vraie facture a été créée entre les deux, le
nettoyage l'affiche en avertissement : il y aura un trou dans la numérotation, à noter.
