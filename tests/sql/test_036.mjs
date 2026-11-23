// Tests SQL de la migration 036 : comptages varroa en opération, reprise des visites, seuils sourcés, signes sanitaires.
// Usage (depuis la racine du dépôt) : node tests/sql/test_036.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, id, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "035-photos-colonie-rucher.sql" });
await deuxExploitations(db);
await donnees(db);
const R1 = id(1, 3), R1b = id(1, 13), R2 = id(2, 3), V1 = id(1, 4), V2 = id(2, 4), RU1 = id(1, 16), RU2 = id(2, 16);
const val = async (q) => (await db.query(q)).rows[0];
const lignes = async (q) => (await db.query(q)).rows;
const appel = (f, p) => `select public.${f}('${JSON.stringify(p).replace(/'/g, "''")}'::jsonb) as n`;
const O = (n) => `bbbbbbbb-0000-4000-8000-${String(n).padStart(12, "0")}`;

// Données d'avant : un comptage au sucre glace dans la visite de A, un comptage sans méthode dans celle de B,
// une visite de A sans comptage.
await db.exec(`reset role;
  update public.visites set varroa = 6, varroa_abeilles = 300, varroa_methode = 'Sucre glace', date_visite = '2026-09-14' where id = '${V1}';
  update public.visites set varroa = 4, varroa_methode = 'à la louche' where id = '${V2}';
  insert into public.visites (id, ruche_id, activite, provisions, reine, exploitation_id) values ('${id(1, 99)}', '${R1b}', 'Normale', 'Moyennes', 'Vue', '${E1}');`);
const avant = await lignes(`select id, varroa, varroa_abeilles, varroa_methode, date_visite::text from public.visites order by id`);

const sql = fs.readFileSync("migrations/036-sante-varroa.sql", "utf8");
try { await db.exec(sql); verif(true, "036 appliquée sur une base avec données"); } catch (e) { verif(false, "036 : " + e.message); fin("Migration 036"); }
try { await db.exec(sql); verif(true, "036 relançable"); } catch (e) { verif(false, "036 relancée : " + e.message); }

// Reprise à l'identique.
await db.exec("reset role");
const ops = await lignes(`select o.id, o.methode, o.date_operation::text d, o.echantillon_abeilles, o.origine, o.visite_id, oc.varroa, oc.abeilles, oc.ruche_id, o.exploitation_id
  from public.operations o join public.operation_colonies oc on oc.operation_id = o.id order by o.id`);
verif(ops.length === 2, `reprise : 2 comptages repris, la visite sans comptage n'en crée pas (${ops.length})`);
const a = ops.find((x) => x.id === V1);
verif(a && a.varroa === 6 && a.abeilles === 300 && a.methode === "Sucre glace" && a.d === "2026-09-14" && a.origine === "visite" && a.visite_id === V1 && a.ruche_id === R1 && a.exploitation_id === E1,
  "reprise de A : 6 varroas sur 300 abeilles, sucre glace, 14 sept., même identifiant que la visite");
const b = ops.find((x) => x.id === V2);
verif(b && b.varroa === 4 && b.abeilles === null && b.methode === "" && b.exploitation_id === E2, "reprise de B : méthode hors liste reprise vide (« méthode non notée »)");
verif(JSON.stringify(await lignes(`select id, varroa, varroa_abeilles, varroa_methode, date_visite::text from public.visites order by id`)) === JSON.stringify(avant),
  "colonnes varroa des visites inchangées (retour arrière possible)");
await db.exec(sql);
verif((await val(`select count(*)::int n from public.operation_colonies`)).n === 2, "relance : rien n'est repris deux fois");
verif((await val(`select count(*)::int n from public.seuils_varroa`)).n === 0, "aucun seuil par défaut");

// Isolation.
await en(db, "a@x.fr", E1);
verif((await lignes(`select id from public.operations`)).every((x) => x.id === V1), "A ne voit que ses comptages");
verif(!!(await erreur(db, `insert into public.operations (id, exploitation_id, methode) values ('${O(90)}', '${E2}', 'Lavage')`)), "A ne peut pas écrire chez B");
await en(db, "l@x.fr", E1);
verif((await lignes(`select id from public.operations`)).length === 1, "lecteur : voit les comptages");
verif(!!(await erreur(db, appel("compter_varroa", { id: O(91), date: "2026-11-20", methode: "Lavage", colonies: [{ ruche_id: R1, varroa: 3, abeilles: 300 }] }))), "lecteur : comptage refusé");

