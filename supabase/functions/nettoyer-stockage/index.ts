// Apiviz — fonction serveur « nettoyer-stockage » (IT-11, AP-FEAT-048, AP-TECH-166 et AP-TECH-168).
// Chaque nuit (action GitHub « Nettoyage du stockage »), retire du stockage des photos les fichiers qu'aucune fiche
// n'utilise depuis plus de 7 jours (visite supprimée, envoi interrompu), et écrit un passage par exploitation dans
// le journal nettoyages_stockage (migration 034). Les fiches (visite_photos) ne sont jamais modifiées.
//
// Secrets (un jeu par projet Supabase, jamais dans le dépôt) :
//   NETTOYAGE_CLE      clé partagée avec l'action GitHub (24 caractères au moins) ; sans elle, la fonction refuse tout
//   NETTOYAGE_ACTIF    « non » coupe la fonction (retour arrière immédiat, sans redéploiement)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   fournis par Supabase à toute fonction serveur
// Déploiement : supabase functions deploy nettoyer-stockage --no-verify-jwt (la clé ci-dessus remplace le jeton).
//
// Requête : POST, en-tête Authorization: Bearer <NETTOYAGE_CLE>, corps facultatif { "simuler": true, "jours": 7 }.
//   simuler : liste et compte sans rien supprimer (journal « simule »). Réponse : { actif, exploitations, fichiers, octets, echecs }.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { BUCKET, GARDE_JOURNAL_JOURS, actif, autorise, delai, lignesJournal, lots, parExploitation, resume } from "./regles.js";

const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erreur: "Méthode non permise" }, 405);
  const cle = Deno.env.get("NETTOYAGE_CLE") || "";
  if (!cle) return json({ erreur: "Nettoyage non configuré : secret NETTOYAGE_CLE absent." }, 503);
  if (!autorise(req.headers.get("authorization"), cle)) return json({ erreur: "Accès refusé" }, 401);
  if (!actif(Deno.env.get("NETTOYAGE_ACTIF"))) return json({ actif: false });

  const corps = await req.json().catch(() => ({}));
  const simuler = corps?.simuler === true, jours = delai(corps?.jours);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const [cand, ex] = await Promise.all([
    sb.rpc("photos_a_nettoyer", { p_jours: jours }),
    sb.from("exploitations").select("id"),
  ]);
  if (cand.error || ex.error) {
    console.error("nettoyer-stockage: lecture impossible", cand.error?.message || ex.error?.message);
    return json({ erreur: "Lecture impossible : migration 034 appliquée ?" }, 500);
  }
  const groupes = parExploitation(cand.data);
  const resultats = new Map<string, { fichiers: number; octets: number; erreur?: string }>();
  for (const [e, g] of groupes) {
    const r = { fichiers: 0, octets: 0 } as { fichiers: number; octets: number; erreur?: string };
    if (simuler) { r.fichiers = g.chemins.length; r.octets = g.octets; }
    else {
      for (const lot of lots(g.chemins)) {
        const { data, error } = await sb.storage.from(BUCKET).remove(lot);
        if (error) { r.erreur = "Le stockage n’a pas répondu."; console.error("nettoyer-stockage:", e, error.message); break; }
        r.fichiers += (data || []).length;
      }
      // Octets : au prorata des fichiers vraiment retirés.
      r.octets = g.chemins.length ? Math.round(g.octets * (r.fichiers / g.chemins.length)) : 0;
    }
    resultats.set(e, r);
  }

  const lignes = lignesJournal((ex.data || []).map((x: { id: string }) => x.id), resultats, { simuler });
  if (lignes.length) {
    const { error } = await sb.from("nettoyages_stockage").insert(lignes);
    if (error) console.error("nettoyer-stockage: journal non écrit", error.message);
  }
  const avant = new Date(Date.now() - GARDE_JOURNAL_JOURS * 864e5).toISOString();
  await sb.from("nettoyages_stockage").delete().lt("fait_le", avant);
  return json({ actif: true, simuler, jours, ...resume(lignes) });
});
