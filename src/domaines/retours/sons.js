// Apiviz — retours : préférences de l'appareil, sons (Web Audio, aucun fichier) et vibrations (v5.68).
// Les sons sont fabriqués à la volée : rien à télécharger, rien qui ne marche hors ligne. Le contexte audio est créé
// au premier toucher (les navigateurs refusent le son avant un geste) ; s'il manque, l'app reste muette, sans erreur.
// Vibrations : navigator.vibrate (Chrome sur Android) ; ailleurs (iPhone), rien ne se passe.
import { normaliser, effectif, notes, gamme, NIVEAUX, VIBRATIONS } from "./regles.js";

const CLE = "apiviz-retours";
let prefs = null, ctx = null;

export function lire() {
  if (!prefs) { let brut = null; try { brut = localStorage.getItem(CLE); } catch {} prefs = normaliser(brut); }
  return { ...prefs };
}
export function ecrire(p) {
  prefs = normaliser(p);
  try { localStorage.setItem(CLE, JSON.stringify(prefs)); } catch {}
  appliquerClasses();
  return { ...prefs };
}

const reduit = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches);
const route = () => (typeof S !== "undefined" ? S.route : "");
/** Ce qui joue maintenant ; p : préférences à essayer (feuille de réglages), sinon celles de l'appareil. */
export const maintenant = (p) => effectif(p || lire(), { reduit: reduit(), route: route() });

/** Classe sur <html> : rt-anim-completes, rt-anim-discretes ou rt-anim-aucune (styles/66-retours.css). */
export function appliquerClasses() {
  const h = document.documentElement, a = maintenant().anim;
  ["completes", "discretes", "aucune"].forEach((x) => h.classList.toggle(`rt-anim-${x}`, x === a));
}

function contexte() {
  if (ctx) return ctx;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  try { ctx = new C(); } catch { ctx = null; }
  return ctx;
}
/** Au premier toucher : le contexte audio est créé et réveillé (iPhone, Chrome). */
export function deverrouiller() {
  const c = contexte();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

function jouerNotes(l) {
  const c = contexte();
  if (!c || !l.length) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const t = c.currentTime + 0.01;
  for (const x of l) {
    try {
      const o = c.createOscillator(), g = c.createGain();
      o.type = x.type; o.frequency.setValueAtTime(x.f, t + x.s);
      if (x.f2) o.frequency.exponentialRampToValueAtTime(x.f2, t + x.s + x.d);
      g.gain.setValueAtTime(0.0001, t + x.s);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, x.vol), t + x.s + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + x.s + x.d);
      o.connect(g); g.connect(c.destination); o.start(t + x.s); o.stop(t + x.s + x.d + 0.03);
    } catch { /* navigateur sans Web Audio complet : silence */ }
  }
}

/** Joue un son de l'ambiance choisie (tap, ok, fete, annule, refus, envoi, miel), s'il est permis maintenant. */
export function jouer(nom, p) {
  const m = maintenant(p);
  if (m.son) jouerNotes(notes(m.ambiance, nom, m.volume));
}
/** Une note de la gamme montante (i-ième ruche d'une tournée). */
export function note(i, p) {
  const m = maintenant(p);
  if (!m.son) return;
  const x = gamme(i, m.ambiance);
  jouerNotes([{ ...x, vol: Math.min(0.3, x.vol * m.volume) }]);
}
/** Fait vibrer le téléphone (motif de VIBRATIONS), s'il le peut et si c'est permis. */
export function vibrer(nom, p) {
  if (!maintenant(p).vibre) return;
  try { if (navigator.vibrate) navigator.vibrate(VIBRATIONS[nom] ?? nom); } catch {}
}
/** Niveau 1, 2 ou 3 : son et vibration ensemble. */
export function niveau(n, p) {
  const nom = NIVEAUX[n];
  if (!nom) return;
  jouer(nom, p); vibrer(nom, p);
}
