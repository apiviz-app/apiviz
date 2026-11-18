// Apiviz — retour en arrière (v5.64, maquette « Apiviz · Retour en arrière » du 18 nov. 2026).
// Le bouton retour du téléphone, celui du navigateur et le lien « ‹ » en haut d'un écran font la même chose :
//   1. une fenêtre ouverte (feuille du bas, volet Menu, recherche…) se ferme d'abord, l'écran du dessous ne bouge pas ;
//      une saisie commencée dans une feuille est gardée en brouillon (« Saisie gardée en brouillon · Reprendre »,
//      ergonomie.js) : rien n'est perdu ;
//   2. sinon, on revient à l'écran d'où l'on vient (Ruche 5 ouverte depuis l'Accueil → l'Accueil) ;
//   3. un onglet de 1er niveau (barre du bas, Menu) n'a derrière lui que l'Accueil ;
//   4. à l'Accueil, un premier appui prévient (« Appuie encore sur retour pour quitter Apiviz »), le second ferme.
//
// Les écrans ne changent pas : la pile est tenue ici, à chaque rendu (crochet « apresRendu » déclaré dans main.js),
// d'après S.route et les quelques champs qui disent quel objet est ouvert (CHAMPS). Revenir remet ces champs et
// redessine.
// Navigateur et application installée (PWA) : une entrée « garde » dans l'historique du navigateur reçoit le retour
// (popstate). Applications Android / iOS : l'écouteur backButton de @capacitor/app, qui sait aussi fermer l'app.
// Globales lues à l'appel seulement : S, ACT, render, toast, GROUP, Plateforme.
import { NIVEAU1, FLUX } from "./gabarit.js";

/** Champs de S qui disent ce qui est affiché, en plus de la route. Gardés à chaque écran, remis au retour. */
export const CHAMPS = ["route", "ruche", "rucher", "lotId", "factId", "factureCle", "meteoRucher", "meteoJour", "tab", "rgTab", "venteFiltre", "saison", "saisonMois"];
/** Ceux qui changent d'écran (les autres sont des réglages de l'écran : onglet, filtre, mois). */
const IDENTITE = ["route", "ruche", "rucher", "lotId", "factId", "factureCle", "meteoRucher", "meteoJour"];

// ---------- Règles pures (testées : tests/unitaires/historique.test.mjs) ----------

/** Photo de l'écran courant : les champs simples de CHAMPS. */
export function photo(etat) {
  const p = {};
  for (const k of CHAMPS) { const v = etat?.[k]; if (v === undefined || v === null || typeof v !== "object") p[k] = v ?? null; }
  return p;
}

/** Clé d'un écran : deux photos de même clé sont le même écran (un onglet ou un filtre ne compte pas). */
export const cle = (p) => IDENTITE.map((k) => String(p?.[k] ?? "")).join("|");

const ACCUEIL = { route: "dash" };

/**
 * Nouvelle pile après l'affichage d'un écran. `pile` va du plus ancien au plus récent ; `groupe(route)` donne la
 * rubrique d'une route (barre du bas / Menu). Chaque entrée : { photo, titre }.
 */
export function suivante(pile, entree, groupe = (r) => r) {
  const p = entree.photo, r = p.route, haut = pile[pile.length - 1];
  if (!haut) return r === "dash" ? [entree] : [{ photo: { ...ACCUEIL }, titre: "Accueil" }, entree];
  // Même écran (onglet, filtre, rafraîchissement) : on met la photo à jour.
  if (cle(haut.photo) === cle(p)) return [...pile.slice(0, -1), entree];
  // L'Accueil remet tout à zéro.
  if (r === "dash") return [entree];
  // Retour « à la main » sur l'écran d'avant (lien, enregistrement d'une saisie) : on dépile au lieu d'empiler.
  const avant = pile[pile.length - 2];
  if (avant && cle(avant.photo) === cle(p)) return [...pile.slice(0, -2), entree];
  const base = pile[0] && pile[0].photo.route === "dash" ? pile[0] : { photo: { ...ACCUEIL }, titre: "Accueil" };
  // Écran de 1er niveau : un autre onglet de la même rubrique remplace le courant ; une autre rubrique repart de
  // l'Accueil.
  if (NIVEAU1.has(r)) {
    if (NIVEAU1.has(haut.photo.route) && groupe(haut.photo.route) === groupe(r)) return [...pile.slice(0, -1), entree];
    return [base, entree];
  }
  // Une saisie (visite, vente, tournée…) quittée pour un autre écran ne reste pas dans la pile ; une fiche voisine
  // (flèches ‹ › d'une ruche) remplace la fiche.
  if (FLUX.has(haut.photo.route) || haut.photo.route === r) return [...pile.slice(0, -1), entree];
  return [...pile, entree];
}

/**
 * Ce que fait le prochain retour : { faire: "fenetre" | "ecran" | "accueil" | "prevenir" | "quitter", pile }.
 * `fenetre` : une fenêtre est ouverte ; `prevenu` : le message « Appuie encore » est à l'écran.
 */
export function retour(pile, { fenetre = false, prevenu = false } = {}) {
  if (fenetre) return { faire: "fenetre", pile };
  if (pile.length > 1) return { faire: "ecran", pile: pile.slice(0, -1) };
  const haut = pile[0];
  if (haut && haut.photo.route !== "dash") return { faire: "accueil", pile: [{ photo: { ...ACCUEIL }, titre: "Accueil" }] };
  return { faire: prevenu ? "quitter" : "prevenir", pile };
}

