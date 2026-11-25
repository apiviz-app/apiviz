// E-mails d'Apiviz par Brevo (v5.90, migration 042) : gabarits, expéditeur, corps de requête, envoi.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as C from "../../supabase/functions/courriels/courriel.js";

test("courriels et supprimer-comptes partagent exactement le même fichier", () => {
  assert.equal(fs.readFileSync("supabase/functions/courriels/courriel.js", "utf8"), fs.readFileSync("supabase/functions/supprimer-comptes/courriel.js", "utf8"));
});

test("date longue en français, heure de Paris", () => {
  assert.equal(C.dateLongue("2026-12-24T23:30:00Z"), "25 décembre 2026");
  assert.equal(C.dateLongue("pas une date"), "");
});

test("expéditeur : « Nom <adresse> » ou adresse seule", () => {
  assert.deepEqual(C.expediteurDe("Apiviz <bonjour@apiviz.fr>"), { name: "Apiviz", email: "bonjour@apiviz.fr" });
  assert.deepEqual(C.expediteurDe("bonjour@apiviz.fr"), { name: "Apiviz", email: "bonjour@apiviz.fr" });
  assert.equal(C.expediteurDe(""), null);
  assert.equal(C.expediteurDe("Apiviz"), null);
});

test("préavis d'inactivité : date, reconnexion, exploitations partagées, lien", () => {
  const m = C.preavisInactivite({ prenom: "Anne", effacement_le: "2026-12-24T10:00:00Z", lien: "https://app.apiviz.fr" });
  assert.equal(m.sujet, "Ton compte Apiviz sera supprimé le 24 décembre 2026");
  assert.match(m.texte, /^Ton compte Apiviz sera supprimé le 24 décembre 2026\n\nBonjour Anne,/);
  assert.match(m.texte, /reconnecter avant cette date/);
  assert.match(m.texte, /partages avec d'autres membres leur restent/);
  assert.match(m.html, /href="https:\/\/app\.apiviz\.fr"/);
  assert.match(C.preavisInactivite({ prenom: "", effacement_le: "2026-12-24T10:00:00Z", lien: "x" }).texte, /\nBonjour,\n/);
});

test("confirmation de demande de suppression", () => {
  const m = C.suppressionDemandee({ prenom: "Alex", effacement_le: "2026-12-24T10:00:00Z", lien: "https://app.apiviz.fr" });
  assert.match(m.texte, /Elle aura lieu le 24 décembre 2026/);
  assert.match(m.texte, /Annuler la suppression/);
  assert.match(m.texte, /pas à l'origine de cette demande/);
});

test("le prénom est échappé dans le HTML", () => {
  const m = C.preavisInactivite({ prenom: "<script>x</script>", effacement_le: "2026-12-24T10:00:00Z", lien: "https://a" });
  assert.ok(!m.html.includes("<script>"));
  assert.ok(m.html.includes("&lt;script&gt;"));
});

test("corps Brevo : expéditeur, destinataire, sujet, HTML, texte, étiquette", () => {
  const message = { sujet: "S", html: "<p>H</p>", texte: "T" };
  const c = C.corpsBrevo({ expediteur: { name: "Apiviz", email: "b@apiviz.fr" }, a: "x@y.fr", nom: " Anne ", message, nature: "preavis-inactivite" });
  assert.deepEqual(c, { sender: { name: "Apiviz", email: "b@apiviz.fr" }, to: [{ email: "x@y.fr", name: "Anne" }], subject: "S", htmlContent: "<p>H</p>", textContent: "T", tags: ["preavis-inactivite"] });
  assert.deepEqual(C.corpsBrevo({ expediteur: {}, a: "x@y.fr", nom: "", message, nature: "n" }).to, [{ email: "x@y.fr" }]);
});

test("envoi : clé dans l'en-tête, réponses et pannes traduites sans lever", async () => {
  let vu;
  const ok = await C.envoyer(async (url, o) => { vu = { url, o }; return { ok: true, status: 201, json: async () => ({ messageId: "<m1>" }) }; }, "cle-1", { a: 1 });
  assert.deepEqual(ok, { ok: true, id: "<m1>" });
  assert.equal(vu.url, C.BREVO_URL);
  assert.equal(vu.o.headers["api-key"], "cle-1");
  assert.equal(vu.o.body, '{"a":1}');
  const refus = await C.envoyer(async () => ({ ok: false, status: 401, json: async () => ({ message: "Key not found" }) }), "k", {});
  assert.deepEqual(refus, { ok: false, statut: 401, erreur: "Key not found" });
  const panne = await C.envoyer(async () => { throw new Error("réseau"); }, "k", {});
  assert.deepEqual(panne, { ok: false, statut: 0, erreur: "réseau" });
});
