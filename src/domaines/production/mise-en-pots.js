// Apiviz — écran « Mise en pots » (v5.30, maquettes du 11 nov. 2026, migration 018).
// Format, miel, nombre de pots ; ce qui sort du stock (miel en vrac, pot vide du format, couvercle, étiquette) avec
// l'avant → après de chaque article ; ce qui entre (pots de miel, lot, DDM, coût d'emballage par pot). Envoi par
// mettre_en_pots() en passant par la file d'envoi (offline.js). Lien vers l'ancienne fiche « Nouveau lot » pour des
// pots déjà prêts, sans rien retirer du stock. Sans la migration 018, « Nouveau lot » ouvre l'ancienne fiche.
// Globales d'app.js lues à l'appel : S, esc, n, eur, dfr, today, shell, render, refresh, toast, go, lotForm.
import * as R from "../materiel/regles.js";
import { stockSuivi } from "../materiel/catalogue.js";

const e = (t) => esc(t);
const appel = (nom, args) => (typeof HL != "undefined" ? HL.rpc(nom, args) : sb.rpc(nom, args));
const ROLES = [["pot", "Pot vide"], ["couvercle", "Couvercle"], ["etiquette", "Étiquette"]];
const format = (g) => (Number(g) >= 1000 ? `${n(Number(g) / 1000)} kg` : `${n(g, 0)} g`);

/** Formats proposés : ceux des pots vides du catalogue, ceux des lots, et les trois courants. */
function formats() {
  const d = S.d, f = new Set([250, 500, 1000]);
  (d.articles || []).forEach((a) => { const c = R.contenance(a); if (c && R.famille(a) === "emballage") f.add(c); });
  (d.lots || []).forEach((l) => f.add(Number(l.format_g)));
  return [...f].sort((a, b) => a - b);
}

function etat() {
  if (S.mp) return S.mp;
  const d = S.d, an = new Date().getFullYear();
  const pots = (d.articles || []).filter((a) => R.famille(a) === "emballage" && R.contenance(a) && Number(a.stock) > 0)
    .sort((a, b) => Number(b.stock) - Number(a.stock));
  const fmt = R.contenance(pots[0]) || 500;
  S.mp = { id: crypto.randomUUID(), code: R.prochainCode(d.lots, an), miel: (d.lots || []).at(-1)?.miel || "Toutes fleurs", format_g: fmt,
    pots: "", prix: "", date: today(), ddm: R.ddmProposee(today()), extraction: derniereExtraction(d) };
  choisirFormat(fmt);
  return S.mp;
}

/** Extraction proposée : la plus récente qui n'a pas encore de lot (traçabilité de la récolte au pot). */
function derniereExtraction(d) {
  const lotees = new Set((d.lots || []).map((l) => l.extraction).filter(Boolean));
  const r = (d.recoltes || []).filter((x) => x.extraction && !lotees.has(x.extraction))
    .sort((a, b) => String(b.date_recolte).localeCompare(String(a.date_recolte)))[0];
  return r?.extraction || "";
}

/** Nouveau format : articles proposés et prix du dernier lot de ce format. */
function choisirFormat(fmt) {
  const f = S.mp, prop = R.proposerIntrants(S.d.articles, fmt);
  f.format_g = Number(fmt);
  ROLES.forEach(([k]) => (f[k] = prop[k]?.id || ""));
  const dernier = (S.d.lots || []).filter((l) => Number(l.format_g) === f.format_g).at(-1);
  f.prix = dernier ? dernier.prix : "";
  const b = R.bilanMiseEnPots(S.d, { pots: 0, format_g: f.format_g, intrants: ROLES.map(([k]) => f[k]) });
  f.pots = b.max ? Math.min(b.max, f.pots || b.max) : f.pots;
}

function lire() {
  const f = S.mp, q = (id) => document.getElementById(id);
  if (!f || !q("mp_pots")) return f;
  Object.assign(f, { pots: q("mp_pots").value, prix: q("mp_prix").value, miel: q("mp_miel").value, code: q("mp_code").value,
    date: q("mp_date").value, ddm: q("mp_ddm").value, extraction: q("mp_extraction")?.value || "" });
  ROLES.forEach(([k]) => { if (q("mp_" + k)) f[k] = q("mp_" + k).value; });
  return f;
}

