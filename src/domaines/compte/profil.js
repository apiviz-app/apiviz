// Apiviz — profil de chaque personne et inscription (v5.38, maquettes du 13-14 nov. 2026 validées le 14 ; migration 021).
//   - Inscription, une seule fois : 1/2 « Bienvenue ! Comment tu t'appelles ? » (prénom, nom, 15 ans ou plus) ;
//     2/2 « Pour mieux te connaître » (tout facultatif, « Passer ») : tranche d'âge, sexe, code postal, ancienneté,
//     « comment as-tu connu Apiviz », activité, nombre de colonies, nouveautés par e-mail. Une personne sans
//     exploitation enchaîne ensuite sur les trois questions de création du rucher (demarrage.js).
//   - Le nom suit le compte (table profils) ; il est aussi recopié sur l'appareil (clé apiviz-prenom-<e-mail>), que
//     lisent l'accueil, le menu et « Entre associés » sans réseau.
//   - Écran « Mon profil » (Réglages › Toi) : identité, réponses, choix (statistiques, nouveautés), effacer ses
//     réponses, télécharger ses données.
//   - Membres : prénom et nom des membres (noms_membres()), personnes sans compte (réglage « associes », proposé dans
//     les achats et les ventes). Les associés proposés = les membres + les personnes sans compte.
// Sans la migration 021 : rien ne change (pas d'inscription, ancien prénom par appareil). Globales lues à l'appel :
// S, sb, esc, shell, sheet, $app, $sheetForm, toast, render, go, cfg, saveCfg, EX, ES, EXP, download, today, fail.
import * as R from "./regles-profil.js";

const e = (t) => esc(t);
const st = { email: "", charge: false, chargement: false, absent: false, ligne: null, noms: null, nomsDe: null, pas: 1, brouillon: null, retour: null };
const email = () => String(S.session?.user?.email || "").toLowerCase();
const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { return null; } return v; };
const clePrenom = () => `apiviz-prenom-${S.session?.user?.email || ""}`;
const clePlusTard = () => `apiviz-inscription-plus-tard-${email()}`;
const plateforme = () => { const p = window.Capacitor?.getPlatform?.(); return p === "ios" || p === "android" ? p : "web"; };

// ---------- Chargement ----------
async function charger() {
  if (st.chargement || !S.session) return;
  if (st.email !== email()) Object.assign(st, { email: email(), charge: false, absent: false, ligne: null, noms: null, nomsDe: null, pas: 1, brouillon: null });
  if (st.charge) return;
  st.chargement = true;
  try {
    const r = await sb.from("profils").select("*").eq("email", email()).maybeSingle();
    if (r.error) {
      if (["PGRST205", "42P01"].includes(r.error.code) || /profils/.test(r.error.message || "")) st.absent = true; // base sans 021
      else if (!/fetch|network|load failed/i.test(r.error.message || "")) throw r.error;
      else return; // hors ligne : on réessaiera
    } else st.ligne = (Array.isArray(r.data) ? r.data[0] : r.data) || null;
    st.charge = true;
    if (st.ligne?.prenom) memo(clePrenom(), st.ligne.prenom);
  } catch (err) { st.charge = true; st.absent = true; typeof journaliser == "function" && journaliser("profil", String(err?.message || err)); }
  finally { st.chargement = false; }
  render();
}
async function chargerNoms() {
  const ex = typeof EX != "undefined" ? EX.courante() : null;
  if (st.absent || !ex || st.nomsDe === ex) return;
  st.nomsDe = ex;
  const r = await sb.rpc("noms_membres");
  st.noms = r.error ? null : r.data || [];
  if (S.route === "membres" || S.route === "reglages") render();
}

/** Vrai tant que l'inscription n'est pas faite (base avec 021, profil absent ou pas fini, pas reportée sur cet appareil). */
export function inscriptionDue() {
  if (!S.session || st.absent || !st.charge) return false;
  if (st.ligne?.inscription_finie) return false;
  if (st.ligne?.prenom && memo(clePlusTard())) return false;
  return true;
}

// ---------- Inscription ----------
const coche = (nom, v, t, val) => `<label class="op-radio"><input type="radio" name="${nom}" value="${e(v)}" ${val === v ? "checked" : ""}><span>${e(t)}</span></label>`;
const groupe = (nom, titre, options, val) => `<fieldset class="op-choix"><legend>${e(titre)}</legend><div>${options.map(([v, t]) => coche(nom, v, t, val)).join("")}</div></fieldset>`;

