// Apiviz — « Ma saison » (v5.61, maquette validée le 17 nov. 2026). La saison en un écran : kilos récoltés et
// l'écart avec l'an dernier, pots vendus et clients, stock et combien de semaines il tient, argent rentré et dépensé,
// kilos par ruche, et ce qu'API en retient (constats tirés des chiffres, rien d'inventé). « Partager » envoie le
// résumé en texte (ou le copie) ; « Imprimer » donne une page propre, à enregistrer en PDF.
// Règles pures : regles.js. Globales d'app.js lues à l'appel : S, esc, eur, cfg, shell, yearSel, today, venteTotal,
// toast, AL.
import * as Q from "./regles.js";

const e = (t) => esc(t);
const f = (x) => String(x).replace(".", ",");
const pl = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;

function donnees() {
  const annee = Number(S.annee) || new Date().getFullYear();
  const s = Q.saison(S.d, annee, typeof venteTotal == "function" ? venteTotal : null);
  const parRuche = Q.kgParRuche(S.d, annee);
  return { annee, s, parRuche, cs: Q.constats(parRuche, annee) };
}

export function ecran() {
  const { annee, s, parRuche, cs } = donnees();
  const evo = Q.evolution(s.kg, s.kgAvant, annee);
  const sem = annee === new Date().getFullYear() ? Q.semainesDeStock(S.d, s.stock, today()) : null;
  const max = Math.max(1, ...parRuche.map((r) => r.kg));
  const vide = !s.kg && !s.nbVentes && !s.depense;
  const phrase = s.kg ? `${f(s.kg)} kg récoltés${evo ? `, ${evo}` : ""}.` : s.nbVentes ? `${pl(s.pots, "pot")} vendu${s.pots > 1 ? "s" : ""}, pas encore de récolte notée.` : "Pas encore de récolte ni de vente cette saison.";
  const tuile = (t, v, sous, cls = "") => `<div class="ms-tuile ${cls}"><span>${t}</span><b>${v}</b>${sous ? `<span class="ms-sous">${sous}</span>` : ""}</div>`;
  const api = typeof AL != "undefined" && AL.compagnon ? AL.compagnon("repos", 40) : "";
  shell("Ma saison", `Saison ${annee}`, yearSel(),
    `<div class="ms-page">
      <p class="ms-oeil">${e((typeof cfg == "function" && cfg().nom) || "Saison")} · ${annee}</p>
      <h2 class="ms-phrase">${e(phrase)}</h2>
      ${vide ? '<p class="small">Les récoltes, ventes et dépenses de l’année apparaîtront ici au fil de la saison.</p>' : `
      <div class="ms-tuiles">
        ${tuile("Pots vendus", f(s.pots), s.clients ? pl(s.clients, "client") : "", "")}
        ${tuile("Reste en stock", pl(s.stock, "pot"), sem ? `≈ ${pl(sem, "semaine")} de ventes` : "")}
        ${tuile("Argent rentré", e(eur(s.rentre)), "")}
        ${tuile("Dépensé", e(eur(s.depense)), s.rentre || s.depense ? `Solde ${e(eur(s.rentre - s.depense))}` : "")}
      </div>
      ${parRuche.some((r) => r.kg > 0) ? `<section class="card ms-ruches" aria-labelledby="ms_r"><h2 id="ms_r">Kilos récoltés par ruche</h2>
        <p class="small">${parRuche.filter((r) => r.kg > 0).length >= 3 ? "Les 3 meilleures en premier" : "Du meilleur au moins bon"}${s.kg - parRuche.reduce((t, r) => t + r.kg, 0) > 0.05 ? ` · ${f(Math.round((s.kg - parRuche.reduce((t, r) => t + r.kg, 0)) * 10) / 10)} kg récoltés sans ruche précise` : ""}</p>
        <ul>${parRuche.map((r, i) => `<li><span class="ms-nom">${e(r.nom)}</span><span class="ms-barre" aria-hidden="true"><span class="${i < 3 && r.kg > 0 ? "top" : ""}" style="width:${Math.round((r.kg / max) * 100)}%"></span></span><span class="ms-kg">${e(f(r.kg))} kg</span></li>`).join("")}</ul></section>` : ""}
      ${cs.length ? `<section class="ms-api" aria-labelledby="ms_a"><span class="ms-api-av" aria-hidden="true">${api}</span><div><h2 id="ms_a">Ce qu’API retient</h2>${cs.map((c) => `<p>${e(c)}</p>`).join("")}<p class="small">D’après les récoltes, les ventes et les fiches des ruches de ${annee}.</p></div></section>` : ""}
      <div class="ms-boutons"><button type="button" class="btn" data-act="mspartager">Partager le résumé</button><button type="button" class="btn" data-act="msimprimer">Imprimer ou PDF</button></div>`}
    </div>`);
  document.querySelector(".wrap")?.classList.add("ms-ecran");
}

async function partager() {
  const { annee, s, parRuche, cs } = donnees();
  const texte = Q.resumeTexte((typeof cfg == "function" && cfg().nom) || "", annee, s, parRuche, cs);
  try {
    if (navigator.share) return await navigator.share({ title: `Saison ${annee}`, text: texte });
    await navigator.clipboard.writeText(texte);
    toast("Résumé copié : colle-le dans un message");
  } catch (err) {
    if (err?.name !== "AbortError") toast("Le partage n’est pas possible sur cet appareil. Utilise « Imprimer ».");
  }
}

export const actions = {
  mspartager: () => partager(),
  msimprimer: () => window.print(),
};
