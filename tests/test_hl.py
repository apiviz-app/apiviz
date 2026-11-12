"""Test de bout en bout du mode hors ligne d'Apiviz, avec une base Supabase simulée."""
import json, re, sys, time, uuid, threading, http.server, functools
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

REPO, SBJS = sys.argv[1], sys.argv[2]
# Référence du projet lue dans config.js : les tests tournent en recette comme en production.
REF = re.search(r"https://(\w+)\.supabase\.co", open(REPO + "/config.js", encoding="utf-8").read()).group(1)
PORT = 8765
PLAFOND = 1000  # « Max rows » des deux projets Supabase (relevé du 6 nov. 2026)

class Calme(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Calme, directory=REPO))
threading.Thread(target=srv.serve_forever, daemon=True).start()

R1, A1, L1, C1 = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
DATA = {
  "ruches": [{"id": R1, "nom": "Ruche 1", "rucher": "Verger", "etat": "Bonne", "type_ruche": "", "annee_reine": None, "notes": ""}],
  "articles": [{"id": A1, "nom": "Candy", "type": "Consommable", "unite": "kg", "stock": 5, "seuil": 1}],
  "visites": [], "visite_intrants": [], "recoltes": [], "vente_lignes": [], "depenses": [], "fournisseurs": [],
  "taches": [], "budgets": [], "visite_photos": [],
  "lots_stock": [{"id": L1, "code": "L26-01", "miel": "Toutes fleurs", "format_g": 500, "prix": 12, "pots_initiaux": 10, "pots_restants": 10}],
  "clients": [{"id": C1, "nom": "Mme Martin", "cercle": "Famille"}], "ventes": [],
  "reglages": [{"id": 1, "data": {}}],
}
recu = {"rpc": [], "upsert": []}
lectures = []  # (table, offset, lignes renvoyées)
E1 = str(uuid.uuid4())
EXPL = {"miennes": [{"id": E1, "nom": "Bee’s Brothers", "role": "responsable"}], "codes": {}, "invit": [],
        "membres": [{"exploitation_id": E1, "email": "test@apidoo.fr", "role": "responsable", "created_at": "2026-11-01"},
                    {"exploitation_id": E1, "email": "ami@apidoo.fr", "role": "membre", "created_at": "2026-11-02"}]}
entetes = {"x-exploitation": set()}
etat = {"coupe": False}

