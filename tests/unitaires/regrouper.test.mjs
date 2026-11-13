// Regroupement des styles et des modules à l'assemblage (scripts/regrouper.py, IT-03 : ouverture non dégradée).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";

const SCRIPT = path.resolve("scripts/regrouper.py");
function site(fichiers) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "apidoo-rg-"));
  for (const [f, t] of Object.entries(fichiers)) {
    fs.mkdirSync(path.join(d, path.dirname(f)), { recursive: true });
    fs.writeFileSync(path.join(d, f), t);
  }
  return d;
}
const lancer = (d) => execFileSync("python3", [SCRIPT, d], { encoding: "utf8", stdio: "pipe" });

const INDEX = `<!doctype html><head>
<link rel="stylesheet" href="styles/a.css">
<link rel="stylesheet" href="styles/composants/b.css">
</head><body>
<script type="module" src="./src/premier.js"></script>
<script defer src="./app.js"></script>
<script type="module" src="./src/second.js"></script>
</body>`;

test("styles regroupés dans l'ordre, url() recalculées", () => {
  const d = site({ "index.html": INDEX, "app.js": "", "src/premier.js": "", "src/second.js": "",
    "styles/a.css": ".a{background:url(../logo.svg)}", "styles/composants/b.css": ".b{background:url(\"../../logo.svg\")}" });
  lancer(d);
  const css = fs.readFileSync(path.join(d, "styles/apidoo.css"), "utf8");
  assert.ok(css.indexOf(".a{") < css.indexOf(".b{"), "ordre gardé");
  assert.match(css, /\.b\{background:url\("\.\.\/logo\.svg"\)\}/);
  const html = fs.readFileSync(path.join(d, "index.html"), "utf8");
  assert.equal((html.match(/rel="stylesheet"/g) || []).length, 1);
  assert.ok(!fs.existsSync(path.join(d, "styles/a.css")));
});

test("modules : un seul exemplaire partagé, points d'entrée à leur place, exports vivants", () => {
  const d = site({ "index.html": INDEX, "app.js": "",
    "src/commun.js": "const etat = { n: 0 };\nexport function compter() { return ++etat.n; }\nexport const nom = \"commun\";\nexport default [1, 2];\n",
    "src/premier.js": "import * as c from \"./commun.js\";\nimport liste from \"./commun.js\";\nglobalThis.journal.push([\"premier\", c.compter(), liste.length]);\n",
    "src/second.js": "import {\n  compter,\n  nom as n2,\n} from \"./commun.js\";\nglobalThis.journal.push([\"second\", compter(), n2]);\n",
    "styles/a.css": "", "styles/composants/b.css": "" });
  lancer(d);
  const html = fs.readFileSync(path.join(d, "index.html"), "utf8");
  assert.ok(html.indexOf("src/apidoo.js") < html.indexOf("app.js") && html.indexOf("app.js") < html.indexOf("src/second.entree.js"));
  const ctx = vm.createContext({ journal: [] });
  ctx.globalThis = ctx;
  vm.runInContext(fs.readFileSync(path.join(d, "src/apidoo.js"), "utf8"), ctx);
  vm.runInContext(fs.readFileSync(path.join(d, "src/second.entree.js"), "utf8"), ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.journal)), [["premier", 1, 2], ["second", 2, "commun"]]);
  assert.ok(!fs.existsSync(path.join(d, "src/commun.js")));
});

test("feuille ou module cité deux fois (reste de fusion) : gardé une fois, l'assemblage continue", () => {
  const index = INDEX.replace("</head>", '<link rel="stylesheet" href="styles/a.css">\n</head>')
    .replace("</body>", '<script type="module" src="./src/premier.js"></script>\n</body>');
  const d = site({ "index.html": index, "app.js": "", "src/premier.js": "globalThis.journal.push(1);\n", "src/second.js": "",
    "styles/a.css": ".a{}", "styles/composants/b.css": ".b{}" });
  const sortie = lancer(d);
  assert.match(sortie, /plusieurs fois/);
  const css = fs.readFileSync(path.join(d, "styles/apidoo.css"), "utf8");
  assert.equal((css.match(/\.a\{\}/g) || []).length, 1);
  assert.ok(css.indexOf(".b{") < css.indexOf(".a{"), "gardée à sa dernière place");
  const html = fs.readFileSync(path.join(d, "index.html"), "utf8");
  assert.equal((html.match(/src\/apidoo\.js/g) || []).length, 1);
  assert.ok(!html.includes("src/premier.js"));
});

test("forme non prise en charge : l'assemblage s'arrête", () => {
  const d = site({ "index.html": INDEX, "app.js": "", "src/premier.js": "const x = await import(\"./a.js\");\n", "src/second.js": "",
    "styles/a.css": "", "styles/composants/b.css": "" });
  assert.throws(() => lancer(d), /non prise en charge/);
});

test("le vrai src/ se regroupe sans erreur", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "apidoo-rg-"));
  fs.cpSync("src", path.join(d, "src"), { recursive: true });
  fs.cpSync("styles", path.join(d, "styles"), { recursive: true });
  fs.copyFileSync("index.html", path.join(d, "index.html"));
  const sortie = lancer(d);
  assert.match(sortie, /modules -> src\/apidoo\.js/);
  vm.runInNewContext(fs.readFileSync(path.join(d, "src/apidoo.js"), "utf8").replace(/__r\("src\/passerelle\.js"\);\n$/, ""), {});
});