// ---------- Partie navigateur ----------

const DELAI_QUITTER = 3000;
let pile = [], restaurer = false, prevenu = false, minuteur = 0, arme = false, natif = null, demarre = false;

const groupe = (r) => (typeof GROUP != "undefined" && GROUP[r]) || r;
const titreEcran = () => (document.querySelector(".wrap > .head h1")?.textContent || "").replace(/\s+/g, " ").trim();
const fenetreOuverte = () => [...document.querySelectorAll("dialog[open]")].pop() || null;
const pret = () => typeof S != "undefined" && S.session && S.d && !S.recovery && S.member !== false;

/** Ferme une fenêtre comme Échap : la feuille garde sa saisie en brouillon (ergonomie.js), une saisie en cours d'envoi
 * n'est pas interrompue. */
function fermerFenetre(d) {
  const e = new Event("cancel", { cancelable: true });
  d.dispatchEvent(e);
  if (!e.defaultPrevented && d.open) d.close();
}

/** Entrée « garde » : le prochain retour du navigateur arrive ici (popstate) au lieu de quitter la page. */
function armer() {
  if (natif || arme) return;
  try { history.pushState({ apiviz: "garde" }, ""); arme = true; } catch {}
}

/** Un appui sur retour, d'où qu'il vienne (téléphone, navigateur, lien « ‹ »). */
export function appuyer(source = "lien") {
  const f = fenetreOuverte();
  const r = retour(pile, { fenetre: !!f, prevenu });
  if (r.faire === "fenetre") { fermerFenetre(f); return r.faire; }
  if (r.faire === "ecran" || r.faire === "accueil") {
    pile = r.pile;
    const haut = pile[pile.length - 1];
    Object.assign(S, haut.photo);
    restaurer = true;
    render();
    return r.faire;
  }
  if (r.faire === "prevenir") {
    // Depuis le lien de l'écran, l'Accueil n'en a pas : rien à faire. Le navigateur, lui, a déjà consommé la garde.
    if (source === "lien") return "rien";
    prevenu = true;
    clearTimeout(minuteur);
    typeof toast == "function" && toast("Appuie encore sur retour pour quitter Apiviz");
    // Navigateur : on ne remet pas la garde tout de suite, le second appui quitte la page sans rien de plus.
    minuteur = setTimeout(() => { prevenu = false; armer(); }, DELAI_QUITTER);
    return r.faire;
  }
  // Quitter : l'application installée se ferme ; dans un navigateur, le second appui a déjà quitté la page.
  prevenu = false;
  clearTimeout(minuteur);
  if (natif?.exitApp) natif.exitApp();
  else if (source === "navigateur") try { history.back(); } catch {}
  return r.faire;
}

/** Après chaque écran : la pile suit, et le lien « ‹ » de l'en-tête porte le nom de l'écran d'avant. */
export function apresRendu() {
  if (!pret()) return;
  if (!demarre) demarrer();
  // L'Accueil s'ouvre sur « Bonjour… » : son nom dans le lien « ‹ » reste « Accueil ».
  const entree = { photo: photo(S), titre: S.route === "dash" ? "Accueil" : titreEcran() };
  if (restaurer) {
    restaurer = false;
    pile = [...pile.slice(0, -1), { ...entree, titre: entree.titre || pile[pile.length - 1]?.titre }];
  } else {
    pile = suivante(pile, entree, groupe);
  }
  if (prevenu && pile.length > 1) { prevenu = false; clearTimeout(minuteur); }
  if (!prevenu) armer();
  lienRetour();
}

/** Le retour de l'en-tête (et sa copie dans la barre du haut) ramène là d'où l'on vient. */
function lienRetour() {
  const avant = pile[pile.length - 2];
  if (!avant) return;
  const texte = avant.titre || (avant.photo.route === "dash" ? "Accueil" : "Retour");
  document.querySelectorAll(".wrap > .head .g-retour, .topbar .g-retour-haut").forEach((b) => {
    b.dataset.act = "hretour";
    b.dataset.v = avant.photo.route; // indicatif (transitions, tests) : l'action « hretour » remet tout l'écran d'avant
    b.removeAttribute("data-k");
    const s = b.querySelector("span");
    if (s) s.textContent = texte;
    b.setAttribute("aria-label", `Retour : ${texte}`);
  });
}

function demarrer() {
  demarre = true;
  if (typeof ACT != "undefined") ACT.hretour = () => appuyer("lien");
  const C = window.Capacitor;
  const app = typeof Plateforme != "undefined" && Plateforme.native && C?.isPluginAvailable?.("App")
    ? C.Plugins?.App || C.registerPlugin?.("App") : null;
  if (app?.addListener) {
    natif = app;
    app.addListener("backButton", () => appuyer("telephone"));
    return;
  }
  try { history.replaceState({ apiviz: "base" }, ""); } catch {}
  window.addEventListener("popstate", () => {
    arme = false;
    const fait = appuyer("navigateur");
    if (fait !== "prevenir" && fait !== "quitter") armer();
  });
}

/** Pour les tests : la pile telle qu'elle est (titres et routes). */
export const etat = () => ({ pile: pile.map((e) => ({ route: e.photo.route, titre: e.titre })), prevenu });
