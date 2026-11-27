// Paiement par Stripe (migration 043) : règles partagées par les fonctions « paiement » et « stripe-webhook ».
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import * as P from "../../supabase/functions/paiement/stripe.js";
import { RECHARGES } from "../../src/domaines/compte/regles-offre.js";

test("paiement et stripe-webhook partagent exactement le même fichier", () => {
  assert.equal(fs.readFileSync("supabase/functions/paiement/stripe.js", "utf8"), fs.readFileSync("supabase/functions/stripe-webhook/stripe.js", "utf8"));
});

test("stripe-webhook se déploie sans contrôle du jeton, paiement avec", () => {
  const l = fs.readFileSync("supabase/functions/sans-jeton.txt", "utf8").split("\n").map((x) => x.trim());
  assert.ok(l.includes("stripe-webhook"));
  assert.ok(!l.includes("paiement"));
});

test("recharges : mêmes packs et prix que l'application", () => {
  assert.deepEqual(P.RECHARGES, RECHARGES);
  assert.equal(P.recharge("pot").gouttes, 850);
  assert.equal(P.recharge("baril"), null);
});

test("lookup keys des prix", () => {
  assert.equal(P.clePrix("rucher", "an"), "rucher_an");
  assert.equal(P.clePrix("exploitation", "mois"), "exploitation_mois");
  assert.equal(P.clePrix("decouverte", "mois"), null);
  assert.equal(P.clePrix("rucher", "semaine"), null);
  assert.deepEqual(P.deClePrix("exploitation_an"), { offre: "exploitation", periode: "an" });
  assert.equal(P.deClePrix("autre_an"), null);
  assert.equal(P.deClePrix(undefined), null);
});

test("formulaire Stripe : crochets pour objets et listes, valeurs vides omises", () => {
  const f = P.formulaire({ mode: "subscription", line_items: [{ price: "price_1", quantity: 1 }], subscription_data: { metadata: { offre: "rucher" }, trial_end: undefined }, locales: ["fr"], x: null });
  assert.equal(decodeURIComponent(f.toString()), "mode=subscription&line_items[0][price]=price_1&line_items[0][quantity]=1&subscription_data[metadata][offre]=rucher&locales[0]=fr");
});

test("signature Stripe : bonne, mauvaise, trop ancienne, plusieurs v1", async () => {
  const secret = "whsec_test", corps = '{"id":"evt_1"}', t = 1_800_000_000;
  const sig = crypto.createHmac("sha256", secret).update(`${t}.${corps}`).digest("hex");
  assert.equal(await P.signatureValide(`t=${t},v1=${sig}`, corps, secret, { maintenant: t + 10 }), true);
  assert.equal(await P.signatureValide(`t=${t},v1=${"0".repeat(64)},v1=${sig}`, corps, secret, { maintenant: t }), true);
  assert.equal(await P.signatureValide(`t=${t},v1=${sig}`, corps + " ", secret, { maintenant: t }), false);
  assert.equal(await P.signatureValide(`t=${t},v1=${sig}`, corps, "whsec_autre", { maintenant: t }), false);
  assert.equal(await P.signatureValide(`t=${t},v1=${sig}`, corps, secret, { maintenant: t + 301 }), false);
  assert.equal(await P.signatureValide(`v1=${sig}`, corps, secret, { maintenant: t }), false);
  assert.equal(await P.signatureValide(null, corps, secret), false);
  assert.equal(await P.signatureValide(`t=${t},v1=${sig}`, corps, "", { maintenant: t }), false);
});

const E = "11111111-1111-4111-8111-111111111111";
const sub = (x) => ({ id: "sub_1", customer: "cus_1", status: "active", metadata: { exploitation_id: E }, cancel_at_period_end: false, cancel_at: null,
  items: { data: [{ current_period_end: 1_900_000_000, price: { lookup_key: "rucher_an" } }] }, ...x });

test("abonnement actif, en essai, en retard de paiement", () => {
  assert.deepEqual(P.ligneAbonnement(sub()), { exploitation_id: E, canal: "web", offre: "rucher", periode: "an", externe: "sub_1", statut: "actif", fin: null });
  assert.equal(P.ligneAbonnement(sub({ status: "trialing" })).statut, "essai");
  assert.equal(P.ligneAbonnement(sub({ status: "past_due" })).statut, "actif");
});

test("résiliation demandée : l'offre court jusqu'à l'échéance", () => {
  const l = P.ligneAbonnement(sub({ cancel_at_period_end: true }));
  assert.equal(l.statut, "resilie");
  assert.equal(l.fin, new Date(1_900_000_000_000).toISOString());
  assert.equal(P.ligneAbonnement(sub({ cancel_at: 1_850_000_000 })).fin, new Date(1_850_000_000_000).toISOString());
  assert.equal(P.ligneAbonnement(sub({ status: "trialing", cancel_at_period_end: true, trial_end: 1_810_000_000 })).fin, new Date(1_810_000_000_000).toISOString());
  // Ancienne version de l'API : échéance sur l'abonnement.
  assert.equal(P.ligneAbonnement(sub({ cancel_at_period_end: true, current_period_end: 1_700_000_000 })).fin, new Date(1_700_000_000_000).toISOString());
});

test("abonnement terminé : résilié, fin = date de fin ou maintenant", () => {
  assert.equal(P.ligneAbonnement(sub({ status: "canceled", ended_at: 1_805_000_000 })).fin, new Date(1_805_000_000_000).toISOString());
  const m = Date.parse("2026-11-27T10:00:00Z");
  assert.deepEqual([P.ligneAbonnement(sub({ status: "unpaid" }), { maintenant: m }).statut, P.ligneAbonnement(sub({ status: "unpaid" }), { maintenant: m }).fin], ["resilie", "2026-11-27T10:00:00.000Z"]);
});

test("rien à écrire : paiement pas abouti, exploitation ou offre inconnue", () => {
  assert.equal(P.ligneAbonnement(sub({ status: "incomplete" })), null);
  assert.equal(P.ligneAbonnement(sub({ status: "incomplete_expired" })), null);
  assert.equal(P.ligneAbonnement(sub({ metadata: {} })), null);
  assert.equal(P.ligneAbonnement(sub({ metadata: {} }), { exploitation: E }).exploitation_id, E);
  assert.equal(P.ligneAbonnement(sub({ items: { data: [{ price: { lookup_key: "autre" } }] } })), null);
  assert.equal(P.ligneAbonnement(sub({ items: { data: [{ price: {} }] }, metadata: { exploitation_id: E, offre: "exploitation", periode: "mois" } })).offre, "exploitation");
  assert.equal(P.ligneAbonnement(null), null);
});

test("essai sans carte en cours : la carte n'est débitée qu'à sa fin (48 h minimum)", () => {
  const m = Date.parse("2026-11-27T10:00:00Z");
  const fin = "2026-12-20T10:00:00Z";
  assert.equal(P.finEssai({ statut: "essai", canal: "manuel", fin }, m), Date.parse(fin) / 1000);
  assert.equal(P.finEssai({ statut: "essai", canal: "manuel", fin: "2026-11-28T10:00:00Z" }, m), null);
  assert.equal(P.finEssai({ statut: "actif", canal: "manuel", fin }, m), null);
  assert.equal(P.finEssai({ statut: "essai", canal: "web", fin }, m), null);
  assert.equal(P.finEssai(null, m), null);
});

test("adresse de retour", () => {
  assert.equal(P.retour("https://recette.apiviz.fr", "ok"), "https://recette.apiviz.fr/?paiement=ok");
  assert.equal(P.retour("", "annule"), "https://app.apiviz.fr/?paiement=annule");
});
