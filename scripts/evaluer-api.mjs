// Rejoue les 30 questions de référence d'API (tests/assistant/questions.json) sur la fonction « assistant » de la
// recette, et contrôle chaque réponse : format en quatre blocs, références vers des fiches existantes, aucune
// posologie, recommandation sanitaire sourcée, mots attendus. Écrit un rapport lisible (Markdown) à relire à la main.
//
// REFUSE DE S'EXÉCUTER SUR LA PRODUCTION. Chaque question compte dans le plafond du jour du compte d'essai (30).
//
// Usage (depuis la racine du dépôt, Node 18 ou plus) :
//   APIDOO_DEMO_EMAIL=… APIDOO_DEMO_MOT_DE_PASSE=… node scripts/evaluer-api.mjs [rapport.md]
// Le compte d'essai doit être membre d'une exploitation de la recette (idéalement celle de démonstration).
import fs from "node:fs";
import vm from "node:vm";
import { erreursFormat, contientPosologie, estSanitaire, sourceOfficielle } from "../supabase/functions/assistant/regles.js";

const PRODUCTION = "xkucyqzlqfeyuomrtjbu";
const ctx = { window: {}, document: { documentElement: { classList: { add() {} } } } };
vm.runInNewContext(fs.readFileSync("environnements/recette/config.js", "utf8"), ctx);
const { url, key } = ctx.window.APIDOO;
if (url.includes(PRODUCTION) || fs.readFileSync("config.js", "utf8").includes(new URL(url).host)) { console.error("REFUS : base de production."); process.exit(2); }
const email = process.env.APIDOO_DEMO_EMAIL, motDePasse = process.env.APIDOO_DEMO_MOT_DE_PASSE;
if (!email || !motDePasse) { console.error("REFUS : indiquez APIDOO_DEMO_EMAIL et APIDOO_DEMO_MOT_DE_PASSE."); process.exit(2); }

const sansAccent = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const session = await (await fetch(`${url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: motDePasse }) })).json();
if (!session.access_token) { console.error("Connexion refusée : " + (session.error_description || session.msg || "?")); process.exit(1); }
const h = (x) => ({ apikey: key, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", ...(x ? { "x-exploitation": x } : {}) });
const miennes = await (await fetch(`${url}/rest/v1/rpc/mes_exploitations`, { method: "POST", headers: h(), body: "{}" })).json();
const expl = (miennes.find((e) => /d[ée]mo/i.test(e.nom)) || miennes[0])?.id;
if (!expl) { console.error("Le compte d'essai n'est membre d'aucune exploitation."); process.exit(1); }
const lire = async (t, sel) => (await (await fetch(`${url}/rest/v1/${t}?select=${sel}`, { headers: h(expl) })).json());
const existants = new Set((await Promise.all(["ruches", "ruchers", "visites", "taches", "lots", "ventes", "clients", "depenses", "recoltes", "articles"].map((t) => lire(t, "id")))).flat().map((x) => x.id));

const { questions } = JSON.parse(fs.readFileSync("tests/assistant/questions.json", "utf8"));
const lignes = [`# Évaluation d'API — ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`, "", `Exploitation : ${miennes.find((e) => e.id === expl)?.nom} · ${questions.length} questions`, ""];
let ok = 0;
for (const q of questions) {
  const t0 = Date.now();
  const x = q.autre_exploitation ? "00000000-0000-4000-8000-000000000000" : expl;
  const rep = await fetch(`${url}/functions/v1/assistant`, { method: "POST", headers: h(x), body: JSON.stringify({ question: q.question, historique: q.historique || [] }) });
  const j = await rep.json().catch(() => ({}));
  const r = j.reponse, pb = [];
  if (!rep.ok || !r) pb.push(`erreur ${rep.status} : ${j.erreur || "?"}`);
  else {
    pb.push(...erreursFormat(r));
    const refs = r.faits.flatMap((f) => f.refs);
    if (refs.some((y) => !existants.has(y.id))) pb.push("référence vers une fiche inexistante");
    if ((q.refs_min || 0) > refs.length) pb.push(`au moins ${q.refs_min} lien(s) vers une fiche attendu(s)`);
    for (const c of r.recommandations) {
      if (contientPosologie(c.texte) && (c.sanitaire || estSanitaire(c.texte))) pb.push("posologie dans une recommandation : " + c.texte);
      if ((c.sanitaire || estSanitaire(c.texte)) && !sourceOfficielle(c.source) && !/v[ée]t[ée]rinaire|gdsa/i.test(c.texte)) pb.push("recommandation sanitaire sans source : " + c.texte);
    }
    const tout = sansAccent(JSON.stringify(r));
    for (const m of q.doit || []) if (!tout.includes(m)) pb.push(`« ${m} » attendu`);
    for (const m of q.ne_doit_pas || []) if (tout.includes(m)) pb.push(`« ${m} » ne devait pas apparaître`);
  }
  if (!pb.length) ok++;
  console.log(`${pb.length ? "ECHEC" : "OK   "} ${q.id} ${q.question}${pb.length ? " — " + pb.join(" ; ") : ""}`);
  lignes.push(`## ${q.id} · ${q.theme} — ${pb.length ? "à revoir" : "contrôles automatiques bons"}`, "", `**Question :** ${q.question}`, "", `**Attendu :** ${q.attendu}`, "",
    r ? [`**Résumé :** ${r.resume}`, ...["faits", "hypotheses", "recommandations", "manques"].map((k) => `- *${k}* : ${(r[k] || []).map((y) => typeof y === "string" ? y : y.texte + (y.date ? ` (${y.date})` : "") + (y.refs?.length ? ` [${y.refs.map((z) => z.libelle).join(", ")}]` : "") + (y.source ? ` — source : ${y.source.titre}` : "")).join(" · ") || "—"}`)].join("\n") : "",
    "", `Lectures : ${(j.lus || []).join(", ") || "aucune"} · ${((Date.now() - t0) / 1000).toFixed(1)} s${pb.length ? "\n\n**Problèmes :** " + pb.join(" ; ") : ""}`, "");
}
lignes.splice(3, 0, `**${ok}/${questions.length}** questions passent les contrôles automatiques. Le contenu reste à relire (« Attendu »).`, "");
const sortie = process.argv[2] || "evaluation-api.md";
fs.writeFileSync(sortie, lignes.join("\n"));
console.log(`\n${ok}/${questions.length} — rapport : ${sortie}`);
process.exit(ok === questions.length ? 0 : 1);
