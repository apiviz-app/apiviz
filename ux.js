// Apidoo — version 2 de l'interface : accueil « terrain d'abord », fiche ruche en journal de cartes,
// visite en sections repliables, ventes en cartes avec reçu et relance, carte des ruchers, barre du bas à 5 boutons.
// Remplace des écrans de app.js sans le modifier. S'appuie sur app.js et, s'ils sont là, sur PH, RG, VR, HL, EX.
const UX = (() => {

  // ---------- Navigation ----------
  ICON.saisir = "M12 5v14M5 12h14";
  ICON.ventes = ICON.miel;
  ICON.carte = "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14";
  BOTTOM.splice(0, BOTTOM.length, ["dash", "Accueil"], ["ruches", "Ruches"], ["saisir", "Saisir"], ["ventes", "Miel"], ["plus", "Plus"]);
  Object.assign(GROUP, { clients: "ventes", vente: "ventes", miel: "ventes", materiel: "ventes", pilotage: "plus", agenda: "plus", carte: "ruches" });
  const iR = SIDE.findIndex((x) => x && x[0] === "ruches");
  SIDE.splice(iR + 1, 0, ["carte", "Carte"]);
  ACT.go = (v) => (v === "saisir" ? quickSheet() : v === "ventes" ? go("clients") : go(v));

  // Un seul démarrage à la fois (le signal de connexion de Supabase en relançait un second en parallèle).
  const bootAvant = window.boot;
  let bootEnCours = null;
  window.boot = () => bootEnCours || (bootEnCours = Promise.resolve().then(bootAvant).finally(() => { bootEnCours = null; }));

  const renderAvant = window.render;
  window.render = function () {
    if (S.route === "carte" && S.session && S.d && S.member !== false && !S.recovery) {
      carte();
      if (S.lastRoute !== S.route) { window.scrollTo?.(0, 0); document.querySelector(".wrap")?.classList.add("enter"); }
      S.lastRoute = S.route;
    } else renderAvant();
    document.body.dataset.route = S.route;
  };

  // ---------- Petits morceaux ----------
  const chip = (txt, ton = "") => `<span class="u-chip ${ton}">${esc(txt)}</span>`;
  const court = (nom) => { const m = String(nom).match(/(\d+)\s*$/); return m ? m[1] : String(nom).slice(0, 3); };
  const hexMini = (r) => `<button type="button" class="u-hex bg-${etatClass(r.etat)}" data-act="ruche" data-v="${r.id}" aria-label="${esc(r.nom)}, état ${esc(r.etat)}"><span>${esc(court(r.nom))}</span></button>`;
  const ruchers = () => {
    const g = {};
    S.d.ruches.forEach((r) => { (g[r.rucher || ""] = g[r.rucher || ""] || []).push(r); });
    return Object.entries(g).sort(([a], [b]) => (a || "~").localeCompare(b || "~", "fr"));
  };
  const nomRucher = (k) => k || "Sans rucher";
  const pire = (rs) => (rs.some((r) => r.etat === "Critique") ? "Critique" : rs.some((r) => r.etat === "À surveiller") ? "À surveiller" : "Bonne");
  const dateCourte = (d) => {
    if (!d) return "–";
    const x = new Date(d + "T12:00:00");
    return x.toLocaleDateString("fr-FR", { day: "numeric", month: "short", ...(x.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) });
  };
  const qui = (email) => String(email || "").split("@")[0];
  const pluriel = (nb, mot) => `${nb} ${mot}${nb > 1 ? "s" : ""}`;

  // ---------- Météo du rucher (Open-Meteo, sans compte) ----------
  const meteo = { cle: "", data: null, at: 0, enCours: false };
  const lieu = () => {
    const r = S.d.ruches.find((x) => x.lat != null && x.lng != null);
    return r ? { lat: Number(r.lat), lng: Number(r.lng), nom: nomRucher(r.rucher) } : null;
  };
  function avis(m) {
    const t = Math.round(m.current.temperature_2m), v = Math.round(m.current.wind_speed_10m);
    const pluie = (m.hourly?.precipitation_probability || []).slice(new Date().getHours(), new Date().getHours() + 3);
    const p = Math.max(0, ...pluie);
    const verdict = m.current.precipitation > 0 || p >= 50 ? "pluie probable" : t < 14 ? "un peu frais pour ouvrir" : v > 25 ? "trop de vent" : "bon moment pour visiter";
    return { t, v, verdict, bon: verdict === "bon moment pour visiter" };
  }
  function meteoHtml() {
    const l = lieu();
    if (!l) return S.d.ruches.length ? '<button type="button" class="link u-meteo-lien" data-act="go" data-v="carte">Météo du rucher : placez-le sur la carte</button>' : "";
    const cle = l.lat.toFixed(2) + "," + l.lng.toFixed(2);
    if (meteo.cle !== cle || Date.now() - meteo.at > 18e5) chargerMeteo(l, cle);
    if (!meteo.data || meteo.cle !== cle) return "";
    const a = avis(meteo.data);
    return `<span class="u-meteo-t">${a.t}°</span><span>${esc(l.nom)} · vent ${a.v} km/h<br><b class="${a.bon ? "u-ok" : ""}">${esc(a.verdict.charAt(0).toUpperCase() + a.verdict.slice(1))}</b></span>${jours(meteo.data)}`;
  }
  // Les 3 prochains jours, et le meilleur pour ouvrir les ruches (sec, au moins 15°, peu de vent).
  function jours(m) {
    const d = m.daily;
    if (!d?.time || d.time.length < 2) return "";
    const js = d.time.slice(1, 4).map((t, i) => ({ t, max: Math.round(d.temperature_2m_max[i + 1]), p: d.precipitation_probability_max?.[i + 1] ?? 0, v: d.wind_speed_10m_max?.[i + 1] ?? 0 }));
    const nom = (t) => new Date(t + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short" });
    const bons = js.filter((j) => j.p < 30 && j.max >= 15 && j.v < 25);
    const meilleur = bons.sort((a, b) => a.p - b.p || b.max - a.max)[0];
    return `<span class="u-jours">${js.map((j) => `<span class="u-jour ${meilleur && j.t === meilleur.t ? "on" : ""}"><b>${esc(nom(j.t))}</b>${j.max}° · ${j.p} %</span>`).join("")}</span>
      <span class="small u-meilleur">${meilleur ? "Meilleur jour pour visiter : " + esc(new Date(meilleur.t + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long" })) : "Pas de bon créneau ces 3 prochains jours"}</span>`;
  }
  function chargerMeteo(l, cle) {
    if (meteo.enCours || navigator.onLine === false) return;
    meteo.enCours = true;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${l.lat}&longitude=${l.lng}&current=temperature_2m,wind_speed_10m,precipitation&hourly=precipitation_probability&daily=temperature_2m_max,precipitation_probability_max,wind_speed_10m_max&forecast_days=4&timezone=auto`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => { meteo.data = j; meteo.cle = cle; meteo.at = Date.now(); const el = document.getElementById("uMeteo"); if (el) el.innerHTML = meteoHtml(); })
      .catch(() => {})
      .finally(() => { meteo.enCours = false; });
  }

  // ---------- 1. Accueil ----------
  let toutVoir = false, filtreTodo = "tout";
  ACT.utout = () => { toutVoir = !toutVoir; viewDash(); };
  ACT.utfiltre = (v) => { filtreTodo = v; toutVoir = false; viewDash(); };
  const CATS = [["ruches", "Ruches"], ["miel", "Miel"], ["stock", "Stock"], ["agenda", "Agenda"]];
  const categorie = (cible) => (cible.startsWith("ruche:") ? "ruches" : ["clients", "livrer", "miel"].includes(cible) ? "miel" : cible === "materiel" ? "stock" : "agenda");
  function viewDash() {
    const d = S.d, c = cfg(), s = stock(), an = new Date().getFullYear(), f = fin(an);
    const etapes = [[d.ruches.length > 0, "Ajouter vos ruches", "newruches"], [d.articles.length > 0, "Renseigner votre matériel", "gomateriel"],
      [d.recoltes.length > 0, "Saisir une récolte", "newrecolte"], [d.lots.length > 0, "Créer vos lots de pots", "newlot"],
      [d.clients.length > 0, "Ajouter un client", "newclient"], [d.ventes.length > 0, "Enregistrer une vente", "newvente"]];
    const faites = etapes.filter((x) => x[0]).length;
    const demarrer = faites < etapes.length ? `<section class="card"><h2>Bien démarrer</h2><p class="small">${faites} sur ${etapes.length} étapes terminées</p><div class="track"><i style="width:${Math.round(faites / etapes.length * 100)}%"></i></div>
      <div class="steps">${etapes.map(([ok, t, a]) => `<button class="step ${ok ? "ok" : ""}" ${ok ? "disabled" : `data-act="${a}"`}><span class="dot">${ok ? "✓" : ""}</span>${esc(t)}</button>`).join("")}</div></section>` : "";

    const rang = { crit: 0, watch: 1, good: 2 };
    const tous = todos().sort((a, b) => rang[a[1]] - rang[b[1]]);
    const cats = CATS.map(([k, t]) => [k, t, tous.filter((x) => categorie(x[3]) === k).length]).filter((x) => x[2]);
    if (filtreTodo !== "tout" && !cats.some(([k]) => k === filtreTodo)) filtreTodo = "tout";
    const liste = filtreTodo === "tout" ? tous : tous.filter((x) => categorie(x[3]) === filtreTodo);
    const puces = cats.length > 1 ? `<div class="u-puces" role="group" aria-label="Filtrer">${[["tout", "Tout", tous.length], ...cats].map(([k, t, nb]) =>
      `<button type="button" class="${filtreTodo === k ? "on" : ""}" aria-pressed="${filtreTodo === k}" data-act="utfiltre" data-v="${k}">${t} · ${nb}</button>`).join("")}</div>` : "";
    const montres = toutVoir ? liste : liste.slice(0, 3);
    const libelle = ([lab, , txt, cible]) => {
      if (!cible.startsWith("ruche:")) return [txt, lab];
      const t = txt.replace(/^État : (.*)$/, (_, e) => "état " + e.toLowerCase());
      return [`${lab} · ${t.charAt(0).toLowerCase() + t.slice(1)}`, "Voir la ruche"];
    };
    const lignes = montres.map((x) => { const [lab, ton, , cible] = x, [titre, sous] = libelle(x);
      return `<button type="button" class="u-todo" data-act="${cible.startsWith("ruche:") ? "ruche" : "go"}" data-v="${esc(cible.replace("ruche:", ""))}">
        <span class="u-dot bg-${ton}" aria-hidden="true"></span><span class="u-todo-t"><b>${esc(titre)}</b><span class="small ${lab === "En retard" ? "crit" : ""}">${esc(sous)}</span></span><span class="u-chev" aria-hidden="true">›</span></button>`; }).join("");
    const afaire = `<section class="card u-liste"><div class="u-entete"><h2>À faire</h2><button type="button" class="link" data-act="go" data-v="agenda">Agenda</button></div>${puces}
      ${lignes || '<p class="small u-vide">Rien à signaler. Belle journée au rucher !</p>'}
      ${liste.length > 3 ? `<button type="button" class="link u-plus" data-act="utout">${toutVoir ? "Réduire" : `Voir les ${liste.length - 3} autres`}</button>` : ""}</section>`;

    const blocRuchers = d.ruches.length ? `<section class="card"><div class="u-entete"><h2>Mes ruchers</h2><button type="button" class="link" data-act="go" data-v="carte">Carte</button></div>
      ${ruchers().map(([k, rs]) => `<div class="u-rucher"><div class="u-entete"><b>${esc(nomRucher(k))}</b>${typeof V3 != "undefined" && rs.length > 1 ? `<button type="button" class="link" data-act="v3tournee" data-v="${esc(k)}">Faire la tournée</button>` : ""}</div><span class="u-hexes">${rs.map(hexMini).join("")}</span></div>`).join("")}</section>`
      : `<section class="card"><h2>Mes ruchers</h2><p class="small">Aucune ruche pour le moment.</p><button class="btn" data-act="newruches">Ajouter des ruches</button></section>`;

    const saison = `<section class="card"><div class="u-entete"><h2>Saison ${an}</h2><button type="button" class="link" data-act="go" data-v="pilotage">Bilan</button></div>
      <div class="u-trois"><div><b>${s.pots}</b><span>pots en stock</span></div><div><b>${esc(eur0(f.ca))}</b><span>vendus</span></div>
      <div><b class="${f.aEncaisser > 0 ? "watch" : ""}">${esc(eur0(f.aEncaisser))}</b><span>à encaisser</span></div></div></section>`;

    const surveiller = d.ruches.filter((r) => r.etat !== "Bonne").length;
    const sous = [pluriel(d.ruches.length, "ruche"), surveiller ? `${surveiller} à surveiller` : ""].filter(Boolean).join(" · ");
    const h = new Date().getHours();
    const N = typeof N4 != "undefined";
    shell(h < 18 ? "Bonjour" : "Bonsoir", sous,
      N ? "" : '<button class="btn honey" data-act="newvisite">Nouvelle visite</button><button class="btn ghost" data-act="newvente">Nouvelle vente</button>',
      `${demarrer}${typeof HL != "undefined" ? HL.section() : ""}${afaire}${blocRuchers}${saison}`,
      c.nom + " · " + new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));
    document.querySelector(".hero-head > div:first-child")?.insertAdjacentHTML("beforeend", `<p class="u-meteo" id="uMeteo">${meteoHtml()}</p>${N ? N4.prochaine() : ""}`);
  }

  // ---------- 2. Fiche ruche ----------
  const TON = {
    activite: { Faible: "watch", Forte: "good" }, provisions: { Faibles: "watch", Bonnes: "good" },
    reine: { Vue: "good", "Non vue": "watch" }, couvain: { "Réduit": "watch", Normal: "good", Abondant: "good" },
  };
  // Taux pour 100 abeilles quand on connaît le nombre d'abeilles prélevées (sucre glace, lavage).
  const tauxVarroa = (v) => (v && v.varroa != null && v.varroa_abeilles > 0 && v.varroa_methode !== "Lange" ? v.varroa / v.varroa_abeilles * 100 : null);
  const seuilVarroa = () => Number(cfg().varroaSeuil) || 3;
  function chipVarroa(v) {
    const t = tauxVarroa(v);
    if (t === null) return chip(`Varroa ${v.varroa}${v.varroa_methode === "Lange" ? " (lange)" : ""}`, v.varroa_methode !== "Lange" && v.varroa >= 3 ? "watch" : "");
    return chip(`Varroa ${n(t, 1)} %`, t >= seuilVarroa() ? "crit" : t >= seuilVarroa() * 0.66 ? "watch" : "good");
  }
  function carteVisite(v) {
    const d = S.d;
    const chips = [
      chip("Activité " + v.activite.toLowerCase(), TON.activite[v.activite]),
      chip("Provisions " + v.provisions.toLowerCase(), TON.provisions[v.provisions]),
      v.reine !== "Non cherchée" ? chip("Reine " + v.reine.toLowerCase(), TON.reine[v.reine]) : "",
      v.couvain ? chip("Couvain " + v.couvain.toLowerCase(), TON.couvain[v.couvain]) : "",
      v.poids_kg ? chip(n(v.poids_kg) + " kg") : "",
      v.varroa !== null && v.varroa !== undefined ? chipVarroa(v) : "",
      v.traitement ? chip("Traitement · " + v.traitement) : "",
    ].join("");
    const intr = d.intrants.filter((i) => i.visite_id === v.id).map((i) => { const a = byId(d.articles, i.article_id); return `${a?.nom || "?"} ${n(i.quantite)} ${a?.unite || ""}`.trim(); }).join(", ");
    const trt = v.traitement ? [v.lot_produit && "lot " + v.lot_produit, v.traitement_dose, v.retrait_prevu && "fin prévue le " + dfr(v.retrait_prevu)].filter(Boolean).join(", ") : "";
    return `<article class="card u-visite">
      <div class="u-visite-h"><b>${esc(dateCourte(v.date_visite))}</b><span class="small">${esc(qui(v.auteur))}</span></div>
      <div class="u-chips">${chips}</div>
      ${v.note ? `<p class="u-note">${esc(v.note)}</p>` : ""}
      ${intr ? `<p class="small">Utilisé : ${esc(intr)}</p>` : ""}${trt ? `<p class="small">Traitement : ${esc(trt)}</p>` : ""}
      ${typeof PH != "undefined" ? PH.vignettes(v.id) : ""}
      <div class="u-visite-f">${v._attente ? '<span class="tag watch">en attente</span>' : "<span></span>"}<button type="button" class="link u-discret" data-act="delvisite" data-v="${v.id}">Supprimer</button></div>
    </article>`;
  }

  function viewRuche() {
    const d = S.d, r = byId(d.ruches, S.ruche) || byId(d.ruchesSorties || [], S.ruche);
    if (!r) { S.route = "ruches"; return render(); }
    if (ongletRuche.id !== r.id) ongletRuche = { id: r.id, v: "journal" };
    const vis = d.visites.filter((v) => v.ruche_id === r.id);
    const der = vis[0];
    const pesees = vis.filter((v) => v.poids_kg);
    const ecart = pesees.length > 1 ? Number(pesees[0].poids_kg) - Number(pesees[1].poids_kg) : null;
    const varroa = vis.find((v) => v.varroa !== null && v.varroa !== undefined);
    const miel = sum(d.recoltes.filter((x) => x.ruche_id === r.id), (x) => x.kg);
    const taches = d.taches.filter((t) => t.ruche_id === r.id && !t.faite);
    const tx = varroa ? tauxVarroa(varroa) : null;
    const chiffres = `<section class="card u-trois u-quatre">
      <div><b>${der ? days(der.date_visite) + " j" : "–"}</b><span>visite</span></div>
      <div><b>${pesees[0] ? n(pesees[0].poids_kg) + " kg" : "–"}</b><span>${ecart === null ? "poids" : ecart < 0 ? `poids ↘ ${n(-ecart)}` : ecart > 0 ? `poids ↗ ${n(ecart)}` : "poids stable"}</span></div>
      <div class="${tx !== null && tx >= seuilVarroa() ? "u-alerte" : ""}"><b>${!varroa ? "–" : tx !== null ? n(tx, 1) + " %" : varroa.varroa}</b><span>varroa</span></div>
      <div><b>${r.hausses || 0}</b><span>hausse${(r.hausses || 0) > 1 ? "s" : ""}</span></div></section>`;
    const tete = `<div class="u-ruche-tete"><div class="u-ruche-id"><span class="u-gros-hex bg-${etatClass(r.etat)}" aria-hidden="true"></span>${r.sortie ? `<span class="tag crit">${esc(r.sortie)}${r.date_sortie ? " le " + esc(dfr(r.date_sortie)) : ""}</span>` : `<span class="tag ${etatClass(r.etat)}">${esc(r.etat)}</span>`}${miel ? `<span class="small">${n(miel)} kg récoltés</span>` : ""}</div></div>`;
    const poids = pesees.length > 1 ? `<details class="card u-pli"><summary><h2>Évolution du poids</h2><span class="u-chev" aria-hidden="true">›</span></summary>${lineChart({ labels: pesees.slice().reverse().map((v) => dshort(v.date_visite)), series: [{ name: "Poids", color: C.honey, values: pesees.slice().reverse().map((v) => Number(v.poids_kg)) }], fmt: (x) => n(x) + " kg", title: "Évolution du poids de la ruche", h: 170 })}</details>` : "";
    shell(r.nom, [r.type_ruche, r.annee_reine ? "reine " + r.annee_reine : ""].filter(Boolean).join(" · ") || "Fiche de la ruche",
      r.sortie || typeof N4 != "undefined" ? `<button class="btn" data-act="editruche" data-v="${r.id}" aria-label="Modifier ou supprimer la ruche">⋯</button>`
        : `<button class="btn main" data-act="newvisite" data-v="${r.id}">Nouvelle visite</button><button class="btn" data-act="newtache" data-v="${r.id}">Tâche</button><button class="btn" data-act="editruche" data-v="${r.id}" aria-label="Modifier ou supprimer la ruche">⋯</button>`,
      `${tete}${chiffres}${r.notes ? `<section class="card">${esc(r.notes)}</section>` : ""}
       ${taches.length ? `<section class="card"><h2>Tâches prévues</h2>${taches.map(taskRow).join("")}</section>` : ""}
       ${poids}
       ${subtabs([["journal", "Journal"], ["colonie", "Colonie"], ["photos", "Photos"]].filter(([k]) => k !== "colonie" || typeof V3 != "undefined"), ongletRuche.v, "uronglet")}
       ${ongletRuche.v === "colonie" && typeof V3 != "undefined" ? V3.colonie(r) : ongletRuche.v === "photos" ? photosRuche(vis)
         : `<h2 class="u-titre">Journal</h2>${vis.map(carteVisite).join("") || '<p class="small">Aucune visite enregistrée.</p>'}`}
       ${!r.sortie && typeof N4 != "undefined" ? `<div class="n4-rbarre"><button class="btn honey" data-act="newvisite" data-v="${r.id}">Visiter cette ruche</button><button class="btn" data-act="newtache" data-v="${r.id}">Tâche</button></div>` : ""}`);
    document.querySelector(".wrap")?.insertAdjacentHTML("afterbegin", typeof N4 != "undefined" ? N4.navRuche(r)
      : `<button type="button" class="link u-retour" data-act="go" data-v="ruches">‹ Ruches${r.rucher ? " · " + esc(r.rucher) : ""}</button>`);
  }

  let ongletRuche = { id: null, v: "journal" };
  ACT.uronglet = (v) => { ongletRuche.v = v; viewRuche(); };
  function photosRuche(vis) {
    if (typeof PH == "undefined") return "";
    const blocs = vis.map((v) => [v, PH.vignettes(v.id)]).filter(([, h]) => h);
    return blocs.length ? blocs.map(([v, h]) => `<section class="card"><h2>${esc(dateCourte(v.date_visite))}</h2>${h}</section>`).join("")
      : '<p class="small">Aucune photo pour cette ruche. Ajoutez-en pendant une visite.</p>';
  }

  // ---------- 3. Visite ----------
  const ouverts = new WeakMap();
  document.addEventListener("toggle", (e) => {
    const el = e.target;
    if (!el.matches?.("details[data-sec]") || !S.visite) return;
    const o = ouverts.get(S.visite) || {};
    o[el.dataset.sec] = el.open; ouverts.set(S.visite, o);
  }, true);

  function viewVisite() {
    const e = S.visite, d = S.d, o = ouverts.get(e) || {};
    const seg = (lab, k, opts, ton) => `<div class="u-ligne"><span class="u-lab">${lab}</span><div class="seg" style="grid-template-columns:repeat(${opts.length},minmax(0,1fr))">${opts.map((x) => {
      const on = e[k] === x;
      return `<button type="button" class="${on ? "on" : ""} ${on && ton ? "u-" + etatClass(x) : ""}" aria-pressed="${on}" data-act="vset" data-k="${k}" data-v="${x}">${x === "Non cherchée" ? "Pas cherchée" : x}</button>`;
    }).join("")}</div></div>`;
    const sec = (id, titre, resume, actif, contenu) => `<details class="u-sec" data-sec="${id}" ${o[id] ? "open" : ""}>
      <summary><span class="u-sec-t">${titre}</span><span class="u-sec-r ${actif ? "on" : ""}">${esc(resume)}</span><span class="u-chev" aria-hidden="true">›</span></summary>
      <div class="u-sec-c">${contenu}</div></details>`;

    const conso = consommables();
    const steppers = conso.map((a) => {
      const pas = ["kg", "L"].includes(a.unite) ? 0.5 : 1;
      return `<div class="stepper"><div><b>${esc(a.nom)}</b><div class="small">${n(a.stock)} ${esc(a.unite)} en stock</div></div><div class="ctl"><button type="button" aria-label="Diminuer ${esc(a.nom)}" data-act="vstep" data-k="${a.id}" data-v="${-pas}">−</button><span>${n(e.q[a.id] || 0)}</span><button type="button" aria-label="Augmenter ${esc(a.nom)}" data-act="vstep" data-k="${a.id}" data-v="${pas}">+</button></div></div>`;
    }).join("");
    const utilise = conso.filter((a) => e.q[a.id] > 0).map((a) => `${a.nom} ${n(e.q[a.id])} ${a.unite}`).join(", ");
    const tx = e.varroa !== "" && e.varroa != null && Number(e.varroa_abeilles) > 0 && e.varroa_methode !== "Lange" ? Number(e.varroa) / Number(e.varroa_abeilles) * 100 : null;
    const pv = [e.poids_kg !== "" && e.poids_kg != null ? n(e.poids_kg) + " kg" : "", e.varroa !== "" && e.varroa != null ? (tx !== null ? `varroa ${n(tx, 1)} %` : "varroa " + e.varroa) : ""].filter(Boolean).join(" · ");
    const T = typeof V3 != "undefined" ? V3.tourneeDe(e) : null;
    const lange = e.varroa_methode === "Lange";
    const horsLigne = typeof HL != "undefined" && HL.horsLigne();

    shell(T ? byId(d.ruches, e.ruche_id)?.nom || "Visite" : "Nouvelle visite", T ? `Tournée « ${T.nom} » · ruche ${T.i + 1} sur ${T.ids.length}` : "",
      T ? '<button class="btn" data-act="v3finir">Terminer la tournée</button>' : '<button class="btn" data-act="cancel">Annuler</button>', `
    <form data-form="visite" class="form u-visite-form">
      ${T ? V3.enteteTournee(T, e) : ""}
      <div class="u-haut">${T ? "" : typeof VR != "undefined" ? VR.pick(e) : `<div class="field"><div class="t">Ruche visitée</div><div class="pick">${d.ruches.map((a) => `<button type="button" class="${e.ruche_id === a.id ? "on" : ""}" aria-pressed="${e.ruche_id === a.id}" data-act="vset" data-k="ruche_id" data-v="${a.id}">${esc(a.nom)}</button>`).join("")}</div></div>`}
        <label class="u-date">Date<input type="date" id="v_date" value="${esc(e.date_visite)}" max="${today()}" required></label></div>
      <section class="card u-essentiel">
        ${seg("Activité", "activite", ["Faible", "Normale", "Forte"])}
        ${seg("Provisions", "provisions", ["Faibles", "Moyennes", "Bonnes"])}
        ${seg("Reine", "reine", ["Vue", "Non vue", "Non cherchée"])}
        ${seg("État", "etat", ETATS, true)}
      </section>
      <section class="card u-secs">
        ${sec("couvain", "Couvain", e.couvain || "Non vu", e.couvain && e.couvain !== "Non vu", seg("Couvain", "couvain", ["Non vu", "Réduit", "Normal", "Abondant"]))}
        ${sec("poids", "Poids et varroa", pv || "Ajouter", !!pv, `<div class="two"><label>Poids (kg)<input type="number" step="0.1" min="0" inputmode="decimal" id="v_poids" value="${esc(e.poids_kg)}"></label>
          <label>Varroas comptés<input type="number" step="1" min="0" inputmode="numeric" id="v_varroa" value="${esc(e.varroa)}"></label></div>
          ${seg("Méthode", "varroa_methode", ["Sucre glace", "Lavage", "Lange"])}
          ${lange ? '<p class="small">Lange : notez les varroas tombés pendant le comptage (pas de taux pour 100 abeilles).</p>'
            : `<label>Abeilles prélevées<input type="number" step="1" min="1" inputmode="numeric" id="v_abeilles" value="${esc(e.varroa_abeilles ?? "")}" placeholder="300 (un demi-verre)"></label>
          ${tx !== null ? `<p class="small u-taux ${tx >= seuilVarroa() ? "crit" : ""}">Soit ${n(tx, 1)} varroas pour 100 abeilles · seuil ${n(seuilVarroa(), 1)} %</p>` : ""}`}`)}
        ${sec("intrants", "Nourrissement et matériel", utilise || "Ajouter", !!utilise, steppers || '<p class="small">Ajoutez vos consommables dans Stocks › Matériel pour les suivre ici.</p>')}
        ${typeof RG != "undefined" ? sec("traitement", "Traitement", e.traitement || "Ajouter", !!e.traitement, RG.formSection(e)) : ""}
        ${typeof PH != "undefined" ? sec("photos", "Photos", "Ajouter", false, PH.formSection()) : ""}
      </section>
      <section class="card u-notecarte"><div class="u-entete"><label for="v_note" class="u-lab">Note</label>${typeof V3 != "undefined" ? V3.boutonDictee() : ""}</div>
        <textarea id="v_note" rows="3" placeholder="Ce que vous avez vu, ce qu’il faudra faire…">${esc(e.note)}</textarea></section>
      <div class="u-barre">${T ? `<div class="u-tbarre"><button type="button" class="btn" data-act="v3passer">Passer</button><button class="btn main" ${S.busy ? "disabled" : ""}>${T.i + 1 < T.ids.length ? "Enregistrer · Ruche suivante ›" : "Enregistrer et terminer"}</button></div>`
        : `<button class="btn main block" ${S.busy ? "disabled" : ""}>${horsLigne ? "Enregistrer sur le téléphone" : "Enregistrer la visite"}</button>`}</div>
    </form>`);
  }

  // ---------- 4. Ventes ----------
  let onglet = "ventes";
  ACT.uonglet = (v) => { if (v === "stock") return go("miel"); onglet = v; if (v === "ventes") S.venteFiltre = "toutes"; S.route === "clients" ? viewClients() : go("clients"); };
  ACT.uafiltre = () => { onglet = "ventes"; S.venteFiltre = S.venteFiltre === "impayees" ? "toutes" : "impayees"; S.route === "clients" ? viewClients() : go("clients"); };
  // Tuiles et onglets communs aux écrans Miel (ventes, clients, stock).
  function enteteMiel(actif) {
    const d = S.d, imp = d.ventes.filter((v) => !v.paye), al = d.ventes.filter((v) => v.livre === false).length;
    const tuile = (act, v, nb, lab, on, ton = "") => `<button type="button" class="u-tuile ${on ? "on " + ton : ""}" aria-pressed="${on}" data-act="${act}" data-v="${v}"><b>${esc(nb)}</b><span>${lab}</span></button>`;
    return `<div class="u-tuiles">${tuile("uonglet", "stock", String(stock().pots), "pots en stock", actif === "stock")}
      ${tuile("uafiltre", "", eur0(sum(imp, venteTotal)), "à encaisser", actif === "ventes" && S.venteFiltre === "impayees", "watch")}
      ${tuile("uonglet", "livrer", String(al), "à livrer", onglet === "livrer" && actif === "ventes", "watch")}</div>
      ${subtabs([["ventes", "Ventes"], ["clients", "Clients"], ["stock", "Stock et lots"]], actif, "uonglet")}`;
  }
  const aLivrer = () => S.d.ventes.filter((v) => v.livre === false);
  function carteVente(v) {
    const d = S.d, c = byId(d.clients, v.client_id);
    const pots = d.lignes.filter((x) => x.vente_id === v.id).map((x) => `${x.quantite} × ${n(byId(d.lots, x.lot_id)?.format_g, 0)} g`).join(", ");
    const statut = v.paye ? `<span class="u-chip good">payée${v.mode ? " · " + esc(v.mode.toLowerCase()) : ""}</span>` : '<span class="u-chip watch">à encaisser</span>';
    const actions = v.paye
      ? `<button type="button" class="btn" data-act="urecu" data-v="${v.id}">Envoyer le reçu</button><button type="button" class="btn" data-act="uvente" data-v="${v.id}">Détails</button>`
      : `<button type="button" class="btn main" data-act="togglepaye" data-v="${v.id}">Encaissé</button><button type="button" class="btn" data-act="urelance" data-v="${v.id}">Relancer</button>`;
    return `<article class="card u-vente"><div class="u-vente-h"><button type="button" class="u-vente-c" data-act="uvente" data-v="${v.id}"><b>${esc(c?.nom || "?")}</b><span class="small">${esc(dateCourte(v.date_vente))} · ${esc(pots)}</span></button>
      <span class="u-vente-m"><b>${esc(eur(venteTotal(v)))}</b>${statut}</span></div>
      ${v.livre === false ? `<p class="small u-livr">À livrer${v.livraison ? " · " + esc(v.livraison) : ""}</p>` : ""}
      ${v._attente ? '<span class="tag watch hl-tag">en attente d’envoi</span>' : ""}<div class="u-deux">${actions}</div></article>`;
  }
  function viewClients() {
    const d = S.d;
    if (!d.clients.length) return shell("Miel et ventes", "", "", emptyState("Ajoutez votre premier client", "Famille, amis, collègues : retrouvez qui a acheté quoi.", "Ajouter un client", "newclient"));
    const impayees = d.ventes.filter((v) => !v.paye);
    const du = sum(impayees, venteTotal);
    let corps = "";
    const filtre = (txt, extra = "") => `<div class="u-entete u-filtre-t"><span>${txt}</span><span class="u-deux-l">${extra}<button type="button" class="link" data-act="uonglet" data-v="ventes">Tout voir</button></span></div>`;
    if (onglet === "ventes" && S.venteFiltre === "impayees") {
      corps = `${filtre(`À encaisser · ${pluriel(impayees.length, "vente")}`, impayees.length > 1 ? '<button type="button" class="link" data-act="urelancer">Relancer</button>' : "")}
        ${impayees.map(carteVente).join("") || '<p class="small">Tout est encaissé.</p>'}`;
    } else if (onglet === "ventes") {
      corps = `<h2 class="u-titre">Dernières ventes</h2>${d.ventes.slice(0, 40).map(carteVente).join("") || '<p class="small">Aucune vente.</p>'}
        ${potsAVendre()}`;
    } else if (onglet === "livrer" && typeof V3 != "undefined") {
      corps = filtre(`À livrer · ${pluriel(aLivrer().length, "commande")}`) + V3.livraisons();
    } else {
      corps = d.clients.map((c) => {
        const vs = d.ventes.filter((v) => v.client_id === c.id);
        return `<article class="card u-client"><button type="button" class="u-vente-c" data-act="editclient" data-v="${c.id}"><b>${esc(c.nom)}</b><span class="small">${esc(c.cercle)} · ${vs[0] ? "dernier achat le " + esc(dateCourte(vs[0].date_vente)) : "pas encore d’achat"}</span></button>
          <span class="u-vente-m"><b>${esc(eur(sum(vs, venteTotal)))}</b>${c.telephone ? `<a class="small" href="tel:${esc(c.telephone)}">Appeler</a>` : ""}</span></article>`;
      }).join("");
    }
    shell("Miel", "",
      onglet === "clients" ? '<button class="btn main" data-act="newclient">Ajouter un client</button>' : '<button class="btn main" data-act="newvente">Nouvelle vente</button>',
      `${enteteMiel(onglet === "clients" ? "clients" : "ventes")}${corps}`);
  }
  function potsAVendre() {
    const lots = S.d.lots.filter((l) => l.pots_restants > 0);
    if (!lots.length) return "";
    return `<section class="card"><div class="u-entete"><h2>Pots à vendre</h2><button type="button" class="link" data-act="go" data-v="miel">Stock</button></div>${lots.map((l) => `<div class="u-lot"><span>${n(l.format_g, 0)} g · lot ${esc(l.code)}</span><b>${pluriel(l.pots_restants, "pot")} · ${esc(eur(l.prix))}</b></div>
      <div class="track"><i style="width:${Math.round(l.pots_restants / Math.max(1, l.pots_initiaux) * 100)}%"></i></div>`).join("")}</section>`;
  }
  ACT.urelancer = () => {
    const imp = S.d.ventes.filter((v) => !v.paye);
    if (imp.length === 1) return message(imp[0].id, "relance");
    S.venteFiltre = "impayees"; onglet = "ventes"; viewClients();
    toast("Touchez « Relancer » sur chaque vente");
  };
  ACT.uvente = (id) => {
    const d = S.d, v = byId(d.ventes, id), c = byId(d.clients, v.client_id);
    const lignes = d.lignes.filter((x) => x.vente_id === id).map((x) => { const l = byId(d.lots, x.lot_id); return `<div class="u-lot"><span>${x.quantite} × ${n(l?.format_g, 0)} g · lot ${esc(l?.code || "?")}</span><b>${esc(eur(x.quantite * x.prix_unitaire))}</b></div>`; }).join("");
    $sheetForm.onsubmit = (e) => e.preventDefault();
    $sheetForm.innerHTML = `<h2>${esc(c?.nom || "Vente")}</h2><p class="small">Vente du ${esc(dfr(v.date_vente))}${v.auteur ? " · " + esc(qui(v.auteur)) : ""}</p>
      ${lignes}<div class="u-lot u-total"><span>Total</span><b>${esc(eur(venteTotal(v)))}</b></div>
      <p>${v.paye ? `Payée${v.mode ? " · " + esc(v.mode) : ""}` : "À encaisser"}</p>
      <div class="u-deux"><button type="button" class="btn" data-act="uvpaye" data-v="${id}">${v.paye ? "Marquer à encaisser" : "Marquer payée"}</button>
      <button type="button" class="btn" data-act="${v.paye ? "urecu" : "urelance"}" data-v="${id}">${v.paye ? "Envoyer le reçu" : "Relancer"}</button></div>
      <button type="button" class="btn" data-act="closesheet">Fermer</button>
      <button type="button" class="link crit" data-act="uvsuppr" data-v="${id}">Supprimer la vente</button>`;
    if (!$sheet.open) $sheet.showModal();
  };
  ACT.uvpaye = async (id) => { $sheet.close(); await ACT.togglepaye(id); };
  ACT.uvsuppr = (id, _k, btn) => twoStep(btn, "Confirmer la suppression", async () => {
    await write(sb.from("ventes").delete().eq("id", id), "Vente supprimée, stock rétabli");
    $sheet.close();
  });

  // ---------- 5. Reçu et relance ----------
  let msgVente = null;
  const ou = (l) => (l.length > 1 ? l.slice(0, -1).join(", ") + " ou " + l[l.length - 1] : l.join(""));
  function texteMessage(v, mode) {
    const d = S.d, c = byId(d.clients, v.client_id), cf = cfg();
    const detail = ou(d.lignes.filter((x) => x.vente_id === v.id).map((x) => `${x.quantite} pot${x.quantite > 1 ? "s" : ""} de ${n(byId(d.lots, x.lot_id)?.format_g, 0)} g`)).replace(/ ou ([^,]*)$/, " et $1");
    const date = new Date(v.date_vente + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    const nom = String(c?.nom || "").trim();
    if (mode === "recu") return `Bonjour ${nom}, merci pour votre achat du ${date} : ${detail}, soit ${eur(venteTotal(v))}${v.paye ? ", réglé" + (v.mode && v.mode !== "Autre" ? " en " + v.mode.toLowerCase() : "") : ""}. Bonne dégustation !\n${cf.nom}`;
    const modes = ou(cf.modes.filter((m) => m !== "Autre").map((m) => m.toLowerCase()));
    return `Bonjour ${nom}, petit rappel pour ${detail} du ${date} : ${eur(venteTotal(v))} restent à régler${modes ? " (" + modes + ")" : ""}. Merci beaucoup !\n${cf.nom}`;
  }
  function message(id, mode) {
    const v = byId(S.d.ventes, id), c = byId(S.d.clients, v.client_id);
    msgVente = id;
    const tel = String(c?.telephone || "").replace(/[^\d+]/g, ""), mail = String(c?.email || "").trim();
    const date = new Date(v.date_vente + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    $sheetForm.onsubmit = (e) => e.preventDefault();
    $sheetForm.innerHTML = `<h2>${mode === "recu" ? "Reçu pour" : "Relancer"} ${esc(c?.nom || "")}</h2>
      <p class="small">Vente du ${esc(date)} · ${esc(eur(venteTotal(v)))}${v.paye ? "" : " à encaisser"}</p>
      ${subtabs([["recu", "Reçu"], ["relance", "Relance"]], mode, "umsgmode")}
      <label>Message (modifiable)<textarea id="u_msg" rows="7">${esc(texteMessage(v, mode))}</textarea></label>
      <div class="u-trois-b">
        <button type="button" class="btn ${tel ? "main" : ""}" data-act="umsg" data-v="sms" ${tel ? "" : "disabled"}>SMS</button>
        <button type="button" class="btn ${!tel && mail ? "main" : ""}" data-act="umsg" data-v="mail" ${mail ? "" : "disabled"}>E-mail</button>
        <button type="button" class="btn ${!tel && !mail ? "main" : ""}" data-act="umsg" data-v="copier">Copier</button></div>
      <p class="small">${!tel && !mail ? "Pas de téléphone ni d’e-mail pour ce client : copiez le message. " : !tel ? "Pas de téléphone pour ce client. " : !mail ? "Pas d’e-mail pour ce client. " : ""}Le message part de votre téléphone, à votre nom.</p>
      <button type="button" class="btn" data-act="closesheet">Fermer</button>`;
    if (!$sheet.open) $sheet.showModal();
  }
  ACT.urecu = (id) => message(id, "recu");
  ACT.urelance = (id) => message(id, "relance");
  ACT.umsgmode = (mode) => message(msgVente, mode);
  ACT.umsg = async (kind) => {
    const v = byId(S.d.ventes, msgVente), c = byId(S.d.clients, v.client_id), txt = document.getElementById("u_msg").value;
    if (kind === "sms") { location.href = `sms:${String(c.telephone).replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(txt)}`; return; }
    if (kind === "mail") { location.href = `mailto:${encodeURIComponent(c.email.trim())}?subject=${encodeURIComponent("Votre miel · " + cfg().nom)}&body=${encodeURIComponent(txt)}`; return; }
    try { await navigator.clipboard.writeText(txt); toast("Message copié"); }
    catch { document.getElementById("u_msg").select(); toast("Sélectionnez le message pour le copier", true); }
  };

  // ---------- 6. Carte des ruchers (Leaflet + OpenStreetMap) ----------
  let promesseCarte = null, choix = null, carteMap = null, visee = null;
  const leaflet = () => promesseCarte || (promesseCarte = new Promise((ok, ko) => {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(l);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => ok(window.L);
    s.onerror = () => { promesseCarte = null; ko(new Error("La carte demande le réseau la première fois.")); };
    document.head.appendChild(s);
  }));
  function infos() {
    return ruchers().map(([k, rs]) => {
      const places = rs.filter((r) => r.lat != null && r.lng != null);
      const lat = places.length ? sum(places, (r) => r.lat) / places.length : null;
      const lng = places.length ? sum(places, (r) => r.lng) / places.length : null;
      const der = rs.map((r) => lastVisit(r.id)).filter(Boolean).sort((a, b) => b.date_visite.localeCompare(a.date_visite))[0];
      return { cle: k, nom: nomRucher(k), rs, lat, lng, etat: pire(rs), der };
    });
  }
  function panneau(l) {
    if (!l) return "";
    const pb = l.rs.filter((r) => r.etat !== "Bonne").length;
    return `<section class="card u-panneau"><div class="u-entete"><div><h2>${esc(l.nom)}</h2><p class="small">${pluriel(l.rs.length, "ruche")}${l.der ? " · dernière visite il y a " + days(l.der.date_visite) + " j" : ""}</p></div>
      ${pb ? `<span class="tag ${etatClass(l.etat)}">${pb} ${l.etat === "Critique" ? "critique" + (pb > 1 ? "s" : "") : "à surveiller"}</span>` : '<span class="tag good">tout va bien</span>'}</div>
      <span class="u-hexes">${l.rs.map(hexMini).join("")}</span>
      <div class="u-deux">${l.lat != null ? `<a class="btn main u-lienbtn" href="https://www.google.com/maps/dir/?api=1&amp;destination=${l.lat},${l.lng}" target="_blank" rel="noopener">Itinéraire</a>` : ""}
        <button type="button" class="btn ${l.lat == null ? "main" : ""}" data-act="uvisiterucher" data-v="${esc(l.cle)}">${typeof V3 != "undefined" && l.rs.length > 1 ? "Faire la tournée" : "Visiter ce rucher"}</button></div>
      <div class="u-deux"><button type="button" class="btn" data-act="uplacermain" data-v="${esc(l.cle)}">${l.lat == null ? "Placer sur la carte" : "Déplacer sur la carte"}</button>
        <button type="button" class="btn" data-act="uplacer" data-v="${esc(l.cle)}">Ma position</button></div></section>`;
  }
  function carte() {
    const ls = infos(), aPlacer = ls.filter((l) => l.lat == null);
    if (choix !== null && !ls.some((l) => l.cle === choix)) choix = null;
    const liste = ls.map((l) => `<button type="button" class="u-todo" data-act="uchoix" data-v="${esc(l.cle)}"><span class="u-dot bg-${etatClass(l.etat)}" aria-hidden="true"></span>
      <span class="u-todo-t"><b>${esc(l.nom)}</b><span class="small">${pluriel(l.rs.length, "ruche")}${l.lat == null ? " · pas encore placé" : ""}</span></span><span class="u-chev" aria-hidden="true">›</span></button>`).join("");
    shell("Carte des ruchers", aPlacer.length ? `${pluriel(aPlacer.length, "rucher")} à placer` : "", "",
      S.d.ruches.length ? `<div id="uCarte" class="u-carte" role="region" aria-label="Carte des ruchers"><p class="small u-carte-msg">Chargement de la carte…</p></div>
       <div id="uPanneau">${panneau(ls.find((l) => l.cle === choix))}</div>
       <section class="card u-liste"><h2>Ruchers</h2>${liste}</section>
       <p class="small">Fond de carte © contributeurs OpenStreetMap. Pour placer un rucher : touchez-le dans la liste, puis « Placer sur la carte » (n’importe où) ou « Ma position » (sur place).</p>`
        : emptyState("Aucune ruche", "Ajoutez vos ruches pour les voir sur la carte.", "Ajouter des ruches", "newruches"));
    if (S.d.ruches.length) monter(ls);
    if (visee) setTimeout(() => ACT.uplacermain(visee), 0);
  }
  async function monter(ls) {
    let L;
    try { L = await leaflet(); } catch (e) { const el = document.querySelector(".u-carte-msg"); if (el) el.textContent = e.message; return; }
    const el = document.getElementById("uCarte");
    if (!el || el.dataset.monte) return;
    carteMap = null;
    el.dataset.monte = "1"; el.innerHTML = "";
    const m = L.map(el, { zoomControl: true, attributionControl: true });
    carteMap = m;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
    const places = ls.filter((l) => l.lat != null);
    const couleur = { good: "#2F6B4F", watch: "#E3A008", crit: "#A61B1B" };
    places.forEach((l) => {
      const ic = L.divIcon({ className: "u-pin", iconSize: [96, 58], iconAnchor: [48, 54],
        html: `<span class="u-pin-l">${esc(l.nom)} · ${l.rs.length}</span><span class="u-pin-h" style="background:${couleur[etatClass(l.etat)]}"></span>` });
      L.marker([l.lat, l.lng], { icon: ic, title: l.nom, keyboard: true }).addTo(m).on("click", () => ACT.uchoix(l.cle));
    });
    if (places.length === 1) m.setView([places[0].lat, places[0].lng], 14);
    else if (places.length > 1) m.fitBounds(places.map((l) => [l.lat, l.lng]), { padding: [40, 40], maxZoom: 15 });
    else m.setView([46.6, 2.4], 5);
  }
  ACT.uchoix = (cle) => {
    choix = cle;
    const p = document.getElementById("uPanneau");
    if (p) { p.innerHTML = panneau(infos().find((l) => l.cle === cle)); p.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  };
  ACT.uvisiterucher = (cle) => {
    if (typeof V3 != "undefined" && S.d.ruches.filter((r) => (r.rucher || "") === cle).length > 1) return ACT.v3tournee(cle);
    ACT.newvisite();
    if (typeof VR != "undefined" && S.d.ruches.filter((r) => (r.rucher || "") === cle).length > 1) ACT.vrrucher(cle);
    else { const r = S.d.ruches.find((x) => (x.rucher || "") === cle); if (r) ACT.vset(r.id, "ruche_id"); }
  };
  ACT.uplacermain = async (cle) => {
    visee = cle; choix = cle;
    const l = infos().find((x) => x.cle === cle), el = document.getElementById("uCarte"), p = document.getElementById("uPanneau");
    if (!el || !p || !l) return;
    try { await leaflet(); } catch (e) { visee = null; throw e; }
    for (let i = 0; i < 40 && !carteMap; i++) await new Promise((r) => setTimeout(r, 50));
    if (!carteMap) return;
    el.classList.add("u-visee");
    if (l.lat != null) carteMap.setView([l.lat, l.lng], Math.max(carteMap.getZoom(), 15));
    p.innerHTML = `<section class="card u-panneau"><h2>Placer « ${esc(l.nom)} »</h2>
      <p class="small">Faites glisser la carte pour amener la croix sur le rucher, zoomez si besoin, puis validez. Vous pouvez aussi chercher une commune ou une adresse.</p>
      <form data-form="ucherche" class="two ex-ajout"><label>Commune ou adresse<input name="q" autocomplete="off" placeholder="Ex. Fontaine-lès-Dijon"></label><button class="btn">Chercher</button></form>
      <div class="u-deux"><button type="button" class="btn main" data-act="uvalider" data-v="${esc(cle)}">Valider ici</button><button type="button" class="btn" data-act="uannuler">Annuler</button></div></section>`;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  document.addEventListener("submit", async (e) => {
    if (e.target.dataset.form !== "ucherche") return;
    e.preventDefault();
    const q = String(e.target.q.value || "").trim();
    if (!q || !carteMap) return;
    const b = e.target.querySelector(".btn"); b.disabled = true;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=fr&accept-language=fr&q=${encodeURIComponent(q)}`);
      const j = r.ok ? await r.json() : [];
      if (!j.length) toast("Adresse introuvable : essayez avec le nom de la commune", true);
      else { carteMap.setView([Number(j[0].lat), Number(j[0].lon)], 15); toast(j[0].display_name.split(",").slice(0, 2).join(",")); }
    } catch { toast("Recherche indisponible sans réseau", true); }
    finally { b.disabled = false; }
  });
  ACT.uannuler = () => {
    visee = null;
    document.getElementById("uCarte")?.classList.remove("u-visee");
    ACT.uchoix(choix);
  };
  ACT.uvalider = async (cle) => {
    if (!carteMap) return;
    const c = carteMap.getCenter();
    visee = null; choix = cle;
    await write(sb.from("ruches").update({ lat: Math.round(c.lat * 1e6) / 1e6, lng: Math.round(c.lng * 1e6) / 1e6 }).eq("rucher", cle), `« ${nomRucher(cle)} » placé sur la carte`);
  };
  ACT.uplacer = (cle) => new Promise((ok) => {
    if (!navigator.geolocation) { toast("Ce téléphone ne donne pas sa position", true); return ok(); }
    toast("Recherche de votre position…");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        choix = cle;
        await write(sb.from("ruches").update({ lat: pos.coords.latitude, lng: pos.coords.longitude }).eq("rucher", cle), `« ${nomRucher(cle)} » placé sur la carte`);
      } catch (e) { fail(e); }
      ok();
    }, () => { toast("Position indisponible : autorisez la localisation pour Apidoo", true); ok(); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });

  // ---------- Tableaux lisibles sur téléphone ----------
  // Chaque cellule reçoit le titre de sa colonne : sur petit écran, le CSS affiche une carte par ligne.
  function etiqueter(racine) {
    racine.querySelectorAll(".card.tbl table:not([data-u])").forEach((t) => {
      t.dataset.u = "1";
      const tetes = [...t.querySelectorAll("thead th")].map((th) => th.textContent.trim());
      t.querySelectorAll("tbody tr").forEach((tr) => [...tr.children].forEach((td, i) => { td.dataset.label = tetes[i] || ""; }));
    });
  }
  let prevu = false;
  new MutationObserver(() => {
    if (prevu) return;
    prevu = true;
    queueMicrotask(() => { prevu = false; etiqueter(document.getElementById("app")); });
  }).observe(document.getElementById("app"), { childList: true, subtree: true });

  // ---------- Pilotage : comparaison avec l'année précédente ----------
  function comparaison() {
    const d = S.d, an = S.annee, avant = an - 1;
    const chiffres = (a) => {
      const f = fin(a);
      return {
        recolte: sum(d.recoltes.filter((x) => yr(x.date_recolte) === a), (x) => x.kg),
        ca: f.ca, charges: f.charges, resultat: f.resultat,
        pots: sum(f.lignes, (x) => x.quantite),
        visites: d.visites.filter((x) => yr(x.date_visite) === a).length,
      };
    };
    const now = chiffres(an), old = chiffres(avant);
    const vide = !old.recolte && !old.ca && !old.charges && !old.visites;
    if (vide) return `<section class="card"><h2>Comparaison avec ${avant}</h2><p class="small">Pas encore de données pour ${avant} : la comparaison apparaîtra l’an prochain.</p></section>`;
    // Même période : jusqu'à aujourd'hui pour l'année en cours.
    const enCours = an === new Date().getFullYear();
    const ligne = (lab, a, b, fmt, bonSiHausse = true) => {
      const ecart = b ? (a - b) / Math.abs(b) * 100 : null;
      const ton = ecart === null || Math.abs(ecart) < 1 ? "" : (ecart > 0) === bonSiHausse ? "good" : "watch";
      return `<div class="u-cmp"><span>${lab}</span><b>${esc(fmt(a))}</b><span class="small">${esc(fmt(b))} en ${avant}</span>
        ${ecart === null ? '<span class="u-chip">nouveau</span>' : `<span class="u-chip ${ton}">${ecart > 0 ? "+" : ""}${n(ecart, 0)} %</span>`}</div>`;
    };
    return `<section class="card"><h2>${an} comparé à ${avant}</h2>${enCours ? `<p class="small">${an} est en cours : ${avant} est compté sur l’année entière.</p>` : ""}
      ${ligne("Miel récolté", now.recolte, old.recolte, (x) => n(x) + " kg")}
      ${ligne("Pots vendus", now.pots, old.pots, (x) => n(x, 0))}
      ${ligne("Ventes", now.ca, old.ca, eur0)}
      ${ligne("Dépenses", now.charges, old.charges, eur0, false)}
      ${ligne("Résultat", now.resultat, old.resultat, eur0)}
      ${ligne("Visites", now.visites, old.visites, (x) => n(x, 0))}</section>`;
  }
  const pilotFinAvant = window.pilotFin;
  window.pilotFin = () => {
    const html = pilotFinAvant();
    const i = html.indexOf("</div>\n  <section");
    return i < 0 ? comparaison() + html : html.slice(0, i + 6) + comparaison() + html.slice(i + 6);
  };

  // ---------- Menu Plus ----------
  function viewPlus() {
    const items = [["recherche", "Rechercher"], ["pilotage", "Pilotage"], ["agenda", "Agenda et tâches"], ["carte", "Carte des ruchers"], ["varroa", "Suivi varroa"],
      ["registre", "Registre d’élevage"], ["declaration", "Déclaration des ruches"], ["activite", "Activité récente"],
      ["previsions", "Prévisions et budget"], ["compta", "Dépenses"], ["fournisseurs", "Fournisseurs"], ["reglages", "Réglages et exports"]];
    if (typeof EX != "undefined") items.unshift(["membres", "Exploitation et membres"]);
    shell("Plus", "", "", `<section class="card menu">${items.filter(([k]) => ICON[k]).map(([k, t]) => `<button data-act="go" data-v="${k}">${icon(k)}<span>${t}</span></button>`).join("")}
      ${typeof V3 != "undefined" ? V3.boutonSoleil() : ""}
      <button data-act="logout">${icon("plus")}<span>Se déconnecter</span></button></section>`);
  }

  Object.assign(window, { viewDash, viewRuche, viewVisite, viewClients, viewPlus });
  return {
    carte, meteoHtml, texteMessage, tauxVarroa, seuilVarroa, dateCourte, chip, qui, pluriel, nomRucher, ruchers,
    onglet: (v) => { onglet = v; }, enteteMiel, carteVisite, hexMini, pire,
    ouvrir: (id) => { const o = ouverts.get(S.visite) || {}; o[id] = true; ouverts.set(S.visite, o); },
  };
})();
