// Tests SQL de la migration 026 : hors ligne v2 (modifie_le, modifier_saisie, supprimer_saisie).
// Usage (depuis la racine du dépôt) : node tests/sql/test_026.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, id, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "025-factures-fichiers.sql" });
await deuxExploitations(db);
await donnees(db);
const val = async (q, p) => (await db.query(q, p)).rows[0];
const empreinte = `select md5(string_agg(id::text || activite || provisions || reine, ',' order by id)) h, count(*)::int n from public.visites`;
const avant = await val(empreinte);

const sql = fs.readFileSync("migrations/026-hors-ligne-v2.sql", "utf8");
try { await db.exec(sql); verif(true, "026 appliquée sur une base avec données"); }
catch (e) { verif(false, "026 : " + e.message); fin("Migration 026"); }
try { await db.exec(sql); verif(true, "026 relançable"); }
catch (e) { verif(false, "026 relancée : " + e.message); }
const apres = await val(empreinte);
verif(apres.h === avant.h && apres.n === avant.n, "visites existantes inchangées");
for (const t of ["visites", "ruches", "recoltes", "depenses", "taches", "ventes", "reines"]) {
  const c = await val(`select count(*)::int n from information_schema.columns where table_schema = 'public' and table_name = $1 and column_name = 'modifie_le'`, [t]);
  verif(c.n === 1, `${t}.modifie_le présente`);
}
verif((await val(`select count(*)::int n from public.visites where modifie_le is null`)).n === 0, "modifie_le remplie pour les lignes existantes");

// Déclencheur : une modification réelle avance modifie_le ; une mise à jour sans changement ne la bouge pas.
const V = id(1, 4), R = id(1, 3), T = id(1, 12), D = id(1, 11), VE = id(1, 9);
const mo = async (t, i) => (await val(`select modifie_le::text m from public.${t} where id = $1`, [i])).m;
const m0 = await mo("visites", V);
await db.exec(`update public.visites set note = note where id = '${V}'`);
verif(await mo("visites", V) === m0, "mise à jour sans changement : modifie_le inchangée");
await db.exec(`update public.visites set note = 'vue' where id = '${V}'`);
const m1 = await mo("visites", V);
verif(m1 !== m0, "modification : modifie_le avancée");

const modifier = (p) => db.query(`select public.modifier_saisie($1::jsonb) r`, [JSON.stringify(p)]).then((x) => x.rows[0].r);
const supprimer = (p) => db.query(`select public.supprimer_saisie($1::jsonb) r`, [JSON.stringify(p)]).then((x) => x.rows[0].r);

// AP-US-047 : correction du poids d'une visite déjà envoyée, avec la bonne version.
await en(db, "a@x.fr", E1);
const r1 = await modifier({ table: "visites", id: V, champs: { poids_kg: "31.5" }, avant: { poids_kg: null }, version: m1 });
const v1 = await val(`select poids_kg::text p, modifie_le::text m from public.visites where id = $1`, [V]);
verif(r1.statut === "ok" && v1.p === "31.50" && r1.version && v1.m !== m1, `poids corrigé, nouvelle version renvoyée (${JSON.stringify(r1)})`);
// Renvoi de la même modification (réponse perdue) : pas de conflit, rien ne change.
const r1b = await modifier({ table: "visites", id: V, champs: { poids_kg: 31.5 }, avant: { poids_kg: null }, version: m1 });
verif(r1b.statut === "ok" && (await val(`select poids_kg::text p from public.visites where id = $1`, [V])).p === "31.50", "même modification renvoyée : ok, idempotente");

// AP-US-049 : un autre membre a changé la note ; ma modification hors ligne de la note (vue avant « vue ») est en conflit.
await en(db, "a2@x.fr", E1);
await db.query(`update public.visites set note = 'Note de Johan' where id = $1`, [V]);
await en(db, "a@x.fr", E1);
const r2 = await modifier({ table: "visites", id: V, champs: { note: "Ma note", poids_kg: 32 }, avant: { note: "vue", poids_kg: 31.5 }, version: m1 });
verif(r2.statut === "conflit" && JSON.stringify(r2.champs) === '["note"]' && r2.serveur?.note === "Note de Johan" && !!r2.version,
  `conflit sur la note seulement, version du serveur montrée (${JSON.stringify(r2.champs)})`);
verif((await val(`select note, poids_kg::text p from public.visites where id = $1`, [V])).note === "Note de Johan", "conflit : rien n'est écrit");
// Champ différent de celui changé par l'autre : pas de conflit, la modification passe (fusion).
const r3 = await modifier({ table: "visites", id: V, champs: { activite: "Forte" }, avant: { activite: "Normale" }, version: m1 });
verif(r3.statut === "ok" && (await val(`select activite, note from public.visites where id = $1`, [V])).note === "Note de Johan", "champ non touché par l'autre : modification acceptée, sa note gardée");
// Choix fait sur l'écran : forcer.
const r4 = await modifier({ table: "visites", id: V, champs: { note: "Ma note" }, avant: { note: "vue" }, version: m1, forcer: true });
verif(r4.statut === "ok" && (await val(`select note from public.visites where id = $1`, [V])).note === "Ma note", "forcer : ma version gardée");

