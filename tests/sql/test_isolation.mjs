// Matrice d'isolation (IT-04, AP-FEAT-008, AP-US-013, AP-TECH-040) : tables × rôles × opérations.
// Deux exploitations A et B, une ligne dans chaque table métier pour chacune. On vérifie, table par table :
//   - un intrus (membre de A qui envoie l'en-tête de B) ne lit rien et n'écrit rien chez B ;
//   - chacun ne voit que son exploitation ;
//   - un membre lit et écrit ; un lecteur lit et n'écrit rien (ajout, modification, suppression, fonctions) ;
//   - aucun rattachement à un objet de l'autre exploitation, ni par les fonctions ni par l'API REST ;
//   - un visiteur non connecté ne lit rien.
// Usage (depuis la racine du dépôt) : node tests/sql/test_isolation.mjs
import { base, deuxExploitations, donnees, en, verificateur, E1, E2, id, TABLES, insertion } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base();
await deuxExploitations(db);
await donnees(db);

const nb = async (q, p) => Number((await db.query(q, p)).rows[0].n);
// Joue une écriture dans une transaction annulée : renvoie { erreur } ou { lignes } (lignes touchées).
async function essai(q, p) {
  await db.exec("begin");
  try { const r = await db.query(q, p); return { lignes: r.affectedRows ?? 0 }; }
  catch (e) { return { erreur: e }; }
  finally { await db.exec("rollback"); }
}
const refuse = (r) => !!r.erreur || r.lignes === 0;
const tables = Object.keys(TABLES);
const compterTout = async () => { await db.exec("reset role"); return Object.fromEntries(await Promise.all(tables.map(async (t) => [t, await nb(`select count(*) n from public.${t}`)]))); };
const avant = await compterTout();

// 1. L'intrus : a@ (membre de A seulement) envoie l'en-tête de B.
for (const t of tables) {
  await en(db, "a@x.fr", E2);
  verif(await nb(`select count(*) n from public.${t}`) === 0, `${t} : un membre de A avec l'en-tête de B ne lit aucune ligne`);
  if (TABLES[t]) {
    const [q, p] = insertion(t, TABLES[t](2), { exploitation_id: E2 });
    verif(!!(await essai(q, p)).erreur, `${t} : il ne peut rien ajouter chez B`);
  }
  verif(refuse(await essai(`update public.${t} set exploitation_id = exploitation_id`)), `${t} : il ne peut rien modifier chez B`);
  verif(refuse(await essai(`delete from public.${t}`)), `${t} : il ne peut rien supprimer chez B`);
}

// 2. Chacun chez soi : a@ dans A ne voit que A ; b@ dans B ne voit que B.
for (const t of tables) {
  await en(db, "a@x.fr", E1);
  const a = await nb(`select count(*) n from public.${t} where exploitation_id = '${E1}'`), autre = await nb(`select count(*) n from public.${t} where exploitation_id <> '${E1}'`);
  verif(a > 0 && autre === 0, `${t} : A voit ses lignes (${a}) et aucune de B`);
  verif((await essai(`update public.${t} set exploitation_id = '${E2}'`)).erreur, `${t} : A ne peut pas déplacer ses lignes vers B`);
}

// 3. Membre (écrit) et lecteur (n'écrit rien), opération par opération.
for (const t of tables) {
  for (const [qui, ecrit] of [["a2@x.fr", true], ["l@x.fr", false]]) {
    const role = ecrit ? "membre" : "lecteur";
    await en(db, qui, E1);
    verif(await nb(`select count(*) n from public.${t}`) > 0, `${t} : un ${role} lit`);
    if (TABLES[t]) {
      const [q, p] = insertion(t, TABLES[t](1));
      const r = await essai(q, p);
      verif(ecrit ? !r.erreur && r.lignes === 1 : !!r.erreur, `${t} : un ${role} ${ecrit ? "ajoute" : "ne peut pas ajouter"}${r.erreur && ecrit ? " (" + r.erreur.message + ")" : ""}`);
    }
    const m = await essai(`update public.${t} set exploitation_id = exploitation_id`);
    verif(ecrit ? m.lignes > 0 : refuse(m), `${t} : un ${role} ${ecrit ? "modifie" : "ne peut rien modifier"}`);
    // Suppression : sur une ligne sans dépendance (la plus récente ajoutée par un membre), ou toute la table pour un lecteur.
    if (ecrit && TABLES[t]) {
      await db.exec("begin");
      const [q, p] = insertion(t, TABLES[t](1));
      await db.query(q, p);
      const s = await db.query(`delete from public.${t} where ${t === "budgets" ? "annee = 2031" : `id = (select id from public.${t} order by ${["visite_intrants", "vente_lignes", "budgets"].includes(t) ? "id" : "created_at"} desc limit 1)`}`).catch((e) => ({ erreur: e }));
      await db.exec("rollback");
      verif(!s.erreur && s.affectedRows >= 1, `${t} : un membre supprime${s.erreur ? " (" + s.erreur.message + ")" : ""}`);
    }
    if (!ecrit) verif(refuse(await essai(`delete from public.${t}`)), `${t} : un lecteur ne peut rien supprimer`);
  }
}
verif(JSON.stringify(await compterTout()) === JSON.stringify(avant), "aucune ligne n'a changé après tous ces essais");

