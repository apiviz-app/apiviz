// Apiviz — fiche client (v5.66, maquettes « Nouveau client » et « Adresse avec suggestions » du 18 nov. 2026, validées).
// Remplace clientForm() d'app.js (mêmes champs envoyés, même repli sans les migrations 012 et 021) :
//   - les initiales du client dans une alvéole, qui suivent le nom tapé ; « Importer depuis mes contacts » quand le
//     téléphone le permet (Contact Picker, Chrome sur Android) ;
//   - étiquettes et goûts en puces (composant Choisir) ; téléphone, e-mail ;
//   - adresse avec suggestions : d'abord les adresses déjà saisies chez tes clients (même foyer), puis les adresses
//     officielles (service de géocodage de l'IGN, gratuit, sans compte), les plus proches de ton rucher d'abord ; code
//     postal et ville se remplissent ; sans réseau, seules les adresses de tes clients sont proposées ;
//   - notes, « Prévenir à la prochaine récolte » (migration 033 : colonnes gouts et prevenir) ;
//   - « Enregistrer et vendre » ouvre la vente avec ce client ; ouverte depuis une vente, la fiche y revient.
// Règles : clients-regles.js. Globales lues à l'appel : S, esc, cfg, sb, $sheet, $sheetForm, sheet, del, write,
// refresh, toast, fail, ACT, redessiner, PF. Styles : 65-ventes-clients.css.
import { carteClient } from "./remises.js";
import { initiales, adressesConnues, memeAdresse, urlAdresses, lireAdresses, centre } from "./clients-regles.js";
import * as P from "../production/produits.js";

const e = (t) => esc(t);
const liste = (v) => [...new Set(String(v || "").split(",").map((x) => x.trim()).filter(Boolean))].slice(0, 8);
const PIN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>';
const GROUPE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 4 6"/></svg>';
const CONTACT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
const peutImporter = () => typeof navigator != "undefined" && "contacts" in navigator && typeof navigator.contacts?.select == "function";

/** Goûts proposés : les produits du catalogue (« Miel 500 g », « Hydromel 75 cl ») et ceux déjà notés. */
function goutsProposes() {
  const p = new Set();
  for (const l of S.d.lots || []) {
    const fmt = P.formatLot(l);
    p.add(P.estMiel(l) ? `Miel ${fmt}`.trim() : [P.categorieDe(l), fmt].filter(Boolean).join(" "));
  }
  for (const c of S.d.clients || []) if (Array.isArray(c.gouts)) c.gouts.forEach((g) => p.add(g));
  return [...p].filter(Boolean);
}

