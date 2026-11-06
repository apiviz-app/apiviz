// Apidoo — cœur de l'application (app.js).
//
// Provenance : la source d'origine de ce fichier n'existe plus (décision D-01, 6 nov. 2026).
// Cette version lisible a été reconstituée en novembre 2026 (IT-00) à partir du fichier minifié publié
// (main, commit 965d24e) :
//   1. formatage par Prettier (réglages : .prettierrc) ;
//   2. renommage des variables LOCALES d'une lettre, écran par écran, par analyse des portées
//      (jamais par recherche de texte).
// Chaque étape a été contrôlée par comparaison automatique des arbres syntaxiques
// (scripts/comparer-ast.js) et par les 18 tests de bout en bout : le comportement est inchangé.
//
// À respecter en modifiant ce fichier :
// - Les modules chargés après lui (voir index.html et docs/TECHNIQUE.md) remplacent des fonctions par
//   « window.<nom> = … » (render, shell, view*, loadAll…). Cela ne marche que parce qu'elles sont
//   déclarées ici par « function <nom>() » au premier niveau. Ne jamais les transformer en const,
//   ni les renommer.
// - Les autres noms de premier niveau (S, sb, ACT, esc, n, eur, byId, sum, toast, fail…) sont utilisés
//   par ces modules : ne pas les renommer.
// - L'ordre des déclarations compte (écouteurs, bulle d'aide, boot() en dernier).
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
    nom: "", // AP-BUG-006 : jamais de nom codé en dur, voir cfg()
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
  // Formats : fonctions pures de src/noyau/format.js (IT-03, testées unitairement).
  { esc, n, eur, eur0, today, dfr, dshort, byId, sum, days, yr, mo, num, orNull } = Regles,
  etatClass = (etat) => (etat === "Bonne" ? "good" : etat === "Critique" ? "crit" : "watch"),
  // Nom affiché : celui des réglages, sinon celui de l'exploitation ouverte, sinon « Mon exploitation » (AP-BUG-006).
  nomExploitation = () =>
    (typeof EX != "undefined" && EX.liste().find((e) => e.id === EX.courante())?.nom) || "Mon exploitation",
  cfg = () => {
    const reglages = { ...DEF, ...((S.d?.reglages[0] || {}).data || {}) };
    return (String(reglages.nom || "").trim() || (reglages.nom = nomExploitation()), reglages);
  },
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
// ---------- Erreurs : message en français pour l'utilisateur, détail au journal (AP-FEAT-036) ----------
// Journal : console et 50 dernières entrées sur l'appareil (clé apidoo-journal, effacée à la déconnexion),
// plus une copie regroupée dans la table journal_erreurs (IT-03, src/noyau/erreurs.js).
function journaliser(type, detail) {
  const entree = {
    at: new Date().toISOString(),
    type,
    route: S.route,
    code: String(detail?.code || detail?.status || ""),
    message: String(detail?.message || detail || "").slice(0, 500),
    details: String(detail?.details || detail?.hint || "").slice(0, 500),
  };
  console.warn("[apidoo]", type, detail);
  // Copie au journal de production (IT-03, table journal_erreurs) : message nettoyé, sans e-mail ni donnée métier.
  try {
    const lieu = String(detail?.stack || "").match(/([\w.-]+\.js):(\d+):(\d+)/);
    window.Noyau?.journal.signaler(type, { ...entree, source: lieu ? lieu.slice(1).join(":") : "" });
  } catch {}
  try {
    const liste = JSON.parse(localStorage.getItem("apidoo-journal") || "[]");
    (liste.push(entree), localStorage.setItem("apidoo-journal", JSON.stringify(liste.slice(-50))));
  } catch {}
}
// Erreurs JavaScript non rattrapées : au journal seulement (l'écran n'en dit rien de plus).
(addEventListener("error", (evt) => journaliser("script", evt.error || evt.message)),
  addEventListener("unhandledrejection", (evt) => journaliser("promesse", evt.reason)));
// Identifiant tiré par l'application, pour rendre un appel idempotent.
const nouvelIdLocal = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
      );
// Codes Postgres (SQLSTATE) et PostgREST les plus courants -> ce que l'utilisateur doit comprendre et faire.
const ERREURS_FR = {
  42501: "Ton r\xF4le ne permet pas cette action.",
  23503: "Impossible : cet \xE9l\xE9ment est utilis\xE9 ailleurs dans l\u2019application.",
  23505: "Ce nom existe d\xE9j\xE0.",
  23502: "Un champ obligatoire est vide : compl\xE8te-le puis r\xE9essaie.",
  23514: "Une valeur n\u2019est pas accept\xE9e : v\xE9rifie les montants et les quantit\xE9s.",
  "22P02": "Une valeur saisie n\u2019a pas le bon format.",
  22003: "Un nombre saisi est trop grand.",
  22001: "Un texte saisi est trop long.",
  57014: "Le serveur a mis trop de temps \xE0 r\xE9pondre. R\xE9essaie dans un instant.",
  "42P01": "Cette action demande une mise \xE0 jour de la base de donn\xE9es : pr\xE9viens le responsable.",
  42883: "Cette action demande une mise \xE0 jour de la base de donn\xE9es : pr\xE9viens le responsable.",
  PGRST202: "Cette action demande une mise \xE0 jour de la base de donn\xE9es : pr\xE9viens le responsable.",
  PGRST116: "Cet \xE9l\xE9ment n\u2019existe plus : un autre membre l\u2019a peut-\xEAtre supprim\xE9.",
  PGRST301: "Ta session a expir\xE9 : reconnecte-toi.",
  PGRST303: "Ta session a expir\xE9 : reconnecte-toi.",
  // Codes de Supabase Auth (connexion, inscription, mot de passe).
  invalid_credentials: "E-mail ou mot de passe incorrect.",
  email_not_confirmed: "Confirme d\u2019abord ton adresse gr\xE2ce \xE0 l\u2019e-mail re\xE7u.",
  user_already_exists: "Ce compte existe d\xE9j\xE0.",
  email_exists: "Ce compte existe d\xE9j\xE0.",
  weak_password: "Mot de passe trop faible : 8 caract\xE8res au moins, en m\xE9langeant lettres et chiffres.",
  same_password: "Choisis un mot de passe diff\xE9rent de l\u2019ancien.",
  email_address_invalid: "Cette adresse e-mail n\u2019est pas valide.",
  over_email_send_rate_limit: "Trop d\u2019e-mails envoy\xE9s : attends quelques minutes avant de r\xE9essayer.",
  over_request_rate_limit: "Trop d\u2019essais : attends une minute avant de r\xE9essayer.",
  signup_disabled: "Les inscriptions sont ferm\xE9es pour le moment.",
  session_not_found: "Ta session a expir\xE9 : reconnecte-toi.",
  refresh_token_not_found: "Ta session a expir\xE9 : reconnecte-toi.",
};
const MESSAGE_PAR_DEFAUT =
  "Une erreur est survenue. R\xE9essaie ; si elle revient, note l\u2019heure et pr\xE9viens le responsable.";
const erreurReseau = (erreur) =>
  !!erreur &&
  /fetch|network|load failed|internet|offline|connexion|timed? ?out/i.test(String(erreur.message || erreur));
