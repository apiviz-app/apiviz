// Apiviz — fonction serveur « lire-carnet » (v5.85) : API lit les pages d'un carnet de rucher (photos ou PDF) et
// propose les ruches et les visites à reprendre. Lecture seule : l'application importe après validation.
//
// Mêmes secrets que « lire-facture » (un jeu par projet Supabase, jamais dans le dépôt) :
//   ANTHROPIC_API_KEY   clé Claude (obligatoire)
//   CARNET_MODELE       modèle Claude ; à défaut FACTURE_MODELE, ASSISTANT_MODELE, puis « claude-sonnet-5-5 »
//   ASSISTANT_PLAFOND   demandes à API par personne et par jour (30 par défaut) : un carnet lu compte pour une
//   CARNET_ACTIF        « non » coupe la lecture (l'application ne propose plus la photo du carnet)
//   GOUTTES_EUR_PAR_USD conversion du coût en gouttes (migration 029)
// Gouttes : sans gouttes, refus 402 ; un carnet lu retire son coût réel (nature « facture », la seule autre que les
// questions dans 029) ; une lecture en échec ne retire rien.
//
// Requête : POST, en-têtes Authorization et x-exploitation.
//   { "etat": true }                               → { actif, plafond, restant }
//   { "pieces": [{ "type": "image/jpeg"|…, "donnees": base64 }] } → { carnet, restant, gouttes }

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { gouttes, MESSAGE_EPUISE } from "./gouttes.js";
import { CONSIGNES, OUTIL_CARNET, blocsPieces, controlePieces, extraireReleve, messageCarnet, normaliser } from "./regles.js";

const MODELE = Deno.env.get("CARNET_MODELE") || Deno.env.get("FACTURE_MODELE") || Deno.env.get("ASSISTANT_MODELE") || "claude-sonnet-5-5";
const PLAFOND = Math.max(1, Number(Deno.env.get("ASSISTANT_PLAFOND")) || 30);
const ACTIF = (Deno.env.get("CARNET_ACTIF") || "oui").toLowerCase() !== "non"
  && (Deno.env.get("ASSISTANT_ACTIF") || "oui").toLowerCase() !== "non";
const CLE = Deno.env.get("ANTHROPIC_API_KEY") || "";
const EUR_PAR_USD = Number(Deno.env.get("GOUTTES_EUR_PAR_USD")) || undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-exploitation",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
const erreur = (message: string, status: number, code: string) => json({ erreur: message, code }, status);
const aujourdhui = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

