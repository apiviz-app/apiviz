// Apiviz — saisie d'une récolte en deux étapes (v5.66, maquettes « Nouvelle récolte 1/2 et 2/2 » du 18 nov. 2026,
// validées). Remplace l'affichage de v3.js (V3.vues.recolte) sans toucher à son enregistrement : même état S.recolte
// (ACT.newrecolte), mêmes champs (#r_kg, #r_hum, #r_miel, #r_date, #r_p…, #r_x…, #r_ddm), même formulaire
// « v3recolte ». Les deux étapes sont dans le même formulaire ; celle qu'on ne voit pas garde ses champs.
//   1. Qu'as-tu récolté ? Les ruches en alvéoles (un toucher choisit, les hausses se règlent dessous), le miel en puces,
//      le poids extrait (− / +), l'humidité, la date.
//   2. Mise en pots : un compteur par format, le prix, ce qui reste au maturateur, les pots vides en stock, les numéros
//      de lot qui seront créés et la DDM.
// Globales lues à l'appel : S, esc, n, eur, today, shell, render, toast, UX. Styles : 65-ventes-clients.css.
import * as M from "../materiel/regles.js";

const e = (t) => esc(t);
const FORMATS = [250, 500, 1000];
const MIELS = ["Toutes fleurs", "Printemps", "Été", "Acacia", "Tilleul", "Châtaignier", "Colza", "Forêt"];
const fmt = (g) => (g >= 1000 ? `${n(g / 1000)} kg` : `${g} g`);
const SVG = (d, t = 20) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const MOINS = SVG('<path d="M5 12h14"/>'), PLUS = SVG('<path d="M12 5v14M5 12h14"/>'), COCHE = SVG('<path d="M5 12l5 5 9-10"/>', 18);
const POT = (g) => {
  const t = g >= 1000 ? [20, 4, 24, 12, 13, 40, 46] : g >= 500 ? [21, 7, 22, 15, 15, 34, 42] : [22, 12, 20, 18, 20, 28, 34];
  return `<svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true"><rect x="${t[0]}" y="${t[1]}" width="${t[2]}" height="6" rx="3" fill="#1E2B24"/><rect x="${t[3]}" y="${t[4]}" width="${t[5]}" height="${t[6]}" rx="8" fill="#E3A008" stroke="#1E2B24" stroke-width="3"/></svg>`;
};

/** Lit les champs des deux étapes dans S.recolte (comme lireRecolte de v3.js). */
function lire() {
  const R = S.recolte, v = (id) => document.getElementById(id)?.value;
  if (!R || !document.getElementById("r_kg")) return;
  R.kg = v("r_kg"); R.humidite = v("r_hum"); R.miel = v("r_miel"); R.date = v("r_date"); R.ddm = v("r_ddm");
  FORMATS.forEach((g) => { R.pots[g].n = v("r_p" + g); R.pots[g].prix = v("r_x" + g); });
}
const dansRucher = (R) => UX.ruchers().find(([k]) => k === R.rucher)?.[1] || [];
const choisies = (R) => dansRucher(R).filter((r) => (R.h[r.id] || 0) > 0);
const kgPots = (R) => FORMATS.reduce((s, g) => s + (Number(R.pots[g].n) || 0) * g / 1000, 0);
const nbPots = (R) => FORMATS.reduce((s, g) => s + (Number(R.pots[g].n) || 0), 0);

/** Pots vides du format dans le matériel (catalogue v5.30), ou null s'il n'y en a aucun de suivi. */
function potsVides(g) {
  const l = (S.d.articles || []).filter((a) => M.famille(a) === "emballage" && M.contenance(a) === g);
  return l.length ? l.reduce((s, a) => s + (Number(a.stock) || 0), 0) : null;
}
/** Numéros des lots que l'enregistrement créera (même calcul que v3.js). */
function codesProposes(R) {
  const yy = String(R.date || today()).slice(2, 4);
  let nn = Math.max(0, ...(S.d.lots || []).map((l) => Number(String(l.code).match(new RegExp(`^L${yy}-(\\d+)$`))?.[1]) || 0));
  return FORMATS.filter((g) => Number(R.pots[g].n) > 0).map((g) => [g, `L${yy}-${String(++nn).padStart(2, "0")}`]);
}
const texteReste = (R) => {
  const mp = kgPots(R), reste = (Number(R.kg) || 0) - mp;
  return mp ? `${n(mp)} kg mis en pots${R.kg ? reste >= -0.05 ? ` · ${n(Math.max(0, reste))} kg restent en vrac` : " · plus que le miel extrait" : ""}` : "Rien en pots pour l’instant : tout reste en vrac.";
};

