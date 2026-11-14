// Apiviz — écran Matériel (v5.30, migration 018 ; refait en v5.38 d'après les maquettes du 13 nov. 2026, validées le 14).
// Tableau ou liste au choix (gardé sur l'appareil), recherche, puces avec leur nombre (Tout, À commander, familles),
// stock changé au doigt (− / +, envoyé en un seul mouvement « inventaire » après une pause, avec « Annuler »),
// articles à commander en tête, lien vers la liste de courses, « Faire l'inventaire » et « Ajouter un achat ».
// Fiche article : stock et seuil (− / +), famille, nom, prix, unité, contenance d'un pot vide, fournisseur, historique.
// Plus d'Opex / Capex, ni d'amortissement, ni de poste à l'écran : déduits de la famille (regles.js).
// Sans la migration 018, l'ancien écran (viewMateriel d'app.js) reste affiché.
// Globales d'app.js lues à l'appel : S, esc, n, eur, dfr, shell, sheet, $sheetForm, write, sb, num, orNull,
// fournOpts, del, render, go, ACT, HL, toast, refresh.
import * as R from "./regles.js";

const e = (t) => esc(t);
/** La base a-t-elle la migration 018 ? (table mouvements_stock lue sans erreur) */
export const stockSuivi = () => !S.absentes?.has("mouvements");

