// Apiviz — écran « Compter le rucher » (IT-12, AP-FEAT-051, AP-US-058, AP-TECH-180) : un comptage varroa pour toutes
// les colonies d'un rucher, à la suite, en une seule opération. Méthode (sucre glace, lavage, chute naturelle sur lange,
// autre), échantillon proposé pour chaque colonie et corrigeable, compteur − / + par colonie, résultat en direct
// (taux pour 100 abeilles, ou varroas par jour pour le lange), comparé au seuil sourcé quand il y en a un.
// Envoi par compter_varroa() (migration 036) à travers la file d'envoi : sans réseau, la saisie est gardée sur le
// téléphone et part au retour du réseau ; elle se voit tout de suite (regles.appliquerComptage).
// Écran de saisie pas à pas (FLUX du gabarit) : il garde son en-tête « Annuler ».
// Globales d'app.js lues à l'appel : S, esc, n, today, toast, render, shell, ACT, HL, sb, UX.
import * as SA from "./regles.js";
import { ctx } from "./ecran.js";

const e = (t) => esc(t);
const appel = (nom, args) => (typeof HL != "undefined" ? HL.rpc(nom, args) : sb.rpc(nom, args));
const BASE_ANCIENNE = /PGRST202|Could not find the function|compter_varroa/;
const nomRucher = (r) => r.rucher || "";

function demarrer(rucheId) {
  const ruches = S.d.ruches || [];
  const r0 = ruches.find((r) => r.id === rucheId);
  const dernier = SA.comptages(S.d).find((c) => c.varroa_methode);
  S.cv = { id: crypto.randomUUID(), date: today(), methode: SA.METHODES.includes(dernier?.varroa_methode) ? dernier.varroa_methode : "Sucre glace",
    rucher: r0 ? nomRucher(r0) : (S.sa?.rucher ?? nomRucher(ruches[0] || {})), seule: r0 ? r0.id : null,
    echantillon: "300", duree: "3", note: "", colonies: {}, envoi: false };
}
const etat = () => S.cv;
const coloniesAffichees = (f) => (S.d.ruches || []).filter((r) => (f.seule ? r.id === f.seule : nomRucher(r) === f.rucher))
  .sort((a, b) => (a.ordre_pose ?? 1e4) - (b.ordre_pose ?? 1e4) || String(a.nom).localeCompare(String(b.nom), "fr", { numeric: true }));

/** Comptage tel qu'il partira (format de compter_varroa). */
function charge(f) {
  const chute = SA.estChute(f.methode);
  const rucherId = (S.d.ruchers || []).find((x) => x.nom === f.rucher)?.id || null;
  const colonies = coloniesAffichees(f).map((r) => ({ ruche_id: r.id, varroa: f.colonies[r.id]?.varroa ?? "", abeilles: chute ? null : (f.colonies[r.id]?.abeilles || f.echantillon || null) }));
  return { id: f.id, date: f.date, methode: f.methode, rucher_id: f.seule ? null : rucherId, echantillon_abeilles: chute ? null : Number(f.echantillon) || null,
    duree_jours: chute ? Number(String(f.duree).replace(",", ".")) : null, note: f.note.trim(), colonies };
}

/** Ligne de résultat d'une colonie : texte et ton. */
function resultatColonie(f, r) {
  const c = f.colonies[r.id] || {};
  if (c.varroa === "" || c.varroa == null) return ["Pas comptée cette fois", ""];
  const v = { ruche_id: r.id, date_visite: f.date, varroa: Number(c.varroa), varroa_methode: f.methode,
    varroa_abeilles: SA.estChute(f.methode) ? null : Number(c.abeilles || f.echantillon) || null, duree_jours: SA.estChute(f.methode) ? Number(String(f.duree).replace(",", ".")) : null };
  const res = SA.resultat(v), s = SA.seuilApplicable(v, ctx()), niv = SA.niveau(v, ctx());
  if (res.valeur === null) return [SA.estChute(f.methode) ? `${res.texte} · indique la durée du lange` : `${res.texte} · indique les abeilles prélevées`, ""];
  if (!s || res.unite !== s.unite) return [`${res.texte} · pas de seuil enregistré`, ""];
  const seuil = SA.valeurTexte(s);
  return [`${res.texte} · ${niv === "haut" ? "au-dessus du seuil" : niv === "proche" ? "proche du seuil" : "sous le seuil"} (${seuil})`, niv === "haut" ? "crit" : niv === "proche" ? "watch" : "good"];
}

