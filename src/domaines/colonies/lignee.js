// Apiviz — fiche colonie complète (IT-07, AP-FEAT-032 à 034) : en-tête (statut, reine, force, dernière visite),
// onglets « Santé » et « Reine & lignée ». Complète l'écran « ruche » rendu par ux.js (qui pose les onglets et le
// journal unifié), après alveoles.js et fiche.js (src/domaines/colonies/ecrans.js).
// Saisies terrain par la file d'envoi (offline.js) : changer_reine(), corriger_reine() (migration 019). L'application
// n'écrit plus jamais annee_reine elle-même : la base tient les colonnes reine de ruches à jour.
// Les globales d'app.js (S, sb, sheet, esc, dfr, today, toast, refresh, render, cfg, byId, n) ne sont lues qu'à l'appel.
import * as C from "./regles.js";
import * as R from "./reines.js";
import * as SA from "../sante/regles.js";
import { ctx as ctxSante, detail as detailComptage } from "../sante/ecran.js";
import { signesRecents } from "../sante/ecran.js";

const e = (t) => esc(t);
const appel = (nom, args) => (typeof HL != "undefined" ? HL.rpc(nom, args) : sb.rpc(nom, args));
const toutes = () => [...(S.d.ruches || []), ...(S.d.ruchesSorties || [])];
const colonie = (id) => byId(toutes(), id);
const an = () => Number(today().slice(0, 4));
/** Base sans la migration 019 : la reine se lit dans les colonnes de la ruche, sans historique ni saisie. */
const sans019 = () => !!S.absentes?.has("reines");
const pastille = (marquage) => {
  const m = R.MARQUAGES[marquage] || R.MARQUAGES.aucun;
  return `<span class="v3-pastille${m[1] ? "" : " rn-sans"}" ${m[1] ? `style="background:${m[1]}"` : ""} aria-hidden="true"></span>`;
};
const libelleMarquage = (marquage) => (marquage === "aucun" ? "non marquée" : "marquage " + (R.MARQUAGES[marquage]?.[0] || "").toLowerCase());

/** Complément de l'écran « ruche ». */
export function completerLignee() {
  if (S.route !== "ruche") return;
  const r = colonie(S.ruche), wrap = document.querySelector(".wrap");
  if (!r || !wrap) return;
  enTete(r, wrap);
  // Cinq onglets en ruban sur téléphone : l'onglet ouvert reste visible.
  const actif = wrap.querySelector(".subtabs button.on"), ruban = actif?.parentElement;
  if (ruban && ruban.scrollWidth > ruban.clientWidth) ruban.scrollLeft = Math.max(0, actif.offsetLeft - ruban.offsetLeft - 16);
  const zone = wrap.querySelector(".cl-onglet");
  if (zone?.dataset.o === "reine") zone.outerHTML = ongletReine(r);
  else if (zone?.dataset.o === "sante") zone.outerHTML = ongletSante(r);
}

// ---------- En-tête (AP-US-039, AP-TECH-120) ----------
// Statut, reine (âge, couleur), force et date de la dernière visite ; le varroa de la dernière observation est dans
// les chiffres juste dessous (ux.js). La force n'est pas encore saisie dans les visites (IT-08) : rien n'est déduit.
function enTete(r, wrap) {
  const tete = wrap.querySelector(".u-ruche-tete");
  if (!tete || tete.querySelector(".rn-entete")) return;
  const st = C.statut(r), q = R.reineEnPlace(S.d, r);
  const der = (S.d.visites || []).find((v) => v.ruche_id === r.id);
  const reine = q
    ? `<button type="button" class="u-chip rn-chip" data-act="uronglet" data-v="reine">${pastille(q.marquage)}Reine ${e(q.annee_naissance)} · ${e(R.age(q.annee_naissance, an()))}</button>`
    : `<button type="button" class="u-chip rn-chip${st === "orpheline" ? " crit" : ""}" data-act="uronglet" data-v="reine">${st === "orpheline" ? "Sans reine" : "Reine non renseignée"}</button>`;
  tete.insertAdjacentHTML("beforeend", `<div class="rn-entete" aria-label="État de la colonie">
    <span class="u-chip ${st === "orpheline" ? "crit" : C.estActive(r) ? "good" : ""}">${e(C.STATUTS[st])}</span>${reine}
    <span class="u-chip" title="La force se notera pendant la visite">Force –</span>
    <span class="u-chip">${der ? "Visitée le " + e(R.jourMois(der.date_visite, an())) : "Jamais visitée"}</span></div>`);
}

