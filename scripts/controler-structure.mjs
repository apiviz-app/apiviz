// Contrôle de structure avant mise en ligne (IT-04, AP-TECH-042) : remplace la case « migrations faites ».
// Rejoue 000 et toutes les migrations du dépôt sur un Postgres vide en mémoire (PGlite), calcule empreinte_structure()
// (migration 014), puis la compare à celle de la vraie base, lue par l'API avec la clé publique du fichier config.js
// donné. Aucune clé secrète, aucune écriture : la fonction ne renvoie que des empreintes md5 du catalogue.
// Prérequis : npm i @electric-sql/pglite@0.2 (hors dépôt).
// Usage : node scripts/controler-structure.mjs config.js                     (production)
//         node scripts/controler-structure.mjs environnements/recette/config.js
// Sortie : 0 si la base correspond exactement aux fichiers, 1 sinon (rubriques en écart affichées).
import fs from "node:fs";
import vm from "node:vm";
import { base, ORDRE } from "../tests/sql/socle.mjs";

const fichier = process.argv[2];
if (!fichier) { console.log("Usage : node scripts/controler-structure.mjs <config.js>"); process.exit(2); }
const ctx = { window: {}, document: { documentElement: { classList: { add() {} } } } };
vm.runInNewContext(fs.readFileSync(fichier, "utf8"), ctx);
const { url, key } = ctx.window.APIDOO || {};
if (!url || !key) { console.log(`Adresse ou clé publique introuvable dans ${fichier}`); process.exit(2); }

const db = await base();
const attendu = (await db.query("select public.empreinte_structure() e")).rows[0].e;

let reponse, texte;
try {
  reponse = await fetch(`${url}/rest/v1/rpc/empreinte_structure`, {
    method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: "{}",
  });
  texte = await reponse.text();
} catch (e) { console.log(`La base ne répond pas (${url}) : ${e.message}`); process.exit(1); }
if (reponse.status === 404) {
  console.log(`La base ${url} ne connaît pas empreinte_structure() : la migration 014 n'y est pas appliquée.`);
  process.exit(1);
}
if (!reponse.ok) { console.log(`Réponse ${reponse.status} de ${url} : ${texte.slice(0, 300)}`); process.exit(1); }
const obtenu = JSON.parse(texte);

const ecarts = Object.keys({ ...attendu, ...obtenu }).filter((k) => attendu[k] !== obtenu[k]).sort();
console.log(`Migrations du dépôt : ${ORDRE.join(", ")}`);
if (!ecarts.length) { console.log(`Structure identique : ${url} correspond aux fichiers de migrations.`); process.exit(0); }
console.log(`Écart de structure avec ${url} sur : ${ecarts.join(", ")}.`);
// Où en est la base ? On rejoue les fichiers en s'arrêtant de plus en plus tôt jusqu'à retrouver ses empreintes
// (empreinte_structure() existe depuis 014).
let trouve = "";
for (let i = ORDRE.length - 2; i >= ORDRE.indexOf("014-roles-audit.sql") && !trouve; i--) {
  const e = (await (await base({ jusqua: ORDRE[i] })).query("select public.empreinte_structure() e")).rows[0].e;
  if (Object.keys({ ...e, ...obtenu }).every((k) => e[k] === obtenu[k])) trouve = ORDRE[i];
}
if (trouve) {
  console.log(`La base en est à ${trouve}. Migrations à appliquer, dans l'ordre : ${ORDRE.slice(ORDRE.indexOf(trouve) + 1).join(", ")}.`);
} else if (ecarts.join() === "fonctions") {
  console.log("Tables, contraintes, règles d'accès et déclencheurs identiques aux fichiers ; seul le texte de certaines fonctions diffère (par exemple une indentation différente).");
} else {
  console.log("La base ne correspond exactement à aucune étape des migrations du dépôt : une migration n'y est pas appliquée (voir migrations/a-appliquer-en-production.txt), ou la base a été modifiée hors fichier.");
}
process.exit(1);
