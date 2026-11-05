const sb = supabase.createClient(window.APIDOO.url, window.APIDOO.key),
  $app = document.getElementById("app"),
  $sheet = document.getElementById("sheet"),
  $sheetForm = document.getElementById("sheetForm"),
  TABLES = {
    ruches: ["ruches", "nom"],
    articles: ["articles", "nom"],
    visites: ["visites", "date_visite", !1],
    intrants: ["visite_intrants"],
    recoltes: ["recoltes", "date_recolte", !1],
    lots: ["lots_stock", "code"],
    clients: ["clients", "nom"],
    ventes: ["ventes", "date_vente", !1],
    lignes: ["vente_lignes"],
    depenses: ["depenses", "date_depense", !1],
    fournisseurs: ["fournisseurs", "nom"],
    taches: ["taches", "echeance"],
    budgets: ["budgets"],
    reglages: ["reglages"],
  },
  DEF = {
    nom: "Bee\u2019s Brothers",
    napi: "",
    objectif: 0,
    postes: ["Pots & \xE9tiquettes", "Alimentation", "Traitements", "Mat\xE9riel", "Autre"],
    cercles: ["Famille", "Amis", "Coll\xE8gues", "Autre"],
    modes: ["Esp\xE8ces", "Ch\xE8que", "Virement", "Autre"],
  },
  ETATS = ["Bonne", "\xC0 surveiller", "Critique"],
  MOIS = [
    "Janv.",
    "F\xE9vr.",
    "Mars",
    "Avr.",
    "Mai",
    "Juin",
    "Juil.",
    "Ao\xFBt",
    "Sept.",
    "Oct.",
    "Nov.",
    "D\xE9c.",
  ],
  C = { honey: "#D08F00", green: "#16805A", blue: "#3B6FB6" },
  PRESETS = {
    Consommable: [
      ["Candy", "kg"],
      ["Sirop", "L"],
      ["Pots 500 g vides", "unit\xE9"],
      ["Pots 250 g vides", "unit\xE9"],
      ["Couvercles", "unit\xE9"],
      ["\xC9tiquettes", "unit\xE9"],
      ["Lani\xE8res anti-varroa", "unit\xE9"],
      ["Cire gaufr\xE9e", "feuille"],
    ],
    Équipement: [
      ["Enfumoir", "unit\xE9"],
      ["Combinaison", "unit\xE9"],
      ["L\xE8ve-cadre", "unit\xE9"],
      ["Hausse", "unit\xE9"],
      ["Nourrisseur", "unit\xE9"],
      ["Extracteur", "unit\xE9"],
      ["Maturateur", "unit\xE9"],
      ["Balance", "unit\xE9"],
    ],
  },
  SAISON = [
    [
      "Surveiller les entr\xE9es et les pes\xE9es",
      "Pr\xE9parer et r\xE9parer le mat\xE9riel",
      "Commander pots et \xE9tiquettes",
    ],
    [
      "V\xE9rifier les provisions",
      "Nettoyer et pr\xE9parer les cadres",
      "Faire le bilan de la saison pass\xE9e",
    ],
    [
      "Premi\xE8re visite de printemps par temps doux",
      "V\xE9rifier la pr\xE9sence de la reine",
      "Surveiller les r\xE9serves",
    ],
    [
      "Contr\xF4ler le d\xE9veloppement du couvain",
      "Pr\xE9voir la pose des hausses",
      "Anticiper l\u2019essaimage",
    ],
    ["Poser les hausses", "Surveiller l\u2019essaimage", "Pr\xE9parer des essaims si besoin"],
    ["Pr\xE9parer l\u2019extraction", "Contr\xF4ler les hausses", "Surveiller le varroa"],
    [
      "R\xE9colter et extraire",
      "Mettre le miel en pots et cr\xE9er les lots",
      "Surveiller le frelon",
    ],
    [
      "Traiter contre le varroa selon le protocole choisi",
      "\xC9valuer les r\xE9serves",
      "Renseigner les r\xE9coltes",
    ],
    [
      "D\xE9clarer les ruches",
      "Nourrir si les r\xE9serves sont faibles",
      "Resserrer les entr\xE9es",
    ],
    [
      "Peser les ruches",
      "Pr\xE9parer l\u2019hivernage",
      "Lancer les ventes de fin d\u2019ann\xE9e",
    ],
    [
      "Surveiller les pes\xE9es",
      "V\xE9rifier la protection contre le vent",
      "Relancer les clients avant les f\xEAtes",
    ],
    [
      "Traitement hivernal selon le protocole choisi",
      "Faire le bilan financier",
      "Pr\xE9parer le budget de l\u2019ann\xE9e suivante",
    ],
  ],
  S = {
    session: null,
    member: null,
    route: "dash",
    lastRoute: "",
    ruche: null,
    d: null,
    visite: null,
    vente: null,
    authMode: "in",
    authMsg: "",
    recovery: !1,
    busy: !1,
    annee: new Date().getFullYear(),
    tab: "fin",
    rucheStat: null,
    sim: null,
    venteFiltre: "toutes",
  },
  esc = (valeur) =>
    String(valeur ?? "").replace(
      /[&<>"']/g,
      (car) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[car],
    ),
  n = (valeur, decimales = 1) =>
    Number(valeur || 0).toLocaleString("fr-FR", { maximumFractionDigits: decimales }),
  eur = (montant) => n(montant, 2) + " \u20AC",
  eur0 = (montant) => n(montant, 0) + " \u20AC",
  today = () => {
    const maintenant = new Date();
    return new Date(maintenant - maintenant.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  },
  dfr = (date) =>
    date ? date.slice(8, 10) + "/" + date.slice(5, 7) + "/" + date.slice(0, 4) : "\u2013",
  dshort = (date) => (date ? date.slice(8, 10) + "/" + date.slice(5, 7) : "\u2013"),
  byId = (liste, id) => liste.find((element) => element.id === id),
  sum = (liste, valeurDe) =>
    liste.reduce((total, element) => total + Number(valeurDe(element) || 0), 0),
  days = (date) => Math.floor((new Date(today()) - new Date(date)) / 864e5),
  yr = (date) => Number(String(date).slice(0, 4)),
  mo = (date) => Number(String(date).slice(5, 7)) - 1,
  num = (valeur) => (valeur === "" || valeur === void 0 || valeur === null ? null : Number(valeur)),
  orNull = (valeur) => valeur || null,
  etatClass = (etat) => (etat === "Bonne" ? "good" : etat === "Critique" ? "crit" : "watch"),
  cfg = () => ({ ...DEF, ...((S.d?.reglages[0] || {}).data || {}) }),
  consommables = () => S.d.articles.filter((article) => article.type !== "\xC9quipement"),
  equipements = () => S.d.articles.filter((article) => article.type === "\xC9quipement");
function toast(message, erreur) {
  document.querySelectorAll(".toast").forEach((ancienne) => ancienne.remove());
  const bulle = document.createElement("div");
  ((bulle.className = "toast" + (erreur ? " err" : "")),
    bulle.setAttribute("role", "status"),
    (bulle.textContent = message),
    document.body.appendChild(bulle),
    setTimeout(() => bulle.remove(), erreur ? 6e3 : 3e3));
}
function fail(erreur) {
  console.error(erreur);
  const message = erreur.message || "Une erreur est survenue";
  if (/foreign key/.test(message))
    return toast(
      "Impossible : cet \xE9l\xE9ment est utilis\xE9 ailleurs dans l\u2019application.",
      !0,
    );
  if (/unique|duplicate/.test(message)) return toast("Ce nom existe d\xE9j\xE0.", !0);
  toast(message, !0);
}
async function loadAll() {
  const cles = Object.keys(TABLES),
    reponses = await Promise.all(
      cles.map((cle) => {
        const [nomTable, tri, croissant] = TABLES[cle];
        let requete = sb.from(nomTable).select("*");
        return (tri && (requete = requete.order(tri, { ascending: croissant !== !1 })), requete);
      }),
    ),
    donnees = {};
  (reponses.forEach((reponse, index) => {
    if (reponse.error) throw reponse.error;
    donnees[cles[index]] = reponse.data;
  }),
    (S.d = donnees),
    typeof PH != "undefined" && (await PH.load()));
}
async function refresh() {
  (await loadAll(), render());
}
async function write(requete, message) {
  if (typeof HL != "undefined") return HL.write(requete, message);
  const { error: erreur } = await requete;
  if (erreur) throw erreur;
  (await refresh(), message && toast(message));
}
async function saveCfg(modifs, message) {
  const donnees = { ...((S.d.reglages[0] || {}).data || {}), ...modifs };
  await write(sb.from("reglages").update({ data: donnees }).eq("id", 1), message);
}
function authView() {
  const mode = S.authMode;
  $app.innerHTML = `<div class="auth"><form data-form="auth">
    <div class="brand"><img src="logo-apidoo.svg" alt="Apidoo" height="38"></div>
    <p class="sub">Le carnet de bord de votre rucher</p>
    ${
      S.recovery
        ? `<label>Nouveau mot de passe<input name="password" type="password" minlength="8" required autocomplete="new-password"></label>
      <button class="btn main block">Enregistrer</button>`
        : `
    <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
    ${mode === "reset" ? "" : `<label>Mot de passe<input name="password" type="password" minlength="8" required autocomplete="${mode === "up" ? "new-password" : "current-password"}"></label>`}
    <button class="btn main block">${mode === "up" ? "Cr\xE9er mon compte" : mode === "reset" ? "Recevoir le lien" : "Se connecter"}</button>
    <div class="actions" style="justify-content:space-between">
      <button type="button" class="link" data-act="authmode" data-v="${mode === "in" ? "up" : "in"}">${mode === "in" ? "Cr\xE9er mon compte" : "J\u2019ai d\xE9j\xE0 un compte"}</button>
      ${mode === "in" ? '<button type="button" class="link" data-act="authmode" data-v="reset">Mot de passe oubli\xE9</button>' : ""}
    </div>`
    }
    ${S.authMsg ? `<p class="notice" role="status">${esc(S.authMsg)}</p>` : ""}
  </form></div>`;
}
const AUTH_FR = {
  "Invalid login credentials": "E-mail ou mot de passe incorrect.",
  "Email not confirmed": "Confirme d\u2019abord ton adresse gr\xE2ce \xE0 l\u2019e-mail re\xE7u.",
  "User already registered": "Ce compte existe d\xE9j\xE0.",
};
async function submitAuth(formulaire) {
  const retour = location.origin + location.pathname;
  S.authMsg = "";
  try {
    if (S.recovery) {
      const { error: erreur } = await sb.auth.updateUser({ password: formulaire.password.value });
      if (erreur) throw erreur;
      ((S.recovery = !1), await boot());
      return;
    }
    if (S.authMode === "reset") {
      const { error: erreur } = await sb.auth.resetPasswordForEmail(formulaire.email.value, {
        redirectTo: retour,
      });
      if (erreur) throw erreur;
      S.authMsg = "Si ce compte existe, un lien vient de partir par e-mail.";
    } else if (S.authMode === "up") {
      const { error: erreur } = await sb.auth.signUp({
        email: formulaire.email.value,
        password: formulaire.password.value,
        options: { emailRedirectTo: retour },
      });
      if (erreur) throw erreur;
      ((S.authMsg =
        "Compte cr\xE9\xE9. Ouvre l\u2019e-mail de confirmation, puis reviens te connecter."),
        (S.authMode = "in"));
    } else {
      const { error: erreur } = await sb.auth.signInWithPassword({
        email: formulaire.email.value,
        password: formulaire.password.value,
      });
      if (erreur) throw erreur;
      return;
    }
  } catch (erreur) {
    S.authMsg = AUTH_FR[erreur.message] || erreur.message;
  }
  authView();
}
const ICON = {
    dash: "M3 11l9-8 9 8M5 10v10h14V10",
    agenda: "M4 5h16v16H4zM4 10h16M9 3v4M15 3v4",
    ruches: "M7 3h10l5 9-5 9H7l-5-9z",
    miel: "M7 8h10l1 12H6zM8 4h8v4H8z",
    materiel: "M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8",
    clients:
      "M9 12a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 010 8M18 15c2 1 4 3 4 6",
    fournisseurs:
      "M2 6h12v11H2zM14 10h5l3 3v4h-8zM7 21a2 2 0 100-4 2 2 0 000 4zM18 21a2 2 0 100-4 2 2 0 000 4z",
    compta: "M12 2v20M17 6H9.500a3.500 3.500 0 000 7h5a3.500 3.500 0 010 7H6",
    pilotage: "M4 20V10M12 20V4M20 20v-7",
    previsions: "M3 17l6-6 4 4 8-8M15 7h6v6",
    reglages: "M4 7h10M18 7h2M4 17h2M10 17h10M16 5v4M8 15v4",
    plus: "M5 12h.01M12 12h.01M19 12h.01",
  },
  icon = (nom) =>
    `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[nom]}"/></svg>`,
  SIDE = [
    ["dash", "Accueil"],
    ["agenda", "Agenda"],
    null,
    ["ruches", "Ruches"],
    ["miel", "Miel"],
    ["materiel", "Mat\xE9riel"],
    null,
    ["clients", "Clients & ventes"],
    ["fournisseurs", "Fournisseurs"],
    ["compta", "D\xE9penses"],
    null,
    ["pilotage", "Pilotage"],
    ["previsions", "Pr\xE9visions"],
    null,
    ["reglages", "R\xE9glages"],
  ],
  BOTTOM = [
    ["dash", "Accueil"],
    ["ruches", "Ruches"],
    ["miel", "Stocks"],
    ["clients", "Ventes"],
    ["pilotage", "Pilotage"],
    ["plus", "Plus"],
  ],
  GROUP = {
    ruche: "ruches",
    visite: "ruches",
    vente: "clients",
    materiel: "miel",
    agenda: "plus",
    fournisseurs: "plus",
    compta: "plus",
    previsions: "plus",
    reglages: "plus",
  };
function shell(titre, sousTitre, boutons, contenu, surTitre) {
  const initiale = (S.session.user.email || "?")[0].toUpperCase(),
    menuLateral = SIDE.map((entree) =>
      entree
        ? `<button class="nav ${S.route === entree[0] || GROUP[S.route] === entree[0] ? "on" : ""}" data-act="go" data-v="${entree[0]}">${icon(entree[0])}${entree[1]}</button>`
        : '<div class="sep"></div>',
    ).join(""),
    rubrique = GROUP[S.route] || S.route,
    menuBas = BOTTOM.map(
      ([route, libelle]) =>
        `<button class="${rubrique === route ? "on" : ""}" data-act="go" data-v="${route}">${icon(route)}<span>${libelle}</span></button>`,
    ).join("");
  $app.innerHTML = `<div class="shell">
    <nav class="side" aria-label="Navigation">
      <div class="brand"><img src="logo-apidoo-clair.svg" alt="Apidoo" height="30"></div>
      ${menuLateral}
      <div class="me"><span class="avatar">${esc(initiale)}</span><span><span class="mail">${esc(S.session.user.email)}</span><button class="link" data-act="logout">Se d\xE9connecter</button></span></div>
    </nav>
    <header class="topbar"><img src="logo-apidoo-clair.svg" alt="Apidoo" height="24"><button class="avatar" data-act="go" data-v="reglages" aria-label="R\xE9glages">${esc(initiale)}</button></header>
    <main>${typeof HL != "undefined" ? HL.bandeau() : ""}<div class="wrap">
      <div class="head ${surTitre ? "hero-head" : ""}"><div>${surTitre ? `<p class="eyebrow">${esc(surTitre)}</p>` : ""}<h1>${esc(titre)}</h1>${sousTitre ? `<p class="sub">${esc(sousTitre)}</p>` : ""}</div><div class="actions">${boutons || ""}</div></div>
      ${contenu}
    </div></main>
    <button class="fab" data-act="quick" aria-label="Ajouter rapidement">+</button>
    <nav class="bottom" aria-label="Navigation">${menuBas}</nav>
  </div>`;
}
const table = (colonnes, lignes, siVide) =>
    lignes.length
      ? `<table><thead><tr>${colonnes.map((colonne) => (colonne[0] === "#" ? `<th class="num">${esc(colonne.slice(1))}</th>` : `<th>${esc(colonne)}</th>`)).join("")}</tr></thead><tbody>${lignes.join("")}</tbody></table>`
      : `<p class="empty">${esc(siVide)}</p>`,
  emptyState = (titre, texte, bouton, action, extra = "") =>
    `<section class="card hero"><div class="hexdeco" aria-hidden="true"></div><h2>${esc(titre)}</h2><p class="sub">${esc(texte)}</p>${bouton ? `<button class="btn main" data-act="${action}">${esc(bouton)}</button>` : ""}${extra}</section>`,
  kpi = (libelle, valeur, detail, classe = "") =>
    `<div class="card kpi"><div class="l">${esc(libelle)}</div><div class="big ${classe}">${esc(valeur)}</div>${detail ? `<div class="s">${esc(detail)}</div>` : ""}</div>`,
  subtabs = (onglets, actif, action) =>
    `<div class="subtabs" role="tablist">${onglets.map(([cle, libelle]) => `<button role="tab" aria-selected="${cle === actif}" class="${cle === actif ? "on" : ""}" data-act="${action}" data-v="${cle}">${esc(libelle)}</button>`).join("")}</div>`,
  chartW = () =>
    window.innerWidth <= 800
      ? Math.max(280, window.innerWidth - 66)
      : Math.min(1e3, window.innerWidth - 300);
function niceMax(valeur) {
  if (valeur <= 0) return 1;
  const puissance = 10 ** Math.floor(Math.log10(valeur));
  return [1, 2, 2.5, 5, 10].map((palier) => palier * puissance).find((palier) => palier >= valeur);
}
const legend = (series) =>
    series.length > 1
      ? `<div class="legend">${series.map((serie) => `<span><i style="background:${serie.color}"></i>${esc(serie.name)}</span>`).join("")}</div>`
      : "",
  chartTable = (libelles, series, format) =>
    `<details class="dt"><summary>Voir les chiffres</summary><div class="scroll"><table><thead><tr><th></th>${series.map((libelle) => `<th class="num">${esc(libelle.name)}</th>`).join("")}</tr></thead><tbody>${libelles.map((libelle, index) => `<tr><td>${esc(libelle)}</td>${series.map((serie) => `<td class="num">${serie.values[index] === null ? "\u2013" : esc(format(serie.values[index]))}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`,
  tipFor = (libelles, series, format, index) =>
    esc(
      libelles[index] +
        `
` +
        series.map(
          (serie) =>
            `${serie.name} : ${serie.values[index] === null ? "\u2013" : format(serie.values[index])}`,
        ).join(`
`),
    );
function barChart({
  labels: libelles,
  series: series,
  fmt: format = eur0,
  h: hauteur = 210,
  title: titre,
}) {
  const largeur = chartW(),
    marge = { l: 46, r: 6, t: 12, b: 24 },
    largeurUtile = largeur - marge.l - marge.r,
    hauteurUtile = hauteur - marge.t - marge.b,
    maxi = niceMax(Math.max(0, ...series.flatMap((serie) => serie.values.map(Number)))),
    yDe = (valeur) => marge.t + hauteurUtile - (valeur / maxi) * hauteurUtile,
    pas = largeurUtile / libelles.length,
    largeurBarre = Math.min(20, Math.max(4, (pas - 6) / series.length - 2)),
    grille = [0, 0.5, 1]
      .map(
        (fraction) =>
          `<line x1="${marge.l}" x2="${largeur - marge.r}" y1="${yDe(maxi * fraction)}" y2="${yDe(maxi * fraction)}" class="gl"/><text x="${marge.l - 6}" y="${yDe(maxi * fraction) + 4}" text-anchor="end" class="at">${esc(format(maxi * fraction))}</text>`,
      )
      .join(""),
    saut = libelles.length > 8 && largeur < 420 ? 2 : 1,
    barres = libelles
      .map((libelle, index) => {
        const x0 = marge.l + index * pas + (pas - (largeurBarre + 2) * series.length + 2) / 2,
          rects = series
            .map((serie, rang) => {
              const valeur = Number(serie.values[index] || 0),
                yBarre = yDe(valeur);
              return valeur > 0
                ? `<rect x="${x0 + rang * (largeurBarre + 2)}" y="${yBarre}" width="${largeurBarre}" height="${Math.max(1, marge.t + hauteurUtile - yBarre)}" rx="3" fill="${serie.color}"/>`
                : "";
            })
            .join(""),
          etiquette =
            index % saut === 0
              ? `<text x="${marge.l + index * pas + pas / 2}" y="${hauteur - 7}" text-anchor="middle" class="at">${esc(libelle)}</text>`
              : "";
        return `${rects}${etiquette}<rect x="${marge.l + index * pas}" y="${marge.t}" width="${pas}" height="${hauteurUtile}" fill="transparent" data-tip="${tipFor(libelles, series, format, index)}"/>`;
      })
      .join("");
  return `${legend(series)}<svg class="chart" viewBox="0 0 ${largeur} ${hauteur}" role="img" aria-label="${esc(titre || "Graphique")}">${grille}${barres}</svg>${chartTable(libelles, series, format)}`;
}
function lineChart({
  labels: libelles,
  series: series,
  fmt: format = eur0,
  h: hauteur = 210,
  title: titre,
}) {
  const largeur = chartW(),
    marge = { l: 46, r: 12, t: 12, b: 24 },
    largeurUtile = largeur - marge.l - marge.r,
    hauteurUtile = hauteur - marge.t - marge.b,
    valeurs = series
      .flatMap((serie) => serie.values)
      .filter((valeur) => valeur !== null)
      .map(Number),
    plusGrande = Math.max(0, ...valeurs),
    haut = plusGrande > 0 ? niceMax(plusGrande) : Math.min(0, ...valeurs) < 0 ? 0 : 1,
    bas = Math.min(0, ...valeurs) < 0 ? -niceMax(-Math.min(0, ...valeurs)) : 0,
    xDe = (index) =>
      marge.l +
      (libelles.length > 1 ? (index / (libelles.length - 1)) * largeurUtile : largeurUtile / 2),
    yDe = (valeur) => marge.t + hauteurUtile - ((valeur - bas) / (haut - bas)) * hauteurUtile,
    grille = (bas < 0 ? (haut > 0 ? [bas, 0, haut] : [bas, bas / 2, 0]) : [0, haut / 2, haut])
      .map(
        (graduation) =>
          `<line x1="${marge.l}" x2="${largeur - marge.r}" y1="${yDe(graduation)}" y2="${yDe(graduation)}" class="gl ${graduation === 0 ? "zero" : ""}"/><text x="${marge.l - 6}" y="${yDe(graduation) + 4}" text-anchor="end" class="at">${esc(format(graduation))}</text>`,
      )
      .join(""),
    saut = libelles.length > 8 && largeur < 420 ? 2 : 1,
    etiquettes = libelles
      .map((libelle, index) =>
        index % saut === 0
          ? `<text x="${xDe(index)}" y="${hauteur - 7}" text-anchor="middle" class="at">${esc(libelle)}</text>`
          : "",
      )
      .join(""),
    courbes = series
      .map((serie) => {
        const points = serie.values
          .map((valeur, index) => (valeur === null ? null : [xDe(index), yDe(Number(valeur))]))
          .filter(Boolean);
        return `<polyline fill="none" stroke="${serie.color}" stroke-width="2" stroke-linejoin="round" points="${points.map((point) => point.join(",")).join(" ")}"/>${points.map((point) => `<circle cx="${point[0]}" cy="${point[1]}" r="3.500" fill="${serie.color}" stroke="#fff" stroke-width="1.500"/>`).join("")}`;
      })
      .join(""),
    zones = libelles
      .map(
        (libelle, index) =>
          `<rect x="${xDe(index) - largeurUtile / Math.max(1, libelles.length) / 2}" y="${marge.t}" width="${largeurUtile / Math.max(1, libelles.length)}" height="${hauteurUtile}" fill="transparent" data-tip="${tipFor(libelles, series, format, index)}"/>`,
      )
      .join("");
  return `${legend(series)}<svg class="chart" viewBox="0 0 ${largeur} ${hauteur}" role="img" aria-label="${esc(titre || "Graphique")}">${grille}${etiquettes}${courbes}${zones}</svg>${chartTable(libelles, series, format)}`;
}
function hbars(lignes, couleur = C.honey) {
  if (!lignes.length) return '<p class="small">Pas encore de donn\xE9es.</p>';
  const maxi = Math.max(1, ...lignes.map((ligne) => Number(ligne[1])));
  return `<div class="bars">${lignes
    .map(
      ([libelle, valeur, texte]) =>
        `<div class="bar" data-tip="${esc(
          libelle +
            `
` +
            texte,
        )}"><span>${esc(libelle)}</span><span class="t"><i style="width:${Math.round((valeur / maxi) * 100)}%;background:${couleur}"></i></span><span>${esc(texte)}</span></div>`,
    )
    .join("")}</div>`;
}
function stock() {
  const donnees = S.d;
  return {
    pots: sum(donnees.lots, (lot) => lot.pots_restants),
    kg: sum(donnees.lots, (lot) => (lot.pots_restants * lot.format_g) / 1e3),
    kgPots: sum(donnees.lots, (lot) => (lot.pots_initiaux * lot.format_g) / 1e3),
    valeur: sum(donnees.lots, (lot) => lot.pots_restants * lot.prix),
  };
}
const venteTotal = (vente) =>
    sum(
      S.d.lignes.filter((ligne) => ligne.vente_id === vente.id),
      (ligne) => ligne.quantite * ligne.prix_unitaire,
    ),
  lastVisit = (rucheId) => S.d.visites.find((visite) => visite.ruche_id === rucheId),
  years = () => {
    const donnees = S.d,
      annees = new Set([new Date().getFullYear()]);
    return (
      donnees.ventes.forEach((vente) => annees.add(yr(vente.date_vente))),
      donnees.depenses.forEach((depense) => annees.add(yr(depense.date_depense))),
      donnees.recoltes.forEach((recolte) => annees.add(yr(recolte.date_recolte))),
      donnees.visites.forEach((visite) => annees.add(yr(visite.date_visite))),
      [...annees].sort((a, b) => b - a)
    );
  };
function fin(annee) {
  const donnees = S.d,
    ventes = donnees.ventes.filter((vente) => yr(vente.date_vente) === annee),
    depenses = donnees.depenses.filter((depense) => yr(depense.date_depense) === annee),
    recoltes = donnees.recoltes.filter((recolte) => yr(recolte.date_recolte) === annee),
    idsVentes = new Set(ventes.map((vente) => vente.id)),
    lignes = donnees.lignes.filter((ligne) => idsVentes.has(ligne.vente_id)),
    ca = sum(lignes, (ligne) => ligne.quantite * ligne.prix_unitaire),
    encaisse = sum(
      ventes.filter((vente) => vente.paye),
      venteTotal,
    ),
    charges = sum(depenses, (depense) => depense.montant),
    kgRecolte = sum(recoltes, (recolte) => recolte.kg),
    kgVendu = sum(
      lignes,
      (ligne) => (ligne.quantite * (byId(donnees.lots, ligne.lot_id)?.format_g || 0)) / 1e3,
    ),
    moisCa = Array(12).fill(0),
    moisEncaisse = Array(12).fill(0),
    moisDepenses = Array(12).fill(0),
    moisPots = Array(12).fill(0);
  (ventes.forEach((vente) => {
    const total = venteTotal(vente);
    ((moisCa[mo(vente.date_vente)] += total),
      vente.paye && (moisEncaisse[mo(vente.date_vente)] += total),
      (moisPots[mo(vente.date_vente)] += sum(
        donnees.lignes.filter((ligne) => ligne.vente_id === vente.id),
        (ligne) => ligne.quantite,
      )));
  }),
    depenses.forEach((depense) => {
      moisDepenses[mo(depense.date_depense)] += Number(depense.montant);
    }));
  const report =
    sum(
      donnees.ventes.filter((vente) => yr(vente.date_vente) < annee && vente.paye),
      venteTotal,
    ) -
    sum(
      donnees.depenses.filter((depense) => yr(depense.date_depense) < annee),
      (depense) => depense.montant,
    );
  let cumul = report;
  const dernierMois =
      new Date().getFullYear() === annee
        ? new Date().getMonth()
        : annee > new Date().getFullYear()
          ? -1
          : 11,
    tresorerie = moisEncaisse.map(
      (encaisse, mois) => (
        (cumul += encaisse - moisDepenses[mois]),
        mois <= dernierMois ? cumul : null
      ),
    );
  return {
    ventes: ventes,
    dep: depenses,
    lignes: lignes,
    ca: ca,
    encaisse: encaisse,
    aEncaisser: ca - encaisse,
    charges: charges,
    resultat: ca - charges,
    kgRec: kgRecolte,
    kgVendu: kgVendu,
    mCa: moisCa,
    mEnc: moisEncaisse,
    mDep: moisDepenses,
    mPots: moisPots,
    treso: tresorerie,
    report: report,
    tresoFin: report + encaisse - charges,
    coutKg: kgRecolte ? charges / kgRecolte : null,
    prixKg: kgVendu ? ca / kgVendu : null,
  };
}
function rythme() {
  const donnees = S.d,
    depuis = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10),
    idsVentes = new Set(
      donnees.ventes.filter((vente) => vente.date_vente >= depuis).map((vente) => vente.id),
    ),
    potsParMois =
      sum(
        donnees.lignes.filter((ligne) => idsVentes.has(ligne.vente_id)),
        (ligne) => ligne.quantite,
      ) / 3,
    pots = stock().pots;
  return { mois: potsParMois, moisRestants: potsParMois > 0 ? pots / potsParMois : null };
}
function todos() {
  const donnees = S.d,
    liste = [];
  (donnees.taches
    .filter((tache) => !tache.faite && tache.echeance && tache.echeance < today())
    .forEach((tache) =>
      liste.push([
        "En retard",
        "crit",
        tache.titre + " (" + dshort(tache.echeance) + ")",
        "agenda",
      ]),
    ),
    donnees.articles
      .filter(
        (article) =>
          article.type !== "\xC9quipement" &&
          Number(article.seuil) > 0 &&
          Number(article.stock) <= Number(article.seuil),
      )
      .forEach((article) =>
        liste.push([
          "Stock bas",
          "watch",
          `${article.nom} : ${n(article.stock)} ${article.unite} (seuil ${n(article.seuil)})`,
          "materiel",
        ]),
      ),
    donnees.ruches
      .filter((ruche) => ruche.etat !== "Bonne")
      .forEach((ruche) =>
        liste.push([
          ruche.nom,
          etatClass(ruche.etat),
          `\xC9tat : ${ruche.etat}`,
          "ruche:" + ruche.id,
        ]),
      ),
    donnees.ruches.forEach((ruche) => {
      const derniere = lastVisit(ruche.id);
      derniere &&
        days(derniere.date_visite) > 30 &&
        liste.push([
          ruche.nom,
          "watch",
          `Pas de visite depuis ${days(derniere.date_visite)} jours`,
          "ruche:" + ruche.id,
        ]);
    }));
  const impayees = donnees.ventes.filter((vente) => !vente.paye);
  impayees.length &&
    liste.push([
      "\xC0 encaisser",
      "watch",
      `${impayees.length} vente(s) non pay\xE9e(s) : ${eur(sum(impayees, venteTotal))}`,
      "clients",
    ]);
  const aMettreEnPots = sum(donnees.recoltes, (recolte) => recolte.kg) - stock().kgPots;
  return (
    aMettreEnPots > 0.05 &&
      liste.push([
        "Miel",
        "good",
        `${n(aMettreEnPots)} kg r\xE9colt\xE9s pas encore mis en pots`,
        "miel",
      ]),
    new Date().getMonth() >= 8 &&
      donnees.ruches.length &&
      liste.push([
        "Obligation",
        "good",
        `D\xE9clarer les ruches avant le 31 d\xE9cembre ${new Date().getFullYear()}`,
        "agenda",
      ]),
    donnees.taches
      .filter((tache) => !tache.faite && (!tache.echeance || tache.echeance >= today()))
      .slice(0, 4)
      .forEach((tache) =>
        liste.push([
          tache.echeance ? dshort(tache.echeance) : "\xC0 faire",
          "good",
          tache.titre,
          "agenda",
        ]),
      ),
    liste
  );
}
function honeycomb(ruches) {
  const parLigne = window.innerWidth <= 800 ? 3 : 4,
    rangees = [];
  for (let debut = 0; debut < ruches.length; debut += parLigne)
    rangees.push(ruches.slice(debut, debut + parLigne));
  const cellule = (ruche) =>
      `<button class="cell bg-${etatClass(ruche.etat)}" data-act="ruche" data-v="${ruche.id}" aria-label="Ouvrir ${esc(ruche.nom)}, \xE9tat ${esc(ruche.etat)}"><span>${esc(ruche.nom)}</span></button>`,
    legende = ETATS.map((etat) => [etat, ruches.filter((ruche) => ruche.etat === etat).length])
      .filter((compte) => compte[1])
      .map(
        ([etat, nombre]) =>
          `<span class="tag ${etatClass(etat)}">${nombre} ${etat === "Bonne" ? "en bon \xE9tat" : esc(etat.toLowerCase())}</span>`,
      )
      .join("");
  return `<div class="comb">${rangees.map((rangee) => `<div class="comb-row">${rangee.map(cellule).join("")}</div>`).join("")}</div><div class="comb-legend">${legende}</div>`;
}
function viewDash() {
  const donnees = S.d,
    reglages = cfg(),
    stockMiel = stock(),
    annee = new Date().getFullYear(),
    finances = fin(annee),
    etapes = [
      [donnees.ruches.length > 0, "Ajouter vos ruches", "newruches"],
      [donnees.articles.length > 0, "Renseigner votre mat\xE9riel", "gomateriel"],
      [donnees.recoltes.length > 0, "Saisir une r\xE9colte", "newrecolte"],
      [donnees.lots.length > 0, "Cr\xE9er vos lots de pots", "newlot"],
      [donnees.clients.length > 0, "Ajouter un client", "newclient"],
      [donnees.ventes.length > 0, "Enregistrer une vente", "newvente"],
    ],
    faites = etapes.filter((etape) => etape[0]).length,
    demarrage =
      faites < etapes.length
        ? `<section class="card">
    <h2>Bien d\xE9marrer</h2><p class="small">${faites} sur ${etapes.length} \xE9tapes termin\xE9es</p><div class="track"><i style="width:${Math.round((faites / etapes.length) * 100)}%"></i></div>
    <div class="steps">${etapes.map(([fait, libelle, action]) => `<button class="step ${fait ? "ok" : ""}" ${fait ? "disabled" : `data-act="${action}"`}><span class="dot">${fait ? "\u2713" : ""}</span>${esc(libelle)}</button>`).join("")}</div>
  </section>`
        : "",
    rayon = honeycomb(donnees.ruches),
    aFaire = todos()
      .slice(0, 7)
      .map(
        ([titre, classe, texte, cible]) =>
          `<button class="todo" data-act="${cible.startsWith("ruche:") ? "ruche" : "go"}" data-v="${cible.replace("ruche:", "")}"><b class="${classe}">${esc(titre)}</b><span>${esc(texte)}</span></button>`,
      )
      .join(""),
    tachesOuvertes = donnees.taches.filter((tache) => !tache.faite).length,
    aSurveiller = donnees.ruches.filter((ruche) => ruche.etat !== "Bonne").length,
    resume = [
      `${donnees.ruches.length} ruche${donnees.ruches.length > 1 ? "s" : ""}`,
      aSurveiller ? `${aSurveiller} \xE0 surveiller` : "",
      tachesOuvertes ? `${tachesOuvertes} t\xE2che${tachesOuvertes > 1 ? "s" : ""} \xE0 faire` : "",
    ]
      .filter(Boolean)
      .join(" \xB7 "),
    heure = new Date().getHours();
  shell(
    heure < 18 ? "Bonjour" : "Bonsoir",
    resume,
    '<button class="btn honey" data-act="newvisite">Nouvelle visite</button><button class="btn ghost" data-act="newvente">Nouvelle vente</button>',
    `
    ${demarrage}
    ${typeof HL != "undefined" ? HL.section() : ""}
    <div class="grid">
      ${kpi("Miel en stock", n(stockMiel.kg) + " kg", stockMiel.pots + " pots")}
      ${kpi("Ventes " + annee, eur0(finances.ca), finances.aEncaisser > 0 ? eur0(finances.aEncaisser) + " \xE0 encaisser" : finances.ventes.length + " vente(s)")}
      ${kpi("R\xE9sultat " + annee, eur0(finances.resultat), "apr\xE8s " + eur0(finances.charges) + " de d\xE9penses")}
      ${kpi("Tr\xE9sorerie", eur0(finances.tresoFin), "encaiss\xE9 moins d\xE9pens\xE9")}
    </div>
    <div class="grid2">
      <section class="card"><h2>\xC9tat des ruches</h2>${donnees.ruches.length ? rayon : '<p class="small">Aucune ruche pour le moment.</p><button class="btn" data-act="newruches">Ajouter des ruches</button>'}</section>
      <section class="card"><h2>\xC0 faire</h2>${aFaire || '<p class="small">Rien \xE0 signaler.</p>'}</section>
    </div>`,
    reglages.nom +
      " \xB7 " +
      new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
  );
}
function viewPlus() {
  shell(
    "Plus",
    "",
    "",
    `<section class="card menu">${[
      ["membres", "Exploitation et membres"],
      ["agenda", "Agenda et t\xE2ches"],
      ["registre", "Registre d\u2019\xE9levage"],
      ["previsions", "Pr\xE9visions et budget"],
      ["compta", "D\xE9penses"],
      ["fournisseurs", "Fournisseurs"],
      ["reglages", "R\xE9glages et exports"],
    ]
      .map(
        ([route, libelle]) =>
          `<button data-act="go" data-v="${route}">${icon(route)}<span>${libelle}</span></button>`,
      )
      .join(
        "",
      )}<button data-act="logout">${icon("plus")}<span>Se d\xE9connecter</span></button></section>`,
  );
}
function viewRuches() {
  const donnees = S.d;
  if (!donnees.ruches.length)
    return shell(
      "Ruches",
      "",
      "",
      emptyState(
        "Ajoutez votre premi\xE8re ruche",
        "Une par une ou plusieurs d\u2019un coup. Vous pourrez les renommer et les regrouper par rucher.",
        "Ajouter des ruches",
        "newruches",
      ),
    );
  const parRucher = {};
  donnees.ruches.forEach((ruche) => {
    (parRucher[ruche.rucher || "Sans rucher"] =
      parRucher[ruche.rucher || "Sans rucher"] || []).push(ruche);
  });
  const sections = Object.keys(parRucher)
      .sort()
      .map(
        (rucher) =>
          `<section class="card"><h2>${esc(rucher)} <span class="small">\xB7 ${parRucher[rucher].length} ruche(s)</span></h2><div class="rlist">${parRucher[
            rucher
          ]
            .map((ruche) => {
              const derniere = lastVisit(ruche.id);
              return `<button class="rcard" data-act="ruche" data-v="${ruche.id}"><span class="hex small-hex bg-${etatClass(ruche.etat)}"></span><span class="rmain"><b>${esc(ruche.nom)}</b><span class="small">${derniere ? "Visite il y a " + days(derniere.date_visite) + " j" : "Jamais visit\xE9e"}</span></span><span class="num"><b>${n(
                sum(
                  donnees.recoltes.filter((recolte) => recolte.ruche_id === ruche.id),
                  (recolte) => recolte.kg,
                ),
              )} kg</b><span class="small tag ${etatClass(ruche.etat)}">${esc(ruche.etat)}</span></span></button>`;
            })
            .join("")}</div></section>`,
      )
      .join(""),
    lignesRecoltes = donnees.recoltes.map(
      (recolte) =>
        `<tr><td><button class="link" data-act="editrecolte" data-v="${recolte.id}">${dfr(recolte.date_recolte)}</button>${recolte._attente ? ' <span class="tag watch hl-tag">en attente</span>' : ""}</td><td>${recolte.ruche_id ? esc(byId(donnees.ruches, recolte.ruche_id)?.nom) : "Toutes les ruches"}</td><td class="num">${n(recolte.kg)} kg</td></tr>`,
    );
  shell(
    "Ruches",
    donnees.ruches.length + " ruche(s)",
    '<button class="btn main" data-act="newvisite">Nouvelle visite</button><button class="btn" data-act="newrecolte">R\xE9colte</button><button class="btn" data-act="newruches">Ajouter</button>',
    `
    ${sections}
    <section class="card tbl"><h2>R\xE9coltes</h2>${table(["Date", "Origine", "#Quantit\xE9"], lignesRecoltes, "Aucune r\xE9colte saisie.")}</section>`,
  );
}
function viewRuche() {
  const donnees = S.d,
    ruche = byId(donnees.ruches, S.ruche);
  if (!ruche) return ((S.route = "ruches"), render());
  const visites = donnees.visites.filter((visite) => visite.ruche_id === ruche.id),
    journal = visites.map((visite) => {
      const intrants = donnees.intrants
        .filter((intrant) => intrant.visite_id === visite.id)
        .map((intrant) => {
          const article = byId(donnees.articles, intrant.article_id);
          return `${n(intrant.quantite)} ${esc(article?.unite)} ${esc(article?.nom)}`;
        })
        .join(", ");
      return `<tr><td>${dfr(visite.date_visite)}${visite._attente ? '<br><span class="tag watch hl-tag">en attente</span>' : ""}</td><td>Activit\xE9 ${esc(visite.activite.toLowerCase())}, provisions ${esc(visite.provisions.toLowerCase())}, reine ${esc(visite.reine.toLowerCase())}${visite.couvain ? ", couvain " + esc(visite.couvain.toLowerCase()) : ""}${visite.poids_kg ? ", " + n(visite.poids_kg) + " kg" : ""}${visite.varroa !== null && visite.varroa !== void 0 ? ", varroa " + visite.varroa : ""}${visite.note ? '<br><span class="small">' + esc(visite.note) + "</span>" : ""}${typeof RG != "undefined" ? RG.journal(visite) : ""}${typeof PH != "undefined" ? PH.vignettes(visite.id) : ""}</td><td>${intrants || "\u2013"}</td><td class="num"><button class="link" data-act="delvisite" data-v="${visite.id}">Supprimer</button></td></tr>`;
    }),
    kgRecoltes = sum(
      donnees.recoltes.filter((recolte) => recolte.ruche_id === ruche.id),
      (recolte) => recolte.kg,
    ),
    pesees = visites
      .filter((visite) => visite.poids_kg)
      .slice()
      .reverse(),
    taches = donnees.taches.filter((tache) => tache.ruche_id === ruche.id && !tache.faite);
  shell(
    ruche.nom,
    [ruche.rucher, ruche.type_ruche, ruche.annee_reine ? "reine " + ruche.annee_reine : ""]
      .filter(Boolean)
      .join(" \xB7 ") || "Fiche de la ruche",
    `<button class="btn main" data-act="newvisite" data-v="${ruche.id}">Nouvelle visite</button><button class="btn" data-act="newtache" data-v="${ruche.id}">T\xE2che</button><button class="btn" data-act="editruche" data-v="${ruche.id}">Modifier</button>`,
    `
    <div class="grid">
      ${kpi("\xC9tat", ruche.etat, "", etatClass(ruche.etat))}
      ${kpi("Miel r\xE9colt\xE9", n(kgRecoltes) + " kg", "")}
      ${kpi("Derni\xE8re visite", visites[0] ? "Il y a " + days(visites[0].date_visite) + " j" : "\u2013", visites[0] ? dfr(visites[0].date_visite) : "Aucune visite")}
      ${kpi("Visites", visites.length, "")}
    </div>
    ${ruche.notes ? `<section class="card">${esc(ruche.notes)}</section>` : ""}
    ${taches.length ? `<section class="card"><h2>T\xE2ches pr\xE9vues</h2>${taches.map(taskRow).join("")}</section>` : ""}
    ${pesees.length > 1 ? `<section class="card"><h2>\xC9volution du poids</h2>${lineChart({ labels: pesees.map((visite) => dshort(visite.date_visite)), series: [{ name: "Poids", color: C.honey, values: pesees.map((visite) => Number(visite.poids_kg)) }], fmt: (visite) => n(visite) + " kg", title: "\xC9volution du poids de la ruche", h: 180 })}</section>` : ""}
    <section class="card tbl"><h2>Journal des visites</h2>${table(["Date", "Observations", "Intrants", "#"], journal, "Aucune visite enregistr\xE9e.")}</section>`,
  );
}
function viewVisite() {
  const visite = S.visite,
    donnees = S.d,
    choix = (titre, cle, options) =>
      `<div class="field"><div class="t">${titre}</div><div class="seg" style="grid-template-columns:repeat(${options.length},minmax(0,1fr))">${options.map((option) => `<button type="button" class="${visite[cle] === option ? "on" : ""}" aria-pressed="${visite[cle] === option}" data-act="vset" data-k="${cle}" data-v="${option}">${option}</button>`).join("")}</div></div>`,
    intrants = consommables()
      .map((article) => {
        const pas = ["kg", "L"].includes(article.unite) ? 0.5 : 1;
        return `<div class="stepper"><div><b>${esc(article.nom)}</b><div class="small">${n(article.stock)} ${esc(article.unite)} en stock</div></div><div class="ctl"><button type="button" aria-label="Diminuer ${esc(article.nom)}" data-act="vstep" data-k="${article.id}" data-v="${-pas}">\u2212</button><span>${n(visite.q[article.id] || 0)}</span><button type="button" aria-label="Augmenter ${esc(article.nom)}" data-act="vstep" data-k="${article.id}" data-v="${pas}">+</button></div></div>`;
      })
      .join("");
  shell(
    "Nouvelle visite",
    "Au rucher",
    '<button class="btn" data-act="cancel">Annuler</button>',
    `
    <form data-form="visite" class="form">
      ${typeof VR != "undefined" ? VR.pick(visite) : `<div class="field"><div class="t">Ruche visit\xE9e</div><div class="pick">${donnees.ruches.map((ruche) => `<button type="button" class="${visite.ruche_id === ruche.id ? "on" : ""}" aria-pressed="${visite.ruche_id === ruche.id}" data-act="vset" data-k="ruche_id" data-v="${ruche.id}">${esc(ruche.nom)}</button>`).join("")}</div></div>`}
      <label>Date<input type="date" id="v_date" value="${esc(visite.date_visite)}" max="${today()}" required></label>
      ${choix("Activit\xE9 \xE0 l\u2019entr\xE9e", "activite", ["Faible", "Normale", "Forte"])}
      ${choix("Provisions", "provisions", ["Faibles", "Moyennes", "Bonnes"])}
      ${choix("Reine", "reine", ["Vue", "Non vue", "Non cherch\xE9e"])}
      ${choix("Couvain", "couvain", ["Non vu", "R\xE9duit", "Normal", "Abondant"])}
      ${choix("\xC9tat de la ruche apr\xE8s la visite", "etat", ETATS)}
      <section class="card"><h2>Ce que vous avez utilis\xE9</h2>${intrants || '<p class="small">Ajoutez vos consommables dans Mat\xE9riel pour les suivre ici.</p>'}</section>
      <div class="two"><label>Poids (kg)<input type="number" step="0.1" min="0" inputmode="decimal" id="v_poids" value="${esc(visite.poids_kg)}"></label>
      <label>Varroas compt\xE9s<input type="number" step="1" min="0" inputmode="numeric" id="v_varroa" value="${esc(visite.varroa)}"></label></div>
      ${typeof RG != "undefined" ? RG.formSection(visite) : ""}
      ${typeof PH != "undefined" ? PH.formSection() : ""}
      <label>Note<textarea id="v_note">${esc(visite.note)}</textarea></label>
      <button class="btn main block" ${S.busy ? "disabled" : ""}>${typeof HL != "undefined" && HL.horsLigne() ? "Enregistrer sur le t\xE9l\xE9phone" : "Enregistrer la visite"}</button>
    </form>`,
  );
}
function viewMiel() {
  const donnees = S.d,
    stockMiel = stock(),
    kgRecoltes = sum(donnees.recoltes, (recolte) => recolte.kg),
    resteAMettreEnPots = kgRecoltes - stockMiel.kgPots,
    rythmeVentes = rythme(),
    lignesLots = donnees.lots.map(
      (lot) =>
        `<tr><td><button class="link" data-act="editlot" data-v="${lot.id}">${esc(lot.code)}</button></td><td>${esc(lot.miel)}</td><td>${n(lot.format_g, 0)} g</td><td class="num">${eur(lot.prix)}</td><td class="num">${lot.pots_restants} / ${lot.pots_initiaux}</td><td>${dfr(lot.ddm)}</td><td class="num">${typeof ET != "undefined" ? ET.bouton(lot) : ""}</td></tr>`,
    ),
    contenu =
      donnees.lots.length || kgRecoltes
        ? `
    <div class="grid">
      ${kpi("R\xE9colt\xE9", n(kgRecoltes) + " kg", "")}
      ${kpi("Mis en pots", n(stockMiel.kgPots) + " kg", resteAMettreEnPots > 0.05 ? n(resteAMettreEnPots) + " kg \xE0 mettre en pots" : resteAMettreEnPots < -0.05 ? "Plus que la r\xE9colte saisie" : "Tout est en pots")}
      ${kpi("En stock", n(stockMiel.kg) + " kg", stockMiel.pots + " pots")}
      ${kpi("Valeur \xE0 vendre", eur0(stockMiel.valeur), rythmeVentes.moisRestants !== null ? `Environ ${n(rythmeVentes.moisRestants, 0)} mois de ventes` : "")}
    </div>
    <section class="card tbl">${table(["Lot", "Miel", "Format", "#Prix", "#Pots restants", "DDM", "#"], lignesLots, "Aucun lot. Cr\xE9ez un lot par format de pot.")}</section>`
        : emptyState(
            "Votre stock de miel est vide",
            "Saisissez une r\xE9colte, puis cr\xE9ez un lot par format de pot.",
            "Saisir une r\xE9colte",
            "newrecolte",
            '<button class="btn" data-act="newlot">Cr\xE9er un lot</button>',
          );
  shell(
    "Stocks",
    "Miel et mat\xE9riel",
    '<button class="btn main" data-act="newlot">Nouveau lot</button><button class="btn" data-act="newrecolte">R\xE9colte</button>',
    subtabs(
      [
        ["miel", "Miel"],
        ["materiel", "Mat\xE9riel"],
      ],
      "miel",
      "go",
    ) + contenu,
  );
}
function viewMateriel() {
  const ajoutRapide = (type) => {
      const dejaLa = new Set(S.d.articles.map((article) => article.nom)),
        proposes = PRESETS[type].filter((modele) => !dejaLa.has(modele[0]));
      return proposes.length
        ? `<div class="chips"><span class="small">Ajouter vite :</span>${proposes.map((modele) => `<button data-act="preset" data-v="${esc(modele[0])}" data-k="${type}">+ ${esc(modele[0])}</button>`).join("")}</div>`
        : "";
    },
    fournisseurDe = (article) =>
      esc(byId(S.d.fournisseurs, article.fournisseur_id)?.nom) || "\u2013",
    lignesConsommables = consommables().map((article) => {
      const bas = Number(article.seuil) > 0 && Number(article.stock) <= Number(article.seuil);
      return `<tr><td><button class="link" data-act="editarticle" data-v="${article.id}">${esc(article.nom)}</button></td><td class="num">${n(article.stock)} ${esc(article.unite)}</td><td class="num">${n(article.seuil)}</td><td><span class="tag ${bas ? "watch" : "good"}">${bas ? "\xC0 commander" : "OK"}</span></td><td class="num"><button class="btn sm" data-act="entree" data-v="${article.id}">+ Entr\xE9e</button></td></tr>`;
    }),
    lignesEquipements = equipements().map(
      (article) =>
        `<tr><td><button class="link" data-act="editarticle" data-v="${article.id}">${esc(article.nom)}</button></td><td class="num">${n(article.stock)}</td><td class="num">${article.valeur ? eur(article.valeur * article.stock) : "\u2013"}</td><td>${fournisseurDe(article)}</td></tr>`,
    );
  shell(
    "Stocks",
    "Miel et mat\xE9riel",
    '<button class="btn main" data-act="newarticle">Ajouter un article</button>',
    subtabs(
      [
        ["miel", "Miel"],
        ["materiel", "Mat\xE9riel"],
      ],
      "materiel",
      "go",
    ) +
      `
    <section class="card tbl"><h2>Consommables</h2>${table(["Article", "#Stock", "#Seuil", "\xC9tat", "#"], lignesConsommables, "Aucun consommable : candy, sirop, pots, \xE9tiquettes\u2026")}${ajoutRapide("Consommable")}</section>
    <section class="card tbl"><h2>\xC9quipement</h2>${table(["\xC9quipement", "#Qt\xE9", "#Valeur", "Fournisseur"], lignesEquipements, "Aucun \xE9quipement enregistr\xE9.")}${ajoutRapide("\xC9quipement")}</section>`,
  );
}
function viewClients() {
  const donnees = S.d,
    ventesAffichees = donnees.ventes.filter((vente) => S.venteFiltre === "toutes" || !vente.paye),
    lignesClients = donnees.clients.map((client) => {
      const ventesClient = donnees.ventes.filter((vente) => vente.client_id === client.id);
      return `<tr><td><button class="link" data-act="editclient" data-v="${client.id}">${esc(client.nom)}</button></td><td>${esc(client.cercle)}</td><td>${client.telephone ? `<a href="tel:${esc(client.telephone)}">${esc(client.telephone)}</a>` : "\u2013"}</td><td class="num">${eur(sum(ventesClient, venteTotal))}</td><td>${ventesClient[0] ? dfr(ventesClient[0].date_vente) : "Jamais"}</td></tr>`;
    }),
    lignesVentes = ventesAffichees.slice(0, 25).map((vente) => {
      const pots = donnees.lignes
        .filter((ligne) => ligne.vente_id === vente.id)
        .map(
          (ligne) => `${ligne.quantite} \xD7 ${n(byId(donnees.lots, ligne.lot_id)?.format_g, 0)} g`,
        )
        .join(", ");
      return `<tr><td>${dfr(vente.date_vente)}${vente._attente ? '<br><span class="tag watch hl-tag">en attente</span>' : ""}</td><td>${esc(byId(donnees.clients, vente.client_id)?.nom)}</td><td>${esc(pots)}</td><td class="num">${eur(venteTotal(vente))}</td><td><button class="link ${vente.paye ? "" : "watch"}" data-act="togglepaye" data-v="${vente.id}">${vente.paye ? "Pay\xE9e" + (vente.mode ? " \xB7 " + esc(vente.mode) : "") : "\xC0 encaisser"}</button></td><td class="num"><button class="link" data-act="delvente" data-v="${vente.id}">Supprimer</button></td></tr>`;
    });
  if (!donnees.clients.length)
    return shell(
      "Clients & ventes",
      "",
      "",
      emptyState(
        "Ajoutez votre premier client",
        "Famille, amis, coll\xE8gues : retrouvez qui a achet\xE9 quoi.",
        "Ajouter un client",
        "newclient",
      ),
    );
  const aEncaisser = sum(
    donnees.ventes.filter((vente) => !vente.paye),
    venteTotal,
  );
  shell(
    "Clients & ventes",
    donnees.clients.length +
      " client(s)" +
      (aEncaisser ? " \xB7 " + eur(aEncaisser) + " \xE0 encaisser" : ""),
    '<button class="btn main" data-act="newvente">Nouvelle vente</button><button class="btn" data-act="newclient">Ajouter un client</button>',
    `
    <section class="card tbl">${table(["Client", "Cercle", "T\xE9l\xE9phone", "#Total", "Dernier achat"], lignesClients, "Aucun client.")}</section>
    <section class="card tbl"><h2>Ventes</h2><div class="pad">${subtabs(
      [
        ["toutes", "Toutes"],
        ["impayees", "\xC0 encaisser"],
      ],
      S.venteFiltre,
      "vfiltre",
    )}</div>${table(["Date", "Client", "Pots", "#Montant", "Paiement", "#"], lignesVentes, "Aucune vente.")}</section>`,
  );
}
function viewVente() {
  const vente = S.vente,
    donnees = S.d,
    reglages = cfg(),
    lotsDispo = donnees.lots.filter((lot) => lot.pots_restants > 0),
    total = sum(lotsDispo, (lot) => (vente.q[lot.id] || 0) * lot.prix),
    lignesLots = lotsDispo
      .map(
        (lot) =>
          `<div class="stepper"><div><b>${n(lot.format_g, 0)} g \xB7 ${esc(lot.code)}</b><div class="small">${eur(lot.prix)} \xB7 ${lot.pots_restants} en stock</div></div><div class="ctl"><button type="button" aria-label="Retirer un pot ${lot.format_g} g" data-act="sstep" data-k="${lot.id}" data-v="-1">\u2212</button><span>${vente.q[lot.id] || 0}</span><button type="button" aria-label="Ajouter un pot ${lot.format_g} g" data-act="sstep" data-k="${lot.id}" data-v="1">+</button></div></div>`,
      )
      .join(""),
    optionsClients = donnees.clients
      .map(
        (client) =>
          `<option value="${client.id}" ${vente.client_id === client.id ? "selected" : ""}>${esc(client.nom)}</option>`,
      )
      .join("");
  shell(
    "Nouvelle vente",
    "",
    '<button class="btn" data-act="cancel">Annuler</button>',
    `
    <form data-form="vente" class="form">
      ${donnees.clients.length ? `<label>Client<select id="s_client" required><option value="">Choisir\u2026</option>${optionsClients}</select></label>` : ""}
      <button type="button" class="link" data-act="newclient">Ajouter un client</button>
      <label>Date<input type="date" id="s_date" value="${esc(vente.date_vente)}" max="${today()}" required></label>
      <section class="card"><h2>Pots vendus</h2>${lignesLots || '<p class="small">Aucun pot en stock. Cr\xE9ez d\u2019abord un lot dans Stocks.</p>'}</section>
      <div class="field"><div class="t">Paiement</div><div class="seg" style="grid-template-columns:repeat(2,minmax(0,1fr))"><button type="button" class="${vente.paye ? "on" : ""}" data-act="spaye" data-v="1">Pay\xE9e</button><button type="button" class="${vente.paye ? "" : "on"}" data-act="spaye" data-v="0">\xC0 encaisser</button></div></div>
      ${vente.paye ? `<label>Mode de paiement<select id="s_mode">${reglages.modes.map((mode) => `<option ${vente.mode === mode ? "selected" : ""}>${esc(mode)}</option>`).join("")}</select></label>` : ""}
      <button class="btn main block" ${S.busy ? "disabled" : ""}>Enregistrer \xB7 ${eur(total)}</button>
    </form>`,
  );
}
function viewFournisseurs() {
  const donnees = S.d;
  if (!donnees.fournisseurs.length)
    return shell(
      "Fournisseurs",
      "",
      "",
      emptyState(
        "Ajoutez vos fournisseurs",
        "Gardez leurs coordonn\xE9es et suivez ce que vous leur achetez.",
        "Ajouter un fournisseur",
        "newfournisseur",
      ),
    );
  const lignes = donnees.fournisseurs.map((fournisseur) => {
    const achats = donnees.depenses.filter((depense) => depense.fournisseur_id === fournisseur.id);
    return `<tr><td><button class="link" data-act="editfournisseur" data-v="${fournisseur.id}">${esc(fournisseur.nom)}</button></td><td>${esc(fournisseur.produits) || "\u2013"}</td><td>${fournisseur.telephone ? `<a href="tel:${esc(fournisseur.telephone)}">${esc(fournisseur.telephone)}</a>` : esc(fournisseur.contact) || "\u2013"}</td><td>${achats[0] ? dfr(achats[0].date_depense) : "\u2013"}</td><td class="num">${eur(sum(achats, (depense) => depense.montant))}</td></tr>`;
  });
  shell(
    "Fournisseurs",
    donnees.fournisseurs.length + " fournisseur(s)",
    '<button class="btn main" data-act="newfournisseur">Ajouter un fournisseur</button>',
    `<section class="card tbl">${table(["Fournisseur", "Produits", "Contact", "Dernier achat", "#Achats"], lignes, "")}</section>`,
  );
}
const yearSel = () =>
  `<label class="yr">Ann\xE9e<select data-chg="annee">${years()
    .map((annee) => `<option ${annee === S.annee ? "selected" : ""}>${annee}</option>`)
    .join("")}</select></label>`;
function viewCompta() {
  const donnees = S.d,
    finances = fin(S.annee),
    lignes = finances.dep.map(
      (depense) =>
        `<tr><td><button class="link" data-act="editdepense" data-v="${depense.id}">${dfr(depense.date_depense)}</button>${depense._attente ? ' <span class="tag watch hl-tag">en attente</span>' : ""}</td><td>${esc(depense.libelle)}</td><td>${esc(depense.categorie)}</td><td>${esc(byId(donnees.fournisseurs, depense.fournisseur_id)?.nom) || "\u2013"}</td><td class="num">${eur(depense.montant)}</td></tr>`,
    );
  shell(
    "D\xE9penses",
    "Total " + S.annee + " : " + eur(finances.charges),
    `${yearSel()}<button class="btn main" data-act="newdepense">Ajouter une d\xE9pense</button>`,
    `<section class="card tbl">${table(["Date", "Libell\xE9", "Poste", "Fournisseur", "#Montant"], lignes, "Aucune d\xE9pense sur cette ann\xE9e.")}</section>`,
  );
}
function pilotFin() {
  const donnees = S.d,
    annee = S.annee,
    finances = fin(annee),
    reglages = cfg(),
    stockMiel = stock(),
    anneePrecedente = fin(annee - 1),
    evolution = anneePrecedente.ca
      ? ` (${finances.ca >= anneePrecedente.ca ? "+" : ""}${n(((finances.ca - anneePrecedente.ca) / anneePrecedente.ca) * 100, 0)} % sur ${annee - 1})`
      : "",
    parPoste = [
      ...new Set([...reglages.postes, ...finances.dep.map((depense) => depense.categorie)]),
    ]
      .map((poste) => [
        poste,
        sum(
          finances.dep.filter((depense) => depense.categorie === poste),
          (depense) => depense.montant,
        ),
      ])
      .filter((ligne) => ligne[1] > 0)
      .sort((un, deux) => deux[1] - un[1])
      .map(([poste, montant]) => [poste, montant, eur0(montant)]),
    parFormat = {};
  finances.lignes.forEach((ligne) => {
    const format = n(byId(donnees.lots, ligne.lot_id)?.format_g, 0) + " g";
    ((parFormat[format] = parFormat[format] || { v: 0, p: 0 }),
      (parFormat[format].v += ligne.quantite * ligne.prix_unitaire),
      (parFormat[format].p += ligne.quantite));
  });
  const ventesParFormat = Object.entries(parFormat).map(([format, totaux]) => [
      format,
      totaux.v,
      `${eur0(totaux.v)}`,
    ]),
    parCercle = {};
  finances.ventes.forEach((vente) => {
    const cercle = byId(donnees.clients, vente.client_id)?.cercle || "Autre";
    parCercle[cercle] = (parCercle[cercle] || 0) + venteTotal(vente);
  });
  const ventesParCercle = Object.entries(parCercle)
      .sort((un, deux) => deux[1] - un[1])
      .map(([cercle, montant]) => [cercle, montant, eur0(montant)]),
    parClient = {};
  finances.ventes.forEach((vente) => {
    parClient[vente.client_id] = (parClient[vente.client_id] || 0) + venteTotal(vente);
  });
  const meilleursClients = Object.entries(parClient)
      .sort((un, deux) => deux[1] - un[1])
      .slice(0, 5)
      .map(([clientId, montant]) => [
        byId(donnees.clients, clientId)?.nom || "?",
        montant,
        eur0(montant),
      ]),
    resteACouvrir = finances.charges - finances.ca;
  return `<div class="grid">
    ${kpi("Chiffre d\u2019affaires", eur0(finances.ca), finances.ventes.length + " vente(s)" + evolution)}
    ${kpi("D\xE9penses", eur0(finances.charges), finances.dep.length + " d\xE9pense(s)")}
    ${kpi("R\xE9sultat", eur0(finances.resultat), finances.ca ? "Marge " + n((finances.resultat / finances.ca) * 100, 0) + " %" : "", finances.resultat < 0 ? "crit" : "good")}
    ${kpi("Tr\xE9sorerie fin de p\xE9riode", eur0(finances.tresoFin), finances.aEncaisser ? eur0(finances.aEncaisser) + " \xE0 encaisser" : "Tout est encaiss\xE9")}
    ${kpi("Prix de vente moyen", finances.prixKg ? eur(finances.prixKg) : "\u2013", "par kg vendu")}
    ${kpi("Co\xFBt de revient", finances.coutKg !== null ? eur(finances.coutKg) : "\u2013", "par kg r\xE9colt\xE9")}
    ${kpi("Stock \xE0 vendre", eur0(stockMiel.valeur), "R\xE9sultat potentiel " + eur0(finances.resultat + stockMiel.valeur))}
    ${kpi("Seuil de rentabilit\xE9", resteACouvrir > 0 ? eur0(resteACouvrir) : "Atteint", resteACouvrir > 0 ? "de ventes restantes pour couvrir les d\xE9penses" : "les ventes couvrent les d\xE9penses")}
  </div>
  <section class="card"><h2>Ventes et d\xE9penses par mois</h2>${barChart({
    labels: MOIS,
    series: [
      { name: "Ventes", color: C.honey, values: finances.mCa },
      { name: "D\xE9penses", color: C.blue, values: finances.mDep },
    ],
    title: "Ventes et d\xE9penses par mois",
  })}</section>
  <section class="card"><h2>Tr\xE9sorerie cumul\xE9e</h2><p class="small">Argent encaiss\xE9 moins d\xE9penses, depuis le d\xE9but.</p>${lineChart({ labels: MOIS, series: [{ name: "Tr\xE9sorerie", color: C.green, values: finances.treso }], title: "Tr\xE9sorerie cumul\xE9e" })}</section>
  <div class="grid2">
    <section class="card"><h2>D\xE9penses par poste</h2>${hbars(parPoste, C.blue)}</section>
    <section class="card"><h2>Ventes par format</h2>${hbars(ventesParFormat)}</section>
    <section class="card"><h2>Ventes par cercle</h2>${hbars(ventesParCercle)}</section>
    <section class="card"><h2>Meilleurs clients</h2>${hbars(meilleursClients)}</section>
  </div>`;
}
function pilotOps() {
  const donnees = S.d,
    annee = S.annee,
    rythmeVentes = rythme(),
    recoltes = donnees.recoltes.filter((recolte) => yr(recolte.date_recolte) === annee),
    visites = donnees.visites.filter((visite) => yr(visite.date_visite) === annee),
    kgRecoltes = sum(recoltes, (recolte) => recolte.kg),
    nbRuches = donnees.ruches.length,
    visitesParMois = Array(12).fill(0);
  visites.forEach((visite) => visitesParMois[mo(visite.date_visite)]++);
  const finances = fin(annee),
    idsVisites = new Set(visites.map((visite) => visite.id)),
    intrants = donnees.intrants.filter((intrant) => idsVisites.has(intrant.visite_id)),
    rendements = donnees.ruches
      .map((ruche) => [
        ruche.nom,
        sum(
          recoltes.filter((recolte) => recolte.ruche_id === ruche.id),
          (recolte) => recolte.kg,
        ),
      ])
      .filter((ligne) => ligne[1] > 0)
      .sort((un, deux) => deux[1] - un[1])
      .map(([nom, kg]) => [nom, kg, n(kg) + " kg"]),
    intrantsUtilises = [...new Set(intrants.map((intrant) => intrant.article_id))].map(
      (articleId) => {
        const article = byId(donnees.articles, articleId),
          quantite = sum(
            intrants.filter((intrant) => intrant.article_id === articleId),
            (intrant) => intrant.quantite,
          );
        return [article?.nom || "?", quantite, n(quantite) + " " + (article?.unite || "")];
      },
    ),
    autonomie = consommables()
      .map((article) => {
        const depuis = new Date(Date.now() - 15552e6).toISOString().slice(0, 10),
          idsVisitesRecentes = new Set(
            donnees.visites
              .filter((visite) => visite.date_visite >= depuis)
              .map((visite) => visite.id),
          ),
          consoMois =
            sum(
              donnees.intrants.filter(
                (intrant) =>
                  intrant.article_id === article.id && idsVisitesRecentes.has(intrant.visite_id),
              ),
              (intrant) => intrant.quantite,
            ) / 6;
        return {
          a: article,
          cons: consoMois,
          mois: consoMois > 0 ? Number(article.stock) / consoMois : null,
        };
      })
      .filter((ligne) => ligne.cons > 0),
    parEtat = ETATS.map((etat) => [
      etat,
      donnees.ruches.filter((ruche) => ruche.etat === etat).length,
    ]),
    lignesRuches = donnees.ruches.map((ruche) => {
      const derniere = lastVisit(ruche.id),
        kg = sum(
          recoltes.filter((recolte) => recolte.ruche_id === ruche.id),
          (recolte) => recolte.kg,
        ),
        pesee = donnees.visites.find((visite) => visite.ruche_id === ruche.id && visite.poids_kg);
      return `<tr><td><button class="link" data-act="ruche" data-v="${ruche.id}">${esc(ruche.nom)}</button></td><td><span class="tag ${etatClass(ruche.etat)}">${esc(ruche.etat)}</span></td><td class="num">${derniere ? days(derniere.date_visite) + " j" : "\u2013"}</td><td>${derniere ? esc(derniere.provisions) : "\u2013"}</td><td class="num">${pesee ? n(pesee.poids_kg) + " kg" : "\u2013"}</td><td class="num">${n(kg)} kg</td></tr>`;
    });
  return `<div class="grid">
    ${kpi("Miel r\xE9colt\xE9", n(kgRecoltes) + " kg", nbRuches ? n(kgRecoltes / nbRuches) + " kg par ruche" : "")}
    ${kpi("Visites", visites.length, nbRuches ? n(visites.length / nbRuches) + " par ruche" : "")}
    ${kpi("Ruches \xE0 surveiller", parEtat[1][1] + parEtat[2][1], "sur " + nbRuches)}
    ${kpi("Pots vendus par mois", n(rythmeVentes.mois, 0), rythmeVentes.moisRestants !== null ? "Stock pour " + n(rythmeVentes.moisRestants, 0) + " mois \xE0 ce rythme" : "sur les 3 derniers mois")}
  </div>
  <section class="card tbl"><h2>Tableau des ruches</h2>${table(["Ruche", "\xC9tat", "#Derni\xE8re visite", "Provisions", "#Poids", "#Miel " + annee], lignesRuches, "Aucune ruche.")}</section>
  <div class="grid2">
    <section class="card"><h2>Rendement par ruche</h2>${hbars(rendements)}</section>
    <section class="card"><h2>Intrants utilis\xE9s</h2>${hbars(intrantsUtilises, C.green)}</section>
  </div>
  <section class="card"><h2>Visites par mois</h2>${barChart({ labels: MOIS, series: [{ name: "Visites", color: C.green, values: visitesParMois }], fmt: (valeur) => n(valeur, 1), h: 170, title: "Visites par mois" })}</section>
  <section class="card"><h2>Pots vendus par mois</h2>${barChart({ labels: MOIS, series: [{ name: "Pots", color: C.honey, values: finances.mPots }], fmt: (valeur) => n(valeur, 1), h: 170, title: "Pots vendus par mois" })}</section>
  ${
    autonomie.length
      ? `<section class="card tbl"><h2>Autonomie des consommables</h2>${table(
          ["Article", "#Stock", "#Conso/mois", "#Autonomie"],
          autonomie.map(
            (ligne) =>
              `<tr><td>${esc(ligne.a.nom)}</td><td class="num">${n(ligne.a.stock)} ${esc(ligne.a.unite)}</td><td class="num">${n(ligne.cons)} ${esc(ligne.a.unite)}</td><td class="num">${n(ligne.mois)} mois</td></tr>`,
          ),
          "",
        )}</section>`
      : ""
  }`;
}
function viewPilotage() {
  const vide =
    !S.d.ventes.length && !S.d.depenses.length && !S.d.recoltes.length && !S.d.visites.length;
  shell(
    "Pilotage",
    "Vos chiffres financiers et op\xE9rationnels",
    yearSel(),
    subtabs(
      [
        ["fin", "Financier"],
        ["ops", "Op\xE9rationnel"],
      ],
      S.tab,
      "ptab",
    ) +
      (vide
        ? '<p class="notice">Les graphiques se rempliront avec vos r\xE9coltes, ventes, d\xE9penses et visites.</p>'
        : "") +
      (S.tab === "fin" ? pilotFin() : pilotOps()),
  );
}
function simDefaults() {
  const e = S.d,
    t = cfg(),
    s = fin(new Date().getFullYear()),
    i = e.ruches.length || 1,
    a = (l) => e.lots.find((r) => r.format_g === l),
    o = sum(e.lots, (l) => l.pots_initiaux) || 0;
  return {
    ruches: i,
    ajout: 0,
    rendement: s.kgRec && e.ruches.length ? Math.round((s.kgRec / i) * 10) / 10 : 12,
    part500: 50,
    prix500: Number(a(500)?.prix) || 14,
    prix250: Number(a(250)?.prix) || 8,
    vendu: 100,
    coutRuche: s.charges && e.ruches.length && o === 0 ? Math.round(s.charges / i) : 50,
    coutPot: 0.6,
    coutNouvelle: 200,
    ...(t.sim || {}),
  };
}
function simCalc(e) {
  const t = [0, 1, 2, 3].map((l) => {
    const r = e.ruches + l * e.ajout,
      b = r * e.rendement,
      m = (b * e.vendu) / 100,
      $ = (m * e.part500) / 100,
      p = m - $,
      v = $ / 0.5,
      f = p / 0.25,
      g = v * e.prix500 + f * e.prix250,
      w = r * e.coutRuche + (v + f) * e.coutPot + (l > 0 ? e.ajout * e.coutNouvelle : 0);
    return {
      an: new Date().getFullYear() + 1 + l,
      ruches: r,
      kg: b,
      pots: v + f,
      pots5: v,
      pots2: f,
      ca: g,
      charges: w,
      res: g - w,
    };
  });
  let s = 0;
  t.forEach((l) => {
    ((s += l.res), (l.cum = s));
  });
  const i = t[0],
    a = i.ruches ? i.res / i.ruches : 0,
    o = i.ca > 0 ? i.charges / i.ca : null;
  return { rows: t, parRuche: a, seuil: o };
}
function simOut() {
  const e = S.sim,
    t = cfg(),
    s = simCalc(e),
    i = s.rows[0],
    a = Number(t.objectif) || 0,
    o = a > 0 && s.parRuche > 0 ? Math.ceil(a / s.parRuche) : null,
    l = s.rows.map(
      (r) =>
        `<tr><td>${r.an}</td><td class="num">${n(r.ruches, 0)}</td><td class="num">${n(r.kg, 0)} kg</td><td class="num">${n(r.pots, 0)}</td><td class="num">${eur0(r.ca)}</td><td class="num">${eur0(r.charges)}</td><td class="num"><b>${eur0(r.res)}</b></td></tr>`,
    );
  return `<div class="grid">
    ${kpi("Miel pr\xE9vu", n(i.kg, 0) + " kg", `${n(i.pots5, 0)} pots 500 g \xB7 ${n(i.pots2, 0)} pots 250 g`)}
    ${kpi("Ventes pr\xE9vues", eur0(i.ca), "")}
    ${kpi("R\xE9sultat pr\xE9vu", eur0(i.res), eur0(s.parRuche) + " par ruche", i.res < 0 ? "crit" : "good")}
    ${kpi("Point mort", s.seuil !== null ? n(s.seuil * 100, 0) + " %" : "\u2013", "des ventes pr\xE9vues pour couvrir les co\xFBts")}
    ${o !== null ? kpi("Pour viser " + eur0(a), o + " ruches", "avec ces hypoth\xE8ses") : ""}
  </div>
  <section class="card"><h2>Projection sur 4 ans</h2>${barChart({
    labels: s.rows.map((r) => String(r.an)),
    series: [
      { name: "Ventes", color: C.honey, values: s.rows.map((r) => r.ca) },
      { name: "Co\xFBts", color: C.blue, values: s.rows.map((r) => r.charges) },
    ],
    title: "Projection des ventes et co\xFBts",
    h: 190,
  })}</section>
  <section class="card tbl">${table(["Ann\xE9e", "#Ruches", "#Miel", "#Pots", "#Ventes", "#Co\xFBts", "#R\xE9sultat"], l, "")}</section>`;
}
function viewPrevisions() {
  S.sim = S.sim || simDefaults();
  const e = S.d,
    t = S.annee,
    s = fin(t),
    i = cfg(),
    a = S.sim,
    o = (p, v, f = "1", g = "") =>
      `<label>${v}${g ? ` (${g})` : ""}<input type="number" step="${f}" min="0" inputmode="decimal" data-sim="${p}" value="${esc(a[p])}"></label>`,
    l = ["Ventes de miel", ...i.postes],
    r = (p) => Number(e.budgets.find((v) => v.annee === t && v.poste === p)?.montant || 0),
    b = (p) =>
      p === "Ventes de miel"
        ? s.ca
        : sum(
            s.dep.filter((v) => v.categorie === p),
            (v) => v.montant,
          ),
    m = l.map((p) => {
      const v = r(p),
        f = b(p),
        g = v ? Math.round((f / v) * 100) : 0,
        w = p !== "Ventes de miel" && v && f > v;
      return `<tr><td><button class="link" data-act="editbudget" data-v="${esc(p)}">${esc(p)}</button></td><td class="num">${v ? eur0(v) : "\xC0 d\xE9finir"}</td><td class="num">${eur0(f)}</td><td class="num ${w ? "crit" : ""}">${v ? g + " %" : "\u2013"}</td></tr>`;
    }),
    $ = sum(l.slice(1), r);
  shell(
    "Pr\xE9visions",
    "Testez vos hypoth\xE8ses et suivez votre budget",
    yearSel(),
    `
    <section class="card"><h2>Simulateur</h2><p class="small">Changez une valeur : tout se recalcule. Les valeurs de d\xE9part sont des exemples tant que vos donn\xE9es sont incompl\xE8tes.</p>
      <div class="simgrid">
        ${o("ruches", "Ruches")}${o("ajout", "Ruches ajout\xE9es par an")}${o("rendement", "Rendement", "0.5", "kg/ruche")}${o("vendu", "Part du miel vendue", "5", "%")}
        ${o("part500", "Part en pots de 500 g", "5", "%")}${o("prix500", "Prix pot 500 g", "0.5", "\u20AC")}${o("prix250", "Prix pot 250 g", "0.5", "\u20AC")}
        ${o("coutRuche", "Co\xFBt annuel par ruche", "5", "\u20AC")}${o("coutPot", "Co\xFBt par pot", "0.05", "\u20AC")}${o("coutNouvelle", "Co\xFBt d\u2019une nouvelle ruche", "10", "\u20AC")}
      </div>
      <div class="actions" style="margin-top:12px"><button class="btn" data-act="savesim">Enregistrer ces hypoth\xE8ses</button><button class="btn" data-act="resetsim">Revenir aux valeurs calcul\xE9es</button></div>
    </section>
    <div id="simOut" class="stack">${simOut()}</div>
    <section class="card tbl"><h2>Budget ${t}</h2><p class="small pad">Touchez un poste pour d\xE9finir son montant. Budget de d\xE9penses : ${eur0($)}. R\xE9sultat budg\xE9t\xE9 : ${eur0(r("Ventes de miel") - $)}.</p>${table(["Poste", "#Budget", "#R\xE9alis\xE9", "#Avancement"], m, "")}</section>`,
  );
}
function taskRow(e) {
  const t = !e.faite && e.echeance && e.echeance < today(),
    s = e.ruche_id ? byId(S.d.ruches, e.ruche_id)?.nom : "";
  return `<div class="task ${e.faite ? "done" : ""}"><button class="check" role="checkbox" aria-checked="${e.faite}" aria-label="Marquer ${esc(e.titre)}" data-act="toggletache" data-v="${e.id}">${e.faite ? "\u2713" : ""}</button><button class="tmain" data-act="edittache" data-v="${e.id}"><b>${esc(e.titre)}</b><span class="small ${t ? "crit" : ""}">${[e.echeance ? dfr(e.echeance) : "Sans date", s, e.assigne].filter(Boolean).map(esc).join(" \xB7 ")}</span></button></div>`;
}
function viewAgenda() {
  const e = S.d,
    t = e.taches
      .filter((l) => !l.faite)
      .sort((l, r) => (l.echeance || "9").localeCompare(r.echeance || "9")),
    s = e.taches.filter((l) => l.faite).slice(0, 8),
    i = new Set(t.map((l) => l.titre)),
    a = new Date().getMonth(),
    o = SAISON[a].filter((l) => !i.has(l));
  shell(
    "Agenda",
    "T\xE2ches \xE0 faire et id\xE9es de saison",
    '<button class="btn main" data-act="newtache">Ajouter une t\xE2che</button>' +
      (typeof RP != "undefined" ? RP.bouton() : ""),
    `
    <section class="card"><h2>\xC0 faire</h2>${t.map(taskRow).join("") || '<p class="small">Aucune t\xE2che pr\xE9vue.</p>'}</section>
    ${o.length ? `<section class="card"><h2>Id\xE9es pour ${esc(new Date().toLocaleDateString("fr-FR", { month: "long" }))}</h2><p class="small">\xC0 adapter \xE0 votre r\xE9gion et \xE0 vos protocoles.</p><div class="chips">${o.map((l) => `<button data-act="addsug" data-v="${esc(l)}">+ ${esc(l)}</button>`).join("")}</div></section>` : ""}
    ${s.length ? `<section class="card"><h2>Termin\xE9es</h2>${s.map(taskRow).join("")}</section>` : ""}`,
  );
}
function viewReglages() {
  const e = cfg();
  shell(
    "R\xE9glages",
    "Adaptez Apidoo \xE0 votre exploitation",
    "",
    `
    <form data-form="reglages" class="form">
      <section class="card stack">
        <h2>Votre exploitation</h2>${typeof EX != "undefined" ? '<button type="button" class="link" data-act="go" data-v="membres">Membres, invitations et autres exploitations</button>' : ""}
        <label>Nom<input name="nom" value="${esc(e.nom)}" required></label>
        <label>Num\xE9ro d\u2019apiculteur (NAPI)<input name="napi" value="${esc(e.napi)}"></label>
        <label>Adresse (pour les \xE9tiquettes)<textarea name="adresse" rows="2" placeholder="Rue, code postal, commune">${esc(e.adresse || "")}</textarea></label>
        <label>Origine du miel<input name="origine" value="${esc(e.origine || "France")}"></label>
        <label>Objectif de r\xE9sultat annuel (\u20AC)<input name="objectif" type="number" min="0" step="10" value="${esc(e.objectif || "")}"></label>
      </section>
      <section class="card stack">
        <h2>Vos listes</h2><p class="small">Une valeur par ligne.</p>
        <label>Postes de d\xE9pense<textarea name="postes" rows="5">${esc(
          e.postes.join(`
`),
        )}</textarea></label>
        <label>Cercles de clients<textarea name="cercles" rows="4">${esc(
          e.cercles.join(`
`),
        )}</textarea></label>
        <label>Modes de paiement<textarea name="modes" rows="4">${esc(
          e.modes.join(`
`),
        )}</textarea></label>
      </section>
      <button class="btn main block">Enregistrer</button>
    </form>
    <section class="card form stack">
      <h2>Exports et sauvegarde</h2><p class="small">Fichiers lisibles dans Excel, \xE0 garder de votre c\xF4t\xE9.</p>
      <div class="actions"><button class="btn" data-act="exp" data-v="visites">Journal des visites</button><button class="btn" data-act="exp" data-v="ventes">Ventes</button><button class="btn" data-act="exp" data-v="depenses">D\xE9penses</button><button class="btn" data-act="exp" data-v="clients">Clients</button><button class="btn" data-act="exp" data-v="json">Sauvegarde compl\xE8te</button></div>
    </section>`,
  );
}
function render() {
  if (S.recovery || !S.session) return authView();
  if (S.member === !1) {
    if (typeof EX != "undefined") return EX.accueil();
    $app.innerHTML = `<div class="auth"><form><div class="brand"><img src="logo-apidoo.svg" alt="Apidoo" height="38"></div><p>Cette adresse (${esc(S.session.user.email)}) n\u2019a pas encore acc\xE8s aux donn\xE9es.</p><button type="button" class="btn" data-act="logout">Se d\xE9connecter</button></form></div>`;
    return;
  }
  if (!S.d) {
    $app.innerHTML =
      '<div class="loader" role="status" aria-label="Chargement"><img src="symbole-apidoo.svg" alt=""></div>';
    return;
  }
  const e = {
    dash: viewDash,
    plus: viewPlus,
    agenda: viewAgenda,
    ruches: viewRuches,
    ruche: viewRuche,
    visite: viewVisite,
    miel: viewMiel,
    materiel: viewMateriel,
    clients: viewClients,
    vente: viewVente,
    fournisseurs: viewFournisseurs,
    compta: viewCompta,
    pilotage: viewPilotage,
    previsions: viewPrevisions,
    reglages: viewReglages,
    registre: () => RG.vue(),
    membres: () => EX.vue(),
  }[S.route];
  (e(),
    S.lastRoute !== S.route &&
      (window.scrollTo?.(0, 0), document.querySelector(".wrap")?.classList.add("enter")),
    (S.lastRoute = S.route));
}
function sheet({
  title: e,
  intro: t,
  fields: s,
  submit: i,
  label: a = "Enregistrer",
  del: o,
  delLabel: l,
}) {
  (($sheetForm.innerHTML = `<h2>${esc(e)}</h2>${t ? `<p class="small">${esc(t)}</p>` : ""}${s
    .map((r) => {
      const b = `name="${r.name}" ${r.required ? "required" : ""} ${r.step ? `step="${r.step}"` : ""} ${r.min !== void 0 ? `min="${r.min}"` : ""} ${r.list ? `list="dl_${r.name}"` : ""}`;
      let m;
      r.type === "select"
        ? (m = `<select ${b}>${r.options
            .map((p) => {
              const [v, f] = Array.isArray(p) ? p : [p, p];
              return `<option value="${esc(v)}" ${String(r.value ?? "") === String(v) ? "selected" : ""}>${esc(f)}</option>`;
            })
            .join("")}</select>`)
        : r.type === "textarea"
          ? (m = `<textarea ${b}>${esc(r.value)}</textarea>`)
          : (m = `<input type="${r.type || "text"}" ${b} value="${esc(r.value)}" ${r.type === "number" ? 'inputmode="decimal"' : ""} autocomplete="off">`);
      const $ = r.list
        ? `<datalist id="dl_${r.name}">${r.list.map((p) => `<option value="${esc(p)}">`).join("")}</datalist>`
        : "";
      return `<label>${esc(r.label)}${m}${$}</label>`;
    })
    .join("")}
  <div class="actions"><button class="btn main" style="flex:1">${esc(a)}</button><button type="button" class="btn" data-act="closesheet">Annuler</button></div>
  ${o ? `<button type="button" class="link crit" data-act="sheetdel">${esc(l || "Supprimer")}</button>` : ""}`),
    ($sheetForm.onsubmit = async (r) => {
      r.preventDefault();
      const b = $sheetForm.querySelector(".btn.main");
      b.disabled = !0;
      try {
        (await i(Object.fromEntries(new FormData($sheetForm))), $sheet.close());
      } catch (m) {
        (fail(m), (b.disabled = !1));
      }
    }),
    (sheet.del = o),
    $sheet.showModal());
}
const ruchers = () => [...new Set(S.d.ruches.map((e) => e.rucher).filter(Boolean))],
  fournOpts = () => [["", "Aucun"]].concat(S.d.fournisseurs.map((e) => [e.id, e.nom])),
  del = (e, t, s) => () => write(sb.from(e).delete().eq("id", t), s);
function ruchesForm() {
  sheet({
    title: "Ajouter des ruches",
    label: "Ajouter",
    fields: [
      {
        name: "nombre",
        label: "Nombre de ruches",
        type: "number",
        step: "1",
        min: 1,
        required: !0,
        value: 1,
      },
      { name: "prefixe", label: "Nom", required: !0, value: "Ruche" },
      { name: "rucher", label: "Rucher (facultatif)", list: ruchers() },
      {
        name: "type_ruche",
        label: "Type de ruche (facultatif)",
        list: ["Dadant 10 cadres", "Dadant 12 cadres", "Langstroth", "Warr\xE9"],
      },
    ],
    submit: (e) => {
      const t = Math.min(200, Number(e.nombre)),
        s = new Set(S.d.ruches.map((o) => o.nom)),
        i = [];
      let a = 1;
      for (; i.length < t;) {
        const o = t === 1 && !s.has(e.prefixe) ? e.prefixe : `${e.prefixe} ${a}`;
        (s.has(o) || (i.push({ nom: o, rucher: e.rucher, type_ruche: e.type_ruche }), s.add(o)),
          a++);
      }
      return write(
        sb.from("ruches").insert(i),
        t > 1 ? t + " ruches ajout\xE9es" : "Ruche ajout\xE9e",
      );
    },
  });
}
function rucheForm(e) {
  sheet({
    title: "Modifier la ruche",
    fields: [
      { name: "nom", label: "Nom", required: !0, value: e.nom },
      { name: "rucher", label: "Rucher", value: e.rucher, list: ruchers() },
      {
        name: "type_ruche",
        label: "Type de ruche",
        value: e.type_ruche,
        list: ["Dadant 10 cadres", "Dadant 12 cadres", "Langstroth", "Warr\xE9"],
      },
      { name: "annee_reine", label: "Ann\xE9e de la reine", type: "number", value: e.annee_reine },
      {
        name: "date_installation",
        label: "Date d\u2019installation",
        type: "date",
        value: e.date_installation,
      },
      { name: "etat", label: "\xC9tat", type: "select", options: ETATS, value: e.etat },
      { name: "notes", label: "Notes", type: "textarea", value: e.notes },
    ],
    submit: (t) =>
      write(
        sb
          .from("ruches")
          .update({
            ...t,
            annee_reine: num(t.annee_reine),
            date_installation: orNull(t.date_installation),
          })
          .eq("id", e.id),
        "Ruche enregistr\xE9e",
      ),
    del: async () => {
      ((S.route = "ruches"), await del("ruches", e.id, "Ruche supprim\xE9e")());
    },
    delLabel: "Supprimer la ruche et ses visites",
  });
}
function lotForm(e) {
  const t = String(new Date().getFullYear()).slice(2);
  sheet({
    title: e ? "Modifier le lot" : "Nouveau lot",
    fields: [
      {
        name: "code",
        label: "Num\xE9ro de lot",
        required: !0,
        value: e?.code || `L${t}-${String(S.d.lots.length + 1).padStart(2, "0")}`,
      },
      { name: "miel", label: "Miel", required: !0, value: e?.miel || "Toutes fleurs" },
      {
        name: "format_g",
        label: "Format du pot (g)",
        type: "number",
        step: "1",
        min: 1,
        required: !0,
        value: e?.format_g || 500,
        list: [125, 250, 500, 1e3],
      },
      {
        name: "prix",
        label: "Prix du pot (\u20AC)",
        type: "number",
        step: "0.01",
        min: 0,
        required: !0,
        value: e?.prix,
      },
      {
        name: "pots_initiaux",
        label: "Nombre de pots remplis",
        type: "number",
        step: "1",
        min: e?.pots_vendus || 0,
        required: !0,
        value: e?.pots_initiaux,
      },
      {
        name: "date_mise_en_pot",
        label: "Mise en pot",
        type: "date",
        value: e?.date_mise_en_pot || today(),
      },
      { name: "ddm", label: "Date de durabilit\xE9 minimale (DDM)", type: "date", value: e?.ddm },
    ],
    submit: (s) => {
      const i = {
        ...s,
        format_g: num(s.format_g),
        prix: num(s.prix),
        pots_initiaux: num(s.pots_initiaux),
        date_mise_en_pot: orNull(s.date_mise_en_pot),
        ddm: orNull(s.ddm),
      };
      return write(
        e ? sb.from("lots").update(i).eq("id", e.id) : sb.from("lots").insert(i),
        "Lot enregistr\xE9",
      );
    },
    del: e ? del("lots", e.id, "Lot supprim\xE9") : null,
  });
}
function articleForm(e, t) {
  const s = e?.type || t || "Consommable",
    i = !!e?.id;
  sheet({
    title: i ? "Modifier l\u2019article" : "Ajouter un article",
    fields: [
      { name: "nom", label: "Nom", required: !0, value: e?.nom },
      {
        name: "type",
        label: "Type",
        type: "select",
        options: ["Consommable", "\xC9quipement"],
        value: s,
      },
      {
        name: "unite",
        label: "Unit\xE9",
        required: !0,
        value: e?.unite || "unit\xE9",
        list: ["kg", "L", "unit\xE9", "feuille", "bo\xEEte"],
      },
      {
        name: "stock",
        label: "Quantit\xE9",
        type: "number",
        step: "0.01",
        min: 0,
        required: !0,
        value: e?.stock ?? 0,
      },
      {
        name: "seuil",
        label: "Seuil d\u2019alerte",
        type: "number",
        step: "0.01",
        min: 0,
        required: !0,
        value: e?.seuil ?? 0,
      },
      {
        name: "valeur",
        label: "Prix unitaire (\u20AC, facultatif)",
        type: "number",
        step: "0.01",
        min: 0,
        value: e?.valeur,
      },
      {
        name: "fournisseur_id",
        label: "Fournisseur",
        type: "select",
        options: fournOpts(),
        value: e?.fournisseur_id || "",
      },
    ],
    submit: (a) => {
      const o = {
        ...a,
        stock: num(a.stock),
        seuil: num(a.seuil),
        valeur: num(a.valeur),
        fournisseur_id: orNull(a.fournisseur_id),
      };
      return write(
        i ? sb.from("articles").update(o).eq("id", e.id) : sb.from("articles").insert(o),
        "Article enregistr\xE9",
      );
    },
    del: i ? del("articles", e.id, "Article supprim\xE9") : null,
  });
}
function clientForm(e) {
  const t = S.route === "vente";
  sheet({
    title: e ? "Modifier le client" : "Ajouter un client",
    fields: [
      { name: "nom", label: "Nom", required: !0, value: e?.nom },
      {
        name: "cercle",
        label: "Cercle",
        type: "select",
        options: cfg().cercles,
        value: e?.cercle || cfg().cercles[0],
      },
      { name: "telephone", label: "T\xE9l\xE9phone", type: "tel", value: e?.telephone },
      { name: "email", label: "E-mail", type: "email", value: e?.email },
      { name: "notes", label: "Notes", type: "textarea", value: e?.notes },
    ],
    submit: async (s) => {
      if (e) return write(sb.from("clients").update(s).eq("id", e.id), "Client enregistr\xE9");
      const { data: i, error: a } = await sb.from("clients").insert(s).select().single();
      if (a) throw a;
      (t && (S.vente.client_id = i.id), await refresh(), toast("Client enregistr\xE9"));
    },
    del: e ? del("clients", e.id, "Client supprim\xE9") : null,
  });
}
function fournisseurForm(e) {
  sheet({
    title: e ? "Modifier le fournisseur" : "Ajouter un fournisseur",
    fields: [
      { name: "nom", label: "Nom", required: !0, value: e?.nom },
      { name: "produits", label: "Produits", value: e?.produits },
      { name: "contact", label: "Contact", value: e?.contact },
      { name: "telephone", label: "T\xE9l\xE9phone", type: "tel", value: e?.telephone },
      { name: "email", label: "E-mail", type: "email", value: e?.email },
      { name: "notes", label: "Notes", type: "textarea", value: e?.notes },
    ],
    submit: (t) =>
      write(
        e ? sb.from("fournisseurs").update(t).eq("id", e.id) : sb.from("fournisseurs").insert(t),
        "Fournisseur enregistr\xE9",
      ),
    del: e ? del("fournisseurs", e.id, "Fournisseur supprim\xE9") : null,
  });
}
function depenseForm(e, t = {}) {
  const s = cfg();
  sheet({
    title: e ? "Modifier la d\xE9pense" : "Ajouter une d\xE9pense",
    fields: [
      { name: "libelle", label: "Libell\xE9", required: !0, value: e?.libelle ?? t.libelle },
      {
        name: "categorie",
        label: "Poste",
        type: "select",
        options: [...new Set([...s.postes, ...(e ? [e.categorie] : [])])],
        value: e?.categorie ?? s.postes[0],
      },
      {
        name: "montant",
        label: "Montant (\u20AC)",
        type: "number",
        step: "0.01",
        min: 0,
        required: !0,
        value: e?.montant,
      },
      {
        name: "date_depense",
        label: "Date",
        type: "date",
        required: !0,
        value: e?.date_depense || today(),
      },
      {
        name: "fournisseur_id",
        label: "Fournisseur",
        type: "select",
        options: fournOpts(),
        value: e?.fournisseur_id ?? t.fournisseur_id ?? "",
      },
    ],
    submit: (i) => {
      const a = { ...i, montant: num(i.montant), fournisseur_id: orNull(i.fournisseur_id) };
      return write(
        e ? sb.from("depenses").update(a).eq("id", e.id) : sb.from("depenses").insert(a),
        "D\xE9pense enregistr\xE9e",
      );
    },
    del: e ? del("depenses", e.id, "D\xE9pense supprim\xE9e") : null,
  });
}
function tacheForm(e, t) {
  sheet({
    title: e ? "Modifier la t\xE2che" : "Ajouter une t\xE2che",
    fields: [
      { name: "titre", label: "T\xE2che", required: !0, value: e?.titre },
      { name: "echeance", label: "\xC9ch\xE9ance", type: "date", value: e?.echeance },
      {
        name: "ruche_id",
        label: "Ruche",
        type: "select",
        options: [["", "Toutes"]].concat(S.d.ruches.map((s) => [s.id, s.nom])),
        value: e?.ruche_id ?? t ?? "",
      },
      { name: "assigne", label: "Qui s\u2019en occupe", value: e?.assigne },
    ],
    submit: (s) => {
      const i = { ...s, echeance: orNull(s.echeance), ruche_id: orNull(s.ruche_id) };
      return write(
        e ? sb.from("taches").update(i).eq("id", e.id) : sb.from("taches").insert(i),
        "T\xE2che enregistr\xE9e",
      );
    },
    del: e ? del("taches", e.id, "T\xE2che supprim\xE9e") : null,
  });
}
function recolteForm(e) {
  sheet({
    title: e ? "Modifier la r\xE9colte" : "Saisir une r\xE9colte",
    fields: [
      {
        name: "ruche_id",
        label: "Origine",
        type: "select",
        options: [["", "Toutes les ruches"]].concat(S.d.ruches.map((t) => [t.id, t.nom])),
        value: e?.ruche_id ?? "",
      },
      {
        name: "kg",
        label: "Quantit\xE9 (kg)",
        type: "number",
        step: "0.1",
        min: 0.1,
        required: !0,
        value: e?.kg,
      },
      {
        name: "date_recolte",
        label: "Date",
        type: "date",
        required: !0,
        value: e?.date_recolte || today(),
      },
    ],
    submit: (t) => {
      const s = { ...t, ruche_id: orNull(t.ruche_id), kg: num(t.kg) };
      return write(
        e ? sb.from("recoltes").update(s).eq("id", e.id) : sb.from("recoltes").insert(s),
        "R\xE9colte enregistr\xE9e",
      );
    },
    del: e ? del("recoltes", e.id, "R\xE9colte supprim\xE9e") : null,
  });
}
function download(e, t, s) {
  const i = document.createElement("a");
  ((i.href = URL.createObjectURL(new Blob([t], { type: s }))),
    (i.download = e),
    document.body.appendChild(i),
    i.click(),
    i.remove(),
    setTimeout(() => URL.revokeObjectURL(i.href), 2e3));
}
function csv(e, t, s) {
  const i = (a) => `"${String(a ?? "").replace(/"/g, '""')}"`;
  download(
    `apidoo-${e}-${today()}.csv`,
    "\uFEFF" +
      [t, ...s].map((a) => a.map(i).join(";")).join(`\r
`),
    "text/csv;charset=utf-8",
  );
}
const EXP = {
    visites: () => {
      const e = S.d;
      csv(
        "visites",
        [
          "Date",
          "Ruche",
          "Rucher",
          "Activit\xE9",
          "Provisions",
          "Reine",
          "Couvain",
          "Poids kg",
          "Varroa",
          "Intrants",
          "Note",
          "Auteur",
        ],
        e.visites.map((t) => {
          const s = byId(e.ruches, t.ruche_id);
          return [
            t.date_visite,
            s?.nom,
            s?.rucher,
            t.activite,
            t.provisions,
            t.reine,
            t.couvain,
            t.poids_kg,
            t.varroa,
            e.intrants
              .filter((i) => i.visite_id === t.id)
              .map((i) => {
                const a = byId(e.articles, i.article_id);
                return `${i.quantite} ${a?.unite} ${a?.nom}`;
              })
              .join(", "),
            t.note,
            t.auteur,
          ];
        }),
      );
    },
    ventes: () => {
      const e = S.d;
      csv(
        "ventes",
        [
          "Date",
          "Client",
          "Lot",
          "Format g",
          "Quantit\xE9",
          "Prix unitaire",
          "Montant",
          "Pay\xE9e",
          "Mode",
        ],
        e.lignes.map((t) => {
          const s = byId(e.ventes, t.vente_id),
            i = byId(e.lots, t.lot_id);
          return [
            s?.date_vente,
            byId(e.clients, s?.client_id)?.nom,
            i?.code,
            i?.format_g,
            t.quantite,
            t.prix_unitaire,
            t.quantite * t.prix_unitaire,
            s?.paye ? "Oui" : "Non",
            s?.mode,
          ];
        }),
      );
    },
    depenses: () => {
      const e = S.d;
      csv(
        "depenses",
        ["Date", "Libell\xE9", "Poste", "Fournisseur", "Montant"],
        e.depenses.map((t) => [
          t.date_depense,
          t.libelle,
          t.categorie,
          byId(e.fournisseurs, t.fournisseur_id)?.nom,
          t.montant,
        ]),
      );
    },
    clients: () =>
      csv(
        "clients",
        ["Nom", "Cercle", "T\xE9l\xE9phone", "E-mail", "Notes"],
        S.d.clients.map((e) => [e.nom, e.cercle, e.telephone, e.email, e.notes]),
      ),
    json: () =>
      download(
        `apidoo-sauvegarde-${today()}.json`,
        JSON.stringify(S.d, null, 1),
        "application/json",
      ),
  },
  go = (e) => {
    ((S.route = e), render());
  };
