// Apiviz — feuilles du bas qu'on attrape du doigt (v5.70, maquettes du 20 nov. 2026, validées par Pierre-Louis ;
// canvas https://claude.ai/artifact/3SCnXpgUNiDAyfwnwqHgZi).
// Sur téléphone, toutes les fenêtres (<dialog>) s'ouvrent en feuille collée en bas (styles/composants/feuille.css).
// Ce module les rend toutes « glissables », sans toucher à chaque écran :
//   · on pose le doigt sur le haut de la feuille (poignée et titre) et on tire vers le bas : la feuille suit le doigt,
//     le fond s'éclaircit ;
//   · relâchée au-delà de SEUIL px, ou d'un petit coup sec vers le bas : elle se ferme ; sinon elle remonte ;
//   · la fermeture passe par l'événement « cancel », comme Échap ou le retour Android : la fenêtre de saisie (#sheet)
//     garde alors une saisie commencée en brouillon (ergonomie.js), les autres se ferment.
// En plus : la poignée bouge un peu aux premières ouvertures (pour qu'on la découvre), un champ obligatoire oublié
// tremble.

/** Distance (px) au-delà de laquelle une feuille relâchée se ferme. */
export const SEUIL = 150;
/** Vitesse (px/ms) d'un « coup sec » vers le bas, qui ferme même sous le seuil. */
export const VITESSE = 0.6;
/** Hauteur (px) du haut de la feuille qu'on peut attraper (poignée, titre). */
export const ZONE = 72;
/** Nombre d'ouvertures pendant lesquelles la poignée se signale. */
export const ASTUCES = 3;

/** Feuille relâchée à dy px, à la vitesse v (px/ms, positive vers le bas) : « fermer » ou « revenir ». */
export function decider(dy, v = 0) {
  return dy > SEUIL || (v > VITESSE && dy > 24) ? "fermer" : "revenir";
}

/** Déplacement affiché pour un déplacement du doigt : libre vers le bas, freiné (26 px au plus) vers le haut. */
export function deplacement(d) {
  return d >= 0 ? d : -Math.min(26, Math.sqrt(-d) * 3);
}

/** Opacité du fond (1 → 0) quand la feuille, haute de h px, est descendue de dy px. */
export function opaciteFond(dy, h) {
  if (dy <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - dy / Math.max(1, h)));
}

/** La fenêtre (rectangle r, écran l × h) est-elle une feuille collée en bas, sur toute la largeur ? */
export function estFeuilleDuBas(r, l, h) {
  // Le bas peut dépasser de l'écran pendant l'animation d'ouverture.
  return r.width >= l * 0.9 && r.bottom >= h - 2 && r.top > 0;
}

/** Vitesse (px/ms) d'après les derniers points du doigt [{ y, t }]. */
export function vitesse(points) {
  if (!points || points.length < 2) return 0;
  const a = points[0], b = points[points.length - 1];
  return (b.y - a.y) / Math.max(1, b.t - a.t);
}

// Ce qu'on peut toucher sans lancer le glissé : les champs, boutons et liens gardent leur comportement.
const INTERACTIF = "input, select, textarea, button, a, label, [contenteditable], [data-glisser=non]";

let vibrer = () => {};
let actif = null;

function telephone() {
  return window.matchMedia?.("(max-width: 800px)").matches;
}

function feuille(cible) {
  const d = cible?.closest?.("dialog[open]");
  if (!d || !telephone()) return null;
  return estFeuilleDuBas(d.getBoundingClientRect(), window.innerWidth, window.innerHeight) ? d : null;
}

function poser(e) {
  if (actif || (e.pointerType === "mouse" && e.button !== 0)) return;
  const d = feuille(e.target);
  if (!d || d.scrollTop > 0 || e.target.closest(INTERACTIF)) return;
  const r = d.getBoundingClientRect();
  if (e.clientY - r.top > ZONE) return;
  actif = { d, id: e.pointerId, x0: e.clientX, y0: e.clientY, dy: 0, h: r.height, glisse: false, seuil: false, points: [{ y: e.clientY, t: e.timeStamp }] };
}

function bouger(e) {
  const a = actif;
  if (!a || e.pointerId !== a.id) return;
  const dx = e.clientX - a.x0, dyBrut = e.clientY - a.y0;
  if (!a.glisse) {
    if (Math.abs(dyBrut) < 6 && Math.abs(dx) < 6) return;
    // Geste plutôt horizontal (puces qui défilent…) : on le laisse au navigateur.
    if (Math.abs(dx) > Math.abs(dyBrut)) { actif = null; return; }
    a.glisse = true;
    a.d.classList.add("gl-glisse");
    a.d.style.transition = "none";
  }
  a.dy = deplacement(dyBrut);
  a.points.push({ y: e.clientY, t: e.timeStamp });
  if (a.points.length > 5) a.points.shift();
  a.d.style.transform = `translateY(${a.dy}px)`;
  a.d.style.setProperty("--gl-fond", String(opaciteFond(a.dy, a.h)));
  const passe = a.dy > SEUIL;
  if (passe !== a.seuil) { a.seuil = passe; a.d.classList.toggle("gl-seuil", passe); if (passe) vibrer("tap"); }
}

