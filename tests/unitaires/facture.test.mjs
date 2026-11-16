// Facture lue par API (v5.52) : contrôle du relevé du modèle (fonction serveur « lire-facture »), pièces envoyées,
// état de validation, lignes à vérifier, achat envoyé à enregistrer_achat(). Aucun appel réseau. Lancer : npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "../../supabase/functions/lire-facture/regles.js";
import * as V from "../../src/domaines/finances/facture-regles.js";

const catalogue = {
  articles: [
    { id: "p250", nom: "Pots verre 250 g", unite: "unité", stock: 34 },
    { id: "can", nom: "Candy", unite: "kg", stock: 3 },
  ],
  fournisseurs: [{ id: "f1", nom: "L'Abeille Matérielle" }],
};
const d = () => ({ articles: catalogue.articles.map((a) => ({ type: "Consommable", ...a })), fournisseurs: [...catalogue.fournisseurs], depenses: [], mouvements: [] });
let n = 0;
const id = () => `id${++n}`;

const releve = (x = {}) => ({
  lisible: true, fournisseur_nom: "L'Abeille Matérielle", fournisseur_id: "f1", numero: "2611", date: "2026-11-12",
  total_ht: 118.5, total_tva: 23.7, total_ttc: 142.2,
  lignes: [
    { libelle: "Pot verre 250g TO63", article_id: "p250", sans_stock: false, quantite: 120, montant_ttc: 60.48, a_verifier: false },
    { libelle: "Candy 1 kg", article_id: "can", sans_stock: false, quantite: 10, montant_ttc: 34.8, a_verifier: true, raison: "Quantité peu lisible", propositions: [10, 16, "x"] },
    { libelle: "Nourrisseur couvre-cadres", article_id: null, nouvel_article: "Nourrisseur couvre-cadres", famille: "equipement", unite: "unité", sans_stock: false, quantite: 2, montant_ttc: 23.52, a_verifier: false },
    { libelle: "Frais de port", sans_stock: true, montant_ttc: 23.4, a_verifier: false },
  ],
  ...x,
});

test("normaliser : relevé propre, identifiants connus, totaux contrôlés", () => {
  const f = S.normaliser(releve(), catalogue, "2026-11-16");
  assert.equal(f.lisible, true);
  assert.deepEqual(f.fournisseur, { id: "f1", nom: "L'Abeille Matérielle" });
  assert.equal(f.lignes.length, 4);
  assert.equal(f.lignes[0].article_id, "p250");
  assert.equal(f.lignes[1].a_verifier, true);
  assert.deepEqual(f.lignes[1].propositions, [10, 16], "les lectures possibles non numériques sont retirées");
  assert.deepEqual(f.lignes[2].nouvel_article, { nom: "Nourrisseur couvre-cadres", famille: "equipement", unite: "unité" });
  assert.equal(f.lignes[3].sans_stock, true);
  assert.equal(f.lignes[3].quantite, null);
  assert.equal(f.controle.coherent, true);
  assert.equal(f.controle.somme, 142.2);
});

test("normaliser : un identifiant inventé ne passe pas", () => {
  const f = S.normaliser(releve({ fournisseur_id: "inventé", lignes: [{ libelle: "Pots 500 g", article_id: "xxx", sans_stock: false, quantite: 60, montant_ttc: 34.8, a_verifier: false }] }), catalogue, "2026-11-16");
  assert.deepEqual(f.fournisseur, { id: null, nom: "L'Abeille Matérielle" });
  assert.equal(f.lignes[0].article_id, null);
  assert.equal(f.lignes[0].nouvel_article.nom, "Pots 500 g", "sans nom proposé, le libellé sert de nom");
});

test("normaliser : quantité ou montant absents rendent la ligne à vérifier", () => {
  const f = S.normaliser(releve({ lignes: [
    { libelle: "Cadres", article_id: null, sans_stock: false, quantite: 0, montant_ttc: 20, a_verifier: false },
    { libelle: "Cire", article_id: null, sans_stock: false, quantite: 2, a_verifier: false },
  ] }), catalogue, "2026-11-16");
  assert.equal(f.lignes[0].a_verifier, true);
  assert.equal(f.lignes[0].quantite, null);
  assert.match(f.lignes[0].raison, /Quantité/);
  assert.equal(f.lignes[1].a_verifier, true);
  assert.match(f.lignes[1].raison, /Montant/);
});

