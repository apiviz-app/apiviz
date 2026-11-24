// Apiviz — prise en main : premier rucher (v5.84 : une seule question après « Tu en es où ? »),
// guide de démarrage selon la saison, premier succès, écrans vides utiles. Chargé en dernier.
const DM = (() => {
  const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const cle = (k) => `apidoo-dm-${k}-${typeof EX != "undefined" ? EX.courante() : ""}`;
  const api = (etat, t) => (typeof Apiviz != "undefined" ? Apiviz.compagnon(etat, t) : "");
  document.head.insertAdjacentHTML("beforeend", `<style>
  .dm-ecran{min-height:100dvh;display:flex;flex-direction:column;gap:14px;max-width:460px;margin:0 auto;padding:24px 20px;background:var(--ground);color:var(--ink)}
  .dm-say{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-size:27px;line-height:1.14;font-weight:700;margin:0}
  .dm-pas{font-size:13px;font-weight:600;color:var(--muted)}.dm-choix{flex:1;min-height:84px;display:flex;flex-direction:column;justify-content:center;text-align:left;gap:2px;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:#fff;color:var(--ink)}
  .dm-choix span{font-size:13px;color:var(--muted)}.dm-compte{display:grid;grid-template-columns:52px 1fr 52px;gap:6px;align-items:center}.dm-compte b{text-align:center;font-size:34px;font-family:'Bricolage Grotesque',system-ui,sans-serif}
  .dm-grand{flex:1}.dm-lien{min-height:44px;background:none;border:0;font-weight:600;color:var(--good);text-decoration:underline}
  .dm-guide .step{min-height:48px}.dm-bravo{display:flex;gap:10px;align-items:center;background:var(--honeysoft);border-radius:14px;padding:12px 14px;margin-bottom:12px}.dm-bravo>div{flex:1;min-width:0}
  .dm-sous{margin:12px 0 2px;font-weight:700}
  .dm-exemple{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--pine);color:#fff;font-size:13px;font-weight:600}.dm-exemple button{margin-left:auto;min-height:36px;padding:0 12px;border:0;border-radius:10px;background:var(--honey);color:var(--ink);font-weight:700}
  .dm-astuce{display:flex;flex-direction:column;gap:8px;padding:14px;margin-bottom:12px;border-radius:14px;background:var(--honeysoft)}.dm-astuce .u-entete{align-items:center}
  .dm-qr{display:flex;gap:14px;align-items:center}.dm-qr svg{width:112px;height:112px;flex:none}.dm-liste{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}
  @media (min-width:801px){.dm-guide .steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}}</style>`);

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
        <section class="card dm-grand"><h2>Pas de message ?</h2><p class="small">Regarde dans les indésirables : l’expéditeur est Apiviz.</p>
        <div class="dm-liste">${mail ? '<button type="button" class="btn block" data-act="dmrenvoyer">Renvoyer le lien</button>' : ""}<button type="button" class="btn block" data-act="dmcorriger">Corriger mon adresse</button></div></section>
        <button type="button" class="dm-lien" data-act="dmconnexion">J’ai confirmé, me connecter</button></div>`;
      return;
    }
    if (invit && inv === undefined) {
      inv = null; S.authMode = "up";
      sb.rpc("invitation_info", { p_code: invit }).then((r) => { inv = r.error ? null : (r.data?.[0] || null); if (!S.session) authView(); }, () => {});
    }
    // Plus d'écran de présentation avant le compte (11 nov. 2026) : la page de connexion (v5.24) porte déjà
    // « Créer mon compte », le rucher d'exemple et « Où vont mes données ».
    if (S.authMsg) S.authMsg = S.authMsg.replace(/Compte créé\..*/, "Compte créé. Ouvre le lien reçu par e-mail sur ce téléphone pour continuer.");
    authAvant();
    if (invit) {
      // État du lien (migration 014) : déjà servi, révoqué ou expiré. La phrase existe deux fois (téléphone, ordinateur).
      const raison = { epuise: "Ce lien a déjà servi.", revoque: "Ce lien a été révoqué." }[inv?.etat] || "Ce lien n’est plus valable.";
      const [titre, sous] = inv && !inv.valide ? [raison, "Demande un nouveau lien à la personne qui t’a invité."]
        : [`Tu es invité à rejoindre ${inv ? esc(inv.nom) : "une exploitation"}${inv?.role === "lecteur" ? " en lecture seule" : ""}.`,
           inv?.role === "lecteur" ? "Tu verras les ruches, les visites et le miel, sans rien modifier." : "Les ruches, les visites et le miel t’attendent, rien à ressaisir."];
      document.querySelectorAll(".auth .cx-phrase").forEach((bloc) => {
        bloc.classList.add("dm-invite");
        bloc.querySelector(".cx-say").innerHTML = titre;
        bloc.querySelector(".sub").textContent = sous;
      });
    }
  };

  // ---------- Premier rucher (v5.84, écran 4 de la maquette « Onboarding irréprochable ») ----------
  // Une seule question après « Tu en es où ? » (profil.js) : le nom du rucher, sa position, le nombre de ruches.
  // L'exploitation prend un nom proposé (« Les ruches de Camille »), modifiable dans Réglages. Les rubriques affichées
  // suivent les réponses de « Tu en es où ? » (débutant : sans Matériel ni Finances ; ne vend pas : sans Ventes).
  const q = { nb: 2, rucher: "", lat: null, lng: null };
  const RA = () => window.Regles?.arrivee;
  const accueilAvant = EX.accueil;
  EX.accueil = function () {
    if (memo("apidoo-invitation")) return accueilAvant();
    const nb = q.nb, hexas = Array.from({ length: Math.min(nb, 12) }, (_, i) => `<span>Ruche ${i + 1}</span>`).join("") + (nb > 12 ? `<span>+${nb - 12}</span>` : "");
    $app.innerHTML = `<div class="ob ar-rucher"><form class="ob-in" data-form="dmrucher" novalidate>
      <div class="ob-hd"><span class="ob-prog" aria-label="Étape 3 sur 3"><i class="on"></i><i class="on"></i><i class="on"></i></span><button type="button" class="link" data-act="logout">Se déconnecter</button></div>
      <div class="ob-corps"><div><h1>Ton premier rucher</h1><p class="ob-sous">Tu pourras en ajouter d’autres, et tout renommer.</p></div>
        <label>Son nom<input id="dm_rucher" value="${esc(q.rucher)}" placeholder="Le Verger" maxlength="80"></label>
        <div class="ar-position">${q.lat === null ? `<button type="button" class="btn block" data-act="dmposition">Je suis au rucher : utiliser ma position</button>`
          : `<div class="ar-place"><span>✓ Placé là où tu es</span><button type="button" class="link" data-act="dmposition">Refaire</button></div>`}
          <p class="small">La position sert à la météo du rucher et à préparer tes tournées. Tu peux la donner plus tard.</p></div>
        <div class="ar-compte"><span><b>Combien de ruches ?</b><span>Numérotées pour toi, renommables</span></span>
          <div class="ar-pas"><button type="button" data-act="dmnb" data-v="-1" aria-label="Une ruche de moins">−</button><b aria-live="polite">${nb}</b><button type="button" data-act="dmnb" data-v="1" aria-label="Une ruche de plus">+</button></div></div>
        <div class="ar-hexas" aria-hidden="true">${hexas}</div>
        <button type="button" class="link" data-act="dmexemple">Voir d’abord une exploitation d’exemple</button>
      </div>
      <div class="ob-pied"><button type="button" class="btn main" data-act="dmcreer">Créer mon rucher</button></div></form></div>`;
  };
  const lireRucher = () => { const z = document.getElementById("dm_rucher"); if (z) q.rucher = z.value; };
  ACT.dmnb = (v) => { lireRucher(); q.nb = RA() ? RA().bornerRuches(q.nb + Number(v)) : Math.min(200, Math.max(1, q.nb + Number(v))); EX.accueil(); };
  ACT.dmposition = () => {
    lireRucher();
    if (!navigator.geolocation) return toast("Position indisponible sur cet appareil", true);
    navigator.geolocation.getCurrentPosition((p) => { q.lat = p.coords.latitude; q.lng = p.coords.longitude; EX.accueil(); }, () => toast("Position refusée : tu pourras placer le rucher sur la carte", true));
  };
  ACT.dmcreer = async (_v, _k, bouton) => {
    lireRucher();
    const rucher = q.rucher.trim() || "Mon rucher";
    const prenom = window.PF?.prenom?.() || "";
    if (bouton) bouton.disabled = true;
    try {
      const r = await sb.rpc("creer_exploitation", { p_nom: RA() ? RA().nomExploitation(prenom) : "Mon exploitation" });
      if (r.error) throw r.error;
      memo("apidoo-exploitation", r.data);
      await EX.choisir();
      // Rucher et colonies en une seule transaction (creer_rucher, migration 015, AP-TECH-093) ; identifiant fourni ici :
      // un nouvel essai après une coupure ne crée pas de doublon. La position du rucher est recopiée sur ses colonies.
      const colonies = Array.from({ length: q.nb }, (_, i) => ({ id: crypto.randomUUID(), nom: `Ruche ${i + 1}` }));
      const a = await sb.rpc("creer_rucher", { p: { id: q.rucherId ||= crypto.randomUUID(), nom: rucher, lat: q.lat, lng: q.lng, colonies } });
      if (a.error) throw a.error;
      // Rubriques proposées d'après « Tu en es où ? » et début de « Mes premiers pas » (14 jours).
      const rep = window.PF?.reponsesArrivee?.() || {};
      const rubriques = RA() ? RA().rubriquesProposees(rep) : null;
      try { await sb.rpc("regler", { p_modifs: { ...(rubriques ? { rubriques } : {}), premiers_pas_debut: new Date().toISOString().slice(0, 10) } }); } catch { /* réglages plus tard */ }
      S.member = true; S.route = "dash"; render(); await loadAll();
      toast("Ton rucher est prêt");
      if (window.Arrivee?.apresRucher) window.Arrivee.apresRucher(); else if (window.Arrivee) window.Arrivee.ouvrirVisite(); else render();
    } catch (e) { fail(e); }
    finally { if (bouton?.isConnected) bouton.disabled = false; }
  };

  // ---------- Accueil de démarrage ----------
  const installee = () => window.Plateforme?.installee() ?? (matchMedia("(display-mode: standalone)").matches || navigator.standalone === true);
  // « ton téléphone » ou « ton ordinateur », selon l'appareil (nav4.js).
  const surQuoi = () => (typeof N4 != "undefined" && N4.support ? N4.support() : "ton téléphone");
  ACT.dmcarte = () => go("carte");
  // Première visite : la tournée existante, directement en mode guidé par API.
  ACT.dmvisite = async () => {
    if (window.Arrivee) return window.Arrivee.ouvrirVisite(); // v5.84 : première visite guidée (écran 8)
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
    // v5.84 : « Mes premiers pas » (écran 10 de la maquette) : cinq étapes, pendant 14 jours, masquable ; puis une
    // carte « Une question ? Demande à API ». (Les étapes du mois de l'ancien guide sont dans « À faire » et Ma saison.)
    const RA = window.Regles?.arrivee;
    if (!RA) return;
    const pv = d.visites.length ? [...d.visites].sort((a, b) => String(a.date_visite).localeCompare(String(b.date_visite)))[0] : null;
    const pr = pv && byId(d.ruches, pv.ruche_id);
    const e = RA.premiersPas({ ruches: d.ruches.length, visites: d.visites.length, seuils: (d.seuils || []).length, invite: !!memo(cle("invite")) || (window.PF?.nbPersonnes?.() || 0) > 1,
      recoltes: d.recoltes.length, lots: (d.lots || []).length, premiereVisite: pr ? { ruche: pr.nom, date: dshort(pv.date_visite) } : null });
    const debut = cfg().premiers_pas_debut || null;
    const haut = titre?.closest(".hero-head, .head, .hero");
    const placer = (html) => { const avant = wrap.querySelector(".dm-bravo") || wrap.querySelector(".pp") || (haut && wrap.contains(haut) ? haut : null); if (avant) avant.insertAdjacentHTML("afterend", html); else wrap.insertAdjacentHTML("afterbegin", html); };
    if (RA.montrerPremiersPas({ etapes: e, masquee: !!memo(cle("masque")), debut })) {
      const faites = e.filter((x) => x.faite).length;
      placer(`<section class="card pp dm-guide"><div class="u-entete"><h2>Mes premiers pas</h2><span class="pp-compte">${faites} sur ${e.length}</span></div>
        <div class="pp-barre" role="img" aria-label="${faites} étapes sur ${e.length}"><i style="width:${Math.round(faites / e.length * 100)}%"></i></div>
        <div class="pp-liste">${e.map((x) => `<button type="button" class="pp-etape${x.faite ? " ok" : ""}" ${x.faite ? "disabled" : `data-act="${x.act}"`}><span class="pp-rond" aria-hidden="true">${x.faite ? "✓" : ""}</span><span class="pp-txt"><b>${esc(x.titre)}</b><span>${esc(x.detail)}</span></span>${x.faite ? "" : `<span class="pp-duree">${esc(x.duree)}</span>`}</button>`).join("")}</div>
        ${!installee() && matchMedia("(max-width:800px)").matches ? `<button type="button" class="link" data-act="dminstaller">Installer Apiviz sur ${surQuoi()}</button>` : ""}
        <button type="button" class="link" data-act="dmmasquer">Masquer cette carte</button></section>`);
      placer(`<section class="pp-aide"><b>Une question ? Demande à API</b><div>${RA.QUESTIONS_AIDE.map((t, i) => `<button type="button" data-act="arquestion" data-v="${i}">${esc(t)}</button>`).join("")}</div></section>`);
      // La carte d'aide passe sous « Mes premiers pas ».
      const aide = wrap.querySelector(".pp-aide"), pp = wrap.querySelector(".pp");
      if (aide && pp) pp.after(aide);
    }
    if (matchMedia("(min-width:801px)").matches && !installee()) relais();
  }
  function arrivee(wrap) {
    if (memo(cle("arrivee"))) return;
    const d = S.d, lignes = d.visites.slice(0, 2).map((v) => `<li class="small">${esc(byId(d.ruches, v.ruche_id)?.nom || "Ruche")} visitée le ${esc(dshort(v.date_visite))}</li>`).join("");
    const haut = wrap.querySelector(".hero-head, .head, .hero");
    const sec = `<section class="card dm-guide"><div class="u-entete"><h2>Tu fais partie de ${esc(cfg().nom)}</h2><button type="button" class="link" data-act="dmarrivee">Fermer</button></div>
      <p class="small">${d.ruches.length} ruche${d.ruches.length > 1 ? "s" : ""} déjà en place, rien à ressaisir.</p>${lignes ? `<ul class="dm-liste">${lignes}</ul>` : ""}
      ${installee() ? "" : `<button type="button" class="btn block" data-act="dminstaller">Installer Apiviz sur ${surQuoi()}</button>`}</section>`;
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
  const ASTUCES = [["Tout se saisit ici", "Visite, récolte, vente ou dépense : touche API au centre du menu."], ["Dicte ta tournée", "Depuis un rucher, Faire la tournée te laisse dicter toutes tes ruches d’un coup."], ["Sans réseau aussi", "Tes saisies restent sur le téléphone et partent au retour du réseau."], ["Toutes tes ruches d’un coup d’œil", "Dans Ruchers, passe en Alvéoles pour voir tout un rucher, ou appuie longtemps sur une ruche pour en sélectionner plusieurs."], ["Ton stock au doigt", "Dans Matériel, − et + changent le stock tout de suite ; la liste de courses dit quoi racheter."], ["Parle à API", "Reste appuyé sur API au centre du menu et pose ta question à voix haute : il te répond, et peut te lire sa réponse."], ["Des offres qui s’appliquent toutes seules", "Dans Produits › ⋯ › Offres de vente, crée « 4 achetés, 1 offert » ou −10 % au marché : la vente fait le calcul."]];
  function astuce(wrap) {
    const i = Number(memo(cle("astuce")) || 0);
    if (!S.d.visites.length || i >= ASTUCES.length || wrap.querySelector(".dm-bravo")) return;
    (wrap.querySelector(".hero-head, .head, .hero") || wrap.firstElementChild).insertAdjacentHTML("afterend", `<section class="dm-astuce" aria-label="Astuce"><h2 style="margin:0">${ASTUCES[i][0]}</h2><p>${ASTUCES[i][1]}</p><div class="u-entete"><span class="small">Astuce ${i + 1} sur ${ASTUCES.length}</span><button type="button" class="btn" data-act="dmastuce">Compris</button></div></section>`);
  }
  ACT.dmastuce = () => { memo(cle("astuce"), String(Number(memo(cle("astuce")) || 0) + 1)); document.querySelector(".dm-astuce")?.remove(); };

  // ---------- Rucher d'exemple : tout reste en mémoire, aucune requête vers la base ----------
  let demo = false;
  const jour = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  const R = ["1", "2", "3", "4", "5", "6"].map((n) => ({ id: "ex-r" + n, nom: "Ruche " + n, rucher: "Le Verger", rucher_id: "ex-rucher", etat: n === "5" ? "À surveiller" : "Bonne", type_ruche: "Dadant", notes: "", lat: 47.22, lng: -1.55, date_installation: jour(400) }));
  const DEMO = { ruches: R,
    ruchers: [{ id: "ex-rucher", nom: "Le Verger", lat: 47.22, lng: -1.55, acces: "Chemin de terre après la ferme ; se garer devant la grange.",
      proprietaire: "", proprietaire_tel: "", capacite: 10, environnement: "Vergers et prairies", ressources: "Fruitiers, ronces, trèfle", point_eau: "Ruisseau à 50 m", notes: "", archive_le: null }],
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
    window.PF?.exemple?.(); // pas d'inscription en mode exemple (v5.42)
    await window.loadAll(); render();
    // v5.84 (écran 7) : bandeau « Exemple », bouton « Commencer avec mes ruches » et trois bulles de découverte.
    document.body.insertAdjacentHTML("afterbegin", '<div class="dm-exemple ex-bandeau"><span>Exemple · rien n’est enregistré</span><button type="button" data-act="dmquitter">Quitter</button></div>');
    document.body.insertAdjacentHTML("beforeend", '<div class="ex-commencer"><button type="button" class="btn honey" data-act="dmsortie">Commencer avec mes ruches</button></div>');
    window.Arrivee?.bulles?.();
    document.addEventListener("submit", (e) => { e.preventDefault(); e.stopImmediatePropagation(); toast(REFUS.message); document.getElementById("sheet")?.close?.(); }, true);
  };
  ACT.dmsortie = () => { try { sessionStorage.setItem("dm-creer", "1"); } catch {} location.reload(); };
  ACT.dmquitter = () => location.reload();

  const U_pluriel = (n) => (n > 1 ? `Tes ${n} ruches sont` : "Ta ruche est");

  // ---------- Écrans vides ----------
  const videAvant = window.emptyState;
  window.emptyState = function (titre, texte, bouton, act) {
    if (titre === "Ajoute ton premier client") {
      return `<section class="card"><h2>Par où commence ton miel ?</h2><p class="small">Choisis ton point de départ.</p>
        <button class="dm-choix" data-act="newlot"><b>J’ai déjà des pots</b><span>Saisis ton stock, tu peux vendre tout de suite</span></button>
        <button class="dm-choix" data-act="newrecolte"><b>Je viens de récolter</b><span>Note la récolte, puis crée tes lots</span></button>
        <button class="dm-choix" data-act="newclient"><b>J’ajoute d’abord un client</b><span>Famille, amis, collègues</span></button></section>`;
    }
    return videAvant(titre, texte, bouton, act);
  };
  return { completerAccueil };
})();
