// Apiviz — « Ma saison ».
// v5.69 (maquette « Accueil compact » validée le 20 nov. 2026) : la saison en cours en un seul écran, sans défiler,
// sur le modèle de l'accueil. Bandeau sapin avec la frise des sept moments de la saison (toucher une phase la résume),
// une priorité d'API à la fois (+ Agenda, Suivant), quatre chiffres qui changent avec la phase (toucher ouvre un aperçu
// dans une feuille du bas), six raccourcis dont celui « du moment ». Règles pures : suivi-saison.js.
// Le bilan de l'année (v5.61 : kilos, pots, argent, kilos par ruche, ce qu'API retient, partager, imprimer) devient
// l'écran « msbilan », ouvert depuis le raccourci « Bilan ».
// Globales d'app.js lues à l'appel : S, esc, eur, cfg, shell, render, yearSel, today, venteTotal, toast, write, sb, ACT, AL,
// $sheet, $sheetForm.
import * as Q from "./regles.js";
import * as V from "./suivi-saison.js";
import { saison as saisonProduits } from "../production/saison.js";
// v5.79 (maquette « Idées à forte valeur », idée 1) : colonies, pertes, varroa, coût du kilo, ce qui a marché / à revoir /
// ce qui manque, trois versions à partager. Règles pures : bilan-saison.js.
import * as BS from "./bilan-saison.js";

const e = (t) => esc(t);
const f = (x) => String(x).replace(".", ",");
const pl = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const ICONE = (d, t = 22) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const reglages = () => (typeof cfg == "function" ? cfg() : {}) || {};

// Ce qui reste d'un rendu à l'autre : phase choisie sur la frise, priorité affichée.
const etat = { annee: null, phase: null, api: 0, version: "complete" };

function calcul() {
  const annee = Number(S.annee) || new Date().getFullYear();
  if (etat.annee !== annee) Object.assign(etat, { annee, phase: null, api: 0 });
  const s = V.suivi(S.d, annee, today(), reglages());
  return { annee, s };
}

/** Kilos par miel, et le meilleur rucher en kilos par ruche (s'il y en a au moins deux qui ont récolté). */
function extra(annee) {
  const parMiel = new Map();
  for (const x of S.d.recoltes || []) if (String(x.date_recolte).slice(0, 4) === String(annee)) parMiel.set(x.miel || "", (parMiel.get(x.miel || "") || 0) + Number(x.kg || 0));
  const ruchers = new Map();
  for (const r of Q.kgParRuche(S.d, annee)) if (r.rucher) { const t = ruchers.get(r.rucher) || { kg: 0, n: 0 }; t.kg += r.kg; t.n += 1; ruchers.set(r.rucher, t); }
  const moy = [...ruchers].map(([nom, t]) => ({ nom, kg: Math.round((t.kg / t.n) * 10) / 10 })).filter((x) => x.kg > 0).sort((a, b) => b.kg - a.kg);
  const v = Q.saison(S.d, annee, typeof venteTotal == "function" ? venteTotal : null);
  // Les kilos par miel n'ont de sens que si au moins une récolte porte un nom de miel.
  const miels = [...parMiel].filter(([m]) => m).length ? [...parMiel].map(([m, k]) => [m || "Autres miels", k]).sort((a, b) => b[1] - a[1]) : [];
  return { parMiel: miels, meilleurRucher: moy.length >= 2 ? moy[0] : null, ventes: { pots: v.pots, clients: v.clients } };
}

/** Priorités d'API, sans celles déjà terminées dans l'agenda ; « dejaAgenda » quand une tâche ouverte porte ce titre. */
function lesPriorites(s) {
  let attente = 0;
  try { attente = saisonProduits(S.d).attente || 0; } catch { attente = 0; }
  const taches = S.d.taches || [];
  return V.priorites(s, { attente })
    .filter((p) => !taches.some((t) => t.faite && t.titre === p.titre))
    .map((p) => ({ ...p, dejaAgenda: taches.some((t) => !t.faite && t.titre === p.titre) }));
}

// ---------- Rendu ----------
function frise(s) {
  const sel = etat.phase || s.phase || "decembre";
  const segs = V.PHASES.map((p) => `<button type="button" class="msc-ph${p.id === sel ? " on" : ""}${p.id === s.phase ? " ici" : ""}" style="flex:${p.mois.length}" data-act="msphase" data-v="${p.id}" aria-pressed="${p.id === sel}" aria-label="${e(p.nom)}${p.id === s.phase ? ", en cours" : ""}"><i class="msc-ph-${p.id}"></i></button>`).join("");
  const ph = V.PHASES.find((p) => p.id === sel);
  return `<div class="msc-frise" role="group" aria-label="Moments de la saison">${segs}${s.courante ? `<span class="msc-auj" style="left:${s.position}%" aria-hidden="true"></span>` : ""}</div>
    <p class="msc-phrase" aria-live="polite"><b>${e(ph.nom)}</b> · ${e(V.textePhase(sel, s))}</p>`;
}

