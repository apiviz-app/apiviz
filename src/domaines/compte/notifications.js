// Apiviz — rappels même quand Apiviz est fermée (v5.87, maquette « Onboarding irréprochable », écran 9, validé par
// Pierre-Louis le 24 nov. 2026 ; migration 040, fonction serveur « rappels »).
//   - window.Notifications.abonner(types) : abonne cet appareil (Web Push, clé publique donnée par la fonction) et
//     l'enregistre avec les types choisis (abonner_push). Appelé par « Activer les rappels » (écran Bravo) et par
//     l'interrupteur de Réglages › Rappels et notifications.
//   - Réglages › Rappels : carte « Même quand Apiviz est fermée » (état de l'appareil, trois types, retirer).
//   - Déconnexion : l'appareil est retiré (desabonner_push) pour ne plus recevoir les rappels de ce compte.
// Sans la fonction, sans 040 ou dans l'application des stores (pas de Web Push dans la vue web) : rien ne change, les
// rappels restent ceux d'Apiviz ouverte. Globales lues à l'appel : S, sb, esc, toast, render, fail, APIDOO.
import { TYPES as TYPES_R } from "./regles-notifications.js";

const e = (t) => (typeof esc == "function" ? esc(t) : String(t ?? ""));
const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { return null; } return v; };
const CLE_TYPES = "apiviz-rappels-envoyes"; // même clé que le choix de l'écran Bravo (arrivee.js, v5.84)
const st = { cle: undefined, abonne: null, endpoint: "", occupe: false, raison: "" };

export const possible = () => typeof window != "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !window.Plateforme?.native;
export function types() {
  let t = {};
  try { t = JSON.parse(memo(CLE_TYPES) || "{}") || {}; } catch { t = {}; }
  return Object.fromEntries(TYPES_R.map(([k]) => [k, t[k] !== false]));
}

async function cle() {
  if (st.cle !== undefined) return st.cle;
  try {
    const r = await fetch(`${window.APIDOO.url}/functions/v1/rappels`, { method: "POST", headers: { "Content-Type": "application/json", apikey: window.APIDOO.key, Authorization: `Bearer ${window.APIDOO.key}` }, body: JSON.stringify({ cle: true }) });
    st.cle = r.ok ? (await r.json()).cle || null : null;
  } catch { st.cle = null; }
  return st.cle;
}
const octets = (b64) => { const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function inscription() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** État de cet appareil : true (abonné, enregistré), false, ou null (impossible ici). */
export async function etat() {
  if (!possible()) return null;
  try { const s = await inscription(); st.abonne = !!s && Notification.permission === "granted"; st.endpoint = s?.endpoint || ""; } catch { st.abonne = false; }
  return st.abonne;
}

/** Abonne cet appareil aux rappels app fermée, avec les types choisis. Rend true si c'est fait. */
export async function abonner(choix) {
  if (choix) memo(CLE_TYPES, JSON.stringify(choix));
  if (!possible() || !S.session) return false;
  if (Notification.permission === "default") await Notification.requestPermission();
  if (Notification.permission !== "granted") { st.raison = "bloquees"; return false; }
  const k = await cle();
  if (!k) { st.raison = "serveur"; return false; }
  const reg = await navigator.serviceWorker.ready;
  let s = await reg.pushManager.getSubscription();
  if (!s) s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: octets(k) });
  const j = s.toJSON();
  const r = await sb.rpc("abonner_push", { p: { endpoint: s.endpoint, p256dh: j.keys?.p256dh || b64(s.getKey("p256dh")), auth: j.keys?.auth || b64(s.getKey("auth")), types: types(), plateforme: window.Plateforme?.nom || "web" } });
  if (r.error) { st.raison = /abonner_push|PGRST202|function/i.test(`${r.error.code} ${r.error.message}`) ? "base" : "erreur"; return false; }
  st.abonne = true; st.endpoint = s.endpoint; st.raison = "";
  return true;
}

/** Retire cet appareil (rappels app fermée) ; sans réseau, l'abonnement du navigateur est quand même retiré. */
export async function desabonner() {
  if (!possible()) return;
  try {
    const s = await inscription();
    if (s) { try { await sb.rpc("desabonner_push", { p_endpoint: s.endpoint }); } catch { /* sans réseau : retiré du navigateur quand même */ } await s.unsubscribe(); }
  } catch { /* rien à retirer */ }
  st.abonne = false; st.endpoint = "";
}

