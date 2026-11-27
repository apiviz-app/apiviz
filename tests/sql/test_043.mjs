// Tests SQL de la migration 043 : abonnements payés (Stripe, plus tard Apple et Google).
// Usage (depuis la racine du dépôt) : node tests/sql/test_043.mjs
import fs from "node:fs";
import { base, deuxExploitations, en, verificateur, erreur, E1, E2 } from "./socle.mjs";

const { verif, fin } = verificateur();
const db = await base({ jusqua: "042-comptes-inactifs.sql" });
await deuxExploitations(db);
// Un essai sans carte en cours sur A, avant 043.
await en(db, "a@x.fr", E1);
await db.exec("select public.demarrer_essai('rucher')");
const sql = fs.readFileSync("migrations/043-paiements.sql", "utf8");
await db.exec("reset role;");
try { await db.exec(sql); verif(true, "043 appliquée sur une base avec un essai en cours"); } catch (e) { verif(false, "043 : " + e.message); // Recharges payées : une seule fois par paiement, service_role seulement.
await en(db, "a@x.fr", E1);
verif(!!(await erreur(db, `select public.crediter_gouttes_payees('${E1}', 400, 'pi_1')`)), "refusé à l'application : crediter_gouttes_payees");
await db.exec("reset role; set role service_role;");
verif((await val(`select public.crediter_gouttes_payees('${E1}', 400, 'pi_1', 'stripe', 'A@x.fr') as r`)).r === true, "recharge pi_1 : 400 gouttes ajoutées");
verif((await val(`select public.crediter_gouttes_payees('${E1}', 400, 'pi_1') as r`)).r === false, "pi_1 renvoyé par Stripe : rien de plus");
let refus = false; try { await db.query(`select public.crediter_gouttes_payees('${E1}', -5, 'pi_2')`); } catch { refus = true; }
verif(refus, "quantité négative refusée");
await db.exec("reset role;");
const g = await val(`select sum(quantite)::int as s, max(email) as m, max(detail->>'paiement') as p from public.gouttes_mouvements where exploitation_id = '${E1}' and nature = 'recharge'`);
verif(g.s === 400 && g.m === "a@x.fr" && g.p === "pi_1", "historique : 400 gouttes, adresse en minuscules, référence du paiement");

fin("Migration 043"); }
try { await db.exec(sql); verif(true, "043 relançable"); } catch (e) { verif(false, "043 relancée : " + e.message); }

const val = async (q) => (await db.query(q)).rows[0];
const ab = async (e = E1) => { await db.exec("reset role;"); return val(`select * from public.abonnements where exploitation_id = '${e}'`); };
const appliquer = async (p) => { await db.exec("reset role; set role service_role;"); return (await db.query("select public.appliquer_abonnement_externe($1::jsonb) as r", [JSON.stringify(p)])).rows[0].r; };

// Rien pour l'application.
await en(db, "a@x.fr", E1);
for (const q of ["select * from public.paiements_clients", "select * from public.paiements_evenements",
  `select public.appliquer_abonnement_externe('{"exploitation_id":"${E1}","canal":"web","offre":"exploitation","statut":"actif","externe":"sub_x"}')`,
  "insert into public.paiements_evenements (id, source) values ('evt_1', 'stripe')"]) {
  verif(!!(await erreur(db, q)), "refusé à l'application : " + q.slice(0, 70));
}
await en(db, null, null);
verif(!!(await erreur(db, "select * from public.paiements_clients")), "refusé à anon : paiements_clients");

// L'essai sans carte se résilie toujours.
let a = await ab();
verif(a.statut === "essai" && a.canal === "manuel" && a.periode === null, "essai existant intact, période vide");

// Paiement web : l'abonnement prend la place de l'essai.
verif(await appliquer({ exploitation_id: E1, canal: "web", offre: "rucher", statut: "actif", fin: null, externe: "sub_1", periode: "an" }) === "rucher", "abonnement web actif : offre Rucher en vigueur");
a = await ab();
verif(a.canal === "web" && a.statut === "actif" && a.fin === null && a.externe === "sub_1" && a.periode === "an" && a.essai_utilise === true, "ligne : web, actif, sans fin, sub_1, an, essai déjà utilisé gardé");
const debut = a.debut;

// Le responsable ne peut pas résilier depuis l'application.
await en(db, "a@x.fr", E1);
const err = await erreur(db, "select public.resilier_abonnement()");
verif(!!err && /Gérer mon abonnement/.test(err), "résilier un abonnement web : refusé, renvoie vers l'espace de paiement");
verif((await ab()).statut === "actif", "toujours actif après le refus");

// Changement d'offre (même abonnement) : début inchangé.
await appliquer({ exploitation_id: E1, canal: "web", offre: "exploitation", statut: "actif", externe: "sub_1", periode: "mois" });
a = await ab();
verif(a.offre === "exploitation" && a.periode === "mois" && +a.debut === +debut, "changement d'offre : Exploitation, au mois, même début");

// Résiliation à échéance (cancel_at_period_end) : reste en vigueur jusqu'à la fin.
const echeance = new Date(Date.now() + 20 * 864e5).toISOString();
verif(await appliquer({ exploitation_id: E1, canal: "web", offre: "exploitation", statut: "resilie", fin: echeance, externe: "sub_1", periode: "mois" }) === "exploitation", "résilié à échéance : toujours Exploitation jusqu'à la fin");
await en(db, "a@x.fr", E1);
verif((await val("select public.mon_offre() as m")).m.abonnement.statut === "resilie", "mon_offre : statut résilié visible");

