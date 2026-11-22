// Tests SQL de la migration 035 : photos de colonie et de rucher, journal du nettoyage, fichiers à nettoyer (IT-11).
// Usage (depuis la racine du dépôt) : node tests/sql/test_035.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, id, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "033-clients-gouts.sql" });
await deuxExploitations(db);
await donnees(db);
const sql = fs.readFileSync("migrations/035-photos-colonie-rucher.sql", "utf8");
try { await db.exec(sql); verif(true, "035 appliquée sur une base avec données"); } catch (e) { verif(false, "035 : " + e.message); fin("Migration 035"); }
try { await db.exec(sql); verif(true, "035 relançable"); } catch (e) { verif(false, "035 relancée : " + e.message); }

const val = async (q) => (await db.query(q)).rows[0];
const R1 = id(1, 3), V1 = id(1, 4), RC1 = id(1, 16), R2 = id(2, 3), RC2 = id(2, 16);

// La photo existante reste rattachée à sa visite.
await en(db, "a@x.fr", E1);
const p = await val(`select visite_id, colonie_id, rucher_id from public.visite_photos where id = '${id(1, 14)}'`);
verif(p && p.visite_id === V1 && p.colonie_id === null && p.rucher_id === null, "photo existante : visite gardée, pas de colonie ni de rucher");

// Un membre ajoute une photo de colonie, de rucher, et une photo de visite marquée pour la colonie.
await en(db, "a2@x.fr", E1);
verif(!(await erreur(db, `insert into public.visite_photos (colonie_id, chemin) values ('${R1}', '${E1}/colonies/${R1}/c.jpg')`)), "photo de colonie sans visite");
verif(!(await erreur(db, `insert into public.visite_photos (rucher_id, chemin) values ('${RC1}', '${E1}/ruchers/${RC1}/r.jpg')`)), "photo de rucher sans visite");
verif(!(await erreur(db, `insert into public.visite_photos (visite_id, colonie_id, chemin) values ('${V1}', '${R1}', '${E1}/${V1}/vc.jpg')`)), "photo de visite gardée aussi pour la colonie");
verif(!(await erreur(db, `insert into public.visite_photos (visite_id, chemin) values ('${V1}', '${E1}/${V1}/ancienne.jpg')`)), "ancienne version : photo de visite seule");
verif(!!(await erreur(db, `insert into public.visite_photos (chemin) values ('${E1}/rien.jpg')`)), "photo rattachée à rien : refusée");

// Autre exploitation : impossible d'accrocher une photo à sa colonie ou à son rucher.
verif(!!(await erreur(db, `insert into public.visite_photos (colonie_id, chemin) values ('${R2}', '${E1}/colonies/x.jpg')`)), "colonie d'une autre exploitation : refusée");
verif(!!(await erreur(db, `insert into public.visite_photos (rucher_id, chemin) values ('${RC2}', '${E1}/ruchers/x.jpg')`)), "rucher d'une autre exploitation : refusé");
await en(db, "b@x.fr", E2);
verif((await val(`select count(*)::int n from public.visite_photos where colonie_id = '${R1}' or rucher_id = '${RC1}'`)).n === 0, "autre exploitation : ne voit pas ces photos");

// Lecteur : lit, n'écrit pas.
await en(db, "l@x.fr", E1);
verif((await val(`select count(*)::int n from public.visite_photos where colonie_id = '${R1}'`)).n === 2, "lecteur : voit les photos de la colonie");
verif(!!(await erreur(db, `insert into public.visite_photos (colonie_id, chemin) values ('${R1}', '${E1}/colonies/l.jpg')`)), "lecteur : ne peut pas ajouter de photo");

// Supprimer la colonie retire ses photos (le fichier devient sans fiche : le nettoyage s'en charge).
await db.exec("reset role");
const avant = (await val(`select count(*)::int n from public.visite_photos where rucher_id = '${RC1}'`)).n;
verif(avant === 1, "une photo de rucher en place");
const inc = (await db.query(`select enfant, colonne, nombre::int n from public.incoherences_exploitation()`)).rows;
verif(inc.some((x) => x.enfant === "visite_photos" && x.colonne === "colonie_id") && inc.some((x) => x.colonne === "rucher_id" && x.enfant === "visite_photos"), "contrôle des incohérences : couvre colonie_id et rucher_id");
verif(inc.every((x) => x.n === 0), "aucune incohérence d'exploitation");

