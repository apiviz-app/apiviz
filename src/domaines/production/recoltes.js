// Apiviz — onglet « Récoltes » de Produits (v5.66, maquette « Produits › Récoltes » du 18 nov. 2026, validée).
// Le point d'entrée de la production de miel : la saison en trois chiffres (récolté, en pots, vendu) avec le miel qui
// attend d'être mis en pots, « Saisir une récolte » en bouton principal, « Mettre … en pots », les récoltes regroupées
// par extraction et les autres productions, puis les clients qui ont demandé à être prévenus (message prêt à envoyer).
// Les récoltes quittent l'onglet Stock (nav4.js, completerMiel) pour venir ici.
// Règles : saison.js. Globales lues à l'appel : S, esc, n, cfg, shell, sb, $sheet, $sheetForm, write, toast, fail, U.
// Styles : 65-ventes-clients.css.
import * as R from "./saison.js";
import * as P from "./produits.js";
import { icone, iconeDe } from "./produit.js";

const e = (t) => esc(t);
const lecteur = () => document.documentElement.classList.contains("lecteur");
const kg = (x) => `${n(x)} kg`;
const ALV = (corps, ton = "") => `<span class="rc-alv ${ton}" aria-hidden="true">${corps}</span>`;
const SVG = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  recolte: SVG('<path d="M7 4h10l5 8-5 8H7l-5-8z"/><path d="M9 12h6"/>'),
  pot: SVG('<path d="M8 3h8M7 6h10v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/>'),
  vendu: SVG('<path d="M4 7h16l-1.5 11a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7z"/><path d="M9 7a3 3 0 0 1 6 0"/>'),
  cloche: SVG('<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
};
const dateCourte = (s) => (s ? new Date(s + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "");

export function ecran() {
  const d = S.d, s = R.saison(d), ex = R.extractions(d), autres = R.autresProductions(d), prev = R.aPrevenir(d);
  const resume = s.attente ? `${kg(s.attente)} à mettre en pots` : ex.length ? `${ex.length} récolte${ex.length > 1 ? "s" : ""} saisie${ex.length > 1 ? "s" : ""}` : "Aucune récolte saisie";
  const etape = (icon, ton, val, lab) => `<div class="rc-etape">${ALV(icon, ton)}<b>${e(kg(val))}</b><span class="small">${lab}</span></div>`;
  const saisonHtml = `<section class="card rc-saison" aria-label="Saison ${s.annee}">
    <div class="u-entete"><h2>Saison ${s.annee}</h2>${s.attente ? `<span class="tag watch">${e(kg(s.attente))} en attente</span>` : s.recolte && s.part >= 95 ? '<span class="tag good">Tout est en pots</span>' : ""}</div>
    <div class="rc-trois">${etape(I.recolte, "rc-miel", s.recolte, "récoltés")}${etape(I.pot, "rc-doux", s.enPots, "en pots")}${etape(I.vendu, "rc-gris", s.vendu, "vendus")}</div>
    <div class="track rc-jauge" role="img" aria-label="${s.part} % de la récolte en pots"><i style="width:${s.part}%"></i></div>
    <p class="small">${s.recolte ? `${s.part} % de la récolte de ${s.annee} est en pots.` : `Pas encore de récolte en ${s.annee}. Touche « Saisir une récolte » après l’extraction.`}</p>
    ${s.attente && !lecteur() ? `<button type="button" class="btn rc-pots" data-act="newlot">Mettre les ${e(kg(s.attente))} en pots</button>` : ""}
  </section>`;
  const ligneEx = (x) => `<button type="button" class="u-todo rc-ligne" data-act="editrecolte" data-v="${e(x.id)}">
    <span class="rc-mini" aria-hidden="true">${icone("alveole", 20)}</span>
    <span class="u-todo-t"><b>Récolte ${e(String(x.miel || "de miel").toLowerCase())}</b><span class="small">${e([dateCourte(x.date), R.texteRuches(x), kg(x.kg)].filter(Boolean).join(" · "))}</span></span>
    ${x.enAttenteEnvoi ? '<span class="tag watch">en attente d’envoi</span>' : x.attente ? `<span class="tag watch">${e(kg(x.attente))}</span>` : x.lots.length ? `<span class="tag good">${e(x.lots.join(", "))}</span>` : ""}
    <span class="u-chev" aria-hidden="true">›</span></button>`;
  const ligneLot = (l) => `<button type="button" class="u-todo rc-ligne" data-act="editlot" data-v="${e(l.id)}">
    <span class="rc-mini" aria-hidden="true">${icone(iconeDe(P.categorieDe(l)), 20)}</span>
    <span class="u-todo-t"><b>${e(P.nomLot(l))}</b><span class="small">${e([`Lot ${l.code}`, P.quantiteLot(l, l.pots_initiaux), P.formatLot(l)].filter(Boolean).join(" · "))}</span></span>
    <span class="tag ${Number(l.pots_restants) > 0 ? "good" : ""}">${Number(l.pots_restants) > 0 ? "En stock" : "Épuisé"}</span>
    <span class="u-chev" aria-hidden="true">›</span></button>`;
  const prod = `<section class="card u-liste rc-prod"><div class="u-entete"><h2>Productions</h2>${lecteur() ? "" : '<button type="button" class="link" data-act="newproduit">Autre production</button>'}</div>
    ${ex.map(ligneEx).join("")}${autres.map(ligneLot).join("")}
    ${ex.length || autres.length ? "" : '<p class="small">Aucune récolte saisie. Après l’extraction, note le poids : Apiviz suit ensuite la mise en pots et les ventes.</p>'}</section>`;
  const prevHtml = prev.length ? `<section class="card rc-prevenir"><span class="rc-alv rc-miel" aria-hidden="true">${I.cloche}</span>
    <div class="rc-prevenir-t"><b>${prev.length} client${prev.length > 1 ? "s" : ""} à prévenir</b><span class="small">${e(prev.slice(0, 3).map((c) => c.nom).join(", "))}${prev.length > 3 ? "…" : ""} attend${prev.length > 1 ? "ent" : ""} la prochaine récolte.</span></div>
    ${lecteur() ? "" : '<button type="button" class="btn" data-act="rcprevenir">Prévenir</button>'}</section>` : "";
  shell("Produits", resume, lecteur() ? "" : '<button class="btn honey" data-act="newrecolte">Saisir une récolte</button>', `${saisonHtml}${prevHtml}${prod}`);
}

/* ---------- Prévenir les clients ---------- */
function feuillePrevenir() {
  const prev = R.aPrevenir(S.d), sig = cfg().nom || "";
  const ligne = (c) => {
    const tel = String(c.telephone || "").replace(/[^\d+]/g, ""), mail = String(c.email || "").trim();
    const txt = R.messagePrevenir(c, S.d.lots, sig);
    return `<div class="rc-pv"><span class="pq-t"><b>${e(c.nom)}</b><span class="small">${e(tel ? c.telephone : mail || "Ni téléphone ni e-mail")}</span></span>
      <span class="rc-pv-b">${tel ? `<a class="btn" href="sms:${e(tel)}?&body=${e(encodeURIComponent(txt))}">SMS</a>` : ""}${mail ? `<a class="btn" href="mailto:${e(encodeURIComponent(mail))}?subject=${e(encodeURIComponent("La nouvelle récolte · " + sig))}&body=${e(encodeURIComponent(txt))}">E-mail</a>` : ""}${!tel && !mail ? `<button type="button" class="btn" data-act="rccopier" data-v="${e(c.id)}">Copier</button>` : ""}</span></div>`;
  };
  $sheetForm.onsubmit = (ev) => ev.preventDefault();
  $sheetForm.innerHTML = `<div class="u-entete"><h2>Prévenir la récolte</h2></div>
    <p class="small">Le message part de ton téléphone, à ton nom :</p>
    <p class="rc-message">${e(R.messagePrevenir(prev[0] || { nom: "Clara" }, S.d.lots, sig))}</p>
    <div class="rc-pvs">${prev.map(ligne).join("")}</div>
    <button type="button" class="btn main" data-act="rcprevenus">C’est fait : vider la liste</button>
    <p class="small">Chaque client reste dans tes clients ; il ne sera plus dans « À prévenir ». Tu peux le remettre depuis sa fiche.</p>`;
  if (!$sheet.open) $sheet.showModal();
}

export const actions = {
  rcprevenir: () => feuillePrevenir(),
  rccopier: async (id) => {
    const c = (S.d.clients || []).find((x) => x.id === id);
    try { await navigator.clipboard.writeText(R.messagePrevenir(c, S.d.lots, cfg().nom || "")); toast("Message copié"); }
    catch { toast("Copie impossible sur cet appareil", true); }
  },
  rcprevenus: async () => {
    const ids = R.aPrevenir(S.d).map((c) => c.id);
    if (!ids.length) return $sheet.close();
    try {
      await write(sb.from("clients").update({ prevenir: false }).in("id", ids), `${ids.length} client${ids.length > 1 ? "s" : ""} prévenu${ids.length > 1 ? "s" : ""}`);
      $sheet.close();
    } catch (err) { fail(err); }
  },
};
