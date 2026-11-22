// Apiviz — écrans et compléments du domaine photos (IT-11, AP-FEAT-047 et AP-FEAT-048).
//   - Réglages › L'exploitation : ligne « Espace photos » et, à 80 % du quota, l'avertissement (espace restant, taille
//     moyenne d'une photo ; AP-US-054). Appelé par l'écran « reglages » (src/domaines/compte/ecrans.js).
//   - Écran « stockage » (Espace photos) : jauge, moyenne, photos qui tiennent encore, journal du nettoyage de nuit
//     (table nettoyages_stockage, migration 034). Enregistré dans la table des écrans : aucune surcharge.
//   - Fiche rucher : section « Photos du rucher » (photos.js, PH.galerie), appelée par l'écran « rucher ».
// La fiche colonie montre ses photos dans son onglet Photos (ux.js, photosRuche, qui appelle PH.galerie).
// Globales d'app.js lues à l'appel seulement : S, sb, esc, shell, render, PH, EX.
import * as P from "./regles.js";
import { rucherParCle } from "../ruchers/regles.js";

const st = { journal: null, charge: false, absent: false, demande: false };
const ic = (d) => `<span class="rg-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg></span>`;
const FL = '<svg class="rg-fl" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
const IC_PHOTO = "M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z";
const etat = () => (typeof PH != "undefined" && PH.etatEspace ? PH.etatEspace() : null);
// « 22 novembre, 3 h » ou « 22 novembre, 3 h 15 » (charte de ton : heures « 14 h »), à l'heure de Paris.
const quand = (t) => {
  const d = new Date(t), o = { timeZone: "Europe/Paris" };
  const x = Object.fromEntries(new Intl.DateTimeFormat("fr-FR", { ...o, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(d).map((q) => [q.type, q.value]));
  const h = Number(x.hour), m = Number(x.minute);
  return `${d.toLocaleDateString("fr-FR", { ...o, day: "numeric", month: "long" })}, ${h} h${m ? " " + String(m).padStart(2, "0") : ""}`;
};

/** Après le rendu des Réglages : ligne « Espace photos » dans L'exploitation, et l'avertissement à 80 %. */
export function completerReglages() {
  if (S.route !== "reglages" || S.rgForm || document.querySelector(".rg-photos") || typeof PH == "undefined" || !PH.pret?.()) return;
  const titre = [...document.querySelectorAll(".rg-groupes h2.rg-g")].find((h) => /exploitation/i.test(h.textContent));
  const bloc = titre?.nextElementSibling;
  if (!bloc) return;
  const e = etat();
  if (!e && !st.demande) { st.demande = true; PH.lireEspace?.(); }
  const valeur = e ? `<span class="rg-v${e.alerte ? " rg-alerte-v" : ""}">${e.pourcent} %</span>` : FL;
  const sous = e ? `${P.octets(e.utilise)} sur ${P.octets(e.quota)}` : "Place prise par les photos";
  bloc.insertAdjacentHTML("beforeend", `<button type="button" class="rg-l rg-photos" data-act="go" data-v="stockage">${ic(IC_PHOTO)}<span class="rg-t"><b>Espace photos</b><span>${esc(sous)}</span></span>${valeur}</button>`);
  if (e?.alerte) bloc.insertAdjacentHTML("beforebegin", `<p class="ph-avert" role="status"><b>${e.plein ? "Espace photos plein" : `Espace photos utilisé à ${e.pourcent} %`}</b><span>${esc(P.avertissement(e))}</span></p>`);
}

async function chargerJournal() {
  if (st.charge) return;
  st.charge = true;
  const { data, error } = await sb.from("nettoyages_stockage").select("fait_le, statut, fichiers, octets").order("fait_le", { ascending: false }).limit(10);
  st.absent = !!error && /PGRST205|does not exist|Could not find/i.test(`${error.code} ${error.message}`);
  st.journal = error ? [] : data || [];
  if (S.route === "stockage") render();
}

/** Écran « Espace photos » (Réglages › L'exploitation). */
export function ecranStockage() {
  const e = etat();
  if (!e && !st.demande && typeof PH != "undefined") { st.demande = true; PH.lireEspace?.(); }
  if (st.journal === null) chargerJournal().catch(() => { st.journal = []; });
  const phrase = !e ? "Je mesure la place prise par tes photos…"
    : e.plein ? "L’espace photos est plein."
    : `Il te reste ${P.octets(e.restant)}, soit ${P.environ(e.photosRestantes)} photos.`;
  const jauge = e ? `<section class="card ph-jauge-c">
      <div class="u-entete"><b class="ph-chiffre">${esc(P.octets(e.utilise))} <span class="small">sur ${esc(P.octets(e.quota))}</span></b>${e.alerte ? `<span class="tag watch">${e.plein ? "Plein" : "À surveiller"}</span>` : '<span class="tag good">Large</span>'}</div>
      <div class="ph-jauge" role="img" aria-label="${e.pourcent} % utilisés, alerte à ${Math.round(P.SEUIL_ALERTE * 100)} %"><i style="width:${Math.min(100, e.part * 100).toFixed(1)}%"></i><b style="left:${P.SEUIL_ALERTE * 100}%"></b></div>
      <div class="ph-legende small"><span>${e.pourcent} % utilisés</span><span>Alerte à ${Math.round(P.SEUIL_ALERTE * 100)} %</span></div>
      <div class="hl-row"><span>Taille moyenne d’une photo</span><b>${esc(P.octets(e.moyenne))}</b></div>
    </section>` : "";
  const lignes = (st.journal || []).map((p) => `<div class="hl-row"><span><b>${esc(quand(p.fait_le))}</b><span class="small">${esc(P.libellePassage(p))}</span></span>${
    p.statut === "echec" ? '<span class="tag crit">! Échec</span>' : '<span class="tag good">Fait</span>'}</div>`).join("");
  const journal = st.absent ? '<p class="small">Le journal arrive avec la prochaine mise à jour de la base.</p>'
    : st.journal === null ? '<p class="small">Chargement du journal…</p>'
    : lignes || '<p class="small">Aucun passage pour l’instant : le premier a lieu la nuit qui suit la mise en service.</p>';
  shell("Espace photos", phrase, "", `<div class="ph-stockage">${jauge}
    <section class="card"><h2>Nettoyage automatique</h2>
      <p class="small">Chaque nuit, Apiviz retire les fichiers photo qu’aucune fiche n’utilise depuis plus de ${P.DELAI_NETTOYAGE_JOURS} jours (visite supprimée, envoi interrompu). Tes visites, colonies et ruchers et leurs photos ne sont jamais touchés.</p>
      ${journal}</section>
    <section class="card"><h2>Pour gagner de la place</h2><p class="small">Supprime les photos devenues inutiles depuis la fiche d’une colonie ou d’un rucher : touche une photo, puis « Supprimer ». Les photos sont déjà réduites avant l’envoi.</p></section>
  </div>`);
}

/** Après le rendu de la fiche rucher : section « Photos du rucher », avant « Gérer ce rucher ». */
export function completerRucher() {
  if (S.route !== "rucher" || typeof PH == "undefined" || !PH.galerie) return;
  const r = rucherParCle(S.d.ruchers, S.rucher);
  const wrap = document.querySelector(".wrap");
  if (!r?.id || !wrap || wrap.querySelector(".ph-fiche")) return;
  const html = PH.galerie("rucher", r.id);
  if (!html) return;
  const gestion = wrap.querySelector(".rc-gestion");
  if (gestion) gestion.insertAdjacentHTML("beforebegin", html); else wrap.insertAdjacentHTML("beforeend", html);
}

/** Relecture de l'espace arrivée : l'écran ouvert se redessine (photos.js appelle cette fonction). */
function rafraichir() {
  if (S.route === "stockage" || (S.route === "reglages" && !S.rgForm)) render();
}
if (typeof window != "undefined") { window.Noyau = window.Noyau || {}; window.Noyau.photosEcrans = { rafraichir }; }

export default [
  { id: "stockage", titre: "Espace photos", rubrique: "plus", rendu: () => ecranStockage() },
];
