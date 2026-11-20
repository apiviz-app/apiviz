// Apiviz — voix d'API (v5.70) : API lit ses réponses à voix haute avec la synthèse vocale du téléphone
// (speechSynthesis). Rien ne part sur Internet pour la lecture, et elle ne coûte aucune goutte. Préférences propres à
// l'appareil (localStorage « apiviz.api.voix ») : quand lire (toujours, en mains libres seulement, jamais), voix posée
// ou vive, vitesse. Réglages › API › Voix d'API, et le haut-parleur de l'écran API.
// « Quand je parle » (par défaut) : API répond à voix haute à une question dite au micro, et en mains libres ;
// « Toujours » : aussi aux questions écrites ; « Jamais » : réponses écrites seulement (le mode mains libres lit quand même).
// Les fonctions pures (normaliser, debit, resume) sont testées par tests/unitaires/espace-api.test.mjs.

const CLE = "apiviz.api.voix";
export const LECTURES = { toujours: "Toujours", mains: "Quand je parle", jamais: "Jamais" };
export const VOIX = { posee: ["Posée", "Calme et claire"], vive: ["Vive", "Plus rapide, pour aller à l’essentiel"] };
export const VITESSES = { lente: "Lente", normale: "Normale", rapide: "Rapide" };
const DEFAUT = { lecture: "mains", voix: "posee", vitesse: "normale" };

/** Préférences valides, celles par défaut pour ce qui manque ou ne va pas. */
export function normaliser(p = {}) {
  return {
    lecture: Object.hasOwn(LECTURES, p?.lecture) ? p.lecture : DEFAUT.lecture,
    voix: Object.hasOwn(VOIX, p?.voix) ? p.voix : DEFAUT.voix,
    vitesse: Object.hasOwn(VITESSES, p?.vitesse) ? p.vitesse : DEFAUT.vitesse,
  };
}

/** Débit de lecture : la voix donne l'allure, la vitesse la module. */
export function debit(p) {
  const q = normaliser(p);
  const base = q.voix === "vive" ? 1.1 : 0.95, k = { lente: 0.85, normale: 1, rapide: 1.2 }[q.vitesse];
  return Math.round(base * k * 100) / 100;
}

/** Résumé d'une ligne pour Réglages. */
export function resume(p) {
  const q = normaliser(p);
  if (q.lecture === "jamais") return "Réponses écrites seulement";
  return `${q.lecture === "toujours" ? "Lit chaque réponse" : "Lit quand tu parles"} · voix ${VOIX[q.voix][0].toLowerCase()}`;
}

export function lire() {
  try { return normaliser(JSON.parse(localStorage.getItem(CLE) || "{}")); } catch { return { ...DEFAUT }; }
}
export function ecrire(p) {
  try { localStorage.setItem(CLE, JSON.stringify(normaliser(p))); } catch { /* navigation privée : pour cette fois */ }
}

/** Vrai si le téléphone sait lire à voix haute. */
export const disponible = () => typeof window != "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance == "function";

let enCours = null;
/** Voix française du téléphone, si elle existe (sinon celle par défaut, avec lang fr-FR). */
function voixFr() {
  try { const l = window.speechSynthesis.getVoices() || []; return l.find((v) => /^fr(-|_)FR/i.test(v.lang)) || l.find((v) => /^fr/i.test(v.lang)) || null; } catch { return null; }
}

/**
 * Lit un texte. p : préférences (celles de l'appareil par défaut). Renvoie une promesse tenue à la fin de la lecture
 * (ou tout de suite si la lecture est impossible) ; surFin est aussi appelé à la fin, arrêt compris.
 */
export function parler(texte, { p = lire(), surDebut, surFin } = {}) {
  const t = String(texte || "").trim();
  if (!t || !disponible()) { surFin?.(); return Promise.resolve(false); }
  arreter();
  return new Promise((ok) => {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "fr-FR";
    const v = voixFr(); if (v) u.voice = v;
    u.rate = debit(p);
    u.pitch = normaliser(p).voix === "vive" ? 1.05 : 1;
    let fini = false;
    const fin = () => { if (fini) return; fini = true; if (enCours === u) enCours = null; surFin?.(); ok(true); };
    u.onstart = () => surDebut?.();
    u.onend = fin; u.onerror = fin;
    enCours = u;
    try { window.speechSynthesis.speak(u); } catch { fin(); }
  });
}

/** Arrête la lecture en cours. */
export function arreter() {
  if (!disponible()) return;
  const u = enCours; enCours = null;
  try { window.speechSynthesis.cancel(); } catch { /* rien à arrêter */ }
  u?.onend?.();
}

export const parle = () => !!enCours;

/** Vrai si une réponse doit être lue : toujours, ou après une question dite au micro (sauf « Jamais »). */
export const doitLire = (p, dite) => { const q = normaliser(p); return q.lecture === "toujours" || (dite && q.lecture === "mains"); };
