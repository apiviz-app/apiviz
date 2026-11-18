// Apiviz — fil de l'équipe (v5.59, maquette « Fil de l'équipe » validée le 17 nov. 2026).
//   - Ce que chacun a saisi (visites, ventes, récoltes, événements, photos : V3.fil) et ce que les membres s'écrivent
//     (migration 029) : notes, notes sur une ruche, demandes « @Prénom », réponses.
//   - Une demande adressée à moi passe en tête, encadrée : « Je m'en occupe » crée la tâche (titre et échéance tirés
//     du texte, sur la ruche citée, pour moi) par prendre_demande ; « Répondre » ouvre la réponse.
//   - Puces : Tout, Pour moi, Notes. Écrire demande le réseau ; un lecteur consulte seulement.
// Règles pures : regles.js. Globales d'app.js lues à l'appel : S, esc, shell, render, toast, sb, today, PF, V3, EX,
// byId, messageErreur.
import * as Q from "./regles.js";

const e = (t) => esc(t);
const st = () => (S.fil ||= { charge: null, chargement: false, messages: [], absent: false, erreur: "", filtre: "tout", reponse: null, ruche: "", brouillon: "" });
const lecteur = () => document.documentElement.classList.contains("lecteur");
const enLigne = () => navigator.onLine !== false;
const exploitation = () => (typeof EX != "undefined" && EX.courante?.()) || "";
const monMail = () => String((typeof S != "undefined" && S.session?.user?.email) || "").toLowerCase();
const membres = () => (typeof PF != "undefined" && PF.membres?.()) || [];
const absente = (err) => ["42P01", "PGRST205", "PGRST202", "42883"].includes(err?.code);
const nomDe = (email) => {
  const m = String(email || "").toLowerCase();
  if (!m) return "Quelqu’un";
  if (m === monMail()) return "Toi";
  return membres().find((x) => x.email === m)?.nom || m.split("@")[0];
};
const monPrenom = () => (typeof PF != "undefined" && PF.prenom?.()) || "";
const initiale = (email) => (String(email || "").toLowerCase() === monMail() ? monPrenom() || "T" : nomDe(email))[0]?.toUpperCase() || "?";
const ruches = () => [...(S.d.ruches || [])].sort((a, b) => String(a.nom).localeCompare(String(b.nom), "fr", { numeric: true }));

export async function charger(force = false) {
  const s = st();
  if (s.chargement || (!force && s.charge === exploitation())) return;
  s.chargement = true;
  try {
    const r = await sb.from("messages").select("*").order("created_at", { ascending: false }).limit(300);
    if (absente(r.error)) Object.assign(s, { absent: true, messages: [] });
    else if (r.error) s.erreur = "Les messages n’ont pas pu être chargés. Vérifie le réseau.";
    else Object.assign(s, { messages: r.data || [], absent: false, erreur: "" });
    s.charge = exploitation();
  } finally { s.chargement = false; }
  if (S.route === "fil") render();
}

/** Activité de V3 (tableaux) → objets. */
const activite = () => (typeof V3 != "undefined" && V3.fil ? V3.fil(60) : []).map(([quand, qui, titre, sous, act, v]) => ({ quand, qui, titre, sous, act, v }));

/** Texte d'un message, la mention mise en valeur. */
const texte = (t) => e(t).replace(/@([\p{L}\p{N}._-]+)/gu, '<b class="fe-mention">@$1</b>');

function carteMessage(x) {
  const m = x.m, moi = String(m.auteur).toLowerCase() === monMail(), r = m.ruche_id ? byId(S.d.ruches || [], m.ruche_id) : null;
  const tag = x.demande ? `<span class="tag ${x.prise ? "good" : "watch"}">${x.prise ? "Prise en charge" : "Demande"}</span>` : r ? `<span class="tag">Note · ${e(r.nom)}</span>` : "";
  const tache = m.tache_id ? byId(S.d.taches || [], m.tache_id) : null;
  const etat = x.prise
    ? `<p class="small fe-etat">${e(nomDe(m.pris_par))} ${m.pris_par && String(m.pris_par).toLowerCase() === monMail() ? "t’en occupes" : "s’en occupe"}${tache ? ` · tâche « ${e(tache.titre)} »${tache.echeance ? ` pour le ${e(new Date(tache.echeance + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))}` : ""}` : ""}</p>`
    : x.demande && !x.pourMoi ? `<p class="small fe-etat">En attente de ${e(nomDe(m.pour))}</p>` : "";
  const reps = x.reponses.map((rp) => `<li><b>${e(nomDe(rp.auteur))}</b> <span class="small">· ${e(Q.ilYa(rp.created_at))}</span><p>${texte(rp.texte)}</p></li>`).join("");
  const ecrire = !lecteur();
  const titreT = x.pourMoi ? Q.titreTache(m.texte) : "";
  const ech = x.pourMoi ? Q.echeance(m.texte, today()) : "";
  return `<li class="fe-carte${x.pourMoi ? " pour-moi" : ""}">
    <div class="fe-tete"><span class="fe-av${moi ? " moi" : ""}" aria-hidden="true">${e(initiale(m.auteur))}</span>
      <span class="fe-qui"><b>${e(nomDe(m.auteur))}</b> <span class="small">· ${e(Q.ilYa(m.created_at))}</span></span>${tag}</div>
    <p class="fe-texte">${texte(m.texte)}</p>
    ${r && x.demande ? `<button type="button" class="link fe-ruche" data-act="ruche" data-v="${e(r.id)}">${e(r.nom)}</button>` : ""}
    ${etat}
    ${reps ? `<ul class="fe-reponses">${reps}</ul>` : ""}
    ${ecrire ? `<div class="fe-actions">${x.pourMoi ? `<button type="button" class="btn fe-prendre" data-act="feprendre" data-v="${e(m.id)}">Je m’en occupe</button>` : ""}
      <button type="button" class="btn" data-act="fereponse" data-v="${e(m.id)}">Répondre</button>
      ${moi ? `<button type="button" class="link fe-suppr" data-act="fesuppr" data-v="${e(m.id)}">Supprimer</button>` : ""}</div>` : ""}
    ${x.pourMoi && ecrire ? `<p class="small">« Je m’en occupe » crée la tâche « ${e(titreT)} »${ech ? ` pour le ${e(new Date(ech + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))}` : ""}.</p>` : ""}
  </li>`;
}