function ligne(f, r) {
  const c = f.colonies[r.id] || {}, [txt, ton] = resultatColonie(f, r), chute = SA.estChute(f.methode);
  return `<div class="cv-ligne" data-r="${e(r.id)}">
    <span class="cv-t"><b>${e(r.nom)}</b><span class="small cv-res ${ton}" id="cv_res_${e(r.id)}" role="status">${e(txt)}</span>
      ${chute ? "" : `<label class="cv-ab">Abeilles<input type="number" inputmode="numeric" min="1" step="1" id="cv_ab_${e(r.id)}" value="${e(c.abeilles ?? "")}" placeholder="${e(f.echantillon || "300")}"></label>`}</span>
    <span class="cv-ctl">
      <button type="button" class="cv-pm" data-act="cvmoins" data-v="${e(r.id)}" aria-label="Un varroa de moins, ${e(r.nom)}">−</button>
      <input type="number" inputmode="numeric" min="0" step="1" id="cv_n_${e(r.id)}" value="${e(c.varroa ?? "")}" aria-label="Varroas comptés, ${e(r.nom)}" placeholder="–">
      <button type="button" class="cv-pm" data-act="cvplus" data-v="${e(r.id)}" aria-label="Un varroa de plus, ${e(r.nom)}">+</button>
    </span></div>`;
}

function nbComptees(f) {
  return coloniesAffichees(f).filter((r) => { const v = f.colonies[r.id]?.varroa; return v !== "" && v != null; }).length;
}
const libelleBouton = (k) => (k ? `Enregistrer ${UX.pluriel(k, "comptage")}` : "Compte au moins une colonie");

export function ecran() {
  if (!S.cv) demarrer(null);
  const f = etat(), chute = SA.estChute(f.methode);
  const ruchers = [...new Set((S.d.ruches || []).map(nomRucher))];
  const cols = coloniesAffichees(f), k = nbComptees(f);
  const titreLieu = f.seule ? cols[0]?.nom || "Colonie" : f.rucher || "Sans rucher";
  const horsLigne = typeof HL != "undefined" && (HL.horsLigne() || navigator.onLine === false);
  shell("Compter le rucher", `${titreLieu} · ${UX.pluriel(cols.length, "colonie")} · une seule opération`,
    '<button type="button" class="btn" data-act="cvannuler">Annuler</button>',
    `<div class="form cv-form">
      <section class="card stack">
        ${!f.seule && ruchers.length > 1 ? `<label>Rucher<select id="cv_rucher">${ruchers.map((x) => `<option value="${e(x)}" ${x === f.rucher ? "selected" : ""}>${e(x || "Sans rucher")}</option>`).join("")}</select></label>` : ""}
        <label>Date<input type="date" id="cv_date" value="${e(f.date)}" max="${e(today())}" required></label>
        <div class="field"><div class="t" id="cv_m">Méthode</div><div class="pick cv-methodes" role="group" aria-labelledby="cv_m">${SA.METHODES.map((m) => `<button type="button" class="${m === f.methode ? "on" : ""}" aria-pressed="${m === f.methode}" data-act="cvmethode" data-v="${e(m)}">${e(m === "Lange" ? "Chute sur lange" : m === "Autre" ? "Autre (à préciser)" : m)}</button>`).join("")}</div></div>
        ${chute
          ? `<label>Durée du lange (jours)<input type="number" inputmode="decimal" min="0.5" step="0.5" id="cv_duree" value="${e(f.duree)}"></label><p class="small">Le résultat est ramené à un jour : varroas tombés ÷ jours.</p>`
          : `<label>Abeilles dans l’échantillon<input type="number" inputmode="numeric" min="1" step="1" id="cv_ech" value="${e(f.echantillon)}"></label><p class="small">Proposé pour chaque colonie ; corrige-le sur une ligne si tu as pesé ou compté autrement.</p>`}
      </section>
      <div class="u-entete sa-tete"><h2>Varroas comptés</h2><span class="small">${chute ? "varroas ÷ jours" : "varroas ÷ abeilles × 100"}</span></div>
      <section class="card cv-liste">${cols.map((r) => ligne(f, r)).join("") || '<p class="small">Aucune colonie dans ce rucher.</p>'}</section>
      <label>Note (facultatif)<textarea id="cv_note" rows="2" placeholder="Conditions, remarques…">${e(f.note)}</textarea></label>
      ${f.methode === "Autre" ? '<p class="small">Méthode « autre » : précise-la dans la note.</p>' : ""}
      <p class="small cv-pied">${horsLigne ? "Sans réseau : le comptage reste sur le téléphone et partira tout seul au retour de la connexion." : "Sans réseau, l’envoi se fera tout seul au retour de la connexion."}</p>
      <button type="button" class="btn main block" data-act="cvenregistrer" id="cv_ok" ${k && !f.envoi ? "" : "disabled"}>${libelleBouton(k)}</button>
    </div>`);
}

