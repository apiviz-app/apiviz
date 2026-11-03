"""Fabrique les tests test_<nom>.py à partir de la base simulée de test_hl.py et des étapes etapes_<nom>.txt."""
import pathlib
ici = pathlib.Path(__file__).parent
base = (ici / "test_hl.py").read_text(encoding="utf-8")

# Mises à jour de fiches (PATCH) et champs de traitement : utiles à plusieurs tests.
avant = '        if req.method == "POST":\n            rows = req.post_data_json'
assert base.count(avant) == 1
base = base.replace(avant, '''        if req.method == "PATCH":
            corps = req.post_data_json; patchs.append((t, corps))
            for x in DATA.get(t, []): x.update(corps)
            return route.fulfill(status=204, headers=hdr, body="")
''' + avant)
base = base.replace('recu = {"rpc": [], "upsert": []}', 'recu = {"rpc": [], "upsert": []}\npatchs = []', 1)
v = '"varroa": None, "note": p.get("note", "")})'
assert base.count(v) == 1
base = base.replace(v, '"varroa": None, "note": p.get("note", ""), "traitement": p.get("traitement",""), "lot_produit": p.get("lot_produit",""), "traitement_dose": p.get("traitement_dose",""), "retrait_prevu": p.get("retrait_prevu") or None, "ordonnance": bool(p.get("ordonnance"))})')

debut, fin = base.index("    # 1. En ligne"), base.index("    nav.close()")
for f in sorted(ici.glob("etapes_*.txt")):
    nom = f.stem.split("_", 1)[1]
    (ici / f"test_{nom}.py").write_text(base[:debut] + f.read_text(encoding="utf-8") + base[fin:], encoding="utf-8")
    print("test_" + nom + ".py")
