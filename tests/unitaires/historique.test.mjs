// Retour en arrière (v5.64) : pile des écrans et effet du prochain retour. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as H from "../../src/noyau/historique.js";

const GROUPES = { carte: "ruches", varroa: "ruches", miel: "ventes", clients: "ventes", compta: "menu", pilotage: "menu", agenda: "menu" };
const groupe = (r) => GROUPES[r] || r;
const e = (route, plus = {}) => ({ photo: H.photo({ route, ...plus }), titre: plus.titre || route });
const suivre = (...ecrans) => ecrans.reduce((p, x) => H.suivante(p, x, groupe), []);
const routes = (p) => p.map((x) => x.photo.route + (x.photo.ruche ? ":" + x.photo.ruche : ""));

test("on revient là d'où l'on vient : Ruche 5 ouverte depuis l'Accueil ramène à l'Accueil", () => {
  assert.deepEqual(routes(suivre(e("dash"), e("ruche", { ruche: "r5" }))), ["dash", "ruche:r5"]);
  assert.deepEqual(routes(suivre(e("dash"), e("ruches"), e("rucher", { rucher: "Chênes" }), e("ruche", { ruche: "r5" }))),
    ["dash", "ruches", "rucher", "ruche:r5"]);
});

test("un onglet de 1er niveau n'a derrière lui que l'Accueil", () => {
  assert.deepEqual(routes(suivre(e("dash"), e("ruches"), e("ruche", { ruche: "r1" }), e("miel"))), ["dash", "miel"]);
  assert.deepEqual(routes(suivre(e("dash"), e("ruches"), e("carte"), e("varroa"))), ["dash", "varroa"], "onglets d'une même rubrique : remplacés");
  assert.deepEqual(routes(suivre(e("ruches"))), ["dash", "ruches"], "premier écran autre que l'Accueil : l'Accueil derrière");
  assert.deepEqual(routes(suivre(e("dash"), e("miel"), e("dash"))), ["dash"], "l'Accueil remet à zéro");
});

test("même écran, fiche voisine, saisie quittée, retour à la main", () => {
  assert.equal(suivre(e("dash"), e("pilotage", { tab: "fin" }), e("pilotage", { tab: "ops" })).length, 2, "un onglet interne ne compte pas");
  assert.deepEqual(routes(suivre(e("dash"), e("ruches"), e("ruche", { ruche: "r1" }), e("ruche", { ruche: "r2" }))), ["dash", "ruches", "ruche:r2"], "flèches ‹ ›");
  assert.deepEqual(routes(suivre(e("dash"), e("ruche", { ruche: "r1" }), e("visite"), e("ruche", { ruche: "r1" }))), ["dash", "ruche:r1"], "visite enregistrée");
  assert.deepEqual(routes(suivre(e("dash"), e("ruche", { ruche: "r1" }), e("visite"), e("lot", { lotId: "l1" }))), ["dash", "ruche:r1", "lot"], "la saisie ne reste pas");
});

test("le prochain retour : fenêtre d'abord, puis l'écran d'avant, puis l'Accueil, puis prévenir et quitter", () => {
  const p = suivre(e("dash"), e("ruche", { ruche: "r5" }));
  assert.equal(H.retour(p, { fenetre: true }).faire, "fenetre");
  const r = H.retour(p);
  assert.equal(r.faire, "ecran");
  assert.deepEqual(routes(r.pile), ["dash"]);
  assert.equal(H.retour([e("ruches")]).faire, "accueil");
  assert.equal(H.retour(r.pile).faire, "prevenir");
  assert.equal(H.retour(r.pile, { prevenu: true }).faire, "quitter");
});

test("photo : champs simples seulement, objets laissés de côté", () => {
  const p = H.photo({ route: "ruche", ruche: "r1", visite: { a: 1 }, autre: 3 });
  assert.equal(p.route, "ruche");
  assert.equal(p.ruche, "r1");
  assert.ok(!("visite" in p) && !("autre" in p));
  assert.equal(H.cle(p), H.cle(H.photo({ route: "ruche", ruche: "r1", tab: "x" })));
});
