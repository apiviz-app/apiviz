// Apiviz — signes sanitaires et aide au signalement (IT-12, AP-FEAT-057 et 058 ; AP-US-064, AP-US-065).
//   - Feuille « Noter un signe » : colonies, signes (liste de regles.SIGNES), importance, note ; depuis Santé, la fiche
//     d'une colonie, et dans la visite (section « Signes sanitaires », envoyée après la visite avec son identifiant).
//     Envoi par noter_signes() (migration 036) à travers la file d'envoi. Aucune conclusion automatique : quelques
//     signes invitent à demander l'avis d'un vétérinaire ou du groupement sanitaire.
//   - Écran « signalement » (Aide au signalement) : ce qui est prêt, ce qui manque, contacts saisis par l'apiculteur
//     (réglage contactsSanitaires), fiche au vouvoiement à partager ou copier. apiviz n'envoie rien à sa place.
//     La liste des dangers réglementés n'apparaît qu'une fois relue (regles.DANGERS_REGLEMENTES, relu: true).
// Globales d'app.js lues à l'appel : S, esc, dfr, today, toast, render, shell, sheet, cfg, saveCfg, ACT, HL, sb, UX,
// $sheet, $sheetForm, messageErreur.
import * as SA from "./regles.js";

const e = (t) => esc(t);
const appel = (nom, args) => (typeof HL != "undefined" ? HL.rpc(nom, args) : sb.rpc(nom, args));
const BASE_ANCIENNE = /PGRST202|Could not find the function|noter_signes/;
const ic = (d, t = 20) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const nomR = (id) => (S.d.ruches || []).find((r) => r.id === id)?.nom || "Colonie";

/** Puces des signes (feuille et visite). act : action d'un toucher ; choisis : clés cochées. */
export function pucesSignes(act, choisis) {
  return SA.SIGNES.map((g) => `<div class="field sg-groupe"><div class="t">${e(g.groupe)}</div><div class="op-puces sg-puces">${g.signes.map((s) =>
    `<button type="button" class="op-puce${choisis.includes(s.cle) ? " on" : ""}" aria-pressed="${choisis.includes(s.cle)}" data-act="${act}" data-v="${e(s.cle)}">${e(s.nom)}</button>`).join("")}</div></div>`).join("");
}
const AVIS = "Ce signe mérite l’avis de ton vétérinaire ou de ton groupement sanitaire. Ne conclus pas seul : l’aide au signalement rassemble ce qu’on te demandera.";

