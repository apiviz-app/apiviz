// Compare deux versions d'un fichier JavaScript : même arbre syntaxique, hors mise en forme,
// commentaires et guillemets. Sert à vérifier qu'un reformatage ou un renommage ne change rien.
// Prérequis (hors dépôt) : npm i @babel/parser@7 @babel/traverse@7
// Usage : node scripts/comparer-ast.js avant.js apres.js [--renommage]
// Avec --renommage : les noms des variables LOCALES peuvent différer, à condition que le renommage
// soit cohérent ; les noms de premier niveau et les propriétés doivent rester identiques.
const fs = require("fs");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const [, , fa, fb, mode] = process.argv;
const renommage = mode === "--renommage";
const IGNORE = new Set(["start", "end", "loc", "range", "extra", "comments", "leadingComments", "trailingComments", "innerComments", "tokens", "errors"]);

function lire(f) {
  const ast = parse(fs.readFileSync(f, "utf8"), { sourceType: "script", errorRecovery: false });
  // Chaque identifiant reçoit la position de sa déclaration (binding) pour comparer les renommages.
  const ids = [];
  traverse(ast, {
    Identifier(p) {
      const b = p.scope.getBinding(p.node.name);
      const global = !b || b.scope.block.type === "Program";
      const isRef = p.isReferencedIdentifier() || p.isBindingIdentifier() || (p.parentPath.isAssignmentExpression() && p.key === "left") || p.parentPath.isUpdateExpression();
      p.node.__lien = global || !isRef ? null : b.identifier;
    },
  });
  return ast;
}

function deplier(n, sortie) {
  if (Array.isArray(n)) { sortie.push("["); n.forEach((x) => deplier(x, sortie)); sortie.push("]"); return; }
  if (n && typeof n === "object") {
    sortie.push("{" + n.type);
    for (const k of Object.keys(n).sort()) {
      if (IGNORE.has(k) || k === "type" || k.startsWith("__")) continue;
      if (k === "name" && n.type === "Identifier" && renommage && n.__lien) { sortie.push("name=<local:" + idLocal(n.__lien) + ">"); continue; }
      if (k === "value" && n.type === "TemplateElement") { sortie.push("tpl=" + JSON.stringify(n.value.cooked)); continue; }
      sortie.push(k + "=");
      deplier(n[k], sortie);
    }
    sortie.push("}");
    return;
  }
  sortie.push(JSON.stringify(n));
}
// Numéro d'ordre de chaque déclaration locale, dans l'ordre de parcours.
let carte = new Map(), compteur = 0;
function idLocal(decl) { if (!carte.has(decl)) carte.set(decl, ++compteur); return carte.get(decl); }

function signature(f) {
  carte = new Map(); compteur = 0;
  const s = []; deplier(lire(f).program, s); return s;
}
const a = signature(fa), b = signature(fb);
if (a.length !== b.length || a.some((x, i) => x !== b[i])) {
  const i = a.findIndex((x, j) => x !== b[j]);
  console.log("DIFFÉRENT à l'élément " + i + " :\n  avant : " + a.slice(Math.max(0, i - 8), i + 4).join(" ") + "\n  après : " + b.slice(Math.max(0, i - 8), i + 4).join(" "));
  process.exit(1);
}
console.log("IDENTIQUE (" + a.length + " éléments" + (renommage ? ", renommages locaux cohérents" : "") + ")");
