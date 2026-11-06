// Service worker à liste générée (AP-FEAT-017, AP-US-011) : scripts/generer-coquille.py. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SCRIPT = path.resolve("scripts/generer-coquille.py");
const lancer = (dossier, version) => execFileSync("python3", [SCRIPT, dossier, version], { encoding: "utf8", stdio: "pipe" });

function site() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "apidoo-sw-"));
  fs.mkdirSync(path.join(d, "src/noyau"), { recursive: true });
  fs.writeFileSync(path.join(d, "index.html"), `<!doctype html><meta name="apidoo-version" content="dev">
<link rel="manifest" href="manifest.webmanifest"><script defer src="./app.js"></script>
<script type="module" src="./src/main.js"></script>`);
  fs.writeFileSync(path.join(d, "manifest.webmanifest"), JSON.stringify({ icons: [{ src: "icone.png" }] }));
  fs.writeFileSync(path.join(d, "icone.png"), "");
  fs.writeFileSync(path.join(d, "logo.svg"), "");
  fs.writeFileSync(path.join(d, "app.js"), `const logo = "logo.svg";`);
  fs.writeFileSync(path.join(d, "src/main.js"), `import { a } from "./noyau/a.js";`);
  fs.writeFileSync(path.join(d, "src/noyau/a.js"), `export const a = 1;`);
  fs.copyFileSync("sw.js", path.join(d, "sw.js"));
  return d;
}
const liste = (d) => [...fs.readFileSync(path.join(d, "sw.js"), "utf8").match(/const COQUILLE = \[([^\]]*)\]/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const version = (d) => fs.readFileSync(path.join(d, "sw.js"), "utf8").match(/const VERSION = "([^"]+)"/)[1];

test("la liste suit index.html, modules importés et icônes compris", () => {
  const d = site();
  lancer(d, "apidoo-2026-11-06-aaaaaaa");
  assert.deepEqual(liste(d), ["./", "./index.html", "./app.js", "./src/main.js", "./src/noyau/a.js", "./manifest.webmanifest", "./icone.png", "./logo.svg"]);
  assert.equal(version(d), "apidoo-2026-11-06-aaaaaaa");
  assert.match(fs.readFileSync(path.join(d, "index.html"), "utf8"), /<meta name="apidoo-version" content="apidoo-2026-11-06-aaaaaaa">/);
});

test("un nouveau fichier ajouté à index.html entre dans sw.js et la version change", () => {
  const d = site();
  lancer(d, "apidoo-2026-11-06-aaaaaaa");
  fs.writeFileSync(path.join(d, "nouveau.js"), "");
  fs.writeFileSync(path.join(d, "index.html"), fs.readFileSync(path.join(d, "index.html"), "utf8").replace("</script>", '</script><script defer src="./nouveau.js"></script>'));
  lancer(d, "apidoo-2026-11-07-bbbbbbb");
  assert.ok(liste(d).includes("./nouveau.js"));
  assert.equal(version(d), "apidoo-2026-11-07-bbbbbbb");
});

test("un fichier cité mais absent fait échouer l'assemblage", () => {
  const d = site();
  fs.unlinkSync(path.join(d, "src/noyau/a.js"));
  assert.throws(() => lancer(d, "v"), /introuvables : src\/noyau\/a\.js/);
});

test("un sw.js écrit à la main (avant IT-03) est laissé tel quel", () => {
  const d = site();
  fs.writeFileSync(path.join(d, "sw.js"), `const VERSION = "apidoo-2026-11-02";\nconst COQUILLE = ["./"];\n`);
  lancer(d, "autre");
  assert.equal(version(d), "apidoo-2026-11-02");
});
