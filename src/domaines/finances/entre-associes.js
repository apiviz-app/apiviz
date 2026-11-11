// Apiviz — entre associés à l'écran (chantier des écrans, étape 7, v5.29). Règles : associes.js. Base : migration 017.
//   - Achat : « Acheté par » et « Payé avec » (fonds propres d'un associé, ou trésorerie de la société).
//   - Vente : « Vendu par » et, si elle est payée, « Argent récolté par » (un associé, ou la société).
//   - Gestion : la carte « Entre associés » en tête (qui doit combien à qui pour être à égalité) et son détail.
//   - Réglages : la liste des associés (partagée par toute l'exploitation).
// Par défaut, l'associé est le prénom donné sur cet appareil (Réglages › Toi, v5.28).
// Globales lues à l'appel : S, cfg, esc, eur, sheet, $sheet, $sheetForm, saveCfg, render, ER, HL.
import { SOCIETE, estSociete, associesConnus, soldesAssocies, reglementEntreAssocies } from "./associes.js";

const moi = () => { try { return String(localStorage.getItem(`apiviz-prenom-${S.session?.user?.email || ""}`) || "").trim(); } catch { return ""; } };
const associes = () => associesConnus(S.d || {}, typeof cfg == "function" ? cfg() : {}, moi());
const option = (v, t, choisi) => `<option value="${esc(v)}" ${v === choisi ? "selected" : ""}>${esc(t)}</option>`;
const sansAssocie = '<p class="small ea-aide">Note les associés dans Réglages › Associés pour dire qui a acheté ou vendu.</p>';

// ---------- Achat ----------
function champsAchat(depense) {
  const noms = associes();
  if (!noms.length) return sansAssocie;
  const qui = depense?.achete_par || moi() || noms[0];
  const avec = depense ? (estSociete(depense.paye_par) ? SOCIETE : depense.paye_par || qui) : qui;
  const autres = depense?.paye_par && !estSociete(depense.paye_par) && !noms.includes(depense.paye_par) ? [depense.paye_par] : [];
  return `<label>Acheté par<select name="achete_par">${noms.map((x) => option(x, x, qui)).join("")}${depense && !depense.achete_par ? option("", "Non précisé", "") : ""}</select></label>
    <label>Payé avec<select name="paye_par">${[...noms, ...autres].map((x) => option(x, `Fonds propres de ${x}`, avec)).join("")}${option(SOCIETE, "Trésorerie de la société", avec)}</select></label>`;
}

// ---------- Vente ----------
function champsVente() {
  const v = S.vente, noms = associes(), form = document.querySelector('form[data-form="vente"]');
  if (!v || !form) return;
  if (!noms.length) { form.querySelector(".field")?.insertAdjacentHTML("beforebegin", sansAssocie); return; }
  v.vendu_par ??= moi() || noms[0];
  v.encaisse_par ??= v.vendu_par;
  const paiement = [...form.querySelectorAll(":scope > .field")].find((f) => f.textContent.trim().startsWith("Paiement"));
  paiement?.insertAdjacentHTML("beforebegin", `<label>Vendu par<select id="s_vendu">${noms.map((x) => option(x, x, v.vendu_par)).join("")}</select></label>`);
  const mode = document.getElementById("s_mode")?.closest("label");
  if (v.paye && mode) mode.insertAdjacentHTML("afterend", `<label>Argent récolté par<select id="s_encaisse">${noms.map((x) => option(x, x, v.encaisse_par)).join("")}${option(SOCIETE, "Compte de la société", v.encaisse_par)}</select></label>`);
}

// ---------- Gestion ----------
function carteGestion() {
  const noms = associes(), tete = document.querySelector(".wrap > .head");
  if (!tete || noms.length < 1) return;
  const soldes = soldesAssocies(S.d, noms), r = reglementEntreAssocies(soldes);
  const phrase = r ? `${r.de} doit ${eur(r.montant)} à ${r.a} pour être à égalité.`
    : noms.length === 2 ? "À égalité entre associés : rien à régler."
    : noms.length === 1 ? (soldes[0].solde > 0 ? `La société te doit ${eur(soldes[0].solde)}.` : soldes[0].solde < 0 ? `Tu dois ${eur(-soldes[0].solde)} à la société.` : "Tu es à jour avec la société.")
    : "Chacun règle son solde avec la société.";
  tete.insertAdjacentHTML("afterend", `<section class="ea-carte" aria-label="Entre associés"><p class="ea-oeil">Entre associés</p>
    <p class="ea-phrase">${esc(phrase)}</p><div><button type="button" class="btn ea-ghost" data-act="eadetail">Voir le détail</button></div></section>`);
}

