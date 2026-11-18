// Apiviz — ruches physiques (contenants), section de l'écran Matériel (IT-06, AP-FEAT-031, AP-TECH-110 à 113).
// Visible seulement si le suivi est activé dans les réglages (niveau Professionnel) : sinon, aucun écran contenant.
// Une ruche physique : numéro peint sur la caisse, type, état, date d'achat, lien facultatif vers un article
// d'équipement du matériel. L'occupation (quelle colonie dedans) se change depuis la fiche de la colonie.
import * as C from "./regles.js";
import * as A from "./regles-assemblage.js";
import { contenantsSuivis } from "./fiche.js";
import { stockSuivi } from "../materiel/catalogue.js";

const e = (t) => esc(t);
export const ETATS = { bon: "Bon état", a_reparer: "À réparer", hors_service: "Hors service" };
const TYPES = ["Dadant 10 cadres", "Dadant 12 cadres", "Langstroth", "Warré", "Ruchette 5 cadres", "Ruchette 6 cadres"];

/** Section « Ruches physiques » ajoutée à l'écran Matériel. */
export function completerMateriel() {
  if (S.route !== "materiel" || !contenantsSuivis()) return;
  const d = S.d, l = (d.contenants || []).slice().sort((a, b) => String(a.code).localeCompare(String(b.code), "fr", { numeric: true }));
  const libres = l.filter((c) => c.etat !== "hors_service" && !C.occupant(d.occupations, d.ruches, c.id)).length;
  const lignes = l.map((c) => {
    const occ = C.occupant(d.occupations, d.ruches, c.id);
    return `<button type="button" class="u-todo" data-act="ctmodifier" data-v="${e(c.id)}"><span class="u-dot bg-${c.etat === "bon" ? (occ ? "good" : "watch") : "crit"}" aria-hidden="true"></span>
      <span class="u-todo-t"><b>N° ${e(c.code)}${c.type ? " · " + e(c.type) : ""}</b><span class="small">${occ ? "Occupée par " + e(occ.nom) : "Libre"}${c.etat !== "bon" ? " · " + e(ETATS[c.etat]) : ""}</span></span><span class="u-chev" aria-hidden="true">›</span></button>`;
  }).join("");
  document.querySelector(".wrap")?.insertAdjacentHTML("beforeend", `<section class="card u-liste ct-liste"><div class="u-entete"><h2>Ruches physiques <span class="small">· ${l.length}${l.length ? `, ${libres} libre${libres > 1 ? "s" : ""}` : ""}</span></h2>
    <span class="ct-liens">${assemblageDispo() ? '<button type="button" class="link" data-act="ctcompo">Compositions</button>' : ""}<button type="button" class="link" data-act="ctajouter">Ajouter</button></span></div>
    ${lignes || '<p class="small">Numérote tes caisses pour suivre les transferts de colonies d’une caisse à l’autre.</p>'}</section>`);
}

const equipements = () => [["", "Aucun"], ...(S.d.articles || []).filter((a) => a.type === "Équipement").map((a) => [a.id, a.nom])];

