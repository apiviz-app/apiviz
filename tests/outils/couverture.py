"""Couverture JavaScript des tests de bout en bout (IT-03, AP-TECH-021).

Relance chaque test (etapes_*.txt et test_hl.py) en mesurant, par Chrome (CDP), les fonctions appelées,
puis ajoute les ouvertures d'écran de captures.py. Liste, par fichier, les fonctions nommées jamais appelées.
Usage : python3 tests/outils/couverture.py <dossier du site> <supabase.js> <sortie.json>
Prérequis : ceux de tests/lancer.sh (le dossier leaflet est cherché dans APIDOO_LEAFLET pour la carte).
"""
import json, pathlib, subprocess, sys, tempfile, shutil, os

ICI = pathlib.Path(__file__).resolve().parent
TESTS = ICI.parent
site, sbjs, sortie = sys.argv[1], sys.argv[2], pathlib.Path(sys.argv[3]).resolve()

DEBUT = '''    page = ctx.new_page()
    _cdp = ctx.new_cdp_session(page); _cdp.send("Profiler.enable")
    _cdp.send("Profiler.startPreciseCoverage", {"callCount": True, "detailed": False})
'''
FIN = '''    import json as _j, os as _o
    _res = _cdp.send("Profiler.takePreciseCoverage")["result"]
    open(_o.environ["APIDOO_COUV"], "w").write(_j.dumps([r for r in _res if r["url"].startswith("http://127.0.0.1")]))
    nav.close()'''

travail = pathlib.Path(tempfile.mkdtemp())
for f in TESTS.glob("*.*"):
    if f.is_file(): shutil.copy(f, travail / f.name)
for d in ("leaflet",):
    lf = os.environ.get("APIDOO_LEAFLET")
    if lf: (travail / d / "package").mkdir(parents=True, exist_ok=True); shutil.copytree(lf, travail / d / "package" / "dist", dirs_exist_ok=True)
subprocess.run([sys.executable, "fabrique_tests.py"], cwd=travail, check=True, capture_output=True)
for t in travail.glob("test_*.py"):
    s = t.read_text(encoding="utf-8")
    s = s.replace("    page = ctx.new_page()\n", DEBUT, 1).replace("    nav.close()", FIN, 1)
    t.write_text(s, encoding="utf-8")

# Les captures ouvrent tous les écrans : utiles pour les écrans qu'aucun test ne visite.
cap = (ICI / "captures.py").read_text(encoding="utf-8").replace("ICI = pathlib.Path(__file__).resolve().parent",
      f"ICI = pathlib.Path({str(ICI)!r})", 1)
cap = cap.replace('code = base[:debut]', 'base = base.replace("    page = ctx.new_page()\\n", DEBUT_C, 1).replace("    nav.close()", FIN_C, 1)\ndebut, fin = base.index("    # 1. En ligne"), base.index("    nav.close()")\ncode = base[:debut]', 1)
cap = f"DEBUT_C = {DEBUT!r}\nFIN_C = {FIN!r}\n" + cap
(travail / "test_zcaptures.py").write_text(cap, encoding="utf-8")

fonctions = {}  # (fichier, nom, début) -> appels cumulés
for t in sorted(travail.glob("test_*.py")):
    sortie_t = travail / (t.stem + ".couv.json")
    args = [sys.executable, str(t), site, sbjs] + ([str(travail / "caps")] if t.name == "test_zcaptures.py" else [])
    r = subprocess.run(args, cwd=travail, env={**os.environ, "APIDOO_COUV": str(sortie_t)}, capture_output=True, text=True)
    print(("OK    " if r.returncode == 0 else "ECHEC ") + t.name)
    if not sortie_t.exists(): continue
    for script in json.loads(sortie_t.read_text()):
        fichier = script["url"].split("/")[-1].split("?")[0]
        if not fichier.endswith(".js"): continue
        for fn in script["functions"]:
            debut = fn["ranges"][0]["startOffset"]
            cle = (fichier, fn["functionName"] or "(anonyme)", debut)
            fonctions[cle] = fonctions.get(cle, 0) + fn["ranges"][0]["count"]

resultat = {}
for (fichier, nom, debut), n in sorted(fonctions.items()):
    texte = (pathlib.Path(site) / fichier).read_text(encoding="utf-8") if (pathlib.Path(site) / fichier).exists() else ""
    ligne = texte[:debut].count("\n") + 1
    resultat.setdefault(fichier, []).append({"fonction": nom, "ligne": ligne, "appels": n})
jamais = {f: [x for x in l if x["appels"] == 0 and x["fonction"] != "(anonyme)"] for f, l in resultat.items()}
sortie.write_text(json.dumps({"fonctions": resultat, "jamais_appelees": jamais}, ensure_ascii=False, indent=1), encoding="utf-8")
for f, l in sorted(jamais.items()):
    tout = len(resultat[f]); print(f"{f:22} {len(l):4} fonctions nommées jamais appelées sur {tout}")
shutil.rmtree(travail, ignore_errors=True)
