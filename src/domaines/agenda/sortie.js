// Apiviz — écran « Préparer ma sortie » (v5.80, maquette « apiviz — Idées à forte valeur », idée 4, validée par
// Pierre-Louis le 24 nov. 2026). Agenda › ⋯ › Préparer ma sortie.
// Un jour (aujourd'hui, demain, après-demain) : le créneau météo des ruchers à voir, les ruchers dans l'ordre (du plus
// chargé au moins chargé, à cocher), le programme (tâches et colonies à voir) et le matériel à emporter, comparé au
// stock ; les cases cochées restent sur l'appareil pour ce jour. « Lancer la tournée » ouvre la tournée du premier
// rucher coché. Règles pures : sortie-regles.js.
// Globales lues à l'appel : S, esc, today, shell, render, ACT, MT.
import * as P from "./sortie-regles.js";

const e = (t) => esc(t);
const etat = { jour: null, exclus: new Set(), cases: null, casesJour: null, essais: 0 };
const cleCases = (jour) => `apiviz-sortie-${jour}`;
const lire = (k) => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const nomRucher = (k) => k || "Sans rucher";
const ruchesDe = (k) => (S.d.ruches || []).filter((r) => (r.rucher || "") === k);

function donnees() {
  const jours = P.jours(today());
  if (!etat.jour || !jours.some((j) => j.iso === etat.jour)) etat.jour = jours[1].iso;
  if (etat.casesJour !== etat.jour) { etat.cases = new Set(lire(cleCases(etat.jour))); etat.casesJour = etat.jour; }
  const items = P.programme(S.d, etat.jour, (r) => r.rucher || "");
  const groupes = P.parRucher(items);
  const choisis = groupes.filter((g) => !etat.exclus.has(g.cle));
  const gardes = items.filter((x) => x.rucher == null || !etat.exclus.has(x.rucher));
  return { jours, items, groupes, choisis, gardes, materiel: P.materiel(gardes, S.d.articles || []) };
}

/** Créneau du jour pour le premier rucher choisi dont la météo est connue (MT lance le chargement sinon). */
function creneau(choisis) {
  if (typeof MT == "undefined") return null;
  for (const g of choisis) {
    const m = MT.parHeure(g.cle, ruchesDe(g.cle));
    if (m === null) return { attente: true, charge: true };
    if (!m || m.sansLieu) continue;
    const j = (m.jours || []).find((x) => x.t === etat.jour);
    if (!j) continue;
    const p = P.meilleurePlage(j.plages);
    const temps = p ? j.heures.filter((h) => h.h >= p.debut && h.h < p.fin) : [];
    const t = temps.length ? Math.max(...temps.map((h) => h.temp)) : j.max;
    return { rucher: g.cle, plage: p, temp: t, sec: temps.every((h) => !(h.pluie > 0)) };
  }
  return choisis.length ? { attente: true } : null;
}

