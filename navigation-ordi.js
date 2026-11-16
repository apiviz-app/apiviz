// Apiviz — navigation sur ordinateur et recherche Ctrl K (v5.50, maquettes validées le 16 nov. 2026).
//   - Menu latéral : bouton « Replier » (menu de 256 px ou rail d'icônes de 76 px, choix gardé sur l'appareil),
//     « Nouvelle visite » seule en tête, compteurs utiles (Agenda : tâches du jour ou en retard ; Ruchers : colonies à
//     voir), titres de catégorie discrets, compte en bas avec le prénom et l'exploitation.
//   - Barre du haut : le bouton API (« Demander à API ») quitte le menu ; la recherche devient un bouton qui ouvre une
//     fenêtre au centre de l'écran.
//   - Recherche : fenêtre (dialog) dont le champ garde la main pendant la saisie. Vide : colonies ouvertes récemment et
//     actions rapides. En tapant : résultats rangés par type (V3.chercher), filtre par type, mot surligné ; ↑ ↓, Entrée,
//     Échap. Corrige la v5.32 : le voile de la barre passait au-dessus du champ et le clic suivant la refermait.
// Téléphone : rien ne change (volet par la droite, écran Rechercher). Chargé après compact.js : ses crochets de coquille
// passent après ceux de navigation.js et de compact.js. S'appuie sur app.js (S, ACT, esc, icon, $sheet), v3.js (V3).
const NO = (() => {
  const ordinateur = matchMedia("(min-width:801px)");
  const ic = (d, t = 20) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const P = {
    panneau: "M4 4h16v16H4zM9 4v16",
    loupe: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
    ruche: "M12 2.5 20.5 7.5v9L12 21.5 3.5 16.5v-9z",
    personne: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6",
    pot: "M8 3h8M7 6h10l1 3v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9z",
    boite: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
    camion: "M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    recu: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
    euro: "M17 6.5A7 7 0 1 0 17 17.5M4 10h9M4 14h9",
    note: "M5 4h14v12l-4 4H5zM9 9h6M9 13h4",
    tache: "M4 12l5 5L20 6",
    fleche: "M5 12h14M13 6l6 6-6 6",
    plus: "M12 5v14M5 12h14",
  };
  const ICONES = { Ruches: P.ruche, "Ouvertes récemment": P.ruche, Clients: P.personne, Lots: P.pot, "Matériel": P.boite, Fournisseurs: P.camion,
    "Dépenses": P.recu, Ventes: P.euro, "Notes de visite": P.note, "Tâches": P.tache, "Aller à": P.fleche, Actions: P.plus, "Actions rapides": P.plus };

  // ---------- Menu replié ----------
  const CLE = "apiviz-menu-replie";
  let replie = false;
  try { replie = localStorage.getItem(CLE) === "1"; } catch { /* navigation privée */ }
  const appliquer = () => document.documentElement.classList.toggle("menu-replie", replie && ordinateur.matches);
  appliquer();
  ordinateur.addEventListener?.("change", appliquer);
  ACT.noreplier = () => {
    replie = !replie;
    try { localStorage.setItem(CLE, replie ? "1" : "0"); } catch { /* navigation privée */ }
    appliquer();
    const b = document.querySelector(".no-replier");
    if (b) { const t = replie ? "Déplier le menu" : "Replier le menu"; b.setAttribute("aria-label", t); b.title = t; b.setAttribute("aria-expanded", String(!replie)); }
    window.dispatchEvent(new Event("resize")); // tableau des ruches, colonnes de l'accueil
  };

  // ---------- Compteurs ----------
  const aujourdhui = () => new Date().toLocaleDateString("sv"); // AAAA-MM-JJ, heure locale
  const nbTaches = () => (S.d?.taches || []).filter((x) => !x.faite && x.echeance && String(x.echeance).slice(0, 10) <= aujourdhui()).length;
  const nbAVoir = () => (window.Noyau?.ruches?.nbAVoir ? Noyau.ruches.nbAVoir() : 0);

  // ---------- Après chaque écran ----------
  Noyau.crochets.sur("apresCoquille", "navigation-ordi", () => {
    const side = document.querySelector(".side");
    if (!side) return;
    appliquer();
    // Logo et bouton « Replier ».
    const brand = side.querySelector(".brand");
    if (brand && !brand.querySelector(".no-replier")) {
      const t = replie ? "Déplier le menu" : "Replier le menu";
      brand.insertAdjacentHTML("beforeend", `<button type="button" class="no-replier" data-act="noreplier" aria-label="${t}" title="${t}" aria-expanded="${!replie}">${ic(P.panneau)}</button>`);
    }
    // Le bouton API passe dans la barre du haut (« Demander à API »).
    const api = side.querySelector(".nav[data-v=saisir]"), entete = document.querySelector(".nl-entete");
    if (api && entete) {
      api.classList.add("no-api");
      api.setAttribute("aria-label", "Demander à API : que veux-tu faire ?");
      api.title = "API : que veux-tu faire ?";
      [...api.childNodes].filter((x) => x.nodeType === 3).forEach((x) => x.remove());
      if (!api.querySelector(".no-lib")) api.insertAdjacentHTML("beforeend", '<span class="no-lib">Demander à API</span>');
      const cloche = entete.querySelector(".er-cloche");
      cloche ? cloche.before(api) : entete.append(api);
    }
    // Recherche : un bouton qui ouvre la fenêtre, à la place du champ (l'ancienne barre reste pour le téléphone).
    if (entete && !entete.querySelector(".no-chercher")) {
      entete.querySelector(".er-barre")?.remove();
      entete.insertAdjacentHTML("afterbegin", `<button type="button" class="no-chercher" data-act="nochercher" aria-haspopup="dialog" aria-keyshortcuts="Control+K">${ic(P.loupe, 18)}<span>Rechercher une ruche, un client, un achat…</span><kbd>Ctrl K</kbd></button><span class="no-espace"></span>`);
    }
    // Libellés dans un <span> (cachés quand le menu est replié ; l'infobulle et le nom accessible restent).
    side.querySelectorAll(".nav[data-v], .cp-visite").forEach((b) => {
      if (b.querySelector(".no-lib")) return;
      const txt = [...b.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent).join("").trim();
      if (!txt) return;
      [...b.childNodes].filter((x) => x.nodeType === 3).forEach((x) => x.remove());
      b.insertAdjacentHTML("beforeend", `<span class="no-lib">${esc(txt)}</span>`);
      b.title = txt;
    });
    // Compteurs utiles.
    const compteur = (route, n, texte, classe) => {
      const b = side.querySelector(`.nav[data-v="${route}"]`);
      if (!b || !n) return;
      b.insertAdjacentHTML("beforeend", `<span class="no-nb${classe}" aria-hidden="true">${texte}</span>`);
      b.setAttribute("aria-label", `${b.title}, ${texte}`);
    };
    compteur("agenda", nbTaches(), String(nbTaches()), "");
    const av = nbAVoir();
    compteur("ruches", av, `${av} à voir`, " crit");
    // Compte : prénom et exploitation plutôt que l'adresse.
    const me = side.querySelector(".me"), mail = S.session?.user?.email || "";
    const texte = me?.querySelector(".avatar + span");
    if (texte && !me.querySelector(".no-qui")) {
      let prenom = "";
      try { prenom = String(localStorage.getItem(`apiviz-prenom-${mail}`) || "").trim(); } catch { /* navigation privée */ }
      const expl = typeof cfg == "function" ? cfg().nom || "" : "";
      texte.classList.add("no-qui");
      texte.innerHTML = `<b title="${esc(mail)}">${esc(prenom || mail)}</b><span>${esc(expl || (prenom ? mail : "Mon compte"))}</span>`;
      me.querySelector(".avatar")?.setAttribute("title", prenom || mail);
    }
  });

  // ---------- Recherche Ctrl K ----------
  const PAGES = [["Bilan", "pilotage"], ["Dépenses", "compta"], ["Budget", "previsions"], ["Stock matériel", "materiel"], ["Fournisseurs", "fournisseurs"], ["Membres", "membres"],
    ["Agenda et tâches", "agenda"], ["Carte des ruchers", "carte"], ["Activité récente", "activite"], ["Réglages et exports", "reglages"]];
  const RAPIDES = [["Nouvelle visite", "Choisir une ou plusieurs ruches", "newvisite"], ["Ajouter une dépense", "Achat, carburant, traitement…", "newdepense"],
    ["Nouvelle vente", "Pots, client, encaissement", "newvente"], ["Ajouter des ruches", "Une ou plusieurs d’un coup", "newruches"]];
  const etat = { q: "", portee: "Tout", sel: 0 };
  const plat = (x) => (typeof V3 != "undefined" ? V3.plat(x) : String(x || "").toLowerCase());
  const surligne = (x, q) => {
    const texte = String(x ?? ""), t = plat(q).trim(), i = t ? plat(texte).indexOf(t) : -1;
    return i < 0 ? esc(texte) : `${esc(texte.slice(0, i))}<mark>${esc(texte.slice(i, i + t.length))}</mark>${esc(texte.slice(i + t.length))}`;
  };
  const lecteur = () => document.documentElement.classList.contains("lecteur");

  function groupes() {
    const q = etat.q.trim();
    if (!q) {
      const ids = typeof V3 != "undefined" && V3.recents ? V3.recents() : [];
      const r = ids.map((id) => (S.d?.ruches || []).find((x) => x.id === id)).filter(Boolean).slice(0, 4)
        .map((x) => ({ t: x.nom, s: [x.code ? "n° " + x.code : "", x.rucher].filter(Boolean).join(" · "), act: "ruche", v: x.id }));
      const a = lecteur() ? [] : RAPIDES.filter(([, , act]) => typeof ACT[act] == "function").map(([t, s, act]) => ({ t, s, act, v: "" }));
      return [["Ouvertes récemment", r], ["Actions rapides", a]].filter(([, l]) => l.length);
    }
    if (typeof V3 == "undefined" || !V3.assezLong(q)) return null;
    const l = [...V3.chercher(q)];
    const pages = PAGES.filter(([x]) => plat(x).includes(plat(q))).map(([x, v]) => ({ t: x, s: "Écran", act: "go", v }));
    if (pages.length) l.push(["Aller à", pages]);
    if (!lecteur() && typeof ACT.erdepense == "function") l.push(["Actions", [{ t: `Ajouter une dépense « ${q} »`, s: "", act: "erdepense", v: q }]]);
    return l;
  }

  function dessiner() {
    const d = document.getElementById("noRecherche");
    if (!d) return;
    const q = etat.q.trim(), gs = groupes(), res = d.querySelector(".no-p-liste"), portees = d.querySelector(".no-p-portees");
    d.querySelector(".no-p-effacer").hidden = !etat.q;
    if (gs === null) {
      portees.hidden = true;
      res.innerHTML = '<p class="no-p-aide">Tape un numéro de ruche ou au moins 2 lettres : ruche, client, lot, matériel, dépense, mot d’une note…</p>';
      d.querySelector(".no-p-resume").textContent = "";
      return;
    }
    // Portées : seulement quand on cherche, avec le nombre de résultats de chaque type.
    const types = q ? gs.filter(([g]) => g !== "Actions") : [];
    if (etat.portee !== "Tout" && !types.some(([g]) => g === etat.portee)) etat.portee = "Tout";
    portees.hidden = types.length < 2;
    const total = types.reduce((s, [, l]) => s + l.length, 0);
    portees.innerHTML = [["Tout", total], ...types.map(([g, l]) => [g, l.length])].map(([g, n]) =>
      `<button type="button" class="no-p-portee" data-no="portee" data-v="${esc(g)}" aria-pressed="${etat.portee === g}">${esc(g)} <span>${n}</span></button>`).join("");
    const vus = etat.portee === "Tout" ? gs : gs.filter(([g]) => g === etat.portee);
    let k = 0;
    const html = vus.map(([g, l]) => {
      const max = etat.portee === "Tout" ? 5 : 30, plus = l.length - max;
      return `<div class="no-p-groupe" role="group" aria-label="${esc(g)}"><h3>${esc(g)}${q && g !== "Actions" ? ` · ${l.length}` : ""}</h3>${l.slice(0, max).map((x) => {
        const i = k++;
        return `<button type="button" class="no-r${i === etat.sel ? " sel" : ""}" data-act="${esc(x.act)}" data-v="${esc(x.v)}" data-i="${i}" id="noR${i}" role="option" aria-selected="${i === etat.sel}">
          <span class="no-r-ic g-${esc(plat(g).replace(/[^a-z]+/g, "-"))}">${ic(ICONES[g] || P.fleche, 18)}</span>
          <span class="no-r-t"><b>${surligne(x.t, q)}</b>${x.s ? `<span>${surligne(x.s, q)}</span>` : ""}</span><kbd class="no-r-entree">Entrée</kbd></button>`;
      }).join("")}${plus > 0 ? `<button type="button" class="no-p-tout" data-no="portee" data-v="${esc(g)}">Voir les ${l.length} ${esc(g.toLowerCase())}</button>` : ""}</div>`;
    }).join("");
    res.innerHTML = html || `<div class="no-p-vide"><b>Aucun résultat pour « ${esc(q)} »</b><span>Essaie un numéro de ruche (12), le nom d’un client, un lot ou un mot d’une note de visite.</span></div>`;
    if (etat.sel >= k) etat.sel = Math.max(0, k - 1);
    d.querySelector("#noQ").setAttribute("aria-activedescendant", k ? `noR${etat.sel}` : "");
    d.querySelector(".no-p-resume").textContent = q ? `${total} résultat${total > 1 ? "s" : ""}` : "Ruches, clients, lots, matériel, dépenses, notes";
  }

  function choisir(i) {
    const d = document.getElementById("noRecherche"), l = [...d.querySelectorAll(".no-r")];
    if (!l.length) return;
    l[etat.sel]?.classList.remove("sel"); l[etat.sel]?.setAttribute("aria-selected", "false");
    etat.sel = (i + l.length) % l.length;
    l[etat.sel].classList.add("sel"); l[etat.sel].setAttribute("aria-selected", "true");
    l[etat.sel].scrollIntoView({ block: "nearest" });
    d.querySelector("#noQ").setAttribute("aria-activedescendant", l[etat.sel].id);
  }

  function fenetre() {
    let d = document.getElementById("noRecherche");
    if (d) return d;
    document.body.insertAdjacentHTML("beforeend", `<dialog id="noRecherche" class="no-palette" aria-label="Rechercher">
      <div class="no-p-champ">${ic(P.loupe, 20)}<input id="noQ" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" role="combobox" aria-expanded="true" aria-controls="noRes" aria-label="Rechercher" placeholder="Numéro de ruche, client, lot, matériel, mot d’une note…">
        <button type="button" class="no-p-effacer" data-no="effacer" hidden>Effacer</button><kbd>Échap</kbd></div>
      <div class="no-p-portees" role="group" aria-label="Chercher dans" hidden></div>
      <div class="no-p-liste" id="noRes" role="listbox" aria-label="Résultats"></div>
      <p class="no-p-pied"><span><kbd>↑</kbd><kbd>↓</kbd> Parcourir</span><span><kbd>Entrée</kbd> Ouvrir</span><span><kbd>Échap</kbd> Fermer</span><span class="no-p-resume"></span></p>
    </dialog>`);
    d = document.getElementById("noRecherche");
    const i = d.querySelector("#noQ");
    i.addEventListener("input", () => { etat.q = i.value; etat.sel = 0; dessiner(); });
    i.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); choisir(etat.sel + (e.key === "ArrowDown" ? 1 : -1)); }
      else if (e.key === "Enter") { e.preventDefault(); d.querySelectorAll(".no-r")[etat.sel]?.click(); }
    });
    // Échap : vide d'abord le champ, puis ferme.
    d.addEventListener("cancel", (e) => { if (etat.q) { e.preventDefault(); etat.q = ""; i.value = ""; etat.sel = 0; dessiner(); } });
    d.addEventListener("click", (e) => {
      if (e.target === d) { fermer(); return; } // clic à côté de la fenêtre
      const b = e.target.closest?.("[data-no]");
      if (b?.dataset.no === "portee") { etat.portee = b.dataset.v; etat.sel = 0; dessiner(); i.focus(); return; }
      if (b?.dataset.no === "effacer") { etat.q = ""; i.value = ""; etat.sel = 0; dessiner(); i.focus(); return; }
      // Un résultat : la fenêtre se ferme, l'action (data-act) est lancée par le gestionnaire d'app.js.
      if (e.target.closest?.(".no-r")) { etat.q = ""; i.value = ""; fermer(); }
    });
    d.addEventListener("mousemove", (e) => { const r = e.target.closest?.(".no-r"); if (r && Number(r.dataset.i) !== etat.sel) choisir(Number(r.dataset.i)); });
    return d;
  }
  function ouvrir() {
    if (typeof $sheet != "undefined" && $sheet.open) return;
    if (!ordinateur.matches) { ACT.go("recherche"); return; }
    const d = fenetre(), i = d.querySelector("#noQ");
    i.value = etat.q; etat.sel = 0; etat.portee = "Tout";
    dessiner();
    if (!d.open) d.showModal();
    i.focus(); i.select();
  }
  function fermer() { const d = document.getElementById("noRecherche"); if (d?.open) d.close(); }
  ACT.nochercher = () => ouvrir();
  // Ctrl K (⌘ K) sur ordinateur : la fenêtre, avant le raccourci de la v5.32 (ergonomie.js).
  window.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "k" || !ordinateur.matches) return;
    e.preventDefault(); e.stopImmediatePropagation();
    document.getElementById("noRecherche")?.open ? fermer() : ouvrir();
  }, true);

  return { ouvrir, fermer };
})();