// Liste blanche : champ de liaison refusé, table non prévue refusée, valeurs typées.
verif(/ne se modifie pas/.test(String(await erreur(db, `select public.modifier_saisie($1::jsonb)`, [JSON.stringify({ table: "visites", id: V, champs: { ruche_id: id(1, 13) } })]))), "ruche_id refusé");
verif(/ne se modifie pas/.test(String(await erreur(db, `select public.modifier_saisie($1::jsonb)`, [JSON.stringify({ table: "clients", id: id(1, 8), champs: { nom: "x" } })]))), "table clients refusée");
verif(/ne se modifie pas/.test(String(await erreur(db, `select public.modifier_saisie($1::jsonb)`, [JSON.stringify({ table: "visites; drop table x", id: V, champs: {} })]))), "nom de table fantaisiste refusé");
await modifier({ table: "ruches", id: R, champs: { hausses: "3", equipement: ["Grille à reine"] } });
const ru = await val(`select hausses, equipement from public.ruches where id = $1`, [R]);
verif(ru.hausses === 3 && JSON.stringify(ru.equipement) === '["Grille à reine"]', "ruche : hausses et équipement (tableau) modifiés");
await modifier({ table: "taches", id: T, champs: { faite: true, faite_le: "2026-11-17" } });
verif((await val(`select faite from public.taches where id = $1`, [T])).faite === true, "tâche cochée");
await modifier({ table: "depenses", id: D, champs: { montant: 42.5, libelle: "Cadres" } });
verif((await val(`select montant::text m from public.depenses where id = $1`, [D])).m === "42.50", "dépense : montant modifié");
verif(/n’existe plus/.test(String(await erreur(db, `select public.modifier_saisie($1::jsonb)`, [JSON.stringify({ table: "visites", id: "2a000026-0000-4000-8000-000000000099", champs: { note: "x" } })]))), "saisie supprimée : message clair");
verif(/1 à 5|check|force/i.test(String(await erreur(db, `select public.modifier_saisie($1::jsonb)`, [JSON.stringify({ table: "visites", id: V, champs: { force: 9 } })]))), "contrainte de la table toujours appliquée (force 9 refusée)");

// Suppressions.
const mt = await mo("taches", T);
const s1 = await supprimer({ table: "taches", id: T, version: mt });
verif(s1.statut === "ok" && !(await val(`select 1 x from public.taches where id = $1`, [T])), "tâche supprimée");
verif((await supprimer({ table: "taches", id: T, version: mt })).statut === "ok", "suppression renvoyée : ok (idempotente)");
const mv = await mo("ventes", VE);
await db.exec(`reset role; update public.ventes set livre = not livre where id = '${VE}'`);
await en(db, "a@x.fr", E1);
const s2 = await supprimer({ table: "ventes", id: VE, version: mv });
verif(s2.statut === "conflit" && !!(await val(`select 1 x from public.ventes where id = $1`, [VE])), "vente modifiée depuis : conflit, rien supprimé");
const stockAvant = (await val(`select pots_restants from public.lots_stock where id = $1`, [id(1, 7)]))?.pots_restants;
verif((await supprimer({ table: "ventes", id: VE, version: mv, forcer: true })).statut === "ok" && !(await val(`select 1 x from public.ventes where id = $1`, [VE])), "supprimer quand même : vente supprimée");
const stockApres = (await val(`select pots_restants from public.lots_stock where id = $1`, [id(1, 7)]))?.pots_restants;
verif(stockAvant === undefined || Number(stockApres) === Number(stockAvant) + 2, `stock rétabli comme une suppression directe (${stockAvant} → ${stockApres})`);
verif(/ne se supprime pas/.test(String(await erreur(db, `select public.supprimer_saisie($1::jsonb)`, [JSON.stringify({ table: "ruches", id: R })]))), "ruche : suppression sans réseau refusée");

// Lecteur refusé ; autre exploitation : introuvable, rien de modifié chez A.
await en(db, "l@x.fr", E1);
verif(!!(await erreur(db, `select public.modifier_saisie($1::jsonb)`, [JSON.stringify({ table: "visites", id: V, champs: { note: "lecteur" } })])), "lecteur : modification refusée");
verif(!!(await erreur(db, `select public.supprimer_saisie($1::jsonb)`, [JSON.stringify({ table: "visites", id: V })])), "lecteur : suppression refusée");
await en(db, "b@x.fr", E2);
verif(/n’existe plus/.test(String(await erreur(db, `select public.modifier_saisie($1::jsonb)`, [JSON.stringify({ table: "visites", id: V, champs: { note: "B" } })]))), "B : visite de A introuvable");
const sB = await supprimer({ table: "visites", id: V });
await en(db, "a@x.fr", E1);
verif(sB.statut === "ok" && (await val(`select note from public.visites where id = $1`, [V]))?.note === "Ma note", "B ne peut ni modifier ni supprimer la visite de A");
await en(db, null, null);
verif(!!(await erreur(db, `select public.modifier_saisie('{}'::jsonb)`)), "anonyme : refusé");

// Résumé des colonies (013) toujours lisible.
await en(db, "a@x.fr", E1);
verif((await val(`select count(*)::int n from public.colonies_resume`)).n > 0, "colonies_resume toujours lisible");

fin("Migration 026");
