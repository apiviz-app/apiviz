// Apiviz — étiquettes QR des ruches (v5.57, maquette « Scanner une ruche » validée le 17 nov. 2026).
//   - Chaque ruche a un QR : le lien de l'application avec la ruche (« ?ruche=<id>&ex=<exploitation> »).
//   - Viser l'étiquette avec l'appareil photo du téléphone ouvre Apiviz ; viser depuis Apiviz (« Scanner une ruche »)
//     lit le QR sans quitter l'application, là où le navigateur sait lire les QR (BarcodeDetector : Chrome sur
//     Android). Ailleurs (iPhone), la feuille explique d'utiliser l'appareil photo.
//   - Dans les deux cas, la feuille de la ruche s'ouvre : état, ce qu'API en dit, Visite express, Nouvelle visite,
//     Ouvrir la fiche.
//   - Étiquettes : écran « Étiquettes QR » (Ruchers › ⋯), une planche A4 à imprimer (3 × 7 étiquettes), filtrée par
//     rucher. Le dessin du QR vient de qrcode.js (qrcode-generator, licence MIT), chargé seulement sur cet écran.
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
    const p = T.lireLienRuche(location.href);
    if (p) {
      sessionStorage.setItem(CLE, JSON.stringify(p));
      const u = new URL(location.href);
      u.searchParams.delete("ruche"); u.searchParams.delete("ex");
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    }
  } catch { /* navigation privée */ }
}

/** Après chaque rendu : une ruche scannée en attente s'ouvre dès que les données sont là. */
export function apresRendu() {
  let p = null;
  try { p = JSON.parse(sessionStorage.getItem(CLE) || "null"); } catch { return; }
  if (!p || !S.session || !Array.isArray(S.d?.ruches) || !S.d.ruches.length || $sheet.open) return;
  try { sessionStorage.removeItem(CLE); } catch { /* rien */ }
  const r = S.d.ruches.find((x) => String(x.id).toLowerCase() === p.ruche);
  if (r) return setTimeout(() => feuille(r.id), 0);
  toast(p.ex && p.ex !== exploitation() ? "Cette ruche est dans une autre exploitation : change d’exploitation depuis ton avatar, puis scanne à nouveau." : "Cette ruche n’existe plus dans Apiviz.");
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
  $sheetForm.onsubmit = (ev) => ev.preventDefault();
  $sheetForm.innerHTML = `<div class="g-ftete"><h2>Scanner une ruche</h2><button type="button" class="g-fermer" data-act="closesheet" aria-label="Fermer">${ic(I.croix)}</button></div>
    ${lit ? `<div class="qr-visee"><video class="qr-video" playsinline muted aria-label="Image de l’appareil photo"></video><span class="qr-cadre" aria-hidden="true"></span></div>
      <p class="small qr-aide" role="status">Vise l’étiquette collée sur la ruche.</p>`
      : `<p class="qr-raison">Sur ce téléphone, vise l’étiquette avec l’appareil photo : Apiviz s’ouvre directement sur la ruche.</p>`}
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
        const codes = await detecteur.detect(video);
        for (const c of codes) {
          const p = T.lireLienRuche(c.rawValue);
          if (!p) { if (aide) aide.textContent = "Ce QR n’est pas une étiquette de ruche Apiviz."; continue; }
          arreter();
          const r = (S.d.ruches || []).find((x) => String(x.id).toLowerCase() === p.ruche);
          if (r) return feuille(r.id);
          if (aide) aide.textContent = "Cette ruche n’est pas dans l’exploitation ouverte.";
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
const etat = () => (S.qr ||= { rucher: "" });
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
  const ls = TB.lignes(S.d).sort((a, b) => String(a.rucher).localeCompare(String(b.rucher), "fr") || String(a.nom).localeCompare(String(b.nom), "fr", { numeric: true }));
  const ruchers = [...new Set(ls.map((l) => l.rucher).filter(Boolean))];
  const vues = st.rucher ? ls.filter((l) => l.rucher === st.rucher) : ls;
  const pret = !!window.qrcode;
  if (!pret) chargerQr().then(() => S.route === "etiquettesqr" && render()).catch(() => toast("Les QR n’ont pas pu être préparés. Vérifie le réseau."));
  const ex = exploitation();
  const etiquette = (l) => `<div class="qr-etiquette">${pret ? `<span class="qr-code">${svgQr(T.lienRuche(base(), ex, l.id))}</span>` : '<span class="qr-code qr-attente" aria-hidden="true"></span>'}
      <span class="qr-texte"><b>${e(l.nom)}</b>${l.code ? `<span>${e(l.code)}</span>` : ""}<span>${e(l.rucher || "")}</span><span class="qr-marque">apiviz</span></span></div>`;
  shell("Étiquettes QR", `${vues.length} étiquette${vues.length > 1 ? "s" : ""} · planche A4, 3 × 7`, "",
    `${ruchers.length > 1 ? `<div class="op-puces" role="group" aria-label="Rucher">${[["", "Tous les ruchers"], ...ruchers.map((r) => [r, r])].map(([v, t]) => `<button type="button" class="op-puce${st.rucher === v ? " on" : ""}" aria-pressed="${st.rucher === v}" data-act="qrrucher" data-v="${e(v)}">${e(t)}</button>`).join("")}</div>` : ""}
    <p class="small">Colle l’étiquette sur le toit ou le flanc de la ruche, à l’abri de la pluie (étiquette plastifiée ou papier sous adhésif). Viser le QR avec l’appareil photo ouvre la ruche dans Apiviz.</p>
    <div class="qr-planche" aria-label="Aperçu de la planche">${vues.map(etiquette).join("")}</div>
    ${vues.length ? `<div class="op-pied"><button type="button" class="btn main" data-act="qrimprimer" ${pret ? "" : "disabled"}>Imprimer</button></div>` : '<p class="small">Aucune ruche active.</p>'}`);
  document.querySelector(".wrap")?.classList.add("qr-ecran");
}

export const actions = {
  // Depuis le menu ⋯ de Ruchers (v5.57) : le menu se ferme d'abord.
  qrscanner: () => { if (S.tb?.feuille) { S.tb.feuille = null; render(); } scanner(); },
  qretiquettes: () => { if (S.tb) S.tb.feuille = null; if ($sheet.open) $sheet.close(); go("etiquettesqr"); },
  qrrucher: (v) => { etat().rucher = v; render(); },
  qrimprimer: () => window.print(),
  qrfiche: (id) => { $sheet.close(); ACT.ruche(id); },
  qrexpress: (id) => { $sheet.close(); ACT.veruche(id); },
  qrvisite: (id) => { $sheet.close(); ACT.newvisite(id); },
};

if (typeof window != "undefined" && window.Noyau?.crochets) window.Noyau.crochets.sur("apresRendu", "ruche-scannee", apresRendu);