// ---------- Onglet « Reine & lignée » (AP-US-037, AP-US-038, AP-TECH-121) ----------
function ligneReine(q) {
  const quand = q.en_place_au ? `du ${dfr(q.en_place_du)} au ${dfr(q.en_place_au)}` : q.en_place_du ? `depuis le ${dfr(q.en_place_du)}` : "";
  const details = [libelleMarquage(q.marquage), q.origine.toLowerCase(), q.clippee ? "clippée" : ""].filter(Boolean).join(" · ");
  return `<div class="rn-reine"><div class="v3-reine-l">${pastille(q.marquage)}<span><b>Reine ${e(q.annee_naissance)}</b>${q.statut === "en_place" ? " · " + e(R.age(q.annee_naissance, an())) : ""}
      <span class="small">${e(details)}</span><span class="small">${e([q.statut === "en_place" ? "En place " + quand : quand, q.statut === "en_place" ? "" : R.STATUTS_REINE[q.statut].toLowerCase()].filter(Boolean).join(" · "))}</span>
      ${q.notes ? `<span class="small rn-notes">${e(q.notes)}</span>` : ""}</span></div>
    ${q._attente ? '<span class="tag watch">en attente</span>' : q.id && !String(q.id).includes(":") && !sans019() ? `<button type="button" class="link" data-act="rncorriger" data-v="${e(q.id)}">Corriger</button>` : ""}</div>`;
}

function ongletReine(r) {
  const l = R.reinesDe(S.d, r), q = l.find((x) => x.statut === "en_place"), avant = l.filter((x) => x !== q);
  const saisie = C.estActive(r) && !sans019();
  const enPlace = `<section class="card rn-en-place"><div class="u-entete"><h2>${C.estActive(r) ? "Reine en place" : "Dernière reine"}</h2>
      ${saisie ? `<button type="button" class="link" data-act="rnnouvelle" data-v="${e(r.id)}">${q ? "Nouvelle reine" : "Renseigner"}</button>` : ""}</div>
    ${q ? ligneReine(q) : `<p class="small">${C.statut(r) === "orpheline" ? "Colonie orpheline : enregistre sa nouvelle reine dès qu’elle en a une." : "Aucune reine notée. Renseigne-la pour suivre son âge et sa couleur de marquage."}</p>`}
    ${sans019() && C.estActive(r) ? '<p class="small">L’historique des reines arrive avec la prochaine mise à jour de l’application.</p>' : ""}</section>`;
  const precedentes = avant.length ? `<section class="card rn-precedentes"><h2>Reines précédentes</h2>${avant.map(ligneReine).join("")}</section>` : "";
  return `${enPlace}${precedentes}${sectionLignee(r)}`;
}

const lienColonie = (c) => (c ? `<button type="button" class="link" data-act="ruche" data-v="${e(c.id)}">${e(c.nom)}</button>` : "<span>une colonie supprimée</span>");

function sectionLignee(r) {
  const g = R.lignee(S.d, r.id, !!S.absentes?.has("liens")), a = an();
  const lignes = [];
  if (g.origine) {
    lignes.push(`<div class="cl-ligne rn-origine"><span><b>${e(R.phraseOrigine(g.origine.lien, g.origine.autre?.nom, a))}</b><span class="small">Sa colonie d’origine</span></span>${g.origine.autre ? lienColonie(g.origine.autre) : ""}</div>`);
  }
  for (const x of g.issues) {
    lignes.push(`<div class="cl-ligne"><span><b>${x.lien.type === "essaim" ? "Essaim récupéré" : "Division"} le ${e(R.jourMois(x.lien.date_lien, a))}</b><span class="small">Colonie qui en est issue</span></span>${lienColonie(x.autre)}</div>`);
  }
  for (const x of g.reunies) {
    lignes.push(`<div class="cl-ligne"><span><b>Réunion le ${e(R.jourMois(x.lien.date_lien, a))}</b><span class="small">Colonie réunie dans celle-ci</span></span>${lienColonie(x.autre)}</div>`);
  }
  if (g.reunieDans) {
    lignes.push(`<div class="cl-ligne"><span><b>Réunie le ${e(R.jourMois(g.reunieDans.lien.date_lien, a))}</b><span class="small">Colonie qui l’a accueillie</span></span>${lienColonie(g.reunieDans.autre)}</div>`);
  }
  return `<section class="card rn-lignee"><h2>Lignée</h2>${lignes.join("") || '<p class="small">Aucun lien connu. Une division, un essaim récupéré ou une réunion notés dans l’onglet Colonie apparaîtront ici.</p>'}</section>`;
}