// Un ancien abonnement résilié ne coupe pas le nouveau.
await appliquer({ exploitation_id: E1, canal: "web", offre: "rucher", statut: "actif", externe: "sub_2", periode: "an" });
a = await ab();
verif(a.externe === "sub_2" && a.statut === "actif" && a.fin === null && +a.debut !== +debut, "nouvel abonnement sub_2 : actif, nouveau début");
verif(await appliquer({ exploitation_id: E1, canal: "web", offre: "exploitation", statut: "resilie", fin: new Date().toISOString(), externe: "sub_1" }) === null, "fin de l'ancien sub_1 : ignorée (null)");
verif((await ab()).externe === "sub_2" && (await ab()).statut === "actif", "sub_2 toujours actif");

// Fin immédiate (abonnement supprimé chez Stripe) : retour à Découverte.
verif(await appliquer({ exploitation_id: E1, canal: "web", offre: "rucher", statut: "resilie", fin: new Date(Date.now() - 1000).toISOString(), externe: "sub_2" }) === "decouverte", "sub_2 supprimé : Découverte");

// Essai avec carte (trialing) sur B, qui n'avait pas de ligne.
verif(await appliquer({ exploitation_id: E2, canal: "web", offre: "rucher", statut: "essai", externe: "sub_b", periode: "mois" }) === "rucher", "B : essai avec carte, Rucher");
a = await ab(E2);
verif(a.statut === "essai" && a.essai_utilise === true && a.canal === "web", "B : essai noté comme utilisé");
await en(db, "b@x.fr", E2);
verif(/Gérer mon abonnement/.test(await erreur(db, "select public.resilier_abonnement()") || ""), "B : arrêter un essai avec carte passe aussi par l'espace de paiement");

// Abonnement Apple : message propre aux stores.
await appliquer({ exploitation_id: E2, canal: "apple", offre: "rucher", statut: "actif", externe: "2000000123" });
await en(db, "b@x.fr", E2);
verif(/iPhone/.test(await erreur(db, "select public.resilier_abonnement()") || ""), "abonnement Apple : se résilie depuis l'iPhone");

// Contrôles d'entrée.
for (const [p, msg] of [
  [{ exploitation_id: E1, canal: "manuel", offre: "rucher", statut: "actif", externe: "x1" }, "canal manuel refusé"],
  [{ exploitation_id: E1, canal: "web", offre: "or", statut: "actif", externe: "x1" }, "offre inconnue refusée"],
  [{ exploitation_id: E1, canal: "web", offre: "rucher", statut: "suspendu", externe: "x1" }, "statut inconnu refusé"],
  [{ exploitation_id: E1, canal: "web", offre: "rucher", statut: "actif" }, "identifiant manquant refusé"],
  [{ exploitation_id: "33333333-3333-4333-8333-333333333333", canal: "web", offre: "rucher", statut: "actif", externe: "x1" }, "exploitation inconnue refusée"],
]) {
  let ok = false; try { await appliquer(p); } catch { ok = true; }
  verif(ok, msg);
}
await db.exec("reset role;");

// Abonnement manuel (équipe) : la résiliation reste possible.
await db.exec(`insert into public.abonnements (exploitation_id, offre, statut, canal) values ('${E1}', 'rucher', 'actif', 'manuel')
  on conflict (exploitation_id) do update set offre = 'rucher', statut = 'actif', canal = 'manuel', fin = null, externe = null`);
await en(db, "a@x.fr", E1);
verif(!(await erreur(db, "select public.resilier_abonnement()")), "abonnement manuel : résiliable");
await en(db, "a2@x.fr", E1);
verif(!!(await erreur(db, "select public.resilier_abonnement()")), "un simple membre ne résilie pas");

// Recharges payées : une seule fois par paiement, service_role seulement.
await en(db, "a@x.fr", E1);
verif(!!(await erreur(db, `select public.crediter_gouttes_payees('${E1}', 400, 'pi_1')`)), "refusé à l'application : crediter_gouttes_payees");
await db.exec("reset role; set role service_role;");
verif((await val(`select public.crediter_gouttes_payees('${E1}', 400, 'pi_1', 'stripe', 'A@x.fr') as r`)).r === true, "recharge pi_1 : 400 gouttes ajoutées");
verif((await val(`select public.crediter_gouttes_payees('${E1}', 400, 'pi_1') as r`)).r === false, "pi_1 renvoyé par Stripe : rien de plus");
let refus = false; try { await db.query(`select public.crediter_gouttes_payees('${E1}', -5, 'pi_2')`); } catch { refus = true; }
verif(refus, "quantité négative refusée");
await db.exec("reset role;");
const g = await val(`select sum(quantite)::int as s, max(email) as m, max(detail->>'paiement') as p from public.gouttes_mouvements where exploitation_id = '${E1}' and nature = 'recharge'`);
verif(g.s === 400 && g.m === "a@x.fr" && g.p === "pi_1", "historique : 400 gouttes, adresse en minuscules, référence du paiement");

fin("Migration 043");
