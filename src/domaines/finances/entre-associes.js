// Apiviz — entre associés à l'écran (chantier des écrans, étape 7, v5.29). Règles : associes.js. Base : migration 017.
//   - Achat : « Acheté par » et « Payé avec » (fonds propres d'un associé, ou trésorerie de la société).
//   - Vente : « Vendu par » et, si elle est payée, « Argent récolté par » (un associé, ou la société).
//   - Gestion : la carte « Entre associés » en tête (qui doit combien à qui pour être à égalité) ; « Voir le détail »
//     ouvre l'écran « Entre associés » (v5.32, maquettes du 12 nov. 2026) : le solde, ce que chacun a avancé, l'argent
//     de vente à verser à la trésorerie, les derniers mouvements, et « Noter le remboursement » / « Noter le versement »
//     (table reglements_associes, migration 020 ; sans elle, l'écran se lit mais ne note rien).
//   - Réglages : la liste des associés (partagée par toute l'exploitation).
// Par défaut, l'associé est le prénom donné sur cet appareil (Réglages › Toi, v5.28).
// Globales lues à l'appel : S, cfg, esc, eur, sheet, $sheet, $sheetForm, saveCfg, render, ER, HL, shell, go, write, sb, today, EX.
import { SOCIETE, estSociete, associesConnus, soldesAssocies, reglementEntreAssocies, aVerserALaSociete, mouvementsAssocies } from "./associes.js";

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

// ---------- Écran « Entre associés » (v5.32) ----------
const sans020 = () => !!S.absentes?.has("reglements");
const phraseSolde = (noms, soldes, r) => (r ? `${r.de} doit ${eur(r.montant)} à ${r.a} pour être à égalité.`
  : noms.length === 2 ? "À égalité entre associés : rien à régler."
  : noms.length === 1 ? (soldes[0].solde > 0 ? `La société te doit ${eur(soldes[0].solde)}.` : soldes[0].solde < 0 ? `Tu dois ${eur(-soldes[0].solde)} à la société.` : "Tu es à jour avec la société.")
  : "Chacun règle son solde avec la société.");

export function ecranAssocies() {
  const noms = associes(), soldes = soldesAssocies(S.d, noms), r = reglementEntreAssocies(soldes);
  const verser = aVerserALaSociete(soldes), mvts = mouvementsAssocies(S.d);
  const ecrire = !sans020() && !(typeof EX != "undefined" && EX.lecteur());
  const tete = !noms.length ? `<section class="card">${sansAssocie}<button type="button" class="btn" data-act="eaassocies">Noter les associés</button></section>`
    : `<section class="ea-solde" aria-label="Solde entre associés">
        <p class="ea-oeil">${r ? "Pour être à égalité" : "Entre associés"}</p>
        ${r ? `<p class="ea-montant">${esc(eur(r.montant))}</p><p class="ea-qui">${esc(`${r.de} doit à ${r.a}`)}</p>` : `<p class="ea-phrase">${esc(phraseSolde(noms, soldes, r))}</p>`}
        ${r && ecrire ? `<button type="button" class="btn ea-miel" data-act="earegler">Noter le remboursement</button>` : ""}
      </section>`;
  const tuiles = soldes.length ? `<section class="ea-tuiles">${soldes.map((x) => `<div class="ea-tuile"><span class="small">Avancé par ${esc(x.nom)}</span>
      <b>${esc(eur(x.avance))}</b><span class="small">${x.encaisse ? `a récolté ${esc(eur(x.encaisse))} de ventes` : "fonds propres"}</span></div>`).join("")}</section>` : "";
  const aVerser = verser.map((v) => `<div class="ea-verser"><p>${esc(`${eur(v.montant)} de ventes récoltés par ${v.nom} sont à verser à la trésorerie.`)}</p>
      ${ecrire ? `<button type="button" class="btn" data-act="eaverser" data-v="${esc(v.nom)}">Noter le versement</button>` : ""}</div>`).join("");
  const liste = mvts.length ? `<h2 class="u-titre">Derniers mouvements</h2><ul class="ea-mvts">${mvts.map((m) => `<li><span class="ea-mvt-t"><b>${esc(m.titre)}</b>
      <span class="small">${esc(m.detail)}${m.attente ? " · en attente" : ""}</span></span>
      <b class="ea-mvt-m ${m.signe > 0 ? "good" : ""}">${m.signe > 0 ? "+" : ""}${esc(eur(m.montant))}</b></li>`).join("")}</ul>` : "";
  // En tête, « Associés » (la liste) plutôt qu'un retour à Gestion, qui n'est plus au menu depuis la navigation par catégories.
  shell("Entre associés", "Qui a avancé quoi, et ce qu'il reste à régler", noms.length ? `<button type="button" class="btn" data-act="eaassocies">Associés</button>` : "",
    `<div class="ea-ecran">${tete}${tuiles}${aVerser}${liste}
      <p class="small ea-regle">Sur toute la durée, à parts égales. Ce qu'un associé avance de ses fonds propres, la société le lui doit ;
      l'argent de vente qu'il garde, il le doit à la société. Les achats payés par la trésorerie et les ventes à encaisser ne comptent pour personne.
      ${sans020() ? "Noter un remboursement arrivera avec la mise à jour de la base." : ""}</p>
    </div>`);
}

/** Feuille « Noter un remboursement » ou « Noter un versement à la société ». */
function feuilleReglement(pre) {
  const noms = associes(), options = [...noms.map((x) => [x, x]), [SOCIETE, "La société (trésorerie)"]];
  sheet({
    title: pre.a === SOCIETE ? "Noter un versement" : "Noter un remboursement",
    intro: pre.a === SOCIETE ? "L'argent de vente remis à la trésorerie de la société." : "L'argent remis d'un associé à l'autre pour être à égalité.",
    fields: [
      { name: "de", label: "De", type: "select", options, value: pre.de || noms[0] },
      { name: "a", label: "À", type: "select", options, value: pre.a || noms[1] || SOCIETE },
      { name: "montant", label: "Montant (€)", type: "number", step: "0.01", min: "0.01", value: pre.montant ?? "", required: true },
      { name: "date_reglement", label: "Date", type: "date", value: today(), required: true },
      { name: "note", label: "Note (facultatif)", value: "", list: ["Virement", "Espèces", "Chèque"] },
    ],
    label: "Noter",
    submit: (v) => {
      const montant = Math.round(Number(String(v.montant).replace(",", ".")) * 100) / 100;
      if (!(montant > 0)) throw new Error("Indique un montant.");
      if (String(v.de).trim().toLowerCase() === String(v.a).trim().toLowerCase()) throw new Error("Choisis deux personnes différentes.");
      const ligne = { id: crypto.randomUUID(), de: v.de, a: v.a, montant, date_reglement: v.date_reglement || today(), note: String(v.note || "").trim() };
      return write(sb.from("reglements_associes").insert(ligne), estSociete(v.a) ? "Versement noté" : "Remboursement noté");
    },
  });
}
function regler() {
  const r = reglementEntreAssocies(soldesAssocies(S.d, associes()));
  feuilleReglement(r ? { de: r.de, a: r.a, montant: r.montant } : {});
}
function verser(nom) {
  const v = aVerserALaSociete(soldesAssocies(S.d, associes())).find((x) => x.nom === nom);
  feuilleReglement({ de: nom, a: SOCIETE, montant: v?.montant });
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
// Rubrique de l'écran dans la barre du bas : « Menu », comme les autres écrans de Finances (navigation.js, v5.32).
export const actions = { eadetail: () => go("associes"), eaassocies: feuilleAssocies, earegler: regler, eaverser: verser };
