// Apiviz — écrans compacts (v5.35, maquettes du 13 nov. 2026).
//   - Menu latéral : il ne remonte plus en haut à chaque clic (sa position est gardée d'un écran à l'autre), il tient
//     sur un écran d'ordinateur, et « Nouvelle visite » se place à côté du bouton API.
//   - Accueil sur ordinateur : tout sur un écran, en trois colonnes (ruches, météo, à faire) ; chaque colonne défile
//     seule si besoin.
//   - Météo de l'accueil : les heures du jour sont visibles d'emblée sous les 5 jours ; un bouton « agrandir » ouvre le
//     détail heure par heure dans un panneau, à la place du lien souligné.
// Chargé après navigation.js : ses crochets de coquille passent après les siens. Le calendrier de l'agenda est dans
// agenda-mois.js, le sélecteur de date dans calendrier.js.
const CP = (() => {
  const ordinateur = matchMedia("(min-width:801px)");
  const ic = (d, t = 18) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const P = {
    agrandir: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
    fermer: "M6 6l12 12M18 6L6 18",
    sortir: "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3",
    plus: "M12 5v14M5 12h14",
    lieu: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  };

  // ---------- Menu latéral ----------
  let defilement = 0;
  Noyau.crochets.sur("avantCoquille", "compact", () => {
    const side = document.querySelector(".side");
    if (side) defilement = side.scrollTop;
  });
  Noyau.crochets.sur("apresCoquille", "compact", () => {
    const side = document.querySelector(".side");
    if (!side) return;
    // « Nouvelle visite » à côté du bouton API (l'ancien bouton +), sur une seule ligne.
    const api = side.querySelector(".nav[data-v=saisir]");
    if (api && ordinateur.matches && !side.querySelector(".cp-actions")) {
      const ligne = document.createElement("div");
      ligne.className = "cp-actions";
      ligne.innerHTML = `<button type="button" class="btn honey cp-visite" data-act="newvisite">${ic(P.plus, 16)}Nouvelle visite</button>`;
      api.before(ligne);
      ligne.append(api);
      api.setAttribute("aria-label", "API : que veux-tu faire ?");
      api.title = "API : que veux-tu faire ?";
    }
    // « Se déconnecter » : un bouton icône plutôt qu'un texte souligné.
    const sortir = side.querySelector(".me .link[data-act=logout]");
    if (sortir) {
      sortir.className = "cp-icone cp-sortir";
      sortir.setAttribute("aria-label", "Se déconnecter");
      sortir.title = "Se déconnecter";
      sortir.innerHTML = ic(P.sortir);
      side.querySelector(".me").append(sortir);
    }
    // Sélecteur d'année : flèches ‹ › de part et d'autre de la liste, pour passer d'une année à l'autre en un clic.
    document.querySelectorAll("label.yr select:not([data-cp-annee])").forEach((sel) => {
      sel.dataset.cpAnnee = "1";
      const autour = document.createElement("span");
      autour.className = "cp-annee";
      sel.before(autour);
      const bouton = (pas, lib, d) => `<button type="button" class="cp-icone" data-cp="annee" data-v="${pas}" aria-label="${lib}">${ic(d, 16)}</button>`;
      autour.innerHTML = bouton(-1, "Année précédente", "M15 6l-6 6 6 6");
      autour.append(sel);
      autour.insertAdjacentHTML("beforeend", bouton(1, "Année suivante", "M9 6l6 6-6 6"));
      const maj = () => autour.querySelectorAll("[data-cp=annee]").forEach((b) => { b.disabled = ![...sel.options].some((o) => Number(o.value) === Number(sel.value) + Number(b.dataset.v)); });
      maj();
    });
    // Même position qu'avant le clic ; l'entrée allumée reste en vue (petits écrans).
    side.scrollTop = defilement;
    const on = side.querySelector(".nav.on");
    if (on) {
      const a = on.getBoundingClientRect(), s = side.getBoundingClientRect();
      if (a.top < s.top || a.bottom > s.bottom) on.scrollIntoView({ block: "nearest" });
    }
  });

  // ---------- Météo de l'accueil ----------
  // Le bloc « Prochain créneau de visite » d'accueil.js garde ses 5 jours ; on y ajoute les heures du jour, visibles
  // d'emblée, et un bouton « agrandir » (panneau heure par heure) à la place du lien souligné « Voir heure par heure ».
  const etat = { jour: null, cle: null };
  const NIV = { 2: ["Favorable", "good"], 1: ["Rapide", "watch"] };
  const verdict = (x) => (x.n == null ? ["Hors créneau", ""] : NIV[x.n] || ["Défavorable", "crit"]);
  const nomJour = (t, auj, f = "short") => (t === auj ? "Aujourd’hui" : MT.nomJour(t, f).replace(/^./, (c) => c.toUpperCase()));

  function heures(m) {
    const jour = m.jours[0];
    const hs = jour.heures.filter((x) => jour.t !== m.auj || !x.passee || x.maintenant);
    if (!hs.length) return '<p class="small cp-hvide">Journée terminée : regarde demain.</p>';
    return `<div class="cp-hbloc"><p class="cp-htitre">${jour.t === m.auj ? "Aujourd’hui, heure par heure" : `${esc(nomJour(jour.t, m.auj, "long"))}, heure par heure`}</p>
      <div class="cp-heures">${hs.map((x) => `<div class="cp-h n${x.n ?? "x"}${x.maintenant ? " now" : ""}" title="${esc(verdict(x)[0])}">
        <span>${x.maintenant ? "Maint." : `${x.h} h`}</span>${MT.icone(x.code)}<b>${x.temp}°</b><small>${x.risque} %</small><u>${x.vent} km/h</u><em class="tag ${verdict(x)[1]}">${esc(verdict(x)[0])}</em><i aria-hidden="true"></i></div>`).join("")}</div></div>`;
  }
  function enrichirMeteo() {
    const b = document.getElementById("acCreneau");
    if (!b || b.dataset.cp) return;
    const lien = b.querySelector("[data-act=ermeteo]");
    const cle = lien?.dataset.v ?? etat.cle;
    if (cle == null) return;
    b.dataset.cp = "1"; b.classList.add("cp-meteo"); etat.cle = cle;
    lien?.remove();
    const m = MT.parHeure(cle, AL.ruchesDe(cle));
    b.querySelector(".u-entete")?.insertAdjacentHTML("beforeend", `<button type="button" class="cp-icone cp-agrandir" data-cp="mtiroir" aria-label="Météo heure par heure, en détail" title="Heure par heure, en détail"${m?.jours ? "" : " disabled"}>${ic(P.agrandir, 17)}</button>`);
    if (m?.jours) b.querySelector(".ac-jours")?.insertAdjacentHTML("afterend", heures(m));
  }

  // Panneau « heure par heure » (à droite sur ordinateur, en bas sur téléphone).
  function tiroir() {
    const cle = etat.cle, m = cle == null ? null : MT.parHeure(cle, AL.ruchesDe(cle));
    if (!m?.jours) return;
    let d = document.getElementById("cpTiroir");
    if (!d) {
      document.body.insertAdjacentHTML("beforeend", '<dialog id="cpTiroir" class="cp-tiroir" aria-label="Météo heure par heure"></dialog>');
      d = document.getElementById("cpTiroir");
      d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
    }
    const jour = m.jours.find((x) => x.t === etat.jour) || m.jours[0];
    const plage = jour.plages.find((q) => q.n === 2) || jour.plages.find((q) => q.n === 1);
    d.innerHTML = `<div class="cp-ttete"><div><h2>Météo heure par heure</h2><span class="small">${esc(UX.nomRucher(cle))}</span></div>
        <button type="button" class="cp-icone" data-cp="tfermer" aria-label="Fermer">${ic(P.fermer, 20)}</button></div>
      <div class="cp-tjours" role="tablist">${m.jours.map((x) => `<button type="button" role="tab" data-cp="tjour" data-v="${x.t}" aria-selected="${x.t === jour.t}"><span>${esc(nomJour(x.t, m.auj, "long"))}</span><b>${x.max}°</b></button>`).join("")}</div>
      ${plage ? `<p class="cp-tplage n${plage.n}">${plage.n === 2 ? "Bon créneau" : "Visite rapide possible"} : <b>${plage.debut} h – ${plage.fin} h</b></p>` : '<p class="cp-tplage">Pas de créneau pour ouvrir ce jour-là.</p>'}
      <div class="cp-tlignes" role="table" aria-label="Heure par heure">
        <div class="cp-tl cp-tl-t" role="row"><span role="columnheader">Heure</span><span role="columnheader"></span><span role="columnheader">Temp.</span><span role="columnheader">Pluie</span><span role="columnheader">Vent</span><span role="columnheader">Visite</span></div>
        ${jour.heures.map((x) => { const [v, c] = verdict(x); return `<div class="cp-tl${x.maintenant ? " now" : ""}${x.passee && !x.maintenant ? " passee" : ""}" role="row">
          <span role="cell">${x.maintenant ? "Maint." : `${x.h} h`}</span><span role="cell">${MT.icone(x.code)}</span><span role="cell"><b>${x.temp}°</b></span>
          <span role="cell" class="cp-pluie"><i style="--p:${x.risque}%"></i>${x.risque} %</span><span role="cell">${x.vent} km/h</span>
          <span role="cell"><span class="tag ${c}">${esc(v)}</span></span></div>`; }).join("")}
      </div>
      <div class="cp-tpied"><button type="button" class="btn" data-act="ermeteo" data-v="${esc(cle)}">Ouvrir la page météo</button></div>`;
    if (!d.open) d.showModal();
  }

  // ---------- Accueil sur ordinateur : trois colonnes, un seul écran ----------
  function accueil() {
    const wrap = document.querySelector(".wrap.ac");
    if (!wrap) return;
    wrap.classList.add("cp");
    enrichirMeteo();
    if (!ordinateur.matches) return;
    const cols = wrap.querySelector(".ac-cols");
    if (!cols) return;
    const [g, dr] = cols.children;
    const milieu = document.createElement("div");
    milieu.className = "ac-col cp-milieu";
    const meteo = document.getElementById("acCreneau");
    if (meteo) milieu.append(meteo);
    g?.after(milieu);
    cols.classList.add("cp-trois");
    // Ce qui suivait sous les colonnes (astuce, prise en main…) passe au bas de la colonne de droite.
    let x = cols.nextElementSibling;
    while (x) { const suivant = x.nextElementSibling; dr?.append(x); x = suivant; }
    ajuster();
  }
  // Les colonnes prennent la hauteur restante de la fenêtre et défilent chacune de leur côté.
  function ajuster() {
    const cols = document.querySelector(".wrap.cp .ac-cols.cp-trois");
    if (!cols) return;
    const haut = cols.getBoundingClientRect().top + window.scrollY;
    cols.style.height = ordinateur.matches ? `${Math.max(380, window.innerHeight - haut - 20)}px` : "";
  }
  addEventListener("resize", () => { if (S.route === "dash") ajuster(); });

  Noyau.crochets.sur("apresRendu", "compact", () => {
    if (S.route === "dash" && S.d) accueil();
    if (S.route !== "dash") document.getElementById("cpTiroir")?.close();
  });
  // Quand la météo arrive : le bloc se redessine (accueil.js réécrit l'ancien bloc juste avant).
  const meteoAvant = window.AL_meteoPrete;
  window.AL_meteoPrete = () => { meteoAvant?.(); enrichirMeteo(); };

  // ---------- Gestes (attributs data-cp : navigation seulement, permise à tous les rôles) ----------
  document.addEventListener("click", (e) => {
    const b = e.target.closest?.("[data-cp]");
    if (!b || b.tagName === "SELECT") return;
    const v = b.dataset.v, a = b.dataset.cp;
    if (a === "mtiroir") tiroir();
    else if (a === "tjour") { etat.jour = v; tiroir(); }
    else if (a === "tfermer") document.getElementById("cpTiroir")?.close();
    else if (a === "annee") {
      const sel = b.parentElement.querySelector("select"), cible = String(Number(sel.value) + Number(v));
      if ([...sel.options].some((o) => o.value === cible)) { sel.value = cible; sel.dispatchEvent(new Event("change", { bubbles: true })); }
    }
  });
  return { tiroir, ic };
})();
