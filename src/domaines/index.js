// Apidoo — table des écrans migrés dans le noyau (IT-03). Un fichier par domaine (src/domaines/<domaine>/ecrans.js).
// Chaque écran y est défini une seule fois. Les implémentations encore dans les anciens modules (UX, AL, ES, V3…)
// sont appelées au moment du rendu, jamais au chargement ; l'ordre des compléments y est écrit en clair.
import accueil from "./accueil/ecrans.js";
import ruchers from "./ruchers/ecrans.js";
import colonies from "./colonies/ecrans.js";
import visites from "./visites/ecrans.js";
import sante from "./sante/ecrans.js";
import meteo from "./meteo/ecrans.js";
import production from "./production/ecrans.js";
import ventes from "./ventes/ecrans.js";
import materiel from "./materiel/ecrans.js";
import finances from "./finances/ecrans.js";
import agenda from "./agenda/ecrans.js";
import registre from "./registre/ecrans.js";
import compte from "./compte/ecrans.js";

export const ecrans = [...accueil, ...ruchers, ...colonies, ...visites, ...sante, ...meteo, ...production, ...ventes, ...materiel, ...finances, ...agenda, ...registre, ...compte];
