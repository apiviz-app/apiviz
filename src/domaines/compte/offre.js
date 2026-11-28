// Apiviz — offres et gouttes d'API (IT-27, première partie ; migration 029). Maquette « Apiviz — Offres et IA »
// du 18 nov. 2026, validée par Pierre-Louis : gouttes au coût réel, partagées par l'exploitation, trois offres.
// - « offre » (Réglages › Offre et gouttes d'API) : offre en vigueur, jauge de gouttes, dépenses du mois, réglage de
//   réponse par défaut, résiliation ; bloc « Équipe Apiviz » pour activer une offre ou créditer des gouttes sans payer.
// - « offres » : les trois offres, au mois ou à l'année ; essai de 30 jours pour un responsable, une fois.
// - « recharge » : sachets de gouttes et où va l'argent.
// Paiement par carte (migration 043, IT-27 deuxième partie) : la fonction serveur « paiement » ouvre la page Stripe
// (abonnement ou recharge) ou l'espace client Stripe ; « stripe-webhook » écrit le résultat. Tant que la fonction n'est
// pas là (ou sans clé Stripe), l'écran garde « Le paiement arrive bientôt ». Retour de Stripe : ?paiement=ok|recharge|
// annule|gere, effacé de l'adresse en arrivant.
// Aucune limite ne bloque une saisie ni la lecture. Sans migration 029 : « Les offres arrivent bientôt sur cette base ».
// Globales lues à l'appel : S, sb, esc, shell, render, toast, fail, ACT.
import * as R from "./regles-offre.js";

const st = { cle: "", data: null, offres: [], chargement: null, indispo: false, an: true, pack: 0, paiement: null, paiementEnVol: false, retour: "" };
const cleExploitation = () => (typeof sb != "undefined" && sb.rest?.headers?.["x-exploitation"]) || "";
const MODE = "apiviz.api.mode";

/** Réponse d'API par défaut sur cet appareil : « approfondi » (Sonnet) ou « rapide » (Haiku). */
export function modeParDefaut() {
  try { return localStorage.getItem(MODE) === "rapide" ? "rapide" : "approfondi"; } catch { return "approfondi"; }
}
function choisirMode(m) {
  try { localStorage.setItem(MODE, m === "rapide" ? "rapide" : "approfondi"); } catch { /* navigation privée */ }
}

/** Ce qui est connu de l'offre de l'exploitation choisie (null tant que rien n'est chargé). */
export const offreConnue = () => (st.cle === cleExploitation() ? st.data : null);

/** Gouttes restantes après une réponse d'API (la fonction serveur renvoie le solde) : la jauge suit sans recharger. */
export function majGouttes(restant) {
  if (st.data && st.cle === cleExploitation() && Number.isFinite(Number(restant))) st.data.gouttes.total = Number(restant);
}

export async function charger(force = false) {
  const cle = cleExploitation();
  if (!force && st.cle === cle && (st.data || st.indispo)) return st.data;
  if (st.chargement && !force) return st.chargement;
  st.chargement = (async () => {
    const [o, c] = await Promise.all([sb.rpc("mon_offre"), sb.from("offres").select("*").eq("active", true).order("ordre")]);
    st.cle = cle;
    st.indispo = !!(o.error || !o.data || !o.data.gouttes);
    st.data = st.indispo ? null : o.data;
    st.offres = c.error ? [] : c.data || [];
    return st.data;
  })().catch(() => { st.cle = cle; st.indispo = true; st.data = null; return null; }).finally(() => { st.chargement = null; });
  return st.chargement;
}

