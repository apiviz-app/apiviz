// Tests SQL de la migration 025 : fichier de la facture d'un achat (corrections du 17 nov. 2026).
// Usage (depuis la racine du dépôt) : node tests/sql/test_025.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "024-assistant-usage.sql" });
await deuxExploitations(db);
await donnees(db);
const sql = fs.readFileSync("migrations/025-factures-fichiers.sql", "utf8");
try { await db.exec(sql); verif(true, "025 appliquée sur une base avec données"); } catch (e) { verif(false, "025 : " + e.message); fin("Migration 025"); }
try { await db.exec(sql); verif(true, "025 relançable"); } catch (e) { verif(false, "025 relancée : " + e.message); }

const val = async (q) => (await db.query(q)).rows[0];
await db.exec("reset role");
const b = await val(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'factures'`);
verif(b && b.public === false && Number(b.file_size_limit) === 10485760, "espace « factures » privé, 10 Mo");
verif(b && b.allowed_mime_types.includes("application/pdf") && b.allowed_mime_types.includes("image/jpeg"), "PDF et photos acceptés");
verif((await val(`select count(*)::int n from public.depenses where fichier <> ''`)).n === 0, "les dépenses existantes n'ont pas de fichier");

// Un membre joint la facture de son exploitation ; il ne touche pas à celle d'une autre.
const chemin = (ex) => `${ex}/aaaaaaaa-0000-4000-8000-00000000000a/facture.pdf`;
await en(db, "a2@x.fr", E1);
verif(!(await erreur(db, `insert into storage.objects (bucket_id, name, metadata) values ('factures', '${chemin(E1)}', '{"size": 1000}')`)), "membre : ajoute la facture de son exploitation");
verif(!!(await erreur(db, `insert into storage.objects (bucket_id, name, metadata) values ('factures', '${chemin(E2)}', '{"size": 1000}')`)), "membre : refusé dans une autre exploitation");
const ligne = (await db.query(`select id from public.depenses limit 1`)).rows[0];
if (ligne) {
  await db.exec(`update public.depenses set fichier = '${chemin(E1)}' where id = '${ligne.id}'`);
  verif((await val(`select fichier from public.depenses where id = '${ligne.id}'`)).fichier === chemin(E1), "membre : le chemin s'enregistre sur la dépense");
}

// Un lecteur voit la facture, ne l'efface pas.
await en(db, "l@x.fr", E1);
verif((await db.query(`select name from storage.objects where bucket_id = 'factures'`)).rows.length === 1, "lecteur : voit la facture");
await db.exec(`delete from storage.objects where bucket_id = 'factures'`);
await en(db, "a@x.fr", E1);
verif((await db.query(`select name from storage.objects where bucket_id = 'factures'`)).rows.length === 1, "lecteur : la suppression n'a rien fait");

// L'autre exploitation ne voit rien.
await en(db, "b@x.fr", E2);
verif((await db.query(`select name from storage.objects where bucket_id = 'factures'`)).rows.length === 0, "autre exploitation : ne voit pas la facture");

// Le responsable peut la retirer.
await en(db, "a@x.fr", E1);
await db.exec(`delete from storage.objects where bucket_id = 'factures'`);
await db.exec("reset role");
verif((await val(`select count(*)::int n from storage.objects where bucket_id = 'factures'`)).n === 0, "responsable : retire la facture");

// Les photos de visite ne sont pas touchées.
verif((await val(`select count(*)::int n from storage.objects where bucket_id = 'photos-visites'`)).n > 0, "photos de visite intactes");
fin("Migration 025");
