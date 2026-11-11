// Rôles (src/domaines/compte/regles.js, IT-04). Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { actionPermise, peutEcrire, libelleRole, ACTIONS_LECTEUR, styleLecteur } from "../../src/domaines/compte/regles.js";

test("responsable et membre écrivent, lecteur non", () => {
  assert.equal(peutEcrire("responsable"), true);
  assert.equal(peutEcrire("membre"), true);
  assert.equal(peutEcrire("lecteur"), false);
  assert.equal(libelleRole("lecteur"), "Lecture seule");
});

test("un lecteur navigue et consulte, mais ne saisit rien", () => {
  for (const a of ["go", "ruche", "exp", "phvoir", "logout", "exquitter"]) assert.equal(actionPermise("lecteur", a), true, a);
  for (const a of ["newvisite", "quick", "editclient", "delvisite", "togglepaye", "vxouvrir", "v3dicter", "tnvoix", "exlien", "v3restaurer", "nouvelleaction"])
    assert.equal(actionPermise("lecteur", a), false, a);
  assert.equal(actionPermise("lecteur", "n4q", "go"), true);
  assert.equal(actionPermise("lecteur", "n4q", "newvisite"), false);
  assert.equal(actionPermise("membre", "newvisite"), true);
  assert.equal(actionPermise(undefined, "newvisite"), true, "rôle inconnu (hors ligne au démarrage) : la base reste juge");
});

test("chaque action permise au lecteur existe dans le code (pas de nom mort)", () => {
  // Scripts de la racine et modules de src/domaines (les écrans migrés y déclarent leurs actions).
  const fichiers = [...fs.readdirSync(".").filter((f) => f.endsWith(".js")),
    ...fs.readdirSync("src/domaines", { recursive: true }).filter((f) => f.endsWith(".js")).map((f) => "src/domaines/" + f)];
  const code = fichiers.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const mortes = ACTIONS_LECTEUR.filter((a) => !new RegExp(`\\b${a}\\b`).test(code));
  assert.deepEqual(mortes, []);
});

test("la règle CSS masque tout bouton d'action non permise", () => {
  const s = styleLecteur();
  assert.match(s, /html\.lecteur \[data-act\]:not\(\[data-act="go"\]\)/);
  assert.match(s, /html\.lecteur \.fab/);
});
