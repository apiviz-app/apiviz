// Pages juridiques (v5.92) : les pages publiées suivent leur source docs/juridique/, se lisent sans script, en
// vouvoiement, et les prix des CGV sont ceux de l'application. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { produire, convertir, enLigne } from "../../scripts/pages-juridiques.mjs";
import * as P from "../../supabase/functions/paiement/stripe.js";

test("chaque page publiée est à jour avec sa source (node scripts/pages-juridiques.mjs)", () => {
  for (const { fichier, html } of produire()) assert.equal(fs.readFileSync(fichier, "utf8"), html, `${fichier} n'est pas à jour`);
});

test("pages sans script, sans ressource externe, en vouvoiement, sans note interne", () => {
  for (const { fichier, html } of produire()) {
    assert.ok(!/<script/i.test(html), `${fichier} : aucun script`);
    assert.ok(!/googleapis|jsdelivr/.test(html), `${fichier} : aucune ressource externe`);
    const texte = html.replace(/<[^>]+>/g, " ");
    assert.ok(!/(?<!\p{L})(tu|ton|tes|toi)(?!\p{L})/u.test(texte), `${fichier} : vouvoiement (pas de tutoiement)`);
    if (fichier !== "mentions-legales.html") assert.ok(/\bvous\b/.test(texte), `${fichier} : vouvoiement`);
    assert.ok(!/NON validé|À faire relire|Projet du/.test(texte), `${fichier} : une note interne est publiée`);
  }
});

test("les crochets restants sont tous des informations attendues de Pierre-Louis", () => {
  const permis = /^\[(DÉNOMINATION|FORME JURIDIQUE|CAPITAL|ADRESSE DU SIÈGE|SIREN \/ RCS|TÉLÉPHONE|MENTION TVA|DIRECTEUR DE LA PUBLICATION|DATE DE PUBLICATION|DATE DE (DÉBUT|FIN) DE LA BÊTA|MÉDIATEUR[^\]]*|TÉLÉPHONE DE (CLOUDFLARE|SUPABASE) À VÉRIFIER|au capital de \[CAPITAL\] €, pour une société)\]$/;
  for (const f of ["cgv", "cgu", "mentions-legales"]) {
    const md = fs.readFileSync(`docs/juridique/${f}.md`, "utf8").replace(/<!--[\s\S]*?-->/g, "");
    for (const c of md.match(/\[(?:[^\[\]]|\[[^\]]*\])*\]/g) || []) assert.match(c, permis, `${f}.md : crochet inattendu ${c}`);
  }
});

test("les prix des CGV sont ceux de l'application", () => {
  const cgv = fs.readFileSync("docs/juridique/cgv.md", "utf8");
  const eur = (cts) => `${(cts / 100).toFixed(2).replace(".", ",")} €`;
  for (const r of P.RECHARGES) assert.ok(cgv.includes(`| ${r.nom} | ${eur(r.prix_cts)} | ${r.gouttes.toLocaleString("fr-FR").replace(/ | /g, " ")} |`), `recharge ${r.nom}`);
  const seed = fs.readFileSync("migrations/029-offres-gouttes.sql", "utf8");
  for (const [, nom, mois, an, g] of seed.matchAll(/\('(?:rucher|exploitation)', '(\w+)', \d, (\d+), (\d+), (\d+)/g))
    assert.ok(cgv.includes(`| ${nom} | ${eur(+mois)} | ${eur(+an)} | `) && cgv.includes(`${g} gouttes d'API par mois`), `offre ${nom}`);
});

test("conversion : titre, version, tableau, liste, liens", () => {
  const r = convertir("<!-- note -->\n# Titre\n\n*Version du 1er janvier*\n\n## A\n\n| x | y |\n|---|---|\n| 1 | **2** |\n\n- un\n  suite\n- deux\n\nÉcrire à contact@apiviz.fr ou https://app.apiviz.fr/cgv.html.");
  assert.equal(r.titre, "Titre");
  assert.equal(r.version, "Version du 1er janvier");
  assert.ok(r.corps.includes("<td><b>2</b></td>") && r.corps.includes("<li>un suite</li>") && !r.corps.includes("note"));
  assert.ok(enLigne("à contact@apiviz.fr").includes('href="mailto:contact@apiviz.fr"'));
  assert.ok(r.corps.includes('href="https://app.apiviz.fr/cgv.html"'));
});
