// Apiviz — écran Matériel en catalogue d'articles (v5.30, maquettes du 11 nov. 2026, migration 018).
// Articles par famille (emballage, alimentation, traitements, cire, équipement), filtre Opex / Capex, stock et seuil,
// « À commander », produits du rucher (miel en vrac, pots par format), suggestions du catalogue en un geste.
// Fiche article : Opex ou Capex, famille, contenance d'un pot vide, durée d'amortissement, poste, et l'historique de
// ses mouvements. Un stock corrigé à la main devient un mouvement « inventaire » (plus d'écriture directe).
// Sans la migration 018, l'ancien écran (viewMateriel d'app.js) reste affiché.
// Globales d'app.js lues à l'appel : S, esc, n, eur, dfr, shell, sheet, $sheetForm, write, sb, num, orNull, cfg,
// fournOpts, del, render, go, ACT.
import * as R from "./regles.js";

const e = (t) => esc(t);
/** La base a-t-elle la migration 018 ? (table mouvements_stock lue sans erreur) */
export const stockSuivi = () => !S.absentes?.has("mouvements");

/** L'écran « materiel ». */
export function ecran() {
  if (!stockSuivi()) return viewMateriel();
  const d = S.d, arts = d.articles || [], filtre = S.stFiltre || "tous";
  const groupes = R.grouper(arts, filtre);
  const blocs = groupes.map((g) => {
    const capex = g.articles.every(R.estCapex), opex = g.articles.every((a) => !R.estCapex(a));
    const sous = capex ? "Capex, amorti" : opex ? "Opex, suivi en stock" : "Opex et Capex";
    return `<section class="card u-liste st-famille"><div class="u-entete"><h2>${e(g.titre)} <span class="small">· ${sous}</span></h2>
      ${g.famille === "emballage" ? '<button type="button" class="link" data-act="newlot">Mettre en pots</button>' : ""}</div>
      ${g.articles.map(ligne).join("")}</section>`;
  }).join("");
  const sugg = R.suggestions(arts).filter((c) => filtre === "tous" || (filtre === "capex") === (c.type === "Équipement"));
  const vide = !arts.length
    ? `<section class="card st-vide"><h2>Ton catalogue est vide</h2><p class="small">Choisis ci-dessous ce que tu achètes : pots, couvercles, candy, hausses… Tu pourras ensuite les ajouter à un achat en un geste.</p></section>`
    : !groupes.length ? `<p class="small">Aucun article ${filtre === "capex" ? "Capex" : "Opex"} pour l’instant.</p>` : "";
  shell("Matériel", "Articles, stock et achats",
    '<button type="button" class="btn main" data-act="newdepense">Ajouter un achat</button><button type="button" class="btn" data-act="newarticle">Ajouter un article</button>',
    `<div class="seg st-filtre" role="group" aria-label="Filtrer les articles">${[["tous", "Tous"], ["opex", "Opex"], ["capex", "Capex"]]
      .map(([k, t]) => `<button type="button" class="${filtre === k ? "on" : ""}" aria-pressed="${filtre === k}" data-act="stfiltre" data-v="${k}">${t}</button>`).join("")}</div>
    ${vide}${blocs}${filtre !== "capex" ? produits() : ""}
    ${sugg.length ? `<section class="card st-sugg"><h2>Ajouter vite</h2><p class="small">Articles courants, à toucher pour les ajouter à ton catalogue.</p>
      <div class="chips">${sugg.map((c) => `<button type="button" data-act="preset" data-v="${e(c.nom)}">+ ${e(c.nom)}</button>`).join("")}</div></section>` : ""}`);
  const h = document.querySelector(".wrap .head h1");
  if (h) { h.textContent = R.phrase(arts); h.closest(".head")?.classList.add("g-tete"); }
}

