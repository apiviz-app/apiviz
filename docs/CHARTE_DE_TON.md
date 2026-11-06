# Charte de ton

Adoptée avec IT-03 (AP-FEAT-112, AP-US-124), le 6 nov. 2026.

## La règle

| Où | Ton | Exemples |
|---|---|---|
| **Dans l'application** (écrans, boutons, messages, erreurs, fenêtres, aide) | **tutoiement** | « Ajoute ta première ruche », « Choisis un client », « Tu as quitté l'exploitation » |
| **Documents émis** : ce qui sort de l'app vers un tiers ou une administration (registre d'élevage, factures, reçus et relances envoyés aux clients, objet des e-mails) | **vouvoiement** | « Merci pour votre achat », « Votre miel · … » |

## Écrire un texte

- Phrases courtes, verbe d'action en tête pour les boutons (« Enregistrer la visite », pas « Enregistrement »).
- Erreurs en français, qui disent quoi faire : « Choisis une ruche », pas « ruche_id manquant ».
- Pas de jargon technique à l'écran (base, requête, synchronisation) : « Envoi dès que le réseau revient ».
- Les titres d'écrans vides invitent à agir : « Ajoute tes fournisseurs ».
- Dates et nombres au format français (`format.js`) : « 6 nov. », « 12,5 kg », « 14,00 € ».

## Contrôle automatique

`tests/unitaires/ton.test.mjs` cherche, dans tous les fichiers `*.js` (racine et `src/`), les formes « vous », « votre »,
« vos » et les verbes en « -ez ». Il échoue sur toute forme qui n'est pas une exception listée. Il tourne dans
« Vérifier » à chaque pull request.

Exceptions actuelles (textes de documents émis) :

| Fichier | Texte | Pourquoi |
|---|---|---|
| `registre.js` | « Notez un traitement dans une visite… » | écran du registre, imprimé tel quel |
| `registre.js` | « Gardez les ordonnances et factures des médicaments… » | mention imprimée sur le registre |
| `ux.js` | « …merci pour votre achat du… » | reçu envoyé au client |
| `ux.js` | « Votre miel · … » | objet de l'e-mail envoyé au client |

Ajouter une exception : seulement pour un texte destiné à un tiers, en l'inscrivant ici **et** dans le test.
