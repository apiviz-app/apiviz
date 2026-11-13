// Apiviz — agenda en calendrier (v5.35, maquettes du 13 nov. 2026).
// Vue Mois ou Semaine : tâches (à leur échéance), visites, ventes et récoltes, chacune à sa date et à sa couleur.
// À droite (en dessous sur téléphone) : le jour choisi, puis les listes d'origine de l'écran (À faire, idées, terminées).
// Complète l'écran « agenda » d'app.js (viewAgenda) après son rendu ; ne change aucune donnée.
// Les gestes de navigation (mois, jour, filtres) passent par data-cp, permis à tous les rôles ; ouvrir une tâche,
// une ruche ou une vente reprend les actions d'origine (data-act), avec leurs droits.
const AG = (() => {
  const ordinateur = matchMedia("(min-width:801px)");
  const ic = (d, t = 18) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const TYPES = {
    v: { nom: "Visites", court: "Visite" },
    t: { nom: "Tâches", court: "Tâche" },
    s: { nom: "Ventes", court: "Vente" },
    r: { nom: "Récoltes", court: "Récolte" },
    late: { nom: "En retard", court: "En retard" },
  };
  const etat = { mois: null, jour: null, vue: "mois", caches: new Set() };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const deIso = (t) => new Date(t + "T12:00:00");
  const maj = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /** Tous les événements datés, rangés par jour (AAAA-MM-JJ). */
  function evenements() {
    const d = S.d, auj = today(), par = new Map();
    const ajoute = (jour, e) => { if (!jour) return; const k = String(jour).slice(0, 10); (par.get(k) || par.set(k, []).get(k)).push(e); };
    const ruche = (id) => byId(d.ruches, id)?.nom || "ruche";
    d.taches.forEach((t) => {
      if (!t.echeance) return;
      const retard = !t.faite && t.echeance < auj;
      ajoute(t.echeance, { type: retard ? "late" : "t", titre: t.titre, sous: t.ruche_id ? ruche(t.ruche_id) : "", act: "edittache", v: t.id, tache: t, faite: !!t.faite });
    });
    d.visites.forEach((x) => ajoute(x.date_visite, { type: "v", titre: `Visite · ${ruche(x.ruche_id)}`, sous: x.note || "", act: "ruche", v: x.ruche_id }));
    (d.ventes || []).forEach((x) => ajoute(x.date_vente, { type: "s", titre: `Vente · ${byId(d.clients, x.client_id)?.nom || "client"}`,
      sous: typeof venteTotal == "function" ? eur(venteTotal(x)) + (x.paye ? "" : " · à encaisser") : "", act: "uvente", v: x.id }));
    (d.recoltes || []).forEach((x) => ajoute(x.date_recolte, { type: "r", titre: `Récolte · ${n(x.kg)} kg`, sous: x.ruche_id ? ruche(x.ruche_id) : "", act: "go", v: "miel" }));
    const rang = { late: 0, v: 1, t: 2, s: 3, r: 4 };
    par.forEach((l) => l.sort((a, b) => rang[a.type] - rang[b.type] || Number(a.faite) - Number(b.faite)));
    return par;
  }

  // Jours affichés : le mois en semaines complètes (lundi → dimanche), ou la semaine du jour choisi.
  function jours() {
    if (etat.vue === "semaine") {
      const j = deIso(etat.jour), lundi = new Date(j); lundi.setDate(j.getDate() - ((j.getDay() + 6) % 7));
      return Array.from({ length: 7 }, (_, i) => { const x = new Date(lundi); x.setDate(lundi.getDate() + i); return x; });
    }
    const [a, m] = etat.mois.split("-").map(Number), premier = new Date(a, m - 1, 1, 12), debut = new Date(premier);
    debut.setDate(1 - ((premier.getDay() + 6) % 7));
    const fin = new Date(a, m, 0, 12), nb = Math.ceil(((premier.getDay() + 6) % 7 + fin.getDate()) / 7) * 7;
    return Array.from({ length: nb }, (_, i) => { const x = new Date(debut); x.setDate(debut.getDate() + i); return x; });
  }

  function titre() {
    if (etat.vue === "semaine") {
      const l = jours(), f = (d, o) => d.toLocaleDateString("fr-FR", o);
      return `Semaine du ${f(l[0], { day: "numeric", month: l[0].getMonth() === l[6].getMonth() ? undefined : "short" })} au ${f(l[6], { day: "numeric", month: "long" })}`;
    }
    return maj(deIso(etat.mois + "-15").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
  }

  function calendrier() {
    const ev = evenements(), auj = today(), max = etat.vue === "semaine" ? 12 : ordinateur.matches ? 3 : 0;
    const vus = (l) => l.filter((e) => !etat.caches.has(e.type));
    const cases = jours().map((d) => {
      const t = iso(d), l = vus(ev.get(t) || []), dehors = etat.vue === "mois" && t.slice(0, 7) !== etat.mois;
      const pastilles = l.slice(0, max).map((e) => `<span class="ag-ev ag-${e.type}${e.faite ? " fait" : ""}">${esc(e.titre)}</span>`).join("");
      const points = !max && l.length ? `<span class="ag-points">${[...new Set(l.map((e) => e.type))].slice(0, 3).map((k) => `<i class="ag-${k}"></i>`).join("")}</span>` : "";
      const plus = max && l.length > max ? `<span class="ag-plus">+ ${l.length - max}</span>` : "";
      const lib = `${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}${l.length ? `, ${l.length} élément${l.length > 1 ? "s" : ""}` : ""}`;
      return `<button type="button" class="ag-case${dehors ? " dehors" : ""}${t === auj ? " auj" : ""}${t === etat.jour ? " choisi" : ""}${d.getDay() % 6 === 0 ? " we" : ""}" data-cp="agjour" data-v="${t}" aria-label="${esc(lib)}"${t === etat.jour ? ' aria-current="date"' : ""}>
        <span class="ag-num">${etat.vue === "semaine" ? `<small>${esc(d.toLocaleDateString("fr-FR", { weekday: "short" }))}</small>` : ""}${d.getDate()}</span>${pastilles}${plus}${points}</button>`;
    }).join("");
    const filtres = Object.entries(TYPES).map(([k, x]) => `<button type="button" class="ag-filtre" data-cp="agfiltre" data-v="${k}" aria-pressed="${!etat.caches.has(k)}"><i class="ag-${k}"></i>${esc(x.nom)}</button>`).join("");
    const entetes = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((j) => `<span>${j}</span>`).join("");
    return `<div class="ag-barre">
        <div class="ag-nav"><button type="button" class="cp-icone" data-cp="agpas" data-v="-1" aria-label="${etat.vue === "semaine" ? "Semaine précédente" : "Mois précédent"}">${ic("M15 6l-6 6 6 6")}</button>
          <button type="button" class="cp-icone" data-cp="agpas" data-v="1" aria-label="${etat.vue === "semaine" ? "Semaine suivante" : "Mois suivant"}">${ic("M9 6l6 6-6 6")}</button>
          <h2>${esc(titre())}</h2><button type="button" class="btn sm ag-auj" data-cp="agauj">Aujourd’hui</button></div>
        <div class="cp-bascule" role="tablist" aria-label="Vue"><button type="button" role="tab" data-cp="agvue" data-v="mois" aria-selected="${etat.vue === "mois"}">Mois</button><button type="button" role="tab" data-cp="agvue" data-v="semaine" aria-selected="${etat.vue === "semaine"}">Semaine</button></div>
      </div>
      <div class="ag-filtres" aria-label="Afficher">${filtres}</div>
      <div class="ag-grille ag-${etat.vue}" role="grid"><div class="ag-entetes" aria-hidden="true">${entetes}</div><div class="ag-cases">${cases}</div></div>`;
  }

  function jourChoisi() {
    const l = evenements().get(etat.jour) || [], d = deIso(etat.jour), auj = today();
    const surTitre = etat.jour === auj ? "Aujourd’hui" : etat.jour < auj ? `Il y a ${days(etat.jour)} jour${days(etat.jour) > 1 ? "s" : ""}` : "À venir";
    const lignes = l.map((e) => `<div class="ag-ligne ag-${e.type}${e.faite ? " fait" : ""}">
        <i aria-hidden="true"></i>
        <button type="button" class="ag-ouvrir" data-act="${e.act}" data-v="${esc(e.v)}"><b>${esc(e.titre)}</b><span>${esc([TYPES[e.type].court, e.sous].filter(Boolean).join(" · "))}</span></button>
        ${e.tache ? `<button type="button" class="check" role="checkbox" aria-checked="${e.faite}" aria-label="Marquer ${esc(e.titre)}" data-act="toggletache" data-v="${e.tache.id}">${e.faite ? "✓" : ""}</button>` : ""}
      </div>`).join("");
    return `<section class="card ag-jour"><p class="ag-sur">${esc(surTitre)}</p><h2>${esc(maj(d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })))}</h2>
      ${lignes || '<p class="small">Rien de prévu ce jour-là.</p>'}
      <button type="button" class="ag-ajout" data-cp="agajout">${ic("M12 5v14M5 12h14", 15)}Ajouter une tâche ce jour</button></section>`;
  }

  function dessiner() {
    const cal = document.getElementById("agCal"), jour = document.getElementById("agJour");
    if (cal) cal.innerHTML = calendrier();
    if (jour) jour.outerHTML = jourChoisi().replace('class="card ag-jour"', 'class="card ag-jour" id="agJour"');
    ajuster();
  }
  function ajuster() {
    const g = document.querySelector(".ag-page");
    if (!g) return;
    g.style.height = ordinateur.matches ? `${Math.max(460, window.innerHeight - (g.getBoundingClientRect().top + window.scrollY) - 20)}px` : "";
  }
  addEventListener("resize", () => { if (S.route === "agenda") ajuster(); });

  function completer() {
    const wrap = document.querySelector(".wrap");
    if (!wrap || wrap.querySelector(".ag-page")) return;
    etat.jour = etat.jour || today();
    etat.mois = etat.mois || etat.jour.slice(0, 7);
    const listes = [...wrap.querySelectorAll(":scope > section.card, :scope > .card")];
    const page = document.createElement("div");
    page.className = "ag-page";
    page.innerHTML = `<section class="card ag-cal" id="agCal"></section><aside class="ag-cote">${jourChoisi().replace('class="card ag-jour"', 'class="card ag-jour" id="agJour"')}</aside>`;
    (listes[0] || wrap.lastElementChild).before(page);
    page.querySelector(".ag-cote").append(...listes);
    wrap.classList.add("ag");
    dessiner();
  }

  Noyau.crochets.sur("apresRendu", "agenda-mois", () => { if (S.route === "agenda" && S.d) completer(); });

  document.addEventListener("click", (e) => {
    const b = e.target.closest?.("[data-cp^=ag]");
    if (!b) return;
    const a = b.dataset.cp, v = b.dataset.v;
    if (a === "agjour") {
      etat.jour = v;
      if (v.slice(0, 7) !== etat.mois) etat.mois = v.slice(0, 7);
      dessiner();
      if (!ordinateur.matches) document.getElementById("agJour")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (a === "agpas") {
      const k = Number(v);
      if (etat.vue === "semaine") { const d = deIso(etat.jour); d.setDate(d.getDate() + 7 * k); etat.jour = iso(d); etat.mois = etat.jour.slice(0, 7); }
      else { const [y, m] = etat.mois.split("-").map(Number), d = new Date(y, m - 1 + k, 1, 12); etat.mois = iso(d).slice(0, 7); }
      dessiner();
    } else if (a === "agauj") { etat.jour = today(); etat.mois = etat.jour.slice(0, 7); dessiner(); }
    else if (a === "agvue") { etat.vue = v; if (v === "semaine" && etat.jour.slice(0, 7) !== etat.mois) etat.jour = etat.mois + "-01"; dessiner(); }
    else if (a === "agfiltre") { etat.caches.has(v) ? etat.caches.delete(v) : etat.caches.add(v); dessiner(); }
    else if (a === "agajout") {
      ACT.newtache();
      const champ = document.querySelector("#sheetForm [name=echeance]");
      if (champ) { champ.value = etat.jour; champ.dispatchEvent(new Event("input", { bubbles: true })); champ.dispatchEvent(new Event("change", { bubbles: true })); }
    }
  });

  return { evenements, etat };
})();