function ligne(a) {
  const bas = R.aCommander(a), cap = R.estCapex(a);
  const infos = [R.nature(a), cap ? (a.duree_amort ? `sur ${a.duree_amort} ans` : "") : Number(a.seuil) > 0 ? `seuil ${R.quantite(a.seuil, a.unite)}` : "",
    a.valeur ? `${eur(a.valeur)}${a.unite && a.unite !== "unité" ? " le " + a.unite : " l’unité"}` : ""].filter(Boolean).join(" · ");
  return `<button type="button" class="u-todo st-art${bas ? " st-bas" : ""}" data-act="editarticle" data-v="${e(a.id)}">
    <span class="u-todo-t"><b>${e(a.nom)}</b><span class="small">${e(infos)}</span></span>
    <span class="st-q">${bas ? '<span class="u-chip st-chip-watch">À commander</span>' : ""}<b>${e(R.quantite(a.stock, a.unite === "unité" ? "u." : a.unite))}</b></span></button>`;
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

/** Fiche d'un article (nouveau si `a` n'a pas d'id) ; `modele` : suggestion du catalogue. */
export function fiche(a, modele) {
  if (!stockSuivi()) return a?.id ? articleForm(a) : articleForm(modele ? { ...modele, stock: 0, seuil: 0 } : a);
  const existe = !!a?.id, x = existe ? a : { ...(modele || {}), ...(a || {}) }, c = cfg();
  const fam = x.famille || (x.nom ? R.famille(x) : "emballage");
  sheet({
    title: existe ? a.nom : "Ajouter un article",
    fields: [
      { name: "nom", label: "Nom", required: !0, value: x.nom || "", list: R.CATALOGUE.map((k) => k.nom) },
      { name: "type", label: "Opex ou Capex", type: "select", value: x.type || (fam === "equipement" ? "Équipement" : "Consommable"),
        options: [["Consommable", "Opex · consommable, en charge l’année d’achat"], ["Équipement", "Capex · équipement amorti sur plusieurs années"]] },
      { name: "famille", label: "Famille", type: "select", value: fam, options: Object.entries(R.FAMILLES) },
      { name: "unite", label: "Unité", required: !0, value: x.unite || "unité", list: ["unité", "kg", "L", "feuille", "boîte"] },
      { name: "contenance_g", label: "Contenance d’un pot vide (g)", type: "number", step: "1", min: 1, value: x.contenance_g ?? R.contenance(x) ?? "", list: [125, 250, 500, 1000] },
      { name: "duree_amort", label: "Amorti sur (années)", type: "number", step: "1", min: 1, value: x.duree_amort ?? 5 },
      { name: "stock", label: existe ? "Stock compté" : "Stock de départ", type: "number", step: "0.01", min: 0, required: !0, value: x.stock ?? 0 },
      { name: "seuil", label: "À recommander sous", type: "number", step: "0.01", min: 0, required: !0, value: x.seuil ?? 0 },
      { name: "valeur", label: "Prix unitaire (€, facultatif)", type: "number", step: "0.01", min: 0, value: x.valeur ?? "" },
      { name: "poste", label: "Poste de dépense", type: "select", value: x.poste || R.POSTE_FAMILLE[fam] || c.postes[0],
        options: [...new Set([...c.postes, ...(x.poste ? [x.poste] : [])])] },
      { name: "fournisseur_id", label: "Fournisseur habituel", type: "select", options: fournOpts(), value: x.fournisseur_id || "" },
    ],
    submit: async (f) => {
      const ligne = { nom: f.nom.trim(), type: f.type, famille: f.famille, unite: f.unite.trim() || "unité",
        contenance_g: f.famille === "emballage" ? num(f.contenance_g) : null, duree_amort: f.type === "Équipement" ? num(f.duree_amort) || 5 : null,
        seuil: num(f.seuil) || 0, valeur: num(f.valeur), poste: f.poste, fournisseur_id: orNull(f.fournisseur_id) };
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
  // Champs qui n'ont de sens que pour un pot vide (contenance) ou un Capex (durée) : montrés au besoin.
  const champ = (nom) => $sheetForm.querySelector(`[name="${nom}"]`), bloc = (nom) => champ(nom)?.closest("label");
  const ajuster = () => {
    const cap = champ("type").value === "Équipement";
    bloc("duree_amort")?.toggleAttribute("hidden", !cap);
    bloc("contenance_g")?.toggleAttribute("hidden", champ("famille").value !== "emballage");
    bloc("seuil")?.toggleAttribute("hidden", cap);
  };
  champ("type")?.addEventListener("change", ajuster);
  champ("famille")?.addEventListener("change", () => { if (champ("famille").value === "equipement") champ("type").value = "Équipement"; ajuster(); });
  // Nom choisi dans le catalogue : famille, unité, Opex ou Capex et contenance repris.
  champ("nom")?.addEventListener("change", () => {
    const k = R.CATALOGUE.find((y) => y.nom.toLowerCase() === champ("nom").value.trim().toLowerCase());
    if (!k || existe) return;
    champ("famille").value = k.famille; champ("type").value = k.type; champ("unite").value = k.unite;
    if (k.contenance_g) champ("contenance_g").value = k.contenance_g;
    champ("poste").value = [...champ("poste").options].some((o) => o.value === R.POSTE_FAMILLE[k.famille]) ? R.POSTE_FAMILLE[k.famille] : champ("poste").value;
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
  stfiltre: (v) => { S.stFiltre = v; render(); },
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
