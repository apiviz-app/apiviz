// Apidoo — liste des écrans migrés dans le noyau (IT-03). Un fichier par domaine (src/domaines/<domaine>/ecrans.js).
// Les implémentations encore dans les anciens modules (ES, TN, V3…) sont appelées au moment du rendu, jamais avant.
import compte from "./compte/ecrans.js";
import ruchers from "./ruchers/ecrans.js";
import sante from "./sante/ecrans.js";
import meteo from "./meteo/ecrans.js";
import agenda from "./agenda/ecrans.js";
import registre from "./registre/ecrans.js";
import production from "./production/ecrans.js";
import ventes from "./ventes/ecrans.js";
import visites from "./visites/ecrans.js";

export const ecrans = [...compte, ...ruchers, ...sante, ...meteo, ...agenda, ...registre, ...production, ...ventes, ...visites];
