// Apiviz — d'un pot à ses ruches, côté écran (v5.83, maquette « Idées à forte valeur », idée 3, validée le 24 nov. 2026).
//   - Fiche de lot (complément après lot.js) : carte « Traçabilité » (ruchers et colonies d'origine, traitements notés
//     pendant la miellée, QR du pot, « Imprimer la fiche du lot ») et carte « Si un souci est signalé sur ce lot »
//     (clients à prévenir, pots vendus sans nom, stock ; « Préparer le message » : SMS, e-mail, copier).
//   - QR du pot : lien « ?lot=<code> » ; ouvert depuis l'appareil photo, il ouvre la fiche du lot une fois connecté ;
//     le scanner d'Apiviz le lit aussi (qr.js). Étiquettes de pots : option « QR de traçabilité » (etiquettes.js lit
//     window.Tracabilite).
// Règles pures : tracabilite.js. Globales lues à l'appel : S, esc, dfr, cfg, byId, go, render, toast, $sheet, $sheetForm,
// Regles, Noyau.
import * as T from "./tracabilite.js";

const e = (t) => esc(t);
const CLE = "apiviz-lot-scanne";
const base = () => new URL(location.pathname, location.origin).toString();

// ---------- Lien ouvert depuis l'appareil photo ----------
if (typeof window != "undefined") {
  try {
    const p = T.lireLienLot(location.href);
    if (p) {
      sessionStorage.setItem(CLE, JSON.stringify(p));
      const u = new URL(location.href);
      u.searchParams.delete("lot");
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    }
  } catch { /* navigation privée */ }
  window.Noyau?.crochets?.sur("apresRendu", "tracabilite", () => {
    let p = null;
    try { p = JSON.parse(sessionStorage.getItem(CLE) || "null"); } catch { return; }
    if (!p || !S.session || !Array.isArray(S.d?.lots) || !S.d.lots.length) return;
    try { sessionStorage.removeItem(CLE); } catch { /* rien */ }
    ouvrirCode(p.code);
  });
}

/** Ouvre la fiche du lot de ce code ; sinon le dit. Rend vrai si le lot a été trouvé. */
export function ouvrirCode(code) {
  const lot = T.trouverLot(S.d.lots, code);
  if (!lot) { toast(`Le lot ${code} n’est pas dans l’exploitation ouverte.`, true); return false; }
  S.lotId = lot.id;
  setTimeout(() => go("lot"), 0);
  return true;
}

// ---------- QR ----------
let chargement = null;
function chargerQr() {
  if (window.qrcode) return Promise.resolve();
  return (chargement ||= new Promise((ok, ko) => {
    const s = document.createElement("script");
    s.src = "./qrcode.js"; s.onload = ok; s.onerror = () => { chargement = null; ko(new Error("qrcode")); };
    document.head.appendChild(s);
  }));
}
const svg = (texte) => {
  const q = window.qrcode(0, "M");
  q.addData(texte);
  q.make();
  return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true, alt: "" }).replace("<svg ", '<svg aria-hidden="true" ');
};
/** SVG du QR d'un lot (charge qrcode.js au besoin). */
export const svgLot = async (lot) => { await chargerQr(); return svg(T.lienLot(base(), lot.code)); };

// ---------- Fiche de lot ----------
const libelle = (lot) => (Regles.produits.estMiel(lot) ? `du miel ${String(lot.miel || "").toLowerCase()}`.trim() : `${Regles.produits.libelleLot(lot)}`);

