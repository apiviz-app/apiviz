# Bêta fermée d'Apiviz : le kit complet

Préparé le 28 nov. 2026 pour la liste D de `LANCEMENT.md` (janvier – février 2027, 20 à 30 apiculteurs, un point par
semaine, corrections seulement). Tout ce qui est entre `[crochets]` est à choisir par Pierre-Louis et Johan.

## 1. Ce que la bêta doit prouver

Une seule question : **un apiculteur qui ne nous connaît pas arrive-t-il seul à s'en servir, et revient-il ?**

| Indicateur | Où le lire | Seuil pour ouvrir en mars |
|---|---|---|
| Inscription finie (exploitation créée, au moins un rucher) | « Mes utilisateurs » | 80 % des inscrits |
| Première saisie utile (visite, traitement, stock ou vente) dans les 7 jours | « Mes utilisateurs » | 70 % |
| Revenu à J+7 | « Mes utilisateurs » (jours d'utilisation) | 60 % |
| Revenu à J+30 | « Mes utilisateurs » | 40 % |
| Erreurs nouvelles du journal | Résumé de l'action « Santé » | 0 bloquante ouverte depuis 2 semaines |
| Note « Recommanderais-tu Apiviz ? » (0 à 10) au sondage de fin | Formulaire | moyenne ≥ 7 |

Sous un seuil : on ne repousse pas l'ouverture d'office, on regarde **pourquoi** au point de la semaine et on corrige
ce qui bloque (gel : pas de fonction nouvelle).

## 2. L'hiver change tout

Janvier et février, on ouvre peu les ruches. Une bêta qui ne demande que des visites ne montrera rien. Les missions
(§ 6) visent ce qu'on fait vraiment l'hiver :

- **Faire l'inventaire** : ruchers, colonies hivernées, matériel en stock, pots et cire restants ;
- **Traitement d'hiver** (acide oxalique par temps froid, hors couvain) : le noter, avec le produit et la date ;
- **Registre d'élevage et déclaration** : vérifier que le registre se remplit, préparer la déclaration de la saison
  suivante (la déclaration annuelle de détention se fait entre le 1er septembre et le 31 décembre : la bêta tombe après,
  on ne la teste qu'à blanc) ;
- **Ventes d'hiver** : fins de stock de Noël, commandes de cire, page de commande publique ;
- **Préparer la saison** : budget, achats de matériel (qui a payé, trésorerie ou fonds propres), tâches de mars ;
- **Visites de contrôle** rapides (pesée, trou de vol) : une ou deux par testeur suffisent pour tester la saisie
  vocale et hors ligne.

## 3. Qui recruter (25 en visant 30, pour en garder 20 actifs)

| Profil | Nombre | Pourquoi |
|---|---|---|
| Débutants (1 à 3 ans, 1 à 5 ruches) | 8 | Le plus grand nombre de futurs inscrits ; testent les premiers pas |
| Confirmés (10 à 50 ruches) | 8 | Volume de données, tableaux, ventes |
| Pluriactifs ou petits pros (50 ruches et plus) | 4 | Registre, factures, lots, traçabilité |
| Exploitations partagées (2 personnes ou plus) | au moins 3 exploitations | Invitations, rôles, « qui a payé » |
| iPhone / Android | moitié-moitié | L'appli Android de test, le site installé sur iPhone |
| Hors de votre cercle | au moins la moitié | Des amis disent que c'est bien ; les autres disent où ça bloque |

**Où les trouver** : rucher-école et syndicat apicole de votre département, GDSA (groupement de défense sanitaire),
groupes d'apiculteurs sur les réseaux sociaux et forums, magasins de matériel apicole, marchés de producteurs, et les
50 à 100 clients du miel de Bee's Brothers (certains ont des ruches ou en connaissent).

## 4. Ce qu'on leur offre (à décider)

- Offre **Exploitation** pendant toute la bêta, avec des gouttes d'API (bloc « Équipe Apiviz » › Activer sans payer,
  Créditer des gouttes) ;
- en remerciement : **[un an d'offre Rucher offert à l'ouverture]** pour ceux qui ont fait au moins 4 points ou
  formulaires ;
- leur nom (s'ils veulent) dans une page « Merci aux premiers apiculteurs » de apiviz.fr.

## 5. Messages prêts à envoyer

### Post court (groupe, forum, réseau social)

> Apiculteur ou apicultrice ? Avec Johan, on a construit Apiviz, une application pour suivre ses ruchers, ses visites,
> son miel et ses ventes, même sans réseau au rucher. On cherche 25 personnes pour l'essayer gratuitement en janvier et
> février et nous dire franchement ce qui ne va pas. Débutant ou confirmé, une ruche ou cent. Ça t'intéresse ?
> [lien du formulaire de candidature]

### E-mail d'invitation (après la candidature)

> Objet : Bienvenue dans la bêta d'Apiviz
>
> Bonjour [prénom],
>
> Merci d'avoir répondu ! Tu fais partie des premiers apiculteurs à essayer Apiviz.
>
> Pour commencer (10 minutes) : ouvre [https://app.apiviz.fr] sur ton téléphone, crée ton compte, puis ton exploitation
> et ton premier rucher. Sur Android, tu peux aussi installer l'application : [lien de l'APK]. Sur iPhone : dans
> Safari, bouton Partager › « Sur l'écran d'accueil ».
>
> Ensuite, une mission par semaine t'arrive le lundi, et un point de 20 minutes est proposé le [jour] à [heure]
> (facultatif). Un souci, une idée, un truc incompréhensible : [canal de retour]. Il n'y a pas de mauvaise remarque.
>
> Tes données sont réelles et restent à toi : tu peux les exporter ou tout supprimer depuis les Réglages.
>
> Merci, et bonne fin d'hivernage à tes abeilles !
> Pierre-Louis et Johan

### Relance à J+7 (à ceux qui ne sont pas revenus)

> Bonjour [prénom], on a vu que tu avais créé ton compte : merci ! Qu'est-ce qui t'a arrêté ? Une réponse en une ligne
> nous aide énormément, même « pas eu le temps ».

### Sondage de fin (fin février)

1. Sur 10, recommanderais-tu Apiviz à un autre apiculteur ? Pourquoi cette note ?
2. Qu'est-ce qui t'a le plus servi ?
3. Qu'est-ce qui t'a le plus agacé ou fait perdre du temps ?
4. Qu'est-ce qui manque pour que tu t'en serves toute la saison ?
5. Paierais-tu [39 € par an] pour l'offre Rucher ? Oui / Non / Ça dépend de…
6. On peut te recontacter pour la suite ? Oui / Non

## 6. Missions de la semaine (une par lundi)

| Semaine | Mission | Ce qu'on regarde |
|---|---|---|
| 1 (5 janv.) | Créer compte, exploitation, ruchers, colonies | Premiers pas, onboarding, temps passé |
| 2 | Inventaire : matériel, pots vides, miel et cire restants | Stock, produits, unités |
| 3 | Noter le traitement d'hiver, vérifier le registre | Registre, observations sanitaires |
| 4 | Inviter son associé ou un proche ; saisir un achat (qui a payé) | Invitations, rôles, trésorerie |
| 5 | Une visite de contrôle au rucher, à la voix, sans réseau si possible | Hors ligne, dictée, photos |
| 6 | Une vente (marché, client, page de commande) et sa facture | Ventes, clients, facture |
| 7 | Poser trois vraies questions à API | Pertinence, gouttes, coût réel |
| 8 (23 févr.) | Préparer mars : tâches, budget, tournée ; sondage de fin | Agenda, tournée, budget |

## 7. Canal de retour

Recommandé (gratuit, sans développement pendant le gel) :

- **Un formulaire** (Tally ou Google Forms) avec quatre champs : « Ça bloque / Ça gêne / Idée / Bravo », l'écran
  concerné, le texte, une capture facultative, l'appareil ;
- **un groupe de discussion** (Signal ou WhatsApp) pour les échanges rapides et l'entraide entre testeurs ;
- l'adresse **apiviz.app@gmail.com** pour le reste.

Le lien du formulaire peut être mis dans le message d'invitation et épinglé dans le groupe. Un bouton « Donner mon
avis » dans l'application serait une fonction nouvelle : il va au backlog, pas dans une PR pendant le gel.

## 8. Tri des retours (chaque vendredi, 30 min)

| Type | Définition | Suite |
|---|---|---|
| **Bloquant** | Perte de données, impossible de faire une tâche, erreur à l'écran | Correctif tout de suite, peut partir entre deux versions |
| **Gênant** | On y arrive, mais mal (texte flou, trop d'étapes, oubli) | Version du mardi suivant |
| **Idée** | Fonction nouvelle | `docs/ROADMAP/06_BACKLOG_MASTER.md`, avec le nombre de testeurs qui l'ont demandée |
| **Bravo** | Ce qui plaît | Noté : c'est ce qu'il ne faut pas casser, et la matière de la page apiviz.fr |

Un retour = une ligne dans un tableau partagé (date, testeur, type, écran, résumé, suite, version corrigée). À
chaque correction, prévenir le testeur : c'est ce qui donne envie de continuer à signaler.

## 9. Point de la semaine (20 minutes, visio, facultatif)

1. Ce que vous avez fait cette semaine avec Apiviz (2 min chacun, 4 à 6 personnes par point) ;
2. ce qui a coincé ;
3. une démonstration de ce qui a été corrigé depuis la semaine dernière ;
4. la mission de la semaine suivante.

## 10. Avant de lancer (début janvier)

- [ ] Production à jour et contrôles de la liste A au vert ; sauvegarde et copie des fichiers actives (liste B)
- [ ] CGU avec une clause « version bêta » (service en cours de test, sans engagement de disponibilité) et politique de
      confidentialité en ligne (liste C) : les données des testeurs sont réelles
- [ ] Formulaire de candidature, formulaire de retour, groupe de discussion créés ; tableau de tri prêt
- [ ] APK Android de production disponible (l'appli de test est branchée sur la recette)
- [ ] Les offres des testeurs activées depuis le bloc « Équipe Apiviz »
- [ ] Les messages du § 5 relus et datés