/** Relit les champs tapés (avant un nouveau rendu ou l'enregistrement). */
function lire() {
  const f = etat(), q = (id) => document.getElementById(id);
  if (!f || !q("cv_date")) return f;
  f.date = q("cv_date").value || f.date;
  if (q("cv_rucher")) f.rucher = q("cv_rucher").value;
  if (q("cv_ech")) f.echantillon = q("cv_ech").value;
  if (q("cv_duree")) f.duree = q("cv_duree").value;
  if (q("cv_note")) f.note = q("cv_note").value;
  for (const r of coloniesAffichees(f)) {
    const c = (f.colonies[r.id] ||= {});
    if (q("cv_n_" + r.id)) c.varroa = q("cv_n_" + r.id).value;
    if (q("cv_ab_" + r.id)) c.abeilles = q("cv_ab_" + r.id).value;
  }
  return f;
}
/** Après une frappe : résultats et bouton à jour, sans redessiner l'écran (le clavier reste ouvert). */
function rafraichir() {
  const f = lire();
  if (!f) return;
  for (const r of coloniesAffichees(f)) {
    const el = document.getElementById("cv_res_" + r.id);
    if (!el) continue;
    const [txt, ton] = resultatColonie(f, r);
    el.textContent = txt; el.className = `small cv-res ${ton}`;
  }
  const b = document.getElementById("cv_ok"), k = nbComptees(f);
  if (b) { b.disabled = !k || f.envoi; b.textContent = libelleBouton(k); }
}
document.addEventListener("input", (ev) => { if (S?.route === "comptage" && /^cv_/.test(ev.target.id || "")) rafraichir(); });
document.addEventListener("change", (ev) => { if (S?.route === "comptage" && ev.target.id === "cv_rucher") { lire(); render(); } });

function pas(id, d) {
  const f = lire(), c = (f.colonies[id] ||= {});
  const v = Math.max(0, (Number(c.varroa) || 0) + d);
  c.varroa = c.varroa === "" || c.varroa == null ? (d > 0 ? 1 : 0) : v;
  const el = document.getElementById("cv_n_" + id);
  if (el) el.value = c.varroa;
  rafraichir();
}

async function enregistrer() {
  const f = lire();
  if (!f || f.envoi) return;
  const p = charge(f);
  const err = SA.validerComptage(p);
  if (err) return toast(err, true);
  p.colonies = SA.coloniesComptees(p);
  f.envoi = true;
  const { error, local } = await appel("compter_varroa", { p });
  f.envoi = false;
  if (error) {
    toast(BASE_ANCIENNE.test(`${error.code} ${error.message}`)
      ? "La base doit être mise à jour pour enregistrer un comptage du rucher (migration 036). En attendant, note le comptage dans une visite."
      : messageErreur(error), true);
    return rafraichir();
  }
  SA.appliquerComptage(S.d, p, local ? { _attente: true } : {});
  if (typeof HL != "undefined") HL.garderDonnees();
  const k = p.colonies.length;
  S.cv = null;
  toast(local ? `${UX.pluriel(k, "comptage")} gardé${k > 1 ? "s" : ""} sur le téléphone : envoi au retour du réseau.` : `${UX.pluriel(k, "comptage")} enregistré${k > 1 ? "s" : ""}.`);
  (S.sa ||= {}).vue = "comptages";
  if (f.seule) ACT.ruche(f.seule); else ACT.go("varroa");
}

export const actions = {
  /** Ouvre l'écran ; v : une colonie (depuis sa fiche), sinon le rucher choisi dans Santé. */
  cvouvrir: (v) => { demarrer(v || null); ACT.go("comptage"); },
  cvannuler: () => { const seule = S.cv?.seule; S.cv = null; if (seule) ACT.ruche(seule); else ACT.go("varroa"); },
  cvmethode: (m) => { const f = lire(); if (SA.METHODES.includes(m)) f.methode = m; render(); },
  cvplus: (id) => pas(id, 1),
  cvmoins: (id) => pas(id, -1),
  cvenregistrer: () => enregistrer(),
};
