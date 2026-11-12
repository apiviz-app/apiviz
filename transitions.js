// Apiviz — transitions entre écrans (chantier des écrans, étape 3, v5.23).
// Aller : le nouvel écran arrive de la droite. Retour (« ‹ … », Échap, l'écran d'avant) : il arrive de la gauche.
// Changement de rubrique (barre du bas, menu de côté, volet Menu, racine d'une rubrique) : il monte en fondu.
// L'écran change tout de suite, comme avant : seul le contenu neuf joue son entrée (styles/38-transitions.css).
// Aucun code ne voit donc un écran à moitié changé, et cela marche dans tous les navigateurs. Les barres ne bougent pas.
// L'alvéole qui devient l'en-tête de la fiche ruche (alveoles.js) garde son mouvement propre.
// Rien ne bouge si le téléphone demande moins d'animations. Chargé en dernier.
const VT = (() => {
  const reduit = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
  const rubrique = (r) => GROUP[r] || r;
  const racine = (r) => r === "clients" || BOTTOM.some(([k]) => k === r); // Miel s'ouvre sur « clients »
  const pile = []; // écrans traversés depuis la dernière rubrique, pour reconnaître un retour
  let dernier = null, retourDemande = false, barreTouchee = false, minuterie = 0;

  /** Sens d'un passage d'écran : "retour", "onglet" ou "aller". Testé dans etapes_vt.txt.
   *  Retour d'abord (« ‹ … », Échap, ou l'écran d'avant) ; puis rubrique (barre touchée, ou une racine) ; sinon aller. */
  function sens(de, vers, retour, barre) {
    if (retour || pile[pile.length - 2] === vers) return "retour";
    if (barre || racine(vers) || (rubrique(de) !== rubrique(vers) && racine(de))) return "onglet";
    return "aller";
  }
  function noter(s, de, vers) {
    if (s === "onglet") pile.splice(0, pile.length, vers);
    else if (s === "retour") { const i = pile.lastIndexOf(vers); pile.splice(i >= 0 ? i + 1 : 0); if (i < 0) pile.push(vers); }
    else { if (!pile.length) pile.push(de); pile.push(vers); }
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest?.(".u-retour")) retourDemande = true;
    if (e.target.closest?.(".bottom, .side, .subtabs, .nl-volet")) barreTouchee = true; // sous-onglets et volet Menu (v5.32) : fondu
  }, true);
  // Échap sur ordinateur : écran précédent. Jamais pendant une saisie (champ actif, visite, vente, tournée).
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.defaultPrevented || document.querySelector("dialog[open]") || pile.length < 2) return;
    if (e.target.closest?.("input,textarea,select,[contenteditable]") || ["visite", "vente", "tournee"].includes(S.route) || S.tournee || S.tn) return;
    retourDemande = true; go(pile[pile.length - 2]);
  });

  const html = document.documentElement;
  const rendre = render;
  render = function (...a) {
    const vers = S.route, de = dernier, ret = retourDemande, bar = barreTouchee;
    dernier = vers; retourDemande = barreTouchee = false;
    if (!de || de === vers || !S.d) { if (de === vers) delete html.dataset.vt; return rendre.apply(this, a); }
    const s = sens(de, vers, ret, bar);
    noter(s, de, vers);
    if (reduit()) { delete html.dataset.vt; return rendre.apply(this, a); }
    html.dataset.vt = s;
    clearTimeout(minuterie);
    minuterie = setTimeout(() => delete html.dataset.vt, 600); // un rendu suivant du même écran ne rejoue pas l'entrée
    const r = rendre.apply(this, a);
    // Une seule entrée par écran : sans cela, l'ancienne entrée (.wrap.enter, « rise ») repartait au retrait du sens,
    // 0,6 s plus tard, et l'écran semblait se charger deux fois.
    document.querySelector(".wrap")?.classList.remove("enter");
    return r;
  };

  return { sens, pile: () => [...pile] };
})();
