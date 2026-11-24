// Apiviz — remises et offres de vente : écrans et compléments (v5.77, migration 037, maquette « Remises et offres » du
// 24 nov. 2026, validée par Pierre-Louis : deux offres ne s'additionnent pas, le motif d'une remise est facultatif).
//   - Nouvelle vente et caisse du marché : l'offre la plus avantageuse s'applique toute seule (ligne verte), un coup de
//     pouce dit quand un article de plus ferait gagner une offre, « Ajouter une remise » ouvre la feuille de la remise
//     ponctuelle (%, €, article offert ; motif facultatif). Le total suit.
//   - Produits › ⋯ › Offres de vente (écran « promotions ») : une carte par offre, interrupteur, usage ; « Créer une
//     offre » (écran « promotion ») avec les quatre modèles, les produits, pour qui, quand, le nom et l'aperçu.
// Les remises partent avec la vente dans creer_vente (037), réparties sur les lignes. Règles pures : remises-regles.js.
// Globales d'app.js lues à l'appel : S, esc, eur, eur0, today, shell, render, go, redessiner, toast, fail, write, sb,
// $sheet, $sheetForm, readSaleForm, cfg, twoStep, emptyState, HL. Styles : styles/72-remises.css.
import * as R from "./remises-regles.js";

const e = (t) => esc(t);
const lecteur = () => document.documentElement.classList.contains("lecteur");
/** La base a la migration 037 (la table promotions a pu être lue). */
export const disponible = () => !(S.absentes && S.absentes.has("promotions"));
const promotions = () => (disponible() ? S.d.promotions || [] : []);
const lotDe = (id) => (S.d.lots || []).find((l) => l.id === id);
const libelleLot = (lot) => (lot ? (window.Regles?.produits ? Regles.produits.libelleLot(lot) : lot.code) : "?");
const lignesDe = (q) => Object.entries(q || {}).filter(([, x]) => Number(x) > 0).map(([lot_id, quantite]) => ({ lot_id, quantite: Number(quantite) }));
const CADEAU = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18"/><path d="M12 8c-2-4-6-4-6-1.5S10 8 12 8zM12 8c2-4 6-4 6-1.5S14 8 12 8z"/></svg>';
const POURCENT = '<span class="rm-pct" aria-hidden="true">%</span>';

// ---------- Contexte d'une vente en cours (écran « vente » ou caisse) ----------
// La caisse (caisse.js) donne ses lignes et son client ici, au chargement : pas d'import dans l'autre sens.
let caisse = { lignes: () => [], client: () => null };
export const fournirCaisse = (f) => { caisse = f; };

function contexte(ou) {
  if (ou === "caisse") {
    const st = (S.caisse ||= { q: {}, mode: "" });
    return { lignes: caisse.lignes(), client: caisse.client(), date: today(), manuelle: st.remise || null, etat: st };
  }
  const v = S.vente || { q: {} };
  const champ = document.getElementById("s_client");
  const id = (champ && champ.value) || v.client_id;
  return { lignes: lignesDe(v.q), client: (S.d.clients || []).find((c) => c.id === id) || null, date: v.date_vente || today(), manuelle: v.remise || null, etat: v };
}

/** Le calcul complet d'une vente en cours. */
export function calcul(ou, manuelle) {
  const c = contexte(ou);
  return R.calculerVente({ lignes: c.lignes, lots: S.d.lots || [], promotions: promotions(), client: c.client, date: c.date, manuelle: disponible() ? (manuelle === undefined ? c.manuelle : manuelle) : null });
}

function detailOffre(o) {
  const p = o.promotion;
  if (p.type === "xy") return `${o.offerts} offert${o.offerts > 1 ? "s" : ""}, le moins cher`;
  if (p.type === "lot") return `${p.quantite} pour ${eur(p.prix_lot)}`;
  return p.mode === "pct" ? `−${String(p.valeur).replace(".", ",")} %` : `−${eur(p.valeur)}`;
}

