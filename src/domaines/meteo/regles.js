// Apiviz — créneaux météo (IT-03, AP-FEAT-013). Fonctions pures, reprises de meteo.js.
// Les seuils (et leurs sources) restent dans meteo.js et docs/TECHNIQUE.md ; ils sont passés en paramètre.

/** 0 : ne pas ouvrir, 1 : visite rapide, 2 : bonnes conditions. */
export function niveau(seuils, t, risque, vent, pluie = 0) {
  if (pluie > 0 || risque >= seuils.pluie || vent >= seuils.vent) return 0;
  return t >= seuils.ouvrir ? 2 : t >= seuils.rapide ? 1 : 0;
}

const jourDe = (texte) => String(texte).slice(0, 10);

/**
 * Résume une réponse Open-Meteo : température et vent actuels, verdict, meilleur créneau des 3 prochains jours
 * (heures de seuils.debut à seuils.fin), jours suivants avec ou sans créneau.
 * « Maintenant » vient de la réponse (heure locale du rucher) ; `secours` sert si la réponse n'en donne pas.
 */
export function analyse(seuils, j, secours = new Date()) {
  const niv = (...a) => niveau(seuils, ...a);
  const c = j.current || {}, h = j.hourly || {}, d = j.daily || {};
  const maintenant = String(c.time || secours.toISOString().slice(0, 16));
  const auj = jourDe(maintenant), heure = Number(maintenant.slice(11, 13));
  const dates = (d.time || []).filter((x) => x >= auj);
  const horizon = dates[3] || dates[dates.length - 1] || auj;
  const heures = (h.time || []).map((t, i) => ({ t, jour: jourDe(t), h: Number(t.slice(11, 13)),
    temp: Math.round(h.temperature_2m?.[i] ?? -99), n: niv(h.temperature_2m?.[i] ?? -99, h.precipitation_probability?.[i] ?? 0, h.wind_speed_10m?.[i] ?? 0, h.precipitation?.[i] ?? 0) }))
    .filter((x) => x.t >= maintenant.slice(0, 13) && x.jour <= horizon && x.h >= seuils.debut && x.h < seuils.fin);
  const creneau = heures.filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.jour.localeCompare(b.jour) || b.temp - a.temp)[0] || null;

  const temp = Math.round(c.temperature_2m ?? 0), vent = Math.round(c.wind_speed_10m ?? 0);
  const prochaines = (h.time || []).map((t, i) => (t >= maintenant.slice(0, 13) ? h.precipitation_probability?.[i] ?? 0 : -1)).filter((x) => x >= 0).slice(0, 3);
  const risque = Math.max(0, ...prochaines);
  const verdict = heure >= seuils.fin ? "Trop tard pour ouvrir aujourd’hui" : heure < seuils.debut ? "Trop tôt pour ouvrir"
    : (c.precipitation ?? 0) > 0 || risque >= seuils.pluie ? "Pluie probable"
    : vent >= seuils.vent ? "Trop de vent"
    : temp < seuils.rapide ? "Trop frais pour ouvrir"
    : temp < seuils.ouvrir ? "Visite rapide seulement" : "Bon moment pour ouvrir";

  const jours = (d.time || []).map((t, i) => ({ t, max: Math.round(d.temperature_2m_max?.[i] ?? 0), code: d.weather_code?.[i] ?? 3 })).filter((x) => x.t > auj)
    .map((x) => ({ ...x, ok: (h.time || []).some((t, i) => {
      const hh = Number(t.slice(11, 13));
      return jourDe(t) === x.t && hh >= seuils.debut && hh < seuils.fin && niv(h.temperature_2m?.[i] ?? -99, h.precipitation_probability?.[i] ?? 0, h.wind_speed_10m?.[i] ?? 0, h.precipitation?.[i] ?? 0) > 0;
    }) }));
  return { temp, vent, verdict, code: c.weather_code ?? 3, creneau, jours, auj };
}

/**
 * Pourquoi une heure est (ou n'est pas) favorable, en quelques mots, pour l'apiculteur.
 * Même ordre que niveau() : la pluie, puis le vent, puis la température. Chaîne vide si tout va bien.
 */
export function raison(seuils, t, risque, vent, pluie = 0) {
  if (pluie > 0) return "Il pleut";
  if (risque >= seuils.pluie) return `Pluie probable (${Math.round(risque)} %)`;
  if (vent >= seuils.vent) return `Trop de vent (${Math.round(vent)} km/h)`;
  if (t < seuils.rapide) return `Trop frais (${Math.round(t)}°)`;
  if (t < seuils.ouvrir) return "Un peu frais : visite courte";
  return "";
}

/**
 * Regroupe des heures consécutives favorables ({ h, n }, n de niveau()) en plages : [{ debut, fin, n }],
 * `fin` exclue (10 → 13 couvre 10 h, 11 h et 12 h). n est le niveau le plus bas de la plage :
 * une plage « bonne » (2) ne contient que des heures bonnes ; une heure rapide coupe une plage bonne.
 */
export function plages(heures) {
  const res = [];
  for (const x of heures) {
    if (!(x?.n > 0)) continue;
    const der = res[res.length - 1];
    if (der && der.fin === x.h && der.n === x.n) der.fin = x.h + 1;
    else res.push({ debut: x.h, fin: x.h + 1, n: x.n });
  }
  return res;
}
