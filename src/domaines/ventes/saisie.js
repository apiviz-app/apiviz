// Apiviz — saisies de visite et de vente d'après les maquettes du 10 nov. 2026 (chantier des écrans, étape 6, v5.26).
// Complète les écrans « visite » (ux.js, voix.js) et « vente » (app.js, v3.js, alveoles.js), après eux :
//   - chaque compteur (pots vendus, nourrissement et matériel) dit ce qu'il reste en stock une fois la saisie faite,
//     et le chiffre qui vient de changer rebondit ;
//   - la vente prend la barre d'enregistrement fixe en bas, comme la visite : le total à gauche, qui rebondit quand il
//     change, « Enregistrer la vente » à droite ; la barre du bas de l'app s'efface pendant la saisie.
// Les compteurs redessinent tout le formulaire : on compare donc chaque valeur à celle du rendu d'avant.
// Les globales d'app.js (S, byId, n, eur, esc, sum) ne sont lues qu'à l'appel. Styles : styles/41-saisies.css.

const precedent = { visite: null, vente: null };

/** Le pluriel de « restant » suit le nombre et l'unité affichés. */
export function resteTexte(reste, unite = "") {
  const r = Math.max(0, Number(reste) || 0);
  const nb = typeof n == "function" ? n(r) : String(r).replace(".", ",");
  return `${nb}${unite ? " " + unite : ""} restant${r > 1 ? "s" : ""}`;
}

/** Clés dont la quantité a changé depuis le dernier rendu du même formulaire. */
function changees(saisie, q) {
  const avant = precedent[saisie];
  precedent[saisie] = { objet: saisie === "visite" ? S.visite : S.vente, q: { ...q } };
  if (!avant || avant.objet !== (saisie === "visite" ? S.visite : S.vente)) return [];
  const cles = new Set([...Object.keys(avant.q), ...Object.keys(q)]);
  return [...cles].filter((k) => Number(avant.q[k] || 0) !== Number(q[k] || 0));
}

function rebondir(el) {
  if (!el) return;
  el.classList.remove("sv-rebond");
  void el.offsetWidth; // relance l'animation
  el.classList.add("sv-rebond");
}

/** Compteurs d'un formulaire : stock restant sous le nom, rebond du chiffre changé. */
function compteurs(saisie, act, stockDe, uniteDe) {
  const q = (saisie === "visite" ? S.visite?.q : S.vente?.q) || {};
  const bouge = changees(saisie, q);
  document.querySelectorAll(`.stepper:has([data-act="${act}"])`).forEach((ligne) => {
    const k = ligne.querySelector(`[data-act="${act}"]`)?.dataset.k;
    const stock = stockDe(k);
    if (stock === null) return;
    const sous = ligne.querySelector(".small"), pris = Number(q[k] || 0);
    if (sous && pris === 0) sous.innerHTML = sous.innerHTML.replace(/ unité en stock$/, " en stock"); // « 40 unité en stock » → « 40 en stock »
    if (sous && pris > 0) sous.innerHTML = sous.innerHTML.replace(/[\d\s,.]+(?:\s*\S+)?\s*en stock$/, ` ${esc(resteTexte(stock - pris, uniteDe(k)))}`).replace(/^\s+/, "");
    if (bouge.includes(k)) rebondir(ligne.querySelector(".ctl span"));
  });
  return bouge.length > 0;
}

/** Écran « visite ». */
export function completerSaisieVisite() {
  if (S.route !== "visite" || !S.visite) return;
  compteurs("visite", "vstep", (k) => { const a = byId(S.d.articles, k); return a ? Number(a.stock) : null; }, (k) => { const u = byId(S.d.articles, k)?.unite || ""; return u === "unité" ? "" : u; });
}

/** Écran « vente ». */
export function completerSaisieVente() {
  if (S.route !== "vente" || !S.vente) return;
  const form = document.querySelector('form[data-form="vente"]');
  const bouton = form?.querySelector(":scope > .btn.main.block");
  if (!form || !bouton) return;
  const bouge = compteurs("vente", "sstep", (k) => { const l = byId(S.d.lots, k); return l ? Number(l.pots_restants) : null; }, () => "");
  const total = sum(S.d.lots.filter((l) => l.pots_restants > 0), (l) => (S.vente.q[l.id] || 0) * l.prix);
  const pots = Object.values(S.vente.q || {}).reduce((t, x) => t + Number(x || 0), 0);
  bouton.textContent = "Enregistrer la vente";
  bouton.classList.add("sv-envoyer");
  const barre = document.createElement("div");
  barre.className = "u-barre sv-barre";
  barre.innerHTML = `<div class="sv-total" aria-live="polite"><span class="small">${pots ? `${pots} pot${pots > 1 ? "s" : ""}` : "Total"}</span><b>${esc(eur(total))}</b></div>`;
  bouton.replaceWith(barre);
  barre.append(bouton);
  if (bouge) rebondir(barre.querySelector(".sv-total b"));
}
