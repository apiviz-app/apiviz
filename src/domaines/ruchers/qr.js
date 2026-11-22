// Apiviz — étiquettes QR des ruches (v5.57, maquette « Scanner une ruche » validée le 17 nov. 2026).
//   - Chaque ruche a un QR : le lien de l'application avec la ruche (« ?ruche=<id>&ex=<exploitation> »).
//   - Viser l'étiquette avec l'appareil photo du téléphone ouvre Apiviz ; viser depuis Apiviz (« Scanner une ruche »)
//     lit le QR sans quitter l'application, là où le navigateur sait lire les QR (BarcodeDetector : Chrome sur
//     Android). Ailleurs (iPhone), la feuille explique d'utiliser l'appareil photo.
//   - Dans les deux cas, la feuille de la ruche s'ouvre : état, ce qu'API en dit, Visite express, Nouvelle visite,
//     Ouvrir la fiche.
//   - Étiquettes : écran « Étiquettes QR » (Ruchers › ⋯), une planche A4 à imprimer (3 × 7 étiquettes), filtrée par
//     rucher. Le dessin du QR vient de qrcode.js (qrcode-generator, licence MIT), chargé seulement sur cet écran.
//   - IT-10 (migration 034, maquette du 22 nov. 2026) : lien court « ?c=K7M2&ex=<exploitation> » avec le code court de
//     la colonie (QR moins dense, mieux lu au soleil), code imprimé en gros sous le QR et saisissable à la main
//     (« Étiquette abîmée ? »), choix des étiquettes (seulement les nouvelles, tout le rucher, ou choisies), étiquette
//     unitaire (une par page, 100 × 60 mm). Les étiquettes déjà collées (?ruche=) restent lues. Sans la migration 034
//     (pas de code court en base), l'écran garde les liens ?ruche= de la v5.57.
//   - Hors ligne : la colonie est cherchée dans les données déjà sur le téléphone ; si elle n'y est pas encore, la
//     demande est gardée et la fiche s'ouvre dès le retour du réseau.
// Règles pures : src/domaines/ventes/terrain-regles.js. Globales d'app.js lues à l'appel : S, esc, ACT, go, render,
// shell, toast, $sheet, $sheetForm, EX.
import * as T from "../ventes/terrain-regles.js";
import * as TB from "../colonies/tableau.js";

