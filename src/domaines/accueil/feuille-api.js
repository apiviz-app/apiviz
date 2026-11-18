// Apiviz — feuille d'API d'après les maquettes du 10 nov. 2026 (chantier des écrans, étape 8, v5.27).
// Le bouton API (centre de la barre du bas) ouvre déjà « Que veux-tu faire ? » : compagnon, recherche, six saisies
// rapides (nav4.js, alveoles.js). Les maquettes y ajoutent la suggestion du jour : la même priorité que l'accueil,
// dite par API, avec deux gestes, « Visiter … » et « Ajouter à l'agenda ». Sans priorité (tout va bien), rien n'est
// ajouté : API ne parle pas pour rien. Les tuiles entrent l'une après l'autre (styles/42-feuille-api.css).
// v5.53 : la ligne « Donner une facture à API » au-dessus des saisies, là où API peut lire les factures (facture.js) ;
// elle remplace la phrase « Bientôt, API … lira tes factures » d'alveoles.js.
// Globales lues à l'appel : S, esc, $sheet, $sheetForm, ACT, AL, UX, MT.

const prioritaire = () => S.d?.ruches?.find((x) => x.etat === "Critique") || S.d?.ruches?.find((x) => x.etat !== "Bonne");

/** Bloc de suggestion : null quand il n'y a rien à proposer. */
export function suggestion() {
  const r = prioritaire();
  if (!r || typeof AL == "undefined") return null;
  const pesees = (S.d.visites || []).filter((v) => v.ruche_id === r.id && v.poids_kg).length;
  const source = pesees > 1 ? `D’après ${pesees} pesées de ${r.nom}` : `D’après la dernière visite de ${r.nom}`;
  return `<section class="fa-sugg" aria-label="Suggestion du jour"><p>${esc(AL.phrase())}</p><span class="small">${esc(source)}</span>
    <div class="fa-gestes"><button type="button" class="btn main" data-act="fasvisite" data-v="${esc(r.id)}">Visiter ${esc(r.nom)}</button>
    <button type="button" class="btn" data-act="fasagenda" data-v="${esc(r.id)}">Ajouter à l’agenda</button></div></section>`;
}

import { disponible, factureProposee, ligneFacture } from "../finances/facture.js";
import { saison } from "../production/saison.js";

/** Ajoute la ligne « Donner une facture à API » à la feuille ouverte, une fois. */
function ajouterFacture() {
  const tuiles = $sheetForm.querySelector(".n4-tuiles");
  if (!tuiles || !$sheet.open || $sheetForm.querySelector(".fx-entree") || !factureProposee()) return;
  tuiles.insertAdjacentHTML("beforebegin", ligneFacture());
  $sheetForm.querySelector(".al-bientot")?.remove();
}

/**
 * Tuile « Récolte » mise en avant pendant la saison (mai à septembre) ou quand du miel attend d'être mis en pots ;
 * dans ce second cas, une ligne « Mettre … kg en pots » sous les tuiles.
 */
function mettreEnAvantRecolte(tuiles) {
  const t = tuiles?.querySelector('[data-v="newrecolte"]');
  if (!t || !S.d || document.documentElement.classList.contains("lecteur")) return;
  const attente = saison(S.d).attente, mois = new Date().getMonth();
  if (!(attente > 0 || (mois >= 4 && mois <= 8))) return;
  t.classList.add("fa-saison"); // pastille « Saison » dessinée par la feuille de styles : le libellé reste « Récolte »
  t.setAttribute("aria-label", "Récolte, conseillée en ce moment");
  if (attente > 0 && !$sheetForm.querySelector(".fa-pots")) {
    tuiles.insertAdjacentHTML("afterend", `<button type="button" class="n4-ligne fa-pots" data-act="n4q" data-v="newlot"><span class="u-todo-t"><b>Mettre ${esc(n(attente))} kg en pots</b><span class="small">Miel récolté pas encore en pots</span></span><span aria-hidden="true">›</span></button>`);
  }
}

/** Enveloppe la feuille du bouton API (chargé après nav4.js et alveoles.js, par src/main.js). */
export function installer() {
  if (typeof window == "undefined" || typeof window.quickSheet != "function" || window.quickSheet.faApi) return;
  const avant = window.quickSheet;
  const feuille = function () {
    avant();
    const s = suggestion(), tuiles = $sheetForm.querySelector(".n4-tuiles");
    tuiles?.querySelectorAll(".n4-tuile").forEach((t, i) => t.style.setProperty("--i", i));
    tuiles?.classList.add("fa-tuiles");
    // v5.66 (maquette « Depuis API ») : de mai à septembre, ou quand du miel attend, la récolte passe devant.
    mettreEnAvantRecolte(tuiles);
    // (avant la suggestion, qui reste juste sous les tuiles)
    if (s && tuiles) tuiles.insertAdjacentHTML("afterend", s);
    // v5.57 : outils de terrain, à portée de pouce depuis le bouton API (pas pour un compte en lecture seule).
    if (tuiles && !document.documentElement.classList.contains("lecteur") && !$sheetForm.querySelector(".fa-terrain")) {
      ($sheetForm.querySelector(".u-deux") || tuiles).insertAdjacentHTML("afterend", `<div class="u-deux fa-terrain">
        <button type="button" class="btn" data-act="n4q" data-v="qrscanner">Scanner une ruche</button>
        ${(S.d?.lots || []).length ? '<button type="button" class="btn" data-act="n4q" data-v="cscaisse">Caisse du marché</button>' : ""}</div>`);
    }
    // Disponibilité déjà connue : tout de suite ; sinon dès la réponse du serveur, si la feuille est encore ouverte.
    ajouterFacture();
    // 17 nov. 2026 : affichée d'après la réponse gardée sur l'appareil, puis confirmée (ou retirée) par le serveur.
    disponible().then((ok) => (ok ? ajouterFacture() : $sheetForm.querySelector(".fx-entree")?.remove()));
  };
  feuille.faApi = true;
  window.quickSheet = feuille;
}

/** Gestes de la suggestion. */
export const actions = {
  fasvisite: (id) => { $sheet.close(); ACT.newvisite(id); },
  fasagenda: (id) => { $sheet.close(); ACT.newtache(id); },
};
