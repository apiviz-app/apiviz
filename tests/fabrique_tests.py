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
                if all(str(x.get(k)) == v for k, v in filtres): x.update(corps); x["modifie_le"] = horloge()
            return route.fulfill(status=204, headers=hdr, body="")
''' + avant)
base = base.replace('recu = {"rpc": [], "upsert": []}', '''recu = {"rpc": [], "upsert": []}
patchs = []
envois = []  # IT-09 : ordre réel des écritures reçues (rpc et insertions), pour vérifier les dépendances
_tic = [0]
def horloge():
    """modifie_le simulée (migration 026) : une valeur nouvelle à chaque modification."""
    _tic[0] += 1
    return "2026-11-17T08:%02d:%02d+00:00" % divmod(_tic[0], 60)''', 1)
# Ordre des envois : chaque appel de fonction et chaque insertion.
base = base.replace('''        recu["rpc"].append((nom, body))''', '''        recu["rpc"].append((nom, body)); envois.append(("rpc", nom, (body.get("p") or {}).get("id") if isinstance(body.get("p"), dict) else None))''', 1)
base = base.replace('''            recu["upsert"].append((t, req.url, rows))
            for r in rows:''', '''            recu["upsert"].append((t, req.url, rows)); envois.append(("insert", t, rows[0].get("id") if rows else None))
            for r in rows:''', 1)

# Ruchers (IT-05) : comme la migration 015, renommer ou placer un rucher se reporte sur ses colonies, et les deux
# fonctions creer_rucher / placer_rucher sont idempotentes par l'identifiant fourni.
maj = "                if all(str(x.get(k)) == v for k, v in filtres): x.update(corps); x[\"modifie_le\"] = horloge()\n"
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
        # IT-07 (migration 019) : nouvelle reine (l'ancienne est clôturée, jamais effacée) et correction ; idempotents.
        if nom == "changer_reine":
            p = body["p"]; rs = DATA.setdefault("reines", []); c = next(x for x in DATA["ruches"] if x["id"] == p["colonie_id"])
            couleur = lambda a: ["bleu", "blanc", "jaune", "rouge", "vert"][int(a) % 5]
            if not any(x["id"] == p["id"] for x in rs):
                o = next((x for x in rs if x["colonie_id"] == c["id"] and x["statut"] == "en_place"), None)
                if not o and c.get("annee_reine"):  # comme la reprise de 019 : la reine des colonnes entre dans l'historique
                    o = {"id": str(uuid.uuid4()), "colonie_id": c["id"], "annee_naissance": c["annee_reine"], "marquage": couleur(c["annee_reine"]), "origine": c.get("reine_origine") or "",
                         "en_place_du": c.get("reine_introduite") or c.get("date_installation") or "2020-01-01", "en_place_au": None, "statut": "en_place", "clippee": False, "notes": ""}
                    rs.append(o)
                if o and o["en_place_du"] > p["date"]:
                    return route.fulfill(status=400, headers=hdr, body=json.dumps({"message": "La reine en place l'est depuis le %s : choisis une date à partir de ce jour." % o["en_place_du"]}))
                if o: o.update({"statut": p.get("ancienne") or "remplacee", "en_place_au": p["date"]})
                rs.append({"id": p["id"], "colonie_id": c["id"], "annee_naissance": int(p["annee"]), "marquage": p.get("marquage") or couleur(p["annee"]), "origine": p.get("origine", ""),
                           "en_place_du": p["date"], "en_place_au": None, "statut": "en_place", "clippee": bool(p.get("clippee")), "notes": p.get("notes", "")})
                c.update({"annee_reine": int(p["annee"]), "reine_origine": p.get("origine", ""), "reine_introduite": p["date"]})
                if c.get("statut") == "orpheline": c["statut"] = "active"
                DATA.setdefault("ruche_evenements", []).append({"id": str(uuid.uuid4()), "ruche_id": c["id"], "type": "reine", "date_evenement": p["date"],
                    "detail": " · ".join(x for x in ["Reine %s" % p["annee"], (p.get("origine") or "").lower()] if x), "autre_ruche_id": None})
            return route.fulfill(status=200, headers=hdr, body=json.dumps(p["id"]))
        if nom == "corriger_reine":
            p = body["p"]; q = next((x for x in DATA.get("reines", []) if x["id"] == p["id"]), None)
            if not q: return route.fulfill(status=400, headers=hdr, body=json.dumps({"message": "Reine introuvable"}))
            q.update({"annee_naissance": int(p.get("annee") or q["annee_naissance"]), "en_place_du": p.get("date") or q["en_place_du"], "marquage": p.get("marquage") or q["marquage"]})
            for k in ("origine", "notes"):
                if k in p: q[k] = p[k]
            if "clippee" in p: q["clippee"] = bool(p["clippee"])
            if q["statut"] == "en_place":
                c = next(x for x in DATA["ruches"] if x["id"] == q["colonie_id"])
                c.update({"annee_reine": q["annee_naissance"], "reine_origine": q["origine"], "reine_introduite": q["en_place_du"]})
            return route.fulfill(status=200, headers=hdr, body=json.dumps(p["id"]))
        # IT-09 (migration 026) : correction et suppression gardées sur le téléphone, avec version et conflit champ par champ.
        if nom in ("modifier_saisie", "supprimer_saisie"):
            p = body["p"]; t = p["table"]
            if t in DATA.get("refuser", []):
                return route.fulfill(status=400, headers=hdr, body=json.dumps({"code": "P0001", "message": "Refusé par le serveur (test)."}))
            lignes = DATA.get(t, []); ligne = next((x for x in lignes if x["id"] == p["id"]), None)
            if ligne is not None and "modifie_le" not in ligne: ligne["modifie_le"] = "2026-11-01T00:00:00+00:00"
            change = ligne is not None and not p.get("forcer") and p.get("version") and ligne.get("modifie_le") != p["version"]
            if nom == "supprimer_saisie":
                if ligne is None: return route.fulfill(status=200, headers=hdr, body=json.dumps({"statut": "ok", "deja": True}))
                if change: return route.fulfill(status=200, headers=hdr, body=json.dumps({"statut": "conflit", "champs": [], "serveur": ligne, "version": ligne["modifie_le"]}))
                lignes.remove(ligne)
                if t == "visites":
                    for i in [x for x in DATA["visite_intrants"] if x["visite_id"] == p["id"]]:
                        for a in DATA["articles"]:
                            if a["id"] == i["article_id"]: a["stock"] = float(a["stock"]) + float(i["quantite"])
                        DATA["visite_intrants"].remove(i)
                if t == "ventes":
                    for l in [x for x in DATA["vente_lignes"] if x["vente_id"] == p["id"]]:
                        for lot in DATA["lots_stock"]:
                            if lot["id"] == l["lot_id"]: lot["pots_restants"] += l["quantite"]
                        DATA["vente_lignes"].remove(l)
                return route.fulfill(status=200, headers=hdr, body=json.dumps({"statut": "ok"}))
            if ligne is None:
                return route.fulfill(status=400, headers=hdr, body=json.dumps({"code": "P0001", "message": "Cette saisie n’existe plus : un autre membre l’a peut-être supprimée."}))
            champs, av = p.get("champs") or {}, p.get("avant")
            if change:
                conf = [k for k in champs if ligne.get(k) != champs[k] and (av is None or ligne.get(k) != av.get(k))]
                if conf: return route.fulfill(status=200, headers=hdr, body=json.dumps({"statut": "conflit", "champs": conf, "serveur": ligne, "version": ligne["modifie_le"]}))
            ligne.update(champs); ligne["modifie_le"] = horloge()
            return route.fulfill(status=200, headers=hdr, body=json.dumps({"statut": "ok", "version": ligne["modifie_le"]}))
        # IT-12 (migration 036) : comptage du rucher et signes sanitaires, idempotents par l'identifiant comme la base.
        if nom == "compter_varroa":
            p = body["p"]; ops = DATA.setdefault("operations", []); oc = DATA.setdefault("operation_colonies", [])
            if not any(x["id"] == p["id"] for x in ops):
                ops.append({"id": p["id"], "type": "comptage_varroa", "rucher_id": p.get("rucher_id"), "date_operation": p["date"], "methode": p["methode"],
                            "echantillon_abeilles": p.get("echantillon_abeilles"), "duree_jours": p.get("duree_jours"), "note": p.get("note", ""), "origine": "operation",
                            "visite_id": None, "created_at": "2026-11-23T10:%02d:00Z" % len(ops)})
                for c in p["colonies"]:
                    oc.append({"id": str(uuid.uuid4()), "operation_id": p["id"], "ruche_id": c["ruche_id"], "varroa": c["varroa"], "abeilles": c.get("abeilles")})
            return route.fulfill(status=200, headers=hdr, body=json.dumps(p["id"]))
        if nom == "noter_signes":
            p = body["p"]; obs = DATA.setdefault("observations_sanitaires", [])
            if not any(x["saisie_id"] == p["id"] for x in obs):
                for r in p["ruches"]:
                    obs.append({"id": str(uuid.uuid4()), "saisie_id": p["id"], "ruche_id": r, "date_observation": p["date"], "signes": p["signes"],
                                "importance": p.get("importance", "leger"), "note": p.get("note", ""), "visite_id": p.get("visite_id")})
            return route.fulfill(status=200, headers=hdr, body=json.dumps(len(p["ruches"])))
""" + rpc_fin)
v = '"varroa": None, "note": p.get("note", "")})'
assert base.count(v) == 1
base = base.replace(v, '"varroa": None, "note": p.get("note", ""), "traitement": p.get("traitement",""), "lot_produit": p.get("lot_produit",""), "traitement_dose": p.get("traitement_dose",""), "retrait_prevu": p.get("retrait_prevu") or None, "ordonnance": bool(p.get("ordonnance")),\n                    "force": p.get("force") or None, "oeufs_vus": p.get("oeufs_vus"), "cellules_royales": p.get("cellules_royales") or None})')  # v5.49 (023)

debut, fin = base.index("    # 1. En ligne"), base.index("    nav.close()")
for f in sorted(ici.glob("etapes_*.txt")):
    nom = f.stem.split("_", 1)[1]
    (ici / f"test_{nom}.py").write_text(base[:debut] + f.read_text(encoding="utf-8") + base[fin:], encoding="utf-8")
    print("test_" + nom + ".py")