// ---------- Onglet « Santé » (AP-TECH-121 ; IT-12, maquette du 23 nov. 2026) ----------
// Comptages varroa (visites et comptages du rucher, migration 036), comparés au seuil sourcé qui s'applique (sa source
// en clair, « ? » pour le détail) ; signes sanitaires notés, datés, sans conclusion automatique (AP-US-064) ;
// traitements saisis pendant les visites. Aucune posologie ni aucun délai n'est proposé ici (traitements : IT-13).
function ongletSante(r) {
  const vis = (S.d.visites || []).filter((v) => v.ruche_id === r.id);
  const c = ctxSante(), liste = SA.comptagesDe(S.d, r.id);
  const der = liste[0], nivDer = der ? SA.niveau(der, c) : null, sDer = der ? SA.seuilApplicable(der, c) : null;
  const bandeau = der && nivDer === "haut"
    ? `<section class="card rn-alerte"><p><b>${e(SA.resultat(der).texte)} le ${e(dfr(der.date_visite))} : au-dessus de ton seuil de ${e(SA.valeurTexte(sDer))}</b></p>
        <p class="small">${e([der.varroa_methode, SA.periodeTexte(sDer)].filter(Boolean).join(", "))} · ${e(SA.sourceTexte(sDer))}</p>
        <button type="button" class="link" data-act="saquestion" data-v="${e(der.varroa_methode)}">D’où vient ce seuil ?</button></section>`
    : der && SA.resultat(der).valeur !== null && !sDer
      ? `<p class="small rn-sansseuil">Pas de seuil choisi pour cette méthode : le résultat s’affiche sans couleur. <button type="button" class="link" data-act="saversseuils">Choisir un seuil</button></p>` : "";
  const comptages = liste.slice(0, 6).map((v) => {
    const niv = SA.niveau(v, c);
    return `<div class="cl-ligne"><span><b>${e(SA.resultat(v).texte)}</b>
      <span class="small">${e(detailComptage(v))}</span></span>
      ${niv === "haut" ? '<span class="tag crit">au-dessus de ton seuil</span>' : v._attente ? '<span class="tag watch">en attente</span>' : ""}</div>`;
  }).join("");
  const signes = signesRecents(r.id).slice(0, 8).map((g) => `<div class="cl-ligne"><span><b>${e(g.signes.map(SA.nomSigne).join(", "))}</b>
      <span class="small">${e([dfr(g.date), SA.IMPORTANCES[g.importance]?.toLowerCase(), g.ruches.length > 1 ? `avec ${g.ruches.length - 1} autre${g.ruches.length > 2 ? "s" : ""} colonie${g.ruches.length > 2 ? "s" : ""}` : ""].filter(Boolean).join(" · "))}</span></span>
      <button type="button" class="link" data-act="sasignalement" data-v="${e(g.saisie)}">Aide</button></div>`).join("");
  const traitements = vis.filter((v) => v.traitement).slice(0, 6).map((v) => `<div class="cl-ligne"><span><b>${e(v.traitement)}</b>
      <span class="small">${e([dfr(v.date_visite), v.lot_produit && "lot " + v.lot_produit, v.traitement_dose, v.retrait_prevu && "fin prévue le " + dfr(v.retrait_prevu)].filter(Boolean).join(" · "))}</span></span></div>`).join("");
  return `${bandeau}<section class="card rn-varroa"><div class="u-entete"><h2>Varroa</h2>${C.estActive(r) ? `<button type="button" class="link" data-act="cvouvrir" data-v="${e(r.id)}">Compter</button>` : ""}</div>
      ${comptages || '<p class="small">Aucun comptage noté pour cette colonie.</p>'}
      <button type="button" class="link rn-suite" data-act="go" data-v="varroa">Suivi de toutes les colonies</button></section>
    <section class="card rn-signes"><div class="u-entete"><h2>Signes sanitaires</h2>${C.estActive(r) ? `<button type="button" class="link" data-act="sasigne" data-v="${e(r.id)}">Noter un signe</button>` : ""}</div>
      ${signes || '<p class="small">Rien de noté sur cette colonie.</p>'}</section>
    <section class="card rn-traitements"><h2>Traitements</h2>${traitements || '<p class="small">Aucun traitement noté. Ils se saisissent pendant la visite.</p>'}
      <button type="button" class="link rn-suite" data-act="go" data-v="registre">Registre d’élevage</button></section>`;
}

