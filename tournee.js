// Apidoo — tournée en parcours : départ, saisie (libre, questions ou manuelle), vérification, bilan.
// Rien n'est enregistré sans vérification. Les visites passent par creer_visite : hors ligne et registre ne changent pas.
// S'appuie sur app.js, offline.js (HL), v3.js (S.tournee, formulaire complet), meteo.js (MT), voix.js (VX) et essentiels.js (ES).
const TN = (() => {
  const U = UX;
  const CHOIX = {
    activite: ["Faible", "Normale", "Forte"],
    reine: ["Vue", "Non vue", "Non cherchée"],
    couvain: ["Non vu", "Réduit", "Normal", "Abondant"],
    provisions: ["Faibles", "Moyennes", "Bonnes"],
  };
  const NOMS = { activite: "Activité", reine: "Reine", couvain: "Couvain", provisions: "Provisions" };
  const DEFAUT = { activite: "Normale", provisions: "Moyennes", reine: "Non cherchée", couvain: "Non vu" };
  const MODES = [
    ["libre", "Je parle librement", "Une seule dictée, API range par ruche", "Commencer à dicter"],
    ["guide", "API me pose les questions", "Tu réponds à la voix ou d’un doigt", "Commencer les questions"],
    ["manuel", "Je remplis moi-même", "Grands boutons, même sans réseau", "Commencer à remplir"],
  ];
  const MICRO = '<svg class="tn-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  const CROIX = '<svg class="tn-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const PHOTO = '<svg class="tn-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h4l2-3h4l2 3h4v11H4zM12 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>';
  const PLUS = '<svg class="tn-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>';
  const Reco = () => window.SpeechRecognition || window.webkitSpeechRecognition;
  const T = () => S.tournee;
  const rucheDe = (id) => byId(S.d.ruches, id);
  const nomDe = (id) => rucheDe(id)?.nom || "Ruche";
  const numero = (id, i) => esc(nomDe(id).match(/(\d+)\s*$/)?.[1] || i + 1);
  const classe = (r) => (r?.etat === "Critique" ? "crit" : r?.etat === "À surveiller" ? "watch" : "");
  const sansAccent = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/’/g, "'");
  const plusJours = (j) => { const d = new Date(today() + "T12:00:00"); d.setDate(d.getDate() + j); return d.toISOString().slice(0, 10); };
  const horsLigne = () => typeof HL != "undefined" && HL.horsLigne();

  // ---------- Brouillon gardé sur le téléphone ----------
  const cleMemo = () => "apidoo-tournee:" + (typeof EX != "undefined" ? EX.courante() : "");
  const lireMode = () => { try { return localStorage.getItem("apidoo-tournee-mode") || "libre"; } catch { return "libre"; } };
  const noterMode = (m) => { try { localStorage.setItem("apidoo-tournee-mode", m); } catch {} };
  function sauver() {
    if (!S.tn || !T()) return;
    try { localStorage.setItem(cleMemo(), JSON.stringify({ date: today(), T: T(), tn: { ...S.tn, plus: null } })); } catch {}
  }
  function lireBrouillon(cle) {
    try {
      const g = JSON.parse(localStorage.getItem(cleMemo()) || "null");
      if (g && g.date === today() && g.T?.rucher === cle && g.T.ids.every((id) => rucheDe(id))) return g;
    } catch {}
    return null;
  }
  const effacer = () => { try { localStorage.removeItem(cleMemo()); } catch {} };

  // ---------- Ordre et fiches ----------
  function ordonner(ids) {
    const poids = (id) => { const c = classe(rucheDe(id)); return c === "crit" ? 0 : c === "watch" ? 1 : 2; };
    const quand = (id) => lastVisit(id)?.date_visite || "";
    return [...ids].sort((a, b) => poids(a) - poids(b) || quand(a).localeCompare(quand(b)));
  }
  const fiche = (id) => (S.tn.fiches[id] ||= { etat: "vide", activite: "", reine: "", couvain: "", provisions: "", poids_kg: null, note: "", seg: "", vu: {} });
  const val = (f, k) => f[k] || DEFAUT[k];
  const courante = () => T().ids[T().i];
  const reste = () => T().ids.filter((id) => fiche(id).etat !== "enregistree");
  function reprendre(f, id) { // Mode manuel : on repart de la dernière visite. La reine doit être revue à chaque fois.
    if (f.etat !== "vide") return;
    const d = lastVisit(id);
    if (d) Object.assign(f, { activite: f.activite || d.activite, provisions: f.provisions || d.provisions, couvain: f.couvain || d.couvain || "" });
  }
  function aller(i) {
    const t = T();
    if (S.tn.etape === "manuel") arreter();
    while (i < t.ids.length && fiche(t.ids[i]).etat === "enregistree") i++;
    if (i >= t.ids.length) { t.i = Math.max(0, t.ids.length - 1); arreter(); S.tn.etape = "verif"; }
    else { t.i = i; if (S.tn.etape === "manuel") reprendre(fiche(t.ids[i]), t.ids[i]); }
    sauver(); render();
  }

  // ---------- Dictée libre : un seul texte, rangé par ruche ----------
  const CHIFFRES = { un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10 };
  function decouper(texte, ids) {
    const parNom = new Map(ids.map((id) => [sansAccent(nomDe(id)), id]));
    const parNum = new Map(ids.map((id) => [nomDe(id).match(/(\d+)\s*$/)?.[1], id]));
    const noms = [...parNom.keys()].sort((a, b) => b.length - a.length).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`\\b(?:${noms.join("|")}|ruches?\\s*(?:n°|numero\\s*)?(\\d+|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix))\\b`, "g");
    const propre = sansAccent(texte); // même longueur que le texte, sauf rares ligatures
    const base = propre.length === texte.length ? propre : texte.toLowerCase();
    const res = new Map(); let cur = ids[0], debut = 0, m;
    const couper = (fin) => { const s = texte.slice(debut, fin).replace(/^[\s,.;:]+|[\s,;:]+$/g, ""); if (s) res.set(cur, [res.get(cur), s].filter(Boolean).join(" ")); };
    while ((m = re.exec(base))) {
      const id = parNom.get(m[0]) || parNum.get(String(CHIFFRES[m[1]] || m[1]));
      if (!id) continue;
      couper(m.index); cur = id; debut = m.index + m[0].length;
      if (!res.has(id)) res.set(id, "");
    }
    couper(texte.length);
    return { res, cur };
  }
  function lireDictee() {
    const { res, cur } = decouper(S.tn.texte || "", T().ids);
    T().ids.forEach((id) => {
      const f = fiche(id);
      if (f.etat === "enregistree" || f.corrige) return;
      const seg = res.get(id) || "";
      if (f.etat === "notee" && !f.seg) return; // déjà rempli à la main ou par les questions
      if (!seg) { if (f.seg) Object.assign(f, { etat: "vide", activite: "", reine: "", couvain: "", provisions: "", poids_kg: null, note: "", seg: "" }); return; }
      const l = VX.lire(seg);
      Object.assign(f, { etat: "notee", activite: l.activite || "", reine: l.reine || "", couvain: l.couvain || "", provisions: l.provisions || "", poids_kg: l.poids_kg ?? null, note: seg, seg });
    });
    if (fiche(cur).etat !== "enregistree") T().i = T().ids.indexOf(cur);
  }
  const lus = (f) => [f.activite && "Activité " + f.activite.toLowerCase(), f.reine && "Reine " + f.reine.toLowerCase(), f.couvain && f.couvain !== "Non vu" && "Couvain " + f.couvain.toLowerCase(),
    f.provisions && "Provisions " + f.provisions.toLowerCase(), f.poids_kg != null && f.poids_kg !== "" && n(f.poids_kg) + " kg", ...detecterTaches(f.seg).map((t) => "Tâche : " + t.toLowerCase())].filter(Boolean);
  function detecterTaches(seg) {
    const r = [], re = /(?:il faut|il faudra|faudra|faut|à faire|penser à|prévoir de|prévoir|je dois)\s+([^.,;]{4,70})/gi; let m;
    while ((m = re.exec(seg || ""))) r.push(m[1].trim().replace(/^./, (c) => c.toUpperCase()));
    return r;
  }
  function htmlCompris() {
    return T().ids.map((id) => {
      const f = fiche(id), l = lus(f), manque = f.etat === "enregistree" ? [] : ["activite", "provisions"].filter((k) => f.etat === "notee" && !f[k]).map((k) => NOMS[k] + " ?");
      const vide = f.etat === "enregistree" ? '<span>Déjà enregistrée</span>' : !l.length && !manque.length ? `<span class="manque">Dis « ${esc(nomDe(id))} » pour la commencer</span>` : "";
      return `<div><b>${esc(nomDe(id))}</b><div class="tn-lus">${l.map((x) => `<span>${esc(x)}</span>`).join("")}${manque.map((x) => `<span class="manque">${esc(x)}</span>`).join("")}${vide}</div></div>`;
    }).join("");
  }
  function majLibre() {
    lireDictee(); sauver();
    const c = document.querySelector(".tn-compris"); if (c) c.innerHTML = htmlCompris();
    const s = document.querySelector(".tn-suivi"); if (s) s.outerHTML = suivi(`${esc(nomDe(courante()))} en cours`);
    const b = document.querySelector("[data-act=tnverif]"); if (b) b.disabled = !noteesNb();
  }

  // ---------- Micro ----------
  let reco = null, verrou = null, prov = "";
  function arreter() {
    const r = reco; reco = null;
    if (r) { r.onend = r.onerror = r.onresult = null; try { r.stop(); } catch {} }
    verrou?.release?.().catch?.(() => {}); verrou = null;
    if (S.tn) S.tn.ecoute = false;
    prov = "";
  }
  function ecouter({ continu, final, partiel }) {
    const R = Reco();
    if (!R) return false;
    const r = new R();
    r.lang = "fr-FR"; r.continuous = !!continu; r.interimResults = true;
    r.onresult = (ev) => {
      let p = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) final(t.trim()); else p += t;
      }
      partiel?.(p);
    };
    r.onerror = (ev) => {
      if (ev.error === "no-speech" || ev.error === "aborted") return;
      arreter();
      S.tn.alerte = ev.error === "not-allowed" || ev.error === "service-not-allowed" ? "Autorise le micro, ou écris ta dictée ici." : "Je n’entends plus. Réessaie ou écris ta dictée ici.";
      render();
    };
    // Le navigateur coupe l'écoute après un silence : on reprend tant que l'écran reste ouvert.
    r.onend = () => { reco = null; if (S.tn?.ecoute && S.route === "tournee") ecouter({ continu, final, partiel }); };
    reco = r;
    try { r.start(); } catch { reco = null; return false; }
    navigator.wakeLock?.request?.("screen").then((w) => { verrou = w; }).catch(() => {});
    return true;
  }
  function ecouterLibre() {
    S.tn.ecoute = ecouter({
      continu: true,
      final: (t) => {
        const fini = /c'est bon[.!\s]*$/i.test(t.replace(/’/g, "'"));
        const texte = t.replace(/\s*c['’]est bon[.!\s]*$/i, "");
        S.tn.texte = [S.tn.texte, texte].filter(Boolean).join(" ");
        const a = document.getElementById("tn_texte"); if (a) { a.value = S.tn.texte; a.scrollTop = a.scrollHeight; }
        majLibre();
        if (fini) ACT.tnverif();
      },
      partiel: (p) => { prov = p; const a = document.getElementById("tn_texte"); if (a) { a.value = [S.tn.texte, p].filter(Boolean).join(" "); a.scrollTop = a.scrollHeight; } },
    });
  }

  // ---------- Questions : des règles simples tirées de l'historique ----------
  function questions(id) {
    const f = fiche(id), d = lastVisit(id);
    const deuxFois = d?.reine === "Non vue";
    return [
      { k: "activite", q: "Comment est l’activité à l’entrée ?", aide: d ? `La dernière fois : ${d.activite.toLowerCase()}.` : "Première visite de cette ruche.", rep: CHOIX.activite },
      { k: "reine", q: "Tu vois la reine ?", aide: deuxFois ? "La dernière fois, elle n’a pas été vue." : d?.reine === "Vue" ? "Elle a été vue à la dernière visite." : "Prends le temps de regarder les cadres centraux.", rep: CHOIX.reine },
      f.reine === "Non vue" && { k: "oeufs", q: "Vois-tu des œufs frais ?", aide: `${deuxFois ? "Reine non vue à 2 visites de suite. " : ""}Les œufs indiquent si elle a pondu récemment.`, rep: ["Oui, des œufs", "Non, aucun"] },
      { k: "couvain", q: "Comment est le couvain ?", aide: d?.couvain ? `La dernière fois : ${d.couvain.toLowerCase()}.` : "Passe si tu n’as pas ouvert le corps.", rep: CHOIX.couvain },
      { k: "provisions", q: "Et les provisions ?", aide: d ? `La dernière fois : ${d.provisions.toLowerCase()}.` : "Regarde les cadres de rive.", rep: CHOIX.provisions },
      { k: "poids_kg", q: "Quel poids indique la pesée ?", aide: dernierPoids(id) ? `Dernière pesée : ${n(dernierPoids(id))} kg.` : "Passe si tu ne pèses pas.", poids: true },
    ].filter(Boolean);
  }
  const dernierPoids = (id) => { const v = S.d.visites.find((x) => x.ruche_id === id && x.poids_kg); return v ? Number(v.poids_kg) : null; };
  function repondre(id, k, v) {
    const f = fiche(id);
    f.vu[k] = 1;
    if (v != null) {
      if (k === "oeufs") f.note = [f.note, v.startsWith("Oui") ? "Œufs frais vus." : "Pas d’œufs vus."].filter(Boolean).join(" ");
      else f[k] = v;
      if (k === "oeufs") f.oeufs = v.startsWith("Oui") ? "oui" : "non";
      f.etat = "notee";
    }
    const reste = questions(id).find((q) => !f.vu[q.k]);
    if (reste) { sauver(); return render(); }
    aller(T().i + 1);
  }
  function comprendre(q, txt) { // Réponse à voix haute. Ne renvoie rien si ce n'est pas clair.
    const t = sansAccent(txt);
    if (/\bpasse\b|\bsuivante?\b/.test(t)) return { passer: true };
    if (q.poids) { const k = VX.lire(txt).poids_kg ?? Number(t.match(/\d+(?:[.,]\d+)?/)?.[0].replace(",", ".")); return k ? { v: k } : null; }
    if (q.k === "oeufs") return /\bnon\b|aucun|pas d/.test(t) ? { v: q.rep[1] } : /\boui\b|oeufs?|œufs?/.test(t) ? { v: q.rep[0] } : null;
    const trouve = [...q.rep].sort((a, b) => b.length - a.length).find((o) => t.includes(sansAccent(o)));
    if (trouve) return { v: trouve };
    const proches = { activite: [[/normal|bien/, "Normale"], [/fort|grosse|beaucoup/, "Forte"], [/faible|peu/, "Faible"]], reine: [[/\bnon\b|pas vue?/, "Non vue"], [/\boui\b|\bvue?\b/, "Vue"], [/cherch/, "Non cherchée"]],
      couvain: [[/reduit|peu/, "Réduit"], [/normal|compact/, "Normal"], [/abondant|beaucoup/, "Abondant"], [/pas vu|non vu/, "Non vu"]], provisions: [[/faible|peu/, "Faibles"], [/moyen/, "Moyennes"], [/bonne|plein|beaucoup/, "Bonnes"]] }[q.k] || [];
    return proches.find(([re]) => re.test(t)) ? { v: proches.find(([re]) => re.test(t))[1] } : null;
  }
  function ecouterQuestion() {
    S.tn.ecoute = ecouter({
      continu: false,
      final: (t) => {
        const id = courante(), q = questions(id).find((x) => !fiche(id).vu[x.k]);
        if (!q) return;
        const c = comprendre(q, t);
        if (!c) return toast("Je n’ai pas compris. Répète, ou touche une réponse.", true);
        repondre(id, q.k, c.passer ? null : c.v);
      },
    });
  }

  // ---------- Vérification ----------
  function doutes(id) {
    const f = fiche(id), r = [];
    if (f.etat !== "notee") return r;
    if (!f.activite) r.push("activite");
    if (!f.provisions) r.push("provisions");
    const p = dernierPoids(id);
    if (f.poids_kg != null && f.poids_kg !== "" && p && !f.poidsOk && Math.abs(Number(f.poids_kg) - p) >= 2) r.push("poids_kg");
    return r;
  }
  const noteesNb = () => T().ids.filter((id) => fiche(id).etat === "notee").length;
  function proposer() {
    const avant = new Map((S.tn.taches || []).map((t) => [t.titre, t]));
    const ajout = new Map();
    T().ids.forEach((id) => {
      const f = fiche(id), d = lastVisit(id);
      if (f.etat !== "notee") return;
      detecterTaches(f.seg).forEach((t) => ajout.set(`${t} (${nomDe(id)})`, { ruche_id: id, echeance: null }));
      if (f.reine === "Non vue" && (d?.reine === "Non vue" || f.oeufs === "non")) ajout.set(`Revoir la reine de ${nomDe(id)}`, { ruche_id: id, echeance: plusJours(7) });
    });
    const envoyees = (S.tn.taches || []).filter((t) => t.envoyee);
    S.tn.taches = [...envoyees, ...[...ajout].filter(([t]) => !avant.get(t)?.envoyee).map(([titre, o]) => ({ titre, ...o, garder: avant.get(titre)?.garder ?? true }))];
  }
  async function enregistrerTout() {
    if (S.busy) return;
    S.busy = true; render();
    const appel = typeof HL != "undefined" ? HL.rpc : (x, y) => sb.rpc(x, y);
    const methode = S.d.visites.find((v) => v.varroa_methode)?.varroa_methode || "Sucre glace";
    let local = false;
    try {
      for (const id of T().ids) {
        const f = fiche(id);
        if (f.etat !== "notee") continue;
        const couvain = val(f, "couvain");
        const { error, local: hl } = await appel("creer_visite", { p: { ruche_id: id, date_visite: today(), activite: val(f, "activite"), provisions: val(f, "provisions"), reine: val(f, "reine"),
          couvain: couvain === "Non vu" ? "" : couvain, etat: rucheDe(id).etat, poids_kg: f.poids_kg ?? "", varroa: "", varroa_methode: methode, varroa_abeilles: "", note: f.note, intrants: [] } });
        if (error) throw error;
        local = local || !!hl;
        f.etat = "enregistree"; sauver();
      }
      for (const t of S.tn.taches.filter((x) => x.garder && !x.envoyee)) {
        const { error } = await sb.from("taches").insert({ titre: t.titre, echeance: t.echeance, ruche_id: t.ruche_id });
        if (error) throw error;
        t.envoyee = true; sauver();
      }
    } catch (e) {
      S.busy = false; render();
      return fail(e);
    }
    S.busy = false;
    S.tn.bilan = { ids: [...T().ids], fiches: S.tn.fiches, taches: S.tn.taches.filter((t) => t.envoyee), minutes: Math.max(1, Math.round((Date.now() - S.tn.debut) / 60000)), local };
    S.tn.etape = "bilan";
    effacer();
    S.tournee = null;
    await refresh();
    render();
  }

  // ---------- Morceaux communs ----------
  function hex(id, i, cl = "") { return `<i class="tn-hex ${cl || classe(rucheDe(id))}">${numero(id, i)}</i>`; }
  function suivi(droite) {
    const t = T();
    return `<div class="tn-suivi">${t.ids.map((id, i) => {
      const e = fiche(id).etat;
      return `<i class="${i === t.i ? "ici" : e === "notee" || e === "enregistree" ? "fait" : ""}">${numero(id, i)}</i>`;
    }).join("")}<span>${droite}</span></div>`;
  }
  const rang = (k, f) => `<div class="tn-lab">${NOMS[k]}</div><div class="tn-rang" style="--nb:${CHOIX[k].length}">${CHOIX[k].map((o) => `<button type="button" class="${val(f, k) === o ? "on" : ""}" aria-pressed="${val(f, k) === o}" data-act="tnset" data-k="${k}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  const pas = (f) => `<div class="tn-pas"><button type="button" aria-label="Enlever 500 g" data-act="tnpas" data-v="-0.5">−</button><label><input id="tn_poids" type="number" step="0.1" min="0" inputmode="decimal" placeholder="Pas pesée" aria-label="Poids en kilos" value="${f.poids_kg ?? ""}"><span>kg</span></label><button type="button" aria-label="Ajouter 500 g" data-act="tnpas" data-v="0.5">+</button></div>`;
  const onglets = () => `<nav class="tn-onglets" aria-label="Mode de saisie">${MODES.map(([m, t]) => `<button type="button" class="${S.tn.mode === m ? "on" : ""}" aria-pressed="${S.tn.mode === m}" data-act="tnmode" data-v="${m}">${t}</button>`).join("")}</nav>`;
  const ligneMeteo = () => {
    const m = S.tn?.meteo;
    if (!m) return "";
    if (m.sansLieu) return '<p class="tn-meteo small">Place ce rucher sur la carte pour voir la météo.</p>';
    const [h] = m.heures, txt = ["Mauvais moment pour ouvrir", "Ouverture rapide seulement", "Bon moment pour ouvrir"][h?.n ?? 3];
    return h ? `<p class="tn-meteo"><b>${h.temp}°</b> ${txt || "Météo du jour"}</p>` : "";
  };
  function chargerMeteo(essai = 0) {
    if (typeof MT == "undefined" || !S.tn || !T()) return;
    const rs = S.d.ruches.filter((r) => T().ids.includes(r.id)), p = MT.parHeure(T().rucher, rs);
    if (!p) { if (essai < 4) setTimeout(() => chargerMeteo(essai + 1), 1200); return; }
    if (p.sansLieu) S.tn.meteo = { sansLieu: true };
    else {
      const j = p.jours.find((x) => x.t === today()) || p.jours[0], maintenant = new Date().getHours();
      S.tn.meteo = { heures: (j?.heures || []).filter((h) => h.h >= maintenant).slice(0, 4) };
    }
    if (S.route === "tournee") render();
  }
  function colonneGauche() {
    const t = T(), m = S.tn.meteo;
    const taches = (S.d.taches || []).filter((x) => !x.faite && t.ids.includes(x.ruche_id)).slice(0, 4);
    return `<section class="tn-carte tn-ruches"><h2>Ruches</h2>${t.ids.map((id, i) => {
      const e = fiche(id).etat;
      return `<button type="button" class="${i === t.i ? "on" : ""}" data-act="tnaller" data-v="${i}">${hex(id, i)}<span><b>${esc(nomDe(id))}</b><small>${{ vide: "À voir", notee: "Notée", passee: "Passée", enregistree: "Enregistrée" }[e]}</small></span></button>`;
    }).join("")}</section>
    <section class="tn-carte"><h2>Météo</h2>${ligneMeteo() || '<p class="small">Chargement…</p>'}${m?.heures?.length ? `<div class="tn-heures">${m.heures.map((h) => `<span>${h.h} h<b>${h.temp}°</b></span>`).join("")}</div>` : ""}</section>
    <section class="tn-carte"><h2>Tâches ici</h2>${taches.length ? taches.map((x) => `<div class="tn-l"><span><b>${esc(x.titre)}</b><small>${esc(nomDe(x.ruche_id))}${x.echeance ? ", " + esc(U.dateCourte(x.echeance)) : ""}</small></span></div>`).join("") : '<p class="small">Aucune tâche sur ces ruches.</p>'}</section>`;
  }
  function colonneDroite() {
    const id = courante(), r = rucheDe(id), vs = S.d.visites.filter((v) => v.ruche_id === id), d = vs[0];
    const pesees = vs.filter((v) => v.poids_kg).slice(0, 6).reverse(), max = Math.max(...pesees.map((v) => Number(v.poids_kg)), 1), min = Math.min(...pesees.map((v) => Number(v.poids_kg)), max);
    const va = vs.find((v) => v.varroa != null), tx = va ? U.tauxVarroa(va) : null;
    const notes = vs.filter((v) => v.note).slice(0, 5);
    return `<section class="tn-carte"><h2>Dernière visite</h2>${d ? `<p class="small">${esc(U.dateCourte(d.date_visite))}</p><dl class="tn-dl"><dt>Reine</dt><dd>${esc(d.reine)}</dd><dt>Provisions</dt><dd>${esc(d.provisions)}</dd><dt>Activité</dt><dd>${esc(d.activite)}</dd>${d.poids_kg ? `<dt>Poids</dt><dd>${n(d.poids_kg)} kg</dd>` : ""}</dl>` : '<p class="small">Première visite de cette ruche.</p>'}</section>
    <section class="tn-carte"><h2>Poids</h2>${pesees.length > 1 ? `<div class="tn-barres" aria-hidden="true">${pesees.map((v, i) => `<i class="${i === pesees.length - 1 ? "on" : ""}" style="height:${Math.round(35 + 65 * (Number(v.poids_kg) - min) / ((max - min) || 1))}%"></i>`).join("")}</div>` : ""}<p class="small">${pesees.length ? `Dernière pesée : ${n(pesees.at(-1).poids_kg)} kg` : "Pas encore de pesée."}</p></section>
    <section class="tn-carte"><h2>Santé</h2><div class="tn-l"><span><b>Varroa</b><small>${tx !== null ? `${n(tx, 1)} % le ${esc(U.dateCourte(va.date_visite))}` : "Pas de comptage récent"}</small></span></div><div class="tn-l"><span><b>Reine</b><small>${r?.annee_reine ? `De ${r.annee_reine}` : "Année non renseignée"}</small></span></div></section>
    <section class="tn-carte tn-remplit"><h2>Notes récentes</h2>${notes.length ? notes.map((v) => `<div class="tn-l"><span><b>${esc(U.dateCourte(v.date_visite))}</b><small>${esc(v.note)}</small></span></div>`).join("") : '<p class="small">Pas encore de note sur cette ruche.</p>'}</section>`;
  }

  // ---------- Écrans ----------
  const E = {
    depart() {
      const t = T(), [m] = MODES.filter((x) => x[0] === S.tn.mode);
      const faites = t.ids.filter((id) => fiche(id).etat !== "vide").length;
      const prem = t.ids.find((id) => fiche(id).etat === "vide") || t.ids[0];
      return {
        titre: `Tournée « ${esc(t.nom)} »`,
        corps: `<p class="tn-say">${faites ? `${faites} ruche${faites > 1 ? "s" : ""} déjà notée${faites > 1 ? "s" : ""}, tu peux reprendre.` : `${t.ids.length} ruches à voir, commence par ${esc(nomDe(prem))}.`}</p>${ligneMeteo()}
        ${horsLigne() ? '<p class="tn-alerte">Pas de réseau. Les saisies restent sur le téléphone et partent au retour du réseau.</p>' : ""}
        <section class="tn-carte tn-liste" aria-label="Ruches de la tournée">${t.ids.map((id, i) => {
          const f = fiche(id), d = lastVisit(id), c = classe(rucheDe(id));
          return `<div class="tn-l">${hex(id, i)}<span><b>${esc(nomDe(id))}</b><small>${f.etat !== "vide" ? { notee: "Notée", passee: "Passée", enregistree: "Enregistrée" }[f.etat] : d ? (d.reine === "Non vue" ? "Reine pas vue à la dernière visite" : "Dernière visite " + esc(U.dateCourte(d.date_visite))) : "Première visite"}</small></span>${c === "crit" ? '<em class="tn-tag c">Urgent</em>' : c === "watch" ? '<em class="tn-tag w">Priorité</em>' : ""}</div>`;
        }).join("")}</section>
        <h2 class="tn-h2">Comment veux-tu noter ?</h2>
        <section class="tn-modes" aria-label="Choisir le mode">${MODES.map(([k, a, b]) => `<button type="button" class="tn-mode ${k === S.tn.mode ? "on" : ""}" data-act="tnmode" data-v="${k}"><span class="tn-mi">${k === "manuel" ? PLUS : Apidoo.compagnon(k === "libre" ? "ecoute" : "repond", 40).replace("<api-compagnon ", "<api-compagnon muet ")}</span><span><b>${a}</b><small>${b}</small></span></button>`).join("")}</section>`,
        pied: `<button type="button" class="tn-b miel" data-act="tnmode" data-v="${S.tn.mode}">${S.tn.mode === "manuel" ? "" : MICRO}${faites ? "Reprendre" : m[3]}</button>${faites ? '<button type="button" class="tn-lien" data-act="tnzero">Recommencer la tournée</button>' : ""}`,
      };
    },
    libre() {
      const ok = !!Reco();
      const ondes = [12, 26, 38, 20, 32, 14, 28, 40, 18, 30, 12, 24, 36, 16].map((h) => `<i style="height:${h}px"></i>`).join("");
      return {
        titre: S.tn.ecoute ? "API t’écoute" : "Ta dictée", sombre: true, onglets: true, suivi: suivi(`${esc(nomDe(courante()))} en cours`),
        corps: `<div class="tn-ecoute">${Apidoo.compagnon(S.tn.ecoute ? "ecoute" : "repos", 56, "sombre").replace("<api-compagnon ", "<api-compagnon muet ")}<div class="tn-ondes ${S.tn.ecoute ? "actif" : ""}" aria-hidden="true">${ondes}</div></div>
        ${S.tn.alerte ? `<p class="tn-alerte">${esc(S.tn.alerte)}</p>` : !ok ? '<p class="tn-alerte">Sur cet appareil, utilise le micro du clavier pour dicter ici.</p>' : ""}
        <textarea id="tn_texte" class="tn-dicte" rows="4" aria-label="Ta dictée" placeholder="Dis le nom de la ruche, puis ce que tu vois. Exemple : Ruche 2, reine vue, provisions bonnes, 38 kilos.">${esc(S.tn.texte || "")}</textarea>
        <section class="tn-compris" aria-label="Ce qu’API a compris">${htmlCompris()}</section>`,
        pied: `<div class="tn-deux">${ok ? `<button type="button" class="tn-b" data-act="tnecoute">${S.tn.ecoute ? "Pause" : "Reprendre"}</button>` : `<button type="button" class="tn-b" data-act="tnmode" data-v="manuel">Au doigt</button>`}<button type="button" class="tn-b miel" data-act="tnverif" ${noteesNb() ? "" : "disabled"}>J’ai fini, vérifier</button></div>`,
      };
    },
    guide() {
      const id = courante(), f = fiche(id), qs = questions(id), q = qs.find((x) => !f.vu[x.k]) || qs[0], rang = qs.indexOf(q) + 1;
      const notes = qs.filter((x) => f.vu[x.k] && x.k !== "oeufs").map((x) => (f[x.k] ? [x.k, x.k === "poids_kg" ? n(f.poids_kg) + " kg" : `${NOMS[x.k]} ${String(f[x.k]).toLowerCase()}`] : null)).filter(Boolean);
      return {
        titre: esc(nomDe(id)), droite: `Question ${rang} sur ${qs.length}`, onglets: true, suivi: suivi(`Ruche ${T().i + 1} sur ${T().ids.length}`),
        corps: `<div class="tn-bulle" aria-live="polite">${Apidoo.compagnon("repond", 40).replace("<api-compagnon ", "<api-compagnon muet ")}<b>${esc(q.q)}</b><small>${esc(q.aide)}</small></div>
        ${q.poids ? `<div class="tn-seul">${pas(f)}<button type="button" class="tn-b main" data-act="tnrep" data-k="poids_kg">Valider le poids</button></div>`
          : `<div class="tn-reps">${q.rep.map((o) => `<button type="button" data-act="tnrep" data-k="${q.k}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`}
        <div class="tn-carte tn-note"><small>Déjà noté pour ${esc(nomDe(id))}</small><div class="tn-tags">${notes.length ? notes.map(([k, x]) => `<button type="button" data-act="tnrevoir" data-v="${k}">${esc(x)}</button>`).join("") : "<span>Rien pour l’instant</span>"}</div></div>`,
        pied: `${Reco() ? `<button type="button" class="tn-b miel" data-act="tnvoix" aria-pressed="${!!S.tn.ecoute}">${MICRO}${S.tn.ecoute ? "J’écoute, touche pour arrêter" : "Répondre à voix haute"}</button>` : ""}<button type="button" class="tn-lien" data-act="tnrep" data-k="${q.k}" data-v="">Passer cette question</button>`,
      };
    },
    manuel() {
      const id = courante(), f = fiche(id), d = lastVisit(id);
      return {
        titre: esc(nomDe(id)), onglets: true, suivi: suivi(`Ruche ${T().i + 1} sur ${T().ids.length}`),
        corps: `<p class="tn-rappel">${d ? `Dernière visite ${esc(U.dateCourte(d.date_visite))} : reine ${esc(d.reine.toLowerCase())}${dernierPoids(id) ? `, ${n(dernierPoids(id))} kg` : ""}. Change ce qui diffère.` : "Première visite de cette ruche."}</p>
        ${["activite", "reine", "couvain", "provisions"].map((k) => rang(k, f)).join("")}
        <div class="tn-lab">Poids</div>${pas(f)}
        ${f.note ? `<p class="tn-rappel tn-lanote">${esc(f.note)}</p>` : ""}
        <div class="tn-outils"><button type="button" data-act="tnnote">${MICRO}${S.tn.ecoute ? "J’écoute" : "Note"}</button><button type="button" data-act="tnplus" data-v="photos">${PHOTO}Photo</button><button type="button" data-act="tnplus">${PLUS}Plus</button></div>`,
        pied: `<div class="tn-deux"><button type="button" class="tn-b" data-act="tnpasser">Passer</button><button type="button" class="tn-b main" data-act="tnsuivante">${S.tn.revoir ? "Valider" : T().i + 1 < T().ids.length ? "Ruche suivante ›" : "Vérifier la tournée"}</button></div>`,
      };
    },
    verif() {
      proposer();
      const t = T(), notees = t.ids.filter((id) => fiche(id).etat === "notee"), nb = notees.reduce((s, id) => s + doutes(id).length, 0);
      const ligne = (k, f, id) => {
        const dt = doutes(id).includes(k), v = k === "poids_kg" ? (f.poids_kg != null && f.poids_kg !== "" ? n(f.poids_kg) + " kg" : "") : k === "couvain" && !f[k] ? "" : k === "reine" && !f[k] ? "" : val(f, k);
        return v ? `<dt>${k === "poids_kg" ? "Poids" : NOMS[k]}</dt><dd class="${dt ? "doute" : ""}">${esc(v)}</dd>` : "";
      };
      return {
        titre: "Vérifie, puis enregistre",
        corps: `<p class="tn-say">${notees.length ? `${notees.length} ruche${notees.length > 1 ? "s" : ""} notée${notees.length > 1 ? "s" : ""}, ${nb ? `${nb} point${nb > 1 ? "s" : ""} à vérifier` : "tout est clair"}.` : "Rien à enregistrer pour l’instant."}</p>
        ${nb ? '<p class="tn-rappel">Un « ? » signale une valeur non dite ou un poids éloigné de la dernière pesée.</p>' : ""}
        <div class="tn-verifs">${t.ids.map((id, i) => {
          const f = fiche(id);
          if (f.etat === "notee") return `<section class="tn-carte"><div class="tn-l">${hex(id, i)}<span><b>${esc(nomDe(id))}</b></span><button type="button" class="tn-lien" data-act="tnmodif" data-v="${i}">Modifier</button></div><dl class="tn-dl">${["activite", "reine", "couvain", "provisions", "poids_kg"].map((k) => ligne(k, f, id)).join("")}</dl>${f.note ? `<p class="small">${esc(f.note)}</p>` : ""}</section>`;
          return `<section class="tn-carte"><div class="tn-l">${hex(id, i)}<span><b>${esc(nomDe(id))}</b><small>${{ vide: "Pas de saisie, elle ne sera pas enregistrée", passee: "Passée", enregistree: "Déjà enregistrée" }[f.etat]}</small></span>${f.etat === "enregistree" ? "" : `<button type="button" class="tn-lien" data-act="tnmodif" data-v="${i}">Ajouter</button>`}</div></section>`;
        }).join("")}
        ${S.tn.taches.filter((x) => !x.envoyee).map((x, i) => `<div class="tn-prop">${Apidoo.compagnon("repond", 32).replace("<api-compagnon ", "<api-compagnon muet ")}<span><b>Tâche proposée :</b> ${esc(x.titre)}${x.echeance ? `, pour le ${esc(U.dateCourte(x.echeance))}` : ""}</span><button type="button" class="tn-lien" data-act="tngarder" data-v="${esc(x.titre)}" aria-pressed="${x.garder}">${x.garder ? "Gardée" : "Retirée"}</button></div>`).join("")}</div>`,
        pied: `<div class="tn-deux"><button type="button" class="tn-b" data-act="tnretour">Revenir</button><button type="button" class="tn-b main" data-act="tnenreg" ${notees.length && !S.busy ? "" : "disabled"}>${horsLigne() ? "Garder sur le téléphone" : `Enregistrer ${notees.length > 1 ? `les ${notees.length} ruches` : notees.length ? "la ruche" : ""}`}</button></div>`,
      };
    },
    bilan() {
      const b = S.tn.bilan, faites = b.ids.filter((id) => b.fiches[id]?.etat === "enregistree"), arevoir = b.taches.find((t) => t.echeance);
      return {
        titre: "Tournée terminée", plein: true,
        corps: `<div class="tn-fin">${Apidoo.compagnon("fait", 84)}</div>
        <p class="tn-say tn-c">${arevoir ? `C’est noté. ${esc(nomDe(arevoir.ruche_id))} reste à revoir.` : "C’est noté, tes ruches sont à jour."}</p>
        ${b.local ? '<p class="tn-alerte">Gardé sur le téléphone, envoi au retour du réseau.</p>' : ""}
        <section class="tn-chiffres"><div><b>${faites.length}</b><small>ruche${faites.length > 1 ? "s" : ""} vue${faites.length > 1 ? "s" : ""}</small></div><div><b>${b.minutes}</b><small>minute${b.minutes > 1 ? "s" : ""}</small></div><div><b>${b.taches.length}</b><small>tâche${b.taches.length > 1 ? "s" : ""} créée${b.taches.length > 1 ? "s" : ""}</small></div></section>
        <section class="tn-carte tn-liste tn-remplit" aria-label="Résumé">${b.ids.map((id, i) => {
          const f = b.fiches[id] || {}, t = b.taches.some((x) => x.ruche_id === id && x.echeance);
          return `<div class="tn-l">${hex(id, i)}<span><b>${esc(nomDe(id))}</b><small>${f.etat === "enregistree" ? esc(lus(f).slice(0, 3).join(", ") || "Visite enregistrée") : "Passée"}</small></span>${f.etat !== "enregistree" ? '<em class="tn-tag n">Passée</em>' : t ? '<em class="tn-tag w">À revoir</em>' : '<em class="tn-tag g">Notée</em>'}</div>`;
        }).join("")}${b.taches.map((t) => `<div class="tn-l"><span><b>${esc(t.titre)}</b><small>Tâche${t.echeance ? ", " + esc(U.dateCourte(t.echeance)) : ""}</small></span></div>`).join("")}</section>`,
        pied: '<button type="button" class="tn-b main" data-act="tnaccueil">Retour à l’accueil</button>',
      };
    },
  };

  function vue() {
    if (!S.tn || (!T() && S.tn.etape !== "bilan")) { S.route = "dash"; return render(); }
    const e = S.tn.etape, x = E[e](), cotes = !x.plein && T();
    const fermer = e === "bilan" ? "" : `<button type="button" class="tn-x" data-act="tnquitter" aria-label="Quitter la tournée">${CROIX}</button>`;
    $app.innerHTML = `<div class="tn-app tn-e-${e}">
      <header class="tn-haut ${x.sombre ? "sombre" : ""}"><img class="tn-logo" src="logo-apidoo.svg" alt="Apidoo" height="28"><h1>${x.titre}</h1>${x.droite ? `<span class="small">${x.droite}</span>` : ""}${fermer}</header>
      <div class="tn-grille ${cotes ? "" : "seule"}">
        ${cotes ? `<aside class="tn-cote">${colonneGauche()}</aside>` : ""}
        <div class="tn-m ${x.sombre ? "sombre" : ""}">${x.onglets ? onglets() : ""}${x.suivi || ""}<div class="tn-corps">${x.corps}</div><footer class="tn-pied">${x.pied}</footer></div>
        ${cotes ? `<aside class="tn-cote">${colonneDroite()}</aside>` : ""}
      </div></div>`;
    const a = document.getElementById("tn_texte");
    if (a) a.addEventListener("input", () => { S.tn.texte = a.value; S.tn.alerte = ""; majLibre(); });
    const p = document.getElementById("tn_poids");
    if (p) p.addEventListener("input", () => { const f = fiche(courante()); f.poids_kg = p.value === "" ? null : Number(p.value); sauver(); });
  }
  ES.VUES.tournee = vue;

  // ---------- Actions ----------
  ACT.v3tournee = (cle) => {
    const ids = ordonner(S.d.ruches.filter((r) => (r.rucher || "") === cle).map((r) => r.id));
    if (!ids.length) return;
    const g = lireBrouillon(cle);
    S.tournee = g?.T && g.T.ids.length === ids.length ? { ...g.T, i: 0 } : { rucher: cle, nom: U.nomRucher(cle), ids, i: 0, faites: 0 };
    S.tn = g?.T && g.T.ids.length === ids.length ? { ...g.tn, etape: "depart", ecoute: false, alerte: "", meteo: null } : { etape: "depart", mode: lireMode(), fiches: {}, taches: [], texte: "", debut: Date.now() };
    go("tournee");
    chargerMeteo();
  };
  Object.assign(ACT, {
    tnmode: (m) => {
      arreter();
      S.tn.mode = m; S.tn.etape = m; S.tn.revoir = false; S.tn.alerte = ""; noterMode(m);
      if (m === "libre") { lireDictee(); ecouterLibre(); return render(); }
      aller(Math.max(0, T().ids.findIndex((id) => fiche(id).etat === "vide")));
    },
    tnzero: () => { effacer(); ACT.v3tournee(T().rucher); },
    tnquitter: () => {
      arreter(); sauver();
      const garde = T().ids.some((id) => fiche(id).etat === "notee");
      S.tournee = null; S.tn = null;
      if (garde) toast("Tournée gardée, reprends-la quand tu veux"); else effacer();
      go("dash");
    },
    tnaccueil: () => { S.tn = null; go("dash"); },
    tnaller: (i) => { arreter(); if (["depart", "verif", "libre"].includes(S.tn.etape)) S.tn.etape = "manuel"; aller(Number(i)); },
    tnecoute: () => { if (S.tn.ecoute) arreter(); else ecouterLibre(); render(); },
    tnverif: () => { arreter(); lireDictee(); S.tn.etape = "verif"; sauver(); render(); },
    tnretour: () => { S.tn.etape = S.tn.mode; if (S.tn.mode === "libre") ACT.tnmode("libre"); else aller(0); },
    tnset: (v, k) => { const f = fiche(courante()); f[k] = v; sauver(); render(); },
    tnpas: (d) => {
      const f = fiche(courante()), id = courante();
      f.poids_kg = Math.max(0, Math.round(((f.poids_kg ?? dernierPoids(id) ?? 40) + (f.poids_kg == null ? 0 : Number(d))) * 10) / 10);
      sauver(); render();
    },
    tnsuivante: () => {
      const id = courante(), f = fiche(id);
      Object.keys(DEFAUT).forEach((k) => { f[k] = val(f, k); });
      f.etat = "notee"; f.poidsOk = true; f.corrige = true;
      if (S.tn.revoir) { S.tn.revoir = false; S.tn.etape = "verif"; sauver(); return render(); }
      aller(T().i + 1);
    },
    tnpasser: () => { const f = fiche(courante()); if (f.etat === "vide") f.etat = "passee"; if (S.tn.revoir) { S.tn.revoir = false; S.tn.etape = "verif"; return render(); } aller(T().i + 1); },
    tnmodif: (i) => { S.tn.etape = "manuel"; S.tn.revoir = true; aller(Number(i)); },
    tngarder: (titre) => { const t = S.tn.taches.find((x) => x.titre === titre); if (t) t.garder = !t.garder; sauver(); render(); },
    tnenreg: () => enregistrerTout(),
    tnrep: (v, k) => {
      const id = courante(), f = fiche(id);
      if (k === "poids_kg" && v === undefined) return repondre(id, k, document.getElementById("tn_poids")?.value ? Number(document.getElementById("tn_poids").value) : null);
      repondre(id, k, v === "" || v === undefined ? null : v);
    },
    tnrevoir: (k) => { const f = fiche(courante()); delete f.vu[k]; render(); },
    tnvoix: () => { if (S.tn.ecoute) arreter(); else ecouterQuestion(); render(); },
    tnnote: () => {
      const f = fiche(courante());
      if (S.tn.ecoute) { arreter(); return render(); }
      if (Reco()) {
        S.tn.ecoute = ecouter({ continu: true, final: (t) => { f.note = [f.note, t].filter(Boolean).join(" "); sauver(); render(); } });
        return render();
      }
      sheet({ title: "Note pour " + nomDe(courante()), fields: [{ name: "note", label: "Ce que tu as vu", type: "textarea", value: f.note }], submit: (v) => { f.note = v.note.trim(); sauver(); $sheet.close(); render(); } });
    },
    tnplus: (sec) => { // Formulaire complet : photos, traitement, varroa, nourrissement.
      arreter();
      const id = courante(), f = fiche(id);
      S.tn.plus = id; S.tn.faites = T().faites;
      ACT.newvisite(id);
      Object.keys(DEFAUT).forEach((k) => { S.visite[k] = val(f, k); });
      S.visite.poids_kg = f.poids_kg ?? ""; S.visite.note = f.note;
      if (sec) U.ouvrir(sec);
      viewVisite();
    },
  });
  // Retour du formulaire complet vers le parcours. Renvoie vrai si la tournée reprend ici.
  function retour() {
    if (!S.tn?.plus) return false;
    const id = S.tn.plus, f = fiche(id);
    S.tn.plus = null; S.visite = null; S.busy = false;
    if (T().faites > (S.tn.faites || 0)) f.etat = "enregistree";
    S.route = "tournee";
    S.tn.etape = "manuel";
    aller(f.etat === "enregistree" ? T().i + 1 : T().i);
    return true;
  }
  return { retour, decouper, comprendre };
})();
