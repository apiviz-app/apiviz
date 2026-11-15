// Apiviz — composant « Choisir » (v5.41, maquettes du 15 nov. 2026, mélange validé par Pierre-Louis).
// Remplace la liste de suggestions native (<input list> + <datalist>), que chaque téléphone affiche à sa façon (sur
// Android : une bande coupée au-dessus du clavier). Chaque champ à suggestions de l'app est transformé tout seul, selon
// le nombre de choix :
//   A · puces sous le champ (8 choix ou moins, ou choix multiple) : tout est visible, un toucher choisit ;
//       « Autre… » rouvre la saisie libre. data-multiple="1" sur le champ : plusieurs valeurs séparées par des virgules.
//   B · liste sous le champ (plus de 8 choix) : la liste filtre à chaque lettre, juste sous le champ ; chaque option peut
//       porter un détail (attribut label de l'<option>), par exemple « Emballage · 120 en stock ».
// La forme C (feuille plein écran) est propre à l'achat (src/domaines/finances/achat.js).
// Le champ d'origine reste le vrai champ du formulaire (nom, valeur, brouillon, validation) : le composant ne fait que
// le remplir et envoyer les événements input et change, comme une saisie au clavier.

export const MAX_PUCES = 8;

/** Forme d'un champ : « A » (puces) ou « B » (liste sous le champ). */
export function forme(nombre, { multiple = false } = {}) {
  return multiple || nombre <= MAX_PUCES ? "A" : "B";
}

/** Texte sans accents ni majuscules, pour comparer. */
export const plat = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Options qui correspondent à ce qui est tapé : d'abord celles qui commencent par le texte, puis celles qui le
 * contiennent ; vide → les premières. Chaque résultat garde où se trouve le texte (debut, fin) pour le mettre en gras.
 */
export function filtrer(options, texte, max = 6) {
  const t = plat(texte);
  if (!t) return options.slice(0, max).map((o) => ({ ...o, debut: -1, fin: -1 }));
  const avec = options.map((o) => ({ o, i: plat(o.valeur).indexOf(t) })).filter((x) => x.i >= 0);
  avec.sort((a, b) => (a.i === 0) === (b.i === 0) ? 0 : a.i === 0 ? -1 : 1);
  return avec.slice(0, max).map(({ o, i }) => ({ ...o, debut: i, fin: i + t.length }));
}

/** Le texte tapé correspond-il exactement à une option (sans accents ni majuscules) ? */
export const existe = (options, texte) => options.some((o) => plat(o.valeur) === plat(texte));

/** Valeurs d'un champ multiple (« Marché, Famille » → ["Marché", "Famille"]). */
export const valeurs = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

/** Ajoute ou retire une valeur d'un champ multiple, sans doublon ni différence de majuscules. */
export function basculer(s, v) {
  const l = valeurs(s);
  const i = l.findIndex((x) => plat(x) === plat(v));
  if (i >= 0) l.splice(i, 1); else l.push(v);
  return l.join(", ");
}

// ---------- Navigateur ----------

const echap = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function lireOptions(liste) {
  const vues = new Set();
  return [...(liste?.options || [])].map((o) => ({ valeur: o.value, detail: o.label && o.label !== o.value ? o.label : "" }))
    .filter((o) => o.valeur !== "" && !vues.has(plat(o.valeur)) && vues.add(plat(o.valeur)));
}

function remplir(champ, valeur) {
  champ.value = valeur;
  champ.dispatchEvent(new Event("input", { bubbles: true }));
  champ.dispatchEvent(new Event("change", { bubbles: true }));
}

// A · puces sous le champ.
function puces(champ, options) {
  const multiple = champ.dataset.multiple === "1";
  const zone = document.createElement("div");
  zone.className = "ch-puces";
  zone.setAttribute("role", "group");
  zone.setAttribute("aria-label", champ.closest("label")?.firstChild?.textContent?.trim() || "Choix");
  const libre = () => !multiple && champ.value !== "" && !existe(options, champ.value);
  // Le champ reste visible s'il porte une valeur hors liste, s'il est requis et vide, ou pour un choix multiple
  // (on peut y taper une étiquette nouvelle).
  const montrerChamp = (oui) => champ.classList.toggle("ch-replie", !oui);
  const dessiner = () => {
    const choisies = multiple ? valeurs(champ.value).map(plat) : [plat(champ.value)];
    const liste = [...options];
    if (multiple) for (const v of valeurs(champ.value)) if (!existe(liste, v)) liste.push({ valeur: v, detail: "" });
    zone.innerHTML = liste.map((o) => {
      const on = choisies.includes(plat(o.valeur));
      return `<button type="button" class="ch-puce${on ? " on" : ""}" aria-pressed="${on}" data-ch-valeur="${echap(o.valeur)}"${o.detail ? ` title="${echap(o.detail)}"` : ""}>${echap(o.valeur)}</button>`;
    }).join("") + (multiple ? "" : `<button type="button" class="ch-puce ch-autre${libre() ? " on" : ""}" data-ch-autre="1">${libre() ? echap(champ.value) : "Autre…"}</button>`);
  };
  zone.addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    ev.preventDefault();
    if (b.dataset.chAutre) { montrerChamp(true); champ.focus(); champ.select?.(); return; }
    const v = b.dataset.chValeur;
    if (multiple) remplir(champ, basculer(champ.value, v));
    else { remplir(champ, plat(champ.value) === plat(v) && !champ.required ? "" : v); montrerChamp(false); }
    dessiner();
  });
  champ.addEventListener("input", () => { if (document.activeElement !== champ || multiple) dessiner(); });
  // En quittant le champ, la valeur libre passe dans la puce « Autre » (allumée) ; la toucher rouvre la saisie.
  champ.addEventListener("blur", () => { dessiner(); if (!multiple && !(champ.required && !champ.value)) montrerChamp(false); });
  champ.insertAdjacentElement("afterend", zone);
  montrerChamp(multiple || (champ.required && !champ.value));
  if (multiple) champ.placeholder = champ.placeholder || "Autre étiquette…";
  dessiner();
}

