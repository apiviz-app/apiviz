// Apiviz — photos de visite, de colonie et de rucher.
// Prise de photo, réduction automatique, envoi différé si le réseau manque,
// vignettes dans le journal de la ruche. S'appuie sur app.js (S, sb, esc, toast…).
// IT-11 (migration 035) : rattachement Visite / Colonie / Rucher, photos ajoutées depuis la fiche d'une colonie ou d'un
// rucher (même file d'envoi), message clair quand une photo HEIC ne se lit pas, espace surveillé avec alerte à 80 %.
// Règles pures : src/domaines/photos/regles.js (window.Regles.photos). Écrans : src/domaines/photos/.
const PH = (() => {
  const BUCKET = "photos-visites";
  const MAX_PAR_VISITE = 10;
  const R = () => window.Regles?.photos;
  const QUOTA = 1024 ** 3; // 1 Go, offre gratuite Supabase (R().QUOTA)
  const nouvelId = () => (crypto.randomUUID ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
  const st = {
    pret: false,        // la base connaît les photos (migration 004 faite)
    brouillon: [],      // photos choisies pour la visite en cours
    pour: null,         // la visite (objet S.visite) à laquelle le brouillon appartient
    attente: [],        // photos enregistrées sur le téléphone, pas encore envoyées
    urls: new Map(),    // chemin -> { url, exp } (liens temporaires)
    espace: null,       // octets utilisés dans le stockage
    envoi: false,
    v034: null,         // la base connaît les photos de colonie et de rucher (migration 035) ; null : pas encore su
    lien: "visite",     // rattachement choisi pour les photos de la visite en cours (IT-11)
  };

  // ---------- Petit stockage local (IndexedDB), avec repli en mémoire ----------
  let dbP = null, ferme = false;
  const memoire = new Map();
  function db() {
    if (ferme) return Promise.resolve(null);
    if (!dbP) dbP = new Promise((ok) => {
      try {
        const r = indexedDB.open("apidoo-photos" + (window.APIDOO?.env === "recette" ? "-recette" : ""), 1);
        r.onupgradeneeded = () => r.result.createObjectStore("attente", { keyPath: "id" });
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ok(null);
      } catch { ok(null); }
    });
    return dbP;
  }
  async function idb(mode, fn) {
    const d = await db();
    if (!d) return fn(null);
    return new Promise((ok, ko) => {
      const tx = d.transaction("attente", mode), s = tx.objectStore("attente");
      let res; const r = fn(s);
      if (r) r.onsuccess = () => { res = r.result; };
      tx.oncomplete = () => ok(res);
      tx.onerror = () => ko(tx.error);
    });
  }
  const qTous = () => idb("readonly", (s) => (s ? s.getAll() : null)).then((r) => r || [...memoire.values()]);
  const qMettre = (o) => idb("readwrite", (s) => (s ? s.put(o) : void memoire.set(o.id, o)));
  const qOter = (id) => idb("readwrite", (s) => (s ? s.delete(id) : void memoire.delete(id)));

  // ---------- Réduction de l'image ----------
  async function reduire(fichier) {
    const src = URL.createObjectURL(fichier);
    try {
      const img = new Image();
      img.src = src;
      await img.decode();
      let cote = 1600, qualite = 0.72, blob, w, h;
      for (let essai = 0; essai < 5; essai++) {
        const k = Math.min(1, cote / Math.max(img.naturalWidth, img.naturalHeight));
        w = Math.round(img.naturalWidth * k); h = Math.round(img.naturalHeight * k);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", qualite));
        if (!blob) throw new Error("Image illisible");
        if (blob.size <= 320 * 1024) break;
        cote = Math.round(cote * 0.8); qualite = Math.max(0.6, qualite - 0.04);
      }
      return { blob, largeur: w, hauteur: h, octets: blob.size };
    } catch {
      // Chrome sur Android ne lit pas le HEIC des iPhone : on le dit clairement (AP-TECH-164).
      throw new Error(R()?.messageIllisible(fichier) || "Cette photo n’a pas pu être lue. Essaie d’en prendre une nouvelle.");
    } finally { URL.revokeObjectURL(src); }
  }

  // ---------- Chargement ----------
  const memoPret = (v) => { try { if (v === undefined) return localStorage.getItem("apidoo-photos-pret"); localStorage.setItem("apidoo-photos-pret", v); } catch { return null; } };
  async function load() {
    // Lecture paginée (AP-BUG-002) : plus de 1 000 photos restent toutes visibles.
    const { data, error } = await lireTout("visite_photos", "created_at").then((d) => ({ data: d, error: null }), (e) => ({ data: null, error: e }));
    if (error && typeof HL != "undefined" && HL.reseau(error)) {
      // Sans réseau : on garde les photos déjà connues et l'état de la base.
      st.pret = memoPret() === "1";
      S.d.photos = S.d.photos || [];
    } else {
      st.pret = !error;
      S.d.photos = error ? [] : data;
      memoPret(st.pret ? "1" : "0");
      if (st.pret) st.v034 = connait034(data);
    }
    if (error && st.v034 === null && memo034()) st.v034 = memo034() === "1";
    const att = await qTous().catch(() => []);
    st.attente.forEach((p) => p.apercu && URL.revokeObjectURL(p.apercu));
    st.attente = att.map((p) => ({ ...p, apercu: URL.createObjectURL(p.blob) }));
    if (st.pret) {
      lireEspace();
      if (st.attente.length) setTimeout(envoyer, 500);
    }
  }

  // Migration 035 : les lignes lues portent colonie_id. Sans aucune photo, on le saura au premier besoin (une lecture
  // de la colonne, une fois), pour ne rien ajouter aux lectures de l'ouverture (etapes_dl).
  const memo034 = (v) => { try { if (v === undefined) return localStorage.getItem("apidoo-photos-034"); localStorage.setItem("apidoo-photos-034", v); } catch { return null; } };
  function connait034(lignes) {
    if (!lignes?.length) return memo034() ? memo034() === "1" : null;
    const ok = "colonie_id" in lignes[0];
    memo034(ok ? "1" : "0");
    return ok;
  }
  let sonde = null;
  function sonder034() {
    if (st.v034 !== null || sonde || !st.pret) return;
    sonde = sb.from("visite_photos").select("colonie_id").limit(1).then(({ error }) => {
      if (error && typeof HL != "undefined" && HL.reseau(error)) return; // sans réseau : on reposera la question
      st.v034 = !error; memo034(st.v034 ? "1" : "0");
      // Seule une section photos de fiche affichée est redessinée ; la visite en cours n'est jamais redessinée sous les
      // doigts (le choix « Rattacher à » apparaît au prochain affichage de la section Photos).
      if (st.v034 && ["ruche", "rucher"].includes(S.route) && document.querySelector(".ph-fiche")) render();
    }, () => {}).finally(() => { sonde = null; });
  }
  const sait034 = () => { if (st.v034 === null) sonder034(); return st.v034 === true; };

  // ---------- Espace photos (AP-FEAT-048) ----------
  function lireEspace() {
    return sb.rpc("photos_espace").then(({ data: o }) => {
      if (typeof o !== "number") return;
      st.espace = o;
      prevenir();
      if (S.route === "reglages" || S.route === "stockage") window.Noyau?.photosEcrans?.rafraichir?.();
    }, () => {});
  }
  /** État de l'espace : utilisé, restant, moyenne d'une photo (règles pures), ou null si la base n'a pas répondu. */
  function etatEspace() {
    if (st.espace === null || !R()) return null;
    const avecTaille = (S.d?.photos || []).filter((p) => Number(p.octets) > 0);
    return R().espace(st.espace, { nbPhotos: avecTaille.length, octetsPhotos: avecTaille.reduce((s, p) => s + Number(p.octets), 0) });
  }
  // Le responsable est prévenu une fois par jour sur cet appareil quand 80 % sont atteints (AP-US-054, AP-TECH-167).
  function prevenir() {
    const e = etatEspace();
    if (!e?.alerte || typeof EX == "undefined" || !EX.responsable?.()) return;
    const cle = "apiviz-alerte-espace-" + (EX.courante?.() || ""), jour = new Date().toISOString().slice(0, 10);
    try { if (localStorage.getItem(cle) === jour) return; localStorage.setItem(cle, jour); } catch { return; }
    if (typeof toast == "function") toast(`Espace photos utilisé à ${e.pourcent} % : ${R().octets(e.restant)} restants. Détails dans Réglages.`, true);
  }

  // ---------- Formulaire de visite ----------
  function brouillon() {
    if (st.pour !== S.visite) {
      st.brouillon.forEach((p) => URL.revokeObjectURL(p.apercu));
      st.brouillon = []; st.pour = S.visite;
    }
    return st.brouillon;
  }
  const mo = (o) => (o < 1048576 ? Math.max(1, Math.round(o / 1024)) + " Ko" : (o / 1048576).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Mo");

  function formSection() {
    if (!st.pret) return `<section class="card"><h2>Photos</h2><p class="small">Les photos seront disponibles une fois la base de données mise à jour.</p></section>`;
    const b = brouillon();
    const vign = b.map((p) => `<div class="ph-th"><img src="${p.apercu}" alt="Photo ajoutée"><button type="button" class="ph-x" aria-label="Retirer cette photo" data-act="phretirer" data-v="${p.id}">×</button></div>`).join("");
    const plein = b.length >= MAX_PAR_VISITE;
    const e = etatEspace();
    const espace = e ? (e.alerte ? `<p class="small ph-alerte" role="status">${esc(R().avertissement(e))}</p>` : `<p class="small">Espace photos utilisé : ${mo(st.espace)} sur 1 Go.</p>`) : "";
    return `<section class="card ph-sec"><h2>Photos</h2>
      ${b.length ? `<div class="ph-grid">${vign}</div>` : '<p class="small">Cadres, couvain, entrée… Les photos sont réduites avant l’envoi.</p>'}
      ${choixLien()}
      ${plein ? `<p class="small">${MAX_PAR_VISITE} photos maximum par visite.</p>` : `<div class="ph-add">
        <label class="btn">Prendre une photo<input type="file" accept="image/*" capture="environment" data-photo hidden></label>
        <label class="btn">Galerie<input type="file" accept="image/*" multiple data-photo hidden></label>
      </div>`}${espace}</section>`;
  }

  // Rattachement Visite / Colonie / Rucher (AP-TECH-165) : seulement avec la migration 035 et pour une seule colonie.
  function choixLien() {
    if (!R() || !S.visite?.ruche_id || S.visite.multi || !sait034()) return "";
    const ruche = byId(S.d.ruches, S.visite.ruche_id);
    if (st.lien === "rucher" && !ruche?.rucher_id) st.lien = "visite";
    const boutons = R().LIENS.map(([k, nom]) => {
      const off = k === "rucher" && !ruche?.rucher_id;
      return `<button type="button" class="ph-lien${st.lien === k ? " on" : ""}" data-act="phlien" data-v="${k}" aria-pressed="${st.lien === k}"${off ? " disabled" : ""}>${esc(nom)}</button>`;
    }).join("");
    const aide = st.lien === "colonie" ? `Aussi sur la fiche de ${esc(ruche?.nom || "la colonie")}.`
      : st.lien === "rucher" ? `Aussi sur la fiche du rucher ${esc((S.d.ruchers || []).find((x) => x.id === ruche?.rucher_id)?.nom || "")}.`
      : "Dans le journal de la visite.";
    return `<div class="ph-liens"><span class="ph-liens-t" id="phLiensT">Rattacher à</span><div class="ph-seg" role="group" aria-labelledby="phLiensT">${boutons}</div><p class="small">${aide}</p></div>`;
  }

  document.addEventListener("change", async (e) => {
    const inp = e.target;
    if (inp.matches?.("input[data-photo-fiche]") && inp.files?.length) {
      const fichiers = [...inp.files];
      inp.value = "";
      return ajouterFiche(inp.dataset.photoFiche, inp.dataset.id, fichiers);
    }
    if (!inp.matches?.("input[data-photo]") || !inp.files?.length) return;
    const fichiers = [...inp.files];
    inp.value = "";
    readVisitForm();
    const b = brouillon();
    const place = MAX_PAR_VISITE - b.length;
    if (fichiers.length > place) toast(`${MAX_PAR_VISITE} photos maximum par visite`, true);
    for (const f of fichiers.slice(0, place)) {
      try {
        const r = await reduire(f);
        b.push({ id: nouvelId(), ...r, apercu: URL.createObjectURL(r.blob) });
      } catch (err) { fail(err); }
    }
    if (S.route === "visite") redessiner("visite");
  });

  // Après l'enregistrement de la visite : les photos passent dans la file d'envoi.
  async function rattacher(visiteId) {
    const b = brouillon();
    if (!b.length) return;
    if (!visiteId) { // repli : la dernière visite enregistrée pour cette ruche
      const { data } = await sb.from("visites").select("id").eq("ruche_id", S.visite.ruche_id)
        .order("created_at", { ascending: false }).limit(1);
      visiteId = data?.[0]?.id;
      if (!visiteId) return toast("Visite enregistrée, mais les photos n’ont pas pu y être rattachées", true);
    }
    // Colonie ou rucher en plus de la visite (migration 035) ; sans 035, la visite seule comme avant.
    const lien = st.v034 === true && R() && !S.visite?.multi ? R().fiches(st.lien, visiteId, byId(S.d.ruches, S.visite?.ruche_id)) : { visite_id: visiteId };
    for (const p of b) {
      const o = { id: p.id, ex: typeof EX != "undefined" ? EX.courante() : "", ...lien, blob: p.blob, largeur: p.largeur, hauteur: p.hauteur, octets: p.octets, cree: Date.now() };
      await qMettre(o).catch(() => memoire.set(o.id, o));
      st.attente.push({ ...o, apercu: p.apercu });
    }
    st.brouillon = []; st.pour = null; st.lien = "visite";
    setTimeout(envoyer, 0);
  }

  // Photo ajoutée depuis la fiche d'une colonie ou d'un rucher, sans visite (AP-TECH-165). Même file d'envoi : la photo
  // est gardée sur le téléphone avant tout envoi, et part au retour du réseau.
  async function ajouterFiche(type, ficheId, fichiers) {
    if (st.v034 !== true || !["colonie", "rucher"].includes(type) || !ficheId) return;
    const place = MAX_PAR_VISITE;
    if (fichiers.length > place) toast(`${place} photos à la fois au plus`, true);
    let n = 0;
    for (const f of fichiers.slice(0, place)) {
      try {
        const r = await reduire(f);
        const o = { id: nouvelId(), ex: typeof EX != "undefined" ? EX.courante() : "", visite_id: null,
          colonie_id: type === "colonie" ? ficheId : null, rucher_id: type === "rucher" ? ficheId : null,
          blob: r.blob, largeur: r.largeur, hauteur: r.hauteur, octets: r.octets, cree: Date.now() };
        await qMettre(o).catch(() => memoire.set(o.id, o));
        st.attente.push({ ...o, apercu: URL.createObjectURL(r.blob) });
        n++;
      } catch (err) { fail(err); }
    }
    if (!n) return;
    if (["ruche", "rucher"].includes(S.route)) render();
    if (navigator.onLine === false) toast(n > 1 ? `${n} photos gardées sur le téléphone : envoi au retour du réseau` : "Photo gardée sur le téléphone : envoi au retour du réseau");
    setTimeout(envoyer, 0);
  }

  // ---------- Envoi (et nouvel essai quand le réseau revient) ----------
  async function envoyer() {
    if (st.envoi || !st.pret || !st.attente.length || !S.session) return;
    if (navigator.onLine === false) return;
    st.envoi = true;
    let ok = 0, echec = 0;
    try {
      for (const p of [...st.attente]) {
        // La visite, la colonie ou le rucher partent d’abord.
        if (typeof HL != "undefined" && [p.visite_id, p.colonie_id, p.rucher_id].some((x) => x && HL.enAttente(x))) continue;
        if (p.ex && typeof EX != "undefined" && p.ex !== EX.courante()) continue; // photo d’une autre exploitation
        if (!p.visite_id && st.v034 !== true) continue; // photo de fiche gardée : la base n'a pas encore 035
        const chemin = R() ? R().chemin(p) : `${p.ex ? p.ex + "/" : ""}${p.visite_id}/${p.id}.jpg`;
        const up = await sb.storage.from(BUCKET).upload(chemin, p.blob, { contentType: "image/jpeg", upsert: true });
        if (up.error) { echec++; break; }
        const ligne = { id: p.id, visite_id: p.visite_id || null, chemin, largeur: p.largeur, hauteur: p.hauteur, octets: p.octets };
        if (p.colonie_id) ligne.colonie_id = p.colonie_id;
        if (p.rucher_id) ligne.rucher_id = p.rucher_id;
        const { error } = await sb.from("visite_photos").upsert(ligne, { onConflict: "id", ignoreDuplicates: true });
        if (error && /foreign key/i.test(error.message)) {
          await sb.storage.from(BUCKET).remove([chemin]); // visite supprimée entre-temps
        } else if (error) { echec++; break; }
        await qOter(p.id).catch(() => {});
        st.attente = st.attente.filter((x) => x.id !== p.id);
        URL.revokeObjectURL(p.apercu);
        ok++;
      }
    } finally { st.envoi = false; }
    if (ok) {
      const data = await lireTout("visite_photos", "created_at").catch(() => null);
      if (data && S.d) S.d.photos = data;
      lireEspace();
      if (["ruche", "ruches", "rucher"].includes(S.route)) render();
      toast(ok > 1 ? `${ok} photos envoyées` : "Photo envoyée");
    }
    if (echec && st.attente.length) toast(`${st.attente.length} photo(s) en attente : envoi dès que le réseau revient`);
  }
  addEventListener("online", () => envoyer());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) envoyer(); });
  setInterval(() => { if (st.attente.length) envoyer(); }, 60000);

  // ---------- Journal de la ruche ----------
  let planif = 0;
  function vignettes(visiteId) {
    const enLigne = (S.d.photos || []).filter((p) => p.visite_id === visiteId);
    const local = st.attente.filter((p) => p.visite_id === visiteId);
    if (!enLigne.length && !local.length) return "";
    if (!planif) planif = setTimeout(() => { planif = 0; afficher(); }, 0);
    return `<div class="ph-grid ph-mini">${enLigne.map((p) => `<button type="button" class="ph-th" data-act="phvoir" data-v="${p.id}" aria-label="Voir la photo"><img data-ph="${esc(p.chemin)}" alt=""></button>`).join("")}${local.map((p) => `<button type="button" class="ph-th" data-act="phvoir" data-v="${p.id}" aria-label="Voir la photo en attente d’envoi"><img src="${p.apercu}" alt=""><span class="ph-wait">en attente</span></button>`).join("")}</div>`;
  }
  // Photos d'une fiche colonie ou rucher (IT-11) : celles de la fiche (envoyées et en attente) et le bouton d'ajout.
  // Les photos des visites restent montrées par date, comme avant, par l'écran lui-même (ux.js pour la colonie).
  function galerie(type, ficheId) {
    if (!st.pret || !ficheId) return "";
    const col = type === "rucher" ? "rucher_id" : "colonie_id";
    const enLigne = (S.d.photos || []).filter((p) => p[col] === ficheId);
    const local = st.attente.filter((p) => p[col] === ficheId);
    if (!planif && enLigne.length) planif = setTimeout(() => { planif = 0; afficher(); }, 0);
    const vign = [...local.map((p) => `<button type="button" class="ph-th" data-act="phvoir" data-v="${p.id}" aria-label="Voir la photo en attente d’envoi"><img src="${p.apercu}" alt=""><span class="ph-wait">en attente</span></button>`),
      ...enLigne.map((p) => `<button type="button" class="ph-th" data-act="phvoir" data-v="${p.id}" aria-label="Voir la photo"><img data-ph="${esc(p.chemin)}" alt=""></button>`)].join("");
    const nom = type === "rucher" ? "du rucher" : "de la colonie";
    const lecteur = typeof EX != "undefined" && EX.lecteur?.();
    const ajout = !sait034() ? '<p class="small">Les photos de fiche arrivent avec la prochaine mise à jour de la base.</p>'
      : lecteur ? "" : `<div class="ph-add">
        <label class="btn">Prendre une photo<input type="file" accept="image/*" capture="environment" data-photo-fiche="${type}" data-id="${esc(ficheId)}" hidden></label>
        <label class="btn">Galerie<input type="file" accept="image/*" multiple data-photo-fiche="${type}" data-id="${esc(ficheId)}" hidden></label></div>`;
    return `<section class="card ph-fiche" data-fiche="${type}"><h2>Photos ${nom}</h2>
      ${vign ? `<div class="ph-grid ph-mini">${vign}</div>` : `<p class="small">Aucune photo ${nom} pour l’instant : entrée, emplacement, plateau…</p>`}${ajout}</section>`;
  }

  async function liens(chemins) {
    const now = Date.now();
    const manque = [...new Set(chemins)].filter((c) => !(st.urls.get(c)?.exp > now + 60000));
    if (manque.length) {
      const { data } = await sb.storage.from(BUCKET).createSignedUrls(manque, 3600);
      (data || []).forEach((d) => d.signedUrl && st.urls.set(d.path, { url: d.signedUrl, exp: now + 3500000 }));
    }
  }
  async function afficher() {
    const imgs = [...document.querySelectorAll("img[data-ph]")].filter((i) => !i.src);
    if (!imgs.length) return;
    await liens(imgs.map((i) => i.dataset.ph)).catch(() => {});
    imgs.forEach((i) => { const u = st.urls.get(i.dataset.ph); if (u) i.src = u.url; });
  }

  // ---------- Visionneuse ----------
  const $v = document.createElement("dialog");
  $v.id = "photoView";
  document.body.appendChild($v);
  $v.addEventListener("click", (e) => { if (e.target === $v) $v.close(); });

  async function voir(id) {
    const p = (S.d.photos || []).find((x) => x.id === id);
    const l = st.attente.find((x) => x.id === id);
    if (!p && !l) return;
    const x = p || l, visite = x.visite_id ? byId(S.d.visites, x.visite_id) : null;
    const ruche = byId(S.d.ruches, visite?.ruche_id || x.colonie_id);
    const rucher = !ruche && x.rucher_id ? (S.d.ruchers || []).find((r) => r.id === x.rucher_id) : null;
    let src = l?.apercu;
    if (p) { await liens([p.chemin]); src = st.urls.get(p.chemin)?.url; }
    if (!src) throw new Error("Photo indisponible pour le moment");
    const quand = visite ? " · " + dfr(visite.date_visite) : x.created_at ? " · " + dfr(String(x.created_at).slice(0, 10)) : "";
    $v.innerHTML = `<figure><img src="${src}" alt="${visite ? "Photo de visite" : rucher ? "Photo du rucher" : "Photo de la colonie"}"><figcaption>${esc(ruche?.nom || rucher?.nom || "")}${quand}${l ? " · en attente d’envoi" : ""}</figcaption></figure>
      <div class="ph-bar"><button type="button" class="btn" data-act="phfermer">Fermer</button>${p ? `<button type="button" class="btn" data-act="phsuppr" data-v="${p.id}">Supprimer</button>` : ""}</div>`;
    $v.showModal();
  }

  Object.assign(ACT, {
    phretirer: (id) => {
      readVisitForm();
      const b = brouillon(), i = b.findIndex((p) => p.id === id);
      if (i >= 0) { URL.revokeObjectURL(b[i].apercu); b.splice(i, 1); }
      redessiner("visite");
    },
    phvoir: (id) => voir(id),
    phlien: (v) => {
      if (!R()?.LIENS.some(([k]) => k === v)) return;
      readVisitForm();
      st.lien = v;
      redessiner("visite");
    },
    phfermer: () => $v.close(),
    // Recommandation UX n° 8 : la photo disparaît tout de suite, « Annuler » reste 5 secondes (N4.plusTard),
    // et la suppression n'est faite qu'ensuite. Sans nav4.js, l'ancienne confirmation en deux temps reste.
    phsuppr: (id, _k, btn) => {
      const supprimer = async () => {
        const p = S.d.photos.find((x) => x.id === id);
        if (!p) return;
        const { error } = await sb.from("visite_photos").delete().eq("id", id);
        if (error) throw error;
        await sb.storage.from(BUCKET).remove([p.chemin]);
        S.d.photos = S.d.photos.filter((x) => x.id !== id);
        st.espace = st.espace !== null ? Math.max(0, st.espace - (p.octets || 0)) : null;
        render();
      };
      if (typeof N4 == "undefined" || !N4.plusTard) return twoStep(btn, "Confirmer", async () => { await supprimer(); $v.close(); toast("Photo supprimée"); });
      $v.close();
      N4.plusTard(null, "Photo supprimée", supprimer, document.querySelector(`.ph-th[data-v="${CSS.escape(id)}"]`));
    },
  });

  // Avant de supprimer une visite : retirer ses fichiers du stockage.
  async function oterVisite(visiteId) {
    const chemins = (S.d.photos || []).filter((p) => p.visite_id === visiteId).map((p) => p.chemin);
    if (chemins.length) await sb.storage.from(BUCKET).remove(chemins);
    for (const p of st.attente.filter((x) => x.visite_id === visiteId)) {
      await qOter(p.id).catch(() => {});
      URL.revokeObjectURL(p.apercu);
    }
    st.attente = st.attente.filter((x) => x.visite_id !== visiteId);
  }

  // Si les données étaient déjà chargées avant ce fichier, on complète.
  if (S.d) load().then(() => render()).catch(() => {});

  // Suppression d'une ruche (AP-BUG-004) : chemins de toutes les photos de ses visites, envoyées ou en attente.
  function cheminsRuche(rucheId) {
    const visites = new Set((S.d?.visites || []).filter((v) => v.ruche_id === rucheId).map((v) => v.id));
    const deLaRuche = (p) => visites.has(p.visite_id) || p.colonie_id === rucheId; // IT-11 : photos de la colonie aussi
    return {
      chemins: (S.d?.photos || []).filter(deLaRuche).map((p) => p.chemin),
      locales: st.attente.filter(deLaRuche).map((p) => p.id),
    };
  }
  async function effacer({ chemins, locales }) {
    for (let i = 0; i < chemins.length; i += 100) {
      const { error } = await sb.storage.from(BUCKET).remove(chemins.slice(i, i + 100));
      if (error) { journaliser("photos non effacees", error); break; }
    }
    for (const id of locales) await qOter(id).catch(() => {});
    st.attente = st.attente.filter((p) => !locales.includes(p.id));
    if (chemins.length) sb.rpc("photos_espace").then(({ data: o }) => { if (typeof o === "number") st.espace = o; });
  }

  // Déconnexion (AP-BUG-003) : ferme la base locale et oublie les photos gardées sur l'appareil.
  async function fermer() {
    ferme = true;
    const d = await dbP?.catch(() => null);
    d?.close(); dbP = null;
    st.attente.forEach((p) => p.apercu && URL.revokeObjectURL(p.apercu));
    st.attente = []; st.brouillon = []; memoire.clear(); st.urls.clear();
  }

  return { cheminsRuche, effacer, fermer, load, formSection, rattacher, vignettes, oterVisite, envoyer, QUOTA, nbAttente: () => st.attente.length,
    // IT-11 : galerie d'une fiche, état de l'espace, base à jour (035), relecture de l'espace.
    galerie, etatEspace, lireEspace, pret: () => st.pret, v034: () => st.v034 === true };
})();