function carteActivite(a) {
  const qui = a.qui ? nomDe(a.qui) : "";
  const corps = `<span class="fe-hex" aria-hidden="true"></span><span class="fe-act-t"><span>${qui ? `<b>${e(qui)}</b> · ` : ""}${e(a.titre)}</span><span class="small">${e([a.sous, Q.ilYa(a.quand)].filter(Boolean).join(" · "))}</span></span>`;
  return `<li class="fe-act">${a.v ? `<button type="button" data-act="${e(a.act)}" data-v="${e(a.v)}">${corps}</button>` : `<div>${corps}</div>`}</li>`;
}

export function ecran() {
  const s = st();
  if (s.charge !== exploitation()) charger();
  const n = Q.demandesPourMoi(s.messages, monMail());
  const items = Q.fil(s.messages, activite(), monMail(), s.filtre);
  const puces = [["tout", "Tout"], ["moi", `Pour moi${n ? ` · ${n}` : ""}`], ["notes", "Notes"]];
  const nomEx = (typeof cfg == "function" && cfg().nom) || "";
  const ecrire = !lecteur() && !s.absent;
  const parent = s.reponse ? s.messages.find((m) => m.id === s.reponse) : null;
  const liste = items.map((x) => (x.type === "message" ? carteMessage(x) : carteActivite(x.a))).join("");
  const vide = s.filtre === "moi" ? "Aucune demande pour toi." : s.filtre === "notes" ? "Aucun message pour l’instant. Écris le premier à l’équipe." : "Rien pour le moment.";
  shell("Fil de l’équipe", [nomEx, n ? `${n} demande${n > 1 ? "s" : ""} pour toi` : "Ce que chacun a fait, notes et demandes"].filter(Boolean).join(" · "), "",
    `${s.absent ? '<p class="notice">Les messages arriveront avec la prochaine mise à jour de la base. Le fil montre déjà ce que chacun a saisi.</p>' : ""}
    ${s.erreur ? `<p class="notice">${e(s.erreur)}</p>` : ""}
    <div class="op-puces" role="group" aria-label="Filtrer le fil">${puces.map(([k, t]) => `<button type="button" class="op-puce${s.filtre === k ? " on" : ""}" aria-pressed="${s.filtre === k}" data-act="fefiltre" data-v="${k}">${e(t)}</button>`).join("")}</div>
    ${liste ? `<ol class="fe-liste">${liste}</ol>` : `<p class="small">${vide}</p>`}
    ${typeof EX != "undefined" && EX.responsable?.() ? '<button type="button" class="link fe-supprimes" data-act="go" data-v="activite">Éléments supprimés ces 30 derniers jours</button>' : ""}
    ${ecrire ? `<form class="fe-ecrire" id="fe_form" novalidate>
      ${parent ? `<p class="fe-rep">Réponse à ${e(nomDe(parent.auteur))} <button type="button" class="link" data-act="fereponse" data-v="">Annuler</button></p>` : ""}
      ${membres().filter((m) => m.email !== monMail()).length ? `<div class="fe-mentions" aria-label="Mentionner">${membres().filter((m) => m.email !== monMail()).map((m) => `<button type="button" class="fe-m" data-act="fementionner" data-v="${e(m.nom.split(/\s+/)[0])}">@${e(m.nom.split(/\s+/)[0])}</button>`).join("")}</div>` : ""}
      <div class="fe-ligne">
        <label class="fe-champ"><span class="tb-cache">Écrire à l’équipe</span><textarea id="fe_texte" rows="1" maxlength="1000" placeholder="Écris à l’équipe…" enterkeyhint="send">${e(s.brouillon)}</textarea></label>
        <button type="submit" class="fe-envoyer" aria-label="Envoyer" ${enLigne() ? "" : "disabled"}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      </div>
      ${parent ? "" : `<label class="fe-sur"><span>Sur une ruche</span><select id="fe_ruche"><option value="">Aucune</option>${ruches().map((r) => `<option value="${e(r.id)}"${s.ruche === r.id ? " selected" : ""}>${e(r.nom)}</option>`).join("")}</select></label>`}
      ${enLigne() ? "" : '<p class="small">Il faut le réseau pour écrire à l’équipe.</p>'}
    </form>` : ""}`);
  document.querySelector(".wrap")?.classList.add("fe-ecran");
  const f = document.getElementById("fe_form");
  if (f) {
    // Téléphone : la zone d'écriture se pose juste au-dessus de la barre du bas, quelle que soit sa hauteur.
    const barre = document.querySelector(".bottom");
    const cs = barre ? getComputedStyle(barre) : null;
    if (cs && cs.position === "fixed" && cs.display !== "none") f.style.setProperty("--fe-bas", Math.max(0, Math.round(innerHeight - barre.getBoundingClientRect().top)) + "px");
    const t = document.getElementById("fe_texte");
    t.addEventListener("input", () => { s.brouillon = t.value; t.style.height = "auto"; t.style.height = Math.min(160, t.scrollHeight) + "px"; });
    t.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); f.requestSubmit(); } });
    document.getElementById("fe_ruche")?.addEventListener("change", (ev) => { s.ruche = ev.target.value; });
    f.addEventListener("submit", (ev) => { ev.preventDefault(); envoyer(); });
  }
}

