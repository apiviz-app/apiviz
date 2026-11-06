// Apidoo — version 3 : colonie (reine, hausses, équipement, vie de la colonie), suivi varroa,
// récolte et traçabilité, commandes à livrer, tournée au rucher avec dictée, déclaration annuelle,
// recherche, activité récente et mode plein soleil.
// Chargé après ux.js et offline.js. S'appuie sur app.js (S, sb, ACT…), UX, VR, HL, PH.
const V3 = (() => {
  const U = UX;
  const nouvelId = () => (crypto.randomUUID ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
  const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const plusJours = (d, j) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + j); return x.toISOString().slice(0, 10); };
  async function ok(q) { const { error } = await q; if (error) throw error; }

  // ---------- Icônes, routes, données ----------
  Object.assign(ICON, {
    recherche: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
    varroa: "M4 19l4-6 4 3 4-7 4 4M4 5v14h16",
    declaration: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
    activite: "M4 12h4l2-6 4 12 2-6h4",
    recolte: "M5 9h14l-1 11H6zM8 9V6a4 4 0 0 1 8 0v3",
    soleil: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5",
  });
  Object.assign(GROUP, { recolte: "ruches", varroa: "plus", declaration: "plus", activite: "plus", recherche: "plus" });
  TABLES.evenements = ["ruche_evenements", "date_evenement", false];

  // Les ruches sorties (mortes, vendues, réunies) quittent les listes mais gardent leur historique.
  function separer(d) {
    if (!d) return;
    const tous = [...(d.ruches || []), ...(d.ruchesSorties || [])];
    const tri = (a, b) => String(a.nom).localeCompare(String(b.nom), "fr", { numeric: true });
    d.ruchesSorties = tous.filter((r) => r.sortie).sort(tri);
    d.ruches = tous.filter((r) => !r.sortie).sort(tri);
    d.evenements = d.evenements || [];
  }
  const loadAvant = window.loadAll;
  window.loadAll = async function () { await loadAvant(); separer(S.d); };
  if (S.d) separer(S.d);

  // Écrans récolte, varroa, déclaration, activité et recherche : enregistrés dans le noyau (src/domaines/…, V3.vues).
  const VUES = { recolte: vueRecolte, varroa: vueVarroa, declaration: vueDeclaration, activite: vueActivite, recherche: vueRecherche };
  // Bouton de recherche dans la barre du haut, après chaque coquille (crochet du noyau, IT-03).
  Noyau.crochets.sur("apresCoquille", "v3.recherche", () => boutonRecherche());
  function boutonRecherche() {
    const tb = document.querySelector(".topbar");
    if (!tb || tb.querySelector(".v3-cherche")) return;
    tb.querySelector(".avatar")?.insertAdjacentHTML("beforebegin", `<button type="button" class="v3-cherche" data-act="go" data-v="recherche" aria-label="Rechercher">${icon("recherche")}</button>`);
  }
  const goAvant = ACT.go;
  ACT.go = (v) => (v === "livrer" ? (U.onglet("livrer"), go("clients")) : goAvant(v));

  // ---------- Colonie ----------
  const MARQUE = { 1: ["Blanc", "#F4F4F4"], 6: ["Blanc", "#F4F4F4"], 2: ["Jaune", "#F2C200"], 7: ["Jaune", "#F2C200"], 3: ["Rouge", "#C62828"], 8: ["Rouge", "#C62828"],
    4: ["Vert", "#2E7D32"], 9: ["Vert", "#2E7D32"], 5: ["Bleu", "#1565C0"], 0: ["Bleu", "#1565C0"] };
  const EQUIP = ["Grille à reine", "Nourrisseur", "Plateau grillagé", "Réducteur d’entrée", "Chasse-abeilles", "Partition"];
  const ORIGINES = ["", "Élevée par la colonie", "Essaim naturel", "Achetée", "Élevage maison"];
  const TYPES = { installation: "Installation", division: "Division", essaimage: "Essaimage", reunion: "Réunion", reine: "Nouvelle reine", sortie: "Sortie", reactivation: "Remise en service" };
  const tousLesRuches = () => [...S.d.ruches, ...(S.d.ruchesSorties || [])];
  const rucheDe = (id) => byId(tousLesRuches(), id);
  const evt = (ruche_id, type, detail = "", autre_ruche_id = null, date_evenement = today()) => ({ ruche_id, type, detail, autre_ruche_id, date_evenement });

  function colonie(r) {
    const an = new Date().getFullYear();
    const m = r.annee_reine ? MARQUE[r.annee_reine % 10] : null;
    const reine = `<section class="card v3-reine"><div class="u-entete"><h2>Reine</h2>${r.sortie ? "" : `<button type="button" class="link" data-act="v3reine" data-v="${r.id}">${r.annee_reine ? "Changer" : "Renseigner"}</button>`}</div>
      ${r.annee_reine ? `<div class="v3-reine-l"><span class="v3-pastille" style="background:${m[1]}" aria-hidden="true"></span><span><b>Reine ${r.annee_reine}</b> · ${an - r.annee_reine <= 0 ? "de l’année" : an - r.annee_reine + " an" + (an - r.annee_reine > 1 ? "s" : "")}
        <span class="small">Marquage ${m[0].toLowerCase()}${r.reine_origine ? " · " + esc(r.reine_origine.toLowerCase()) : ""}${r.reine_introduite ? " · introduite le " + esc(dfr(r.reine_introduite)) : ""}</span></span></div>
        ${an - r.annee_reine >= 3 ? '<p class="small watch">Reine de 3 ans ou plus : pensez à la remplacer.</p>' : ""}`
        : '<p class="small">Année inconnue. Renseignez-la pour suivre son âge et sa couleur de marquage.</p>'}</section>`;
    const actif = !r.sortie;
    const hausses = `<section class="card"><div class="v3-ligne"><span><b>Hausses posées</b><span class="small">retirées automatiquement à la récolte</span></span>
      ${actif ? `<div class="ctl"><button type="button" aria-label="Retirer une hausse" data-act="v3hausse" data-v="-1" data-k="${r.id}">−</button><span>${r.hausses || 0}</span><button type="button" aria-label="Ajouter une hausse" data-act="v3hausse" data-v="1" data-k="${r.id}">+</button></div>` : `<b>${r.hausses || 0}</b>`}</div>
      <h2 class="v3-sous">Équipement en place</h2><div class="chips v3-equip">${EQUIP.map((x) => { const on = (r.equipement || []).includes(x);
        return `<button type="button" class="${on ? "on" : ""}" aria-pressed="${on}" ${actif ? `data-act="v3equip" data-k="${r.id}" data-v="${esc(x)}"` : "disabled"}>${esc(x)}</button>`; }).join("")}</div></section>`;
    const vie = actif ? `<section class="card"><h2>Vie de la colonie</h2><div class="v3-actions">
        <button type="button" class="btn" data-act="v3diviser" data-v="${r.id}">Diviser</button>
        <button type="button" class="btn" data-act="v3essaimage" data-v="${r.id}">Essaimage</button>
        <button type="button" class="btn" data-act="v3reunir" data-v="${r.id}" ${S.d.ruches.length < 2 ? "disabled" : ""}>Réunir</button>
        <button type="button" class="btn" data-act="v3sortie" data-v="${r.id}">Sortie</button></div></section>`
      : `<section class="card"><p>Cette colonie est sortie du rucher (${esc(r.sortie.toLowerCase())}). Elle n’est plus comptée dans vos ruches.</p><button type="button" class="btn" data-act="v3reactiver" data-v="${r.id}">Remettre en service</button></section>`;
    const evs = S.d.evenements.filter((e) => e.ruche_id === r.id);
    const lignes = evs.map((e) => `<div class="v3-evt"><span class="small">${esc(U.dateCourte(e.date_evenement))}</span><span><b>${esc(TYPES[e.type] || e.type)}</b>${e.detail ? `<span class="small">${esc(e.detail)}</span>` : ""}</span>
      ${e.autre_ruche_id && rucheDe(e.autre_ruche_id) ? `<button type="button" class="link" data-act="ruche" data-v="${e.autre_ruche_id}">${esc(rucheDe(e.autre_ruche_id).nom)}</button>` : "<span></span>"}</div>`).join("");
    const install = r.date_installation && !evs.some((e) => e.type === "installation") ? `<div class="v3-evt"><span class="small">${esc(U.dateCourte(r.date_installation))}</span><span><b>Installation</b></span><span></span></div>` : "";
    return `${reine}${hausses}${vie}<section class="card"><h2>Historique</h2>${lignes + install || '<p class="small">Rien pour le moment : divisions, essaimages, changements de reine apparaîtront ici.</p>'}</section>`;
  }

  const nomSuivant = () => {
    const nums = tousLesRuches().map((r) => Number(String(r.nom).match(/(\d+)\s*$/)?.[1])).filter((x) => x > 0);
    return "Ruche " + (Math.max(tousLesRuches().length, ...nums) + 1);
  };
  async function creerRuche(base, nom, rucher, etat = "À surveiller") {
    const id = nouvelId();
    await ok(sb.from("ruches").insert({ id, nom, rucher: rucher ?? base.rucher ?? "", type_ruche: base.type_ruche || "", etat, date_installation: today(), lat: base.lat ?? null, lng: base.lng ?? null }));
    return id;
  }
  const ruchersConnus = () => [...new Set(S.d.ruches.map((r) => r.rucher || "").filter(Boolean))];

  Object.assign(ACT, {
    v3reine: (id) => {
      const r = rucheDe(id);
      sheet({ title: "Reine de " + r.nom, fields: [
        { name: "annee", label: "Année de naissance", type: "number", step: "1", min: 2000, required: true, value: r.annee_reine || new Date().getFullYear() },
        { name: "origine", label: "Origine", type: "select", options: ORIGINES.map((o) => [o, o || "Non précisée"]), value: r.reine_origine || "" },
        { name: "date", label: "Introduite ou vue la première fois le", type: "date", value: r.reine_introduite || "" }],
      submit: async (f) => {
        const nouvelle = Number(f.annee) !== Number(r.annee_reine);
        await ok(sb.from("ruches").update({ annee_reine: Number(f.annee), reine_origine: f.origine, reine_introduite: f.date || null }).eq("id", id));
        if (nouvelle) await ok(sb.from("ruche_evenements").insert(evt(id, "reine", `Reine ${f.annee}${f.origine ? " · " + f.origine.toLowerCase() : ""}`, null, f.date || today())));
        await refresh(); toast("Reine enregistrée");
      } });
    },
    v3hausse: (delta, id) => { const r = rucheDe(id); return write(sb.from("ruches").update({ hausses: Math.max(0, (r.hausses || 0) + Number(delta)) }).eq("id", id)); },
    v3equip: (x, id) => {
      const r = rucheDe(id), l = new Set(r.equipement || []);
      l.has(x) ? l.delete(x) : l.add(x);
      return write(sb.from("ruches").update({ equipement: [...l] }).eq("id", id));
    },
    v3diviser: (id) => {
      const r = rucheDe(id);
      sheet({ title: "Diviser " + r.nom, intro: "Une nouvelle ruche est créée avec une partie des cadres. Elle élèvera sa reine si elle n’en a pas.",
        fields: [{ name: "nom", label: "Nom de la nouvelle ruche", required: true, value: nomSuivant() },
          { name: "rucher", label: "Rucher", value: r.rucher || "", list: ruchersConnus() },
          { name: "detail", label: "Note (facultatif)", value: "" }],
        submit: async (f) => {
          const nid = await creerRuche(r, f.nom.trim(), f.rucher.trim());
          await ok(sb.from("ruche_evenements").insert([evt(id, "division", ["Nouvelle ruche : " + f.nom.trim(), f.detail].filter(Boolean).join(" · "), nid),
            evt(nid, "installation", "Issue de la division de " + r.nom, id)]));
          await refresh(); toast(`${f.nom.trim()} créée`);
        } });
    },
    v3essaimage: (id) => {
      const r = rucheDe(id);
      sheet({ title: "Essaimage de " + r.nom, fields: [
        { name: "date", label: "Date", type: "date", required: true, value: today() },
        { name: "recup", label: "Essaim récupéré ?", type: "select", options: [["", "Non"], ["1", "Oui, dans une nouvelle ruche"]], value: "" },
        { name: "nom", label: "Nom de la nouvelle ruche (si récupéré)", value: nomSuivant() }],
        submit: async (f) => {
          let nid = null;
          if (f.recup) nid = await creerRuche(r, f.nom.trim() || nomSuivant());
          await ok(sb.from("ruches").update({ etat: "À surveiller" }).eq("id", id));
          await ok(sb.from("ruche_evenements").insert([evt(id, "essaimage", nid ? "Essaim récupéré : " + (f.nom.trim() || "") : "Essaim perdu", nid, f.date),
            ...(nid ? [evt(nid, "installation", "Essaim de " + r.nom, id, f.date)] : [])]));
          await refresh(); toast("Essaimage noté");
        } });
    },
    v3reunir: (id) => {
      const r = rucheDe(id), autres = S.d.ruches.filter((x) => x.id !== id);
      sheet({ title: "Réunir avec " + r.nom, intro: `La ruche choisie est réunie dans ${r.nom} : elle sort de vos ruches actives et garde son historique.`,
        fields: [{ name: "autre", label: "Ruche réunie dans " + r.nom, type: "select", required: true, options: [["", "Choisir…"]].concat(autres.map((x) => [x.id, x.nom + (x.rucher ? " · " + x.rucher : "")])), value: "" },
          { name: "date", label: "Date", type: "date", required: true, value: today() }],
        submit: async (f) => {
          const a = rucheDe(f.autre);
          if (!a) throw new Error("Choisissez la ruche à réunir");
          await ok(sb.from("ruches").update({ sortie: "Réunie", date_sortie: f.date }).eq("id", a.id));
          await ok(sb.from("ruche_evenements").insert([evt(id, "reunion", a.nom + " réunie dans cette ruche", a.id, f.date), evt(a.id, "sortie", "Réunie dans " + r.nom, id, f.date)]));
          await refresh(); toast(`${a.nom} réunie dans ${r.nom}`);
        } });
    },
    v3sortie: (id) => {
      const r = rucheDe(id);
      sheet({ title: "Sortie de " + r.nom, intro: "La ruche quitte vos ruches actives et la déclaration. Son historique reste consultable.",
        fields: [{ name: "motif", label: "Motif", type: "select", options: ["Morte", "Vendue"], value: "Morte" },
          { name: "date", label: "Date", type: "date", required: true, value: today() },
          { name: "detail", label: "Précision (facultatif)", value: "" }],
        submit: async (f) => {
          await ok(sb.from("ruches").update({ sortie: f.motif, date_sortie: f.date }).eq("id", id));
          await ok(sb.from("ruche_evenements").insert(evt(id, "sortie", [f.motif, f.detail].filter(Boolean).join(" · "), null, f.date)));
          await refresh(); toast(`${r.nom} : sortie enregistrée`);
        } });
    },
    v3reactiver: async (id) => {
      await ok(sb.from("ruches").update({ sortie: "", date_sortie: null }).eq("id", id));
      await write(sb.from("ruche_evenements").insert(evt(id, "reactivation")), "Ruche remise en service");
    },
  });

  // Ruches sorties en bas de la liste des ruches.
  const ruchesAvant = window.viewRuches;
  window.viewRuches = function () {
    ruchesAvant();
    const rs = S.d.ruchesSorties || [];
    if (!rs.length) return;
    document.querySelector(".wrap")?.insertAdjacentHTML("beforeend", `<details class="card u-pli"><summary><h2>Ruches sorties · ${rs.length}</h2><span class="u-chev" aria-hidden="true">›</span></summary>
      ${rs.map((r) => `<button type="button" class="u-todo" data-act="ruche" data-v="${r.id}"><span class="u-dot bg-crit" aria-hidden="true"></span><span class="u-todo-t"><b>${esc(r.nom)}</b><span class="small">${esc(r.sortie)}${r.date_sortie ? " le " + esc(dfr(r.date_sortie)) : ""}</span></span><span class="u-chev" aria-hidden="true">›</span></button>`).join("")}</details>`);
  };

  // ---------- Varroa ----------
  const mesures = (id) => S.d.visites.filter((v) => v.ruche_id === id && v.varroa != null);
  const visiteAvant = ACT.newvisite;
  ACT.newvisite = (id) => {
    visiteAvant(id);
    if (S.visite && !S.visite.varroa_methode) {
      S.visite.varroa_methode = S.d.visites.find((v) => v.varroa_methode)?.varroa_methode || "Sucre glace";
      S.visite.varroa_abeilles = "";
      if (S.route === "visite") viewVisite();
    }
  };
  const lireAvant = window.readVisitForm;
  window.readVisitForm = function () {
    lireAvant();
    if (!document.getElementById("v_date") || !S.visite) return;
    const a = document.getElementById("v_abeilles");
    S.visite.varroa_abeilles = S.visite.varroa_methode === "Lange" ? "" : a ? a.value : S.visite.varroa_abeilles ?? "";
  };
  ACT.v3compter = (id) => { ACT.newvisite(id); U.ouvrir("poids"); viewVisite(); document.getElementById("v_varroa")?.focus(); };

  function vueVarroa() {
    const seuil = U.seuilVarroa();
    const lignes = S.d.ruches.map((r) => {
      const ms = mesures(r.id), der = ms[0], t = U.tauxVarroa(der);
      const ton = t === null ? "" : t >= seuil ? "crit" : t >= seuil * 0.66 ? "watch" : "good";
      const pts = ms.filter((v) => U.tauxVarroa(v) !== null).slice(0, 12).reverse();
      const courbe = pts.length > 1 ? lineChart({ labels: pts.map((v) => dshort(v.date_visite)),
        series: [{ name: "Taux", color: C.honey, values: pts.map((v) => Math.round(U.tauxVarroa(v) * 10) / 10) }, { name: "Seuil", color: "#A61B1B", values: pts.map(() => seuil) }],
        fmt: (x) => n(x, 1) + " %", h: 150, title: "Varroas pour 100 abeilles, " + r.nom }) : "";
      return `<section class="card"><div class="u-entete"><div><b>${esc(r.nom)}</b><div class="small">${der ? `${esc(U.dateCourte(der.date_visite))} · ${der.varroa_methode ? esc(der.varroa_methode.toLowerCase()) : "méthode non notée"}` : "Jamais compté"}</div></div>
        <span class="v3-droite">${der ? `<b class="${ton}">${t !== null ? n(t, 1) + " %" : der.varroa + " varroas"}</b>` : ""}<button type="button" class="btn sm" data-act="v3compter" data-v="${r.id}">Compter</button></span></div>${courbe}</section>`;
    }).join("");
    const haut = S.d.ruches.filter((r) => { const t = U.tauxVarroa(mesures(r.id)[0]); return t !== null && t >= seuil; }).length;
    shell("Suivi varroa", haut ? `${U.pluriel(haut, "ruche")} au-dessus du seuil` : "Taux pour 100 abeilles", "",
      `<section class="card"><form data-form="v3seuil"><label for="v3seuil">Seuil d’alerte (varroas pour 100 abeilles)</label><div class="v3-rang"><input id="v3seuil" name="s" type="number" step="0.1" min="0.1" inputmode="decimal" value="${esc(seuil)}"><button class="btn">Enregistrer</button></div></form>
        <p class="small">Réglable selon les conseils de votre GDSA ou de votre technicien sanitaire. Taux = varroas comptés ÷ abeilles prélevées × 100 (sucre glace ou lavage, environ 300 abeilles).</p></section>
      ${lignes || '<p class="small">Aucune ruche active.</p>'}`);
  }
  const todosAvant = window.todos;
  window.todos = function () {
    const l = todosAvant().map((x) => (x[0] === "Obligation" ? [x[0], x[1], x[2], "declaration"] : x));
    const seuil = U.seuilVarroa();
    S.d.ruches.forEach((r) => {
      const t = U.tauxVarroa(mesures(r.id)[0]);
      if (t !== null && t >= seuil) l.unshift([r.nom, "crit", `Varroa ${n(t, 1)} % (seuil ${n(seuil, 1)} %)`, "ruche:" + r.id]);
    });
    const al = S.d.ventes.filter((v) => v.livre === false).length;
    if (al) l.push(["À livrer", "watch", `${U.pluriel(al, "commande")} à livrer`, "livrer"]);
    return l;
  };

  // ---------- Récolte et traçabilité ----------
  const FORMATS = [1000, 500, 250];
  ACT.newrecolte = () => {
    const rs = U.ruchers();
    const prix = (g) => S.d.lots.find((l) => Number(l.format_g) === g)?.prix ?? "";
    S.recolte = { rucher: rs[0]?.[0] ?? "", h: {}, kg: "", humidite: "", miel: S.d.lots[0]?.miel || "Toutes fleurs", date: today(),
      pots: Object.fromEntries(FORMATS.map((g) => [g, { n: "", prix: prix(g) }])), ddm: plusJours(today(), 730) };
    (rs[0]?.[1] || []).forEach((r) => { S.recolte.h[r.id] = r.hausses || 0; });
    go("recolte");
  };
  function lireRecolte() {
    const R = S.recolte, v = (id) => document.getElementById(id)?.value;
    if (!R || !document.getElementById("r_kg")) return;
    R.kg = v("r_kg"); R.humidite = v("r_hum"); R.miel = v("r_miel"); R.date = v("r_date"); R.ddm = v("r_ddm");
    FORMATS.forEach((g) => { R.pots[g].n = v("r_p" + g); R.pots[g].prix = v("r_x" + g); });
  }
  const avisHumidite = (h) => (h === "" || h == null || isNaN(h) ? "" : h <= 18 ? '<span class="good">Bon pour la conservation</span>'
    : h <= 20 ? '<span class="watch">À surveiller : limite légale 20 %</span>' : '<span class="crit">Trop humide : risque de fermentation (limite 20 %)</span>');
  const kgPots = (R) => sum(FORMATS, (g) => (Number(R.pots[g].n) || 0) * g / 1000);
  function vueRecolte() {
    if (!S.recolte) return ACT.newrecolte();
    const R = S.recolte, rs = U.ruchers(), dans = (rs.find(([k]) => k === R.rucher)?.[1] || []);
    const H = sum(dans, (r) => R.h[r.id] || 0);
    const mp = kgPots(R), reste = (Number(R.kg) || 0) - mp;
    shell("Récolte", "Hausses, poids, mise en pots", '<button class="btn" data-act="go" data-v="ruches">Annuler</button>', `
    <form data-form="v3recolte" class="form">
      ${rs.length > 1 ? `<div class="field"><div class="t">Rucher</div><div class="pick">${rs.map(([k]) => `<button type="button" class="${k === R.rucher ? "on" : ""}" aria-pressed="${k === R.rucher}" data-act="v3rrucher" data-v="${esc(k)}">${esc(U.nomRucher(k))}</button>`).join("")}</div></div>` : ""}
      <section class="card"><h2>Hausses récoltées · ${H}</h2>
        ${dans.map((r) => `<div class="stepper"><div><b>${esc(r.nom)}</b><div class="small">${r.hausses || 0} posée${(r.hausses || 0) > 1 ? "s" : ""}</div></div><div class="ctl"><button type="button" aria-label="Une hausse de moins pour ${esc(r.nom)}" data-act="v3rh" data-k="${r.id}" data-v="-1">−</button><span>${R.h[r.id] || 0}</span><button type="button" aria-label="Une hausse de plus pour ${esc(r.nom)}" data-act="v3rh" data-k="${r.id}" data-v="1">+</button></div></div>`).join("")}
        <p class="small">Le miel est réparti entre les ruches selon leurs hausses. Sans hausse comptée, la récolte est notée pour tout le rucher.</p></section>
      <section class="card"><div class="two"><label>Miel extrait (kg)<input id="r_kg" type="number" step="0.1" min="0.1" inputmode="decimal" required value="${esc(R.kg)}"></label>
        <label>Humidité (%)<input id="r_hum" type="number" step="0.1" min="10" max="30" inputmode="decimal" value="${esc(R.humidite)}" placeholder="Réfractomètre"></label></div>
        <p class="small" id="r_humh">${avisHumidite(R.humidite === "" ? "" : Number(R.humidite))}</p>
        <div class="two"><label>Miel<input id="r_miel" value="${esc(R.miel)}" list="dl_v3miel"></label><label>Date d’extraction<input id="r_date" type="date" max="${today()}" value="${esc(R.date)}" required></label></div>
        <datalist id="dl_v3miel">${[...new Set(["Toutes fleurs", "Printemps", "Été", "Acacia", "Tilleul", "Châtaignier", "Colza", "Forêt", ...S.d.lots.map((l) => l.miel)])].map((m) => `<option value="${esc(m)}">`).join("")}</datalist></section>
      <section class="card"><h2>Mise en pots</h2><p class="small">Facultatif : crée un lot par format, relié à cette extraction.</p>
        ${FORMATS.map((g) => `<div class="v3-pots"><b>${g >= 1000 ? g / 1000 + " kg" : g + " g"}</b><label>Pots<input id="r_p${g}" type="number" step="1" min="0" inputmode="numeric" value="${esc(R.pots[g].n)}" data-v3r="1"></label><label>Prix (€)<input id="r_x${g}" type="number" step="0.01" min="0" inputmode="decimal" value="${esc(R.pots[g].prix)}"></label></div>`).join("")}
        <label>DDM<input id="r_ddm" type="date" value="${esc(R.ddm)}"></label>
        <p class="small" id="r_pots">${mp ? `${n(mp)} kg mis en pots${R.kg ? reste >= -0.05 ? ` · ${n(Math.max(0, reste))} kg restent en vrac` : ` · <span class="crit">plus que le miel extrait</span>` : ""}` : ""}</p></section>
      <div class="u-barre"><button class="btn main block" ${S.busy ? "disabled" : ""}>Enregistrer la récolte</button></div>
    </form>`);
  }
  document.addEventListener("input", (e) => {
    if (S.route !== "recolte" || !S.recolte) return;
    if (e.target.id === "r_hum") { const el = document.getElementById("r_humh"); if (el) el.innerHTML = avisHumidite(e.target.value === "" ? "" : Number(e.target.value)); }
    if (e.target.dataset.v3r || e.target.id === "r_kg") {
      lireRecolte();
      const R = S.recolte, mp = kgPots(R), reste = (Number(R.kg) || 0) - mp, el = document.getElementById("r_pots");
      if (el) el.innerHTML = mp ? `${n(mp)} kg mis en pots${R.kg ? reste >= -0.05 ? ` · ${n(Math.max(0, reste))} kg restent en vrac` : ` · <span class="crit">plus que le miel extrait</span>` : ""}` : "";
    }
  });
  Object.assign(ACT, {
    v3rrucher: (k) => { lireRecolte(); S.recolte.rucher = k; S.recolte.h = {}; (U.ruchers().find(([x]) => x === k)?.[1] || []).forEach((r) => { S.recolte.h[r.id] = r.hausses || 0; }); vueRecolte(); },
    v3rh: (d, id) => { lireRecolte(); S.recolte.h[id] = Math.max(0, (S.recolte.h[id] || 0) + Number(d)); vueRecolte(); },
  });
  async function enregistrerRecolte() {
    lireRecolte();
    const R = S.recolte, kg = Number(R.kg);
    if (!(kg > 0)) throw new Error("Indiquez le poids de miel extrait");
    const hum = R.humidite === "" ? null : Number(R.humidite);
    const dans = (U.ruchers().find(([k]) => k === R.rucher)?.[1] || []).filter((r) => (R.h[r.id] || 0) > 0);
    const H = sum(dans, (r) => R.h[r.id]);
    const ext = `E${R.date.slice(2).replace(/-/g, "")}-${S.d.recoltes.filter((x) => x.date_recolte === R.date && x.extraction).reduce((s, x) => s.add(x.extraction), new Set()).size + 1}`;
    const base = { date_recolte: R.date, humidite: hum, miel: R.miel || "", extraction: ext };
    let lignes;
    if (H > 0) {
      let reste = Math.round(kg * 100);
      lignes = dans.map((r, i) => {
        const c = i === dans.length - 1 ? reste : Math.round(kg * 100 * R.h[r.id] / H);
        reste -= c;
        return { ...base, id: nouvelId(), ruche_id: r.id, kg: c / 100, hausses: R.h[r.id] };
      });
    } else lignes = [{ ...base, id: nouvelId(), ruche_id: null, kg, hausses: null }];
    const pots = FORMATS.filter((g) => Number(R.pots[g].n) > 0);
    for (const g of pots) if (!(Number(R.pots[g].prix) >= 0) || R.pots[g].prix === "") throw new Error(`Indiquez le prix du pot de ${g} g`);
    if (kgPots(R) > kg + 0.05) throw new Error("Plus de miel en pots que de miel extrait");
    S.busy = true;
    if (!pots.length) {
      await write(sb.from("recoltes").insert(lignes), `Récolte enregistrée · ${n(kg)} kg`);
    } else {
      await ok(sb.from("recoltes").insert(lignes));
      const yy = R.date.slice(2, 4);
      let nn = Math.max(0, ...S.d.lots.map((l) => Number(String(l.code).match(new RegExp(`^L${yy}-(\\d+)$`))?.[1]) || 0));
      await ok(sb.from("lots").insert(pots.map((g) => ({ code: `L${yy}-${String(++nn).padStart(2, "0")}`, miel: R.miel || "Toutes fleurs", format_g: g,
        prix: Number(R.pots[g].prix), pots_initiaux: Number(R.pots[g].n), date_mise_en_pot: R.date, ddm: R.ddm || null, extraction: ext }))));
    }
    for (const r of dans) await sb.from("ruches").update({ hausses: Math.max(0, (r.hausses || 0) - R.h[r.id]) }).eq("id", r.id);
    S.recolte = null;
    S.route = pots.length ? "miel" : "ruches";
    await refresh();
    if (pots.length) toast(`Récolte et ${U.pluriel(pots.length, "lot")} enregistrés · extraction ${ext}`);
  }
  const lotAvant = window.lotForm;
  window.lotForm = function (l) {
    lotAvant(l);
    if (!l?.extraction) return;
    const rs = S.d.recoltes.filter((x) => x.extraction === l.extraction);
    const ruches = rs.map((x) => (x.ruche_id ? rucheDe(x.ruche_id)?.nom : "tout le rucher") + (x.hausses ? ` (${x.hausses} h.)` : "")).filter(Boolean).join(", ");
    const hum = rs.find((x) => x.humidite != null)?.humidite;
    $sheetForm.querySelector("h2")?.insertAdjacentHTML("afterend", `<p class="small v3-trace">Traçabilité · extraction ${esc(l.extraction)}${rs[0] ? " du " + esc(dfr(rs[0].date_recolte)) : ""}${ruches ? " · " + esc(ruches) : ""}${hum != null ? " · humidité " + esc(n(hum, 1)) + " %" : ""}</p>`);
  };

  // ---------- Commandes à livrer ----------
  function livraisons() {
    const d = S.d, al = d.ventes.filter((v) => v.livre === false);
    if (!al.length) return '<p class="small">Aucune commande à livrer.</p>';
    const ids = new Set(al.map((v) => v.id)), parFormat = {};
    d.lignes.filter((x) => ids.has(x.vente_id)).forEach((x) => { const g = byId(d.lots, x.lot_id)?.format_g || 0; parFormat[g] = (parFormat[g] || 0) + x.quantite; });
    const prep = `<section class="card"><h2>À préparer</h2>${Object.entries(parFormat).sort((a, b) => b[0] - a[0]).map(([g, q]) => `<div class="u-lot"><span>Pots de ${n(g, 0)} g</span><b>${U.pluriel(q, "pot")}</b></div>`).join("")}
      <p class="small">Ces pots sont déjà retirés du stock.</p></section>`;
    return prep + al.map((v) => {
      const c = byId(d.clients, v.client_id);
      const pots = d.lignes.filter((x) => x.vente_id === v.id).map((x) => `${x.quantite} × ${n(byId(d.lots, x.lot_id)?.format_g, 0)} g`).join(", ");
      return `<article class="card u-vente"><div class="u-vente-h"><button type="button" class="u-vente-c" data-act="uvente" data-v="${v.id}"><b>${esc(c?.nom || "?")}</b><span class="small">Commandé le ${esc(U.dateCourte(v.date_vente))} · ${esc(pots)}</span></button>
        <span class="u-vente-m"><b>${esc(eur(venteTotal(v)))}</b>${v.paye ? '<span class="u-chip good">payée</span>' : '<span class="u-chip watch">à encaisser</span>'}</span></div>
        ${v.livraison ? `<p class="small v3-livr">${esc(v.livraison)}</p>` : ""}
        <div class="u-deux"><button type="button" class="btn main" data-act="v3livre" data-v="${v.id}">Livrée</button>
        ${v.paye ? (c?.telephone ? `<a class="btn u-lienbtn" href="tel:${esc(c.telephone)}">Appeler</a>` : `<button type="button" class="btn" data-act="uvente" data-v="${v.id}">Détails</button>`)
          : `<button type="button" class="btn" data-act="v3livre" data-v="${v.id}" data-k="paye">Livrée et payée</button>`}</div></article>`;
    }).join("");
  }
  ACT.v3livre = (id, k) => write(sb.from("ventes").update(k === "paye" ? { livre: true, paye: true, mode: byId(S.d.ventes, id)?.mode || cfg().modes[0] } : { livre: true }).eq("id", id), k === "paye" ? "Livrée et payée" : "Commande livrée");

  const venteAvant = window.viewVente;
  window.viewVente = function () {
    venteAvant();
    const e = S.vente, b = document.querySelector('form[data-form="vente"] > .btn.main.block');
    if (!e || !b) return;
    const livre = e.livre !== false;
    b.insertAdjacentHTML("beforebegin", `<div class="field"><div class="t">Remise des pots</div><div class="seg" style="grid-template-columns:repeat(2,minmax(0,1fr))"><button type="button" class="${livre ? "on" : ""}" aria-pressed="${livre}" data-act="v3remise" data-v="1">Remis maintenant</button><button type="button" class="${livre ? "" : "on"}" aria-pressed="${!livre}" data-act="v3remise" data-v="0">À livrer</button></div></div>
      ${livre ? "" : `<label>Où et quand (facultatif)<input id="s_livraison" value="${esc(e.livraison || "")}" placeholder="Ex. jeudi au bureau" autocomplete="off"></label>`}`);
  };
  const venteLire = window.readSaleForm;
  window.readSaleForm = function () {
    venteLire();
    const el = document.getElementById("s_livraison");
    if (el && S.vente) S.vente.livraison = el.value;
  };
  ACT.v3remise = (v) => { readSaleForm(); S.vente.livre = v === "1"; viewVente(); };
  if (typeof HL != "undefined") {
    const rpcAvant = HL.rpc;
    HL.rpc = (nom, args) => {
      if (nom === "creer_vente" && S.vente && S.route === "vente") {
        const livre = S.vente.livre !== false;
        args = { ...args, p: { ...args.p, livre, livraison: livre ? "" : String(S.vente.livraison || "").trim() } };
        if (!livre) U.onglet("livrer");
      }
      return rpcAvant(nom, args);
    };
  }

  // ---------- Tournée au rucher ----------
  ACT.v3tournee = (cle) => {
    const ids = S.d.ruches.filter((r) => (r.rucher || "") === cle).map((r) => r.id);
    if (!ids.length) return;
    S.tournee = { rucher: cle, nom: U.nomRucher(cle), ids, i: 0, faites: 0 };
    ACT.newvisite(ids[0]);
  };
  const tourneeDe = (e) => { const T = S.tournee; return T && e && !e.multi && T.ids[T.i] === e.ruche_id ? T : null; };
  function enteteTournee(T, e) {
    const der = lastVisit(e.ruche_id);
    const rap = der ? [`Dernière visite ${U.dateCourte(der.date_visite)}`, der.reine !== "Non cherchée" ? "reine " + der.reine.toLowerCase() : "", "provisions " + der.provisions.toLowerCase(),
      der.varroa != null ? (U.tauxVarroa(der) !== null ? `varroa ${n(U.tauxVarroa(der), 1)} %` : "varroa " + der.varroa) : ""].filter(Boolean).join(" · ") : "Première visite de cette ruche";
    return `<section class="card v3-tournee"><div class="track"><i style="width:${Math.round(T.i / T.ids.length * 100)}%"></i></div>
      <div class="v3-points">${T.ids.map((id, i) => `<span class="${i < T.i ? "fait" : i === T.i ? "ici" : ""}">${esc(rucheDe(id)?.nom.match(/(\d+)\s*$/)?.[1] || i + 1)}</span>`).join("")}</div>
      <p class="small">${esc(rap)}</p>${der?.note ? `<p class="small v3-rappel">« ${esc(der.note)} »</p>` : ""}</section>`;
  }
  function suivante() {
    const T = S.tournee;
    if (!T) return;
    if (typeof TN != "undefined" && TN.retour()) return;
    T.i++;
    if (T.i >= T.ids.length) {
      S.tournee = null; S.ruche = null; S.route = "dash"; render();
      toast(`Tournée « ${T.nom} » terminée · ${U.pluriel(T.faites, "visite")} enregistrée${T.faites > 1 ? "s" : ""}`);
      return;
    }
    ACT.newvisite(T.ids[T.i]);
  }
  if (typeof VR != "undefined") {
    const enregAvant = VR.enregistrer;
    VR.enregistrer = async () => {
      const T = tourneeDe(S.visite);
      await enregAvant();
      if (T && S.tournee === T) { T.faites++; S.busy = false; suivante(); }
    };
  }
  ACT.v3passer = () => suivante();
  ACT.v3finir = () => { if (typeof TN != "undefined" && TN.retour()) return; const T = S.tournee; S.tournee = null; if (T?.faites) toast(`Tournée arrêtée · ${U.pluriel(T.faites, "visite")} enregistrée${T.faites > 1 ? "s" : ""}`); go("dash"); };

  // ---------- Dictée de la note ----------
  const Reco = window.SpeechRecognition || window.webkitSpeechRecognition;
  let dictee = null;
  const MICRO = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  const boutonDictee = () => (Reco ? `<button type="button" class="btn sm v3-micro ${dictee ? "on" : ""}" data-act="v3dicter" aria-pressed="${!!dictee}">${MICRO}<span>${dictee ? "Arrêter" : "Dicter"}</span></button>` : "");
  const majMicro = () => { const b = document.querySelector(".v3-micro"); if (b) b.outerHTML = boutonDictee(); };
  ACT.v3dicter = () => {
    if (dictee) { dictee.stop(); return; }
    const zone = document.getElementById("v_note");
    if (!zone || !Reco) return;
    const r = new Reco();
    r.lang = "fr-FR"; r.continuous = true; r.interimResults = true;
    const avant = zone.value.trim();
    let final = "";
    r.onresult = (ev) => {
      let prov = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        ev.results[i].isFinal ? (final += t.trim() + " ") : (prov += t);
      }
      const el = document.getElementById("v_note");
      if (el) el.value = [avant, (final + prov).trim()].filter(Boolean).join(avant ? " " : "");
    };
    r.onerror = (ev) => { if (ev.error === "not-allowed") toast("Autorisez le micro pour dicter", true); };
    r.onend = () => { dictee = null; majMicro(); if (S.visite && document.getElementById("v_note")) S.visite.note = document.getElementById("v_note").value; };
    dictee = r;
    try { r.start(); } catch { dictee = null; }
    majMicro();
  };

  // ---------- Déclaration annuelle ----------
  const URL_DECLA = "https://agriculture-portail.6tzen.fr/default/requests/Cerfa13995/";
  const communes = (() => { try { return JSON.parse(memo("apidoo-communes") || "{}"); } catch { return {}; } })();
  const enCours = new Set();
  function commune(lat, lng) {
    const k = Number(lat).toFixed(3) + "," + Number(lng).toFixed(3);
    if (communes[k] !== undefined) return communes[k];
    if (!enCours.has(k) && navigator.onLine !== false) {
      enCours.add(k);
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=fr&lat=${lat}&lon=${lng}`)
        .then((r) => (r.ok ? r.json() : null)).then((j) => {
          const a = j?.address || {};
          communes[k] = [a.city || a.town || a.village || a.municipality || "", a.postcode || ""].filter(Boolean).join(" · ");
          memo("apidoo-communes", JSON.stringify(communes));
          if (S.route === "declaration") vueDeclaration();
        }).catch(() => {}).finally(() => enCours.delete(k));
    }
    return null;
  }
  const ETAPES_D = ["Vérifier les chiffres ci-dessous", "Déclarer en ligne (service officiel)", "Garder le récépissé"];
  function vueDeclaration() {
    const an = new Date().getFullYear(), c = cfg(), coch = (c.declaration || {})[an] || [];
    const rs = U.ruchers().map(([k, l]) => {
      const p = l.filter((r) => r.lat != null);
      const lat = p.length ? sum(p, (r) => r.lat) / p.length : null, lng = p.length ? sum(p, (r) => r.lng) / p.length : null;
      return { nom: U.nomRucher(k), nb: l.length, lieu: lat == null ? "" : commune(lat, lng) };
    });
    const ouvert = new Date().getMonth() >= 8;
    shell(`Déclaration ${an}`, "À faire entre le 1er septembre et le 31 décembre", "", `
      <section class="card v3-decla"><span class="v3-eyebrow">Chiffres à reporter</span>
        <div class="v3-deux-chiffres"><div><b>${S.d.ruches.length}</b><span>colonies</span></div><div><b>${rs.length}</b><span>emplacement${rs.length > 1 ? "s" : ""}</span></div></div>
        <p class="small">${c.napi ? "NAPI " + esc(c.napi) + " · " + esc(c.nom) : 'Ajoutez votre numéro d’apiculteur (NAPI) dans <button type="button" class="link" data-act="go" data-v="reglages">les réglages</button>.'}</p></section>
      <section class="card u-liste"><h2>Par emplacement</h2>${rs.map((r) => `<div class="u-lot"><span><b>${esc(r.nom)}</b><br><span class="small">${r.lieu === null ? "Recherche de la commune…" : r.lieu ? esc(r.lieu) : '<button type="button" class="link" data-act="go" data-v="carte">Placer sur la carte pour connaître la commune</button>'}</span></span><b>${U.pluriel(r.nb, "colonie")}</b></div>`).join("")}
        <p class="small">La commune vient de la position du rucher sur la carte. Les ruches sorties ne sont pas comptées.</p></section>
      <section class="card"><h2>Étapes</h2>${ETAPES_D.map((t, i) => `<label class="v3-coche"><input type="checkbox" data-v3d="${i}" ${coch.includes(i) ? "checked" : ""}>${esc(t)}</label>`).join("")}
        ${ouvert ? "" : '<p class="small">La déclaration ouvre le 1er septembre.</p>'}</section>
      <div class="u-deux"><a class="btn main u-lienbtn" href="${URL_DECLA}" target="_blank" rel="noopener">Déclarer en ligne</a><button type="button" class="btn" data-act="v3copierdecla">Copier les chiffres</button></div>
      <p class="small">Obligatoire dès la première colonie, chaque année. Service officiel du ministère de l’Agriculture.</p>`);
  }
  document.addEventListener("change", async (e) => {
    const i = e.target.dataset?.v3d;
    if (i === undefined) return;
    const an = new Date().getFullYear(), dec = { ...(cfg().declaration || {}) };
    const l = new Set(dec[an] || []); e.target.checked ? l.add(Number(i)) : l.delete(Number(i));
    dec[an] = [...l].sort();
    try { await saveCfg({ declaration: dec }, l.size === ETAPES_D.length ? "Déclaration terminée, bravo !" : ""); } catch (x) { fail(x); }
  });
  ACT.v3copierdecla = async () => {
    const c = cfg(), rs = U.ruchers();
    const txt = `Déclaration de ruches ${new Date().getFullYear()}${c.napi ? " · NAPI " + c.napi : ""}\nColonies : ${S.d.ruches.length}\nEmplacements : ${rs.length}\n` + rs.map(([k, l]) => `- ${U.nomRucher(k)} : ${l.length}`).join("\n");
    try { await navigator.clipboard.writeText(txt); toast("Chiffres copiés"); } catch { toast("Copie impossible sur cet appareil", true); }
  };

  // ---------- Activité récente ----------
  // Fil de ce qui s'est passé, du plus récent au plus ancien. Sert aussi à l'accueil sur ordinateur.
  function fil(max = 50) {
    const d = S.d, R = (id) => rucheDe(id)?.nom || "ruche";
    return [
      ...d.visites.map((v) => [v.created_at || v.date_visite, v.auteur, `Visite · ${R(v.ruche_id)}`, v.note || "", "ruche", v.ruche_id]),
      ...d.ventes.map((v) => [v.created_at || v.date_vente, v.auteur, `Vente · ${byId(d.clients, v.client_id)?.nom || "client"}`, eur(venteTotal(v)) + (v.paye ? "" : " · à encaisser"), "uvente", v.id]),
      ...d.recoltes.map((x) => [x.created_at || x.date_recolte, "", `Récolte · ${n(x.kg)} kg`, x.ruche_id ? R(x.ruche_id) : "tout le rucher", "go", "miel"]),
      ...d.evenements.map((x) => [x.created_at || x.date_evenement, x.auteur, `${TYPES[x.type] || x.type} · ${R(x.ruche_id)}`, x.detail || "", "ruche", x.ruche_id]),
      ...(d.photos || []).map((p) => [p.created_at, p.auteur, "Photo ajoutée", R(byId(d.visites, p.visite_id)?.ruche_id), "ruche", byId(d.visites, p.visite_id)?.ruche_id]),
    ].filter((x) => x[0]).sort((a, b) => String(b[0]).localeCompare(String(a[0]))).slice(0, max);
  }
  function vueActivite() {
    const items = fil();
    let jour = "";
    const html = items.map(([t, qui, titre, sous, act, v]) => {
      const j = String(t).slice(0, 10), h = j !== jour ? `<h2 class="u-titre">${esc(j === today() ? "Aujourd’hui" : U.dateCourte(j))}</h2>` : "";
      jour = j;
      return `${h}<button type="button" class="u-todo" ${v ? `data-act="${act}" data-v="${esc(v)}"` : "disabled"}><span class="u-todo-t"><b>${esc(titre)}</b><span class="small">${esc([sous, qui ? U.qui(qui) : "", String(t).length > 10 ? new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""].filter(Boolean).join(" · "))}</span></span><span class="u-chev" aria-hidden="true">›</span></button>`;
    }).join("");
    shell("Activité récente", "Qui a fait quoi", "", html ? `<section class="card u-liste v3-fil">${html}</section>` : '<p class="small">Rien pour le moment.</p>');
  }

  // ---------- Recherche ----------
  let requete = "";
  const plat = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  // Résultats par groupe : [titre, [{ t, s, act, v }]]. Sert à l'écran Rechercher et à la barre du haut.
  function chercher(q) {
    const d = S.d, t = plat(q).trim();
    if (t.length < 2 || !d) return [];
    const m = (...xs) => xs.some((x) => plat(x).includes(t));
    const L = (titre, sous, act, v) => ({ t: titre, s: sous, act, v });
    return [
      ["Ruches", tousLesRuches().filter((r) => m(r.nom, r.rucher, r.notes)).map((r) => L(r.nom, [r.rucher, r.sortie || r.etat].filter(Boolean).join(" · "), "ruche", r.id))],
      ["Clients", d.clients.filter((c) => m(c.nom, c.telephone, c.email, c.notes)).map((c) => L(c.nom, [c.cercle, c.telephone].filter(Boolean).join(" · "), "editclient", c.id))],
      ["Lots", d.lots.filter((l) => m(l.code, l.miel, l.extraction)).map((l) => L(`Lot ${l.code}`, `${l.miel} · ${n(l.format_g, 0)} g · ${l.pots_restants} en stock`, "editlot", l.id))],
      ["Matériel", d.articles.filter((a) => m(a.nom, a.type)).map((a) => L(a.nom, `${n(a.stock)} ${a.unite}${Number(a.seuil) > 0 && Number(a.stock) <= Number(a.seuil) ? " · stock bas" : ""}`, "editarticle", a.id))],
      ["Fournisseurs", d.fournisseurs.filter((f) => m(f.nom, f.produits, f.contact, f.telephone)).map((f) => L(f.nom, f.produits || f.contact || "", "editfournisseur", f.id))],
      ["Dépenses", d.depenses.filter((x) => m(x.libelle, x.categorie)).slice(0, 15).map((x) => L(x.libelle, `${U.dateCourte(x.date_depense)} · ${eur(x.montant)}`, "editdepense", x.id))],
      ["Ventes", d.ventes.filter((v) => m(byId(d.clients, v.client_id)?.nom)).slice(0, 15).map((v) => L(`Vente · ${byId(d.clients, v.client_id)?.nom || "client"}`, `${U.dateCourte(v.date_vente)} · ${eur(venteTotal(v))}${v.paye ? "" : " · à encaisser"}`, "uvente", v.id))],
      ["Notes de visite", d.visites.filter((v) => m(v.note, v.traitement)).slice(0, 15).map((v) => L(`${rucheDe(v.ruche_id)?.nom || "?"} · ${U.dateCourte(v.date_visite)}`, v.note || v.traitement, "ruche", v.ruche_id))],
      ["Tâches", d.taches.filter((x) => m(x.titre)).map((x) => L(x.titre, x.faite ? "faite" : x.echeance ? "pour le " + dfr(x.echeance) : "à faire", "edittache", x.id))],
    ].filter(([, l]) => l.length);
  }
  function resultats(q) {
    if (plat(q).trim().length < 2) return '<p class="small">Tapez au moins 2 lettres : ruche, client, lot, matériel, dépense, mot d’une note…</p>';
    const ligne = (x) => `<button type="button" class="u-todo" data-act="${x.act}" data-v="${esc(x.v)}"><span class="u-todo-t"><b>${esc(x.t)}</b><span class="small">${esc(x.s)}</span></span><span class="u-chev" aria-hidden="true">›</span></button>`;
    const groupes = chercher(q);
    return groupes.length ? groupes.map(([g, l]) => `<section class="card u-liste"><h2>${g}</h2>${l.map(ligne).join("")}</section>`).join("") : '<p class="small">Aucun résultat.</p>';
  }
  function vueRecherche() {
    shell("Rechercher", "", "", `<form data-form="v3cherche" class="form"><label>Rechercher<input type="search" id="v3q" value="${esc(requete)}" autocomplete="off" enterkeyhint="search" placeholder="Ruche 3, Durand, L26-02, essaim…"></label></form><div id="v3res">${resultats(requete)}</div>`);
    const i = document.getElementById("v3q");
    if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }
  document.addEventListener("input", (e) => {
    if (e.target.id !== "v3q") return;
    requete = e.target.value;
    const el = document.getElementById("v3res"); if (el) el.innerHTML = resultats(requete);
  });

  // ---------- Mode plein soleil ----------
  const soleil = () => memo("apidoo-soleil") === "1";
  document.body.classList.toggle("soleil", soleil());
  const boutonSoleil = () => `<button data-act="v3soleil" aria-pressed="${soleil()}">${icon("soleil")}<span>Mode plein soleil : ${soleil() ? "activé" : "désactivé"}</span></button>`;
  ACT.v3soleil = () => { memo("apidoo-soleil", soleil() ? "0" : "1"); document.body.classList.toggle("soleil", soleil()); render(); };

  // ---------- Formulaires ----------
  document.addEventListener("submit", async (e) => {
    const f = e.target.dataset?.form;
    if (!["v3recolte", "v3seuil", "v3cherche"].includes(f)) return;
    e.preventDefault();
    if (f === "v3cherche") return;
    if (S.busy) return;
    try {
      if (f === "v3recolte") await enregistrerRecolte();
      if (f === "v3seuil") {
        const v = Number(e.target.s.value);
        if (!(v > 0)) throw new Error("Seuil invalide");
        S.busy = true; await saveCfg({ varroaSeuil: v }, "Seuil enregistré");
      }
    } catch (x) { fail(x); } finally { S.busy = false; }
  });

  return { fil, chercher, plat, colonie, livraisons, tourneeDe, enteteTournee, boutonDictee, boutonSoleil, separer, vues: VUES };
})();
