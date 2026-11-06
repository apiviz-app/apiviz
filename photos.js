// Apidoo — photos de visite.
// Prise de photo, réduction automatique, envoi différé si le réseau manque,
// vignettes dans le journal de la ruche. S'appuie sur app.js (S, sb, esc, toast…).
const PH = (() => {
  const BUCKET = "photos-visites";
  const MAX_PAR_VISITE = 10;
  const QUOTA = 1024 ** 3; // 1 Go, offre gratuite Supabase
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
      throw new Error("Cette photo n’a pas pu être lue. Essaie d’en prendre une nouvelle.");
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
    }
    const att = await qTous().catch(() => []);
    st.attente.forEach((p) => p.apercu && URL.revokeObjectURL(p.apercu));
    st.attente = att.map((p) => ({ ...p, apercu: URL.createObjectURL(p.blob) }));
    if (st.pret) {
      sb.rpc("photos_espace").then(({ data: o }) => { if (typeof o === "number") st.espace = o; });
      if (st.attente.length) setTimeout(envoyer, 500);
    }
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
    const espace = st.espace !== null ? `<p class="small">Espace photos utilisé : ${mo(st.espace)} sur 1 Go.</p>` : "";
    return `<section class="card ph-sec"><h2>Photos</h2>
      ${b.length ? `<div class="ph-grid">${vign}</div>` : '<p class="small">Cadres, couvain, entrée… Les photos sont réduites avant l’envoi.</p>'}
      ${plein ? `<p class="small">${MAX_PAR_VISITE} photos maximum par visite.</p>` : `<div class="ph-add">
        <label class="btn">Prendre une photo<input type="file" accept="image/*" capture="environment" data-photo hidden></label>
        <label class="btn">Galerie<input type="file" accept="image/*" multiple data-photo hidden></label>
      </div>`}${espace}</section>`;
  }

  document.addEventListener("change", async (e) => {
    const inp = e.target;
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
    for (const p of b) {
      const o = { id: p.id, ex: typeof EX != "undefined" ? EX.courante() : "", visite_id: visiteId, blob: p.blob, largeur: p.largeur, hauteur: p.hauteur, octets: p.octets, cree: Date.now() };
      await qMettre(o).catch(() => memoire.set(o.id, o));
      st.attente.push({ ...o, apercu: p.apercu });
    }
    st.brouillon = []; st.pour = null;
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
        if (typeof HL != "undefined" && HL.enAttente(p.visite_id)) continue; // la visite part d’abord
        if (p.ex && typeof EX != "undefined" && p.ex !== EX.courante()) continue; // photo d’une autre exploitation
        const chemin = `${p.ex ? p.ex + "/" : ""}${p.visite_id}/${p.id}.jpg`;
        const up = await sb.storage.from(BUCKET).upload(chemin, p.blob, { contentType: "image/jpeg", upsert: true });
        if (up.error) { echec++; break; }
        const { error } = await sb.from("visite_photos").upsert(
          { id: p.id, visite_id: p.visite_id, chemin, largeur: p.largeur, hauteur: p.hauteur, octets: p.octets },
          { onConflict: "id", ignoreDuplicates: true });
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
      sb.rpc("photos_espace").then(({ data: o }) => { if (typeof o === "number") st.espace = o; });
      if (["ruche", "ruches"].includes(S.route)) render();
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
    const visite = byId(S.d.visites, (p || l).visite_id);
    const ruche = visite && byId(S.d.ruches, visite.ruche_id);
    let src = l?.apercu;
    if (p) { await liens([p.chemin]); src = st.urls.get(p.chemin)?.url; }
    if (!src) throw new Error("Photo indisponible pour le moment");
    $v.innerHTML = `<figure><img src="${src}" alt="Photo de visite"><figcaption>${esc(ruche?.nom || "")}${visite ? " · " + dfr(visite.date_visite) : ""}${l ? " · en attente d’envoi" : ""}</figcaption></figure>
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
    phfermer: () => $v.close(),
    phsuppr: (id, _k, btn) => twoStep(btn, "Confirmer", async () => {
      const p = S.d.photos.find((x) => x.id === id);
      if (!p) return;
      const { error } = await sb.from("visite_photos").delete().eq("id", id);
      if (error) throw error;
      await sb.storage.from(BUCKET).remove([p.chemin]);
      S.d.photos = S.d.photos.filter((x) => x.id !== id);
      st.espace = st.espace !== null ? Math.max(0, st.espace - (p.octets || 0)) : null;
      $v.close(); render(); toast("Photo supprimée");
    }),
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
    return {
      chemins: (S.d?.photos || []).filter((p) => visites.has(p.visite_id)).map((p) => p.chemin),
      locales: st.attente.filter((p) => visites.has(p.visite_id)).map((p) => p.id),
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

  return { cheminsRuche, effacer, fermer, load, formSection, rattacher, vignettes, oterVisite, envoyer, QUOTA };
})();
