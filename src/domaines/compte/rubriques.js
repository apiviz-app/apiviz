// Apiviz — rubriques affichées (v5.84, parcours d'arrivée, écran 3 de la maquette « Onboarding irréprochable » :
// « une question qui adapte l'app : un débutant ne voit pas tout de suite Ventes ni Matériel, activables ensuite »).
//   - Réglage de l'exploitation « rubriques » ({ ventes, materiel, finances }, absent = affiché), proposé à la création
//     du rucher d'après « Tu en es où ? » (demarrage.js), modifiable dans Réglages › L'exploitation › Rubriques affichées.
//   - Une rubrique masquée quitte le menu (ordinateur), le volet du téléphone et les tuiles de « Saisir » ; ses écrans
//     restent joignables (lien, recherche, API). « Produits » reste dans la barre du bas : récoltes et stock y sont.
// Globales lues à l'appel : S, esc, cfg, saveCfg, sheet, $sheetForm, $sheet, render, toast.
import * as R from "./regles-arrivee.js";

const actives = () => R.rubriquesActives(typeof cfg == "function" ? cfg() : {});
export const masquee = (route) => R.routeMasquee(route, actives());

const FL = '<svg class="rg-fl" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
const IC = '<span class="rg-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v5H4zM13 14h7v5h-7z"/></svg></span>';

/** Après le rendu de « reglages » : la ligne « Rubriques affichées » dans L'exploitation (responsables et membres). */
export function completerReglages() {
  if (S.route !== "reglages" || S.rgForm || document.querySelector('[data-act="rbrubriques"]')) return;
  if (document.documentElement.classList.contains("lecteur")) return;
  const a = actives(), cachees = R.RUBRIQUES.filter((x) => !a[x.id]).map((x) => x.nom);
  const bloc = [...document.querySelectorAll(".rg-groupes h2.rg-g")].find((h) => h.textContent.trim() === "L’exploitation")?.nextElementSibling;
  bloc?.insertAdjacentHTML("beforeend", `<button type="button" class="rg-l" data-act="rbrubriques">${IC}<span class="rg-t"><b>Rubriques affichées</b><span>${esc(cachees.length ? `Masquées : ${cachees.join(", ")}` : "Toutes les rubriques sont affichées")}</span></span>${FL}</button>`);
}

function feuille() {
  const a = actives();
  $sheetForm.onsubmit = (ev) => ev.preventDefault();
  $sheetForm.innerHTML = `<h2>Rubriques affichées</h2><p class="small">Pour toute l’exploitation. Une rubrique masquée quitte le menu ; rien n’est effacé, tu la remets quand tu veux.</p>
    <div class="ar-types">${R.RUBRIQUES.map((x) => `<div class="ar-type"><span><b>${esc(x.nom)}</b><span>${esc(x.detail)}</span></span><button type="button" class="ar-sw" role="switch" aria-checked="${a[x.id]}" aria-label="${esc(x.nom)}" data-act="rbbascule" data-v="${x.id}"></button></div>`).join("")}</div>
    <div class="actions"><button type="button" class="btn" data-act="closesheet">Fermer</button></div>`;
  if (!$sheet.open) $sheet.showModal();
}

/** Volet du téléphone (navigation.js) : retire les entrées des rubriques masquées. */
export function filtrerVolet(racine = document.getElementById("nlVolet")) {
  racine?.querySelectorAll(".nl-entree[data-v]").forEach((b) => { if (masquee(b.dataset.v)) b.remove(); });
}

if (typeof window != "undefined" && window.Noyau?.crochets) {
  // Menu de l'ordinateur et tuiles de « Saisir », après chaque écran ; bouton « Nouvelle vente » de l'accueil.
  window.Noyau.crochets.sur("apresRendu", "rubriques", () => {
    if (!S.d) return;
    document.querySelectorAll(".side .nav[data-v]").forEach((b) => { b.hidden = masquee(b.dataset.v); });
    if (masquee("newvente")) document.querySelectorAll('.ac-actions [data-act="newvente"]').forEach((b) => b.remove());
  });
}

export const actions = {
  rbrubriques: () => feuille(),
  rbbascule: async (id) => {
    if (!R.RUBRIQUES.some((x) => x.id === id)) return;
    const a = actives();
    await saveCfg({ rubriques: { ...a, [id]: !a[id] } }, !a[id] ? "Rubrique affichée" : "Rubrique masquée");
    feuille();
  },
};

if (typeof window != "undefined") window.Rubriques = { masquee, filtrerVolet };