/** Fiche « Ajouter un client » / « Modifier le client ». `pre` : valeurs proposées (nom tapé dans « Pour qui ? »). */
export function fiche(client, pre = {}) {
  const depuisVente = S.route === "vente";
  const c = client || {};
  const etiquettes = (Array.isArray(c.etiquettes) && c.etiquettes.length ? c.etiquettes : c.cercle ? [c.cercle] : []).join(", ");
  const propEt = [...new Set([...(S.d.clients || []).flatMap((x) => (Array.isArray(x.etiquettes) ? x.etiquettes : [x.cercle])), ...(cfg().cercles || [])].filter(Boolean))];
  const nom = client ? c.nom : pre.nom || "";
  const boutons = client
    ? '<button class="btn main" style="flex:1">Enregistrer</button><button type="button" class="btn" data-act="closesheet">Annuler</button>'
    : depuisVente
      ? '<button class="btn main" style="flex:1">Enregistrer pour cette vente</button><button type="button" class="btn" data-act="closesheet">Annuler</button>'
      : '<button class="btn" value="simple">Enregistrer</button><button class="btn main" style="flex:1" value="vendre">Enregistrer et vendre</button>';
  // v5.78 : carte de fidélité du client (remises.js, fidelite-regles.js), si elle est activée.
  const carte = client ? carteClient(client) : null;
  $sheetForm.innerHTML = `<div class="u-entete"><h2>${client ? "Modifier le client" : "Nouveau client"}</h2></div>
    ${carte ? `<p class="fi-fiche"><b>Carte de fidélité : ${e(carte.tampons)} sur ${carte.n}</b>${carte.dispo ? ` · ${carte.dispo > 1 ? `${carte.dispo} articles offerts à donner` : "1 article offert à donner"}` : ""}</p>` : ""}
    <div class="fc-hero">
      <span class="fc-alv" id="fc_ini" aria-hidden="true">${e(nom ? initiales(nom) : "?")}</span>
      <label class="fc-nom"><span class="pq-sr">Nom</span><input name="nom" required autocomplete="off" placeholder="Prénom et nom" value="${e(nom)}"></label>
      ${peutImporter() ? `<button type="button" class="chip fc-import" data-act="fcimport">${CONTACT}Importer depuis mes contacts</button>` : ""}
    </div>
    <label>C’est qui pour toi ?<input name="etiquettes" data-multiple="1" list="dl_fc_etiquettes" autocomplete="off" value="${e(etiquettes)}"><datalist id="dl_fc_etiquettes">${propEt.map((x) => `<option value="${e(x)}">`).join("")}</datalist></label>
    <h3 class="fc-sec">Pour le joindre</h3>
    <label>Téléphone<input name="telephone" type="tel" autocomplete="off" inputmode="tel" value="${e(c.telephone)}"></label>
    <label>E-mail<input name="email" type="email" autocomplete="off" value="${e(c.email)}"></label>
    <div class="fc-adresse">
      <label>Adresse<span class="fc-champ">${PIN}<input name="adresse" id="fc_adresse" autocomplete="off" placeholder="Commence à taper une adresse" value="${e(c.adresse)}" role="combobox" aria-expanded="false" aria-controls="fc_sugg" aria-autocomplete="list"></span></label>
      <div class="fc-sugg" id="fc_sugg" role="listbox" aria-label="Adresses proposées" hidden></div>
    </div>
    <div class="two"><label>Code postal<input name="code_postal" inputmode="numeric" autocomplete="off" value="${e(c.code_postal)}"></label><label>Ville<input name="ville" autocomplete="off" value="${e(c.ville)}"></label></div>
    <h3 class="fc-sec">Ses goûts</h3>
    <label><span class="pq-sr">Produits préférés</span><input name="gouts" data-multiple="1" list="dl_fc_gouts" autocomplete="off" value="${e((Array.isArray(c.gouts) ? c.gouts : []).join(", "))}"><datalist id="dl_fc_gouts">${goutsProposes().map((x) => `<option value="${e(x)}">`).join("")}</datalist></label>
    <label>Notes<textarea name="notes" rows="3" placeholder="Préfère le miel crémeux, passe le samedi…">${e(c.notes)}</textarea></label>
    <label class="fc-prevenir"><span class="fc-prevenir-t"><b>Prévenir à la prochaine récolte</b><span class="small">Tu retrouves la liste dans Produits › Récoltes, avec un message prêt à envoyer.</span></span>
      <input type="checkbox" name="prevenir" role="switch" class="fc-sw" ${c.prevenir ? "checked" : ""}></label>
    <label>SIRET (client professionnel, facultatif)<input name="siret" autocomplete="off" value="${e(c.siret)}"></label>
    <div class="actions">${boutons}</div>
    ${client ? '<button type="button" class="link crit" data-act="sheetdel">Supprimer</button>' : ""}`;
  sheet.del = client ? del("clients", client.id, "Client supprimé") : null;
  $sheetForm.onsubmit = async (ev) => {
    ev.preventDefault();
    const vendre = ev.submitter?.value === "vendre";
    const boutonsEnvoi = [...$sheetForm.querySelectorAll("button:not([type=button])")];
    boutonsEnvoi.forEach((b) => (b.disabled = true));
    try {
      const id = await enregistrer(client, new FormData($sheetForm), depuisVente);
      $sheet.close();
      if (vendre && id) { ACT.newvente(); S.vente.client_id = id; redessiner("vente"); }
    } catch (err) {
      fail(err);
      boutonsEnvoi.forEach((b) => (b.disabled = false));
    }
  };
  $sheet.showModal();
  brancher(client);
}