function formulaire(c) {
  sheet({
    title: c ? `Ruche physique n° ${c.code}` : "Ajouter des ruches physiques",
    intro: c ? "" : "Pour en ajouter plusieurs d’un coup, indique le dernier numéro.",
    fields: [
      { name: "code", label: c ? "Numéro" : "Premier numéro", required: !0, value: c?.code ?? "" },
      ...(c ? [] : [{ name: "jusqua", label: "Dernier numéro (facultatif)", type: "number", step: "1", min: 1, value: "" }]),
      { name: "type", label: "Type", value: c?.type ?? "", list: TYPES },
      { name: "etat", label: "État", type: "select", options: Object.entries(ETATS), value: c?.etat ?? "bon" },
      { name: "achat_le", label: "Achetée le (facultatif)", type: "date", value: c?.achat_le ?? "" },
      { name: "article_id", label: "Article du matériel (facultatif)", type: "select", options: equipements(), value: c?.article_id ?? "" },
      { name: "notes", label: "Notes", type: "textarea", value: c?.notes ?? "" },
    ],
    submit: (f) => {
      const champs = { type: f.type.trim(), etat: f.etat, achat_le: f.achat_le || null, article_id: f.article_id || null, notes: f.notes.trim() };
      if (c) return write(sb.from("contenants").update({ code: f.code.trim(), ...champs }).eq("id", c.id), "Ruche physique enregistrée");
      const codes = numeros(f.code, f.jusqua);
      if (!codes) throw new Error("Le dernier numéro doit suivre le premier (200 caisses au plus d’un coup).");
      const pris = new Set((S.d.contenants || []).map((x) => String(x.code).trim().toLowerCase()));
      const doublon = codes.find((k) => pris.has(k.toLowerCase()));
      if (doublon) throw new Error(`Le numéro ${doublon} existe déjà.`);
      if (assemblageDispo()) return assembler(codes, champs, f.as_garder === "on");
      return write(sb.from("contenants").insert(codes.map((code) => ({ id: crypto.randomUUID(), code, ...champs }))),
        codes.length > 1 ? `${codes.length} ruches physiques ajoutées` : "Ruche physique ajoutée");
    },
    del: c && !(S.d.occupations || []).some((o) => o.contenant_id === c.id) ? () => write(sb.from("contenants").delete().eq("id", c.id), "Ruche physique supprimée") : null,
  });
}

/** Numéros à créer : un seul, ou une suite « 12 » à « 20 ». null si la suite n'a pas de sens. */
export function numeros(premier, dernier) {
  const a = String(premier || "").trim();
  if (!a) return null;
  if (dernier === "" || dernier == null) return [a];
  const x = Number(a), y = Number(dernier);
  if (!Number.isInteger(x) || !Number.isInteger(y) || y < x || y - x >= 200) return null;
  return Array.from({ length: y - x + 1 }, (_, i) => String(x + i));
}

export const actions = {
  ctajouter: () => { formulaire(null); if (assemblageDispo()) monterPieces("ajout"); },
  ctcompo: () => composer(),
  ctmodifier: (id) => formulaire((S.d.contenants || []).find((c) => c.id === id)),
};

// ---------- Assemblage : pièces prises dans le stock (migration 026, maquettes du 17 nov. 2026) ----------
// Chaque type de ruche a une composition par défaut (plancher, corps, cadres…) qui pré-remplit l'ajout ; les pièces
// sont retirées du stock à la création. Une pièce qui manque est signalée, mais n'empêche pas de créer (choix de
// Pierre-Louis) : le stock passe en négatif.