function ecranInscription() {
  const b = (st.brouillon ||= { ...R.vide(), ...(st.ligne || {}), prenom: st.ligne?.prenom || memo(clePrenom()) || "" });
  const edition = !!st.retour;
  const prog = edition ? "" : `<span class="ob-prog" aria-label="Étape ${st.pas} sur 2"><i class="on"></i><i class="${st.pas >= 2 ? "on" : ""}"></i></span>`;
  let corps, pied;
  if (st.pas === 1) {
    corps = `<svg width="52" height="60" viewBox="0 0 56 64" aria-hidden="true"><path d="M28 2l24 14v32L28 62 4 48V16z" fill="#E3A008"/><path d="M28 18l12 7v14l-12 7-12-7V25z" fill="#FBEFC9"/></svg>
      <div><h1>${edition ? "Ton nom" : "Bienvenue ! Comment tu t’appelles ?"}</h1><p class="ob-sous">On te le demande une seule fois. Ton nom suit ton compte, sur le téléphone comme sur l’ordinateur.</p></div>
      <label>Prénom<input name="prenom" value="${e(b.prenom)}" maxlength="60" autocomplete="given-name" required></label>
      <label>Nom<input name="nom" value="${e(b.nom)}" maxlength="60" autocomplete="family-name" placeholder="Facultatif"></label>
      <div class="ob-av"><b aria-hidden="true">${e((b.prenom || "?")[0].toUpperCase())}</b><span>Tes associés te verront ainsi dans les achats, les ventes et « Entre associés ».</span></div>
      ${edition ? "" : `<label class="ob-coche"><input type="checkbox" name="age15" ${b.age15 ? "checked" : ""}><span>J’ai 15 ans ou plus.</span></label>`}
      <p class="ob-err" role="alert"></p>`;
    pied = edition ? `<button type="button" class="btn" data-act="obannuler">Annuler</button><button type="button" class="btn main" data-act="obsuite">Enregistrer</button>`
      : `<button type="button" class="btn main" data-act="obsuite">Continuer</button>`;
  } else {
    corps = `<div><h1>Pour mieux te connaître</h1><p class="ob-sous">Tout est facultatif. Ça nous aide à savoir qui utilise Apiviz et à l’améliorer.</p></div>
      ${groupe("tranche_age", "Ton âge", R.AGES, b.tranche_age)}
      ${groupe("sexe", "Tu es", R.SEXES, b.sexe)}
      <label>Ton code postal<span class="ob-cp"><input name="code_postal" value="${e(b.code_postal)}" inputmode="numeric" maxlength="5" autocomplete="postal-code" placeholder="33750"><span class="ob-lieu">${e(R.lieu(b.code_postal))}</span></span></label>
      ${groupe("anciennete", "Tu as des abeilles depuis", R.ANCIENNETES, b.anciennete)}
      ${groupe("activite", "Ton activité", R.ACTIVITES, b.activite)}
      ${groupe("colonies", "Nombre de colonies", R.COLONIES, b.colonies)}
      ${groupe("source", "Comment as-tu connu Apiviz ?", R.SOURCES, b.source)}
      <label class="ob-coche"><input type="checkbox" name="newsletter" ${b.newsletter ? "checked" : ""}><span>Je veux recevoir les nouveautés d’Apiviz par e-mail (une fois par mois au plus).</span></label>
      <div class="ob-info"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg><span>Ces réponses ne servent qu’à des statistiques d’ensemble. Elles ne sont ni vendues, ni montrées à tes associés. Tu peux les changer ou les effacer dans Réglages › Mon profil.</span></div>
      <p class="ob-err" role="alert"></p>`;
    pied = edition ? `<button type="button" class="btn" data-act="obannuler">Annuler</button><button type="button" class="btn main" data-act="obfinir">Enregistrer</button>`
      : `<button type="button" class="btn" data-act="obretour">Retour</button><button type="button" class="btn main" data-act="obfinir">Continuer</button>`;
  }
  $app.innerHTML = `<div class="ob"><form class="ob-in" data-form="inscription" novalidate>
    <div class="ob-hd">${prog}${!edition && st.pas === 2 ? '<button type="button" class="link" data-act="obpasser">Passer</button>' : "<span></span>"}</div>
    <div class="ob-corps">${corps}</div><div class="ob-pied">${pied}</div></form></div>`;
  const f = $app.querySelector("form");
  f.addEventListener("input", () => {
    lire();
    const z = $app.querySelector(".ob-lieu"); if (z) z.textContent = R.lieu(st.brouillon.code_postal);
    const av = $app.querySelector(".ob-av b"); if (av) av.textContent = (st.brouillon.prenom || "?")[0].toUpperCase();
  });
  f.addEventListener("submit", (ev) => { ev.preventDefault(); (st.pas === 1 ? ACT.obsuite : ACT.obfinir)(); });
  if (st.pas === 1) setTimeout(() => f.querySelector("[name=prenom]")?.focus(), 50);
}

