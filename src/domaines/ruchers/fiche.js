// Apiviz — fiche rucher et actions du domaine ruchers (IT-05, AP-FEAT-025 et AP-FEAT-026).
// Complète l'écran « rucher » rendu par AL.vueRucher (alveoles.js) : boutons Renommer / Infos / Archiver, et section
// « Infos » repliée (accès, propriétaire avec bouton d'appel, capacité, environnement, ressources, point d'eau, notes).
// Les actions sont déclarées une seule fois par l'écran « rucher » (src/domaines/ruchers/ecrans.js) et enregistrées
// par src/main.js (noyau/actions.js). Les globales d'app.js (S, sb, sheet, write, toast…) ne sont lues qu'à l'appel.
import * as R from "./regles.js";

const e = (t) => esc(t); // esc() d'app.js
const rucherCourant = () => R.rucherParCle(S.d.ruchers, S.rucher);
const parId = (id) => (S.d.ruchers || []).find((r) => r.id === id);
// Fonctions SQL par la file d'envoi (offline.js) : la saisie est gardée sur le téléphone si le réseau manque.
const appel = (nom, args) => (typeof HL != "undefined" ? HL.rpc(nom, args) : sb.rpc(nom, args));
const nouvelId = () => crypto.randomUUID();

/** Section « Infos » (AP-TECH-095) : repliée ; l'accès est lisible sans l'ouvrir, l'appel et l'itinéraire aussi. */
export function infosHtml(r) {
  if (!r) return "";
  const tel = R.lienTel(r.proprietaire_tel);
  const lignes = R.CHAMPS_INFOS.filter(([k]) => k !== "proprietaire_tel" && r[k] != null && String(r[k]).trim() !== "")
    .map(([k, libelle]) => `<div class="rc-info"><dt>${e(libelle)}</dt><dd>${k === "capacite" ? e(R.nomPropre(r[k])) + " colonies" : e(r[k])}</dd></div>`).join("");
  const appelBtn = tel ? `<a class="btn u-lienbtn rc-appel" href="${e(tel)}">Appeler ${e(r.proprietaire || "le propriétaire")}</a>` : "";
  const apercu = r.acces ? `<span class="small rc-apercu">Accès : ${e(String(r.acces).length > 70 ? String(r.acces).slice(0, 70) + "…" : r.acces)}</span>` : "";
  return `<details class="card u-pli rc-infos" id="rcInfos"><summary><span><h2>Infos du rucher</h2>${apercu}</span><span class="u-chev" aria-hidden="true">›</span></summary>
    ${lignes ? `<dl class="rc-liste">${lignes}</dl>` : '<p class="small">Rien de noté pour l’instant : accès, propriétaire, point d’eau…</p>'}
    ${appelBtn ? `<div class="u-deux">${appelBtn}</div>` : ""}
    <div class="u-deux"><button type="button" class="btn" data-act="rcinfos" data-v="${e(r.id)}">Modifier les infos</button></div></details>`;
}

/** Complément de l'écran « rucher » : boutons et section Infos, une fois AL.vueRucher rendu. */
export function completerFiche() {
  if (S.route !== "rucher") return;
  const r = rucherCourant(), wrap = document.querySelector(".wrap");
  if (!r || !wrap) return;
  const tel = R.lienTel(r.proprietaire_tel);
  // L'appel reste à portée de main dans l'en-tête (AP-US-030), même section repliée.
  if (tel) wrap.querySelector(".head .actions")?.insertAdjacentHTML("afterbegin", `<a class="btn u-lienbtn" href="${e(tel)}" aria-label="Appeler ${e(r.proprietaire || "le propriétaire")}">Appeler</a>`);
  const gestion = r.archive_le
    ? `<button type="button" class="btn" data-act="rcrouvrir" data-v="${e(r.id)}">Rouvrir ce rucher</button>`
    : `<button type="button" class="btn" data-act="dpouvrir" data-v="${e(r.id)}">Déplacer des colonies</button><button type="button" class="btn" data-act="rcrenommer" data-v="${e(r.id)}">Renommer</button><button type="button" class="btn" data-act="rcarchiver" data-v="${e(r.id)}">Archiver</button>`;
  const fiche = wrap.querySelector(".al-fiche");
  (fiche || wrap.lastElementChild)?.insertAdjacentHTML(fiche ? "beforebegin" : "afterend", infosHtml(r));
  wrap.insertAdjacentHTML("beforeend", `<section class="card rc-gestion"><h2>Gérer ce rucher</h2><div class="u-deux">${gestion}</div></section>`);
}

