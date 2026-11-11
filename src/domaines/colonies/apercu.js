// Apiviz — fiche ruche d'après les maquettes du 10 nov. 2026 (chantier des écrans, étape 5, v5.25).
// Complète l'écran « ruche » après ux.js, alveoles.js et fiche.js (src/domaines/colonies/ecrans.js) :
//   1. ce qu'API dit de la colonie, sous l'en-tête, quand il a quelque chose à dire (suivi.js) ;
//   2. la courbe de poids resserrée autour des pesées, tracée puis pointée, avec sa variation ;
//   3. le journal qui entre carte après carte en arrivant sur la ruche, la visite qu'on vient d'enregistrer en avant.
// Téléphone et ordinateur : la fiche est la même. Les globales d'app.js (S, esc, cfg, byId, dshort, today, AL) ne sont lues
// qu'à l'appel. Rien ne bouge si le téléphone demande de réduire les animations (styles/40-fiche-ruche.css).
import { messageRuche, visitesDe, echellePoids, resumePoids } from "./suivi.js";
import { seuilVarroa } from "../sante/regles.js";

const e = (t) => esc(t);
const MAX_POINTS = 8;
const RECENTE = 10 * 60 * 1000; // une visite enregistrée il y a moins de 10 minutes est « celle qu'on vient de faire »
let derniereVue = null;

/** Complément de l'écran « ruche ». */
export function completerApercu() {
  if (S.route !== "ruche") return;
  const r = byId([...(S.d.ruches || []), ...(S.d.ruchesSorties || [])], S.ruche), wrap = document.querySelector(".wrap");
  if (!r || !wrap) return;
  const arrivee = derniereVue !== r.id;
  derniereVue = r.id;
  message(r, wrap);
  courbe(r, wrap, arrivee);
  journal(wrap, arrivee);
}

// 1. API : la phrase, sa source, sous l'en-tête de la ruche.
function message(r, wrap) {
  const m = messageRuche(r, S.d.visites, { seuil: seuilVarroa(cfg()) });
  const tete = wrap.querySelector(".u-ruche-tete");
  if (!m || !tete) return;
  const api = typeof AL != "undefined" ? AL.compagnon(m.ton === "crit" ? "attention" : "repos", 40) : "";
  tete.insertAdjacentHTML("afterend", `<section class="fr-api ${m.ton}" aria-label="Ce qu’en dit API">${api}
    <div class="fr-api-t"><p>${e(m.phrase)}</p><span class="small">${e(m.source)}</span></div></section>`);
}

// 2. Courbe de poids : échelle autour des pesées, dates sous les points, variation dans l'en-tête du pli.
function courbe(r, wrap, arrivee) {
  const pli = [...wrap.querySelectorAll("details.u-pli")].find((x) => x.textContent.includes("Évolution du poids"));
  if (!pli) return;
  const ps = visitesDe(S.d.visites, r.id).filter((v) => v.poids_kg !== null && v.poids_kg !== undefined && v.poids_kg !== "").slice(0, MAX_POINTS).reverse();
  if (ps.length < 2) return;
  // Largeur réelle de la carte : le dessin reste à l'échelle 1, sur téléphone comme sur ordinateur.
  const W = Math.round(Math.max(280, (pli.clientWidth || 340) - 36)), H = 168, g = 34, dr = 10, haut = 14, bas = 140;
  const { bas: lo, haut: hi, pas } = echellePoids(ps.map((v) => v.poids_kg));
  const x = (i) => g + (i * (W - g - dr)) / (ps.length - 1);
  const y = (v) => bas - ((Number(v) - lo) / (hi - lo)) * (bas - haut);
  const pts = ps.map((v, i) => [Math.round(x(i) * 10) / 10, Math.round(y(v.poids_kg) * 10) / 10]);
  const grille = [lo, lo + pas, hi].map((t) => `<line x1="${g}" x2="${W - dr}" y1="${y(t)}" y2="${y(t)}" class="gl"/><text x="${g - 6}" y="${y(t) + 4}" text-anchor="end" class="at">${t}</text>`).join("");
  const saut = ps.length > 5 ? 2 : 1;
  const dates = ps.map((v, i) => (i % saut === 0 || i === ps.length - 1 ? `<text x="${pts[i][0]}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === ps.length - 1 ? "end" : "middle"}" class="at">${e(dshort(v.date_visite))}</text>` : "")).join("");
  const points = ps.map((v, i) => `<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="4.5" class="fr-point" style="--i:${i}"><title>${e(dshort(v.date_visite))} : ${e(String(v.poids_kg).replace(".", ","))} kg</title></circle>`).join("");
  const resume = resumePoids(ps);
  const etiquette = `Poids de ${r.nom}, de ${ps[0].poids_kg} à ${ps.at(-1).poids_kg} kg entre le ${dshort(ps[0].date_visite)} et le ${dshort(ps.at(-1).date_visite)}`;
  const svg = `<svg class="chart fr-courbe${arrivee ? " fr-trace" : ""}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${e(etiquette)}">${grille}
    <polyline points="${pts.map((p) => p.join(",")).join(" ")}" pathLength="1" class="fr-ligne"/>${points}${dates}</svg>`;
  const ancien = pli.querySelector("svg.chart");
  if (!ancien) return;
  ancien.replaceWith(document.createRange().createContextualFragment(svg));
  pli.querySelector(".legend")?.remove();
  const sommaire = pli.querySelector("summary");
  if (resume && sommaire && !pli.querySelector(".fr-ecart")) sommaire.insertAdjacentHTML("afterend", `<p class="small fr-ecart">${e(resume)}</p>`);
}

// 3. Journal : entrée carte après carte en arrivant ; la visite qu'on vient d'enregistrer est mise en avant.
function journal(wrap, arrivee) {
  const maintenant = Date.now();
  wrap.querySelectorAll(".u-visite").forEach((carte, i) => {
    const v = byId(S.d.visites, carte.querySelector('[data-act="delvisite"]')?.dataset.v);
    if (arrivee && i < 6) { carte.classList.add("fr-entre"); carte.style.setProperty("--i", i); }
    const t = v?.created_at ? Date.parse(v.created_at) : NaN;
    if (v && ((v._attente && v.date_visite === today()) || (!Number.isNaN(t) && maintenant - t < RECENTE))) {
      carte.classList.add("fr-neuve");
      carte.querySelector(".u-visite-h")?.insertAdjacentHTML("beforeend", '<span class="tag good fr-neuve-t">Enregistrée à l’instant</span>');
    }
  });
}
