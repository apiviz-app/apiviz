// Apiviz — réglages d'après les maquettes du 10 nov. 2026 (chantier des écrans, étape 9, v5.28).
// Complète l'écran « reglages » (essentiels.js, en blocs) :
//   - un bloc « Toi » pour donner son prénom, que l'accueil affiche dans le bonjour (accueil.js lit la même clé) ;
//   - la couleur du bandeau choisie sur des alvéoles, avec un aperçu du bandeau dans la feuille, appliqué aussitôt à
//     l'app ; « Annuler » ou fermer la feuille remet la couleur d'avant. Le choix reste propre à cet appareil.
// Globales lues à l'appel : S, esc, ES, ER, sheet, $sheet, $sheetForm, toast, render.

const VARIABLES = ["--bandeau", "--bandeau-texte", "--bandeau-lien", "--bandeau-actif", "--bandeau-actif-texte", "--bandeau-survol"];
const clePrenom = () => `apiviz-prenom-${S.session?.user?.email || ""}`;
const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } return v; };
const prenom = () => String(memo(clePrenom()) || "").trim();

/** Applique une couleur de bandeau à l'écran, sans l'enregistrer (aperçu). */
function montrer(k) {
  const v = ES.bandeaux[k]?.[1];
  if (!v) return;
  const r = document.documentElement;
  VARIABLES.forEach((x) => (v[x] ? r.style.setProperty(x, v[x]) : r.style.removeProperty(x)));
  const sombre = k === "vert" || k === "sapin";
  document.querySelectorAll(".side .brand img, .topbar > img").forEach((i) => { i.src = sombre ? "logo-apiviz-clair.svg" : "logo-apiviz.svg"; });
}

/** Complément de l'écran « reglages » : le bloc « Toi » en tête des blocs. */
export function completerReglages() {
  if (S.route !== "reglages" || S.rgForm) return;
  const grille = document.querySelector(".wrap .g-blocs");
  if (!grille || grille.querySelector("#rgToi")) return;
  const p = prenom();
  const html = ER.bloc("", "Toi", p || "Ton prénom", p ? "Affiché dans le bonjour de l’accueil" : "Pour que l’accueil te dise bonjour", "", "", "rgprenom")
    .replace('class="n4-g g-bloc"', 'class="n4-g g-bloc" id="rgToi"');
  grille.insertAdjacentHTML("afterbegin", html);
}

function feuillePrenom() {
  sheet({
    title: "Ton prénom",
    intro: "Il reste sur cet appareil et s’affiche dans le bonjour de l’accueil.",
    fields: [{ name: "prenom", label: "Prénom", value: prenom() }],
    submit: async (v) => {
      const p = String(v.prenom || "").trim().slice(0, 40);
      memo(clePrenom(), p);
      render();
      toast(p ? `Bonjour ${p}` : "Prénom retiré");
    },
  });
}

function feuilleCouleur() {
  const depart = ES.bandeau();
  let enregistre = false;
  sheet({
    title: "Couleur du bandeau",
    intro: "Touche une couleur pour la voir tout de suite. Elle reste propre à cet appareil.",
    fields: [{ name: "bandeau", label: "", type: "hidden", value: depart }],
    submit: async (v) => {
      enregistre = true;
      ES.memo("apidoo-bandeau", v.bandeau);
      ES.appliquerBandeau();
      render();
      toast(`Bandeau ${ES.bandeaux[v.bandeau][0].toLowerCase()}`);
    },
  });
  const champ = $sheetForm.querySelector('input[name="bandeau"]');
  champ?.closest("label")?.remove();
  const pastilles = Object.entries(ES.bandeaux).map(([k, [nom, v]]) =>
    `<button type="button" class="rg-pastille${k === depart ? " on" : ""}" data-act="rgcouleur" data-v="${k}" aria-pressed="${k === depart}" aria-label="${esc(nom)}" style="--fond:${v["--bandeau"] || "#FBEFC9"}"><span aria-hidden="true"></span><b>${esc(nom)}</b></button>`).join("");
  $sheetForm.querySelector(".actions")?.insertAdjacentHTML("beforebegin",
    `<div class="rg-apercu" aria-hidden="true"><span class="rg-logo">apiviz</span><span class="rg-avatar">${esc((prenom() || S.session?.user?.email || "?")[0].toUpperCase())}</span></div>
     <div class="rg-pastilles" role="group" aria-label="Couleurs du bandeau">${pastilles}</div><input type="hidden" name="bandeau" value="${esc(depart)}">`);
  $sheet.addEventListener("close", () => { if (!enregistre) ES.appliquerBandeau(); }, { once: true });
}

function choisir(k) {
  if (!ES.bandeaux[k]) return;
  const champ = $sheetForm.querySelector('input[name="bandeau"]');
  if (champ) champ.value = k;
  $sheetForm.querySelectorAll(".rg-pastille").forEach((b) => { const on = b.dataset.v === k; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  montrer(k);
}

/** Actions des réglages : prénom, couleur du bandeau (remplace la liste déroulante d'essentiels.js). */
export const actions = { rgprenom: feuillePrenom, errgcouleur: feuilleCouleur, rgcouleur: choisir };
export const remplace = ["errgcouleur"];
