// Apiviz — fonction serveur « supprimer-comptes » (v5.88, migration 041). Chaque nuit (action GitHub « Suppression des
// comptes »), efface les comptes dont la demande de suppression a plus de 30 jours : d'abord les fichiers (photos,
// factures) des exploitations qui partent, par l'API du stockage, puis la base (effacer_compte_du : exploitations
// effacées ou quittées, traces anonymes, profil, jours d'utilisation, appareils, compte de connexion).
//
// v5.90 (migration 042) : avant les effacements, préavis aux comptes sans activité depuis 3 ans (au plus 50 par nuit) :
// préavis enregistré (effacement 30 jours plus tard, exploitations partagées laissées aux autres), puis e-mail par Brevo ;
// si l'e-mail ne part pas, le préavis est retiré. Sans Brevo configuré : aucun préavis, donc aucun compte inactif effacé.
// Se reconnecter annule le préavis (signaler_activite) ; entretien_comptes() retire les préavis caducs chaque nuit.
//
// Secrets (un jeu par projet Supabase, jamais dans le dépôt) :
//   SUPPRESSION_CLE    clé partagée avec l'action GitHub (24 caractères au moins) ; sans elle, la fonction refuse tout
//   BREVO_CLE, COURRIEL_EXPEDITEUR, APP_URL   e-mails (voir la fonction « courriels »)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   fournis par Supabase à toute fonction serveur
// Déploiement : supabase functions deploy supprimer-comptes --no-verify-jwt (la clé ci-dessus remplace le jeton).
//
// Requête : POST, en-tête Authorization: Bearer <SUPPRESSION_CLE>, corps facultatif { "simuler": true }.
// Réponse : { comptes, effaces, fichiers, echecs } ; jamais d'adresse e-mail dans la réponse ni dans le journal.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { autorise, lotsParEspace } from "./regles.js";
import * as C from "./courriel.js";

const PREAVIS_PAR_NUIT = 50;

/** Préavis aux comptes inactifs ; rend le bilan (jamais d'adresse). */
async function prevenirInactifs(sb: ReturnType<typeof createClient>, simuler: boolean) {
  const b = { entretien: null as unknown, preavis: 0, preavis_echecs: 0, preavis_actif: true };
  const ent = await sb.rpc("entretien_comptes");
  if (ent.error) { console.error("supprimer-comptes: entretien", ent.error.message); return { ...b, preavis_actif: false }; } // 042 absente
  b.entretien = ent.data;
  const cle = Deno.env.get("BREVO_CLE") || "";
  const expediteur = C.expediteurDe(Deno.env.get("COURRIEL_EXPEDITEUR"));
  if (!cle || !expediteur) return { ...b, preavis_actif: false };
  const { data: inactifs, error } = await sb.rpc("inactifs_a_prevenir", { p_limite: PREAVIS_PAR_NUIT });
  if (error) { console.error("supprimer-comptes: inactifs", error.message); return b; }
  const lien = Deno.env.get("APP_URL") || "https://app.apiviz.fr";
  for (const p of inactifs || []) {
    if (simuler) { b.preavis++; continue; }
    const { data: quand, error: eq } = await sb.rpc("prevenir_inactif", { p_email: p.email });
    if (eq || !quand) { b.preavis_echecs++; continue; }
    const { data: permis } = await sb.rpc("courriel_a_envoyer", { p_email: p.email, p_nature: "preavis-inactivite", p_delai: "1 hour" });
    const r = permis === true
      ? await C.envoyer(fetch, cle, C.corpsBrevo({ expediteur, a: p.email, nom: p.prenom, message: C.preavisInactivite({ prenom: p.prenom, effacement_le: quand, lien }), nature: "preavis-inactivite" }))
      : { ok: false, statut: 0, erreur: "déjà envoyé" };
    if (r.ok) b.preavis++;
    else { b.preavis_echecs++; await sb.rpc("retirer_preavis", { p_email: p.email }); console.error("supprimer-comptes: préavis non envoyé", r.statut); }
  }
  return b;
}

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

  const inactifs = await prevenirInactifs(sb, simuler);
  const { data: dues, error } = await sb.rpc("suppressions_dues");
  if (error) { console.error("supprimer-comptes: lecture", error.message); return json({ erreur: "Lecture impossible : migration 041 appliquée ?" }, 500); }
  const bilan = { comptes: (dues || []).length, effaces: 0, fichiers: 0, echecs: 0, simule: simuler, ...inactifs };
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