// ---------- Feuille « Noter un signe » ----------
function dessiner() {
  const f = S.sg;
  if (!f) return;
  const ruches = S.d.ruches || [], avis = SA.signesAvis(f.signes).length > 0, k = f.signes.length;
  $sheetForm.onsubmit = (ev) => { ev.preventDefault(); enregistrer(); };
  $sheetForm.innerHTML = `<div class="g-ftete"><h2>Noter un signe</h2><button type="button" class="g-fermer" data-act="closesheet" aria-label="Fermer">${ic("M18 6L6 18M6 6l12 12")}</button></div>
    <label>Date<input type="date" id="sg_date" value="${e(f.date)}" max="${e(today())}" required></label>
    <div class="field"><div class="t">Colonies concernées</div><div class="op-puces sg-puces">${ruches.map((r) =>
      `<button type="button" class="op-puce${f.ruches.includes(r.id) ? " on" : ""}" aria-pressed="${f.ruches.includes(r.id)}" data-act="sgcolonie" data-v="${e(r.id)}">${e(r.nom)}</button>`).join("")}</div></div>
    ${pucesSignes("sgsigne", f.signes)}
    ${avis ? `<p class="sg-avis" role="status">${e(AVIS)}</p>` : ""}
    <div class="field"><div class="t">Importance</div><div class="pick sg-imp">${Object.entries(SA.IMPORTANCES).map(([c, t]) =>
      `<button type="button" class="${f.importance === c ? "on" : ""}" aria-pressed="${f.importance === c}" data-act="sgimportance" data-v="${c}">${t}</button>`).join("")}</div></div>
    <label>Note${f.signes.includes("autre") ? " · obligatoire pour « Autre »" : " (facultatif)"}<input id="sg_note" value="${e(f.note)}" placeholder="Où, combien, depuis quand…" autocomplete="off"></label>
    <button class="btn main block" ${k && f.ruches.length && !f.envoi ? "" : "disabled"}>${!k ? "Choisis au moins un signe" : avis ? `Enregistrer et voir l’aide` : `Enregistrer ${UX.pluriel(k, "signe")}`}</button>`;
  if (!$sheet.open) $sheet.showModal();
}
function lire() {
  const f = S.sg, q = (id) => document.getElementById(id);
  if (f && q("sg_date")) { f.date = q("sg_date").value || f.date; f.note = q("sg_note").value; }
  return f;
}
async function enregistrer() {
  const f = lire();
  if (!f || f.envoi) return;
  const p = { id: f.id, date: f.date, ruches: f.ruches, signes: f.signes, importance: f.importance, note: f.note.trim(), visite_id: null };
  const err = SA.validerSignes(p);
  if (err) return toast(err, true);
  f.envoi = true;
  const { error, local } = await appel("noter_signes", { p });
  f.envoi = false;
  if (error) {
    toast(BASE_ANCIENNE.test(`${error.code} ${error.message}`) ? "La base doit être mise à jour pour noter des signes sanitaires (migration 036)." : messageErreur(error), true);
    return dessiner();
  }
  SA.appliquerSignes(S.d, p, local ? { _attente: true } : {});
  if (typeof HL != "undefined") HL.garderDonnees();
  S.sg = null; $sheet.close();
  toast(local ? "Signe gardé sur le téléphone : envoi au retour du réseau." : "Signe noté.");
  if (SA.signesAvis(p.signes).length) { S.sig = p.id; ACT.go("signalement"); } else render();
}

/** Après une visite enregistrée avec des signes (section de la visite) : une observation rattachée à la visite. */
export async function apresVisite(s, faites) {
  const signes = (s?.signes || []).filter(Boolean);
  if (!signes.length || !faites?.length) return;
  const p = { id: crypto.randomUUID(), date: s.date_visite || today(), ruches: faites.map((x) => x.ruche), signes, importance: s.signes_importance || "leger",
    note: "", visite_id: faites.length === 1 ? faites[0].id : null };
  if (SA.validerSignes(p)) return;
  const { error, local } = await appel("noter_signes", { p });
  if (error) return toast(BASE_ANCIENNE.test(`${error.code} ${error.message}`) ? "Visite enregistrée ; les signes demandent la mise à jour de la base (migration 036)." : "Visite enregistrée, mais les signes n’ont pas pu l’être : " + messageErreur(error), true);
  SA.appliquerSignes(S.d, p, local ? { _attente: true } : {});
}

/** Section « Signes sanitaires » de la visite complète (ux.js). */
export function sectionVisite(v) {
  const choisis = v?.signes || [];
  return { resume: choisis.length ? choisis.map(SA.nomSigne).join(", ") : "Ajouter", rempli: choisis.length > 0,
    html: `${pucesSignes("vsigne", choisis)}${SA.signesAvis(choisis).length ? `<p class="sg-avis">${e(AVIS)}</p>` : ""}
      ${choisis.length ? `<div class="field"><div class="t">Importance</div><div class="pick sg-imp">${Object.entries(SA.IMPORTANCES).map(([c, t]) =>
        `<button type="button" class="${(v.signes_importance || "leger") === c ? "on" : ""}" aria-pressed="${(v.signes_importance || "leger") === c}" data-act="vsigneimp" data-v="${c}">${t}</button>`).join("")}</div></div>` : ""}
      <p class="small">Noté dans l’onglet Santé de la colonie, daté, sans conclusion automatique.</p>` };
}

