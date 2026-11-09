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
        # IT-06 (migration 016) : déplacement groupé, statut, ruche physique ; idempotents comme la base.
        if nom == "deplacer_colonies":
            p = body["p"]; deps = DATA.setdefault("deplacements", []); evs = DATA.setdefault("ruche_evenements", [])
            emps = DATA.setdefault("colonie_emplacements", [])
            if not any(x["id"] == p["id"] for x in deps):
                dest = next((x for x in DATA.get("ruchers", []) if x["id"] == p["rucher_id"]), None)
                if not dest: return route.fulfill(status=400, headers=hdr, body=json.dumps({"message": "Rucher introuvable"}))
                bougent = [c for c in DATA["ruches"] if c["id"] in p["colonies"] and c.get("rucher_id") != dest["id"]]
                deps.append({"id": p["id"], "date_deplacement": p["date"], "rucher_destination_id": dest["id"], "motif": p.get("motif", ""),
                             "nb_colonies": len(bougent), "notes": p.get("notes", "")})
                for c in bougent:
                    det = ", ".join(x for x in [(c.get("rucher") or "Sans rucher") + " vers " + dest["nom"], p.get("motif", ""), p.get("notes", "")] if x)
                    evs.append({"id": str(uuid.uuid4()), "ruche_id": c["id"], "type": "deplacement", "date_evenement": p["date"], "detail": det, "deplacement_id": p["id"]})
                    for x in emps:
                        if x["colonie_id"] == c["id"] and not x.get("au"): x["au"] = p["date"]
                    emps.append({"id": str(uuid.uuid4()), "colonie_id": c["id"], "rucher_id": dest["id"], "du": p["date"], "au": None, "deplacement_id": p["id"]})
                    c.update({"rucher_id": dest["id"], "rucher": dest["nom"]})
                    if dest.get("lat") is not None: c.update({"lat": dest["lat"], "lng": dest["lng"]})
            return route.fulfill(status=200, headers=hdr, body=json.dumps(p["id"]))
        if nom == "changer_statut":
            p = body["p"]; c = next(x for x in DATA["ruches"] if x["id"] == p["colonie_id"])
            sortie = {"morte": "Morte", "vendue": "Vendue", "perdue": "Perdue"}.get(p["statut"], "")
            c.update({"statut": p["statut"], "sortie": sortie, "date_sortie": p.get("date") if sortie else None})
            return route.fulfill(status=200, headers=hdr, body=json.dumps(p["colonie_id"]))
        if nom == "affecter_contenant":
            p = body["p"]; occ = DATA.setdefault("colonie_contenants", [])
            if not any(x["id"] == p["id"] for x in occ):
                for x in occ:
                    if x["colonie_id"] == p["colonie_id"] and not x.get("au"): x["au"] = p["date"]
                if p.get("contenant_id"):
                    occ.append({"id": p["id"], "colonie_id": p["colonie_id"], "contenant_id": p["contenant_id"], "du": p["date"], "au": None})
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
