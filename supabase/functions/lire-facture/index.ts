// Apiviz — fonction serveur « lire-facture » (v5.52) : API lit une facture d'achat (PDF ou photos) et propose les
// lignes à intégrer au stock. Lecture seule : l'application enregistre l'achat après validation (enregistrer_achat).
//
// Mêmes secrets que la fonction « assistant » (un jeu par projet Supabase, jamais dans le dépôt) :
//   ANTHROPIC_API_KEY   clé Claude de l'espace de travail de l'environnement (obligatoire)
//   FACTURE_MODELE      modèle Claude ; à défaut ASSISTANT_MODELE, puis « claude-sonnet-5-5 »
//   ASSISTANT_PLAFOND   demandes à API par personne et par jour, 30 par défaut : une facture lue compte pour une
//   FACTURE_ACTIF       « non » coupe la lecture : l'application revient à la saisie à la main (retour arrière)
//
// Requête : POST, en-têtes Authorization (jeton de l'utilisateur) et x-exploitation (exploitation choisie).
//   { "etat": true }                                   → { actif, plafond, restant }  (rien n'est compté)
//   { "pieces": [{ "type": "application/pdf"|"image/jpeg"|…, "donnees": base64 }] } → { facture, restant }
// Les lectures (catalogue, fournisseurs) passent par le jeton de l'utilisateur : RLS, exploitation_courante().

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { CONSIGNES, OUTIL_FACTURE, blocsPieces, controlePieces, messageFacture, normaliser } from "./regles.js";

const MODELE = Deno.env.get("FACTURE_MODELE") || Deno.env.get("ASSISTANT_MODELE") || "claude-sonnet-5-5";
const PLAFOND = Math.max(1, Number(Deno.env.get("ASSISTANT_PLAFOND")) || 30);
const ACTIF = (Deno.env.get("FACTURE_ACTIF") || "oui").toLowerCase() !== "non"
  && (Deno.env.get("ASSISTANT_ACTIF") || "oui").toLowerCase() !== "non";
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
const aujourdhui = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

async function claude(contenu: unknown[]) {
  const rep = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": CLE, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELE,
      max_tokens: 4000,
      system: [{ type: "text", text: CONSIGNES, cache_control: { type: "ephemeral" } }],
      tools: [{ ...OUTIL_FACTURE, cache_control: { type: "ephemeral" } }],
      tool_choice: { type: "tool", name: "facture" },
      messages: [{ role: "user", content: contenu }],
    }),
  });
  const corps = await rep.json().catch(() => ({}));
  if (!rep.ok) {
    const m = corps?.error?.message || `HTTP ${rep.status}`;
    console.error("lire-facture: erreur du modèle", rep.status, m);
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
  if (eu || !u?.user) return erreur("Connecte-toi pour donner ta facture à API.", 401, "connexion");

  const disponible = ACTIF && !!CLE;
  if (corps.etat) {
    if (!disponible) return json({ actif: false, plafond: PLAFOND, restant: 0 });
    const { data: restant, error } = await db.rpc("assistant_restant", { p_plafond: PLAFOND });
    if (error) return json({ actif: false, plafond: PLAFOND, restant: 0, raison: "migration 024 absente" });
    return json({ actif: true, plafond: PLAFOND, restant });
  }
  if (!disponible) return erreur("API se repose pour le moment. Saisis l'achat toi-même.", 503, "inactif");

  const pieces = Array.isArray(corps.pieces) ? corps.pieces : [];
  const refus = controlePieces(pieces);
  if (refus) return erreur(refus, 400, "pieces");

  // Exploitation : il faut en être membre et pouvoir écrire (la facture finira en achat).
  if (!UUID.test(exploitation)) return erreur("Choisis d'abord ton exploitation.", 403, "exploitation");
  const { data: membre } = await db.rpc("est_membre", { e: exploitation });
  if (membre !== true) return erreur("Tu n'es pas membre de cette exploitation.", 403, "exploitation");

  const { data: restant, error: ep } = await db.rpc("assistant_consommer", { p_plafond: PLAFOND });
  if (ep) { console.error("lire-facture: plafond", ep.message); return erreur("API n'est pas encore prêt sur cette base.", 503, "migration"); }
  if (restant < 0) return erreur(`Tu as utilisé tes ${PLAFOND} demandes à API aujourd'hui. Il sera de nouveau là demain.`, 429, "plafond");

  const [ra, rf] = await Promise.all([
    db.from("articles").select("id,nom,unite,stock").order("nom").limit(500),
    db.from("fournisseurs").select("id,nom").order("nom").limit(300),
  ]);
  if (ra.error || rf.error) {
    console.error("lire-facture: lecture", ra.error?.message, rf.error?.message);
    return erreur("Impossible de lire ton stock pour le moment. Réessaie dans un instant.", 502, "lecture");
  }
  const catalogue = { articles: ra.data || [], fournisseurs: rf.data || [] };
  const jour = aujourdhui();

  try {
    const r = await claude(messageFacture(catalogue, blocsPieces(pieces), jour));
    const outil = r.content.find((c) => c.type === "tool_use" && c.name === "facture");
    console.log("lire-facture:", JSON.stringify({ modele: MODELE, pages: pieces.length, type: pieces[0].type, lignes: (outil?.input?.lignes as unknown[] | undefined)?.length ?? 0, usage: r.usage }));
    if (!outil?.input) return erreur("API n'a pas réussi à lire cette facture. Réessaie, ou saisis l'achat toi-même.", 502, "format");
    return json({ facture: normaliser(outil.input, catalogue, jour), restant });
  } catch (e) {
    const s = (e as { status?: number }).status;
    if (s === 429 || s === 529) return erreur("API est très demandé en ce moment. Réessaie dans une minute.", 503, "occupe");
    if (s === 401 || s === 403) return erreur("API n'est pas encore branché sur ce serveur (clé absente ou refusée).", 503, "cle");
    if (s === 400 && /credit|balance/i.test((e as Error).message)) return erreur("Le crédit d'API est épuisé. Préviens le responsable de l'application.", 503, "credit");
    if (s === 400 || s === 413) return erreur("API n'arrive pas à ouvrir ce fichier. Essaie une photo, ou un PDF plus léger.", 400, "fichier");
    return erreur("API n'a pas pu lire ta facture. Réessaie dans un instant.", 502, "modele");
  }
});