const CLE = "apiviz-ruche-scannee";
const e = (t) => esc(t);
const ic = (d, t = 22) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const I = { croix: "M18 6L6 18M6 6l12 12", qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" };
const lecteur = () => document.documentElement.classList.contains("lecteur");
const exploitation = () => (typeof EX != "undefined" && EX.courante?.()) || "";
const base = () => new URL(location.pathname, location.origin).toString();

// ---------- Lien ouvert depuis l'appareil photo ----------
if (typeof window != "undefined") {
  try {
    const u0 = new URL(location.href);
    const p = u0.searchParams.has("ruche") || u0.searchParams.has("c") ? T.lireQr(location.href) : null;
    if (p) {
      sessionStorage.setItem(CLE, JSON.stringify(p));
      const u = new URL(location.href);
      u.searchParams.delete("ruche"); u.searchParams.delete("ex"); u.searchParams.delete("c");
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    }
  } catch { /* navigation privée */ }
}

const horsLigne = () => (typeof HL != "undefined" && HL.horsLigne?.()) || navigator.onLine === false;

/** Après chaque rendu : une ruche scannée en attente s'ouvre dès que les données sont là. */
export function apresRendu() {
  let p = null;
  try { p = JSON.parse(sessionStorage.getItem(CLE) || "null"); } catch { return; }
  if (!p || !S.session || !Array.isArray(S.d?.ruches) || !S.d.ruches.length || $sheet.open) return;
  const r = T.trouverRuche(S.d.ruches, p, exploitation());
  const pourquoi = r ? null : T.raisonIntrouvable(p, exploitation(), horsLigne());
  // Hors ligne et pas encore sur ce téléphone : on garde la demande, la fiche s'ouvrira après la synchronisation.
  if (pourquoi?.raison === "attente") {
    if (!p.dit) { p.dit = true; try { sessionStorage.setItem(CLE, JSON.stringify(p)); } catch { /* rien */ } toast(pourquoi.texte); }
    return;
  }
  try { sessionStorage.removeItem(CLE); } catch { /* rien */ }
  if (r) return setTimeout(() => feuille(r.id), 0);
  toast(pourquoi.texte, pourquoi.raison !== "inconnu");
}

/** Ouvre la colonie lue (QR ou code tapé) ; sinon dit pourquoi, dans la zone d'aide de la feuille. */
function ouvrirLu(p, aide) {
  const r = T.trouverRuche(S.d.ruches || [], p, exploitation());
  if (r) { arreter(); feuille(r.id); return true; }
  const pourquoi = T.raisonIntrouvable(p, exploitation(), horsLigne());
  if (pourquoi.raison === "attente") { try { sessionStorage.setItem(CLE, JSON.stringify({ ...p, dit: true })); } catch { /* rien */ } }
  if (aide) aide.textContent = pourquoi.texte;
  else toast(pourquoi.texte, true);
  return false;
}

// ---------- Feuille de la ruche ----------
export function feuille(id) {
  const r = (S.d.ruches || []).find((x) => x.id === id);
  if (!r) return;
  const l = TB.lignes(S.d).find((x) => x.id === id);
  const niveau = l ? TB.NIVEAUX[l.niveau] : null;
  const vue = !l ? "" : l.jours === null ? "jamais visitée" : l.jours === 0 ? "vue aujourd’hui" : `vue il y a ${l.jours} jour${l.jours > 1 ? "s" : ""}`;
  const raison = l?.raisons?.[0]?.texte || "";
  const express = typeof ACT.veruche == "function" && (S.d.visites || []).some((v) => v.ruche_id === id);
  const ecrire = !lecteur();
  $sheetForm.onsubmit = (ev) => ev.preventDefault();
  $sheetForm.innerHTML = `<div class="g-ftete"><h2>${e(r.nom)}</h2><button type="button" class="g-fermer" data-act="closesheet" aria-label="Fermer">${ic(I.croix)}</button></div>
    <div class="qr-feuille">
      <p class="qr-sous">${e([l?.rucher || r.rucher, vue].filter(Boolean).join(" · "))}${niveau ? ` <span class="tag ${niveau.ton}">${e(niveau.libelle)}</span>` : ""}</p>
      ${raison ? `<p class="qr-raison">${e(raison)}</p>` : ""}
      ${ecrire ? `<div class="qr-actions">
        ${express ? `<button type="button" class="btn main" data-act="qrexpress" data-v="${e(id)}">Visite express</button><button type="button" class="btn" data-act="qrvisite" data-v="${e(id)}">Visite complète</button>`
          : `<button type="button" class="btn main" data-act="qrvisite" data-v="${e(id)}">Nouvelle visite</button>`}
      </div>` : ""}
      <button type="button" class="btn" data-act="qrfiche" data-v="${e(id)}">Ouvrir la fiche</button>
      <button type="button" class="link qr-autre" data-act="qrscanner">Scanner une autre ruche</button>
    </div>`;
  if (!$sheet.open) $sheet.showModal();
}

// ---------- Scanner depuis Apiviz ----------
let flux = null, minuterie = 0;
function arreter() {
  clearInterval(minuterie); minuterie = 0;
  flux?.getTracks().forEach((t) => t.stop());
  flux = null;
}
export async function scanner() {
  const lit = typeof window != "undefined" && "BarcodeDetector" in window && navigator.mediaDevices?.getUserMedia;
  const codes = (S.d?.ruches || []).some((r) => r.code_qr);
  $sheetForm.onsubmit = (ev) => { ev.preventDefault(); ACT.qrcode(); };
  $sheetForm.innerHTML = `<div class="g-ftete"><h2>Scanner une ruche</h2><button type="button" class="g-fermer" data-act="closesheet" aria-label="Fermer">${ic(I.croix)}</button></div>
    ${lit ? `<div class="qr-visee"><video class="qr-video" playsinline muted aria-label="Image de l’appareil photo"></video><span class="qr-cadre" aria-hidden="true"></span></div>
      <p class="small qr-aide" role="status">Vise l’étiquette collée sur la ruche.</p>`
      : `<p class="qr-raison">Sur ce téléphone, vise l’étiquette avec l’appareil photo : Apiviz s’ouvre directement sur la ruche.</p>`}
    ${codes ? `<div class="qr-saisie"><p class="qr-saisie-t"><b>Étiquette abîmée ?</b> Saisis le code écrit sous le QR.</p>
      <label class="qr-saisie-l">Code de la ruche<span class="qr-saisie-ligne"><input id="qr_code" class="qr-code-champ" inputmode="text" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="9" placeholder="K7M2"><button class="btn main">Ouvrir</button></span></label>
      ${lit ? "" : '<p class="small qr-aide" role="status"></p>'}
      <p class="small">Marche sans réseau : les fiches de tes ruchers sont déjà sur ton téléphone.</p></div>` : ""}
    <button type="button" class="btn" data-act="qretiquettes">Imprimer les étiquettes</button>`;
  if (!$sheet.open) $sheet.showModal();
  $sheet.addEventListener("close", arreter, { once: true });
  if (!lit) return;
  const aide = $sheetForm.querySelector(".qr-aide"), video = $sheetForm.querySelector(".qr-video");
  try {
    flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    video.srcObject = flux;
    await video.play();
    const detecteur = new window.BarcodeDetector({ formats: ["qr_code"] });
    minuterie = setInterval(async () => {
      if (!flux || video.readyState < 2) return;
      try {
        const lus = await detecteur.detect(video);
        for (const c of lus) {
          const p = T.lireQr(c.rawValue);
          if (!p) { if (aide) aide.textContent = "Ce QR n’est pas une étiquette de ruche Apiviz."; continue; }
          arreter();
          ouvrirLu(p, aide);
          return;
        }
      } catch { /* image pas prête */ }
    }, 300);
  } catch {
    arreter();
    if (aide) aide.textContent = "L’appareil photo n’est pas accessible. Autorise-le pour Apiviz, ou vise l’étiquette avec l’appareil photo du téléphone.";
  }
}

// ---------- Étiquettes à imprimer ----------
const etat = () => (S.qr ||= { rucher: "", quoi: "", choix: [], format: "planche", imprimees: [] });
let chargement = null;
function chargerQr() {
  if (window.qrcode) return Promise.resolve();
  return (chargement ||= new Promise((ok, ko) => {
    const s = document.createElement("script");
    s.src = "./qrcode.js"; s.onload = ok; s.onerror = () => { chargement = null; ko(new Error("qrcode")); };
    document.head.appendChild(s);
  }));
}
function svgQr(texte) {
  const q = window.qrcode(0, "M");
  q.addData(texte);
  q.make();
  return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true, alt: "" }).replace("<svg ", '<svg aria-hidden="true" ');
}