export function ecran() {
  const { jours, items, groupes, choisis, gardes, materiel } = donnees();
  const jour = jours.find((j) => j.iso === etat.jour);
  const cr = creneau(choisis);
  const cocheMat = materiel.filter((m) => etat.cases.has(m.nom)).length;
  const meteo = !cr ? "" : cr.charge ? '<p class="small">Météo du créneau en cours de chargement…</p>' : cr.attente ? '<p class="small">Météo du créneau : place tes ruchers sur la carte pour la voir.</p>'
    : cr.plage ? `<div class="so-meteo"><b>Créneau conseillé : ${cr.plage.debut} h – ${cr.plage.fin} h</b><span class="so-tag ${cr.plage.n === 2 ? "ok" : "rapide"}">${cr.plage.n === 2 ? `${e(cr.temp)} °C${cr.sec ? " · sec" : ""}` : "visite rapide"}</span></div>`
    : `<div class="so-meteo"><b>Pas de créneau favorable ce jour-là</b><span class="so-tag non">${e(cr.temp)} °C max</span></div>`;
  const ligneRucher = (g, i) => {
    const pris = !etat.exclus.has(g.cle);
    return `<label class="so-rucher"><input type="checkbox" data-so-rucher="${e(g.cle)}" ${pris ? "checked" : ""}><span><b>${pris ? `${choisis.indexOf(g) + 1}. ` : ""}${e(nomRucher(g.cle))}</b><span class="small">${g.colonies} colonie${g.colonies > 1 ? "s" : ""} · ${g.items.length} chose${g.items.length > 1 ? "s" : ""} à faire</span></span></label>`;
  };
  const prog = gardes.map((x) => `<li${x.retard ? ' class="retard"' : ""}>${e(x.texte)}${x.retard ? ' <span class="so-tag non">en retard</span>' : ""}</li>`).join("");
  const mat = materiel.map((m) => `<label class="so-mat"><input type="checkbox" data-so-mat="${e(m.nom)}" ${etat.cases.has(m.nom) ? "checked" : ""}><span><b>${e(m.nom)}</b><span class="small">${e(P.detail(m))}</span></span>${m.manque ? `<span class="so-tag manque">${m.stock === 0 && m.besoin == null ? "Plus en stock" : `Il en manque ${e(m.manque)}`}</span>` : ""}</label>`).join("");
  shell("Préparer ma sortie", `${jour.titre} · ${new Date(etat.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`, "",
    `<div class="so-page">
      <div class="so-jours" role="group" aria-label="Jour de la sortie">${jours.map((j) => `<button type="button" class="chip${j.iso === etat.jour ? " on" : ""}" aria-pressed="${j.iso === etat.jour}" data-act="sojour" data-v="${j.iso}">${j.titre}</button>`).join("")}</div>
      ${!items.length ? `<section class="card"><h2>Rien de prévu ce jour-là</h2><p class="small">Pas de tâche à cette date et aucune colonie à revoir. Ajoute une tâche dans l’agenda, ou choisis un autre jour.</p></section>` : `
      ${groupes.length ? `<section class="card so-carte">${meteo}<h2>Ruchers à voir</h2>${groupes.map(ligneRucher).join("")}</section>` : ""}
      <section class="card so-carte"><h2>Au programme</h2><ul class="so-prog">${prog}</ul></section>`}
      <section class="card so-carte"><div class="so-tete"><h2>Dans la voiture</h2><span class="small">${cocheMat} sur ${materiel.length}</span></div>${mat}
        <p class="small">D’après les mots de tes tâches et alertes, comparé à ton stock de Matériel.</p></section>
      ${choisis.length ? `<div class="op-pied"><button type="button" class="btn main" data-act="sopartir" data-v="${e(choisis[0].cle)}">Partir : lancer la tournée</button></div>` : ""}
    </div>`);
  document.querySelectorAll("[data-so-rucher]").forEach((c) => c.addEventListener("change", () => {
    const k = c.dataset.soRucher;
    if (c.checked) etat.exclus.delete(k); else etat.exclus.add(k);
    render();
  }));
  document.querySelectorAll("[data-so-mat]").forEach((c) => c.addEventListener("change", () => {
    const k = c.dataset.soMat;
    if (c.checked) etat.cases.add(k); else etat.cases.delete(k);
    ecrire(cleCases(etat.jour), [...etat.cases]);
    const t = document.querySelector(".so-tete .small");
    if (t) t.textContent = `${document.querySelectorAll("[data-so-mat]:checked").length} sur ${document.querySelectorAll("[data-so-mat]").length}`;
  }));
  // La météo arrive après coup (MT la charge) : redessiner quelques fois tant que l'écran est là.
  if (cr?.charge && etat.essais < 4) { etat.essais += 1; setTimeout(() => { if (S.route === "sortie") render(); }, 1500); }
}

/** Bouton « Préparer ma sortie » dans les actions de l'Agenda (le gabarit le range dans ⋯ sur téléphone). */
export function completerAgenda() {
  if (S.route !== "agenda") return;
  document.querySelector(".wrap > .head > .actions")?.insertAdjacentHTML("beforeend", '<button type="button" class="btn" data-act="go" data-v="sortie">Préparer ma sortie</button>');
}

export const actions = {
  sojour: (iso) => { etat.jour = iso; etat.exclus.clear(); etat.essais = 0; render(); },
  sopartir: (cle) => { if (typeof ACT.v3tournee == "function") ACT.v3tournee(cle); },
};