def supabase(route):
    req = route.request
    if etat["coupe"]:
        return route.abort("internetdisconnected")
    path = urlparse(req.url).path
    hdr = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}
    if req.method == "OPTIONS":
        return route.fulfill(status=204, headers={**hdr, "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*"})
    m = re.match(r"/rest/v1/rpc/(\w+)", path)
    if m:
        nom = m.group(1); body = req.post_data_json or {}
        recu["rpc"].append((nom, body))
        if nom == "est_membre": return route.fulfill(status=200, headers=hdr, body="true")
        if nom == "mes_exploitations": return route.fulfill(status=200, headers=hdr, body=json.dumps(EXPL["miennes"]))
        if nom == "creer_exploitation":
            e = {"id": str(uuid.uuid4()), "nom": body["p_nom"], "role": "responsable"}
            EXPL["miennes"].append(e); return route.fulfill(status=200, headers=hdr, body=json.dumps(e["id"]))
        if nom == "rejoindre":
            inv = EXPL["codes"].get(body["p_code"])
            if not inv: return route.fulfill(status=400, headers=hdr, body=json.dumps({"message": "Ce lien d'invitation n'est plus valable : demandez-en un nouveau."}))
            EXPL["miennes"].append(inv); return route.fulfill(status=200, headers=hdr, body=json.dumps(inv["id"]))
        if nom == "photos_espace": return route.fulfill(status=200, headers=hdr, body="0")
        if nom == "restaurer":  # comme la migration 014 : la visite revient, la ligne du journal est marquée
            a = next(x for x in DATA.get("journal_audit", []) if x["id"] == body["p_id"])
            DATA[a["table_nom"]].append(a["avant"]); a["restaure_le"] = "2026-11-06T12:00:00Z"
            return route.fulfill(status=200, headers=hdr, body=json.dumps({"table": a["table_nom"], "id": a["avant"]["id"]}))
        if nom == "regler":  # comme la migration 012 : fusion clé par clé, null retire la clé
            d = DATA["reglages"][0].setdefault("data", {})
            for k, v in (body.get("p_modifs") or {}).items():
                if v is None: d.pop(k, None)
                else: d[k] = v
            return route.fulfill(status=200, headers=hdr, body=json.dumps(d))
        if nom == "ajouter_stock":
            p = body["p"]; a = next(x for x in DATA["articles"] if x["id"] == p["article_id"]); dep = p.get("depense")
            if not dep or not any(x["id"] == dep["id"] for x in DATA["depenses"]):
                a["stock"] = float(a["stock"]) + float(p["quantite"])
                if dep: DATA["depenses"].append({**dep, "article_id": a["id"], "quantite": p["quantite"], "fournisseur_id": dep.get("fournisseur_id") or None})
            return route.fulfill(status=200, headers=hdr, body=json.dumps(a["stock"]))
        if nom == "creer_visite":
            p = body["p"]
            if not any(v["id"] == p["id"] for v in DATA["visites"]):
                DATA["visites"].append({"id": p["id"], "ruche_id": p["ruche_id"], "date_visite": p["date_visite"], "activite": p["activite"],
                    "provisions": p["provisions"], "reine": p["reine"], "couvain": p.get("couvain", ""), "poids_kg": p.get("poids_kg") or None,
                    "observes": p.get("observes"), "duree_s": p.get("duree_s"), "varroa": None, "note": p.get("note", "")})
            return route.fulfill(status=200, headers=hdr, body=json.dumps(p["id"]))
        # v5.30 (migration 018) : achat en plusieurs lignes et mise en pots, idempotents comme la base.
        if nom == "enregistrer_achat":
            p = body["p"]; deps = DATA.setdefault("depenses", []); mvs = DATA.setdefault("mouvements_stock", [])
            if not any(x.get("achat_id") == p["id"] for x in deps):
                for l in p["lignes"]:
                    a = next((x for x in DATA["articles"] if x["id"] == l.get("article_id")), None)
                    if l.get("article"):
                        na = l["article"]
                        a = next((x for x in DATA["articles"] if x["nom"].lower() == na["nom"].lower()), None)
                        if not a:
                            a = {"id": na["id"], "nom": na["nom"], "unite": na.get("unite") or "unité", "type": na.get("type") or "Consommable", "famille": na.get("famille", ""),
                                 "contenance_g": na.get("contenance_g"), "duree_amort": na.get("duree_amort"), "poste": na.get("poste", ""), "seuil": 0, "stock": 0}
                            DATA["articles"].append(a)
                    nat = ("Immobilisation" if a["type"] == "Équipement" else "Consommable") if a else "Service"
                    deps.append({"id": l["id"], "achat_id": p["id"], "piece": p.get("piece", ""), "libelle": l.get("libelle") or (a["nom"] if a else ""),
                                 "categorie": l.get("categorie") or "Autre", "montant": l["montant"], "date_depense": p["date"], "fournisseur_id": p.get("fournisseur_id"),
                                 "achete_par": p.get("achete_par", ""), "paye_par": p.get("paye_par", ""),
                                 "nature": nat, "article_id": a["id"] if a else None, "quantite": l.get("quantite") if a else None})
                    if a:
                        a["stock"] = float(a.get("stock") or 0) + float(l["quantite"])
                        if l["montant"]: a["valeur"] = round(float(l["montant"]) / float(l["quantite"]), 2)
                        mvs.append({"id": str(uuid.uuid4()), "article_id": a["id"], "type": "entree", "origine": "achat", "quantite": l["quantite"],
                                    "depense_id": l["id"], "date_mouvement": p["date"], "note": "", "created_at": "2026-11-11T10:00:00Z"})
            return route.fulfill(status=200, headers=hdr, body=json.dumps(p["id"]))
        if nom == "mettre_en_pots":
            p = body["p"]; mvs = DATA.setdefault("mouvements_stock", []); lots = DATA["lots_stock"]
            if not any(x["id"] == p["id"] for x in lots):
                for i in p.get("intrants", []):
                    a = next(x for x in DATA["articles"] if x["id"] == i["article_id"])
                    if float(a["stock"]) < float(i["quantite"]):
                        return route.fulfill(status=400, headers=hdr, body=json.dumps({"message": f"Il te manque {float(i['quantite']) - float(a['stock']):g} {a['nom']} (il en reste {float(a['stock']):g})."}))
                lots.append({"id": p["id"], "code": p["code"], "miel": p["miel"], "format_g": p["format_g"], "prix": p["prix"], "pots_initiaux": p["pots"],
                             "pots_restants": p["pots"], "pots_vendus": 0, "date_mise_en_pot": p["date"], "ddm": p.get("ddm"), "extraction": p.get("extraction", "")})
                for i in p.get("intrants", []):
                    a = next(x for x in DATA["articles"] if x["id"] == i["article_id"]); a["stock"] = float(a["stock"]) - float(i["quantite"])
                    mvs.append({"id": str(uuid.uuid4()), "article_id": a["id"], "type": "consommation", "origine": "mise_en_pots", "quantite": -float(i["quantite"]),
                                "lot_id": p["id"], "date_mouvement": p["date"], "note": "", "created_at": "2026-11-11T10:00:00Z"})
            return route.fulfill(status=200, headers=hdr, body=json.dumps(p["id"]))
        return route.fulfill(status=200, headers=hdr, body="null")
    m = re.match(r"/rest/v1/(\w+)", path)
    if m:
        t = m.group(1)
        if t not in ("membres", "invitations", "exploitations"):
            entetes["x-exploitation"].add(req.headers.get("x-exploitation", ""))
        if t == "membres" and req.method == "GET": return route.fulfill(status=200, headers=hdr, body=json.dumps(EXPL["membres"]))
        if t == "membres" and req.method == "POST":
            EXPL["membres"].append(req.post_data_json); return route.fulfill(status=201, headers=hdr, body="")
        if t == "invitations" and req.method == "POST":
            # Comme la migration 014 : rôle et nombre d'usages choisis à la création (par défaut : membre, sans limite).
            i = {"role": "membre", "usages_max": None, **(req.post_data_json or {}), "code": uuid.uuid4().hex, "exploitation_id": req.headers.get("x-exploitation"),
                 "created_at": "2026-11-03T10:00:00Z", "expire_le": "2026-11-17T10:00:00Z", "usages": 0, "revoque_le": None}
            EXPL["invit"].append(i); return route.fulfill(status=201, headers=hdr, body=json.dumps(i))
        if t == "invitations" and req.method == "GET":
            return route.fulfill(status=200, headers=hdr, body=json.dumps([i for i in EXPL["invit"] if not i.get("revoque_le")]))
        if t == "invitations" and req.method == "PATCH":
            code = re.search(r"code=eq\.(\w+)", req.url).group(1)
            for i in EXPL["invit"]:
                if i["code"] == code: i.update(req.post_data_json)
            return route.fulfill(status=204, headers=hdr, body="")
        if req.method == "GET" and t in ("reines", "colonie_liens") and DATA.get("sans_019"):
            # Base sans la migration 019 : tables inconnues (l'app lit alors la reine dans les colonnes de la ruche).
            return route.fulfill(status=404, headers=hdr, body=json.dumps({"code": "PGRST205", "message": f"Could not find the table 'public.{t}'"}))
        if req.method == "GET" and t == "mouvements_stock" and t not in DATA:
            # Base sans la migration 018 : table inconnue, comme Supabase (l'app garde alors les anciens écrans).
            return route.fulfill(status=404, headers=hdr, body=json.dumps({"code": "PGRST205", "message": "Could not find the table 'public.mouvements_stock'"}))
        if req.method == "GET":
            # Comme Supabase : au plus PLAFOND lignes par requête (« Max rows »), tranche offset/limit respectée.
            from urllib.parse import parse_qs
            q = parse_qs(urlparse(req.url).query); lignes = DATA.get(t, [])
            debut = int(q.get("offset", ["0"])[0]); taille = min(int(q.get("limit", [str(PLAFOND)])[0]), PLAFOND)
            tranche = lignes[debut:debut + taille]
            h = dict(hdr)
            if "count=exact" in (req.headers.get("prefer") or ""):
                h["Content-Range"] = f"{debut}-{debut + len(tranche) - 1}/{len(lignes)}" if tranche else f"*/{len(lignes)}"
                h["Access-Control-Expose-Headers"] = "Content-Range"
            lectures.append((t, debut, len(tranche)))
            return route.fulfill(status=200, headers=h, body=json.dumps(tranche))
        if req.method == "POST":
            rows = req.post_data_json; rows = rows if isinstance(rows, list) else [rows]
            recu["upsert"].append((t, req.url, rows))
            for r in rows:
                if not any(x.get("id") == r.get("id") for x in DATA.setdefault(t, [])): DATA[t].append(r)
                # Comme le déclencheur de 019 : une division, un essaim récupéré ou une réunion notés au journal créent leur lien.
                if t == "ruche_evenements" and r.get("type") in ("division", "essaimage", "reunion") and r.get("autre_ruche_id"):
                    pe = (r["autre_ruche_id"], r["ruche_id"]) if r["type"] == "reunion" else (r["ruche_id"], r["autre_ruche_id"])
                    DATA.setdefault("colonie_liens", []).append({"id": str(uuid.uuid4()), "parent_id": pe[0], "enfant_id": pe[1],
                        "type": "essaim" if r["type"] == "essaimage" else r["type"], "date_lien": r.get("date_evenement"), "evenement_id": r.get("id")})
                if t == "mouvements_stock":  # comme le déclencheur de 018 : le stock suit le mouvement
                    for a in DATA["articles"]:
                        if a["id"] == r["article_id"]: a["stock"] = float(a["stock"]) + float(r["quantite"])
            return route.fulfill(status=201, headers=hdr, body="")
    return route.fulfill(status=200, headers=hdr, body="{}")