function lire() {
  const f = $app.querySelector('form[data-form="inscription"]'), b = st.brouillon;
  if (!f || !b) return b;
  for (const el of f.elements) {
    if (!el.name) continue;
    if (el.type === "radio") { if (el.checked) b[el.name] = el.value; }
    else if (el.type === "checkbox") b[el.name] = el.checked;
    else b[el.name] = el.value.trim();
  }
  return b;
}
const erreurEcran = (m) => { const z = $app.querySelector(".ob-err"); if (z) z.textContent = m; };

async function enregistrer(champs) {
  const ligne = { email: email(), ...champs };
  const r = await sb.from("profils").upsert(ligne, { onConflict: "email" }).select().maybeSingle();
  if (r.error) throw r.error;
  const recu = Array.isArray(r.data) ? r.data[0] : r.data;
  st.ligne = recu || { ...(st.ligne || {}), ...ligne };
  if (st.ligne.prenom) memo(clePrenom(), st.ligne.prenom);
  st.nomsDe = null;
}

function terminer() {
  st.brouillon = null; st.pas = 1;
  const retour = st.retour; st.retour = null;
  if (retour) { go(retour); return; }
  render();
}

// ---------- Mon profil ----------
function ecranProfil() {
  const p = st.ligne || {};
  if (st.absent) {
    // Base sans 021 : le prénom reste sur cet appareil (feuille « Ton prénom » d'apparence.js), comme avant la v5.38.
    shell("Mon profil", "", "", `<div class="pf"><h2 class="pf-g"><span>Identité</span><button type="button" class="link" data-act="rgprenom">Modifier</button></h2>
      <div class="pf-bloc"><div class="pf-l"><span>Prénom</span><b>${e(prenom() || "–")}</b></div><div class="pf-l"><span>E-mail</span><b>${e(S.session.user.email)}</b></div></div>
      <p class="small" style="margin:10px 4px 0">Ton prénom reste sur cet appareil pour l’instant ; il suivra ton compte après la prochaine mise à jour de la base.</p></div>`);
    ES.retour("go", "reglages", "‹ Réglages");
    return;
  }
  const ligne = (k, v) => `<div class="pf-l"><span>${e(k)}</span><b>${e(v || "–")}</b></div>`;
  const sw = (cle, titre, on) => `<div class="pf-l"><span style="color:var(--ink)">${e(titre)}</span><button type="button" class="pf-sw" role="switch" aria-checked="${!!on}" aria-label="${e(titre)}" data-act="pfbascule" data-v="${cle}"></button></div>`;
  shell("Mon profil", "", "", `<div class="pf">
    <h2 class="pf-g"><span>Identité</span><button type="button" class="link" data-act="pfnom">Modifier</button></h2>
    <div class="pf-bloc">${ligne("Prénom et nom", [p.prenom, p.nom].filter(Boolean).join(" "))}${ligne("E-mail", S.session.user.email)}
      <div class="pf-l"><span>Mot de passe</span><button type="button" class="link" data-act="pfmdp">Changer</button></div></div>
    <h2 class="pf-g"><span>À propos de toi</span><button type="button" class="link" data-act="pfreponses">Modifier</button></h2>
    <div class="pf-bloc">${ligne("Âge", R.libelle(R.AGES, p.tranche_age))}${ligne("Sexe", R.libelle(R.SEXES, p.sexe))}${ligne("Lieu", R.lieu(p.code_postal))}
      ${ligne("Abeilles depuis", R.libelle(R.ANCIENNETES, p.anciennete))}${ligne("Activité", R.libelle(R.ACTIVITES, p.activite))}
      ${ligne("Colonies", R.libelle(R.COLONIES, p.colonies))}${ligne("Connu par", R.libelle(R.SOURCES, p.source))}</div>
    <h2 class="pf-g"><span>Tes choix</span></h2>
    <div class="pf-bloc">${sw("stats_ok", "Utiliser mes réponses dans les statistiques d’ensemble", p.stats_ok !== false)}${sw("newsletter", "Nouveautés par e-mail", !!p.newsletter)}</div>
    <div class="pf-act">
      <button type="button" class="btn" data-act="pfeffacer">Effacer mes réponses « À propos de toi »</button>
      <button type="button" class="btn" data-act="pftelecharger">Télécharger mes données</button>
      <button type="button" class="link pf-danger" data-act="pfsupprimer">Supprimer mon compte</button>
      <a class="link" href="confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a>
    </div></div>`);
  ES.retour("go", "reglages", "‹ Réglages");
}

