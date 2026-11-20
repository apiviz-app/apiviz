// Apiviz — accueil sur téléphone d'après les maquettes du 10 nov. 2026 (chantier des écrans, étape 4, v5.24).
// Ordre : bonjour et deux actions, la priorité dite par API, quatre chiffres, « Mes ruchers » (v5.52 : une ligne par
// rucher, les 3 premiers, avec la météo de chacun en face, puisqu'ils ne sont pas au même endroit), À faire étiqueté,
// les dernières actions. Le plan des alvéoles, ses onglets État / Provisions / Varroa et le bloc « Prochain créneau »
// ont quitté l'accueil (maquette du 16 nov. 2026) : le détail est dans Ruchers et sur la fiche de chaque rucher.
// Complément de l'écran « dash », appelé après AL et DM (src/domaines/accueil/ecrans.js). Téléphone et ordinateur
// (v5.25 : sur ordinateur, deux colonnes). Dès la première ruche, même sans visite ; sans ruche, la prise en main reste.
const AC = (() => {
  const U = UX;
  const telephone = matchMedia("(max-width:800px)");
  const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const cleNom = () => `apiviz-prenom-${S.session?.user?.email || ""}`;
  /** Prénom affiché dans le bonjour : seulement s'il a été donné (aucun n'est stocké côté serveur pour l'instant). */
  const prenom = () => String(memo(cleNom()) || "").trim();
  const prioritaire = () => S.d.ruches.find((x) => x.etat === "Critique") || S.d.ruches.find((x) => x.etat !== "Bonne");
  const nb = (e) => S.d.ruches.filter((r) => r.etat === e).length;
  const maj = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // 1. Bonjour : l'exploitation, la date, le résumé du jour, Nouvelle visite et Nouvelle vente.
  function bonjour(tete) {
    const d = S.d, surv = d.ruches.length - nb("Bonne"), taches = d.taches.filter((t) => !t.faite).length;
    const resume = [U.pluriel(d.ruches.length, "ruche"), surv ? `${surv} à surveiller` : "", taches ? `${taches} tâche${taches > 1 ? "s" : ""} à faire` : ""].filter(Boolean).join(" · ");
    const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const p = prenom(), garde = tete.querySelector(".ex-lecture"); // repère « Lecture seule » (exploitations.js)
    tete.classList.add("ac-hero");
    tete.innerHTML = `<p class="ac-oeil">${esc(cfg().nom)} · ${esc(date)}</p>
      <h1>${new Date().getHours() < 18 ? "Bonjour" : "Bonsoir"}${p ? ` ${esc(p)}` : ""}</h1><p class="ac-resume">${esc(resume)}</p>
      <div class="ac-actions"><button type="button" class="btn honey" data-act="newvisite">Nouvelle visite</button><button type="button" class="btn ac-ghost" data-act="newvente">Nouvelle vente</button></div>`;
    if (garde) tete.querySelector("h1").after(garde);
  }

  // 2. La priorité du jour, dite par API, avec son action (et la tournée proposée, s'il y en a une).
  function priorite() {
    const d = S.d;
    if (!d.visites.length) {
      // Sans visite : une bannière d'une ligne (v5.52), le bouton à droite.
      const premiere = d.ruches.find((x) => x.statut !== "orpheline") || d.ruches[0];
      return `<section class="ac-api court">${AL.compagnon("bonjour", 36)}
      <div class="ac-api-t"><b id="acPhrase">Note ta première visite pour que je suive chaque colonie.</b></div>
      <button type="button" class="btn main" data-act="newvisite" data-v="${premiere.id}">Noter</button></section>`;
    }
    const r = prioritaire();
    const pesees = r ? d.visites.filter((v) => v.ruche_id === r.id && v.poids_kg).length : 0;
    const source = r ? (pesees > 1 ? `D’après ${pesees} pesées de ${r.nom}` : `D’après la dernière visite de ${r.nom}`) : "D’après tes dernières visites";
    const prochaine = document.querySelector(".n4-prochaine");
    const tournee = prochaine?.querySelector(".btn.honey");
    const actions = [r ? `<button type="button" class="btn main" data-act="ruche" data-v="${r.id}">Voir ${esc(r.nom)}</button>` : "",
      tournee ? `<button type="button" class="btn" data-act="${tournee.dataset.act}" data-v="${esc(tournee.dataset.v)}">${esc(tournee.textContent)}</button><button type="button" class="link ac-plustard" data-act="n4plustard">Plus tard</button>` : ""].join("");
    prochaine?.remove();
    // v5.71 (maquette « Sur l'Accueil : Pour aujourd'hui d'API ») : la priorité, puis jusqu'à deux autres choses utiles
    // du jour (créneau, saison, stock…), la tournée proposée et le micro ; src/domaines/assistant/aujourdhui.js.
    // Réglages › API › Conseils d'API peut remettre la priorité seule.
    const EA = window.Noyau?.espaceApi;
    if (EA && EA.prefsConseils().accueil) {
      return EA.carteAccueil({ humeur: r?.etat === "Critique" ? "attention" : "repos",
        tournee: tournee ? { act: tournee.dataset.act, v: tournee.dataset.v, texte: prochaine?.querySelector("b")?.textContent || tournee.textContent, bouton: tournee.textContent } : null });
    }
    return `<section class="ac-api${r ? "" : " calme"}">${AL.compagnon(r?.etat === "Critique" ? "attention" : "repos", 44)}
      <div class="ac-api-t"><b id="acPhrase">${esc(AL.phrase())}</b><span class="small">${esc(source)}</span>${actions ? `<div class="ac-api-a">${actions}</div>` : ""}</div></section>`;
  }

  // 3. Quatre chiffres, chacun mène à son écran.
  function chiffres() {
    const an = new Date().getFullYear(), s = stock(), f = fin(an), treso = f.encaisse - f.charges;
    const tuile = (v, lab, val, cl, sous, scl = "") => `<button type="button" class="ac-chiffre" data-act="go" data-v="${v}"><span>${lab}</span><b class="${cl}">${esc(val)}</b><small class="${scl}">${esc(sous)}</small></button>`;
    return `<section class="ac-chiffres" aria-label="Chiffres clés">
      ${tuile("miel", "Miel en stock", `${n(s.kg, 1)} kg`, "", U.pluriel(s.pots, "pot"))}
      ${tuile("clients", `Ventes ${an}`, eur0(f.ca), "", f.aEncaisser > 0 ? `${eur0(f.aEncaisser)} à encaisser` : "Tout est encaissé", f.aEncaisser > 0 ? "watch" : "")}
      ${tuile("pilotage", `Résultat ${an}`, eur0(f.resultat), f.resultat > 0 ? "good" : f.resultat < 0 ? "crit" : "", `après ${eur0(f.charges)} de charges`)}
      ${tuile("pilotage", "Trésorerie", eur0(treso), treso < 0 ? "crit" : "", "encaissé moins dépensé")}
    </section>`;
  }

  // 4. Mes ruchers (v5.52) : une ligne par rucher, les plus urgents d'abord, les 3 premiers. En face de chacun, sa
  // météo (temps, température, prochain créneau pour ouvrir) : les ruchers ne sont pas forcément au même endroit.
  const MAX_RUCHERS = 3;
  const gravite = (rs) => rs.filter((r) => r.etat === "Critique").length * 100 + rs.filter((r) => r.etat !== "Bonne").length;
  function etatRucher(rs) {
    const crit = rs.filter((r) => r.etat === "Critique").length, bien = rs.filter((r) => r.etat === "Bonne").length, surv = rs.length - crit - bien;
    const ton = crit ? "crit" : surv ? "watch" : "good";
    const mots = [[crit, "critique"], [surv, "à surveiller"]].filter(([c]) => c).map(([c, m]) => `${c} ${m}`);
    return { ton, texte: mots.length ? mots.join(" · ") : `${bien} en forme` };
  }
  function meteoRucher(k, rs) {
    const m = MT.parHeure(k, rs);
    if (!m) return '<span class="ac-wx-c">Météo…</span>';
    if (m.sansLieu) return '<span class="ac-wx-c">Pas placé sur la carte</span>';
    const c = m.creneau, jour = c ? (c.jour === m.auj ? "auj." : MT.nomJour(c.jour)) : "";
    const [txt, ton] = !c ? ["Pas de créneau", "non"] : [`${c.n === 2 ? "Créneau" : "Rapide"} ${jour} ${c.h} h`, c.n === 2 ? "oui" : "rapide"];
    return `<span class="ac-wx-t">${MT.icone(m.code)}<b>${m.temp}°</b></span><span class="ac-wx-c ${ton}">${esc(txt)}</span>`;
  }
  function ruchers() {
    const tous = U.ruchers().map((x, i) => [...x, i]).sort((a, b) => gravite(b[1]) - gravite(a[1]) || a[2] - b[2]);
    if (!tous.length) return "";
    const lignes = tous.slice(0, MAX_RUCHERS).map(([k, rs]) => {
      const e = etatRucher(rs);
      return `<button type="button" class="ac-rucher" data-act="alrucher" data-v="${esc(k)}">
        <span class="ac-rhex ${e.ton}" aria-hidden="true"><span>${rs.length}</span></span>
        <span class="ac-rnom"><b>${esc(U.nomRucher(k))}</b><small><i class="${e.ton}" aria-hidden="true"></i>${esc(U.pluriel(rs.length, "ruche"))} · ${esc(e.texte)}</small></span>
        <span class="ac-wx">${meteoRucher(k, rs)}</span><span class="u-chev" aria-hidden="true">›</span></button>`;
    }).join("");
    const plus = tous.length > MAX_RUCHERS ? `<button type="button" class="ac-plus" data-act="go" data-v="ruches">Voir les ${tous.length} ruchers <span aria-hidden="true">›</span></button>` : "";
    return `<section class="card ac-ruchers" id="acRuchers"><div class="u-entete"><h2>Mes ruchers</h2><button type="button" class="link" data-act="go" data-v="ruches">Tout voir</button></div>${lignes}${plus}</section>`;
  }

  // 6. À faire : une étiquette (la ruche, « Stock bas », « À encaisser »…) et ce qu'il y a à faire.
  // « Voir les autres » garde son action d'origine (utout, ux.js), qui redessine l'accueil.
  let tout = false;
  const utoutAvant = ACT.utout;
  ACT.utout = () => { tout = !tout; utoutAvant(); };
  function afaire(sec) {
    // Gravité d'abord ; à gravité égale, les ruches avant le reste (la colonie critique passe avant une tâche en retard).
    const rang = { crit: 0, watch: 1, good: 2 }, ruche = (x) => (x[3].startsWith("ruche:") ? 0 : 1);
    const l = todos().sort((a, b) => rang[a[1]] - rang[b[1]] || ruche(a) - ruche(b));
    const texte = ([, , txt, cible]) => {
      if (!cible.startsWith("ruche:")) return txt;
      const r = byId(S.d.ruches, cible.slice(6)), v = r && S.d.visites.find((x) => x.ruche_id === r.id);
      const t = txt.replace(/^État : (.*)$/, (_, e) => `État ${e.toLowerCase()}`);
      return v && /^État/.test(t) ? `${t}, pas de visite depuis ${days(v.date_visite)} jours` : t;
    };
    const lignes = (tout ? l : l.slice(0, 6)).map((x) => {
      const [lab, ton, , cible] = x, ruche = cible.startsWith("ruche:");
      return `<button type="button" class="u-todo ac-todo" data-act="${ruche ? "ruche" : "go"}" data-v="${esc(cible.replace("ruche:", ""))}">
        <span class="ac-tag ${ton}">${esc(lab)}</span><span class="ac-todo-t">${esc(texte(x))}</span><span class="u-chev" aria-hidden="true">›</span></button>`;
    }).join("");
    sec.className = "card u-liste ac-liste";
    sec.innerHTML = `<div class="u-entete"><h2>À faire</h2><button type="button" class="link" data-act="go" data-v="agenda">Agenda</button></div>
      ${lignes || '<p class="small u-vide">Rien à signaler. Belle journée au rucher !</p>'}
      ${l.length > 6 ? `<button type="button" class="link u-plus" data-act="utout">${tout ? "Réduire" : `Voir les ${l.length - 6} autres`}</button>` : ""}`;
  }

  // 7. Dernières actions : qui a fait quoi, avec l'initiale de la personne.
  function dernieres() {
    if (typeof V3 == "undefined") return "";
    const nom = (e) => maj(U.qui(e) || "");
    const phrase = (titre, sous, qui) => {
      const [type, sur] = String(titre).split(" · ");
      const verbe = { Visite: `a visité ${sur}`, Vente: `a vendu à ${sur}${sous ? ` (${String(sous).replace(" · à encaisser", "")})` : ""}`, "Photo ajoutée": `a ajouté une photo (${sous})` }[type];
      if (qui && verbe) return [nom(qui), verbe];
      const sans = { Visite: `Visite de ${sur}`, Vente: `Vente à ${sur}${sous ? ` (${String(sous).replace(" · à encaisser", "")})` : ""}` }[type];
      return ["", sans || titre + (sous ? ` · ${sous}` : "")];
    };
    const lignes = V3.fil(3).map(([t, qui, titre, sous, act, v]) => {
      const [q, reste] = phrase(titre, sous, qui);
      return `<button type="button" class="ac-fil" ${v ? `data-act="${act}" data-v="${esc(v)}"` : "disabled"}><span class="ac-avatar${q ? "" : " vide"}" aria-hidden="true">${esc(q ? q[0] : "")}</span>
        <span><span class="ac-fil-t">${q ? `<b>${esc(q)}</b> ` : ""}${esc(reste)}</span><small>${esc(U.quand(t))}</small></span></button>`;
    }).join("");
    return lignes ? `<section class="card ac-dernieres"><div class="u-entete"><h2>Dernières actions</h2><button type="button" class="link" data-act="go" data-v="activite">Tout voir</button></div>${lignes}</section>` : "";
  }

  function completerAccueil() {
    const d = S.d, wrap = document.querySelector(".wrap"), tete = wrap?.querySelector(".hero-head");
    if (!d?.ruches.length || !tete) return;
    wrap.classList.add("ac");
    const carte = wrap.querySelector(".al-carte"), liste = wrap.querySelector(".u-liste"), guide = wrap.querySelector(".dm-guide");
    const haut = priorite() + chiffres() + ruchers(); // avant bonjour() : la proposition de tournée est encore dans l'en-tête
    bonjour(tete);
    tete.insertAdjacentHTML("afterend", haut);
    carte?.remove(); // le plan des alvéoles reste dans Ruchers (v5.52)
    const avant = wrap.querySelector(".ac-ruchers") || wrap.querySelector(".ac-chiffres");
    if (liste) { afaire(liste); avant.after(liste); }
    wrap.querySelector(".al-deux")?.remove(); // l'ancien bloc « Saison » : remplacé par les quatre chiffres
    (liste || avant).insertAdjacentHTML("afterend", dernieres());
    if (guide) {
      // Sans visite, le guide de prise en main reste en vue, juste sous la priorité ; ensuite il passe en bas.
      if (!d.visites.length) wrap.querySelector(".ac-api").after(guide); else wrap.append(guide);
    }
    if (!telephone.matches) colonnes(wrap);
  }
  // Ordinateur : bonjour et priorité côte à côte, les quatre chiffres sur une ligne, puis deux colonnes :
  // Mes ruchers et les dernières actions à gauche, À faire à droite (v5.52 : pas de vide sous les ruchers).
  function colonnes(wrap) {
    const pris = (sel) => [...wrap.querySelectorAll(`:scope > ${sel}`)];
    const haut = document.createElement("div"), g = document.createElement("div"), dr = document.createElement("div"), cols = document.createElement("div");
    haut.className = "ac-haut"; cols.className = "ac-cols"; g.className = "ac-col"; dr.className = "ac-col";
    const tete = wrap.querySelector(":scope > .ac-hero"), api = wrap.querySelector(":scope > .ac-api");
    if (!tete || !api) return;
    tete.before(haut); haut.append(tete, api);
    g.append(...pris(".ac-ruchers, .ac-dernieres")); dr.append(...pris(".u-liste"));
    cols.append(g, dr);
    (wrap.querySelector(":scope > .ac-chiffres") || haut).after(cols);
  }
  telephone.addEventListener("change", () => { if (S.route === "dash") redessiner("dash"); });

  // Quand la météo arrive : la phrase d'API (AL) et la météo de chaque rucher se mettent à jour, sans redessiner l'écran.
  const meteoAvant = window.AL_meteoPrete;
  window.AL_meteoPrete = () => {
    if (!document.querySelector(".wrap.ac")) return meteoAvant?.(); // sinon AL réécrirait « Bonsoir » en phrase
    const bloc = document.getElementById("acRuchers");
    if (S.route !== "dash" || !bloc) return;
    bloc.outerHTML = ruchers();
    const p = document.getElementById("acPhrase");
    if (p && S.d.visites.length) p.textContent = AL.phrase(); // sans visite, la phrase reste « Note ta première visite »
  };

  return { completerAccueil, prenom };
})();