// ---------- Aide au signalement ----------
export function ecranSignalement() {
  const obs = (S.d.observations || []).filter((o) => o.saisie_id === S.sig);
  if (!obs.length) { shell("Aide au signalement", "", "", '<p class="small">Ce signe n’est plus dans tes données.</p>'); return; }
  const o = obs[0], ruches = obs.map((x) => x.ruche_id), noms = ruches.map(nomR);
  const r0 = (S.d.ruches || []).find((r) => r.id === ruches[0]);
  const rucher = r0?.rucher || "Sans rucher";
  const total = (S.d.ruches || []).filter((r) => (r.rucher || "Sans rucher") === rucher).length;
  const c = typeof cfg == "function" ? cfg() : {}, contacts = c.contactsSanitaires || {};
  const varroa = ruches.map((id) => SA.dernierComptage(S.d, id)).filter(Boolean).sort((a, b) => String(b.date_visite).localeCompare(String(a.date_visite)))[0];
  const varroaTxt = varroa ? `${SA.resultat(varroa).texte}${varroa.varroa_methode ? " au " + varroa.varroa_methode.toLowerCase() : ""} le ${dfr(varroa.date_visite)}` : "";
  const dangers = SA.dangersPour(o.signes);
  const pret = [
    [true, "Date et rucher", `${dfr(o.date_observation)} · ${rucher}`],
    [true, ruches.length > 1 ? "Colonies et signes" : "Colonie et signes", `${noms.join(", ")} · ${o.signes.map(SA.nomSigne).join(", ").toLowerCase()} · ${SA.IMPORTANCES[o.importance]?.toLowerCase() || ""}`],
    [!!varroa, "Varroa récent", varroaTxt || "Aucun comptage : compte si tu peux"],
    [!!c.napi, "Numéro d’apiculteur (NAPI)", c.napi || "À renseigner dans Réglages"],
  ];
  const OK = "M5 12l5 5 9-10", MANQUE = "M12 7v6M12 17h.01";
  const fiche = SA.ficheSignalement({ date: o.date_observation, rucher, colonies: noms, total, signes: o.signes.map(SA.nomSigne),
    importance: SA.IMPORTANCES[o.importance], varroa: varroaTxt, note: o.note, apiculteur: c.nom || "", napi: c.napi || "", contact: S.session?.user?.email || "" });
  S.sigTexte = fiche;
  shell("Aide au signalement", `${noms.length > 2 ? UX.pluriel(noms.length, "colonie") : noms.join(", ")} · ${rucher} · ${dfr(o.date_observation)}`,
    '<button type="button" class="btn main" data-act="sigpartager">Partager la fiche</button><button type="button" class="btn" data-act="sigcopier">Copier la fiche</button><button type="button" class="btn" data-act="sigcontacts">Modifier les contacts</button>',
    `<div class="sg-ecran">
      <section class="card sg-info"><p>apiviz <b>n’envoie rien à ta place</b>. Il rassemble ce qu’on te demandera et prépare une fiche à remettre ou à joindre à ton message.</p></section>
      ${dangers.length ? `<section class="card sg-dangers"><h2>À signaler</h2>${dangers.map((x) => `<p><b>${e(x.nom)}</b></p>`).join("")}
        <p class="small">Source : ${e(SA.SOURCE_DANGERS.titre)} · consultée le ${e(dfr(SA.SOURCE_DANGERS.consulte_le))}</p></section>`
        : SA.signesAvis(o.signes).length ? `<section class="card sg-avis-c"><p>${e(AVIS)}</p><p class="small">La liste officielle des maladies à déclarer n’est pas encore reprise dans apiviz : demande la démarche à ton vétérinaire ou à ton groupement sanitaire.</p></section>` : ""}
      <div class="u-entete sa-tete"><h2>Déjà prêt</h2></div>
      <section class="card sg-pret">${pret.map(([ok, t, d]) => `<div class="sg-l"><span class="sg-i ${ok ? "good" : "watch"}">${ic(ok ? OK : MANQUE)}</span><span class="sa-t"><b>${e(t)}</b><span class="small">${e(d)}</span></span></div>`).join("")}</section>
      <div class="u-entete sa-tete"><h2>À qui t’adresser</h2></div>
      <section class="card sg-contacts">${SA.CONTACTS.map((x) => {
        const k = contacts[x.cle] || {};
        return `<div class="sg-l"><span class="sa-t"><b>${e(x.qui)}</b><span class="small">${e([k.nom, k.tel].filter(Boolean).join(" · ") || "Pas encore renseigné")}</span></span>
          ${k.tel ? `<a class="btn sm" href="tel:${e(String(k.tel).replace(/[^\d+]/g, ""))}">Appeler</a>` : `<button type="button" class="btn sm" data-act="sigcontacts">Ajouter</button>`}</div>`;
      }).join("")}</section>
      <p class="small">Coordonnées saisies par toi, gardées dans les réglages de l’exploitation.</p>
      <div class="u-entete sa-tete"><h2>La fiche</h2></div>
      <section class="card sg-fiche"><pre>${e(fiche)}</pre></section>
    </div>`);
}

