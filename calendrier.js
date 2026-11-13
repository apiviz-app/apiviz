// Apiviz — sélecteur de date maison (v5.35, maquettes du 13 nov. 2026).
// Remplace le calendrier du navigateur sur tous les champs date (input type=date) : il s'ouvre sous le champ sur
// ordinateur, en feuille du bas sur téléphone, aux couleurs d'Apiviz. Raccourcis (« Aujourd’hui », « Hier »… ou
// « Demain »… pour une échéance), grille lundi → dimanche, choix rapide du mois et de l'année.
// Le champ reste un input type=date : sa valeur (AAAA-MM-JJ), sa saisie au clavier et les formulaires ne changent pas.
// Bornes min / max respectées. Un clic sur le champ, ou Entrée / Espace / Alt+↓ au clavier, ouvre le calendrier.
const CAL = (() => {
  const telephone = matchMedia("(max-width:800px)");
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const deIso = (t) => (/^\d{4}-\d{2}-\d{2}$/.test(t || "") ? new Date(t + "T12:00:00") : null);
  const decale = (t, n) => { const d = deIso(t); d.setDate(d.getDate() + n); return iso(d); };
  const auj = () => iso(new Date());
  const fleche = (d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

  let champ = null, vue = null, mode = "jours"; // vue : AAAA-MM du mois affiché
  let d = null;

  function boite() {
    if (d) return d;
    document.body.insertAdjacentHTML("beforeend", '<dialog id="calDate" class="cal" aria-label="Choisir une date"></dialog>');
    d = document.getElementById("calDate");
    d.addEventListener("click", (e) => {
      if (e.target === d) return fermer();
      const b = e.target.closest("[data-cal]");
      if (!b || b.disabled) return;
      const a = b.dataset.cal, v = b.dataset.v;
      if (a === "jour" || a === "raccourci") choisir(v);
      else if (a === "pas") { const [y, m] = vue.split("-").map(Number); vue = iso(new Date(y, m - 1 + Number(v), 1, 12)).slice(0, 7); dessiner(); }
      else if (a === "an") { const [y, m] = vue.split("-").map(Number); vue = `${y + Number(v)}-${String(m).padStart(2, "0")}`; dessiner(); }
      else if (a === "mode") { mode = mode === "jours" ? "mois" : "jours"; dessiner(); }
      else if (a === "mois") { vue = `${vue.slice(0, 4)}-${v}`; mode = "jours"; dessiner(); }
      else if (a === "effacer") choisir("");
      else if (a === "fermer") fermer();
    });
    d.addEventListener("keydown", clavier);
    d.addEventListener("close", () => { champ?.focus({ preventScroll: true }); champ = null; });
    return d;
  }

  const borne = (t) => (champ.min && t < champ.min) || (champ.max && t > champ.max);
  // Échéance (ou date minimale à venir) : raccourcis vers l'avant ; sinon vers l'arrière (visite, vente, récolte…).
  const avenir = () => /echeance|rappel|prevu|pour_le|jusqu/i.test(champ.name || champ.id || "") || (champ.min && champ.min >= auj());

  function dessiner() {
    const choisi = champ.value, a = auj(), [y, m] = vue.split("-").map(Number);
    const raccourcis = (avenir() ? [["Aujourd’hui", 0], ["Demain", 1], ["Dans 7 jours", 7]] : [["Aujourd’hui", 0], ["Hier", -1], ["Il y a 7 jours", -7]])
      .map(([l, n]) => { const t = decale(a, n); return `<button type="button" class="cal-raccourci" data-cal="raccourci" data-v="${t}"${borne(t) ? " disabled" : ""}${t === choisi ? ' aria-pressed="true"' : ""}>${l}</button>`; }).join("");
    let corps;
    if (mode === "mois") {
      corps = `<div class="cal-mois">${MOIS.map((x, i) => { const k = String(i + 1).padStart(2, "0"); return `<button type="button" data-cal="mois" data-v="${k}"${k === vue.slice(5) ? ' aria-pressed="true"' : ""}>${COURTS[i]}</button>`; }).join("")}</div>`;
    } else {
      const premier = new Date(y, m - 1, 1, 12), debut = new Date(premier);
      debut.setDate(1 - ((premier.getDay() + 6) % 7));
      const nb = Math.ceil((((premier.getDay() + 6) % 7) + new Date(y, m, 0).getDate()) / 7) * 7;
      const cases = Array.from({ length: nb }, (_, i) => {
        const x = new Date(debut); x.setDate(debut.getDate() + i);
        const t = iso(x), dehors = t.slice(0, 7) !== vue;
        const lib = x.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        return `<button type="button" class="cal-j${dehors ? " dehors" : ""}${t === a ? " auj" : ""}${t === choisi ? " choisi" : ""}" data-cal="jour" data-v="${t}" aria-label="${lib}${t === a ? ", aujourd’hui" : ""}"${t === choisi ? ' aria-pressed="true"' : ""}${borne(t) ? " disabled" : ""} tabindex="-1">${x.getDate()}</button>`;
      }).join("");
      corps = `<div class="cal-grille" role="grid"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>${cases}</div>`;
    }
    const titre = mode === "mois" ? String(y) : `${MOIS[m - 1].replace(/^./, (c) => c.toUpperCase())} ${y}`;
    const libelle = champ.labels?.[0]?.childNodes[0]?.textContent?.trim() || champ.getAttribute("aria-label") || "Date";
    d.innerHTML = `<div class="cal-tete"><b>${esc(libelle)}</b><button type="button" class="cal-x" data-cal="fermer" aria-label="Fermer">${fleche("M6 6l12 12M18 6L6 18")}</button></div>
      <div class="cal-raccourcis">${raccourcis}</div>
      <div class="cal-nav"><button type="button" class="cal-titre" data-cal="mode" aria-label="${mode === "mois" ? "Revenir aux jours" : "Choisir le mois"}">${titre}${fleche(mode === "mois" ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6")}</button>
        <span><button type="button" class="cal-pas" data-cal="${mode === "mois" ? "an" : "pas"}" data-v="-1" aria-label="${mode === "mois" ? "Année précédente" : "Mois précédent"}">${fleche("M15 6l-6 6 6 6")}</button>
        <button type="button" class="cal-pas" data-cal="${mode === "mois" ? "an" : "pas"}" data-v="1" aria-label="${mode === "mois" ? "Année suivante" : "Mois suivant"}">${fleche("M9 6l6 6-6 6")}</button></span></div>
      ${corps}
      ${champ.required ? "" : `<div class="cal-pied"><button type="button" class="cal-effacer" data-cal="effacer">Effacer la date</button></div>`}`;
    const cible = d.querySelector(".cal-j.choisi:not(:disabled)") || d.querySelector(".cal-j.auj:not(:disabled)") || d.querySelector(".cal-j:not(.dehors):not(:disabled)");
    if (cible) cible.tabIndex = 0;
  }

  function placer() {
    if (telephone.matches) { d.classList.add("feuille"); d.style.left = d.style.top = ""; return; }
    d.classList.remove("feuille");
    const r = champ.getBoundingClientRect(), l = 320, h = d.offsetHeight || 400;
    const gauche = Math.min(Math.max(8, r.left), innerWidth - l - 8);
    const haut = r.bottom + 6 + h > innerHeight - 8 ? Math.max(8, r.top - h - 6) : r.bottom + 6;
    d.style.left = `${gauche}px`; d.style.top = `${haut}px`;
  }

  function ouvrir(input) {
    if (input.disabled || input.readOnly) return;
    champ = input; mode = "jours";
    vue = (input.value || (input.max && input.max < auj() ? input.max : input.min && input.min > auj() ? input.min : auj())).slice(0, 7);
    boite(); dessiner();
    if (!d.open) d.showModal();
    placer();
    (d.querySelector(".cal-j[tabindex='0']") || d.querySelector(".cal-x")).focus({ preventScroll: true });
  }
  function fermer() { if (d?.open) d.close(); }
  function choisir(t) {
    if (!champ) return;
    champ.value = t;
    champ.dispatchEvent(new Event("input", { bubbles: true }));
    champ.dispatchEvent(new Event("change", { bubbles: true }));
    fermer();
  }

  function clavier(e) {
    const j = e.target.closest?.(".cal-j");
    if (!j) return;
    const pas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!pas) return;
    e.preventDefault();
    const t = decale(j.dataset.v, pas);
    if (t.slice(0, 7) !== vue) { vue = t.slice(0, 7); dessiner(); }
    const b = d.querySelector(`.cal-j[data-v="${t}"]`);
    if (b) { d.querySelectorAll(".cal-j").forEach((x) => (x.tabIndex = -1)); b.tabIndex = 0; b.focus(); }
  }

  // Le champ : un clic (souris, doigt) ouvre notre calendrier au lieu de celui du navigateur.
  const estDate = (el) => el?.matches?.("input[type=date]:not([data-cal-natif])");
  document.addEventListener("pointerdown", (e) => {
    if (!estDate(e.target) || e.button > 0) return;
    e.preventDefault();
    ouvrir(e.target);
  }, true);
  document.addEventListener("click", (e) => { if (estDate(e.target)) e.preventDefault(); }, true);
  document.addEventListener("keydown", (e) => {
    if (!estDate(e.target)) return;
    if (e.key === "Enter" || e.key === " " || (e.altKey && e.key === "ArrowDown")) { e.preventDefault(); ouvrir(e.target); }
  }, true);
  // Certains écrans appellent showPicker() eux-mêmes : on le redirige aussi.
  const natif = HTMLInputElement.prototype.showPicker;
  if (natif) HTMLInputElement.prototype.showPicker = function () { return estDate(this) ? ouvrir(this) : natif.call(this); };

  return { ouvrir, fermer };
})();
