// Apiviz — écran « Comparer mes ruchers » (v5.81, maquette « apiviz — Idées à forte valeur », idée 2, validée par
// Pierre-Louis le 24 nov. 2026). Ruchers › ⋯ › Comparer mes ruchers.
// Une carte par rucher (kilos par colonie en barre, pertes, varroa, valeur estimée), triées selon le critère choisi ;
// repères « Meilleur rendement » / « Le plus faible » ; une lecture prudente ; les kilos par colonie sur trois saisons.
// Règles pures : comparer-regles.js.
// Globales lues à l'appel : S, esc, eur0, cfg, shell, render, yearSel, Regles.
import * as C from "./comparer-regles.js";

const e = (t) => esc(t);
const f = (x) => String(x).replace(".", ",");
const etat = { critere: "kg" };
const nom = (k) => k || "Sans rucher";

export function ecran() {
  const annee = Number(S.annee) || new Date().getFullYear();
  const prixKg = window.Regles?.finances ? Regles.finances.fin(S.d, annee).prixKg : null;
  const lignes = C.comparer(S.d, annee, { prixKg, ctx: { seuils: S.d.seuils || [], reglages: typeof cfg == "function" ? cfg() : {} } });
  const tri = C.trier(lignes, etat.critere), rep = C.reperes(lignes), lecture = C.lecture(lignes, nom);
  const max = Math.max(1, ...lignes.map((l) => l.kgParColonie || 0));
  const nbCol = lignes.reduce((t, l) => t + l.colonies, 0);
  const carte = (l) => `<section class="card cr-carte">
      <div class="cr-tete"><b>${e(nom(l.cle))}</b><span class="small">${l.colonies} colonie${l.colonies > 1 ? "s" : ""}</span></div>
      <div class="cr-kg"><span class="cr-barre" aria-hidden="true"><span style="width:${Math.round(((l.kgParColonie || 0) / max) * 100)}%"></span></span><b>${l.kgParColonie == null ? "—" : `${e(f(l.kgParColonie))} kg`}</b><span class="small">par colonie</span></div>
      <p class="cr-chiffres"><span>Récolte <b>${e(f(l.kg))} kg</b></span><span>Pertes <b>${l.pertes}</b></span><span>Varroa <b>${l.varroa == null ? "—" : e(f(l.varroa)) + " %"}</b>${l.auDessus ? ` <span class="small">(${l.auDessus} au-dessus du seuil)</span>` : ""}</span>${l.valeur != null ? `<span>Valeur <b>${e(eur0(l.valeur))}</b></span>` : ""}</p>
      ${rep.meilleur === l.cle ? '<span class="cr-tag ok">Meilleur rendement</span>' : rep.faible === l.cle ? '<span class="cr-tag faible">Le plus faible</span>' : ""}
    </section>`;
  const histoire = lignes.length ? `<section class="card cr-histoire"><h2>Kilos par colonie, sur 3 saisons</h2>
      <table class="cr-table"><thead><tr><th scope="col">Rucher</th>${lignes[0].histoire.map((h) => `<th scope="col">${h.annee}</th>`).join("")}</tr></thead>
      <tbody>${C.trier(lignes, "kg").map((l) => `<tr><th scope="row">${e(nom(l.cle))}</th>${l.histoire.map((h, i) => `<td${i === 2 ? ' class="cr-an"' : ""}>${h.kgParColonie == null ? "—" : e(f(h.kgParColonie))}</td>`).join("")}</tr>`).join("")}</tbody></table></section>` : "";
  // Titre court : il tient à côté du choix de l'année sur téléphone (le menu dit « Comparer mes ruchers »).
  shell("Comparaison", `Tes ruchers en ${annee} · ${lignes.length} rucher${lignes.length > 1 ? "s" : ""}, ${nbCol} colonie${nbCol > 1 ? "s" : ""}`, yearSel(),
    `<div class="cr-page">
      ${lignes.length < 2 ? `<section class="card"><h2>Il faut au moins deux ruchers</h2><p class="small">Avec un seul rucher, il n’y a rien à comparer. Les chiffres de ${e(nom(lignes[0]?.cle ?? ""))} restent dans le Bilan de la saison.</p></section>` : `
      <div class="cr-criteres" role="group" aria-label="Trier par">${C.CRITERES.map((c) => `<button type="button" class="chip${c.id === etat.critere ? " on" : ""}" aria-pressed="${c.id === etat.critere}" data-act="crcritere" data-v="${c.id}">${c.titre}</button>`).join("")}</div>
      ${tri.map(carte).join("")}
      ${lecture ? `<section class="card cr-lecture"><b>Ce que montrent tes chiffres</b><p>${e(lecture)}</p></section>` : ""}
      ${histoire}
      <p class="small">Une colonie compte dans le rucher où elle est aujourd’hui. Valeur : kilos récoltés × prix moyen du kilo vendu en ${annee}${prixKg ? "" : " (pas de vente de miel cette année : pas de valeur)"}.</p>`}
    </div>`);
}

export const actions = {
  crcritere: (c) => { if (C.CRITERES.some((x) => x.id === c)) { etat.critere = c; render(); } },
};
