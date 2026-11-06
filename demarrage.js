// Apidoo — prise en main : présentation avant le compte, création du rucher en trois questions,
// guide de démarrage selon la saison, premier succès, écrans vides utiles. Chargé en dernier.
const DM = (() => {
  const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const cle = (k) => `apidoo-dm-${k}-${typeof EX != "undefined" ? EX.courante() : ""}`;
  const api = (etat, t) => (typeof Apidoo != "undefined" ? Apidoo.compagnon(etat, t) : "");
  document.head.insertAdjacentHTML("beforeend", `<style>
  .dm-ecran{min-height:100dvh;display:flex;flex-direction:column;gap:14px;max-width:460px;margin:0 auto;padding:24px 20px;background:var(--ground);color:var(--ink)}
  .dm-sombre{background:var(--pine);color:#fff;max-width:none}.dm-sombre>*{width:100%;max-width:420px;margin-inline:auto}
  .dm-say{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-size:27px;line-height:1.14;font-weight:700;margin:0}
  .dm-prom{flex:1;display:flex;flex-direction:column;justify-content:center;gap:2px;padding:12px 14px;border-radius:14px;background:var(--pine2)}.dm-prom span{color:#C5D0C8;font-size:13px}
  .dm-pas{font-size:13px;font-weight:600;color:var(--muted)}.dm-choix{flex:1;min-height:84px;display:flex;flex-direction:column;justify-content:center;text-align:left;gap:2px;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:#fff;color:var(--ink)}
  .dm-choix span{font-size:13px;color:var(--muted)}.dm-compte{display:grid;grid-template-columns:52px 1fr 52px;gap:6px;align-items:center}.dm-compte b{text-align:center;font-size:34px;font-family:'Bricolage Grotesque',system-ui,sans-serif}
  .dm-grand{flex:1}.dm-lien{min-height:44px;background:none;border:0;font-weight:600;color:var(--good);text-decoration:underline}.dm-sombre .dm-lien{color:#F6C453}
  .dm-guide .step{min-height:48px}.dm-bravo{display:flex;gap:10px;align-items:center;background:var(--honeysoft);border-radius:14px;padding:12px 14px;margin-bottom:12px}.dm-bravo>div{flex:1;min-width:0}
  .dm-sous{margin:12px 0 2px;font-weight:700}
  .dm-exemple{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--pine);color:#fff;font-size:13px;font-weight:600}.dm-exemple button{margin-left:auto;min-height:36px;padding:0 12px;border:0;border-radius:10px;background:var(--honey);color:var(--ink);font-weight:700}
  .dm-astuce{display:flex;flex-direction:column;gap:8px;padding:14px;margin-bottom:12px;border-radius:14px;background:var(--honeysoft)}.dm-astuce .u-entete{align-items:center}
  .dm-qr{display:flex;gap:14px;align-items:center}.dm-qr svg{width:112px;height:112px;flex:none}.dm-liste{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}
  .dm-invite{margin:8px 0 0}
  @media (min-width:801px){.dm-guide .steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.dm-sombre>*{max-width:560px}}</style>`);

  // ---------- Avant le compte ----------
  const authAvant = window.authView;
  let mail = "", inv;
  document.addEventListener("submit", (e) => { if (e.target.dataset.form === "auth" && e.target.email) mail = e.target.email.value; }, true);
  try { if (sessionStorage.getItem("dm-creer")) { sessionStorage.removeItem("dm-creer"); S.authMode = "up"; } } catch {}
  ACT.dmcorriger = () => { S.authMsg = ""; S.authMode = "up"; authView(); };
  ACT.dmconnexion = () => { S.authMsg = ""; S.authMode = "in"; authView(); };
  ACT.dmrenvoyer = async (v, el) => {
    const b = document.querySelector("[data-act=dmrenvoyer]"); if (b) b.disabled = true;
    const r = await sb.auth.resend({ type: "signup", email: mail });
    toast(r.error ? "Patiente un peu avant de renvoyer le lien" : "Lien renvoyé", !!r.error);
    setTimeout(() => { if (b) b.disabled = false; }, 30000);
  };
  window.authView = function () {
    const invit = memo("apidoo-invitation");
    if (S.authMsg && /^Compte créé/.test(S.authMsg)) {
      $app.innerHTML = `<div class="dm-ecran">${api("repond", 56)}<h1 class="dm-say">Ouvre le lien reçu${mail ? ` à ${esc(mail)}` : " par e-mail"}.</h1>
        <p class="small">Ouvre-le sur cet appareil pour continuer.</p>
        <section class="card dm-grand"><h2>Pas de message ?</h2><p class="small">Regarde dans les indésirables : l’expéditeur est Apidoo.</p>
        <div class="dm-liste">${mail ? '<button type="button" class="btn block" data-act="dmrenvoyer">Renvoyer le lien</button>' : ""}<button type="button" class="btn block" data-act="dmcorriger">Corriger mon adresse</button></div></section>
        <button type="button" class="dm-lien" data-act="dmconnexion">J’ai confirmé, me connecter</button></div>`;
      return;
    }
    if (invit && inv === undefined) {
      inv = null; S.authMode = "up";
      sb.rpc("invitation_info", { p_code: invit }).then((r) => { inv = r.error ? null : (r.data?.[0] || null); if (!S.session) authView(); }, () => {});
    }
    if (S.authMode === "in" && !S.recovery && !invit && !memo("apidoo-dm-entree")) {
      $app.innerHTML = `<div class="dm-ecran dm-sombre">${api("bonjour", 60)}
        <h1 class="dm-say">Tes ruches, ton miel et tes comptes dans ta poche.</h1>
        <div class="dm-prom"><b>Dicte ta visite, gants aux mains</b><span>API range chaque note dans la bonne ruche, même sans réseau</span></div>
        <div class="dm-prom"><b>Sache quand ouvrir</b><span>La météo de ton rucher te donne le meilleur créneau</span></div>
        <div class="dm-prom"><b>Suis ton miel jusqu’au pot vendu</b><span>Récoltes, stock, clients et ce qu’il reste à encaisser</span></div>
        <button type="button" class="btn honey block" data-act="dmentrer" data-v="up">Créer mon rucher</button>
        <button type="button" class="dm-lien" data-act="dmentrer" data-v="in">J’ai déjà un compte</button>
        <button type="button" class="dm-lien" data-act="dmexemple">Voir un rucher d’exemple</button></div>`;
      return;
    }
    if (S.authMsg) S.authMsg = S.authMsg.replace(/Compte créé\..*/, "Compte créé. Ouvre le lien reçu par e-mail sur ce téléphone pour continuer.");
    authAvant();
    const sub = document.querySelector(".auth .sub");
    if (sub) sub.textContent = "Le carnet de bord de ton rucher";
    const note = document.querySelector(".auth .notice");
    if (invit && sub) {
      sub.outerHTML = inv && !inv.valide ? '<h1 class="dm-say dm-invite">Ce lien n’est plus valable.</h1><p class="small">Demande un nouveau lien à la personne qui t’a invité.</p>'
        : `<h1 class="dm-say dm-invite">Tu es invité à rejoindre ${inv ? esc(inv.nom) : "une exploitation"}.</h1><p class="small">Les ruches, les visites et le miel t’attendent, rien à ressaisir.</p>`;
    }
    if (note) note.textContent = note.textContent.replace("Vous avez reçu une invitation. Connectez-vous ou créez votre compte pour rejoindre l’exploitation.", "Tu as reçu une invitation. Connecte-toi ou crée ton compte pour rejoindre l’exploitation.");
  };
  ACT.dmentrer = (v) => { memo("apidoo-dm-entree", "1"); S.authMode = v; S.authMsg = ""; authView(); };

  // ---------- Trois questions ----------
  const q = { pas: 1, profil: "", nom: "", nb: 2, rucher: "", lat: null, lng: null };
  const accueilAvant = EX.accueil;
  EX.accueil = function () {
    if (memo("apidoo-invitation")) return accueilAvant();
    const champ = (id, t, v, ph) => `<label>${t}<input id="${id}" value="${esc(v)}" placeholder="${ph}" maxlength="80"></label>`;
    const tete = `<p class="dm-pas">Question ${q.pas} sur 3</p>`;
    const corps = q.pas === 1 ? `${api("repond", 56)}${tete}<h1 class="dm-say">Où en es-tu avec tes abeilles ?</h1>
        <button type="button" class="dm-choix" data-act="dmprofil" data-v="deja"><b>J’ai déjà des ruches</b><span>Tu reprends où tu en es</span></button>
        <button type="button" class="dm-choix" data-act="dmprofil" data-v="debut"><b>Je me lance</b><span>Tu démarres avec tes premières ruches</span></button>
        <button type="button" class="dm-choix" data-act="dmexemple"><b>Je veux d’abord regarder</b><span>Un rucher d’exemple, sans rien saisir</span></button>
        <button type="button" class="dm-lien" data-act="logout">Se déconnecter</button>`
      : q.pas === 2 ? `${tete}<h1 class="dm-say">Comment s’appelle ton exploitation, et combien de ruches as-tu ?</h1>
        ${champ("dm_nom", "Nom de ton exploitation", q.nom, "Le rucher des Tilleuls")}
        <p class="dm-sous">Nombre de ruches</p><div class="dm-compte"><button type="button" class="btn" data-act="dmnb" data-v="-1" aria-label="Une ruche de moins">−</button><b>${q.nb}</b><button type="button" class="btn" data-act="dmnb" data-v="1" aria-label="Une ruche de plus">+</button></div>
        <p class="small">Tu pourras les renommer. Le lien d’invitation d’un associé s’ouvre directement sur ce téléphone.</p><div class="dm-grand"></div>
        <button type="button" class="btn honey block" data-act="dmsuite">Continuer</button>`
      : `${tete}<h1 class="dm-say">Où sont tes ruches ?</h1><p class="small">Pour te dire quand ouvrir, selon la météo de ton rucher.</p>
        ${champ("dm_rucher", "Nom du rucher", q.rucher, "Le Verger")}
        <button type="button" class="btn block" data-act="dmposition">${q.lat === null ? "Utiliser ma position" : "Position enregistrée"}</button><div class="dm-grand"></div>
        <button type="button" class="btn honey block" data-act="dmcreer">Créer mon rucher</button>`;
    $app.innerHTML = `<div class="dm-ecran">${corps}</div>`;
  };
  ACT.dmprofil = (v) => { q.profil = v; q.pas = 2; EX.accueil(); };
  ACT.dmnb = (v) => { q.nom = document.getElementById("dm_nom").value; q.nb = Math.min(200, Math.max(1, q.nb + Number(v))); EX.accueil(); };
  ACT.dmsuite = () => { q.nom = document.getElementById("dm_nom").value.trim(); if (!q.nom) return toast("Donne un nom à ton exploitation", true); q.pas = 3; EX.accueil(); };
  ACT.dmposition = () => {
    q.rucher = document.getElementById("dm_rucher").value;
    if (!navigator.geolocation) return toast("Position indisponible sur cet appareil", true);
    navigator.geolocation.getCurrentPosition((p) => { q.lat = p.coords.latitude; q.lng = p.coords.longitude; EX.accueil(); }, () => toast("Position refusée : tu pourras placer le rucher sur la carte", true));
  };
  ACT.dmcreer = async () => {
    const rucher = document.getElementById("dm_rucher").value.trim() || "Mon rucher";
    try {
      const r = await sb.rpc("creer_exploitation", { p_nom: q.nom });
      if (r.error) throw r.error;
      memo("apidoo-exploitation", r.data);
      await EX.choisir();
      const lignes = Array.from({ length: q.nb }, (_, i) => ({ id: crypto.randomUUID(), nom: `Ruche ${i + 1}`, rucher, type_ruche: "", etat: "Bonne", date_installation: today(), lat: q.lat, lng: q.lng }));
      const a = await sb.from("ruches").insert(lignes);
      if (a.error) throw a.error;
      memo(cle("profil"), q.profil);
      S.member = true; S.route = "dash"; render(); await loadAll(); render();
      toast("Exploitation créée");
    } catch (e) { fail(e); }
  };

  // ---------- Accueil de démarrage ----------
  const installee = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  function etapes() {
    const d = S.d;
    return [[d.ruches.length > 0, "Ajouter tes ruches", "newruches"],
      [d.ruches.some((r) => r.lat != null), "Placer ton rucher sur la carte", "dmcarte"],
      [d.visites.length > 0, "Noter une première visite", "dmvisite"],
      [!!memo(cle("invite")), "Inviter ton associé (facultatif)", "dminviter"],
      [installee() || !!memo(cle("installe")), "Installer Apidoo sur ton téléphone", "dminstaller"]];
  }
  function saison() {
    const d = S.d, m = new Date().getMonth();
    const l = [m >= 4 && m <= 8 ? [d.recoltes.length > 0, "Noter ta récolte", "newrecolte"] : [d.lots.length > 0, "Saisir tes pots restants", "newlot"],
      [d.clients.length > 0, "Ajouter tes clients habituels", "newclient"]];
    if (m >= 8) l.push([false, `Déclarer tes ruches avant le 31 décembre`, "dmdeclarer"]);
    return l.filter((x) => !x[0]);
  }
  const bouton = ([ok, t, a]) => `<button class="step ${ok ? "ok" : ""}" ${ok ? "disabled" : `data-act="${a}"`}><span class="dot">${ok ? "✓" : ""}</span>${esc(t)}</button>`;
  ACT.dmcarte = () => go("carte");
  // Première visite : la tournée existante, directement en mode guidé par API.
  ACT.dmvisite = async () => {
    const k = UX.ruchers()[0]?.[0];
    if (k === undefined || typeof ACT.tnmode != "function") return ACT.newvisite();
    await ACT.v3tournee(k);
    ACT.tnmode("guide");
  };
  ACT.dmdeclarer = () => go("declaration");
  ACT.dminviter = () => { memo(cle("invite"), "1"); go("membres"); };
  ACT.dminstaller = () => { memo(cle("installe"), "1"); ACT.n4installer(); };
  ACT.dmmasquer = () => { memo(cle("masque"), "1"); redessiner("dash"); };
  ACT.dmbravo = () => {
    memo(cle("bravo"), "1"); redessiner("dash");
    if (matchMedia("(max-width:800px)").matches && !installee() && !memo(cle("installe"))) ACT.dminstaller();
  };

  // Écran « dash » : complément de l'écran, appelé par src/domaines/ (IT-03).
  function completerAccueil() {
    const d = S.d, wrap = document.querySelector(".wrap");
    if (!d || !wrap) return;
    document.querySelector(".steps")?.closest("section")?.remove();
    const responsable = demo || typeof EX == "undefined" || EX.responsable();
    if (demo) return;
    const titre = document.querySelector(".hero-head h1, .head h1, .hero h1, .hero h2");
    if (!d.visites.length && d.ruches.length && titre && responsable) titre.textContent = `Bonjour. ${U_pluriel(d.ruches.length)} en place. Note ta première visite.`;
    if (!d.ruches.length && titre) titre.textContent = "Bonjour. Ajoute tes ruches pour commencer.";
    if (!d.ruches.length || !d.visites.length) {
      [...wrap.querySelectorAll("section")].filter((s) => s.querySelector(".u-trois") || s.classList.contains("u-liste") && !s.querySelector(".u-todo")).forEach((s) => s.remove());
    }
    if (d.visites.length === 1 && !memo(cle("bravo"))) {
      const r = byId(d.ruches, d.visites[0].ruche_id);
      wrap.insertAdjacentHTML("afterbegin", `<section class="dm-bravo">${api("fait", 48)}<div><b>C’est noté. ${esc(r?.nom || "Ta ruche")} a sa première visite.</b><p class="small">Après 30 jours sans visite, elle reviendra dans À faire.</p></div><button class="btn" data-act="dmbravo">Fermer</button></section>`);
    }
    astuce(wrap);
    if (!responsable) { arrivee(wrap); return; }
    if (memo(cle("masque"))) return;
    const e = etapes(), s = saison(), faites = e.filter((x) => x[0]).length;
    if (faites === e.length && !s.length) return;
    const sec = `<section class="card dm-guide"><div class="u-entete"><h2>Bien démarrer</h2><button type="button" class="link" data-act="dmmasquer">Masquer</button></div>
      <p class="small">${faites} sur ${e.length}</p><div class="track"><i style="width:${Math.round(faites / e.length * 100)}%"></i></div>
      <div class="steps">${e.map(bouton).join("")}</div>${s.length && d.visites.length ? `<p class="dm-sous">Ce mois-ci</p><div class="steps">${s.map(bouton).join("")}</div>` : ""}</section>`;
    const haut = titre?.closest(".hero-head, .head, .hero");
    const avant = wrap.querySelector(".dm-bravo") || (haut && wrap.contains(haut) ? haut : null);
    if (avant) avant.insertAdjacentHTML("afterend", sec); else wrap.insertAdjacentHTML("afterbegin", sec);
    if (matchMedia("(min-width:801px)").matches && !installee()) relais();
  }
  function arrivee(wrap) {
    if (memo(cle("arrivee"))) return;
    const d = S.d, lignes = d.visites.slice(0, 2).map((v) => `<li class="small">${esc(byId(d.ruches, v.ruche_id)?.nom || "Ruche")} visitée le ${esc(dshort(v.date_visite))}</li>`).join("");
    const haut = wrap.querySelector(".hero-head, .head, .hero");
    const sec = `<section class="card dm-guide"><div class="u-entete"><h2>Tu fais partie de ${esc(cfg().nom)}</h2><button type="button" class="link" data-act="dmarrivee">Fermer</button></div>
      <p class="small">${d.ruches.length} ruche${d.ruches.length > 1 ? "s" : ""} déjà en place, rien à ressaisir.</p>${lignes ? `<ul class="dm-liste">${lignes}</ul>` : ""}
      ${installee() ? "" : '<button type="button" class="btn block" data-act="dminstaller">Installer Apidoo sur ton téléphone</button>'}</section>`;
    if (haut) haut.insertAdjacentHTML("afterend", sec); else wrap.insertAdjacentHTML("afterbegin", sec);
  }
  ACT.dmarrivee = () => { memo(cle("arrivee"), "1"); redessiner("dash"); };
  // Ordinateur : un code QR pour passer sur le téléphone.
  function relais() {
    const g = document.querySelector(".dm-guide"), lien = location.origin + location.pathname;
    g?.insertAdjacentHTML("afterend", `<section class="card"><h2>Au rucher, passe sur ton téléphone</h2><div class="dm-qr"><span id="dmQr"></span><p class="small">Scanne ce code ou ouvre ${esc(lien)} sur ton téléphone. Tu y retrouves ton compte et tes ruches.</p></div></section>`);
    const dessine = () => { const z = document.getElementById("dmQr"); if (!z || typeof qrcode != "function") return; const c = qrcode(0, "M"); c.addData(lien); c.make(); z.innerHTML = c.createSvgTag({ scalable: true }); };
    if (typeof qrcode == "function") return dessine();
    const t = document.createElement("script"); t.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"; t.onload = dessine; document.head.append(t);
  }
  // Une astuce par ouverture, trois en tout.
  const ASTUCES = [["Tout se saisit ici", "Visite, récolte, vente ou dépense : touche API au centre du menu."], ["Dicte ta tournée", "Depuis un rucher, Faire la tournée te laisse dicter toutes tes ruches d’un coup."], ["Sans réseau aussi", "Tes saisies restent sur le téléphone et partent au retour du réseau."]];
  function astuce(wrap) {
    const i = Number(memo(cle("astuce")) || 0);
    if (!S.d.visites.length || i >= ASTUCES.length || wrap.querySelector(".dm-bravo")) return;
    (wrap.querySelector(".hero-head, .head, .hero") || wrap.firstElementChild).insertAdjacentHTML("afterend", `<section class="dm-astuce" aria-label="Astuce"><h2 style="margin:0">${ASTUCES[i][0]}</h2><p>${ASTUCES[i][1]}</p><div class="u-entete"><span class="small">Astuce ${i + 1} sur ${ASTUCES.length}</span><button type="button" class="btn" data-act="dmastuce">Compris</button></div></section>`);
  }
  ACT.dmastuce = () => { memo(cle("astuce"), String(Number(memo(cle("astuce")) || 0) + 1)); document.querySelector(".dm-astuce")?.remove(); };

  // ---------- Rucher d'exemple : tout reste en mémoire, aucune requête vers la base ----------
  let demo = false;
  const jour = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  const R = ["1", "2", "3", "4", "5", "6"].map((n) => ({ id: "ex-r" + n, nom: "Ruche " + n, rucher: "Le Verger", etat: n === "5" ? "À surveiller" : "Bonne", type_ruche: "Dadant", notes: "", lat: 47.22, lng: -1.55, date_installation: jour(400) }));
  const DEMO = { ruches: R,
    visites: R.map((r, i) => ({ id: "ex-v" + i, ruche_id: r.id, date_visite: jour(12 + i), activite: "Normale", provisions: i === 4 ? "Faibles" : "Bonnes", reine: "Vue", couvain: "Normal", poids_kg: 38 - i, varroa: null, note: "", auteur: "exemple" })),
    lots_stock: [{ id: "ex-l", code: "L26-01", miel: "Toutes fleurs", format_g: 500, prix: 12, pots_initiaux: 40, pots_restants: 29 }],
    clients: [{ id: "ex-c", nom: "Mme Martin", cercle: "Famille" }],
    ventes: [{ id: "ex-s", client_id: "ex-c", date_vente: jour(9), paye: false, livre: true }], vente_lignes: [{ id: "ex-sl", vente_id: "ex-s", lot_id: "ex-l", quantite: 3, prix_unitaire: 12 }],
    recoltes: [{ id: "ex-rc", date_recolte: jour(90), kg: 24, ruche_id: "ex-r1" }], reglages: [{ id: 1, data: { nom: "Rucher d’exemple" } }] };
  const REFUS = { message: "Rucher d’exemple : rien n’est enregistré" };
  ACT.dmexemple = async () => {
    demo = true;
    const fin = (t, w) => new Proxy({}, { get: (_, k) => (k === "then" ? (ok) => ok(w ? { data: null, error: REFUS } : { data: DEMO[t] || [], error: null }) : (...a) => fin(t, w || ["insert", "update", "upsert", "delete"].includes(k))) });
    sb.from = (t) => fin(t, false);
    sb.rpc = async () => ({ data: null, error: REFUS });
    S.session = S.session || { user: { id: "exemple", email: "exemple@apidoo.fr" } };
    S.member = true; S.route = "dash";
    await window.loadAll(); render();
    document.body.insertAdjacentHTML("afterbegin", '<div class="dm-exemple"><span>Rucher d’exemple, rien n’est enregistré</span><button type="button" data-act="dmsortie">Créer le mien</button></div>');
    document.addEventListener("submit", (e) => { e.preventDefault(); e.stopImmediatePropagation(); toast(REFUS.message); document.getElementById("sheet")?.close?.(); }, true);
  };
  ACT.dmsortie = () => { memo("apidoo-dm-entree", "1"); try { sessionStorage.setItem("dm-creer", "1"); } catch {} location.reload(); };

  const U_pluriel = (n) => (n > 1 ? `Tes ${n} ruches sont` : "Ta ruche est");

  // ---------- Écrans vides ----------
  const videAvant = window.emptyState;
  window.emptyState = function (titre, texte, bouton, act) {
    if (titre === "Ajoutez votre premier client") {
      return `<section class="card"><h2>Par où commence ton miel ?</h2><p class="small">Choisis ton point de départ.</p>
        <button class="dm-choix" data-act="newlot"><b>J’ai déjà des pots</b><span>Saisis ton stock, tu peux vendre tout de suite</span></button>
        <button class="dm-choix" data-act="newrecolte"><b>Je viens de récolter</b><span>Note la récolte, puis crée tes lots</span></button>
        <button class="dm-choix" data-act="newclient"><b>J’ajoute d’abord un client</b><span>Famille, amis, collègues</span></button></section>`;
    }
    const tu = { "Ajoutez votre première ruche": "Ajoute ta première ruche", "Ajoutez vos fournisseurs": "Ajoute tes fournisseurs", "Votre stock de miel est vide": "Ton stock de miel est vide" };
    return videAvant(tu[titre] || titre, texte.replace("Une par une ou plusieurs d’un coup. Vous pourrez les regrouper par rucher.", "Une par une ou plusieurs d’un coup. Tu pourras les regrouper par rucher."), bouton, act);
  };
  return { completerAccueil };
})();
