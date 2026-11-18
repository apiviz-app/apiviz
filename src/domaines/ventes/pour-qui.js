// Apiviz — « Pour qui ? » : le client d'une vente se choisit dans une feuille avec recherche (v5.66, maquette
// « Choisir le client » du 18 nov. 2026, validée). La liste déroulante d'app.js (#s_client) reste le vrai champ du
// formulaire (readSaleForm, Alvéoles, brouillon) mais n'est plus montrée : un champ « Client » ouvre la feuille.
// La feuille cherche dans le nom (en surlignant ce qui est tapé), la ville et le téléphone ; « Créer un nouveau client »
// ouvre la fiche avec le nom déjà tapé ; « Vente sans client » vend au client « Vente au marché » de la caisse.
// Une vente peut maintenant commencer sans aucun client enregistré.
// Règles : clients-regles.js. Globales lues à l'appel : S, esc, $sheet, $sheetForm, readSaleForm, redessiner, toast,
// fail, clientForm. Styles : 65-ventes-clients.css.
import { chercherClients, decouper, initiales } from "./clients-regles.js";
import { clientMarche, CLIENT_MARCHE } from "./caisse.js";

const e = (t) => esc(t);
const LOUPE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';
const GROUPE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 4 6"/></svg>';
const PANIER = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16l-1.5 11a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>';
const PLUS = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const lecteur = () => document.documentElement.classList.contains("lecteur");
const dateCourte = (s) => (s ? new Date(s + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "");

/** Ajoute (ou retrouve) le client dans la liste déroulante et le choisit. */
function choisirDansListe(client) {
  let champ = document.getElementById("s_client");
  if (!champ) return;
  if (![...champ.options].some((o) => o.value === client.id)) champ.insertAdjacentHTML("beforeend", `<option value="${e(client.id)}">${e(client.nom)}</option>`);
  champ.value = client.id;
  champ.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Complète l'écran « vente » (dernier complément) : champ Client qui ouvre la feuille. */
export function completerPourQui() {
  if (S.route !== "vente" || !S.vente) return;
  const form = document.querySelector('form[data-form="vente"]');
  if (!form || form.querySelector(".pq-champ")) return;
  let champ = document.getElementById("s_client");
  // Sans client enregistré, app.js ne dessine pas la liste : on la crée, vide, pour garder un seul chemin d'envoi.
  if (!champ) {
    form.insertAdjacentHTML("afterbegin", '<label class="pq-liste">Client<select id="s_client"><option value="">Choisir…</option></select></label>');
    champ = document.getElementById("s_client");
  }
  const label = champ.closest("label");
  label?.classList.add("pq-liste");
  champ.removeAttribute("required"); // le message « Choisis un client » d'app.js reste le seul contrôle
  champ.tabIndex = -1;
  label?.setAttribute("aria-hidden", "true");
  form.querySelector(':scope > [data-act="newclient"]')?.remove(); // dans la feuille
  const c = (S.d.clients || []).find((x) => x.id === (champ.value || S.vente.client_id));
  const html = `<div class="field pq-bloc"><span class="t">Client</span>
    <button type="button" class="pq-champ${c ? " pq-plein" : ""}" data-act="pqouvrir" aria-haspopup="dialog">
      ${c ? `<span class="pq-alv" aria-hidden="true">${e(initiales(c.nom))}</span><span class="pq-nom">${e(c.nom)}</span>` : `${GROUPE}<span class="pq-vide">Choisir ou créer un client</span>`}
      ${LOUPE}</button>
    ${c ? "" : '<span class="small">Au marché ou en passant : « Vente sans client ».</span>'}</div>`;
  const recents = form.querySelector(".al-recents");
  (recents || label).insertAdjacentHTML("beforebegin", html);
  // Les puces des clients récents (Alvéoles) changent la liste : le champ suit.
  champ.addEventListener("change", () => {
    const x = (S.d.clients || []).find((y) => y.id === champ.value);
    const b = form.querySelector(".pq-champ");
    if (!b || !x) return;
    b.classList.add("pq-plein");
    b.innerHTML = `<span class="pq-alv" aria-hidden="true">${e(initiales(x.nom))}</span><span class="pq-nom">${e(x.nom)}</span>${LOUPE}`;
    b.closest(".pq-bloc")?.querySelector(".small")?.remove();
  });
}

/** Lignes de résultats pour ce qui est tapé. */
function resultats(q) {
  const l = chercherClients(S.d, q, { exclure: [CLIENT_MARCHE] });
  const choisi = document.getElementById("s_client")?.value;
  const nb = q.trim() ? `<p class="small pq-nb" aria-live="polite">${l.length ? `${l.length} client${l.length > 1 ? "s" : ""} trouvé${l.length > 1 ? "s" : ""}` : "Aucun client trouvé"}</p>`
    : l.length ? '<p class="small pq-nb">Derniers clients</p>' : "";
  const ligne = (r) => {
    const [a, m, b] = decouper(String(r.client.nom).trim(), r.debut, r.fin);
    const sous = [...(Array.isArray(r.client.etiquettes) && r.client.etiquettes.length ? r.client.etiquettes.slice(0, 2) : r.client.cercle ? [r.client.cercle] : []),
      r.achats ? `${r.achats} achat${r.achats > 1 ? "s" : ""}` : "pas encore d’achat", r.dernier ? `dernier le ${dateCourte(r.dernier)}` : "", r.debut < 0 && q.trim() ? r.client.ville : ""].filter(Boolean).join(" · ");
    return `<button type="button" class="pq-ligne${r.client.id === choisi ? " on" : ""}" data-act="pqchoisir" data-v="${e(r.client.id)}">
      <span class="pq-alv" aria-hidden="true">${e(initiales(r.client.nom))}</span>
      <span class="pq-t"><b>${e(a)}${m ? `<mark>${e(m)}</mark>` : ""}${e(b)}</b><span class="small">${e(sous)}</span></span>
      <span class="u-chev" aria-hidden="true">›</span></button>`;
  };
  return nb + l.map(ligne).join("");
}

function ouvrir() {
  readSaleForm();
  const q = "";
  $sheetForm.onsubmit = (ev) => ev.preventDefault();
  $sheetForm.innerHTML = `<div class="u-entete pq-tete"><h2>Pour qui ?</h2></div>
    <label class="pq-cherche">${LOUPE}<span class="pq-sr">Chercher un client</span><input id="pq_q" type="search" autocomplete="off" enterkeyhint="search" placeholder="Nom, ville ou téléphone" value="${e(q)}"></label>
    <div class="pq-res" id="pq_res">${resultats(q)}</div>
    <div class="pq-autres">
      ${lecteur() ? "" : `<button type="button" class="pq-ligne" data-act="pqcreer"><span class="pq-rond pq-sapin" aria-hidden="true">${PLUS}</span><span class="pq-t"><b>Créer un nouveau client</b><span class="small" id="pq_creer">Fiche courte, remplie en quelques secondes</span></span></button>`}
      <button type="button" class="pq-ligne" data-act="pqsans"><span class="pq-rond" aria-hidden="true">${PANIER}</span><span class="pq-t"><b>Vente sans client</b><span class="small">Marché, passage, dépôt chez un commerçant</span></span></button>
    </div>`;
  $sheetForm.classList.add("pq-feuille");
  $sheet.addEventListener("close", () => $sheetForm.classList.remove("pq-feuille"), { once: true });
  $sheet.showModal();
  const champ = document.getElementById("pq_q");
  champ.addEventListener("input", () => {
    document.getElementById("pq_res").innerHTML = resultats(champ.value);
    const c = document.getElementById("pq_creer");
    if (c) c.textContent = champ.value.trim() ? `Le nom commence par « ${champ.value.trim()} »` : "Fiche courte, remplie en quelques secondes";
  });
  // Au clavier, Entrée choisit le premier résultat.
  champ.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    document.querySelector("#pq_res .pq-ligne")?.click();
  });
  if (matchMedia("(pointer: fine)").matches || (S.d.clients || []).length > 6) champ.focus();
}

function choisir(id) {
  const c = (S.d.clients || []).find((x) => x.id === id);
  if (!c) return;
  choisirDansListe(c);
  S.vente.client_id = c.id;
  $sheet.close();
  readSaleForm();
  redessiner("vente");
}

export const actions = {
  pqouvrir: () => ouvrir(),
  pqchoisir: (id) => choisir(id),
  pqcreer: () => {
    const nom = document.getElementById("pq_q")?.value.trim() || "";
    $sheet.close();
    clientForm(null, { nom });
  },
  pqsans: async () => {
    try {
      const id = await clientMarche();
      const c = (S.d.clients || []).find((x) => x.id === id) || { id, nom: CLIENT_MARCHE };
      choisirDansListe(c);
      S.vente.client_id = id;
      $sheet.close();
      readSaleForm();
      redessiner("vente");
    } catch (err) { fail(err); }
  },
};
