// Apiviz — fonction serveur « courriels » (v5.90, migration 042) : e-mails demandés par l'application pour la personne
// connectée, à sa propre adresse seulement. Aujourd'hui : confirmation d'une demande de suppression de compte (041).
//
// Secrets (un jeu par projet Supabase, jamais dans le dépôt) :
//   BREVO_CLE             clé d'API Brevo (Brevo › SMTP & API › Clés API) ; sans elle, rien ne part ({ envoye: false })
//   COURRIEL_EXPEDITEUR   « Apiviz <bonjour@apiviz.fr> » : adresse d'un domaine vérifié dans Brevo
//   APP_URL               lien des e-mails (https://app.apiviz.fr par défaut ; https://recette.apiviz.fr en recette)
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY   fournis par Supabase
// Déploiement : avec vérification du jeton (par défaut), par l'action « Fonctions serveur ».
//
// Requête : POST, en-tête Authorization (jeton de la personne), corps { "nature": "suppression-demandee" }.
// Réponse : { envoye: true } ou { envoye: false, raison } ; jamais l'adresse dans le journal.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import * as C from "./courriel.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-exploitation",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "Méthode non permise" }, 405);
  const corps = await req.json().catch(() => ({}));
  if (corps?.nature !== "suppression-demandee") return json({ erreur: "Nature d'e-mail inconnue" }, 400);

  const auth = req.headers.get("Authorization") || "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const moi = createClient(url, req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "", {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u, error: eu } = await moi.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
  const email = String(u?.user?.email || "").toLowerCase();
  if (eu || !email) return json({ erreur: "Connexion requise" }, 401);

  const cle = Deno.env.get("BREVO_CLE") || "";
  const expediteur = C.expediteurDe(Deno.env.get("COURRIEL_EXPEDITEUR"));
  if (!cle || !expediteur) return json({ envoye: false, raison: "non-configure" });

  // La demande doit exister : on n'envoie jamais un e-mail sans objet.
  const { data: demande, error: ed } = await moi.rpc("ma_suppression");
  if (ed || !demande || (demande.motif && demande.motif !== "demande")) return json({ envoye: false, raison: "pas-de-demande" });
  const { data: profil } = await moi.from("profils").select("prenom").eq("email", email).maybeSingle();

  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: permis, error: ep } = await service.rpc("courriel_a_envoyer", { p_email: email, p_nature: "suppression-demandee", p_delai: "1 hour" });
  if (ep) { console.error("courriels: journal", ep.message); return json({ envoye: false, raison: "migration-042" }); }
  if (permis !== true) return json({ envoye: false, raison: "deja-envoye" });

  const message = C.suppressionDemandee({ prenom: profil?.prenom, effacement_le: demande.effacement_le, lien: Deno.env.get("APP_URL") || "https://app.apiviz.fr" });
  const r = await C.envoyer(fetch, cle, C.corpsBrevo({ expediteur, a: email, nom: profil?.prenom, message, nature: "suppression-demandee" }));
  console.log("courriels:", JSON.stringify({ nature: "suppression-demandee", ok: r.ok, statut: r.ok ? 200 : r.statut }));
  return json(r.ok ? { envoye: true } : { envoye: false, raison: "brevo" });
});