export function ecranEtiquettes() {
  const st = etat();
  st.choix ||= [];
  const ls = TB.lignes(S.d).sort((a, b) => String(a.rucher).localeCompare(String(b.rucher), "fr") || String(a.nom).localeCompare(String(b.nom), "fr", { numeric: true }));
  const ruchers = [...new Set(ls.map((l) => l.rucher).filter(Boolean))];
  const duRucher = st.rucher ? ls.filter((l) => l.rucher === st.rucher) : ls;
  const brut = (l) => (S.d.ruches || []).find((r) => r.id === l.id) || {};
  // « Seulement les nouvelles » demande la date d'impression (migration 034) ; sans elle, tout le rucher.
  const suivi = duRucher.some((l) => "etiquette_imprimee_le" in brut(l));
  const nouvelles = suivi ? duRucher.filter((l) => !brut(l).etiquette_imprimee_le) : [];
  const quoi = st.quoi || (nouvelles.length && nouvelles.length < duRucher.length ? "nouvelles" : "toutes");
  const vues = quoi === "nouvelles" ? nouvelles : quoi === "choix" ? duRucher.filter((l) => st.choix.includes(l.id)) : duRucher;
  const une = st.format === "une";
  const pret = !!window.qrcode;
  if (!pret) chargerQr().then(() => S.route === "etiquettesqr" && render()).catch(() => toast("Les QR n’ont pas pu être préparés. Vérifie le réseau."));
  const ex = exploitation();
  const lien = (l) => (brut(l).code_qr ? T.lienCode(base(), ex, brut(l).code_qr) : T.lienRuche(base(), ex, l.id));
  const etiquette = (l) => `<div class="qr-etiquette">${pret ? `<span class="qr-code">${svgQr(lien(l))}</span>` : '<span class="qr-code qr-attente" aria-hidden="true"></span>'}
      <span class="qr-texte"><b>${e(l.nom)}</b>${brut(l).code_qr ? `<span class="qr-court">${e(brut(l).code_qr)}</span>` : ""}${l.code ? `<span>N° ${e(l.code)}</span>` : ""}<span>${e(l.rucher || "")}</span><span class="qr-marque">apiviz</span></span></div>`;
  const puce = (act, v, t, on) => `<button type="button" class="op-puce${on ? " on" : ""}" aria-pressed="${on}" data-act="${act}" data-v="${e(v)}">${e(t)}</button>`;
  const nb = vues.length, titre = !nb ? "Aucune étiquette à imprimer." : quoi === "nouvelles" ? `${nb} ruche${nb > 1 ? "s n’ont" : " n’a"} pas encore d’étiquette.` : `${nb} étiquette${nb > 1 ? "s" : ""} à imprimer.`;
  shell("Étiquettes QR", une ? `${nb} page${nb > 1 ? "s" : ""}, une étiquette de 100 × 60 mm par page` : `planche A4, 3 × 7 · ${Math.max(1, Math.ceil(nb / 21))} page${nb > 21 ? "s" : ""}`, "",
    `<p class="qr-say">${e(titre)}</p>
    ${ruchers.length > 1 ? `<div class="op-puces" role="group" aria-label="Rucher">${[["", "Tous les ruchers"], ...ruchers.map((r) => [r, r])].map(([v, t]) => puce("qrrucher", v, t, st.rucher === v)).join("")}</div>` : ""}
    <div class="field qr-choix"><div class="t">Format</div><div class="seg" role="group" aria-label="Format" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      <button type="button" class="${une ? "" : "on"}" aria-pressed="${!une}" data-act="qrformat" data-v="planche">Planche A4</button><button type="button" class="${une ? "on" : ""}" aria-pressed="${une}" data-act="qrformat" data-v="une">Une par page</button></div></div>
    <div class="field qr-choix"><div class="t">Ruches</div><div class="op-puces" role="group" aria-label="Ruches à imprimer">
      ${suivi ? puce("qrquoi", "nouvelles", `Seulement les nouvelles (${nouvelles.length})`, quoi === "nouvelles") : ""}${puce("qrquoi", "toutes", `Tout ${st.rucher ? "le rucher" : "afficher"} (${duRucher.length})`, quoi === "toutes")}${puce("qrquoi", "choix", "Choisir les ruches", quoi === "choix")}</div>
      ${quoi === "choix" ? `<div class="chips qr-liste" role="group" aria-label="Ruches choisies">${duRucher.map((l) => `<button type="button" class="${st.choix.includes(l.id) ? "on" : ""}" aria-pressed="${st.choix.includes(l.id)}" data-act="qrcoche" data-v="${e(l.id)}">${e(l.nom)}</button>`).join("")}</div>` : ""}</div>
    <p class="small">Colle l’étiquette sur le toit ou le flanc de la ruche, à l’abri de la pluie (étiquette plastifiée ou papier sous adhésif). Viser le QR avec l’appareil photo ouvre la ruche dans Apiviz. Un code ne change jamais : une étiquette réimprimée reste valable.</p>
    <div class="qr-planche${une ? " qr-une" : ""}" aria-label="Aperçu de la planche">${vues.map(etiquette).join("")}</div>
    ${nb ? `<div class="op-pied"><button type="button" class="btn main" data-act="qrimprimer" ${pret ? "" : "disabled"}>Imprimer ${nb} étiquette${nb > 1 ? "s" : ""}</button></div>` : ""}`);
  document.querySelector(".wrap")?.classList.add("qr-ecran");
  st.imprimees = vues.map((l) => l.id);
}

