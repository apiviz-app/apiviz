// Apidoo — interface « Alvéoles » : compagnon API, accueil en une phrase, carte des ruches, écrans allégés.
// Les styles sont à la fin de index.html (rubrique « Interface Alvéoles »). Le bouton central garde la clé « saisir ».
// API n'est pas encore relié à une intelligence artificielle : il ouvre la saisie et la recherche.
// Chargé en dernier. S'appuie sur app.js, UX, N4 et, s'il est là, HL.
const AL = (() => {
  const U = UX;

  // ---------- Le compagnon ----------
  const CORPS = "M108 68L84 30H36L12 68l24 38h48z";
  const HUMEURS = {
    repos: { ant: "M47 27C45 16 40 11 33 9M73 27C75 16 80 11 87 9", b: [[32, 9], [88, 9]],
      yeux: '<ellipse cx="48" cy="64" rx="7" ry="10" fill="#1E2B24"/><ellipse cx="72" cy="64" rx="7" ry="10" fill="#1E2B24"/>' },
    horsligne: { ant: "M47 27C44 21 37 20 30 23M73 27C76 21 83 20 90 23", b: [[29, 24], [91, 24]], fond: "#C4CABD", trait: "#55605A",
      yeux: '<path d="M39 63q9 8 18 0M63 63q9 8 18 0" fill="none" stroke="#1E2B24" stroke-width="6" stroke-linecap="round"/>' },
  };
  function compagnon(humeur = "repos", taille = 62) {
    const h = HUMEURS[humeur] || HUMEURS.repos, fond = h.fond || "#E3A008", trait = h.trait || "#1E2B24";
    return `<svg class="al-api" data-humeur="${humeur}" viewBox="0 0 120 120" width="${taille}" height="${taille}" aria-hidden="true">
      <path d="${h.ant}" fill="none" stroke="${trait}" stroke-width="5" stroke-linecap="round"/>
      ${h.b.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${trait}"/>`).join("")}
      <path d="${CORPS}" fill="${fond}" stroke="${fond}" stroke-width="10" stroke-linejoin="round"/>${h.yeux}</svg>`;
  }
  const humeur = () => (typeof HL != "undefined" && HL.horsLigne() ? "horsligne" : "repos");

  // ---------- Navigation ----------
  const central = BOTTOM.find(([k]) => k === "saisir");
  if (central) central[1] = "API";
  const iMiel = SIDE.findIndex((x) => x && x[0] === "ventes");
  SIDE.splice(iMiel + 1, 0, ["saisir", "API"]);

  const shellAvant = window.shell;
  window.shell = function (...a) {
    shellAvant(...a);
    document.querySelectorAll('.topbar img[src="logo-apidoo-clair.svg"]').forEach((i) => { i.src = "logo-apidoo.svg"; });
    document.querySelectorAll('.bottom [data-v="saisir"] svg').forEach((s) => { s.outerHTML = compagnon(humeur()); });
    document.querySelectorAll('.side [data-v="saisir"] svg').forEach((s) => { s.outerHTML = compagnon(humeur(), 24); });
  };

  // ---------- Bouton API : chercher ou saisir ----------
  const feuilleAvant = window.quickSheet;
  window.quickSheet = function () {
    feuilleAvant();
    const titre = $sheetForm.querySelector(".u-entete h2");
    if (titre) { titre.textContent = "Que veux-tu faire ?"; titre.insertAdjacentHTML("beforebegin", compagnon(humeur(), 52)); titre.parentElement.classList.add("al-tete"); }
    $sheetForm.querySelector(".n4-tuiles")?.insertAdjacentHTML("beforebegin", `<button type="button" class="al-cherche" data-act="n4q" data-v="go" data-k="recherche">Rechercher une ruche, un client…</button>`);
    $sheetForm.querySelector("p.small:last-of-type")?.insertAdjacentHTML("afterend", '<p class="small al-bientot">Bientôt, API répondra à tes questions et lira tes factures.</p>');
  };

  // ---------- Accueil : la priorité en une phrase ----------
  function phrase() {
    const d = S.d;
    if (!d.ruches.length) return "Ajoutez votre première ruche pour commencer.";
    const r = d.ruches.find((x) => x.etat === "Critique") || d.ruches.find((x) => x.etat !== "Bonne");
    if (!r) return "Tout va bien au rucher.";
    const p = d.visites.filter((v) => v.ruche_id === r.id && v.poids_kg);
    const perte = p.length > 1 ? Number(p[1].poids_kg) - Number(p[0].poids_kg) : 0;
    const constat = perte > 0 ? `${r.nom} a perdu ${n(perte)} kg depuis le ${new Date(p[1].date_visite + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`
      : `${r.nom} est ${r.etat === "Critique" ? "en état critique" : "à surveiller"}.`;
    return `${constat} C’est la priorité du jour.`;
  }
  function legende() {
    const l = S.d.ruches, nb = (e) => l.filter((r) => r.etat === e).length;
    const bien = nb("Bonne"), surv = l.length - bien - nb("Critique"), crit = nb("Critique");
    return `<p class="al-cle">${[[bien, "good", "en forme"], [surv, "watch", "à surveiller"], [crit, "crit", "critique"]].filter(([c]) => c)
      .map(([c, t, m]) => `<span><i class="bg-${t}"></i>${c} ${m}</span>`).join("")}</p>`;
  }
  const dashAvant = window.viewDash;
  window.viewDash = function () {
    dashAvant();
    const tete = document.querySelector(".hero-head");
    if (!tete) return;
    const h1 = tete.querySelector("h1");
    h1.textContent = `${h1.textContent}. ${phrase()}`;
    tete.querySelector(".sub")?.remove();
    document.querySelector(".n4-eyebrow")?.remove();
    document.querySelector(".u-puces")?.remove();
    const ruchers = document.querySelector(".u-rucher")?.closest("section");
    const afaire = document.querySelector(".u-liste");
    if (ruchers) { ruchers.insertAdjacentHTML("beforeend", legende()); ruchers.classList.add("al-carte"); if (afaire) afaire.before(ruchers); }
  };

  // ---------- Ruchers : le poids sur chaque ligne ----------
  const ruchesAvant = window.viewRuches;
  window.viewRuches = function () {
    ruchesAvant();
    document.querySelectorAll(".n4-ruche").forEach((b) => {
      const v = S.d.visites.find((x) => x.ruche_id === b.dataset.v && x.poids_kg);
      if (v) b.querySelector(".u-chev")?.insertAdjacentHTML("beforebegin", `<span class="al-kg">${esc(n(v.poids_kg))} kg</span>`);
    });
  };

  // ---------- Fiche ruche : la courbe de poids reste visible ----------
  const rucheAvant = window.viewRuche;
  window.viewRuche = function () {
    rucheAvant();
    [...document.querySelectorAll("details.u-pli")].find((x) => x.textContent.includes("Évolution du poids"))?.setAttribute("open", "");
  };

  return { compagnon, phrase };
})();