// ---------- Écran Matériel (v5.38) : tableau ou liste, stock au doigt ----------
const CLE = "apiviz-materiel-affichage";
const ATTENTE_MS = 1500;
/** État de l'écran (gardé entre deux rendus) ; l'affichage choisi est gardé sur l'appareil. */
export function etat() {
  if (!S.mt) {
    let vue = "tableau";
    try { if (localStorage.getItem(CLE) === "liste") vue = "liste"; } catch { /* navigation privée */ }
    S.mt = { vue, f: "tout", q: "", ecarts: {}, minuterie: null, dernier: null };
  }
  return S.mt;
}
const svg = (d, t = 18) => `<svg viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const I = {
  tableau: "M4 4h16v16H4zM4 10h16M4 15h16M10 4v16",
  liste: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  cherche: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
};
const nomFour = (id) => (S.d.fournisseurs || []).find((f) => f.id === id)?.nom || "";
const prixTxt = (a) => (Number(a.valeur) > 0 ? `${eur(a.valeur)}${a.unite && a.unite !== "unité" ? "/" + a.unite : ""}` : "–");
const stockTxt = (a) => R.quantite(a.stock, a.unite === "unité" ? "" : a.unite);

/** − / + sur le stock : le chiffre change tout de suite, l'écart part en un seul mouvement « inventaire » après une pause. */
function pas(a, ecrire) {
  const plus = ecrire ? `<button type="button" data-act="mtplus" data-v="${e(a.id)}" aria-label="Ajouter 1 ${e(a.nom)}">+</button>` : "";
  const moins = ecrire ? `<button type="button" data-act="mtmoins" data-v="${e(a.id)}" aria-label="Retirer 1 ${e(a.nom)}">−</button>` : "";
  return `<span class="op-pas${ecrire ? "" : " op-lu"}">${moins}<b>${e(stockTxt(a))}</b>${plus}</span>`;
}
const ecritureOk = () => !document.documentElement.classList.contains("lecteur");

function corps() {
  const d = S.d, arts = d.articles || [], st = etat(), ecrire = ecritureOk();
  const groupes = R.groupesEcran(arts, st.f, st.q, d.fournisseurs || []);
  if (!groupes.length) return `<p class="small op-vide">${arts.length ? "Aucun article ne correspond." : ""}</p>`;
  if (st.vue === "liste") {
    return groupes.map((g) => `<section class="op-groupe"><h2 class="op-gt">${e(g.titre)} <span>· ${g.articles.length}</span></h2>
      ${g.articles.map((a) => {
        const bas = R.aCommander(a);
        const sous = [Number(a.seuil) > 0 ? `Seuil ${R.quantite(a.seuil, a.unite === "unité" ? "" : a.unite)}` : "Pas de seuil", prixTxt(a) !== "–" ? prixTxt(a) : "", nomFour(a.fournisseur_id)].filter(Boolean).join(" · ");
        return `<div class="op-carte${bas ? " op-bas" : ""}"><button type="button" class="op-carte-t" data-act="editarticle" data-v="${e(a.id)}"><b>${e(a.nom)}</b><span class="small">${e(sous)}</span>${bas ? '<span class="op-flag">À commander</span>' : ""}</button>${pas(a, ecrire)}</div>`;
      }).join("")}</section>`).join("");
  }
  return groupes.map((g) => `<section class="op-groupe"><h2 class="op-gt">${e(g.titre)} <span>· ${g.articles.length}</span></h2>
    <div class="op-boite" tabindex="0" aria-label="${e(g.titre)}"><table class="op-table ma-table"><thead><tr><th scope="col" class="op-fixe">Article</th><th scope="col">Stock</th><th scope="col" class="op-num">Seuil</th><th scope="col" class="op-num">Prix u.</th><th scope="col">Fournisseur</th></tr></thead><tbody>
    ${g.articles.map((a) => {
      const bas = R.aCommander(a);
      return `<tr class="${bas ? "op-bas" : ""}"><th scope="row" class="op-fixe"><button type="button" class="op-nom" data-act="editarticle" data-v="${e(a.id)}"><b>${e(a.nom)}</b>${bas ? '<span class="op-flag">À commander</span>' : ""}</button></th>
        <td>${pas(a, ecrire)}</td><td class="op-num">${Number(a.seuil) > 0 ? e(R.quantite(a.seuil, "")) : "–"}</td><td class="op-num">${e(prixTxt(a))}</td><td class="op-doux">${e(nomFour(a.fournisseur_id) || "–")}</td></tr>`;
    }).join("")}</tbody></table></div></section>`).join("");
}

/** Barre commune : recherche, bascule tableau / liste, puces avec leur nombre. */
export function barre({ q, vue, puces, actVue, actPuce, actif, place = "Chercher" }) {
  const b = (k, t, ic) => `<button type="button" data-act="${actVue}" data-v="${k}" class="${vue === k ? "on" : ""}" aria-pressed="${vue === k}" aria-label="${t}">${svg(ic)}</button>`;
  return `<div class="op-barre"><label class="op-cherche">${svg(I.cherche)}<input type="search" class="op-q" value="${e(q)}" placeholder="${e(place)}" aria-label="${e(place)}" autocomplete="off"></label>
    <div class="op-vues" role="group" aria-label="Affichage">${b("tableau", "Tableau", I.tableau)}${b("liste", "Liste", I.liste)}</div></div>
    <div class="op-puces" role="group" aria-label="Filtrer">${puces.map((p) => `<button type="button" class="op-puce${p.k === actif ? " on" : ""}${p.alerte ? " op-alerte" : ""}" aria-pressed="${p.k === actif}" data-act="${actPuce}" data-v="${e(p.k)}">${e(p.t)} <span>${p.n}</span></button>`).join("")}</div>`;
}

/** L'écran « materiel ». */
export function ecran() {
  if (!stockSuivi()) return viewMateriel();
  const d = S.d, arts = d.articles || [], st = etat(), ecrire = ecritureOk();
  const bas = arts.filter(R.aCommander).length;
  const puces = R.puces(arts).map((p) => ({ ...p, alerte: p.k === "bas" && p.n > 0 }));
  const sugg = R.suggestions(arts);
  shell("Matériel", "", "",
    `${bas ? `<a href="#" class="op-lien" data-act="go" data-v="courses">Voir la liste de courses →</a>` : ""}
    ${arts.length ? barre({ q: st.q, vue: st.vue, puces, actVue: "mtvue", actPuce: "mtfiltre", actif: st.f, place: "Chercher un article" }) : ""}
    ${!arts.length ? `<section class="card st-vide"><h2>Ton matériel est vide</h2><p class="small">Choisis ci-dessous ce que tu achètes : pots, couvercles, candy, hausses… Tu pourras ensuite le compter et le racheter en un geste.</p></section>` : ""}
    <div class="op-corps ma-corps">${corps()}</div>
    ${produits()}
    ${sugg.length && ecrire ? `<details class="card st-sugg"${arts.length ? "" : " open"}><summary><h2>Ajouter vite</h2></summary><p class="small">Articles courants, à toucher pour les ajouter.</p>
      <div class="chips">${sugg.map((c) => `<button type="button" data-act="preset" data-v="${e(c.nom)}">+ ${e(c.nom)}</button>`).join("")}</div>
      <p><button type="button" class="link" data-act="newarticle">Autre article…</button></p></details>` : ""}
    ${ecrire ? `<div class="op-pied"><button type="button" class="btn" data-act="go" data-v="inventaire"${arts.length ? "" : " disabled"}>Faire l’inventaire</button><button type="button" class="btn main" data-act="newdepense">+ Ajouter un achat</button></div>` : ""}`);
  const h = document.querySelector(".wrap .head h1");
  if (h) { h.textContent = R.phrase(arts); h.closest(".head")?.classList.add("g-tete"); }
  document.querySelector(".wrap")?.classList.add("op-ecran");
  brancherRecherche(".ma-corps", (v) => { etat().q = v; }, corps);
}

/** Recherche sans redessiner l'écran : seul le corps change, le curseur reste dans le champ. */
export function brancherRecherche(sel, garder, dessiner) {
  const champ = document.querySelector(".wrap .op-q");
  champ?.addEventListener("input", () => {
    garder(champ.value);
    const z = document.querySelector(sel);
    if (z) z.innerHTML = dessiner();
  });
}

// Stock au doigt : l'écart est gardé quelques instants puis envoyé en un seul mouvement « inventaire ».
function bouger(id, k) {
  const a = (S.d.articles || []).find((x) => x.id === id);
  if (!a) return;
  const st = etat();
  const avant = Number(a.stock || 0), apres = Math.max(0, Math.round((avant + k) * 100) / 100);
  if (apres === avant) return;
  a.stock = apres;
  st.ecarts[id] = Math.round(((st.ecarts[id] || 0) + (apres - avant)) * 100) / 100;
  st.dernier = { id, delta: apres - avant };
  majLigne(a);
  annoncer(`${a.nom} : ${R.quantite(a.stock, a.unite === "unité" ? "" : a.unite)}`);
  clearTimeout(st.minuterie);
  st.minuterie = setTimeout(envoyerEcarts, ATTENTE_MS);
}
function majLigne(a) {
  document.querySelectorAll(`.ma-corps [data-act="mtplus"][data-v="${CSS.escape(a.id)}"]`).forEach((b) => {
    const p = b.closest(".op-pas"); if (p) p.querySelector("b").textContent = stockTxt(a);
    const ligne = b.closest("tr, .op-carte"), bas = R.aCommander(a);
    if (!ligne) return;
    ligne.classList.toggle("op-bas", bas);
    const nom = ligne.querySelector(".op-nom, .op-carte-t"), flag = nom?.querySelector(".op-flag");
    if (bas && !flag) nom?.insertAdjacentHTML("beforeend", '<span class="op-flag">À commander</span>');
    if (!bas) flag?.remove();
  });
  const h = document.querySelector(".wrap .head h1");
  if (h) h.textContent = R.phrase(S.d.articles || []);
}
function annoncer(texte) {
  document.querySelectorAll(".toast, .op-annuler").forEach((x) => x.remove());
  const b = document.createElement("div");
  b.className = "op-annuler"; b.setAttribute("role", "status");
  b.innerHTML = `<span>${e(texte)}</span><button type="button" data-act="mtannuler">Annuler</button>`;
  document.body.appendChild(b);
  clearTimeout(annoncer.t); annoncer.t = setTimeout(() => b.remove(), 4000);
}
export async function envoyerEcarts() {
  const st = etat(), lignes = Object.entries(st.ecarts).filter(([, q]) => q);
  st.ecarts = {}; clearTimeout(st.minuterie);
  if (!lignes.length) return;
  const rows = lignes.map(([article_id, quantite]) => ({ id: crypto.randomUUID(), article_id, type: "inventaire", origine: "saisie", quantite }));
  const q = sb.from("mouvements_stock").insert(rows);
  try {
    if (typeof HL != "undefined") await HL.write(q, "");
    else { const { error } = await q; if (error) throw error; }
  } catch (err) {
    toast(err?.message || "Le stock n’a pas pu être enregistré", true);
    if (typeof refresh == "function") await refresh();
  }
}

/** Produits du rucher : miel en vrac et pots de miel par format (lus dans les récoltes et les lots). */
function produits() {
  const d = S.d, vrac = R.mielEnVrac(d), formats = new Map();
  (d.lots || []).forEach((l) => formats.set(l.format_g, (formats.get(l.format_g) || 0) + Number(l.pots_restants ?? l.pots_initiaux)));
  if (!(d.recoltes || []).length && !formats.size) return "";
  const lignes = [
    (d.recoltes || []).length ? `<button type="button" class="u-todo st-art" data-act="go" data-v="miel"><span class="u-todo-t"><b>Miel en vrac</b><span class="small">Récolté, pas encore en pots</span></span><span class="st-q"><b>${e(n(Math.max(0, vrac)))} kg</b></span></button>` : "",
    ...[...formats].sort((a, b) => a[0] - b[0]).map(([g, q]) => `<button type="button" class="u-todo st-art" data-act="go" data-v="miel"><span class="u-todo-t"><b>Pot de miel ${e(g >= 1000 ? n(g / 1000) + " kg" : n(g, 0) + " g")}</b><span class="small">À vendre</span></span><span class="st-q"><b>${e(q)} u.</b></span></button>`),
  ].join("");
  return `<section class="card u-liste st-famille"><div class="u-entete"><h2>Produits du rucher</h2><button type="button" class="link" data-act="newlot">Mettre en pots</button></div>${lignes}</section>`;
}

/** Fiche d'un article (nouveau si `a` n'a pas d'id) ; `modele` : suggestion du catalogue. Plus d'Opex / Capex, ni
 * d'amortissement, ni de poste à l'écran : ils sont déduits de la famille (v5.38). */
export function fiche(a, modele) {
  if (!stockSuivi()) return a?.id ? articleForm(a) : articleForm(modele ? { ...modele, stock: 0, seuil: 0 } : a);
  const existe = !!a?.id, x = existe ? a : { ...(modele || {}), ...(a || {}) };
  const fam = x.famille || (x.nom ? R.famille(x) : "emballage");
  sheet({
    title: existe ? a.nom : "Ajouter un article",
    fields: [
      { name: "stock", label: existe ? "En stock" : "Stock de départ", type: "number", step: "0.01", min: 0, required: !0, value: x.stock ?? 0 },
      { name: "seuil", label: "Me prévenir sous", type: "number", step: "0.01", min: 0, required: !0, value: x.seuil ?? 0 },
      { name: "famille", label: "Famille", type: "select", value: fam, options: Object.entries(R.FAMILLES) },
      { name: "nom", label: "Nom", required: !0, value: x.nom || "", list: R.CATALOGUE.map((k) => k.nom) },
      { name: "valeur", label: "Prix unitaire (€)", type: "number", step: "0.01", min: 0, value: x.valeur ?? "" },
      { name: "unite", label: "Unité", required: !0, value: x.unite || "unité", list: ["unité", "kg", "L", "feuille", "boîte"] },
      { name: "contenance_g", label: "Contenance d’un pot vide (g)", type: "number", step: "1", min: 1, value: x.contenance_g ?? R.contenance(x) ?? "", list: [125, 250, 500, 1000] },
      { name: "fournisseur_id", label: "Fournisseur habituel", type: "select", options: fournOpts(), value: x.fournisseur_id || "" },
    ],
    submit: async (f) => {
      const type = R.typeDeFamille(f.famille);
      const ligne = { nom: f.nom.trim(), type, famille: f.famille, unite: f.unite.trim() || "unité",
        contenance_g: f.famille === "emballage" ? num(f.contenance_g) : null,
        duree_amort: type === "Équipement" ? (existe && a.duree_amort) || 5 : null,
        seuil: num(f.seuil) || 0, valeur: num(f.valeur), poste: (existe && a.poste) || R.posteDeFamille(f.famille), fournisseur_id: orNull(f.fournisseur_id) };
      if (!existe) return write(sb.from("articles").insert({ id: crypto.randomUUID(), ...ligne, stock: num(f.stock) || 0 }), "Article ajouté");
      const ecart = Math.round(((num(f.stock) || 0) - Number(a.stock)) * 100) / 100;
      if (ecart) {
        // Stock recompté : un mouvement « inventaire » de l'écart (le déclencheur met le stock à jour).
        const { error } = await sb.from("mouvements_stock").insert({ article_id: a.id, type: "inventaire", origine: "saisie", quantite: ecart });
        if (error) throw error;
      }
      return write(sb.from("articles").update(ligne).eq("id", a.id), ecart ? `Article enregistré, stock corrigé de ${ecart > 0 ? "+" : ""}${n(ecart, 2)}` : "Article enregistré");
    },
    del: existe ? del("articles", a.id, "Article supprimé") : null,
  });
  $sheetForm.classList.add("ma-fiche");
  const champ = (nom) => $sheetForm.querySelector(`[name="${nom}"]`), bloc = (nom) => champ(nom)?.closest("label");
  // Stock et seuil côte à côte, avec − / + ; contenance seulement pour un pot vide.
  const s1 = bloc("stock"), s2 = bloc("seuil");
  if (s1 && s2) { const duo = document.createElement("div"); duo.className = "two ma-duo"; s1.before(duo); duo.append(s1, s2); }
  for (const nom of ["stock", "seuil"]) {
    const c = champ(nom);
    if (!c) continue;
    c.insertAdjacentHTML("beforebegin", `<button type="button" class="ma-pm" data-k="-1" aria-label="Moins">−</button>`);
    c.insertAdjacentHTML("afterend", `<button type="button" class="ma-pm" data-k="1" aria-label="Plus">+</button>`);
    c.parentElement.classList.add("ma-pmz");
  }
  $sheetForm.querySelectorAll(".ma-pm").forEach((b) => b.addEventListener("click", () => {
    const c = b.parentElement.querySelector("input");
    c.value = Math.max(0, Math.round(((Number(c.value) || 0) + Number(b.dataset.k)) * 100) / 100);
    c.dispatchEvent(new Event("input", { bubbles: true }));
  }));
  const ajuster = () => bloc("contenance_g")?.toggleAttribute("hidden", champ("famille").value !== "emballage");
  champ("famille")?.addEventListener("change", ajuster);
  // Nom choisi dans le catalogue : famille, unité et contenance repris.
  champ("nom")?.addEventListener("change", () => {
    const k = R.CATALOGUE.find((y) => y.nom.toLowerCase() === champ("nom").value.trim().toLowerCase());
    if (!k || existe) return;
    champ("famille").value = k.famille; champ("unite").value = k.unite;
    if (k.contenance_g) champ("contenance_g").value = k.contenance_g;
    ajuster();
  });
  ajuster();
  if (existe) $sheetForm.querySelector(".actions")?.insertAdjacentHTML("beforebegin", historique(a));
}

function historique(a) {
  const ms = R.mouvementsArticle(S.d, a.id).slice(0, 8);
  const lignes = ms.map((m) => {
    const q = Number(m.quantite);
    return `<li><span><b>${e(R.libelleMouvement(m))}</b><span class="small">${e(dfr(m.date_mouvement))}${m.note ? " · " + e(m.note) : ""}</span></span>
      <b class="${q > 0 ? "st-plus" : "st-moins"}">${q > 0 ? "+" : "−"}${e(R.quantite(Math.abs(q), a.unite))}</b></li>`;
  }).join("");
  return `<section class="st-histo" aria-label="Ce qui a bougé"><div class="u-entete"><h3>Ce qui a bougé</h3>
    <button type="button" class="link" data-act="stentree" data-v="${e(a.id)}">Entrée sans facture</button></div>
    ${lignes ? `<ul>${lignes}</ul>` : '<p class="small">Aucun mouvement pour l’instant.</p>'}</section>`;
}

/** Actions de l'écran Matériel (remplacent celles d'app.js : la fiche article devient celle du catalogue). */
export const actions = {
  mtvue: (v) => { etat().vue = v === "liste" ? "liste" : "tableau"; try { localStorage.setItem(CLE, etat().vue); } catch { /* privé */ } render(); },
  mtfiltre: (v) => { etat().f = v; render(); },
  mtplus: (id) => bouger(id, 1),
  mtmoins: (id) => bouger(id, -1),
  mtannuler: () => { const d = etat().dernier; document.querySelector(".op-annuler")?.remove(); if (d) { etat().dernier = null; bouger(d.id, -d.delta); document.querySelector(".op-annuler")?.remove(); toast("Annulé"); } },
  // Depuis la fiche article : la feuille d'entrée remplace la fiche.
  stentree: (id) => { $sheet.close(); ACT.entree(id); },
  newarticle: () => fiche(null),
  editarticle: (id) => fiche((S.d.articles || []).find((a) => a.id === id)),
  preset: (nom, cle) => {
    const k = R.CATALOGUE.find((c) => c.nom === nom);
    if (k) return fiche(null, k);
    // Ancienne liste d'app.js (PRESETS), encore utilisée par la fiche Gestion.
    const m = (PRESETS[cle] || []).find((x) => x[0] === nom);
    return fiche(null, m ? { nom: m[0], unite: m[1], type: cle } : { nom });
  },
};
export const remplace = ["newarticle", "editarticle", "preset"];
