// Journal des erreurs, côté application (src/noyau/erreurs.js). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { nettoyer, empreinte, creerFile } from "../../src/noyau/erreurs.js";

test("aucun e-mail, identifiant ni texte saisi dans le message", () => {
  const m = nettoyer('Erreur pour pl@exemple.fr sur 11111111-1111-4111-8111-111111111111 : « Ruche du verger » et "Mme Martin"');
  assert.equal(m, "Erreur pour [e-mail] sur [id] : [texte] et [texte]");
  assert.equal(nettoyer("x".repeat(900)).length, 500);
  assert.equal(nettoyer(undefined), "");
});

test("empreinte stable", () => {
  assert.equal(empreinte("v1", "ruches", "TypeError"), empreinte("v1", "ruches", "TypeError"));
  assert.notEqual(empreinte("v1", "ruches", "TypeError"), empreinte("v1", "dash", "TypeError"));
  assert.match(empreinte("a"), /^[0-9a-f]{8}$/);
});

test("50 erreurs identiques : un seul envoi avec un compteur", async () => {
  const envois = [];
  let rappel = null;
  const file = creerFile({ envoyer: async (p) => envois.push(p), version: "v-test", minuterie: (f) => (rappel = f, 1) });
  for (let i = 0; i < 50; i++) file.signaler("script", { route: "ruches", message: "TypeError: x is undefined", source: "app.js:1:2" });
  file.signaler("erreur", { route: "ruches", code: "42501", message: "refus pour a@b.fr" });
  await rappel();
  assert.equal(envois.length, 2);
  assert.equal(envois[0].nombre, 50);
  assert.equal(envois[0].version, "v-test");
  assert.equal(envois[0].ecran, "ruches");
  assert.equal(envois[1].message, "erreur : 42501 refus pour [e-mail]");
  assert.equal(file.taille(), 0);
});

test("sans session ou sans réseau : on garde et on réessaie plus tard", async () => {
  const envois = [];
  let rappel = null, ok = false;
  const file = creerFile({ envoyer: async (p) => envois.push(p), pret: () => ok, minuterie: (f) => (rappel = f, 1) });
  file.signaler("script", { route: "dash", message: "boum" });
  await rappel();
  assert.equal(envois.length, 0);
  assert.equal(file.taille(), 1);
  ok = true;
  await rappel();
  assert.equal(envois.length, 1);
});

test("un envoi qui échoue ne gêne pas l'application, et le nombre d'envois est plafonné", async () => {
  let rappel = null, appels = 0;
  const file = creerFile({ envoyer: async () => { appels++; throw new Error("réseau"); }, maxParSession: 3, minuterie: (f) => (rappel = f, 1) });
  for (let i = 0; i < 10; i++) file.signaler("script", { message: "erreur " + i });
  await rappel();
  assert.equal(appels, 3);
  assert.equal(file.taille(), 0);
});
