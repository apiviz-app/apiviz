// Apiviz — registre d'élevage (version bêta).
// Les traitements sont notés dans la visite ; le registre les rassemble par année,
// s'imprime en PDF et s'exporte pour Excel. S'appuie sur app.js (S, sb, shell, table…).
const RG = (() => {
  ICON.registre = "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5";
  GROUP.registre = "plus";
  const iMat = SIDE.findIndex((x) => x && x[0] === "materiel");
  SIDE.splice(iMat + 1, 0, ["registre", "Registre"]);

  // ---------- Formulaire de visite ----------
  function formSection(e) {
    const deja = [...new Set(S.d.visites.map((v) => v.traitement).filter(Boolean))];
    const opts = [...new Set([...deja, ...consommables().map((a) => a.nom)])].map((x) => `<option value="${esc(x)}">`).join("");
    return `<section class="card stack"><h2>Traitement <span class="small">· facultatif, pour le registre d’élevage</span></h2>
      <label>Produit<input id="v_trt" list="dl_trt" value="${esc(e.traitement || "")}" placeholder="Nom du médicament" autocomplete="off"></label>
      <datalist id="dl_trt">${opts}</datalist>
      <div class="two"><label>N° de lot<input id="v_lot" value="${esc(e.lot_produit || "")}" autocomplete="off"></label>
      <label>Dose<input id="v_dose" value="${esc(e.traitement_dose || "")}" placeholder="2 lanières" autocomplete="off"></label></div>
      <label>Fin du traitement prévue le<input type="date" id="v_retrait" value="${esc(e.retrait_prevu || "")}"></label>
      <label class="rg-check"><input type="checkbox" id="v_ordo" ${e.ordonnance ? "checked" : ""}>Ordonnance ou facture gardée</label>
      <p class="small">Avec une date de fin, la tâche de retrait est ajoutée à l’agenda.</p></section>`;
  }
  function lire() {
    const g = (id) => document.getElementById(id);
    if (!g("v_trt")) return;
    S.visite.traitement = g("v_trt").value.trim();
    S.visite.lot_produit = g("v_lot").value.trim();
    S.visite.traitement_dose = g("v_dose").value.trim();
    S.visite.retrait_prevu = g("v_retrait").value;
    S.visite.ordonnance = g("v_ordo").checked;
  }
  // Après l'enregistrement de la visite : la tâche de fin de traitement.
  async function apres(s, noms) {
    if (!s.traitement || !s.retrait_prevu) return;
    const r = byId(S.d.ruches, s.ruche_id);
    try {
      await write(sb.from("taches").insert({ titre: `Fin du traitement ${s.traitement} (${noms || r?.nom || "ruche"})`, echeance: s.retrait_prevu, ruche_id: s.ruche_id || null }));
    } catch (err) { toast("Visite enregistrée, mais la tâche de retrait n’a pas pu être créée", true); }
  }

  // ---------- Journal de la ruche ----------
  function journal(v) {
    if (!v.traitement) return "";
    const d = [v.lot_produit && "lot " + v.lot_produit, v.traitement_dose, v.retrait_prevu && "fin prévue le " + dfr(v.retrait_prevu)].filter(Boolean).map(esc).join(", ");
    return `<br><span class="small">Traitement : ${esc(v.traitement)}${d ? ", " + d : ""}</span>`;
  }

  // ---------- Registre ----------
  function traitements(an) {
    const d = S.d, g = new Map();
    d.visites.filter((v) => v.traitement && yr(v.date_visite) === an).forEach((v) => {
      const k = [v.date_visite, v.traitement, v.lot_produit, v.traitement_dose, v.retrait_prevu || ""].join("|");
      if (!g.has(k)) g.set(k, { ...v, ruches: [], ordonnance: false, attente: false });
      const o = g.get(k);
      o.ruches.push(byId(d.ruches, v.ruche_id)?.nom || "?");
      o.ordonnance = o.ordonnance || !!v.ordonnance;
      o.attente = o.attente || !!v._attente;
    });
    return [...g.values()].sort((a, b) => String(b.date_visite).localeCompare(String(a.date_visite)));
  }

  function vue() {
    const an = S.annee, c = cfg(), d = S.d, items = traitements(an);
    const enCours = items.filter((i) => i.retrait_prevu && i.retrait_prevu >= today());
    const ruchers = {};
    d.ruches.forEach((r) => { const k = r.rucher || "Sans rucher"; ruchers[k] = (ruchers[k] || 0) + 1; });
    const ident = `<section class="card rg-ident"><div><h2>Apiculteur</h2><p>${esc(c.nom)}</p><p>NAPI : ${c.napi ? esc(c.napi) : '<button class="link" data-act="go" data-v="reglages">à renseigner dans Réglages</button>'}</p></div>
      <div><h2>Ruchers</h2>${Object.entries(ruchers).sort().map(([k, nb]) => `<p>${esc(k)} · ${nb} ruche${nb > 1 ? "s" : ""}</p>`).join("") || '<p class="small">Aucune ruche.</p>'}</div></section>`;
    const alerte = enCours.length ? `<p class="notice">${enCours.length > 1 ? enCours.length + " traitements en cours" : "1 traitement en cours"} : ${enCours.map((i) => `${esc(i.traitement)} jusqu’au ${dfr(i.retrait_prevu)}`).join(" ; ")}.</p>` : "";
    const lignes = items.map((i) => `<tr><td>${dfr(i.date_visite)}${i.attente ? ' <span class="tag watch hl-tag">en attente</span>' : ""}</td><td>${i.retrait_prevu ? dfr(i.retrait_prevu) : "–"}</td><td>${esc(i.traitement)}</td><td>${esc(i.lot_produit) || "–"}</td><td>${esc(i.ruches.join(", "))}</td><td>${esc(i.traitement_dose) || "–"}</td><td>${i.ordonnance ? "Oui" : "Non"}</td></tr>`);
    const corps = items.length
      ? `<section class="card tbl"><h2>Traitements ${an}</h2>${table(["Début", "Fin prévue", "Produit", "N° lot", "Ruches", "Dose", "Ordonnance"], lignes, "")}</section>`
      : emptyState(`Aucun traitement noté en ${an}`, "Notez un traitement dans une visite (produit, lot, dose) : il apparaîtra ici.", "Nouvelle visite", "newvisite");
    shell("Registre d’élevage", `Année ${an} · édité le ${dfr(today())}`,
      `${yearSel()}<button class="btn main" data-act="rgprint">Imprimer ou PDF</button><button class="btn" data-act="exp" data-v="registre">Fichier Excel</button>`,
      `${alerte}${ident}${corps}<p class="small">Gardez les ordonnances et factures des médicaments avec ce registre. Version bêta : faites valider ce modèle par votre GDSA ou votre vétérinaire.</p>`);
  }

  EXP.registre = () => csv(`registre-${S.annee}`, ["Début", "Fin prévue", "Produit", "N° lot", "Dose", "Ruches", "Ordonnance gardée"],
    traitements(S.annee).map((i) => [i.date_visite, i.retrait_prevu || "", i.traitement, i.lot_produit, i.traitement_dose, i.ruches.join(", "), i.ordonnance ? "Oui" : "Non"]));
  ACT.rgprint = () => window.print();

  return { formSection, lire, apres, journal, vue };
})();
