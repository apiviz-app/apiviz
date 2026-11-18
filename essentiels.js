// Apiviz — fonctionnalités essentielles : météo par heure, rappels, réglages en blocs, registre complet,
// fiche de lot, factures et conseils du mois. Chargé après ergonomie.js. Styles : fin de index.html.
const ES = (() => {
  const U = UX;
  const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const VUES = {};
  Object.assign(GROUP, { meteo: "ruches", rappels: "dash", lot: "miel", facture: "clients", saison: "dash" });
  const jourLong = (t) => new Date(t + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long" });
  const retour = (act, v, texte) => document.querySelector(".wrap")?.insertAdjacentHTML("afterbegin", `<button type="button" class="link u-retour" data-act="${act}" data-v="${esc(v)}">${esc(texte)}</button>`);
  const phrase = (texte) => { const h = document.querySelector(".wrap .head h1"); if (h) { h.textContent = texte; h.closest(".head").classList.add("g-tete"); } };

  // ---------- 1. Météo du rucher (v5.45, piste A du 15 nov. 2026) ----------
  // Un seul écran : maintenant, les 5 jours (mini-frise de la plage de visite), le verdict du jour choisi, ses heures en
  // lignes (la valeur qui empêche d'ouvrir est signalée), un bouton principal en bas. Toucher un jour ou une heure ne
  // met à jour que la zone du jour et le bouton : la page ne bouge pas (avant : tout l'écran était redessiné).
  ACT.ermeteo = (k) => { S.meteoRucher = k; S.meteoJour = null; S.meteoHeure = null; go("meteo"); };
  const TON = { 2: "bon", 1: "rapide", 0: "non" };
  const PUCE = { 2: "Ouvrir", 1: "Rapide", 0: "Attendre" };
  const donnees = () => {
    const k = S.meteoRucher, rs = U.ruchers().find(([x]) => x === k)?.[1] || [];
    return { k, rs, nom: U.nomRucher(k), m: MT.parHeure(k, rs) };
  };
  const quandDit = (t, auj) => {
    const demain = new Date(auj + "T12:00:00"); demain.setDate(demain.getDate() + 1);
    return t === auj ? "aujourd’hui" : t === demain.toISOString().slice(0, 10) ? "demain" : jourLong(t);
  };
  const nomPastille = (t, auj) => (t === auj ? "Auj." : MT.nomJour(t).replace(/^./, (x) => x.toUpperCase()));

  // Une pastille de jour : nom, ciel, maximum, une case par heure de la plage de visite, nombre d'heures bonnes.
  function pastille(x, m) {
    const hs = x.heures.filter((h) => h.n != null), b = x.bonnes, r = x.rapides;
    const lib = b ? `${b} h` : r ? "rapide" : "non";
    const dit = b ? `${b} h pour ouvrir` : r ? `${r} h de visite rapide` : "pas de créneau";
    return `<button type="button" class="mj-jour ${b ? "bon" : r ? "rapide" : "non"}${x.t === S.meteoJour ? " on" : ""}" data-act="ermjour" data-v="${x.t}" aria-pressed="${x.t === S.meteoJour}" aria-label="${esc(`${quandDit(x.t, m.auj)}, ${x.max}°, ${dit}`)}">
      <span class="mj-jour-nom">${esc(nomPastille(x.t, m.auj))}</span>${MT.icone(x.code)}<b>${x.max}°</b>
      <span class="mj-mini" aria-hidden="true" style="--n:${hs.length || 1}">${hs.map((h) => `<i class="n${h.n}${h.passee && !h.maintenant ? " passee" : ""}"></i>`).join("")}</span>
      <small>${lib}</small></button>`;
  }

  // Une heure : ciel, température, risque de pluie, vent ; la valeur qui empêche d'ouvrir est en couleur (« un peu
  // frais » seulement quand c'est lui qui limite à une visite rapide, pas sous la pluie).
  function ligneHeure(x, choisie) {
    const s = MT.SEUILS, c = Regles.meteo.causes(s, x.temp, x.risque, x.vent, x.pluie);
    const passee = x.passee && !x.maintenant, hors = x.n == null, ouvrable = !hors && !passee && x.n > 0;
    const puce = passee ? "Passée" : hors ? "Hors visite" : PUCE[x.n];
    const cl = hors ? "hors" : passee ? "passee" : TON[x.n];
    const signale = !hors && !passee;
    const rafales = signale && c.vent && x.rafales != null ? `<small>raf. ${x.rafales}</small>` : "";
    const lib = `${x.h} h${x.maintenant ? " (maintenant)" : ""}, ${x.temp}°, pluie ${x.risque} %, vent ${x.vent} km/h${x.rafales != null ? `, rafales ${x.rafales} km/h` : ""}${x.hum != null ? `, humidité ${x.hum} %` : ""} : ${puce.toLowerCase()}${signale && x.raison ? `, ${x.raison.toLowerCase()}` : ""}`;
    const contenu = `<span class="mj-h">${x.h} h${x.maintenant ? "<em>maint.</em>" : ""}</span>${MT.icone(x.code)}
      <span class="mj-t${signale && (c.temp === 2 || (c.temp === 1 && x.n === 1)) ? ` c${c.temp}` : ""}">${x.temp}°</span>
      <span class="mj-p${signale && c.pluie ? " fort" : ""}">${x.risque} %</span>
      <span class="mj-v${signale && c.vent ? " fort" : ""}">${x.vent} km/h${rafales}</span>
      <span class="mj-puce ${cl}">${puce}</span>`;
    return ouvrable
      ? `<button type="button" class="mj-ligne ${cl}${x.maintenant ? " now" : ""}${choisie ? " on" : ""}" data-act="ermheure" data-v="${x.h}" aria-pressed="${choisie}" aria-label="${esc(lib)}">${contenu}</button>`
      : `<div class="mj-ligne ${cl}${x.maintenant ? " now" : ""}" role="listitem" aria-label="${esc(lib)}">${contenu}</div>`;
  }

  // Zone du jour choisi : verdict, heures, bouton « Voir de 8 h à 20 h ». Seule partie redessinée au toucher.
  function zoneJour(m) {
    const s = MT.SEUILS, j = m.jours.find((x) => x.t === S.meteoJour) || m.jours[0];
    const r = Regles.meteo.resumeJour(s, m.jours, j.t, m.auj);
    const ouvrables = j.heures.filter((x) => x.n > 0 && !(x.passee && !x.maintenant));
    if (!ouvrables.some((x) => x.h === S.meteoHeure)) S.meteoHeure = r.heure;
    const hs = S.meteoTout ? j.heures : j.heures.filter((x) => x.n != null);
    const sous = r.sous + (r.autre && r.ton < 2 ? ` Meilleur jour : ${quandDit(r.autre.t, m.auj)}.` : "");
    return `<section class="mj-verdict ${TON[r.ton]}" aria-live="polite">
        <span class="mj-quand">${esc(quandDit(j.t, m.auj))}</span><strong>${esc(r.titre)}</strong><span>${esc(sous)}</span></section>
      <section class="mj-heures" aria-label="Heures de ${esc(quandDit(j.t, m.auj))}">
        <div class="mj-entete" aria-hidden="true"><span>Heure</span><span></span><span>Temp.</span><span>Pluie</span><span>Vent</span><span>Ouvrir ?</span></div>
        <div role="list">${hs.map((x) => ligneHeure(x, x.h === S.meteoHeure)).join("")}</div>
      </section>
      <div class="mj-pied"><span>Recherche entre ${s.debut} h et ${s.fin} h</span>
        <button type="button" class="link" data-act="ermtout">${S.meteoTout ? `Seulement ${s.debut} h – ${s.fin} h` : "Voir de 8 h à 20 h"}</button></div>`;
  }

  // Bouton principal, toujours présent : prévoir à l'heure choisie, sinon aller au meilleur jour.
  function boutonJour(m) {
    const j = m.jours.find((x) => x.t === S.meteoJour) || m.jours[0];
    const r = Regles.meteo.resumeJour(MT.SEUILS, m.jours, j.t, m.auj);
    const h = j.heures.find((x) => x.h === S.meteoHeure);
    if (h) return `<button type="button" class="btn main" data-act="ervisite" data-v="${j.t}|${h.h}">Prévoir une visite${h.n === 1 ? " rapide" : ""} ${esc(quandDit(j.t, m.auj))} à ${h.h} h</button>`;
    const autre = r.autre || m.jours.find((x) => x.t !== j.t && x.rapides > 0);
    if (autre) return `<button type="button" class="btn" data-act="ermjour" data-v="${autre.t}">Voir ${esc(quandDit(autre.t, m.auj))} : ${autre.bonnes ? `${autre.bonnes} h pour ouvrir` : "visite rapide possible"}</button>`;
    return `<button type="button" class="btn" disabled>Aucun créneau ces ${m.jours.length} jours</button>`;
  }

  // Met à jour les pastilles, la zone du jour et le bouton, sans redessiner l'écran.
  function majJour() {
    const { m } = donnees(), z = document.getElementById("mjJour"), b = document.getElementById("mjBouton");
    if (!m?.jours || !z || !b) return render();
    document.querySelectorAll(".mj-jour").forEach((x) => { const on = x.dataset.v === S.meteoJour; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
    z.innerHTML = zoneJour(m);
    b.innerHTML = boutonJour(m);
  }
  ACT.ermjour = (t) => { S.meteoJour = t; S.meteoHeure = null; majJour(); };
  ACT.ermheure = (h) => { S.meteoHeure = Number(h); majJour(); };
  ACT.ermtout = () => { S.meteoTout = !S.meteoTout; majJour(); };

  VUES.meteo = function () {
    const { k, nom, m } = donnees();
    const fin = () => retour("alrucher", k, nom);
    if (!m || m.sansLieu) {
      shell("Météo", `Rucher ${nom}`, "", m ? '<p class="small">Place ce rucher sur la carte pour voir sa météo.</p><button type="button" class="btn" data-act="go" data-v="carte">Ouvrir la carte</button>'
        : '<div class="mt-attente" aria-busy="true"><i></i><i></i><i></i><p class="small">Météo en cours de chargement…</p></div>');
      return fin();
    }
    if (!m.jours.some((j) => j.t === S.meteoJour)) S.meteoJour = m.creneau?.jour || m.auj;
    const now = m.maintenant, nNow = now?.n;
    const tonNow = nNow == null ? (m.verdict.startsWith("Bon") ? "bon" : m.verdict.startsWith("Visite") ? "rapide" : "non") : TON[nNow];
    const pourquoi = now?.raison || (nNow === 2 ? "Chaud, sec et calme" : "");
    const maintenant = `<section class="mj-now ${tonNow}" aria-label="Maintenant au rucher">${MT.icone(m.code)}<b>${m.temp}°</b>
      <span><small>Maintenant</small><strong>${esc(m.verdict)}</strong><span>${pourquoi ? `${esc(pourquoi)} · ` : ""}vent ${m.vent} km/h${now ? ` · pluie ${now.risque} %` : ""}</span></span></section>`;
    const jours = `<div class="mj-jours" role="group" aria-label="Choisir un jour" style="--n:${m.jours.length}">${m.jours.map((x) => pastille(x, m)).join("")}</div>`;
    const s = MT.SEUILS;
    shell("Météo", "", "",
      `<div class="mj">${maintenant}${jours}<div id="mjJour" class="mj-zone">${zoneJour(m)}</div>
      <p class="small mj-seuils">On peut ouvrir à partir de ${s.ouvrir} °C (visite rapide dès ${s.rapide} °C), sans pluie, avec moins de ${s.vent} km/h de vent et moins de ${s.pluie} % de risque de pluie. <button type="button" class="link" data-act="errgmeteo">Régler ces seuils</button></p>
      <div id="mjBouton" class="mj-barre">${boutonJour(m)}</div></div>`);
    fin();
  };
  ACT.ervisite = (v) => {
    const [t, h] = String(v).includes("|") ? String(v).split("|") : [S.meteoJour, v];
    S.erPrefill = { titre: `Visite du rucher ${U.nomRucher(S.meteoRucher)} à ${h} h`, echeance: t };
    tacheForm(null, "");
  };
  // Prévision arrivée : premier affichage seulement ; une mise à jour pendant la lecture ne redessine que le jour.
  const pret = AL.meteoPrete;
  AL.meteoPrete = function () { pret?.(); if (S.route === "meteo") (document.getElementById("mjJour") ? majJour() : render()); };

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
    const notif = dispo ? bascule("Notifications sur cet appareil", perm === "denied" ? "Bloquées dans les réglages du navigateur" : "Quand Apiviz est ouverte", perm === "granted" && memo("apidoo-notif") !== "0", "ernotif", "") : '<p class="small">Cet appareil ne propose pas les notifications. Sur iPhone, ajoute d’abord Apiviz à l’écran d’accueil.</p>';
    shell("Rappels", "Ce qui demande ton attention", "", `<div class="er-deux">
      <section class="card u-liste er-liste-r"><div class="u-entete"><h2>À voir</h2>${nb ? '<button type="button" class="link" data-act="ertoutvu">Tout marquer comme vu</button>' : ""}</div>${lignes || '<p class="small">Rien à signaler pour le moment.</p>'}</section>
      <div class="er-pile"><section class="card"><h2>Comment te prévenir</h2>${notif}<div class="er-rang"><span class="u-todo-t"><b>Agenda de ton téléphone</b><span class="small">Tâches et échéances</span></span>${RP.bouton() || '<span class="small">Aucune tâche datée</span>'}</div></section>
      <section class="card"><h2>De quoi te prévenir</h2>${CATS.map(([k, t]) => bascule(t, "", p[k], "ercat", k)).join("")}</section></div></div>`);
    phrase(nb === 0 ? "Rien de nouveau pour l’instant." : nb === 1 ? "Un rappel à voir." : `${nb} rappels à voir.`);
  };
  // Feuille « Rappels » (v5.44) : ce qui demande ton attention, sans quitter l'écran ; les réglages restent dans l'écran
  // Rappels (Réglages › Rappels et notifications).
  let enFeuille = [];
  ACT.errappels = () => {
    const l = rappels(), v = vus(), nb = l.filter((r) => !v.has(r.cle)).length;
    enFeuille = l;
    $sheetForm.onsubmit = (e) => e.preventDefault();
    $sheetForm.innerHTML = `<div class="g-ftete"><h2>Rappels${nb ? ` · ${nb}` : ""}</h2><button type="button" class="g-fermer" data-act="closesheet" aria-label="Fermer"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
      <div class="er-fliste">${l.map((r, i) => `<button type="button" class="u-todo ${v.has(r.cle) ? "er-vu" : ""}" data-act="errouvrir" data-v="${i}"><span class="u-todo-t"><b>${esc(r.titre)}</b><span class="small">${esc(r.sous)}</span></span><span class="u-chip ${CL[r.cl]}">${esc(r.tag)}</span></button>`).join("") || '<p class="small">Rien à signaler pour le moment.</p>'}</div>
      <div class="u-deux">${nb ? '<button type="button" class="btn" data-act="ertoutvufeuille">Tout marquer comme vu</button>' : ""}<button type="button" class="btn" data-act="errgrappels">Réglages des rappels</button></div>`;
    if (!$sheet.open) $sheet.showModal();
  };
  ACT.errouvrir = (i) => { const r = enFeuille[Number(i)]; $sheet.close(); if (r && ACT[r.act]) ACT[r.act](r.v); };
  ACT.ertoutvufeuille = () => { ACT.ertoutvu(); ACT.errappels(); };
  ACT.errgrappels = () => { $sheet.close(); go("rappels"); };
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
    // v5.44 (rationalisation) : la cloche ouvre la feuille « Rappels » ; l'écran Rappels garde les réglages.
    const b = `<button type="button" class="er-cloche" data-act="errappels" aria-label="Rappels${nb ? `, ${nb} à voir` : ""}">${CLOCHE}${nb ? `<em>${nb}</em>` : ""}</button>`;
    document.querySelector('.side [data-v="saisir"]')?.insertAdjacentHTML("beforebegin", b);
    document.querySelector(".topbar .avatar")?.insertAdjacentHTML("beforebegin", b);
  }

  // ---------- 3. Réglages en blocs ----------
  const BANDEAUX = {
    miel: ["Miel doux", {}],
    sauge: ["Sauge", { "--bandeau": "#DFEDE4" }],
    vert: ["Vert Apiviz", { "--bandeau": "#2F6B4F", "--bandeau-texte": "#fff", "--bandeau-lien": "#fff", "--bandeau-actif": "#FBEFC9", "--bandeau-actif-texte": "#1B2420", "--bandeau-survol": "rgba(255,255,255,.16)" }],
    sapin: ["Sapin", { "--bandeau": "#1E2B24", "--bandeau-texte": "#fff", "--bandeau-lien": "#C5D0C8", "--bandeau-actif": "#2C3D33", "--bandeau-survol": "rgba(255,255,255,.12)" }],
  };
  const bandeau = () => (BANDEAUX[memo("apidoo-bandeau")] ? memo("apidoo-bandeau") : "miel");
  function appliquerBandeau() {
    const r = document.documentElement, v = BANDEAUX[bandeau()][1];
    ["--bandeau", "--bandeau-texte", "--bandeau-lien", "--bandeau-actif", "--bandeau-actif-texte", "--bandeau-survol"].forEach((k) => (v[k] ? r.style.setProperty(k, v[k]) : r.style.removeProperty(k)));
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", v["--bandeau"] || "#FBEFC9");
    const sombre = bandeau() === "vert" || bandeau() === "sapin";
    document.querySelectorAll(".topbar > img").forEach((i) => { i.src = sombre ? "logo-apiviz-clair.svg" : "logo-apiviz.svg"; });
  }
  appliquerBandeau();
  // Écran « reglages » : enregistré dans le noyau (src/domaines/compte/ecrans.js, ES.ecranReglages).
  function ecranReglages() {
    if (S.rgForm) {
      viewReglages();
      document.querySelector(".wrap .u-retour, .wrap .er-ariane")?.remove();
      retour("errgblocs", "", "Réglages");
      return;
    }
    // v5.38 (maquettes du 13 nov. 2026, validées le 14) : cinq groupes en lignes, plus de « Listes » ni de bloc
    // « Toi » / « Associés » (le nom suit le compte : Mon profil ; les associés sont les membres).
    const c = cfg(), s = MT.SEUILS, manque = [!c.napi && "NAPI", !c.siret && "SIRET", !c.adresse && "adresse"].filter(Boolean);
    const num = `F-${new Date().getFullYear()}-${String(S.d.ventes.filter((v) => v.facture_num).length + 1).padStart(4, "0")}`;
    const ic = (d) => `<span class="rg-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg></span>`;
    const fl = '<svg class="rg-fl" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
    const ligne = (act, v, icone, titre, sous, droite) => `<button type="button" class="rg-l" data-act="${act}" data-v="${esc(v)}">${icone}<span class="rg-t"><b>${esc(titre)}</b><span>${esc(sous)}</span></span>${droite || fl}</button>`;
    const P = typeof PF != "undefined" ? PF.moi() : null, nomMoi = P?.prenom ? [P.prenom, P.nom].filter(Boolean).join(" ") : (typeof PF != "undefined" && PF.prenom()) || "Ton prénom";
    const membres = typeof PF != "undefined" ? PF.nbPersonnes() : 0;
    const av = `<span class="rg-av" aria-hidden="true">${esc(((typeof PF != "undefined" && PF.prenom()) || S.session?.user?.email || "?")[0].toUpperCase())}</span>`;
    const nbR = nouveaux().length;
    shell("Réglages", "Ton compte, ton exploitation, tes préférences", "", `<div class="rg-groupes">
      <h2 class="rg-g">Toi</h2><div class="rg-bloc">${ligne("go", "profil", av, nomMoi, "Mon profil · nom, e-mail, tes réponses")}</div>
      <h2 class="rg-g">L’exploitation</h2><div class="rg-bloc">
        ${ligne("errgexpl", "", ic("M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"), "Mon exploitation", `${c.nom}${manque.length ? "" : " · NAPI, SIRET, adresse"}`, manque.length ? `<span class="rg-manque">${esc(manque.join(", "))} à remplir</span>` : "")}
        ${ligne("go", "membres", ic("M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M17 12a2.5 2.5 0 1 0 0-5M17 14.5c2.3.2 3.9 1.9 4.5 4.5"), "Membres et associés", "Qui saisit, qui achète, qui vend", membres ? `<span class="rg-v">${membres}</span>` : "")}
        ${(() => { const O = window.Noyau?.offre, o = O?.connue(); if (O && !o) O.charger().then(() => { if (S.route === "reglages" && O.connue()) render(); });
          return ligne("go", "offre", ic("M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"), "Offre et gouttes d’API", o ? `${O.nom(o.offre)} · essai, recharges, réponse rapide` : "Ton offre, tes gouttes d’API", o ? `<span class="rg-v">${esc(O.gouttes(o.gouttes.total))}</span>` : ""); })()}
        ${ligne("errgfact", "", ic("M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"), "Factures", `Prochaine : ${num}${c.mention_tva ? "" : " · mention de TVA à remplir"}`)}
      </div>
      <h2 class="rg-g">Sur le terrain</h2><div class="rg-bloc">
        ${ligne("errgmeteo", "", ic("M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"), "Météo de visite", `Ouvrir dès ${s.ouvrir} °C, vent < ${s.vent} km/h`)}
        ${ligne("go", "rappels", ic("M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 21h4"), "Rappels", "Notifications et sujets suivis", `<span class="rg-v">${nbR ? U.pluriel(nbR, "rappel") : "À jour"}</span>`)}
        ${ligne("errgcontenants", "", ic("M4 5h16v15H4zM4 10h16M4 15h16"), "Caisses numérotées", "Suivre quelle colonie est dans quelle caisse", `<span class="rg-v">${c.contenants ? "Oui" : "Non"}</span>`)}
      </div>
      <h2 class="rg-g">Affichage</h2><div class="rg-bloc">
        ${ligne("errgcouleur", "", `<span class="rg-ic" aria-hidden="true"><i class="rg-pt" style="background:${esc(BANDEAUX[bandeau()][1]["--bandeau"] || "#FBEFC9")}"></i></span>`, "Couleur du bandeau", "Sur cet appareil", `<span class="rg-v">${esc(BANDEAUX[bandeau()][0])}</span>`)}
      </div>
      <h2 class="rg-g">Tes données</h2><div class="rg-bloc rg-donnees">
        <div class="rg-deux"><button type="button" class="btn" data-act="rgcomptable">Fichier comptable</button><button type="button" class="btn" data-act="exp" data-v="json">Sauvegarde</button></div>
        <p class="small">Le fichier comptable regroupe les ventes et les achats de ${esc(S.annee || new Date().getFullYear())}, prêt à envoyer. La sauvegarde garde tout.</p>
        <details class="rg-autres"><summary>Autres fichiers</summary><div class="chips"><button type="button" data-act="exp" data-v="visites">Visites</button><button type="button" data-act="exp" data-v="ventes">Ventes</button><button type="button" data-act="exp" data-v="depenses">Dépenses</button><button type="button" data-act="exp" data-v="clients">Clients</button></div></details>
      </div>
      <div class="rg-fin"><button type="button" class="link" data-act="logout">Se déconnecter</button></div>
    </div>`);
    document.querySelector(".wrap")?.classList.add("rg-ecran");
  }
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
  // Ruches physiques (IT-06, AP-TECH-113) : désactivé par défaut ; activé, Matériel et la fiche de la ruche les montrent.
  ACT.errgcontenants = () => {
    const c = cfg();
    sheet({ title: "Ruches physiques", intro: "Pour les exploitations qui numérotent leurs caisses : suivre quelle colonie est dans quelle caisse, et les transferts.",
      fields: [{ name: "contenants", label: "Suivre mes ruches physiques", type: "select", options: [["1", "Oui"], ["", "Non"]], value: c.contenants ? "1" : "" }],
      submit: (v) => saveCfg({ contenants: !!v.contenants }, v.contenants ? "Ruches physiques suivies : section dans Matériel" : "Ruches physiques masquées") });
  };
  ACT.errgcouleur = () => {
    sheet({ title: "Apparence", fields: [{ name: "bandeau", label: "Couleur du bandeau", type: "select", options: Object.entries(BANDEAUX).map(([k, [t]]) => [k, t]), value: bandeau() }], submit: async (v) => { memo("apidoo-bandeau", v.bandeau); appliquerBandeau(); render(); } });
  };

  // ---------- 4. Registre complet et déplacements ----------
  const ONGLETS = [["traitements", "Traitements"], ["mouvements", "Mouvements"], ["interventions", "Interventions"], ["exploitation", "Exploitation"]];
  const MVT = { installation: "Entrée", division: "Division", essaimage: "Essaimage", reunion: "Réunion", sortie: "Sortie", reactivation: "Remise en service", deplacement: "Déplacement" };
  // Mouvements : lus avec les déplacements (table deplacements, IT-06, src/domaines/colonies/regles.js) ; mêmes lignes
  // qu'avant 016. Les autres parties du registre (interventions) lisent les événements directement.
  const evenements = (types, an) => (types.includes("deplacement") && Regles.colonies
    ? Regles.colonies.lignesMouvements(S.d, types, an)
    : (S.d.evenements || []).filter((e) => types.includes(e.type) && yr(e.date_evenement) === an));
  const nomRuche = (id) => byId(S.d.ruches, id)?.nom || S.d.toutes?.find?.((r) => r.id === id)?.nom || "Ruche retirée";
  VUES.registre = function () {
    const tab = S.rgTab || "traitements", an = S.annee, c = cfg();
    RG.vue();
    const haut = document.querySelector(".wrap > .head");
    if (!haut) return;
    const sans = S.d.visites.filter((v) => v.traitement && yr(v.date_visite) === an && !v.ordonnance).length;
    const manque = !c.napi ? "Il manque ton NAPI." : sans ? `${U.pluriel(sans, "traitement")} sans ordonnance notée.` : "";
    haut.insertAdjacentHTML("afterend", `${manque ? `<p class="notice">${esc(manque)}</p>` : ""}<div class="er-onglets" role="group" aria-label="Parties du registre">${ONGLETS.map(([k, t]) => `<button type="button" class="${k === tab ? "on" : ""}" aria-pressed="${k === tab}" data-act="errgtab" data-v="${k}">${t}</button>`).join("")}</div>`);
    if (tab === "traitements") return;
    const garde = [...document.querySelectorAll(".wrap > *")], i = garde.findIndex((x) => x.classList.contains("er-onglets"));
    garde.slice(i + 1).forEach((x) => x.remove());
    const wrap = document.querySelector(".wrap");
    if (tab === "mouvements") {
      const l = evenements(Object.keys(MVT), an);
      const lignes = l.map((e) => `<tr><td>${dfr(e.date_evenement)}</td><td>${esc(nomRuche(e.ruche_id))}</td><td>${esc(MVT[e.type])}</td><td>${esc(e.detail) || "–"}</td></tr>`);
      wrap.insertAdjacentHTML("beforeend", `<div class="actions er-act"><button type="button" class="btn main" data-act="erdeplacer">Déplacer des ruches</button><button type="button" class="btn" data-act="exp" data-v="mouvements">Fichier Excel</button></div>
        ${l.length ? `<section class="card tbl er-tb">${table(["Date", "Ruche", "Mouvement", "Détail"], lignes, "")}</section>` : `<p class="small">Aucun mouvement noté en ${an}.</p>`}
        <p class="small">Un transport hors du département se déclare à la direction départementale de destination. Vérifie la démarche auprès de ton GDS.</p>`);
    } else if (tab === "interventions") {
      const l = evenements(["intervention"], an);
      const lignes = l.map((e) => `<tr><td>${dfr(e.date_evenement)}</td><td>${esc(nomRuche(e.ruche_id))}</td><td>${esc(e.detail) || "–"}</td></tr>`);
      wrap.insertAdjacentHTML("beforeend", `<div class="actions er-act"><button type="button" class="btn main" data-act="erintervention">Noter une intervention</button></div>
        ${l.length ? `<section class="card tbl er-tb">${table(["Date", "Ruche", "Intervention"], lignes, "")}</section>` : `<p class="small">Aucune intervention notée en ${an}.</p>`}`);
    } else {
      wrap.insertAdjacentHTML("beforeend", `<section class="card er-fiche-c"><dl class="er-dl"><dt>Nom</dt><dd>${esc(c.nom)}</dd><dt>NAPI</dt><dd>${esc(c.napi) || "–"}</dd><dt>SIRET</dt><dd>${esc(c.siret) || "–"}</dd><dt>Adresse</dt><dd>${esc(c.adresse) || "–"}</dd><dt>Ruchers</dt><dd>${esc(U.ruchers().map(([k, rs]) => `${U.nomRucher(k)} (${rs.length})`).join(", ")) || "–"}</dd></dl><button type="button" class="btn" data-act="errgexpl">Modifier</button></section>
        <p class="small">Le registre se garde au moins 5 ans. Apiviz ne supprime rien automatiquement : pense aux exports.</p>`);
    }
  };
  ACT.errgtab = (k) => { S.rgTab = k; render(); };
  EXP.mouvements = () => csv(`mouvements-${S.annee}`, ["Date", "Ruche", "Mouvement", "Détail"], evenements(Object.keys(MVT), S.annee).map((e) => [e.date_evenement, nomRuche(e.ruche_id), MVT[e.type], e.detail]));
  // « Déplacer des ruches » ouvre l'écran Déplacer (IT-06, src/domaines/ruchers/deplacer.js). La fenêtre de la v5.10
  // ci-dessous reste disponible pour le retour arrière : localStorage « apidoo-deplacement-v510 » = « 1 ».
  const deplacementV510 = () => { try { return localStorage.getItem("apidoo-deplacement-v510") === "1"; } catch { return false; } };
  ACT.erdeplacer = () => (deplacementV510() || !window.Noyau?.ecran?.("deplacer") ? deplacerV510() : ACT.dpouvrir(""));
  const deplacerV510 = () => {
    const rs = U.ruchers(), choix = [...rs.map(([k, l]) => [`r:${k}`, `Tout ${U.nomRucher(k)} (${l.length})`]), ...S.d.ruches.map((r) => [r.id, r.nom])];
    sheet({ title: "Déplacer des ruches", label: "Déplacer", fields: [{ name: "quoi", label: "Ruches", type: "select", options: choix }, { name: "vers", label: "Vers le rucher", required: !0, list: rs.map(([k]) => k).filter(Boolean) }, { name: "date", label: "Date", type: "date", required: !0, value: today() }, { name: "note", label: "Note", value: "" }],
      submit: async (v) => {
        const ids = v.quoi.startsWith("r:") ? (rs.find(([k]) => `r:${k}` === v.quoi)?.[1] || []).map((r) => r.id) : [v.quoi];
        const dest = rs.find(([k]) => k === v.vers)?.[1] || [], lieu = MT.lieu(dest);
        const lignes = ids.map((id) => ({ ruche_id: id, type: "deplacement", date_evenement: v.date, detail: [`${U.nomRucher(byId(S.d.ruches, id)?.rucher)} vers ${U.nomRucher(v.vers)}`, v.note].filter(Boolean).join(", ") }));
        const { error } = await sb.from("ruche_evenements").insert(lignes);
        if (error) throw error;
        await write(sb.from("ruches").update({ rucher: v.vers, ...(lieu ? { lat: lieu.lat, lng: lieu.lng } : {}) }).in("id", ids), "Déplacement noté au registre");
      } });
  };
  ACT.erintervention = () => {
    sheet({ title: "Noter une intervention", fields: [{ name: "ruche_id", label: "Ruche", type: "select", options: S.d.ruches.map((r) => [r.id, r.nom]) }, { name: "date_evenement", label: "Date", type: "date", required: !0, value: today() }, { name: "detail", label: "Intervention (qui, quoi)", required: !0, value: "" }],
      submit: (v) => write(sb.from("ruche_evenements").insert({ ...v, type: "intervention" }), "Intervention notée") });
  };

  // ---------- 5. Traçabilité des lots ----------
  ACT.erlot = (id) => { S.lotId = id; go("lot"); };
  // Écran « miel » : complément de l'écran, appelé par src/domaines/ (IT-03).
  function completerMiel() {
    document.querySelectorAll('.wrap td button[data-act="editlot"]').forEach((b) => b.insertAdjacentHTML("afterend", ` <button type="button" class="link er-fiche" data-act="erlot" data-v="${b.dataset.v}" aria-label="Fiche du lot">Fiche</button>`));
  }
  VUES.lot = function () {
    const d = S.d, l = byId(d.lots, S.lotId), c = cfg();
    if (!l) { S.route = "miel"; return render(); }
    const recoltes = l.extraction ? d.recoltes.filter((x) => x.extraction === l.extraction) : [];
    const kg = sum(recoltes, (x) => x.kg), ruches = [...new Set(recoltes.map((x) => x.ruche_id).filter(Boolean))].map(nomRuche), debut = recoltes[0]?.date_recolte;
    const lignes = d.lignes.filter((x) => x.lot_id === l.id), parClient = new Map();
    lignes.forEach((x) => { const v = byId(d.ventes, x.vente_id), cl = byId(d.clients, v?.client_id); const k = cl?.id || "?"; const e = parClient.get(k) || { c: cl, q: 0, date: v?.date_vente }; e.q += x.quantite; if (v?.date_vente > e.date) e.date = v.date_vente; parClient.set(k, e); });
    const vendus = sum(lignes, (x) => x.quantite), ca = sum(lignes, (x) => x.quantite * x.prix_unitaire);
    const ids = new Set(recoltes.map((x) => x.ruche_id)), soins = d.visites.filter((v) => v.traitement && ids.has(v.ruche_id) && yr(v.date_visite) === yr(debut || today()));
    const etape = (t, g, s) => `<div class="er-etape"><span class="small">${t}</span><b>${esc(g)}</b><span class="small">${esc(s)}</span></div>`;
    const ctl = [["Dénomination, poids net, origine", l.miel && l.format_g && c.origine !== ""], ["DDM et numéro de lot", l.ddm && l.code], ["Adresse de l’exploitation", c.adresse]];
    const clients = [...parClient.values()], mails = clients.map((x) => x.c?.email).filter(Boolean);
    // v5.64 : un lot qui n'est pas du miel compte dans son unité (bouteilles, pièces…) et n'a ni récolte ni étiquette miel.
    const miel = Regles.produits.estMiel(l), qte = (x) => miel ? U.pluriel(x, "pot") : Regles.produits.quantiteLot(l, x);
    shell(`Lot ${l.code}`, Regles.produits.estMiel(l) ? `${l.miel}, ${n(l.format_g, 0)} g, ${c.origine || "France"}` : `${Regles.produits.libelleLot(l)}, ${Regles.produits.categorieDe(l).toLowerCase()}`, `<button type="button" class="btn" data-act="editlot" data-v="${l.id}">Modifier</button>${Regles.produits.estMiel(l) ? `<button type="button" class="btn main" data-act="etiq" data-v="${l.id}">Imprimer les étiquettes</button>` : ""}${mails.length ? `<a class="btn u-lienbtn" href="mailto:?bcc=${encodeURIComponent(mails.join(","))}&amp;subject=${encodeURIComponent((miel ? "Lot de miel " : "Lot ") + l.code)}">Prévenir les clients du lot</a>` : ""}`,
      `<section class="er-fil" aria-label="Du rucher au client">
        ${miel ? etape("Récolte", recoltes.length ? `${n(kg)} kg` : "Non reliée", recoltes.length ? dfr(debut) : "Lot sans extraction") +
          etape("Ruches d’origine", ruches.length ? ruches.join(", ") : "Toutes", soins.length ? U.pluriel(soins.length, "traitement") + " la même année" : "Aucun traitement noté") : ""}
        ${etape(miel ? "Mise en pots" : "Mise en stock", qte(l.pots_initiaux), [l.date_mise_en_pot && dfr(l.date_mise_en_pot), l.ddm && "DDM " + dfr(l.ddm)].filter(Boolean).join(", ") || "Dates à renseigner")}
        ${etape("Ventes", qte(vendus), `${U.pluriel(clients.length, "client")}, ${eur(ca)}`)}
      </section>
      <div class="er-deux2"><section class="card u-liste"><h2>Clients de ce lot</h2>${clients.map((x) => `<button type="button" class="u-todo" ${x.c ? `data-act="editclient" data-v="${x.c.id}"` : "disabled"}><span class="u-todo-t"><b>${esc(x.c?.nom || "?")}</b><span class="small">${esc(U.quand(x.date))}</span></span><b>${esc(qte(x.q))}</b></button>`).join("") || '<p class="small">Aucune vente pour ce lot.</p>'}</section>
      ${miel ? `<section class="card u-liste"><h2>Étiquette du lot</h2>${ctl.map(([t, ok]) => `<div class="er-rang"><span class="u-todo-t"><b>${t}</b></span><span class="u-chip ${ok ? "good" : "watch"}">${ok ? "Complet" : "À renseigner"}</span></div>`).join("")}</section>` : ""}</div>`);
    retour("go", "miel", "Produits");
    phrase(`Lot ${l.code} : ${qte(l.pots_restants ?? l.pots_initiaux - vendus)} en stock, ${vendus} vendu${vendus > 1 ? "s" : ""}.`);
  };

  // ---------- 6. Factures ----------
  const numero = (v) => `F-${v.facture_annee}-${String(v.facture_num).padStart(4, "0")}`;
  ACT.erfacture = async (id) => {
    const v = byId(S.d.ventes, id);
    if ($sheet.open) $sheet.close();
    if (!v.facture_num) {
      const { data, error } = await sb.rpc("numeroter_facture", { p_vente: id });
      if (error) return toast(navigator.onLine === false ? "La facture demande une connexion" : "Impossible de créer la facture pour l’instant", true);
      Object.assign(v, data);
    }
    S.factId = id; go("facture");
  };
  const venteOuverte = ACT.uvente;
  ACT.uvente = (id) => {
    venteOuverte(id);
    const v = byId(S.d.ventes, id);
    $sheetForm.querySelector(".u-deux")?.insertAdjacentHTML("afterend", `<button type="button" class="btn" data-act="erfacture" data-v="${id}">${v.facture_num ? `Voir la facture ${numero(v)}` : "Créer la facture"}</button>`);
  };
  VUES.facture = function () {
    const d = S.d, v = byId(d.ventes, S.factId), c = cfg();
    if (!v?.facture_num) { S.route = "clients"; return render(); }
    const cl = byId(d.clients, v.client_id), l = d.lignes.filter((x) => x.vente_id === v.id), a = (x, t) => (x ? esc(x) : `<span class="er-manque">[${t}]</span>`);
    const lignes = l.map((x) => { const lot = byId(d.lots, x.lot_id); return `<tr><td>${lot && !Regles.produits.estMiel(lot) ? esc(Regles.produits.libelleLot(lot)) : `Miel ${esc(lot?.miel?.toLowerCase() || "")}, ${n(lot?.format_g, 0)} g`}</td><td>${esc(lot?.code || "–")}</td><td class="m">${x.quantite}</td><td class="m">${esc(eur(x.prix_unitaire))}</td><td class="m">${esc(eur(x.quantite * x.prix_unitaire))}</td></tr>`; }).join("");
    const mail = cl?.email ? `<a class="btn u-lienbtn" href="mailto:${esc(cl.email)}?subject=${encodeURIComponent(`Facture ${numero(v)}`)}&amp;body=${encodeURIComponent(`Bonjour,\n\nVoici la facture ${numero(v)} de ${eur(venteTotal(v))}.\n\n${c.nom}`)}">Écrire au client</a>` : "";
    shell(`Facture ${numero(v)}`, `${cl?.nom || "Client"}, ${v.paye ? "payée" : "à encaisser"}`, `<button type="button" class="btn" data-act="uvente" data-v="${v.id}">Voir la vente</button>${mail}<button type="button" class="btn main" data-act="erimprimer">Imprimer ou PDF</button>`,
      `<article class="er-feuille" aria-label="Facture">
        <div class="er-f-t"><h2>${esc(c.nom)}</h2><div><h2>Facture ${numero(v)}</h2><p class="small">Émise le ${dfr(v.facture_date)}, vente du ${dfr(v.date_vente)}</p></div></div>
        <div class="er-f-t"><p>${a(c.adresse, "Adresse")}<br>SIRET : ${a(c.siret, "à renseigner")}${c.telephone ? `<br>${esc(c.telephone)}` : ""}</p><p class="er-d"><b>${esc(cl?.nom || "Client")}</b>${cl?.adresse ? `<br>${esc(cl.adresse)}` : ""}${cl?.code_postal || cl?.ville ? `<br>${esc([cl.code_postal, cl.ville].filter(Boolean).join(" "))}` : ""}${cl?.siret ? `<br>SIRET : ${esc(cl.siret)}` : ""}${cl?.email ? `<br>${esc(cl.email)}` : ""}</p></div>
        <table><thead><tr><th>Produit</th><th>Lot</th><th class="m">Quantité</th><th class="m">Prix</th><th class="m">Total</th></tr></thead><tbody>${lignes}</tbody></table>
        <p class="er-f-total"><span>Total</span><span>${esc(eur(venteTotal(v)))}</span></p>
        <p class="small">${v.paye ? `Payée${v.mode ? ", " + esc(v.mode) : ""}.` : `Règlement à ${esc(c.delai_paiement || "réception")}.`} ${a(c.mention_tva, "Mention de TVA selon ton statut")}</p>
      </article>`);
    retour("go", "clients", "Ventes");
  };
  ACT.erimprimer = () => { document.body.classList.add("print-facture"); window.print(); };
  addEventListener("afterprint", () => document.body.classList.remove("print-facture"));

  // ---------- 7. Ce mois-ci au rucher ----------
  // Repères généraux pour un rucher en France métropolitaine, à adapter au climat local. Rien sur les doses : vétérinaire ou GDS.
  const CONSEILS = [
    ["Laisser les colonies au calme", [["Soupeser les ruches sans ouvrir", "Repérer celles qui manquent de provisions"], ["Préparer cadres et hausses", "Nettoyer et réparer à l’atelier"], ["Commander pots et étiquettes", "Avant la saison"]]],
    ["Surveiller les provisions", [["Soupeser les ruches", "La consommation reprend avec le couvain"], ["Contrôler les entrées", "Abeilles mortes, trou de vol dégagé"], ["Préparer le matériel de printemps", "Cadres, cire, nourrisseurs"]]],
    ["Première visite si le temps s’y prête", [["Visite rapide par temps doux", "Reine, couvain, provisions"], ["Nettoyer les plateaux", "Retirer les débris"], ["Noter les colonies faibles", "À suivre ou à réunir"]]],
    ["La colonie se développe", [["Visiter toutes les ruches", "Couvain, place disponible"], ["Poser les premières hausses", "Selon la miellée locale"], ["Surveiller l’essaimage", "Chercher les cellules royales"]]],
    ["Essaimage et miellée", [["Visiter régulièrement", "Cellules royales et place dans les hausses"], ["Préparer les divisions", "Si tu veux augmenter le cheptel"], ["Ajouter des hausses", "Selon les rentrées"]]],
    ["Pleine saison", [["Suivre le remplissage des hausses", "Ne pas manquer de place"], ["Prévoir la récolte", "Miel operculé, humidité à contrôler"], ["Garder de l’eau à proximité", "Surtout par forte chaleur"]]],
    ["Récolte", [["Récolter les hausses operculées", "Noter le code d’extraction pour la traçabilité"], ["Mettre en pots", "Lot, DDM et étiquettes"], ["Compter le varroa", "Demande conseil à ton GDS ou ton vétérinaire"]]],
    ["Préparer l’hivernage", [["Faire le point varroa", "Traitement selon l’avis du GDS ou du vétérinaire"], ["Évaluer les provisions", "Nourrir si nécessaire"], ["Réduire les entrées", "Limiter le pillage"]]],
    ["Constituer les réserves", [["Peser les ruches", "Vérifier les réserves pour l’hiver"], ["Contrôler la reine et le couvain", "Réunir les colonies faibles"], ["Ouvrir la déclaration de ruches", "Du 1er septembre au 31 décembre"]]],
    ["Fin de saison", [["Dernières visites par temps doux", "Provisions et état de la colonie"], ["Protéger du vent et de l’humidité", "Toits et supports"], ["Ranger les hausses", "À l’abri de la fausse teigne"]]],
    ["Protéger, peser, déclarer", [["Soupeser chaque ruche", "Repérer les colonies légères"], ["Poser les grilles d’entrée", "Contre les souris"], ["Vérifier toits et supports", "Vent et humidité"], ["Déclarer les ruches", "Obligation, avant le 31 décembre"]]],
    ["Repos hivernal", [["Limiter les ouvertures", "Laisser les colonies en grappe"], ["Faire le bilan de l’année", "Exports, registre, comptes"], ["Finaliser la déclaration", "Avant le 31 décembre"]]],
  ];
  const NOMS_MOIS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
  const MOIS_LONGS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const moyennePoids = (an, m) => { const l = S.d.visites.filter((v) => v.poids_kg && new Date(v.date_visite).getFullYear() === an && new Date(v.date_visite).getMonth() === m); return l.length ? sum(l, (v) => v.poids_kg) / l.length : null; };
  VUES.saison = function () {
    const auj = new Date(), m = S.saisonMois ?? auj.getMonth(), [titre, items] = CONSEILS[m], an = auj.getFullYear(), d = S.d;
    const finMois = new Date(Date.UTC(m < auj.getMonth() ? an + 1 : an, m + 1, 0)).toISOString().slice(0, 10);
    const deja = (t) => d.taches.some((x) => x.titre === t && !x.faite);
    const ligne = ([t, s]) => `<div class="er-rang"><span class="u-todo-t"><b>${esc(t)}</b><span class="small">${esc(s)}</span></span>${deja(t) ? '<span class="u-chip good">Dans l’agenda</span>' : `<button type="button" class="link" data-act="ersaison" data-v="${esc(t)}" data-k="${finMois}">Ajouter</button>`}</div>`;
    const a = moyennePoids(an, m), b = moyennePoids(an - 1, m), derniere = d.visites[0];
    const comp = a != null && b != null ? `<p>Poids moyen : ${n(a)} kg, contre ${n(b)} kg l’an dernier.</p>` : "";
    shell("Ce mois-ci", "Repères généraux, à adapter à ton climat et à ta région", `<button type="button" class="btn" data-act="ersaisontout" data-k="${finMois}">Tout ajouter à l’agenda</button>`,
      `<div class="er-mois" role="group" aria-label="Choisir un mois">${NOMS_MOIS.map((x, i) => `<button type="button" class="${i === m ? "on" : ""}" aria-pressed="${i === m}" data-act="ermois" data-v="${i}">${x}</button>`).join("")}</div>
      <div class="er-deux"><section class="card"><h2>À prévoir</h2>${items.map(ligne).join("")}</section>
      <section class="card"><h2>Tes ruches</h2><p>${esc(U.pluriel(d.ruches.length, "ruche"))}, ${d.ruches.filter((r) => r.etat === "Bonne").length} en forme.</p>${derniere ? `<p class="small">Dernière visite : ${esc(U.quand(derniere.date_visite).toLowerCase())}</p>` : ""}${comp}</section></div>`);
    retour("go", "dash", "Accueil");
    phrase(`${MOIS_LONGS[m]} : ${titre.toLowerCase()}.`);
  };
  ACT.ermois = (i) => { S.saisonMois = Number(i); render(); };
  ACT.ersaison = (t, fin) => write(sb.from("taches").insert({ titre: t, echeance: fin }), "Ajouté à l’agenda");
  ACT.ersaisontout = async (_v, fin) => {
    const l = CONSEILS[S.saisonMois ?? new Date().getMonth()][1].map(([t]) => t).filter((t) => !S.d.taches.some((x) => x.titre === t && !x.faite));
    if (l.length) await write(sb.from("taches").insert(l.map((titre) => ({ titre, echeance: fin }))), "Ajouté à l’agenda");
  };

  // ---------- Après chaque écran (crochets du noyau, IT-03) ----------
  Noyau.crochets.sur("apresCoquille", "essentiels", () => {
    Object.assign(MT.SEUILS, cfg().meteo || {});
    cloche();
    if (S.route === "dash") document.querySelector(".u-liste .u-entete")?.insertAdjacentHTML("beforeend", '<button type="button" class="link" data-act="go" data-v="saison">Ce mois-ci</button>');
    appliquerBandeau();
    prevenir().catch(() => {});
  });
  Noyau.crochets.sur("avantRendu", "essentiels.reglages", () => { if (S.route !== "reglages") S.rgForm = false; });
  Noyau.crochets.sur("apresRendu", "essentiels.bandeau", () => { appliquerBandeau(); });
  // Les écrans de VUES (météo, rappels, registre, lot, facture, saison) sont enregistrés dans le noyau :
  // src/domaines/*/ecrans.js.

  // bandeaux, bandeau, appliquerBandeau : repris par l'aperçu du bandeau (src/domaines/compte/apparence.js, v5.28).
  return { VUES, memo, retour, phrase, jourLong, ecranReglages, completerMiel, bandeaux: BANDEAUX, bandeau, appliquerBandeau };
})();
