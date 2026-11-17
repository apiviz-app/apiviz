// Apiviz — Miel › Commandes (v5.56, maquettes « Page de commande » et « Commandes reçues » validées le 17 nov. 2026).
//   - La page de commande : un lien public (commande.html?b=<jeton>) à envoyer aux clients, ouvert ou fermé d'un
//     toucher, avec un mot d'accueil et les lieux de retrait. Les miels proposés sont ceux en stock, au prix des lots,
//     moins ce qui est déjà réservé (boutique_publique, migration 026).
//   - Les commandes reçues : à préparer (les plus anciennes d'abord), puis les dernières traitées. « Livrée » crée la
//     vente (client retrouvé par son téléphone ou créé, pots pris dans les lots les plus anciens) par livrer_commande ;
//     « Prévenir » prépare le SMS ; « Annuler » libère les pots réservés.
// Demande le réseau : les commandes arrivent du serveur. Règles pures : terrain-regles.js. Globales d'app.js lues à
// l'appel : S, esc, eur, cfg, shell, render, toast, refresh, sb, sheet, $sheet, PF, EX.
import * as T from "./terrain-regles.js";

const e = (t) => esc(t);
const st = () => (S.cmd ||= { charge: null, chargement: false, boutique: null, commandes: [], absent: false, erreur: "" });
const lecteur = () => document.documentElement.classList.contains("lecteur");
const moi = () => (typeof PF != "undefined" && PF.prenom?.()) || "";
const exploitation = () => (typeof EX != "undefined" && EX.courante?.()) || "";
const base = () => new URL(location.pathname, location.origin).toString();
const absente = (err) => ["42P01", "PGRST205", "PGRST202", "42883"].includes(err?.code);
const quand = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + ` à ${String(d.getHours()).padStart(2, "0")} h ${String(d.getMinutes()).padStart(2, "0")}`; };

export async function charger(force = false) {
  const s = st();
  if (s.chargement || (!force && s.charge === exploitation())) return;
  s.chargement = true;
  try {
    const [b, c] = await Promise.all([sb.from("boutiques").select("*").limit(1), sb.from("commandes").select("*").order("created_at", { ascending: false }).limit(200)]);
    if (absente(b.error) || absente(c.error)) { s.absent = true; }
    else if (b.error || c.error) { s.erreur = "Les commandes n’ont pas pu être chargées. Vérifie le réseau."; }
    else { Object.assign(s, { boutique: (b.data || [])[0] || null, commandes: c.data || [], absent: false, erreur: "" }); }
    s.charge = exploitation();
  } finally { s.chargement = false; }
  if (S.route === "commandes") render();
}

/** Nombre de commandes à préparer (pastille de l'onglet). */
export const nbAPreparer = () => (S.cmd?.commandes || []).filter((c) => c.statut === "nouvelle").length;

export function ecran() {
  const s = st();
  if (s.charge !== exploitation()) charger();
  const ecrire = !lecteur();
  if (s.absent) return shell("Commandes", "", "", '<p class="notice">Les commandes en ligne arriveront avec la prochaine mise à jour de la base.</p>');
  if (s.charge !== exploitation()) return shell("Commandes", "", "", '<p class="small">Chargement…</p>');
  const b = s.boutique, { aPreparer, traitees } = T.rangerCommandes(s.commandes);
  const pots = aPreparer.reduce((t, c) => t + T.potsCommande(c), 0);
  const carte = !b
    ? `<section class="cm-page"><span class="cm-ic" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/></svg></span>
        <div class="cm-page-t"><b>Une page de commande pour tes clients</b><span class="small">Ils réservent leurs pots en ligne, tu les prépares et tu encaisses au retrait.</span></div>
        ${ecrire ? '<button type="button" class="btn" data-act="cmcreer">Créer ma page</button>' : ""}</section>`
    : `<section class="cm-page${b.ouverte ? " ouverte" : ""}"><span class="cm-ic" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/></svg></span>
        <div class="cm-page-t"><b>${b.ouverte ? "Ta page de commande est ouverte" : "Ta page de commande est fermée"}</b>
          <span class="small">${b.retraits?.length ? `${b.retraits.length} lieu${b.retraits.length > 1 ? "x" : ""} de retrait` : "Aucun lieu de retrait"} · les miels en stock, au prix des lots</span></div>
        <div class="cm-page-a">${b.ouverte ? '<button type="button" class="btn" data-act="cmpartager">Partager</button>' : ""}
          ${ecrire ? `<button type="button" class="btn" data-act="cmreglages">Réglages</button><button type="button" class="btn" data-act="cmbasculer">${b.ouverte ? "Fermer" : "Ouvrir"}</button>` : ""}</div></section>`;
  const ligne = (c) => `<li class="cm-c"><div class="cm-c1"><b>${e(c.nom)}</b><b class="cm-m">${e(eur(c.total))}</b></div>
      <div class="small">${e(T.detailCommande(c))}</div>
      <div class="cm-chips">${c.retrait ? `<span class="tag">${e(c.retrait)}</span>` : ""}<span class="tag watch">${e(quand(c.created_at))}</span></div>
      ${c.note ? `<p class="cm-note">${e(c.note)}</p>` : ""}
      ${ecrire ? `<div class="cm-a"><button type="button" class="btn cm-livrer" data-act="cmlivrer" data-v="${e(c.id)}">Livrée</button>
        <a class="btn" href="${e(T.lienSms(c.telephone, T.messagePret(c, (typeof cfg == "function" && cfg().nom) || "")))}">Prévenir</a>
        <button type="button" class="btn" data-act="cmannuler" data-v="${e(c.id)}">Annuler</button></div>` : ""}</li>`;
  const fait = (c) => `<li class="cm-f"><span><b>${e(c.nom)}</b><span class="small">${e(T.detailCommande(c))}</span></span><span class="tag ${c.statut === "livree" ? "good" : ""}">${c.statut === "livree" ? "Livrée" : "Annulée"}</span></li>`;
  shell("Commandes", aPreparer.length ? `${aPreparer.length} à préparer · ${pots} pot${pots > 1 ? "s" : ""} réservé${pots > 1 ? "s" : ""}` : "Rien à préparer", "",
    `${s.erreur ? `<p class="notice">${e(s.erreur)}</p>` : ""}${carte}
    <h2 class="u-titre">À préparer</h2>
    ${aPreparer.length ? `<ul class="cm-liste">${aPreparer.map(ligne).join("")}</ul>` : `<p class="small">Aucune commande à préparer.${b?.ouverte ? "" : " Ouvre ta page de commande et partage son lien."}</p>`}
    ${traitees.length ? `<h2 class="u-titre">Dernières traitées</h2><ul class="cm-liste cm-faites">${traitees.map(fait).join("")}</ul>` : ""}`);
  document.querySelector(".wrap")?.classList.add("cm-ecran");
}