/** Carte « Sort du stock » : miel en vrac et chaque article choisi, avant → après. */
function sorties(f, b) {
  const d = S.d, emb = (d.articles || []).filter((a) => R.famille(a) === "emballage" && !R.estCapex(a));
  const avantApres = (avant, apres, rouge) => `<span class="st-aa"><b class="${rouge ? "st-moins" : ""}">${e(avant)} → ${e(apres)}</b></span>`;
  const sortie = ([k, nom]) => {
    const a = (d.articles || []).find((x) => x.id === f[k]), s = b.sorties.find((x) => x.article.id === f[k]);
    const opts = [["", "Ne rien retirer"], ...emb.map((x) => [x.id, `${x.nom} (${R.quantite(x.stock, x.unite)})`])];
    return `<div class="st-sortie"><label class="st-sortie-l">${e(nom)}<select id="mp_${k}">${opts.map(([v, t]) => `<option value="${e(v)}" ${v === f[k] ? "selected" : ""}>${e(t)}</option>`).join("")}</select></label>
      ${a && s ? `<span class="st-q"><b class="st-moins">−${e(n(s.quantite, 0))}</b>${avantApres(n(s.avant, 2), n(s.apres, 2), s.manque > 0)}</span>` : '<span class="st-q small">—</span>'}</div>`;
  };
  return `<h2>Sort du stock</h2>
        ${(d.recoltes || []).length ? `<div class="st-sortie"><span class="st-sortie-l"><b>Miel en vrac</b></span><span class="st-q"><b class="st-moins">−${e(n(b.kg, 2))} kg</b>${avantApres(n(b.vrac), n(b.vrac - b.kg), b.mielCourt)}</span></div>` : ""}
        ${ROLES.map(sortie).join("")}
        ${b.manque.map((s) => `<p class="st-alerte" role="alert">Il te manque ${e(R.quantite(s.manque, s.article.unite))} de ${e(s.article.nom)}.</p>`).join("")}
        ${b.mielCourt ? `<p class="st-alerte st-alerte-douce">Plus que le miel en vrac saisi (${e(n(b.vrac))} kg) : vérifie tes récoltes.</p>` : ""}
      `;
}

/** L'écran « miseenpots ». */
export function ecran() {
  const f = etat(), d = S.d;
  const intrants = ROLES.map(([k]) => f[k]);
  const b = R.bilanMiseEnPots(d, { pots: f.pots, format_g: f.format_g, intrants });
  const extractions = [...new Set((d.recoltes || []).map((r) => r.extraction).filter(Boolean))];
  const say = b.max === null ? `Combien de pots de ${format(f.format_g)} remplis-tu ?`
    : b.max === 0 ? `Il te manque ${b.limite === "miel en vrac" ? "du miel en vrac" : b.limite.toLowerCase()} pour remplir des pots de ${format(f.format_g)}.`
      : `Tu peux remplir jusqu’à ${n(b.max, 0)} pots de ${format(f.format_g)}.`;
  const limite = b.max !== null && b.limite ? (b.limite === "miel en vrac" ? `Miel en vrac : il en reste ${n(b.vrac)} kg, c’est ce qui limite.` : `${b.limite} : il en reste ${n(b.max, 0)}, c’est ce qui limite.`) : "";
  const pret = Number(f.pots) > 0 && !b.manque.length && String(f.code).trim();
  shell("Mise en pots", "Pots vides et miel deviennent des pots de miel", '<button type="button" class="btn" data-act="mpannuler">Annuler</button>',
    `<div class="form st-mp">
      <p class="small st-limite">${e(limite)}</p>
      <section class="card stack"><h2>Quoi</h2>
        <div class="seg st-formats" role="group" aria-label="Format du pot">${formats().map((g) => `<button type="button" class="${g === f.format_g ? "on" : ""}" aria-pressed="${g === f.format_g}" data-act="mpformat" data-v="${g}">${e(format(g))}</button>`).join("")}</div>
        <div class="two"><label>Miel<input id="mp_miel" value="${e(f.miel)}" list="mp_miels" autocomplete="off"></label>
          <label>Prix du pot (€)<input id="mp_prix" type="number" inputmode="decimal" step="0.01" min="0" value="${e(f.prix)}"></label></div>
        <datalist id="mp_miels">${[...new Set(["Toutes fleurs", ...(d.lots || []).map((l) => l.miel)])].map((m) => `<option value="${e(m)}">`).join("")}</datalist>
        ${extractions.length ? `<label>Extraction (traçabilité)<select id="mp_extraction"><option value="">Aucune</option>${extractions.map((x) => `<option ${x === f.extraction ? "selected" : ""}>${e(x)}</option>`).join("")}</select></label>` : ""}
        <div class="st-pas"><span>Pots à remplir</span><div class="st-pas-c">
          <button type="button" class="st-pas-b" data-act="mppas" data-v="-1" aria-label="Retirer un pot">−</button>
          <input id="mp_pots" type="number" inputmode="numeric" step="1" min="1" value="${e(f.pots)}" aria-label="Nombre de pots">
          <button type="button" class="st-pas-b" data-act="mppas" data-v="1" aria-label="Ajouter un pot">+</button></div></div>
      </section>
      <section class="card u-liste" id="mp_sorties">${sorties(f, b)}</section>
      <section class="card u-liste"><h2>Entre en stock</h2>
        <div class="st-sortie"><span class="st-sortie-l"><span class="st-hex" aria-hidden="true"></span><b>Pot de miel ${e(format(f.format_g))}</b></span><b class="st-plus" id="mp_plus">+${e(n(Number(f.pots) || 0, 0))}</b></div>
        <div class="two"><label>Numéro de lot<input id="mp_code" value="${e(f.code)}" autocomplete="off" required></label>
          <label>Mis en pots le<input id="mp_date" type="date" value="${e(f.date)}" max="${e(today())}"></label></div>
        <label>Date de durabilité minimale (DDM)<input id="mp_ddm" type="date" value="${e(f.ddm)}"></label>
        <div class="st-sortie"><span class="st-sortie-l">Emballage par pot</span><b>${b.emballageParPot ? e(eur(b.emballageParPot)) : "—"}</b></div>
      </section>
      <button type="button" class="btn main block" data-act="mpvalider" ${pret && !S.busy ? "" : "disabled"}>Valider la mise en pots</button>
      <button type="button" class="link st-deja" data-act="mpdeja">Saisir des pots déjà prêts, sans rien retirer du stock</button>
    </div>`);
  const h = document.querySelector(".wrap .head h1");
  if (h) { h.textContent = say; h.closest(".head")?.classList.add("g-tete"); }
  brancher();
  // Nombre de pots tapé : chiffres mis à jour sans redessiner l'écran (le clavier reste ouvert, le bouton reste là).
  document.getElementById("mp_pots")?.addEventListener("input", majChiffres);
}

