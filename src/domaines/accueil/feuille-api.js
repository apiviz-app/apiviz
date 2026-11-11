// Apiviz — feuille d'API d'après les maquettes du 10 nov. 2026 (chantier des écrans, étape 8, v5.27).
// Le bouton API (centre de la barre du bas) ouvre déjà « Que veux-tu faire ? » : compagnon, recherche, six saisies
// rapides (nav4.js, alveoles.js). Les maquettes y ajoutent la suggestion du jour : la même priorité que l'accueil,
// dite par API, avec deux gestes, « Visiter … » et « Ajouter à l'agenda ». Sans priorité (tout va bien), rien n'est
// ajouté : API ne parle pas pour rien. Les tuiles entrent l'une après l'autre (styles/42-feuille-api.css).
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

/** Enveloppe la feuille du bouton API (chargé après nav4.js et alveoles.js, par src/main.js). */
export function installer() {
  if (typeof window.quickSheet != "function" || window.quickSheet.faApi) return;
  const avant = window.quickSheet;
  const feuille = function () {
    avant();
    const s = suggestion(), tuiles = $sheetForm.querySelector(".n4-tuiles");
    tuiles?.querySelectorAll(".n4-tuile").forEach((t, i) => t.style.setProperty("--i", i));
    tuiles?.classList.add("fa-tuiles");
    if (s && tuiles) tuiles.insertAdjacentHTML("afterend", s);
  };
  feuille.faApi = true;
  window.quickSheet = feuille;
}

/** Gestes de la suggestion. */
export const actions = {
  fasvisite: (id) => { $sheet.close(); ACT.newvisite(id); },
  fasagenda: (id) => { $sheet.close(); ACT.newtache(id); },
};
