// Apiviz — fonction serveur « assistant » (IT-24) : API répond aux questions sur les données de l'exploitation.
//
// Même code en recette (apidoo-test) et en production (apidoo). Chaque projet Supabase a ses secrets :
//   ANTHROPIC_API_KEY   clé de l'espace de travail Claude « Apiviz recette » ou « Apiviz production » (obligatoire)
//   ASSISTANT_MODELE    modèle Claude, « claude-sonnet-5-5 » par défaut
//   ASSISTANT_PLAFOND   questions par personne et par jour, 30 par défaut
//   ASSISTANT_ACTIF     « non » coupe l'assistant : l'application revient à « Bientôt » (retour arrière d'IT-24)
// SUPABASE_URL (et SUPABASE_ANON_KEY, clé publique de secours) sont fournis par Supabase.
//
// Requête : POST, en-têtes Authorization (jeton de l'utilisateur) et x-exploitation (exploitation choisie).
//   { "etat": true }                       → { actif, plafond, restant }  (rien n'est compté)
//   { "question": "…", "historique": [] }  → { reponse, restant }  ; réponse en quatre blocs (regles.js)
// Toutes les lectures passent par le jeton de l'utilisateur : RLS, exploitation_courante(). Aucune écriture.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { CONSIGNES, messageInitial } from "./consignes.js";
import { boucle } from "./boucle.js";
import { definitions, instantane } from "./outils.js";
import { aujourdhui, historiqueSur, reponseSansAcces } from "./regles.js";

const MODELE = Deno.env.get("ASSISTANT_MODELE") || "claude-sonnet-5-5";
const PLAFOND = Math.max(1, Number(Deno.env.get("ASSISTANT_PLAFOND")) || 30);
const ACTIF = (Deno.env.get("ASSISTANT_ACTIF") || "oui").toLowerCase() !== "non";
const CLE = Deno.env.get("ANTHROPIC_API_KEY") || "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-exploitation",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
const erreur = (message: string, status: number, code: string) => json({ erreur: message, code }, status);

/** Un appel à l'API Messages de Claude. Consignes et outils sont mis en cache (ils ne changent pas d'une question à l'autre). */
async function claude(messages: unknown[], forcerReponse: boolean) {
  const outils = definitions();
  outils[outils.length - 1] = { ...outils[outils.length - 1], cache_control: { type: "ephemeral" } } as typeof outils[number];
  const rep = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": CLE, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELE,
      max_tokens: 2000,
      system: [{ type: "text", text: CONSIGNES, cache_control: { type: "ephemeral" } }],
      tools: outils,
      // Toujours un outil : une lecture, ou « repondre ». Au dernier tour, « repondre » est imposé.
      tool_choice: forcerReponse ? { type: "tool", name: "repondre" } : { type: "any" },
      messages,
    }),
  });
  const corps = await rep.json().catch(() => ({}));
  if (!rep.ok) {
    const m = corps?.error?.message || `HTTP ${rep.status}`;
    console.error("assistant: erreur du modèle", rep.status, m);
    const e = new Error(m) as Error & { status?: number };
    e.status = rep.status;
    throw e;
  }
  return corps as { content: Array<{ type: string; id?: string; name?: string; input?: Record<string, unknown> }>; usage?: Record<string, number> };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return erreur("Méthode non prise en charge.", 405, "methode");

  const auth = req.headers.get("Authorization") || "";
  const jeton = auth.replace(/^Bearer\s+/i, "");
  const exploitation = req.headers.get("x-exploitation") || "";
  let corps: { etat?: boolean; question?: string; historique?: unknown } = {};
  try { corps = await req.json(); } catch { return erreur("Requête illisible.", 400, "requete"); }

  // Clé publique : celle envoyée par l'application (sb_publishable_…), à défaut celle fournie par Supabase.
  const clePublique = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const db = createClient(Deno.env.get("SUPABASE_URL")!, clePublique, {
    global: { headers: { Authorization: auth, ...(exploitation ? { "x-exploitation": exploitation } : {}) } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u, error: eu } = await db.auth.getUser(jeton);
  if (eu || !u?.user) return erreur("Connecte-toi pour parler à API.", 401, "connexion");

  const disponible = ACTIF && !!CLE;
  if (corps.etat) {
    if (!disponible) return json({ actif: false, plafond: PLAFOND, restant: 0 });
    const { data: restant, error } = await db.rpc("assistant_restant", { p_plafond: PLAFOND });
    if (error) return json({ actif: false, plafond: PLAFOND, restant: 0, raison: "migration 024 absente" });
    return json({ actif: true, plafond: PLAFOND, restant });
  }
  if (!disponible) return erreur("API se repose pour le moment. Réessaie plus tard.", 503, "inactif");

  const question = typeof corps.question === "string" ? corps.question.trim().slice(0, 1000) : "";
  if (!question) return erreur("Pose ta question à API.", 400, "question");

  // Exploitation : il faut en être membre. Sinon, réponse fixe, sans appeler le modèle ni compter (AP-US-118).
  if (!UUID.test(exploitation)) return json({ reponse: reponseSansAcces(), restant: null });
  const { data: membre } = await db.rpc("est_membre", { e: exploitation });
  if (membre !== true) return json({ reponse: reponseSansAcces(), restant: null });

  // Plafond d'usage (AP-TECH-336), compté avant l'appel au modèle.
  const { data: restant, error: ep } = await db.rpc("assistant_consommer", { p_plafond: PLAFOND });
  if (ep) { console.error("assistant: plafond", ep.message); return erreur("API n'est pas encore prêt sur cette base.", 503, "migration"); }
  if (restant < 0) return erreur(`Tu as posé tes ${PLAFOND} questions du jour. API sera de nouveau là demain.`, 429, "plafond");

  const jour = aujourdhui();
  const ids = new Set<string>();
  const ctx = { jour };
  let instant;
  try { instant = await instantane(db, exploitation, jour, ids); }
  catch (e) { console.error("assistant: instantané", e); return erreur("Impossible de lire tes données pour le moment. Réessaie dans un instant.", 502, "lecture"); }

  const messages: Array<{ role: string; content: unknown }> = [
    { role: "user", content: messageInitial(instant, historiqueSur(corps.historique), question) },
  ];
  try {
    const r = await boucle({ messages, appel: claude, db, ids, ctx });
    console.log("assistant:", JSON.stringify({ modele: MODELE, tours: r.tours, lus: r.lus, retraits: r.retraits, echec: r.echec, usage: r.usage }));
    if (r.reponse) return json({ reponse: r.reponse, restant, lus: r.lus });
  } catch (e) {
    const s = (e as { status?: number }).status;
    if (s === 429 || s === 529) return erreur("API est très demandé en ce moment. Réessaie dans une minute.", 503, "occupe");
    if (s === 401 || s === 403) return erreur("API n'est pas encore branché sur ce serveur (clé absente ou refusée).", 503, "cle");
    if (s === 400 && /credit|balance/i.test((e as Error).message)) return erreur("Le crédit d'API est épuisé. Préviens le responsable de l'application.", 503, "credit");
    return erreur("API n'a pas pu répondre. Réessaie dans un instant.", 502, "modele");
  }
  return erreur("API n'a pas réussi à mettre sa réponse en forme. Reformule ta question.", 502, "format");
});
