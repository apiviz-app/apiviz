// Apiviz — version 4 de la navigation : Accueil · Ruchers · + · Miel · Gestion.
// Prochaine action sur l'accueil, bouton + unique, Ruchers (liste, carte, santé), fiche ruche avec flèches,
// menu Gestion rangé par thème, menu du compte, suppression avec « Annuler », chargement en cartes grisées.
// Chargé en dernier. S'appuie sur app.js, UX, V3, VR, HL, PH et, s'il est là, EX.
const N4 = (() => {
  const U = UX;
  const memo = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch { return null; } };

  // ---------- Barre du bas, menu de côté ----------
  ICON.plus = "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z";
  ICON.ventes = "M8 3h8M7 6h10l1 3v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9z";
  ICON.ruches = "M12 2l8.5 5v10L12 22l-8.5-5V7z";
  BOTTOM.splice(0, BOTTOM.length, ["dash", "Accueil"], ["ruches", "Ruchers"], ["saisir", "Saisir"], ["ventes", "Miel"], ["plus", "Gestion"]);
  Object.assign(GROUP, { carte: "ruches", varroa: "ruches", recolte: "ruches", miel: "ventes", clients: "ventes", vente: "ventes",
    materiel: "plus", agenda: "plus", registre: "plus", declaration: "plus", activite: "plus", pilotage: "plus", compta: "plus",
    previsions: "plus", fournisseurs: "plus", reglages: "plus", membres: "plus" });
  SIDE.splice(0, SIDE.length, ["dash", "Accueil"], ["ruches", "Ruchers"], ["ventes", "Miel"], null,
    ["agenda", "Agenda"], ["varroa", "Suivi varroa"], ["registre", "Registre"], ["declaration", "Déclaration"], null,
    ["pilotage", "Bilan"], ["compta", "Dépenses"], ["previsions", "Budget"], null, ["materiel", "Matériel"], ["fournisseurs", "Fournisseurs"], null, ["plus", "Gestion"]);
  const TITRES = { pilotage: "Bilan", miel: "Miel", materiel: "Matériel" };

  // ---------- Coquille : titres, onglets Ruchers, badge Miel, avatar ----------
  // Crochets de la coquille (IT-03) : titres et sous-titres avant, onglets, retours, badge et avatar après.
  Noyau.crochets.sur("avantCoquille", "nav4.titres", (a) => {
    const [titre, ...reste] = a;
    if (S.route === "materiel" || S.route === "miel") reste[0] = "";
    return [TITRES[S.route] || titre, ...reste];
  });
  Noyau.crochets.sur("apresCoquille", "nav4", () => {
    const wrap = document.querySelector(".wrap");
    if (["ruches", "carte", "varroa"].includes(S.route) && wrap && S.d?.ruches.length) {
      wrap.querySelector(".head")?.insertAdjacentHTML("afterend", subtabs([["ruches", "Liste"], ["carte", "Carte"], ["varroa", "Santé"]], S.route, "go"));
    }
    if (S.route === "miel") wrap?.querySelector(".subtabs")?.replaceWith(...gabarit(U.enteteMiel("stock")));
    if (S.route === "materiel") { wrap?.querySelector(".subtabs")?.remove(); retour(wrap); }
    if (["agenda", "registre", "declaration", "activite", "pilotage", "compta", "previsions", "fournisseurs", "reglages", "membres"].includes(S.route)) retour(wrap);
    const d = S.d;
    if (d) {
      const nb = d.ventes.filter((v) => !v.paye || v.livre === false).length;
      if (nb) document.querySelector('.bottom [data-v="ventes"] svg')?.insertAdjacentHTML("afterend", `<span class="n4-badge" aria-label="${nb} vente(s) à suivre">${nb}</span>`);
    }
    document.querySelectorAll('.topbar .avatar, .side .me .avatar').forEach((a) => { a.dataset.act = "n4compte"; a.removeAttribute("data-v"); a.setAttribute("aria-label", "Mon compte"); });
  });
  const gabarit = (html) => { const t = document.createElement("template"); t.innerHTML = html; return [...t.content.childNodes]; };
  const retour = (wrap) => wrap?.insertAdjacentHTML("afterbegin", '<button type="button" class="link u-retour" data-act="go" data-v="plus">‹ Gestion</button>');

  // ---------- Bouton + : saisir en un geste ----------
  const SVG = (d) => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const TUILES = [
    ["newvisite", "Visite", "M12 2l8.5 5v10L12 22l-8.5-5V7zM9 12l2 2 4-4", true],
    ["n4tournee", "Tournée", "M5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6.5 16.5l4-8.5M13.5 8l4 8.5"],
    ["newrecolte", "Récolte", "M5 9h14l-1 11H6zM8 9V6a4 4 0 0 1 8 0v3"],
    ["newvente", "Vente", "M8 3h8M7 6h10l1 3v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9z"],
    ["newdepense", "Dépense", "M4 7h16v12H4zM8 7V5h8v2M4 12h16"],
    ["newtache", "Tâche", "M9 11l3 3 8-8M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11"],
  ];
  const parleur = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  window.quickSheet = function () {
    const b = brouillon && byId(S.d.ruches, brouillon.ruche_id) ? brouillon : null;
    $sheetForm.onsubmit = (e) => e.preventDefault();
    $sheetForm.innerHTML = `<div class="u-entete"><h2>Saisir</h2><button type="button" class="link" data-act="closesheet">Fermer</button></div>
      ${b ? `<button type="button" class="n4-reprendre" data-act="n4reprendre"><span class="n4-ic">${SVG("M12 8v4l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z")}</span><span><b>Reprendre la visite de ${esc(byId(S.d.ruches, b.ruche_id).nom)}</b><span class="small">Commencée à ${esc(heure)}</span></span><span aria-hidden="true">›</span></button>` : ""}
      <div class="n4-tuiles">${TUILES.map(([a, t, d, main]) => `<button type="button" class="n4-tuile ${main ? "main" : ""}" data-act="n4q" data-v="${a}">${SVG(d)}<span>${t}</span></button>`).join("")}</div>
      <div class="u-deux">${parleur ? `<button type="button" class="btn" data-act="n4q" data-v="n4vocal">Note vocale</button>` : ""}${typeof PH != "undefined" ? `<button type="button" class="btn" data-act="n4q" data-v="n4photo">Photo</button>` : ""}</div>
      <p class="small">Client, lot, ruche, matériel : dans leur écran, avec « Ajouter ».</p>`;
    $sheet.showModal();
  };
  ACT.n4tournee = () => {
    const rs = U.ruchers().filter(([, l]) => l.length > 1);
    if (!rs.length) return ACT.newvisite();
    if (rs.length === 1) return ACT.v3tournee(rs[0][0]);
    $sheetForm.innerHTML = `<h2>Quel rucher ?</h2><div class="n4-liste">${rs.map(([k, l]) => `<button type="button" class="btn" data-act="n4q" data-v="v3tournee" data-k="${esc(k)}">${esc(U.nomRucher(k))} · ${l.length} ruches</button>`).join("")}</div>
      <button type="button" class="btn" data-act="closesheet">Annuler</button>`;
    $sheet.showModal();
  };
  ACT.n4q = (a, k) => { $sheet.close(); ACT[a](k); };
  ACT.n4vocal = () => { ACT.newvisite(); setTimeout(() => { document.getElementById("v_note")?.scrollIntoView({ block: "center" }); ACT.v3dicter?.(); }, 50); };
  ACT.n4photo = () => { ACT.newvisite(); U.ouvrir("photos"); redessiner("visite"); setTimeout(() => document.querySelector('details[data-sec="photos"] input[type=file], details[data-sec="photos"] [data-act^="ph"]')?.click(), 50); };

  // Visite commencée puis quittée : on peut la reprendre depuis le bouton +.
  let brouillon = null, heure = "";
  // Avant chaque rendu (crochet du noyau, IT-03) : garder le brouillon de visite, cartes grisées pendant le chargement.
  Noyau.crochets.sur("avantRendu", "nav4", () => {
    if (S.lastRoute === "visite" && S.route !== "visite" && S.visite && !enregistree.has(S.visite) && !S.tournee) {
      brouillon = S.visite; heure = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
    if (S.session && !S.d && S.member !== false && !S.recovery) return squelette(), true;
  });
  const enregistree = new WeakSet();
  if (typeof VR != "undefined") {
    const enregAvant = VR.enregistrer;
    VR.enregistrer = async () => { const v = S.visite; await enregAvant(); enregistree.add(v); if (brouillon === v) brouillon = null; };
  }
  const annulerAvant = ACT.cancel;
  ACT.cancel = () => { if (S.route === "visite") { enregistree.add(S.visite); if (brouillon === S.visite) brouillon = null; } annulerAvant(); };
  ACT.n4reprendre = () => { $sheet.close(); S.visite = brouillon; brouillon = null; go("visite"); };

  // ---------- Chargement : cartes grisées ----------
  function squelette() {
    $app.innerHTML = `<div class="shell n4-squelette" aria-busy="true" aria-label="Chargement"><header class="topbar"><img src="logo-apiviz.svg" alt="Apiviz" height="24"></header>
      <main><div class="wrap"><div class="n4-gris" style="height:150px"></div><div class="n4-gris" style="height:220px"></div><div class="n4-gris" style="height:120px"></div></div></main></div>`;
  }

  // ---------- Accueil : prochaine action ----------
  function prochaine() {
    if (!S.d.ruches.length || memo("n4-plustard") === today()) return "";
    const cands = U.ruchers().map(([k, rs]) => {
      const ders = rs.map((r) => lastVisit(r.id));
      const jamais = ders.filter((x) => !x).length;
      const age = Math.max(0, ...ders.filter(Boolean).map((v) => days(v.date_visite)));
      const pb = rs.filter((r) => r.etat !== "Bonne");
      const crit = rs.filter((r) => r.etat === "Critique").length;
      return { k, rs, age, jamais, pb, score: crit * 100 + pb.length * 20 + jamais * 30 + age };
    }).sort((a, b) => b.score - a.score);
    const c = cands[0];
    if (!c || (c.score < 14 && !c.pb.length)) return "";
    const nom = U.nomRucher(c.k), plusieurs = c.rs.length > 1;
    const titre = plusieurs ? `Tournée « ${nom} »` : `Visiter ${c.rs[0].nom}`;
    const pourquoi = [U.pluriel(c.rs.length, "ruche"), c.jamais ? U.pluriel(c.jamais, "jamais visitée") : c.age ? `dernière visite il y a ${c.age} j` : "",
      c.pb.length ? c.pb.slice(0, 2).map((r) => `${r.nom} ${r.etat.toLowerCase()}`).join(", ") : ""].filter(Boolean).join(" · ");
    return `<div class="n4-prochaine"><span class="n4-eyebrow">Prochaine action</span><b>${esc(titre)}</b><span class="small">${esc(pourquoi)}</span>
      <div class="n4-deux"><button type="button" class="btn honey" data-act="${plusieurs ? "v3tournee" : "newvisite"}" data-v="${esc(plusieurs ? c.k : c.rs[0].id)}">${plusieurs ? "Commencer la tournée" : "Commencer la visite"}</button>
      <button type="button" class="btn ghost" data-act="n4plustard">Plus tard</button></div></div>`;
  }
  ACT.n4plustard = () => { memo("n4-plustard", today()); redessiner("dash"); };

  // ---------- Ruchers : liste ----------
  // Écran « ruches » : enregistré dans le noyau (src/domaines/ruchers/ecrans.js, N4.ecranRuchers).
  function ecranRuchers() {
    const d = S.d;
    const ls = U.lieux(), archives = (d.ruchers || []).filter((r) => r.archive_le);
    // « Déplacer » (IT-06) : transhumance d'un lot de colonies, écran src/domaines/ruchers/deplacer.js.
    const entete = '<button class="btn" data-act="rcnouveau">Nouveau rucher</button><button class="btn" data-act="newruches">Ajouter des ruches</button>'
      + (d.ruches.length && typeof ACT.dpouvrir == "function" ? '<button class="btn" data-act="dpouvrir" data-v="">Déplacer</button>' : "");
    if (!ls.length) return shell("Ruchers", "", entete, emptyState("Crée ton premier rucher", "Un nom, un emplacement, puis tes ruches. Tu pourras le placer sur la carte et noter comment y accéder.", "Nouveau rucher", "rcnouveau"));
    const seuil = U.seuilVarroa();
    // Un bloc par rucher de la table (IT-05), y compris sans colonie ; data-k : clé lue par AL.completerRuchers.
    const blocs = ls.map((l) => {
      const k = l.cle, rs = l.rs, pb = rs.filter((r) => r.etat !== "Bonne"), etat = l.etat;
      const der = rs.map((r) => lastVisit(r.id)).filter(Boolean).sort((a, b) => b.date_visite.localeCompare(a.date_visite))[0];
      const place = l.lat != null;
      const lignes = rs.map((r) => {
        const v = d.visites.find((x) => x.ruche_id === r.id && x.varroa != null), t = U.tauxVarroa(v);
        const sous = [r.etat !== "Bonne" ? r.etat : "", r.hausses ? U.pluriel(r.hausses, "hausse") : "", r.annee_reine ? "reine " + r.annee_reine : "", lastVisit(r.id) ? "" : "jamais visitée"].filter(Boolean).join(" · ");
        return `<button type="button" class="n4-ruche" data-act="ruche" data-v="${r.id}"><span class="n4-hex bg-${etatClass(r.etat)}" aria-hidden="true"></span>
          <span class="u-todo-t"><b>${esc(r.nom)}</b><span class="small">${esc(sous || "en bon état")}</span></span>
          ${t !== null ? `<span class="n4-taux ${t >= seuil ? "crit" : ""}">${n(t, 1)} %</span>` : ""}<span class="u-chev" aria-hidden="true">›</span></button>`;
      }).join("");
      const etatTag = !rs.length ? "" : pb.length ? `<span class="tag ${etatClass(etat)}">${pb.length} ${etat === "Critique" ? "critique" : "à surveiller"}</span>` : '<span class="tag good">tout va bien</span>';
      const action = rs.length > 1 ? `<button type="button" class="btn main" data-act="v3tournee" data-v="${esc(k)}">Faire la tournée</button>`
        : rs.length ? `<button type="button" class="btn main" data-act="newvisite" data-v="${rs[0].id}">Visiter</button>`
        : `<button type="button" class="btn main" data-act="rcajouter" data-v="${esc(k)}">Ajouter des ruches ici</button>`;
      const lieu = place ? `<a class="btn u-lienbtn" href="${esc(Regles.ruchers.lienItineraire(l))}" target="_blank" rel="noopener">Itinéraire</a>` : `<button type="button" class="btn" data-act="rcplacer" data-v="${esc(k)}">Placer sur la carte</button>`;
      return `<section class="card" data-k="${esc(k)}"><div class="u-entete"><div><h2>${esc(l.nom)}</h2><span class="small">${place ? "" : "Pas encore placé sur la carte · "}${!rs.length ? "aucune colonie pour l’instant" : der ? "visité il y a " + days(der.date_visite) + " j" : "jamais visité"}</span></div>
        ${etatTag}</div>
        <div class="n4-ruches">${lignes}</div>
        <div class="u-deux">${action}${lieu}</div></section>`;
    }).join("");
    // Ruches sorties, filtrées par statut (IT-06, AP-TECH-109) : mortes, vendues, réunies, perdues.
    const tousSortis = d.ruchesSorties || [], C = Regles.colonies;
    const presents = Object.keys(C.STATUTS).filter((k) => tousSortis.some((r) => C.statut(r) === k));
    const filtre = presents.includes(S.filtreSortie) ? S.filtreSortie : "";
    const rr = C.parStatut(tousSortis, filtre);
    const puces = presents.length > 1 ? `<div class="u-puces" role="group" aria-label="Filtrer par statut">${[["", "Toutes", tousSortis.length], ...presents.map((k) => [k, C.STATUTS[k] + "s", tousSortis.filter((r) => C.statut(r) === k).length])]
      .map(([k, t, nb]) => `<button type="button" class="${filtre === k ? "on" : ""}" aria-pressed="${filtre === k}" data-act="clfsortie" data-v="${k}">${esc(t)} · ${nb}</button>`).join("")}</div>` : "";
    const sorties = tousSortis.length ? `<details class="card u-pli" ${S.filtreSortie !== undefined ? "open" : ""}><summary><h2>Ruches sorties · ${tousSortis.length}</h2><span class="u-chev" aria-hidden="true">›</span></summary>${puces}
      ${rr.map((r) => `<button type="button" class="u-todo" data-act="ruche" data-v="${r.id}"><span class="u-dot bg-crit" aria-hidden="true"></span><span class="u-todo-t"><b>${esc(r.nom)}</b><span class="small">${esc(r.sortie)}${r.date_sortie ? " le " + esc(dfr(r.date_sortie)) : ""}</span></span><span class="u-chev" aria-hidden="true">›</span></button>`).join("")}</details>` : "";
    // Ruchers archivés (AP-TECH-096) : gardés pour l'historique, rouvrables depuis leur fiche.
    const arch = archives.length ? `<details class="card u-pli"><summary><h2>Ruchers archivés · ${archives.length}</h2><span class="u-chev" aria-hidden="true">›</span></summary>
      ${archives.map((r) => `<button type="button" class="u-todo" data-act="alrucher" data-v="${esc(r.nom)}"><span class="u-dot" aria-hidden="true"></span><span class="u-todo-t"><b>${esc(r.nom)}</b><span class="small">archivé le ${esc(dfr(String(r.archive_le).slice(0, 10)))}</span></span><span class="u-chev" aria-hidden="true">›</span></button>`).join("")}</details>` : "";
    const nbR = ls.filter((l) => l.cle).length;
    shell("Ruchers", `${U.pluriel(d.ruches.length, "colonie")} · ${U.pluriel(nbR, "rucher")}`, entete, blocs + sorties + arch);
  }

  // ---------- Fiche ruche : passer d'une ruche à l'autre ----------
  const voisines = (r) => { const l = S.d.ruches.filter((x) => (x.rucher || "") === (r.rucher || "")); return l.some((x) => x.id === r.id) ? l : [r]; };
  function navRuche(r) {
    const l = voisines(r), i = l.findIndex((x) => x.id === r.id);
    const prec = l[(i - 1 + l.length) % l.length], suiv = l[(i + 1) % l.length];
    return `<div class="n4-rnav"><button type="button" class="link u-retour" data-act="go" data-v="ruches">‹ ${esc(U.nomRucher(r.rucher))}</button>
      ${l.length > 1 ? `<span class="n4-fleches"><button type="button" class="btn" data-act="n4voisine" data-v="${prec.id}" aria-label="Ruche précédente : ${esc(prec.nom)}">‹</button><span class="small">${i + 1} sur ${l.length}</span><button type="button" class="btn" data-act="n4voisine" data-v="${suiv.id}" aria-label="Ruche suivante : ${esc(suiv.nom)}">›</button></span>` : ""}</div>`;
  }
  ACT.n4voisine = (id) => { S.ruche = id; window.scrollTo?.(0, 0); render(); };
  let tx0 = null, ty0 = null;
  document.addEventListener("touchstart", (e) => { if (S.route !== "ruche" || e.touches.length !== 1 || e.target.closest(".leaflet-container,svg,input,textarea")) { tx0 = null; return; } tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (tx0 === null || S.route !== "ruche" || $sheet.open) return;
    const dx = e.changedTouches[0].clientX - tx0, dy = e.changedTouches[0].clientY - ty0; tx0 = null;
    if (Math.abs(dx) < 80 || Math.abs(dy) > 50) return;
    const r = byId(S.d.ruches, S.ruche); if (!r) return;
    const l = voisines(r); if (l.length < 2) return;
    const i = l.findIndex((x) => x.id === r.id);
    ACT.n4voisine(l[(i + (dx < 0 ? 1 : -1) + l.length) % l.length].id);
  }, { passive: true });

  // ---------- Miel : récoltes dans l'onglet Stock ----------
  // Écran « miel » : complément de l'écran, appelé par src/domaines/ (IT-03).
  function completerMiel() {
    const rec = S.d.recoltes.slice(0, 30);
    document.querySelector(".wrap")?.insertAdjacentHTML("beforeend", `<section class="card u-liste"><div class="u-entete"><h2>Récoltes</h2><button type="button" class="link" data-act="newrecolte">Saisir une récolte</button></div>
      ${rec.map((x) => `<button type="button" class="u-todo" data-act="editrecolte" data-v="${x.id}"><span class="u-todo-t"><b>${esc(n(x.kg))} kg · ${esc(U.dateCourte(x.date_recolte))}</b><span class="small">${esc([x.ruche_id ? byId([...S.d.ruches, ...(S.d.ruchesSorties || [])], x.ruche_id)?.nom : "Toutes les ruches", x.miel, x.extraction].filter(Boolean).join(" · "))}</span></span>${x._attente ? '<span class="tag watch">en attente</span>' : ""}<span class="u-chev" aria-hidden="true">›</span></button>`).join("") || '<p class="small">Aucune récolte saisie.</p>'}</section>`);
  }


  // ---------- Menu du compte ----------
  const soleil = () => { try { return localStorage.getItem("apidoo-soleil") === "1"; } catch { return false; } };
  let installer = null;
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installer = e; });
  addEventListener("appinstalled", () => { installer = null; });
  const installee = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const appareil = () => {
    const ua = navigator.userAgent;
    if (/iphone|ipod|ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
    return /android/i.test(ua) ? "android" : "ordinateur";
  };
  const ETAPES_INSTALLATION = {
    ios: ["Ouvre Apiviz dans Safari. Si tu viens d’un lien reçu par e-mail ou message, choisis d’abord « Ouvrir dans Safari ».", "Touche le bouton Partager, le carré avec une flèche vers le haut.", "Choisis « Sur l’écran d’accueil », puis « Ajouter »."],
    android: ["Ouvre Apiviz dans Chrome.", "Touche le menu ⋮, en haut à droite.", "Choisis « Installer l’application » ou « Ajouter à l’écran d’accueil »."],
    ordinateur: ["Ouvre Apiviz dans Chrome ou Edge.", "Clique sur l’icône d’installation, à droite de la barre d’adresse.", "Confirme avec « Installer »."],
  };
  ACT.n4compte = () => {
    const mail = S.session?.user?.email || "";
    const ex = typeof EX != "undefined" && EX.liste ? EX.liste() : [];
    const cour = typeof EX != "undefined" ? EX.courante() : null;
    $sheetForm.onsubmit = (e) => e.preventDefault();
    $sheetForm.innerHTML = `<div class="n4-moi"><span class="avatar">${esc(mail[0]?.toUpperCase() || "?")}</span><span class="u-todo-t"><b>${esc(mail.split("@")[0])}</b><span class="small">${esc(mail)}</span></span><button type="button" class="link" data-act="closesheet">Fermer</button></div>
      ${ex.length ? `<section class="n4-bloc"><h3>Exploitation</h3>${ex.map((x) => `<button type="button" class="n4-ligne" aria-pressed="${x.id === cour}" data-act="n4expl" data-v="${x.id}"><span class="n4-radio ${x.id === cour ? "on" : ""}" aria-hidden="true"></span><span class="u-todo-t"><b>${esc(x.nom)}</b><span class="small">${esc(window.Regles?.compte?.libelleRole(x.role) || "Membre")}</span></span></button>`).join("")}
        <button type="button" class="n4-ligne" data-act="n4q" data-v="go" data-k="membres"><span class="u-todo-t"><b>Membres et invitations</b></span><span aria-hidden="true">›</span></button></section>` : ""}
      <section class="n4-bloc">
        <button type="button" class="n4-ligne" data-act="n4soleil" aria-pressed="${soleil()}"><span class="u-todo-t"><b>Mode plein soleil</b><span class="small">Plus de contraste dehors</span></span><span class="n4-inter ${soleil() ? "on" : ""}" aria-hidden="true"></span></button>
        <button type="button" class="n4-ligne" data-act="n4q" data-v="go" data-k="reglages"><span class="u-todo-t"><b>Réglages, exports et sauvegarde</b></span><span aria-hidden="true">›</span></button>
        ${installee() ? "" : `<button type="button" class="n4-ligne" data-act="n4installer"><span class="u-todo-t"><b>Installer sur l’écran d’accueil</b></span><span aria-hidden="true">›</span></button>`}
      </section>
      <section class="n4-bloc"><a class="n4-ligne" href="confidentialite.html" target="_blank" rel="noopener"><span class="u-todo-t"><b>Confidentialité</b><span class="small">Où vont tes données, services utilisés</span></span><span aria-hidden="true">›</span></a></section>
      <button type="button" class="btn n4-sortir" data-act="logout">Se déconnecter</button>`;
    if (!$sheet.open) $sheet.showModal();
  };
  ACT.n4soleil = () => { ACT.v3soleil(); ACT.n4compte(); };
  ACT.n4expl = async (id) => { $sheet.close(); await EX.ouvrir(id); };
  ACT.n4installer = async () => {
    if (installer) { installer.prompt(); installer = null; return; }
    $sheetForm.onsubmit = (e) => e.preventDefault();
    $sheetForm.innerHTML = `<section class="n4-bloc n4-installer"><h3>Installer Apiviz</h3>
      <ol>${ETAPES_INSTALLATION[appareil()].map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
      <p class="small">Apiviz s’ouvre ensuite depuis son icône, en plein écran, et reste utilisable sans réseau. Tu n’as rien à télécharger depuis un store.</p></section>
      <button type="button" class="btn" data-act="n4compte">Retour</button>`;
    if (!$sheet.open) $sheet.showModal();
  };

  // ---------- Supprimer, avec « Annuler » pendant 5 secondes ----------
  function plusTard(el, message, action, cible) {
    const carte = cible || el?.closest("article, .card, tr");
    if (carte) carte.style.display = "none";
    if ($sheet.open) $sheet.close();
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const t = document.createElement("div");
    t.className = "toast n4-annuler"; t.setAttribute("role", "status");
    t.innerHTML = `<span>${esc(message)}</span><button type="button" class="link">Annuler</button>`;
    document.body.appendChild(t);
    let fini = false;
    const go_ = setTimeout(async () => { fini = true; t.remove(); try { await action(); } catch (e) { if (carte) carte.style.display = ""; fail(e); } }, 5000);
    t.querySelector("button").onclick = () => { if (fini) return; clearTimeout(go_); t.remove(); if (carte) carte.style.display = ""; toast("Suppression annulée"); };
  }
  ACT.delvisite = (id, _k, el) => plusTard(el, "Visite supprimée", async () => {
    if (typeof PH != "undefined") await PH.oterVisite(id);
    await write(sb.from("visites").delete().eq("id", id), "");
  });
  const delVente = (id, _k, el) => plusTard(el, "Vente supprimée, stock rétabli", () => write(sb.from("ventes").delete().eq("id", id), ""));
  ACT.delvente = delVente;
  ACT.uvsuppr = delVente;

  return { prochaine, navRuche, plusTard, ecranRuchers, completerMiel };
})();