function readVisitForm() {
  const e = document.getElementById("v_date");
  e &&
    ((S.visite.date_visite = e.value),
    (S.visite.poids_kg = document.getElementById("v_poids").value),
    (S.visite.varroa = document.getElementById("v_varroa").value),
    (S.visite.note = document.getElementById("v_note").value),
    typeof RG != "undefined" && RG.lire());
}
function readSaleForm() {
  const e = document.getElementById("s_client");
  e && (S.vente.client_id = e.value);
  const t = document.getElementById("s_date");
  t && (S.vente.date_vente = t.value);
  const s = document.getElementById("s_mode");
  s && (S.vente.mode = s.value);
}
const twoStep = async (e, t, s) => {
  if (e.dataset.armed) {
    e.disabled = !0;
    try {
      await s();
    } catch (a) {
      (fail(a), (e.disabled = !1));
    }
    return;
  }
  const i = e.textContent;
  ((e.dataset.armed = "1"),
    (e.textContent = t),
    setTimeout(() => {
      e.isConnected && (delete e.dataset.armed, (e.textContent = i));
    }, 4e3));
};
function quickSheet() {
  const e = [
    ["newvisite", "Visite"],
    ["newvente", "Vente"],
    ["newrecolte", "R\xE9colte"],
    ["newdepense", "D\xE9pense"],
    ["newtache", "T\xE2che"],
    ["newclient", "Client"],
  ];
  (($sheetForm.onsubmit = (t) => t.preventDefault()),
    ($sheetForm.innerHTML = `<h2>Ajouter</h2><div class="quick">${e.map(([t, s]) => `<button type="button" class="btn" data-act="qk" data-v="${t}">${s}</button>`).join("")}</div><button type="button" class="btn" data-act="closesheet">Annuler</button>`),
    $sheet.showModal());
}
const ACT = {
  go: (e) => go(e),
  gomateriel: () => go("materiel"),
  authmode: (e) => {
    ((S.authMode = e), (S.authMsg = ""), authView());
  },
  logout: async () => {
    await sb.auth.signOut();
  },
  ruche: (e) => {
    ((S.ruche = e), go("ruche"));
  },
  cancel: () => go("dash"),
  quick: () => quickSheet(),
  qk: (e) => {
    ($sheet.close(), ACT[e]());
  },
  closesheet: () => $sheet.close(),
  sheetdel: (e, t, s) =>
    twoStep(s, "Confirmer la suppression", async () => {
      (await sheet.del(), $sheet.close());
    }),
  newvisite: (e) => {
    if (!S.d.ruches.length) return (toast("Ajoutez d\u2019abord une ruche", !0), go("ruches"));
    const t = e || (S.ruche && byId(S.d.ruches, S.ruche)?.id) || S.d.ruches[0].id;
    ((S.visite = {
      ruche_id: t,
      date_visite: today(),
      activite: "Normale",
      provisions: "Moyennes",
      reine: "Non cherch\xE9e",
      couvain: "Non vu",
      etat: byId(S.d.ruches, t).etat,
      poids_kg: "",
      varroa: "",
      note: "",
      q: {},
    }),
      go("visite"));
  },
  vset: (e, t) => {
    (readVisitForm(),
      (S.visite[t] = e),
      t === "ruche_id" && (S.visite.etat = byId(S.d.ruches, e).etat),
      viewVisite());
  },
  vstep: (e, t) => {
    readVisitForm();
    const s = byId(S.d.articles, t);
    ((S.visite.q[t] = Math.max(0, Math.min(Number(s.stock), (S.visite.q[t] || 0) + Number(e)))),
      viewVisite());
  },
  newvente: () => {
    ((S.vente = { client_id: "", date_vente: today(), q: {}, paye: !0, mode: cfg().modes[0] }),
      go("vente"));
  },
  sstep: (e, t) => {
    readSaleForm();
    const s = byId(S.d.lots, t);
    ((S.vente.q[t] = Math.max(0, Math.min(s.pots_restants, (S.vente.q[t] || 0) + Number(e)))),
      viewVente());
  },
  spaye: (e) => {
    (readSaleForm(), (S.vente.paye = e === "1"), viewVente());
  },
  vfiltre: (e) => {
    ((S.venteFiltre = e), viewClients());
  },
  togglepaye: async (e) => {
    const t = byId(S.d.ventes, e);
    await write(
      sb.from("ventes").update({ paye: !t.paye }).eq("id", e),
      t.paye ? "Vente \xE0 encaisser" : "Vente pay\xE9e",
    );
  },
  ptab: (e) => {
    ((S.tab = e), viewPilotage());
  },
  newruches: () => ruchesForm(),
  editruche: (e) => rucheForm(byId(S.d.ruches, e)),
  newlot: () => lotForm(),
  editlot: (e) => lotForm(byId(S.d.lots, e)),
  newarticle: () => articleForm(),
  editarticle: (e) => articleForm(byId(S.d.articles, e)),
  preset: (e, t) => {
    const s = PRESETS[t].find((i) => i[0] === e);
    return articleForm({ nom: s[0], unite: s[1], type: t, stock: 0, seuil: 0 });
  },
  newclient: () => {
    (S.route === "vente" && readSaleForm(), clientForm());
  },
  editclient: (e) => clientForm(byId(S.d.clients, e)),
  newfournisseur: () => fournisseurForm(),
  editfournisseur: (e) => fournisseurForm(byId(S.d.fournisseurs, e)),
  newrecolte: () => recolteForm(),
  editrecolte: (e) => recolteForm(byId(S.d.recoltes, e)),
  newdepense: () => depenseForm(),
  editdepense: (e) => depenseForm(byId(S.d.depenses, e)),
  newtache: (e) => tacheForm(null, e),
  edittache: (e) => tacheForm(byId(S.d.taches, e)),
  addsug: (e) => write(sb.from("taches").insert({ titre: e }), "T\xE2che ajout\xE9e"),
  toggletache: (e) => {
    const t = byId(S.d.taches, e);
    return write(
      sb
        .from("taches")
        .update({ faite: !t.faite, faite_le: t.faite ? null : today() })
        .eq("id", e),
    );
  },
  entree: (e) => {
    const t = byId(S.d.articles, e);
    sheet({
      title: "Entr\xE9e de stock : " + t.nom,
      label: "Ajouter",
      fields: [
        {
          name: "q",
          label: `Quantit\xE9 re\xE7ue (${t.unite})`,
          type: "number",
          step: "0.01",
          min: 0.01,
          required: !0,
        },
        {
          name: "cout",
          label: "Prix pay\xE9 (\u20AC, facultatif : cr\xE9e la d\xE9pense)",
          type: "number",
          step: "0.01",
          min: 0,
        },
      ],
      submit: async (s) => {
        const { error: i } = await sb
          .from("articles")
          .update({ stock: Number(t.stock) + num(s.q) })
          .eq("id", t.id);
        if (i) throw i;
        if (num(s.cout)) {
          const a = cfg(),
            o = /pot|couvercle|étiquette/i.test(t.nom)
              ? "Pots & \xE9tiquettes"
              : /candy|sirop/i.test(t.nom)
                ? "Alimentation"
                : /varroa/i.test(t.nom)
                  ? "Traitements"
                  : "Mat\xE9riel",
            l = await sb.from("depenses").insert({
              libelle: t.nom,
              categorie: a.postes.includes(o) ? o : a.postes[0],
              montant: num(s.cout),
              date_depense: today(),
              fournisseur_id: t.fournisseur_id,
            });
          if (l.error) throw l.error;
        }
        (await refresh(), toast("Stock mis \xE0 jour"));
      },
    });
  },
  editbudget: (e) => {
    const t = S.annee,
      s = S.d.budgets.find((i) => i.annee === t && i.poste === e);
    sheet({
      title: `${e} : budget ${t}`,
      fields: [
        {
          name: "montant",
          label: "Montant (\u20AC)",
          type: "number",
          step: "1",
          min: 0,
          required: !0,
          value: s?.montant,
        },
      ],
      submit: (i) =>
        write(
          sb.from("budgets").upsert({ annee: t, poste: e, montant: num(i.montant) }),
          "Budget enregistr\xE9",
        ),
    });
  },
  savesim: () => saveCfg({ sim: S.sim }, "Hypoth\xE8ses enregistr\xE9es"),
  resetsim: async () => {
    const e = { ...((S.d.reglages[0] || {}).data || {}) };
    (delete e.sim,
      (S.sim = null),
      await write(sb.from("reglages").update({ data: e }).eq("id", 1), "Valeurs recalcul\xE9es"));
  },
  exp: (e) => {
    (EXP[e](), toast("Fichier pr\xE9par\xE9"));
  },
  delvisite: (e, t, s) =>
    twoStep(
      s,
      "Confirmer",
      async () => (
        typeof PH != "undefined" && (await PH.oterVisite(e)),
        write(sb.from("visites").delete().eq("id", e), "Visite supprim\xE9e, stock r\xE9tabli")
      ),
    ),
  delvente: (e, t, s) =>
    twoStep(s, "Confirmer", () =>
      write(sb.from("ventes").delete().eq("id", e), "Vente supprim\xE9e, stock r\xE9tabli"),
    ),
};
(document.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-act]");
  if (!(!t || t.disabled)) {
    e.preventDefault();
    try {
      await ACT[t.dataset.act](t.dataset.v, t.dataset.k, t);
    } catch (s) {
      fail(s);
    }
  }
}),
  document.addEventListener("change", (e) => {
    e.target.dataset.chg === "annee" && ((S.annee = Number(e.target.value)), render());
  }),
  document.addEventListener("input", (e) => {
    const t = e.target.dataset.sim;
    t &&
      ((S.sim[t] = Number(e.target.value) || 0),
      (document.getElementById("simOut").innerHTML = simOut()));
  }));