// Un article choisi : l'écran est redessiné (le résumé en tête dépend des articles).
function brancher() {
  document.querySelectorAll("#mp_sorties select").forEach((x) => x.addEventListener("change", () => { lire(); render(); }));
}

function majChiffres() {
  const f = lire(), b = R.bilanMiseEnPots(S.d, { pots: f.pots, format_g: f.format_g, intrants: ROLES.map(([k]) => f[k]) });
  const z = document.getElementById("mp_sorties");
  if (z) { z.innerHTML = sorties(f, b); brancher(); }
  const plus = document.getElementById("mp_plus");
  if (plus) plus.textContent = `+${n(Number(f.pots) || 0, 0)}`;
  const v = document.querySelector('[data-act="mpvalider"]');
  if (v) v.disabled = !(Number(f.pots) > 0 && !b.manque.length && String(f.code).trim()) || S.busy;
}

/** Ouvre l'écran (ou l'ancienne fiche « Nouveau lot » sans la migration 018). */
export function ouvrir() {
  if (!stockSuivi()) return lotForm();
  S.mp = null;
  go("miseenpots");
}

async function valider(_v, _k, bouton) {
  const f = lire(), intrants = ROLES.map(([k]) => f[k]);
  const b = R.bilanMiseEnPots(S.d, { pots: f.pots, format_g: f.format_g, intrants });
  if (!(Number(f.pots) > 0)) throw new Error("Indique le nombre de pots remplis.");
  if (b.manque.length) throw new Error(`Il te manque ${R.quantite(b.manque[0].manque, b.manque[0].article.unite)} de ${b.manque[0].article.nom}.`);
  if ((S.d.lots || []).some((l) => l.code === f.code.trim())) throw new Error(`Le lot ${f.code.trim()} existe déjà : choisis un autre numéro.`);
  const p = { id: f.id, code: f.code.trim(), miel: f.miel.trim() || "Toutes fleurs", format_g: f.format_g, prix: Number(f.prix) || 0,
    pots: Math.floor(Number(f.pots)), date: f.date || today(), ddm: f.ddm || null, extraction: f.extraction || "",
    intrants: b.sorties.map((s) => ({ article_id: s.article.id, quantite: s.quantite })) };
  if (bouton) bouton.disabled = true;
  S.busy = true;
  try {
    const { error, local } = await appel("mettre_en_pots", { p });
    if (error) throw error;
    S.mp = null; S.lotId = p.id; S.route = "lot";
    if (local) {
      R.appliquerMiseEnPots(S.d, p, { _attente: true });
      typeof HL != "undefined" && HL.garderDonnees();
      render(); toast("Gardé sur le téléphone : envoi au retour du réseau");
    } else { await refresh(); toast(`Lot ${p.code} : ${p.pots} pots de ${format(p.format_g)} en stock`); }
  } finally { S.busy = false; if (bouton?.isConnected) bouton.disabled = false; }
}

/** Actions de la mise en pots ; « newlot » ouvre l'écran (remplace l'ancienne fiche d'app.js). */
export const actions = {
  newlot: () => ouvrir(),
  mpformat: (g) => { lire(); choisirFormat(Number(g)); render(); },
  mppas: (pas) => { const f = lire(); f.pots = Math.max(1, (Math.floor(Number(f.pots)) || 0) + Number(pas)); render(); },
  mpvalider: valider,
  mpannuler: () => { S.mp = null; go("miel"); },
  mpdeja: () => lotForm(),
};
export const remplace = ["newlot"];