/** Envoi : mêmes règles qu'avant (étiquettes, cercle, repli sans 012 et 021), plus goûts et « prévenir » (033). */
async function enregistrer(client, form, depuisVente) {
  const saisie = {
    nom: String(form.get("nom") || "").trim(), telephone: form.get("telephone") || "", email: form.get("email") || "",
    adresse: form.get("adresse") || "", code_postal: form.get("code_postal") || "", ville: form.get("ville") || "",
    siret: form.get("siret") || "", notes: form.get("notes") || "",
  };
  if (!saisie.nom) throw new Error("Indique le nom du client");
  const etiquettes = liste(form.get("etiquettes"));
  saisie.cercle = etiquettes[0] || "Autre";
  if (typeof PF != "undefined" && !PF.absent() && PF.etat().charge) saisie.etiquettes = etiquettes;
  const gouts = liste(form.get("gouts")), prevenir = form.get("prevenir") === "on";
  // Goûts et « prévenir » ne partent que s'ils servent (ou si la base les connaît déjà) : une base sans 033 n'a rien à refuser.
  if (gouts.length || prevenir || (client && ("gouts" in client || "prevenir" in client))) Object.assign(saisie, { gouts, prevenir });
  const retirer = (erreur) => {
    if (erreur?.code !== "PGRST204") return false;
    const m = erreur.message || "";
    if (/gouts|prevenir/.test(m)) { delete saisie.gouts; delete saisie.prevenir; toast("Goûts non enregistrés : la base doit être mise à jour.", true); return true; }
    if (/adresse|code_postal|ville|siret/.test(m)) { ["adresse", "code_postal", "ville", "siret"].forEach((k) => delete saisie[k]); toast("Adresse non enregistrée : la base doit être mise à jour.", true); return true; }
    return false;
  };
  if (client) {
    for (let essai = 0; essai < 3; essai++) {
      const { error } = await sb.from("clients").update(saisie).eq("id", client.id);
      if (!error) break;
      if (!retirer(error)) throw error;
    }
    await refresh();
    toast("Client enregistré");
    return client.id;
  }
  let cree = null;
  for (let essai = 0; essai < 3; essai++) {
    const { data, error } = await sb.from("clients").insert(saisie).select().single();
    if (!error) { cree = data; break; }
    if (!retirer(error)) throw error;
  }
  if (!cree) throw new Error("Client non enregistré");
  if (depuisVente && S.vente) S.vente.client_id = cree.id;
  await refresh();
  toast("Client enregistré");
  return cree.id;
}

/* ---------- Saisie : initiales, contacts, adresses ---------- */