// Visite créée, corrigée, effacée : l'opération suit (déclencheur).
await en(db, "a2@x.fr", E1);
const pv = { id: O(10), ruche_id: R1b, date_visite: "2026-11-02", activite: "Normale", provisions: "Bonnes", reine: "Vue", varroa: "9", varroa_methode: "Lavage", varroa_abeilles: "300" };
verif(!(await erreur(db, appel("creer_visite", pv))), "creer_visite avec un comptage");
let o = await val(`select o.origine, o.methode, oc.varroa, oc.abeilles from public.operations o join public.operation_colonies oc on oc.operation_id = o.id where o.id = '${O(10)}'`);
verif(o && o.origine === "visite" && o.methode === "Lavage" && o.varroa === 9 && o.abeilles === 300, "creer_visite crée l'opération (AP-TECH-181)");
await db.exec(`update public.visites set varroa = 12 where id = '${O(10)}'`);
verif((await val(`select varroa from public.operation_colonies where operation_id = '${O(10)}'`)).varroa === 12, "visite corrigée : comptage corrigé");
await db.exec(`update public.visites set note = 'rien' where id = '${O(10)}'`);
verif((await val(`select count(*)::int n from public.operation_colonies where operation_id = '${O(10)}'`)).n === 1, "autre champ corrigé : rien ne bouge");
await db.exec(`update public.visites set varroa = null where id = '${O(10)}'`);
verif((await val(`select count(*)::int n from public.operations where id = '${O(10)}'`)).n === 0, "comptage effacé de la visite : opération retirée");
verif(!(await erreur(db, appel("creer_visite", { ...pv, id: O(11), varroa: "" }))), "creer_visite sans comptage");
verif((await val(`select count(*)::int n from public.operations where id = '${O(11)}'`)).n === 0, "visite sans comptage : pas d'opération");
await db.exec(`reset role; delete from public.visites where id = '${V1}'`);
verif((await val(`select count(*)::int n from public.operations where id = '${V1}'`)).n === 0, "visite supprimée : son comptage aussi");

// Comptage du rucher.
await en(db, "a2@x.fr", E1);
const p = { id: O(1), date: "2026-11-18", methode: "Sucre glace", rucher_id: RU1, echantillon_abeilles: 300,
  colonies: [{ ruche_id: R1, varroa: 3, abeilles: 300 }, { ruche_id: R1b, varroa: 11, abeilles: 280 }] };
verif((await val(appel("compter_varroa", p))).n === O(1), "compter_varroa : 2 colonies");
verif((await val(appel("compter_varroa", p))).n === O(1), "rejoué par la file d'envoi : même identifiant");
const cs = await lignes(`select ruche_id, varroa, abeilles from public.operation_colonies where operation_id = '${O(1)}' order by ruche_id`);
verif(cs.length === 2 && cs[0].varroa === 3 && cs[1].abeilles === 280, "rejoué : rien en double, abeilles par colonie gardées");
const lange = { id: O(2), date: "2026-11-18", methode: "Lange", duree_jours: 7, colonies: [{ ruche_id: R1, varroa: 21, abeilles: 300 }] };
verif(!(await erreur(db, appel("compter_varroa", lange))), "chute naturelle sur 7 jours");
o = await val(`select o.duree_jours::float d, oc.varroa, oc.abeilles from public.operations o join public.operation_colonies oc on oc.operation_id = o.id where o.id = '${O(2)}'`);
verif(o.d === 7 && o.varroa === 21 && o.abeilles === null, "lange : durée gardée, pas d'abeilles");
verif(/jours/.test(await erreur(db, appel("compter_varroa", { ...lange, id: O(3), duree_jours: "" })) || ""), "lange sans durée : refusé, message en français");
verif(/méthode/.test(await erreur(db, appel("compter_varroa", { ...p, id: O(4), methode: "Pifomètre" })) || ""), "méthode inconnue : refusée");
verif(/exploitation/.test(await erreur(db, appel("compter_varroa", { ...p, id: O(5), colonies: [{ ruche_id: R2, varroa: 1 }] })) || ""), "colonie de B : refusée");
verif(/rucher/.test(await erreur(db, appel("compter_varroa", { ...p, id: O(6), rucher_id: RU2 })) || ""), "rucher de B : refusé");
verif(/deux fois/.test(await erreur(db, appel("compter_varroa", { ...p, id: O(7), colonies: [{ ruche_id: R1, varroa: 1 }, { ruche_id: R1, varroa: 2 }] })) || ""), "même colonie deux fois : refusée");
verif(/entier/.test(await erreur(db, appel("compter_varroa", { ...p, id: O(8), colonies: [{ ruche_id: R1, varroa: -2 }] })) || ""), "varroas négatifs : refusés");
verif(/au moins une/.test(await erreur(db, appel("compter_varroa", { ...p, id: O(9), colonies: [] })) || ""), "aucune colonie : refusé");
verif((await val(`select count(*)::int n from public.operations where id in ('${O(4)}', '${O(5)}', '${O(6)}', '${O(7)}', '${O(8)}', '${O(9)}')`)).n === 0, "refus : rien d'enregistré (transaction)");

