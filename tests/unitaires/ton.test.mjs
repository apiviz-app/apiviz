// Charte de ton (AP-FEAT-112, AP-US-124) : l'application tutoie ; les documents émis (registre, reçus et messages
// envoyés aux clients, factures) vouvoient. Voir docs/CHARTE_DE_TON.md. Lancer : node --test tests/unitaires/
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Fragments où le vouvoiement est voulu : chaque exception cite le texte exact, pour qu'un nouveau « vous » échoue.
const EXCEPTIONS = [
  ["registre.js", "Notez un traitement dans une visite"], // registre : document émis
  ["registre.js", "Gardez les ordonnances et factures des médicaments"], // registre : document émis
  ["ux.js", "merci pour votre achat du"], // reçu envoyé au client
  ["ux.js", '"Votre miel · "'], // objet de l'e-mail envoyé au client
];
const FORMES = /\b(vous|votre|vos|[a-zà-ÿ]{3,}ez)\b/gi;
const PAS_DES_VERBES = new Set(["chez", "assez"]);

function fichiers(dossier, liste = []) {
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) fichiers(p, liste);
    else if (e.name.endsWith(".js")) liste.push(p);
  }
  return liste;
}
const sources = [...fs.readdirSync(".").filter((f) => f.endsWith(".js")), ...fichiers("src")];
const decoder = (l) => l.replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

test("aucun vouvoiement dans l'application, hors documents émis", () => {
  const trouves = [];
  for (const f of sources) {
    fs.readFileSync(f, "utf8").split("\n").forEach((brut, i) => {
      const l = decoder(brut);
      if (/^\s*(\/\/|\*|\/\*)/.test(l)) return; // commentaires
      if (EXCEPTIONS.some(([fe, frag]) => path.basename(f) === fe && l.includes(frag))) return;
      const formes = [...l.matchAll(FORMES)].map((m) => m[0]).filter((m) => !PAS_DES_VERBES.has(m.toLowerCase()));
      if (formes.length) trouves.push(`${f}:${i + 1} ${formes.join(", ")}`);
    });
  }
  assert.deepEqual(trouves, [], "Vouvoiement trouvé : tutoyer, ou ajouter une exception justifiée dans ce test et dans docs/CHARTE_DE_TON.md");
});

test("chaque exception correspond encore à un texte réel", () => {
  for (const [f, frag] of EXCEPTIONS) assert.ok(decoder(fs.readFileSync(f, "utf8")).includes(frag), `${f} : « ${frag} » introuvable`);
});
