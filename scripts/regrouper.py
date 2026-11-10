"""Regroupe les feuilles de style et les modules ES du site assemblé (IT-03, temps d'ouverture non dégradé).

Usage : python3 scripts/regrouper.py <dossier du site assemblé>

Les sources restent découpées (styles/ par rubrique et composant, src/ en modules ES) ; seul le site publié est regroupé :
- les <link rel="stylesheet" href="styles/…"> d'index.html deviennent un seul styles/apidoo.css, dans le même ordre ;
- les <script type="module" src="./src/…"> deviennent src/apidoo.js (tous les modules, une seule fois chacun, puis le
  premier point d'entrée) et un petit fichier par point d'entrée suivant, qui l'exécute à sa place dans la page.
Les fichiers d'origine sont retirés du site publié. Aucune dépendance : seules les formes d'import et d'export utilisées
par src/ sont prises en charge ; toute autre forme arrête l'assemblage (rien n'est publié à moitié).
"""
import json, pathlib, re, sys

site = pathlib.Path(sys.argv[1]).resolve()
index_f = site / "index.html"
index = index_f.read_text(encoding="utf-8")


def normaliser(base, cible):
    parts = list(pathlib.PurePosixPath(base).parent.parts)
    for x in pathlib.PurePosixPath(cible).parts:
        if x == "..": parts.pop()
        elif x != ".": parts.append(x)
    return "/".join(parts)


# ---------- Feuilles de style ----------
liens = re.findall(r'[ \t]*<link rel="stylesheet" href="(styles/[^"]+)">\n', index)
if liens:
    morceaux = []
    for rel in liens:
        texte = (site / rel).read_text(encoding="utf-8")
        # Les url() relatives sont recalculées depuis styles/ (dossier du fichier regroupé).
        prof = len(pathlib.PurePosixPath(rel).parts) - 2  # 0 pour styles/x.css, 1 pour styles/composants/x.css
        if prof:
            texte = re.sub(r'url\((["\']?)((?:\.\./)+)', lambda m: "url(" + m.group(1) + "../" * max(0, m.group(2).count("../") - prof), texte)
        morceaux.append(f"/* {rel} */\n{texte.rstrip()}\n")
    (site / "styles/apidoo.css").write_text("".join(morceaux), encoding="utf-8")
    premier = True
    def remplacer(m):
        global premier
        if premier:
            premier = False
            return '<link rel="stylesheet" href="styles/apidoo.css">\n'
        return ""
    index = re.sub(r'[ \t]*<link rel="stylesheet" href="styles/[^"]+">\n', remplacer, index)
    for rel in liens:
        (site / rel).unlink()

# ---------- Modules ES ----------
IMPORT = re.compile(r'^import\s+(?:(.+?)\s+from\s+)?"([^"]+)";?[ \t]*$', re.M | re.S)
modules = {}  # chemin -> code transformé
ordre = []


def transformer(rel):
    if rel in modules: return
    modules[rel] = None  # en cours (détecte les imports circulaires)
    code = (site / rel).read_text(encoding="utf-8")
    if re.search(r"\bimport\s*\(|\bimport\.meta\b|^\s*export\s+(let|var|\*|default\s+(async\s+)?function\s*\*)|^\s*export\s+\{[^}]*\}\s*from", code, re.M):
        sys.exit(f"ERREUR regrouper : forme d'import ou d'export non prise en charge dans {rel}")
    entetes = []
    def imp(m):
        quoi, de = m.group(1), m.group(2)
        if not de.startswith("."): sys.exit(f"ERREUR regrouper : import externe dans {rel} ({de})")
        cible = normaliser(rel, de)
        if modules.get(cible, 0) is None: sys.exit(f"ERREUR regrouper : import circulaire {rel} -> {cible}")
        transformer(cible)
        req = f"__r({json.dumps(cible)})"
        if not quoi: return f"{req};"
        quoi = " ".join(quoi.split())
        if quoi.startswith("* as "): return f"const {quoi[5:].strip()} = {req};"
        if quoi.startswith("{"):
            noms = [x.strip() for x in quoi.strip("{} ").split(",") if x.strip()]
            return "const { " + ", ".join(n.replace(" as ", ": ") for n in noms) + f" }} = {req};"
        if "," in quoi: sys.exit(f"ERREUR regrouper : import mixte non pris en charge dans {rel}")
        return f"const {quoi} = {req}.default;"
    code = IMPORT.sub(imp, code)
    if re.search(r"^\s*import\b", code, re.M): sys.exit(f"ERREUR regrouper : import non reconnu dans {rel}")
    noms = []
    code = re.sub(r"^(\s*)export\s+((?:async\s+)?function\s*\*?\s*|const\s+|class\s+)(\w+)", lambda m: (noms.append(m.group(3)), m.group(1) + m.group(2) + m.group(3))[1], code, flags=re.M)
    code = re.sub(r"^export\s+default\s+", "__e.default = ", code, flags=re.M)
    for m in re.finditer(r"^export\s*\{([^}]*)\};?[ \t]*$", code, re.M):
        for x in m.group(1).split(","):
            if x.strip():
                a, _, b = x.strip().partition(" as ")
                noms.append((a.strip(), (b or a).strip()))
    code = re.sub(r"^export\s*\{[^}]*\};?[ \t]*$", "", code, flags=re.M)
    if re.search(r"^\s*export\b", code, re.M): sys.exit(f"ERREUR regrouper : export non reconnu dans {rel}")
    getters = "".join(
        f"Object.defineProperty(__e, {json.dumps(b)}, {{ enumerable: true, get: () => {a} }});\n"
        for a, b in ((x, x) if isinstance(x, str) else x for x in noms))
    modules[rel] = f"__d({json.dumps(rel)}, (__e) => {{\n{getters}{code}\n}});\n"
    ordre.append(rel)


entrees = re.findall(r'<script type="module" src="\./(src/[^"]+)"></script>', index)
if entrees:
    for e in entrees: transformer(e)
    tete = """// Apiviz — modules de src/ regroupés à l'assemblage (scripts/regrouper.py). Ne pas modifier : modifier src/.
const __m = {}, __f = {};
const __d = (nom, f) => { __f[nom] = f; };
const __r = (nom) => {
  if (!__m[nom]) { const e = (__m[nom] = {}); __f[nom](e); Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }); }
  return __m[nom];
};
globalThis.__apidooModule = __r;
"""
    corps = "".join(modules[r] for r in ordre)
    (site / "src/apidoo.js").write_text(tete + corps + f"__r({json.dumps(entrees[0])});\n", encoding="utf-8")
    index = index.replace(f'src="./{entrees[0]}"', 'src="./src/apidoo.js"', 1)
    for e in entrees[1:]:
        petit = e[:-3] + ".entree.js"
        (site / petit).write_text(f"// Point d'entrée regroupé (scripts/regrouper.py) : exécute {e} à sa place dans la page.\nglobalThis.__apidooModule({json.dumps(e)});\n", encoding="utf-8")
        index = index.replace(f'src="./{e}"', f'src="./{petit}"', 1)
    for p in sorted((site / "src").rglob("*.js")):
        r = str(p.relative_to(site))
        if r in modules: p.unlink()
    (site / "src/package.json").unlink(missing_ok=True)
    for d in sorted((site / "src").rglob("*"), reverse=True):
        if d.is_dir() and not any(d.iterdir()): d.rmdir()

index_f.write_text(index, encoding="utf-8")
print(f"Regroupé : {len(liens)} feuilles de style -> styles/apidoo.css ; {len(ordre)} modules -> src/apidoo.js")
