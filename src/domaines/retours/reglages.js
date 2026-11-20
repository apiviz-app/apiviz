// Apiviz — Réglages › Sons et vibrations, et objectif de récolte (v5.68, maquette « Réglages » du 20 nov. 2026).
// Deux lignes ajoutées à l'écran « reglages » (essentiels.js) après son rendu :
//   - « Objectif de récolte » dans L'exploitation (réglage partagé, saveCfg : reglages.data.objectif_recolte, sans migration) ;
//   - « Sons et vibrations » dans Affichage : une feuille où chaque choix s'essaie aussitôt (son, vibration, aperçu) ;
//     « Enregistrer » garde, « Annuler » remet comme avant. Propre à cet appareil.
// Par défaut (validé le 20 nov. 2026) : sons avec l'ambiance Alvéole au volume moyen, vibrations, animations complètes.
// Globales lues à l'appel : S, esc, cfg, sheet, $sheetForm, saveCfg, render.
import * as R from "./regles.js";
import * as Son from "./sons.js";

const FL = '<svg class="rg-fl" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
const ic = (d) => `<span class="rg-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg></span>`;
const ligne = (act, icone, titre, sous, valeur) => `<button type="button" class="rg-l" data-act="${act}">${icone}<span class="rg-t"><b>${esc(titre)}</b><span>${esc(sous)}</span></span>${valeur ? `<span class="rg-v">${esc(valeur)}</span>` : FL}</button>`;
const blocApres = (titre) => [...document.querySelectorAll(".rg-groupes h2.rg-g")].find((h) => h.textContent.trim() === titre)?.nextElementSibling;

/** Après le rendu de « reglages » : les deux lignes, à leur place. */
export function completerReglages() {
  if (S.route !== "reglages" || S.rgForm || document.querySelector('[data-act="rtsons"]')) return;
  const p = Son.lire(), obj = Number(cfg().objectif_recolte) || 0;
  const resume = !p.sons ? "Sons coupés" : `${R.AMBIANCES[p.ambiance].nom} · ${R.VOLUMES[p.volume][0].toLowerCase()}${p.terrain ? " · mode terrain" : ""}`;
  blocApres("Affichage")?.insertAdjacentHTML("beforeend", ligne("rtsons", ic("M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"), "Sons et vibrations", "Sur cet appareil", resume));
  blocApres("L’exploitation")?.insertAdjacentHTML("beforeend", ligne("rtobjectif", ic("M7 7h10l1 3v9a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-9zM8 4h8v3H8z"), "Objectif de récolte", obj ? "Suivi sur l’accueil et à chaque récolte" : "Pour suivre ta saison à chaque récolte", obj ? `${String(obj).replace(".", ",")} kg` : "À fixer"));
}

// ---------- Feuille « Sons et vibrations » ----------
let essai = null;
const inter = (cle, on, titre, sous) => `<div class="rt-ligne"><span><b>${esc(titre)}</b>${sous ? `<small>${esc(sous)}</small>` : ""}</span>
  <button type="button" class="rt-inter" role="switch" aria-checked="${on}" aria-label="${esc(titre)}" data-act="rtregle" data-k="${cle}" data-v="${on ? "non" : "oui"}"><i></i></button></div>`;
const segments = (cle, options, actif, titre) => `<div class="rt-titre">${esc(titre)}</div><div class="seg rt-seg" role="radiogroup" aria-label="${esc(titre)}" style="grid-template-columns:repeat(${options.length},minmax(0,1fr))">${options.map(([v, l]) =>
  `<button type="button" role="radio" aria-checked="${v === actif}" class="${v === actif ? "on" : ""}" data-act="rtregle" data-k="${cle}" data-v="${v}">${esc(l)}</button>`).join("")}</div>`;

function corps() {
  const p = essai, m = Son.maintenant(p);
  const lecture = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7 4l13 8-13 8z"/></svg>';
  return `<div class="rt-reglages">
    <div class="rt-terrain">${inter("terrain", p.terrain, "Mode terrain", "Pendant une tournée : vibrations seules, pas de son")}</div>
    ${inter("sons", p.sons, "Sons", "")}
    <div class="rt-titre">Ambiance sonore</div>
    <div class="rt-ambiances" role="radiogroup" aria-label="Ambiance sonore">${Object.entries(R.AMBIANCES).map(([k, a]) =>
      `<button type="button" role="radio" aria-checked="${p.ambiance === k}" class="rt-ambiance${p.ambiance === k ? " on" : ""}" data-act="rtregle" data-k="ambiance" data-v="${k}"><span class="rt-lire" aria-hidden="true">${lecture}</span><span><b>${esc(a.nom)}</b><small>${esc(a.desc)}</small></span></button>`).join("")}</div>
    ${segments("volume", Object.entries(R.VOLUMES).map(([k, [l]]) => [k, l]), p.volume, "Volume")}
    ${inter("vibrations", p.vibrations, "Vibrations", "Utiles avec des gants (téléphones Android)")}
    ${segments("animations", Object.entries(R.ANIMATIONS), p.animations, "Animations")}
    <p class="small">${m.anim === "aucune" && p.animations !== "aucune" ? "Ton téléphone demande de réduire les animations : elles restent coupées." : "« Aucune » est choisie d’office si le téléphone demande de réduire les animations."}</p>
  </div>`;
}
function redessiner() { const z = $sheetForm.querySelector(".rt-reglages"); if (z) z.outerHTML = corps(); }

function ouvrir() {
  essai = Son.lire();
  let garde = false;
  sheet({ title: "Sons et vibrations", intro: "Chaque choix s’essaie tout de suite. Ils restent propres à cet appareil.", fields: [], label: "Enregistrer",
    submit: async () => { garde = true; Son.ecrire(essai); render(); toast("Sons et vibrations réglés"); } });
  $sheetForm.querySelector(".actions")?.insertAdjacentHTML("beforebegin", corps());
  document.getElementById("sheet")?.addEventListener("close", () => { if (!garde) Son.appliquerClasses(); essai = null; }, { once: true });
}

function regler(v, k) {
  if (!essai) return;
  if (["terrain", "sons", "vibrations"].includes(k)) essai[k] = v === "oui";
  else essai[k] = v;
  if (k === "terrain" && essai.terrain) essai.vibrations = true;
  if (k === "sons" && essai.sons) essai.terrain = false;
  essai = R.normaliser(essai);
  redessiner();
  // Essai immédiat : le son choisi (le mode terrain, lui, se fait sentir), une vibration pour les vibrations.
  if (k === "ambiance" || k === "volume" || (k === "sons" && essai.sons)) Son.jouer("ok", essai);
  else if (k === "terrain" || k === "vibrations") Son.vibrer("ok", essai);
  else Son.jouer("tap", essai);
  if (k === "animations") document.documentElement.classList.toggle("rt-anim-aucune", Son.maintenant(essai).anim === "aucune");
}

function objectif() {
  const c = cfg();
  sheet({ title: "Objectif de récolte", intro: "Les kilos de miel que tu vises cette saison. L’accueil et l’écran de chaque récolte montrent où tu en es. Laisse vide pour ne pas en avoir.",
    fields: [{ name: "kg", label: "Objectif (kg)", type: "number", step: 1, min: 0, value: c.objectif_recolte || "" }],
    submit: (v) => saveCfg({ objectif_recolte: v.kg === "" || !(Number(v.kg) > 0) ? null : Math.round(Number(v.kg)) }, "Objectif enregistré") });
}

export const actions = { rtsons: ouvrir, rtregle: regler, rtobjectif: objectif };
