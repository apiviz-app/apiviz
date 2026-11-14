// Apiviz — Miel › Clients en tableau ou en liste (v5.38, maquettes du 13 nov. 2026 validées le 14). Remplace les
// cartes de l'onglet « Clients » (ux.js) : recherche (nom, ville, téléphone), puces Tous / À encaisser / étiquettes
// avec leur nombre, tableau (client, étiquettes, dernier achat, total de l'année, à payer) ou liste ; ceux qui ont
// encore à payer en tête. Le choix tableau / liste est gardé sur l'appareil. Règles : lignesClients() ci-dessous.
// Globales lues à l'appel : S, esc, eur, dfr, render.
import { venteTotal } from "../finances/regles.js";
import { barre, brancherRecherche } from "../materiel/catalogue.js";

const CLE = "apiviz-clients-affichage";
const e = (t) => esc(t);
function etat() {
  if (!S.ck) {
    let vue = "tableau";
    try { if (localStorage.getItem(CLE) === "liste") vue = "liste"; } catch { /* privé */ }
    S.ck = { vue, f: "tous", q: "" };
  }
  return S.ck;
}
export const etiquettesDe = (c) => (Array.isArray(c.etiquettes) && c.etiquettes.length ? c.etiquettes : c.cercle ? [c.cercle] : []);

/** Lignes du tableau des clients (pur) : total de l'année, reste à payer, dernier achat ; triées (à payer d'abord). */
export function lignesClients(d, annee, f = "tous", q = "") {
  const t = String(q || "").trim().toLowerCase(), an = String(annee);
  return (d.clients || []).map((c) => {
    const vs = (d.ventes || []).filter((v) => v.client_id === c.id).sort((a, b) => String(b.date_vente).localeCompare(String(a.date_vente)));
    const du = vs.filter((v) => !v.paye).reduce((s, v) => s + venteTotal(d, v), 0);
    const total = vs.filter((v) => String(v.date_vente || "").slice(0, 4) === an).reduce((s, v) => s + venteTotal(d, v), 0);
    return { client: c, etiquettes: etiquettesDe(c), dernier: vs[0]?.date_vente || "", du: Math.round(du * 100) / 100, total: Math.round(total * 100) / 100 };
  }).filter((l) => {
    if (t && ![l.client.nom, l.client.ville, l.client.telephone].some((x) => String(x || "").toLowerCase().includes(t))) return false;
    if (f === "du") return l.du > 0;
    if (f && f !== "tous") return l.etiquettes.includes(f);
    return true;
  }).sort((a, b) => b.du - a.du || String(b.dernier).localeCompare(String(a.dernier)) || String(a.client.nom).localeCompare(String(b.client.nom), "fr"));
}

/** Puces : Tous, À encaisser, puis chaque étiquette avec son nombre de clients. */
export function pucesClients(d) {
  const tous = lignesClients(d, new Date().getFullYear());
  const et = new Map();
  for (const l of tous) for (const x of l.etiquettes) et.set(x, (et.get(x) || 0) + 1);
  return [{ k: "tous", t: "Tous", n: tous.length }, { k: "du", t: "À encaisser", n: tous.filter((l) => l.du > 0).length, alerte: true },
    ...[...et].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr")).map(([k, n]) => ({ k, t: k, n }))];
}

function corps() {
  const st = etat(), l = lignesClients(S.d, S.annee || new Date().getFullYear(), st.f, st.q), an = S.annee || new Date().getFullYear();
  if (!l.length) return '<p class="small op-vide">Aucun client ne correspond.</p>';
  const ets = (x) => x.etiquettes.map((t) => `<span class="ck-et">${e(t)}</span>`).join("");
  const der = (x) => (x.dernier ? dfr(x.dernier) : "Pas encore d’achat");
  if (st.vue === "liste") return l.map((x) => `<div class="op-carte"><button type="button" class="op-carte-t" data-act="editclient" data-v="${e(x.client.id)}"><b>${e(x.client.nom)}</b>
    <span class="small">${e(der(x))} · ${e(eur(x.total))} en ${an}</span><span>${ets(x)}</span></button>
    ${x.du > 0 ? `<b class="ck-du">${e(eur(x.du))}</b>` : x.client.telephone ? `<a class="small" href="tel:${e(x.client.telephone)}">Appeler</a>` : ""}</div>`).join("");
  return `<div class="op-boite" tabindex="0" aria-label="Clients"><table class="op-table"><thead><tr><th scope="col" class="op-fixe">Client</th><th scope="col">Étiquettes</th><th scope="col">Dernier achat</th><th scope="col" class="op-num">En ${an}</th><th scope="col" class="op-num">À payer</th></tr></thead><tbody>
    ${l.map((x) => `<tr><th scope="row" class="op-fixe"><button type="button" class="op-nom" data-act="editclient" data-v="${e(x.client.id)}"><b>${e(x.client.nom)}</b></button></th>
      <td>${ets(x) || "–"}</td><td class="op-doux">${e(x.dernier ? dfr(x.dernier) : "–")}</td><td class="op-num">${e(eur(x.total))}</td><td class="op-num${x.du > 0 ? " ck-du" : ""}">${x.du > 0 ? e(eur(x.du)) : "–"}</td></tr>`).join("")}
    </tbody></table></div>`;
}

/** Remplace les cartes de l'onglet Clients (s'il est ouvert) par la barre et le tableau ou la liste. */
export function completerClients() {
  const cartes = [...document.querySelectorAll(".wrap article.u-client")];
  if (!cartes.length) return;
  const st = etat();
  cartes[0].insertAdjacentHTML("beforebegin", `<div class="ck">${barre({ q: st.q, vue: st.vue, puces: pucesClients(S.d), actVue: "ckvue", actPuce: "ckfiltre", actif: st.f, place: "Nom, ville, téléphone" })}<div class="op-corps ck-corps">${corps()}</div></div>`);
  cartes.forEach((c) => c.remove());
  brancherRecherche(".ck-corps", (v) => { etat().q = v; }, corps);
}

export const actions = {
  ckvue: (v) => { etat().vue = v === "liste" ? "liste" : "tableau"; try { localStorage.setItem(CLE, etat().vue); } catch { /* privé */ } render(); },
  ckfiltre: (v) => { etat().f = v; render(); },
};