function detail() {
  const noms = associes(), soldes = soldesAssocies(S.d, noms), r = reglementEntreAssocies(soldes);
  const pl = (k, mot) => `${k} ${mot}${k > 1 ? "s" : ""}`;
  const lignes = soldes.map((s) => `<div class="ea-ligne"><b>${esc(s.nom)}</b>
      <span>${esc(pl(s.achats, "achat"))} · a avancé <b>${esc(eur(s.avance))}</b> de ses fonds propres</span>
      <span>${esc(pl(s.ventes, "vente"))} · a récolté <b>${esc(eur(s.encaisse))}</b></span>
      <span class="${s.solde > 0 ? "good" : s.solde < 0 ? "watch" : ""}">${s.solde > 0 ? `La société lui doit ${esc(eur(s.solde))}` : s.solde < 0 ? `Doit ${esc(eur(-s.solde))} à la société` : "À jour avec la société"}</span></div>`).join("");
  $sheetForm.onsubmit = (e) => e.preventDefault();
  $sheetForm.innerHTML = `<div class="u-entete"><h2>Entre associés</h2><button type="button" class="link" data-act="closesheet">Fermer</button></div>
    ${r ? `<p class="ea-phrase-f">${esc(`${r.de} doit ${eur(r.montant)} à ${r.a}`)}</p>` : ""}
    ${lignes || sansAssocie}
    <p class="small">Sur toute la durée, à parts égales. Les achats payés par la trésorerie de la société et l'argent de vente
    gardé sur son compte ne comptent pour personne. Les ventes à encaisser ne comptent pas encore.</p>`;
  $sheet.showModal();
}

// ---------- Réglages ----------
function blocReglages() {
  const grille = document.querySelector(".wrap .g-blocs");
  if (!grille || grille.querySelector("#eaAssocies")) return;
  const l = Array.isArray(cfg().associes) ? cfg().associes : [];
  const html = ER.bloc("", "Associés", l.length ? l.join(", ") : "À noter", l.length ? "Proposés dans les achats et les ventes" : "Pour savoir qui a acheté, vendu, encaissé", "", "", "eaassocies")
    .replace('class="n4-g g-bloc"', 'class="n4-g g-bloc" id="eaAssocies"');
  (grille.querySelector("#rgToi") || grille.firstElementChild)?.insertAdjacentHTML(grille.querySelector("#rgToi") ? "afterend" : "beforebegin", html);
}
function feuilleAssocies() {
  const l = associes();
  sheet({
    title: "Associés",
    intro: "Un prénom par ligne. Ils sont proposés dans les achats et les ventes, pour toute l'exploitation.",
    fields: [{ name: "associes", label: "Prénoms", type: "textarea", value: l.join("\n") }],
    submit: (v) => saveCfg({ associes: String(v.associes || "").split("\n").map((x) => x.trim()).filter((x) => x && !estSociete(x)).slice(0, 12) }, "Associés enregistrés"),
  });
}

/** Installation : enveloppe le formulaire d'achat, la lecture et l'envoi de la vente (après app.js, v3.js, offline.js). */
export function installer() {
  if (typeof window == "undefined" || window.depenseForm?.eaAssocies) return;
  const achat = window.depenseForm;
  window.depenseForm = Object.assign(function (depense, prerempli) {
    achat(depense, prerempli);
    $sheetForm.querySelector(".actions")?.insertAdjacentHTML("beforebegin", champsAchat(depense));
  }, { eaAssocies: true });
  const lire = window.readSaleForm;
  window.readSaleForm = function () {
    lire();
    const a = document.getElementById("s_vendu"), b = document.getElementById("s_encaisse");
    if (S.vente && a) S.vente.vendu_par = a.value;
    if (S.vente && b) S.vente.encaisse_par = b.value;
  };
  if (typeof HL != "undefined") {
    const rpc = HL.rpc;
    HL.rpc = (nom, args) => {
      if (nom === "creer_vente" && S.vente && S.route === "vente") {
        const v = S.vente;
        args = { ...args, p: { ...args.p, vendu_par: v.vendu_par || "", encaisse_par: v.paye ? v.encaisse_par || "" : "" } };
      }
      return rpc(nom, args);
    };
  }
}

export const completerVente = champsVente;
/** « Acheté par » et « Payé avec », aussi pour l'achat en plusieurs lignes (v5.30, achat.js). */
export const champsAchatAssocies = champsAchat;
export const completerGestion = carteGestion;
export const completerReglages = blocReglages;
export const actions = { eadetail: detail, eaassocies: feuilleAssocies };