/** Bloc des remises sous le panier : offre, coup de pouce, remise ponctuelle, « Ajouter une remise », récapitulatif. */
export function blocRemises(ou) {
  const c = contexte(ou);
  if (!c.lignes.length) return "";
  const v = calcul(ou);
  const reste = (id) => { const l = lotDe(id); const pris = c.lignes.filter((x) => x.lot_id === id).reduce((t, x) => t + x.quantite, 0); return l ? Number(l.pots_restants) - pris : null; };
  const pouce = disponible() ? R.prochaineOffre(promotions(), c.lignes, S.d.lots || [], { client: c.client, date: c.date }, reste) : null;
  const offre = v.offre ? `<div class="rm-offre">${CADEAU}<span class="rm-t"><b>Offre « ${e(v.offre.promotion.nom)} »</b><span class="small">${e(detailOffre(v.offre))}</span></span><b class="rm-m">−${e(eur(v.offre.remise))}</b></div>` : "";
  const man = v.manuelle ? `<div class="rm-manuelle">${POURCENT}<span class="rm-t"><b>Remise ${e(v.manuelle.libelle)}</b>${v.manuelle.motif ? `<span class="small">${e(v.manuelle.motif)}</span>` : ""}</span><b class="rm-m">−${e(eur(v.manuelle.remise))}</b>
    ${lecteur() ? "" : `<button type="button" class="link" data-act="rmremise" data-v="${ou}">Modifier</button>`}</div>` : "";
  const ajout = !v.manuelle && !lecteur() && disponible() ? `<button type="button" class="rm-ajout" data-act="rmremise" data-v="${ou}">${POURCENT}Ajouter une remise</button>` : "";
  // À la caisse, le total du panier est déjà le total net : pas de récapitulatif en double.
  const recap = v.economie > 0 && ou !== "caisse" ? `<div class="rm-recap"><p><span>Sous-total</span><span>${e(eur(v.brut))}</span></p>
    ${v.offre ? `<p class="rm-vert"><span>Offre</span><span>−${e(eur(v.offre.remise))}</span></p>` : ""}
    ${v.manuelle ? `<p class="rm-vert"><span>Remise ${e(v.manuelle.libelle)}</span><span>−${e(eur(v.manuelle.remise))}</span></p>` : ""}
    <p class="rm-total"><b>Total à payer</b><b>${e(eur(v.total))}</b></p>
    <p class="small">${c.client && ou === "vente" ? e(c.client.nom) + " économise" : "Le client économise"} ${e(eur(v.economie))}.</p></div>` : "";
  if (!offre && !man && !ajout && !pouce && !recap) return "";
  const corps = `${offre}${pouce ? `<p class="rm-pouce">${e(pouce.texte)}</p>` : ""}${man}${ajout}${recap}`;
  // À la caisse, le bloc se range dans le panier, juste au-dessus du total.
  return ou === "caisse" ? `<div class="rm-bloc rm-dans" aria-label="Remises" aria-live="polite">${corps}</div>`
    : `<section class="card rm-bloc" aria-label="Remises" aria-live="polite">${corps}</section>`;
}

/** Écran « vente » (dernier complément) : le bloc sous les produits, le total net dans la barre d'enregistrement. */
export function completerVente() {
  if (S.route !== "vente" || !S.vente) return;
  const form = document.querySelector('form[data-form="vente"]');
  if (!form) return;
  form.querySelector(".rm-bloc")?.remove();
  const html = blocRemises("vente");
  const carte = [...form.querySelectorAll("section.card")].find((s) => s.querySelector('[data-act="sstep"]'));
  if (html) (carte ? carte.insertAdjacentHTML("afterend", html) : form.querySelector(".sv-barre, .btn.main")?.insertAdjacentHTML("beforebegin", html));
  const v = calcul("vente");
  const b = form.querySelector(".sv-total b");
  if (b) b.textContent = eur(v.total);
  const champ = document.getElementById("s_client");
  if (champ && !champ.dataset.rm) {
    champ.dataset.rm = "1";
    champ.addEventListener("change", () => { if (S.route === "vente") { readSaleForm(); redessiner("vente"); } });
  }
}