// ---------- Actions ----------
async function ecrireBoutique(modifs, message) {
  const s = st();
  const r = s.boutique
    ? await sb.from("boutiques").update({ ...modifs, modifie_le: new Date().toISOString() }).eq("exploitation_id", s.boutique.exploitation_id)
    : await sb.from("boutiques").insert(modifs);
  if (r.error) throw r.error;
  await charger(true);
  if (message) toast(message);
}

function reglages(creer = false) {
  const b = st().boutique || { message: "", retraits: [] };
  sheet({
    title: "Ta page de commande",
    intro: "Ce que tes clients voient. Les miels proposés sont ceux en stock, au prix de chaque lot.",
    fields: [
      { name: "message", label: "Mot d’accueil (facultatif)", type: "textarea", value: b.message || "" },
      { name: "retraits", label: "Lieux de retrait, un par ligne (« Lieu : quand »)", type: "textarea", value: T.ecrireRetraits(b.retraits) || "Chez moi : le samedi matin" },
    ],
    label: creer ? "Créer et ouvrir" : "Enregistrer",
    submit: (v) => ecrireBoutique({ message: String(v.message || "").trim().slice(0, 400), retraits: T.lireRetraits(v.retraits), ...(creer ? { ouverte: true } : {}) },
      creer ? "Page de commande ouverte" : "Page de commande enregistrée"),
  });
}

async function partager() {
  const b = st().boutique;
  if (!b) return;
  const url = T.lienBoutique(base(), b.jeton);
  const texte = "Réservez votre miel en ligne :";
  try {
    if (navigator.share) return await navigator.share({ title: "Commander du miel", text: texte, url });
    await navigator.clipboard.writeText(url);
    toast("Lien copié : colle-le dans un message à tes clients");
  } catch (err) {
    if (err?.name !== "AbortError") sheet({ title: "Lien de ta page", intro: "Copie ce lien et envoie-le à tes clients.", fields: [{ name: "lien", label: "Lien", value: url }], label: "Fermer", submit: () => {} });
  }
}

function livrer(id) {
  const c = st().commandes.find((x) => x.id === id);
  if (!c) return;
  const modes = (typeof cfg == "function" && cfg().modes) || ["Espèces"];
  sheet({
    title: `Commande de ${c.nom}`,
    intro: `${T.detailCommande(c)} · ${eur(c.total)}. La vente s’enregistre et le stock baisse.`,
    fields: [
      { name: "paye", label: "Payée", type: "select", options: [["oui", "Oui, c’est payé"], ["non", "Pas encore (à encaisser)"]], value: "oui" },
      { name: "mode", label: "Mode de paiement", type: "select", options: modes.map((m) => [m, m]), value: modes[0] },
    ],
    label: "Enregistrer la vente",
    submit: async (v) => {
      const paye = v.paye !== "non";
      const r = await sb.rpc("livrer_commande", { p_id: id, p: { paye, mode: paye ? v.mode : "", vendu_par: moi(), encaisse_par: paye ? moi() : "" } });
      if (r.error) throw r.error;
      await charger(true);
      await refresh();
      toast("Commande livrée, vente enregistrée");
    },
  });
}

function annuler(id) {
  const c = st().commandes.find((x) => x.id === id);
  if (!c) return;
  sheet({
    title: "Annuler la commande ?",
    intro: `${c.nom} · ${T.detailCommande(c)}. Les pots réservés redeviennent disponibles. Pense à prévenir le client.`,
    fields: [],
    label: "Annuler la commande",
    submit: async () => {
      const r = await sb.from("commandes").update({ statut: "annulee", traitee_le: new Date().toISOString() }).eq("id", id);
      if (r.error) throw r.error;
      await charger(true);
      toast("Commande annulée");
    },
  });
}

export const actions = {
  cmcreer: () => reglages(true),
  cmreglages: () => reglages(false),
  cmbasculer: () => ecrireBoutique({ ouverte: !st().boutique?.ouverte }, st().boutique?.ouverte ? "Page de commande fermée" : "Page de commande ouverte").catch((err) => toast(err.message)),
  cmpartager: () => partager(),
  cmlivrer: (id) => livrer(id),
  cmannuler: (id) => annuler(id),
};
