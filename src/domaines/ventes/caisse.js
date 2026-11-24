// Apiviz — caisse du marché (v5.57, maquette « Caisse du marché » validée le 17 nov. 2026).
// Au marché ou à la porte : on touche les pots (un bouton par miel, format et prix, avec le stock), le total se fait,
// on choisit le mode de paiement, « Encaisser ». La vente passe par creer_vente (017) et la file d'envoi d'offline.js :
// sans réseau, elle est gardée sur le téléphone et le stock baisse tout de suite. Client : « Vente au marché », créé
// une fois (avec le réseau) ; vendu par et argent récolté par : le prénom de la personne connectée.
// Règles pures : terrain-regles.js. Globales d'app.js lues à l'appel : S, esc, eur, cfg, today, shell, render, toast,
// refresh, sb, HL, PF.
import * as T from "./terrain-regles.js";
// v5.77 (migration 037) : offres appliquées toutes seules et remise ponctuelle, comme dans « Nouvelle vente ».
import { blocRemises, calcul, avecRemises, fournirCaisse } from "./remises.js";

const CLIENT = "Vente au marché";
export const CLIENT_MARCHE = CLIENT; // v5.66 : aussi « Vente sans client » de la feuille « Pour qui ? » (pour-qui.js)
const e = (t) => esc(t);
const etat = () => (S.caisse ||= { q: {}, mode: "" });
const appel = (nom, args) => (typeof HL != "undefined" ? HL.rpc(nom, args) : sb.rpc(nom, args));
const lecteur = () => document.documentElement.classList.contains("lecteur");
const enLigne = () => navigator.onLine !== false;
const moi = () => (typeof PF != "undefined" && PF.prenom?.()) || "";
const client = () => (S.d.clients || []).find((c) => String(c.nom).trim().toLowerCase() === CLIENT.toLowerCase()) || null;
const modes = () => { const m = (typeof cfg == "function" && cfg().modes) || []; return m.length ? m : ["Espèces", "Carte", "Chèque"]; };

/** Lignes de vente du panier (lots les plus anciens d'abord), lues par remises.js. */
export const lignesCaisse = () => T.lignesVente(T.produitsCaisse(S.d.lots || []), etat().q).lignes;
/** Client de la caisse (« Vente au marché »), s'il existe déjà. */
export const clientCaisse = () => client();
fournirCaisse({ lignes: lignesCaisse, client: clientCaisse });