// ---------- Membres : noms et personnes sans compte ----------
function completerMembres() {
  chargerNoms();
  const noms = st.noms || [];
  for (const row of document.querySelectorAll(".wrap .ex-row")) {
    const b = row.querySelector(":scope > span > b");
    const mail = b?.textContent?.trim().toLowerCase();
    if (!b || !mail || !mail.includes("@")) continue;
    const n = noms.find((x) => x.email === mail), nom = n ? [n.prenom, n.nom].filter(Boolean).join(" ") : "";
    row.classList.toggle("mb-moi", mail === email());
    b.outerHTML = `<span class="mb-nom"><span class="mb-av" aria-hidden="true">${e(((nom || mail)[0] || "?").toUpperCase())}</span><span><b>${e(nom || mail)}</b>${nom ? `<br><span class="small">${e(mail)}</span>` : ""}</span></span>`;
  }
  const sans = R.sansCompte(cfg());
  const ecrire = !document.documentElement.classList.contains("lecteur");
  const bloc = `<section class="card mb-sans-c"><h2>Sans compte</h2><p class="small">Des personnes qui t’aident sans utiliser Apiviz : elles sont proposées dans « Acheté par » et « Vendu par ».</p>
    ${sans.length ? sans.map((x) => `<div class="ex-row mb-sans"><span class="mb-nom"><span class="mb-av" aria-hidden="true">${e(x[0].toUpperCase())}</span><b>${e(x)}</b></span>${ecrire ? `<span class="actions"><button type="button" class="btn sm" data-act="mbretirer" data-v="${e(x)}">Retirer</button></span>` : ""}</div>`).join("") : '<p class="small">Personne pour l’instant.</p>'}
    ${ecrire ? '<button type="button" class="btn" data-act="mbajouter">Ajouter une personne sans compte</button>' : ""}
    <p class="mb-roles"><b>Responsable</b> : tout, y compris les membres. <b>Membre</b> : saisit et modifie. <b>Lecture seule</b> : consulte et exporte.</p></section>`;
  const premiere = document.querySelector(".wrap .card");
  if (premiere && !document.querySelector(".mb-sans-c")) premiere.insertAdjacentHTML("afterend", bloc);
}

/** Prénoms à proposer dans « Acheté par », « Vendu par » : les membres (avec un prénom) puis les personnes sans compte. */
export function associes() {
  const membres = (st.noms || []).map((x) => x.prenom).filter(Boolean);
  return [...new Set([...membres, ...R.sansCompte(cfg())])];
}
export const moi = () => st.ligne || null;
export const prenom = () => st.ligne?.prenom || String(memo(clePrenom()) || "").trim();
export const nbPersonnes = () => (st.noms ? st.noms.length : 0) + R.sansCompte(cfg()).length;

// ---------- Crochet : l'inscription passe avant le reste ----------
function avantRendu() {
  if (!S.session || S.recovery) return;
  if (!st.charge || st.email !== email()) { charger(); return; }
  if (S.member !== false && S.d) chargerNoms();
  if ((S.member === false || S.d) && (inscriptionDue() || st.retour)) { ecranInscription(); return true; }
}
if (typeof window != "undefined" && window.Noyau?.crochets) window.Noyau.crochets.sur("avantRendu", "inscription", avantRendu);