let envoi = false;
async function envoyer() {
  const s = st(), t = String(s.brouillon || "").trim();
  if (!t || envoi) return;
  if (!enLigne()) return toast("Il faut le réseau pour écrire à l’équipe.");
  const parent = s.reponse ? s.messages.find((m) => m.id === s.reponse) : null;
  const qui = Q.mention(t, membres().filter((m) => m.email !== monMail()));
  const ligne = { id: crypto.randomUUID(), texte: t.slice(0, 1000), auteur: monMail(), pour: !parent && qui ? qui.email : "",
    ruche_id: parent ? parent.ruche_id || null : s.ruche || null, parent_id: parent ? parent.id : null };
  envoi = true;
  try {
    const r = await sb.from("messages").insert(ligne);
    if (r.error) throw r.error;
    Object.assign(s, { brouillon: "", reponse: null, ruche: "" });
    await charger(true);
    toast(ligne.pour ? `Demande envoyée à ${qui.nom.split(/\s+/)[0]}` : "Message envoyé");
  } catch (err) {
    toast(typeof messageErreur == "function" ? messageErreur(err) : "Le message n’est pas parti.");
  } finally { envoi = false; }
}

async function prendre(id) {
  const s = st(), m = s.messages.find((x) => x.id === id);
  if (!m) return;
  const p = { id: crypto.randomUUID(), titre: Q.titreTache(m.texte) || "Demande de l’équipe", echeance: Q.echeance(m.texte, today()), assigne: monPrenom().trim() };
  const r = await sb.rpc("prendre_demande", { p_id: id, p });
  if (r.error) return toast(typeof messageErreur == "function" ? messageErreur(r.error) : "La demande n’a pas pu être prise.");
  await Promise.all([charger(true), typeof refresh == "function" ? refresh() : null]);
  toast(`Tâche créée : ${p.titre}`);
}

function supprimer(id) {
  sheet({ title: "Supprimer ce message ?", intro: "Ses réponses partent avec lui. Une tâche déjà créée reste.", fields: [], label: "Supprimer",
    submit: async () => {
      const r = await sb.from("messages").delete().eq("id", id);
      if (r.error) throw r.error;
      await charger(true);
      toast("Message supprimé");
    } });
}

export const actions = {
  fefiltre: (v) => { st().filtre = v; render(); },
  fereponse: (id) => {
    const s = st(), m = s.messages.find((x) => x.id === id);
    s.reponse = id || null;
    if (m && !s.brouillon.trim()) { const qui = nomDe(m.auteur); s.brouillon = qui === "Toi" ? "" : `@${qui.split(/\s+/)[0]} `; }
    render();
    const t = document.getElementById("fe_texte");
    if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
  },
  fementionner: (nom) => {
    const s = st(), t = document.getElementById("fe_texte");
    s.brouillon = `${(t?.value ?? s.brouillon).replace(/\s*$/, "")}${(t?.value ?? s.brouillon).trim() ? " " : ""}@${nom} `;
    if (t) { t.value = s.brouillon; t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
  },
  feprendre: (id) => prendre(id),
  fesuppr: (id) => supprimer(id),
};