export function ecran() {
  const st = etat(), produits = T.produitsCaisse(S.d.lots || []);
  if (!st.mode || !modes().includes(st.mode)) st.mode = modes()[0];
  if (!Object.keys(st.q).length) st.remise = null;
  const total = calcul("caisse").total;
  const pots = Object.values(st.q).reduce((t, n) => t + n, 0);
  const c = client(), jour = c ? T.ventesDuJour(S.d, c.id, today()) : { nb: 0, montant: 0 };
  const tuile = (p) => {
    const n = st.q[p.cle] || 0, reste = p.stock - n;
    return `<button type="button" class="cs-pot${n ? " pris" : ""}" data-act="csajout" data-v="${e(p.cle)}" ${reste > 0 ? "" : "disabled"} aria-label="Ajouter ${e(p.nom)}, ${e(eur(p.prix))}, ${reste} en stock">
      <span class="cs-pot-h"><span class="cs-alv" aria-hidden="true"></span>${n ? `<span class="cs-n">${n}</span>` : ""}</span>
      <b>${e(p.nom)}</b><span class="cs-pot-b"><span>${e(eur(p.prix))}</span><span>${p.stock ? `${reste} en stock` : "épuisé"}</span></span></button>`;
  };
  const lignes = produits.filter((p) => st.q[p.cle]).map((p) => `<li><span>${st.q[p.cle]} × ${e(p.nom)}</span>
      <button type="button" class="cs-moins" data-act="csretire" data-v="${e(p.cle)}" aria-label="Retirer un ${e(p.nom)}">−</button><b>${e(eur(st.q[p.cle] * p.prix))}</b></li>`).join("");
  shell("Caisse du marché", jour.nb ? `${jour.nb} vente${jour.nb > 1 ? "s" : ""} aujourd’hui, ${eur(jour.montant)}` : "Touche un produit pour l’ajouter", "",
    !produits.length ? '<p class="small">Rien en stock. Mets du miel en pots ou ajoute un produit dans Produits › Stock.</p>'
      : `<div class="cs-pots">${produits.map(tuile).join("")}</div>
      <section class="cs-panier" aria-labelledby="cs_p"><div class="cs-ptete"><h2 id="cs_p">Panier</h2>${pots ? '<button type="button" class="link" data-act="csvider">Vider</button>' : ""}</div>
        ${lignes ? `<ul>${lignes}</ul>` : '<p class="small">Rien pour l’instant.</p>'}
        ${pots ? blocRemises("caisse") : ""}
        <p class="cs-total"><span>Total</span><b>${e(eur(total))}</b></p></section>
      <fieldset class="op-choix cs-modes"><legend>Payé en</legend><div>${modes().map((m) => `<label class="op-radio"><input type="radio" name="cs_mode" value="${e(m)}" ${m === st.mode ? "checked" : ""} data-act="csmode" data-v="${e(m)}"><span>${e(m)}</span></label>`).join("")}</div></fieldset>
      ${moi() ? `<p class="small">Vendu par ${e(moi())} · argent récolté par ${e(moi())}</p>` : ""}
      ${!enLigne() && !c ? '<p class="notice">La première vente de la caisse demande le réseau (pour créer le client « Vente au marché »).</p>' : ""}
      ${lecteur() ? "" : `<div class="op-pied"><button type="button" class="btn main" data-act="csencaisser" ${pots ? "" : "disabled"}>${pots ? `Encaisser ${e(eur(total))}` : "Encaisser"}</button></div>`}`);
  document.querySelector(".wrap")?.classList.add("cs-ecran", "op-ecran");
}

export async function clientMarche() {
  const c = client();
  if (c) return c.id;
  if (!enLigne()) throw new Error("Sans réseau, la première vente de la caisse n’est pas possible : il faut créer le client « Vente au marché ».");
  const ligne = { id: crypto.randomUUID(), nom: CLIENT, cercle: "Marché" };
  const { error } = await sb.from("clients").insert(ligne);
  if (error) throw error;
  (S.d.clients ||= []).push(ligne);
  return ligne.id;
}

let enCours = false;
async function encaisser() {
  if (enCours) return;
  const st = etat(), produits = T.produitsCaisse(S.d.lots || []);
  const { lignes, manque } = T.lignesVente(produits, st.q);
  if (manque) return toast(`Plus assez en stock : ${manque}`);
  if (!lignes.length) return;
  const total = calcul("caisse").total;
  enCours = true;
  try {
    const client_id = await clientMarche();
    const p = avecRemises("caisse", { id: crypto.randomUUID(), client_id, date_vente: today(), lignes, paye: true, mode: st.mode,
      livre: true, vendu_par: moi(), encaisse_par: moi() });
    const { error, local } = await appel("creer_vente", { p });
    if (error) throw error;
    st.q = {};
    st.remise = null;
    await refresh();
    toast(local ? `Vente de ${eur(total)} gardée sur le téléphone` : `Vente de ${eur(total)} enregistrée`);
  } catch (err) {
    toast(typeof messageErreur == "function" ? messageErreur(err) : err.message || "La vente n’a pas pu être enregistrée.");
  } finally { enCours = false; }
}

export const actions = {
  csajout: (cle) => { const st = etat(), p = T.produitsCaisse(S.d.lots || []).find((x) => x.cle === cle); if (p && (st.q[cle] || 0) < p.stock) { st.q[cle] = (st.q[cle] || 0) + 1; render(); } },
  csretire: (cle) => { const st = etat(); st.q[cle] = Math.max(0, (st.q[cle] || 0) - 1); if (!st.q[cle]) delete st.q[cle]; render(); },
  csvider: () => { etat().q = {}; etat().remise = null; render(); },
  csmode: (m) => { etat().mode = m; },
  csencaisser: () => encaisser(),
  cscaisse: () => go("caisse"),
};
