// Apiviz — règles du paiement par Stripe (migration 043), partagées par les fonctions « paiement » et
// « stripe-webhook » (fichier identique dans les deux dossiers, vérifié par tests/unitaires/paiement.test.mjs).
// Sans dépendance : tourne dans Deno (Supabase) comme dans Node (tests).

/** Prix Stripe (lookup keys créées dans le tableau de bord) : « rucher_mois », « exploitation_an »… */
export const OFFRES_PAYANTES = ["rucher", "exploitation"];
export const PERIODES = ["mois", "an"];
export const clePrix = (offre, periode) => (OFFRES_PAYANTES.includes(offre) && PERIODES.includes(periode) ? `${offre}_${periode}` : null);
export function deClePrix(cle) {
  const m = /^([a-z]+)_(mois|an)$/.exec(String(cle || ""));
  return m && OFFRES_PAYANTES.includes(m[1]) ? { offre: m[1], periode: m[2] } : null;
}

/** Recharges de gouttes : même liste que src/domaines/compte/regles-offre.js (le serveur ne croit pas le prix envoyé). */
export const RECHARGES = [
  { id: "sachet", nom: "Sachet", gouttes: 400, prix_cts: 600 },
  { id: "pot", nom: "Pot", gouttes: 850, prix_cts: 1200 },
  { id: "seau", nom: "Seau", gouttes: 1800, prix_cts: 2500 },
];
export const recharge = (id) => RECHARGES.find((r) => r.id === id) || null;

/** Corps « application/x-www-form-urlencoded » de l'API Stripe : objets et listes en crochets (a[b][0]=c). */
export function formulaire(obj, prefixe = "", sortie = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    const cle = prefixe ? `${prefixe}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (x !== null && typeof x == "object" ? formulaire(x, `${cle}[${i}]`, sortie) : sortie.append(`${cle}[${i}]`, String(x))));
    else if (typeof v == "object") formulaire(v, cle, sortie);
    else sortie.append(cle, String(v));
  }
  return sortie;
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
function egal(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/**
 * En-tête « Stripe-Signature » (t=…,v1=…) : HMAC SHA-256 de « t.corps » avec le secret du webhook, et horodatage à moins
 * de `tolerance` secondes. Renvoie true ou false, sans lever d'erreur.
 */
export async function signatureValide(entete, corps, secret, { maintenant = Date.now() / 1000, tolerance = 300 } = {}) {
  if (!entete || !secret || typeof corps != "string") return false;
  const parts = String(entete).split(",").map((x) => x.trim().split("="));
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const v1 = parts.filter(([k]) => k === "v1").map(([, v]) => v || "");
  if (!Number.isFinite(t) || !v1.length || Math.abs(maintenant - t) > tolerance) return false;
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const attendu = hex(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(`${t}.${corps}`)));
  return v1.some((v) => egal(v, attendu));
}

const iso = (s) => (Number.isFinite(Number(s)) && Number(s) > 0 ? new Date(Number(s) * 1000).toISOString() : null);

/**
 * Abonnement Stripe → ligne d'abonnements (appliquer_abonnement_externe), ou null s'il ne faut rien écrire
 * (paiement initial pas encore abouti, offre inconnue, exploitation absente).
 *   trialing → essai ; active, past_due (Stripe relance la carte) → actif, sans fin ;
 *   résiliation demandée (cancel_at_period_end ou cancel_at) → resilie, fin = échéance (l'offre court jusque-là) ;
 *   canceled, unpaid, paused → resilie, fin = date de fin (ou maintenant).
 */
export function ligneAbonnement(sub, { exploitation, maintenant = Date.now() } = {}) {
  if (!sub || typeof sub != "object") return null;
  const e = sub.metadata?.exploitation_id || exploitation;
  if (!e) return null;
  const item = sub.items?.data?.[0];
  const prix = deClePrix(item?.price?.lookup_key) || (sub.metadata?.offre ? { offre: sub.metadata.offre, periode: sub.metadata.periode || null } : null);
  if (!prix || !OFFRES_PAYANTES.includes(prix.offre)) return null;
  const base = { exploitation_id: e, canal: "web", offre: prix.offre, periode: prix.periode, externe: sub.id };
  const finPeriode = iso(sub.current_period_end ?? item?.current_period_end);
  switch (sub.status) {
    case "incomplete":
    case "incomplete_expired":
      return null;
    case "trialing":
    case "active":
    case "past_due": {
      const fin = sub.cancel_at ? iso(sub.cancel_at) : sub.cancel_at_period_end ? (sub.status === "trialing" ? iso(sub.trial_end) : finPeriode) : null;
      if (fin) return { ...base, statut: "resilie", fin };
      return { ...base, statut: sub.status === "trialing" ? "essai" : "actif", fin: null };
    }
    default: // canceled, unpaid, paused
      return { ...base, statut: "resilie", fin: iso(sub.ended_at) || new Date(maintenant).toISOString() };
  }
}

/**
 * Essai sans carte en cours (migration 029) : la carte n'est débitée qu'à sa fin. Stripe demande au moins 48 h
 * d'avance pour un essai pris par Checkout : en deçà, l'abonnement commence tout de suite.
 */
export function finEssai(abonnement, maintenant = Date.now()) {
  if (!abonnement || abonnement.statut !== "essai" || abonnement.canal !== "manuel" || !abonnement.fin) return null;
  const t = Math.floor(Date.parse(abonnement.fin) / 1000);
  return Number.isFinite(t) && t * 1000 - maintenant > 49 * 3600e3 ? t : null;
}

/**
 * Abonnement payé (carte ou store) encore en cours : actif, en essai, ou résilié mais pas encore arrivé à échéance
 * (résiliation à la fin de la période). Dans ces cas, un nouvel abonnement ferait payer deux fois la même période :
 * on renvoie vers l'espace de paiement (réactiver, changer d'offre) ou vers le store.
 */
export function abonnementPayeEnCours(abonnement, maintenant = Date.now()) {
  if (!abonnement || !abonnement.canal || abonnement.canal === "manuel") return false;
  if (abonnement.statut !== "resilie") return true;
  const fin = abonnement.fin ? Date.parse(abonnement.fin) : NaN;
  return Number.isFinite(fin) && fin > maintenant;
}

/** Adresse de retour dans l'application : APP_URL + ?paiement=… (l'application l'efface en arrivant). */
export function retour(app, etat) {
  const u = new URL(app || "https://app.apiviz.fr");
  u.searchParams.set("paiement", etat);
  return u.toString();
}
