// Apiviz — ruches physiques (contenants), section de l'écran Matériel (IT-06, AP-FEAT-031, AP-TECH-110 à 113).
// Visible seulement si le suivi est activé dans les réglages (niveau Professionnel) : sinon, aucun écran contenant.
// Une ruche physique : numéro peint sur la caisse, type, état, date d'achat, lien facultatif vers un article
// d'équipement du matériel. L'occupation (quelle colonie dedans) se change depuis la fiche de la colonie.
import * as C from "./regles.js";
import { contenantsSuivis } from "./fiche.js";

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
    <button type="button" class="link" data-act="ctajouter">Ajouter</button></div>
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
  ctajouter: () => formulaire(null),
  ctmodifier: (id) => formulaire((S.d.contenants || []).find((c) => c.id === id)),
};