/** Les remises de la vente en cours ajoutées aux paramètres de creer_vente (lignes remisées et détail). */
export function avecRemises(ou, p) {
  if (!disponible()) return p;
  const c = contexte(ou);
  const v = R.calculerVente({ lignes: p.lignes || [], lots: S.d.lots || [], promotions: promotions(), client: (S.d.clients || []).find((x) => x.id === p.client_id) || c.client, date: p.date_vente || c.date, manuelle: c.manuelle });
  if (!(v.economie > 0)) return p;
  return { ...p, lignes: v.lignes, ...v.champs };
}

let installe = false;
/** Une fois : la vente de l'écran « vente » part avec ses remises (même manière que v3.js et entre-associes.js). */
export function installer() {
  if (installe || typeof window == "undefined" || typeof HL == "undefined") return;
  installe = true;
  const rpc = HL.rpc;
  HL.rpc = (nom, args) => {
    if (nom === "creer_vente" && S.vente && S.route === "vente" && args?.p) args = { ...args, p: avecRemises("vente", args.p) };
    return rpc(nom, args);
  };
}

// ---------- Feuille « Remise sur cette vente » ----------
let F = null; // { ou, mode, valeur, cible, motif, autre }

function lireFeuille() {
  if (!F) return;
  const v = document.getElementById("rm_val"), m = document.getElementById("rm_motif");
  if (v) F.valeur = v.value === "" ? "" : Number(String(v.value).replace(",", "."));
  // « Autre motif » tapé l'emporte ; sinon la puce choisie reste (le champ vide ne l'efface pas).
  if (m) { const t = m.value.trim(); F.motif = t || (R.MOTIFS.includes(F.motif) ? F.motif : ""); }
}

function dessinerFeuille() {
  const c = contexte(F.ou);
  const manuelle = { mode: F.mode, valeur: F.valeur, cible: F.cible, motif: F.motif };
  const avant = calcul(F.ou, null), apres = calcul(F.ou, manuelle);
  const puce = (act, v, txt, on) => `<button type="button" class="chip${on ? " on" : ""}" aria-pressed="${on}" data-act="${act}" data-v="${e(v)}">${e(txt)}</button>`;
  const lignes = c.lignes.map((l) => ({ id: l.lot_id, nom: libelleLot(lotDe(l.lot_id)) }));
  let choix = "";
  if (F.mode === "pct") {
    choix = `<div class="rm-champ"><span class="lab">Remise</span><div class="rm-puces">${[5, 10, 15, 20].map((x) => puce("rmval", x, `${x} %`, !F.autre && Number(F.valeur) === x)).join("")}${puce("rmautre", "1", "Autre…", F.autre)}</div>
      ${F.autre ? `<label class="rm-autre">Pourcentage<input id="rm_val" type="number" inputmode="decimal" min="0" max="100" step="0.5" value="${e(F.valeur)}"></label>` : ""}</div>`;
  } else if (F.mode === "eur") {
    choix = `<label class="rm-champ">Montant de la remise (€)<input id="rm_val" type="number" inputmode="decimal" min="0" step="0.01" value="${e(F.valeur)}"></label>`;
  } else {
    choix = `<div class="rm-champ"><span class="lab">Article offert</span><div class="rm-puces">${lignes.map((l) => puce("rmcible", l.id, l.nom, F.cible === l.id)).join("")}</div></div>`;
  }
  const sur = F.mode !== "article" && lignes.length > 1 ? `<div class="rm-champ"><span class="lab">Sur</span><div class="rm-puces">${puce("rmcible", "", "Toute la vente", !F.cible)}${lignes.map((l) => puce("rmcible", l.id, l.nom, F.cible === l.id)).join("")}</div></div>` : "";
  const motifs = `<div class="rm-champ"><span class="lab">Pourquoi ? <span class="small">(facultatif, retrouvé dans le reçu)</span></span><div class="rm-puces">${R.MOTIFS.map((x) => puce("rmmotif", x, x, F.motif === x)).join("")}</div>
    <label class="rm-autre">Autre motif<input id="rm_motif" maxlength="60" autocomplete="off" value="${e(R.MOTIFS.includes(F.motif) ? "" : F.motif)}" placeholder="Ex. dépôt-vente"></label></div>`;
  const centimes = Math.round(apres.total * 100) % 100;
  const arrondi = apres.manuelle && centimes ? `<button type="button" class="link" data-act="rmarrondir">Arrondir à ${e(eur(Math.floor(apres.total)))}</button>` : "";
  $sheetForm.onsubmit = (ev) => { ev.preventDefault(); appliquer(); };
  $sheetForm.innerHTML = `<div class="u-entete"><h2>Remise sur cette vente</h2></div>
    <div class="seg rm-seg" role="group" aria-label="Type de remise" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      ${[["pct", "En %"], ["eur", "En €"], ["article", "Offrir un article"]].map(([m, t]) => `<button type="button" class="${F.mode === m ? "on" : ""}" aria-pressed="${F.mode === m}" data-act="rmmode" data-v="${m}">${t}</button>`).join("")}</div>
    ${choix}${sur}${motifs}
    <div class="rm-apercu">
      <p><span>${avant.offre ? "Après l’offre" : "Avant la remise"}</span><span>${e(eur(avant.total))}</span></p>
      ${apres.manuelle ? `<p class="rm-vert"><span>Remise ${e(apres.manuelle.libelle)}</span><span>−${e(eur(apres.manuelle.remise))}</span></p>` : ""}
      <p class="rm-total"><b>Nouveau total</b><b>${e(eur(apres.total))}</b></p>${arrondi}</div>
    <div class="actions"><button class="btn main block" ${apres.manuelle ? "" : "disabled"}>Appliquer la remise</button></div>
    ${c.manuelle ? '<button type="button" class="link crit" data-act="rmretirer">Retirer la remise</button>' : ""}`;
  $sheetForm.querySelectorAll("#rm_val, #rm_motif").forEach((el) => el.addEventListener("input", () => {
    const pos = el.selectionStart, id = el.id;
    lireFeuille();
    if (id === "rm_motif") return; // le motif ne change pas les montants
    dessinerFeuille();
    const n = document.getElementById(id);
    if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} }
  }));
}

