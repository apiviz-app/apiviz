// Apiviz — fiche de lot : « D'où vient ce pot » (v5.30, maquettes du 11 nov. 2026, migration 018).
// Complète la fiche d'essentiels.js (ES.VUES.lot) par l'histoire du lot dans l'ordre des dates : récolte, achat des
// pots et couvercles (dernier achat avant la mise en pots), mise en pots (ce qui est sorti du stock), ventes.
// Globales d'app.js lues à l'appel : S, esc, dfr, ACT.
import * as R from "../materiel/regles.js";

const e = (t) => esc(t);
const COULEUR = { recolte: "good", achat: "pine", pots: "honey", vente: "gris" };

/** Complément de l'écran « lot ». */
export function completerLot() {
  if (S.route !== "lot" || !S.lotId) return;
  const etapes = R.histoireLot(S.d, S.lotId);
  if (!etapes.length) return;
  const html = `<section class="card st-histoire" aria-label="Historique du lot"><h2>D’où vient ce pot</h2><ol>${etapes.map((x) =>
    `<li class="st-et st-${COULEUR[x.type]}"><span class="st-hexa" aria-hidden="true"></span><div>
      <span class="small">${e(x.date ? dfr(x.date) : "Date à renseigner")} · ${e(x.titre)}</span>
      <b>${e(x.detail)}</b>${x.sous ? `<span class="small">${e(x.sous)}</span>` : ""}
      ${x.depense ? `<button type="button" class="link" data-act="editdepense" data-v="${e(x.depense)}">Voir l’achat</button>` : ""}</div></li>`).join("")}</ol></section>`;
  const fil = document.querySelector(".wrap .er-fil");
  if (fil) fil.insertAdjacentHTML("afterend", html);
  else document.querySelector(".wrap")?.insertAdjacentHTML("beforeend", html);
}
