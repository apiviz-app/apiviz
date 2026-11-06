// Apidoo — passerelle provisoire entre les modules ES (src/) et les scripts classiques (*.js de la racine).
// Chargée en premier : index.html marque tous les scripts « defer », qui s'exécutent dans l'ordre du document,
// modules compris. Les anciens scripts trouvent ici les règles pures sous window.Regles.
// À retirer quand plus aucun script classique ne les appelle (fin de la transition, doc 03 §3).
import * as format from "./noyau/format.js";
import * as finances from "./domaines/finances/regles.js";
import * as sante from "./domaines/sante/regles.js";
import * as meteo from "./domaines/meteo/regles.js";
import { creerFile } from "./noyau/erreurs.js";
import * as crochets from "./noyau/crochets.js";

window.Regles = Object.freeze({ ...format, finances, sante, meteo });

// Journal des erreurs de production (AP-FEAT-016) : journaliser() d'app.js en envoie une copie ici.
// S et sb sont les globales d'app.js (chargé après ce module) : elles ne sont lues qu'au moment de l'envoi.
const journal = creerFile({
  version: document.querySelector('meta[name="apidoo-version"]')?.content || "dev",
  pret: () => typeof S !== "undefined" && !!S.session && navigator.onLine !== false,
  envoyer: async (p) => {
    const { error } = await sb.rpc("journaliser_erreur", { p });
    if (error) throw error; // fonction absente (base sans 013) ou refus : l'erreur reste dans la console
  },
});
addEventListener("pagehide", () => journal.vider());
// Crochets du rendu et de la coquille : les scripts classiques les déclarent au chargement.
window.Noyau = { journal, crochets };
