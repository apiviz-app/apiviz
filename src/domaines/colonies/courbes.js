// Apiviz — onglet « Courbes » de la fiche d'une ruche (v5.61, maquette « Courbes d'une colonie » validée le 17 nov.
// 2026). Une mesure à la fois (Poids, Varroa, Force), sur la saison : l'année en cours en trait plein, l'an dernier en
// pointillés, une autre ruche en option ; récoltes et traitements posés sur la courbe ; le seuil d'alerte pour le
// varroa ; une phrase qui dit ce qui compte ; la liste de ce qui s'est passé.
// Rempli après le rendu de l'écran « ruche » (src/domaines/colonies/ecrans.js), dans <div class="cb-onglet"> d'ux.js.
// Règles pures : ../equipe/regles.js. Globales d'app.js lues à l'appel : S, esc, cfg, byId, render.
import * as Q from "../equipe/regles.js";
import { tauxVarroa, comptages, seuilApplicable } from "../sante/regles.js";

const e = (t) => esc(t);
const etat = () => (S.cb ||= { mesure: "poids", comparer: "" });
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const f = (x, dec) => String(Math.round(x * 10 ** dec) / 10 ** dec).replace(".", ",");
const dateCourte = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

/** Dessin de la courbe : SVG à l'échelle de la carte, en éléments simples (lisible au lecteur d'écran par son titre). */
function dessin(s, comp, evts, mesure, seuil, W) {
  const H = 210, g = 34, dr = 10, haut = 14, bas = 172;
  const listes = [s[0].points, s[1].points, ...(comp ? [comp.points] : [])];
  const { de, a } = Q.fenetre(listes);
  const { bas: lo, haut: hi } = Q.echelle(listes.flat().map((p) => p.v), mesure, mesure === "varroa" ? seuil : null);
  const x = (j) => g + ((j - de) / (a - de)) * (W - g - dr);
  const y = (v) => bas - ((v - lo) / (hi - lo)) * (bas - haut);
  const pas = mesure === "force" ? 1 : (hi - lo) / 2;
  const grille = [];
  for (let t = lo; t <= hi + 1e-9; t += pas) grille.push(`<line x1="${g}" x2="${W - dr}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" class="cb-gl"/><text x="${g - 6}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end" class="cb-at">${f(t, mesure === "varroa" ? 1 : 0)}</text>`);
  const mois = [];
  const pasMois = Math.max(1, Math.ceil(34 / ((30.4 / (a - de)) * (W - g - dr))));
  for (let m = 0; m < 12; m += pasMois) { const j = m * 30.4 + 15; if (j >= de && j <= a) mois.push(`<text x="${x(j).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="cb-at">${MOIS[m]}</text>`); }
  const ligne = (pts, cls) => (pts.length > 1 ? `<polyline points="${pts.map((p) => `${x(p.j).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")}" class="${cls}"/>` : "");
  const points = (pts, cls, quoi) => pts.map((p) => `<circle cx="${x(p.j).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${cls === "cb-p" ? 4.5 : 3.5}" class="${cls}"><title>${e(quoi)} · ${e(dateCourte(p.date))} : ${e(f(p.v, Q.MESURES[mesure].dec))}${e(Q.MESURES[mesure].unite)}</title></circle>`).join("");
  const marques = evts.map((ev) => `<line x1="${x(ev.j).toFixed(1)}" x2="${x(ev.j).toFixed(1)}" y1="${haut - 4}" y2="${bas}" class="cb-ev ${ev.type}"><title>${ev.type === "recolte" ? "Récolte" : "Traitement"} · ${e(dateCourte(ev.date))} : ${e(ev.texte)}</title></line>`).join("");
  const seuilL = mesure === "varroa" && seuil != null && seuil <= hi ? `<line x1="${g}" x2="${W - dr}" y1="${y(seuil).toFixed(1)}" y2="${y(seuil).toFixed(1)}" class="cb-seuil"/><text x="${W - dr}" y="${(y(seuil) - 5).toFixed(1)}" text-anchor="end" class="cb-seuil-t">seuil ${f(seuil, 1)} %</text>` : "";
  const der = s[0].points.at(-1);
  const etiquette = `${Q.MESURES[mesure].titre}, ${s[0].annee}${der ? `, dernière mesure ${f(der.v, Q.MESURES[mesure].dec)}${Q.MESURES[mesure].unite} le ${dateCourte(der.date)}` : ""}`;
  return `<svg class="cb-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${e(etiquette)}">${grille.join("")}${mois.join("")}${seuilL}${marques}
    ${ligne(s[1].points, "cb-avant")}${points(s[1].points, "cb-p-avant", String(s[1].annee))}
    ${comp ? ligne(comp.points, "cb-comp") + points(comp.points, "cb-p-comp", comp.nom) : ""}
    ${ligne(s[0].points, "cb-ligne")}${points(s[0].points, "cb-p", String(s[0].annee))}</svg>`;
}

export function completerCourbes() {
  const zone = document.querySelector(".cb-onglet");
  if (S.route !== "ruche" || !zone) return;
  const r = byId([...(S.d.ruches || []), ...(S.d.ruchesSorties || [])], S.ruche);
  if (!r) return;
  const st = etat(), mesure = Q.MESURES[st.mesure] ? st.mesure : "poids", annee = new Date().getFullYear();
  // IT-12 : le varroa se lit dans tous les comptages (visites et comptages du rucher, migration 036) ; le seuil est
  // celui qui s'applique au dernier comptage de la colonie (sa méthode, son mois), sans valeur par défaut.
  const source = mesure === "varroa" ? comptages(S.d) : S.d.visites;
  const dernier = mesure === "varroa" ? source.find((c) => c.ruche_id === r.id && tauxVarroa(c) !== null) : null;
  const sa = dernier ? seuilApplicable(dernier, { seuils: S.d.seuils || [], reglages: typeof cfg == "function" ? cfg() : {} }) : null;
  const seuil = sa && sa.unite === "pourcent" ? sa.valeur : null;
  const s = Q.series(source, r.id, mesure, annee, tauxVarroa);
  const autre = st.comparer && st.comparer !== r.id ? byId(S.d.ruches || [], st.comparer) : null;
  const comp = autre ? { nom: autre.nom, points: Q.series(source, autre.id, mesure, annee, tauxVarroa)[0].points } : null;
  const evts = Q.evenements(S.d, r.id, annee);
  const phrase = Q.phraseCourbe(s, mesure, seuil);
  const der = s[0].points.at(-1);
  const W = Math.round(Math.max(290, Math.min(720, (zone.clientWidth || 340) - 34)));
  const rien = !s[0].points.length && !s[1].points.length && !(comp && comp.points.length);
  const autres = (S.d.ruches || []).filter((x) => x.id !== r.id).sort((a, b) => String(a.nom).localeCompare(String(b.nom), "fr", { numeric: true }));
  zone.innerHTML = `<div class="cb-seg" role="group" aria-label="Mesure">${Object.entries(Q.MESURES).map(([k, m]) => `<button type="button" class="${k === mesure ? "on" : ""}" aria-pressed="${k === mesure}" data-act="cbmesure" data-v="${k}">${e(m.nom)}</button>`).join("")}</div>
    <section class="card cb-carte" aria-labelledby="cb_t">
      <div class="cb-tete"><h2 id="cb_t">${e(Q.MESURES[mesure].titre)}</h2>${der ? `<b class="cb-der">${e(f(der.v, Q.MESURES[mesure].dec))}${e(Q.MESURES[mesure].unite)}</b>` : ""}</div>
      <p class="cb-phrase ${phrase.ton}">${e(phrase.texte)}</p>
      ${rien ? `<p class="small">Aucune mesure ${mesure === "poids" ? "de poids" : mesure === "varroa" ? "de varroa" : "de force"} pour ${annee} ni ${annee - 1}. Note-la à la prochaine visite.</p>` : dessin(s, comp, evts, mesure, seuil, W)}
      ${rien ? "" : `<div class="cb-legende">
        <span><i class="cb-l plein" aria-hidden="true"></i>${annee}</span>
        ${s[1].points.length ? `<span><i class="cb-l tirets" aria-hidden="true"></i>${annee - 1}</span>` : ""}
        ${comp ? `<span><i class="cb-l comp" aria-hidden="true"></i>${e(comp.nom)}</span>` : ""}
        ${evts.some((x) => x.type === "recolte") ? '<span><i class="cb-l recolte" aria-hidden="true"></i>Récolte</span>' : ""}
        ${evts.some((x) => x.type === "traitement") ? '<span><i class="cb-l traitement" aria-hidden="true"></i>Traitement</span>' : ""}
      </div>`}
      ${autres.length ? `<label class="cb-comparer"><span>Comparer à</span><select id="cb_comp"><option value="">Aucune autre ruche</option>${autres.map((x) => `<option value="${e(x.id)}"${x.id === st.comparer ? " selected" : ""}>${e(x.nom)}</option>`).join("")}</select></label>` : ""}
    </section>
    ${evts.length ? `<section class="cb-evts" aria-labelledby="cb_e"><h2 id="cb_e" class="u-titre">Ce qui s’est passé en ${annee}</h2>
      <ul class="card cb-liste">${evts.map((ev) => `<li><span><b>${ev.type === "recolte" ? "Récolte" : "Traitement"}</b> · ${e(ev.texte)}</span><span class="small">${e(dateCourte(ev.date))}</span></li>`).join("")}</ul></section>` : ""}`;
  zone.querySelector("#cb_comp")?.addEventListener("change", (ev) => { etat().comparer = ev.target.value; completerCourbes(); });
}

export const actions = {
  cbmesure: (v) => { etat().mesure = v; completerCourbes(); },
};
