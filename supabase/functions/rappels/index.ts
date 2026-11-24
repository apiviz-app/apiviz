// Apiviz — fonction serveur « rappels » (v5.87, migration 040) : rappels même quand Apiviz est fermée (Web Push).
//
// Deux usages :
//   { "cle": true }   → { cle } : la clé publique VAPID, pour que l'appareil s'abonne (aucune connexion demandée).
//   { "envoyer": true } avec l'en-tête x-rappels-secret → envoie, à chaque personne abonnée, au plus un rappel (deux
//                       par semaine au plus) : gestes de saison, beau créneau demain, ruches pas vues depuis 30 jours.
//                       Lancé chaque matin par l'action GitHub « Rappels » (.github/workflows/rappels.yml).
//   Option « essai » : { "envoyer": true, "essai": true } ne fait rien partir et rend ce qui serait envoyé.
//
// Secrets (un jeu par projet Supabase, jamais dans le dépôt) :
//   VAPID_PUBLIQUE, VAPID_PRIVEE   paire de clés VAPID (npx web-push generate-vapid-keys)
//   VAPID_SUJET                    « mailto:… » de l'équipe Apiviz
//   RAPPELS_SECRET                 mot de passe de l'action « Rappels » (le même dans les secrets GitHub)
//   SUPABASE_SERVICE_ROLE_KEY      fourni par Supabase : lecture de toutes les exploitations des personnes abonnées
// Sans les clés VAPID : { cle: null } et rien n'est envoyé (l'application garde les rappels « Apiviz ouverte »).

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";
import { choisir, rappelMeteo, rappelSaison, rappelVisites, ruchesAVoir } from "./regles.js";

const PUB = Deno.env.get("VAPID_PUBLIQUE") || "";
const PRIV = Deno.env.get("VAPID_PRIVEE") || "";
const SUJET = Deno.env.get("VAPID_SUJET") || "mailto:apiviz.app@gmail.com";
const SECRET = Deno.env.get("RAPPELS_SECRET") || "";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-rappels-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
const aujourdhui = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

async function prevision(lat: number, lng: number) {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,wind_speed_10m_max,precipitation_sum&forecast_days=2&timezone=Europe%2FParis`);
    const j = await r.json();
    return { tmax: j.daily.temperature_2m_max[1], vent: j.daily.wind_speed_10m_max[1], pluie: j.daily.precipitation_sum[1] };
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "Méthode non prise en charge." }, 405);
  let corps: { cle?: boolean; envoyer?: boolean; essai?: boolean } = {};
  try { corps = await req.json(); } catch { return json({ erreur: "Requête illisible." }, 400); }
  if (corps.cle) return json({ cle: PUB && PRIV ? PUB : null });
  if (!corps.envoyer) return json({ erreur: "Rien à faire." }, 400);
  if (!SECRET || req.headers.get("x-rappels-secret") !== SECRET) return json({ erreur: "Refusé." }, 403);
  if (!PUB || !PRIV) return json({ erreur: "Clés VAPID absentes : rien n'est envoyé." }, 503);
  webpush.setVapidDetails(SUJET, PUB, PRIV);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const jour = aujourdhui(), maintenant = new Date();
  const { data: abos, error } = await db.from("abonnements_push").select("id,email,endpoint,p256dh,auth,types");
  if (error) return json({ erreur: "Lecture des abonnements impossible (migration 040 ?)." }, 503);
  const parPersonne = new Map<string, typeof abos>();
  for (const a of abos || []) { if (!parPersonne.has(a.email)) parPersonne.set(a.email, []); parPersonne.get(a.email)!.push(a); }
  const meteoCache = new Map<string, Awaited<ReturnType<typeof prevision>>>();
  const bilan = { personnes: parPersonne.size, envoyes: 0, retires: 0, rien: 0, essai: [] as unknown[] };

  for (const [email, appareils] of parPersonne) {
    const depuis = new Date(maintenant.getTime() - 30 * 864e5).toISOString();
    const { data: envoyes } = await db.from("notifications_envoyees").select("type,cle,envoye_le").eq("email", email).gte("envoye_le", depuis);
    const { data: mb } = await db.from("membres").select("exploitation_id").eq("email", email);
    const ex = (mb || []).map((m) => m.exploitation_id);
    const types = appareils[0].types || {};
    const candidats = [];
    candidats.push(rappelSaison(jour, new Set((envoyes || []).map((x) => x.cle))));
    if (ex.length) {
      const { data: ruches } = await db.from("ruches").select("id,nom,rucher,sortie,created_at").in("exploitation_id", ex).limit(2000);
      const ids = (ruches || []).map((r) => r.id);
      const dernieres: Record<string, string> = {};
      if (ids.length) {
        const { data: vis } = await db.from("visites").select("ruche_id,date_visite").in("ruche_id", ids).gte("date_visite", new Date(maintenant.getTime() - 400 * 864e5).toISOString().slice(0, 10)).order("date_visite", { ascending: false }).limit(10000);
        for (const v of vis || []) if (!dernieres[v.ruche_id]) dernieres[v.ruche_id] = v.date_visite;
      }
      const aVoir = ruchesAVoir(ruches || [], dernieres, jour);
      if (aVoir.length && types.meteo !== false) {
        const { data: rr } = await db.from("ruchers").select("nom,lat,lng").in("exploitation_id", ex).not("lat", "is", null);
        const r = (rr || []).find((x) => x.nom === aVoir[0].rucher) || (rr || [])[0];
        if (r) {
          const k = `${r.lat.toFixed(2)},${r.lng.toFixed(2)}`;
          if (!meteoCache.has(k)) meteoCache.set(k, await prevision(r.lat, r.lng));
          const g = aVoir.find((x) => x.rucher === r.nom) || aVoir[0];
          candidats.push(rappelMeteo(r.nom, meteoCache.get(k), g.ruches.length, jour));
        }
      }
      candidats.push(rappelVisites(aVoir, jour));
    }
    const r = choisir(candidats.filter(Boolean), types, envoyes || [], maintenant);
    if (!r) { bilan.rien++; continue; }
    if (corps.essai) { bilan.essai.push({ appareils: appareils.length, ...r }); continue; }
    const charge = JSON.stringify({ titre: r.titre, corps: r.corps, route: r.route, tag: `apiviz-${r.type}` });
    let parti = false;
    for (const a of appareils) {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, charge, { TTL: 12 * 3600, urgency: "normal" });
        parti = true;
      } catch (e) {
        const s = (e as { statusCode?: number }).statusCode;
        if (s === 404 || s === 410) { await db.from("abonnements_push").delete().eq("id", a.id); bilan.retires++; }
        else console.error("rappels: envoi", s, (e as Error).message);
      }
    }
    if (parti) { await db.from("notifications_envoyees").insert({ email, type: r.type, cle: r.cle }); bilan.envoyes++; }
  }
  await db.from("notifications_envoyees").delete().lt("envoye_le", new Date(maintenant.getTime() - 400 * 864e5).toISOString());
  console.log("rappels:", JSON.stringify({ ...bilan, essai: bilan.essai.length }));
  return json(bilan);
});