// Renvoie { texte, connu } : connu = faux si le message par défaut a remplacé une erreur technique.
function traduireErreur(erreur) {
  const message = String(erreur?.message || erreur || ""),
    code = String(erreur?.code || "");
  if (ERREURS_FR[code]) return { texte: ERREURS_FR[code], connu: !0 };
  // Messages écrits en français par nos fonctions SQL (raise exception) : affichés tels quels.
  if (code === "P0001" && message) return { texte: message, connu: !0 };
  if (erreurReseau(erreur))
    return { texte: "Pas de r\xE9seau : r\xE9essaie quand la connexion revient.", connu: !0 };
  if (/jwt expired|invalid jwt|refresh token|session.*(missing|expired)/i.test(message))
    return { texte: ERREURS_FR.PGRST301, connu: !0 };
  if (/row-level security|permission denied/i.test(message)) return { texte: ERREURS_FR[42501], connu: !0 };
  if (/foreign key/i.test(message)) return { texte: ERREURS_FR[23503], connu: !0 };
  if (/unique|duplicate/i.test(message)) return { texte: ERREURS_FR[23505], connu: !0 };
  if (AUTH_FR[message]) return { texte: AUTH_FR[message], connu: !0 };
  if (erreur?.status === 429) return { texte: ERREURS_FR.over_request_rate_limit, connu: !0 };
  // Erreur levée par l'application elle-même (new Error("Choisis une ruche")) : déjà en français.
  if (erreur instanceof Error && !code && erreur.name === "Error" && !erreur.status && message)
    return { texte: message, connu: !0 };
  // Réponse du serveur sans code (anciennes fonctions) : on garde le message s'il n'est pas technique.
  if (!code && message && !(erreur instanceof Error) && !/[a-z]+_[a-z]+|\bnull\b|syntax|relation|column/i.test(message))
    return { texte: message, connu: !0 };
  return { texte: MESSAGE_PAR_DEFAUT, connu: !1 };
}
const messageErreur = (erreur) => traduireErreur(erreur).texte;
function fail(erreur) {
  console.error(erreur);
  const { texte, connu } = traduireErreur(erreur);
  ((!connu || erreur?.code) && journaliser("erreur", erreur), toast(texte, !0));
}
// ---------- Lecture complète d'une table, page par page (AP-BUG-002) ----------
// L'API renvoie au plus « Max rows » lignes (1 000) par requête, sans erreur : on lit par tranches, avec un tri
// complété par une clé unique pour qu'aucune ligne ne soit sautée ni lue deux fois. Le total (count=exact)
// sert de garde-fou si le plafond du serveur est plus bas que PAGE.
const PAGE = 1e3,
  PAGES_MAX = 200,
  CLE_UNIQUE = { budgets: ["annee", "poste"], reglages: ["exploitation_id"] };
