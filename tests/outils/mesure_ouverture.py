"""Temps d'ouverture de l'application et nombre de requêtes (IT-03, AP-FEAT-014).

Usage : python3 tests/outils/mesure_ouverture.py <dossier du site> <supabase.js> [gros] [ancien]
- sans « gros » : données des tests (etapes_v4) ;
- avec « gros » : 300 colonies et 5 000 visites (critère d'AP-US-009), réseau 4G simulé (Chrome).
Affiche le temps médian sur 5 ouvertures (jusqu'à l'affichage de l'accueil) et les requêtes de données.
"""
import pathlib, sys

ICI = pathlib.Path(__file__).resolve().parent
TESTS = ICI.parent
GROS = "gros" in sys.argv[3:]
ANCIEN = "ancien" in sys.argv[3:]

base = (TESTS / "test_hl.py").read_text(encoding="utf-8").replace("PORT = 8765", "PORT = 8791", 1)
v4 = (TESTS / "etapes_v4.txt").read_text(encoding="utf-8")
preparation = v4[:v4.index("    page.goto(url)")].replace('os.makedirs("v4", exist_ok=True)', "pass")

gros = '''
    import random as _r
    _a = _r.Random(1)
    DATA["ruches"] = [{"id": str(uuid.uuid4()), "nom": f"Ruche {i + 1}", "rucher": f"Rucher {i // 25 + 1}", "etat": "Bonne",
                       "type_ruche": "Dadant 10 cadres", "annee_reine": 2025, "notes": "", "hausses": 0, "equipement": [], "sortie": "", "reine_origine": ""}
                      for i in range(300)]
    DATA["visites"] = []
    for k in range(5000):
        r = DATA["ruches"][k % 300]
        DATA["visites"].append({"id": str(uuid.uuid4()), "ruche_id": r["id"], "date_visite": J(k // 300 * 7 + _a.randint(0, 6)),
          "activite": "Normale", "provisions": "Moyennes", "reine": "Vue", "couvain": "Normal", "poids_kg": 40, "varroa": 2, "note": "",
          "traitement": "", "lot_produit": "", "traitement_dose": "", "retrait_prevu": None, "ordonnance": False})
    DATA["visites"].sort(key=lambda v: v["date_visite"], reverse=True)
''' if GROS else ""

etapes = f'''
{gros}
    cdp = ctx.new_cdp_session(page) if {GROS} else None
    if cdp:
        cdp.send("Network.enable")
        # « 4G » de Chrome DevTools : 9 Mbit/s descendant, 1,5 Mbit/s montant, 170 ms de latence.
        cdp.send("Network.emulateNetworkConditions", {{"offline": False, "latency": 170, "downloadThroughput": 9e6 / 8, "uploadThroughput": 1.5e6 / 8}})
    temps, nb = [], []
    for essai in range(5):
        avant = len(lectures)
        page.goto("about:blank")
        t0 = time.time()
        page.goto(url + {"'?ancien=1'" if ANCIEN else "''"}); page.wait_for_selector("text=/Bonjour|Bonsoir/", timeout=60000)
        page.wait_for_selector(".hero-head, .al-phrase, .u-dash, main .wrap", timeout=60000)
        temps.append(time.time() - t0); nb.append(len(lectures) - avant)
    temps.sort()
    print(f"Ouverture : médiane {{temps[2]:.2f}} s (min {{temps[0]:.2f}}, max {{temps[-1]:.2f}}) ; lectures de données : {{sorted(nb)[2]}}")
'''
debut, fin = base.index("    # 1. En ligne"), base.index("    nav.close()")
code = base[:debut] + preparation + etapes + base[fin:]
sys.argv = sys.argv[:3]
exec(compile(code, str(TESTS / "mesure_genere.py"), "exec"), {"__name__": "__main__", "__file__": str(TESTS / "x.py")})
