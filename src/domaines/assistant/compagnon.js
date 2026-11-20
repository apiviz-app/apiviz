// Apiviz — espace API (v5.71, maquettes « Espace API dans l'appli actuelle » du 20 nov. 2026) : règles pures, testées
// par tests/unitaires/espace-api.test.mjs. Aucune donnée inventée : chaque ligne vient d'une saisie, d'un réglage ou
// de la météo déjà chargée ; ce qui n'est pas connu n'est pas proposé.
//   - lignesDuJour : « Pour aujourd'hui » (Accueil, écran API), trois choses utiles au plus, chacune avec son geste ;
//   - dateConseil : l'échéance qu'un conseil d'API donne en toutes lettres (« avant samedi ») ;
//   - voletGouttes : ce que coûtera la prochaine question, avant de l'envoyer ;
//   - remarquesVoix : ce qu'API remarque à la relecture d'une visite à la voix, et la question en cas de doute ;
//   - propositionsSemaine : ce qu'API propose de mettre dans l'agenda des sept prochains jours ;
//   - texteReponse : la réponse d'API telle qu'elle est lue à voix haute.
import { tauxVarroa } from "../sante/regles.js";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const NOMBRES = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, quinze: 15 };

const jour = (x) => String(x || "").slice(0, 10);
const enDate = (iso) => new Date(`${jour(iso)}T12:00:00`);
const versIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Date ISO décalée de n jours. */
export const plusJours = (iso, n) => { const d = enDate(iso); d.setDate(d.getDate() + n); return versIso(d); };
const ecart = (a, b) => Math.round((enDate(a) - enDate(b)) / 864e5);
const fr = (x) => String(Math.round(Number(x) * 10) / 10).replace(".", ",");
const maj = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const point = (s) => (s.endsWith(".") ? s : `${s}.`);
const pl = (n, mot, motPl = `${mot}s`) => `${n} ${n > 1 ? motPl : mot}`;

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
/** « samedi 22 nov. » */
export function jourCourt(iso) { const d = enDate(iso); return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`; }
/** « 17 nov. » */
const dCourte = (iso) => { const d = enDate(iso); return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`; };

/** « aujourd'hui », « demain » ou le nom du jour, d'après une date ISO. */
export function quandTexte(iso, aujourdhui) {
  const n = ecart(iso, aujourdhui);
  if (n === 0) return "aujourd’hui";
  if (n === 1) return "demain";
  return n > 1 && n < 7 ? JOURS[enDate(iso).getDay()] : jourCourt(iso);
}

// ---------- Échéance d'un conseil ----------
/**
 * Échéance que le texte d'un conseil donne clairement (« avant samedi », « demain », « dans 3 jours », « le 12 décembre »),
 * en date ISO à partir d'aujourd'hui ; null s'il n'en donne pas.
 */
