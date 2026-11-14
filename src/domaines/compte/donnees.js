// Apiviz — Réglages › Tes données (v5.38) : le fichier comptable de l'année (ventes et achats sur une seule feuille,
// nature des dépenses déduite des articles). Règle : journalComptable() de finances/regles.js.
// Globales lues à l'appel : S, csv, toast.
import { journalComptable } from "../finances/regles.js";

export function fichierComptable() {
  const an = S.annee || new Date().getFullYear();
  const l = journalComptable(S.d, an);
  csv(`comptable-${an}`, ["Date", "Type", "Libellé", "Tiers", "Catégorie", "Nature", "Amortissement (ans)", "Recette", "Dépense", "Pièce", "Payée"],
    l.map((x) => [x.date, x.type, x.libelle, x.tiers, x.categorie, x.nature, x.amort, x.recette === "" ? "" : String(x.recette).replace(".", ","),
      x.depense === "" ? "" : String(x.depense).replace(".", ","), x.piece, x.payee]));
  toast(l.length ? `Fichier comptable ${an} préparé` : `Aucune vente ni dépense en ${an} : fichier vide`);
}

export const actions = { rgcomptable: fichierComptable };
