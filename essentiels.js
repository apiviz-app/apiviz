// Apidoo — fonctionnalités essentielles : météo par heure, rappels, réglages en blocs, registre complet,
// fiche de lot, factures et conseils du mois. Chargé après ergonomie.js. Styles : fin de index.html.
const ES = (() => {
  const U = UX;
  const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const VUES = {};
  Object.assign(GROUP, { meteo: "ruches", rappels: "dash", lot: "miel", facture: "clients", saison: "dash" });
  const jourLong = (t) => new Date(t + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long" });
  const jourCourt = (t) => new Date(t + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
  const retour = (act, v, texte) => document.querySelector(".wrap")?.insertAdjacentHTML("afterbegin", `<button type="button" class="link u-retour" data-act="${act}" data-v="${esc(v)}">${esc(texte)}</button>`);
  const phrase = (texte) => { const h = document.querySelector(".wrap .head h1"); if (h) { h.textContent = texte; h.closest(".head").classList.add("g-tete"); } };

  // ---------- 1. Météo heure par heure ----------
  ACT.ermeteo = (k) => { S.meteoRucher = k; S.meteoJour = null; go("meteo"); };
  ACT.ermjour = (t) => { S.meteoJour = t; render(); };
  const ETAT = { 2: ["ok", "", "Oui"], 1: ["court", "w", "Rapide"], 0: ["", "non", "Non"] };
  const etatHtml = (n) => (n == null ? "–" : `<span class="eh-etat"><i class="ab-mini ${ETAT[n][1]}"></i>${ETAT[n][2]}</span>`);
  function phraseJour(j) {
    const nom = jourLong(j.t), plage = (n) => { const l = j.heures.filter((x) => x.n === n && !x.passee); return l.length ? [l[0].h, l[l.length - 1].h + 1] : null; };
    const bon = plage(2), vite = plage(1);
    if (bon) return `Tu peux ouvrir ${nom} entre ${bon[0]} h et ${bon[1]} h.`;
    if (vite) return `Visite rapide possible ${nom} entre ${vite[0]} h et ${vite[1]} h.`;
    return `Pas de créneau pour ouvrir ${nom}.`;
  }
  VUES.meteo = function () {
    const k = S.meteoRucher, rs = U.ruchers().find(([x]) => x === k)?.[1] || [], nom = U.nomRucher(k), m = MT.parHeure(k, rs);
    const fin = () => retour("alrucher", k, nom);
    if (!m || m.sansLieu) {
      shell("Météo", nom, "", m ? '<p class="small">Place ce rucher sur la carte pour voir sa météo.</p><button type="button" class="btn" data-act="go" data-v="carte">Ouvrir la carte</button>' : '<p class="small">Météo en cours de chargement…</p>');
      return fin();
    }
    if (!m.jours.some((j) => j.t === S.meteoJour)) S.meteoJour = m.creneau?.jour || m.auj;
    const j = m.jours.find((x) => x.t === S.meteoJour) || m.jours[0];
    const meilleur = j.heures.find((x) => x.n === 2 && !x.passee) || j.heures.find((x) => x.n === 1 && !x.passee);
    const action = meilleur ? `<button type="button" class="btn main" data-act="ervisite" data-v="${meilleur.h}">Prévoir une visite ${esc(jourLong(j.t))} à ${meilleur.h} h</button>` : "";
    const onglets = `<div class="eh-jours" role="group" aria-label="Choisir un jour">${m.jours.map((x) => `<button type="button" class="${x.t === j.t ? "on" : ""} ${x.heures.some((h) => h.n === 2) ? "bon" : ""}" aria-pressed="${x.t === j.t}" data-act="ermjour" data-v="${x.t}">${MT.icone(x.code)}<b>${esc(jourCourt(x.t))}</b> ${x.max}°</button>`).join("")}</div>`;
    const ligne = (titre, f, cl = "") => `<tr><th scope="row">${titre}</th>${j.heures.map((h) => `<td class="${cl} ${h.n === 2 ? "ok" : h.n === 1 ? "court" : ""}">${f(h)}</td>`).join("")}</tr>`;
    const tete = `<tr><th scope="col">Heure</th>${j.heures.map((h) => `<th scope="col">${h.h} h</th>`).join("")}</tr>`;
    const ligneSi = (titre, cle, u) => (j.heures.some((h) => h[cle] != null) ? ligne(titre, (h) => (h[cle] == null ? "–" : `${h[cle]}${u}`)) : "");
    const table = `<section class="eh-table"><table><thead>${tete}</thead><tbody>
      ${ligne("Ciel", (h) => MT.icone(h.code))}${ligne("Température", (h) => `${h.temp}°`, "fort")}${ligne("Risque de pluie", (h) => `${h.risque} %`)}${ligne("Vent", (h) => h.vent)}${ligneSi("Rafales", "rafales", "")}${ligneSi("Humidité", "hum", " %")}${ligne("Ouvrir ?", (h) => etatHtml(h.n))}</tbody></table></section>`;
    const liste = `<section class="eh-liste" aria-label="Prévisions heure par heure">${j.heures.map((h) => `<div class="eh-h ${h.n === 2 ? "ok" : h.n === 1 ? "court" : ""}"><b>${h.h} h</b>${MT.icone(h.code)}<b>${h.temp}°</b><span class="small">Pluie ${h.risque} %, vent ${h.vent}</span><span class="small">${h.n == null ? "–" : ETAT[h.n][2]}</span></div>`).join("")}</section>`;
    const s = MT.SEUILS;
    shell("Météo", `${nom}, ${new Date(j.t + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`, action,
      `${onglets}${table}${liste}<p class="small">Vent et rafales en km/h. Oui à partir de ${s.ouvrir} °C, rapide à partir de ${s.rapide} °C, sans pluie annoncée, avec moins de ${s.vent} km/h de vent et moins de ${s.pluie} % de risque de pluie, entre ${s.debut} h et ${s.fin} h. Ces seuils se règlent dans Réglages.</p>`);
    fin();
    phrase(phraseJour(j));
  };
  ACT.ervisite = (h) => {
    S.erPrefill = { titre: `Visite du rucher ${U.nomRucher(S.meteoRucher)} à ${h} h`, echeance: S.meteoJour };
    tacheForm(null, "");
  };
  const pret = AL.meteoPrete;
  AL.meteoPrete = function () { pret?.(); if (S.route === "meteo") render(); };

  // ---------- Routage ----------
  const renderAvant = window.render;
  window.render = function () {
    const v = VUES[S.route];
    if (!v || !S.session || !S.d || S.member === false || S.recovery) return renderAvant();
    v();
    if (S.lastRoute !== S.route) window.scrollTo?.(0, 0);
    S.lastRoute = S.route;
    document.body.dataset.route = S.route;
  };

  return { VUES, memo, retour, phrase, jourLong };
})();