async function lireTout(nomTable, tri, croissant) {
  const lignes = [];
  let total = null;
  for (let page = 0; page < PAGES_MAX; page++) {
    let requete = sb.from(nomTable).select("*", page ? {} : { count: "exact" });
    (tri && (requete = requete.order(tri, { ascending: croissant !== !1 })),
      (CLE_UNIQUE[nomTable] || ["id"]).forEach((cle) => (requete = requete.order(cle, { ascending: !0 }))));
    const { data: tranche, error: erreur, count } = await requete.range(lignes.length, lignes.length + PAGE - 1);
    if (erreur) throw erreur;
    (page || (total = typeof count == "number" ? count : null), lignes.push(...tranche));
    if (total !== null ? lignes.length >= total : tranche.length < PAGE) return lignes;
    if (!tranche.length) break;
  }
  // Ne devrait jamais arriver : page vide avant le total annoncé, ou plus de PAGES_MAX pages.
  return (
    journaliser("lecture incomplete", { message: `${nomTable} : ${lignes.length} lignes lues sur ${total ?? "?"}` }),
    (S.lectureIncomplete = !0),
    lignes
  );
}
async function loadAll() {
  const cles = Object.keys(TABLES),
    tables = await Promise.all(cles.map((cle) => lireTout(...TABLES[cle]))),
    donnees = {};
  (tables.forEach((lignes, index) => (donnees[cles[index]] = lignes)),
    (S.d = donnees),
    typeof PH != "undefined" && (await PH.load()),
    S.lectureIncomplete &&
      ((S.lectureIncomplete = !1),
      toast("Une partie des donn\xE9es n\u2019a pas pu \xEAtre lue : recharge la page.", !0)));
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
// Réglages clé par clé (AP-BUG-005) : regler() fusionne en base, deux membres ne s'écrasent plus.
// Une valeur null retire la clé. Repli sur l'ancienne écriture si la migration 012 manque.
async function saveCfg(modifs, message) {
  const { error: erreur } = await sb.rpc("regler", { p_modifs: modifs });
  if (erreur && ["PGRST202", "42883"].includes(erreur.code)) {
    const donnees = { ...((S.d.reglages[0] || {}).data || {}), ...modifs };
    Object.keys(modifs).forEach((cle) => modifs[cle] === null && delete donnees[cle]);
    return write(sb.from("reglages").update({ data: donnees }).eq("id", 1), message);
  }
  if (erreur) throw erreur;
  (await refresh(), message && toast(message));
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
    ((S.authMsg = messageErreur(erreur)), traduireErreur(erreur).connu || journaliser("connexion", erreur));
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
// Coquille unique (IT-03) : les modules ne surchargent plus shell(), ils déclarent des crochets
// avantCoquille / apresCoquille (src/noyau/crochets.js), appelés ici dans un ordre fixe.
function shell(...args) {
  const C = window.Noyau?.crochets,
    a = C ? C.coquille("avantCoquille", args) : args;
  (coquilleDeBase(...a), C?.coquille("apresCoquille", a));
}
function coquilleDeBase(titre, sousTitre, boutons, contenu, surTitre) {
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
const niceMax = Regles.niceMax;
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
// Règles financières : src/domaines/finances/regles.js (IT-03, testées unitairement).
function stock() {
  return Regles.finances.stock(S.d);
}
const venteTotal = (vente) => Regles.finances.venteTotal(S.d, vente),
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
  return Regles.finances.fin(S.d, annee);
}
function rythme() {
  return Regles.finances.rythme(S.d);
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
  const donnees = S.d,
    reglages = cfg(),
    finances = fin(new Date().getFullYear()),
    nbRuches = donnees.ruches.length || 1,
    lotDuFormat = (format) => donnees.lots.find((lot) => lot.format_g === format),
    potsRemplis = sum(donnees.lots, (lot) => lot.pots_initiaux) || 0;
  return {
    ruches: nbRuches,
    ajout: 0,
    rendement:
      finances.kgRec && donnees.ruches.length
        ? Math.round((finances.kgRec / nbRuches) * 10) / 10
        : 12,
    part500: 50,
    prix500: Number(lotDuFormat(500)?.prix) || 14,
    prix250: Number(lotDuFormat(250)?.prix) || 8,
    vendu: 100,
    coutRuche:
      finances.charges && donnees.ruches.length && potsRemplis === 0
        ? Math.round(finances.charges / nbRuches)
        : 50,
    coutPot: 0.6,
    coutNouvelle: 200,
    ...(reglages.sim || {}),
  };
}
function simCalc(hyp) {
  const lignes = [0, 1, 2, 3].map((rang) => {
    const ruches = hyp.ruches + rang * hyp.ajout,
      kg = ruches * hyp.rendement,
      kgVendus = (kg * hyp.vendu) / 100,
      kg500 = (kgVendus * hyp.part500) / 100,
      kg250 = kgVendus - kg500,
      pots500 = kg500 / 0.5,
      pots250 = kg250 / 0.25,
      ca = pots500 * hyp.prix500 + pots250 * hyp.prix250,
      charges =
        ruches * hyp.coutRuche +
        (pots500 + pots250) * hyp.coutPot +
        (rang > 0 ? hyp.ajout * hyp.coutNouvelle : 0);
    return {
      an: new Date().getFullYear() + 1 + rang,
      ruches: ruches,
      kg: kg,
      pots: pots500 + pots250,
      pots5: pots500,
      pots2: pots250,
      ca: ca,
      charges: charges,
      res: ca - charges,
    };
  });
  let cumul = 0;
  lignes.forEach((ligne) => {
    ((cumul += ligne.res), (ligne.cum = cumul));
  });
  const premiere = lignes[0],
    parRuche = premiere.ruches ? premiere.res / premiere.ruches : 0,
    seuil = premiere.ca > 0 ? premiere.charges / premiere.ca : null;
  return { rows: lignes, parRuche: parRuche, seuil: seuil };
}
function simOut() {
  const hyp = S.sim,
    reglages = cfg(),
    calcul = simCalc(hyp),
    premiere = calcul.rows[0],
    objectif = Number(reglages.objectif) || 0,
    ruchesPourObjectif =
      objectif > 0 && calcul.parRuche > 0 ? Math.ceil(objectif / calcul.parRuche) : null,
    lignes = calcul.rows.map(
      (ligne) =>
        `<tr><td>${ligne.an}</td><td class="num">${n(ligne.ruches, 0)}</td><td class="num">${n(ligne.kg, 0)} kg</td><td class="num">${n(ligne.pots, 0)}</td><td class="num">${eur0(ligne.ca)}</td><td class="num">${eur0(ligne.charges)}</td><td class="num"><b>${eur0(ligne.res)}</b></td></tr>`,
    );
  return `<div class="grid">
    ${kpi("Miel pr\xE9vu", n(premiere.kg, 0) + " kg", `${n(premiere.pots5, 0)} pots 500 g \xB7 ${n(premiere.pots2, 0)} pots 250 g`)}
    ${kpi("Ventes pr\xE9vues", eur0(premiere.ca), "")}
    ${kpi("R\xE9sultat pr\xE9vu", eur0(premiere.res), eur0(calcul.parRuche) + " par ruche", premiere.res < 0 ? "crit" : "good")}
    ${kpi("Point mort", calcul.seuil !== null ? n(calcul.seuil * 100, 0) + " %" : "\u2013", "des ventes pr\xE9vues pour couvrir les co\xFBts")}
    ${ruchesPourObjectif !== null ? kpi("Pour viser " + eur0(objectif), ruchesPourObjectif + " ruches", "avec ces hypoth\xE8ses") : ""}
  </div>
  <section class="card"><h2>Projection sur 4 ans</h2>${barChart({
    labels: calcul.rows.map((ligne) => String(ligne.an)),
    series: [
      { name: "Ventes", color: C.honey, values: calcul.rows.map((ligne) => ligne.ca) },
      { name: "Co\xFBts", color: C.blue, values: calcul.rows.map((ligne) => ligne.charges) },
    ],
    title: "Projection des ventes et co\xFBts",
    h: 190,
  })}</section>
  <section class="card tbl">${table(["Ann\xE9e", "#Ruches", "#Miel", "#Pots", "#Ventes", "#Co\xFBts", "#R\xE9sultat"], lignes, "")}</section>`;
}
function viewPrevisions() {
  S.sim = S.sim || simDefaults();
  const donnees = S.d,
    annee = S.annee,
    finances = fin(annee),
    reglages = cfg(),
    hyp = S.sim,
    champ = (cle, libelle, pas = "1", unite = "") =>
      `<label>${libelle}${unite ? ` (${unite})` : ""}<input type="number" step="${pas}" min="0" inputmode="decimal" data-sim="${cle}" value="${esc(hyp[cle])}"></label>`,
    postes = ["Ventes de miel", ...reglages.postes],
    budgetDe = (poste) =>
      Number(
        donnees.budgets.find((budget) => budget.annee === annee && budget.poste === poste)
          ?.montant || 0,
      ),
    realiseDe = (poste) =>
      poste === "Ventes de miel"
        ? finances.ca
        : sum(
            finances.dep.filter((depense) => depense.categorie === poste),
            (depense) => depense.montant,
          ),
    lignesBudget = postes.map((poste) => {
      const budget = budgetDe(poste),
        realise = realiseDe(poste),
        avancement = budget ? Math.round((realise / budget) * 100) : 0,
        depasse = poste !== "Ventes de miel" && budget && realise > budget;
      return `<tr><td><button class="link" data-act="editbudget" data-v="${esc(poste)}">${esc(poste)}</button></td><td class="num">${budget ? eur0(budget) : "\xC0 d\xE9finir"}</td><td class="num">${eur0(realise)}</td><td class="num ${depasse ? "crit" : ""}">${budget ? avancement + " %" : "\u2013"}</td></tr>`;
    }),
    budgetDepenses = sum(postes.slice(1), budgetDe);
  shell(
    "Pr\xE9visions",
    "Testez vos hypoth\xE8ses et suivez votre budget",
    yearSel(),
    `
    <section class="card"><h2>Simulateur</h2><p class="small">Changez une valeur : tout se recalcule. Les valeurs de d\xE9part sont des exemples tant que vos donn\xE9es sont incompl\xE8tes.</p>
      <div class="simgrid">
        ${champ("ruches", "Ruches")}${champ("ajout", "Ruches ajout\xE9es par an")}${champ("rendement", "Rendement", "0.5", "kg/ruche")}${champ("vendu", "Part du miel vendue", "5", "%")}
        ${champ("part500", "Part en pots de 500 g", "5", "%")}${champ("prix500", "Prix pot 500 g", "0.5", "\u20AC")}${champ("prix250", "Prix pot 250 g", "0.5", "\u20AC")}
        ${champ("coutRuche", "Co\xFBt annuel par ruche", "5", "\u20AC")}${champ("coutPot", "Co\xFBt par pot", "0.05", "\u20AC")}${champ("coutNouvelle", "Co\xFBt d\u2019une nouvelle ruche", "10", "\u20AC")}
      </div>
      <div class="actions" style="margin-top:12px"><button class="btn" data-act="savesim">Enregistrer ces hypoth\xE8ses</button><button class="btn" data-act="resetsim">Revenir aux valeurs calcul\xE9es</button></div>
    </section>
    <div id="simOut" class="stack">${simOut()}</div>
    <section class="card tbl"><h2>Budget ${annee}</h2><p class="small pad">Touchez un poste pour d\xE9finir son montant. Budget de d\xE9penses : ${eur0(budgetDepenses)}. R\xE9sultat budg\xE9t\xE9 : ${eur0(budgetDe("Ventes de miel") - budgetDepenses)}.</p>${table(["Poste", "#Budget", "#R\xE9alis\xE9", "#Avancement"], lignesBudget, "")}</section>`,
  );
}
function taskRow(tache) {
  const enRetard = !tache.faite && tache.echeance && tache.echeance < today(),
    nomRuche = tache.ruche_id ? byId(S.d.ruches, tache.ruche_id)?.nom : "";
  return `<div class="task ${tache.faite ? "done" : ""}"><button class="check" role="checkbox" aria-checked="${tache.faite}" aria-label="Marquer ${esc(tache.titre)}" data-act="toggletache" data-v="${tache.id}">${tache.faite ? "\u2713" : ""}</button><button class="tmain" data-act="edittache" data-v="${tache.id}"><b>${esc(tache.titre)}</b><span class="small ${enRetard ? "crit" : ""}">${[tache.echeance ? dfr(tache.echeance) : "Sans date", nomRuche, tache.assigne].filter(Boolean).map(esc).join(" \xB7 ")}</span></button></div>`;
}
function viewAgenda() {
  const donnees = S.d,
    aFaire = donnees.taches
      .filter((tache) => !tache.faite)
      .sort((un, deux) => (un.echeance || "9").localeCompare(deux.echeance || "9")),
    terminees = donnees.taches.filter((tache) => tache.faite).slice(0, 8),
    titres = new Set(aFaire.map((tache) => tache.titre)),
    mois = new Date().getMonth(),
    idees = SAISON[mois].filter((idee) => !titres.has(idee));
  shell(
    "Agenda",
    "T\xE2ches \xE0 faire et id\xE9es de saison",
    '<button class="btn main" data-act="newtache">Ajouter une t\xE2che</button>' +
      (typeof RP != "undefined" ? RP.bouton() : ""),
    `
    <section class="card"><h2>\xC0 faire</h2>${aFaire.map(taskRow).join("") || '<p class="small">Aucune t\xE2che pr\xE9vue.</p>'}</section>
    ${idees.length ? `<section class="card"><h2>Id\xE9es pour ${esc(new Date().toLocaleDateString("fr-FR", { month: "long" }))}</h2><p class="small">\xC0 adapter \xE0 votre r\xE9gion et \xE0 vos protocoles.</p><div class="chips">${idees.map((idee) => `<button data-act="addsug" data-v="${esc(idee)}">+ ${esc(idee)}</button>`).join("")}</div></section>` : ""}
    ${terminees.length ? `<section class="card"><h2>Termin\xE9es</h2>${terminees.map(taskRow).join("")}</section>` : ""}`,
  );
}
function viewReglages() {
  const reglages = cfg();
  shell(
    "R\xE9glages",
    "Adaptez Apidoo \xE0 votre exploitation",
    "",
    `
    <form data-form="reglages" class="form">
      <section class="card stack">
        <h2>Votre exploitation</h2>${typeof EX != "undefined" ? '<button type="button" class="link" data-act="go" data-v="membres">Membres, invitations et autres exploitations</button>' : ""}
        <label>Nom<input name="nom" value="${esc(reglages.nom)}" required></label>
        <label>Num\xE9ro d\u2019apiculteur (NAPI)<input name="napi" value="${esc(reglages.napi)}"></label>
        <label>Adresse (pour les \xE9tiquettes)<textarea name="adresse" rows="2" placeholder="Rue, code postal, commune">${esc(reglages.adresse || "")}</textarea></label>
        <label>Origine du miel<input name="origine" value="${esc(reglages.origine || "France")}"></label>
        <label>Objectif de r\xE9sultat annuel (\u20AC)<input name="objectif" type="number" min="0" step="10" value="${esc(reglages.objectif || "")}"></label>
      </section>
      <section class="card stack">
        <h2>Vos listes</h2><p class="small">Une valeur par ligne.</p>
        <label>Postes de d\xE9pense<textarea name="postes" rows="5">${esc(
          reglages.postes.join(`
`),
        )}</textarea></label>
        <label>Cercles de clients<textarea name="cercles" rows="4">${esc(
          reglages.cercles.join(`
`),
        )}</textarea></label>
        <label>Modes de paiement<textarea name="modes" rows="4">${esc(
          reglages.modes.join(`
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
// Rendu unique (IT-03) : les modules ne surchargent plus render(), ils déclarent des crochets avantRendu /
// apresRendu (src/noyau/crochets.js) ; les écrans migrés sont dans la table du noyau (src/domaines/…).
function render() {
  const C = window.Noyau?.crochets;
  (C?.lancer("avantRendu") || rendreEcran(), C?.lancer("apresRendu"));
}
function rendreEcran() {
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
  // Écran enregistré dans le noyau (IT-03, src/domaines/…) : il remplace toute l'ancienne chaîne de cet écran.
  // Sinon, ou avec ?ancien=1, l'ancien chemin ci-dessous.
  const migre = window.Noyau?.ecran?.(S.route);
  const vues = migre ? migre.rendu : {
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
  (vues(),
    S.lastRoute !== S.route &&
      (window.scrollTo?.(0, 0), document.querySelector(".wrap")?.classList.add("enter")),
    (S.lastRoute = S.route));
}
function sheet({
  title: titre,
  intro: intro,
  fields: champs,
  submit: enregistrer,
  label: libelle = "Enregistrer",
  del: supprimer,
  delLabel: libelleSuppr,
}) {
  (($sheetForm.innerHTML = `<h2>${esc(titre)}</h2>${intro ? `<p class="small">${esc(intro)}</p>` : ""}${champs
    .map((champ) => {
      const attributs = `name="${champ.name}" ${champ.required ? "required" : ""} ${champ.step ? `step="${champ.step}"` : ""} ${champ.min !== void 0 ? `min="${champ.min}"` : ""} ${champ.list ? `list="dl_${champ.name}"` : ""}`;
      let controle;
      champ.type === "select"
        ? (controle = `<select ${attributs}>${champ.options
            .map((option) => {
              const [valeur, texte] = Array.isArray(option) ? option : [option, option];
              return `<option value="${esc(valeur)}" ${String(champ.value ?? "") === String(valeur) ? "selected" : ""}>${esc(texte)}</option>`;
            })
            .join("")}</select>`)
        : champ.type === "textarea"
          ? (controle = `<textarea ${attributs}>${esc(champ.value)}</textarea>`)
          : (controle = `<input type="${champ.type || "text"}" ${attributs} value="${esc(champ.value)}" ${champ.type === "number" ? 'inputmode="decimal"' : ""} autocomplete="off">`);
      const $ = champ.list
        ? `<datalist id="dl_${champ.name}">${champ.list.map((suggestion) => `<option value="${esc(suggestion)}">`).join("")}</datalist>`
        : "";
      return `<label>${esc(champ.label)}${controle}${$}</label>`;
    })
    .join("")}
  <div class="actions"><button class="btn main" style="flex:1">${esc(libelle)}</button><button type="button" class="btn" data-act="closesheet">Annuler</button></div>
  ${supprimer ? `<button type="button" class="link crit" data-act="sheetdel">${esc(libelleSuppr || "Supprimer")}</button>` : ""}`),
    ($sheetForm.onsubmit = async (evt) => {
      evt.preventDefault();
      const bouton = $sheetForm.querySelector(".btn.main");
      bouton.disabled = !0;
      try {
        (await enregistrer(Object.fromEntries(new FormData($sheetForm))), $sheet.close());
      } catch (erreur) {
        (fail(erreur), (bouton.disabled = !1));
      }
    }),
    (sheet.del = supprimer),
    $sheet.showModal());
}
const ruchers = () => [...new Set(S.d.ruches.map((ruche) => ruche.rucher).filter(Boolean))],
  fournOpts = () =>
    [["", "Aucun"]].concat(
      S.d.fournisseurs.map((fournisseur) => [fournisseur.id, fournisseur.nom]),
    ),
  del = (nomTable, id, message) => () => write(sb.from(nomTable).delete().eq("id", id), message);
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
    submit: (saisie) => {
      const nombre = Math.min(200, Number(saisie.nombre)),
        nomsPris = new Set(S.d.ruches.map((ruche) => ruche.nom)),
        nouvelles = [];
      let numero = 1;
      for (; nouvelles.length < nombre;) {
        const nom =
          nombre === 1 && !nomsPris.has(saisie.prefixe)
            ? saisie.prefixe
            : `${saisie.prefixe} ${numero}`;
        (nomsPris.has(nom) ||
          (nouvelles.push({ nom: nom, rucher: saisie.rucher, type_ruche: saisie.type_ruche }),
          nomsPris.add(nom)),
          numero++);
      }
      return write(
        sb.from("ruches").insert(nouvelles),
        nombre > 1 ? nombre + " ruches ajout\xE9es" : "Ruche ajout\xE9e",
      );
    },
  });
}
function rucheForm(ruche) {
  sheet({
    title: "Modifier la ruche",
    fields: [
      { name: "nom", label: "Nom", required: !0, value: ruche.nom },
      { name: "rucher", label: "Rucher", value: ruche.rucher, list: ruchers() },
      {
        name: "type_ruche",
        label: "Type de ruche",
        value: ruche.type_ruche,
        list: ["Dadant 10 cadres", "Dadant 12 cadres", "Langstroth", "Warr\xE9"],
      },
      {
        name: "annee_reine",
        label: "Ann\xE9e de la reine",
        type: "number",
        value: ruche.annee_reine,
      },
      {
        name: "date_installation",
        label: "Date d\u2019installation",
        type: "date",
        value: ruche.date_installation,
      },
      { name: "etat", label: "\xC9tat", type: "select", options: ETATS, value: ruche.etat },
      { name: "notes", label: "Notes", type: "textarea", value: ruche.notes },
    ],
    submit: (saisie) =>
      write(
        sb
          .from("ruches")
          .update({
            ...saisie,
            annee_reine: num(saisie.annee_reine),
            date_installation: orNull(saisie.date_installation),
          })
          .eq("id", ruche.id),
        "Ruche enregistr\xE9e",
      ),
    del: async () => {
      // AP-BUG-004 : relever les photos avant que la suppression en cascade n'efface leurs lignes, puis effacer
      // les fichiers. Si l'effacement échoue, photos_orphelines() (migration 012) les retrouve.
      const photos = typeof PH != "undefined" ? PH.cheminsRuche(ruche.id) : null;
      ((S.route = "ruches"),
        await del("ruches", ruche.id, "Ruche supprim\xE9e")(),
        photos && (await PH.effacer(photos)));
    },
    delLabel: "Supprimer la ruche et ses visites",
  });
}
function lotForm(lot) {
  const an = String(new Date().getFullYear()).slice(2);
  sheet({
    title: lot ? "Modifier le lot" : "Nouveau lot",
    fields: [
      {
        name: "code",
        label: "Num\xE9ro de lot",
        required: !0,
        value: lot?.code || `L${an}-${String(S.d.lots.length + 1).padStart(2, "0")}`,
      },
      { name: "miel", label: "Miel", required: !0, value: lot?.miel || "Toutes fleurs" },
      {
        name: "format_g",
        label: "Format du pot (g)",
        type: "number",
        step: "1",
        min: 1,
        required: !0,
        value: lot?.format_g || 500,
        list: [125, 250, 500, 1e3],
      },
      {
        name: "prix",
        label: "Prix du pot (\u20AC)",
        type: "number",
        step: "0.01",
        min: 0,
        required: !0,
        value: lot?.prix,
      },
      {
        name: "pots_initiaux",
        label: "Nombre de pots remplis",
        type: "number",
        step: "1",
        min: lot?.pots_vendus || 0,
        required: !0,
        value: lot?.pots_initiaux,
      },
      {
        name: "date_mise_en_pot",
        label: "Mise en pot",
        type: "date",
        value: lot?.date_mise_en_pot || today(),
      },
      { name: "ddm", label: "Date de durabilit\xE9 minimale (DDM)", type: "date", value: lot?.ddm },
    ],
    submit: (saisie) => {
      const ligne = {
        ...saisie,
        format_g: num(saisie.format_g),
        prix: num(saisie.prix),
        pots_initiaux: num(saisie.pots_initiaux),
        date_mise_en_pot: orNull(saisie.date_mise_en_pot),
        ddm: orNull(saisie.ddm),
      };
      return write(
        lot ? sb.from("lots").update(ligne).eq("id", lot.id) : sb.from("lots").insert(ligne),
        "Lot enregistr\xE9",
      );
    },
    del: lot ? del("lots", lot.id, "Lot supprim\xE9") : null,
  });
}
function articleForm(article, typeParDefaut) {
  const type = article?.type || typeParDefaut || "Consommable",
    existe = !!article?.id;
  sheet({
    title: existe ? "Modifier l\u2019article" : "Ajouter un article",
    fields: [
      { name: "nom", label: "Nom", required: !0, value: article?.nom },
      {
        name: "type",
        label: "Type",
        type: "select",
        options: ["Consommable", "\xC9quipement"],
        value: type,
      },
      {
        name: "unite",
        label: "Unit\xE9",
        required: !0,
        value: article?.unite || "unit\xE9",
        list: ["kg", "L", "unit\xE9", "feuille", "bo\xEEte"],
      },
      {
        name: "stock",
        label: "Quantit\xE9",
        type: "number",
        step: "0.01",
        min: 0,
        required: !0,
        value: article?.stock ?? 0,
      },
      {
        name: "seuil",
        label: "Seuil d\u2019alerte",
        type: "number",
        step: "0.01",
        min: 0,
        required: !0,
        value: article?.seuil ?? 0,
      },
      {
        name: "valeur",
        label: "Prix unitaire (\u20AC, facultatif)",
        type: "number",
        step: "0.01",
        min: 0,
        value: article?.valeur,
      },
      {
        name: "fournisseur_id",
        label: "Fournisseur",
        type: "select",
        options: fournOpts(),
        value: article?.fournisseur_id || "",
      },
    ],
    submit: (saisie) => {
      const ligne = {
        ...saisie,
        stock: num(saisie.stock),
        seuil: num(saisie.seuil),
        valeur: num(saisie.valeur),
        fournisseur_id: orNull(saisie.fournisseur_id),
      };
      return write(
        existe
          ? sb.from("articles").update(ligne).eq("id", article.id)
          : sb.from("articles").insert(ligne),
        "Article enregistr\xE9",
      );
    },
    del: existe ? del("articles", article.id, "Article supprim\xE9") : null,
  });
}
function clientForm(client) {
  const depuisVente = S.route === "vente";
  sheet({
    title: client ? "Modifier le client" : "Ajouter un client",
    fields: [
      { name: "nom", label: "Nom", required: !0, value: client?.nom },
      {
        name: "cercle",
        label: "Cercle",
        type: "select",
        options: cfg().cercles,
        value: client?.cercle || cfg().cercles[0],
      },
      { name: "telephone", label: "T\xE9l\xE9phone", type: "tel", value: client?.telephone },
      { name: "email", label: "E-mail", type: "email", value: client?.email },
      // AP-BUG-007 : coordonnées imprimées sur la facture (migration 012).
      { name: "adresse", label: "Adresse", value: client?.adresse },
      { name: "code_postal", label: "Code postal", value: client?.code_postal },
      { name: "ville", label: "Ville", value: client?.ville },
      { name: "siret", label: "SIRET (client professionnel, facultatif)", value: client?.siret },
      { name: "notes", label: "Notes", type: "textarea", value: client?.notes },
    ],
    submit: async (saisie) => {
      // Sans la migration 012, la base ne connaît pas ces colonnes : on enregistre le reste et on prévient.
      const sansCoordonnees = (erreur) =>
        erreur?.code === "PGRST204" && /adresse|code_postal|ville|siret/.test(erreur.message || "")
          ? (["adresse", "code_postal", "ville", "siret"].forEach((cle) => delete saisie[cle]),
            toast("Adresse non enregistr\xE9e : la base doit \xEAtre mise \xE0 jour.", !0),
            !0)
          : !1;
      if (client)
        return write(sb.from("clients").update(saisie).eq("id", client.id), "Client enregistr\xE9").catch((erreur) => {
          if (!sansCoordonnees(erreur)) throw erreur;
          return write(sb.from("clients").update(saisie).eq("id", client.id), "");
        });
      let { data: cree, error: erreur } = await sb.from("clients").insert(saisie).select().single();
      (erreur && sansCoordonnees(erreur) && ({ data: cree, error: erreur } = await sb.from("clients").insert(saisie).select().single()));
      if (erreur) throw erreur;
      (depuisVente && (S.vente.client_id = cree.id),
        await refresh(),
        toast("Client enregistr\xE9"));
    },
    del: client ? del("clients", client.id, "Client supprim\xE9") : null,
  });
}
function fournisseurForm(fournisseur) {
  sheet({
    title: fournisseur ? "Modifier le fournisseur" : "Ajouter un fournisseur",
    fields: [
      { name: "nom", label: "Nom", required: !0, value: fournisseur?.nom },
      { name: "produits", label: "Produits", value: fournisseur?.produits },
      { name: "contact", label: "Contact", value: fournisseur?.contact },
      { name: "telephone", label: "T\xE9l\xE9phone", type: "tel", value: fournisseur?.telephone },
      { name: "email", label: "E-mail", type: "email", value: fournisseur?.email },
      { name: "notes", label: "Notes", type: "textarea", value: fournisseur?.notes },
    ],
    submit: (saisie) =>
      write(
        fournisseur
          ? sb.from("fournisseurs").update(saisie).eq("id", fournisseur.id)
          : sb.from("fournisseurs").insert(saisie),
        "Fournisseur enregistr\xE9",
      ),
    del: fournisseur ? del("fournisseurs", fournisseur.id, "Fournisseur supprim\xE9") : null,
  });
}
function depenseForm(depense, prerempli = {}) {
  const reglages = cfg();
  sheet({
    title: depense ? "Modifier la d\xE9pense" : "Ajouter une d\xE9pense",
    fields: [
      {
        name: "libelle",
        label: "Libell\xE9",
        required: !0,
        value: depense?.libelle ?? prerempli.libelle,
      },
      {
        name: "categorie",
        label: "Poste",
        type: "select",
        options: [...new Set([...reglages.postes, ...(depense ? [depense.categorie] : [])])],
        value: depense?.categorie ?? reglages.postes[0],
      },
      {
        name: "montant",
        label: "Montant (\u20AC)",
        type: "number",
        step: "0.01",
        min: 0,
        required: !0,
        value: depense?.montant,
      },
      {
        name: "date_depense",
        label: "Date",
        type: "date",
        required: !0,
        value: depense?.date_depense || today(),
      },
      {
        name: "fournisseur_id",
        label: "Fournisseur",
        type: "select",
        options: fournOpts(),
        value: depense?.fournisseur_id ?? prerempli.fournisseur_id ?? "",
      },
    ],
    submit: (saisie) => {
      const ligne = {
        ...saisie,
        montant: num(saisie.montant),
        fournisseur_id: orNull(saisie.fournisseur_id),
      };
      return write(
        depense
          ? sb.from("depenses").update(ligne).eq("id", depense.id)
          : sb.from("depenses").insert(ligne),
        "D\xE9pense enregistr\xE9e",
      );
    },
    del: depense ? del("depenses", depense.id, "D\xE9pense supprim\xE9e") : null,
  });
}
function tacheForm(tache, rucheId) {
  sheet({
    title: tache ? "Modifier la t\xE2che" : "Ajouter une t\xE2che",
    fields: [
      { name: "titre", label: "T\xE2che", required: !0, value: tache?.titre },
      { name: "echeance", label: "\xC9ch\xE9ance", type: "date", value: tache?.echeance },
      {
        name: "ruche_id",
        label: "Ruche",
        type: "select",
        options: [["", "Toutes"]].concat(S.d.ruches.map((ruche) => [ruche.id, ruche.nom])),
        value: tache?.ruche_id ?? rucheId ?? "",
      },
      { name: "assigne", label: "Qui s\u2019en occupe", value: tache?.assigne },
    ],
    submit: (saisie) => {
      const ligne = {
        ...saisie,
        echeance: orNull(saisie.echeance),
        ruche_id: orNull(saisie.ruche_id),
      };
      return write(
        tache
          ? sb.from("taches").update(ligne).eq("id", tache.id)
          : sb.from("taches").insert(ligne),
        "T\xE2che enregistr\xE9e",
      );
    },
    del: tache ? del("taches", tache.id, "T\xE2che supprim\xE9e") : null,
  });
}
function recolteForm(recolte) {
  sheet({
    title: recolte ? "Modifier la r\xE9colte" : "Saisir une r\xE9colte",
    fields: [
      {
        name: "ruche_id",
        label: "Origine",
        type: "select",
        options: [["", "Toutes les ruches"]].concat(
          S.d.ruches.map((ruche) => [ruche.id, ruche.nom]),
        ),
        value: recolte?.ruche_id ?? "",
      },
      {
        name: "kg",
        label: "Quantit\xE9 (kg)",
        type: "number",
        step: "0.1",
        min: 0.1,
        required: !0,
        value: recolte?.kg,
      },
      {
        name: "date_recolte",
        label: "Date",
        type: "date",
        required: !0,
        value: recolte?.date_recolte || today(),
      },
    ],
    submit: (saisie) => {
      const ligne = { ...saisie, ruche_id: orNull(saisie.ruche_id), kg: num(saisie.kg) };
      return write(
        recolte
          ? sb.from("recoltes").update(ligne).eq("id", recolte.id)
          : sb.from("recoltes").insert(ligne),
        "R\xE9colte enregistr\xE9e",
      );
    },
    del: recolte ? del("recoltes", recolte.id, "R\xE9colte supprim\xE9e") : null,
  });
}
function download(nomFichier, contenu, type) {
  const lien = document.createElement("a");
  ((lien.href = URL.createObjectURL(new Blob([contenu], { type: type }))),
    (lien.download = nomFichier),
    document.body.appendChild(lien),
    lien.click(),
    lien.remove(),
    setTimeout(() => URL.revokeObjectURL(lien.href), 2e3));
}
function csv(nom, entetes, lignes) {
  const cellule = (valeur) => `"${String(valeur ?? "").replace(/"/g, '""')}"`;
  download(
    `apidoo-${nom}-${today()}.csv`,
    "\uFEFF" +
      [entetes, ...lignes].map((ligne) => ligne.map(cellule).join(";")).join(`\r
`),
    "text/csv;charset=utf-8",
  );
}
const EXP = {
    visites: () => {
      const donnees = S.d;
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
        donnees.visites.map((visite) => {
          const ruche = byId(donnees.ruches, visite.ruche_id);
          return [
            visite.date_visite,
            ruche?.nom,
            ruche?.rucher,
            visite.activite,
            visite.provisions,
            visite.reine,
            visite.couvain,
            visite.poids_kg,
            visite.varroa,
            donnees.intrants
              .filter((intrant) => intrant.visite_id === visite.id)
              .map((intrant) => {
                const article = byId(donnees.articles, intrant.article_id);
                return `${intrant.quantite} ${article?.unite} ${article?.nom}`;
              })
              .join(", "),
            visite.note,
            visite.auteur,
          ];
        }),
      );
    },
    ventes: () => {
      const donnees = S.d;
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
        donnees.lignes.map((ligne) => {
          const vente = byId(donnees.ventes, ligne.vente_id),
            lot = byId(donnees.lots, ligne.lot_id);
          return [
            vente?.date_vente,
            byId(donnees.clients, vente?.client_id)?.nom,
            lot?.code,
            lot?.format_g,
            ligne.quantite,
            ligne.prix_unitaire,
            ligne.quantite * ligne.prix_unitaire,
            vente?.paye ? "Oui" : "Non",
            vente?.mode,
          ];
        }),
      );
    },
    depenses: () => {
      const donnees = S.d;
      csv(
        "depenses",
        ["Date", "Libell\xE9", "Poste", "Fournisseur", "Montant"],
        donnees.depenses.map((depense) => [
          depense.date_depense,
          depense.libelle,
          depense.categorie,
          byId(donnees.fournisseurs, depense.fournisseur_id)?.nom,
          depense.montant,
        ]),
      );
    },
    clients: () =>
      csv(
        "clients",
        ["Nom", "Cercle", "T\xE9l\xE9phone", "E-mail", "Adresse", "Code postal", "Ville", "SIRET", "Notes"],
        S.d.clients.map((client) => [
          client.nom,
          client.cercle,
          client.telephone,
          client.email,
          client.adresse,
          client.code_postal,
          client.ville,
          client.siret,
          client.notes,
        ]),
      ),
    json: () =>
      download(
        `apidoo-sauvegarde-${today()}.json`,
        JSON.stringify(S.d, null, 1),
        "application/json",
      ),
  },
  go = (route) => {
    ((S.route = route), render());
  };