// ---------- Paiement par carte (Stripe) ----------
async function paiement(corps) {
  const { data } = await sb.auth.getSession();
  const jeton = data?.session?.access_token;
  if (!jeton) throw new Error("Connecte-toi pour payer.");
  const x = cleExploitation();
  const rep = await fetch(`${window.APIDOO.url}/functions/v1/paiement`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jeton}`, apikey: window.APIDOO.key, ...(x ? { "x-exploitation": x } : {}) },
    body: JSON.stringify(corps),
  });
  const j = await rep.json().catch(() => ({}));
  if (!rep.ok) throw new Error(j.erreur || "Le paiement ne répond pas pour l'instant. Réessaie dans un instant.");
  return j;
}

/** Le paiement par carte est-il ouvert sur cette version (fonction déployée, clé Stripe en place) ? Demandé une fois. */
function verifierPaiement() {
  if (st.paiement !== null || st.paiementEnVol) return;
  if (typeof window == "undefined" || !window.APIDOO?.url) { st.paiement = false; return; }
  // Applis iPhone et Android : une offre numérique s'y vend par l'achat intégré du store (LANCEMENT.md, liste E), et
  // la page Stripe ferait sortir de l'application. Pas de bouton de paiement par carte dans l'appli installée.
  if (window.Plateforme?.native) { st.paiement = false; return; }
  st.paiementEnVol = true;
  paiement({ action: "etat" }).then((j) => { st.paiement = !!j.actif; }).catch(() => { st.paiement = false; })
    .finally(() => { st.paiementEnVol = false; if (["offre", "offres", "recharge"].includes(S.route)) render(); });
}

async function allerPayer(corps) {
  toast("Ouverture du paiement sécurisé…");
  const j = await paiement(corps);
  if (!j.url) throw new Error("Le paiement ne répond pas pour l'instant. Réessaie dans un instant.");
  location.assign(j.url);
}

const MESSAGES_RETOUR = {
  ok: "Merci ! Ton abonnement s'active, cela prend quelques secondes.",
  recharge: "Merci ! Tes gouttes arrivent dans quelques secondes.",
  annule: "Paiement annulé : rien n'a été débité.",
};
/** Retour de Stripe : l'écran « Mon offre », puis l'offre relue quelques fois le temps que Stripe prévienne le serveur. */
function apresRetour() {
  const r = st.retour;
  if (!r) return;
  st.retour = "";
  ACT.go("offre");
  if (MESSAGES_RETOUR[r]) toast(MESSAGES_RETOUR[r]);
  if (r === "annule") return;
  [2000, 5000, 10000].forEach((t) => setTimeout(() => charger(true).then(() => { if (["offre", "offres", "recharge"].includes(S.route)) render(); }), t));
}

const goutte = (taille = 16) => `<svg class="of-goutte" width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>`;
const offreDe = (id) => st.offres.find((o) => o.id === id) || { id, nom: id, gouttes_mois: 0, prix_an_cts: 0, prix_mois_cts: 0, avantages: [] };
const limite = (n, max, mot) => (max ? `${n} ${mot}${n > 1 ? "s" : ""} sur ${max}` : `${n} ${mot}${n > 1 ? "s" : ""}`);
const prenom = (email) => {
  const p = (S.d?.profils || []).find((x) => x.email === email);
  return (p && p.prenom) || String(email || "").split("@")[0] || "?";
};

/** Écran d'attente ou d'absence : rien n'est vide, on dit où l'on en est. */
function attente(titre) {
  const c = cleExploitation();
  if (st.cle !== c && !st.chargement) charger().then(() => { if (["offre", "offres", "recharge"].includes(S.route)) render(); });
  const texte = st.indispo ? "Les offres et les gouttes d'API arrivent bientôt sur cette base. Tout Apiviz reste utilisable, sans limite." : "Un instant, je regarde ton offre…";
  shell(titre, "", "", `<section class="card of-vide" role="status">${goutte(28)}<p>${esc(texte)}</p></section>`);
}

// ---------- Mon offre ----------
function ecranOffre() {
  const d = offreConnue();
  if (!d) return attente("Mon offre");
  const o = offreDe(d.offre), g = d.gouttes, mode = modeParDefaut();
  const etat = R.etatGouttes(g.total);
  const renouv = new Date(`${g.renouvellement}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const mois = d.mois || { par_nature: [], par_membre: [] };
  const depenses = mois.par_nature.reduce((s, x) => s + Number(x.gouttes), 0);
  verifierPaiement();
  const canal = d.abonnement?.canal || "manuel";
  const peutResilier = d.responsable && d.abonnement && d.abonnement.statut !== "resilie" && d.offre !== "decouverte" && canal === "manuel";
  const carte = `<section class="card of-carte" aria-label="Offre en vigueur">
      <div class="of-ligne"><h2>${esc(o.nom)}</h2><span class="of-statut">${esc(R.statutTexte(d.abonnement))}</span></div>
      <p class="of-sous">${esc(o.prix_an_cts ? `${R.prix(o.prix_an_cts)} par an` : "Gratuite")} · ${esc(limite(d.usage.ruches, o.ruches_max, "ruche"))} · ${esc(limite(d.usage.membres, o.membres_max, "membre"))}</p>
      <div class="of-jauge-tete"><span>Gouttes du mois</span><b>${esc(String(Math.round(Number(g.forfait_restant))))} sur ${esc(String(g.forfait))}</b></div>
      <div class="of-jauge" role="meter" aria-label="Gouttes du mois restantes" aria-valuemin="0" aria-valuemax="${g.forfait}" aria-valuenow="${Math.round(Number(g.forfait_restant))}"><i style="width:${R.part(g.forfait_restant, g.forfait)}%"></i></div>
      <div class="of-jauge-pied"><span>${Number(g.recharge) ? `+ ${esc(R.gouttesTexte(g.recharge))} rechargées` : "Aucune recharge"}</span><span>renouvelées le ${esc(renouv)}</span></div>
      ${etat !== "ok" ? `<p class="of-alerte ${etat}" role="status">${etat === "epuise" ? "Plus de gouttes : API attend la recharge ou le mois prochain. Le reste d'Apiviz fonctionne normalement." : `Plus que ${esc(R.gouttesTexte(g.total))}.`}</p>` : ""}
    </section>`;
  const gestes = `<div class="of-gestes"><button type="button" class="btn honey" data-act="go" data-v="recharge">Recharger</button><button type="button" class="btn" data-act="go" data-v="offres">Changer d'offre</button></div>`;
  const detail = `<section class="card"><h2>Ce mois-ci, ${esc(R.gouttesTexte(depenses))}</h2>
      ${mois.par_nature.length ? mois.par_nature.map((x) => `<div class="of-rang"><span>${esc(R.natureTexte(x.nature, x.nb))}</span><b>${esc(R.gouttesTexte(x.gouttes))}</b></div>`).join("")
        : '<p class="small">Aucune question à API ce mois-ci.</p>'}
      ${mois.par_membre.length > 1 ? `<div class="of-rang"><span class="small">Par membre</span><span>${mois.par_membre.map((x) => `${esc(prenom(x.email))} ${esc(String(Math.round(Number(x.gouttes))))}`).join(" · ")}</span></div>` : ""}
      <p class="small">1 goutte = 1 centime de ce que l'IA nous coûte vraiment. Une question courante en prend 2 à 4, une facture 4 à 5. Une réponse en échec ne coûte rien.</p>
    </section>`;
  const reglage = `<section class="card"><h2>Réponse d'API par défaut</h2>
      <div class="of-modes" role="group" aria-label="Réponse par défaut">
        <button type="button" class="of-mode ${mode === "approfondi" ? "on" : ""}" aria-pressed="${mode === "approfondi"}" data-act="ofmode" data-v="approfondi"><b>Approfondie</b><span>2 à 4 gouttes</span></button>
        <button type="button" class="of-mode ${mode === "rapide" ? "on" : ""}" aria-pressed="${mode === "rapide"}" data-act="ofmode" data-v="rapide"><b>Rapide</b><span>moins d'1 goutte</span></button>
      </div><p class="small">Sur cet appareil. La réponse rapide convient aux questions simples (un stock, une date) ; l'approfondie croise plusieurs fiches.</p>
    </section>`;
  const resilier = peutResilier ? `<section class="card"><button type="button" class="link crit" data-act="ofresilier">${d.abonnement.statut === "essai" ? "Arrêter l'essai" : "Résilier l'offre"}</button><p class="small">Tes données restent entières ; seules les gouttes du mois et les limites changent.</p></section>` : "";
  const gerer = canal === "web" && d.responsable ? `<section class="card"><h2>Abonnement par carte</h2>
      <p class="small">Payé par carte, renouvelé tout seul. Carte, factures, changement d'offre ou résiliation : tout se fait dans l'espace de paiement sécurisé (Stripe).</p>
      <button type="button" class="btn" data-act="ofgerer">Gérer mon abonnement</button></section>`
    : canal === "apple" || canal === "google" ? `<section class="card"><p class="small">Abonnement pris sur ${canal === "apple" ? "iPhone (App Store)" : "Android (Google Play)"} : il se gère et se résilie depuis les réglages du téléphone.</p></section>` : "";
  shell("Mon offre", "", "", `<div class="of">${carte}${gestes}${detail}${reglage}${gerer}${resilier}${d.admin ? equipe(d) : ""}</div>`);
}