test("normaliser : montant HT seul converti au taux de la facture, date future refusée", () => {
  const f = S.normaliser(releve({ date: "2027-01-01", total_ht: 100, total_ttc: 120, lignes: [{ libelle: "Candy", article_id: "can", sans_stock: false, quantite: 10, montant_ht: 100, a_verifier: false }] }), catalogue, "2026-11-16");
  assert.equal(f.lignes[0].montant, 120);
  assert.equal(f.date, "");
  assert.equal(f.controle.coherent, true);
});

test("normaliser : document illisible ou sans ligne", () => {
  assert.deepEqual(S.normaliser({ lisible: false, raison_illisible: "C'est une photo de ruche.", lignes: [] }, catalogue, "2026-11-16"),
    { lisible: false, raison: "C'est une photo de ruche.", lignes: [] });
  assert.equal(S.normaliser({ lisible: true, lignes: [] }, catalogue, "2026-11-16").lisible, false);
  assert.equal(S.normaliser(null, catalogue, "2026-11-16").lisible, false);
});

test("controleTotaux : écart signalé au-delà de 5 centimes", () => {
  assert.equal(S.controleTotaux([{ montant: 10 }, { montant: 5.04 }], 15).coherent, true);
  const c = S.controleTotaux([{ montant: 10 }, { montant: 4 }], 15);
  assert.equal(c.coherent, false);
  assert.equal(c.ecart, -1);
  assert.equal(S.controleTotaux([{ montant: 10 }], null).coherent, null);
});

test("controlePieces : formats, nombre de pages, taille", () => {
  const b64 = "QUJD";
  assert.equal(S.controlePieces([{ type: "application/pdf", donnees: b64 }]), null);
  assert.equal(S.controlePieces([{ type: "image/jpeg", donnees: b64 }, { type: "image/png", donnees: b64 }]), null);
  assert.match(S.controlePieces([]), /photo ou un fichier/);
  assert.match(S.controlePieces([{ type: "image/gif", donnees: b64 }]), /Format/);
  assert.match(S.controlePieces([{ type: "application/pdf", donnees: b64 }, { type: "image/jpeg", donnees: b64 }]), /Un seul PDF/);
  assert.match(S.controlePieces(Array(5).fill({ type: "image/jpeg", donnees: b64 })), /4 pages/);
  assert.match(S.controlePieces([{ type: "application/pdf", donnees: "A".repeat(14 * 1024 * 1024) }]), /trop lourd/);
  const blocs = S.blocsPieces([{ type: "application/pdf", donnees: b64 }, { type: "image/png", donnees: b64 }]);
  assert.equal(blocs[0].type, "document");
  assert.equal(blocs[1].type, "image");
});

