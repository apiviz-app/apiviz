// Apiviz — accueil sur téléphone d'après les maquettes du 10 nov. 2026 (chantier des écrans, étape 4, v5.24).
// Ordre : bonjour et deux actions, la priorité dite par API, quatre chiffres, l'état des ruches (alvéoles par rucher,
// avec leur météo), le prochain créneau de visite sur 5 jours, À faire étiqueté, les dernières actions.
// Complément de l'écran « dash », appelé après AL et DM (src/domaines/accueil/ecrans.js). Ne touche qu'au téléphone
// (≤ 800 px) et à une exploitation déjà lancée (ruches et visites) : l'ordinateur et la prise en main restent tels quels.
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
    const r = prioritaire(), d = S.d;
    const pesees = r ? d.visites.filter((v) => v.ruche_id === r.id && v.poids_kg).length : 0;
    const source = r ? (pesees > 1 ? `D’après ${pesees} pesées de ${r.nom}` : `D’après la dernière visite de ${r.nom}`) : "D’après tes dernières visites";
    const prochaine = document.querySelector(".n4-prochaine");
    const tournee = prochaine?.querySelector(".btn.honey");
    const actions = [r ? `<button type="button" class="btn main" data-act="ruche" data-v="${r.id}">Voir ${esc(r.nom)}</button>` : "",
      tournee ? `<button type="button" class="btn" data-act="${tournee.dataset.act}" data-v="${esc(tournee.dataset.v)}">${esc(tournee.textContent)}</button><button type="button" class="link ac-plustard" data-act="n4plustard">Plus tard</button>` : ""].join("");
    prochaine?.remove();
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

  // 5. Prochain créneau de visite : le rucher prioritaire (ou le seul), ses 5 jours, le meilleur jour en avant.
  function creneau() {
    const rs = U.ruchers(), r = prioritaire();
    const cle = r ? rs.find(([, l]) => l.includes(r))?.[0] : rs[0]?.[0];
    if (cle === undefined) return "";
    const l = AL.ruchesDe(cle), m = MT.parHeure(cle, l);
    const titre = `<div class="u-entete"><h2>Prochain créneau de visite</h2>${rs.length > 1 ? `<span class="small">${esc(U.nomRucher(cle))}</span>` : ""}</div>`;
    if (!m) return `<section class="card ac-creneau" id="acCreneau">${titre}<p class="small">Météo en cours de chargement…</p></section>`;
    if (m.sansLieu) return `<section class="card ac-creneau" id="acCreneau">${titre}<p class="small">Place ce rucher sur la carte pour connaître le bon moment.</p><button type="button" class="btn" data-act="go" data-v="carte">Ouvrir la carte</button></section>`;
    const jour = (t) => (t === m.auj ? "aujourd’hui" : new Date(t + "T12:00").toLocaleDateString("fr-FR", { weekday: "long" }));
    const cherche = (k) => m.jours.map((x) => ({ x, p: x.plages.find((q) => q.n === k) })).find((o) => o.p);
    const pro = cherche(2) || cherche(1);
    const phrase = pro ? `Meilleur créneau : ${jour(pro.x.t)} de ${pro.p.debut} h à ${pro.p.fin} h${pro.p.n === 1 ? ", visite courte" : ""}` : "Pas de créneau pour ouvrir ces 5 jours";
    const etiquette = (x) => (x.bonnes ? `${x.bonnes} h` : x.rapides ? "Rapide" : x.heures.some((h) => h.raison.startsWith("Pluie") || h.raison === "Il pleut") ? "Pluie" : x.heures.some((h) => h.raison.startsWith("Trop de vent")) ? "Vent" : x.heures.some((h) => h.raison.startsWith("Trop frais")) ? "Frais" : "Non");
    const jours = m.jours.map((x, i) => `<button type="button" class="ac-jour${pro && x.t === pro.x.t ? " on" : ""}${x.bonnes ? " bon" : x.rapides ? " rapide" : ""}" style="--i:${i}" data-act="acmeteo" data-v="${esc(cle)}|${x.t}" aria-label="${esc(maj(jour(x.t)))} : ${x.max}°, ${esc(x.bonnes ? `${x.bonnes} heures pour ouvrir` : x.rapides ? "visite rapide possible" : "pas de créneau")}">
      <span>${i === 0 && x.t === m.auj ? "Auj." : esc(maj(new Date(x.t + "T12:00").toLocaleDateString("fr-FR", { weekday: "short" })))}</span><b>${x.max}°</b><small>${esc(etiquette(x))}</small></button>`).join("");
    return `<section class="card ac-creneau" id="acCreneau">${titre}<p class="small">${esc(phrase)}</p><div class="ac-jours">${jours}</div>
      <button type="button" class="link" data-act="ermeteo" data-v="${esc(cle)}">Voir heure par heure</button></section>`;
  }
  ACT.acmeteo = (v) => { const [k, t] = String(v).split("|"); S.meteoRucher = k; S.meteoJour = t; S.meteoHeure = null; go("meteo"); };

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
    if (!telephone.matches || !d?.ruches.length || !d.visites.length || !tete) return;
    wrap.classList.add("ac");
    const carte = wrap.querySelector(".al-carte"), liste = wrap.querySelector(".u-liste"), guide = wrap.querySelector(".dm-guide");
    const haut = priorite() + chiffres(); // avant bonjour() : la proposition de tournée est encore dans l'en-tête
    bonjour(tete);
    tete.insertAdjacentHTML("afterend", haut);
    if (carte) {
      carte.insertAdjacentHTML("afterbegin", `<div class="u-entete ac-etat"><h2>État des ruches</h2><button type="button" class="link" data-act="go" data-v="ruches">Tout voir</button></div>`);
      wrap.querySelector(".ac-chiffres").after(carte);
    }
    (carte || wrap.querySelector(".ac-chiffres")).insertAdjacentHTML("afterend", creneau());
    if (liste) { afaire(liste); (wrap.querySelector(".ac-creneau") || carte || wrap.querySelector(".ac-chiffres")).after(liste); }
    wrap.querySelector(".al-deux")?.remove(); // l'ancien bloc « Saison » : remplacé par les quatre chiffres
    (liste || wrap.querySelector(".ac-chiffres")).insertAdjacentHTML("afterend", dernieres());
    if (guide) wrap.append(guide);
  }
  telephone.addEventListener("change", () => { if (S.route === "dash") redessiner("dash"); });

  // Quand la météo arrive : la phrase d'API (AL) et le bloc du créneau se mettent à jour, sans redessiner l'écran.
  const meteoAvant = window.AL_meteoPrete;
  window.AL_meteoPrete = () => {
    if (!document.querySelector(".wrap.ac")) return meteoAvant?.(); // sinon AL réécrirait « Bonsoir » en phrase
    const bloc = document.getElementById("acCreneau");
    if (S.route !== "dash" || !bloc) return;
    bloc.outerHTML = creneau();
    const p = document.getElementById("acPhrase");
    if (p) p.textContent = AL.phrase();
  };

  return { completerAccueil, prenom };
})();
