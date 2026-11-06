// Apidoo — visite de plusieurs ruches (version bêta).
// Une même saisie (observations, intrants par ruche, traitement) enregistrée pour chaque ruche choisie.
// S'appuie sur app.js (S, sb, ACT, viewVisite…), offline.js (HL), photos.js (PH) et registre.js (RG).
const VR = (() => {
  const noms = (ids) => ids.map((id) => byId(S.d.ruches, id)?.nom || "?");

  function pick(e) {
    const multi = !!e.multi, sel = new Set(multi ? e.ruches : [e.ruche_id]);
    const boutons = S.d.ruches.map((a) => {
      const on = sel.has(a.id);
      return `<button type="button" class="${on ? "on" : ""}" aria-pressed="${on}" data-act="${multi ? "vrtoggle" : "vset"}" data-k="ruche_id" data-v="${a.id}">${esc(a.nom)}</button>`;
    }).join("");
    const ruchers = {};
    S.d.ruches.forEach((r) => { const k = r.rucher || ""; ruchers[k] = (ruchers[k] || 0) + 1; });
    const tout = Object.entries(ruchers).filter(([, nb]) => nb > 1)
      .map(([k]) => `<button type="button" data-act="vrrucher" data-v="${esc(k)}">Tout « ${esc(k || "Sans rucher")} »</button>`).join("");
    const titre = multi ? `Ruches visitées · ${sel.size} choisie${sel.size > 1 ? "s" : ""}` : "Ruche visitée";
    const bas = S.d.ruches.length < 2 ? "" : multi
      ? `<div class="chips vr-chips">${tout}<button type="button" data-act="vrsolo">Une seule ruche</button></div>
         <p class="small">Les mêmes observations, quantités (par ruche) et traitement seront notés pour chaque ruche. Les photos vont à la première.</p>`
      : `<div class="chips vr-chips"><button type="button" data-act="vrmulti">+ Plusieurs ruches</button></div>`;
    return `<div class="field"><div class="t">${titre}</div><div class="pick">${boutons}</div>${bas}</div>`;
  }

  Object.assign(ACT, {
    vrmulti: () => { readVisitForm(); S.visite.multi = true; S.visite.ruches = [S.visite.ruche_id].filter(Boolean); viewVisite(); },
    vrsolo: () => { readVisitForm(); S.visite.multi = false; S.visite.ruche_id = S.visite.ruches[0] || S.visite.ruche_id; viewVisite(); },
    vrtoggle: (id) => {
      readVisitForm();
      const l = S.visite.ruches, i = l.indexOf(id);
      i >= 0 ? l.splice(i, 1) : l.push(id);
      S.visite.ruche_id = l[0] || "";
      viewVisite();
    },
    vrrucher: (nom) => {
      readVisitForm();
      S.visite.multi = true;
      S.visite.ruches = S.d.ruches.filter((r) => (r.rucher || "") === nom).map((r) => r.id);
      S.visite.ruche_id = S.visite.ruches[0];
      viewVisite();
    },
  });

  // Remplace l'enregistrement d'une visite dans app.js.
  async function enregistrer() {
    readVisitForm();
    const s = S.visite;
    const cibles = s.multi ? [...s.ruches] : [s.ruche_id].filter(Boolean);
    if (!cibles.length) throw new Error("Choisissez une ruche");
    const intrants = Object.entries(s.q).filter(([, q]) => q > 0).map(([article_id, quantite]) => ({ article_id, quantite }));
    for (const x of intrants) { // le stock doit suffire pour toutes les ruches
      const a = byId(S.d.articles, x.article_id);
      if (a && x.quantite * cibles.length > Number(a.stock)) {
        throw new Error(`Stock insuffisant : ${n(x.quantite * cibles.length)} ${a.unite} de ${a.nom} pour ${cibles.length} ruches (reste ${n(a.stock)})`);
      }
    }
    S.busy = true;
    const appel = typeof HL != "undefined" ? HL.rpc : (x, y) => sb.rpc(x, y);
    const faites = []; let local = false;
    for (const id of cibles) {
      const { multi, ruches, q, ...reste } = s;
      const { data, error, local: hl } = await appel("creer_visite", { p: { ...reste, ruche_id: id, couvain: s.couvain === "Non vu" ? "" : s.couvain, intrants } });
      if (error) {
        if (!faites.length) throw error;
        toast(`${faites.length} visite(s) enregistrée(s), arrêt sur ${byId(S.d.ruches, id)?.nom} : ${messageErreur(error)}`, true);
        break;
      }
      faites.push({ id: data, ruche: id }); local = local || !!hl;
    }
    if (typeof PH != "undefined") await PH.rattacher(faites[0].id);
    if (typeof RG != "undefined") await RG.apres({ ...s, ruche_id: faites.length > 1 ? null : faites[0].ruche }, faites.length > 1 ? noms(faites.map((f) => f.ruche)).join(", ") : "");
    if (faites.length > 1) { S.route = "ruches"; } else { S.ruche = faites[0].ruche; S.route = "ruche"; }
    await refresh();
    const nb = faites.length;
    if (nb === cibles.length) toast(nb > 1 ? `${nb} visites ${local ? "gardées sur le téléphone" : "enregistrées"}` : local ? "Visite gardée sur le téléphone" : "Visite enregistrée");
  }

  return { pick, enregistrer };
})();
