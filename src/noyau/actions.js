// Apidoo — actions par écran (IT-03, AP-FEAT-002).
// Les boutons gardent data-act : app.js appelle ACT[nom]. Un écran migré déclare ses actions ici, une seule fois ;
// une action déjà définie ailleurs n'est remplacée que si l'écran le dit (remplace: [noms]), pour que chaque
// remplacement soit visible dans le code de l'écran qui le fait.

const proprietaires = new Map(); // nom d'action -> id de l'écran qui la déclare

export function enregistrerActions(cible, ecranId, actions, { remplace = [] } = {}) {
  for (const [nom, fn] of Object.entries(actions)) {
    if (typeof fn !== "function") throw new Error(`Action « ${nom} » : une fonction est attendue`);
    if (proprietaires.has(nom)) throw new Error(`Action « ${nom} » déjà déclarée par l'écran « ${proprietaires.get(nom)} »`);
    if (nom in cible && !remplace.includes(nom)) throw new Error(`Action « ${nom} » déjà définie : la déclarer dans « remplace »`);
    proprietaires.set(nom, ecranId);
    cible[nom] = fn;
  }
}

/** Écran qui a déclaré l'action, ou undefined (action encore définie par un ancien module). */
export const proprietaire = (nom) => proprietaires.get(nom);
export function _reinitialiser() { proprietaires.clear(); }