function blocApi(s) {
  const P = lesPriorites(s);
  if (!s.courante) return `<section class="msc-api calme" aria-label="Priorité d’API">${AL?.compagnon ? AL.compagnon("repos", 36) : ""}<div class="msc-api-t"><b>Saison ${s.annee} terminée.</b><span class="small">Retrouve les kilos, les ventes et ce qu’API en retient dans le bilan.</span>
      <div class="msc-api-a"><button type="button" class="btn" data-act="go" data-v="msbilan">Voir le bilan</button></div></div></section>`;
  if (!P.length) return `<section class="msc-api calme" aria-label="Priorité d’API">${AL?.compagnon ? AL.compagnon("repos", 36) : ""}<div class="msc-api-t"><b>Rien d’urgent : ta saison suit son cours.</b><span class="small">D’après tes visites, comptages et récoltes.</span></div></section>`;
  const i = etat.api % P.length, p = P[i];
  return `<section class="msc-api" aria-label="Priorité d’API">${AL?.compagnon ? AL.compagnon("attention", 36) : ""}
    <div class="msc-api-t"><span class="msc-rang">Priorité ${i + 1} sur ${P.length}</span><b>${e(p.titre)}</b><span class="small">${e(p.pourquoi)}</span>
    <div class="msc-api-a">${p.dejaAgenda ? '<span class="msc-deja">Dans l’agenda ✓</span>' : `<button type="button" class="btn main" data-act="msagenda" data-v="${i}">+ Agenda</button>`}${P.length > 1 ? '<button type="button" class="btn" data-act="msapisuivant">Suivant ›</button>' : ""}</div></div></section>`;
}

function blocChiffres(s, x) {
  return `<section class="msc-chiffres" aria-label="Chiffres de la saison">${V.chiffres(s, x.ventes).map((c) => `<button type="button" class="msc-chiffre" data-act="msapercu" data-v="${c.id}" aria-haspopup="dialog"><span>${e(c.nom)}</span><b>${e(c.valeur)}</b><small class="${c.ton}">${e(c.sous)}</small></button>`).join("")}</section>`;
}

const RUBRIQUES = [
  ["recoltes", "Récoltes", "M6 4h12l-1 5H7zM7 9v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9"],
  ["varroa", "Santé", "M12 3l7 4v10l-7 4-7-4V7zM12 8v8M8 12h8"],
  ["agenda", "Agenda", "M4 6h16v14H4zM4 10h16M9 3v4M15 3v4"],
  ["pilotage", "Finances", "M4 20V10M10 20V4M16 20v-7M22 20H2"],
  ["jalons", "Jalons", "M12 2l3 7h7l-5.5 4.5 2 7.5-6.5-4.5L5.5 21l2-7.5L2 9h7z"],
  ["msbilan", "Bilan", "M5 4h11l3 3v13H5zM9 13l2 2 4-4"],
];
function blocRubriques(s) {
  const m = V.moment(s);
  return `<nav class="msc-rubriques" aria-label="Rubriques de la saison">${RUBRIQUES.map(([r, nom, d]) => `<button type="button" class="msc-rub${r === m ? " moment" : ""}" data-act="go" data-v="${r}">${ICONE(d)}<b>${nom}</b>${r === m ? '<span class="msc-badge">Du moment</span>' : ""}</button>`).join("")}</nav>`;
}

export function ecran() {
  const { annee, s } = calcul(), x = extra(annee), b = V.bandeau(s);
  shell("Ma saison", "", yearSel(), // pas de résumé sous le titre : le bandeau dit déjà la saison et sa phase
    `<div class="msc-page">
      <section class="msc-hero" aria-labelledby="msc_t">
        <p class="msc-oeil">${e(b.oeil)}</p>
        <p class="msc-titre" id="msc_t">${e(b.titre)}</p>
        <p class="msc-resume">${e(b.resume)}</p>
        ${frise(s)}
      </section>
      ${blocApi(s)}
      ${blocChiffres(s, x)}
      ${blocRubriques(s)}
    </div>`);
  document.querySelector(".wrap")?.classList.add("msc-ecran");
}

function rafraichir(sel, html) {
  const el = document.querySelector(sel);
  if (el) el.outerHTML = html;
}

// ---------- Gestes ----------
function choisirPhase(id) {
  const { s } = calcul();
  etat.phase = id;
  const hero = document.querySelector(".msc-hero");
  if (!hero) return;
  hero.querySelector(".msc-frise")?.remove();
  hero.querySelector(".msc-phrase")?.remove();
  hero.insertAdjacentHTML("beforeend", frise(s));
  hero.querySelector(`[data-v="${id}"]`)?.focus();
}

