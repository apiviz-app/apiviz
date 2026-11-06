"""Fabrique les tests test_<nom>.py à partir de la base simulée de test_hl.py et des étapes etapes_<nom>.txt."""
import pathlib
ici = pathlib.Path(__file__).parent
base = (ici / "test_hl.py").read_text(encoding="utf-8")

# Mises à jour de fiches (PATCH) et champs de traitement : utiles à plusieurs tests.
avant = '        if req.method == "POST":\n            rows = req.post_data_json'
assert base.count(avant) == 1
base = base.replace(avant, '''        if req.method == "PATCH":
            corps = req.post_data_json; patchs.append((t, corps))
            from urllib.parse import parse_qsl
            filtres = [(k, v[3:]) for k, v in parse_qsl(urlparse(req.url).query) if v.startswith("eq.")]
            for x in DATA.get(t, []):
                if all(str(x.get(k)) == v for k, v in filtres): x.update(corps)
            return route.fulfill(status=204, headers=hdr, body="")
''' + avant)
base = base.replace('recu = {"rpc": [], "upsert": []}', 'recu = {"rpc": [], "upsert": []}\npatchs = []', 1)

# Ruchers (IT-05) : comme la migration 015, renommer ou placer un rucher se reporte sur ses colonies, et les deux
# fonctions creer_rucher / placer_rucher sont idempotentes par l'identifiant fourni.
maj = "                if all(str(x.get(k)) == v for k, v in filtres): x.update(corps)\n"
assert base.count(maj) == 1
base = base.replace(maj, maj + """            if t == "ruchers":
                for rc in DATA["ruchers"]:
                    for c in DATA["ruches"]:
                        if c.get("rucher_id") == rc["id"]:
                            if "nom" in corps: c["rucher"] = rc["nom"]
                            if "lat" in corps: c.update({"lat": rc["lat"], "lng": rc["lng"]})
""")
rpc_fin = '        return route.fulfill(status=200, headers=hdr, body="null")\n'
assert base.count(rpc_fin) == 1
base = base.replace(rpc_fin, """        if nom == "creer_rucher":
            p = body["p"]; DATA.setdefault("ruchers", [])
            if not any(x["id"] == p["id"] for x in DATA["ruchers"]):
                DATA["ruchers"].append({"id": p["id"], "nom": p["nom"], "lat": p.get("lat"), "lng": p.get("lng"), "acces": "", "proprietaire": "",
                    "proprietaire_tel": "", "capacite": None, "environnement": "", "ressources": "", "point_eau": "", "notes": "", "archive_le": None})
                for c in p.get("colonies") or []:
                    DATA["ruches"].append({"id": c["id"], "nom": c["nom"], "rucher": p["nom"], "rucher_id": p["id"], "etat": "Bonne", "type_ruche": "",
                        "annee_reine": None, "notes": "", "lat": p.get("lat"), "lng": p.get("lng")})
            return route.fulfill(status=200, headers=hdr, body=json.dumps(p["id"]))
        if nom == "placer_rucher":
            p = body["p"]
            for rc in DATA.get("ruchers", []):
                if rc["id"] == p["id"]:
                    rc.update({"lat": p["lat"], "lng": p["lng"]})
                    for c in DATA["ruches"]:
                        if c.get("rucher_id") == rc["id"]: c.update({"lat": p["lat"], "lng": p["lng"]})
            return route.fulfill(status=200, headers=hdr, body=json.dumps(p["id"]))
""" + rpc_fin)
v = '"varroa": None, "note": p.get("note", "")})'
assert base.count(v) == 1
base = base.replace(v, '"varroa": None, "note": p.get("note", ""), "traitement": p.get("traitement",""), "lot_produit": p.get("lot_produit",""), "traitement_dose": p.get("traitement_dose",""), "retrait_prevu": p.get("retrait_prevu") or None, "ordonnance": bool(p.get("ordonnance"))})')

debut, fin = base.index("    # 1. En ligne"), base.index("    nav.close()")
for f in sorted(ici.glob("etapes_*.txt")):
    nom = f.stem.split("_", 1)[1]
    (ici / f"test_{nom}.py").write_text(base[:debut] + f.read_text(encoding="utf-8") + base[fin:], encoding="utf-8")
    print("test_" + nom + ".py")
