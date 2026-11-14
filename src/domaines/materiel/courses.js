// Apiviz — Matériel › Liste de courses (v5.38, maquettes du 13 nov. 2026 validées le 14). Les articles sous leur
// seuil, groupés par fournisseur habituel, avec une quantité proposée (deux fois le seuil) qu'on ajuste ; « Envoyer
// la liste » (partage du téléphone, sinon copie) et « C'est acheté » qui ouvre l'achat déjà rempli.
// Règles : listeCourses(), texteCourses() de regles.js. Globales lues à l'appel : S, esc, eur, shell, ES, toast, render, ACT.
import * as R from "./regles.js";

const e = (t) => esc(t);
const etat = () => (S.cs ||= { q: {} });
const liste = () => R.listeCourses(S.d.articles || [], S.d.fournisseurs || [], etat().q);

export function ecran() {
  const l = liste(), ecrire = !document.documentElement.classList.contains("lecteur");
  const titre = l.articles ? `${l.articles} article${l.articles > 1 ? "s" : ""}, ${l.groupes.length} fournisseur${l.groupes.length > 1 ? "s" : ""}` : "Rien à racheter";
  const blocs = l.groupes.map((g, i) => `<section class="card cs-four"><div class="cs-tete"><h2>${e(g.nom)}</h2><span class="small">${g.total ? e(eur(g.total)) : ""}</span></div>
    ${g.lignes.map((x) => {
      const a = x.article, u = a.unite === "unité" ? "" : a.unite;
      return `<div class="cs-l"><span><b>${e(a.nom)}</b><span class="small">En stock ${e(R.quantite(a.stock, u))} · seuil ${e(R.quantite(a.seuil, u))}</span></span>
        <span class="op-pas"><button type="button" data-act="csqte" data-v="${e(a.id)}" data-k="-1" aria-label="Moins de ${e(a.nom)}">−</button><b>${e(R.quantite(x.quantite, u))}</b><button type="button" data-act="csqte" data-v="${e(a.id)}" data-k="1" aria-label="Plus de ${e(a.nom)}">+</button></span>
        <b class="cs-m">${x.prix ? e(eur(x.montant)) : "–"}</b></div>`;
    }).join("")}
    <div class="cs-act"><button type="button" class="btn" data-act="csenvoyer" data-v="${i}">Envoyer la liste</button>${ecrire ? `<button type="button" class="btn main" data-act="csachete" data-v="${i}">C’est acheté</button>` : ""}</div></section>`).join("");
  shell(titre, l.articles ? "Quantités proposées pour repasser au-dessus du seuil. Ajuste-les si besoin." : "Tous tes articles sont au-dessus de leur seuil.", "",
    `${blocs}${l.articles ? `<p class="small cs-note">« C’est acheté » ouvre l’achat déjà rempli : corrige le prix réel, le stock monte tout seul.</p>
    <div class="op-pied cs-pied"><span><span class="small">Total estimé</span><b>${e(eur(l.total))}</b></span><button type="button" class="btn" data-act="cscopier">Copier tout</button></div>` : ""}`, "Liste de courses");
  document.querySelector(".wrap")?.classList.add("op-ecran");
  ES.retour("go", "materiel", "‹ Matériel");
}

async function partager(texte) {
  try {
    if (navigator.share) { await navigator.share({ text: texte }); return; }
  } catch (err) { if (err?.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(texte); toast("Liste copiée : colle-la dans un message"); }
  catch { toast("Copie impossible sur cet appareil", true); }
}

export const actions = {
  csqte: (id, k) => {
    const a = (S.d.articles || []).find((x) => x.id === id);
    if (!a) return;
    const actuelle = liste().groupes.flatMap((g) => g.lignes).find((x) => x.article.id === id)?.quantite ?? R.quantiteProposee(a);
    const pas = a.unite && a.unite !== "unité" ? 1 : actuelle >= 50 ? 10 : 1;
    etat().q[id] = Math.max(0, Math.round((actuelle + Number(k) * pas) * 100) / 100);
    render();
  },
  csenvoyer: (i) => { const g = liste().groupes[Number(i)]; if (g) partager(R.texteCourses(g)); },
  cscopier: () => partager(liste().groupes.map(R.texteCourses).join("\n\n")),
  csachete: (i) => {
    const g = liste().groupes[Number(i)];
    if (!g) return;
    ACT.newdepense({ fournisseur_id: g.fournisseur_id || "", lignes: g.lignes.filter((x) => x.quantite > 0).map((x) => ({ article_id: x.article.id, quantite: x.quantite, montant: x.prix ? x.montant : "" })) });
  },
};
