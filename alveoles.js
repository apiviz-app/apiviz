// Apiviz — interface « Alvéoles » : compagnon API, accueil en une phrase, carte des ruches, écrans allégés.
// Les styles sont à la fin de index.html (rubrique « Interface Alvéoles »). Le bouton central garde la clé « saisir ».
// API n'est pas encore relié à une intelligence artificielle : il ouvre la saisie et la recherche.
// Quatre rubriques : Accueil, Ruchers, Miel, Gestion. Sur ordinateur, le menu devient une barre en haut.
// Chargé en dernier. S'appuie sur app.js, UX, N4, MT et, s'il est là, HL.
const AL = (() => {
  const U = UX;

  // ---------- Le compagnon ----------
  // Dessin et animations : api-compagnon.js, repris tel quel de la charte.
  const compagnon = (humeur = "repos", taille = 62) =>
    Apiviz.compagnon(humeur, taille).replace("<api-compagnon ", `<api-compagnon class="al-api" data-humeur="${humeur}" muet `);
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
  Object.assign(GROUP, { agenda: "dash", activite: "dash", registre: "plus", declaration: "plus", rucher: "ruches" });

  const ruchesDe = (k) => (U.ruchers().find(([c]) => c === k) || [k, []])[1];
  const zoneMeteo = (k, nb = 3) => `<div class="al-wx" data-k="${esc(k)}" data-jours="${nb}">${MT.html(k, ruchesDe(k), nb)}</div>`;
  const RETOURS = { agenda: ["dash", "Accueil"], activite: ["dash", "Accueil"], registre: ["plus", "Gestion"], declaration: ["plus", "Gestion"] };
  // Registre et déclaration ont leur place dans Gestion (arborescence gelée, AP-FEAT-113) ; Santé garde un raccourci.

  // Après chaque coquille (crochet du noyau, IT-03) : logo, compagnon API dans la barre, liens de retour.
  Noyau.crochets.sur("apresCoquille", "alveoles", () => {
    if (S.route !== "dash") S.alVu = false;
    document.querySelectorAll('.topbar img[src="logo-apiviz-clair.svg"]').forEach((i) => { i.src = "logo-apiviz.svg"; });
    document.querySelectorAll('.bottom [data-v="saisir"] > svg').forEach((s) => { s.outerHTML = compagnon(humeur()); });
    document.querySelectorAll('.side [data-v="saisir"] > svg').forEach((s) => { s.outerHTML = compagnon(humeur(), 34); });
    document.querySelectorAll('.side .brand img').forEach((i) => { i.src = "logo-apiviz.svg"; });
    const r = RETOURS[S.route], lien = document.querySelector(".u-retour");
    if (r && lien) { lien.dataset.v = r[0]; lien.textContent = "‹ " + r[1]; }
    if (S.route === "varroa") lienSante();
  });
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
  const prioritaire = () => S.d.ruches.find((x) => x.etat === "Critique") || S.d.ruches.find((x) => x.etat !== "Bonne");
  function phrase() {
    const d = S.d;
    if (!d.ruches.length) return "Ajoute ta première ruche pour commencer.";
    const r = prioritaire();
    if (!r) return "Tout va bien au rucher.";
    const p = d.visites.filter((v) => v.ruche_id === r.id && v.poids_kg);
    const perte = p.length > 1 ? Number(p[1].poids_kg) - Number(p[0].poids_kg) : 0;
    const constat = perte > 0 ? `${r.nom} a perdu ${n(perte)} kg depuis le ${new Date(p[1].date_visite + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`
      : `${r.nom} est ${r.etat === "Critique" ? "en état critique" : "à surveiller"}.`;
    const cle = U.ruchers().find(([, rs]) => rs.includes(r))?.[0];
    const c = cle === undefined ? null : MT.creneauDuJour(cle, ruchesDe(cle));
    return c ? `Bon créneau vers ${c.h} h : ${U.nomRucher(cle)}. ${constat} Commence par elle.` : `${constat} C’est la priorité du jour.`;
  }
  function legende() {
    const l = S.d.ruches, nb = (e) => l.filter((r) => r.etat === e).length;
    const bien = nb("Bonne"), surv = l.length - bien - nb("Critique"), crit = nb("Critique");
    return `<p class="al-cle">${[[bien, "good", "en forme"], [surv, "watch", "à surveiller"], [crit, "crit", "critique"]].filter(([c]) => c)
      .map(([c, t, m]) => `<span><i class="bg-${t}"></i>${c} ${m}</span>`).join("")}</p>`;
  }
  // Écran « dash » : complément de l'écran, appelé par src/domaines/ (IT-03).
  function completerAccueil() {
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
    if (carte) {
      carte.querySelector(".u-rucher")?.insertAdjacentHTML("beforebegin", lentilles());
      carte.querySelectorAll(".u-hex").forEach((h, i) => h.style.setProperty("--i", i));
      if (!S.alVu) carte.classList.add("al-entree");
      S.alVu = true;
      appliquerLentille();
    }
    if (carte && afaire) afaire.before(carte);
    if (afaire && saison) { const deux = document.createElement("div"); deux.className = "al-deux"; afaire.before(deux); deux.append(afaire, saison); }
    // L'accueil des maquettes (accueil.js, v5.25) couvre aussi l'ordinateur : l'ancienne vue d'ensemble reste en secours.
    if (surOrdinateur.matches && S.d.ruches.length && typeof AC == "undefined") accueilOrdinateur(tete);
    const demarrer = document.querySelector(".steps")?.closest("section");
    if (demarrer) document.querySelector(".wrap").append(demarrer);
  }
  // ---------- Accueil sur ordinateur : la priorité, quatre chiffres, puis ruchers, à faire, activité ----------
  const surOrdinateur = matchMedia("(min-width:801px)");
  surOrdinateur.addEventListener("change", () => { if (S.route === "dash") redessiner("dash"); });
  function actionsDuJour() {
    const r = prioritaire(), rs = U.ruchers(), cle = r ? r.rucher : rs.length === 1 ? rs[0][0] : undefined;
    const voir = r ? `<button type="button" class="btn main" data-act="ruche" data-v="${r.id}">Voir ${esc(r.nom)}</button>` : "";
    const groupe = rs.find(([k]) => k === cle)?.[1] || [];
    const tournee = groupe.length > 1 ? `<button type="button" class="btn ${r ? "" : "main"}" data-act="v3tournee" data-v="${esc(cle)}">Faire la tournée</button>` : "";
    return voir + tournee;
  }
  function chiffres() {
    const d = S.d, s = stock(), an = new Date().getFullYear(), f = fin(an), nb = (e) => d.ruches.filter((r) => r.etat === e).length;
    const bien = nb("Bonne"), crit = nb("Critique"), surv = d.ruches.length - bien - crit;
    const etats = [[bien, "en forme"], [surv, "à surveiller"], [crit, "critique"]].filter(([c]) => c).map(([c, m]) => `${c} ${m}`).join(", ");
    const formats = [...d.lots.reduce((m, l) => (l.pots_restants > 0 ? m.set(l.format_g, (m.get(l.format_g) || 0) + l.pots_restants) : m), new Map())]
      .sort((a, b) => a[0] - b[0]).map(([g, p]) => `${p} de ${g} g`).join(", ");
    const impayees = d.ventes.filter((v) => !v.paye && new Date(v.date_vente).getFullYear() === an).length, bilan = f.resultat;
    const tuile = (act, v, lab, val, cl, sous) => `<button type="button" class="ab-chiffre" data-act="${act}" data-v="${v}"><span class="small">${lab}</span><b class="${cl}">${esc(val)}</b>${sous}</button>`;
    return `<section class="ab-chiffres" aria-label="Chiffres clés">
      ${tuile("go", "ruches", "Ruches", String(d.ruches.length), "", `<span class="ab-minis" aria-hidden="true">${d.ruches.map(miniHex).join("")}</span><span class="small">${esc(etats)}</span>`)}
      ${tuile("go", "miel", "Pots en stock", String(s.pots), "", `<span class="small">${esc(formats || "Aucun pot pour le moment")}</span>`)}
      ${tuile("uafiltre", "", "À encaisser", eur0(f.aEncaisser), f.aEncaisser > 0 ? "watch" : "", `<span class="small">${impayees ? U.pluriel(impayees, "vente") : "Tout est encaissé"}</span>`)}
      ${tuile("go", "pilotage", `Bilan ${an}`, `${bilan > 0 ? "+" : ""}${eur0(bilan)}`, bilan > 0 ? "good" : "", '<span class="small">Ventes moins dépenses</span>')}
    </section>`;
  }
  const miniHex = (r) => `<i class="ab-mini ${etatClass(r.etat)}"></i>`;
  function ligneRucher([k, rs]) {
    const dates = S.d.visites.filter((v) => rs.some((r) => r.id === v.ruche_id)).map((v) => v.date_visite).sort(), der = dates[dates.length - 1];
    const a = rs.filter((r) => r.etat === "Critique").length, b = rs.filter((r) => r.etat !== "Bonne").length - a;
    const etat = a ? `<span class="u-chip crit">${a} critique${a > 1 ? "s" : ""}</span>` : b ? `<span class="u-chip watch">${b} à surveiller</span>` : '<span class="u-chip good">En forme</span>';
    return `<article class="ab-rucher"><button type="button" class="ab-rucher-t" data-act="alrucher" data-v="${esc(k)}"><span class="u-todo-t"><b>${esc(U.nomRucher(k))}</b><span class="small">${esc(U.pluriel(rs.length, "ruche"))}${der ? `, visite : ${esc(U.quand(der).toLowerCase())}` : ", pas encore visité"}</span></span>
      <span class="ab-minis" role="img" aria-label="${esc(rs.map((r) => `${r.nom} ${r.etat}`).join(", "))}">${rs.map(miniHex).join("")}</span>${etat}</button>${zoneMeteo(k, 0)}</article>`;
  }
  function accueilOrdinateur(tete) {
    const carte = document.querySelector(".al-carte"), deux = document.querySelector(".al-deux"), afaire = document.querySelector(".u-liste");
    document.querySelector(".n4-prochaine")?.remove();
    const actions = actionsDuJour();
    if (actions) tete.insertAdjacentHTML("beforeend", `<div class="ab-actions">${actions}</div>`);
    afaire?.querySelector('[data-v="activite"]')?.remove();
    const fil = V3.fil(4);
    const lignes = fil.map(([t, qui, titre, sous, act, v]) => `<button type="button" class="u-todo" ${v ? `data-act="${act}" data-v="${esc(v)}"` : "disabled"}><span class="u-todo-t"><b>${esc(titre)}</b><span class="small">${esc([U.quand(t), qui ? U.qui(qui) : "", sous].filter(Boolean).join(" · "))}</span></span></button>`).join("");
    const bloc = document.createElement("div");
    bloc.className = "ab";
    bloc.innerHTML = `${chiffres()}<div class="ab-grille"><section class="card ab-ruchers"><div class="u-entete"><h2>Mes ruchers</h2><button type="button" class="link" data-act="go" data-v="carte">Voir la carte</button></div>${U.ruchers().map(ligneRucher).join("")}</section>
      <div class="ab-place"></div>
      <section class="card ab-activite"><div class="u-entete"><h2>Activité récente</h2><button type="button" class="link" data-act="go" data-v="activite">Tout voir</button></div>${lignes || '<p class="small u-vide">Rien pour le moment.</p>'}</section></div>`;
    (carte || deux).before(bloc);
    if (afaire) bloc.querySelector(".ab-place").replaceWith(afaire);
    carte?.remove();
    deux?.remove();
  }
  // ---------- Lentilles : regarder toutes les ruches par un seul critère ----------
  const LENTILLES = [["etat", "État"], ["prov", "Provisions"], ["varroa", "Varroa"]];
  const NIVEAUX = { Bonnes: "85%", Moyennes: "52%", Faibles: "22%" };
  const lentilles = () => `<div class="al-lentilles" role="group" aria-label="Regarder les ruches par">${LENTILLES.map(([k, t]) =>
    `<button type="button" class="lent ${(S.lentille || "etat") === k ? "on" : ""}" aria-pressed="${(S.lentille || "etat") === k}" data-act="allent" data-v="${k}">${t}</button>`).join("")}</div>`;
  function regard(r, l) {
    const visites = S.d.visites.filter((v) => v.ruche_id === r.id), num = String(r.nom).replace(/^Ruche\s*/i, "").slice(0, 3);
    if (l === "prov") {
      const p = visites.find((v) => v.provisions)?.provisions;
      return p && NIVEAUX[p] ? { cl: "bg-niv", txt: num, niv: NIVEAUX[p], mot: `provisions ${p.toLowerCase()}` } : { cl: "bg-vide", txt: num, mot: "provisions pas encore notées" };
    }
    if (l === "varroa") {
      const t = U.tauxVarroa(visites.find((v) => v.varroa != null)), s = U.seuilVarroa();
      if (t === null) return { cl: "bg-vide", txt: num, mot: "varroa pas encore compté" };
      return { cl: `al-txt bg-${t >= s ? "crit" : t >= s * 0.66 ? "watch" : "good"}`, txt: n(t, 1), mot: `varroa ${n(t, 1)} %` };
    }
    return { cl: `bg-${etatClass(r.etat)}`, txt: num, mot: `état ${r.etat}` };
  }
  function legendeLentille(l) {
    const s = U.seuilVarroa();
    if (l === "prov") return `<p class="al-cle"><span><i class="al-niv" style="--niv:85%"></i>Bonnes</span><span><i class="al-niv" style="--niv:52%"></i>Moyennes</span><span><i class="al-niv" style="--niv:22%"></i>Faibles</span></p>`;
    if (l === "varroa") return `<p class="al-cle"><span><i class="bg-good"></i>Sous ${n(s * 0.66, 1)} %</span><span><i class="bg-watch"></i>À surveiller</span><span><i class="bg-crit"></i>À partir de ${n(s, 1)} %</span></p>`;
    return legende();
  }
  function appliquerLentille() {
    const l = S.lentille || "etat", carte = document.querySelector(".al-carte");
    if (!carte) return;
    carte.querySelectorAll(".lent").forEach((b) => { const on = b.dataset.v === l; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    carte.querySelectorAll(".u-hex").forEach((b) => {
      const r = S.d.ruches.find((x) => x.id === b.dataset.v);
      if (!r) return;
      const v = regard(r, l);
      b.className = `u-hex ${v.cl}`;
      b.style.setProperty("--niv", v.niv || "0%");
      b.querySelector("span").textContent = v.txt;
      b.setAttribute("aria-label", `${r.nom}, ${v.mot}`);
    });
    carte.querySelector(".al-cle").outerHTML = legendeLentille(l);
  }
  ACT.allent = (k) => { S.lentille = k; appliquerLentille(); };
  // Quand la météo arrive, la phrase d'accueil peut annoncer le créneau.
  window.AL_meteoPrete = () => {
    const h1 = document.querySelector(".hero-head h1");
    if (S.route !== "dash" || !h1 || !S.d?.ruches.length) return;
    const debut = h1.textContent.split(". ")[0], p = phrase();
    h1.textContent = `${debut}. ${p}`;
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
  // « Tout voir » : ux.js redessine l'accueil complet par le noyau (redessiner), plus besoin de le refaire ici (IT-03).

  // ---------- Ruchers : le poids sur chaque ligne ----------
  // Écran « ruches » : complément de l'écran, appelé par src/domaines/ (IT-03).
  function completerRuchers() {
    document.querySelectorAll(".n4-ruche").forEach((b) => {
      const v = S.d.visites.find((x) => x.ruche_id === b.dataset.v && x.poids_kg);
      if (v) b.querySelector(".u-chev")?.insertAdjacentHTML("beforebegin", `<span class="al-kg">${esc(n(v.poids_kg))} kg</span>`);
    });
    // Clé du rucher posée par N4.ecranRuchers (data-k) : les ruchers sans colonie s'intercalent (IT-05).
    const cartes = [...document.querySelectorAll(".wrap > section.card")].filter((c) => c.querySelector(".n4-ruches"));
    cartes.forEach((c) => {
      const k = c.dataset.k;
      if (k === undefined) return;
      c.querySelector(".u-entete")?.insertAdjacentHTML("afterend", zoneMeteo(k));
      const h2 = c.querySelector("h2");
      if (h2) h2.innerHTML = `<button type="button" class="al-titre" data-act="alrucher" data-v="${esc(k)}">${esc(U.nomRucher(k))}</button>`;
    });
    if (cartes.length) { const g = document.createElement("div"); g.className = "al-grille"; cartes[0].before(g); g.append(...cartes); }
  }

  // Changer d'onglet réaffiche la fiche depuis ux.js : on garde la courbe ouverte.
  // Onglets de la fiche : ux.js redessine la fiche complète par le noyau (redessiner), plus besoin de le refaire ici (IT-03).

  // ---------- Fiche d'un rucher ----------
  function vueRucher() {
    const k = S.rucher, rs = ruchesDe(k), d = S.d;
    // Rucher de la table (IT-05) : sa fiche s'ouvre même sans colonie ou archivé.
    const fiche = Regles.ruchers.rucherParCle(d.ruchers, k);
    if (!rs.length && !fiche) { S.route = "ruches"; return render(); }
    const ids = new Set(rs.map((r) => r.id)), l = Regles.ruchers.position(fiche, rs);
    const taches = d.taches.filter((t) => !t.faite && ids.has(t.ruche_id));
    const lignes = rs.map((r) => {
      const v = d.visites.find((x) => x.ruche_id === r.id), p = d.visites.find((x) => x.ruche_id === r.id && x.poids_kg);
      const tx = U.tauxVarroa(d.visites.find((x) => x.ruche_id === r.id && x.varroa != null));
      return `<button type="button" class="al-ligne" data-act="ruche" data-v="${r.id}"><span class="n4-hex bg-${etatClass(r.etat)}" aria-hidden="true"></span><b>${esc(r.nom)}</b>
        <span class="small ${r.etat === "Bonne" ? "" : etatClass(r.etat)}">${esc(r.etat === "Bonne" ? "En forme" : r.etat)}</span>
        <span class="al-kg">${p ? esc(n(p.poids_kg)) + " kg" : "–"}</span><span class="al-opt">${tx !== null ? "Varroa " + esc(n(tx, 1)) + " %" : "–"}</span>
        <span class="al-opt">${v ? esc(v.provisions) : "–"}</span><span class="al-opt">${v ? esc(U.quand(v.date_visite)) : "Jamais visitée"}</span></button>`;
    }).join("");
    const action = fiche?.archive_le ? "" : rs.length > 1 ? `<button class="btn main" data-act="v3tournee" data-v="${esc(k)}">Faire la tournée</button>`
      : rs.length ? `<button class="btn main" data-act="newvisite" data-v="${rs[0].id}">Visiter</button>`
      : `<button class="btn main" data-act="rcajouter" data-v="${esc(k)}">Ajouter des ruches ici</button>`;
    const route = l ? `<a class="btn u-lienbtn" href="${esc(Regles.ruchers.lienItineraire(l))}" target="_blank" rel="noopener">Itinéraire</a>` : "";
    const sous = fiche?.archive_le ? `Archivé le ${dfr(String(fiche.archive_le).slice(0, 10))}` : rs.length ? U.pluriel(rs.length, "ruche") : "Aucune colonie pour l’instant";
    shell(fiche?.nom || U.nomRucher(k), sous, route + action, `
      <div class="al-fiche"><section class="al-col"><h2>Météo du rucher</h2>${zoneMeteo(k, 5)}</section>
      <section class="al-col"><h2>À faire ici</h2>${taches.length ? taches.map((t) => `<button type="button" class="u-todo" data-act="go" data-v="agenda"><span class="u-todo-t"><b>${esc(t.titre)}</b>${t.echeance ? `<span class="small">${esc(U.dateCourte(t.echeance))}</span>` : ""}</span></button>`).join("") : '<p class="small">Rien de prévu dans ce rucher.</p>'}</section></div>
      <section class="al-ruches"><h2>${esc(U.pluriel(rs.length, "ruche"))}</h2>${lignes}</section>`);
    document.querySelector(".wrap")?.insertAdjacentHTML("afterbegin", '<button type="button" class="link u-retour" data-act="go" data-v="ruches">‹ Ruchers</button>');
  }
  // Écran « rucher » : enregistré dans le noyau (src/domaines/ruchers/ecrans.js, AL.vueRucher).

  // ---------- Fiche ruche : la courbe de poids reste visible ----------
  // Écran « ruche » : complément de l'écran, appelé par src/domaines/ (IT-03).
  function completerFiche() {
    const pli = [...document.querySelectorAll("details.u-pli")].find((x) => x.textContent.includes("Évolution du poids"));
    pli?.setAttribute("open", "");
    const r = byId(S.d.ruches, S.ruche) || byId(S.d.ruchesSorties || [], S.ruche), hex = document.querySelector(".u-gros-hex");
    if (r && hex) hex.textContent = String(r.nom).replace(/^Ruche\s*/i, "").slice(0, 3) + (r.etat === "Critique" ? "!" : "");
    // La courbe se dessine quand on arrive sur la ruche, pas à chaque changement d'onglet.
    if (S.alCourbe !== S.ruche) pli?.querySelector("polyline")?.classList.add("al-trace");
    pli?.querySelector("polyline")?.setAttribute("pathLength", "1");
    S.alCourbe = S.ruche;
  }

  // ---------- Transitions : l'alvéole touchée devient l'en-tête de la fiche ----------
  const fluide = () => document.startViewTransition && !matchMedia("(prefers-reduced-motion:reduce)").matches;
  function transition(action, source) {
    if (!fluide()) return action();
    if (source) source.style.viewTransitionName = "al-hex";
    document.startViewTransition(() => {
      if (source) source.style.viewTransitionName = "";
      action();
      document.querySelector(".u-gros-hex")?.style.setProperty("view-transition-name", "al-hex");
    });
  }
  const versRuche = ACT.ruche;
  ACT.ruche = (id) => {
    const b = [...document.querySelectorAll('[data-act="ruche"]')].find((x) => x.dataset.v === id);
    transition(() => versRuche(id), document.querySelector(".u-gros-hex") || b?.querySelector(".n4-hex") || (b?.classList.contains("u-hex") ? b : null));
  };
  const allerA = ACT.go;
  ACT.go = (v) => (S.route === "ruche" || S.route === "rucher" ? transition(() => allerA(v)) : allerA(v));

  // ---------- Miel : des pots qui se vident, des chiffres qui bougent ----------
  const nbFr = (x) => x.toLocaleString("fr-FR");
  function compter(el, de, vers, fin) {
    if (de === vers || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const t0 = performance.now();
    const pas = (t) => {
      if (!el.isConnected) return;
      const k = Math.min(1, (t - t0) / 520), e = 1 - (1 - k) ** 3;
      el.textContent = nbFr(Math.round(de + (vers - de) * e)) + fin;
      if (k < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }
  function potsParFormat() {
    const f = new Map();
    S.d.lots.forEach((l) => {
      const x = f.get(l.format_g) || { g: l.format_g, reste: 0, total: 0, prix: l.prix };
      x.reste += Number(l.pots_restants); x.total += Number(l.pots_initiaux || l.pots_restants); f.set(l.format_g, x);
    });
    return [...f.values()].filter((x) => x.total).sort((p, q) => q.g - p.g).slice(0, 3);
  }
  // Écran « clients » : complément de l'écran, appelé par src/domaines/ (IT-03).
  function completerClients() {
    const pots = potsParFormat(), wrap = document.querySelector(".wrap");
    const prec = S.alMiel || {}, suite = {};
    if (pots.length && wrap) {
      wrap.querySelector(".u-tuiles")?.insertAdjacentHTML("beforebegin", `<section class="al-pots" aria-label="Pots à vendre">${pots.map((p) => {
        const h = Math.round(p.reste / p.total * 100), av = prec["p" + p.g];
        suite["p" + p.g] = h;
        return `<button type="button" class="al-pot" data-act="newvente" aria-label="${p.reste} pots de ${p.g} g sur ${p.total}, nouvelle vente"><span class="al-couv"></span><span class="al-bocal"><i data-h="${h}" style="height:${av ?? 0}%"></i></span><b>${p.reste}</b><span class="small">${p.g} g, à ${esc(eur0(p.prix))}</span></button>`;
      }).join("")}</section>`);
      requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll(".al-bocal i").forEach((i) => { i.style.height = i.dataset.h + "%"; })));
    }
    document.querySelectorAll(".u-tuile b").forEach((b, i) => {
      const m = b.textContent.match(/^([\d\s\u202f\u00a0]+)(.*)$/);
      if (!m) return;
      const v = Number(m[1].replace(/\D/g, "")), fin = m[2];
      suite["t" + i] = v;
      if (prec["t" + i] !== undefined) compter(b, prec["t" + i], v, m[1].endsWith(" ") || m[1].endsWith("\u00a0") || m[1].endsWith("\u202f") ? "\u00a0" + fin : fin);
    });
    S.alMiel = suite;
  }
  // Vente : les clients récents à portée de pouce.
  // Écran « vente » : complément de l'écran, appelé par src/domaines/ (IT-03).
  function completerVente() {
    const champ = document.getElementById("s_client");
    if (!champ) return;
    const ids = [...new Set(S.d.ventes.map((v) => v.client_id))].slice(0, 3);
    const noms = ids.map((i) => byId(S.d.clients, i)).filter(Boolean);
    if (noms.length < 3) S.d.clients.forEach((c) => { if (noms.length < 3 && !noms.includes(c)) noms.push(c); });
    champ.closest("label").insertAdjacentHTML("beforebegin", `<div class="chips al-recents" role="group" aria-label="Clients récents">${noms.map((c) => `<button type="button" class="chip ${champ.value === c.id ? "on" : ""}" data-act="alclient" data-v="${c.id}">${esc(c.nom)}</button>`).join("")}</div>`);
  }
  ACT.alclient = (id) => {
    const c = document.getElementById("s_client");
    if (c) { c.value = id; c.dispatchEvent(new Event("change", { bubbles: true })); }
    document.querySelectorAll(".al-recents .chip").forEach((b) => b.classList.toggle("on", b.dataset.v === id));
  };

  return { compagnon, phrase, ruchesDe, vueRucher, completerAccueil, completerRuchers, completerFiche, completerClients, completerVente, meteoPrete: () => window.AL_meteoPrete() };
})();