// B · liste sous le champ.
let compteur = 0;
function listeSousChamp(champ, options) {
  const id = "ch-l" + ++compteur;
  const boite = document.createElement("div");
  boite.className = "ch-liste";
  boite.id = id;
  boite.setAttribute("role", "listbox");
  boite.hidden = true;
  champ.setAttribute("role", "combobox");
  champ.setAttribute("aria-autocomplete", "list");
  champ.setAttribute("aria-controls", id);
  champ.setAttribute("aria-expanded", "false");
  let actif = -1, res = [];
  const fermer = () => { boite.hidden = true; champ.setAttribute("aria-expanded", "false"); actif = -1; };
  const gras = (o) => o.debut < 0 ? echap(o.valeur)
    : echap(o.valeur.slice(0, o.debut)) + "<b>" + echap(o.valeur.slice(o.debut, o.fin)) + "</b>" + echap(o.valeur.slice(o.fin));
  const ouvrir = () => {
    res = filtrer(options, champ.value);
    const nouveau = champ.value.trim() && !existe(options, champ.value);
    if (!res.length && !nouveau) return fermer();
    boite.innerHTML = res.map((o, i) => `<button type="button" role="option" id="${id}-${i}" class="ch-option${i === actif ? " actif" : ""}" aria-selected="${i === actif}" data-ch-i="${i}"><span class="ch-nom">${gras(o)}</span>${o.detail ? `<span class="ch-detail">${echap(o.detail)}</span>` : ""}</button>`).join("")
      + (nouveau ? `<button type="button" class="ch-option ch-nouveau" data-ch-garder="1">+ Garder « ${echap(champ.value.trim())} »</button>` : "");
    boite.hidden = false;
    champ.setAttribute("aria-expanded", "true");
    if (actif >= 0) champ.setAttribute("aria-activedescendant", `${id}-${actif}`); else champ.removeAttribute("aria-activedescendant");
  };
  const choisir = (i) => { remplir(champ, res[i].valeur); fermer(); };
  // pointerdown plutôt que click : le champ ne perd pas le focus avant le choix (sinon la liste se ferme d'abord).
  boite.addEventListener("pointerdown", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    ev.preventDefault();
    if (b.dataset.chGarder) return fermer();
    choisir(Number(b.dataset.chI));
  });
  champ.addEventListener("focus", () => {
    actif = -1; ouvrir();
    // Sur téléphone, remonte le champ en haut de la feuille pour que la liste tienne au-dessus du clavier.
    if (matchMedia("(max-width: 800px)").matches) setTimeout(() => champ.scrollIntoView({ block: "start", behavior: "smooth" }), 280);
  });
  champ.addEventListener("input", (ev) => { if (ev.isTrusted !== false && document.activeElement === champ) { actif = -1; ouvrir(); } });
  champ.addEventListener("blur", () => setTimeout(fermer, 120));
  champ.addEventListener("keydown", (ev) => {
    if (boite.hidden && ev.key === "ArrowDown") { ouvrir(); ev.preventDefault(); return; }
    if (boite.hidden) return;
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      const n = res.length;
      actif = !n ? -1 : ev.key === "ArrowDown" ? (actif + 1) % n : actif <= 0 ? n - 1 : actif - 1;
      ouvrir();
    } else if (ev.key === "Enter" && actif >= 0) { ev.preventDefault(); choisir(actif); }
    else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); fermer(); }
  });
  const enveloppe = document.createElement("span");
  enveloppe.className = "ch-enveloppe";
  champ.insertAdjacentElement("beforebegin", enveloppe);
  enveloppe.append(champ, boite);
}

/** Transforme un champ à suggestions. Sans effet s'il l'est déjà ou si sa liste est introuvable. */
export function ameliorer(champ) {
  if (!champ || champ.dataset.choisir || !champ.getAttribute("list")) return;
  const liste = champ.list || document.getElementById(champ.getAttribute("list"));
  if (!liste) return;
  const options = lireOptions(liste);
  champ.removeAttribute("list"); // plus de bande native au-dessus du clavier
  champ.setAttribute("autocomplete", "off");
  const f = forme(options.length, { multiple: champ.dataset.multiple === "1" });
  champ.dataset.choisir = f;
  if (!options.length) return;
  if (f === "A") puces(champ, options); else listeSousChamp(champ, options);
}

/** Transforme tous les champs à suggestions d'un morceau de page. */
export function ameliorerTout(racine = document) {
  racine.querySelectorAll?.("input[list]").forEach(ameliorer);
}

/** Surveille la page : chaque formulaire dessiné plus tard est transformé aussitôt. */
export function demarrer() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  ameliorerTout(document);
  new MutationObserver((changes) => {
    for (const c of changes) for (const n of c.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.matches?.("input[list]")) ameliorer(n); else ameliorerTout(n);
    }
  }).observe(document.body, { childList: true, subtree: true });
}