// 4. Les fonctions d'écriture refusent un lecteur, avec un message clair.
await en(db, "l@x.fr", E1);
const fonctions = [
  ["creer_visite", `select public.creer_visite('{"ruche_id":"${id(1, 3)}","activite":"Normale","provisions":"Moyennes","reine":"Vue"}')`],
  ["creer_vente", `select public.creer_vente('{"client_id":"${id(1, 8)}","lignes":[{"lot_id":"${id(1, 7)}","quantite":1}]}')`],
  ["regler", `select public.regler('{"objectif": 1}')`],
  ["ajouter_stock", `select public.ajouter_stock('{"article_id":"${id(1, 2)}","quantite":1}')`],
  ["numeroter_facture", `select public.numeroter_facture('${id(1, 9)}')`],
  ["restaurer", `select public.restaurer(1)`],
];
for (const [f, q] of fonctions) {
  const r = await essai(q);
  verif(r.erreur && /lecture seule/.test(r.erreur.message), `${f} : refusée à un lecteur (« ${r.erreur?.message} »)`);
}
const rl = await essai(`select public.rejoindre('inconnu')`);
verif(!!rl.erreur, "rejoindre : un code inconnu est refusé");

// 5. Photos (stockage) : le lecteur voit, n'ajoute ni ne supprime ; l'intrus ne voit rien.
await en(db, "l@x.fr", E1);
verif(await nb(`select count(*) n from storage.objects where bucket_id = 'photos-visites'`) === 1, "photos : un lecteur voit les fichiers de son exploitation, pas ceux de B");
verif(!!(await essai(`insert into storage.objects (bucket_id, name) values ('photos-visites', '${E1}/l.jpg')`)).erreur, "photos : un lecteur ne peut pas ajouter de fichier");
verif(refuse(await essai(`delete from storage.objects`)), "photos : un lecteur ne peut pas supprimer de fichier");
await en(db, "a2@x.fr", E1);
verif(!(await essai(`insert into storage.objects (bucket_id, name) values ('photos-visites', '${E1}/m.jpg')`)).erreur, "photos : un membre ajoute un fichier dans le dossier de son exploitation");
verif(!!(await essai(`insert into storage.objects (bucket_id, name) values ('photos-visites', '${E2}/m.jpg')`)).erreur, "photos : un membre ne peut pas écrire dans le dossier de B");

