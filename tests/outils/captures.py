"""Captures de référence de chaque écran (IT-03, AP-FEAT-002 et AP-FEAT-015).

Ouvre chaque écran avec la base simulée des tests (données de etapes_v4), à 375 px et à 1 280 px, et enregistre :
- une capture PNG (relecture visuelle) ;
- le HTML de #app, normalisé (comparaison exacte avant / après migration).

Usage : python3 tests/outils/captures.py <dossier du site> <supabase.js> <dossier de sortie> [ancien]
Avec « ancien », l'application est ouverte avec ?ancien=1 (chemin d'origine, sans le noyau).
Comparer deux séries : python3 tests/outils/comparer_captures.py <avant> <après>.
"""
import pathlib, re, sys

ICI = pathlib.Path(__file__).resolve().parent
TESTS = ICI.parent
SORTIE = pathlib.Path(sys.argv[3]).resolve()
ANCIEN = len(sys.argv) > 4 and sys.argv[4] == "ancien"

base = (TESTS / "test_hl.py").read_text(encoding="utf-8")
# Identifiants reproductibles : deux séries de captures doivent pouvoir être comparées ligne à ligne.
base = base.replace("import json, re, sys, time, uuid, threading, http.server, functools",
                    "import json, re, sys, time, uuid, threading, http.server, functools, random\n"
                    "_alea = random.Random(2026)\nuuid.uuid4 = lambda: uuid.UUID(int=_alea.getrandbits(128), version=4)", 1)
base = base.replace("PORT = 8765", "PORT = 8790", 1)
v4 = (TESTS / "etapes_v4.txt").read_text(encoding="utf-8")
preparation = v4[:v4.index("    page.goto(url)")].replace('os.makedirs("v4", exist_ok=True)', "pass")

ECRANS = [
    # (nom, code qui ouvre l'écran)
    ("dash", "go('dash')"), ("plus", "go('plus')"), ("agenda", "go('agenda')"),
    ("ruches", "go('ruches')"), ("carte", "go('carte')"), ("varroa", "go('varroa')"),
    ("rucher", "ACT.alrucher('Verger')"), ("ruche", "ACT.ruche(S.d.ruches[0].id)"),
    ("visite", "ACT.newvisite(S.d.ruches[0].id)"), ("miel", "go('miel')"), ("materiel", "go('materiel')"),
    ("clients", "go('clients')"), ("vente", "ACT.newvente()"), ("fournisseurs", "go('fournisseurs')"),
    ("compta", "go('compta')"), ("pilotage", "go('pilotage')"), ("previsions", "go('previsions')"),
    ("reglages", "go('reglages')"), ("registre", "go('registre')"), ("membres", "go('membres')"),
    ("recolte", "go('recolte')"), ("declaration", "go('declaration')"), ("activite", "go('activite')"),
    ("recherche", "go('recherche')"), ("meteo", "ACT.ermeteo('Verger')"), ("rappels", "go('rappels')"),
    ("lot", "ACT.erlot(S.d.lots[0].id)"), ("saison", "go('saison')"), ("tournee", "ACT.v3tournee()"),
    ("feuille", "go('dash'); ACT.newdepense()"),
]

etapes = f'''
    import pathlib as _p, datetime as _d
    _sortie = _p.Path({str(SORTIE)!r}); _sortie.mkdir(parents=True, exist_ok=True)
    import os as _os
    _lf = _os.environ.get("APIDOO_LEAFLET")  # dossier dist/ de leaflet@1.9.4 (npm pack), pour l'écran Carte
    if _lf: ctx.route("https://cdn.jsdelivr.net/npm/leaflet@1.9.4/**", lambda rt: rt.fulfill(status=200, path=_lf + ("/leaflet.css" if rt.request.url.endswith(".css") else "/leaflet.js"),
              headers={{"Access-Control-Allow-Origin": "*"}}))
    page.clock.set_fixed_time(_d.datetime.combine(_d.date.today(), _d.time(10, 0)))
    page.goto(url + {"'?ancien=1'" if ANCIEN else "''"}); page.wait_for_selector("text=/Bonjour|Bonsoir/", timeout=15000)
    page.wait_for_timeout(800)
    NORMALISER = r"""() => {{
      const c = document.querySelector('#app').cloneNode(true);
      c.querySelectorAll('.enter').forEach((x) => x.classList.remove('enter'));
      c.querySelectorAll('svg.chart, canvas, .leaflet-container').forEach((x) => x.replaceWith(document.createComment(x.className.baseVal ?? x.className)));
      return c.innerHTML.replace(/blob:[^"']+/g, 'blob:').replace(/\\s+/g, ' ').replace(/> </g, '>\\n<');
    }}"""
    _n = len(erreurs)
    # Styles calculés (AP-FEAT-015) : quelques propriétés de chaque élément de #app et de la feuille ouverte.
    STYLES = r"""() => {{
      const P = ["display","position","margin","padding","width","height","color","background-color","background-image","border","border-radius",
        "box-shadow","font-family","font-size","font-weight","line-height","gap","grid-template-columns","flex-direction","justify-content",
        "align-items","opacity","transform","z-index","overflow","text-align","max-width","min-height","top","bottom","left","right"];
      const fige = document.createElement("style"); // animations arrêtées : valeurs stables d'une série à l'autre
      fige.textContent = "*,*::before,*::after{{animation:none!important;transition:none!important}}"; document.head.append(fige);
      const els = [...document.querySelectorAll("#app *, dialog[open], dialog[open] *")];
      const r = els.map((e) => {{ const c = getComputedStyle(e); return e.tagName + "." + (e.getAttribute("class") || "") + " " + P.map((p) => c.getPropertyValue(p)).join("|"); }});
      fige.remove(); return r;
    }}"""
    for largeur, hauteur in ((375, 812), (1280, 900)):
        page.set_viewport_size({{"width": largeur, "height": hauteur}})
        for nom, code in {ECRANS!r}:
            try:
                page.evaluate("document.querySelectorAll('dialog[open]').forEach((d) => d.close())")
                page.evaluate("async () => {{ " + code + " }}")
                page.wait_for_timeout(450)
                if nom != "feuille": page.evaluate("document.querySelectorAll('dialog[open]').forEach((d) => d.close())")
                else: page.wait_for_timeout(400)  # fin de l'animation d'ouverture
                (_sortie / f"{{nom}}-{{largeur}}.html").write_text(page.evaluate(NORMALISER), encoding="utf-8")
                (_sortie / f"{{nom}}-{{largeur}}.styles.txt").write_text("\\n".join(page.evaluate(STYLES)), encoding="utf-8")
                page.screenshot(path=str(_sortie / f"{{nom}}-{{largeur}}.png"), full_page=True)
                print("OK   ", nom, largeur, ("ERREUR JS : " + erreurs[-1]) if len(erreurs) > _n else "")
                _n = len(erreurs)
            except Exception as e:
                print("ECHEC", nom, largeur, str(e).splitlines()[0]); ok = False
    if erreurs: print("Erreurs JavaScript :", " | ".join(erreurs)); ok = False
'''
debut, fin = base.index("    # 1. En ligne"), base.index("    nav.close()")
code = base[:debut] + preparation + etapes + base[fin:]
sys.argv = [sys.argv[0], sys.argv[1], sys.argv[2]]
exec(compile(code, str(TESTS / "captures_genere.py"), "exec"), {"__name__": "__main__", "__file__": str(TESTS / "x.py")})