// ---------- Actions ----------
function nouveau() {
  sheet({
    title: "Nouveau rucher",
    intro: "Tu pourras ensuite le placer sur la carte, noter son accès et y ajouter des ruches.",
    label: "Créer",
    fields: [{ name: "nom", label: "Nom du rucher", required: !0, value: "" }],
    submit: async (f) => {
      const nom = R.nomPropre(f.nom);
      if (!R.nomLibre(S.d.ruchers, nom)) throw new Error("Ce rucher existe déjà.");
      const id = nouvelId();
      const { error, local } = await appel("creer_rucher", { p: { id, nom } });
      if (error) throw error;
      S.rucher = nom; S.route = "rucher";
      if (local) { appliquerLocal({ id, nom }); toast("Gardé sur le téléphone : envoi au retour du réseau"); }
      else { await refresh(); toast("Rucher créé"); }
    },
  });
}

// Sans réseau : le rucher est montré tout de suite (offline.js le recrée de même au rechargement).
function appliquerLocal(p) {
  (S.d.ruchers ||= []);
  if (!S.d.ruchers.some((r) => r.id === p.id)) S.d.ruchers.push({ id: p.id, nom: p.nom, lat: null, lng: null, archive_le: null });
  typeof HL != "undefined" && HL.garderDonnees();
  render();
}

function renommer(id) {
  const r = parId(id);
  if (!r) return;
  sheet({
    title: "Renommer le rucher",
    intro: "Toutes ses colonies prennent le nouveau nom.",
    fields: [{ name: "nom", label: "Nom", required: !0, value: r.nom }],
    submit: async (f) => {
      const nom = R.nomPropre(f.nom);
      if (!nom) throw new Error("Donne un nom au rucher.");
      if (nom === r.nom) return;
      if (!R.nomLibre(S.d.ruchers, nom, r.id)) throw new Error("Ce nom existe déjà.");
      const avant = S.rucher;
      S.rucher = nom; // la fiche suit le rucher sous son nouveau nom
      try { await write(sb.from("ruchers").update({ nom }).eq("id", r.id), "Rucher renommé"); }
      catch (err) { S.rucher = avant; throw err; }
    },
  });
}

function infos(id) {
  const r = parId(id);
  if (!r) return;
  const type = { capacite: "number", proprietaire_tel: "tel", acces: "textarea", notes: "textarea", environnement: "textarea", ressources: "textarea" };
  sheet({
    title: "Infos du rucher",
    fields: R.CHAMPS_INFOS.map(([k, label]) => ({ name: k, label, type: type[k] || "text", value: r[k] ?? "", ...(k === "capacite" ? { min: 0, step: "1" } : {}) })),
    submit: (f) => write(sb.from("ruchers").update(R.infosDepuis(f)).eq("id", r.id), "Infos enregistrées"),
  });
}

function archiver(id, _k, bouton) {
  const r = parId(id);
  if (!r) return;
  const rs = S.d.ruches.filter((x) => x.rucher_id === r.id || R.cle(x.rucher) === R.cle(r.nom));
  if (!R.archivable(rs)) return toast("Déplace d’abord ses colonies : un rucher ne s’archive qu’une fois vide.", !0);
  return twoStep(bouton, "Confirmer l’archivage", async () => {
    await write(sb.from("ruchers").update({ archive_le: new Date().toISOString() }).eq("id", r.id), "Rucher archivé");
  });
}

const rouvrir = (id) => write(sb.from("ruchers").update({ archive_le: null }).eq("id", id), "Rucher rouvert");

/** Actions de l'écran « rucher » (et des boutons de l'écran Ruchers qui y mènent). */
export const actions = {
  rcnouveau: nouveau,
  rcrenommer: renommer,
  rcinfos: infos,
  rcarchiver: archiver,
  rcrouvrir: rouvrir,
  // Ajouter des ruches dans un rucher : le formulaire habituel, rucher déjà choisi.
  rcajouter: (k) => ruchesForm(k),
  // Placer un rucher depuis l'écran Ruchers : la carte s'ouvre en mode « placer ».
  rcplacer: (k) => { UX.viser(k); go("carte"); },
};
