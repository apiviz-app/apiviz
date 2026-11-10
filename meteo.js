// Apiviz — météo de chaque rucher (Open-Meteo, sans compte) et calcul du meilleur créneau pour ouvrir les ruches.
// Chaque rucher utilise sa position (table ruchers, IT-05) ; à défaut, la moyenne de ses ruches placées sur la carte.
// Chargé avant alveoles.js.
//
// Seuils : température d'après les repères publiés par les apiculteurs (détail et sources dans docs/TECHNIQUE.md).
// Le vent et la pluie n'ont pas de chiffre établi : ce sont des choix d'Apiviz, à ajuster à l'usage.
const MT = (() => {
  const SEUILS = {
    ouvrir: 15,   // °C : visite normale
    rapide: 13,   // °C : visite courte seulement
    vent: 25,     // km/h : au-delà, on n'ouvre pas
    pluie: 30,    // % de risque : au-delà, on n'ouvre pas
    debut: 10, fin: 16, // heures de la journée où l'on cherche un créneau
  };
  const DUREE = 18e5; // on garde une prévision 30 minutes
  const cache = new Map();

  // Règles de créneau : src/domaines/meteo/regles.js (IT-03, testées unitairement), avec les seuils ci-dessus.
  const niveau = (...a) => Regles.meteo.niveau(SEUILS, ...a);
  const jourDe = (texte) => String(texte).slice(0, 10);
  const nomJour = (jour, format = "short") => new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: format });

  // Résume une réponse Open-Meteo. « Maintenant » vient de la réponse : c'est l'heure locale du rucher.
  const analyse = (j) => Regles.meteo.analyse(SEUILS, j);

  function quand(x, auj) {
    const demain = new Date(auj + "T12:00:00"); demain.setDate(demain.getDate() + 1);
    const j = x.jour === auj ? "aujourd’hui" : x.jour === demain.toISOString().slice(0, 10) ? "demain" : nomJour(x.jour, "long");
    return `${j} vers ${x.h} h`;
  }

  const ICONES = {
    soleil: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    nuage: '<path d="M7 18a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 9.5a4.2 4.2 0 0 1 0 8.5z"/>',
    pluie: '<path d="M7 15a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 6.5a4.2 4.2 0 0 1 0 8.5zM9 18l-1 3M13 18l-1 3M17 18l-1 3"/>',
  };
  const icone = (code) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[code <= 1 ? "soleil" : code <= 48 ? "nuage" : "pluie"]}</svg>`;

  const phraseCreneau = (a) => (!a.creneau ? "Pas de créneau pour ouvrir ces 3 jours"
    : a.creneau.n === 2 ? `Meilleur créneau : <b>${quand(a.creneau, a.auj)}</b>`
    : `Visite rapide possible : <b>${quand(a.creneau, a.auj)}</b>, ${a.creneau.temp}°`);

  function html(cle, rs, nbJours = 3) {
    const l = lieu(rs, cle);
    if (!l) return '<button type="button" class="link" data-act="go" data-v="carte">Placer sur la carte pour voir la météo</button>';
    const e = cache.get(cle);
    if (!e?.data || e.lat !== l.lat || e.lng !== l.lng) { charger(cle, l); return '<p class="small">Météo en cours de chargement…</p>'; }
    if (Date.now() - e.at > DUREE) charger(cle, l);
    const a = analyse(e.data);
    const lienHeures = `<button type="button" class="link al-heures" data-act="ermeteo" data-v="${esc(cle)}">Voir heure par heure</button>`;
    if (nbJours === 0) return `<div class="al-temps court">${icone(a.code)}<b>${a.temp}°</b><strong>${esc(a.verdict)}</strong></div>${friseCourte(cle, rs)}<p class="al-creneau">${phraseCreneau(a)}</p>${lienHeures}`;
    return `<div class="al-temps">${icone(a.code)}<b>${a.temp}°</b><span><strong>${esc(a.verdict)}</strong>Vent ${a.vent} km/h</span></div>
      <div class="al-jours n${nbJours}">${a.jours.slice(0, nbJours).map((x) => `<span class="al-jour ${x.ok ? "ok" : ""}">${esc(nomJour(x.t))}${icone(x.code)}${x.max}°</span>`).join("")}</div>
      ${friseCourte(cle, rs)}<p class="al-creneau">${phraseCreneau(a)}</p>${lienHeures}`;
  }

  // Frise courte d'aujourd'hui (heures de recherche du créneau) : une case par heure, verte si l'on peut ouvrir,
  // miel pour une visite rapide, grise sinon, hachurée une fois passée. Lisible d'un coup d'œil sur la carte du rucher.
  function friseCourte(cle, rs) {
    const m = parHeure(cle, rs), j = m?.jours?.[0];
    if (!j || j.t !== m.auj) return "";
    const hs = j.heures.filter((x) => x.n != null);
    if (!hs.length || hs.every((x) => x.passee && !x.maintenant)) return "";
    const lib = (x) => `${x.h} h, ${x.n === 2 ? "on peut ouvrir" : x.n === 1 ? "visite rapide" : x.raison.toLowerCase() || "défavorable"}${x.passee && !x.maintenant ? ", passée" : ""}`;
    return `<div class="mt-frise-c" style="--n:${hs.length}" role="img" aria-label="Aujourd’hui : ${esc(hs.map(lib).join(" ; "))}">
      ${hs.map((x) => `<i class="n${x.n}${x.passee && !x.maintenant ? " passee" : ""}${x.maintenant ? " now" : ""}"></i>`).join("")}
      <span>${hs[0].h} h</span><span>${hs[hs.length - 1].h + 1} h</span></div>`;
  }

  // Détail par heure, de 8 h à 20 h, pour chaque jour connu.
  function parHeure(cle, rs) {
    const l = lieu(rs, cle);
    if (!l) return { sansLieu: true };
    const e = cache.get(cle);
    if (!e?.data || e.lat !== l.lat || e.lng !== l.lng) { charger(cle, l); return null; }
    const j = e.data, h = j.hourly || {}, d = j.daily || {}, a = analyse(j);
    const maintenant = String(j.current?.time || "").slice(0, 13);
    const jours = (d.time || []).filter((t) => t >= a.auj).slice(0, 5).map((t) => {
      const i0 = d.time.indexOf(t), heures = [];
      (h.time || []).forEach((x, i) => {
        const hh = Number(String(x).slice(11, 13));
        if (jourDe(x) !== t || hh < 8 || hh > 20) return;
        const temp = h.temperature_2m?.[i] ?? -99, risque = h.precipitation_probability?.[i] ?? 0, vent = h.wind_speed_10m?.[i] ?? 0;
        const dedans = hh >= SEUILS.debut && hh < SEUILS.fin;
        heures.push({ h: hh, temp: Math.round(temp), risque: Math.round(risque), vent: Math.round(vent), rafales: h.wind_gusts_10m ? Math.round(h.wind_gusts_10m[i] ?? 0) : null,
          hum: h.relative_humidity_2m ? Math.round(h.relative_humidity_2m[i] ?? 0) : null, code: h.weather_code?.[i] ?? 3,
          n: dedans ? niveau(temp, risque, vent, h.precipitation?.[i] ?? 0) : null, passee: String(x).slice(0, 13) < maintenant,
          pluie: Math.round((h.precipitation?.[i] ?? 0) * 10) / 10, raison: Regles.meteo.raison(SEUILS, temp, risque, vent, h.precipitation?.[i] ?? 0),
          maintenant: String(x).slice(0, 13) === maintenant });
      });
      // Plages favorables du jour (heures à venir seulement) et nombre d'heures bonnes : le résumé du jour.
      const avenir = heures.filter((x) => !x.passee || x.maintenant);
      const plagesJour = Regles.meteo.plages(avenir.filter((x) => x.n != null));
      return { t, max: Math.round(d.temperature_2m_max?.[i0] ?? 0), code: d.weather_code?.[i0] ?? 3, heures,
        plages: plagesJour, bonnes: avenir.filter((x) => x.n === 2).length, rapides: avenir.filter((x) => x.n === 1).length };
    });
    return { jours, creneau: a.creneau, auj: a.auj, temp: a.temp, vent: a.vent, verdict: a.verdict, code: a.code,
      maintenant: jours[0]?.heures.find((x) => x.maintenant) || null };
  }

  // Position du rucher (AP-US-029) : celle de la table ruchers, sinon la moyenne des ruches placées. Arrondie à
  // 2 décimales (environ 1 km), ce qui suffit à la météo et partage le cache entre ruches voisines.
  // `cle` : le rucher (texte ruches.rucher) quand on le connaît, pour un rucher sans colonie.
  function lieu(rs, cle) {
    const R = Regles.ruchers, liste = S.d?.ruchers || [];
    const x = (cle != null ? R.rucherParCle(liste, cle) : null) || (rs?.length ? R.rucherDe(liste, rs[0]) : null);
    return R.position(x, rs || [], 2);
  }

  function charger(cle, l) {
    const e = cache.get(cle);
    if (e?.enCours || navigator.onLine === false) return;
    cache.set(cle, { ...e, enCours: true });
    const champs = "temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,weather_code";
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${l.lat}&longitude=${l.lng}&current=temperature_2m,wind_speed_10m,precipitation,weather_code&hourly=${champs}&daily=temperature_2m_max,weather_code&forecast_days=6&timezone=auto`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        cache.set(cle, { data, at: Date.now(), lat: l.lat, lng: l.lng });
        document.querySelectorAll(".al-wx").forEach((el) => { if (el.dataset.k === cle) el.innerHTML = html(cle, AL.ruchesDe(cle), Number(el.dataset.jours ?? 3)); });
        AL.meteoPrete?.();
      })
      .catch(() => cache.set(cle, { ...cache.get(cle), enCours: false }));
  }

  // Créneau du jour d'un rucher, si sa météo est déjà connue. Sert à la phrase d'accueil.
  function creneauDuJour(cle, rs) {
    const l = lieu(rs, cle), e = cache.get(cle);
    if (!l || !e?.data || e.lat !== l.lat || e.lng !== l.lng) return null;
    const a = analyse(e.data);
    return a.creneau?.n === 2 && a.creneau.jour === a.auj ? a.creneau : null;
  }

  // Meilleur créneau connu d'un rucher, sans lancer de chargement.
  function creneauConnu(cle, rs) {
    const l = lieu(rs, cle), e = cache.get(cle);
    return l && e?.data && e.lat === l.lat && e.lng === l.lng ? analyse(e.data).creneau : null;
  }

  return { creneauConnu, friseCourte, SEUILS, niveau, analyse, html, lieu, creneauDuJour, parHeure, icone, nomJour };
})();