/** Bloc réservé à l'équipe Apiviz (administrateurs_apiviz) : tester sans payer, en recette comme en production. */
function equipe(d) {
  const ab = d.abonnement;
  return `<section class="card of-equipe"><h2>Équipe Apiviz</h2><p class="small">Visible par l'équipe seulement. En attendant le paiement : poser une offre, créditer des gouttes. Tout est noté dans l'historique des gouttes.</p>
    <div class="of-choix" role="group" aria-label="Offre de l'exploitation">${st.offres.map((o) => `<button type="button" class="btn sm ${d.offre === o.id ? "main" : ""}" data-act="ofadmin" data-v="${esc(o.id)}">${esc(o.nom)}</button>`).join("")}</div>
    <div class="of-choix" role="group" aria-label="Créditer des gouttes">${[100, 400, -100].map((q) => `<button type="button" class="btn sm" data-act="ofcrediter" data-v="${q}">${q > 0 ? "+" : "−"} ${Math.abs(q)} gouttes</button>`).join("")}</div>
    ${ab ? `<p class="small">Abonnement : ${esc(ab.offre)}, ${esc(ab.statut)}, canal ${esc(ab.canal)}${ab.essai_utilise ? ", essai déjà utilisé" : ""}.</p>` : ""}
  </section>`;
}

