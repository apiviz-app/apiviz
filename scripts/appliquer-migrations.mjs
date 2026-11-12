// Met une base à jour avant la mise en ligne : trouve à quelle migration du dépôt la base correspond, puis applique
// celles qui suivent, dans l'ordre, chacune dans sa transaction (tout ou rien). Lancé par « Mise en ligne » quand le
// secret de connexion de la cible existe (BASE_RECETTE, BASE_PRODUCTION) : la mise en ligne en production ne s'arrête
// plus sur « la base ne correspond pas aux migrations ».
//
// Principe (aucune table de suivi, aucune migration relancée) :
//   1. La structure de la base est lue par le catalogue : colonnes, fonctions (corps sans les espaces), politiques,
//      déclencheurs, contraintes, index du schéma public (et politiques de storage).
//   2. Les fichiers sont rejoués un par un sur un Postgres vide en mémoire (PGlite) ; la base « en est » à la dernière
//      migration après laquelle le rejeu a exactement la même structure.
//   3. Si aucune étape ne correspond (base modifiée hors fichier), rien n'est appliqué : les écarts sont affichés.
//   4. Chaque migration suivante est appliquée dans une transaction ; après chacune, la structure doit être celle du
//      rejeu, sinon on s'arrête. Une erreur annule la migration en cours et arrête tout : rien n'est publié.
//
// Usage : BASE="postgresql://…" node scripts/appliquer-migrations.mjs [--simuler]
//   BASE : chaîne de connexion Postgres (Supabase › Connect › Session pooler). Jamais dans le dépôt : secret GitHub.
//   --simuler : dit ce qui serait appliqué, sans rien écrire.
// Prérequis (hors dépôt) : npm i @electric-sql/pglite@0.2 pg@8
// Sortie : 0 si la base est à jour (ou vient d'être mise à jour), 1 sinon.
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { ORDRE, SUPABASE } from "../tests/sql/socle.mjs";

/** Une ligne par objet de structure. Les corps de fonctions sont comparés sans les espaces (indentation libre). */
export const STRUCTURE = `
  select 'colonne ' || c.relname || '.' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod) || case when a.attnotnull then ' not null' else '' end as objet
    from pg_class c join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v')
  union all
  select 'fonction ' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') ' || md5(regexp_replace(p.prosrc, '\\s+', '', 'g'))
    from pg_proc p where p.pronamespace = 'public'::regnamespace
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  union all
  select 'politique ' || schemaname || '.' || tablename || '.' || policyname || ' ' || cmd from pg_policies where schemaname in ('public', 'storage')
  union all
  select 'declencheur ' || c.relname || '.' || t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid
    where c.relnamespace = 'public'::regnamespace and not t.tgisinternal
  union all
  select 'contrainte ' || c.relname || '.' || k.conname || ' ' || k.contype::text from pg_constraint k join pg_class c on c.oid = k.conrelid
    where c.relnamespace = 'public'::regnamespace and k.contype <> 'n'
  union all
  select 'index ' || indexname from pg_indexes where schemaname = 'public'`;

/** Structure d'une base : ensemble d'objets. `lire` : async (sql) => lignes. */
export const structure = async (lire) => new Set((await lire(STRUCTURE)).map((r) => r.objet));

/** Ce qui sépare deux structures : objets attendus absents de la base, objets de la base absents des fichiers. */
export function ecarts(attendu, base) {
  return { manque: [...attendu].filter((x) => !base.has(x)).sort(), enTrop: [...base].filter((x) => !attendu.has(x)).sort() };
}
const pareil = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

/** Rejoue les fichiers sur un Postgres vide : la structure obtenue après chaque migration, dans l'ordre. */
export async function etapes(dossier = "migrations", ordre = ORDRE) {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(SUPABASE);
  const liste = [];
  for (const fichier of ordre) {
    const sql = fs.readFileSync(`${dossier}/${fichier}`, "utf8");
    try { await db.exec(sql); } catch (e) { throw new Error(`${fichier} ne passe pas sur une base vide : ${e.message}`); }
    liste.push({ fichier, sql, structure: await structure(async (q) => (await db.query(q)).rows) });
  }
  await db.close();
  return liste;
}

/**
 * Met la base à jour. `lire` : async (sql) => lignes ; `executer` : async (sql) => rien (plusieurs instructions).
 * Renvoie { version, appliquees } ; lève une erreur (message en français) si la base n'est pas reconnue ou si une
 * migration échoue. Avec `simuler`, n'écrit rien et renvoie ce qui serait appliqué.
 */