const appel = (nom, args) => (typeof HL != "undefined" ? HL.rpc(nom, args) : sb.rpc(nom, args));
const nb = (v) => Number(v || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** L'assemblage demande le journal du stock (018) et les compositions (026). */
export const assemblageDispo = () => contenantsSuivis() && stockSuivi() && !S.absentes?.has("compositions");

const AS = { mode: "ajout", type: "", pieces: [] };

/** Nombre de ruches que créera le formulaire (1 tant que la suite n'est pas lisible). */
function nombre() {
  if (AS.mode !== "ajout") return 1;
  const fd = new FormData($sheetForm);
  return numeros(fd.get("code"), fd.get("jusqua"))?.length || 1;
}

/** Ajoute la section « Pièces prises dans le stock » au formulaire ouvert, juste après le champ Type. */
function monterPieces(mode) {
  AS.mode = mode;
  AS.type = String($sheetForm.elements.type?.value || "").trim();
  AS.pieces = A.composition(S.d, AS.type);
  const ancre = $sheetForm.elements.type?.closest("label");
  if (!ancre) return;
  ancre.insertAdjacentHTML("afterend", '<section class="asm-pieces" aria-labelledby="asm-titre"></section>');
  dessiner();
  $sheetForm.addEventListener("input", surSaisie);
  $sheetForm.addEventListener("click", surClic);
  $sheetForm.addEventListener("change", surChoix);
  $sheet.addEventListener("close", () => {
    $sheetForm.removeEventListener("input", surSaisie);
    $sheetForm.removeEventListener("click", surClic);
    $sheetForm.removeEventListener("change", surChoix);
  }, { once: true });
}

function dessiner() {
  const zone = $sheetForm.querySelector(".asm-pieces");
  if (!zone) return;
  const ajout = AS.mode === "ajout", dans = new Set(AS.pieces.map((p) => p.article_id));
  const autres = (S.d.articles || []).filter((a) => !dans.has(a.id)).sort((a, b) => String(a.nom).localeCompare(String(b.nom), "fr"));
  const parId = new Map((S.d.articles || []).map((a) => [a.id, a]));
  const lignes = AS.pieces.map((p, i) => {
    const a = parId.get(p.article_id);
    if (!a) return "";
    return `<div class="asm-l" data-i="${i}"><span class="asm-l-t"><b>${e(a.nom)}</b><span class="small asm-info"></span></span>
      <span class="asm-pas"><button type="button" data-as="moins" data-i="${i}" aria-label="Une ${e(a.nom)} de moins">−</button>
      <input type="number" inputmode="decimal" min="0" step="any" data-as-q="${i}" value="${e(p.quantite)}" aria-label="${e(a.nom)} par ruche">
      <button type="button" data-as="plus" data-i="${i}" aria-label="Une ${e(a.nom)} de plus">+</button></span></div>`;
  }).join("");
  const compose = A.composition(S.d, AS.type).length > 0;
  zone.innerHTML = `<div class="asm-tete"><h3 id="asm-titre">${ajout ? "Pièces prises dans le stock" : "Pièces pour une ruche"}</h3><span class="small asm-pour"></span></div>
    <p class="small asm-aide">${ajout ? (compose ? `Pré-rempli selon la composition « ${e(AS.type)} ». Quantités pour une ruche ; ajuste si besoin.`
      : AS.type ? `Pas encore de composition pour « ${e(AS.type)} » : ajoute les pièces, quantités pour une ruche.` : "Choisis un type pour pré-remplir les pièces.")
      : "Elles pré-rempliront l’ajout de ruches de ce type et seront retirées du stock."}</p>
    <p class="asm-alerte" role="status" hidden></p>
    <div class="asm-lignes">${lignes || '<p class="small asm-vide">Aucune pièce.</p>'}</div>
    ${autres.length ? `<label class="asm-ajout">Ajouter une pièce du stock<select data-as-ajout="1"><option value="">Choisir un article…</option>${autres.map((a) =>
      `<option value="${e(a.id)}">${e(a.nom)} · ${nb(a.stock)} en stock</option>`).join("")}</select></label>`
      : (S.d.articles || []).length ? "" : '<p class="small">Ton matériel est vide : ajoute d’abord tes pièces (planchers, corps, cadres…) à l’écran Matériel.</p>'}
    ${ajout && AS.type ? `<label class="asm-garder"><input type="checkbox" name="as_garder"${compose ? "" : " checked"}> ${compose ? "Mettre à jour" : "Garder"} ces pièces comme composition « ${e(AS.type)} »</label>` : ""}`;
  infos();
}

/** Textes qui suivent la saisie sans redessiner les champs : stock après, manques, nombre de ruches. */
function infos() {
  const zone = $sheetForm.querySelector(".asm-pieces");
  if (!zone) return;
  const n = nombre(), b = A.bilan(S.d, AS.pieces, n), parArticle = new Map(b.lignes.map((l) => [l.article.id, l]));
  zone.querySelector(".asm-pour").textContent = AS.mode === "ajout" ? `pour ${n} ruche${n > 1 ? "s" : ""}` : "";
  AS.pieces.forEach((p, i) => {
    const info = zone.querySelector(`.asm-l[data-i="${i}"] .asm-info`), ligne = zone.querySelector(`.asm-l[data-i="${i}"]`);
    if (!info) return;
    const l = parArticle.get(p.article_id), a = (S.d.articles || []).find((x) => x.id === p.article_id);
    ligne.classList.toggle("manque", !!l?.manque && AS.mode === "ajout");
    info.textContent = AS.mode !== "ajout" ? `${nb(a?.stock)} en stock`
      : !l ? `${nb(a?.stock)} en stock · pas retirée`
      : l.manque ? `${nb(l.total)} en tout · ${nb(l.avant)} en stock, il en manque ${nb(l.manque)}`
      : `${nb(l.total)} en tout · ${nb(l.avant)} en stock → ${nb(l.apres)}`;
  });
  const alerte = zone.querySelector(".asm-alerte"), phrase = AS.mode === "ajout" ? A.phraseManque(b) : "";
  alerte.hidden = !phrase;
  alerte.textContent = phrase ? `${phrase} Tu peux créer quand même : le stock passera en négatif.` : "";
  const bouton = $sheetForm.querySelector(".actions .btn.main");
  if (bouton && AS.mode === "ajout") bouton.textContent = b.lignes.length ? `Créer ${n > 1 ? n + " ruches" : "la ruche"} et retirer du stock` : (n > 1 ? `Créer ${n} ruches` : "Enregistrer");
}

function surSaisie(ev) {
  const t = ev.target;
  if (t.name === "type") {
    const type = String(t.value || "").trim();
    // Réglage : la composition du type choisi. Ajout : un type sans composition garde les pièces déjà choisies.
    if (AS.mode !== "ajout" || A.composition(S.d, type).length || !AS.pieces.length) AS.pieces = A.composition(S.d, type);
    AS.type = type;
    dessiner();
  } else if (t.dataset?.asQ != null) {
    AS.pieces[Number(t.dataset.asQ)].quantite = Math.max(0, Number(String(t.value).replace(",", ".")) || 0);
    infos();
  } else if (t.name === "code" || t.name === "jusqua") infos();
}

function surClic(ev) {
  const b = ev.target.closest("button[data-as]");
  if (!b) return;
  const p = AS.pieces[Number(b.dataset.i)];
  if (!p) return;
  p.quantite = Math.max(0, Math.round((Number(p.quantite) + (b.dataset.as === "plus" ? 1 : -1)) * 100) / 100);
  if (p.quantite === 0) AS.pieces.splice(Number(b.dataset.i), 1);
  dessiner();
}

function surChoix(ev) {
  const t = ev.target;
  if (!t.dataset?.asAjout || !t.value) return;
  AS.pieces.push({ article_id: t.value, quantite: 1 });
  dessiner();
  $sheetForm.querySelector(`[data-as-q="${AS.pieces.length - 1}"]`)?.focus();
}

const piecesAEnvoyer = () => AS.pieces.filter((p) => Number(p.quantite) > 0).map((p) => ({ article_id: p.article_id, quantite: Number(p.quantite) }));

/** Création des ruches physiques et sortie de leurs pièces, en une seule écriture (assembler_ruches, 026). */
async function assembler(codes, champs, garder) {
  const pieces = piecesAEnvoyer();
  const p = { ruches: codes.map((code) => ({ id: crypto.randomUUID(), code })), ...champs, date: today(), pieces };
  const { error, local } = await appel("assembler_ruches", { p });
  if (error) throw error;
  if (garder && champs.type && pieces.length) {
    const r = await appel("enregistrer_composition", { p: { type: champs.type, pieces } });
    if (r.error) toast("Ruches créées, mais la composition n’a pas été gardée : " + (r.error.message || r.error), !0);
  }
  const quoi = codes.length > 1 ? `${codes.length} ruches physiques ajoutées` : "Ruche physique ajoutée";
  if (local) {
    A.appliquer(S.d, p, { _attente: true });
    typeof HL != "undefined" && HL.garderDonnees();
    render(); toast("Gardé sur le téléphone : envoi au retour du réseau");
  } else { await refresh(); toast(pieces.length ? `${quoi}, pièces retirées du stock` : quoi); }
}

/** Réglage : la composition d'un type, choisie dans une liste. */
function composer(type = "") {
  const types = [...new Set([...TYPES, ...A.typesComposes(S.d)])];
  sheet({
    title: "Composition d’un type de ruche",
    intro: "Les pièces du stock qu’il faut pour monter une ruche de ce type.",
    fields: [{ name: "type", label: "Type", required: !0, value: type || types[0], list: types }],
    submit: async (f) => {
      const t = f.type.trim();
      if (!t) throw new Error("Indique le type de ruche.");
      const { error, local } = await appel("enregistrer_composition", { p: { type: t, pieces: piecesAEnvoyer() } });
      if (error) throw error;
      if (local) toast("Gardé sur le téléphone : envoi au retour du réseau");
      else { await refresh(); toast(`Composition « ${t} » enregistrée`); }
    },
  });
  monterPieces("composition");
}
