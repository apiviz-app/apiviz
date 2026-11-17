// Apiviz — corriger une visite déjà enregistrée (IT-09, AP-US-047).
// Une fiche avec les observations de la visite. En ligne, la correction est écrite tout de suite ; sans réseau, elle est
// gardée sur le téléphone (offline.js, file v2) avec la version vue, puis envoyée par modifier_saisie (migration 026),
// qui signale un conflit si un autre membre a changé les mêmes champs entre-temps (AP-US-049).
// Ni la ruche ni les produits utilisés ne se corrigent ici : le stock suit les intrants, qui se refont en supprimant
// puis en refaisant la visite (limite connue, CHANGELOG v5.56).
import { CHAMPS_EXPRESS, CHOIX_CELLULES } from "./regles.js";

const choix = (k) => CHAMPS_EXPRESS.find((c) => c.k === k)?.choix || [];
const vers = (x) => (x === null || x === undefined ? "" : String(x));

/** Valeurs du formulaire -> champs envoyés (seulement ceux qui changent ; nombres et dates vides : null). */
export function champsCorriges(v, f) {
  const c = {
    date_visite: f.date_visite || v.date_visite,
    activite: f.activite, provisions: f.provisions, reine: f.reine,
    couvain: f.couvain === "Non vu" ? "" : f.couvain,
    poids_kg: f.poids_kg === "" ? null : Number(String(f.poids_kg).replace(",", ".")),
    force: f.force === "" ? null : Number(f.force),
    oeufs_vus: f.oeufs_vus === "Oui" ? true : f.oeufs_vus === "Non" ? false : null,
    cellules_royales: f.cellules_royales || null,
    varroa: f.varroa === "" ? null : Number(f.varroa),
    note: f.note ?? "",
  };
  if (c.poids_kg !== null && !(c.poids_kg >= 0)) throw new Error("Le poids doit être un nombre positif");
  if (c.varroa !== null && !(Number.isInteger(c.varroa) && c.varroa >= 0)) throw new Error("Le comptage varroa doit être un nombre entier");
  const avant = { ...v, couvain: v.couvain || "", cellules_royales: v.cellules_royales || null, note: v.note || "" };
  const egal = (a, b) => (a === null || a === undefined || a === "" ? null : String(a)) === (b === null || b === undefined || b === "" ? null : String(b));
  return Object.fromEntries(Object.entries(c).filter(([k, x]) => !egal(x, avant[k])));
}

function ouvrir(id) {
  const v = byId(S.d.visites, id);
  if (!v) return toast("Cette visite n’est plus affichée.", true);
  const r = byId([...S.d.ruches, ...(S.d.ruchesSorties || [])], v.ruche_id);
  const sel = (name, label, valeurs, value) => ({ name, label, type: "select", value, options: valeurs.map((x) => (Array.isArray(x) ? x : [x, x || "Pas noté"])) });
  sheet({
    title: "Corriger la visite",
    intro: `${r?.nom || "Ruche"} · ${dfr(v.date_visite)}${(typeof HL != "undefined" && HL.horsLigne()) || navigator.onLine === false ? " · sans réseau : la correction partira au retour du réseau" : ""}`,
    fields: [
      { name: "date_visite", label: "Date", type: "date", value: v.date_visite, required: true },
      sel("activite", "Activité", choix("activite"), v.activite),
      sel("provisions", "Provisions", choix("provisions"), v.provisions),
      sel("couvain", "Couvain", choix("couvain"), v.couvain || "Non vu"),
      sel("force", "Force (1 à 5)", [["", "Pas notée"], ...choix("force")], vers(v.force)),
      sel("oeufs_vus", "Œufs vus", [["", "Pas regardé"], "Oui", "Non"], v.oeufs_vus === true ? "Oui" : v.oeufs_vus === false ? "Non" : ""),
      sel("cellules_royales", "Cellules royales", [["", "Pas regardé"], ...CHOIX_CELLULES], v.cellules_royales || ""),
      sel("reine", "Reine", choix("reine"), v.reine),
      { name: "poids_kg", label: "Poids (kg)", type: "number", step: "0.1", min: 0, value: vers(v.poids_kg) },
      { name: "varroa", label: "Varroa (comptage)", type: "number", step: "1", min: 0, value: vers(v.varroa) },
      { name: "note", label: "Note", type: "textarea", value: v.note || "" },
    ],
    label: "Enregistrer la correction",
    submit: async (f) => {
      const champs = champsCorriges(v, f);
      if (!Object.keys(champs).length) return toast("Rien n’a changé");
      await write(sb.from("visites").update(champs).eq("id", v.id), "Visite corrigée");
    },
  });
}

export const actions = { modvisite: (id) => ouvrir(id) };
