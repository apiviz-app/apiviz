"""Remplit la liste des fichiers gardés hors ligne (sw.js) et la version, à l'assemblage (IT-03, AP-FEAT-017).

Usage : python3 scripts/generer-coquille.py <dossier du site assemblé> <version>
- Liste : index.html, ses scripts (classiques et modules ES, avec tous les modules importés), ses feuilles de style,
  icônes et manifeste, puis les icônes déclarées dans le manifeste et les images utilisées par le code.
- Version : écrite dans sw.js (const VERSION) et dans <meta name="apidoo-version"> d'index.html.
- Échoue si un fichier référencé manque : un oubli ne passe plus inaperçu.
"""
import json, pathlib, re, sys

site = pathlib.Path(sys.argv[1]).resolve()
version = sys.argv[2]
index = (site / "index.html").read_text(encoding="utf-8")

fichiers, manquants = [], []
def ajouter(chemin):
    chemin = chemin.split("?")[0].split("#")[0]
    if chemin.startswith(("http://", "https://", "data:")):
        if chemin not in fichiers: fichiers.append(chemin)
        return
    rel = chemin[2:] if chemin.startswith("./") else chemin.lstrip("/")
    if not (site / rel).is_file():
        manquants.append(rel); return
    if "./" + rel not in fichiers: fichiers.append("./" + rel)

def _normaliser(p):
    parts = []
    for x in p.parts:
        if x == "..": parts.pop()
        elif x not in (".", ""): parts.append(x)
    return "/".join(parts)

def modules(rel):
    """Ajoute un module ES et, récursivement, ceux qu'il importe."""
    if "./" + rel in fichiers: return
    ajouter("./" + rel)
    f = site / rel
    if not f.is_file(): return
    for de, seul in re.findall(r'^\s*(?:import|export)\b[^;]*?\bfrom\s+"([^"]+)"|^\s*import\s+"([^"]+)"', f.read_text(encoding="utf-8"), re.M):
        cible = de or seul
        if cible.startswith("."):
            modules(_normaliser(pathlib.PurePosixPath(rel).parent / cible))

fichiers.append("./")  # la page d'accueil du site
ajouter("./index.html")
for m in re.finditer(r'<script\b([^>]*)\bsrc="([^"]+)"', index):
    attrs, src = m.group(1), m.group(2)
    if 'type="module"' in attrs and not src.startswith("http"):
        modules(src[2:] if src.startswith("./") else src)
    else:
        ajouter(src)
for m in re.finditer(r'<link\b[^>]*\brel="(?:stylesheet|icon|apple-touch-icon|manifest)"[^>]*\bhref="([^"]+)"', index):
    if "fonts.googleapis.com" in m.group(1): continue  # polices : gardées au premier passage (sw.js)
    ajouter(m.group(1))
manifeste = site / "manifest.webmanifest"
if manifeste.is_file():
    for i in json.loads(manifeste.read_text(encoding="utf-8")).get("icons", []):
        ajouter("./" + i["src"].lstrip("./"))
# Images appelées par le code (logos, symbole) : tout fichier .svg ou .png du site cité dans un script ou une feuille.
code = "\n".join((site / f[2:]).read_text(encoding="utf-8") for f in fichiers if f.endswith((".js", ".css", ".html")) and f.startswith("./") and (site / f[2:]).is_file())
for img in sorted({p.name for p in site.glob("*.svg")} | {p.name for p in site.glob("*.png")}):
    if img in code: ajouter("./" + img)

if manquants:
    sys.exit("ERREUR : fichiers cités par index.html introuvables : " + ", ".join(sorted(set(manquants))))

sw = (site / "sw.js").read_text(encoding="utf-8")
if "generer-coquille" not in sw:
    print("sw.js écrit à la main (version antérieure à IT-03) : laissé tel quel"); sys.exit(0)
liste = "const COQUILLE = [\n" + "".join(f'  "{f}",\n' for f in fichiers) + "];"
sw, n1 = re.subn(r"const COQUILLE = \[.*?\];", lambda _: liste, sw, count=1, flags=re.S)
sw, n2 = re.subn(r'const VERSION = "[^"]*";', f'const VERSION = "{version}";', sw, count=1)
if not (n1 and n2): sys.exit("ERREUR : sw.js ne contient pas COQUILLE ou VERSION")
(site / "sw.js").write_text(sw, encoding="utf-8")
index, n3 = re.subn(r'<meta name="apidoo-version" content="[^"]*">', f'<meta name="apidoo-version" content="{version}">', index, count=1)
if not n3: sys.exit('ERREUR : index.html ne contient pas <meta name="apidoo-version">')
(site / "index.html").write_text(index, encoding="utf-8")
print(f"sw.js : {len(fichiers)} fichiers gardés hors ligne, version {version}")
