// Apiviz — fonction serveur « supprimer-comptes » (v5.88, migration 041). Chaque nuit (action GitHub « Suppression des
// comptes »), efface les comptes dont la demande de suppression a plus de 30 jours : d'abord les fichiers (photos,
// factures) des exploitations qui partent, par l'API du stockage, puis la base (effacer_compte_du : exploitations
// effacées ou quittées, traces anonymes, profil, jours d'utilisation, appareils, compte de connexion).
//
// Secrets (un jeu par projet Supabase, jamais dans le dépôt) :
//   SUPPRESSION_CLE    clé partagée avec l'action GitHub (24 caractères au moins) ; sans elle, la fonction refuse tout
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   fournis par Supabase à toute fonction serveur
// Déploiement : supabase functions deploy supprimer-comptes --no-verify-jwt (la clé ci-dessus remplace le jeton).
//
// Requête : POST, en-tête Authorization: Bearer <SUPPRESSION_CLE>, corps facultatif { "simuler": true }.
// Réponse : { comptes, effaces, fichiers, echecs } ; jamais d'adresse e-mail dans la réponse ni dans le journal.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { autorise, lotsParEspace } from "./regles.js";

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erreur: "Méthode non permise" }, 405);
  const cle = Deno.env.get("SUPPRESSION_CLE") || "";
  if (!cle) return json({ erreur: "Suppression non configurée : secret SUPPRESSION_CLE absent." }, 503);
  if (!autorise(req.headers.get("authorization"), cle)) return json({ erreur: "Accès refusé" }, 401);
  const corps = await req.json().catch(() => ({}));
  const simuler = corps?.simuler === true;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: dues, error } = await sb.rpc("suppressions_dues");
  if (error) { console.error("supprimer-comptes: lecture", error.message); return json({ erreur: "Lecture impossible : migration 041 appliquée ?" }, 500); }
  const bilan = { comptes: (dues || []).length, effaces: 0, fichiers: 0, echecs: 0, simule: simuler };
  for (const d of dues || []) {
    let ok = true;
    if (d.effacees?.length) {
      const { data: fichiers, error: ef } = await sb.rpc("fichiers_exploitations", { p_ids: d.effacees });
      if (ef) { ok = false; console.error("supprimer-comptes: fichiers", ef.message); }
      for (const lot of lotsParEspace(fichiers)) {
        if (simuler) { bilan.fichiers += lot.chemins.length; continue; }
        const r = await sb.storage.from(lot.bucket).remove(lot.chemins);
        if (r.error) { ok = false; console.error("supprimer-comptes: stockage", r.error.message); } else bilan.fichiers += lot.chemins.length;
      }
    }
    if (!ok) { bilan.echecs++; continue; } // réessayé la nuit suivante : rien n'est effacé en base tant que les fichiers restent
    if (simuler) continue;
    const r = await sb.rpc("effacer_compte_du", { p_email: d.email });
    if (r.error) { bilan.echecs++; console.error("supprimer-comptes: base", r.error.message); } else bilan.effaces++;
  }
  console.log("supprimer-comptes:", JSON.stringify(bilan));
  return json(bilan);
});