function suivante() {
  const { s } = calcul();
  etat.api += 1;
  rafraichir(".msc-api", blocApi(s));
  document.querySelector('.msc-api [data-act="msapisuivant"]')?.focus();
}

async function versAgenda(i) {
  const { s } = calcul();
  const p = lesPriorites(s)[Number(i)];
  if (!p || p.dejaAgenda) return;
  await write(sb.from("taches").insert({ titre: p.titre, ruche_id: p.ruche_id || null }), "Ajouté à l’agenda");
}

function ouvrirApercu(id) {
  const { annee, s } = calcul();
  const a = V.apercu(id, s, extra(annee));
  $sheetForm.onsubmit = (ev) => ev.preventDefault();
  $sheetForm.innerHTML = `<div class="g-ftete"><h2>${e(a.titre)}</h2><button type="button" class="g-fermer" data-act="closesheet" aria-label="Fermer">${ICONE("M18 6L6 18M6 6l12 12")}</button></div>
    ${a.pct !== null ? `<div class="msc-jauge" role="progressbar" aria-label="${e(a.titre)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${a.pct}"><i style="width:${a.pct}%"></i></div>` : ""}
    <ul class="msc-lignes">${a.lignes.map((l) => l.ruche
      ? `<li><button type="button" class="msc-ligne" data-act="msruche" data-v="${e(l.ruche)}"><span>${e(l.k)}</span><b>${e(l.v)}</b><span aria-hidden="true">›</span></button></li>`
      : `<li class="msc-ligne"><span>${e(l.k)}</span><b>${e(l.v)}</b></li>`).join("")}</ul>
    ${a.note ? `<p class="small">${e(a.note)}</p>` : ""}
    <button type="button" class="btn main block" data-act="msaller" data-v="${e(a.bouton[0])}">${e(a.bouton[1])}</button>`;
  $sheetForm.classList.add("msc-feuille");
  document.getElementById("sheet")?.addEventListener("close", () => $sheetForm.classList.remove("msc-feuille"), { once: true });
  $sheet.showModal();
}

// ---------- Bilan de l'année (v5.61) ----------
function donneesBilan() {
  const annee = Number(S.annee) || new Date().getFullYear();
  const vt = typeof venteTotal == "function" ? venteTotal : null;
  const s = Q.saison(S.d, annee, vt);
  const parRuche = Q.kgParRuche(S.d, annee);
  const cs = Q.constats(parRuche, annee);
  const b = BS.bilan({ d: S.d, annee, aujourdhui: today(), ctx: { seuils: S.d.seuils || [], reglages: reglages() }, s, parRuche, constats: cs,
    caAvant: Q.saison(S.d, annee - 1, vt).rentre });
  return { annee, s, parRuche, cs, b };
}

