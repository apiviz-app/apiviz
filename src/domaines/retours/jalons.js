// Apiviz — donner envie de revenir (v5.68, maquettes du 20 nov. 2026) :
//   - Accueil : « Ton rayon 2026 », une alvéole par semaine de mars à novembre, plus ou moins remplie selon les visites,
//     la série de semaines d'affilée, le nombre de visites et de jalons ;
//   - écran « jalons » (Accueil › Jalons) : douze jalons de la saison en alvéoles, détail dans une feuille ;
//   - « Nouveau jalon » : une bulle en haut de l'accueil quand un jalon vient d'être gagné (niveau 3).
// Jalons calculés à partir des données (regles.js), sans table. Ce qui a été annoncé ou vu reste sur l'appareil.
// Globales lues à l'appel : S, esc, cfg, shell, sheet, $sheetForm, go, EX.
import * as R from "./regles.js";
import * as Son from "./sons.js";

const aujourdhui = () => (typeof today === "function" ? today() : new Date().toISOString().slice(0, 10));
const liste = () => R.jalons(S.d, { aujourdhui: aujourdhui(), objectif: cfg().objectif_recolte });
const cle = (quoi) => `apidoo-jalons-${(typeof EX !== "undefined" && EX.courante?.()) || "x"}-${R.saisonAnnee(aujourdhui())}-${quoi}`;
const lireIds = (quoi) => { try { const v = JSON.parse(localStorage.getItem(cle(quoi)) || "null"); return Array.isArray(v) ? v : null; } catch { return null; } };
const ecrireIds = (quoi, ids) => { try { localStorage.setItem(cle(quoi), JSON.stringify(ids)); } catch {} };

// Icônes (tracés de 24 × 24), une par jalon.
const ICONES = {
  "premiere-visite": "M12 20v-8M12 12c0-4 3-7 7-7 0 4-3 7-7 7zM12 14c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z",
  printemps: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  "cent-visites": "M4 8l2-1v10M10 12a2.5 4.5 0 1 0 5 0 2.5 4.5 0 1 0-5 0M17 12a2 4.5 0 1 0 4 0 2 4.5 0 1 0-4 0",
  "premiere-recolte": "M7 7h10l1 3v9a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-9zM8 4h8v3H8zM9 13h6",
  tournee: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a3 3 0 0 1 3-3h7M18 9v6a3 3 0 0 1-3 3H8",
  "premiere-vente": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM14.5 9a2.5 2.5 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1.1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2a2.5 2.5 0 0 1-2.5-1.5M12 6v1.5M12 16.5V18",
  ruchers: "M9 4l6 2 5-2v14l-5 2-6-2-5 2V6zM9 4v14M15 6v14",
  objectif: "M12 4v16M5 20h14M6 8h12M6 8l-3 6a3 3 0 0 0 6 0zM18 8l-3 6a3 3 0 0 0 6 0z",
  serie: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M12 14h2",
  "cinquante-ventes": "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2",
  varroa: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5L16 9.5",
  pesees: "M12 3v3M5 21h14l-2-12H7zM9 9a3 3 0 0 1 6 0",
};
const icone = (id, taille = 26) => `<svg viewBox="0 0 24 24" width="${taille}" height="${taille}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONES[id.startsWith("ruchers-") ? "ruchers" : id] || ICONES.tournee}"/></svg>`;
const ETOILE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/></svg>';
const FLAMME = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z"/></svg>';
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

// ---------- Accueil : le rayon de la saison ----------
let choisie = null;
const PAR_RANG = 10;
const infoSemaine = (c) => `Semaine ${c.semaine} (${MOIS[Number(c.lundi.slice(5, 7)) - 1]}) · ${c.n ? `${c.n} visite${c.n > 1 ? "s" : ""}` : "aucune visite"}${c.courante ? " · en cours" : ""}`;

function carteRayon() {
  const r = R.rayon(S.d, aujourdhui()), L = liste(), gagnes = L.filter((j) => j.got).length;
  const rangs = [];
  for (let i = 0; i < r.cellules.length; i += PAR_RANG) rangs.push(r.cellules.slice(i, i + PAR_RANG).map((c, k) => [c, i + k]));
  const html = rangs.map((rg, ri) => `<div class="rt-rang${ri % 2 ? " decale" : ""}">${rg.map(([c, i]) =>
    `<button type="button" class="rt-c n${c.niveau}${c.courante ? " ici" : ""}${c.future ? " futur" : ""}${choisie === i ? " choisie" : ""}" data-act="rtsemaine" data-v="${i}" aria-label="${esc(infoSemaine(c))}"><i></i></button>`).join("")}</div>`).join("");
  return `<section class="card rt-rayon-carte" id="rtRayon">
    <div class="u-entete"><div><h2>Ton rayon ${r.annee}</h2><p class="small">Une alvéole par semaine, remplie à chaque visite</p></div>
      ${r.serie > 1 ? `<span class="rt-serie" title="Semaines d’affilée avec une visite">${FLAMME}${r.serie} sem.</span>` : ""}</div>
    <div class="rt-rayon" role="group" aria-label="Visites par semaine, de mars à novembre">${html}</div>
    <p class="rt-info small" aria-live="polite">${choisie !== null && r.cellules[choisie] ? esc(infoSemaine(r.cellules[choisie])) : "Mars → novembre · touche une alvéole"}</p>
    <div class="rt-legende small" aria-hidden="true"><span><i class="n0"></i>rien</span><span><i class="n1"></i>1–2 visites</span><span><i class="n2"></i>3–5</span><span><i class="n3"></i>6 et +</span></div>
    <div class="rt-deux"><div class="rt-tuile"><b>${r.total}</b><span>visite${r.total > 1 ? "s" : ""} cette saison</span></div>
      <button type="button" class="rt-tuile" data-act="go" data-v="jalons"><b>${gagnes} / ${L.length}</b><span>jalons gagnés <span aria-hidden="true">›</span></span></button></div>
  </section>`;
}