// ---------- Les offres ----------
function ecranOffres() {
  const d = offreConnue();
  if (!d) return attente("Choisir une offre");
  verifierPaiement();
  const essaiPossible = d.responsable && !d.abonnement?.essai_utilise && d.offre === "decouverte";
  const ab = d.abonnement, abonneWeb = R.abonnementPayeEnCours(ab);
  const carte = (o) => {
    const courante = o.id === d.offre;
    const prixTexte = !o.prix_an_cts ? ["0 €", "pour toujours"]
      : st.an ? [R.prix(o.prix_an_cts), `par an · soit ${R.prix(Math.round(o.prix_an_cts / 12))} par mois`] : [R.prix(o.prix_mois_cts), "par mois"];
    const avantages = [o.ruches_max ? `Jusqu'à ${o.ruches_max} ruches et ${o.membres_max ? `${o.membres_max} membres` : "des membres sans limite"}` : "Ruches et membres sans limite", ...(o.avantages || [])];
    const prixChoisi = st.an ? o.prix_an_cts : o.prix_mois_cts;
    const gestes = [];
    if (courante && !(ab?.statut === "essai" && ab?.canal === "manuel" && st.paiement && d.responsable)) { /* rien à proposer */ }
    else if (!o.prix_an_cts) { /* Découverte */ }
    else if (!d.responsable) gestes.push('<p class="small of-bientot">Seul un responsable de l\'exploitation peut changer d\'offre.</p>');
    else {
      if (essaiPossible && o.essai_jours) gestes.push(`<button type="button" class="btn ${st.paiement ? "" : "main"}" data-act="ofessai" data-v="${esc(o.id)}">Essayer ${o.essai_jours} jours gratuitement</button>`);
      if (st.paiement && abonneWeb) gestes.push(ab.canal === "web"
        ? `<button type="button" class="btn" data-act="ofgerer">${ab.statut === "resilie" ? "Réactiver" : "Changer d'offre"} dans Gérer mon abonnement</button>`
        : '<p class="small">Ton abonnement se change depuis les réglages du téléphone.</p>');
      else if (st.paiement) gestes.push(`<button type="button" class="btn main" data-act="ofabonner" data-v="${esc(o.id)}">${courante ? "Garder cette offre après l'essai" : "S'abonner"} · ${esc(R.prix(prixChoisi))} ${st.an ? "par an" : "par mois"}</button>`);
      else if (!d.admin) gestes.push('<p class="small of-bientot">Le paiement arrive bientôt dans Apiviz.</p>');
      if (d.admin && !courante) gestes.push(`<button type="button" class="btn sm" data-act="ofadmin" data-v="${esc(o.id)}">Activer sans payer (équipe)</button>`);
    }
    const geste = gestes.length ? `<div class="of-gestes">${gestes.join("")}</div>` : "";
    return `<article class="card of-offre ${courante ? "courante" : ""} ${o.id === "rucher" ? "conseil" : ""}">
      <div class="of-ligne"><h2>${esc(o.nom)}</h2>${courante ? '<span class="tag good">Ton offre actuelle</span>' : o.id === "rucher" ? '<span class="tag watch">Conseillé dès 10 ruches</span>' : ""}</div>
      <p class="of-prix"><b>${esc(prixTexte[0])}</b> <span class="small">${esc(prixTexte[1])}</span></p>
      <p class="of-pastille">${goutte()}<span><b>${esc(String(o.gouttes_mois))} gouttes</b> par mois · ${esc(R.environQuestions(o.gouttes_mois))} à API</span></p>
      <ul class="of-liste">${avantages.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>${geste}
    </article>`;
  };
  shell("Choisir une offre", "", "", `<div class="of">
    <p class="small">${esc((typeof cfg == "function" && cfg().nom) || "Ton exploitation")} · ${esc(limite(d.usage.ruches, 0, "ruche"))} · ${esc(limite(d.usage.membres, 0, "membre"))}. Une offre couvre toute l'exploitation.</p>
    <div class="of-periode" role="group" aria-label="Période de paiement">
      <button type="button" class="${st.an ? "" : "on"}" aria-pressed="${!st.an}" data-act="ofperiode" data-v="mois">Au mois</button>
      <button type="button" class="${st.an ? "on" : ""}" aria-pressed="${st.an}" data-act="ofperiode" data-v="an">À l'année · 2 mois offerts</button>
    </div>
    ${st.offres.map(carte).join("")}
    <p class="small">Une limite ne bloque jamais la lecture ni une saisie au rucher. Les gouttes du forfait se renouvellent chaque mois ; celles que tu recharges ne se perdent pas.${st.paiement ? " Paiement par carte sécurisé par Stripe, résiliable à tout moment ; pendant un essai en cours, la carte n'est débitée qu'à sa fin." : ""}</p>
  </div>`);
}

