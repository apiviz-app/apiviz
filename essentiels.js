// Apiviz — fonctionnalités essentielles : météo par heure, rappels, réglages en blocs, registre complet,
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
  ACT.ermeteo = (k) => { S.meteoRucher = k; S.meteoJour = null; S.meteoHeure = null; go("meteo"); };
  ACT.ermjour = (t) => { S.meteoJour = t; S.meteoHeure = null; render(); };
  const ETAT = { 2: ["ok", "", "Oui"], 1: ["court", "w", "Rapide"], 0: ["", "non", "Non"] };
  const etatHtml = (n) => (n == null ? "–" : `<span class="eh-etat"><i class="ab-mini ${ETAT[n][1]}"></i>${ETAT[n][2]}</span>`);
  // Phrase du jour : la première plage d'heures bonnes à venir, sinon la première plage rapide.
  function phraseJour(j) {
    const nom = jourLong(j.t), bon = j.plages.find((p) => p.n === 2), vite = j.plages.find((p) => p.n === 1);
    if (bon) return `Tu peux ouvrir ${nom} entre ${bon.debut} h et ${bon.fin} h.`;
    if (vite) return `Visite rapide possible ${nom} entre ${vite.debut} h et ${vite.fin} h.`;
    return `Pas de créneau pour ouvrir ${nom}.`;
  }
  const TON = { 2: "bon", 1: "rapide", 0: "non" };
  const libelleNiveau = (n) => (n === 2 ? "On peut ouvrir" : n === 1 ? "Visite rapide" : "Mieux vaut attendre");

  // Détail d'une heure : ce que l'apiculteur lit en touchant une case de la frise.
  function detailHeure(x) {
    if (!x) return "";
    const n = x.n, ton = n == null ? "hors" : TON[n];
    const titre = n == null ? "Hors des heures de visite" : libelleNiveau(n);
    const pourquoi = n == null ? `On cherche un créneau entre ${MT.SEUILS.debut} h et ${MT.SEUILS.fin} h.` : x.raison || "Chaud, sec et calme : les butineuses sont dehors.";
    const val = (t, v) => `<span><small>${t}</small><b>${v}</b></span>`;
    return `<div class="mt-detail ${ton}" aria-live="polite">
      <div class="mt-detail-h">${MT.icone(x.code)}<b>${x.h} h</b><strong>${esc(titre)}</strong></div>
      <p>${esc(pourquoi)}</p>
      <div class="mt-detail-v">${val("Température", `${x.temp}°`)}${val("Pluie", `${x.risque} %${x.pluie > 0 ? ` · ${String(x.pluie).replace(".", ",")} mm` : ""}`)}${val("Vent", `${x.vent} km/h`)}${x.rafales != null ? val("Rafales", `${x.rafales} km/h`) : ""}${x.hum != null ? val("Humidité", `${x.hum} %`) : ""}</div>
      ${n > 0 && !(x.passee && !x.maintenant) ? `<button type="button" class="btn mt-prevoir" data-act="ervisite" data-v="${S.meteoJour}|${x.h}">Prévoir une visite à ${x.h} h</button>` : ""}
    </div>`;
  }

  // Frise de la journée, 8 h à 20 h : bande de couleur par heure, courbe de température, barres de pluie, vent.
  function frise(j) {
    const hs = j.heures, n = hs.length;
    if (!n) return "";
    const temps = hs.map((x) => x.temp), tmin = Math.min(...temps) - 2, tmax = Math.max(...temps) + 2;
    const y = (t) => 52 - ((t - tmin) / Math.max(1, tmax - tmin)) * 32; // 20 à 52 px : l'étiquette tient au-dessus
    const pts = hs.map((x, i) => `${(i + 0.5) * 10},${y(x.temp).toFixed(1)}`).join(" ");
    const sel = S.meteoHeure;
    const cases = hs.map((x, i) => {
      const ton = x.n == null ? "hors" : TON[x.n];
      const lib = `${x.h} h, ${x.temp}°, pluie ${x.risque} %, vent ${x.vent} km/h : ${x.n == null ? "hors des heures de visite" : libelleNiveau(x.n).toLowerCase()}${x.raison ? `, ${x.raison.toLowerCase()}` : ""}`;
      return `<button type="button" class="mt-h ${ton}${x.passee && !x.maintenant ? " passee" : ""}${x.maintenant ? " now" : ""}${x.h === sel ? " on" : ""}" style="--i:${i};--y:${y(x.temp).toFixed(1)}" data-act="ermheure" data-v="${x.h}" aria-pressed="${x.h === sel}" aria-label="${esc(lib)}">
        <span class="mt-t">${x.temp}°</span><span class="mt-bande"></span>
        <span class="mt-pluie" style="--p:${x.risque}"><i></i></span><span class="mt-vent${x.vent >= MT.SEUILS.vent ? " fort" : ""}">${x.vent}</span><span class="mt-heure">${x.h}<span class="mt-hu"> h</span></span></button>`;
    }).join("");
    return `<section class="mt-frise" aria-label="La journée heure par heure">
      <div class="mt-legende" aria-hidden="true"><span class="bon">Ouvrir</span><span class="rapide">Rapide</span><span class="non">Attendre</span><span class="hors">Hors visite</span></div>
      <div class="mt-grille" style="--n:${n}">
        <svg class="mt-courbe" viewBox="0 0 ${n * 10} 56" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}"/></svg>
        ${cases}
      </div>
      <div class="mt-axe" aria-hidden="true"><span><i class="mt-axe-pluie"></i>Risque de pluie</span><span>Vent en km/h</span><span>Heures</span></div>
    </section>`;
  }

  VUES.meteo = function () {
    const k = S.meteoRucher, rs = U.ruchers().find(([x]) => x === k)?.[1] || [], nom = U.nomRucher(k), m = MT.parHeure(k, rs);
    const fin = () => retour("alrucher", k, nom);
    if (!m || m.sansLieu) {
      shell("Météo", nom, "", m ? '<p class="small">Place ce rucher sur la carte pour voir sa météo.</p><button type="button" class="btn" data-act="go" data-v="carte">Ouvrir la carte</button>'
        : '<div class="mt-attente" aria-busy="true"><i></i><i></i><i></i><p class="small">Météo en cours de chargement…</p></div>');
      return fin();
    }
    if (!m.jours.some((j) => j.t === S.meteoJour)) S.meteoJour = m.creneau?.jour || m.auj;
    const j = m.jours.find((x) => x.t === S.meteoJour) || m.jours[0];
    const avenir = j.heures.filter((x) => !x.passee || x.maintenant);
    const meilleur = avenir.find((x) => x.n === 2) || avenir.find((x) => x.n === 1);
    if (!j.heures.some((x) => x.h === S.meteoHeure)) S.meteoHeure = (meilleur || avenir[0] || j.heures[0])?.h;
    const action = meilleur ? `<button type="button" class="btn main" data-act="ervisite" data-v="${j.t}|${meilleur.h}">Prévoir une visite ${esc(jourLong(j.t))} à ${meilleur.h} h</button>` : "";

    // 1. Maintenant : un verdict franc, et pourquoi.
    const now = m.maintenant, nNow = now?.n;
    const tonNow = nNow == null ? (m.verdict.startsWith("Bon") ? "bon" : m.verdict.startsWith("Visite") ? "rapide" : "non") : TON[nNow];
    const pourquoi = now?.raison || (nNow === 2 ? "Chaud, sec et calme." : "");
    // Prochaine plage, sur les 3 jours (comme le créneau de l'accueil) : d'abord une bonne, sinon une rapide.
    const trois = m.jours.slice(0, 3), cherche = (n) => trois.map((x) => ({ x, p: x.plages.find((q) => q.n === n) })).find((o) => o.p);
    const pro = cherche(2) || cherche(1);
    const prochaine = pro ? `Prochain créneau ${pro.p.n === 2 ? "favorable" : "pour une visite rapide"} : <b>${pro.x.t === m.auj ? "aujourd’hui" : esc(jourLong(pro.x.t))} de ${pro.p.debut} h à ${pro.p.fin} h</b>` : "Aucun créneau pour ouvrir ces 3 jours.";
    const hero = `<section class="mt-hero ${tonNow}">
      <div class="mt-hero-ciel">${MT.icone(m.code)}<b>${m.temp}°</b></div>
      <div class="mt-hero-txt"><small>Maintenant au rucher</small><strong>${esc(m.verdict)}</strong>
        <span>${pourquoi ? `${esc(pourquoi)} · ` : ""}Vent ${m.vent} km/h${now ? ` · pluie ${now.risque} %` : ""}</span></div>
      <p class="mt-hero-suite">${prochaine}</p></section>`;

    // 2. Les jours : combien d'heures favorables, en un coup d'œil.
    const jours = `<div class="mt-jours" role="group" aria-label="Choisir un jour">${m.jours.map((x, i) => {
      const tot = x.heures.filter((h) => h.n != null).length || 1, b = x.bonnes, r = x.rapides;
      const lib = b ? `${b} h pour ouvrir` : r ? `${r} h rapide${r > 1 ? "s" : ""}` : "Pas de créneau";
      return `<button type="button" class="mt-jour${x.t === j.t ? " on" : ""}${b ? " bon" : r ? " rapide" : ""}" style="--i:${i}" aria-pressed="${x.t === j.t}" data-act="ermjour" data-v="${x.t}">
        <span class="mt-jour-nom">${i === 0 && x.t === m.auj ? "Auj." : esc(jourCourt(x.t))}</span>${MT.icone(x.code)}<b>${x.max}°</b>
        <span class="mt-jauge" aria-hidden="true"><i style="width:${(b / tot) * 100}%"></i><i class="r" style="width:${(r / tot) * 100}%"></i></span><small>${lib}</small></button>`;
    }).join("")}</div>`;

    // 3. Les plages du jour choisi, chacune avec son bouton.
    const plages = j.plages.length ? `<section class="mt-plages"><h2>Créneaux ${j.t === m.auj ? "d’aujourd’hui" : esc(jourLong(j.t))}</h2>${j.plages.map((p) => {
      const hs = j.heures.filter((x) => x.h >= p.debut && x.h < p.fin), tm = Math.max(...hs.map((x) => x.temp)), vm = Math.max(...hs.map((x) => x.vent));
      return `<div class="mt-plage ${TON[p.n]}"><span class="mt-plage-h"><b>${p.debut} h – ${p.fin} h</b><small>${p.n === 2 ? "Bonnes conditions" : "Visite courte"} · jusqu’à ${tm}° · vent ${vm} km/h</small></span>
        <button type="button" class="btn" data-act="ervisite" data-v="${j.t}|${p.debut}">Prévoir</button></div>`;
    }).join("")}</section>` : `<p class="mt-rien">Pas de créneau ${j.t === m.auj ? "aujourd’hui" : esc(jourLong(j.t))}. ${m.jours.find((x) => x.bonnes && x.t !== j.t) ? `Regarde <button type="button" class="link" data-act="ermjour" data-v="${m.jours.find((x) => x.bonnes && x.t !== j.t).t}">${esc(jourLong(m.jours.find((x) => x.bonnes && x.t !== j.t).t))}</button>.` : ""}</p>`;

    // 4. Le tableau complet reste disponible, replié.
    const ligne = (titre, f, cl = "") => `<tr><th scope="row">${titre}</th>${j.heures.map((h) => `<td class="${cl} ${h.n === 2 ? "ok" : h.n === 1 ? "court" : ""}">${f(h)}</td>`).join("")}</tr>`;
    const tete = `<tr><th scope="col">Heure</th>${j.heures.map((h) => `<th scope="col">${h.h} h</th>`).join("")}</tr>`;
    const ligneSi = (titre, cle, u) => (j.heures.some((h) => h[cle] != null) ? ligne(titre, (h) => (h[cle] == null ? "–" : `${h[cle]}${u}`)) : "");
    const table = `<details class="mt-tout"><summary>Tout le détail heure par heure</summary><section class="eh-table"><table><thead>${tete}</thead><tbody>
      ${ligne("Ciel", (h) => MT.icone(h.code))}${ligne("Température", (h) => `${h.temp}°`, "fort")}${ligne("Risque de pluie", (h) => `${h.risque} %`)}${ligne("Vent", (h) => h.vent)}${ligneSi("Rafales", "rafales", "")}${ligneSi("Humidité", "hum", " %")}${ligne("Ouvrir ?", (h) => etatHtml(h.n))}</tbody></table></section></details>`;
    const s = MT.SEUILS;
    shell("Météo", `${nom}, ${new Date(j.t + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`, action,
      `<div class="mt">${hero}${jours}${frise(j)}<div id="mtDetail">${detailHeure(j.heures.find((x) => x.h === S.meteoHeure))}</div>${plages}${table}
      <p class="small mt-seuils">On peut ouvrir à partir de ${s.ouvrir} °C (visite rapide dès ${s.rapide} °C), sans pluie, avec moins de ${s.vent} km/h de vent et moins de ${s.pluie} % de risque de pluie, entre ${s.debut} h et ${s.fin} h. <button type="button" class="link" data-act="errgmeteo">Régler ces seuils</button></p></div>`);
    fin();
    phrase(phraseJour(j));
  };
  // Toucher une heure met à jour le détail sans tout redessiner (la frise ne rejoue pas son entrée).
  ACT.ermheure = (h) => {
    S.meteoHeure = Number(h);
    const m = MT.parHeure(S.meteoRucher, U.ruchers().find(([x]) => x === S.meteoRucher)?.[1] || []);
    const j = m?.jours?.find((x) => x.t === S.meteoJour);
    document.querySelectorAll(".mt-h").forEach((b) => { const on = Number(b.dataset.v) === S.meteoHeure; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    const d = document.getElementById("mtDetail");
    if (d && j) d.innerHTML = detailHeure(j.heures.find((x) => x.h === S.meteoHeure));
  };
  ACT.ervisite = (v) => {
    const [t, h] = String(v).includes("|") ? String(v).split("|") : [S.meteoJour, v];
    S.erPrefill = { titre: `Visite du rucher ${U.nomRucher(S.meteoRucher)} à ${h} h`, echeance: t };
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
    const notif = dispo ? bascule("Notifications sur cet appareil", perm === "denied" ? "Bloquées dans les réglages du navigateur" : "Quand Apiviz est ouverte", perm === "granted" && memo("apidoo-notif") !== "0", "ernotif", "") : '<p class="small">Cet appareil ne propose pas les notifications. Sur iPhone, ajoute d’abord Apiviz à l’écran d’accueil.</p>';
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
    const c = cfg(), rempli = [c.nom, c.napi, c.siret, c.adresse].filter(Boolean).length, s = MT.SEUILS;
    const b = ER.bloc, manque = [!c.napi && "NAPI", !c.siret && "SIRET", !c.adresse && "adresse"].filter(Boolean);
    const num = `F-${new Date().getFullYear()}-${String(S.d.ventes.filter((v) => v.facture_num).length + 1).padStart(4, "0")}`;
    shell("Réglages", c.nom, "", `<div class="n4-grille g-blocs">
      ${b("", "Mon exploitation", rempli === 4 ? "Complète" : "À compléter", manque.length ? `${manque.join(", ")} à renseigner`.replace(/^./, (x) => x.toUpperCase()) : "NAPI, SIRET et adresse renseignés", `${ER.jauge(rempli / 4 * 100)}<span class="small">Sert aux factures, étiquettes et au registre</span>`, "", "errgexpl")}
      ${b("", "Factures", num, "Prochain numéro", `<span class="small">${esc(c.mention_tva ? "Mention de TVA renseignée" : "Mention de TVA à renseigner")}, paiement à ${esc(c.delai_paiement || "réception")}</span>`, "", "errgfact")}
      ${b("", "Météo", `${s.ouvrir} °C`, "Seuil pour ouvrir une ruche", `<span class="small">Vent ${s.vent} km/h, pluie ${s.pluie} %, de ${s.debut} h à ${s.fin} h</span>`, "", "errgmeteo")}
      ${b("", "Apparence", BANDEAUX[bandeau()][0], "Couleur du bandeau sur cet appareil", `<span class="er-pastilles" aria-hidden="true">${Object.entries(BANDEAUX).map(([k, [, v]]) => `<i class="${k === bandeau() ? "on" : ""}" style="background:${v["--bandeau"] || "#FBEFC9"}"></i>`).join("")}</span>`, "", "errgcouleur")}
      ${b("", "Ruches physiques", c.contenants ? "Suivies" : "Non suivies", "Niveau Professionnel : caisses numérotées", `<span class="small">${c.contenants ? "Section dans Matériel, transferts depuis la fiche de la ruche" : "Pour suivre tes caisses et les transferts de colonies"}</span>`, "", "errgcontenants")}
      ${b("rappels", "Rappels", nouveaux().length ? U.pluriel(nouveaux().length, "rappel") : "À jour", "Notifications et sujets suivis")}
      ${b("", "Listes, exports et sauvegarde", "Mes données", "Postes, cercles, modes de paiement", '<span class="small">Fichiers pour le comptable, sauvegarde complète</span>', "", "errgform")}
    </div>`);
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
    shell(`Lot ${l.code}`, `${l.miel}, ${n(l.format_g, 0)} g, ${c.origine || "France"}`, `<button type="button" class="btn" data-act="editlot" data-v="${l.id}">Modifier</button><button type="button" class="btn main" data-act="etiq" data-v="${l.id}">Imprimer les étiquettes</button>${mails.length ? `<a class="btn u-lienbtn" href="mailto:?bcc=${encodeURIComponent(mails.join(","))}&amp;subject=${encodeURIComponent("Lot de miel " + l.code)}">Prévenir les clients du lot</a>` : ""}`,
      `<section class="er-fil" aria-label="Du rucher au client">
        ${etape("Récolte", recoltes.length ? `${n(kg)} kg` : "Non reliée", recoltes.length ? dfr(debut) : "Lot sans extraction")}
        ${etape("Ruches d’origine", ruches.length ? ruches.join(", ") : "Toutes", soins.length ? U.pluriel(soins.length, "traitement") + " la même année" : "Aucun traitement noté")}
        ${etape("Mise en pots", U.pluriel(l.pots_initiaux, "pot"), [l.date_mise_en_pot && dfr(l.date_mise_en_pot), l.ddm && "DDM " + dfr(l.ddm)].filter(Boolean).join(", ") || "Dates à renseigner")}
        ${etape("Ventes", U.pluriel(vendus, "pot"), `${U.pluriel(clients.length, "client")}, ${eur(ca)}`)}
      </section>
      <div class="er-deux2"><section class="card u-liste"><h2>Clients de ce lot</h2>${clients.map((x) => `<button type="button" class="u-todo" ${x.c ? `data-act="editclient" data-v="${x.c.id}"` : "disabled"}><span class="u-todo-t"><b>${esc(x.c?.nom || "?")}</b><span class="small">${esc(U.quand(x.date))}</span></span><b>${esc(U.pluriel(x.q, "pot"))}</b></button>`).join("") || '<p class="small">Aucune vente pour ce lot.</p>'}</section>
      <section class="card u-liste"><h2>Étiquette du lot</h2>${ctl.map(([t, ok]) => `<div class="er-rang"><span class="u-todo-t"><b>${t}</b></span><span class="u-chip ${ok ? "good" : "watch"}">${ok ? "Complet" : "À renseigner"}</span></div>`).join("")}</section></div>`);
    retour("go", "miel", "Miel");
    phrase(`Lot ${l.code} : ${U.pluriel(l.pots_restants ?? l.pots_initiaux - vendus, "pot")} en stock, ${vendus} vendu${vendus > 1 ? "s" : ""}.`);
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
    const lignes = l.map((x) => { const lot = byId(d.lots, x.lot_id); return `<tr><td>Miel ${esc(lot?.miel?.toLowerCase() || "")}, ${n(lot?.format_g, 0)} g</td><td>${esc(lot?.code || "–")}</td><td class="m">${x.quantite}</td><td class="m">${esc(eur(x.prix_unitaire))}</td><td class="m">${esc(eur(x.quantite * x.prix_unitaire))}</td></tr>`; }).join("");
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