function ouvrirRemise(ou) {
  if (!disponible()) return toast("La base doit être mise à jour pour faire une remise (migration 037).", true);
  if (ou === "vente") readSaleForm();
  const c = contexte(ou);
  if (!c.lignes.length) return toast("Ajoute d’abord un produit à la vente.");
  const r = c.manuelle;
  F = r ? { ou, mode: r.mode, valeur: r.valeur, cible: r.cible || "", motif: r.motif || "", autre: r.mode === "pct" && ![5, 10, 15, 20].includes(Number(r.valeur)) }
    : { ou, mode: "pct", valeur: 10, cible: "", motif: "", autre: false };
  dessinerFeuille();
  $sheetForm.classList.add("rm-feuille");
  $sheet.addEventListener("close", () => { $sheetForm.classList.remove("rm-feuille"); F = null; }, { once: true });
  if (!$sheet.open) $sheet.showModal();
}

function garder(remise) {
  const c = contexte(F.ou);
  c.etat.remise = remise;
  const ou = F.ou;
  $sheet.close();
  if (ou === "vente") redessiner("vente"); else render();
}

function appliquer() {
  lireFeuille();
  const r = { mode: F.mode, valeur: F.valeur, cible: F.cible, motif: String(F.motif || "").trim() };
  if (!calcul(F.ou, r).manuelle) return toast("Choisis le montant de la remise.");
  garder(r);
}

// ---------- Offres de vente (liste) ----------
const STATUTS = { active: ["Active", "rm-actif"], prevue: ["Prévue", "rm-prevu"], finie: ["Terminée", "rm-coupe"], coupee: ["Coupée", "rm-coupe"] };

