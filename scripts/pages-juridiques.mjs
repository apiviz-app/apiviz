// Apiviz — pages juridiques publiées (v5.92) : mentions-legales.html, cgu.html et cgv.html, à la racine du site, sont
// produites depuis leur source docs/juridique/*.md. Modifier la source, puis : node scripts/pages-juridiques.mjs
// tests/unitaires/juridique.test.mjs vérifie que les pages sont à jour. Page sans script ni ressource externe, même
// apparence que confidentialite.html. Les commentaires <!-- … --> de la source (notes internes) ne sont pas publiés.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PAGES = [
  { source: "docs/juridique/mentions-legales.md", page: "mentions-legales.html", court: "Mentions légales" },
  { source: "docs/juridique/cgu.md", page: "cgu.html", court: "Conditions d'utilisation" },
  { source: "docs/juridique/cgv.md", page: "cgv.html", court: "Conditions de vente" },
  { page: "confidentialite.html", court: "Confidentialité" },
];

const echap = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Texte d'une ligne : gras, italique, code, adresses web et e-mail cliquables. */
export function enLigne(t) {
  let s = echap(t);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  s = s.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>");
  s = s.replace(/https:\/\/[^\s<)]+[^\s<).,;:]/g, (u) => `<a href="${u}" rel="noopener">${u}</a>`);
  s = s.replace(/\b([a-z0-9.-]+@apiviz\.fr)\b/g, '<a href="mailto:$1">$1</a>');
  return s;
}

/** Markdown restreint des documents juridiques → { titre, version, corps } en HTML. */
export function convertir(md) {
  const lignes = md.replace(/<!--[\s\S]*?-->/g, "").replace(/\r/g, "").split("\n");
  let titre = "", version = "";
  const out = [];
  let i = 0;
  const bloc = (test) => { const b = []; while (i < lignes.length && test(lignes[i])) b.push(lignes[i++]); return b; };
  while (i < lignes.length) {
    const l = lignes[i];
    if (!l.trim()) { i++; continue; }
    if (/^# /.test(l)) { titre = l.slice(2).trim(); i++; continue; }
    if (!version && /^\*Version du .+\*$/.test(l.trim())) { version = l.trim().slice(1, -1); i++; continue; }
    if (/^## /.test(l)) { out.push(`<h2>${enLigne(l.slice(3).trim())}</h2>`); i++; continue; }
    if (/^\|/.test(l)) {
      const rangs = bloc((x) => /^\|/.test(x)).filter((x) => !/^\|[\s|:-]+\|$/.test(x))
        .map((x) => x.trim().replace(/^\||\|$/g, "").split("|").map((c) => enLigne(c.trim())));
      const [tete, ...reste] = rangs;
      out.push(`<div class="t"><table><thead><tr>${tete.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${reste.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^> /.test(l)) { out.push(`<blockquote><p>${enLigne(bloc((x) => /^>/.test(x)).map((x) => x.replace(/^> ?/, "")).join(" "))}</p></blockquote>`); continue; }
    const liste = /^(\d+\.|-) /.exec(l);
    if (liste) {
      const ordonnee = liste[1] !== "-", items = [];
      while (i < lignes.length && (/^(\d+\.|-) /.test(lignes[i]) || /^ {2,}\S/.test(lignes[i]))) {
        if (/^(\d+\.|-) /.test(lignes[i])) items.push(lignes[i].replace(/^(\d+\.|-) /, ""));
        else items[items.length - 1] += " " + lignes[i].trim();
        i++;
      }
      const tag = ordonnee ? "ol" : "ul";
      out.push(`<${tag}>${items.map((x) => `<li>${enLigne(x)}</li>`).join("")}</${tag}>`);
      continue;
    }
    // Paragraphe : lignes jointes par une espace ; deux espaces en fin de ligne forcent un retour (adresse de l'éditeur).
    const para = bloc((x) => x.trim() && !/^(#|\||> |(\d+\.|-) )/.test(x));
    const html = para.map((x, k) => enLigne(x.trim()) + (k < para.length - 1 ? (/ {2}$/.test(x) ? "<br>" : " ") : "")).join("");
    out.push(`<p>${html}</p>`);
  }
  return { titre, version, corps: out.join("\n") };
}

export function page({ titre, version, corps }, courante) {
  const nav = PAGES.map((p) => (p.page === courante ? `<b>${p.court}</b>` : `<a href="${p.page}">${p.court}</a>`)).join(" · ");
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#1E2B24">
<title>Apiviz — ${echap(titre.toLowerCase())}</title>
<link rel="icon" href="icone-apiviz.svg" type="image/svg+xml">
<!-- Page produite par scripts/pages-juridiques.mjs depuis docs/juridique/ : ne pas modifier ici. -->
<style>
:root{--ink:#1B2420;--muted:#56605A;--ground:#F4F4EE;--line:#E8E9E1;--pine:#1E2B24;--honey:#E3A008}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{background:var(--pine);color:#fff;padding:20px 20px 24px}
header img{display:block;height:28px;margin-bottom:14px}
header h1{margin:0;font-size:26px;line-height:1.15}
header p{margin:6px 0 0;color:#C9D2CB;font-size:14px}
main{max-width:760px;margin:0 auto;padding:8px 20px 48px}
h2{font-size:19px;margin:28px 0 8px}
p,li{margin:6px 0}
ul,ol{padding-left:22px}
blockquote{margin:12px 0;padding:10px 14px;background:#fff;border-left:4px solid var(--honey);border-radius:8px}
.t{overflow-x:auto;background:#fff;border-radius:12px;box-shadow:0 1px 2px rgba(30,43,36,.06)}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:left;vertical-align:top;padding:9px 12px;border-bottom:1px solid var(--line)}
th{color:var(--muted);font-size:13px}
tr:last-child td{border-bottom:0}
a{color:#245640;overflow-wrap:anywhere}
nav{margin-top:32px;padding-top:16px;border-top:1px solid var(--line);font-size:14px;color:var(--muted)}
.retour{display:inline-block;margin-top:16px;font-weight:600}
</style>
</head>
<body>
<header><img src="logo-apiviz-clair.svg" alt="Apiviz"><h1>${echap(titre)}</h1>${version ? `<p>${enLigne(version)}</p>` : ""}</header>
<main>
${corps}
<nav aria-label="Documents juridiques">${nav}</nav>
<a class="retour" href="./">Revenir à Apiviz</a>
</main>
</body>
</html>
`;
}

export const produire = (racine = ".") => PAGES.filter((p) => p.source)
  .map((p) => ({ fichier: p.page, html: page(convertir(fs.readFileSync(path.join(racine, p.source), "utf8")), p.page) }));

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  for (const { fichier, html } of produire()) { fs.writeFileSync(fichier, html); console.log(`écrit : ${fichier}`); }
}