test("messageFacture : le catalogue et les fournisseurs accompagnent la facture", () => {
  const m = S.messageFacture(catalogue, [{ type: "image" }], "2026-11-16");
  assert.match(m[0].text, /p250 \| Pots verre 250 g \| unité : unité \| stock : 34/);
  assert.match(m[0].text, /f1 \| L'Abeille Matérielle/);
  assert.equal(m[1].type, "image");
  assert.equal(S.OUTIL_FACTURE.name, "facture");
  assert.doesNotMatch(S.CONSIGNES, /\bvous\b/i, "API tutoie");
});

test("validation : état, lignes à vérifier, stock avant et après", () => {
  const dd = d(), f = S.normaliser(releve(), catalogue, "2026-11-16");
  const v = V.etatValidation(f, dd, id, "2026-11-16");
  assert.equal(v.fournisseur_id, "f1");
  assert.equal(v.piece, "2611");
  assert.deepEqual(v.lignes.map((l) => l.cible), ["article:p250", "article:can", "nouveau", "libre"]);
  assert.equal(V.aVerifier(v).length, 1);
  assert.match(V.controleValidation(v), /ligne à vérifier/);
  v.lignes[1].quantite = 16; v.lignes[1].confirme = true;
  assert.equal(V.controleValidation(v), null);
  assert.deepEqual(V.mouvementsPrevus(v, dd).map((m) => [m.nom, m.avant, m.apres, m.nouveau]),
    [["Pots verre 250 g", 34, 154, false], ["Candy", 3, 19, false], ["Nourrisseur couvre-cadres", 0, 2, true]]);
  assert.equal(V.controle(v).coherent, true);
  v.lignes[0].montant = "50";
  assert.equal(V.controle(v).coherent, false);
});

test("validation : fournisseur inconnu à créer, nouvel article déjà au catalogue rattaché", () => {
  const dd = d();
  const f = S.normaliser(releve({ fournisseur_id: null, fournisseur_nom: "Verrerie du Sud", lignes: [{ libelle: "CANDY sac 1kg", article_id: null, nouvel_article: "candy", sans_stock: false, quantite: 5, montant_ttc: 15, a_verifier: false }] }), catalogue, "2026-11-16");
  const v = V.etatValidation(f, dd, id, "2026-11-16");
  assert.equal(v.fournisseur_id, "nouveau");
  assert.equal(v.fournisseurNouveau.nom, "Verrerie du Sud");
  assert.equal(v.lignes[0].cible, "article:can", "pas de doublon de « Candy »");
  v.fournisseurNouveau.nom = " ";
  assert.match(V.controleValidation(v), /nom au fournisseur/);
});

test("versAchat : même forme que la feuille « Ajouter un achat »", () => {
  const dd = d(), f = S.normaliser(releve(), catalogue, "2026-11-16");
  const v = V.etatValidation(f, dd, id, "2026-11-16");
  v.lignes[1].confirme = true;
  const p = V.versAchat(v, dd, { achete_par: "Johan", paye_par: "Société" });
  assert.equal(p.id, v.id);
  assert.equal(p.fournisseur_id, "f1");
  assert.equal(p.piece, "2611");
  assert.equal(p.achete_par, "Johan");
  assert.deepEqual(p.lignes[0], { id: v.lignes[0].id, montant: 60.48, article_id: "p250", quantite: 120, categorie: "Pots & étiquettes" });
  assert.equal(p.lignes[2].article.nom, "Nourrisseur couvre-cadres");
  assert.equal(p.lignes[2].article.type, "Équipement");
  assert.equal(p.lignes[2].article.duree_amort, 5);
  assert.deepEqual(p.lignes[3], { id: v.lignes[3].id, montant: 23.4, libelle: "Frais de port", categorie: "Frais" });
  v.fournisseur_id = "nouveau";
  assert.equal(V.versAchat(v, dd).fournisseur_id, v.fournisseurNouveau.id);
});

test("phrasePaiement : poche d'un associé ou compte de l'exploitation", () => {
  const eur = (x) => `${x.toFixed(2).replace(".", ",")} €`;
  assert.equal(V.phrasePaiement("Johan", "Johan", 142.2, "Société", eur), "Payé par Johan de sa poche : l’exploitation lui doit 142,20 €.");
  assert.equal(V.phrasePaiement("Johan", "Société", 142.2, "Société", eur), "Acheté par Johan, payé avec le compte de l’exploitation.");
  assert.equal(V.phrasePaiement("", "", 1, "Société", eur), "");
});

test("extraireReleve : l'outil d'abord, sinon un JSON écrit en texte", () => {
  const rel = { lisible: true, lignes: [{ libelle: "Candy" }] };
  assert.deepEqual(S.extraireReleve([{ type: "text", text: "Je relève." }, { type: "tool_use", name: "facture", input: rel }]), rel);
  assert.deepEqual(S.extraireReleve([{ type: "text", text: "Voici le relevé :\n```json\n" + JSON.stringify(rel) + "\n```" }]), rel);
  assert.equal(S.extraireReleve([{ type: "text", text: "Je ne peux pas lire cette image." }]), null);
  assert.equal(S.extraireReleve([{ type: "text", text: "{ pas du json }" }]), null);
  assert.equal(S.extraireReleve(null), null);
});