// ---------- Réglages › Rappels : « Même quand Apiviz est fermée » ----------
function carte() {
  if (S.route !== "rappels" || document.querySelector(".nt-carte")) return;
  const pile = document.querySelector(".er-pile");
  if (!pile) return;
  const t = types();
  const raison = { bloquees: "Les notifications sont bloquées dans les réglages du navigateur.", serveur: "Les rappels app fermée ne sont pas encore branchés sur ce serveur.", base: "La base doit être mise à jour (migration 040).", erreur: "L'abonnement n'a pas pu être enregistré. Réessaie." }[st.raison] || "";
  const corps = !possible()
    ? `<p class="small">${window.Plateforme?.native ? "Dans l'application installée depuis le store, ces rappels arrivent bientôt. Ils marchent déjà dans le navigateur et sur l'écran d'accueil." : "Cet appareil ne propose pas les rappels app fermée. Sur iPhone, ajoute d'abord Apiviz à l'écran d'accueil."}</p>`
    : `<div class="er-rang"><span class="u-todo-t"><b>Sur cet appareil</b><span class="small">${st.abonne ? "Activés : deux rappels par semaine au plus" : "Désactivés"}</span></span><button type="button" class="er-bascule ${st.abonne ? "on" : ""}" role="switch" aria-checked="${!!st.abonne}" aria-label="Rappels même quand Apiviz est fermée" data-act="ntbascule"></button></div>
      ${TYPES_R.map(([k, titre, detail]) => `<div class="er-rang"><span class="u-todo-t"><b>${e(titre)}</b><span class="small">${e(detail)}</span></span><button type="button" class="er-bascule ${t[k] ? "on" : ""}" role="switch" aria-checked="${t[k]}" aria-label="${e(titre)}" data-act="nttype" data-v="${k}"></button></div>`).join("")}
      ${raison ? `<p class="ob-err" role="alert">${e(raison)}</p>` : ""}`;
  pile.insertAdjacentHTML("afterbegin", `<section class="card nt-carte"><h2>Même quand Apiviz est fermée</h2>${corps}</section>`);
}

export const actions = {
  ntbascule: async () => {
    if (st.occupe) return;
    st.occupe = true;
    try {
      if (st.abonne) { await desabonner(); toast("Rappels app fermée retirés de cet appareil"); }
      else if (await abonner()) toast("Rappels activés, même quand Apiviz est fermée");
    } catch (err) { st.raison = "erreur"; typeof journaliser == "function" && journaliser("notifications", String(err?.message || err)); }
    finally { st.occupe = false; render(); }
  },
  nttype: async (k) => {
    const t = types();
    if (!(k in t)) return;
    t[k] = !t[k];
    memo(CLE_TYPES, JSON.stringify(t));
    if (st.abonne) { try { await abonner(t); } catch { /* gardé sur l'appareil */ } }
    render();
  },
};

// Clic sur un rappel (sw.js) : l'écran du rappel, depuis une fenêtre ouverte (message) ou neuve (?ecran=…).
const ROUTES_RAPPEL = ["ruches", "agenda", "rappels"];
let routeAttente = "";
function ouvrirRoute(r) {
  if (!ROUTES_RAPPEL.includes(r)) return;
  if (S.d && typeof go == "function") go(r); else routeAttente = r;
}

if (typeof window != "undefined") {
  window.Notifications = { abonner, desabonner, etat, possible, types };
  try {
    const r = new URLSearchParams(location.search).get("ecran");
    if (r) { routeAttente = ROUTES_RAPPEL.includes(r) ? r : ""; const u = new URL(location.href); u.searchParams.delete("ecran"); history.replaceState(history.state, "", u.pathname + u.search + u.hash); }
  } catch { /* adresse illisible */ }
  navigator.serviceWorker?.addEventListener?.("message", (ev) => { if (ev.data?.type === "apiviz-route") ouvrirRoute(ev.data.route); });
  if (window.Noyau?.crochets) window.Noyau.crochets.sur("apresRendu", "rappels-app-fermee", () => {
    if (routeAttente && S.d && S.route === "dash") { const r = routeAttente; routeAttente = ""; setTimeout(() => go(r), 0); return; }
    if (S.route !== "rappels") return;
    if (st.abonne === null && possible()) etat().then(() => { if (S.route === "rappels") { document.querySelector(".nt-carte")?.remove(); carte(); } });
    carte();
  });
}