export function ecranBilan() {
  const { annee, s, parRuche, b } = donneesBilan();
  const version = etat.version, m = BS.montre(version);
  const evo = Q.evolution(s.kg, s.kgAvant, annee);
  const sem = annee === new Date().getFullYear() ? Q.semainesDeStock(S.d, s.stock, today()) : null;
  const max = Math.max(1, ...parRuche.map((r) => r.kg));
  const vide = !s.kg && !s.nbVentes && !s.depense;
  const phrase = s.kg ? `${f(s.kg)} kg récoltés${evo ? `, ${evo}` : ""}.` : s.nbVentes ? `${pl(s.pots, "pot")} vendu${s.pots > 1 ? "s" : ""}, pas encore de récolte notée.` : "Pas encore de récolte ni de vente cette saison.";
  const tuile = (t, v, sous, cls = "") => `<div class="ms-tuile ${cls}"><span>${t}</span><b>${v}</b>${sous ? `<span class="ms-sous">${sous}</span>` : ""}</div>`;
  const api = typeof AL != "undefined" && AL.compagnon ? AL.compagnon("repos", 40) : "";
  shell("Bilan de la saison", `Saison ${annee}`, yearSel(),
    `<div class="ms-page">
      <p class="ms-oeil">${e((typeof cfg == "function" && cfg().nom) || "Saison")} · ${annee}</p>
      <p class="ms-phrase">${e(phrase)}</p>
      ${vide ? '<p class="small">Les récoltes, ventes et dépenses de l’année apparaîtront ici au fil de la saison.</p>' : `
      <div class="ms-versions" role="group" aria-label="Version du bilan">${BS.VERSIONS.map((x) => `<button type="button" class="chip${x.id === version ? " on" : ""}" aria-pressed="${x.id === version}" data-act="msversion" data-v="${x.id}">${x.titre}</button>`).join("")}</div>
      <p class="small ms-version-sous">${e(BS.VERSIONS.find((x) => x.id === version).sous)}</p>
      <div class="ms-tuiles">
        ${b.col.debut || b.col.fin ? tuile("Colonies", `${b.col.debut} → ${b.col.fin}`, b.col.pertes ? `${pl(b.col.pertes, "perte")}` : "Aucune perte") : ""}
        ${m.sante && b.va.moyenne != null ? tuile("Varroa moyen", `${e(f(b.va.moyenne))} %`, pl(b.va.comptages, "comptage")) : ""}
        ${m.argent ? `${tuile("Pots vendus", f(s.pots), s.clients ? pl(s.clients, "client") : "", "")}
        ${tuile("Reste en stock", pl(s.stock, "pot"), sem ? `≈ ${pl(sem, "semaine")} de ventes` : "")}
        ${tuile("Argent rentré", e(eur(s.rentre)), "")}
        ${tuile("Dépensé", e(eur(s.depense)), s.rentre || s.depense ? `Solde ${e(eur(s.rentre - s.depense))}` : "")}
        ${b.coutKg != null ? tuile("Coût du kilo", e(eur(b.coutKg)), "dépenses ÷ kilos récoltés") : ""}` : ""}
      </div>
      ${m.details && parRuche.some((r) => r.kg > 0) ? `<section class="card ms-ruches" aria-labelledby="ms_r"><h2 id="ms_r">Kilos récoltés par ruche</h2>
        <p class="small">${parRuche.filter((r) => r.kg > 0).length >= 3 ? "Les 3 meilleures en premier" : "Du meilleur au moins bon"}${s.kg - parRuche.reduce((t, r) => t + r.kg, 0) > 0.05 ? ` · ${f(Math.round((s.kg - parRuche.reduce((t, r) => t + r.kg, 0)) * 10) / 10)} kg récoltés sans ruche précise` : ""}</p>
        <ul>${parRuche.map((r, i) => `<li><span class="ms-nom">${e(r.nom)}</span><span class="ms-barre" aria-hidden="true"><span class="${i < 3 && r.kg > 0 ? "top" : ""}" style="width:${Math.round((r.kg / max) * 100)}%"></span></span><span class="ms-kg">${e(f(r.kg))} kg</span></li>`).join("")}</ul></section>` : ""}
      ${(() => {
        const ok = BS.filtrer(b.marche, version), ko = m.details ? BS.filtrer(b.revoir, version) : [], manque = m.details ? BS.filtrer(b.manque, version) : [];
        if (!ok.length && !ko.length && !manque.length) return "";
        const liste = (l) => l.map((x) => `<p>${e(x.texte)}</p>`).join("");
        return `<section class="ms-api" aria-labelledby="ms_a"><span class="ms-api-av" aria-hidden="true">${api}</span><div>
          ${ok.length ? `<h2 id="ms_a">Ce qui a marché</h2>${liste(ok)}` : `<h2 id="ms_a" class="ms-sr">Bilan</h2>`}
          ${ko.length ? `<h2 class="ms-h">À revoir</h2>${liste(ko)}` : ""}
          ${manque.length ? `<h2 class="ms-h">Ce qui manque</h2><div class="ms-manque">${liste(manque)}</div>` : ""}
          <p class="small">D’après tes récoltes, colonies, comptages et ventes de ${annee}. Rien d’inventé : ce qui manque est signalé.</p></div></section>`;
      })()}
      <div class="ms-boutons"><button type="button" class="btn" data-act="mspartager">Partager le résumé</button><button type="button" class="btn" data-act="msimprimer">Imprimer ou PDF</button></div>`}
    </div>`);
  document.querySelector(".wrap")?.classList.add("ms-ecran");
}

async function partager() {
  const { annee, parRuche, b } = donneesBilan();
  const texte = BS.texte((typeof cfg == "function" && cfg().nom) || "", annee, b, etat.version, parRuche);
  try {
    if (navigator.share) return await navigator.share({ title: `Saison ${annee}`, text: texte });
    await navigator.clipboard.writeText(texte);
    toast("Résumé copié : colle-le dans un message");
  } catch (err) {
    if (err?.name !== "AbortError") toast("Le partage n’est pas possible sur cet appareil. Utilise « Imprimer ».");
  }
}

export const actions = {
  msphase: (id) => choisirPhase(id),
  msapisuivant: () => suivante(),
  msagenda: (i) => versAgenda(i),
  msapercu: (id) => ouvrirApercu(id),
  msruche: (id) => { $sheet.close(); ACT.ruche(id); },
  msaller: (route) => { $sheet.close(); ACT.go(route); },
  mspartager: () => partager(),
  msimprimer: () => window.print(),
  msversion: (v) => { if (BS.VERSIONS.some((x) => x.id === v)) { etat.version = v; render(); } },
};