function feuilleContacts() {
  const c = (typeof cfg == "function" ? cfg() : {}).contactsSanitaires || {};
  sheet({ title: "Contacts sanitaires", intro: "Les personnes à prévenir si tu as un doute. Rien n’est envoyé : ces coordonnées servent à l’aide au signalement.",
    fields: SA.CONTACTS.flatMap((x) => [
      { name: x.cle + "_nom", label: `${x.qui} : nom`, value: c[x.cle]?.nom || "" },
      { name: x.cle + "_tel", label: `${x.qui} : téléphone`, type: "tel", value: c[x.cle]?.tel || "" }]),
    submit: async (f) => {
      const v = Object.fromEntries(SA.CONTACTS.map((x) => [x.cle, { nom: String(f[x.cle + "_nom"] || "").trim(), tel: String(f[x.cle + "_tel"] || "").trim() }]));
      await saveCfg({ contactsSanitaires: v }, "Contacts enregistrés.");
    } });
}

export const actions = {
  /** Ouvre la feuille ; v : une colonie (depuis sa fiche), sinon aucune cochée. */
  sasigne: (v) => {
    S.sg = { id: crypto.randomUUID(), date: today(), ruches: v ? [v] : [], signes: [], importance: "leger", note: "", envoi: false };
    $sheet.addEventListener("close", () => { S.sg = null; }, { once: true });
    dessiner();
  },
  sgcolonie: (id) => { const f = lire(); f.ruches = f.ruches.includes(id) ? f.ruches.filter((x) => x !== id) : [...f.ruches, id]; dessiner(); },
  sgsigne: (c) => { const f = lire(); f.signes = f.signes.includes(c) ? f.signes.filter((x) => x !== c) : [...f.signes, c]; dessiner(); },
  sgimportance: (c) => { const f = lire(); f.importance = c; dessiner(); },
  sasignalement: (id) => { S.sig = id; ACT.go("signalement"); },
  sigcontacts: () => feuilleContacts(),
  sigcopier: async () => {
    try { await navigator.clipboard.writeText(S.sigTexte || ""); toast("Fiche copiée : colle-la dans ton message."); }
    catch { toast("Copie impossible sur cet appareil : sélectionne le texte de la fiche.", true); }
  },
  sigpartager: async () => {
    if (navigator.share) { try { await navigator.share({ title: "Signes sanitaires observés", text: S.sigTexte || "" }); return; } catch (x) { if (x?.name === "AbortError") return; } }
    actions.sigcopier();
  },
  // Visite complète : signes cochés dans la section « Signes sanitaires » (envoyés après la visite, voir apresVisite).
  vsigne: (c) => {
    if (!S.visite) return;
    if (typeof readVisitForm == "function") readVisitForm();
    const l = S.visite.signes || [];
    S.visite.signes = l.includes(c) ? l.filter((x) => x !== c) : [...l, c];
    if (typeof redessiner == "function") redessiner("visite"); else render();
  },
  vsigneimp: (c) => {
    if (!S.visite) return;
    if (typeof readVisitForm == "function") readVisitForm();
    S.visite.signes_importance = c;
    if (typeof redessiner == "function") redessiner("visite"); else render();
  },
};
