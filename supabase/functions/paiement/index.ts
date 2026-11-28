// Apiviz — fonction serveur « paiement » (migration 043) : ouvre la page de paiement Stripe (Checkout) pour une offre
// ou une recharge de gouttes, ou l'espace client Stripe (carte, factures, changement d'offre, résiliation).
// Rien n'est écrit ici dans abonnements : c'est « stripe-webhook » qui le fait, sur notification de Stripe.
//
// Secrets (un jeu par projet Supabase, jamais dans le dépôt) :
//   STRIPE_CLE   clé secrète Stripe : sk_test_… en recette, sk_live_… (ou clé restreinte) en production. Sans elle : 503.
//   APP_URL      adresse de l'application pour le retour (https://recette.apiviz.fr en recette).
//   CGV_URL      adresse des CGV publiées (par défaut https://app.apiviz.fr/cgv.html) ; la même doit être saisie dans
//                Stripe › Paramètres › Informations publiques, sans quoi Stripe refuse la case d'acceptation.
//   TVA_MENTION  facultatif : mention imprimée en pied des factures (« TVA non applicable, art. 293 B du CGI » en
//                franchise en base). Présente : l'écran Recharger n'affiche plus de ligne de TVA.
//
// Requête : POST, en-têtes Authorization (jeton de l'utilisateur) et x-exploitation (exploitation choisie).
//   { "action": "abonner", "offre": "rucher"|"exploitation", "periode": "mois"|"an" } → { url }  (responsable seulement)
//   { "action": "recharger", "pack": "sachet"|"pot"|"seau" }                         → { url }  (tout membre)
//   { "action": "gerer" [, "but": "resilier"] }                                       → { url }  (responsable seulement)
//   { "action": "etat" }                                                              → { actif, franchise }
// L'utilisateur et son rôle sont lus avec son jeton (mon_offre, RLS) ; le client Stripe de l'exploitation est rangé
// dans paiements_clients avec la clé de service.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { abonnementPayeEnCours, CGV_VERSION, clePrix, finEssai, formulaire, piedFacture, recharge, retour, textesCommande } from "./stripe.js";

const CLE = Deno.env.get("STRIPE_CLE") || "";
const APP = Deno.env.get("APP_URL") || "https://app.apiviz.fr";
const CGV = Deno.env.get("CGV_URL") || "https://app.apiviz.fr/cgv.html";
const TVA_MENTION = Deno.env.get("TVA_MENTION") || "";
const PIED = piedFacture(TVA_MENTION, CGV);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-exploitation",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
const erreur = (message: string, status: number, code: string) => json({ erreur: message, code }, status);

