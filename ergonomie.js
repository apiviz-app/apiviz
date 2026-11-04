// Apidoo — ergonomie : Gestion en blocs, barre de recherche, fenêtres qui se ferment au clic à côté,
// brouillons, annulation, retour au même endroit, filtres mémorisés, raccourcis clavier.
// Chargé en dernier. S'appuie sur app.js, UX, V3, N4 et, s'il est là, EX. Styles : fin de index.html.
const ER = (() => {
  const U = UX;
  const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };

  // ---------- Filtres mémorisés ----------
  const FILTRES = ["venteFiltre", "lentille", "erDepense"];
  FILTRES.forEach((k) => { const v = memo("apidoo-filtre-" + k); if (v) S[k] = v; });
  document.addEventListener("click", () => setTimeout(() => FILTRES.forEach((k) => { if (S[k]) memo("apidoo-filtre-" + k, S[k]); }), 0));

  // ---------- Gestion en blocs ----------
  const chevron = '<svg class="g-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  const bloc = (route, titre, valeur, sous, bas = "", cl = "") => `<button type="button" class="n4-g g-bloc" data-act="go" data-v="${route}">
    <span class="g-t">${esc(titre)}${chevron}</span><b class="g-val ${cl}">${esc(valeur)}</b><span class="small">${esc(sous)}</span><span class="g-bas">${bas}</span></button>`;
  const jauge = (pct, cl = "") => `<span class="g-jauge" aria-hidden="true"><i class="${cl}" style="width:${Math.max(0, Math.min(100, pct))}%"></i></span>`;
  function barresMois() {
    const auj = new Date(), mois = [...Array(6)].map((_, i) => { const x = new Date(auj.getFullYear(), auj.getMonth() - 5 + i, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; });
    const t = mois.map((m) => sum(S.d.depenses.filter((x) => String(x.date_depense).startsWith(m)), (x) => x.montant)), max = Math.max(...t, 1);
    return `<span class="g-barres" aria-hidden="true">${t.map((v, i) => `<i class="${i === 5 ? "on" : ""}" style="height:${Math.max(6, Math.round(v / max * 100))}%"></i>`).join("")}</span>`;
  }
  const signe = (v) => (v > 0 ? "+" : "") + eur0(v);
  window.viewPlus = function () {
    const d = S.d, an = new Date().getFullYear(), f = fin(an), bilan = f.resultat;
    const mois = today().slice(0, 7), depMois = sum(d.depenses.filter((x) => String(x.date_depense).startsWith(mois)), (x) => x.montant);
    const bas = d.articles.filter((a) => a.type !== "Équipement" && Number(a.seuil) > 0 && Number(a.stock) <= Number(a.seuil));
    const prevu = sum((d.budgets || []).filter((b) => Number(b.annee) === an), (b) => b.montant);
    const der = d.depenses[0], achat = d.depenses.find((x) => x.fournisseur_id);
    const reste = f.ca > 0 ? Math.round(bilan / f.ca * 100) : 0;
    const blocs = [
      bloc("pilotage", `Bilan ${an}`, signe(bilan), `${eur0(f.ca)} de ventes, ${eur0(f.charges)} de dépenses`,
        reste > 0 ? `${jauge(reste, "vert")}<span class="small">${reste} % des ventes restent après les dépenses</span>` : "", bilan > 0 ? "good" : ""),
      bloc("compta", "Dépenses", eur0(depMois), `ce mois${der ? `, dernière : ${U.quand(der.date_depense).toLowerCase()}` : ""}`, barresMois()),
      prevu > 0 ? bloc("previsions", `Budget ${an}`, `${Math.round(f.charges / prevu * 100)} %`, `${eur0(f.charges)} dépensés sur ${eur0(prevu)} prévus`,
        `${jauge(f.charges / prevu * 100)}<span class="small">${f.charges <= prevu ? `${eur0(prevu - f.charges)} restants` : `Dépassé de ${eur0(f.charges - prevu)}`}</span>`)
        : bloc("previsions", `Budget ${an}`, "À définir", "Pas encore de budget pour cette année"),
      bloc("materiel", "Stock matériel", bas.length ? `${bas.length} à racheter` : "À jour", U.pluriel(d.articles.length, "article") + " suivi" + (d.articles.length > 1 ? "s" : ""),
        bas.length ? `<span class="u-chip watch">${esc(bas[0].nom)} : stock bas${bas.length > 1 ? ` (+${bas.length - 1})` : ""}</span>` : ""),
      bloc("fournisseurs", "Fournisseurs", U.pluriel(d.fournisseurs.length, "contact"), d.fournisseurs.slice(0, 2).map((x) => x.nom).join(", ") || "Aucun pour l’instant",
        achat ? `<span class="small">Dernier achat : ${esc(U.quand(achat.date_depense).toLowerCase())}, ${esc(eur0(achat.montant))}</span>` : ""),
      ...(typeof EX != "undefined" ? [bloc("membres", "Équipe", "Membres", "Inviter, gérer").replace('class="n4-g g-bloc"', 'class="n4-g g-bloc" id="gEquipe"')] : []),
    ].join("");
    const phraseBilan = bilan > 0 ? `Bilan positif de ${eur0(bilan)}.` : bilan < 0 ? `Bilan négatif de ${eur0(-bilan)}.` : "Bilan à l’équilibre.";
    const phraseStock = bas.length === 1 ? "Un article est à racheter." : bas.length ? `${bas.length} articles sont à racheter.` : "Le matériel est à jour.";
    shell("Gestion", cfg().nom, '<button type="button" class="btn main" data-act="newdepense">Ajouter une dépense</button>', `<div class="n4-grille g-blocs">${blocs}</div>`);
    const h1 = document.querySelector(".wrap > .head h1");
    if (h1) { h1.textContent = `${phraseBilan} ${phraseStock}`; h1.setAttribute("aria-label", `Gestion. ${phraseBilan} ${phraseStock}`); h1.closest(".head").classList.add("g-tete"); }
    if (typeof EX != "undefined") equipe();
  };
  function equipe() {
    const montrer = () => {
      const b = document.getElementById("gEquipe"), m = EX.membres?.() || [];
      if (!b || !m.length) return;
      b.querySelector(".g-val").textContent = U.pluriel(m.length, "membre");
      b.querySelector(".g-bas").innerHTML = `<span class="g-av" aria-hidden="true">${m.slice(0, 5).map((x) => `<i>${esc(String(x.email || x.prenom || "?")[0].toUpperCase())}</i>`).join("")}</span>`;
    };
    montrer();
    if (!(EX.membres?.() || []).length) Promise.resolve(EX.charger?.()).then(montrer).catch(() => {});
  }

  // ---------- Dépenses : chiffres et filtre par poste ----------
  const comptaAvant = window.viewCompta;
  window.viewCompta = function () {
    comptaAvant();
    const d = S.d, f = fin(S.annee), table = document.querySelector(".wrap .card.tbl");
    if (!table) return;
    const mois = today().slice(0, 7), depMois = sum(d.depenses.filter((x) => String(x.date_depense).startsWith(mois)), (x) => x.montant);
    const prevu = sum((d.budgets || []).filter((b) => Number(b.annee) === S.annee), (b) => b.montant);
    const chiffres = [["Ce mois", eur0(depMois)], [`En ${S.annee}`, eur0(f.charges)], ...(prevu > 0 ? [["Reste au budget", eur0(prevu - f.charges)]] : [])];
    const postes = [...new Set(f.dep.map((x) => x.categorie))];
    if (!postes.includes(S.erDepense)) S.erDepense = "Tout";
    const puces = postes.length > 1 ? `<div class="u-puces er-puces" role="group" aria-label="Filtrer par poste">${["Tout", ...postes].map((p) => `<button type="button" class="${S.erDepense === p ? "on" : ""}" aria-pressed="${S.erDepense === p}" data-act="erposte" data-v="${esc(p)}">${esc(p)}</button>`).join("")}</div>` : "";
    table.insertAdjacentHTML("beforebegin", `<section class="ab-chiffres er-c${chiffres.length}" aria-label="Chiffres des dépenses">${chiffres.map(([l, v]) => `<div class="ab-chiffre"><span class="small">${esc(l)}</span><b>${esc(v)}</b></div>`).join("")}</section>${puces}`);
    filtrerPostes();
  };
  function filtrerPostes() {
    document.querySelectorAll(".wrap .card.tbl tbody tr").forEach((tr) => { tr.hidden = S.erDepense !== "Tout" && tr.children[2]?.textContent !== S.erDepense; });
  }
  ACT.erposte = (p) => { S.erDepense = p; window.viewCompta(); };

  // ---------- Saisie : préremplissage, enregistrement visible, ajouter une autre ----------
  const RETENUS = ["categorie", "fournisseur_id", "mode", "rucher"];
  const sheetAvant = window.sheet;
  window.sheet = function (o) {
    const cree = !o.del, cle = "apidoo-saisie-" + o.title, garde = cree ? JSON.parse(memo(cle) || "{}") : {};
    const fields = o.fields.map((c) => {
      const v = garde[c.name];
      const ok = RETENUS.includes(c.name) && v != null && v !== "" && (c.type !== "select" || c.options.some((x) => String(Array.isArray(x) ? x[0] : x) === String(v)));
      const pre = cree && S.erPrefill && c.name in S.erPrefill;
      return pre ? { ...c, value: S.erPrefill[c.name] } : ok ? { ...c, value: v } : c;
    });
    S.erPrefill = null;
    const encore = cree && o.title === "Ajouter une dépense";
    sheetAvant({ ...o, fields, submit: async (valeurs) => {
      const b = $sheetForm.querySelector(".btn.main"), avant = b?.textContent;
      if (b) { b.textContent = "Enregistrement…"; b.setAttribute("aria-busy", "true"); }
      try {
        await o.submit(valeurs);
        if (cree) memo(cle, JSON.stringify(Object.fromEntries(RETENUS.filter((k) => k in valeurs).map((k) => [k, valeurs[k]]))));
        if (autre) { autre = false; setTimeout(() => ACT.newdepense(), 0); }
      } catch (e) {
        autre = false;
        if (b) { b.textContent = avant; b.removeAttribute("aria-busy"); }
        throw e;
      }
    } });
    if (encore) $sheetForm.querySelector(".actions")?.insertAdjacentHTML("afterend", '<button type="button" class="link er-autre" data-act="erautre">Enregistrer et en ajouter une autre</button>');
  };
  let autre = false;
  ACT.erautre = () => { autre = true; $sheetForm.requestSubmit(); };
  ACT.erdepense = (libelle) => depenseForm(null, { libelle });

  // ---------- Supprimer, avec Annuler ----------
  let ligne = null;
  document.addEventListener("click", (e) => { if (!$sheet.open) ligne = e.target.closest?.("tr, .u-todo, .n4-ligne, article") || null; }, true);
  ACT.sheetdel = () => { const del = sheet.del; if (del) N4.plusTard(null, "Supprimé", del, ligne); };

  // ---------- Fenêtres : clic à côté, Échap, croix, brouillon ----------
  let reference = "", repris = false, brouillon = null;
  const champs = () => [...$sheetForm.elements].filter((c) => c.name && c.type !== "file" && c.type !== "submit" && c.type !== "button");
  const lire = () => champs().map((c) => (c.type === "checkbox" || c.type === "radio" ? c.checked : c.value));
  const etat = () => JSON.stringify(lire());
  const marquer = () => { if (!repris) reference = etat(); };
  new MutationObserver(marquer).observe($sheetForm, { childList: true });
  const ouvrir = $sheet.showModal.bind($sheet);
  $sheet.showModal = () => { ouvrir(); marquer(); };
  function fermerDoux() {
    if (!$sheet.open || $sheetForm.querySelector("[aria-busy=true]")) return;
    if (champs().length && etat() !== reference) {
      brouillon = { html: $sheetForm.innerHTML, envoi: $sheetForm.onsubmit, del: sheet.del, valeurs: lire() };
      pastille();
    }
    repris = false;
    $sheet.close();
  }
  function pastille() {
    document.querySelector(".er-brouillon")?.remove();
    if (!brouillon) return;
    document.body.insertAdjacentHTML("beforeend", '<div class="er-brouillon" role="status"><span>Saisie gardée en brouillon</span><button type="button" class="link" data-act="erreprendre">Reprendre</button><button type="button" class="er-oubli" data-act="eroublier" aria-label="Oublier le brouillon">×</button></div>');
  }
  ACT.eroublier = () => { brouillon = null; pastille(); };
  ACT.erreprendre = () => {
    const b = brouillon;
    if (!b) return;
    brouillon = null; pastille();
    repris = true;
    $sheetForm.innerHTML = b.html;
    $sheetForm.onsubmit = b.envoi;
    sheet.del = b.del;
    champs().forEach((c, i) => { if (c.type === "checkbox" || c.type === "radio") c.checked = b.valeurs[i]; else c.value = b.valeurs[i]; });
    $sheet.showModal();
    // Reprise : la saisie reste à garder tant qu'elle n'est pas enregistrée.
    reference = null;
    setTimeout(() => { repris = false; }, 0);
  };
  $sheet.addEventListener("close", () => { reference = ""; });
  $sheet.addEventListener("cancel", (e) => { e.preventDefault(); fermerDoux(); });
  $sheet.insertAdjacentHTML("beforeend", '<button type="button" class="er-croix" aria-label="Fermer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>');
  $sheet.querySelector(".er-croix").addEventListener("click", fermerDoux);
  // Clic sur l'arrière-plan : le geste doit commencer et finir hors de la fenêtre (sélection de texte, glissé).
  const horsCadre = (d, e) => { const r = d.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
  let debutHors = false;
  document.addEventListener("pointerdown", (e) => { debutHors = e.target.matches?.("dialog[open]") && horsCadre(e.target, e); }, true);
  document.addEventListener("click", (e) => {
    const d = e.target;
    if (!d.matches?.("dialog[open]") || !debutHors || !horsCadre(d, e)) return;
    if (d === $sheet) fermerDoux(); else d.close();
  });

  // ---------- Lignes de tableau entièrement cliquables ----------
  document.addEventListener("click", (e) => {
    const tr = e.target.closest?.("tbody tr");
    if (!tr || e.target.closest("a, button, input, select, textarea, label")) return;
    tr.querySelector("[data-act]")?.click();
  });

  // ---------- Écrans vides qui proposent l'action ----------
  const VIDES = [["Aucun client", "Ajouter un client", "newclient"], ["Aucune dépense", "Ajouter une dépense", "newdepense"], ["Aucun lot", "Créer un lot", "newlot"],
    ["Aucune récolte", "Saisir une récolte", "newrecolte"], ["Aucune vente", "Enregistrer une vente", "newvente"], ["Aucune visite", "Nouvelle visite", "newvisite"],
    ["Aucun consommable", "Ajouter un article", "newarticle"], ["Aucun équipement", "Ajouter un article", "newarticle"], ["Aucune tâche", "Ajouter une tâche", "newtache"]];
  function videsUtiles() {
    document.querySelectorAll(".wrap p.empty, .wrap p.small").forEach((p) => {
      const v = VIDES.find(([t]) => p.textContent.startsWith(t));
      if (v && ACT[v[2]]) p.insertAdjacentHTML("afterend", `<button type="button" class="btn er-vide" data-act="${v[2]}">${v[1]}</button>`);
    });
  }

  // ---------- Fil d'Ariane ----------
  function ariane() {
    const lien = document.querySelector(".wrap > .u-retour"), titre = document.querySelector(".wrap .head h1")?.textContent;
    if (!lien || !titre) return;
    lien.textContent = lien.textContent.replace(/^‹\s*/, "");
    const nav = document.createElement("nav");
    nav.className = "er-ariane"; nav.setAttribute("aria-label", "Fil d’Ariane");
    lien.before(nav);
    nav.append(lien);
    nav.insertAdjacentHTML("beforeend", `<span aria-hidden="true">›</span><span>${esc(titre)}</span>`);
  }

  // ---------- Barre de recherche ----------
  const LOUPE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4"/></svg>';
  const PAGES = [["Bilan", "pilotage"], ["Dépenses", "compta"], ["Budget", "previsions"], ["Stock matériel", "materiel"], ["Fournisseurs", "fournisseurs"], ["Membres", "membres"],
    ["Agenda et tâches", "agenda"], ["Carte des ruchers", "carte"], ["Activité récente", "activite"], ["Réglages et exports", "reglages"]];
  let requete = "", actif = false;
  const surligne = (x, q) => {
    const texte = String(x ?? ""), i = V3.plat(texte).indexOf(V3.plat(q).trim());
    return i < 0 ? esc(texte) : `${esc(texte.slice(0, i))}<mark>${esc(texte.slice(i, i + V3.plat(q).trim().length))}</mark>${esc(texte.slice(i + V3.plat(q).trim().length))}`;
  };
  function liste(q) {
    const t = V3.plat(q).trim();
    if (t.length < 2) return '<p class="small er-aide">Ruche, client, lot, matériel, dépense, mot d’une note…</p>';
    const groupes = [...V3.chercher(q)];
    const pages = PAGES.filter(([n]) => V3.plat(n).includes(t)).map(([x, v]) => ({ t: x, s: "", act: "go", v }));
    if (pages.length) groupes.push(["Aller à", pages]);
    groupes.push(["Actions", [{ t: `Ajouter une dépense « ${q.trim()} »`, s: "", act: "erdepense", v: q.trim() }]]);
    return groupes.map(([g, l]) => `<h3>${esc(g)}</h3>${l.slice(0, 6).map((x) => `<button type="button" class="er-r" data-act="${x.act}" data-v="${esc(x.v)}"><b>${surligne(x.t, q)}</b>${x.s ? `<span class="small">${surligne(x.s, q)}</span>` : ""}</button>`).join("")}`).join("");
  }
  function afficher() {
    const r = document.getElementById("erRes"), o = actif && r;
    document.querySelector(".er-cherche")?.setAttribute("aria-expanded", String(!!o));
    document.body.classList.toggle("er-ouvert", !!o);
    if (!r) return;
    r.hidden = !o;
    if (!o) return;
    r.querySelector(".er-liste").innerHTML = liste(requete);
    r.querySelector(".er-r")?.classList.add("sel");
  }
  function fermer() { actif = false; afficher(); document.getElementById("erQ")?.blur(); }
  function poser() {
    const nav = document.querySelector(".side");
    if (!nav || nav.querySelector(".er-barre")) return;
    nav.querySelector('[data-v="saisir"]')?.insertAdjacentHTML("beforebegin", `<div class="er-barre"><label class="er-cherche" aria-expanded="false">${LOUPE}<input id="erQ" type="search" autocomplete="off" enterkeyhint="search" placeholder="Rechercher une ruche, un client, un achat…" aria-label="Rechercher"><kbd>Ctrl K</kbd></label>
      <div id="erRes" hidden><div class="er-liste"></div><p class="er-pied"><span><kbd>↑</kbd><kbd>↓</kbd> Parcourir</span><span><kbd>Entrée</kbd> Ouvrir</span><span><kbd>Échap</kbd> Fermer</span></p></div></div>`);
    const i = document.getElementById("erQ");
    i.value = requete;
    i.addEventListener("focus", () => { actif = true; afficher(); });
    i.addEventListener("input", () => { requete = i.value; actif = true; afficher(); });
    i.addEventListener("keydown", (e) => {
      const l = [...document.querySelectorAll("#erRes .er-r")], c = l.findIndex((x) => x.classList.contains("sel"));
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fermer(); return; }
      if (e.key === "Enter") { e.preventDefault(); l[Math.max(c, 0)]?.click(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" || !l.length) return;
      e.preventDefault();
      l[c]?.classList.remove("sel");
      const s = l[(c + (e.key === "ArrowDown" ? 1 : -1) + l.length) % l.length];
      s.classList.add("sel"); s.scrollIntoView({ block: "nearest" });
    });
    if (actif) { i.focus(); afficher(); }
  }
  document.addEventListener("click", (e) => {
    if (!actif) return;
    if (e.target.closest?.(".er-r")) { requete = ""; const i = document.getElementById("erQ"); if (i) i.value = ""; fermer(); return; }
    if (!e.target.closest?.(".er-barre")) fermer();
  });
  const surOrdinateur = matchMedia("(min-width:801px)");

  // ---------- Raccourcis clavier ----------
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if ($sheet.open) return;
      if (surOrdinateur.matches) document.getElementById("erQ")?.focus(); else ACT.go("recherche");
      return;
    }
    if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey || $sheet.open || !S.d) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    document.querySelector('.side [data-v="saisir"], .bottom [data-v="saisir"]')?.click();
  });

  // ---------- Après chaque écran ----------
  const shellAvant = window.shell;
  window.shell = function (...a) {
    shellAvant(...a);
    poser();
    ariane();
    videsUtiles();
  };

  // ---------- Revenir au même endroit ----------
  const hauteurs = new Map();
  let retour = false;
  document.addEventListener("click", (e) => { if (e.target.closest?.(".u-retour")) retour = true; }, true);
  const renderAvant = window.render;
  window.render = function () {
    if (S.lastRoute && S.lastRoute !== S.route) hauteurs.set(S.lastRoute, window.scrollY);
    const change = S.lastRoute !== S.route, revient = retour && change;
    retour = false;
    renderAvant();
    if (revient && hauteurs.get(S.route)) requestAnimationFrame(() => window.scrollTo(0, hauteurs.get(S.route)));
  };

  return { fermerDoux };
})();