let attente = null, requete = null;
function brancher(client) {
  const nom = $sheetForm.querySelector("[name=nom]"), ini = document.getElementById("fc_ini");
  nom?.addEventListener("input", () => { ini.textContent = nom.value.trim() ? initiales(nom.value) : "?"; });
  const champ = document.getElementById("fc_adresse"), boite = document.getElementById("fc_sugg");
  if (!champ || !boite) return;
  const fermer = () => { boite.hidden = true; boite.innerHTML = ""; champ.setAttribute("aria-expanded", "false"); };
  champ.addEventListener("input", () => {
    clearTimeout(attente);
    requete?.abort();
    const t = champ.value.trim();
    if (t.length < 3) return fermer();
    const connues = adressesConnues(S.d.clients, t, { sauf: client?.id });
    montrer(connues, null);
    if (navigator.onLine === false) return;
    attente = setTimeout(async () => {
      requete = new AbortController();
      try {
        const r = await fetch(urlAdresses(t, centre(S.d)), { signal: requete.signal });
        if (!r.ok) return;
        if (champ.value.trim() === t) montrer(connues, lireAdresses(await r.json()));
      } catch { /* hors ligne ou recherche remplacée : on garde les adresses des clients */ }
    }, 250);
  });
  champ.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !boite.hidden) { ev.preventDefault(); ev.stopPropagation(); fermer(); } });
  function montrer(connues, officielles) {
    const t = champ.value.trim();
    const off = (officielles || []).filter((a) => !connues.some((c) => c.adresse.toLowerCase() === a.adresse.toLowerCase() && c.code_postal === a.code_postal));
    if (!connues.length && !off.length && officielles === null) { boite.hidden = true; return; }
    const gras = (s) => { const i = s.toLowerCase().indexOf(t.toLowerCase()); return i < 0 ? e(s) : `${e(s.slice(0, i))}<b>${e(s.slice(i, i + t.length))}</b>${e(s.slice(i + t.length))}`; };
    const opt = (a, k, icone, sous) => `<button type="button" class="fc-opt" role="option" data-act="fcadresse" data-v="${k}">${icone}<span class="pq-t"><span>${gras(a.adresse || a.ville)}</span><span class="small">${e(sous)}</span></span></button>`;
    boite._choix = [...connues, ...off];
    boite.innerHTML = (connues.length ? `<p class="small fc-groupe">Déjà chez tes clients</p>${connues.map((a, i) => opt(a, i, `<span class="pq-rond pq-miel">${GROUPE}</span>`, `${[a.code_postal, a.ville].filter(Boolean).join(" ")} · ${memeAdresse(a.noms)}`)).join("")}` : "")
      + (off.length ? `<p class="small fc-groupe">Adresses en France</p>${off.map((a, i) => opt(a, connues.length + i, `<span class="pq-rond">${PIN}</span>`, [a.code_postal, a.ville].filter(Boolean).join(" "))).join("")}` : "")
      + (officielles === null && navigator.onLine !== false ? '<p class="small fc-groupe">Recherche des adresses…</p>' : "")
      + '<button type="button" class="link fc-main" data-act="fcadressemain">Saisir l’adresse à la main</button>';
    boite.hidden = false;
    champ.setAttribute("aria-expanded", "true");
  }
}

export const actions = {
  fcadresse: (i) => {
    const boite = document.getElementById("fc_sugg"), a = boite?._choix?.[Number(i)];
    if (!a) return;
    const f = (n) => $sheetForm.querySelector(`[name=${n}]`);
    if (a.adresse) f("adresse").value = a.adresse;
    f("code_postal").value = a.code_postal || f("code_postal").value;
    f("ville").value = a.ville || f("ville").value;
    boite.hidden = true; boite.innerHTML = "";
    document.getElementById("fc_adresse")?.setAttribute("aria-expanded", "false");
  },
  fcadressemain: () => {
    const boite = document.getElementById("fc_sugg");
    if (boite) { boite.hidden = true; boite.innerHTML = ""; }
    $sheetForm.querySelector("[name=code_postal]")?.focus();
  },
  fcimport: async () => {
    try {
      const [c] = await navigator.contacts.select(["name", "tel", "email", "address"], { multiple: false });
      if (!c) return;
      const f = (n) => $sheetForm.querySelector(`[name=${n}]`);
      if (c.name?.[0]) { f("nom").value = c.name[0]; f("nom").dispatchEvent(new Event("input", { bubbles: true })); }
      if (c.tel?.[0]) f("telephone").value = c.tel[0];
      if (c.email?.[0]) f("email").value = c.email[0];
      const a = c.address?.[0];
      if (a) { f("adresse").value = (a.addressLine || []).join(" "); f("code_postal").value = a.postalCode || ""; f("ville").value = a.city || ""; }
    } catch { /* annulé */ }
  },
};

/** Remplace clientForm() d'app.js (appelé par newclient, editclient et les écrans qui ouvrent une fiche client). */
export function installer() {
  if (typeof window == "undefined" || window.clientForm?.fiche) return;
  const f = (client, pre) => fiche(client, pre);
  f.fiche = true;
  window.clientForm = f;
}
