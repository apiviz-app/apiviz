// Apiviz — accès hors ligne.
// Garde sur le téléphone les dernières données et les saisies faites sans réseau (créations, et depuis IT-09
// corrections et suppressions), puis les envoie au retour du réseau, dans l'ordre et après ce dont elles dépendent.
// Les règles de la file (format d'opération, fusion, dépendances, conflits) sont dans src/donnees/file.js
// (window.Regles.file) ; ici, le stockage sur le téléphone, l'envoi et l'affichage.
// S'appuie sur app.js (S, sb, loadAll, refresh, render, toast…) et photos.js (PH).
const HL = (() => {
  // table -> clé de S.d. ruches : colonie créée sans réseau (IT-09, AP-US-048), insérée telle quelle à l'envoi.
  const INSERTS = { recoltes: "recoltes", depenses: "depenses", taches: "taches", reglements_associes: "reglements", mouvements_stock: "mouvements", ruches: "ruches" };
  const F = () => window.Regles.file;
  // Retour arrière (IT-09 §15) : localStorage « apidoo-file-v1 » = « 1 » ramène au comportement v1 (créations seules
  // sans réseau). Les opérations v2 déjà gardées restent dans la file et partent quand même : rien n'est perdu.
  const fileV1 = () => { try { return localStorage.getItem("apidoo-file-v1") === "1"; } catch { return false; } };
  const exCourante = () => (typeof EX != "undefined" ? EX.courante() : "") || "";
  const ici = (it) => !it.ex || it.ex === exCourante();
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
  // Reprise de la file v1 (AP-TECH-148) : au premier démarrage de cette version, chaque saisie gardée passe au format 2
  // (même contenu, quarantaine comprise, dépendances calculées). Rien n'est envoyé ni retiré ici.
  const pret = fileTous().then(async (f) => {
    st.file = f.sort((a, b) => a.cree - b.cree);
    if (fileV1() || !window.Regles?.file) return;
    const v1 = st.file.filter((it) => it.v !== 2);
    if (!v1.length) return;
    st.file = st.file.map((it) => F().reprendre(it, st.file));
    for (const it of st.file.filter((x) => v1.some((y) => y.id === x.id))) await fileMettre(it).catch(() => memoire.file.set(it.id, it));
    journaliser("file v1 reprise", { message: v1.length + " saisie(s)" });
  }).catch(() => {});

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
      if (it.statut === QUARANTAINE || it.statut === CONFLIT) continue; // refusée ou en conflit : pas dans les chiffres tant que rien n'est choisi
      if (it.type === "rpc" && (it.nom === "modifier_saisie" || it.nom === "supprimer_saisie")) {
        F().appliquerOperation(d, it); // correction ou suppression faite sans réseau (IT-09)
      } else if (it.type === "rpc" && it.nom === "creer_visite") {
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
      } else if (it.type === "rpc" && it.nom === "changer_reine") {
        // Nouvelle reine sans réseau (IT-07) : l'ancienne est clôturée, comme le fera la base (migration 019).
        Regles.reines.appliquerReine(d, it.args.p, { _attente: true });
      } else if (it.type === "rpc" && it.nom === "corriger_reine") {
        Regles.reines.appliquerCorrection(d, it.args.p);
      } else if (it.type === "rpc" && it.nom === "enregistrer_achat") {
        // Achat sans réseau (v5.30) : dépenses, nouveaux articles et stock, comme le fera la base (migration 018).
        Regles.stock.appliquerAchat(d, it.args.p, { _attente: true });
      } else if (it.type === "rpc" && it.nom === "mettre_en_pots") {
        Regles.stock.appliquerMiseEnPots(d, it.args.p, { _attente: true });
      } else if (it.type === "insert") {
        const cle = INSERTS[it.table], liste = d[cle];
        if (!liste) continue;
        for (const l of it.lignes) {
          if (liste.some((x) => x.id === l.id)) continue;
          // Colonie créée sans réseau : valeurs par défaut de la table ruches, rucher retrouvé par son nom (migration 015).
          const ligne = cle === "ruches" ? { etat: "Bonne", hausses: 0, equipement: [], statut: "active", sortie: "", notes: "", type_ruche: "",
            rucher: "", code: "", origine: "", lat: null, lng: null, ...l, rucher_id: l.rucher_id ?? ((d.ruchers || []).find((x) => x.nom === l.rucher)?.id || null),
            _attente: true } : { ...l, _attente: true };
          (cle === "taches" || cle === "ruches" ? liste.push : liste.unshift).call(liste, ligne);
          // Stock au doigt et inventaire sans réseau (v5.38) : le stock affiché suit le mouvement, comme le déclencheur de 018.
          if (cle === "mouvements") { const a = (d.articles || []).find((x) => x.id === l.article_id); if (a) a.stock = Math.round((Number(a.stock || 0) + Number(l.quantite || 0)) * 100) / 100; }
        }
      }
    }
  }

  async function ajouter(it) {
    it.id = it.id || nouvelId(); it.cree = Date.now(); it.ex = exCourante();
    if (!fileV1() && window.Regles?.file) Object.assign(it, { v: 2, op: it.op || "creer", depend_de: F().dependances(it, st.file) });
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
  // Conflit (IT-09, AP-FEAT-044) : un autre membre a changé la même saisie ; elle attend qu'on choisisse la version.
  const CONFLIT = "conflit";
  // Toutes ces listes ne regardent que l'exploitation ouverte : les saisies d'une autre exploitation sont signalées à part.
  const aEnvoyer = () => st.file.filter((it) => ici(it) && it.statut !== QUARANTAINE && it.statut !== CONFLIT);
  const aCorriger = () => st.file.filter((it) => ici(it) && (it.statut === QUARANTAINE || it.statut === CONFLIT));
  async function mettreEnConflit(it, reponse) {
    Object.assign(it, { statut: CONFLIT, reponse, refuseLe: Date.now() });
    delete it.erreur;
    await fileMettre(it).catch(() => memoire.file.set(it.id, it));
  }
  // Remplace une opération de la file par sa nouvelle version (même identifiant).
  async function remplacer(op) {
    await fileMettre(op).catch(() => memoire.file.set(op.id, op));
    st.file = st.file.map((x) => (x.id === op.id ? op : x));
    return op;
  }
  async function mettreEnQuarantaine(it, erreur) {
    Object.assign(it, { statut: QUARANTAINE, erreur: messageErreur(erreur), code: String(erreur?.code || ""), refuseLe: Date.now() });
    await fileMettre(it).catch(() => memoire.file.set(it.id, it));
    journaliser("saisie refusee", erreur);
  }
  async function liberer(it) {
    delete it.statut; delete it.erreur; delete it.code; delete it.refuseLe; delete it.reponse;
    await fileMettre(it).catch(() => memoire.file.set(it.id, it));
  }
  // Une création en attente porte-t-elle cet identifiant (visite, vente, ligne) ? Les corrections et suppressions
  // d'une saisie déjà envoyée ne comptent pas : la saisie existe déjà sur le serveur.
  const saisieDe = (id) => st.file.find((it) => (it.type === "rpc"
    ? it.nom !== "modifier_saisie" && it.nom !== "supprimer_saisie" && it.args.p.id === id
    : it.lignes.some((l) => l.id === id)));
  // La ligne telle qu'affichée (sa version et ses valeurs avant la correction).
  const ligneDe = (table, id) => {
    const cle = F().CLE[table], d = S.d || {};
    return [...(d[cle] || []), ...(table === "ruches" ? d.ruchesSorties || [] : [])].find((x) => x.id === id) || null;
  };

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

  // Enregistrements faits par les fiches (récolte, dépense, tâche…) : créations, corrections, suppressions.
  async function write(q, message) {
    await pret;
    const table = decodeURIComponent(String(q.url?.pathname || "").split("/").pop());
    const filtre = q.url?.searchParams?.get("id") || "";
    const idCible = filtre.startsWith("eq.") ? filtre.slice(3) : "";
    const enAttente = idCible && saisieDe(idCible);
    const v2 = !fileV1() && !!window.Regles?.file;
    if (q.method === "DELETE" && enAttente) { // saisie jamais envoyée : on l'oublie, avec ses corrections en attente
      await retirer(enAttente.id);
      if (v2) for (const m of st.file.filter((it) => it.type === "rpc" && it.args?.p?.id === idCible)) await retirer(m.id);
    }
    // Correction d'une saisie pas encore envoyée (IT-09) : elle part avec la création, réseau ou pas.
    if (v2 && q.method === "PATCH" && enAttente && q.body && typeof q.body === "object" && !Array.isArray(q.body)) {
      const c = F().corrigerCreation(enAttente, idCible, q.body);
      if (c.statut === QUARANTAINE) { delete c.statut; delete c.erreur; delete c.code; delete c.refuseLe; }
      await remplacer(c);
      await refresh();
      toast(message || "Correction gardée sur le téléphone");
      if (navigator.onLine !== false) setTimeout(envoyer, 300);
      return;
    }
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
    // Correction d'une saisie déjà envoyée (AP-US-047) : gardée avec la version vue, envoyée au retour du réseau.
    if (v2 && q.method === "PATCH" && idCible && F().modifiable(table, q.body)) {
      const objet = ligneDe(table, idCible), existante = F().modifEnAttente(st.file, table, idCible);
      const op = F().modification({ table, id: idCible, champs: q.body, objet, existante });
      if (existante) await remplacer(op);
      else { op.resume = resumeDe("Correction", table, objet); await ajouter(op); }
      await refresh();
      toast("Correction gardée sur le téléphone : envoi au retour du réseau");
      return;
    }
    // Suppression d'une saisie déjà envoyée : ses corrections en attente sont remplacées par la suppression.
    if (v2 && q.method === "DELETE" && idCible && F().SUPPRIMABLES.includes(table)) {
      const objet = ligneDe(table, idCible);
      for (const m of st.file.filter((it) => it.nom === "modifier_saisie" && it.args.p.table === table && it.args.p.id === idCible)) await retirer(m.id);
      if (!st.file.some((it) => it.nom === "supprimer_saisie" && it.args.p.id === idCible)) {
        const op = F().suppression({ table, id: idCible, objet });
        op.resume = resumeDe("Suppression", table, objet);
        await ajouter(op);
      }
      await refresh();
      toast("Suppression gardée sur le téléphone : envoi au retour du réseau");
      return;
    }
    throw new Error(enAttente ? "Cette saisie n’est pas encore envoyée : modifie-la une fois le réseau revenu."
      : "Pas de réseau : cette modification se fera une fois le réseau revenu.");
  }
  // Titre figé d'une correction ou d'une suppression (la ligne peut ne plus être affichée ensuite).
  function resumeDe(quoi, table, o) {
    const d = S.d || {}, ruche = (id) => byId([...(d.ruches || []), ...(d.ruchesSorties || [])], id)?.nom;
    o = o || {};
    if (table === "visites") return [`${quoi} · Visite ${ruche(o.ruche_id) || ""}`.trim(), o.date_visite ? dfr(o.date_visite) : ""];
    if (table === "ruches") return [`${quoi} · ${o.nom || "colonie"}`, ""];
    if (table === "recoltes") return [`${quoi} · Récolte ${o.kg != null ? n(o.kg) + " kg" : ""}`.trim(), o.date_recolte ? dfr(o.date_recolte) : ""];
    if (table === "depenses") return [`${quoi} · Dépense ${o.libelle || ""}`.trim(), o.date_depense ? dfr(o.date_depense) : ""];
    if (table === "taches") return [`${quoi} · Tâche ${o.titre || ""}`.trim(), o.echeance ? dfr(o.echeance) : ""];
    if (table === "ventes") return [`${quoi} · Vente ${byId(d.clients || [], o.client_id)?.nom || ""}`.trim(), o.date_vente ? dfr(o.date_vente) : ""];
    return [quoi, ""];
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
    let ok = 0, refus = 0, conflits = 0, dernier = null, coupe = false;
    try {
      await sb.auth.getSession(); // renouvelle la connexion si besoin
      const ordre = window.Regles?.file ? F().ordonner(st.file) : [...st.file];
      for (const it of ordre) {
        if (!ici(it)) continue; // partira quand cette exploitation sera ouverte
        if (it.statut === QUARANTAINE || it.statut === CONFLIT) continue;
        if (window.Regles?.file && F().bloquante(it, st.file)) continue; // attend la saisie dont elle dépend (colonie avant sa visite)
        const r = it.type === "rpc"
          ? await sb.rpc(it.nom, it.args)
          : await sb.from(it.table).upsert(it.lignes, { onConflict: "id", ignoreDuplicates: true });
        if (r.error && reseau(r.error)) { coupe = true; break; }
        if (r.error) { await mettreEnQuarantaine(it, r.error); refus++; dernier = it; continue; }
        if ((it.nom === "modifier_saisie" || it.nom === "supprimer_saisie") && r.data?.statut === "conflit") {
          await mettreEnConflit(it, r.data); conflits++; continue;
        }
        await retirer(it.id);
        ok++;
      }
    } catch (e) { coupe = reseau(e); if (!coupe) console.error(e); }
    finally { st.envoi = false; }
    st.hors = coupe;
    const formulaire = ["visite", "vente", "previsions", "reglages"].includes(S.route) || $sheet.open;
    if (ok || refus || conflits) {
      try { await window.loadAll(); if (!formulaire) render(); } catch {}
    }
    if (ok) {
      st.dernier = Date.now(); memo("apidoo-dernier-envoi" + (window.APIDOO?.env === "recette" ? "-recette" : ""), String(st.dernier));
      toast(ok > 1 ? `${ok} saisies envoyées` : "Saisie envoyée");
      if (typeof PH != "undefined") PH.envoyer();
    }
    if (refus && silence !== true) {
      const [t] = libelle(dernier);
      setTimeout(() => toast(refus > 1 ? `${refus} saisies refusées par le serveur : à corriger` : `${t} refusée : ${dernier.erreur} À corriger.`, true), ok ? 1200 : 0);
    }
    if (conflits && silence !== true) {
      setTimeout(() => toast(conflits > 1 ? `${conflits} saisies ont été modifiées par un autre membre : choisis les versions à garder.`
        : "Un autre membre a modifié la même saisie : choisis la version à garder.", true), ok || refus ? 2400 : 0);
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
    // Saisies d'une autre exploitation (AP-US-050) : elles ne partent qu'une fois celle-ci ouverte.
    const autres = window.Regles?.file && typeof EX != "undefined" && EX.liste ? F().autresExploitations(st.file, exCourante(), EX.liste()) : [];
    if (!n && !k && !st.hors && autres.length) return `<div class="hl-band sync" role="status">${ICO_SYNC}<span>${esc(autres[0].texte)}${autres.length > 1 ? " et ailleurs" : ""}</span><button type="button" class="hl-voir" data-act="hlsynchro">Voir</button></div>`;
    // Recommandation UX n° 5 : le bandeau s'ouvre sur ce qui attend, avec une phrase qui rassure.
    const voir = n ? '<button type="button" class="hl-voir" data-act="hlvoir">Voir</button>' : "";
    if (st.hors) return `<div class="hl-band off" role="status">${ICO_OFF}<span>Hors ligne${st.depuis ? " · chiffres du " + esc(quand(st.depuis)) : ""}${n ? " · " + pluriel(n, "saisie") + " en attente" : ""}</span>${voir}${pastille}</div>`;
    if (n) return `<div class="hl-band sync" role="status">${ICO_SYNC}<span>${st.envoi ? "Envoi de " + pluriel(n, "saisie") + "…" : pluriel(n, "saisie") + " en attente d’envoi"}</span>${voir}${pastille}</div>`;
    if (k) {
      // Conflit (IT-09) : pas un refus du serveur, un autre membre a changé la même saisie.
      const conf = aCorriger().every((x) => x.statut === CONFLIT);
      const texte = conf ? (k > 1 ? "Des saisies ont été modifiées par un autre membre" : "Une saisie a été modifiée par un autre membre")
        : (k > 1 ? "Des saisies ont été refusées" : "Une saisie a été refusée") + " par le serveur";
      return `<div class="hl-band corr" role="status">${ICO_SYNC}<span>${texte}</span>${pastille}</div>`;
    }
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
    if (it.resume) return it.resume;
    if (it.type === "rpc" && (it.nom === "modifier_saisie" || it.nom === "supprimer_saisie")) {
      const p = it.args.p;
      return resumeDe(it.nom === "modifier_saisie" ? "Correction" : "Suppression", p.table, ligneDe(p.table, p.id));
    }
    if (it.type === "insert" && it.table === "ruches") return ["Colonie · " + (it.lignes[0]?.nom || ""), "créée" + (it.lignes.length > 1 ? ` (${it.lignes.length})` : "")];
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
    if (it.type === "rpc" && (it.nom === "changer_reine" || it.nom === "corriger_reine")) {
      const p = it.args.p, toutes = [...(d.ruches || []), ...(d.ruchesSorties || [])];
      const r = byId(toutes, p.colonie_id) || byId(toutes, (d.reines || []).find((x) => x.id === p.id)?.colonie_id);
      return ["Reine · " + (r?.nom || "colonie"), (it.nom === "changer_reine" ? "nouvelle reine " : "correction · reine ") + p.annee + " · " + dfr(p.date)];
    }
    if (it.type === "rpc" && it.nom === "enregistrer_achat") {
      const p = it.args.p, total = (p.lignes || []).reduce((t, x) => t + Number(x.montant || 0), 0);
      return ["Achat · " + pluriel((p.lignes || []).length, "ligne"), dfr(p.date) + " · " + eur(total)];
    }
    if (it.type === "rpc" && it.nom === "mettre_en_pots") {
      const p = it.args.p;
      return ["Mise en pots · lot " + (p.code || ""), dfr(p.date) + " · " + pluriel(p.pots, "pot")];
    }
    const l = it.lignes[0] || {};
    if (it.table === "recoltes") return ["Récolte · " + n(l.kg) + " kg", dfr(l.date_recolte)];
    if (it.table === "depenses") return ["Dépense · " + (l.libelle || ""), dfr(l.date_depense) + " · " + eur(l.montant)];
    if (it.table === "reglements_associes") return ["Règlement · " + (l.de || "") + " → " + (l.a || ""), dfr(l.date_reglement) + " · " + eur(l.montant)];
    return ["Tâche · " + (l.titre || ""), l.echeance ? dfr(l.echeance) : "Sans date"];
  }
  function section() {
    const liste = st.file.filter(ici);
    if (!liste.length) return "";
    const k = aCorriger().length;
    return `<section class="card"><h2>En attente d’envoi</h2>${liste.map((it) => {
      const [t, s] = libelle(it);
      return it.statut === CONFLIT
        ? `<div class="hl-row"><span><b>${esc(t)}</b><span class="small">${esc(s)}</span><span class="small crit">Modifiée aussi par un autre membre</span></span><button type="button" class="btn sm" data-act="hlconflit" data-v="${it.id}">Choisir</button></div>`
        : it.statut === QUARANTAINE
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
    $sheetForm.innerHTML = `<h2>À corriger</h2><p class="small">${l.some((x) => x.statut === QUARANTAINE) ? `Le serveur a refusé ${l.length > 1 ? "ces saisies" : "cette saisie"}. ` : ""}Rien n’est perdu : corrige, renvoie, choisis ou abandonne.</p>
      ${l.map((it) => {
        const [t, s] = libelle(it);
        if (it.statut === CONFLIT) return `<div class="hl-corr"><b>${esc(t)}</b><span class="small">${esc(s)}</span>
          <p class="hl-motif">${it.nom === "supprimer_saisie" ? "Un autre membre a modifié cette saisie depuis que tu l’as supprimée." : "Un autre membre a modifié la même saisie."} Rien n’est perdu : choisis ce que tu gardes.</p>
          <div class="actions"><button type="button" class="btn sm main" data-act="hlconflit" data-v="${it.id}">Choisir</button></div></div>`;
        return `<div class="hl-corr"><b>${esc(t)}</b><span class="small">${esc(s)}${it.refuseLe ? " · refusée le " + esc(quand(it.refuseLe)) : ""}</span>
          <p class="hl-motif">${esc(it.erreur || "Refusée par le serveur.")}</p>
          <div class="actions"><button type="button" class="btn sm main" data-act="hlmodifier" data-v="${it.id}">Modifier</button><button type="button" class="btn sm" data-act="hlrenvoyer" data-v="${it.id}">Renvoyer</button><button type="button" class="btn sm" data-act="hlabandonner" data-v="${it.id}">Abandonner</button></div></div>`;
      }).join("")}
      <button type="button" class="btn" data-act="closesheet">Fermer</button>`;
    if (!$sheet.open) $sheet.showModal();
  }
  // ---------- Fiche « En attente d'envoi » (recommandation UX n° 5) ----------
  // Ouverte depuis le bandeau : ce qui est gardé sur le téléphone, et la certitude que rien ne se perd.
  function ficheAttente() {
    const l = aEnvoyer(), k = aCorriger().length;
    const photos = typeof PH != "undefined" && PH.nbAttente ? PH.nbAttente() : 0;
    if (!l.length && !photos) { if ($sheet.open) $sheet.close(); return k ? ficheCorriger() : void 0; }
    $sheetForm.onsubmit = (e) => e.preventDefault();
    const quoi = [l.length ? pluriel(l.length, "saisie") : "", photos ? pluriel(photos, "photo") : ""].filter(Boolean).join(" et ");
    $sheetForm.innerHTML = `<h2>En attente d’envoi</h2>
      <div class="hl-rassure"><b>Tout est enregistré sur ce téléphone.</b><span class="small">${esc(quoi)} ${l.length + photos > 1 ? "partiront" : "partira"} ${st.hors || navigator.onLine === false ? "toutes seules au retour du réseau" : "dès que possible"}. Tu peux fermer l’app sans rien perdre.</span></div>
      ${l.map((it) => { const [t, s] = libelle(it), b = window.Regles?.file ? F().bloquante(it, st.file) : null;
        return `<div class="hl-row"><span><b>${esc(t)}</b><span class="small">${esc(s)}${b ? " · part après « " + esc(libelle(b)[0]) + " »" : ""}</span></span><span class="tag watch">en attente</span></div>`; }).join("")}
      ${photos ? `<div class="hl-row"><span><b>${esc(pluriel(photos, "photo"))} de visite</b><span class="small">réduites, prêtes à partir</span></span><span class="tag watch">en attente</span></div>` : ""}
      ${k ? `<button type="button" class="btn" data-act="hlcorriger">${esc(pluriel(k, "saisie"))} à corriger</button>` : ""}
      <button type="button" class="link" data-act="hlsynchro">Tout le détail de la synchronisation</button>
      <div class="actions">${st.hors || navigator.onLine === false ? "" : `<button type="button" class="btn main" data-act="hlenvoyer"${st.envoi ? " aria-busy=\"true\" disabled" : ""}>Envoyer maintenant</button>`}<button type="button" class="btn" data-act="closesheet">Fermer</button></div>`;
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
    if (encore?.statut === CONFLIT) { toast("La saisie a encore changé entre-temps : choisis à nouveau.", true); ficheConflit(encore.id); }
    else if (encore?.statut === QUARANTAINE) { toast(`Toujours refusée : ${encore.erreur}`, true); ficheCorriger(); }
    else if (encore) { toast("Gardée sur le téléphone : envoi au retour du réseau"); ficheCorriger(); }
    else ficheCorriger();
    majBandeau();
  }
  // ---------- Fiche « Choisir la version » (AP-TECH-152, AP-US-049) ----------
  // Les deux versions champ par champ ; seuls les champs changés des deux côtés demandent un choix. Rien n'est envoyé
  // ni abandonné sans un geste : la saisie reste « à corriger » tant que la fiche n'est pas validée.
  function ficheConflit(id) {
    const it = enFile(id);
    if (!it || it.statut !== CONFLIT) return ficheCorriger();
    const [t, s] = libelle(it), R = F();
    $sheetForm.onsubmit = (e) => e.preventDefault();
    if (it.nom === "supprimer_saisie") {
      const serveur = it.reponse?.serveur || {}, champs = Object.keys(R.LIBELLES).filter((k) => k in serveur && serveur[k] !== null && serveur[k] !== "").slice(0, 8);
      $sheetForm.innerHTML = `<h2>Saisie modifiée entre-temps</h2><p class="small"><b>${esc(t)}</b>${s ? " · " + esc(s) : ""}</p>
        <p>Un autre membre a modifié cette saisie après que tu l’as supprimée sans réseau. Veux-tu quand même la supprimer ?</p>
        <div class="hl-versions">${champs.map((k) => `<div class="hl-v"><span class="small">${esc(R.LIBELLES[k])}</span><b>${esc(R.valeurLisible(k, serveur[k]))}</b></div>`).join("")}</div>
        <div class="actions"><button type="button" class="btn main" data-act="hlgarder" data-v="${it.id}">Garder la saisie</button><button type="button" class="btn crit" data-act="hlforcer" data-v="${it.id}">Supprimer quand même</button></div>
        <button type="button" class="link" data-act="hlcorriger">Plus tard</button>`;
      if (!$sheet.open) $sheet.showModal();
      return;
    }
    const lignes = R.versions(it, it.reponse), aChoisir = lignes.filter((x) => x.conflit), passent = lignes.filter((x) => !x.conflit);
    $sheetForm.innerHTML = `<h2>Choisis la version à garder</h2><p class="small"><b>${esc(t)}</b>${s ? " · " + esc(s) : ""}</p>
      <p class="small">Un autre membre a modifié la même saisie pendant que tu étais sans réseau. Pour chaque champ, choisis ce qui reste.</p>
      ${aChoisir.map((x) => `<fieldset class="hl-choix"><legend>${esc(x.libelle)}</legend>
        <label class="hl-opt"><input type="radio" name="${esc(x.k)}" value="mien" required><span><span class="small">Ta version</span><b>${esc(R.valeurLisible(x.k, x.mien))}</b></span></label>
        <label class="hl-opt"><input type="radio" name="${esc(x.k)}" value="serveur" required><span><span class="small">Version enregistrée</span><b>${esc(R.valeurLisible(x.k, x.serveur))}</b></span></label></fieldset>`).join("")}
      ${passent.length ? `<p class="small">Partiront aussi, sans conflit : ${passent.map((x) => esc(x.libelle + " " + R.valeurLisible(x.k, x.mien))).join(", ")}.</p>` : ""}
      <div class="actions"><button class="btn main" style="flex:1">Garder ce choix</button><button type="button" class="btn" data-act="hlcorriger">Plus tard</button></div>`;
    $sheetForm.onsubmit = async (e) => {
      e.preventDefault();
      const choix = Object.fromEntries(new FormData($sheetForm)), suite = R.resoudre(it, it.reponse, choix);
      if (!suite) {
        await retirer(it.id);
        toast("Version enregistrée gardée");
        try { await window.loadAll(); } catch {}
        render(); return ficheCorriger();
      }
      await remplacer(suite);
      await renvoyer(suite);
      try { render(); } catch {}
    };
    if (!$sheet.open) $sheet.showModal();
  }

  Object.assign(ACT, {
    hlcorriger: () => ficheCorriger(),
    hlconflit: (id) => ficheConflit(id),
    hlsynchro: () => { if ($sheet.open) $sheet.close(); go("synchronisation"); },
    // Suppression en conflit : l'utilisateur garde la saisie (la suppression est abandonnée) ou supprime quand même.
    hlgarder: async (id) => {
      const it = enFile(id); if (!it) return;
      await retirer(it.id);
      toast("Saisie gardée");
      try { await window.loadAll(); } catch {}
      render(); ficheCorriger();
    },
    hlforcer: async (id) => {
      const it = enFile(id); if (!it) return;
      it.args = { p: { ...it.args.p, forcer: true } };
      await renvoyer(it);
      try { render(); } catch {}
    },
    hlvoir: () => ficheAttente(),
    hlenvoyer: async () => {
      st.essai = 0;
      await envoyer(false);
      if (typeof PH != "undefined" && PH.envoyer) await PH.envoyer().catch(() => {});
      majBandeau();
      if ($sheet.open) ficheAttente();
    },
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
    kv: { lire: kvLire, mettre: kvMettre }, // brouillons de visite (v5.49, src/domaines/visites/brouillon.js)
    horsLigne: () => st.hors,
    nb: () => st.file.length, // toutes les saisies pas encore enregistrées, toutes exploitations, y compris celles à corriger
    nbIci: () => st.file.filter(ici).length, // celles de l'exploitation ouverte
    // État pour l'écran Synchronisation (IT-09, AP-TECH-154) : copie, à lire sans la modifier.
    etat: () => ({
      file: st.file.map((it) => {
        const b = window.Regles?.file ? F().bloquante(it, st.file) : null;
        return { id: it.id, ex: it.ex || "", ici: ici(it), statut: it.statut || (b ? "bloquee" : "attente"), titre: libelle(it), erreur: it.erreur || "",
          apres: b ? libelle(b)[0] : "", op: it.op || "creer", cree: it.cree };
      }),
      hors: st.hors || navigator.onLine === false, envoi: st.envoi, depuis: st.depuis,
      dernier: st.dernier || Number(memo("apidoo-dernier-envoi" + (window.APIDOO?.env === "recette" ? "-recette" : "")) || 0) || null,
      photos: typeof PH != "undefined" && PH.nbAttente ? PH.nbAttente() : 0,
      autres: window.Regles?.file && typeof EX != "undefined" && EX.liste ? F().autresExploitations(st.file, exCourante(), EX.liste()) : [],
      v1: fileV1(),
    }),
    // Lignes du menu du compte (AP-US-050) : saisies d'autres exploitations, et l'entrée vers Synchronisation.
    blocCompte: () => {
      const e = HL.etat(), ic = e.file.filter((x) => x.ici).length;
      const lignes = e.autres.map((a) => `<button type="button" class="n4-ligne hl-autre" data-act="n4expl" data-v="${esc(a.id)}"><span class="u-todo-t"><b>${esc(a.texte)}</b><span class="small">Elles partiront une fois cette exploitation ouverte</span></span><span class="btn sm">Y passer</span></button>`).join("");
      const etatTexte = ic ? pluriel(ic, "saisie") + " en attente ici" : e.photos ? pluriel(e.photos, "photo") + " en attente" : e.autres.length ? "Rien en attente ici" : "Tout est envoyé";
      return `<section class="n4-bloc"><h3>Synchronisation</h3>${lignes}<button type="button" class="n4-ligne" data-act="hlsynchro"><span class="u-todo-t"><b>État de l’envoi</b><span class="small">${esc(etatTexte)}</span></span><span aria-hidden="true">›</span></button></section>`;
    },
    nbCorriger: () => aCorriger().length,
    // Déconnexion (AP-BUG-003) : ferme la base locale pour qu'elle puisse être supprimée, et oublie tout.
    fermer: async () => {
      ferme = true;
      const d = await dbP?.catch(() => null);
      d?.close(); dbP = null;
      st.file = []; memoire.kv.clear(); memoire.file.clear();
    },
    ficheCorriger, ficheAttente, ficheConflit,
    enAttente: (id) => !!saisieDe(id),
  };
})();