export async function mettreAJour({ lire, executer, simuler = false, dire = console.log, liste }) {
  liste ||= await etapes();
  let base = await structure(lire);
  let k = -1;
  for (let i = liste.length - 1; i >= 0 && k < 0; i--) if (pareil(liste[i].structure, base)) k = i;
  if (k < 0) {
    // Étape la plus proche, pour dire ce qui diffère.
    const proche = liste.map((e) => ({ e, d: ecarts(e.structure, base) })).sort((a, b) => (a.d.manque.length + a.d.enTrop.length) - (b.d.manque.length + b.d.enTrop.length))[0];
    const lignes = [...proche.d.manque.map((x) => "  absent de la base : " + x), ...proche.d.enTrop.map((x) => "  absent des fichiers : " + x)];
    throw new Error(`La base ne correspond à aucune étape des migrations du dépôt : rien n'a été appliqué.\n`
      + `Étape la plus proche : après ${proche.e.fichier} (${lignes.length} écart${lignes.length > 1 ? "s" : ""}).\n${lignes.slice(0, 15).join("\n")}`
      + (lignes.length > 15 ? `\n  … et ${lignes.length - 15} autre(s)` : ""));
  }
  const attente = liste.slice(k + 1);
  dire(`La base en est à ${liste[k].fichier}.`);
  if (!attente.length) { dire("Base à jour : aucune migration à appliquer."); return { version: liste[k].fichier, appliquees: [] }; }
  dire(`${attente.length} migration${attente.length > 1 ? "s" : ""} à appliquer : ${attente.map((e) => e.fichier).join(", ")}.`);
  if (simuler) { dire("Simulation : rien n'a été écrit."); return { version: liste[k].fichier, appliquees: [], aAppliquer: attente.map((e) => e.fichier) }; }
  const appliquees = [];
  for (const e of attente) {
    if (!/Casse l'ancienne version\s*:\s*NON/i.test(e.sql)) dire(`Attention : ${e.fichier} n'indique pas « Casse l'ancienne version : NON ».`);
    try {
      // lock_timeout : une table occupée fait échouer la migration plutôt que de bloquer l'application.
      await executer(`begin;\nset local lock_timeout = '20s';\n${e.sql}\n;commit;`);
    } catch (err) {
      try { await executer("rollback;"); } catch { /* connexion perdue : la transaction est annulée par le serveur */ }
      throw new Error(`${e.fichier} a échoué et a été annulée en entier : ${err.message}\n`
        + (appliquees.length ? `Déjà appliquées avant elle : ${appliquees.join(", ")}.` : "Aucune migration n'a été appliquée."));
    }
    base = await structure(lire);
    if (!pareil(e.structure, base)) {
      const d = ecarts(e.structure, base);
      throw new Error(`${e.fichier} est appliquée, mais la structure obtenue n'est pas celle attendue : arrêt.\n`
        + [...d.manque.map((x) => "  absent de la base : " + x), ...d.enTrop.map((x) => "  absent des fichiers : " + x)].slice(0, 15).join("\n"));
    }
    appliquees.push(e.fichier);
    dire(`Appliquée : ${e.fichier}`);
  }
  dire(`Base à jour : ${appliquees.length} migration${appliquees.length > 1 ? "s" : ""} appliquée${appliquees.length > 1 ? "s" : ""}.`);
  return { version: attente.at(-1).fichier, appliquees };
}

// ---------- Ligne de commande ----------
if (process.argv[1] && import.meta.url === new URL(`file://${fs.realpathSync(process.argv[1])}`).href) {
  const url = process.env.BASE;
  if (!url) { console.log("Variable BASE absente : chaîne de connexion Postgres de la base à mettre à jour."); process.exit(2); }
  const { default: pg } = await import("pg");
  // Connexion chiffrée. Le certificat du serveur n'est pas vérifié (autorité propre à Supabase, absente de Node).
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url); // essais sur un poste : pas de chiffrement
  const client = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, connectionTimeoutMillis: 20000 });
  client.on("error", () => {});
  let code = 0;
  try {
    await client.connect();
    const hote = (await client.query("select current_database() b, current_user u")).rows[0];
    console.log(`Connecté (${hote.u}, base ${hote.b}).`);
    await mettreAJour({
      lire: async (q) => (await client.query(q)).rows,
      executer: async (q) => { await client.query(q); },
      simuler: process.argv.includes("--simuler"),
    });
  } catch (e) {
    // Jamais la chaîne de connexion dans le journal (elle contient le mot de passe).
    console.log(String(e.message || e).split(url).join("<BASE>"));
    code = 1;
  } finally { try { await client.end(); } catch { /* déjà fermée */ } }
  process.exit(code);
}
