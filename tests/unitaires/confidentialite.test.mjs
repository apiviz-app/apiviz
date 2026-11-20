// Mentions de confidentialité (IT-04, AP-FEAT-021) : la page publiée suit sa source docs/CONFIDENTIALITE.md,
// et chaque service tiers appelé par le code y est nommé. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const md = fs.readFileSync("docs/CONFIDENTIALITE.md", "utf8");
const page = fs.readFileSync("confidentialite.html", "utf8");

test("la page publiée reprend chaque rubrique de la source", () => {
  const titres = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1].replace(/'/g, "'"));
  assert.ok(titres.length >= 6);
  for (const t of titres) assert.ok(page.includes(`<h2>${t}</h2>`), `rubrique absente de confidentialite.html : ${t}`);
});

test("chaque service tiers appelé par l'application est cité", () => {
  // Fichiers de la racine et règles pures de src/ (v5.73 : la carte et les adresses de l'IGN y sont définies).
  const sources = [...fs.readdirSync(".").filter((f) => /\.(js|html)$/.test(f) && f !== "confidentialite.html"),
    "src/domaines/ruchers/regles.js", "src/domaines/ventes/clients-regles.js"];
  const code = sources.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const hotes = new Set([...code.matchAll(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})/g)].map((m) => m[1]));
  const cites = { "cdn.jsdelivr.net": "jsDelivr", "fonts.googleapis.com": "Google Fonts", "api.open-meteo.com": "Open-Meteo",
    "data.geopf.fr": "IGN", "www.google.com": "Google Maps",
    "agriculture-portail.6tzen.fr": "ministère de l'Agriculture" };
  for (const h of hotes) {
    if (/supabase\.co$/.test(h)) { assert.ok(md.includes("Supabase")); continue; }
    if (h === "www.w3.org") continue;
    if (/openstreetmap\.org$/.test(h)) assert.fail(`${h} : remplacé par l'IGN en v5.73 (usage commercial non permis)`);
    if (/(^|\.)apiviz\.fr$/.test(h)) continue; // nos propres adresses (liens de l'application vers le site, IT-30)
    assert.ok(cites[h], `service tiers non répertorié dans le test : ${h} (à ajouter à docs/CONFIDENTIALITE.md)`);
    assert.ok(md.includes(cites[h]) && page.includes(cites[h]), `${cites[h]} absent de la politique de confidentialité`);
  }
});

test("la page se lit sans connexion ni script, en vouvoiement", () => {
  assert.ok(!/<script/i.test(page), "aucun script");
  assert.ok(!/googleapis|jsdelivr/.test(page), "aucune ressource externe");
  assert.ok(/\bvous\b|\bvos\b/i.test(page) && !/\btu\b|\bton\b|\btes\b/i.test(page.replace(/<[^>]+>/g, " ")), "vouvoiement");
});