def cdn(route):
    if etat["coupe"]: return route.abort("internetdisconnected")
    route.fulfill(status=200, headers={"Content-Type": "application/javascript", "Access-Control-Allow-Origin": "*"}, path=SBJS)

session = {"access_token": "x", "token_type": "bearer", "expires_in": 3600, "expires_at": int(time.time()) + 86400,
           "refresh_token": "r", "user": {"id": "u1", "email": "test@apidoo.fr", "aud": "authenticated", "app_metadata": {}, "user_metadata": {}}}

ok = True
def verif(cond, msg):
    global ok
    print(("OK   " if cond else "ECHEC") + " " + msg); ok = ok and cond

with sync_playwright() as pw:
    nav = pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = nav.new_context(viewport={"width": 390, "height": 844})
    ctx.route("**/*supabase.co/**", supabase)
    ctx.route("https://cdn.jsdelivr.net/**", cdn)
    ctx.route(re.compile(r"https://fonts\.(googleapis|gstatic)\.com/.*"), lambda r: r.abort() if etat["coupe"] else r.fulfill(status=200, body="", headers={"Content-Type": "text/css"}))
    ctx.add_init_script(f"window.name==='deco'||localStorage.getItem('sb-{REF}-auth-token')||localStorage.setItem('sb-{REF}-auth-token', {json.dumps(json.dumps(session))})")
    page = ctx.new_page()
    erreurs = []
    page.on("pageerror", lambda e: erreurs.append(str(e)))
    url = f"http://127.0.0.1:{PORT}/"

    # 1. En ligne : l'app se charge et le service worker s'installe.
    page.goto(url); page.wait_for_selector("text=/Bonjour|Bonsoir/", timeout=15000)
    page.wait_for_function("navigator.serviceWorker.controller || navigator.serviceWorker.ready.then(()=>true)", timeout=15000)
    page.reload(); page.wait_for_selector("text=/Bonjour|Bonsoir/", timeout=15000)
    verif(page.evaluate("!!navigator.serviceWorker.controller"), "service worker actif")
    verif(page.locator(".hl-band").count() == 0, "pas de bandeau en ligne")

    # 2. Sans réseau : l'app s'ouvre depuis le téléphone.
    etat["coupe"] = True; ctx.set_offline(True)
    page.reload(); page.wait_for_selector("text=/Bonjour|Bonsoir/", timeout=20000)
    verif("Hors ligne" in page.locator(".hl-band").inner_text(), "bandeau « Hors ligne » à l'ouverture sans réseau")

    # 3. Visite sans réseau.
    page.evaluate("ACT.newvisite()"); page.wait_for_selector("text=Nouvelle visite")
    verif(page.locator("form[data-form=visite] .btn.main").inner_text().startswith("Enregistrer sur le"), "bouton « Enregistrer sur le téléphone »")
    page.locator("details[data-sec=intrants]").evaluate("d => d.open = true"); page.click("[data-act=vstep][data-v='0.5']")
    page.locator("details[data-sec=photos]").evaluate("d => d.open = true"); page.fill("#v_note", "Visite test hors ligne")
    page.click("form[data-form=visite] .btn.main")
    page.wait_for_selector(".toast >> text=Visite gardée sur le téléphone", timeout=10000)
    verif(page.locator(".u-visite .tag.watch >> text=en attente").count() >= 1, "visite marquée « en attente » dans le journal")
    verif("1 saisie en attente" in page.locator(".hl-band").inner_text(), "bandeau : 1 saisie en attente")

    # 4. Récolte sans réseau (fiche).
    page.evaluate("ACT.newrecolte()"); page.fill("#r_kg", "12.5")
    page.click("form[data-form=v3recolte] .btn.main")
    page.wait_for_selector(".toast >> text=Gardé sur le téléphone", timeout=10000)

    # 5. L'app survit à un rechargement sans réseau, saisies comprises.
    page.reload(); page.wait_for_selector("text=/Bonjour|Bonsoir/", timeout=20000)
    verif("2 saisies en attente" in page.locator(".hl-band").inner_text(), "après rechargement : 2 saisies toujours en attente")
    verif(page.locator("text=En attente d’envoi").count() == 1, "liste « En attente d’envoi » sur l'accueil")

    # 6. Retour du réseau : envoi automatique.
    etat["coupe"] = False; ctx.set_offline(False)
    page.wait_for_selector(".toast >> text=saisies envoyées", timeout=20000)
    vis = [b for n, b in recu["rpc"] if n == "creer_visite"]
    verif(len(vis) == 1 and vis[0]["p"].get("id") and vis[0]["p"]["note"] == "Visite test hors ligne", "visite envoyée avec son identifiant")
    verif(vis and vis[0]["p"]["intrants"] == [{"article_id": A1, "quantite": 0.5}], "intrants transmis")
    rec = [x for x in recu["upsert"] if x[0] == "recoltes"]
    verif(len(rec) == 1 and rec[0][2][0]["kg"] == 12.5 and "on_conflict=id" in rec[0][1], "récolte envoyée sans doublon possible")
    page.wait_for_timeout(500)
    verif(page.locator(".hl-band").count() == 0, "bandeau disparu une fois tout envoyé")
    verif(len(DATA["visites"]) == 1 and len(DATA["recoltes"]) == 1, "base simulée : 1 visite, 1 récolte")
    verif(not erreurs, "aucune erreur JavaScript" + ("" if not erreurs else " : " + " | ".join(erreurs)))
    nav.close()
srv.shutdown()
sys.exit(0 if ok else 1)