// ---------- Recharge ----------
/** Où vont les euros d'une recharge : coût de l'IA, TVA, frais de paiement, Apiviz (centimes). */
export function repartition(p) {
  const tva = Math.round(p.prix_cts - p.prix_cts / 1.2), frais = Math.round(p.prix_cts * 0.015 + 25), ia = p.gouttes;
  return { ia, tva, frais, apiviz: p.prix_cts - ia - tva - frais };
}

function ecranRecharge() {
  const d = offreConnue();
  if (!d) return attente("Recharger des gouttes");
  verifierPaiement();
  const p = R.RECHARGES[st.pack] || R.RECHARGES[0], r = repartition(p);
  const ligne = (classe, texte, cts) => `<div class="of-rang"><span><i class="of-pt ${classe}" aria-hidden="true"></i>${texte}</span><b>${esc(R.prix(cts))}</b></div>`;
  const barre = ["ia", "tva", "frais", "apiviz"].map((k) => `<i class="${k}" style="width:${(r[k] / p.prix_cts * 100).toFixed(1)}%"></i>`).join("");
  shell("Recharger des gouttes", "", "", `<div class="of">
    <p class="small">Il te reste ${esc(R.gouttesTexte(d.gouttes.total))}. Les recharges sont vendues au prix coûtant de l'IA, plus de quoi couvrir les frais ; elles passent après les gouttes du forfait et ne se perdent pas.</p>
    <div class="of-packs" role="radiogroup" aria-label="Recharge">${R.RECHARGES.map((x, i) => `<button type="button" role="radio" aria-checked="${i === st.pack}" class="of-pack ${i === st.pack ? "on" : ""}" data-act="ofpack" data-v="${i}">
      <span><b>${esc(x.nom)}</b><span class="small">${x.gouttes} gouttes · ${esc(R.environQuestions(x.gouttes))}</span></span><b class="of-pack-prix">${esc(R.prix(x.prix_cts))}</b></button>`).join("")}</div>
    <section class="card"><h2>Où vont tes ${esc(R.prix(p.prix_cts))}</h2><div class="of-barre" aria-hidden="true">${barre}</div>
      ${ligne("ia", "Coût réel de l'IA", r.ia)}${ligne("tva", "TVA (20 %)", r.tva)}${ligne("frais", "Frais de paiement", r.frais)}${ligne("apiviz", "Apiviz", r.apiviz)}
    </section>
    ${st.paiement || !d.admin ? `<button type="button" class="btn main" data-act="ofpayer">Payer ${esc(R.prix(p.prix_cts))}</button>` : ""}
    ${d.admin ? `<button type="button" class="btn ${st.paiement ? "sm" : "main"}" data-act="ofcrediter" data-v="${p.gouttes}">Créditer ${p.gouttes} gouttes sans payer (équipe)</button>` : ""}
    <p class="small">${st.paiement ? "Paiement par carte sécurisé par Stripe : tu reviens ici une fois payé, et les gouttes s'ajoutent toutes seules." : "Paiement par carte bientôt disponible, puis par l'achat intégré sur iPhone et Android."}</p>
  </div>`);
}

