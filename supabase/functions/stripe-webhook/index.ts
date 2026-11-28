// Apiviz — fonction serveur « stripe-webhook » (migration 043) : Stripe y envoie ses notifications ; elle écrit
// l'abonnement de l'exploitation (appliquer_abonnement_externe) et ajoute les gouttes des recharges payées
// (crediter_gouttes_payees). Déployée sans contrôle du jeton (--no-verify-jwt, sans-jeton.txt) : elle vérifie elle-même
// la signature Stripe et refuse tout le reste.
//
// Secrets (un jeu par projet Supabase, jamais dans le dépôt) :
//   STRIPE_CLE              clé secrète Stripe (relire l'abonnement à jour, voir « paiement »)
//   STRIPE_WEBHOOK_SECRET   secret de signature du point de terminaison (whsec_…), donné par Stripe à sa création
//
// Point de terminaison à créer dans Stripe : https://<projet>.supabase.co/functions/v1/stripe-webhook, événements
//   checkout.session.completed, checkout.session.async_payment_succeeded,
//   customer.subscription.created, customer.subscription.updated, customer.subscription.deleted,
//   customer.subscription.paused, customer.subscription.resumed.
// Les notifications arrivent parfois en double ou dans le désordre : l'abonnement est toujours relu chez Stripe, et
// chaque notification traitée est notée dans paiements_evenements. Une erreur renvoie 500 : Stripe réessaie.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { ligneAbonnement, signatureValide } from "./stripe.js";

const CLE = Deno.env.get("STRIPE_CLE") || "";
const SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const reponse = (texte: string, status = 200) => new Response(texte, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

async function stripe(chemin: string) {
  const rep = await fetch(`https://api.stripe.com/v1/${chemin}`, { headers: { Authorization: `Bearer ${CLE}`, "Stripe-Version": "2025-03-31.basil" } });
  const j = await rep.json().catch(() => ({}));
  if (!rep.ok) throw new Error(j?.error?.message || `Stripe ${rep.status}`);
  return j;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return reponse("Méthode non prise en charge.", 405);
  if (!CLE || !SECRET) return reponse("Paiement non configuré.", 503);
  const brut = await req.text();
  if (!(await signatureValide(req.headers.get("Stripe-Signature"), brut, SECRET))) return reponse("Signature invalide.", 400);
  let ev: { id: string; type: string; data: { object: Record<string, any> } };
  try { ev = JSON.parse(brut); } catch { return reponse("Corps illisible.", 400); }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: deja } = await db.from("paiements_evenements").select("id").eq("id", ev.id).maybeSingle();
  if (deja) return reponse("Déjà traité.");

  const o = ev.data?.object || {};
  let exploitation: string | null = null;
  try {
    const exploitationDuClient = async (client: string) => {
      if (!client) return null;
      const { data } = await db.from("paiements_clients").select("exploitation_id").eq("source", "stripe").eq("client", client).maybeSingle();
      return (data?.exploitation_id as string) || null;
    };
    const appliquerAbonnement = async (id: string, repli: string | null) => {
      const sub = await stripe(`subscriptions/${encodeURIComponent(id)}`);
      const ligne = ligneAbonnement(sub, { exploitation: repli || (await exploitationDuClient(sub.customer)) });
      exploitation = ligne?.exploitation_id || repli;
      if (!ligne) return "rien";
      const { data, error } = await db.rpc("appliquer_abonnement_externe", { p: ligne });
      if (error) throw new Error(error.message);
      return `abonnement ${ligne.statut}, offre en vigueur ${data ?? "inchangée"}`;
    };

    let bilan = "ignoré";
    if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
      exploitation = o.metadata?.exploitation_id || o.client_reference_id || null;
      if (exploitation && o.customer) {
        await db.from("paiements_clients").upsert({ exploitation_id: exploitation, source: "stripe", client: o.customer }, { onConflict: "exploitation_id,source", ignoreDuplicates: true });
      }
      if (o.mode === "subscription" && o.subscription) bilan = await appliquerAbonnement(o.subscription, exploitation);
      else if (o.mode === "payment" && o.payment_status === "paid" && exploitation) {
        const gouttes = Math.round(Number(o.metadata?.gouttes));
        if (gouttes > 0) {
          const { data, error } = await db.rpc("crediter_gouttes_payees", {
            p_exploitation: exploitation, p_quantite: gouttes, p_reference: o.payment_intent || o.id, p_source: "stripe", p_email: o.metadata?.email || "",
          });
          if (error) throw new Error(error.message);
          bilan = data ? `${gouttes} gouttes ajoutées` : "recharge déjà ajoutée";
        }
      }
    } else if (ev.type.startsWith("customer.subscription.")) {
      bilan = await appliquerAbonnement(o.id, o.metadata?.exploitation_id || null);
    }

    await db.from("paiements_evenements").insert({ id: ev.id, source: "stripe", type: ev.type, exploitation_id: exploitation });
    console.log("stripe-webhook:", ev.type, ev.id, bilan);
    return reponse(bilan);
  } catch (e) {
    console.error("stripe-webhook: échec", ev.type, ev.id, (e as Error).message);
    return reponse("Échec, à réessayer.", 500);
  }
});