async function claude(contenu: unknown[]) {
  const rep = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": CLE, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELE,
      max_tokens: 12000,
      system: [{ type: "text", text: CONSIGNES, cache_control: { type: "ephemeral" } }],
      tools: [{ ...OUTIL_CARNET, cache_control: { type: "ephemeral" } }],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: contenu }],
    }),
  });
  const corps = await rep.json().catch(() => ({}));
  if (!rep.ok) {
    const m = corps?.error?.message || `HTTP ${rep.status}`;
    console.error("lire-carnet: erreur du modèle", rep.status, m);
    const e = new Error(m) as Error & { status?: number };
    e.status = rep.status;
    throw e;
  }
  return corps as { content: Array<{ type: string; name?: string; input?: Record<string, unknown> }>; usage?: Record<string, number> };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return erreur("Méthode non prise en charge.", 405, "methode");

  const auth = req.headers.get("Authorization") || "";
  const jeton = auth.replace(/^Bearer\s+/i, "");
  const exploitation = req.headers.get("x-exploitation") || "";
  let corps: { etat?: boolean; pieces?: Array<{ type: string; donnees: string }> } = {};
  try { corps = await req.json(); } catch { return erreur("Requête illisible.", 400, "requete"); }

  const clePublique = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const db = createClient(Deno.env.get("SUPABASE_URL")!, clePublique, {
    global: { headers: { Authorization: auth, ...(exploitation ? { "x-exploitation": exploitation } : {}) } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u, error: eu } = await db.auth.getUser(jeton);
  if (eu || !u?.user) return erreur("Connecte-toi pour donner ton carnet à API.", 401, "connexion");

  const disponible = ACTIF && !!CLE;
  if (corps.etat) {
    if (!disponible) return json({ actif: false, plafond: PLAFOND, restant: 0 });
    const { data: restant, error } = await db.rpc("assistant_restant", { p_plafond: PLAFOND });
    if (error) return json({ actif: false, plafond: PLAFOND, restant: 0, raison: "migration 024 absente" });
    return json({ actif: true, plafond: PLAFOND, restant });
  }
  if (!disponible) return erreur("API se repose pour le moment. Importe un tableur, ou pars de zéro.", 503, "inactif");

  const pieces = Array.isArray(corps.pieces) ? corps.pieces : [];
  const refus = controlePieces(pieces);
  if (refus) return erreur(refus, 400, "pieces");

  if (!UUID.test(exploitation)) return erreur("Choisis d'abord ton exploitation.", 403, "exploitation");
  const { data: membre } = await db.rpc("est_membre", { e: exploitation });
  if (membre !== true) return erreur("Tu n'es pas membre de cette exploitation.", 403, "exploitation");

  const { data: dispo, error: eg } = await db.rpc("gouttes_disponibles");
  const avecGouttes = !eg && dispo !== null && dispo !== undefined;
  if (avecGouttes && Number(dispo) <= 0) return json({ erreur: MESSAGE_EPUISE, code: "gouttes", gouttes: { restant: Number(dispo) } }, 402);

  const { data: restant, error: ep } = await db.rpc("assistant_consommer", { p_plafond: PLAFOND });
  if (ep) { console.error("lire-carnet: plafond", ep.message); return erreur("API n'est pas encore prêt sur cette base.", 503, "migration"); }
  if (restant < 0) return erreur(`Tu as utilisé tes ${PLAFOND} demandes à API aujourd'hui. Il sera de nouveau là demain.`, 429, "plafond");

  const rr = await db.from("ruches").select("nom,rucher").order("nom").limit(500);
  if (rr.error) { console.error("lire-carnet: lecture", rr.error.message); return erreur("Impossible de lire tes ruches pour le moment.", 502, "lecture"); }
  const jour = aujourdhui();

  try {
    const r = await claude(messageCarnet(rr.data || [], blocsPieces(pieces), jour));
    const releve = extraireReleve(r.content);
    let g = null;
    if (releve && avecGouttes) {
      const cout = gouttes(MODELE, r.usage, EUR_PAR_USD);
      const { data: reste, error: ed } = await db.rpc("gouttes_debiter", { p_quantite: cout, p_nature: "facture", p_detail: { modele: MODELE, pages: pieces.length, usage: r.usage, objet: "carnet" } });
      if (ed) console.error("lire-carnet: gouttes", ed.message);
      else g = { cout, restant: Number(reste) };
    }
    const carnet = releve ? normaliser(releve, jour) : null;
    console.log("lire-carnet:", JSON.stringify({ modele: MODELE, gouttes: g?.cout, pages: pieces.length, ruches: carnet?.ruches?.length ?? 0, usage: r.usage }));
    if (!carnet) return erreur("API n'a pas réussi à lire ces pages. Réessaie avec une photo plus nette.", 502, "format");
    return json({ carnet, restant, gouttes: g });
  } catch (e) {
    const s = (e as { status?: number }).status;
    if (s === 429 || s === 529) return erreur("API est très demandé en ce moment. Réessaie dans une minute.", 503, "occupe");
    if (s === 401 || s === 403) return erreur("API n'est pas encore branché sur ce serveur (clé absente ou refusée).", 503, "cle");
    if (s === 413 || (s === 400 && /image|document|pdf|media|size|too large|base64/i.test((e as Error).message))) return erreur("API n'arrive pas à ouvrir ces pages. Essaie des photos plus légères.", 400, "fichier");
    return erreur("API n'a pas pu lire ton carnet. Réessaie dans un instant.", 502, "modele");
  }
});
