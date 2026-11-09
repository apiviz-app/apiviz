// Apidoo — accès hors ligne.
// Garde sur le téléphone les dernières données et les saisies faites sans réseau
// (visites, ventes, récoltes, dépenses, tâches), puis les envoie au retour du réseau.
// S'appuie sur app.js (S, sb, loadAll, refresh, render, toast…) et photos.js (PH).
const HL = (() => {
  const INSERTS = { recoltes: "recoltes", depenses: "depenses", taches: "taches" }; // table -> clé de S.d
  const nouvelId = () => (crypto.randomUUID ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
  const reseau = (e) => !!e && /fetch|network|load failed|internet|offline|connexion|timed? ?out/i.test(String(e.message || e));
  const st = { hors: navigator.onLine === false, depuis: null, file: [], envoi: false, essai: 0 };

  // ---------- Stockage local (IndexedDB), avec repli en mémoire ----------
  let dbP = null, ferme = false;
  const memoire = { kv: new Map(), file: new Map() };
  function db() {
    if (ferme) return Promise.resolve(null); // déconnexion en cours : plus rien n'est écrit sur l'appareil
    if (!dbP) dbP = new Promise((ok) => {
      try {
        const r = indexedDB.open("apidoo-hors-ligne" + (window.APIDOO?.env === "recette" ? "-recette" : ""), 1);
        r.onupgradeneeded = () => {
          r.result.createObjectStore("kv", { keyPath: "k" });
          r.result.createObjectStore("file", { keyPath: "id" });
        };
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ok(null);
      } catch { ok(null); }
    });
    return dbP;
  }
  async function idb(store, mode, fn) {
    const d = await db();
    if (!d) return fn(null, memoire[store]);
    return new Promise((ok, ko) => {
      const tx = d.transaction(store, mode), s = tx.objectStore(store);
      let res; const r = fn(s);
      if (r) r.onsuccess = () => { res = r.result; };
      tx.oncomplete = () => ok(res);
      tx.onerror = () => ko(tx.error);
    });
  }
  const kvLire = (k) => idb("kv", "readonly", (s, m) => (s ? s.get(k) : void 0) ?? m?.get(k));
  const kvMettre = (o) => idb("kv", "readwrite", (s, m) => (s ? s.put(o) : void m.set(o.k, o)));
  const fileTous = () => idb("file", "readonly", (s, m) => (s ? s.getAll() : null)).then((r) => r || [...memoire.file.values()]);
  const fileMettre = (o) => idb("file", "readwrite", (s, m) => (s ? s.put(o) : void m.set(o.id, o)));
  const fileOter = (id) => idb("file", "readwrite", (s, m) => (s ? s.delete(id) : void m.delete(id)));
  const pret = fileTous().then((f) => { st.file = f.sort((a, b) => a.cree - b.cree); }).catch(() => {});

  const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };

  // ---------- Chargement : réseau, sinon dernières données gardées ----------
  const loadReseau = window.loadAll;
  window.loadAll = async function () {
    await pret;
    try {
      await loadReseau();
      st.hors = false;
      memo("apidoo-membre" + (window.APIDOO?.env === "recette" ? "-recette" : ""), "1");
      await kvMettre({ k: "donnees:" + (typeof EX != "undefined" ? EX.courante() : ""), d: S.d, at: Date.now() }).catch(() => {});
      st.depuis = Date.now();
      appliquer(S.d);
      if (aEnvoyer().length && !st.envoi && Date.now() - st.essai > 30000) setTimeout(envoyer, 300);
    } catch (e) {
      if (!reseau(e)) throw e;
      const c = await kvLire("donnees:" + (typeof EX != "undefined" ? EX.courante() : "")).catch(() => null);
      if (!c) throw new Error("Pas de réseau, et aucune donnée n’est encore gardée sur ce téléphone.");
      st.hors = true; st.depuis = c.at;
      S.d = c.d;
      appliquer(S.d);
      if (typeof PH != "undefined") await PH.load().catch(() => {});
    }
    majBandeau();
  };

  // Ajoute aux données affichées les saisies pas encore envoyées.
  function appliquer(d) {
    for (const it of st.file) {
      if (it.ex && it.ex !== (typeof EX != "undefined" ? EX.courante() : "")) continue; // saisie d'une autre exploitation
      if (it.statut === QUARANTAINE) continue; // refusée par le serveur : n'entre pas dans les chiffres tant qu'elle n'est pas corrigée
      if (it.type === "rpc" && it.nom === "creer_visite") {
        Regles.visites.appliquerVisite(d, it.args.p, { _attente: true }); // src/domaines/visites/regles.js (IT-03)
      } else if (it.type === "rpc" && it.nom === "creer_vente") {
        const p = it.args.p;
        if (d.ventes.some((v) => v.id === p.id)) continue;
        d.ventes.unshift({ id: p.id, client_id: p.client_id, date_vente: p.date_vente, paye: p.paye, mode: p.mode,
          livre: p.livre !== false, livraison: p.livraison || "", _attente: true });
        for (const x of p.lignes || []) {
          const lot = byId(d.lots, x.lot_id);
          d.lignes.push({ vente_id: p.id, lot_id: x.lot_id, quantite: x.quantite, prix_unitaire: lot ? lot.prix : 0 });
          if (lot) lot.pots_restants = Number(lot.pots_restants) - Number(x.quantite);
        }
      } else if (it.type === "rpc" && it.nom === "creer_rucher") {
        // Rucher créé sans réseau (IT-05) : montré tout de suite, comme le fera la base (migration 015).
        const p = it.args.p;
        d.ruchers = d.ruchers || [];
        if (!d.ruchers.some((x) => x.id === p.id)) d.ruchers.push({ id: p.id, nom: p.nom, lat: p.lat ?? null, lng: p.lng ?? null, archive_le: null });
      } else if (it.type === "rpc" && it.nom === "placer_rucher") {
        // Rucher placé sans réseau (IT-05) : le rucher et ses colonies, comme le fera la base (migration 015).
        const p = it.args.p, r = (d.ruchers || []).find((x) => x.id === p.id);
        if (!r) continue;
        Object.assign(r, { lat: p.lat, lng: p.lng });
        (d.ruches || []).forEach((x) => { if (x.rucher_id === p.id) Object.assign(x, { lat: p.lat, lng: p.lng }); });
      } else if (it.type === "rpc" && it.nom === "deplacer_colonies") {
        // Déplacement sans réseau (IT-06) : colonies, emplacements et registre, comme le fera la base (migration 016).
        Regles.colonies.appliquerDeplacement(d, it.args.p, { _attente: true });
      } else if (it.type === "rpc" && it.nom === "changer_statut") {
        Regles.colonies.appliquerStatut(d, it.args.p);
      } else if (it.type === "rpc" && it.nom === "affecter_contenant") {
        Regles.colonies.appliquerContenant(d, it.args.p);
      } else if (it.type === "insert") {
        const cle = INSERTS[it.table], liste = d[cle];
        if (!liste) continue;
        for (const l of it.lignes) if (!liste.some((x) => x.id === l.id)) (cle === "taches" ? liste.push : liste.unshift).call(liste, { ...l, _attente: true });
      }
    }
  }

  async function ajouter(it) {
    it.id = it.id || nouvelId(); it.cree = Date.now(); it.ex = (typeof EX != "undefined" ? EX.courante() : "");
    await fileMettre(it).catch(() => memoire.file.set(it.id, it));
    st.file.push(it);
  }
  async function retirer(id) {
    await fileOter(id).catch(() => {});
    memoire.file.delete(id);
    st.file = st.file.filter((x) => x.id !== id);
  }
  // Quarantaine (AP-BUG-001) : une saisie refusée par le serveur (autre chose qu'une coupure réseau) reste sur le
  // téléphone, visible dans « À corriger », jusqu'à ce qu'on la corrige, la renvoie ou l'abandonne. Elle ne bloque
  // pas les suivantes.
  const QUARANTAINE = "quarantaine";
  const aEnvoyer = () => st.file.filter((it) => it.statut !== QUARANTAINE);
  const aCorriger = () => st.file.filter((it) => it.statut === QUARANTAINE);
  async function mettreEnQuarantaine(it, erreur) {
    Object.assign(it, { statut: QUARANTAINE, erreur: messageErreur(erreur), code: String(erreur?.code || ""), refuseLe: Date.now() });
    await fileMettre(it).catch(() => memoire.file.set(it.id, it));
    journaliser("saisie refusee", erreur);
  }
  async function liberer(it) {
    delete it.statut; delete it.erreur; delete it.code; delete it.refuseLe;
    await fileMettre(it).catch(() => memoire.file.set(it.id, it));
  }
  // Une saisie en attente porte-t-elle cet identifiant (visite, vente, ligne) ?
  const saisieDe = (id) => st.file.find((it) => (it.type === "rpc" ? it.args.p.id === id : it.lignes.some((l) => l.id === id)));

  // ---------- Remplaçants des appels de app.js ----------
  // Création d'une visite ou d'une vente.
  async function rpc(nom, args) {
    await pret;
    args = { ...args, p: { ...args.p, id: args.p.id || nouvelId() } };
    // Correction d'une saisie en quarantaine : même identifiant, donc jamais de doublon côté serveur.
    const ancienne = st.file.find((it) => it.type === "rpc" && it.nom === nom && it.args.p.id === args.p.id);
    if (navigator.onLine !== false) {
      const r = await sb.rpc(nom, args);
      if (!r.error) { if (ancienne) await retirer(ancienne.id); return r; }
      if (!reseau(r.error)) return r; // refus : la saisie d'origine reste « à corriger »
    }
    st.hors = true;
    if (ancienne) {
      ancienne.args = JSON.parse(JSON.stringify(args));
      await liberer(ancienne);
    } else await ajouter({ type: "rpc", nom, args: JSON.parse(JSON.stringify(args)) });
    return { data: args.p.id, error: null, local: true };
  }

  // Enregistrements faits par les fiches (récolte, dépense, tâche…).
  async function write(q, message) {
    await pret;
    const table = decodeURIComponent(String(q.url?.pathname || "").split("/").pop());
    const idCible = (q.url?.searchParams?.get("id") || "").replace(/^eq\./, "");
    const enAttente = idCible && saisieDe(idCible);
    if (q.method === "DELETE" && enAttente) await retirer(enAttente.id); // saisie jamais envoyée : on l'oublie
    if (navigator.onLine !== false) {
      const { error } = await q;
      if (!error) { await refresh(); if (message) toast(enAttente ? "Saisie retirée" : message); return; }
      if (!reseau(error)) throw error;
    }
    st.hors = true;
    if (q.method === "DELETE" && enAttente) { await refresh(); toast("Saisie retirée"); return; }
    if (q.method === "POST" && INSERTS[table]) {
      const lignes = (Array.isArray(q.body) ? q.body : [q.body]).map((l) => ({ ...l, id: l.id || nouvelId() }));
      await ajouter({ type: "insert", table, lignes });
      await refresh();
      toast("Gardé sur le téléphone : envoi au retour du réseau");
      return;
    }
    throw new Error(enAttente ? "Cette saisie n’est pas encore envoyée : modifie-la une fois le réseau revenu."
      : "Pas de réseau : cette modification se fera une fois le réseau revenu.");
  }

  // Session et accès gardés, pour ouvrir l'app sans réseau.
  function sessionLocale() {
    if (memo("apidoo-membre" + (window.APIDOO?.env === "recette" ? "-recette" : "")) !== "1") return null;
    try {
      for (const k of Object.keys(localStorage)) {
        if (!/^sb-.+-auth-token$/.test(k)) continue;
        const v = JSON.parse(localStorage.getItem(k));
        const s = v?.currentSession || v;
        if (s?.user) return s;
      }
    } catch {}
    return null;
  }
  const membre = () => (memo("apidoo-membre" + (window.APIDOO?.env === "recette" ? "-recette" : "")) === "1" ? true : null);

  // ---------- Envoi au retour du réseau ----------
  async function envoyer(silence) {
    await pret;
    if (st.envoi || !aEnvoyer().length || navigator.onLine === false || !S.session) return;
    st.envoi = true; st.essai = Date.now(); majBandeau();
    let ok = 0, refus = 0, dernier = null, coupe = false;
    try {
      await sb.auth.getSession(); // renouvelle la connexion si besoin
      for (const it of [...st.file]) {
        if (it.ex && it.ex !== (typeof EX != "undefined" ? EX.courante() : "")) continue; // partira quand cette exploitation sera ouverte
        if (it.statut === QUARANTAINE) continue;
        const r = it.type === "rpc"
          ? await sb.rpc(it.nom, it.args)
          : await sb.from(it.table).upsert(it.lignes, { onConflict: "id", ignoreDuplicates: true });
        if (r.error && reseau(r.error)) { coupe = true; break; }
        if (r.error) { await mettreEnQuarantaine(it, r.error); refus++; dernier = it; continue; }
        await retirer(it.id);
        ok++;
      }
    } catch (e) { coupe = reseau(e); if (!coupe) console.error(e); }
    finally { st.envoi = false; }
    st.hors = coupe;
    const formulaire = ["visite", "vente", "previsions", "reglages"].includes(S.route) || $sheet.open;
    if (ok || refus) {
      try { await window.loadAll(); if (!formulaire) render(); } catch {}
    }
    if (ok) {
      toast(ok > 1 ? `${ok} saisies envoyées` : "Saisie envoyée");
      if (typeof PH != "undefined") PH.envoyer();
    }
    if (refus && silence !== true) {
      const [t] = libelle(dernier);
      setTimeout(() => toast(refus > 1 ? `${refus} saisies refusées par le serveur : à corriger` : `${t} refusée : ${dernier.erreur} À corriger.`, true), ok ? 1200 : 0);
    }
    majBandeau();
  }
  addEventListener("online", () => { st.hors = false; majBandeau(); setTimeout(envoyer, 1000); });
  addEventListener("offline", () => { st.hors = true; majBandeau(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) envoyer(); });
  setInterval(() => { if (aEnvoyer().length) envoyer(); }, 60000);

  // ---------- Affichage ----------
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;
  const quand = (t) => new Date(t).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const ICO_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 2l20 20M8.5 16.5a5 5 0 017 0M5 12.9a10 10 0 015.2-2.8M19 12.9a10 10 0 00-2.3-1.6M12 20h.01"/></svg>';
  const ICO_SYNC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 11-3-6.7M21 4v5h-5"/></svg>';

  function bandeau() {
    const n = aEnvoyer().length, k = aCorriger().length;
    const pastille = k ? `<button type="button" class="hl-pastille" data-act="hlcorriger" aria-label="${esc(pluriel(k, "saisie") + " à corriger")}">${k} à corriger</button>` : "";
    if (st.hors) return `<div class="hl-band off" role="status">${ICO_OFF}<span>Hors ligne${st.depuis ? " · chiffres du " + esc(quand(st.depuis)) : ""}${n ? " · " + pluriel(n, "saisie") + " en attente" : ""}</span>${pastille}</div>`;
    if (n) return `<div class="hl-band sync" role="status">${ICO_SYNC}<span>${st.envoi ? "Envoi de " + pluriel(n, "saisie") + "…" : pluriel(n, "saisie") + " en attente d’envoi"}</span>${pastille}</div>`;
    if (k) return `<div class="hl-band corr" role="status">${ICO_SYNC}<span>${k > 1 ? "Des saisies ont été refusées" : "Une saisie a été refusée"} par le serveur</span>${pastille}</div>`;
    return "";
  }
  function majBandeau() {
    const m = document.querySelector("main");
    if (!m) return;
    const html = bandeau(), old = m.querySelector(":scope > .hl-band");
    if (old) old.outerHTML = html;
    else if (html) m.insertAdjacentHTML("afterbegin", html);
  }

  function libelle(it) {
    const d = S.d || {};
    if (it.type === "rpc" && it.nom === "creer_visite") {
      const p = it.args.p;
      return ["Visite · " + (byId(d.ruches || [], p.ruche_id)?.nom || "ruche"), dfr(p.date_visite)];
    }
    if (it.type === "rpc" && it.nom === "creer_vente") {
      const p = it.args.p, pots = (p.lignes || []).reduce((s, l) => s + Number(l.quantite), 0);
      return ["Vente · " + (byId(d.clients || [], p.client_id)?.nom || "client"), dfr(p.date_vente) + " · " + pluriel(pots, "pot")];
    }
    if (it.type === "rpc" && it.nom === "creer_rucher") return ["Rucher · " + (it.args.p.nom || ""), "créé"];
    if (it.type === "rpc" && it.nom === "placer_rucher") {
      return ["Position · " + ((d.ruchers || []).find((x) => x.id === it.args.p.id)?.nom || "rucher"), "placé sur la carte"];
    }
    if (it.type === "rpc" && it.nom === "deplacer_colonies") {
      const p = it.args.p, dest = (d.ruchers || []).find((x) => x.id === p.rucher_id)?.nom || "rucher";
      return ["Déplacement · " + pluriel((p.colonies || []).length, "colonie") + " vers " + dest, dfr(p.date)];
    }
    if (it.type === "rpc" && it.nom === "changer_statut") {
      const p = it.args.p, r = byId([...(d.ruches || []), ...(d.ruchesSorties || [])], p.colonie_id);
      return ["Statut · " + (r?.nom || "colonie"), (Regles.colonies.STATUTS[p.statut] || p.statut).toLowerCase() + " · " + dfr(p.date)];
    }
    if (it.type === "rpc" && it.nom === "affecter_contenant") {
      const p = it.args.p, r = byId(d.ruches || [], p.colonie_id), c = (d.contenants || []).find((x) => x.id === p.contenant_id);
      return ["Ruche physique · " + (r?.nom || "colonie"), (c ? "n° " + c.code : "sortie de sa caisse") + " · " + dfr(p.date)];
    }
    const l = it.lignes[0] || {};
    if (it.table === "recoltes") return ["Récolte · " + n(l.kg) + " kg", dfr(l.date_recolte)];
    if (it.table === "depenses") return ["Dépense · " + (l.libelle || ""), dfr(l.date_depense) + " · " + eur(l.montant)];
    return ["Tâche · " + (l.titre || ""), l.echeance ? dfr(l.echeance) : "Sans date"];
  }
  function section() {
    if (!st.file.length) return "";
    const k = aCorriger().length;
    return `<section class="card"><h2>En attente d’envoi</h2>${st.file.map((it) => {
      const [t, s] = libelle(it);
      return it.statut === QUARANTAINE
        ? `<div class="hl-row"><span><b>${esc(t)}</b><span class="small">${esc(s)}</span><span class="small crit">${esc(it.erreur)}</span></span><button type="button" class="btn sm" data-act="hlcorriger">À corriger</button></div>`
        : `<div class="hl-row"><span><b>${esc(t)}</b><span class="small">${esc(s)}</span></span><span class="tag watch">en attente</span></div>`;
    }).join("")}<p class="small">${k && !aEnvoyer().length ? "Corrige, renvoie ou abandonne les saisies refusées." : st.hors ? "Envoi automatique dès que le réseau revient." : "Envoi en cours…"}</p></section>`;
  }

  // ---------- Fiche « À corriger » (AP-TECH-156) ----------
  // Une fiche plutôt qu'un écran : aucune nouvelle surcharge de render/shell/view*.
  function ficheCorriger() {
    const l = aCorriger();
    if (!l.length) { if ($sheet.open) $sheet.close(); return; }
    $sheetForm.onsubmit = (e) => e.preventDefault();
    $sheetForm.innerHTML = `<h2>À corriger</h2><p class="small">Le serveur a refusé ${l.length > 1 ? "ces saisies" : "cette saisie"}. Rien n’est perdu : corrige, renvoie ou abandonne.</p>
      ${l.map((it) => {
        const [t, s] = libelle(it);
        return `<div class="hl-corr"><b>${esc(t)}</b><span class="small">${esc(s)}${it.refuseLe ? " · refusée le " + esc(quand(it.refuseLe)) : ""}</span>
          <p class="hl-motif">${esc(it.erreur || "Refusée par le serveur.")}</p>
          <div class="actions"><button type="button" class="btn sm main" data-act="hlmodifier" data-v="${it.id}">Modifier</button><button type="button" class="btn sm" data-act="hlrenvoyer" data-v="${it.id}">Renvoyer</button><button type="button" class="btn sm" data-act="hlabandonner" data-v="${it.id}">Abandonner</button></div></div>`;
      }).join("")}
      <button type="button" class="btn" data-act="closesheet">Fermer</button>`;
    if (!$sheet.open) $sheet.showModal();
  }
  const enFile = (id) => st.file.find((it) => it.id === id);
  const CHAMPS = {
    recoltes: [["kg", "Quantité (kg)", "number", "0.1"], ["date_recolte", "Date", "date"]],
    depenses: [["libelle", "Libellé", "text"], ["montant", "Montant (€)", "number", "0.01"], ["date_depense", "Date", "date"]],
    taches: [["titre", "Tâche", "text"], ["echeance", "Échéance", "date"]],
  };
  async function renvoyer(it) {
    await liberer(it);
    while (st.envoi) await new Promise((ok) => setTimeout(ok, 200));
    st.essai = 0;
    await envoyer(true);
    const encore = enFile(it.id);
    if (encore?.statut === QUARANTAINE) { toast(`Toujours refusée : ${encore.erreur}`, true); ficheCorriger(); }
    else if (encore) { toast("Gardée sur le téléphone : envoi au retour du réseau"); ficheCorriger(); }
    else ficheCorriger();
    majBandeau();
  }
  Object.assign(ACT, {
    hlcorriger: () => ficheCorriger(),
    hlrenvoyer: async (id) => { const it = enFile(id); if (it) await renvoyer(it); },
    hlabandonner: (id, _k, btn) => twoStep(btn, "Confirmer l’abandon", async () => {
      const it = enFile(id); if (!it) return;
      await retirer(it.id);
      if (it.type === "rpc" && it.nom === "creer_visite" && typeof PH != "undefined") await PH.oterVisite(it.args.p.id).catch(() => {});
      toast("Saisie abandonnée");
      try { await window.loadAll(); } catch {}
      render(); ficheCorriger();
    }),
    hlmodifier: (id) => {
      const it = enFile(id); if (!it) return;
      if ($sheet.open) $sheet.close();
      if (it.type === "rpc" && it.nom === "creer_vente") {
        const p = it.args.p;
        S.vente = { id: p.id, client_id: p.client_id, date_vente: p.date_vente, paye: p.paye !== false, mode: p.mode || cfg().modes[0],
          livre: p.livre !== false, livraison: p.livraison || "", q: Object.fromEntries((p.lignes || []).map((l) => [l.lot_id, Number(l.quantite)])) };
        return go("vente");
      }
      if (it.type === "rpc" && it.nom === "creer_visite") {
        const { intrants, ...p } = it.args.p;
        S.visite = { ...p, couvain: p.couvain || "Non vu", poids_kg: p.poids_kg ?? "", varroa: p.varroa ?? "", note: p.note || "",
          q: Object.fromEntries((intrants || []).map((x) => [x.article_id, Number(x.quantite)])) };
        return go("visite");
      }
      if (it.type === "rpc") { toast("Abandonne cette saisie, puis refais-la : rien d’autre à corriger ici.", true); return; }
      const l = it.lignes[0] || {}, champs = CHAMPS[it.table] || [];
      sheet({
        title: "Corriger : " + libelle(it)[0], intro: it.erreur,
        fields: champs.map(([name, label, type, step]) => ({ name, label, type, step, value: l[name] ?? "", required: name !== "echeance" })),
        label: "Renvoyer",
        submit: async (v) => {
          for (const [name, , type] of champs) l[name] = type === "number" ? num(v[name]) : v[name] || (name === "echeance" ? null : "");
          await renvoyer(it);
        },
      });
    },
  });

  // ---------- Mise en cache de l'app elle-même ----------
  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("Hors ligne indisponible", e)));
  }

  // Après une écriture appliquée sur le téléphone sans relecture (IT-03) : la copie gardée pour le hors-ligne suit.
  const garderDonnees = () => kvMettre({ k: "donnees:" + (typeof EX != "undefined" ? EX.courante() : ""), d: S.d, at: Date.now() }).catch(() => {});
  return {
    reseau, rpc, write, sessionLocale, membre, envoyer, bandeau, section, garderDonnees,
    horsLigne: () => st.hors,
    nb: () => st.file.length, // toutes les saisies pas encore enregistrées, y compris celles à corriger
    nbCorriger: () => aCorriger().length,
    // Déconnexion (AP-BUG-003) : ferme la base locale pour qu'elle puisse être supprimée, et oublie tout.
    fermer: async () => {
      ferme = true;
      const d = await dbP?.catch(() => null);
      d?.close(); dbP = null;
      st.file = []; memoire.kv.clear(); memoire.file.clear();
    },
    ficheCorriger,
    enAttente: (id) => !!saisieDe(id),
  };
})();