/** Complément de l'accueil (après AC) : la carte du rayon sous les chiffres, puis l'annonce d'un nouveau jalon. */
export function completerAccueil() {
  const apres = document.querySelector(".wrap.ac .ac-chiffres");
  if (!S.d?.ruches.length || !apres || document.getElementById("rtRayon")) return;
  apres.insertAdjacentHTML("afterend", carteRayon());
  annoncer();
}

function choisirSemaine(v) {
  const i = Number(v), r = R.rayon(S.d, aujourdhui()), c = r.cellules[i];
  if (!c) return;
  choisie = i;
  // Plus la semaine est remplie, plus la note est aiguë.
  Son.vibrer("tap");
  Son.note([0, 2, 4, 6][c.niveau]);
  const carte = document.getElementById("rtRayon");
  if (!carte) return;
  carte.querySelectorAll(".rt-c.choisie").forEach((b) => b.classList.remove("choisie"));
  const b = carte.querySelector(`.rt-c[data-v="${i}"]`);
  if (b) { void b.offsetWidth; b.classList.add("choisie"); }
  const info = carte.querySelector(".rt-info");
  if (info) info.textContent = infoSemaine(c);
}

// ---------- Nouveau jalon ----------
function annoncer() {
  const L = liste(), gagnes = L.filter((j) => j.got).map((j) => j.id);
  const deja = lireIds("annonces");
  if (!lireIds("ouverts")) ecrireIds("ouverts", gagnes); // première fois : rien n'est « nouveau »
  const neufs = R.nouveaux(L, deja);
  ecrireIds("annonces", [...new Set([...(deja || []), ...gagnes])]);
  if (!neufs.length) return;
  const j = neufs[neufs.length - 1];
  setTimeout(() => {
    if (S.route !== "dash") return;
    document.querySelector(".rt-jalon")?.remove();
    const b = document.createElement("div");
    b.className = "rt-jalon"; b.setAttribute("role", "status");
    b.innerHTML = `<span class="rt-jalon-i" aria-hidden="true">${ETOILE}</span><span class="rt-jalon-t"><small>${neufs.length > 1 ? `${neufs.length} nouveaux jalons` : "Nouveau jalon"}</small><b>${esc(j.nom)}</b></span><button type="button" class="rt-jalon-b" data-act="go" data-v="jalons">Voir</button>`;
    document.body.appendChild(b);
    Son.niveau(3);
    setTimeout(() => b.remove(), 6500);
  }, 700);
}

// ---------- Écran « jalons » ----------
export function ecran() {
  const L = liste(), an = R.saisonAnnee(aujourdhui()), gagnes = L.filter((j) => j.got);
  const ouverts = new Set(lireIds("ouverts") || []);
  const neufs = new Set(gagnes.filter((j) => !ouverts.has(j.id)).map((j) => j.id));
  ecrireIds("ouverts", [...new Set([...ouverts, ...gagnes.map((j) => j.id)])]);
  const pct = Math.round((gagnes.length / L.length) * 100);
  const badge = (j) => `<button type="button" class="rt-badge${j.got ? " gagne" : ""}${neufs.has(j.id) ? " neuf" : ""}" data-act="jlouvrir" data-v="${esc(j.id)}">
      <span class="rt-hex" aria-hidden="true"><span>${icone(j.id)}</span></span>
      <b>${esc(j.nom)}</b><small>${j.got ? esc(R.dateCourte(j.date) || "Gagné") : esc(R.progression(j))}</small>${neufs.has(j.id) ? '<span class="sr">, nouveau</span>' : ""}</button>`;
  shell("Jalons", `${gagnes.length} sur ${L.length} · saison ${an}`, "", `<div class="rt-jalons">
    <div class="rt-barre" role="progressbar" aria-label="Jalons gagnés" aria-valuemin="0" aria-valuemax="${L.length}" aria-valuenow="${gagnes.length}"><i style="width:${pct}%"></i></div>
    <div class="rt-grille">${L.map(badge).join("")}</div>
    <p class="small rt-note">Les jalons repartent à zéro chaque saison. Ils se calculent à partir de tes visites, récoltes et ventes.</p></div>`);
}

function ouvrirJalon(id, _k, bouton) {
  const j = liste().find((x) => x.id === id);
  if (!j) return;
  if (j.got) { Son.jouer("fete"); Son.vibrer("ok"); }
  else { Son.jouer("refus"); Son.vibrer("refus"); bouton?.classList.remove("rt-secoue"); void bouton?.offsetWidth; bouton?.classList.add("rt-secoue"); }
  sheet({ title: j.nom, intro: j.desc, fields: [], label: "Fermer", submit: async () => {} });
  $sheetForm.querySelector('.actions [data-act="closesheet"]')?.remove();
  $sheetForm.querySelector("h2")?.insertAdjacentHTML("beforebegin", `<div class="rt-detail${j.got ? " gagne" : ""}" aria-hidden="true"><span class="rt-hex"><span>${icone(j.id, 44)}</span></span></div>`);
  $sheetForm.querySelector(".actions")?.insertAdjacentHTML("beforebegin", `<p class="rt-quand">${j.got ? `Gagné le ${esc(R.dateCourte(j.date))}` : esc(R.progression(j) || "Pas encore gagné")}</p>`);
  $sheetForm.classList.add("rt-feuille-jalon");
  document.getElementById("sheet")?.addEventListener("close", () => $sheetForm.classList.remove("rt-feuille-jalon"), { once: true });
}

export const actions = { rtsemaine: choisirSemaine, jlouvrir: ouvrirJalon };
