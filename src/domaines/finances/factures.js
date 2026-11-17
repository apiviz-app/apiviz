// Apiviz — Finances › Factures (corrections du 17 nov. 2026, maquettes validées par Pierre-Louis).
//   - Liste : les factures d'achat de l'année, rangées par mois (fournisseur, date, numéro, nombre de lignes, qui a
//     acheté, avec quel argent, montant ; trombone quand le fichier est joint). Recherche, puces (Toutes, Avancées par
//     un associé, Par <prénom>, Sans fichier) ; toucher une facture ouvre son détail.
//   - Détail : montant, qui a acheté et avec quel argent, le fichier (voir, joindre, remplacer), les lignes (toucher une
//     ligne ouvre la dépense), le stock qui a bougé avec elle, et « Refaire cet achat ».
//   - Fichier : espace privé « factures » et depenses.fichier (migration 025), ouvert par un lien temporaire signé.
// Règles pures : factures-regles.js. Globales d'app.js lues à l'appel : S, esc, eur, shell, yearSel, render, go, sb,
// toast, refresh, ACT, EX, HL.
import * as F from "./factures-regles.js";
import { SOCIETE } from "./associes.js";

const e = (t) => esc(t);
const etat = () => (S.fa ||= { f: "tout", q: "" });
const enLigne = () => typeof navigator == "undefined" || navigator.onLine !== false;
const lecteur = () => typeof document != "undefined" && document.documentElement.classList.contains("lecteur");
const exploitation = () => (typeof EX != "undefined" && EX.courante?.()) || (typeof sb != "undefined" && sb.rest?.headers?.["x-exploitation"]) || "";
// Migration 025 en place ? La colonne « fichier » revient avec chaque dépense ; sans dépense, on ne sait pas : on essaie.
const avec025 = () => { const l = (S.d?.depenses || []).filter((x) => !x._attente); return !l.length || "fichier" in l[0]; };
const pluriel = (k, mot) => `${k} ${mot}${k > 1 ? "s" : ""}`;
const svg = (d, t = 18) => `<svg viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const I = {
  doc: "M7 3h7l4 4v14H7zM14 3v4h4",
  trombone: "M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7",
  cherche: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  photo: "M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  telecharger: "M12 4v11M7 10l5 5 5-5M5 20h14",
  copie: "M8 8h12v12H8zM16 8V4H4v12h4",
};

const quiPaye = (f) => (!f.paye_par ? "" : f.paye_par === SOCIETE ? "Compte de l’exploitation" : `Avancé par ${f.paye_par}`);

// ---------- Liste ----------
export function ecran() {
  const st = etat(), an = S.annee;
  const toutes = F.factures(S.d);
  const annee = F.filtrer(toutes, { annee: an });
  const vues = F.filtrer(annee, { f: st.f, q: st.q });
  const t = F.totaux(annee);
  const pers = [...new Set(annee.map((x) => x.achete_par).filter(Boolean))];
  const puces = [{ k: "tout", t: "Toutes", n: annee.length }, { k: "avance", t: "Avancées par un associé", n: annee.filter(F.avancee).length },
    ...pers.map((p) => ({ k: "par:" + p, t: `Par ${p}`, n: annee.filter((x) => x.achete_par === p).length })),
    { k: "sansfichier", t: "Sans fichier", n: t.sansFichier }].filter((p) => p.n > 0 || p.k === "tout" || p.k === st.f);
  const ligne = (f) => `<li><button type="button" class="fa-l" data-act="faouvrir" data-v="${e(f.cle)}">
      <span class="fa-ic" aria-hidden="true">${svg(I.doc, 20)}${f.fichier ? `<span class="fa-pj">${svg(I.trombone, 12)}</span>` : ""}</span>
      <span class="fa-t">
        <span class="fa-l1"><b>${e(f.titre)}</b><b class="fa-m">${e(eur(f.montant))}</b></span>
        <span class="fa-l2">${e([F.dateLettres(f.date), f.piece || "sans numéro", pluriel(f.lignes.length, "ligne")].join(" · "))}${f.attente ? ' <span class="tag watch">en attente</span>' : ""}</span>
        <span class="fa-l3">${f.achete_par ? `<span class="fa-chip">${e(f.achete_par)}</span>` : ""}${f.paye_par ? `<span class="fa-chip ${F.avancee(f) ? "avance" : "ok"}">${e(quiPaye(f))}</span>` : ""}${f.fichier ? '<span class="tb-cache">Fichier joint</span>' : ""}</span>
      </span></button></li>`;
  const mois = F.parMois(vues).map((m) => `<section class="fa-mois" aria-label="${e(m.nom)}"><h2 class="fa-mt"><span>${e(m.nom)}</span><span class="fa-mt-n">${e(eur(m.total))}</span></h2>
      <ul class="fa-liste">${m.factures.map(ligne).join("")}</ul></section>`).join("");
  const vide = !annee.length ? `<div class="fa-vide"><p>Aucune facture en ${e(an)}.</p><p class="small">Chaque achat enregistré apparaît ici, avec sa facture si tu la joins.</p></div>`
    : !vues.length ? `<p class="small op-vide">Aucune facture pour ce filtre.</p>` : "";
  shell("Factures", `${pluriel(t.nb, "facture")} · ${eur(t.total)} en ${an}`, yearSel(),
    `<label class="fa-cherche">${svg(I.cherche, 20)}<span class="tb-cache">Chercher une facture</span><input id="fa_q" type="search" value="${e(st.q)}" placeholder="Fournisseur, numéro, article" autocomplete="off" enterkeyhint="search"></label>
    ${annee.length ? `<div class="op-puces" role="group" aria-label="Filtrer">${puces.map((p) => `<button type="button" class="op-puce${st.f === p.k ? " on" : ""}" aria-pressed="${st.f === p.k}" data-act="fafiltre" data-v="${e(p.k)}">${e(p.t)} <span>${p.n}</span></button>`).join("")}</div>
    <div class="fa-tuiles"><div class="fa-tuile"><span>Achats ${e(an)}</span><b>${e(eur(t.total))}</b></div>
      <div class="fa-tuile${t.avance ? " avance" : ""}"><span>Avancé par les associés</span><b>${e(eur(t.avance))}</b>${t.avance ? '<button type="button" class="link" data-act="eadetail">Voir ce qu’il reste à régler</button>' : ""}</div></div>` : ""}
    ${mois}${vide}
    ${lecteur() ? "" : '<div class="op-pied"><button type="button" class="btn main" data-act="newdepense">Ajouter un achat</button></div>'}`);
  document.querySelector(".wrap")?.classList.add("op-ecran", "fa-ecran");
  const q = document.getElementById("fa_q");
  let minuterie = 0;
  q?.addEventListener("input", () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => {
      st.q = q.value; render();
      const q2 = document.getElementById("fa_q");
      if (q2) { q2.focus({ preventScroll: true }); const n = q2.value.length; try { q2.setSelectionRange(n, n); } catch { /* type search */ } }
    }, 180);
  });
}

// ---------- Détail ----------
const courante = () => F.factures(S.d).find((x) => x.cle === S.factureCle) || null;

export function ecranDetail() {
  const f = courante();
  if (!f) {
    shell("Facture", "", "", '<p class="small">Cette facture n’existe plus.</p><button type="button" class="btn" data-act="go" data-v="factures">Voir les factures</button>');
    return;
  }
  const ecrire = !lecteur();
  const mvts = F.mouvementsDe(S.d, f);
  const info = (k, v) => (v ? `<div class="fa-i"><dt>${k}</dt><dd>${e(v)}</dd></div>` : "");
  const fichier = f.fichier
    ? `<div class="fa-fichier"><span class="fa-ic grand" aria-hidden="true">${svg(I.doc, 26)}</span><div><b class="fa-fnom">${e(F.nomFichier(f.fichier))}</b>
        <div class="fa-fact"><button type="button" class="btn" data-act="favoir">Voir</button>${ecrire && enLigne() ? '<button type="button" class="btn" data-act="fajoindre">Remplacer</button>' : ""}</div></div></div>`
    : ecrire && !f.attente && avec025() ? `<p class="small">Pas encore de fichier pour cette facture.</p><button type="button" class="btn fa-joindre" data-act="fajoindre" ${enLigne() ? "" : "disabled"}>${svg(I.photo, 20)}Joindre la facture (photo ou PDF)</button>${enLigne() ? "" : '<p class="small">Il faut le réseau pour envoyer un fichier.</p>'}`
      : `<p class="small">${f.attente ? "Le fichier pourra être joint une fois l’achat envoyé." : "Pas de fichier pour cette facture."}</p>`;
  const lignes = f.lignes.map((l) => `<li><button type="button" class="fa-ligne" data-act="editdepense" data-v="${e(l.id)}"${ecrire ? "" : " disabled"}>
      <span><b>${e(l.libelle || "Ligne")}</b>${l.quantite ? `<span class="small">${e(String(l.quantite).replace(".", ","))} × ${e(eur(Number(l.montant || 0) / Number(l.quantite)))}</span>` : l.categorie ? `<span class="small">${e(l.categorie)}</span>` : ""}</span>
      <b class="fa-m">${e(eur(l.montant))}</b></button></li>`).join("");
  shell(f.titre, [f.piece, F.dateLettres(f.date, true)].filter(Boolean).join(" · "), "",
    `<div class="fa-detail">
      <p class="fa-total"><b>${e(eur(f.montant))}</b>${f.attente ? '<span class="tag watch">en attente d’envoi</span>' : ""}</p>
      <dl class="fa-infos">${info("Acheté par", f.achete_par)}${info("Payé avec", quiPaye(f))}${info("Fournisseur", f.fournisseur)}</dl>
      <section class="fa-bloc" aria-labelledby="fa_pj"><h2 id="fa_pj" class="u-titre">Fichier de la facture</h2>${fichier}</section>
      <section class="fa-bloc" aria-labelledby="fa_lg"><h2 id="fa_lg" class="u-titre">${pluriel(f.lignes.length, "ligne")}</h2>
        <ul class="fa-lignes">${lignes}</ul><p class="fa-somme"><span>Total</span><b>${e(eur(f.montant))}</b></p></section>
      ${mvts.length ? `<section class="fa-bloc fa-stock" aria-labelledby="fa_st"><h2 id="fa_st" class="u-titre">Le stock a bougé avec cette facture</h2>
        <ul>${mvts.map((m) => `<li><b>${m.quantite > 0 ? "+" : ""}${e(String(m.quantite).replace(".", ","))}${m.unite !== "unité" ? ` ${e(m.unite)}` : ""}</b> ${e(m.nom)}</li>`).join("")}</ul></section>` : ""}
      ${ecrire ? `<div class="fa-actions"><button type="button" class="btn" data-act="farefaire">${svg(I.copie)}Refaire cet achat</button></div>` : ""}
    </div>`);
  document.querySelector(".wrap")?.classList.add("fa-ecran");
}

// ---------- Fichier ----------
/** Envoie le fichier d'une facture et l'enregistre sur toutes ses lignes. `cle` : achat_id, ou id d'une dépense seule. */
export async function joindre(f, fichier) {
  const msg = F.controleFichier(fichier);
  if (msg) throw new Error(msg);
  const ex = exploitation();
  if (!ex) throw new Error("Choisis d’abord ton exploitation.");
  const chemin = F.cheminFichier(ex, f.cle, fichier.name, fichier.type);
  const up = await sb.storage.from("factures").upload(chemin, fichier, { contentType: fichier.type, upsert: true });
  if (up.error) throw new Error(/bucket|not found/i.test(up.error.message || "") ? "L’envoi des factures arrivera avec la prochaine mise à jour de la base." : "Le fichier n’a pas pu être envoyé. Réessaie dans un instant.");
  const r = await sb.from("depenses").update({ fichier: chemin }).in("id", f.ids);
  if (r.error) throw r.error;
  // L'ancien fichier, s'il avait un autre nom, ne sert plus.
  if (f.fichier && f.fichier !== chemin) await sb.storage.from("factures").remove([f.fichier]).catch(() => {});
  await refresh();
  toast("Facture jointe");
}

function choisirFichier(f) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/pdf,image/jpeg,image/png,image/webp";
  input.addEventListener("change", () => {
    const x = input.files?.[0];
    if (x) joindre(f, x).then(() => render()).catch((err) => toast(err.message || "Le fichier n’a pas pu être envoyé."));
  }, { once: true });
  input.click();
}

async function voir(f) {
  // Ouvrir l'onglet tout de suite (dans le geste de l'utilisateur), puis y charger le lien signé.
  const w = window.open("", "_blank");
  const { data, error } = await sb.storage.from("factures").createSignedUrl(f.fichier, 600);
  if (error || !data?.signedUrl) { w?.close(); toast("Le fichier n’a pas pu être ouvert. Vérifie le réseau."); return; }
  if (w) w.location.href = data.signedUrl; else location.assign(data.signedUrl);
}

// « Refaire cet achat » : la feuille d'achat préremplie (mêmes articles, quantités et montants, même fournisseur).
function refaire(f) {
  const lignes = f.lignes.filter((l) => l.article_id).map((l) => ({ article_id: l.article_id, quantite: l.quantite ?? "", montant: l.montant ?? "" }));
  ACT.newdepense({ fournisseur_id: f.fournisseur_id || "", lignes, ...(lignes.length ? {} : { libelle: f.lignes[0]?.libelle || "" }) });
}

export const actions = {
  fafiltre: (v) => { etat().f = v; render(); },
  faouvrir: (cle) => { S.factureCle = cle; go("achatfacture"); },
  fajoindre: () => { const f = courante(); if (f) choisirFichier(f); },
  favoir: () => { const f = courante(); if (f?.fichier) voir(f); },
  farefaire: () => { const f = courante(); if (f) refaire(f); },
};