// ---------- Actions ----------
async function appliquer(promesse, message) {
  const { data, error } = await promesse;
  if (error) throw new Error(error.message);
  if (data && data.gouttes) st.data = data;
  else await charger(true);
  if (message) toast(message);
  render();
}

export const actions = {
  ofmode: (v) => { choisirMode(v); render(); },
  ofperiode: (v) => { st.an = v !== "mois"; render(); },
  ofpack: (i) => { st.pack = Math.max(0, Math.min(R.RECHARGES.length - 1, Number(i) || 0)); render(); },
  ofpayer: () => (st.paiement ? allerPayer({ action: "recharger", pack: (R.RECHARGES[st.pack] || R.RECHARGES[0]).id }).catch(fail)
    : toast("Le paiement arrive bientôt dans Apiviz. En attendant, l'équipe peut créditer des gouttes à la demande.")),
  ofabonner: (id) => allerPayer({ action: "abonner", offre: id, periode: st.an ? "an" : "mois" }).catch(fail),
  ofgerer: () => allerPayer({ action: "gerer" }).catch(fail),
  ofessai: (id) => appliquer(sb.rpc("demarrer_essai", { p_offre: id }), "Essai démarré : 30 jours offerts.").then(() => ACT.go("offre")).catch(fail),
  ofresilier: () => {
    const essai = st.data?.abonnement?.statut === "essai";
    sheet({ title: essai ? "Arrêter l'essai ?" : "Résilier l'offre ?", fields: [],
      intro: essai ? "Tu reviens tout de suite à Découverte et à ses 30 gouttes par mois. L'essai ne pourra pas être repris." : "L'offre court jusqu'à son échéance, puis l'exploitation passe en Découverte. Tes données restent entières.",
      label: essai ? "Arrêter l'essai" : "Résilier",
      submit: () => appliquer(sb.rpc("resilier_abonnement"), "C'est noté.") });
  },
  ofadmin: (id) => appliquer(sb.rpc("admin_definir_offre", { p_offre: id, p_statut: "actif" }), "Offre posée.").catch(fail),
  ofcrediter: (q) => appliquer(sb.rpc("admin_crediter_gouttes", { p_quantite: Number(q), p_motif: "Équipe Apiviz, sans paiement" }), Number(q) > 0 ? `${q} gouttes créditées.` : `${Math.abs(q)} gouttes retirées.`).catch(fail),
};

// Retour de la page Stripe : ?paiement=… lu une fois, effacé de l'adresse ; traité dès que l'application est prête.
if (typeof window != "undefined" && typeof location != "undefined") {
  try {
    const u = new URL(location.href), r = u.searchParams.get("paiement");
    if (r) {
      st.retour = ["ok", "recharge", "annule", "gere"].includes(r) ? r : "";
      u.searchParams.delete("paiement");
      history.replaceState(history.state, "", u.pathname + u.search + u.hash);
    }
  } catch { /* adresse illisible */ }
  if (window.Noyau?.crochets) window.Noyau.crochets.sur("apresRendu", "retour-paiement", () => {
    if (st.retour && S.d && S.route === "dash") setTimeout(apresRetour, 0);
  });
}

// Pour Réglages (essentiels.js) : la ligne « Offre et gouttes d'API » montre l'offre et les gouttes restantes.
if (typeof window != "undefined" && window.Noyau) window.Noyau.offre = { connue: offreConnue, charger, nom: (id) => offreDe(id).nom, gouttes: R.gouttesTexte, maj: majGouttes };

export const ecrans = [
  { id: "offre", titre: "Mon offre", rubrique: "plus", rendu: ecranOffre, actions },
  { id: "offres", titre: "Choisir une offre", rubrique: "plus", rendu: ecranOffres },
  { id: "recharge", titre: "Recharger des gouttes", rubrique: "plus", rendu: ecranRecharge },
];