export function ecranListe() {
  const d = S.d, jour = today(), annee = Number(jour.slice(0, 4));
  if (!disponible()) {
    return shell("Offres de vente", "", "", '<p class="notice">La base doit être mise à jour (migration 037) pour créer des offres. Tes ventes continuent comme avant.</p>');
  }
  const ps = [...promotions()].sort((a, b) => ["active", "prevue", "finie", "coupee"].indexOf(R.statut(a, jour)) - ["active", "prevue", "finie", "coupee"].indexOf(R.statut(b, jour)) || String(a.nom).localeCompare(String(b.nom), "fr"));
  const ventesAnnee = (d.ventes || []).filter((v) => Number(String(v.date_vente).slice(0, 4)) === annee);
  const offert = R.remisesAccordees(ventesAnnee);
  const actives = ps.filter((p) => R.statut(p, jour) === "active").length, prevues = ps.filter((p) => R.statut(p, jour) === "prevue").length;
  const sous = [actives ? `${actives} active${actives > 1 ? "s" : ""}` : "Aucune active", prevues ? `${prevues} prévue${prevues > 1 ? "s" : ""}` : "", offert.total ? `${eur0(offert.total)} de remises en ${annee}` : ""].filter(Boolean).join(" · ");
  const noms = Object.fromEntries((d.clients || []).map((c) => [c.id, c.nom]));
  const carte = (p) => {
    const s = R.statut(p, jour), [txt, cls] = STATUTS[s], u = R.usage(p, d.ventes, d.lignes), on = p.actif !== false;
    return `<section class="card rm-carte${on ? "" : " rm-off"}">
      <div class="rm-carte-h">
        <button type="button" class="rm-carte-b" data-act="rmmodifier" data-v="${e(p.id)}" ${lecteur() ? "disabled" : ""}>
          <span class="rm-ligne"><span class="rm-tag ${cls}">${txt}</span><span class="small">${e(R.periode(p))}</span></span>
          <b>${e(p.nom)}</b><span class="small">${e(R.resume(p, noms))}</span></button>
        ${lecteur() ? "" : `<button type="button" class="rm-inter${on ? " on" : ""}" role="switch" aria-checked="${on}" aria-label="${on ? "Couper" : "Activer"} l’offre ${e(p.nom)}" data-act="rmbascule" data-v="${e(p.id)}"><span></span></button>`}
      </div>
      ${u.fois ? `<p class="rm-usage"><span><b>${u.fois}</b> vente${u.fois > 1 ? "s" : ""}</span><span><b>${e(eur0(u.offert))}</b> offerts</span><span><b>${e(eur0(u.ventes))}</b> encaissés</span></p>` : ""}
    </section>`;
  };
  shell("Offres de vente", sous, lecteur() ? "" : '<button type="button" class="btn main" data-act="rmnouvelle">Créer une offre</button>',
    ps.length ? `<p class="small rm-regle">Une seule offre par vente : apiviz garde la plus avantageuse pour le client.</p>${ps.map(carte).join("")}`
      : emptyState("Prépare tes offres", "« 4 achetés, 1 offert », un coffret à prix rond, −10 % au marché de Noël, un prix revendeur : l’offre s’applique toute seule pendant la vente.", lecteur() ? "" : "Créer une offre", "rmnouvelle"));
}

// ---------- Créer ou modifier une offre ----------
const NEUVE = () => ({ type: "xy", nom: "", nomPerso: false, produits: [], achetes: 4, offerts: 1, quantite: 3, prix_lot: "", mode: "pct", valeur: 10, minimum: "", clients: [], cercles: [], qui: "tous", quand: "toujours", debut: "", fin: "", actif: true });

function lireOffre() {
  const p = S.promo;
  if (!p) return;
  const val = (id) => document.getElementById(id);
  if (val("rm_nom")) { const n = val("rm_nom").value; if (n !== R.nomPropose(p)) { p.nom = n; p.nomPerso = true; } }
  if (val("rm_prix")) p.prix_lot = val("rm_prix").value;
  if (val("rm_valeur")) p.valeur = val("rm_valeur").value;
  if (val("rm_min")) p.minimum = val("rm_min").value;
  if (val("rm_debut")) p.debut = val("rm_debut").value;
  if (val("rm_fin")) p.fin = val("rm_fin").value;
}