export function completerLot() {
  if (S.route !== "lot" || !S.lotId) return;
  const lot = byId(S.d.lots, S.lotId);
  if (!lot) return;
  const wrap = document.querySelector(".wrap");
  if (!wrap || wrap.querySelector(".tr-carte")) return;
  wrap.classList.add("tr-ecran");
  const miel = Regles.produits.estMiel(lot);
  const o = T.origine(S.d, lot), t = T.traitementsMiellee(S.d, o), p = T.aPrevenir(S.d, lot);
  const qr = window.qrcode ? svg(T.lienLot(base(), lot.code)) : "";
  if (!window.qrcode) chargerQr().then(() => { if (S.route === "lot") render(); }).catch(() => {});
  const trace = `<section class="card tr-carte" aria-label="Traçabilité">
      <div class="tr-tete"><h2>Traçabilité</h2>${qr ? `<span class="tr-qr" title="QR du pot : ${e(T.lienLot(base(), lot.code))}">${qr}</span>` : ""}</div>
      ${miel ? `<p class="tr-ligne"><span>Ruchers</span><b>${o.ruchers.length ? e(o.ruchers.join(", ")) : "Non reliés"}</b></p>
      <p class="tr-ligne"><span>Colonies</span><b>${o.ruches.length ? e(o.ruches.join(", ")) : "Non reliées"}</b></p>
      <p class="tr-ligne"><span>Récolte</span><b>${o.premiere ? `${e(dfr(o.premiere))}${o.derniere !== o.premiere ? ` au ${e(dfr(o.derniere))}` : ""} · ${e(String(o.kg).replace(".", ","))} kg` : "Non reliée"}</b></p>
      <p class="tr-trait${t.pendant.length ? " tr-alerte" : ""}">${e(T.phraseTraitements(t, dfr))}</p>` : ""}
      ${lot.ddm ? `<p class="tr-ligne"><span>À consommer de préférence avant le</span><b>${e(dfr(lot.ddm))}</b></p>` : ""}
      <p class="small">Le QR imprimé sur l’étiquette du pot ouvre cette fiche.</p>
      <button type="button" class="btn" data-act="trimprimer">Imprimer la fiche du lot</button>
    </section>`;
  const souci = p.vendus ? `<section class="card tr-souci" aria-label="Si un souci est signalé sur ce lot">
      <h2>Si un souci est signalé sur ce lot</h2>
      <p class="tr-ligne"><span>Clients connus qui en ont acheté</span><b>${p.connus.length}</b></p>
      <p class="tr-ligne"><span>Vendus sans nom (marché)</span><b>${p.anonymes}</b></p>
      <p class="tr-ligne"><span>Encore en stock</span><b>${p.stock}</b></p>
      ${p.connus.length ? `<button type="button" class="btn" data-act="trmessage">${p.connus.length > 1 ? `Préparer le message aux ${p.connus.length} clients` : "Préparer le message au client"}</button>` : ""}
    </section>` : "";
  const fil = wrap.querySelector(".er-fil");
  if (fil) fil.insertAdjacentHTML("afterend", trace + souci);
  else wrap.insertAdjacentHTML("beforeend", trace + souci);
}

function preparerMessage() {
  const lot = byId(S.d.lots, S.lotId);
  if (!lot) return;
  const p = T.aPrevenir(S.d, lot), texte = T.message(cfg().nom, lot, libelle(lot));
  const sujet = `Lot ${lot.code}`;
  $sheetForm.onsubmit = (ev) => ev.preventDefault();
  $sheetForm.innerHTML = `<div class="u-entete"><h2>Prévenir les clients du lot ${e(lot.code)}</h2></div>
    <p class="small">${p.connus.map((x) => `${e(x.client.nom)} (${x.quantite})`).join(", ")}${p.anonymes ? ` · ${p.anonymes} vendu${p.anonymes > 1 ? "s" : ""} sans nom : à afficher au marché` : ""}</p>
    <label>Message (modifiable)<textarea id="tr_msg" rows="7">${e(texte)}</textarea></label>
    <div class="u-trois-b">
      <button type="button" class="btn ${p.telephones.length ? "main" : ""}" data-act="trenvoi" data-v="sms" ${p.telephones.length ? "" : "disabled"}>SMS (${p.telephones.length})</button>
      <button type="button" class="btn ${!p.telephones.length && p.emails.length ? "main" : ""}" data-act="trenvoi" data-v="mail" ${p.emails.length ? "" : "disabled"}>E-mail (${p.emails.length})</button>
      <button type="button" class="btn" data-act="trenvoi" data-v="copier">Copier</button></div>
    <p class="small">Le message part de ton téléphone, à ton nom. Les clients sans téléphone ni e-mail ne sont pas prévenus : appelle-les.</p>
    <button type="button" class="btn" data-act="closesheet">Fermer</button>`;
  $sheetForm.dataset.sujet = sujet;
  if (!$sheet.open) $sheet.showModal();
}

async function envoyer(par) {
  const lot = byId(S.d.lots, S.lotId);
  if (!lot) return;
  const p = T.aPrevenir(S.d, lot), texte = document.getElementById("tr_msg")?.value || "";
  if (par === "sms") location.href = `sms:${p.telephones.join(",")}?&body=${encodeURIComponent(texte)}`;
  else if (par === "mail") location.href = `mailto:?bcc=${encodeURIComponent(p.emails.join(","))}&subject=${encodeURIComponent(`Lot ${lot.code}`)}&body=${encodeURIComponent(texte)}`;
  else {
    try { await navigator.clipboard.writeText(texte); toast("Message copié"); } catch { toast("Copie impossible sur cet appareil : sélectionne le texte.", true); }
  }
}

export const actions = {
  trmessage: () => preparerMessage(),
  trenvoi: (par) => envoyer(par),
  trimprimer: () => window.print(),
};

if (typeof window != "undefined") window.Tracabilite = { svgLot, ouvrirCode, lireLienLot: T.lireLienLot };
