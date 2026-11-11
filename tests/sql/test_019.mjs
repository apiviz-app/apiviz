// Tests SQL de la migration 019 (IT-07) : reprise des reines (annee_reine, reine_origine, reine_introduite) et des
// liens (ruche_evenements.autre_ruche_id), une seule reine en place, changer_reine (clôture, idempotence, contrôles),
// corriger_reine, ancienne version (écriture directe de annee_reine), liens créés par le journal, anti-cycle,
// droits et isolation entre exploitations.
// Usage (depuis la racine du dépôt) : node tests/sql/test_019.mjs
import fs from "node:fs";
import { base, deuxExploitations, en, verificateur, erreur, E1, E2, id } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "018-stock-mouvements.sql" });
await deuxExploitations(db);
const val = async (q, p) => (await db.query(q, p)).rows[0];
const lignes = async (q, p) => (await db.query(q, p)).rows;
const nb = async (q, p) => Number((await val(q, p)).n);
const U = (n) => `dddddddd-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SQL = fs.readFileSync("migrations/019-reines-liens.sql", "utf8");

// --- Jeu de reprise : une base qui a vécu avec la v5 ---
await db.exec(`reset role;
  insert into public.ruches (id, nom, annee_reine, reine_origine, reine_introduite, date_installation, sortie, date_sortie, exploitation_id) values
    ('${id(1, 1)}', 'R1', 2024, 'Achetée', '2024-05-02', '2023-04-01', '', null, '${E1}'),
    ('${id(1, 2)}', 'R2', 2025, '', null, '2025-04-10', '', null, '${E1}'),
    ('${id(1, 3)}', 'R3', null, '', null, '2025-04-10', '', null, '${E1}'),
    ('${id(1, 4)}', 'R4', 2023, 'Essaim naturel', null, null, 'Morte', '2026-02-01', '${E1}'),
    ('${id(1, 5)}', 'R5', null, '', null, '2026-05-12', '', null, '${E1}'),
    ('${id(1, 6)}', 'R6', null, '', null, '2026-06-01', 'Réunie', '2026-07-01', '${E1}'),
    ('${id(2, 1)}', 'B1', 2026, '', '2026-04-01', '2026-04-01', '', null, '${E2}');
  -- R5 issue de la division de R2 (12 mai) ; R6 essaim de R1 (1er juin), puis réunie dans R1 (1er juillet).
  insert into public.ruche_evenements (id, ruche_id, type, date_evenement, detail, autre_ruche_id, exploitation_id) values
    ('${U(1)}', '${id(1, 2)}', 'division', '2026-05-12', 'Nouvelle ruche : R5', '${id(1, 5)}', '${E1}'),
    ('${U(2)}', '${id(1, 5)}', 'installation', '2026-05-12', 'Issue de la division de R2', '${id(1, 2)}', '${E1}'),
    ('${U(3)}', '${id(1, 1)}', 'essaimage', '2026-06-01', 'Essaim récupéré : R6', '${id(1, 6)}', '${E1}'),
    ('${U(4)}', '${id(1, 1)}', 'reunion', '2026-07-01', 'R6 réunie dans cette ruche', '${id(1, 6)}', '${E1}'),
    ('${U(5)}', '${id(1, 6)}', 'sortie', '2026-07-01', 'Réunie dans R1', '${id(1, 1)}', '${E1}'),
    ('${U(6)}', '${id(1, 3)}', 'essaimage', '2026-06-03', 'Essaim perdu', null, '${E1}'),
    ('${U(7)}', '${id(1, 1)}', 'reine', '2024-05-02', 'Reine 2024 · achetée', null, '${E1}');`);
const journal = async () => (await lignes(`select id, ruche_id, type, date_evenement::text d, detail, autre_ruche_id from public.ruche_evenements order by id`))
  .map((r) => Object.values(r).join("|")).join("\n");
const colonnes = async () => (await lignes(`select id, annee_reine, reine_origine, reine_introduite::text from public.ruches order by id`))
  .map((r) => Object.values(r).join("|")).join("\n");
const journalAvant = await journal(), colonnesAvant = await colonnes();

try { await db.exec(SQL); verif(true, "019 appliquée sur une base avec données"); }
catch (e) { verif(false, "019 : " + e.message); fin("Migration 019"); }

// --- Reprise des reines (AP-TECH-115) ---
let r = await lignes(`select c.nom, x.annee_naissance a, x.marquage m, x.origine o, x.en_place_du::text du, x.en_place_au au, x.statut s
  from public.reines x join public.ruches c on c.id = x.colonie_id order by c.nom`);
const par = Object.fromEntries(r.map((x) => [x.nom, x]));
verif(r.length === 4 && !par.R3 && !par.R5, "reprise : une reine par colonie dont l'année est renseignée (4 sur 7), aucune pour les autres");
verif(par.R1.a === 2024 && par.R1.m === "vert" && par.R1.o === "Achetée" && par.R1.du === "2024-05-02" && par.R1.s === "en_place" && par.R1.au === null,
  "reprise : R1, reine 2024 achetée, marquage vert, en place depuis sa date d'introduction");
verif(par.R2.du === "2025-04-10" && par.R2.m === "bleu", "reprise : sans date d'introduction, en place depuis la date d'installation ; 2025 : bleu");
verif(par.R4.a === 2023 && par.R4.m === "rouge" && par.R4.s === "en_place", "reprise : colonie morte, sa dernière reine connue est gardée telle quelle");
verif(await colonnes() === colonnesAvant, "reprise : les colonnes reine de ruches ne sont pas touchées");
verif(await nb(`select count(*) n from public.journal_audit`) === 0, "la reprise n'écrit rien dans le journal d'audit");

// --- Reprise des liens (AP-TECH-119) ---
r = await lignes(`select p.nom parent, e.nom enfant, l.type, l.date_lien::text d, l.evenement_id ev from public.colonie_liens l
  join public.ruches p on p.id = l.parent_id join public.ruches e on e.id = l.enfant_id order by l.date_lien`);
verif(r.length === 3, "reprise : 3 liens (division, essaim, réunion) ; l'essaim perdu et l'installation n'en donnent pas");
verif(r[0].parent === "R2" && r[0].enfant === "R5" && r[0].type === "division" && r[0].d === "2026-05-12" && r[0].ev === U(1),
  "AP-US-038 : R5 est issue de R2 par division le 12 mai, reliée à son événement");
verif(r[1].parent === "R1" && r[1].enfant === "R6" && r[1].type === "essaim", "reprise : R6 est un essaim de R1");
verif(r[2].parent === "R6" && r[2].enfant === "R1" && r[2].type === "reunion",
  "reprise : R6 réunie dans R1 alors qu'elle en est issue (réunion acceptée, ce n'est pas une descendance)");
verif(await journal() === journalAvant, "journal des colonies identique avant et après la migration");

// Relance.
try {
  await db.exec(SQL);
  verif(await nb(`select count(*) n from public.reines`) === 4 && await nb(`select count(*) n from public.colonie_liens`) === 3
    && await journal() === journalAvant, "019 relancée : rien en double, journal inchangé");
} catch (e) { verif(false, "019 relancée : " + e.message); }

// --- Couleur de marquage (AP-TECH-117) ---
r = await lignes(`select a, public.couleur_marquage(a) c from generate_series(2020, 2029) a`);
verif(r.map((x) => x.c).join(",") === "bleu,blanc,jaune,rouge,vert,bleu,blanc,jaune,rouge,vert", "couleur de marquage : cycle de 5 ans d'après le dernier chiffre de l'année");

// --- AP-US-037 : une reine 2024 en place, j'enregistre une reine 2026 introduite le 10 mai ---
await en(db, "a2@x.fr", E1);
const P = { id: U(100), colonie_id: id(1, 1), annee: 2026, date: "2026-05-10", origine: "Élevage maison" };
verif((await val(`select public.changer_reine($1) i`, [P])).i === U(100), "changer_reine : renvoie l'identifiant fourni");
r = await lignes(`select annee_naissance a, statut s, en_place_du::text du, en_place_au::text au, marquage m from public.reines where colonie_id = $1 order by en_place_du`, [id(1, 1)]);
verif(r.length === 2 && r[0].a === 2024 && r[0].s === "remplacee" && r[0].au === "2026-05-10", "AP-US-037 : la reine 2024 est clôturée au 10 mai (jamais effacée)");
verif(r[1].a === 2026 && r[1].s === "en_place" && r[1].du === "2026-05-10" && r[1].au === null && r[1].m === "blanc", "AP-US-037 : la reine 2026 est en place depuis le 10 mai, marquage blanc");
r = await val(`select annee_reine a, reine_origine o, reine_introduite::text d from public.ruches where id = $1`, [id(1, 1)]);
verif(r.a === 2026 && r.o === "Élevage maison" && r.d === "2026-05-10", "les colonnes reine de ruches suivent (lecture par l'ancienne version, retour arrière)");
verif(await nb(`select count(*) n from public.ruche_evenements where ruche_id = $1 and type = 'reine' and date_evenement = '2026-05-10' and detail = 'Reine 2026 · élevage maison'`, [id(1, 1)]) === 1,
  "journal : une ligne « reine » au format de la v5");
// Renvoi après une coupure : appliqué une seule fois.
await val(`select public.changer_reine($1)`, [P]);
verif(await nb(`select count(*) n from public.reines where colonie_id = $1`, [id(1, 1)]) === 2
  && await nb(`select count(*) n from public.ruche_evenements where ruche_id = $1 and type = 'reine' and date_evenement = '2026-05-10'`, [id(1, 1)]) === 1,
  "même saisie renvoyée (coupure réseau) : appliquée une seule fois");

// Une seule en place (AP-TECH-114).
let e = await erreur(db, `insert into public.reines (colonie_id, annee_naissance, en_place_du) values ($1, 2026, '2026-06-01')`, [id(1, 1)]);
verif(/reines_une_en_place_uidx/.test(e?.message || ""), "deux reines en place dans une colonie : refusé par la base");
e = await erreur(db, `insert into public.reines (colonie_id, annee_naissance, en_place_du, statut) values ($1, 2020, '2021-06-01', 'morte')`, [id(1, 1)]);
verif(/reines_statut_periode/.test(e?.message || ""), "reine qui n'est plus en place sans date de fin : refusée");

// Contrôles de changer_reine.
e = await erreur(db, `select public.changer_reine($1)`, [{ id: U(101), colonie_id: id(1, 1), annee: 2026, date: "2026-05-01" }]);
verif(/à partir de ce jour/.test(e?.message || ""), `date antérieure à la reine en place : « ${e?.message} »`);
e = await erreur(db, `select public.changer_reine($1)`, [{ id: U(102), colonie_id: id(1, 1), annee: 2027, date: "2026-06-01" }]);
verif(/année de naissance/.test(e?.message || ""), "année de naissance après l'année d'introduction : refusée");
e = await erreur(db, `select public.changer_reine($1)`, [{ id: U(103), colonie_id: id(1, 1), annee: 2026, date: "2099-01-01" }]);
verif(/futur/.test(e?.message || ""), "date dans le futur : refusée");
e = await erreur(db, `select public.changer_reine($1)`, [{ id: U(104), colonie_id: id(1, 1), date: "2026-06-01" }]);
verif(/Indique l'année/.test(e?.message || ""), "sans année : « Indique l'année de naissance de la reine. »");
e = await erreur(db, `select public.changer_reine($1)`, [{ id: U(105), colonie_id: id(1, 4), annee: 2026 }]);
verif(/n'est plus active/.test(e?.message || ""), "colonie morte : refusé");
e = await erreur(db, `select public.changer_reine($1)`, [{ id: U(106), colonie_id: id(1, 1), annee: 2026, date: "2026-06-01", marquage: "rose" }]);
verif(/marquage/.test(e?.message || ""), "couleur de marquage inconnue : refusée");
verif(await nb(`select count(*) n from public.reines where colonie_id = $1`, [id(1, 1)]) === 2, "saisies refusées : aucune reine créée, aucune clôturée (tout ou rien)");

// Première reine d'une colonie sans reine connue ; ancienne reine morte ; marquage choisi ; colonie orpheline.
await val(`select public.changer_reine($1)`, [{ id: U(110), colonie_id: id(1, 3), annee: 2025, date: "2025-06-01", marquage: "aucun", clippee: true, notes: "Douce" }]);
r = await val(`select marquage m, clippee c, notes n, statut s from public.reines where id = $1`, [U(110)]);
verif(r.m === "aucun" && r.c === true && r.n === "Douce" && r.s === "en_place", "première reine d'une colonie : non marquée, clippée, notes gardées");
await val(`select public.changer_statut($1)`, [{ colonie_id: id(1, 3), statut: "orpheline", date: "2026-06-10" }]);
verif(await nb(`select count(*) n from public.reines where id = $1 and statut = 'en_place'`, [U(110)]) === 1, "marquer orpheline ne clôture pas la reine tout seul");
await val(`select public.changer_reine($1)`, [{ id: U(111), colonie_id: id(1, 3), annee: 2026, date: "2026-06-20", ancienne: "disparue" }]);
r = await val(`select statut s, en_place_au::text au from public.reines where id = $1`, [U(110)]);
verif(r.s === "disparue" && r.au === "2026-06-20", "ancienne reine notée « disparue » à la date de la nouvelle");
verif((await val(`select statut, sortie from public.ruches where id = $1`, [id(1, 3)])).statut === "active", "colonie orpheline : une nouvelle reine la repasse en active");

// --- corriger_reine : une erreur de saisie, pas une nouvelle reine ---
await val(`select public.corriger_reine($1)`, [{ id: U(111), annee: 2025, date: "2026-06-22", origine: "Achetée", marquage: "bleu" }]);
r = await val(`select annee_naissance a, en_place_du::text du, origine o, marquage m, notes n from public.reines where id = $1`, [U(111)]);
verif(r.a === 2025 && r.du === "2026-06-22" && r.o === "Achetée" && r.m === "bleu", "corriger_reine : année, date, origine et marquage corrigés");
verif(await nb(`select count(*) n from public.reines where colonie_id = $1`, [id(1, 3)]) === 2, "corriger_reine : aucune reine créée");
r = await val(`select annee_reine a, reine_origine o, reine_introduite::text d from public.ruches where id = $1`, [id(1, 3)]);
verif(r.a === 2025 && r.o === "Achetée" && r.d === "2026-06-22", "corriger la reine en place : les colonnes de ruches suivent");
e = await erreur(db, `select public.corriger_reine($1)`, [{ id: U(111), date: "2026-06-01" }]);
verif(/reine précédente/.test(e?.message || ""), `date avant la fin de la reine précédente : « ${e?.message} »`);
e = await erreur(db, `select public.corriger_reine($1)`, [{ id: U(110), date: "2026-07-01" }]);
verif(/remplacée le/.test(e?.message || ""), "reine remplacée : date d'introduction après son remplacement refusée");
await val(`select public.corriger_reine($1)`, [{ id: U(110), notes: "Très douce" }]);
r = await val(`select notes n, annee_naissance a, (select annee_reine from public.ruches where id = $2) ar from public.reines where id = $1`, [U(110), id(1, 3)]);
verif(r.n === "Très douce" && r.a === 2025 && r.ar === 2025, "corriger une ancienne reine : ses notes changent, la colonie garde sa reine en place");

// --- Ancienne version : elle écrit annee_reine directement ---
await db.query(`update public.ruches set annee_reine = 2026, reine_origine = 'Achetée', reine_introduite = '2026-04-15' where id = $1`, [id(1, 2)]);
r = await lignes(`select annee_naissance a, statut s, en_place_du::text du, en_place_au::text au, origine o from public.reines where colonie_id = $1 order by en_place_du`, [id(1, 2)]);
verif(r.length === 2 && r[0].s === "remplacee" && r[0].au === "2026-04-15" && r[1].a === 2026 && r[1].du === "2026-04-15" && r[1].o === "Achetée",
  "ancienne version, année changée : l'ancienne reine est clôturée, la nouvelle est en place (rien n'est écrasé)");
await db.query(`update public.ruches set reine_origine = 'Élevage maison' where id = $1`, [id(1, 2)]);
verif(await nb(`select count(*) n from public.reines where colonie_id = $1`, [id(1, 2)]) === 2
  && (await val(`select origine o from public.reines where colonie_id = $1 and statut = 'en_place'`, [id(1, 2)])).o === "Élevage maison",
  "ancienne version, origine seule : correction de la reine en place");
await db.query(`update public.ruches set nom = 'R2' where id = $1`, [id(1, 2)]);
await db.query(`update public.ruches set annee_reine = 2026, notes = 'x' where id = $1`, [id(1, 2)]);
verif(await nb(`select count(*) n from public.reines where colonie_id = $1`, [id(1, 2)]) === 2, "ancienne version, fiche enregistrée sans changer l'année : aucune reine créée");
await db.query(`update public.ruches set annee_reine = 2025 where id = $1`, [id(1, 5)]);
r = await val(`select annee_naissance a, en_place_du d, marquage m from public.reines where colonie_id = $1`, [id(1, 5)]);
verif(r?.a === 2025 && r.m === "bleu", "ancienne version, première année notée : la reine est créée");
await db.query(`update public.ruches set annee_reine = 2026 where id = $1`, [id(1, 5)]);
verif(await nb(`select count(*) n from public.reines where colonie_id = $1`, [id(1, 5)]) === 1
  && (await val(`select annee_naissance a, marquage m from public.reines where colonie_id = $1`, [id(1, 5)])).m === "blanc",
  "ancienne version, année corrigée le jour même : la reine du jour est corrigée (pas de reine d'un jour)");
await db.query(`insert into public.ruches (id, nom, annee_reine, date_installation) values ($1, 'R7', 2026, '2026-05-20')`, [U(7)]);
verif((await val(`select en_place_du::text d from public.reines where colonie_id = $1`, [U(7)]))?.d === "2026-05-20", "ruche créée avec une année de reine : reine en place depuis l'installation");
verif(await nb(`select count(*) n from public.ruches c where (select count(*) from public.reines x where x.colonie_id = c.id and x.statut = 'en_place') > 1`) === 0,
  "jamais plus d'une reine en place par colonie");
verif(await nb(`select count(*) n from public.ruches c join public.reines x on x.colonie_id = c.id and x.statut = 'en_place' where c.annee_reine is distinct from x.annee_naissance`) === 0,
  "annee_reine de chaque ruche = année de sa reine en place");

// --- Liens créés par le journal (toute version de l'application) ---
await db.query(`insert into public.ruches (id, nom, date_installation) values ($1, 'R8', '2026-07-05')`, [U(8)]);
await db.query(`insert into public.ruche_evenements (ruche_id, type, date_evenement, detail, autre_ruche_id) values
  ($1, 'division', '2026-07-05', 'Nouvelle ruche : R8', $2), ($2, 'installation', '2026-07-05', 'Issue de la division de R5', $1)`, [id(1, 5), U(8)]);
r = await lignes(`select parent_id p, type, date_lien::text d from public.colonie_liens where enfant_id = $1`, [U(8)]);
verif(r.length === 1 && r[0].p === id(1, 5) && r[0].type === "division" && r[0].d === "2026-07-05", "division notée au journal : le lien est créé (R8 issue de R5)");
// Anti-cycle (AP-TECH-118) : R2 → R5 → R8 ; R8 ne peut pas être le parent de R2.
e = await erreur(db, `insert into public.colonie_liens (parent_id, enfant_id, type) values ($1, $2, 'division')`, [U(8), id(1, 2)]);
verif(/boucle/.test(e?.message || ""), `lien qui ferait une boucle : « ${e?.message} »`);
e = await erreur(db, `insert into public.colonie_liens (parent_id, enfant_id, type) values ($1, $1, 'essaim')`, [U(8)]);
verif(!!e, "une colonie ne peut pas être son propre parent");
const avant = await nb(`select count(*) n from public.colonie_liens`);
e = await erreur(db, `insert into public.ruche_evenements (ruche_id, type, date_evenement, detail, autre_ruche_id) values ($1, 'division', '2026-07-06', 'incohérent', $2)`, [U(8), id(1, 2)]);
verif(!e && await nb(`select count(*) n from public.colonie_liens`) === avant, "événement incohérent (boucle) : le journal l'accepte, aucun lien n'est créé");
await db.query(`insert into public.ruche_evenements (ruche_id, type, date_evenement, detail, autre_ruche_id) values ($1, 'reunion', '2026-07-08', 'R8 réunie dans cette ruche', $2)`, [id(1, 2), U(8)]);
verif(await nb(`select count(*) n from public.colonie_liens where parent_id = $1 and enfant_id = $2 and type = 'reunion'`, [U(8), id(1, 2)]) === 1,
  "réunion d'une petite-fille dans son aïeule : acceptée");

// --- Lecteur, visiteur, autre exploitation ---
await en(db, "l@x.fr", E1);
e = await erreur(db, `select public.changer_reine($1)`, [{ id: U(200), colonie_id: id(1, 1), annee: 2026 }]);
verif(/lecture seule/.test(e?.message || ""), "lecteur : changer_reine refusé");
e = await erreur(db, `select public.corriger_reine($1)`, [{ id: U(100), annee: 2025 }]);
verif(/lecture seule/.test(e?.message || ""), "lecteur : corriger_reine refusé");
verif(await nb(`select count(*) n from public.reines`) > 0 && await nb(`select count(*) n from public.colonie_liens`) > 0, "lecteur : lit les reines et les liens");
e = await erreur(db, `insert into public.reines (colonie_id, annee_naissance, en_place_du) values ($1, 2026, '2026-06-01')`, [id(1, 6)]);
verif(!!e, "lecteur : aucune écriture directe dans reines");
await en(db, null);
e = await erreur(db, `select public.changer_reine($1)`, [{ id: U(201), colonie_id: id(1, 1), annee: 2026 }]);
verif(!!e, "visiteur non connecté : changer_reine refusé");
await en(db, "b@x.fr", E2);
verif(await nb(`select count(*) n from public.reines`) === 1 && await nb(`select count(*) n from public.colonie_liens`) === 0, "B ne voit que sa reine, aucun lien de A");
e = await erreur(db, `select public.changer_reine($1)`, [{ id: U(202), colonie_id: id(1, 1), annee: 2026 }]);
verif(e?.message === "Colonie introuvable", "B ne peut pas changer la reine d'une colonie de A");
e = await erreur(db, `select public.corriger_reine($1)`, [{ id: U(100), annee: 2025 }]);
verif(e?.message === "Reine introuvable", "B ne peut pas corriger une reine de A");
e = await erreur(db, `insert into public.colonie_liens (parent_id, enfant_id, type) values ($1, $2, 'division')`, [id(1, 1), id(2, 1)]);
verif(!!e, "B ne peut pas relier sa colonie à une colonie de A");
e = await erreur(db, `insert into public.reines (colonie_id, annee_naissance, en_place_du, exploitation_id) values ($1, 2026, '2026-06-01', $2)`, [id(2, 1), E1]);
verif(!!e, "B ne peut pas écrire une reine dans l'exploitation A");
await db.exec("reset role");
verif(await nb(`select count(*) n from public.incoherences_exploitation() where nombre > 0`) === 0, "incoherences_exploitation() : rien à signaler");
r = await lignes(`select p.proname, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('changer_reine','corriger_reine','ruches_reine','ruche_evenements_lien','colonie_liens_controle','lien_ferait_boucle','reine_vers_ruche','couleur_marquage','meme_exploitation_019')`);
verif(r.length === 9 && r.every((x) => !x.prosecdef && String(x.proconfig).includes("search_path")), "9 fonctions de 019 : aucune en security definer, search_path fixé");

fin("Migration 019");