const prixMoyen = (p) => {
  const ls = (S.d.lots || []).filter((l) => !p.produits.length || p.produits.includes(R.famille(l)));
  return ls.length ? ls.reduce((t, l) => t + Number(l.prix || 0), 0) / ls.length : 0;
};

export function ecranOffre() {
  if (!S.promo) S.promo = NEUVE();
  const p = S.promo;
  if (!p.nomPerso) p.nom = R.nomPropose(p);
  const puce = (act, v, txt, on, k = "") => `<button type="button" class="chip${on ? " on" : ""}" aria-pressed="${on}" data-act="${act}" data-v="${e(v)}"${k ? ` data-k="${e(k)}"` : ""}>${on && act === "rmproduit" ? "✓ " : ""}${e(txt)}</button>`;
  const pas = (cle, txt, min, max) => `<div class="stepper rm-pas"><div><b>${txt}</b></div><div class="ctl"><button type="button" aria-label="${txt} : un de moins" data-act="rmpas" data-k="${cle}" data-v="-1" ${Number(p[cle]) <= min ? "disabled" : ""}>−</button><span>${p[cle]}</span><button type="button" aria-label="${txt} : un de plus" data-act="rmpas" data-k="${cle}" data-v="1" ${Number(p[cle]) >= max ? "disabled" : ""}>+</button></div></div>`;
  const fams = R.familles(S.d.lots || []);
  const produits = `<div class="rm-champ"><span class="lab">Produits concernés</span><div class="rm-puces">${puce("rmproduit", "", "Tous les produits", !p.produits.length)}${fams.map((f) => puce("rmproduit", f.cle, f.libelle, p.produits.includes(f.cle))).join("")}</div>
    ${p.type === "xy" ? '<span class="small">Les variétés se mélangent : 2 pots de printemps et 2 de châtaignier comptent pour 4. Le moins cher est offert.</span>' : ""}</div>`;
  const montant = `<div class="seg" role="group" aria-label="En % ou en €" style="grid-template-columns:repeat(2,minmax(0,1fr))">${[["pct", "En %"], ["eur", "En €"]].map(([m, t]) => `<button type="button" class="${p.mode === m ? "on" : ""}" aria-pressed="${p.mode === m}" data-act="rmmodeoffre" data-v="${m}">${t}</button>`).join("")}</div>
    <label>Remise (${p.mode === "pct" ? "%" : "€"})<input id="rm_valeur" type="number" inputmode="decimal" min="0" ${p.mode === "pct" ? 'max="100" step="0.5"' : 'step="0.01"'} value="${e(p.valeur)}"></label>`;
  let params = "";
  if (p.type === "xy") params = `${produits}${pas("achetes", "Achetés", 1, 99)}${pas("offerts", "Offerts", 1, 99)}`;
  else if (p.type === "lot") params = `${produits}${pas("quantite", "Produits dans le lot", 2, 99)}<label>Prix du lot (€)<input id="rm_prix" type="number" inputmode="decimal" min="0" step="0.01" value="${e(p.prix_lot)}" placeholder="Ex. 25"></label>`;
  else if (p.type === "remise") params = `${montant}<label>À partir de (€ d’achat, facultatif)<input id="rm_min" type="number" inputmode="decimal" min="0" step="0.01" value="${e(p.minimum)}" placeholder="Ex. 30"></label>${produits}`;
  else params = `${montant}${produits}`;
  const cercles = (cfg().cercles || []), clients = (S.d.clients || []).filter((c) => c.nom !== "Vente au marché").sort((a, b) => String(a.nom).localeCompare(String(b.nom), "fr"));
  const qui = p.type === "client" ? "choix" : p.qui;
  const pourQui = `<div class="rm-champ"><span class="lab">Pour qui${p.type === "client" ? "" : ""}</span>
    ${p.type === "client" ? "" : `<div class="rm-puces">${puce("rmqui", "tous", "Tous les clients", qui === "tous")}${puce("rmqui", "choix", "Des cercles ou des clients…", qui === "choix")}</div>`}
    ${qui === "choix" ? `${cercles.length ? `<span class="small">Cercles</span><div class="rm-puces">${cercles.map((c) => puce("rmcercle", c, c, p.cercles.includes(c))).join("")}</div>` : ""}
      ${clients.length ? `<span class="small">Clients</span><div class="rm-puces rm-clients">${clients.map((c) => puce("rmclient", c.id, c.nom, p.clients.includes(c.id))).join("")}</div>` : '<span class="small">Aucun client enregistré.</span>'}` : ""}</div>`;
  const quand = `<div class="rm-champ"><span class="lab">Quand</span><div class="rm-puces">${puce("rmquand", "toujours", "Toujours", p.quand === "toujours")}${puce("rmquand", "periode", "Pendant une période", p.quand === "periode")}</div>
    ${p.quand === "periode" ? `<div class="rm-dates"><label>Du<input id="rm_debut" type="date" value="${e(p.debut)}"></label><label>Au<input id="rm_fin" type="date" value="${e(p.fin)}"></label></div>` : ""}</div>`;
  const ap = R.apercu(p, prixMoyen(p));
  shell(p.id ? "Modifier l’offre" : "Créer une offre", "S’applique toute seule à la vente.", '<button type="button" class="btn" data-act="rmannuler">Annuler</button>',
    `<form class="form rm-form" data-form="promotion" onsubmit="return false">
      <div class="rm-champ"><span class="lab">Modèle</span><div class="rm-types">${R.TYPES.map((t) => `<button type="button" class="rm-type${p.type === t.id ? " on" : ""}" aria-pressed="${p.type === t.id}" data-act="rmtype" data-v="${t.id}"><b>${t.titre}</b><span>${t.exemple}</span></button>`).join("")}</div></div>
      ${params}${pourQui}${quand}
      <label>Nom de l’offre<input id="rm_nom" maxlength="80" autocomplete="off" value="${e(p.nom)}"></label>
      <section class="rm-apercu-offre" aria-live="polite"><span class="rm-k">Aperçu pour le client</span><b>${e(ap.titre)}</b><span>${e(ap.detail)}</span></section>
      <div class="op-pied"><button type="button" class="btn main" data-act="rmenregistrer" ${S.busy ? "disabled" : ""}>${p.id ? "Enregistrer" : "Créer l’offre"}</button></div>
      ${p.id ? '<button type="button" class="link crit" data-act="rmsupprimer">Supprimer l’offre</button>' : ""}
    </form>`);
  document.querySelectorAll("#rm_prix, #rm_valeur, #rm_min").forEach((el) => el.addEventListener("change", () => { lireOffre(); render(); }));
}