// 6. Rattachements croisés (AP-US-023) : par les fonctions et par l'API REST.
await en(db, "a@x.fr", E1);
let r = await essai(`select public.creer_visite('{"ruche_id":"${id(2, 3)}","activite":"Normale","provisions":"Moyennes","reine":"Vue"}')`);
verif(r.erreur && r.erreur.message === "Ruche introuvable", `creer_visite avec la ruche de B : « ${r.erreur?.message} »`);
r = await essai(`select public.creer_visite('{"ruche_id":"${id(1, 3)}","activite":"Normale","provisions":"Moyennes","reine":"Vue","intrants":[{"article_id":"${id(2, 2)}","quantite":1}]}')`);
verif(r.erreur && r.erreur.message === "Article introuvable", `creer_visite avec un article de B : « ${r.erreur?.message} »`);
r = await essai(`select public.creer_vente('{"client_id":"${id(2, 8)}","lignes":[{"lot_id":"${id(1, 7)}","quantite":1}]}')`);
verif(r.erreur && r.erreur.message === "Client introuvable", `creer_vente avec le client de B : « ${r.erreur?.message} »`);
r = await essai(`select public.creer_vente('{"client_id":"${id(1, 8)}","lignes":[{"lot_id":"${id(2, 7)}","quantite":1}]}')`);
verif(r.erreur && r.erreur.message === "Lot introuvable", `creer_vente avec un lot de B : « ${r.erreur?.message} »`);
const croises = [
  ["articles", { nom: "X", fournisseur_id: id(2, 1) }], ["depenses", { categorie: "Autre", libelle: "X", montant: 1, article_id: id(2, 2) }],
  ["depenses", { categorie: "Autre", libelle: "X", montant: 1, fournisseur_id: id(2, 1) }], ["recoltes", { kg: 1, ruche_id: id(2, 3) }],
  ["taches", { titre: "X", ruche_id: id(2, 3) }], ["ventes", { client_id: id(2, 8) }],
  ["vente_lignes", { vente_id: id(2, 9), lot_id: id(1, 7), quantite: 1, prix_unitaire: 1 }],
  ["vente_lignes", { vente_id: id(1, 9), lot_id: id(2, 7), quantite: 1, prix_unitaire: 1 }],
  ["visites", { ruche_id: id(2, 3), activite: "Normale", provisions: "Moyennes", reine: "Vue" }],
  ["visite_intrants", { visite_id: id(2, 4), article_id: id(1, 2), quantite: 1 }],
  ["visite_intrants", { visite_id: id(1, 4), article_id: id(2, 2), quantite: 1 }],
  ["visite_photos", { visite_id: id(2, 4), chemin: `${E1}/croise.jpg` }],
  ["ruche_evenements", { ruche_id: id(2, 3), type: "installation" }],
  ["ruche_evenements", { ruche_id: id(1, 3), type: "reunion", autre_ruche_id: id(2, 3) }],
];
for (const [t, ligne] of croises) {
  const [q, p] = insertion(t, ligne);
  const x = await essai(q, p);
  verif(!!x.erreur, `${t} : rattachement à un objet de B refusé par l'API (${Object.keys(ligne).filter((c) => String(ligne[c]).startsWith("2")).join(", ")})`);
}
verif(!!(await essai(`update public.recoltes set ruche_id = '${id(2, 3)}'`)).erreur, "recoltes : impossible de déplacer une récolte vers une ruche de B");
await db.exec("reset role");
const inc = (await db.query("select * from public.incoherences_exploitation()")).rows;
verif(inc.length === 14 && inc.every((x) => Number(x.nombre) === 0), "incoherences_exploitation : 14 rattachements contrôlés, aucun croisé");

// 7. Visiteur non connecté : aucune ligne.
for (const t of [...tables, "exploitations", "membres", "invitations", "journal_audit"]) {
  await en(db, null, E1);
  const x = await db.query(`select count(*) n from public.${t}`).then((q) => Number(q.rows[0].n)).catch(() => 0);
  verif(x === 0, `${t} : rien pour un visiteur non connecté`);
}

// 8. Tables d'accès : journal d'audit, membres, invitations, exploitations.
await en(db, "a@x.fr", E2);
for (const t of ["journal_audit", "invitations"]) verif(await nb(`select count(*) n from public.${t}`) === 0, `${t} : l'intrus ne lit rien chez B`);
verif(await nb(`select count(*) n from public.membres where exploitation_id = '${E2}'`) === 0, "membres : l'intrus ne voit pas les membres de B");
verif(await nb(`select count(*) n from public.exploitations where id = '${E2}'`) === 0, "exploitations : l'intrus ne voit pas B");
verif(!!(await essai(`insert into public.membres (exploitation_id, email, role) values ('${E2}', 'pirate@x.fr', 'membre')`)).erreur, "membres : l'intrus ne peut pas s'ajouter à B");
await en(db, "l@x.fr", E1);
verif(!!(await essai(`insert into public.membres (exploitation_id, email, role) values ('${E1}', 'ami@x.fr', 'membre')`)).erreur, "membres : un lecteur ne peut ajouter personne");
verif(!!(await essai(`insert into public.invitations default values`)).erreur, "invitations : un lecteur ne peut pas créer de lien");
verif(refuse(await essai(`update public.exploitations set nom = 'X'`)), "exploitations : un lecteur ne peut pas renommer");
verif(refuse(await essai(`update public.membres set role = 'responsable' where email = 'l@x.fr'`)), "membres : un lecteur ne peut pas changer son propre rôle");
verif(!(await essai(`delete from public.membres where email = 'l@x.fr'`)).erreur, "membres : un lecteur peut quitter l'exploitation");
await en(db, "a@x.fr", E1);
verif(!(await essai(`insert into public.membres (exploitation_id, email, role) values ('${E1}', 'lect@x.fr', 'lecteur')`)).erreur, "membres : un responsable ajoute un lecteur");
verif(!!(await essai(`insert into public.membres (exploitation_id, email, role) values ('${E1}', 'chef@x.fr', 'responsable')`)).erreur, "membres : on n'ajoute pas directement un responsable");

fin("Isolation entre exploitations et rôles");
