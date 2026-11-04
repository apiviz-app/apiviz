// Apidoo — interface « Alvéoles » : compagnon API, accueil en une phrase, carte des ruches, écrans allégés.
// Les styles sont à la fin de index.html (rubrique « Interface Alvéoles »). Le bouton central garde la clé « saisir ».
// API n'est pas encore relié à une intelligence artificielle : il ouvre la saisie et la recherche.
// Quatre rubriques : Accueil, Ruchers, Miel, Gestion. Sur ordinateur, le menu devient une barre en haut.
// Chargé en dernier. S'appuie sur app.js, UX, N4, MT et, s'il est là, HL.
const AL = (() => {
  const U = UX;

  // ---------- Le compagnon ----------
  // Dessin et animations : api-compagnon.js, repris tel quel de la charte.
  const compagnon = (humeur = "repos", taille = 62) =>
    Apidoo.compagnon(humeur, taille).replace("<api-compagnon ", `<api-compagnon class="al-api" data-humeur="${humeur}" muet `);
  const humeur = () => (typeof HL != "undefined" && HL.horsLigne() ? "horsligne" : "repos");

  // API réagit : il saute quand une saisie aboutit, s'endort quand le réseau part.
  const barre = () => document.querySelector('.bottom api-compagnon, .side api-compagnon');
  const toastAvant = window.toast;
  window.toast = function (m, ...r) {
    toastAvant(m, ...r);
    if (/enregistr|ajout|noté|encaiss/i.test(m) && !/impossible|erreur|échec/i.test(m)) barre()?.jouer?.("fait", humeur());
  };
  ["online", "offline"].forEach((ev) => addEventListener(ev, () => {
    document.querySelectorAll(".bottom api-compagnon, .side api-compagnon").forEach((c) => { c.setAttribute("etat", humeur()); c.dataset.humeur = humeur(); });
  }));

  // ---------- Navigation ----------
  const central = BOTTOM.find(([k]) => k === "saisir");
  if (central) central[1] = "API";
  SIDE.splice(0, SIDE.length, ["dash", "Accueil"], ["ruches", "Ruchers"], ["ventes", "Miel"], ["plus", "Gestion"], ["saisir", "API"]);
  Object.assign(GROUP, { agenda: "dash", activite: "dash", registre: "ruches", declaration: "ruches", rucher: "ruches" });

  const ruchesDe = (k) => (U.ruchers().find(([c]) => c === k) || [k, []])[1];
  const zoneMeteo = (k, nb = 3) => `<div class="al-wx" data-k="${esc(k)}" data-jours="${nb}">${MT.html(k, ruchesDe(k), nb)}</div>`;
  const RETOURS = { agenda: ["dash", "Accueil"], activite: ["dash", "Accueil"], registre: ["varroa", "Santé"], declaration: ["varroa", "Santé"] };

  const shellAvant = window.shell;
  window.shell = function (...a) {
    shellAvant(...a);
    document.querySelectorAll('.topbar img[src="logo-apidoo-clair.svg"]').forEach((i) => { i.src = "logo-apidoo.svg"; });
    document.querySelectorAll('.bottom [data-v="saisir"] > svg').forEach((s) => { s.outerHTML = compagnon(humeur()); });
    document.querySelectorAll('.side [data-v="saisir"] > svg').forEach((s) => { s.outerHTML = compagnon(humeur(), 34); });
    document.querySelectorAll('.side .brand img').forEach((i) => { i.src = "logo-apidoo.svg"; });
    const r = RETOURS[S.route], lien = document.querySelector(".u-retour");
    if (r && lien) { lien.dataset.v = r[0]; lien.textContent = "‹ " + r[1]; }
    if (S.route === "varroa") lienSante();
  };
  function lienSante() {
    const an = new Date().getFullYear();
    document.querySelector(".subtabs")?.insertAdjacentHTML("afterend", `<div class="al-liens"><button type="button" data-act="go" data-v="registre"><b>Registre d’élevage</b><span class="small">Traitements et ordonnances</span></button>
      <button type="button" data-act="go" data-v="declaration"><b>Déclaration ${an}</b><span class="small">Entre le 1er septembre et le 31 décembre</span></button></div>`);
  }

  // ---------- Bouton API : chercher ou saisir ----------
  const feuilleAvant = window.quickSheet;
  window.quickSheet = function () {
    feuilleAvant();
    const titre = $sheetForm.querySelector(".u-entete h2");
    if (titre) { titre.textContent = "Que veux-tu faire ?"; titre.insertAdjacentHTML("beforebegin", compagnon(humeur() === "repos" ? "bonjour" : humeur(), 52)); titre.parentElement.classList.add("al-tete"); }
    $sheetForm.querySelector(".n4-tuiles")?.insertAdjacentHTML("beforebegin", `<button type="button" class="al-cherche" data-act="n4q" data-v="go" data-k="recherche">Rechercher une ruche, un client…</button>`);
    $sheetForm.querySelector("p.small:last-of-type")?.insertAdjacentHTML("afterend", '<p class="small al-bientot">Bientôt, API répondra à tes questions et lira tes factures.</p>');
  };

  // ---------- Accueil : la priorité en une phrase ----------
  function phrase() {
    const d = S.d;
    if (!d.ruches.length) return "Ajoutez votre première ruche pour commencer.";
    const r = d.ruches.find((x) => x.etat === "Critique") || d.ruches.find((x) => x.etat !== "Bonne");
    if (!r) return "Tout va bien au rucher.";
    const p = d.visites.filter((v) => v.ruche_id === r.id && v.poids_kg);
    const perte = p.length > 1 ? Number(p[1].poids_kg) - Number(p[0].poids_kg) : 0;
    const constat = perte > 0 ? `${r.nom} a perdu ${n(perte)} kg depuis le ${new Date(p[1].date_visite + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`
      : `${r.nom} est ${r.etat === "Critique" ? "en état critique" : "à surveiller"}.`;
    return `${constat} C’est la priorité du jour.`;
  }
  function legende() {
    const l = S.d.ruches, nb = (e) => l.filter((r) => r.etat === e).length;
    const bien = nb("Bonne"), surv = l.length - bien - nb("Critique"), crit = nb("Critique");
    return `<p class="al-cle">${[[bien, "good", "en forme"], [surv, "watch", "à surveiller"], [crit, "crit", "critique"]].filter(([c]) => c)
      .map(([c, t, m]) => `<span><i class="bg-${t}"></i>${c} ${m}</span>`).join("")}</p>`;
  }
  const dashAvant = window.viewDash;
  window.viewDash = function () {
    dashAvant();
    const tete = document.querySelector(".hero-head");
    if (!tete) return;
    const h1 = tete.querySelector("h1");
    h1.textContent = `${h1.textContent}. ${phrase()}`;
    tete.querySelector(".sub")?.remove();
    document.querySelector(".n4-eyebrow")?.remove();
    document.querySelector(".u-puces")?.remove();
    document.getElementById("uMeteo")?.remove();
    const ancien = document.querySelector(".u-rucher")?.closest("section");
    const afaire = document.querySelector(".u-liste");
    const saison = [...document.querySelectorAll(".wrap > section")].find((x) => x.querySelector(".u-trois"));
    afaire?.querySelector('[data-v="agenda"]')?.insertAdjacentHTML("beforebegin", '<button type="button" class="link" data-act="go" data-v="activite">Activité</button>');
    if (ancien && S.d.ruches.length) ancien.outerHTML = `<section class="al-carte">${U.ruchers().map(([k, rs]) => colonne(k, rs)).join("")}${legende()}</section>`;
    const carte = document.querySelector(".al-carte");
    if (carte && afaire) afaire.before(carte);
    if (afaire && saison) { const deux = document.createElement("div"); deux.className = "al-deux"; afaire.before(deux); deux.append(afaire, saison); }
    const demarrer = document.querySelector(".steps")?.closest("section");
    if (demarrer) document.querySelector(".wrap").append(demarrer);
  };
  function colonne(k, rs) {
    const crit = rs.some((r) => r.etat === "Critique");
    const hex = rs.map((r) => `<button type="button" class="u-hex bg-${etatClass(r.etat)}" data-act="ruche" data-v="${r.id}" aria-label="${esc(r.nom)}, état ${esc(r.etat)}"><span>${esc(String(r.nom).replace(/^Ruche\s*/i, "").slice(0, 3))}</span></button>`).join("");
    const action = rs.length > 1 ? `<button type="button" class="btn ${crit ? "main" : ""}" data-act="v3tournee" data-v="${esc(k)}">Faire la tournée</button>`
      : `<button type="button" class="btn ${crit ? "main" : ""}" data-act="newvisite" data-v="${rs[0].id}">Visiter</button>`;
    return `<article class="u-rucher al-col ${crit ? "alerte" : ""}"><div class="u-entete"><h2>${esc(U.nomRucher(k))}</h2><button type="button" class="link" data-act="alrucher" data-v="${esc(k)}">Ouvrir</button></div>
      <span class="u-hexes">${hex}</span>${zoneMeteo(k)}${action}</article>`;
  }
  ACT.alrucher = (k) => { S.rucher = k; go("rucher"); };
  // « Voir les autres » réaffiche l'accueil depuis ux.js : on repasse par cette version.
  const toutAvant = ACT.utout;
  ACT.utout = () => { toutAvant(); window.viewDash(); };

  // ---------- Ruchers : le poids sur chaque ligne ----------
  const ruchesAvant = window.viewRuches;
  window.viewRuches = function () {
    ruchesAvant();
    document.querySelectorAll(".n4-ruche").forEach((b) => {
      const v = S.d.visites.find((x) => x.ruche_id === b.dataset.v && x.poids_kg);
      if (v) b.querySelector(".u-chev")?.insertAdjacentHTML("beforebegin", `<span class="al-kg">${esc(n(v.poids_kg))} kg</span>`);
    });
    const cartes = [...document.querySelectorAll(".wrap > section.card")].filter((c) => c.querySelector(".n4-ruches"));
    const noms = U.ruchers();
    cartes.forEach((c, i) => {
      const k = noms[i]?.[0];
      if (k === undefined) return;
      c.querySelector(".u-entete")?.insertAdjacentHTML("afterend", zoneMeteo(k));
      const h2 = c.querySelector("h2");
      if (h2) h2.innerHTML = `<button type="button" class="al-titre" data-act="alrucher" data-v="${esc(k)}">${esc(U.nomRucher(k))}</button>`;
    });
    if (cartes.length) { const g = document.createElement("div"); g.className = "al-grille"; cartes[0].before(g); g.append(...cartes); }
  };

  // Changer d'onglet réaffiche la fiche depuis ux.js : on garde la courbe ouverte.
  const ongletAvant = ACT.uronglet;
  ACT.uronglet = (v) => { ongletAvant(v); window.viewRuche(); };

  // ---------- Fiche d'un rucher ----------
  function vueRucher() {
    const k = S.rucher, rs = ruchesDe(k), d = S.d;
    if (!rs.length) { S.route = "ruches"; return render(); }
    const ids = new Set(rs.map((r) => r.id)), l = MT.lieu(rs);
    const taches = d.taches.filter((t) => !t.faite && ids.has(t.ruche_id));
    const lignes = rs.map((r) => {
      const v = d.visites.find((x) => x.ruche_id === r.id), p = d.visites.find((x) => x.ruche_id === r.id && x.poids_kg);
      const tx = U.tauxVarroa(d.visites.find((x) => x.ruche_id === r.id && x.varroa != null));
      return `<button type="button" class="al-ligne" data-act="ruche" data-v="${r.id}"><span class="n4-hex bg-${etatClass(r.etat)}" aria-hidden="true"></span><b>${esc(r.nom)}</b>
        <span class="small ${r.etat === "Bonne" ? "" : etatClass(r.etat)}">${esc(r.etat === "Bonne" ? "En forme" : r.etat)}</span>
        <span class="al-kg">${p ? esc(n(p.poids_kg)) + " kg" : "–"}</span><span class="al-opt">${tx !== null ? "Varroa " + esc(n(tx, 1)) + " %" : "–"}</span>
        <span class="al-opt">${v ? esc(v.provisions) : "–"}</span><span class="al-opt">${v ? esc(U.dateCourte(v.date_visite)) : "Jamais visitée"}</span></button>`;
    }).join("");
    const action = rs.length > 1 ? `<button class="btn main" data-act="v3tournee" data-v="${esc(k)}">Faire la tournée</button>` : `<button class="btn main" data-act="newvisite" data-v="${rs[0].id}">Visiter</button>`;
    const route = l ? `<a class="btn u-lienbtn" href="https://www.google.com/maps/dir/?api=1&amp;destination=${l.lat},${l.lng}" target="_blank" rel="noopener">Itinéraire</a>` : "";
    shell(U.nomRucher(k), U.pluriel(rs.length, "ruche"), route + action, `
      <div class="al-fiche"><section class="al-col"><h2>Météo du rucher</h2>${zoneMeteo(k, 5)}</section>
      <section class="al-col"><h2>À faire ici</h2>${taches.length ? taches.map((t) => `<button type="button" class="u-todo" data-act="go" data-v="agenda"><span class="u-todo-t"><b>${esc(t.titre)}</b>${t.echeance ? `<span class="small">${esc(U.dateCourte(t.echeance))}</span>` : ""}</span></button>`).join("") : '<p class="small">Rien de prévu dans ce rucher.</p>'}</section></div>
      <section class="al-ruches"><h2>${esc(U.pluriel(rs.length, "ruche"))}</h2>${lignes}</section>`);
    document.querySelector(".wrap")?.insertAdjacentHTML("afterbegin", '<button type="button" class="link u-retour" data-act="go" data-v="ruches">‹ Ruchers</button>');
  }
  const renderAvant = window.render;
  window.render = function () {
    if (S.route === "rucher" && S.session && S.d && S.member !== false && !S.recovery) {
      vueRucher();
      if (S.route !== "rucher") return;
      if (S.lastRoute !== "rucher") window.scrollTo?.(0, 0);
      S.lastRoute = "rucher"; document.body.dataset.route = "rucher";
    } else renderAvant();
  };

  // ---------- Gestion : comptes, matériel, membres ----------
  const gestionAvant = window.viewPlus;
  window.viewPlus = function () {
    gestionAvant();
    document.querySelectorAll('.n4-g:is([data-v="agenda"],[data-v="activite"],[data-v="varroa"],[data-v="registre"],[data-v="declaration"])').forEach((x) => x.remove());
    const titres = { Organisation: "Équipe", Argent: "Comptes" }, wrap = document.querySelector(".wrap");
    document.querySelectorAll(".n4-sect").forEach((t) => {
      const g = t.nextElementSibling;
      if (!g?.children.length) { t.remove(); g?.remove(); return; }
      t.textContent = titres[t.textContent] || t.textContent;
      if (t.textContent === "Équipe") wrap.append(t, g);
    });
  };

  // ---------- Fiche ruche : la courbe de poids reste visible ----------
  const rucheAvant = window.viewRuche;
  window.viewRuche = function () {
    rucheAvant();
    [...document.querySelectorAll("details.u-pli")].find((x) => x.textContent.includes("Évolution du poids"))?.setAttribute("open", "");
  };

  return { compagnon, phrase, ruchesDe };
})();