function alveoles(R) {
  const rs = dansRucher(R), lignes = [];
  for (let i = 0; i < rs.length; i += 3) lignes.push(rs.slice(i, i + 3));
  const alv = (r) => {
    const on = (R.h[r.id] || 0) > 0;
    return `<button type="button" class="rc-hx${on ? " on" : ""}" aria-pressed="${on}" data-act="rcruche" data-v="${e(r.id)}" aria-label="${e(r.nom)}${on ? `, ${R.h[r.id]} hausse${R.h[r.id] > 1 ? "s" : ""}` : ""}"><span>${on ? COCHE : ""}<b>${e(r.nom)}</b>${on ? `<i>${R.h[r.id]} h.</i>` : ""}</span></button>`;
  };
  return `<div class="rc-rayon">${lignes.map((l, i) => `<div class="rc-rang${i % 2 ? " rc-decale" : ""}">${l.map(alv).join("")}</div>`).join("")}</div>`;
}

export function ecran() {
  if (!S.recolte) return ACT.newrecolte();
  const R = S.recolte;
  R.etape ||= 1;
  const rs = UX.ruchers(), ch = choisies(R), tous = dansRucher(R);
  const H = ch.reduce((s, r) => s + (R.h[r.id] || 0), 0);
  const parRuche = ch.length && Number(R.kg) > 0 ? Number(R.kg) / ch.length : null;
  const miels = [...new Set([...MIELS, ...(S.d.lots || []).filter((l) => !l.categorie || l.categorie === "Miel").map((l) => l.miel).filter(Boolean)])].slice(0, 8);
  const etape1 = `<div class="rc-etape-1"${R.etape === 1 ? "" : " hidden"}>
    <p class="rc-question">Qu’as-tu récolté ?</p>
    ${rs.length > 1 ? `<div class="field"><div class="t">Rucher</div><div class="pick">${rs.map(([k]) => `<button type="button" class="${k === R.rucher ? "on" : ""}" aria-pressed="${k === R.rucher}" data-act="v3rrucher" data-v="${e(k)}">${e(UX.nomRucher(k))}</button>`).join("")}</div></div>` : ""}
    <section class="rc-bloc"><div class="u-entete"><h2>Sur quelles ruches ?</h2><span class="small">${ch.length} sur ${tous.length}</span></div>
      ${tous.length ? alveoles(R) : '<p class="small">Aucune ruche dans ce rucher : la récolte sera notée pour tout le rucher.</p>'}
      ${tous.length > 1 ? `<button type="button" class="link rc-tout" data-act="rctout">${ch.length === tous.length ? "Aucune ruche" : "Tout le rucher"}</button>` : ""}
      ${ch.length ? `<details class="rc-hausses"><summary>Hausses récoltées · ${H}</summary>
        ${ch.map((r) => `<div class="stepper"><div><b>${e(r.nom)}</b><div class="small">${r.hausses || 0} posée${(r.hausses || 0) > 1 ? "s" : ""}</div></div><div class="ctl"><button type="button" aria-label="Une hausse de moins pour ${e(r.nom)}" data-act="v3rh" data-k="${e(r.id)}" data-v="-1">−</button><span>${R.h[r.id] || 0}</span><button type="button" aria-label="Une hausse de plus pour ${e(r.nom)}" data-act="v3rh" data-k="${e(r.id)}" data-v="1">+</button></div></div>`).join("")}
        <p class="small">Le miel est réparti entre les ruches selon leurs hausses.</p></details>` : '<p class="small">Sans ruche choisie, la récolte est notée pour tout le rucher.</p>'}
    </section>
    <label class="rc-bloc">Quel miel ?<input id="r_miel" list="dl_rcmiel" autocomplete="off" value="${e(R.miel)}"><datalist id="dl_rcmiel">${miels.map((m) => `<option value="${e(m)}">`).join("")}</datalist></label>
    <section class="card rc-poids">
      <label for="r_kg" class="rc-lab">Miel extrait</label>
      <div class="rc-kg"><button type="button" class="rc-rond" data-act="rckg" data-v="-1" aria-label="Un kilo de moins">${MOINS}</button>
        <span class="rc-kg-v"><input id="r_kg" type="number" step="0.1" min="0.1" inputmode="decimal" required value="${e(R.kg)}" placeholder="0"><b>kg</b></span>
        <button type="button" class="rc-rond" data-act="rckg" data-v="1" aria-label="Un kilo de plus">${PLUS}</button></div>
      <p class="small rc-parruche" id="rc_parruche">${parRuche ? `Environ ${n(parRuche)} kg par ruche` : "Le poids après extraction, en kilos."}</p>
    </section>
    <div class="two"><label>Humidité (%)<input id="r_hum" type="number" step="0.1" min="10" max="30" inputmode="decimal" value="${e(R.humidite)}" placeholder="Facultatif"></label>
      <label>Date d’extraction<input id="r_date" type="date" max="${today()}" value="${e(R.date)}" required></label></div>
    <p class="small" id="r_humh"></p>
  </div>`;
  const codes = codesProposes(R), pots = nbPots(R), mp = kgPots(R), part = Number(R.kg) > 0 ? Math.min(100, Math.round(mp / Number(R.kg) * 100)) : 0;
  const manques = FORMATS.filter((g) => Number(R.pots[g].n) > 0).map((g) => [g, Number(R.pots[g].n), potsVides(g)]).filter(([, , v]) => v !== null);
  const etape2 = `<div class="rc-etape-2"${R.etape === 2 ? "" : " hidden"}>
    <div><p class="rc-question">${e(n(Number(R.kg) || 0))} kg à mettre en pots</p><p class="small">${e([R.miel, ch.length ? ch.map((r) => r.nom).join(", ") : "Tout le rucher"].filter(Boolean).join(" · "))}</p></div>
    <section class="card rc-formats">${FORMATS.map((g) => `<div class="rc-format">
      <span class="rc-pot" aria-hidden="true">${POT(g)}</span>
      <span class="rc-format-t"><b>Pot ${fmt(g)}</b><span class="small" id="rc_kg${g}">${n((Number(R.pots[g].n) || 0) * g / 1000)} kg</span>
        <label class="rc-prix">Prix (€)<input id="r_x${g}" type="number" step="0.01" min="0" inputmode="decimal" value="${e(R.pots[g].prix)}" placeholder="—"></label></span>
      <span class="rc-cpt"><button type="button" class="rc-rond" data-act="rcpot" data-k="${g}" data-v="-1" aria-label="Un pot de ${fmt(g)} de moins">${MOINS}</button>
        <label class="rc-cpt-v"><span class="pq-sr">Pots de ${fmt(g)}</span><input id="r_p${g}" type="number" step="1" min="0" inputmode="numeric" value="${e(R.pots[g].n)}" data-v3r="1" placeholder="0"></label>
        <button type="button" class="rc-rond" data-act="rcpot" data-k="${g}" data-v="1" aria-label="Un pot de ${fmt(g)} de plus">${PLUS}</button></span></div>`).join("")}</section>
    <section class="rc-reste"><div class="track rc-jauge"><i id="rc_jauge" style="width:${part}%"></i></div><p class="small" id="r_pots">${e(texteReste(R))}</p></section>
    ${manques.length ? `<section class="rc-vides">${manques.map(([g, besoin, v]) => besoin > v
      ? `<p><b>Il te manque ${besoin - v} pot${besoin - v > 1 ? "s" : ""} de ${fmt(g)} vides.</b> <span class="small">${v} en stock dans ton matériel.</span></p>`
      : `<p class="small">Pots de ${fmt(g)} vides : ${v} en stock, il t’en faut ${besoin}.</p>`).join("")}</section>` : ""}
    <section class="card rc-lot"><div class="u-entete"><h2>${codes.length > 1 ? "Lots créés pour toi" : "Lot créé pour toi"}</h2></div>
      <p class="small" id="rc_codes">${codes.length ? e(codes.map(([g, c]) => `${c} (${fmt(g)})`).join(" · ")) : "Choisis des pots pour créer un lot par format."}</p>
      <label>À consommer de préférence avant<input id="r_ddm" type="date" value="${e(R.ddm)}"></label></section>
  </div>`;
  const barre = R.etape === 1
    ? `<div class="u-barre rc-barre"><button type="button" class="btn main block" data-act="rcetape" data-v="2">Continuer : mise en pots</button>
        <button type="button" class="link" data-act="rcsans">Enregistrer sans mettre en pots</button></div>`
    : `<div class="u-barre rc-barre"><button class="btn main block" ${S.busy ? "disabled" : ""} id="rc_envoyer">${pots ? `Ajouter ${pots} pot${pots > 1 ? "s" : ""} au stock` : "Enregistrer la récolte"}</button>
        <button type="button" class="link" data-act="rcetape" data-v="1">Revenir aux ruches et au poids</button></div>`;
  shell("Récolte", R.etape === 1 ? "Étape 1 sur 2 · ruches et poids" : "Étape 2 sur 2 · mise en pots", '<button class="btn" data-act="go" data-v="recoltes">Annuler</button>', `
    <div class="rc-progres" aria-hidden="true"><i class="on"></i><i class="${R.etape === 2 ? "on" : ""}"></i></div>
    <form data-form="v3recolte" class="form rc-form">${etape1}${etape2}${barre}</form>`);
  document.querySelector(".wrap")?.classList.add("rc-ecran");
  // Avis sur l'humidité : celui de v3.js, qui écoute le champ.
  document.getElementById("r_hum")?.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Mise à jour sans redessiner pendant la frappe (kilos, pots) : par ruche, jauge, numéros de lot, bouton. */
if (typeof document != "undefined") document.addEventListener("input", (ev) => {
  if (S.route !== "recolte" || !S.recolte || !ev.target.closest?.(".rc-form")) return;
  lire();
  const R = S.recolte, ch = choisies(R), q = (id) => document.getElementById(id);
  if (q("rc_parruche")) q("rc_parruche").textContent = ch.length && Number(R.kg) > 0 ? `Environ ${n(Number(R.kg) / ch.length)} kg par ruche` : "Le poids après extraction, en kilos.";
  FORMATS.forEach((g) => { if (q("rc_kg" + g)) q("rc_kg" + g).textContent = `${n((Number(R.pots[g].n) || 0) * g / 1000)} kg`; });
  const mp = kgPots(R), part = Number(R.kg) > 0 ? Math.min(100, Math.round(mp / Number(R.kg) * 100)) : 0;
  if (q("rc_jauge")) q("rc_jauge").style.width = part + "%";
  const codes = codesProposes(R), pots = nbPots(R);
  if (q("rc_codes")) q("rc_codes").textContent = codes.length ? codes.map(([g, c]) => `${c} (${fmt(g)})`).join(" · ") : "Choisis des pots pour créer un lot par format.";
  if (q("rc_envoyer")) q("rc_envoyer").textContent = pots ? `Ajouter ${pots} pot${pots > 1 ? "s" : ""} au stock` : "Enregistrer la récolte";
});

export const actions = {
  rcruche: (id) => {
    lire();
    const R = S.recolte, r = dansRucher(R).find((x) => x.id === id);
    if (!r) return;
    R.h[id] = (R.h[id] || 0) > 0 ? 0 : Math.max(1, Number(r.hausses) || 1);
    render();
  },
  rctout: () => {
    lire();
    const R = S.recolte, rs = dansRucher(R), tout = rs.every((r) => (R.h[r.id] || 0) > 0);
    rs.forEach((r) => { R.h[r.id] = tout ? 0 : Math.max(1, Number(r.hausses) || 1); });
    render();
  },
  rckg: (d) => {
    lire();
    const R = S.recolte;
    R.kg = String(Math.max(0, Math.round(((Number(R.kg) || 0) + Number(d)) * 10) / 10) || "");
    render();
  },
  rcpot: (d, g) => {
    lire();
    const p = S.recolte.pots[g];
    if (!p) return;
    p.n = String(Math.max(0, (Number(p.n) || 0) + Number(d)) || "");
    render();
  },
  rcetape: (v) => {
    lire();
    const R = S.recolte;
    if (v === "2" && !(Number(R.kg) > 0)) { toast("Indique le poids de miel extrait", true); document.getElementById("r_kg")?.focus(); return; }
    R.etape = Number(v) === 2 ? 2 : 1;
    render();
    scrollTo(0, 0);
  },
  rcsans: () => {
    lire();
    const R = S.recolte;
    if (!(Number(R.kg) > 0)) { toast("Indique le poids de miel extrait", true); document.getElementById("r_kg")?.focus(); return; }
    FORMATS.forEach((g) => { R.pots[g].n = ""; const c = document.getElementById("r_p" + g); if (c) c.value = ""; });
    document.querySelector('form[data-form="v3recolte"]')?.requestSubmit();
  },
  // v3.js redessinait son ancien écran : ces deux gestes passent par celui-ci (mêmes effets).
  v3rrucher: (k) => { lire(); S.recolte.rucher = k; S.recolte.h = {}; dansRucher(S.recolte).forEach((r) => { S.recolte.h[r.id] = r.hausses || 0; }); render(); },
  v3rh: (d, id) => { lire(); S.recolte.h[id] = Math.max(0, (S.recolte.h[id] || 0) + Number(d)); render(); },
};
export const remplace = ["v3rrucher", "v3rh"];