const $tip = document.createElement("div");
(($tip.className = "tip"), ($tip.hidden = !0), document.body.appendChild($tip));
function showTip(e) {
  const t = e.target.closest?.("[data-tip]");
  if (!t) {
    $tip.hidden = !0;
    return;
  }
  (($tip.textContent = t.dataset.tip), ($tip.hidden = !1));
  const s = Math.min(e.clientX + 12, window.innerWidth - $tip.offsetWidth - 8);
  (($tip.style.left = Math.max(8, s) + "px"),
    ($tip.style.top = Math.max(8, e.clientY - $tip.offsetHeight - 10) + "px"));
}
(document.addEventListener("pointermove", showTip),
  document.addEventListener("pointerdown", showTip),
  document.addEventListener("submit", async (e) => {
    const t = e.target.dataset.form;
    if (t) {
      if ((e.preventDefault(), t === "auth")) return submitAuth(e.target);
      if (!S.busy)
        try {
          if (t === "visite" && typeof VR != "undefined") await VR.enregistrer();
          else if (t === "visite") {
            readVisitForm();
            const s = S.visite;
            if (!s.ruche_id) throw new Error("Choisissez une ruche");
            S.busy = !0;
            const i = Object.entries(s.q)
                .filter(([, o]) => o > 0)
                .map(([o, l]) => ({ article_id: o, quantite: l })),
              {
                data: vid,
                error: a,
                local: hl,
              } = await (typeof HL != "undefined" ? HL.rpc : (x, y) => sb.rpc(x, y))(
                "creer_visite",
                {
                  p: {
                    ...s,
                    q: void 0,
                    couvain: s.couvain === "Non vu" ? "" : s.couvain,
                    intrants: i,
                  },
                },
              );
            if (a) throw a;
            (typeof PH != "undefined" && (await PH.rattacher(vid)),
              typeof RG != "undefined" && (await RG.apres(s)),
              (S.ruche = s.ruche_id),
              (S.route = "ruche"),
              await refresh(),
              toast(hl ? "Visite gard\xE9e sur le t\xE9l\xE9phone" : "Visite enregistr\xE9e"));
          } else if (t === "vente") {
            readSaleForm();
            const s = S.vente;
            if (!s.client_id) throw new Error("Choisissez un client");
            const i = Object.entries(s.q)
              .filter(([, o]) => o > 0)
              .map(([o, l]) => ({ lot_id: o, quantite: l }));
            if (!i.length) throw new Error("Ajoutez au moins un pot");
            S.busy = !0;
            const { error: a, local: hl } = await (
              typeof HL != "undefined" ? HL.rpc : (x, y) => sb.rpc(x, y)
            )("creer_vente", {
              p: {
                client_id: s.client_id,
                date_vente: s.date_vente,
                lignes: i,
                paye: s.paye,
                mode: s.paye ? s.mode : "",
              },
            });
            if (a) throw a;
            ((S.route = "clients"),
              await refresh(),
              toast(hl ? "Vente gard\xE9e sur le t\xE9l\xE9phone" : "Vente enregistr\xE9e"));
          } else if (t === "reglages") {
            const s = e.target,
              i = (r) =>
                r.value
                  .split(
                    `
`,
                  )
                  .map((b) => b.trim())
                  .filter(Boolean),
              a = i(s.postes),
              o = i(s.cercles),
              l = i(s.modes);
            if (!a.length || !o.length || !l.length)
              throw new Error("Gardez au moins une valeur par liste");
            ((S.busy = !0),
              await saveCfg(
                {
                  nom: s.nom.value.trim(),
                  napi: s.napi.value.trim(),
                  adresse: (s.adresse?.value || "").trim(),
                  origine: (s.origine?.value || "").trim() || "France",
                  objectif: Number(s.objectif.value) || 0,
                  postes: a,
                  cercles: o,
                  modes: l,
                },
                "R\xE9glages enregistr\xE9s",
              ));
          }
        } catch (s) {
          fail(s);
        } finally {
          S.busy = !1;
        }
    }
  }),
  document.addEventListener("visibilitychange", () => {
    !document.hidden &&
      S.d &&
      !["visite", "vente", "previsions", "reglages"].includes(S.route) &&
      !$sheet.open &&
      refresh().catch(() => {});
  }));
async function boot() {
  const { data: e } = await sb.auth.getSession();
  if (
    ((S.session = e.session || (typeof HL != "undefined" ? HL.sessionLocale() : null)), !S.session)
  )
    return ((S.d = null), (S.member = null), render());
  render();
  try {
    ((S.member =
      typeof EX != "undefined"
        ? await EX.choisir()
        : await (async () => {
            const t = await sb.rpc("est_membre");
            return typeof HL != "undefined" && HL.reseau(t.error) ? HL.membre() : t.data === !0;
          })()),
      S.member && (await loadAll()));
  } catch (t) {
    fail(t);
  }
  render();
}
(sb.auth.onAuthStateChange((e) => {
  if (e === "PASSWORD_RECOVERY") {
    ((S.recovery = !0), render());
    return;
  }
  (e === "SIGNED_IN" && S.session) ||
    ((e === "SIGNED_IN" || e === "SIGNED_OUT") &&
      setTimeout(
        () =>
          document.readyState === "loading"
            ? addEventListener("DOMContentLoaded", () => boot(), { once: !0 })
            : boot(),
        0,
      ));
}),
  document.readyState === "loading" ? addEventListener("DOMContentLoaded", () => boot()) : boot());