function readVisitForm() {
  const champDate = document.getElementById("v_date");
  champDate &&
    ((S.visite.date_visite = champDate.value),
    (S.visite.poids_kg = document.getElementById("v_poids").value),
    (S.visite.varroa = document.getElementById("v_varroa").value),
    (S.visite.note = document.getElementById("v_note").value),
    typeof RG != "undefined" && RG.lire());
}
function readSaleForm() {
  const champClient = document.getElementById("s_client");
  champClient && (S.vente.client_id = champClient.value);
  const champDate = document.getElementById("s_date");
  champDate && (S.vente.date_vente = champDate.value);
  const champMode = document.getElementById("s_mode");
  champMode && (S.vente.mode = champMode.value);
}
const twoStep = async (bouton, confirmation, action) => {
  if (bouton.dataset.armed) {
    bouton.disabled = !0;
    try {
      await action();
    } catch (erreur) {
      (fail(erreur), (bouton.disabled = !1));
    }
    return;
  }
  const texte = bouton.textContent;
  ((bouton.dataset.armed = "1"),
    (bouton.textContent = confirmation),
    setTimeout(() => {
      bouton.isConnected && (delete bouton.dataset.armed, (bouton.textContent = texte));
    }, 4e3));
};
// ---------- Déconnexion : rien ne reste sur l'appareil (AP-BUG-003, AP-US-027) ----------
// Purge seulement sur une déconnexion demandée : une session expirée (SIGNED_OUT automatique) garde la file.
async function purgerLocal() {
  for (const module of [typeof HL != "undefined" && HL, typeof PH != "undefined" && PH])
    module?.fermer && (await module.fermer().catch(() => {}));
  const suffixe = window.APIDOO?.env === "recette" ? "-recette" : "",
    bases = ["apidoo-hors-ligne" + suffixe, "apidoo-photos" + suffixe];
  await Promise.all(
    bases.map(
      (nom) =>
        new Promise((fini) => {
          try {
            const requete = indexedDB.deleteDatabase(nom);
            requete.onsuccess = requete.onerror = requete.onblocked = () => fini();
          } catch {
            fini();
          }
        }),
    ),
  );
  // Clés apidoo-* de cet environnement. La recette et la production partagent l'origine : on laisse les clés
  // propres à l'autre environnement (suffixe -recette vu depuis la production).
  try {
    Object.keys(localStorage)
      .filter((cle) => cle.startsWith("apidoo-") && (suffixe || !cle.endsWith("-recette")))
      .forEach((cle) => localStorage.removeItem(cle));
    sessionStorage.clear();
  } catch {}
  Object.assign(S, { d: null, sim: null, ruche: null, visite: null, vente: null, route: "dash" });
}
async function deconnecter() {
  $sheet.open && $sheet.close();
  // Hors ligne, signOut ne joint pas le serveur : on ferme au moins la session sur l'appareil.
  try {
    const { error: erreur } = await sb.auth.signOut();
    if (erreur) throw erreur;
  } catch {
    await sb.auth.signOut({ scope: "local" }).catch(() => {});
  }
  await purgerLocal();
  // En ligne : on recharge pour repartir de zéro. Hors ligne, le rechargement pourrait échouer : on affiche
  // l'écran de connexion, et la page sera rechargée à la prochaine connexion (bases locales rouvertes).
  if (navigator.onLine !== !1) return location.replace(location.pathname);
  ((S.purge = !0), (S.session = null), render());
}
sb.auth.onAuthStateChange((evenement) => {
  evenement === "SIGNED_IN" && S.purge && location.reload();
});
function ficheDeconnexion(alerte) {
  const nombre = HL.nb(),
    aCorriger = HL.nbCorriger();
  (($sheetForm.onsubmit = (evt) => evt.preventDefault()),
    ($sheetForm.innerHTML = `<h2>Se d\xE9connecter ?</h2>
    <p>${nombre > 1 ? nombre + " saisies ne sont" : "Une saisie n\u2019est"} pas encore enregistr\xE9e${nombre > 1 ? "s" : ""} sur le serveur${aCorriger ? ` (dont ${aCorriger} \xE0 corriger)` : ""}.</p>
    <p class="small">Si tu te d\xE9connectes maintenant, ${nombre > 1 ? "elles seront supprim\xE9es" : "elle sera supprim\xE9e"} de cet appareil avec toutes les donn\xE9es gard\xE9es pour le hors ligne.</p>
    ${alerte ? `<p class="notice" role="status">${esc(alerte)}</p>` : ""}
    <button type="button" class="btn main block" data-act="decoenvoyer">Envoyer d\u2019abord</button>
    ${aCorriger ? '<button type="button" class="btn block" data-act="hlcorriger">Voir les saisies \xE0 corriger</button>' : ""}
    <button type="button" class="btn block danger" data-act="decoforcer">Supprimer quand m\xEAme</button>
    <button type="button" class="btn" data-act="closesheet">Annuler</button>`),
    $sheet.open || $sheet.showModal());
}
function quickSheet() {
  const choix = [
    ["newvisite", "Visite"],
    ["newvente", "Vente"],
    ["newrecolte", "R\xE9colte"],
    ["newdepense", "D\xE9pense"],
    ["newtache", "T\xE2che"],
    ["newclient", "Client"],
  ];
  (($sheetForm.onsubmit = (evt) => evt.preventDefault()),
    ($sheetForm.innerHTML = `<h2>Ajouter</h2><div class="quick">${choix.map(([action, libelle]) => `<button type="button" class="btn" data-act="qk" data-v="${action}">${libelle}</button>`).join("")}</div><button type="button" class="btn" data-act="closesheet">Annuler</button>`),
    $sheet.showModal());
}
const ACT = {
  go: (valeur) => go(valeur),
  gomateriel: () => go("materiel"),
  authmode: (valeur) => {
    ((S.authMode = valeur), (S.authMsg = ""), authView());
  },
  logout: async () => {
    if (typeof HL != "undefined" && HL.nb() > 0) return ficheDeconnexion();
    await deconnecter();
  },
  decoenvoyer: async () => {
    (await HL.envoyer(), HL.nb() ? ficheDeconnexion("Il reste des saisies : le r\xE9seau manque ou certaines sont \xE0 corriger.") : await deconnecter());
  },
  decoforcer: (valeur, cle, bouton) => twoStep(bouton, "Confirmer : supprimer et se d\xE9connecter", deconnecter),
  ruche: (valeur) => {
    ((S.ruche = valeur), go("ruche"));
  },
  cancel: () => go("dash"),
  quick: () => quickSheet(),
  qk: (valeur) => {
    ($sheet.close(), ACT[valeur]());
  },
  closesheet: () => $sheet.close(),
  sheetdel: (valeur, cle, bouton) =>
    twoStep(bouton, "Confirmer la suppression", async () => {
      (await sheet.del(), $sheet.close());
    }),
  newvisite: (valeur) => {
    if (!S.d.ruches.length) return (toast("Ajoutez d\u2019abord une ruche", !0), go("ruches"));
    const rucheId = valeur || (S.ruche && byId(S.d.ruches, S.ruche)?.id) || S.d.ruches[0].id;
    ((S.visite = {
      ruche_id: rucheId,
      date_visite: today(),
      activite: "Normale",
      provisions: "Moyennes",
      reine: "Non cherch\xE9e",
      couvain: "Non vu",
      etat: byId(S.d.ruches, rucheId).etat,
      poids_kg: "",
      varroa: "",
      note: "",
      q: {},
    }),
      go("visite"));
  },
  vset: (valeur, cle) => {
    (readVisitForm(),
      (S.visite[cle] = valeur),
      cle === "ruche_id" && (S.visite.etat = byId(S.d.ruches, valeur).etat),
      viewVisite());
  },
  vstep: (valeur, cle) => {
    readVisitForm();
    const article = byId(S.d.articles, cle);
    ((S.visite.q[cle] = Math.max(
      0,
      Math.min(Number(article.stock), (S.visite.q[cle] || 0) + Number(valeur)),
    )),
      viewVisite());
  },
  newvente: () => {
    ((S.vente = { client_id: "", date_vente: today(), q: {}, paye: !0, mode: cfg().modes[0] }),
      go("vente"));
  },
  sstep: (valeur, cle) => {
    readSaleForm();
    const lot = byId(S.d.lots, cle);
    ((S.vente.q[cle] = Math.max(
      0,
      Math.min(lot.pots_restants, (S.vente.q[cle] || 0) + Number(valeur)),
    )),
      viewVente());
  },
  spaye: (valeur) => {
    (readSaleForm(), (S.vente.paye = valeur === "1"), viewVente());
  },
  vfiltre: (valeur) => {
    ((S.venteFiltre = valeur), viewClients());
  },
  togglepaye: async (valeur) => {
    const vente = byId(S.d.ventes, valeur);
    await write(
      sb.from("ventes").update({ paye: !vente.paye }).eq("id", valeur),
      vente.paye ? "Vente \xE0 encaisser" : "Vente pay\xE9e",
    );
  },
  ptab: (valeur) => {
    ((S.tab = valeur), viewPilotage());
  },
  newruches: () => ruchesForm(),
  editruche: (valeur) => rucheForm(byId(S.d.ruches, valeur)),
  newlot: () => lotForm(),
  editlot: (valeur) => lotForm(byId(S.d.lots, valeur)),
  newarticle: () => articleForm(),
  editarticle: (valeur) => articleForm(byId(S.d.articles, valeur)),
  preset: (valeur, cle) => {
    const modele = PRESETS[cle].find((m) => m[0] === valeur);
    return articleForm({ nom: modele[0], unite: modele[1], type: cle, stock: 0, seuil: 0 });
  },
  newclient: () => {
    (S.route === "vente" && readSaleForm(), clientForm());
  },
  editclient: (valeur) => clientForm(byId(S.d.clients, valeur)),
  newfournisseur: () => fournisseurForm(),
  editfournisseur: (valeur) => fournisseurForm(byId(S.d.fournisseurs, valeur)),
  newrecolte: () => recolteForm(),
  editrecolte: (valeur) => recolteForm(byId(S.d.recoltes, valeur)),
  newdepense: () => depenseForm(),
  editdepense: (valeur) => depenseForm(byId(S.d.depenses, valeur)),
  newtache: (valeur) => tacheForm(null, valeur),
  edittache: (valeur) => tacheForm(byId(S.d.taches, valeur)),
  addsug: (valeur) => write(sb.from("taches").insert({ titre: valeur }), "T\xE2che ajout\xE9e"),
  toggletache: (valeur) => {
    const tache = byId(S.d.taches, valeur);
    return write(
      sb
        .from("taches")
        .update({ faite: !tache.faite, faite_le: tache.faite ? null : today() })
        .eq("id", valeur),
    );
  },
  entree: (valeur) => {
    const article = byId(S.d.articles, valeur);
    let entreeId = "";
    sheet({
      title: "Entr\xE9e de stock : " + article.nom,
      label: "Ajouter",
      fields: [
        {
          name: "q",
          label: `Quantit\xE9 re\xE7ue (${article.unite})`,
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
      submit: async (saisie) => {
        // AP-BUG-005 : incrément en base et dépense dans la même transaction (ajouter_stock, migration 012).
        // L'identifiant de dépense est tiré une fois par fiche : un double envoi ne crée qu'une dépense.
        const depenseId = (entreeId ||= nouvelIdLocal()),
          reglages = cfg(),
          posteDeduit = /pot|couvercle|étiquette/i.test(article.nom)
            ? "Pots & \xE9tiquettes"
            : /candy|sirop/i.test(article.nom)
              ? "Alimentation"
              : /varroa/i.test(article.nom)
                ? "Traitements"
                : "Mat\xE9riel",
          { error: erreurRpc } = await sb.rpc("ajouter_stock", {
            p: {
              article_id: article.id,
              quantite: num(saisie.q),
              depense: num(saisie.cout)
                ? {
                    id: depenseId,
                    libelle: article.nom,
                    categorie: reglages.postes.includes(posteDeduit) ? posteDeduit : reglages.postes[0],
                    montant: num(saisie.cout),
                    date_depense: today(),
                    fournisseur_id: article.fournisseur_id || "",
                  }
                : null,
            },
          });
        if (erreurRpc && !["PGRST202", "42883"].includes(erreurRpc.code)) throw erreurRpc;
        if (!erreurRpc) return (await refresh(), toast("Stock mis \xE0 jour"));
        // Repli si la migration 012 manque : ancienne écriture en deux temps.
        const { error: erreur } = await sb
          .from("articles")
          .update({ stock: Number(article.stock) + num(saisie.q) })
          .eq("id", article.id);
        if (erreur) throw erreur;
        if (num(saisie.cout)) {
          const reglages = cfg(),
            poste = /pot|couvercle|étiquette/i.test(article.nom)
              ? "Pots & \xE9tiquettes"
              : /candy|sirop/i.test(article.nom)
                ? "Alimentation"
                : /varroa/i.test(article.nom)
                  ? "Traitements"
                  : "Mat\xE9riel",
            ajout = await sb.from("depenses").insert({
              libelle: article.nom,
              categorie: reglages.postes.includes(poste) ? poste : reglages.postes[0],
              montant: num(saisie.cout),
              date_depense: today(),
              fournisseur_id: article.fournisseur_id,
            });
          if (ajout.error) throw ajout.error;
        }
        (await refresh(), toast("Stock mis \xE0 jour"));
      },
    });
  },
  editbudget: (valeur) => {
    const annee = S.annee,
      budget = S.d.budgets.find((b) => b.annee === annee && b.poste === valeur);
    sheet({
      title: `${valeur} : budget ${annee}`,
      fields: [
        {
          name: "montant",
          label: "Montant (\u20AC)",
          type: "number",
          step: "1",
          min: 0,
          required: !0,
          value: budget?.montant,
        },
      ],
      submit: (saisie) =>
        write(
          sb.from("budgets").upsert({ annee: annee, poste: valeur, montant: num(saisie.montant) }),
          "Budget enregistr\xE9",
        ),
    });
  },
  savesim: () => saveCfg({ sim: S.sim }, "Hypoth\xE8ses enregistr\xE9es"),
  resetsim: async () => {
    ((S.sim = null), await saveCfg({ sim: null }, "Valeurs recalcul\xE9es"));
  },
  exp: (valeur) => {
    (EXP[valeur](), toast("Fichier pr\xE9par\xE9"));
  },
  delvisite: (valeur, cle, bouton) =>
    twoStep(
      bouton,
      "Confirmer",
      async () => (
        typeof PH != "undefined" && (await PH.oterVisite(valeur)),
        write(sb.from("visites").delete().eq("id", valeur), "Visite supprim\xE9e, stock r\xE9tabli")
      ),
    ),
  delvente: (valeur, cle, bouton) =>
    twoStep(bouton, "Confirmer", () =>
      write(sb.from("ventes").delete().eq("id", valeur), "Vente supprim\xE9e, stock r\xE9tabli"),
    ),
};
(document.addEventListener("click", async (evt) => {
  const cible = evt.target.closest("[data-act]");
  if (!(!cible || cible.disabled)) {
    evt.preventDefault();
    try {
      await ACT[cible.dataset.act](cible.dataset.v, cible.dataset.k, cible);
    } catch (erreur) {
      fail(erreur);
    }
  }
}),
  document.addEventListener("change", (evt) => {
    evt.target.dataset.chg === "annee" && ((S.annee = Number(evt.target.value)), render());
  }),
  document.addEventListener("input", (evt) => {
    const cible = evt.target.dataset.sim;
    cible &&
      ((S.sim[cible] = Number(evt.target.value) || 0),
      (document.getElementById("simOut").innerHTML = simOut()));
  }));
const $tip = document.createElement("div");
(($tip.className = "tip"), ($tip.hidden = !0), document.body.appendChild($tip));
function showTip(evt) {
  const cible = evt.target.closest?.("[data-tip]");
  if (!cible) {
    $tip.hidden = !0;
    return;
  }
  (($tip.textContent = cible.dataset.tip), ($tip.hidden = !1));
  const gauche = Math.min(evt.clientX + 12, window.innerWidth - $tip.offsetWidth - 8);
  (($tip.style.left = Math.max(8, gauche) + "px"),
    ($tip.style.top = Math.max(8, evt.clientY - $tip.offsetHeight - 10) + "px"));
}
(document.addEventListener("pointermove", showTip),
  document.addEventListener("pointerdown", showTip),
  document.addEventListener("submit", async (evt) => {
    const formulaire = evt.target.dataset.form;
    if (formulaire) {
      if ((evt.preventDefault(), formulaire === "auth")) return submitAuth(evt.target);
      if (!S.busy)
        try {
          if (formulaire === "visite" && typeof VR != "undefined") await VR.enregistrer();
          else if (formulaire === "visite") {
            readVisitForm();
            const visite = S.visite;
            if (!visite.ruche_id) throw new Error("Choisissez une ruche");
            S.busy = !0;
            const intrants = Object.entries(visite.q)
                .filter(([, quantite]) => quantite > 0)
                .map(([articleId, quantite]) => ({ article_id: articleId, quantite: quantite })),
              {
                data: vid,
                error: erreur,
                local: enAttente,
              } = await (typeof HL != "undefined" ? HL.rpc : (nom, params) => sb.rpc(nom, params))(
                "creer_visite",
                {
                  p: {
                    ...visite,
                    q: void 0,
                    couvain: visite.couvain === "Non vu" ? "" : visite.couvain,
                    intrants: intrants,
                  },
                },
              );
            if (erreur) throw erreur;
            (typeof PH != "undefined" && (await PH.rattacher(vid)),
              typeof RG != "undefined" && (await RG.apres(visite)),
              (S.ruche = visite.ruche_id),
              (S.route = "ruche"),
              await refresh(),
              toast(
                enAttente ? "Visite gard\xE9e sur le t\xE9l\xE9phone" : "Visite enregistr\xE9e",
              ));
          } else if (formulaire === "vente") {
            readSaleForm();
            const vente = S.vente;
            if (!vente.client_id) throw new Error("Choisissez un client");
            const lignes = Object.entries(vente.q)
              .filter(([, quantite]) => quantite > 0)
              .map(([lotId, quantite]) => ({ lot_id: lotId, quantite: quantite }));
            if (!lignes.length) throw new Error("Ajoutez au moins un pot");
            S.busy = !0;
            const { error: erreur, local: enAttente } = await (
              typeof HL != "undefined" ? HL.rpc : (nom, params) => sb.rpc(nom, params)
            )("creer_vente", {
              p: {
                id: vente.id, // fourni quand on corrige une vente gardée sur le téléphone (AP-BUG-001)
                client_id: vente.client_id,
                date_vente: vente.date_vente,
                lignes: lignes,
                paye: vente.paye,
                mode: vente.paye ? vente.mode : "",
              },
            });
            if (erreur) throw erreur;
            ((S.route = "clients"),
              await refresh(),
              toast(enAttente ? "Vente gard\xE9e sur le t\xE9l\xE9phone" : "Vente enregistr\xE9e"));
          } else if (formulaire === "reglages") {
            const form = evt.target,
              liste = (champ) =>
                champ.value
                  .split(
                    `
`,
                  )
                  .map((ligne) => ligne.trim())
                  .filter(Boolean),
              postes = liste(form.postes),
              cercles = liste(form.cercles),
              modes = liste(form.modes);
            if (!postes.length || !cercles.length || !modes.length)
              throw new Error("Gardez au moins une valeur par liste");
            ((S.busy = !0),
              await saveCfg(
                {
                  nom: form.nom.value.trim(),
                  napi: form.napi.value.trim(),
                  adresse: (form.adresse?.value || "").trim(),
                  origine: (form.origine?.value || "").trim() || "France",
                  objectif: Number(form.objectif.value) || 0,
                  postes: postes,
                  cercles: cercles,
                  modes: modes,
                },
                "R\xE9glages enregistr\xE9s",
              ));
          }
        } catch (erreur) {
          fail(erreur);
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
  const { data: donnees } = await sb.auth.getSession();
  if (
    ((S.session = donnees.session || (typeof HL != "undefined" ? HL.sessionLocale() : null)),
    !S.session)
  )
    return ((S.d = null), (S.member = null), render());
  render();
  try {
    ((S.member =
      typeof EX != "undefined"
        ? await EX.choisir()
        : await (async () => {
            const reponse = await sb.rpc("est_membre");
            return typeof HL != "undefined" && HL.reseau(reponse.error)
              ? HL.membre()
              : reponse.data === !0;
          })()),
      S.member && (await loadAll()));
  } catch (erreur) {
    fail(erreur);
  }
  render();
}
// Démarrage après tous les scripts (DOMContentLoaded) : avec « defer » (IT-03), readyState vaut déjà « interactive »
// pendant l'exécution des scripts, il ne suffit plus à savoir s'ils sont tous chargés.
let scriptsCharges = document.readyState === "complete";
addEventListener("DOMContentLoaded", () => { scriptsCharges = !0; }, { once: !0 });
(sb.auth.onAuthStateChange((evenement) => {
  if (evenement === "PASSWORD_RECOVERY") {
    ((S.recovery = !0), render());
    return;
  }
  (evenement === "SIGNED_IN" && S.session) ||
    ((evenement === "SIGNED_IN" || evenement === "SIGNED_OUT") &&
      setTimeout(
        () =>
          scriptsCharges ? boot() : addEventListener("DOMContentLoaded", () => boot(), { once: !0 }),
        0,
      ));
}),
  scriptsCharges ? boot() : addEventListener("DOMContentLoaded", () => boot(), { once: !0 }));