// Étiquettes imprimées : la date est notée (« Seulement les nouvelles »), par la file d'envoi. Pas en lecture seule.
async function noterImprimees(ids) {
  if (!ids?.length || lecteur() || !(S.d.ruches || []).some((r) => "etiquette_imprimee_le" in r)) return;
  const appel = typeof HL != "undefined" ? HL.rpc : (n, a) => sb.rpc(n, a);
  const p = { ruches: ids, date: today() };
  const { error } = await appel("noter_etiquettes", { p });
  if (error) return; // rien de grave : la prochaine fois, ces étiquettes seront encore proposées
  window.Regles?.groupe?.appliquerEnAttente(S.d, "noter_etiquettes", p);
  typeof HL != "undefined" && HL.garderDonnees?.();
}

export const actions = {
  // Depuis le menu ⋯ de Ruchers (v5.57) : le menu se ferme d'abord.
  qrscanner: () => { if (S.tb?.feuille) { S.tb.feuille = null; render(); } scanner(); },
  // Depuis la fiche d'un rucher (IT-10) : l'écran s'ouvre filtré sur ce rucher.
  qretiquettes: (rucher) => { if (S.tb) S.tb.feuille = null; if ($sheet.open) $sheet.close(); const st = etat(); if (typeof rucher == "string") { st.rucher = rucher; st.quoi = ""; st.choix = []; } go("etiquettesqr"); },
  qrrucher: (v) => { const st = etat(); st.rucher = v; st.quoi = ""; st.choix = []; render(); },
  qrformat: (v) => { etat().format = v === "une" ? "une" : "planche"; render(); },
  qrquoi: (v) => { const st = etat(); st.quoi = ["nouvelles", "toutes", "choix"].includes(v) ? v : ""; render(); },
  qrcoche: (id) => { const st = etat(); st.choix = st.choix.includes(id) ? st.choix.filter((x) => x !== id) : [...st.choix, id]; render(); },
  qrimprimer: () => { const ids = [...(etat().imprimees || [])]; window.print(); noterImprimees(ids); },
  // Code tapé à la main dans « Scanner une ruche » (IT-10).
  qrcode: () => {
    const champ = $sheetForm.querySelector("#qr_code"), aide = $sheetForm.querySelector(".qr-aide");
    const p = T.lireQr(champ?.value || "");
    if (!p) { if (aide) aide.textContent = "Ce code n’a pas la bonne forme : 4 lettres ou chiffres, comme K7M2."; else toast("Ce code n’a pas la bonne forme : 4 lettres ou chiffres, comme K7M2.", true); champ?.focus(); return; }
    ouvrirLu(p, aide);
  },
  qrfiche: (id) => { $sheet.close(); ACT.ruche(id); },
  qrexpress: (id) => { $sheet.close(); ACT.veruche(id); },
  qrvisite: (id) => { $sheet.close(); ACT.newvisite(id); },
};

if (typeof window != "undefined" && window.Noyau?.crochets) window.Noyau.crochets.sur("apresRendu", "ruche-scannee", apresRendu);
