// Apidoo — fonctionnalités essentielles : météo par heure, rappels, réglages en blocs, registre complet,
// fiche de lot, factures et conseils du mois. Chargé après ergonomie.js. Styles : fin de index.html.
const ES = (() => {
  const U = UX;
  const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const VUES = {};
  Object.assign(GROUP, { meteo: "ruches", rappels: "dash", lot: "miel", facture: "clients", saison: "dash" });
  const jourLong = (t) => new Date(t + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long" });
  const jourCourt = (t) => new Date(t + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
  const retour = (act, v, texte) => document.querySelector(".wrap")?.insertAdjacentHTML("afterbegin", `<button type="button" class="link u-retour" data-act="${act}" data-v="${esc(v)}">${esc(texte)}</button>`);
  const phrase = (texte) => { const h = document.querySelector(".wrap .head h1"); if (h) { h.textContent = texte; h.closest(".head").classList.add("g-tete"); } };

  // ---------- 1. Météo heure par heure ----------
  ACT.ermeteo = (k) => { S.meteoRucher = k; S.meteoJour = null; go("meteo"); };
  ACT.ermjour = (t) => { S.meteoJour = t; render(); };
  const ETAT = { 2: ["ok", "", "Oui"], 1: ["court", "w", "Rapide"], 0: ["", "non", "Non"] };
  const etatHtml = (n) => (n == null ? "–" : `<span class="eh-etat"><i class="ab-mini ${ETAT[n][1]}"></i>${ETAT[n][2]}</span>`);
  function phraseJour(j) {
    const nom = jourLong(j.t), plage = (n) => { const l = j.heures.filter((x) => x.n === n && !x.passee); return l.length ? [l[0].h, l[l.length - 1].h + 1] : null; };
    const bon = plage(2), vite = plage(1);
    if (bon) return `Tu peux ouvrir ${nom} entre ${bon[0]} h et ${bon[1]} h.`;
    if (vite) return `Visite rapide possible ${nom} entre ${vite[0]} h et ${vite[1]} h.`;
    return `Pas de créneau pour ouvrir ${nom}.`;
  }
  VUES.meteo = function () {
    const k = S.meteoRucher, rs = U.ruchers().find(([x]) => x === k)?.[1] || [], nom = U.nomRucher(k), m = MT.parHeure(k, rs);
    const fin = () => retour("alrucher", k, nom);
    if (!m || m.sansLieu) {
      shell("Météo", nom, "", m ? '<p class="small">Place ce rucher sur la carte pour voir sa météo.</p><button type="button" class="btn" data-act="go" data-v="carte">Ouvrir la carte</button>' : '<p class="small">Météo en cours de chargement…</p>');
      return fin();
    }
    if (!m.jours.some((j) => j.t === S.meteoJour)) S.meteoJour = m.creneau?.jour || m.auj;
    const j = m.jours.find((x) => x.t === S.meteoJour) || m.jours[0];
    const meilleur = j.heures.find((x) => x.n === 2 && !x.passee) || j.heures.find((x) => x.n === 1 && !x.passee);
    const action = meilleur ? `<button type="button" class="btn main" data-act="ervisite" data-v="${meilleur.h}">Prévoir une visite ${esc(jourLong(j.t))} à ${meilleur.h} h</button>` : "";
    const onglets = `<div class="eh-jours" role="group" aria-label="Choisir un jour">${m.jours.map((x) => `<button type="button" class="${x.t === j.t ? "on" : ""} ${x.heures.some((h) => h.n === 2) ? "bon" : ""}" aria-pressed="${x.t === j.t}" data-act="ermjour" data-v="${x.t}">${MT.icone(x.code)}<b>${esc(jourCourt(x.t))}</b> ${x.max}°</button>`).join("")}</div>`;
    const ligne = (titre, f, cl = "") => `<tr><th scope="row">${titre}</th>${j.heures.map((h) => `<td class="${cl} ${h.n === 2 ? "ok" : h.n === 1 ? "court" : ""}">${f(h)}</td>`).join("")}</tr>`;
    const tete = `<tr><th scope="col">Heure</th>${j.heures.map((h) => `<th scope="col">${h.h} h</th>`).join("")}</tr>`;
    const ligneSi = (titre, cle, u) => (j.heures.some((h) => h[cle] != null) ? ligne(titre, (h) => (h[cle] == null ? "–" : `${h[cle]}${u}`)) : "");
    const table = `<section class="eh-table"><table><thead>${tete}</thead><tbody>
      ${ligne("Ciel", (h) => MT.icone(h.code))}${ligne("Température", (h) => `${h.temp}°`, "fort")}${ligne("Risque de pluie", (h) => `${h.risque} %`)}${ligne("Vent", (h) => h.vent)}${ligneSi("Rafales", "rafales", "")}${ligneSi("Humidité", "hum", " %")}${ligne("Ouvrir ?", (h) => etatHtml(h.n))}</tbody></table></section>`;
    const liste = `<section class="eh-liste" aria-label="Prévisions heure par heure">${j.heures.map((h) => `<div class="eh-h ${h.n === 2 ? "ok" : h.n === 1 ? "court" : ""}"><b>${h.h} h</b>${MT.icone(h.code)}<b>${h.temp}°</b><span class="small">Pluie ${h.risque} %, vent ${h.vent}</span><span class="small">${h.n == null ? "–" : ETAT[h.n][2]}</span></div>`).join("")}</section>`;
    const s = MT.SEUILS;
    shell("Météo", `${nom}, ${new Date(j.t + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`, action,
      `${onglets}${table}${liste}<p class="small">Vent et rafales en km/h. Oui à partir de ${s.ouvrir} °C, rapide à partir de ${s.rapide} °C, sans pluie annoncée, avec moins de ${s.vent} km/h de vent et moins de ${s.pluie} % de risque de pluie, entre ${s.debut} h et ${s.fin} h. Ces seuils se règlent dans Réglages.</p>`);
    fin();
    phrase(phraseJour(j));
  };
  ACT.ervisite = (h) => {
    S.erPrefill = { titre: `Visite du rucher ${U.nomRucher(S.meteoRucher)} à ${h} h`, echeance: S.meteoJour };
    tacheForm(null, "");
  };
  const pret = AL.meteoPrete;
  AL.meteoPrete = function () { pret?.(); if (S.route === "meteo") render(); };

  // ---------- 2. Rappels et notifications ----------
  const CATS = [["meteo", "Créneau favorable"], ["soins", "Traitements et échéances"], ["ventes", "Paiements en attente, après 7 jours"], ["stock", "Stock bas et DDM proche"]];
  const lireJson = (k, d) => { try { return JSON.parse(memo(k) || "") ?? d; } catch { return d; } };
  const prefs = () => ({ meteo: true, soins: true, ventes: true, stock: true, ...lireJson("apidoo-rappels", {}) });
  const vus = () => new Set(lireJson("apidoo-rappels-vus", []));
  function rappels() {
    const d = S.d, p = prefs(), l = [], auj = today(), plus = (j) => { const x = new Date(auj + "T12:00:00"); x.setDate(x.getDate() + j); return x.toISOString().slice(0, 10); };
    const ajoute = (cat, cle, titre, sous, tag, cl, act, v) => { if (p[cat]) l.push({ cle, titre, sous, tag, cl, act, v }); };
    U.ruchers().forEach(([k, rs]) => {
      const c = MT.creneauConnu(k, rs);
      if (c?.n === 2) ajoute("meteo", `meteo-${k}-${c.jour}`, `${c.jour === auj ? "Aujourd’hui" : ES.jourLong(c.jour).replace(/^./, (x) => x.toUpperCase())} vers ${c.h} h, bon créneau à ${U.nomRucher(k)}`, "Météo", "Voir", "good", "ermeteo", k);
    });
    const vuT = new Set();
    d.visites.filter((v) => v.retrait_prevu && v.retrait_prevu >= plus(-7) && v.retrait_prevu <= plus(7)).forEach((v) => {
      const cle = `trt-${v.ruche_id}-${v.retrait_prevu}`;
      if (vuT.has(cle)) return; vuT.add(cle);
      ajoute("soins", cle, `Fin du traitement de ${byId(d.ruches, v.ruche_id)?.nom || "?"}`, v.traitement, dfr(v.retrait_prevu), v.retrait_prevu < auj ? "crit" : "watch", "ruche", v.ruche_id);
    });
    d.taches.filter((t) => !t.faite && t.echeance && t.echeance <= plus(2)).forEach((t) => ajoute("soins", `tache-${t.id}`, t.titre, "Tâche", t.echeance < auj ? "En retard" : dfr(t.echeance), t.echeance < auj ? "crit" : "watch", "edittache", t.id));
    if (new Date().getMonth() >= 8 && d.ruches.length) ajoute("soins", `decl-${auj.slice(0, 4)}`, "Déclarer les ruches", "Obligation annuelle, sur Mes Démarches", "31 décembre", "neutre", "go", "declaration");
    d.ventes.filter((v) => !v.paye && days(v.date_vente) >= 7).forEach((v) => ajoute("ventes", `vente-${v.id}`, `${byId(d.clients, v.client_id)?.nom || "Client"} doit ${eur(venteTotal(v))} depuis ${days(v.date_vente)} jours`, `Vente du ${dfr(v.date_vente)}`, "À relancer", "watch", "uvente", v.id));
    d.articles.filter((a) => a.type !== "Équipement" && Number(a.seuil) > 0 && Number(a.stock) <= Number(a.seuil)).forEach((a) => ajoute("stock", `stock-${a.id}-${a.stock}`, `${a.nom} : stock bas`, `${n(a.stock)} ${a.unite} restants`, "Matériel", "neutre", "editarticle", a.id));
    d.lots.filter((x) => x.ddm && x.pots_restants > 0 && x.ddm <= plus(90)).forEach((x) => ajoute("stock", `ddm-${x.id}`, `Lot ${x.code} : DDM proche`, `${x.pots_restants} pots restants`, dfr(x.ddm), "watch", "editlot", x.id));
    return l;
  }
  const nouveaux = () => { const v = vus(); return rappels().filter((r) => !v.has(r.cle)); };
  const CL = { good: "good", watch: "watch", crit: "crit", neutre: "" };
  VUES.rappels = function () {
    const l = rappels(), v = vus(), p = prefs(), nb = l.filter((r) => !v.has(r.cle)).length;
    const lignes = l.map((r) => `<button type="button" class="u-todo ${v.has(r.cle) ? "er-vu" : ""}" data-act="${r.act}" data-v="${esc(r.v)}"><span class="u-todo-t"><b>${esc(r.titre)}</b><span class="small">${esc(r.sous)}</span></span><span class="u-chip ${CL[r.cl]}">${esc(r.tag)}</span></button>`).join("");
    const bascule = (titre, sous, on, act, val) => `<div class="er-rang"><span class="u-todo-t"><b>${esc(titre)}</b>${sous ? `<span class="small">${esc(sous)}</span>` : ""}</span><button type="button" class="er-bascule ${on ? "on" : ""}" role="switch" aria-checked="${on}" aria-label="${esc(titre)}" data-act="${act}" data-v="${val}"></button></div>`;
    const dispo = "Notification" in window, perm = dispo ? Notification.permission : "denied";
    const notif = dispo ? bascule("Notifications sur cet appareil", perm === "denied" ? "Bloquées dans les réglages du navigateur" : "Quand Apidoo est ouverte", perm === "granted" && memo("apidoo-notif") !== "0", "ernotif", "") : '<p class="small">Cet appareil ne propose pas les notifications. Sur iPhone, ajoute d’abord Apidoo à l’écran d’accueil.</p>';
    shell("Rappels", "Ce qui demande ton attention", "", `<div class="er-deux">
      <section class="card u-liste er-liste-r"><div class="u-entete"><h2>À voir</h2>${nb ? '<button type="button" class="link" data-act="ertoutvu">Tout marquer comme vu</button>' : ""}</div>${lignes || '<p class="small">Rien à signaler pour le moment.</p>'}</section>
      <div class="er-pile"><section class="card"><h2>Comment te prévenir</h2>${notif}<div class="er-rang"><span class="u-todo-t"><b>Agenda de ton téléphone</b><span class="small">Tâches et échéances</span></span>${RP.bouton() || '<span class="small">Aucune tâche datée</span>'}</div></section>
      <section class="card"><h2>De quoi te prévenir</h2>${CATS.map(([k, t]) => bascule(t, "", p[k], "ercat", k)).join("")}</section></div></div>`);
    phrase(nb === 0 ? "Rien de nouveau pour l’instant." : nb === 1 ? "Un rappel à voir." : `${nb} rappels à voir.`);
  };
  ACT.ertoutvu = () => { memo("apidoo-rappels-vus", JSON.stringify([...new Set([...vus(), ...rappels().map((r) => r.cle)])].slice(-300))); render(); };
  ACT.ercat = (k) => { const p = prefs(); p[k] = !p[k]; memo("apidoo-rappels", JSON.stringify(p)); render(); };
  ACT.ernotif = async () => {
    if (Notification.permission === "default") await Notification.requestPermission();
    else if (Notification.permission === "granted") memo("apidoo-notif", memo("apidoo-notif") === "0" ? "1" : "0");
    render();
  };
  async function prevenir() {
    if (!("Notification" in window) || Notification.permission !== "granted" || memo("apidoo-notif") === "0" || !S.d) return;
    const deja = new Set(lireJson("apidoo-rappels-notifies", [])), l = nouveaux().filter((r) => !deja.has(r.cle));
    if (!l.length) return;
    memo("apidoo-rappels-notifies", JSON.stringify([...deja, ...l.map((r) => r.cle)].slice(-300)));
    const sw = await navigator.serviceWorker?.ready.catch(() => null);
    await sw?.showNotification?.(l.length === 1 ? l[0].titre : `${l.length} rappels à voir`, { body: l.length === 1 ? l[0].sous : l.slice(0, 3).map((r) => r.titre).join("\n"), icon: "icone-192.png", tag: "apidoo-rappels" });
  }
  const CLOCHE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4"/></svg>';
  function cloche() {
    const nb = nouveaux().length;
    const b = `<button type="button" class="er-cloche" data-act="go" data-v="rappels" aria-label="Rappels${nb ? `, ${nb} à voir` : ""}">${CLOCHE}${nb ? `<em>${nb}</em>` : ""}</button>`;
    document.querySelector('.side [data-v="saisir"]')?.insertAdjacentHTML("beforebegin", b);
    document.querySelector(".topbar .avatar")?.insertAdjacentHTML("beforebegin", b);
  }

  // ---------- 3. Réglages en blocs ----------
  const BANDEAUX = {
    miel: ["Miel doux", {}],
    sauge: ["Sauge", { "--bandeau": "#DFEDE4" }],
    vert: ["Vert Apidoo", { "--bandeau": "#2F6B4F", "--bandeau-texte": "#fff", "--bandeau-lien": "#fff", "--bandeau-actif": "#FBEFC9", "--bandeau-actif-texte": "#1B2420", "--bandeau-survol": "rgba(255,255,255,.16)" }],
    sapin: ["Sapin", { "--bandeau": "#1E2B24", "--bandeau-texte": "#fff", "--bandeau-lien": "#C5D0C8", "--bandeau-actif": "#2C3D33", "--bandeau-survol": "rgba(255,255,255,.12)" }],
  };
  const bandeau = () => (BANDEAUX[memo("apidoo-bandeau")] ? memo("apidoo-bandeau") : "miel");
  function appliquerBandeau() {
    const r = document.documentElement, v = BANDEAUX[bandeau()][1];
    ["--bandeau", "--bandeau-texte", "--bandeau-lien", "--bandeau-actif", "--bandeau-actif-texte", "--bandeau-survol"].forEach((k) => (v[k] ? r.style.setProperty(k, v[k]) : r.style.removeProperty(k)));
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", v["--bandeau"] || "#FBEFC9");
    const sombre = bandeau() === "vert" || bandeau() === "sapin";
    document.querySelectorAll(".side .brand img, .topbar > img").forEach((i) => { i.src = sombre ? "logo-apidoo-clair.svg" : "logo-apidoo.svg"; });
  }
  appliquerBandeau();
  const reglagesAvant = window.viewReglages;
  window.viewReglages = function () {
    if (S.rgForm) {
      reglagesAvant();
      document.querySelector(".wrap .u-retour, .wrap .er-ariane")?.remove();
      retour("errgblocs", "", "Réglages");
      return;
    }
    const c = cfg(), rempli = [c.nom, c.napi, c.siret, c.adresse].filter(Boolean).length, s = MT.SEUILS;
    const b = ER.bloc, manque = [!c.napi && "NAPI", !c.siret && "SIRET", !c.adresse && "adresse"].filter(Boolean);
    const num = `F-${new Date().getFullYear()}-${String(S.d.ventes.filter((v) => v.facture_num).length + 1).padStart(4, "0")}`;
    shell("Réglages", c.nom, "", `<div class="n4-grille g-blocs">
      ${b("", "Mon exploitation", rempli === 4 ? "Complète" : "À compléter", manque.length ? `${manque.join(", ")} à renseigner`.replace(/^./, (x) => x.toUpperCase()) : "NAPI, SIRET et adresse renseignés", `${ER.jauge(rempli / 4 * 100)}<span class="small">Sert aux factures, étiquettes et au registre</span>`, "", "errgexpl")}
      ${b("", "Factures", num, "Prochain numéro", `<span class="small">${esc(c.mention_tva ? "Mention de TVA renseignée" : "Mention de TVA à renseigner")}, paiement à ${esc(c.delai_paiement || "réception")}</span>`, "", "errgfact")}
      ${b("", "Météo", `${s.ouvrir} °C`, "Seuil pour ouvrir une ruche", `<span class="small">Vent ${s.vent} km/h, pluie ${s.pluie} %, de ${s.debut} h à ${s.fin} h</span>`, "", "errgmeteo")}
      ${b("", "Apparence", BANDEAUX[bandeau()][0], "Couleur du bandeau sur cet appareil", `<span class="er-pastilles" aria-hidden="true">${Object.entries(BANDEAUX).map(([k, [, v]]) => `<i class="${k === bandeau() ? "on" : ""}" style="background:${v["--bandeau"] || "#FBEFC9"}"></i>`).join("")}</span>`, "", "errgcouleur")}
      ${b("rappels", "Rappels", U.pluriel(nouveaux().length, "rappel"), "Notifications et sujets suivis")}
      ${b("", "Listes, exports et sauvegarde", "Mes données", "Postes, cercles, modes de paiement", '<span class="small">Fichiers pour le comptable, sauvegarde complète</span>', "", "errgform")}
    </div>`);
  };
  ACT.errgblocs = () => { S.rgForm = false; render(); };
  ACT.errgform = () => { S.rgForm = true; render(); window.scrollTo(0, 0); };
  ACT.errgexpl = () => {
    const c = cfg();
    sheet({ title: "Mon exploitation", submitLabel: "Enregistrer", fields: [{ name: "nom", label: "Nom", required: !0, value: c.nom }, { name: "napi", label: "Numéro d’apiculteur (NAPI)", value: c.napi }, { name: "siret", label: "SIRET", value: c.siret }, { name: "adresse", label: "Adresse", value: c.adresse }, { name: "telephone", label: "Téléphone", value: c.telephone }, { name: "email_pro", label: "E-mail", type: "email", value: c.email_pro }, { name: "origine", label: "Origine du miel", value: c.origine || "France" }],
      submit: (v) => saveCfg(v, "Exploitation enregistrée"), del: null });
  };
  ACT.errgfact = () => {
    const c = cfg();
    sheet({ title: "Factures", fields: [{ name: "mention_tva", label: "Mention de TVA", value: c.mention_tva }, { name: "delai_paiement", label: "Délai de paiement", value: c.delai_paiement || "réception" }], submit: (v) => saveCfg(v, "Réglages enregistrés") });
  };
  ACT.errgmeteo = () => {
    const s = MT.SEUILS, champ = (name, label, value, step = 1) => ({ name, label, type: "number", step, min: 0, required: !0, value });
    sheet({ title: "Seuils météo", fields: [champ("ouvrir", "Ouvrir à partir de (°C)", s.ouvrir), champ("rapide", "Visite rapide à partir de (°C)", s.rapide), champ("vent", "Vent maximum (km/h)", s.vent), champ("pluie", "Risque de pluie maximum (%)", s.pluie), champ("debut", "Première heure", s.debut), champ("fin", "Dernière heure", s.fin)],
      submit: (v) => saveCfg({ meteo: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Number(x)])) }, "Seuils enregistrés") });
  };
  ACT.errgcouleur = () => {
    sheet({ title: "Apparence", fields: [{ name: "bandeau", label: "Couleur du bandeau", type: "select", options: Object.entries(BANDEAUX).map(([k, [t]]) => [k, t]), value: bandeau() }], submit: async (v) => { memo("apidoo-bandeau", v.bandeau); appliquerBandeau(); render(); } });
  };

  // ---------- Après chaque écran ----------
  const shellAvant = window.shell;
  window.shell = function (...a) {
    shellAvant(...a);
    Object.assign(MT.SEUILS, cfg().meteo || {});
    cloche();
    appliquerBandeau();
    prevenir().catch(() => {});
  };

  // ---------- Routage ----------
  const renderAvant = window.render;
  window.render = function () {
    if (S.route !== "reglages") S.rgForm = false;
    const v = VUES[S.route];
    if (!v || !S.session || !S.d || S.member === false || S.recovery) return renderAvant();
    v();
    if (S.lastRoute !== S.route) window.scrollTo?.(0, 0);
    S.lastRoute = S.route;
    document.body.dataset.route = S.route;
  };

  return { VUES, memo, retour, phrase, jourLong };
})();