const versOffre = (p) => {
  const n = NEUVE();
  return { ...n, ...p, nomPerso: true, produits: [...(p.produits || [])], clients: [...(p.clients || [])], cercles: [...(p.cercles || [])],
    achetes: p.achetes ?? n.achetes, offerts: p.offerts ?? n.offerts, quantite: p.quantite ?? n.quantite, prix_lot: p.prix_lot ?? "", mode: p.mode || "pct", valeur: p.valeur ?? n.valeur,
    minimum: Number(p.minimum) > 0 ? p.minimum : "", qui: (p.clients || []).length || (p.cercles || []).length ? "choix" : "tous", quand: p.debut || p.fin ? "periode" : "toujours", debut: p.debut || "", fin: p.fin || "" };
};

async function enregistrer() {
  lireOffre();
  const p = S.promo;
  const brut = { ...p, clients: p.type === "client" || p.qui === "choix" ? p.clients : [], cercles: p.type === "client" || p.qui === "choix" ? p.cercles : [],
    debut: p.quand === "periode" ? p.debut : "", fin: p.quand === "periode" ? p.fin : "", minimum: p.minimum || 0 };
  const err = R.validerPromotion(brut);
  if (err) return toast(err, true);
  const ligne = R.promotionAEnvoyer(brut);
  S.busy = true;
  try {
    const { id, ...reste } = ligne;
    // Nouvelle offre : identifiant donné par l'application (un envoi rejoué par la file ne la double pas).
    await write(id ? sb.from("promotions").update(reste).eq("id", id) : sb.from("promotions").insert({ id: crypto.randomUUID(), ...reste }), id ? "Offre enregistrée" : "Offre créée");
    S.promo = null;
    go("promotions");
  } catch (er) { fail(er); } finally { S.busy = false; }
}