// Seuils sourcés.
const seuil = (s) => `insert into public.seuils_varroa (methode, mois_debut, mois_fin, valeur, source, consulte_le) values (${s})`;
verif(!(await erreur(db, seuil(`'Lavage', 9, 11, 3, 'GDSA, réunion de rentrée', '2026-09-02'`))), "seuil complet : enregistré");
verif(!!(await erreur(db, seuil(`'Lavage', 3, 5, 2, '  ', '2026-09-02'`))), "seuil sans source : refusé");
verif(!!(await erreur(db, `insert into public.seuils_varroa (methode, mois_debut, mois_fin, valeur, source) values ('Lavage', 3, 5, 2, 'X')`)), "seuil sans date de consultation : refusé");
verif(!!(await erreur(db, seuil(`'Lavage', 0, 13, 2, 'X', '2026-09-02'`))), "mois hors 1 à 12 : refusé");
verif(!!(await erreur(db, seuil(`'Lavage', 3, 5, 0, 'X', '2026-09-02'`))), "valeur nulle : refusée");
await en(db, "b@x.fr", E2);
verif((await lignes(`select id from public.seuils_varroa`)).length === 0, "B ne voit pas les seuils de A");

// Signes sanitaires.
await en(db, "a2@x.fr", E1);
const s = { id: O(20), date: "2026-11-18", ruches: [R1, R1b], signes: ["ailes_deformees", "larves_filantes"], importance: "marque", note: "Deux cadres" };
verif((await val(appel("noter_signes", s))).n === 2, "noter_signes : une ligne par colonie");
verif((await val(appel("noter_signes", s))).n === 2, "rejoué : rend 2, rien en double");
verif((await val(`select count(*)::int n from public.observations_sanitaires`)).n === 2, "2 observations");
const ob = await val(`select signes, importance, note, exploitation_id from public.observations_sanitaires where ruche_id = '${R1}'`);
verif(ob.signes.join() === "ailes_deformees,larves_filantes" && ob.importance === "marque" && ob.exploitation_id === E1, "signes, importance et exploitation gardés");
verif(/signe/.test(await erreur(db, appel("noter_signes", { ...s, id: O(21), signes: [] })) || ""), "sans signe : refusé");
verif(/inconnu/.test(await erreur(db, appel("noter_signes", { ...s, id: O(22), signes: ["DROP TABLE"] })) || ""), "signe mal formé : refusé");
verif(/importance/.test(await erreur(db, appel("noter_signes", { ...s, id: O(23), importance: "énorme" })) || ""), "importance inconnue : refusée");
verif(/exploitation/.test(await erreur(db, appel("noter_signes", { ...s, id: O(24), ruches: [R2] })) || ""), "colonie de B : refusée");
verif(/visite/.test(await erreur(db, appel("noter_signes", { ...s, id: O(25), visite_id: V2 })) || ""), "visite de B : refusée");
await en(db, "b@x.fr", E2);
verif((await lignes(`select id from public.observations_sanitaires`)).length === 0, "B ne voit pas les signes de A");
await en(db, "l@x.fr", E1);
verif(!!(await erreur(db, appel("noter_signes", { ...s, id: O(26) }))), "lecteur : signe refusé");

// Sécurité : RLS sur les nouvelles tables, fonctions en security invoker, search_path fixé.
await db.exec("reset role");
const rls = await lignes(`select relname, relrowsecurity from pg_class where relname in ('operations', 'operation_colonies', 'seuils_varroa', 'observations_sanitaires')`);
verif(rls.length === 4 && rls.every((x) => x.relrowsecurity), "RLS active sur les 4 tables");
const fns = await lignes(`select proname, prosecdef, proconfig from pg_proc where proname in ('compter_varroa', 'noter_signes', 'synchroniser_comptage_visite')`);
verif(fns.length === 3 && fns.every((x) => !x.prosecdef && (x.proconfig || []).some((c) => c.startsWith("search_path="))), "fonctions en security invoker, search_path fixé");
verif((await val(`select has_function_privilege('anon', 'public.compter_varroa(jsonb)', 'execute') a`)).a === false, "anon ne peut pas compter");

fin("Migration 036");
