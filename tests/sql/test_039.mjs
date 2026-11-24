// Tests SQL de la migration 039 : attente, fin de la carte, sexe effacé, jours d'utilisation, comparaison avec le
// département, tableau de bord de l'équipe (masquage des petits groupes, réservé aux administrateurs).
// Usage (depuis la racine du dépôt) : node tests/sql/test_039.mjs
import fs from "node:fs";
import { base, deuxExploitations, donnees, en, verificateur, erreur, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "038-carte-fidelite.sql" });
await deuxExploitations(db);
await donnees(db);
await db.exec(`reset role;
  insert into public.profils (email, prenom, sexe, code_postal, departement, source, colonies, stats_ok, created_at)
  values ('a@x.fr', 'Anne', 'femme', '35000', '35', 'syndicat', '1-10', true, now() - interval '40 days'),
         ('b@x.fr', 'Bruno', 'homme', '35700', '35', 'syndicat', '11-50', true, now() - interval '3 days');`);
const sql = fs.readFileSync("migrations/039-mieux-connaitre-usage.sql", "utf8");
try { await db.exec(sql); verif(true, "039 appliquée sur une base avec données"); } catch (e) { verif(false, "039 : " + e.message); fin("Migration 039"); }
try { await db.exec(sql); verif(true, "039 relançable"); } catch (e) { verif(false, "039 relancée : " + e.message); }

const val = async (q, p) => (await db.query(q, p)).rows[0];
await db.exec("reset role");
verif((await val("select count(*)::int as n from public.profils where sexe <> ''")).n === 0, "sexes déjà donnés : effacés");
verif(!!(await erreur(db, "update public.profils set attente = 'licorne' where email = 'a@x.fr'")), "attente : valeur inconnue refusée");

// Profil : sa propre ligne, attente et fin de carte.
await en(db, "a@x.fr", E1);
verif(!(await erreur(db, "update public.profils set attente = 'vendre', mieux_connaitre_fin = now() where email = 'a@x.fr'")), "chacun écrit son attente et la fin de la carte");
verif(!(await erreur(db, "update public.profils set sexe = 'femme' where email = 'a@x.fr'")), "ancienne version : le sexe s'écrit encore (accepté)");

// Jours d'utilisation : noter_activite, jamais lisible par l'application.
verif(!(await erreur(db, "select public.noter_activite(array['dash','ruches','DROP TABLE x'], 'web')")), "noter_activite");
verif(!(await erreur(db, "select public.noter_activite(array['ventes'], 'ios')")), "noter_activite deux fois le même jour");
verif(!!(await erreur(db, "select * from public.activite_jours")), "activite_jours : illisible par l'application");
verif(!!(await erreur(db, "insert into public.activite_jours (email) values ('a@x.fr')")), "activite_jours : pas d'écriture directe");
await db.exec("reset role");
const j = await val("select rubriques, plateforme from public.activite_jours where email = 'a@x.fr'");
verif(JSON.stringify(j.rubriques) === JSON.stringify(["dash", "ruches", "ventes"]) && j.plateforme === "ios", "un jour : rubriques réunies, mot douteux écarté : " + JSON.stringify(j));
await en(db, "a@x.fr", E1);
await db.exec("update public.profils set stats_ok = false where email = 'a@x.fr'; select public.noter_activite(array['dash'], 'web');");
await db.exec("reset role");
verif((await val("select count(*)::int as n from public.activite_jours where email = 'a@x.fr'")).n === 0, "statistiques refusées : rien noté, jours effacés");
await db.exec("update public.profils set stats_ok = true where email = 'a@x.fr'");
await en(db, "", null);
verif(!!(await erreur(db, "select public.noter_activite(array['dash'], 'web')")), "anonyme : refusé");

// Comparaison avec le département : seulement à partir de 5 personnes.
await en(db, "a@x.fr", E1);
let c = (await val("select public.comparaison_departement() as c")).c;
verif(c.departement === "35" && c.assez === false, "département à 1 autre personne : pas de comparaison : " + JSON.stringify(c));
await db.exec(`reset role;
  insert into public.exploitations (id, nom, cree_par) select gen_random_uuid(), 'E' || g, 'p' || g || '@x.fr' from generate_series(1, 5) g;
  insert into public.membres (exploitation_id, email, role, ajoute_par) select e.id, e.cree_par, 'responsable', '' from public.exploitations e where e.nom ~ '^E[0-9]$';
  insert into public.profils (email, departement, code_postal, stats_ok) select 'p' || g || '@x.fr', '35', '35000', true from generate_series(1, 5) g;
  insert into public.ruches (id, nom, etat, exploitation_id) select gen_random_uuid(), 'R', 'Bonne', e.id from public.exploitations e where e.nom ~ '^E[0-9]$';
  insert into public.visites (id, ruche_id, activite, provisions, reine, exploitation_id, date_visite)
    select gen_random_uuid(), r.id, 'Normale', 'Moyennes', 'Vue', r.exploitation_id, current_date from public.ruches r where r.nom = 'R';`);
await en(db, "a@x.fr", E1);
c = (await val("select public.comparaison_departement() as c")).c;
verif(c.assez === true && c.personnes === 6 && Number(c.moyenne) > 0 && typeof c.moi === "number", "6 personnes : moyenne et visites du mois : " + JSON.stringify(c));
verif(!JSON.stringify(c).includes("@"), "comparaison : aucune adresse");

// Tableau de bord : réservé à l'équipe.
verif(!!(await erreur(db, "select public.admin_stats_utilisateurs(30)")), "tableau de bord : refusé hors équipe");
await db.exec("reset role; insert into public.administrateurs_apiviz (email) values ('a@x.fr') on conflict do nothing;");
await en(db, "a@x.fr", E1);
const s = (await val("select public.admin_stats_utilisateurs(30) as s")).s;
verif(s.inscrits === 7 && s.jours === 30, "inscrits comptés : " + s.inscrits);
verif(JSON.stringify(s.departements) === JSON.stringify([{ k: "35", n: 7 }]) && s.departements_autres === 0, "département à 7 personnes montré");
verif(s.sources.length === 0 && s.sources_autres === 2, "source à 2 personnes : masquée, comptée dans « autres »");
verif(s.colonies.length === 0, "tranches de colonies sous 5 : masquées");
verif(s.reponses && s.reponses.code_postal === 100 && s.reponses.source < 50, "taux de réponse par question : " + JSON.stringify(s.reponses));
verif(!JSON.stringify(s).includes("@x.fr"), "tableau de bord : aucune adresse");
verif(!!(await erreur(db, "select * from public.stats_profils")), "stats_profils : toujours fermée à l'application");
await db.exec("reset role");
const q = (await db.query("select distinct question from public.stats_profils")).rows.map((x) => x.question);
verif(!q.includes("sexe"), "stats_profils sans le sexe : " + q.join(", "));

await en(db, "b@x.fr", E2);
verif(!!(await erreur(db, "select public.admin_stats_utilisateurs(30)")), "B : refusé");
fin("Migration 039");
