// Apidoo — passerelle provisoire entre les modules ES (src/) et les scripts classiques (*.js de la racine).
// Chargée en premier : index.html marque tous les scripts « defer », qui s'exécutent dans l'ordre du document,
// modules compris. Les anciens scripts trouvent ici les règles pures sous window.Regles.
// À retirer quand plus aucun script classique ne les appelle (fin de la transition, doc 03 §3).
import * as format from "./noyau/format.js";
import * as finances from "./domaines/finances/regles.js";
import * as sante from "./domaines/sante/regles.js";
import * as meteo from "./domaines/meteo/regles.js";

window.Regles = Object.freeze({ ...format, finances, sante, meteo });