// Remet la feuille en place, en douceur (ou d'un coup si elle est déjà fermée).
function remettre(d, doux = true) {
  d.style.transition = doux ? "" : "none";
  d.style.transform = "";
  d.style.removeProperty("--gl-fond");
  d.classList.remove("gl-glisse", "gl-seuil", "gl-sort");
  if (!doux) requestAnimationFrame(() => { d.style.transition = ""; });
}

function fermer(d) {
  d.classList.add("gl-sort");
  d.style.transition = "";
  d.style.transform = "translateY(100%)";
  d.style.setProperty("--gl-fond", "0");
  let fait = false;
  const fin = () => {
    if (fait) return;
    fait = true;
    // Même chemin qu'Échap ou le retour Android : chaque fenêtre décide (brouillon, enregistrement en cours…).
    const ev = new Event("cancel", { cancelable: true });
    if (d.dispatchEvent(ev) && d.open) d.close();
    // Fermée : on remet tout sans animation. Restée ouverte (enregistrement en cours) : elle remonte.
    remettre(d, d.open);
  };
  d.addEventListener("transitionend", fin, { once: true });
  setTimeout(fin, 320);
}

function lever(e) {
  const a = actif;
  if (!a || e.pointerId !== a.id) return;
  actif = null;
  if (!a.glisse) return;
  // Le clic qui suit un glissé ne doit rien déclencher (fond, titre…).
  // (Sur écran tactile, il n'y a souvent pas de clic : le piège est retiré juste après.)
  const piege = (c) => { c.stopPropagation(); c.preventDefault(); };
  window.addEventListener("click", piege, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", piege, true), 0);
  if (e.type !== "pointercancel" && decider(a.dy, vitesse(a.points)) === "fermer") fermer(a.d);
  else remettre(a.d);
}

// Le navigateur ne doit pas faire défiler la page pendant qu'on tire la feuille.
function bloquerDefilement(e) {
  if (actif?.glisse && e.cancelable) e.preventDefault();
}

// Aux premières ouvertures sur téléphone, la poignée se signale (petit mouvement vers le bas).
function signaler(d) {
  if (!telephone()) return;
  let n = 0;
  try { n = Number(localStorage.getItem("apiviz-glisser-astuce") || 0); } catch {}
  if (n >= ASTUCES) return;
  requestAnimationFrame(() => {
    if (!d.open || !estFeuilleDuBas(d.getBoundingClientRect(), window.innerWidth, window.innerHeight)) return;
    try { localStorage.setItem("apiviz-glisser-astuce", String(n + 1)); } catch {}
    d.classList.remove("gl-astuce"); void d.offsetWidth; d.classList.add("gl-astuce");
    setTimeout(() => d.classList.remove("gl-astuce"), 2600);
  });
}

// Champ obligatoire oublié : il tremble, en plus du message du navigateur.
function secouer(e) {
  const c = e.target;
  if (!c?.closest?.("dialog[open]")) return;
  c.classList.remove("gl-secoue"); void c.offsetWidth; c.classList.add("gl-secoue");
  setTimeout(() => c.classList.remove("gl-secoue"), 450);
  vibrer("refus");
}

/** Branche les gestes sur tout le document (appelé une fois par src/main.js). */
export function demarrer({ vibreur } = {}) {
  if (typeof document === "undefined" || demarrer.fait) return;
  demarrer.fait = true;
  if (vibreur) vibrer = vibreur;
  document.addEventListener("pointerdown", poser, true);
  window.addEventListener("pointermove", bouger, { passive: true });
  window.addEventListener("pointerup", lever);
  window.addEventListener("pointercancel", lever);
  document.addEventListener("touchmove", bloquerDefilement, { passive: false });
  document.addEventListener("invalid", secouer, true);
  // Chaque fenêtre qui s'ouvre, d'où qu'elle vienne (showModal partout dans l'app).
  new MutationObserver((liste) => {
    for (const m of liste) {
      const d = m.target;
      if (d.tagName === "DIALOG" && d.open && m.oldValue === null) { remettre(d, false); signaler(d); }
    }
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"], attributeOldValue: true });
}