export function dateConseil(texte, aujourdhui) {
  const t = String(texte || "").toLowerCase().replace(/[’']/g, "'");
  let m;
  if (/apr[èe]s-demain/.test(t)) return plusJours(aujourdhui, 2);
  if (/\bdemain\b/.test(t)) return plusJours(aujourdhui, 1);
  if (/aujourd'hui|\bce soir\b|\bce matin\b/.test(t)) return jour(aujourdhui);
  if ((m = t.match(/dans\s+(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|quinze)\s+(jours?|semaines?)/))) {
    const k = Number(m[1]) || NOMBRES[m[1]] || 0;
    return k ? plusJours(aujourdhui, m[2].startsWith("semaine") ? 7 * k : k) : null;
  }
  if (/semaine prochaine/.test(t)) { const d = enDate(aujourdhui).getDay(); return plusJours(aujourdhui, ((8 - d) % 7) || 7); }
  if (/ce week-?end/.test(t)) { const d = enDate(aujourdhui).getDay(); return plusJours(aujourdhui, d === 6 ? 0 : d === 0 ? 0 : 6 - d); }
  if ((m = t.match(/\b(?:le|avant le|d'ici le|au plus tard le)\s+(\d{1,2})(?:er)?(?:\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre))?\b/))) {
    const a = enDate(aujourdhui), j = Number(m[1]);
    if (j < 1 || j > 31) return null;
    const noms = m[2] ? m[2].normalize("NFD").replace(/[̀-ͯ]/g, "") : null;
    let mois = noms ? MOIS.findIndex((x) => x.normalize("NFD").replace(/[̀-ͯ]/g, "") === noms) : a.getMonth();
    let an = a.getFullYear();
    let d = new Date(an, mois, j, 12);
    if (d.getDate() !== j) return null;
    if (versIso(d) < jour(aujourdhui)) { if (noms) an += 1; else mois += 1; d = new Date(an, mois, j, 12); }
    return versIso(d);
  }
  const jj = JOURS.findIndex((x) => new RegExp(`\\b${x}\\b`).test(t));
  if (jj >= 0) { const d = enDate(aujourdhui).getDay(); return plusJours(aujourdhui, ((jj - d + 7) % 7) || 7); }
  if (/cette semaine/.test(t)) { const d = enDate(aujourdhui).getDay(); return plusJours(aujourdhui, d === 0 ? 0 : 7 - d); }
  return null;
}

// ---------- Pour aujourd'hui ----------
/**
 * Lignes « Pour aujourd'hui », dans l'ordre : la priorité du jour, le bon créneau météo, les priorités de la saison,
 * le matériel sous le seuil, les tâches en retard, les conseils d'API pas encore faits. max lignes au plus.
 * e : { priorite: {titre, sous, ruche_id, nom}, creneau: {cle, nom, jour, h, temp}, priorites: [{titre, pourquoi, ruche_id}],
 *       sousSeuil: [{nom, stock, seuil, unite}], retard, conseils, aujourdhui, max }
 * Chaque ligne : { id, icone, titre, sous, bouton, act, v, principal }.
 */
export function lignesDuJour(e = {}) {
  const out = [], auj = e.aujourdhui;
  const p = e.priorite;
  if (p && p.titre) out.push({ id: "priorite", icone: "priorite", titre: p.titre, sous: p.sous || "", bouton: p.nom ? `Voir ${p.nom}` : "Voir", act: p.ruche_id ? "ruche" : "go", v: p.ruche_id || "ruches", principal: true });
  const c = e.creneau;
  const dejaDit = c && p && c.jour === jour(auj) && /cr[ée]neau/i.test(p.titre);
  if (c && c.jour && !dejaDit && ecart(c.jour, auj) >= 0) {
    out.push({ id: "creneau", icone: "soleil", titre: `${maj(quandTexte(c.jour, auj))} vers ${c.h} h : bon moment pour ouvrir`, sous: [c.nom, Number.isFinite(Number(c.temp)) ? `${c.temp}°` : ""].filter(Boolean).join(" · "),
      bouton: "Planifier", act: "apiplanifier", v: `${c.jour}|${c.h}|${c.cle ?? ""}` });
  }
  (e.priorites || []).forEach((x, i) => { if (!x.dejaAgenda) out.push({ id: `saison${i}`, icone: "saison", titre: x.titre, sous: x.pourquoi || "", bouton: "+ Agenda", act: "apiprio", v: String(i) }); });
  const s = e.sousSeuil || [];
  if (s.length) {
    const a = s[0];
    out.push({ id: "stock", icone: "panier", titre: s.length === 1 ? `${a.nom} : ${fr(a.stock)}${a.unite && a.unite !== "unité" ? ` ${a.unite}` : ""} (seuil ${fr(a.seuil)})` : `${s.length} articles sous le seuil`,
      sous: "Ta liste de courses est prête", bouton: "Commander", act: "go", v: "courses" });
  }
  if (e.retard > 0) out.push({ id: "retard", icone: "agenda", titre: `${pl(e.retard, "tâche")} en retard`, sous: "Dans ton agenda", bouton: "Agenda", act: "go", v: "agenda" });
  if (e.conseils > 0) out.push({ id: "conseils", icone: "api", titre: `${pl(e.conseils, "conseil")} d’API pas encore ${e.conseils > 1 ? "faits" : "fait"}`, sous: "Dans tes échanges avec API", bouton: "Voir", act: "go", v: "api" });
  return out.slice(0, Math.max(1, Number(e.max) || 3));
}

// ---------- Volet des gouttes ----------
/** Ce que coûte une question selon le mode (fourchettes de Mon offre). */
export const ESTIMATIONS = {
  rapide: { moy: 0.5, max: 1, texte: "moins d’1 goutte", nom: "Rapide", detail: "Réponse courte, l’essentiel" },
  approfondi: { moy: 3, max: 4, texte: "2 à 4 gouttes", nom: "Approfondie", detail: "Croise plus de tes données" },
};

/**
 * Le volet au-dessus du champ : titre, gouttes dessinées, jauge (part qui restera et part que la question prendra),
 * alerte quand Approfondie peut dépasser ce qui reste, état vide.
 * restant : gouttes restantes (null si inconnu) ; forfait : gouttes du forfait du mois (0 si inconnu).
 */
export function voletGouttes({ mode = "approfondi", restant = null, forfait = 0, aujourdhui = null } = {}) {
  const est = ESTIMATIONS[mode === "rapide" ? "rapide" : "approfondi"];
  const connu = Number.isFinite(Number(restant)) && restant !== null;
  const r = connu ? Math.max(0, Number(restant)) : null;
  const vide = connu && r <= 0;
  const ref = Math.max(Number(forfait) || 0, r || 0, 1);
  const pris = connu ? Math.min(est.moy, r) : 0;
  const pct = (x) => Math.max(0, Math.min(100, Math.round((x / ref) * 1000) / 10));
  const apres = connu ? Math.max(0, Math.floor(r - est.moy)) : null;
  let retour = "";
  if (vide && aujourdhui && Number(forfait) > 0) { const d = enDate(aujourdhui); retour = `Ton forfait revient le 1er ${MOIS[(d.getMonth() + 1) % 12]}.`; }
  return {
    mode: mode === "rapide" ? "rapide" : "approfondi", vide, connu, restant: r,
    etat: !connu ? "ok" : vide ? "epuise" : r < 20 ? "bas" : "ok",
    titre: vide ? "Plus de gouttes pour l’instant" : `Cette question : ${est.texte}`,
    sous: vide ? retour || "Recharge pour reposer des questions à API." : `${est.nom}${apres !== null ? ` · il t’en restera environ ${apres}` : ""}`,
    gouttes: vide ? [22] : est === ESTIMATIONS.rapide ? [24] : [20, 24, 20],
    alerte: !vide && connu && est === ESTIMATIONS.approfondi && r < est.max ? `Il ne t’en reste que ${fr(r)} : Approfondie peut tout prendre.` : "",
    restePct: connu ? pct(r) : 0, prisPct: pct(pris), prisDepuis: connu ? pct(r - pris) : 0,
    jauge: connu ? `${fr(r)}${Number(forfait) > 0 ? ` sur ${forfait}` : ""}` : "",
    apres,
  };
}

/** « Coût réel : 0,7 goutte » et ce qui était prévu, sous une réponse. */
export function coutTexte(g) {
  if (!g || !Number.isFinite(Number(g.cout))) return null;
  const v = Number(g.cout), est = ESTIMATIONS[g.mode === "rapide" ? "rapide" : "approfondi"];
  const t = Math.abs(v) < 1 && v !== 0 ? `${fr(Math.round(v * 10) / 10 || 0.1)} goutte` : `${Math.round(v)} goutte${Math.round(v) >= 2 ? "s" : ""}`;
  return { reel: `Coût réel : ${t}`, prevu: `Réponse ${g.mode === "rapide" ? "rapide" : "approfondie"}, prévu ${est.texte}` };
}

// ---------- Visite à la voix : ce qu'API remarque ----------
/**
 * À la relecture d'une visite dictée : ce qui mérite d'être dit (comparé aux visites précédentes de la ruche et au seuil
 * varroa), avec la tâche qu'API propose, et la question à poser en cas de doute (un poids très différent).
 * v : valeurs dictées ; precedentes : visites de la ruche, de la plus récente à la plus ancienne ;
 * o : { nom, seuil (varroas pour 100 abeilles), aujourdhui }.
 */
export function remarquesVoix(v = {}, precedentes = [], o = {}) {
  const nom = o.nom || "la ruche", auj = o.aujourdhui, seuil = Number(o.seuil) || 3;
  const mois = auj ? enDate(auj).getMonth() : 0;
  const tache = (titre, jours) => ({ titre, echeance: auj ? plusJours(auj, jours) : null });
  const remarques = [];
  let doute = null;
  const der = precedentes[0];
  const pesee = precedentes.find((x) => x.poids_kg != null && x.poids_kg !== "");
  if (v.poids_kg != null && pesee) {
    const e = Number(v.poids_kg) - Number(pesee.poids_kg);
    if (Math.abs(e) >= 5) doute = { champ: "poids_kg", texte: `J’ai compris ${fr(v.poids_kg)} kg, soit ${e > 0 ? "+" : "−"}${fr(Math.abs(e))} kg depuis le ${point(dCourte(pesee.date_visite))} C’est bien ça ?` };
    else if (e <= -1) remarques.push({ id: "poids", texte: point(`${fr(-e)} kg de moins qu’au ${dCourte(pesee.date_visite)}`), tache: tache(`Peser ${nom}`, 7) });
  }
  if (v.couvain === "Réduit" && der && ["Normal", "Abondant"].includes(der.couvain)) remarques.push({ id: "couvain", texte: point(`Couvain réduit : il était ${der.couvain.toLowerCase()} le ${dCourte(der.date_visite)}`), tache: tache(`Repasser à ${nom}`, 7) });
  if (v.reine === "Non vue" && der && der.reine === "Non vue") remarques.push({ id: "reine", texte: "Reine non vue deux visites de suite.", tache: tache(`Chercher la reine de ${nom}`, 7) });
  if (["Ouvertes", "Operculées"].includes(v.cellules_royales)) remarques.push({ id: "essaimage", texte: `Cellules royales ${v.cellules_royales.toLowerCase()} : risque d’essaimage.`, tache: tache(`Repasser à ${nom} (cellules royales)`, 7) });
  if (v.provisions === "Faibles" && (mois >= 8 || mois <= 1)) remarques.push({ id: "provisions", texte: "Provisions faibles avant l’hiver.", tache: tache(`Nourrir ${nom}`, 3) });
  const compte = precedentes.find((x) => tauxVarroa(x) !== null);
  if (compte) {
    const t = tauxVarroa(compte);
    const traite = precedentes.some((x) => jour(x.date_visite) >= jour(compte.date_visite) && String(x.traitement || "").trim());
    if (t >= seuil && !traite) remarques.push({ id: "varroa", texte: `Varroa à ${fr(t)} % le ${dCourte(compte.date_visite)} (ton seuil : ${fr(seuil)} %), pas de traitement noté depuis.`, tache: tache(`Traiter ou recompter ${nom}`, 7) });
  }
  return { remarques, doute };
}

// ---------- Agenda : ce qu'API propose ----------
/**
 * Propositions pour les sept prochains jours, rangées par date (sans date à la fin), sans doublon avec les tâches ouvertes.
 * e : { aujourdhui, ruchers: [{cle, nom, creneau, joursSansVisite, aVoir}], priorites: [{titre, pourquoi, ruche_id}],
 *       conseils: [{titre, texte, ruche_id}], sousSeuil: [{nom}], tachesOuvertes: [titres], max }
 * Chaque proposition : { titre, echeance, heure, raison, ruche_id }.
 */
export function propositionsSemaine(e = {}) {
  const auj = e.aujourdhui, mois = enDate(auj).getMonth(), out = [];
  const fin = plusJours(auj, 7);
  for (const r of e.ruchers || []) {
    const aVisiter = r.aVoir || ((mois >= 2 && mois <= 9) && (r.joursSansVisite === null || r.joursSansVisite >= 14));
    if (!aVisiter) continue;
    const c = r.creneau && jour(r.creneau.jour) >= jour(auj) && jour(r.creneau.jour) <= fin ? r.creneau : null;
    const pourquoi = r.aVoir ? "Une colonie à surveiller" : r.joursSansVisite === null ? "Pas encore visité" : `Pas de visite depuis ${r.joursSansVisite} jours`;
    out.push({ titre: `Visite · ${r.nom}`, echeance: c ? jour(c.jour) : null, heure: c ? c.h : null, ruche_id: null, urgent: !!r.aVoir,
      raison: c ? `${pourquoi} · ${c.temp}°, ${c.n === 2 ? "bon moment pour ouvrir" : "visite courte possible"}` : `${pourquoi} · météo pas encore connue : choisis le jour` });
  }
  for (const p of e.priorites || []) out.push({ titre: p.titre, echeance: plusJours(auj, 2), heure: null, raison: p.pourquoi || "Priorité de la saison", ruche_id: p.ruche_id || null });
  for (const c of e.conseils || []) out.push({ titre: c.titre, echeance: dateConseil(c.texte || c.titre, auj) || plusJours(auj, 3), heure: null, raison: "Conseil d’API pas encore fait", ruche_id: c.ruche_id || null });
  const s = e.sousSeuil || [];
  if (s.length) out.push({ titre: s.length === 1 ? `Commander : ${s[0].nom}` : `Commander ${s.length} articles`, echeance: plusJours(auj, 1), heure: null, raison: "Sous le seuil de ton stock", ruche_id: null });
  const pris = new Set((e.tachesOuvertes || []).map((t) => String(t).replace(/\s*\(vers \d+ h\)$/, "").trim().toLowerCase()));
  const vus = new Set();
  const parDate = (a, b) => (a.echeance || "9999").localeCompare(b.echeance || "9999");
  // Les visites aux colonies à surveiller passent d'abord dans la sélection (même sans date), puis le reste par date.
  return out.filter((x) => { const k = x.titre.trim().toLowerCase(); if (pris.has(k) || vus.has(k)) return false; vus.add(k); return true; })
    .sort((a, b) => Number(!a.urgent) - Number(!b.urgent) || parDate(a, b))
    .slice(0, Number(e.max) || 5)
    .sort(parDate)
    .map(({ urgent, ...x }) => x);
}

// ---------- Lecture à voix haute ----------
/** Le texte lu : le résumé, puis les deux premiers conseils (ni les sources ni les listes de faits). */
export function texteReponse(rep) {
  if (!rep) return "";
  const conseils = (rep.recommandations || []).slice(0, 2).map((r) => String(r.texte || "").trim()).filter(Boolean);
  const phrase = (s) => (/[.!?…]$/.test(s) ? s : `${s}.`);
  return [rep.resume, ...conseils].map((s) => String(s || "").trim()).filter(Boolean).map(phrase).join(" ");
}

// ======================================================================
// v5.72 — suite de l'espace API : réponses sans réseau, mémoire qui apprend, courbe de la ruche, conseil du jour.
// ======================================================================
const sansAccent = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'");

/** La ruche nommée dans un texte (le nom le plus long qui y figure en entier), ou null. */
export function rucheDuTexte(texte, ruches = []) {
  const t = ` ${sansAccent(texte).replace(/[^a-z0-9]+/g, " ")} `;
  return [...ruches].filter((r) => r?.nom).sort((a, b) => b.nom.length - a.nom.length)
    .find((r) => t.includes(` ${sansAccent(r.nom).replace(/[^a-z0-9]+/g, " ").trim()} `)) || null;
}

const visitesDe = (d, id) => (d?.visites || []).filter((v) => v.ruche_id === id).sort((a, b) => String(b.date_visite).localeCompare(String(a.date_visite)));
const reponse = (resume, faits = []) => ({ resume: String(resume).replace(/\.\.(?=\s|$)/g, "."), faits, hypotheses: [], recommandations: [], manques: [] });
const fait = (texte, date, r) => ({ texte, date: date ? jour(date) : undefined, refs: r ? [{ type: "ruche", id: r.id, libelle: r.nom }] : [] });

/**
 * Sans réseau : une réponse simple, calculée sur le téléphone avec les données déjà chargées (dernière visite, poids,
 * reine, traitement, couvain d'une ruche nommée ; seuil varroa ; stock d'un article ; tâches du jour). null si la
 * question demande API (elle est alors mise en attente). o : { seuil, aujourdhui }.
 */
export function reponseLocale(question, d = {}, o = {}) {
  const t = sansAccent(question);
  if (!t.trim()) return null;
  if (/seuil/.test(t) && /varroa/.test(t)) return reponse(`Ton seuil d’alerte varroa : ${fr(Number(o.seuil) || 3)} varroas pour 100 abeilles.`);
  const r = rucheDuTexte(question, d.ruches || []);
  if (r) {
    const vs = visitesDe(d, r.id), der = vs[0];
    if (!der) return reponse(`Je n’ai encore aucune visite de ${r.nom}.`);
    if (/poids|pese|pesee|kilo|\bkg\b|lourd|leger|reserve|provision/.test(t)) {
      const p = vs.find((v) => v.poids_kg != null && v.poids_kg !== "");
      return p ? reponse(`${r.nom} : ${fr(p.poids_kg)} kg le ${dCourte(p.date_visite)}.`, [fait(`Pesée de ${r.nom} : ${fr(p.poids_kg)} kg`, p.date_visite, r)])
        : reponse(`Je n’ai aucune pesée de ${r.nom}.`);
    }
    if (/reine/.test(t)) {
      const v = vs.find((x) => x.reine);
      return v ? reponse(`Reine ${String(v.reine).toLowerCase()} le ${dCourte(v.date_visite)}.`, [fait(`${r.nom} : reine ${String(v.reine).toLowerCase()}`, v.date_visite, r)]) : reponse(`Rien de noté sur la reine de ${r.nom}.`);
    }
    if (/traite|traitement|varroa|acide|oxalique|apivar/.test(t)) {
      const v = vs.find((x) => String(x.traitement || "").trim()), c = vs.find((x) => tauxVarroa(x) !== null);
      const morceaux = [v ? `dernier traitement noté : ${String(v.traitement).trim()} le ${dCourte(v.date_visite)}` : "aucun traitement noté",
        c ? `varroa à ${fr(tauxVarroa(c))} % le ${dCourte(c.date_visite)}` : ""].filter(Boolean);
      return reponse(`${r.nom} : ${morceaux.join(" ; ")}.`, [v && fait(`Traitement : ${String(v.traitement).trim()}`, v.date_visite, r), c && fait(`Comptage varroa : ${fr(tauxVarroa(c))} %`, c.date_visite, r)].filter(Boolean));
    }
    if (/couvain/.test(t)) {
      const v = vs.find((x) => x.couvain);
      return v ? reponse(`Couvain ${String(v.couvain).toLowerCase()} le ${dCourte(v.date_visite)}.`, [fait(`${r.nom} : couvain ${String(v.couvain).toLowerCase()}`, v.date_visite, r)]) : reponse(`Rien de noté sur le couvain de ${r.nom}.`);
    }
    const bouts = [der.activite && `activité ${String(der.activite).toLowerCase()}`, der.couvain && `couvain ${String(der.couvain).toLowerCase()}`, der.reine && `reine ${String(der.reine).toLowerCase()}`, der.poids_kg != null && der.poids_kg !== "" && `${fr(der.poids_kg)} kg`].filter(Boolean);
    return reponse(`Dernière visite de ${r.nom} le ${dCourte(der.date_visite)}${bouts.length ? ` : ${bouts.join(", ")}` : ""}.`, [fait(`Visite de ${r.nom}`, der.date_visite, r)]);
  }
  if (/stock|reste|combien|candy|sirop|pot|cadre|cire/.test(t)) {
    const a = (d.articles || []).filter((x) => x.nom && x.stock != null).find((x) => sansAccent(x.nom).split(/[^a-z0-9]+/).filter((m) => m.length > 2).some((m) => t.includes(m)));
    if (a) return reponse(`${a.nom} : ${fr(a.stock)}${a.unite && a.unite !== "unité" ? ` ${a.unite}` : ""} en stock${Number(a.seuil) > 0 ? ` (seuil ${fr(a.seuil)})` : ""}.`);
  }
  if (/tache|a faire|agenda|aujourd'hui/.test(t)) {
    const auj = o.aujourdhui;
    const l = (d.taches || []).filter((x) => !x.faite && x.echeance && auj && x.echeance <= auj);
    if (!l.length) return reponse("Rien d’urgent dans ton agenda aujourd’hui.");
    return reponse(`${pl(l.length, "tâche")} pour aujourd’hui ou en retard : ${l.slice(0, 3).map((x) => x.titre).join(", ")}${l.length > 3 ? "…" : "."}`);
  }
  return null;
}

/**
 * Mémoire qui apprend : ce que l'apiculteur dit de ses façons de faire, qu'API propose de retenir (réglages existants).
 * « mon seuil varroa est de 2 % », « j'alerte sous 18 kg en hiver », « je vise 120 kg cette année ». null sinon.
 * Renvoie { cle, valeur, texte } (texte : la question posée à l'apiculteur).
 */
export function apprentissage(texte) {
  const t = sansAccent(texte).replace(",", ".");
  let m;
  if (/seuil/.test(t) && /varroa/.test(t) && (m = t.match(/(\d+(?:\.\d+)?)\s*(?:%|pour ?cent|varroas?)/))) {
    const v = Number(m[1]); if (v > 0 && v <= 20) return { cle: "varroaSeuil", valeur: v, texte: `Je retiens que ton seuil d’alerte varroa est ${fr(v)} % ?` };
  }
  if (/hiver|alerte|minimum/.test(t) && /poids|kg|kilo|pese/.test(t) && (m = t.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?)/)) && /sous|en dessous|moins de|minimum|alerte/.test(t)) {
    const v = Number(m[1]); if (v >= 5 && v <= 80) return { cle: "hiverPoids", valeur: v, texte: `Je retiens qu’une ruche sous ${fr(v)} kg en hiver doit t’alerter ?` };
  }
  if (/(objectif|je vise|viser|j'espere)/.test(t) && (m = t.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?)/))) {
    const v = Math.round(Number(m[1])); if (v > 0 && v <= 100000) return { cle: "objectif_recolte", valeur: v, texte: `Je retiens que tu vises ${v} kg de miel cette saison ?` };
  }
  return null;
}

/**
 * Courbe d'une ruche pour une réponse : ses pesées (de la plus ancienne à la plus récente) et, à chaque date, la moyenne
 * des autres ruches du même rucher pesées le même mois. null s'il y a moins de deux pesées.
 * Renvoie { nom, points: [{date, kg, moyenne}], min, max }.
 */
export function serieRuche(d, rucheId) {
  const r = (d?.ruches || []).find((x) => x.id === rucheId);
  if (!r) return null;
  const pese = (v) => v.poids_kg != null && v.poids_kg !== "" && Number.isFinite(Number(v.poids_kg));
  const siennes = (d.visites || []).filter((v) => v.ruche_id === r.id && pese(v)).sort((a, b) => String(a.date_visite).localeCompare(String(b.date_visite))).slice(-8);
  if (siennes.length < 2) return null;
  const voisines = new Set((d.ruches || []).filter((x) => x.id !== r.id && (x.rucher || "") === (r.rucher || "")).map((x) => x.id));
  const points = siennes.map((v) => {
    const mois = String(v.date_visite).slice(0, 7);
    const autres = (d.visites || []).filter((x) => voisines.has(x.ruche_id) && pese(x) && String(x.date_visite).slice(0, 7) === mois).map((x) => Number(x.poids_kg));
    return { date: jour(v.date_visite), kg: Number(v.poids_kg), moyenne: autres.length ? Math.round((autres.reduce((a, b) => a + b, 0) / autres.length) * 10) / 10 : null };
  });
  const tous = points.flatMap((p) => [p.kg, p.moyenne]).filter((x) => x !== null);
  return { nom: r.nom, points, min: Math.min(...tous), max: Math.max(...tous) };
}

/**
 * Conseil du jour qu'API envoie de lui-même (Rappels, notification) : la première ligne de « Pour aujourd'hui », une
 * fois par jour au plus ; le lundi, le point de la semaine. Rien pendant une visite.
 * e : { lignes, aujourdhui, enVisite, prefs: { notif, lundi } }. Renvoie des rappels { cle, titre, sous, tag, act, v }.
 */
export function rappelsApi(e = {}) {
  const p = e.prefs || {}, auj = e.aujourdhui;
  if (!auj || e.enVisite) return [];
  const out = [];
  const l = (e.lignes || [])[0];
  if (p.notif !== false && l) out.push({ cle: `api-${auj}`, titre: l.titre, sous: `Conseil d’API${l.sous ? ` · ${l.sous}` : ""}`, tag: "API", act: l.act, v: l.v });
  if (p.lundi !== false && enDate(auj).getDay() === 1) out.push({ cle: `api-lundi-${auj}`, titre: "Le point de la semaine avec API", sous: "Visites, priorités et commandes à placer dans l’agenda", tag: "Lundi", act: "apsemaine", v: "" });
  return out;
}
