// Apiviz — écran Synchronisation (IT-09, AP-FEAT-045, AP-TECH-154, AP-US-050).
// Ce qui est gardé sur le téléphone, exploitation par exploitation : en attente, à corriger, en conflit, ce qui attend
// une autre saisie, les photos ; la dernière fois que tout est parti. Lecture seule : les gestes (envoyer, corriger,
// choisir, passer dans une autre exploitation) sont ceux d'offline.js (hl*) et du menu du compte (n4expl).
// Écran enregistré dans la table des écrans (src/domaines/compte/ecrans.js) : aucune surcharge de render ni de shell.

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const quand = (t) => new Date(t).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const ETIQUETTE = {
  attente: ['<span class="tag watch">en attente</span>', ""],
  bloquee: ['<span class="tag watch">en attente</span>', "part après"],
  quarantaine: ['<span class="tag crit">à corriger</span>', ""],
  conflit: ['<span class="tag crit">à choisir</span>', ""],
};

/** Phrase de tête : l'apiculteur sait en une ligne s'il peut fermer l'application (AP-US-050). */
export function phrase(e) {
  const ici = e.file.filter((x) => x.ici), a = ici.filter((x) => x.statut === "quarantaine" || x.statut === "conflit").length;
  const att = ici.length - a;
  if (a) return { ton: "crit", texte: `${pluriel(a, "saisie")} à corriger ou à choisir`, sous: "Rien n’est perdu : elles restent sur ce téléphone jusqu’à ton choix." };
  if (att || e.photos) {
    const quoi = [att ? pluriel(att, "saisie") : "", e.photos ? pluriel(e.photos, "photo") : ""].filter(Boolean).join(" et ");
    return { ton: "watch", texte: `${quoi} en attente`, sous: e.hors ? "Tout est gardé sur ce téléphone et partira tout seul au retour du réseau. Tu peux fermer l’app." : "Envoi en cours ou au prochain passage. Tu peux fermer l’app sans rien perdre." };
  }
  if (e.autres.length) return { ton: "watch", texte: "Tout est envoyé ici", sous: "Des saisies attendent dans une autre exploitation (voir plus bas)." };
  return { ton: "good", texte: "Tout est envoyé", sous: e.dernier ? `Dernier envoi le ${quand(e.dernier)}.` : "Aucune saisie en attente sur ce téléphone." };
}

export function ecranSynchronisation() {
  const e = HL.etat(), p = phrase(e), ici = e.file.filter((x) => x.ici);
  const ligne = (x) => {
    const [tag, apres] = ETIQUETTE[x.statut] || ETIQUETTE.attente;
    const geste = x.statut === "conflit" ? `<button type="button" class="btn sm" data-act="hlconflit" data-v="${esc(x.id)}">Choisir</button>`
      : x.statut === "quarantaine" ? '<button type="button" class="btn sm" data-act="hlcorriger">Corriger</button>' : tag;
    const detail = [x.titre[1], apres && x.apres ? `${apres} « ${x.apres} »` : "", x.erreur].filter(Boolean).join(" · ");
    return `<div class="hl-row"><span><b>${esc(x.titre[0])}</b>${detail ? `<span class="small${x.erreur ? " crit" : ""}">${esc(detail)}</span>` : ""}</span>${geste}</div>`;
  };
  const autres = e.autres.map((a) => `<div class="hl-row"><span><b>${esc(a.texte)}</b><span class="small">Elles partiront une fois cette exploitation ouverte.</span></span><button type="button" class="btn sm" data-act="n4expl" data-v="${esc(a.id)}">Y passer</button></div>`).join("");
  const envoyer = !e.hors && (ici.length || e.photos)
    ? `<button type="button" class="btn main" data-act="hlenvoyer"${e.envoi ? ' aria-busy="true" disabled' : ""}>Envoyer maintenant</button>` : "";
  shell("Synchronisation", "", "", `<div class="sy">
    <section class="card sy-tete ${p.ton}" role="status"><b>${esc(p.texte)}</b><span class="small">${esc(p.sous)}</span>
      <span class="small">${e.hors ? "Hors ligne" : "En ligne"}${e.depuis ? " · chiffres du " + esc(quand(e.depuis)) : ""}${e.dernier ? " · dernier envoi le " + esc(quand(e.dernier)) : ""}</span>${envoyer}</section>
    ${ici.length || e.photos ? `<section class="card"><h2>Sur ce téléphone, ici</h2>${ici.map(ligne).join("")}
      ${e.photos ? `<div class="hl-row"><span><b>${esc(pluriel(e.photos, "photo"))} de visite</b><span class="small">réduites, partent après leur visite</span></span><span class="tag watch">en attente</span></div>` : ""}</section>` : ""}
    ${autres ? `<section class="card"><h2>Dans tes autres exploitations</h2>${autres}</section>` : ""}
    <section class="card"><h2>Comment ça marche</h2><p class="small">Sans réseau, tes créations, corrections et suppressions sont gardées sur ce téléphone, puis envoyées dans l’ordre au retour du réseau. Une saisie refusée par le serveur, ou modifiée en même temps par un autre membre, reste ici jusqu’à ce que tu choisisses : rien n’est supprimé sans toi.</p>${e.v1 ? '<p class="small crit">Mode de secours actif : sans réseau, seules les créations sont possibles.</p>' : ""}</section>
  </div>`);
}
