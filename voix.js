// Apidoo — visite à la voix : on parle, les alvéoles se remplissent, on relit, on enregistre.
// Elle s'ouvre par-dessus le formulaire de visite et enregistre par lui : tournée, hors ligne et registre ne changent pas.
const VX = (() => {
  const Reco = () => window.SpeechRecognition || window.webkitSpeechRecognition;
  const CHAMPS = [
    ["activite", "Activité", ["Faible", "Normale", "Forte"]],
    ["reine", "Reine", ["Vue", "Non vue", "Non cherchée"]],
    ["couvain", "Couvain", ["Réduit", "Normal", "Abondant"]],
    ["provisions", "Provisions", ["Faibles", "Moyennes", "Bonnes"]],
  ];
  const UNITES = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9 };
  const DIZAINES = { vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
  function kilos(t) {
    const c = t.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?|kilogrammes?)\b/);
    if (c) return Number(c[1].replace(",", "."));
    const m = t.match(/(vingt|trente|quarante|cinquante|soixante)(?:[\s-]+(?:et[\s-]+)?(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf))?\s+kilos?/);
    return m ? DIZAINES[m[1]] + (UNITES[m[2]] || 0) : null;
  }
  // Lit une dictée. Ne renvoie que ce qui a été dit clairement.
  function lire(texte) {
    const t = texte.toLowerCase().replace(/’/g, "'"), r = {};
    let m;
    if ((m = t.match(/activit[ée]\s+(?:est\s+)?(faible|normale|forte)/))) r.activite = m[1][0].toUpperCase() + m[1].slice(1);
    else if (/(?:grosse|forte|belle)\s+activit[ée]/.test(t)) r.activite = "Forte";
    else if (/(?:faible|petite)\s+activit[ée]|peu d'activit[ée]/.test(t)) r.activite = "Faible";
    if ((m = t.match(/couvain\s+(?:est\s+)?(r[ée]duit|normal|abondant)/))) r.couvain = { r: "Réduit", n: "Normal", a: "Abondant" }[m[1][0]];
    else if (/couvain\s+compact/.test(t)) r.couvain = "Normal";
    if ((m = t.match(/provisions?\s+(?:sont\s+)?(faibles?|moyennes?|bonnes?)/) || t.match(/(faibles?|moyennes?|bonnes?)\s+provisions?/))) r.provisions = { f: "Faibles", m: "Moyennes", b: "Bonnes" }[m[1][0]];
    if (/reine\s+(?:toujours\s+)?(?:non|pas)\s+(?:vue|trouv)|pas vu (?:la|de) reine/.test(t)) r.reine = "Non vue";
    else if (/reine\s+(?:non|pas)\s+cherch/.test(t)) r.reine = "Non cherchée";
    else if (/reine\s+vue|vu la reine/.test(t)) r.reine = "Vue";
    const k = kilos(t);
    if (k !== null) r.poids_kg = k;
    return r;
  }
  const finDemandee = (t) => /c'est bon[.!\s]*$/i.test(t.replace(/’/g, "'"));

  let reco = null, verrou = null, E = null;
  const $ = (s) => document.querySelector(`#alVoix ${s}`);
  const api = () => $("api-compagnon");
  function dessinerChamps() {
    const z = $(".vx-champs");
    if (!z) return;
    const cases = [...CHAMPS.map(([k, nom]) => [k, nom, E.v[k] || ""]), ["poids_kg", "Poids", E.v.poids_kg != null ? n(E.v.poids_kg) + " kg" : ""]];
    if (!z.children.length) z.innerHTML = cases.map(([k, nom]) => `<button type="button" class="vx-c" data-act="vxchamp" data-v="${k}"><span class="vx-hex"><b></b></span>${esc(nom)}</button>`).join("");
    cases.forEach(([k, nom, v], i) => {
      const b = z.children[i];
      b.classList.toggle("on", !!v);
      b.querySelector("b").textContent = v;
      b.setAttribute("aria-label", `${nom}, ${v || "vide"}`);
    });
  }
  function texte() {
    const p = $(".vx-dit");
    if (!p) return;
    const t = (E.final + " " + E.prov).trim();
    p.textContent = t || "Parle normalement, je range tout seul.";
    p.classList.toggle("vide", !t);
  }
  function arreter() {
    const r = reco;
    reco = null;
    if (r) { r.onend = null; r.onerror = null; r.onresult = null; try { r.stop(); } catch {} }
    verrou?.release?.().catch?.(() => {});
    verrou = null;
  }
  function etatBouton() {
    const b = $(".vx-pause");
    if (!b) return;
    b.textContent = E.pause ? "Reprendre" : "Mettre en pause";
    b.classList.toggle("pause", E.pause);
    const a = $(".vx-aide");
    if (a) a.textContent = E.alerte || (E.pause ? "Touche une alvéole pour corriger" : "Dis « c’est bon » pour terminer");
  }
  function ecouter() {
    const R = Reco();
    if (!R || navigator.onLine === false) return panne("Sans réseau, je ne peux pas écouter. Touche les alvéoles.");
    const r = new R();
    r.lang = "fr-FR"; r.continuous = true; r.interimResults = true;
    r.onresult = (ev) => {
      let prov = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) E.final = (E.final + " " + t.trim()).trim(); else prov += t;
      }
      E.prov = prov;
      Object.assign(E.v, lire(E.final + " " + prov));
      dessinerChamps(); texte();
      if (finDemandee(E.final)) { E.final = E.final.replace(/\s*c['’]est bon[.!\s]*$/i, ""); terminer(); }
    };
    r.onerror = (ev) => {
      if (ev.error === "no-speech" || ev.error === "aborted") return;
      panne(ev.error === "not-allowed" || ev.error === "service-not-allowed" ? "Autorise le micro pour dicter. Tu peux toucher les alvéoles." : "Je n’entends plus. Touche les alvéoles ou réessaie.");
    };
    // Le navigateur coupe l'écoute après un silence : on reprend tant que la visite est ouverte.
    r.onend = () => { reco = null; if (E && !E.pause && !E.alerte && E.phase === "ecoute") ecouter(); };
    reco = r;
    try { r.start(); } catch { panne("Je n’arrive pas à ouvrir le micro. Touche les alvéoles."); return; }
    navigator.wakeLock?.request?.("screen").then((w) => { verrou = w; }).catch(() => {});
  }
  function panne(msg) {
    arreter();
    E.pause = true; E.alerte = msg;
    api()?.setAttribute("etat", navigator.onLine === false ? "horsligne" : "attention");
    etatBouton();
  }
  function ouvrir() {
    const e = S.visite, r = e && byId(S.d.ruches, e.ruche_id);
    if (!r) return toast("Choisis d’abord une ruche", true);
    // Rien n'est présumé : seules les valeurs dites comptent.
    E = { phase: "ecoute", final: "", prov: "", pause: false, alerte: "", v: { activite: "", reine: "", couvain: "", provisions: "", poids_kg: null }, nom: r.nom };
    let d = document.getElementById("alVoix");
    if (!d) { d = document.createElement("dialog"); d.id = "alVoix"; d.className = "vx"; document.body.append(d); d.addEventListener("cancel", (ev) => { ev.preventDefault(); ACT.vxquitter(); }); }
    d.innerHTML = `<header class="vx-haut"><button type="button" class="vx-x" data-act="vxquitter" aria-label="Quitter la dictée">×</button><div><b>${esc(r.nom)}</b><span class="small">Visite à la voix</span></div></header>
      <div class="vx-scene">${Apidoo.compagnon("ecoute", 132)}</div>
      <p class="vx-dit vide" aria-live="polite"></p>
      <div class="vx-champs"></div>
      <div class="vx-pied"><button type="button" class="vx-pause" data-act="vxpause">Mettre en pause</button><button type="button" class="btn block" data-act="vxfin">J’ai terminé</button><p class="vx-aide" aria-live="polite"></p></div>`;
    d.addEventListener("click", clic);
    d.showModal();
    dessinerChamps(); texte(); etatBouton();
    ecouter();
  }
  // Le dialogue est hors de #app : on y relaie les boutons d'action.
  function clic(ev) {
    const b = ev.target.closest("[data-act]");
    if (b && ACT[b.dataset.act] && b.closest("#alVoix")) { ev.stopPropagation(); ACT[b.dataset.act](b.dataset.v, b); }
  }
  function terminer() {
    arreter();
    E.phase = "relire";
    api()?.setAttribute("etat", "reflexion");
    const d = document.getElementById("alVoix");
    setTimeout(() => { if (E?.phase === "relire") relecture(d); }, 900);
  }
  function relecture(d) {
    const dernier = S.d.visites.find((v) => v.ruche_id === S.visite.ruche_id && v.poids_kg);
    const ecart = E.v.poids_kg != null && dernier ? E.v.poids_kg - Number(dernier.poids_kg) : null;
    const ligne = (nom, v, alerte = "") => `<div class="vx-l ${alerte ? "alerte" : ""}"><span>${esc(nom)}${alerte ? `<em>${esc(alerte)}</em>` : ""}</span><span>${esc(v || "Pas dit")}</span></div>`;
    const lignes = CHAMPS.map(([k, nom]) => ligne(nom, E.v[k])).join("") +
      ligne("Poids", E.v.poids_kg != null ? n(E.v.poids_kg) + " kg" : "", ecart !== null && Math.abs(ecart) >= 2 ? `À vérifier, ${ecart > 0 ? "+" : "−"}${n(Math.abs(ecart))} kg par rapport à la dernière pesée` : "");
    d.innerHTML = `<header class="vx-haut"><button type="button" class="vx-x" data-act="vxquitter" aria-label="Quitter la dictée">×</button><div class="vx-api">${Apidoo.compagnon("repond", 30).replace("<api-compagnon ", "<api-compagnon muet ")}API</div></header>
      <div class="vx-relire"><h2>Voilà ce que j’ai noté pour ${esc(E.nom)}. Vérifie avant d’enregistrer.</h2><div class="vx-t">${lignes}</div>
      ${E.final ? `<label class="vx-note">Note<textarea id="vx_note" rows="3">${esc(E.final)}</textarea></label>` : ""}</div>
      <div class="vx-pied"><div class="vx-deux"><button type="button" class="btn main" data-act="vxenreg">${typeof HL != "undefined" && HL.horsLigne() ? "Enregistrer sur le téléphone" : "Enregistrer la visite"}</button><button type="button" class="btn" data-act="vxcorriger">Au doigt</button></div></div>`;
  }
  // Reporte ce qui a été dit dans le formulaire. Ce qui n'a pas été dit reste tel quel.
  function reporter() {
    const e = S.visite;
    CHAMPS.forEach(([k]) => { if (E.v[k]) e[k] = E.v[k]; });
    if (E.v.poids_kg != null) e.poids_kg = E.v.poids_kg;
    const note = document.getElementById("vx_note")?.value.trim() ?? E.final;
    if (note) e.note = [e.note, note].filter(Boolean).join(" ");
    viewVisite();
  }
  function fermer() {
    arreter();
    document.getElementById("alVoix")?.close();
    E = null;
  }
  Object.assign(ACT, {
    vxouvrir: ouvrir,
    vxquitter: () => fermer(),
    vxpause: () => {
      if (E.alerte) { E.alerte = ""; E.pause = false; api()?.setAttribute("etat", "ecoute"); etatBouton(); return ecouter(); }
      E.pause = !E.pause;
      api()?.setAttribute("etat", E.pause ? "repos" : "ecoute");
      if (E.pause) arreter(); else ecouter();
      etatBouton();
    },
    vxchamp: (k) => {
      if (k === "poids_kg") {
        const d = S.d.visites.find((v) => v.ruche_id === S.visite.ruche_id && v.poids_kg);
        E.v.poids_kg = E.v.poids_kg == null ? Number(d?.poids_kg ?? 40) : E.v.poids_kg + 1;
      } else {
        const l = CHAMPS.find((c) => c[0] === k)[2], i = l.indexOf(E.v[k]);
        E.v[k] = l[(i + 1) % l.length];
      }
      dessinerChamps();
    },
    vxfin: () => terminer(),
    vxcorriger: () => { reporter(); fermer(); },
    vxenreg: () => {
      reporter();
      fermer();
      document.querySelector('form[data-form="visite"]')?.requestSubmit();
    },
  });
  const visiteAvant = window.viewVisite;
  window.viewVisite = function (...a) {
    visiteAvant(...a);
    if (!Reco() || !S.visite?.ruche_id || S.visite.multi) return;
    document.querySelector('form[data-form="visite"]')?.insertAdjacentHTML("afterbegin", `<button type="button" class="btn honey block vx-entree" data-act="vxouvrir">Visiter à la voix</button>`);
  };
  return { lire };
})();