async function stripe(chemin: string, corps?: Record<string, unknown>, methode = corps ? "POST" : "GET") {
  const rep = await fetch(`https://api.stripe.com/v1/${chemin}`, {
    method: methode,
    headers: { Authorization: `Bearer ${CLE}`, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2025-03-31.basil" },
    body: corps ? formulaire(corps).toString() : undefined,
  });
  const j = await rep.json().catch(() => ({}));
  if (!rep.ok) {
    console.error("paiement: Stripe", rep.status, j?.error?.message);
    throw Object.assign(new Error(j?.error?.message || `Stripe ${rep.status}`), { status: rep.status });
  }
  return j;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return erreur("Méthode non prise en charge.", 405, "methode");
  let corps: { action?: string; offre?: string; periode?: string; pack?: string; but?: string } = {};
  try { corps = await req.json(); } catch { return erreur("Requête illisible.", 400, "requete"); }
  if (corps.action === "etat") return json({ actif: !!CLE, franchise: !!TVA_MENTION });
  if (!CLE) return erreur("Le paiement n'est pas encore ouvert sur cette version.", 503, "indisponible");

  const auth = req.headers.get("Authorization") || "";
  const jeton = auth.replace(/^Bearer\s+/i, "");
  const exploitation = req.headers.get("x-exploitation") || "";
  if (!jeton) return erreur("Connecte-toi pour payer.", 401, "connexion");
  if (!UUID.test(exploitation)) return erreur("Choisis d'abord une exploitation.", 400, "exploitation");

  const url = Deno.env.get("SUPABASE_URL")!;
  const moi = createClient(url, req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "", {
    global: { headers: { Authorization: auth, "x-exploitation": exploitation } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: u, error: eu } = await moi.auth.getUser(jeton);
  if (eu || !u?.user?.email) return erreur("Connecte-toi pour payer.", 401, "connexion");
  const email = u.user.email.toLowerCase();
  const { data: offre, error: eo } = await moi.rpc("mon_offre");
  if (eo || !offre) return erreur("Tu n'es pas membre de cette exploitation.", 403, "membre");

  try {
    // Client Stripe de l'exploitation : le même à chaque passage.
    const clientStripe = async () => {
      const { data: c } = await service.from("paiements_clients").select("client").eq("exploitation_id", exploitation).eq("source", "stripe").maybeSingle();
      if (c?.client) {
        // Pied des factures tenu à jour (mention de TVA, rappel de l'exécution immédiate) : il vaut pour les suivantes.
        await stripe(`customers/${c.client}`, { invoice_settings: { footer: PIED } }).catch(() => null);
        return c.client as string;
      }
      const { data: ex } = await service.from("exploitations").select("nom").eq("id", exploitation).maybeSingle();
      const cree = await stripe("customers", { email, name: ex?.nom || undefined, preferred_locales: ["fr"], invoice_settings: { footer: PIED }, metadata: { exploitation_id: exploitation } });
      await service.from("paiements_clients").upsert({ exploitation_id: exploitation, source: "stripe", client: cree.id }, { onConflict: "exploitation_id,source", ignoreDuplicates: true });
      const { data: relu } = await service.from("paiements_clients").select("client").eq("exploitation_id", exploitation).eq("source", "stripe").maybeSingle();
      return (relu?.client as string) || cree.id;
    };

    if (corps.action === "abonner") {
      if (!offre.responsable) return erreur("Seul un responsable de l'exploitation peut choisir l'offre.", 403, "responsable");
      const cle = clePrix(corps.offre, corps.periode);
      if (!cle) return erreur("Offre ou période inconnue.", 400, "offre");
      const ab = offre.abonnement;
      if (abonnementPayeEnCours(ab)) return erreur(ab.statut === "resilie"
        ? "Ton abonnement court encore jusqu'à son échéance : réactive-le depuis « Gérer mon abonnement »."
        : "Un abonnement est déjà en cours : change d'offre depuis « Gérer mon abonnement ».", 409, "deja");
      const prix = await stripe(`prices?active=true&lookup_keys[]=${encodeURIComponent(cle)}`);
      const p = prix?.data?.[0];
      if (!p?.id) return erreur("Ce prix n'est pas encore en place.", 503, "prix");
      const essai = finEssai(ab);
      const metadata = { exploitation_id: exploitation, offre: corps.offre, periode: corps.periode, email, cgv: CGV_VERSION, execution_immediate: "demandee" };
      const session = await stripe("checkout/sessions", {
        mode: "subscription",
        customer: await clientStripe(),
        client_reference_id: exploitation,
        line_items: [{ price: p.id, quantity: 1 }],
        subscription_data: { metadata, ...(essai ? { trial_end: essai } : {}) },
        metadata,
        locale: "fr",
        allow_promotion_codes: true,
        consent_collection: { terms_of_service: "required" },
        custom_text: textesCommande("abonnement", CGV),
        billing_address_collection: "auto",
        success_url: retour(APP, "ok"),
        cancel_url: retour(APP, "annule"),
      });
      return json({ url: session.url });
    }

    if (corps.action === "recharger") {
      const r = recharge(corps.pack);
      if (!r) return erreur("Recharge inconnue.", 400, "pack");
      const metadata = { exploitation_id: exploitation, gouttes: String(r.gouttes), pack: r.id, email, cgv: CGV_VERSION, execution_immediate: "demandee" };
      const session = await stripe("checkout/sessions", {
        mode: "payment",
        customer: await clientStripe(),
        client_reference_id: exploitation,
        line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: r.prix_cts, product_data: { name: `Recharge ${r.nom} · ${r.gouttes} gouttes d'API` } } }],
        payment_intent_data: { metadata },
        // Facture après paiement : seul support où imprimer la mention de TVA et la demande d'exécution immédiate.
        invoice_creation: { enabled: true, invoice_data: { footer: PIED, metadata } },
        consent_collection: { terms_of_service: "required" },
        custom_text: textesCommande("recharge", CGV),
        metadata,
        locale: "fr",
        success_url: retour(APP, "recharge"),
        cancel_url: retour(APP, "annule"),
      });
      return json({ url: session.url });
    }

    if (corps.action === "gerer") {
      if (!offre.responsable) return erreur("Seul un responsable de l'exploitation gère l'abonnement.", 403, "responsable");
      const { data: c } = await service.from("paiements_clients").select("client").eq("exploitation_id", exploitation).eq("source", "stripe").maybeSingle();
      if (!c?.client) return erreur("Aucun paiement par carte pour cette exploitation.", 404, "client");
      // « Résilier mon abonnement » (résiliation en ligne, art. L215-1-1) : l'espace Stripe s'ouvre directement sur la
      // confirmation de la résiliation, à la fin de la période payée, puis revient dans Apiviz.
      let flux: Record<string, unknown> | undefined;
      if (corps.but === "resilier") {
        const { data: ab } = await service.from("abonnements").select("externe, canal").eq("exploitation_id", exploitation).maybeSingle();
        if (ab?.canal !== "web" || !ab?.externe) return erreur("Aucun abonnement par carte à résilier.", 404, "abonnement");
        flux = { type: "subscription_cancel", subscription_cancel: { subscription: ab.externe },
          after_completion: { type: "redirect", redirect: { return_url: retour(APP, "resilie") } } };
      }
      const portail = await stripe("billing_portal/sessions", { customer: c.client, locale: "fr", return_url: retour(APP, "gere"), ...(flux ? { flow_data: flux } : {}) });
      return json({ url: portail.url });
    }

    return erreur("Action inconnue.", 400, "action");
  } catch (e) {
    return erreur("Le paiement ne répond pas pour l'instant. Réessaie dans un instant.", 502, "stripe");
  }
});