// Journal du nettoyage : écrit par la clé de service, lu par l'exploitation, jamais écrit par l'application.
await db.exec(`reset role; alter role service_role bypassrls;
  grant usage on schema public, storage to service_role; grant select on storage.objects to service_role;
  grant select on public.visite_photos, public.exploitations to service_role;`);
await db.exec(`set role service_role; insert into public.nettoyages_stockage (exploitation_id, statut, fichiers, octets) values ('${E1}', 'fait', 2, 2048), ('${E2}', 'rien', 0, 0); reset role;`);
await en(db, "a@x.fr", E1);
const j = await val(`select count(*)::int n, max(fichiers) f from public.nettoyages_stockage`);
verif(j.n === 1 && j.f === 2, `responsable A : voit son passage seulement (${JSON.stringify(j)})`);
verif(!!(await erreur(db, `insert into public.nettoyages_stockage (exploitation_id, statut) values ('${E1}', 'fait')`)), "application : ne peut pas écrire au journal");
verif(!!(await erreur(db, `delete from public.nettoyages_stockage`)) || (await (async () => { await db.exec("reset role"); return (await val(`select count(*)::int n from public.nettoyages_stockage`)).n === 2; })()), "application : ne peut pas effacer le journal");
await en(db, "l@x.fr", E1);
verif((await val(`select count(*)::int n from public.nettoyages_stockage`)).n === 1, "lecteur : voit le journal de son exploitation");
await en(db, "b@x.fr", E2);
verif((await val(`select count(*)::int n, max(statut) s from public.nettoyages_stockage`)).s === "rien", "exploitation B : voit son passage seulement");
verif(!!(await erreur(db, `insert into public.nettoyages_stockage (exploitation_id, statut) values ('${E1}', 'bidon')`)), "statut inconnu : refusé");

// Fichiers à nettoyer : sans fiche, rangés sous une exploitation, plus vieux que le délai.
await db.exec(`reset role;
  insert into storage.objects (bucket_id, name, metadata, created_at) values
    ('photos-visites', '${E1}/vieux-orphelin.jpg', '{"size": 3000}', now() - interval '10 days'),
    ('photos-visites', '${E1}/recent-orphelin.jpg', '{"size": 3000}', now() - interval '2 days'),
    ('photos-visites', '${E2}/vieux-orphelin-b.jpg', '{"size": 500}', now() - interval '30 days'),
    ('photos-visites', 'sans-dossier/vieux.jpg', '{"size": 500}', now() - interval '30 days'),
    ('factures', '${E1}/facture.pdf', '{"size": 500}', now() - interval '30 days'),
    ('photos-visites', '${E1}/colonies/${R1}/c.jpg', '{"size": 800}', now() - interval '30 days');`);
await en(db, "a@x.fr", E1);
verif(!!(await erreur(db, `select * from public.photos_a_nettoyer(7)`)), "application : ne peut pas lister les fichiers à nettoyer");
await db.exec("reset role; set role service_role;");
const l = (await db.query(`select exploitation_id, chemin, octets from public.photos_a_nettoyer(7)`)).rows;
const ch = l.map((x) => x.chemin).sort();
verif(ch.join() === [`${E1}/vieux-orphelin.jpg`, `${E2}/vieux-orphelin-b.jpg`].sort().join(), `seuls les vieux fichiers sans fiche sont listés : ${ch.join(" | ")}`);
verif(!ch.some((c) => c.includes("recent")), "fichier de moins de 7 jours : protégé (envoi peut-être en cours)");
verif(!ch.some((c) => c.includes("/colonies/")), "photo de colonie avec sa fiche : jamais listée");
verif(!ch.some((c) => c.startsWith("sans-dossier")), "fichier hors dossier d'exploitation : jamais listé");
verif(!ch.some((c) => c.endsWith(".pdf")), "autre stockage (factures) : jamais listé");
verif(l.find((x) => x.chemin.endsWith("vieux-orphelin.jpg"))?.exploitation_id === E1, "chaque fichier porte son exploitation");
verif((await db.query(`select * from public.photos_a_nettoyer(1)`)).rows.length === 3, "délai d'un jour : le fichier récent devient candidat");
verif((await db.query(`select * from public.photos_a_nettoyer(0)`)).rows.length === 3, "délai de 0 : ramené à 1 jour au moins");
await db.exec("reset role");
fin("Migration 035");