// ---------- Actions ----------
const options = (liste, libelle) => liste.map((x) => [x, libelle(x)]);
const champsReine = (q, date) => [
  { name: "annee", label: "Année de naissance", type: "number", step: "1", min: 1990, required: !0, value: q?.annee_naissance ?? an() },
  { name: "date", label: "Introduite ou vue la première fois le", type: "date", required: !0, value: date },
  { name: "origine", label: "Origine", type: "select", options: options([...new Set([...R.ORIGINES, q?.origine || ""])], (o) => o || "Non précisée"), value: q?.origine || "" },
  { name: "marquage", label: "Marquage", type: "select", value: q ? q.marquage : "",
    options: [...(q ? [] : [["", "Couleur de l’année"]]), ...Object.entries(R.MARQUAGES).map(([k, v]) => [k, v[0]])] },
  { name: "clippee", label: "Aile clippée", type: "select", options: [["", "Non"], ["1", "Oui"]], value: q?.clippee ? "1" : "" },
];

function nouvelle(id) {
  const r = colonie(id);
  if (!r) return;
  const o = R.reineEnPlace(S.d, r);
  sheet({
    title: o ? `Nouvelle reine de ${r.nom}` : `Reine de ${r.nom}`,
    intro: o ? `La reine ${o.annee_naissance} reste dans l’historique : elle est clôturée à la date d’introduction de la nouvelle.` : "",
    fields: [...champsReine(null, today()),
      ...(o ? [{ name: "ancienne", label: `La reine ${o.annee_naissance}`, type: "select", value: "remplacee",
        options: options(R.DEVENIRS, (k) => ({ remplacee: "A été remplacée", morte: "Est morte", disparue: "A disparu", vendue: "A été vendue ou donnée" })[k]) }] : []),
      { name: "notes", label: "Notes (facultatif)", type: "textarea", value: "" }],
    submit: async (f) => {
      const p = { id: crypto.randomUUID(), colonie_id: r.id, annee: f.annee === "" ? "" : Number(f.annee), date: f.date, origine: f.origine, marquage: f.marquage,
        clippee: !!f.clippee, notes: f.notes.trim(), ancienne: f.ancienne || "remplacee" };
      const refus = R.controleReine(S.d, p, today(), C.estActive(r));
      if (refus) throw new Error(refus);
      const { error, local } = await appel("changer_reine", { p });
      if (error) throw error;
      if (local) { R.appliquerReine(S.d, p, { _attente: !0 }); typeof HL != "undefined" && HL.garderDonnees(); render(); toast("Gardé sur le téléphone : envoi au retour du réseau"); }
      else { await refresh(); toast("Reine enregistrée"); }
    },
  });
}

function corriger(id) {
  const q = (S.d.reines || []).find((x) => x.id === id);
  if (!q) return;
  const r = colonie(q.colonie_id);
  sheet({
    title: `Corriger la reine ${q.annee_naissance}`,
    intro: `Pour une erreur de saisie. ${q.statut === "en_place" ? `Si ${r?.nom || "la colonie"} a changé de reine, choisis plutôt « Nouvelle reine ».` : ""}`.trim(),
    fields: [...champsReine(q, q.en_place_du), { name: "notes", label: "Notes (facultatif)", type: "textarea", value: q.notes || "" }],
    submit: async (f) => {
      const p = { id: q.id, annee: f.annee === "" ? "" : Number(f.annee), date: f.date, origine: f.origine, marquage: f.marquage, clippee: !!f.clippee, notes: f.notes.trim() };
      const refus = R.controleCorrection(S.d, p, today());
      if (refus) throw new Error(refus);
      const { error, local } = await appel("corriger_reine", { p });
      if (error) throw error;
      if (local) { R.appliquerCorrection(S.d, p); typeof HL != "undefined" && HL.garderDonnees(); render(); toast("Gardé sur le téléphone : envoi au retour du réseau"); }
      else { await refresh(); toast("Reine corrigée"); }
    },
  });
}

/** Actions de l'onglet « Reine & lignée » (écran « ruche »). */
export const actions = { rnnouvelle: nouvelle, rncorriger: corriger };