export const actions = {
  obsuite: async () => {
    const b = lire();
    if (!b.prenom) return erreurEcran("Écris ton prénom.");
    if (!st.retour && !b.age15) return erreurEcran("Apiviz est réservé aux personnes de 15 ans ou plus.");
    try {
      await enregistrer({ prenom: b.prenom.slice(0, 60), nom: (b.nom || "").slice(0, 60), plateforme: st.ligne?.plateforme || plateforme() });
      if (st.retour) { toast("Nom enregistré"); return terminer(); }
      st.pas = 2; ecranInscription(); window.scrollTo?.(0, 0);
    } catch (err) { erreurEcran(typeof messageErreur == "function" ? messageErreur(err) : String(err.message || err)); }
  },
  obretour: () => { lire(); st.pas = 1; ecranInscription(); },
  obpasser: async () => {
    try { await enregistrer({ inscription_finie: new Date().toISOString() }); } catch { memo(clePlusTard(), "1"); }
    terminer();
  },
  obfinir: async () => {
    const b = lire();
    const v = R.controle(b);
    if (v) return erreurEcran(v);
    try {
      await enregistrer({ ...R.reponses(b), newsletter: !!b.newsletter, ...(st.retour ? {} : { inscription_finie: new Date().toISOString() }) });
      toast(st.retour ? "Réponses enregistrées" : `Bienvenue ${st.ligne?.prenom || ""}`.trim());
      terminer();
    } catch (err) { erreurEcran(typeof messageErreur == "function" ? messageErreur(err) : String(err.message || err)); }
  },
  obannuler: () => terminer(),
  pfnom: () => { st.retour = "profil"; st.pas = 1; st.brouillon = null; render(); },
  pfreponses: () => { st.retour = "profil"; st.pas = 2; st.brouillon = null; render(); },
  pfbascule: async (cle) => {
    if (!["stats_ok", "newsletter"].includes(cle)) return;
    const actuel = cle === "stats_ok" ? st.ligne?.stats_ok !== false : !!st.ligne?.newsletter;
    try { await enregistrer({ [cle]: !actuel }); render(); toast(cle === "stats_ok" ? (!actuel ? "Tes réponses comptent dans les statistiques" : "Tes réponses ne comptent plus dans les statistiques") : (!actuel ? "Nouveautés par e-mail : oui" : "Nouveautés par e-mail : non")); }
    catch (err) { fail(err); }
  },
  pfeffacer: async (v, k, bouton) => {
    if (bouton && bouton.dataset.ok !== "1") { bouton.dataset.ok = "1"; bouton.textContent = "Confirmer : effacer mes réponses"; return; }
    try { await enregistrer(R.reponses(R.vide())); render(); toast("Réponses effacées"); } catch (err) { fail(err); }
  },
  pftelecharger: () => {
    const p = { ...(st.ligne || {}), email: S.session.user.email };
    download(`apiviz-mon-profil-${today()}.json`, JSON.stringify(p, null, 2), "application/json");
    if (typeof EXP != "undefined" && EXP.json) EXP.json();
    toast("Ton profil et la sauvegarde de l’exploitation sont téléchargés");
  },
  pfmdp: async () => {
    const r = await sb.auth.resetPasswordForEmail(S.session.user.email, { redirectTo: location.origin + location.pathname });
    toast(r.error ? "Patiente un peu avant de redemander un lien" : "Lien envoyé par e-mail", !!r.error);
  },
  pfsupprimer: () => sheet({ title: "Supprimer mon compte", intro: "La suppression depuis l’application est en préparation. D’ici là, écris à l’adresse indiquée dans la politique de confidentialité : ton compte, ton profil et, si tu es seul responsable, ton exploitation seront effacés. Pense à télécharger tes données avant.", fields: [], label: "J’ai compris", submit: async () => {} }),
  mbajouter: () => sheet({ title: "Personne sans compte", intro: "Elle sera proposée dans « Acheté par » et « Vendu par », pour toute l’exploitation.", fields: [{ name: "prenom", label: "Prénom", required: !0 }],
    submit: (v) => { const nom = String(v.prenom || "").trim().slice(0, 40); if (!nom) throw new Error("Écris un prénom"); return saveCfg({ associes: [...new Set([...R.sansCompte(cfg()), nom])].slice(0, 12) }, `${nom} ajouté`); } }),
  mbretirer: (nom) => saveCfg({ associes: R.sansCompte(cfg()).filter((x) => x !== nom) }, `${nom} retiré`),
};

if (typeof window != "undefined") window.PF = { charger, inscriptionDue, associes, moi, prenom, nbPersonnes, completerMembres, ecranProfil, absent: () => st.absent, etat: () => st };
export { ecranProfil, completerMembres };