const bascule = (liste, v) => (liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v]);

export const actions = {
  // Remise ponctuelle (vente et caisse).
  rmremise: (ou) => ouvrirRemise(ou === "caisse" ? "caisse" : "vente"),
  rmmode: (m) => { lireFeuille(); F.mode = m; F.autre = false; F.cible = ""; F.valeur = m === "pct" ? 10 : m === "eur" ? "" : ""; if (m === "article") { const l = contexte(F.ou).lignes; F.cible = l.length ? l.reduce((a, b) => (Number(lotDe(b.lot_id)?.prix) < Number(lotDe(a.lot_id)?.prix) ? b : a)).lot_id : ""; } dessinerFeuille(); },
  rmval: (v) => { lireFeuille(); F.valeur = Number(v); F.autre = false; dessinerFeuille(); },
  rmautre: () => { lireFeuille(); F.autre = true; dessinerFeuille(); document.getElementById("rm_val")?.focus(); },
  rmcible: (id) => { lireFeuille(); F.cible = id || ""; dessinerFeuille(); },
  rmmotif: (m) => { lireFeuille(); F.motif = F.motif === m ? "" : m; dessinerFeuille(); },
  rmarrondir: () => {
    lireFeuille();
    const r = { mode: F.mode, valeur: F.valeur, cible: F.cible, motif: F.motif };
    const apres = calcul(F.ou, r), avant = calcul(F.ou, null);
    const vise = Math.floor(apres.total);
    F.mode = "eur"; F.cible = ""; F.autre = false; F.valeur = Math.round((avant.total - vise) * 100) / 100;
    dessinerFeuille();
  },
  rmappliquer: () => appliquer(),
  rmretirer: () => garder(null),
  // Offres de vente.
  rmoffres: () => go("promotions"),
  rmnouvelle: () => { if (!disponible()) return toast("La base doit être mise à jour pour créer des offres (migration 037).", true); S.promo = NEUVE(); go("promotion"); },
  rmmodifier: (id) => { const p = promotions().find((x) => x.id === id); if (!p) return; S.promo = versOffre(p); go("promotion"); },
  rmannuler: () => { S.promo = null; go("promotions"); },
  rmtype: (t) => { lireOffre(); S.promo.type = t; render(); },
  rmpas: (d, k) => { lireOffre(); const p = S.promo, lim = { achetes: [1, 99], offerts: [1, 99], quantite: [2, 99] }[k]; if (!lim) return; p[k] = Math.max(lim[0], Math.min(lim[1], Number(p[k]) + Number(d))); render(); },
  rmproduit: (f) => { lireOffre(); const p = S.promo; p.produits = f ? bascule(p.produits, f) : []; render(); },
  rmmodeoffre: (m) => { lireOffre(); S.promo.mode = m; render(); },
  rmqui: (q) => { lireOffre(); S.promo.qui = q; render(); },
  rmcercle: (c) => { lireOffre(); S.promo.cercles = bascule(S.promo.cercles, c); render(); },
  rmclient: (id) => { lireOffre(); S.promo.clients = bascule(S.promo.clients, id); render(); },
  rmquand: (q) => { lireOffre(); S.promo.quand = q; render(); },
  rmenregistrer: () => enregistrer(),
  rmsupprimer: (_v, _k, btn) => twoStep(btn, "Confirmer la suppression", async () => {
    const id = S.promo?.id;
    if (!id) return;
    await write(sb.from("promotions").delete().eq("id", id), "Offre supprimée");
    S.promo = null;
    go("promotions");
  }),
  rmbascule: async (id) => {
    const p = promotions().find((x) => x.id === id);
    if (!p) return;
    try { await write(sb.from("promotions").update({ actif: p.actif === false }).eq("id", id), p.actif === false ? "Offre activée" : "Offre coupée"); } catch (er) { fail(er); }
  },
};
