// Charge l'exploitation de démonstration (IT-04, AP-FEAT-018, AP-US-017) dans une base Apidoo de recette ou de test,
// depuis le fichier unique tests/demo/exploitation-demo.json : 3 ruchers, 20 colonies, saisons 2025 et 2026.
// Passe par l'API, connecté avec un compte d'essai, et par les fonctions SQL (creer_exploitation_demo, creer_visite,
// creer_vente, regler) : la RLS et les contrôles de la base s'appliquent comme pour l'application.
//
// REFUSE DE S'EXÉCUTER SUR LA PRODUCTION (AP-TECH-057).
//
// Usage (depuis la racine du dépôt, Node 18 ou plus) :
//   APIDOO_DEMO_EMAIL=… APIDOO_DEMO_MOT_DE_PASSE=… node scripts/demo.mjs [environnements/recette/config.js]
// Le compte doit exister et avoir confirmé son adresse. Aucun mot de passe n'est écrit dans le dépôt.
import fs from "node:fs";
import vm from "node:vm";
import { operations, attendu } from "../tests/demo/operations.mjs";

const PRODUCTION = "xkucyqzlqfeyuomrtjbu"; // projet Supabase « apidoo » (vraies données)
const fichier = process.argv[2] || "environnements/recette/config.js";
const ctx = { window: {}, document: { documentElement: { classList: { add() {} } } } };
vm.runInNewContext(fs.readFileSync(fichier, "utf8"), ctx);
const { url, key } = ctx.window.APIDOO || {};

function refuser(message) { console.error("REFUS : " + message); process.exit(2); }
if (!url || !key) refuser(`adresse ou clé publique introuvable dans ${fichier}.`);
if (url.includes(PRODUCTION)) refuser(`${url} est la base de production. Les données de démonstration ne vont que sur apidoo-test ou une base locale.`);
const prod = fs.readFileSync("config.js", "utf8");
if (prod.includes(new URL(url).host)) refuser(`${url} est la base configurée pour la production (config.js à la racine).`);
const email = process.env.APIDOO_DEMO_EMAIL, motDePasse = process.env.APIDOO_DEMO_MOT_DE_PASSE;
if (!email || !motDePasse) refuser("indiquez le compte d'essai dans APIDOO_DEMO_EMAIL et APIDOO_DEMO_MOT_DE_PASSE.");

const doc = JSON.parse(fs.readFileSync("tests/demo/exploitation-demo.json", "utf8"));

async function appel(chemin, { methode = "POST", corps, entetes = {} } = {}) {
  const r = await fetch(url + chemin, { method: methode, headers: { apikey: key, "Content-Type": "application/json", ...entetes }, body: corps === undefined ? undefined : JSON.stringify(corps) });
  const texte = await r.text();
  if (!r.ok) throw new Error(`${chemin} : ${r.status} ${texte.slice(0, 300)}`);
  return texte ? JSON.parse(texte) : null;
}

const session = await appel("/auth/v1/token?grant_type=password", { corps: { email, password: motDePasse } });
const auth = { Authorization: "Bearer " + session.access_token };
const ex = await appel("/rest/v1/rpc/creer_exploitation_demo", { corps: { p_nom: doc.nom }, entetes: auth });
console.log(`Exploitation de démonstration créée : ${ex} (${url})`);
const avecEx = { ...auth, "x-exploitation": ex, Prefer: "return=minimal" };
let n = 0;
for (const op of operations(doc, ex)) {
  if (op.rpc) await appel(`/rest/v1/rpc/${op.rpc}`, { corps: op.args, entetes: avecEx });
  else await appel(`/rest/v1/${op.insert}`, { corps: op.lignes, entetes: avecEx });
  if (++n % 50 === 0) console.log(`… ${n} opérations`);
}
const a = attendu(doc);
console.log(`Terminé : ${a.ruchers} ruchers, ${a.colonies} colonies, ${a.visites} visites sur ${a.saisons} saisons, ${a.recoltes} récoltes, ${a.ventes} ventes.`);
console.log("Pour l'ouvrir : se connecter avec ce compte et choisir l'exploitation dans le menu du compte.");
