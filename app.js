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
  esc = (e) =>
    String(e ?? "").replace(
      /[&<>"']/g,
      (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t],
    ),
  n = (e, t = 1) => Number(e || 0).toLocaleString("fr-FR", { maximumFractionDigits: t }),
  eur = (e) => n(e, 2) + " \u20AC",
  eur0 = (e) => n(e, 0) + " \u20AC",
  today = () => {
    const e = new Date();
    return new Date(e - e.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  },
  dfr = (e) => (e ? e.slice(8, 10) + "/" + e.slice(5, 7) + "/" + e.slice(0, 4) : "\u2013"),
  dshort = (e) => (e ? e.slice(8, 10) + "/" + e.slice(5, 7) : "\u2013"),
  byId = (e, t) => e.find((s) => s.id === t),
  sum = (e, t) => e.reduce((s, i) => s + Number(t(i) || 0), 0),
  days = (e) => Math.floor((new Date(today()) - new Date(e)) / 864e5),
  yr = (e) => Number(String(e).slice(0, 4)),
  mo = (e) => Number(String(e).slice(5, 7)) - 1,
  num = (e) => (e === "" || e === void 0 || e === null ? null : Number(e)),
  orNull = (e) => e || null,
  etatClass = (e) => (e === "Bonne" ? "good" : e === "Critique" ? "crit" : "watch"),
  cfg = () => ({ ...DEF, ...((S.d?.reglages[0] || {}).data || {}) }),
  consommables = () => S.d.articles.filter((e) => e.type !== "\xC9quipement"),
  equipements = () => S.d.articles.filter((e) => e.type === "\xC9quipement");
function toast(e, t) {
  document.querySelectorAll(".toast").forEach((i) => i.remove());
  const s = document.createElement("div");
  ((s.className = "toast" + (t ? " err" : "")),
    s.setAttribute("role", "status"),
    (s.textContent = e),
    document.body.appendChild(s),
    setTimeout(() => s.remove(), t ? 6e3 : 3e3));
}
function fail(e) {
  console.error(e);
  const t = e.message || "Une erreur est survenue";
  if (/foreign key/.test(t))
    return toast(
      "Impossible : cet \xE9l\xE9ment est utilis\xE9 ailleurs dans l\u2019application.",
      !0,
    );
  if (/unique|duplicate/.test(t)) return toast("Ce nom existe d\xE9j\xE0.", !0);
  toast(t, !0);
}
async function loadAll() {
  const e = Object.keys(TABLES),
    t = await Promise.all(
      e.map((i) => {
        const [a, o, l] = TABLES[i];
        let r = sb.from(a).select("*");
        return (o && (r = r.order(o, { ascending: l !== !1 })), r);
      }),
    ),
    s = {};
  (t.forEach((i, a) => {
    if (i.error) throw i.error;
    s[e[a]] = i.data;
  }),
    (S.d = s),
    typeof PH != "undefined" && (await PH.load()));
}
async function refresh() {
  (await loadAll(), render());
}
async function write(e, t) {
  if (typeof HL != "undefined") return HL.write(e, t);
  const { error: s } = await e;
  if (s) throw s;
  (await refresh(), t && toast(t));
}
async function saveCfg(e, t) {
  const s = { ...((S.d.reglages[0] || {}).data || {}), ...e };
  await write(sb.from("reglages").update({ data: s }).eq("id", 1), t);
}
function authView() {
  const e = S.authMode;
  $app.innerHTML = `<div class="auth"><form data-form="auth">
    <div class="brand"><img src="logo-apidoo.svg" alt="Apidoo" height="38"></div>
    <p class="sub">Le carnet de bord de votre rucher</p>
    ${
      S.recovery
        ? `<label>Nouveau mot de passe<input name="password" type="password" minlength="8" required autocomplete="new-password"></label>
      <button class="btn main block">Enregistrer</button>`
        : `
    <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
    ${e === "reset" ? "" : `<label>Mot de passe<input name="password" type="password" minlength="8" required autocomplete="${e === "up" ? "new-password" : "current-password"}"></label>`}
    <button class="btn main block">${e === "up" ? "Cr\xE9er mon compte" : e === "reset" ? "Recevoir le lien" : "Se connecter"}</button>
    <div class="actions" style="justify-content:space-between">
      <button type="button" class="link" data-act="authmode" data-v="${e === "in" ? "up" : "in"}">${e === "in" ? "Cr\xE9er mon compte" : "J\u2019ai d\xE9j\xE0 un compte"}</button>
      ${e === "in" ? '<button type="button" class="link" data-act="authmode" data-v="reset">Mot de passe oubli\xE9</button>' : ""}
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
async function submitAuth(e) {
  const t = location.origin + location.pathname;
  S.authMsg = "";
  try {
    if (S.recovery) {
      const { error: s } = await sb.auth.updateUser({ password: e.password.value });
      if (s) throw s;
      ((S.recovery = !1), await boot());
      return;
    }
    if (S.authMode === "reset") {
      const { error: s } = await sb.auth.resetPasswordForEmail(e.email.value, { redirectTo: t });
      if (s) throw s;
      S.authMsg = "Si ce compte existe, un lien vient de partir par e-mail.";
    } else if (S.authMode === "up") {
      const { error: s } = await sb.auth.signUp({
        email: e.email.value,
        password: e.password.value,
        options: { emailRedirectTo: t },
      });
      if (s) throw s;
      ((S.authMsg =
        "Compte cr\xE9\xE9. Ouvre l\u2019e-mail de confirmation, puis reviens te connecter."),
        (S.authMode = "in"));
    } else {
      const { error: s } = await sb.auth.signInWithPassword({
        email: e.email.value,
        password: e.password.value,
      });
      if (s) throw s;
      return;
    }
  } catch (s) {
    S.authMsg = AUTH_FR[s.message] || s.message;
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
  icon = (e) =>
    `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[e]}"/></svg>`,
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
function shell(e, t, s, i, a) {
  const o = (S.session.user.email || "?")[0].toUpperCase(),
    l = SIDE.map((m) =>
      m
        ? `<button class="nav ${S.route === m[0] || GROUP[S.route] === m[0] ? "on" : ""}" data-act="go" data-v="${m[0]}">${icon(m[0])}${m[1]}</button>`
        : '<div class="sep"></div>',
    ).join(""),
    r = GROUP[S.route] || S.route,
    b = BOTTOM.map(
      ([m, $]) =>
        `<button class="${r === m ? "on" : ""}" data-act="go" data-v="${m}">${icon(m)}<span>${$}</span></button>`,
    ).join("");
  $app.innerHTML = `<div class="shell">
    <nav class="side" aria-label="Navigation">
      <div class="brand"><img src="logo-apidoo-clair.svg" alt="Apidoo" height="30"></div>
      ${l}
      <div class="me"><span class="avatar">${esc(o)}</span><span><span class="mail">${esc(S.session.user.email)}</span><button class="link" data-act="logout">Se d\xE9connecter</button></span></div>
    </nav>
    <header class="topbar"><img src="logo-apidoo-clair.svg" alt="Apidoo" height="24"><button class="avatar" data-act="go" data-v="reglages" aria-label="R\xE9glages">${esc(o)}</button></header>
    <main>${typeof HL != "undefined" ? HL.bandeau() : ""}<div class="wrap">
      <div class="head ${a ? "hero-head" : ""}"><div>${a ? `<p class="eyebrow">${esc(a)}</p>` : ""}<h1>${esc(e)}</h1>${t ? `<p class="sub">${esc(t)}</p>` : ""}</div><div class="actions">${s || ""}</div></div>
      ${i}
    </div></main>
    <button class="fab" data-act="quick" aria-label="Ajouter rapidement">+</button>
    <nav class="bottom" aria-label="Navigation">${b}</nav>
  </div>`;
}
const table = (e, t, s) =>
    t.length
      ? `<table><thead><tr>${e.map((i) => (i[0] === "#" ? `<th class="num">${esc(i.slice(1))}</th>` : `<th>${esc(i)}</th>`)).join("")}</tr></thead><tbody>${t.join("")}</tbody></table>`
      : `<p class="empty">${esc(s)}</p>`,
  emptyState = (e, t, s, i, a = "") =>
    `<section class="card hero"><div class="hexdeco" aria-hidden="true"></div><h2>${esc(e)}</h2><p class="sub">${esc(t)}</p>${s ? `<button class="btn main" data-act="${i}">${esc(s)}</button>` : ""}${a}</section>`,
  kpi = (e, t, s, i = "") =>
    `<div class="card kpi"><div class="l">${esc(e)}</div><div class="big ${i}">${esc(t)}</div>${s ? `<div class="s">${esc(s)}</div>` : ""}</div>`,
  subtabs = (e, t, s) =>
    `<div class="subtabs" role="tablist">${e.map(([i, a]) => `<button role="tab" aria-selected="${i === t}" class="${i === t ? "on" : ""}" data-act="${s}" data-v="${i}">${esc(a)}</button>`).join("")}</div>`,
  chartW = () =>
    window.innerWidth <= 800
      ? Math.max(280, window.innerWidth - 66)
      : Math.min(1e3, window.innerWidth - 300);
function niceMax(e) {
  if (e <= 0) return 1;
  const t = 10 ** Math.floor(Math.log10(e));
  return [1, 2, 2.5, 5, 10].map((s) => s * t).find((s) => s >= e);
}
const legend = (e) =>
    e.length > 1
      ? `<div class="legend">${e.map((t) => `<span><i style="background:${t.color}"></i>${esc(t.name)}</span>`).join("")}</div>`
      : "",
  chartTable = (e, t, s) =>
    `<details class="dt"><summary>Voir les chiffres</summary><div class="scroll"><table><thead><tr><th></th>${t.map((i) => `<th class="num">${esc(i.name)}</th>`).join("")}</tr></thead><tbody>${e.map((i, a) => `<tr><td>${esc(i)}</td>${t.map((o) => `<td class="num">${o.values[a] === null ? "\u2013" : esc(s(o.values[a]))}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`,
  tipFor = (e, t, s, i) =>
    esc(
      e[i] +
        `
` +
        t.map((a) => `${a.name} : ${a.values[i] === null ? "\u2013" : s(a.values[i])}`).join(`
`),
    );
function barChart({ labels: e, series: t, fmt: s = eur0, h: i = 210, title: a }) {
  const o = chartW(),
    l = { l: 46, r: 6, t: 12, b: 24 },
    r = o - l.l - l.r,
    b = i - l.t - l.b,
    m = niceMax(Math.max(0, ...t.flatMap((u) => u.values.map(Number)))),
    $ = (u) => l.t + b - (u / m) * b,
    p = r / e.length,
    v = Math.min(20, Math.max(4, (p - 6) / t.length - 2)),
    f = [0, 0.5, 1]
      .map(
        (u) =>
          `<line x1="${l.l}" x2="${o - l.r}" y1="${$(m * u)}" y2="${$(m * u)}" class="gl"/><text x="${l.l - 6}" y="${$(m * u) + 4}" text-anchor="end" class="at">${esc(s(m * u))}</text>`,
      )
      .join(""),
    g = e.length > 8 && o < 420 ? 2 : 1,
    w = e
      .map((u, c) => {
        const y = l.l + c * p + (p - (v + 2) * t.length + 2) / 2,
          k = t
            .map((h, _) => {
              const M = Number(h.values[c] || 0),
                j = $(M);
              return M > 0
                ? `<rect x="${y + _ * (v + 2)}" y="${j}" width="${v}" height="${Math.max(1, l.t + b - j)}" rx="3" fill="${h.color}"/>`
                : "";
            })
            .join(""),
          d =
            c % g === 0
              ? `<text x="${l.l + c * p + p / 2}" y="${i - 7}" text-anchor="middle" class="at">${esc(u)}</text>`
              : "";
        return `${k}${d}<rect x="${l.l + c * p}" y="${l.t}" width="${p}" height="${b}" fill="transparent" data-tip="${tipFor(e, t, s, c)}"/>`;
      })
      .join("");
  return `${legend(t)}<svg class="chart" viewBox="0 0 ${o} ${i}" role="img" aria-label="${esc(a || "Graphique")}">${f}${w}</svg>${chartTable(e, t, s)}`;
}
function lineChart({ labels: e, series: t, fmt: s = eur0, h: i = 210, title: a }) {
  const o = chartW(),
    l = { l: 46, r: 12, t: 12, b: 24 },
    r = o - l.l - l.r,
    b = i - l.t - l.b,
    m = t
      .flatMap((h) => h.values)
      .filter((h) => h !== null)
      .map(Number),
    $ = Math.max(0, ...m),
    p = $ > 0 ? niceMax($) : Math.min(0, ...m) < 0 ? 0 : 1,
    v = Math.min(0, ...m) < 0 ? -niceMax(-Math.min(0, ...m)) : 0,
    f = (h) => l.l + (e.length > 1 ? (h / (e.length - 1)) * r : r / 2),
    g = (h) => l.t + b - ((h - v) / (p - v)) * b,
    u = (v < 0 ? (p > 0 ? [v, 0, p] : [v, v / 2, 0]) : [0, p / 2, p])
      .map(
        (h) =>
          `<line x1="${l.l}" x2="${o - l.r}" y1="${g(h)}" y2="${g(h)}" class="gl ${h === 0 ? "zero" : ""}"/><text x="${l.l - 6}" y="${g(h) + 4}" text-anchor="end" class="at">${esc(s(h))}</text>`,
      )
      .join(""),
    c = e.length > 8 && o < 420 ? 2 : 1,
    y = e
      .map((h, _) =>
        _ % c === 0
          ? `<text x="${f(_)}" y="${i - 7}" text-anchor="middle" class="at">${esc(h)}</text>`
          : "",
      )
      .join(""),
    k = t
      .map((h) => {
        const _ = h.values
          .map((M, j) => (M === null ? null : [f(j), g(Number(M))]))
          .filter(Boolean);
        return `<polyline fill="none" stroke="${h.color}" stroke-width="2" stroke-linejoin="round" points="${_.map((M) => M.join(",")).join(" ")}"/>${_.map((M) => `<circle cx="${M[0]}" cy="${M[1]}" r="3.500" fill="${h.color}" stroke="#fff" stroke-width="1.500"/>`).join("")}`;
      })
      .join(""),
    d = e
      .map(
        (h, _) =>
          `<rect x="${f(_) - r / Math.max(1, e.length) / 2}" y="${l.t}" width="${r / Math.max(1, e.length)}" height="${b}" fill="transparent" data-tip="${tipFor(e, t, s, _)}"/>`,
      )
      .join("");
  return `${legend(t)}<svg class="chart" viewBox="0 0 ${o} ${i}" role="img" aria-label="${esc(a || "Graphique")}">${u}${y}${k}${d}</svg>${chartTable(e, t, s)}`;
}
function hbars(e, t = C.honey) {
  if (!e.length) return '<p class="small">Pas encore de donn\xE9es.</p>';
  const s = Math.max(1, ...e.map((i) => Number(i[1])));
  return `<div class="bars">${e
    .map(
      ([i, a, o]) =>
        `<div class="bar" data-tip="${esc(
          i +
            `
` +
            o,
        )}"><span>${esc(i)}</span><span class="t"><i style="width:${Math.round((a / s) * 100)}%;background:${t}"></i></span><span>${esc(o)}</span></div>`,
    )
    .join("")}</div>`;
}
function stock() {
  const e = S.d;
  return {
    pots: sum(e.lots, (t) => t.pots_restants),
    kg: sum(e.lots, (t) => (t.pots_restants * t.format_g) / 1e3),
    kgPots: sum(e.lots, (t) => (t.pots_initiaux * t.format_g) / 1e3),
    valeur: sum(e.lots, (t) => t.pots_restants * t.prix),
  };
}
const venteTotal = (e) =>
    sum(
      S.d.lignes.filter((t) => t.vente_id === e.id),
      (t) => t.quantite * t.prix_unitaire,
    ),
  lastVisit = (e) => S.d.visites.find((t) => t.ruche_id === e),
  years = () => {
    const e = S.d,
      t = new Set([new Date().getFullYear()]);
    return (
      e.ventes.forEach((s) => t.add(yr(s.date_vente))),
      e.depenses.forEach((s) => t.add(yr(s.date_depense))),
      e.recoltes.forEach((s) => t.add(yr(s.date_recolte))),
      e.visites.forEach((s) => t.add(yr(s.date_visite))),
      [...t].sort((s, i) => i - s)
    );
  };
function fin(e) {
  const t = S.d,
    s = t.ventes.filter((d) => yr(d.date_vente) === e),
    i = t.depenses.filter((d) => yr(d.date_depense) === e),
    a = t.recoltes.filter((d) => yr(d.date_recolte) === e),
    o = new Set(s.map((d) => d.id)),
    l = t.lignes.filter((d) => o.has(d.vente_id)),
    r = sum(l, (d) => d.quantite * d.prix_unitaire),
    b = sum(
      s.filter((d) => d.paye),
      venteTotal,
    ),
    m = sum(i, (d) => d.montant),
    $ = sum(a, (d) => d.kg),
    p = sum(l, (d) => (d.quantite * (byId(t.lots, d.lot_id)?.format_g || 0)) / 1e3),
    v = Array(12).fill(0),
    f = Array(12).fill(0),
    g = Array(12).fill(0),
    w = Array(12).fill(0);
  (s.forEach((d) => {
    const h = venteTotal(d);
    ((v[mo(d.date_vente)] += h),
      d.paye && (f[mo(d.date_vente)] += h),
      (w[mo(d.date_vente)] += sum(
        t.lignes.filter((_) => _.vente_id === d.id),
        (_) => _.quantite,
      )));
  }),
    i.forEach((d) => {
      g[mo(d.date_depense)] += Number(d.montant);
    }));
  const u =
    sum(
      t.ventes.filter((d) => yr(d.date_vente) < e && d.paye),
      venteTotal,
    ) -
    sum(
      t.depenses.filter((d) => yr(d.date_depense) < e),
      (d) => d.montant,
    );
  let c = u;
  const y =
      new Date().getFullYear() === e
        ? new Date().getMonth()
        : e > new Date().getFullYear()
          ? -1
          : 11,
    k = f.map((d, h) => ((c += d - g[h]), h <= y ? c : null));
  return {
    ventes: s,
    dep: i,
    lignes: l,
    ca: r,
    encaisse: b,
    aEncaisser: r - b,
    charges: m,
    resultat: r - m,
    kgRec: $,
    kgVendu: p,
    mCa: v,
    mEnc: f,
    mDep: g,
    mPots: w,
    treso: k,
    report: u,
    tresoFin: u + b - m,
    coutKg: $ ? m / $ : null,
    prixKg: p ? r / p : null,
  };
}
function rythme() {
  const e = S.d,
    t = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10),
    s = new Set(e.ventes.filter((l) => l.date_vente >= t).map((l) => l.id)),
    a =
      sum(
        e.lignes.filter((l) => s.has(l.vente_id)),
        (l) => l.quantite,
      ) / 3,
    o = stock().pots;
  return { mois: a, moisRestants: a > 0 ? o / a : null };
}
function todos() {
  const e = S.d,
    t = [];
  (e.taches
    .filter((a) => !a.faite && a.echeance && a.echeance < today())
    .forEach((a) =>
      t.push(["En retard", "crit", a.titre + " (" + dshort(a.echeance) + ")", "agenda"]),
    ),
    e.articles
      .filter(
        (a) =>
          a.type !== "\xC9quipement" && Number(a.seuil) > 0 && Number(a.stock) <= Number(a.seuil),
      )
      .forEach((a) =>
        t.push([
          "Stock bas",
          "watch",
          `${a.nom} : ${n(a.stock)} ${a.unite} (seuil ${n(a.seuil)})`,
          "materiel",
        ]),
      ),
    e.ruches
      .filter((a) => a.etat !== "Bonne")
      .forEach((a) => t.push([a.nom, etatClass(a.etat), `\xC9tat : ${a.etat}`, "ruche:" + a.id])),
    e.ruches.forEach((a) => {
      const o = lastVisit(a.id);
      o &&
        days(o.date_visite) > 30 &&
        t.push([
          a.nom,
          "watch",
          `Pas de visite depuis ${days(o.date_visite)} jours`,
          "ruche:" + a.id,
        ]);
    }));
  const s = e.ventes.filter((a) => !a.paye);
  s.length &&
    t.push([
      "\xC0 encaisser",
      "watch",
      `${s.length} vente(s) non pay\xE9e(s) : ${eur(sum(s, venteTotal))}`,
      "clients",
    ]);
  const i = sum(e.recoltes, (a) => a.kg) - stock().kgPots;
  return (
    i > 0.05 &&
      t.push(["Miel", "good", `${n(i)} kg r\xE9colt\xE9s pas encore mis en pots`, "miel"]),
    new Date().getMonth() >= 8 &&
      e.ruches.length &&
      t.push([
        "Obligation",
        "good",
        `D\xE9clarer les ruches avant le 31 d\xE9cembre ${new Date().getFullYear()}`,
        "agenda",
      ]),
    e.taches
      .filter((a) => !a.faite && (!a.echeance || a.echeance >= today()))
      .slice(0, 4)
      .forEach((a) =>
        t.push([a.echeance ? dshort(a.echeance) : "\xC0 faire", "good", a.titre, "agenda"]),
      ),
    t
  );
}
function honeycomb(e) {
  const t = window.innerWidth <= 800 ? 3 : 4,
    s = [];
  for (let o = 0; o < e.length; o += t) s.push(e.slice(o, o + t));
  const i = (o) =>
      `<button class="cell bg-${etatClass(o.etat)}" data-act="ruche" data-v="${o.id}" aria-label="Ouvrir ${esc(o.nom)}, \xE9tat ${esc(o.etat)}"><span>${esc(o.nom)}</span></button>`,
    a = ETATS.map((o) => [o, e.filter((l) => l.etat === o).length])
      .filter((o) => o[1])
      .map(
        ([o, l]) =>
          `<span class="tag ${etatClass(o)}">${l} ${o === "Bonne" ? "en bon \xE9tat" : esc(o.toLowerCase())}</span>`,
      )
      .join("");
  return `<div class="comb">${s.map((o) => `<div class="comb-row">${o.map(i).join("")}</div>`).join("")}</div><div class="comb-legend">${a}</div>`;
}
function viewDash() {
  const e = S.d,
    t = cfg(),
    s = stock(),
    i = new Date().getFullYear(),
    a = fin(i),
    o = [
      [e.ruches.length > 0, "Ajouter vos ruches", "newruches"],
      [e.articles.length > 0, "Renseigner votre mat\xE9riel", "gomateriel"],
      [e.recoltes.length > 0, "Saisir une r\xE9colte", "newrecolte"],
      [e.lots.length > 0, "Cr\xE9er vos lots de pots", "newlot"],
      [e.clients.length > 0, "Ajouter un client", "newclient"],
      [e.ventes.length > 0, "Enregistrer une vente", "newvente"],
    ],
    l = o.filter((g) => g[0]).length,
    r =
      l < o.length
        ? `<section class="card">
    <h2>Bien d\xE9marrer</h2><p class="small">${l} sur ${o.length} \xE9tapes termin\xE9es</p><div class="track"><i style="width:${Math.round((l / o.length) * 100)}%"></i></div>
    <div class="steps">${o.map(([g, w, u]) => `<button class="step ${g ? "ok" : ""}" ${g ? "disabled" : `data-act="${u}"`}><span class="dot">${g ? "\u2713" : ""}</span>${esc(w)}</button>`).join("")}</div>
  </section>`
        : "",
    b = honeycomb(e.ruches),
    m = todos()
      .slice(0, 7)
      .map(
        ([g, w, u, c]) =>
          `<button class="todo" data-act="${c.startsWith("ruche:") ? "ruche" : "go"}" data-v="${c.replace("ruche:", "")}"><b class="${w}">${esc(g)}</b><span>${esc(u)}</span></button>`,
      )
      .join(""),
    $ = e.taches.filter((g) => !g.faite).length,
    p = e.ruches.filter((g) => g.etat !== "Bonne").length,
    v = [
      `${e.ruches.length} ruche${e.ruches.length > 1 ? "s" : ""}`,
      p ? `${p} \xE0 surveiller` : "",
      $ ? `${$} t\xE2che${$ > 1 ? "s" : ""} \xE0 faire` : "",
    ]
      .filter(Boolean)
      .join(" \xB7 "),
    f = new Date().getHours();
  shell(
    f < 18 ? "Bonjour" : "Bonsoir",
    v,
    '<button class="btn honey" data-act="newvisite">Nouvelle visite</button><button class="btn ghost" data-act="newvente">Nouvelle vente</button>',
    `
    ${r}
    ${typeof HL != "undefined" ? HL.section() : ""}
    <div class="grid">
      ${kpi("Miel en stock", n(s.kg) + " kg", s.pots + " pots")}
      ${kpi("Ventes " + i, eur0(a.ca), a.aEncaisser > 0 ? eur0(a.aEncaisser) + " \xE0 encaisser" : a.ventes.length + " vente(s)")}
      ${kpi("R\xE9sultat " + i, eur0(a.resultat), "apr\xE8s " + eur0(a.charges) + " de d\xE9penses")}
      ${kpi("Tr\xE9sorerie", eur0(a.tresoFin), "encaiss\xE9 moins d\xE9pens\xE9")}
    </div>
    <div class="grid2">
      <section class="card"><h2>\xC9tat des ruches</h2>${e.ruches.length ? b : '<p class="small">Aucune ruche pour le moment.</p><button class="btn" data-act="newruches">Ajouter des ruches</button>'}</section>
      <section class="card"><h2>\xC0 faire</h2>${m || '<p class="small">Rien \xE0 signaler.</p>'}</section>
    </div>`,
    t.nom +
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
      .map(([t, s]) => `<button data-act="go" data-v="${t}">${icon(t)}<span>${s}</span></button>`)
      .join(
        "",
      )}<button data-act="logout">${icon("plus")}<span>Se d\xE9connecter</span></button></section>`,
  );
}
function viewRuches() {
  const e = S.d;
  if (!e.ruches.length)
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
  const t = {};
  e.ruches.forEach((a) => {
    (t[a.rucher || "Sans rucher"] = t[a.rucher || "Sans rucher"] || []).push(a);
  });
  const s = Object.keys(t)
      .sort()
      .map(
        (a) =>
          `<section class="card"><h2>${esc(a)} <span class="small">\xB7 ${t[a].length} ruche(s)</span></h2><div class="rlist">${t[
            a
          ]
            .map((o) => {
              const l = lastVisit(o.id);
              return `<button class="rcard" data-act="ruche" data-v="${o.id}"><span class="hex small-hex bg-${etatClass(o.etat)}"></span><span class="rmain"><b>${esc(o.nom)}</b><span class="small">${l ? "Visite il y a " + days(l.date_visite) + " j" : "Jamais visit\xE9e"}</span></span><span class="num"><b>${n(
                sum(
                  e.recoltes.filter((r) => r.ruche_id === o.id),
                  (r) => r.kg,
                ),
              )} kg</b><span class="small tag ${etatClass(o.etat)}">${esc(o.etat)}</span></span></button>`;
            })
            .join("")}</div></section>`,
      )
      .join(""),
    i = e.recoltes.map(
      (a) =>
        `<tr><td><button class="link" data-act="editrecolte" data-v="${a.id}">${dfr(a.date_recolte)}</button>${a._attente ? ' <span class="tag watch hl-tag">en attente</span>' : ""}</td><td>${a.ruche_id ? esc(byId(e.ruches, a.ruche_id)?.nom) : "Toutes les ruches"}</td><td class="num">${n(a.kg)} kg</td></tr>`,
    );
  shell(
    "Ruches",
    e.ruches.length + " ruche(s)",
    '<button class="btn main" data-act="newvisite">Nouvelle visite</button><button class="btn" data-act="newrecolte">R\xE9colte</button><button class="btn" data-act="newruches">Ajouter</button>',
    `
    ${s}
    <section class="card tbl"><h2>R\xE9coltes</h2>${table(["Date", "Origine", "#Quantit\xE9"], i, "Aucune r\xE9colte saisie.")}</section>`,
  );
}
function viewRuche() {
  const e = S.d,
    t = byId(e.ruches, S.ruche);
  if (!t) return ((S.route = "ruches"), render());
  const s = e.visites.filter((r) => r.ruche_id === t.id),
    i = s.map((r) => {
      const b = e.intrants
        .filter((m) => m.visite_id === r.id)
        .map((m) => {
          const $ = byId(e.articles, m.article_id);
          return `${n(m.quantite)} ${esc($?.unite)} ${esc($?.nom)}`;
        })
        .join(", ");
      return `<tr><td>${dfr(r.date_visite)}${r._attente ? '<br><span class="tag watch hl-tag">en attente</span>' : ""}</td><td>Activit\xE9 ${esc(r.activite.toLowerCase())}, provisions ${esc(r.provisions.toLowerCase())}, reine ${esc(r.reine.toLowerCase())}${r.couvain ? ", couvain " + esc(r.couvain.toLowerCase()) : ""}${r.poids_kg ? ", " + n(r.poids_kg) + " kg" : ""}${r.varroa !== null && r.varroa !== void 0 ? ", varroa " + r.varroa : ""}${r.note ? '<br><span class="small">' + esc(r.note) + "</span>" : ""}${typeof RG != "undefined" ? RG.journal(r) : ""}${typeof PH != "undefined" ? PH.vignettes(r.id) : ""}</td><td>${b || "\u2013"}</td><td class="num"><button class="link" data-act="delvisite" data-v="${r.id}">Supprimer</button></td></tr>`;
    }),
    a = sum(
      e.recoltes.filter((r) => r.ruche_id === t.id),
      (r) => r.kg,
    ),
    o = s
      .filter((r) => r.poids_kg)
      .slice()
      .reverse(),
    l = e.taches.filter((r) => r.ruche_id === t.id && !r.faite);
  shell(
    t.nom,
    [t.rucher, t.type_ruche, t.annee_reine ? "reine " + t.annee_reine : ""]
      .filter(Boolean)
      .join(" \xB7 ") || "Fiche de la ruche",
    `<button class="btn main" data-act="newvisite" data-v="${t.id}">Nouvelle visite</button><button class="btn" data-act="newtache" data-v="${t.id}">T\xE2che</button><button class="btn" data-act="editruche" data-v="${t.id}">Modifier</button>`,
    `
    <div class="grid">
      ${kpi("\xC9tat", t.etat, "", etatClass(t.etat))}
      ${kpi("Miel r\xE9colt\xE9", n(a) + " kg", "")}
      ${kpi("Derni\xE8re visite", s[0] ? "Il y a " + days(s[0].date_visite) + " j" : "\u2013", s[0] ? dfr(s[0].date_visite) : "Aucune visite")}
      ${kpi("Visites", s.length, "")}
    </div>
    ${t.notes ? `<section class="card">${esc(t.notes)}</section>` : ""}
    ${l.length ? `<section class="card"><h2>T\xE2ches pr\xE9vues</h2>${l.map(taskRow).join("")}</section>` : ""}
    ${o.length > 1 ? `<section class="card"><h2>\xC9volution du poids</h2>${lineChart({ labels: o.map((r) => dshort(r.date_visite)), series: [{ name: "Poids", color: C.honey, values: o.map((r) => Number(r.poids_kg)) }], fmt: (r) => n(r) + " kg", title: "\xC9volution du poids de la ruche", h: 180 })}</section>` : ""}
    <section class="card tbl"><h2>Journal des visites</h2>${table(["Date", "Observations", "Intrants", "#"], i, "Aucune visite enregistr\xE9e.")}</section>`,
  );
}
function viewVisite() {
  const e = S.visite,
    t = S.d,
    s = (a, o, l) =>
      `<div class="field"><div class="t">${a}</div><div class="seg" style="grid-template-columns:repeat(${l.length},minmax(0,1fr))">${l.map((r) => `<button type="button" class="${e[o] === r ? "on" : ""}" aria-pressed="${e[o] === r}" data-act="vset" data-k="${o}" data-v="${r}">${r}</button>`).join("")}</div></div>`,
    i = consommables()
      .map((a) => {
        const o = ["kg", "L"].includes(a.unite) ? 0.5 : 1;
        return `<div class="stepper"><div><b>${esc(a.nom)}</b><div class="small">${n(a.stock)} ${esc(a.unite)} en stock</div></div><div class="ctl"><button type="button" aria-label="Diminuer ${esc(a.nom)}" data-act="vstep" data-k="${a.id}" data-v="${-o}">\u2212</button><span>${n(e.q[a.id] || 0)}</span><button type="button" aria-label="Augmenter ${esc(a.nom)}" data-act="vstep" data-k="${a.id}" data-v="${o}">+</button></div></div>`;
      })
      .join("");
  shell(
    "Nouvelle visite",
    "Au rucher",
    '<button class="btn" data-act="cancel">Annuler</button>',
    `
    <form data-form="visite" class="form">
      ${typeof VR != "undefined" ? VR.pick(e) : `<div class="field"><div class="t">Ruche visit\xE9e</div><div class="pick">${t.ruches.map((a) => `<button type="button" class="${e.ruche_id === a.id ? "on" : ""}" aria-pressed="${e.ruche_id === a.id}" data-act="vset" data-k="ruche_id" data-v="${a.id}">${esc(a.nom)}</button>`).join("")}</div></div>`}
      <label>Date<input type="date" id="v_date" value="${esc(e.date_visite)}" max="${today()}" required></label>
      ${s("Activit\xE9 \xE0 l\u2019entr\xE9e", "activite", ["Faible", "Normale", "Forte"])}
      ${s("Provisions", "provisions", ["Faibles", "Moyennes", "Bonnes"])}
      ${s("Reine", "reine", ["Vue", "Non vue", "Non cherch\xE9e"])}
      ${s("Couvain", "couvain", ["Non vu", "R\xE9duit", "Normal", "Abondant"])}
      ${s("\xC9tat de la ruche apr\xE8s la visite", "etat", ETATS)}
      <section class="card"><h2>Ce que vous avez utilis\xE9</h2>${i || '<p class="small">Ajoutez vos consommables dans Mat\xE9riel pour les suivre ici.</p>'}</section>
      <div class="two"><label>Poids (kg)<input type="number" step="0.1" min="0" inputmode="decimal" id="v_poids" value="${esc(e.poids_kg)}"></label>
      <label>Varroas compt\xE9s<input type="number" step="1" min="0" inputmode="numeric" id="v_varroa" value="${esc(e.varroa)}"></label></div>
      ${typeof RG != "undefined" ? RG.formSection(e) : ""}
      ${typeof PH != "undefined" ? PH.formSection() : ""}
      <label>Note<textarea id="v_note">${esc(e.note)}</textarea></label>
      <button class="btn main block" ${S.busy ? "disabled" : ""}>${typeof HL != "undefined" && HL.horsLigne() ? "Enregistrer sur le t\xE9l\xE9phone" : "Enregistrer la visite"}</button>
    </form>`,
  );
}
function viewMiel() {
  const e = S.d,
    t = stock(),
    s = sum(e.recoltes, (r) => r.kg),
    i = s - t.kgPots,
    a = rythme(),
    o = e.lots.map(
      (r) =>
        `<tr><td><button class="link" data-act="editlot" data-v="${r.id}">${esc(r.code)}</button></td><td>${esc(r.miel)}</td><td>${n(r.format_g, 0)} g</td><td class="num">${eur(r.prix)}</td><td class="num">${r.pots_restants} / ${r.pots_initiaux}</td><td>${dfr(r.ddm)}</td><td class="num">${typeof ET != "undefined" ? ET.bouton(r) : ""}</td></tr>`,
    ),
    l =
      e.lots.length || s
        ? `
    <div class="grid">
      ${kpi("R\xE9colt\xE9", n(s) + " kg", "")}
      ${kpi("Mis en pots", n(t.kgPots) + " kg", i > 0.05 ? n(i) + " kg \xE0 mettre en pots" : i < -0.05 ? "Plus que la r\xE9colte saisie" : "Tout est en pots")}
      ${kpi("En stock", n(t.kg) + " kg", t.pots + " pots")}
      ${kpi("Valeur \xE0 vendre", eur0(t.valeur), a.moisRestants !== null ? `Environ ${n(a.moisRestants, 0)} mois de ventes` : "")}
    </div>
    <section class="card tbl">${table(["Lot", "Miel", "Format", "#Prix", "#Pots restants", "DDM", "#"], o, "Aucun lot. Cr\xE9ez un lot par format de pot.")}</section>`
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
    ) + l,
  );
}
function viewMateriel() {
  const e = (a) => {
      const o = new Set(S.d.articles.map((r) => r.nom)),
        l = PRESETS[a].filter((r) => !o.has(r[0]));
      return l.length
        ? `<div class="chips"><span class="small">Ajouter vite :</span>${l.map((r) => `<button data-act="preset" data-v="${esc(r[0])}" data-k="${a}">+ ${esc(r[0])}</button>`).join("")}</div>`
        : "";
    },
    t = (a) => esc(byId(S.d.fournisseurs, a.fournisseur_id)?.nom) || "\u2013",
    s = consommables().map((a) => {
      const o = Number(a.seuil) > 0 && Number(a.stock) <= Number(a.seuil);
      return `<tr><td><button class="link" data-act="editarticle" data-v="${a.id}">${esc(a.nom)}</button></td><td class="num">${n(a.stock)} ${esc(a.unite)}</td><td class="num">${n(a.seuil)}</td><td><span class="tag ${o ? "watch" : "good"}">${o ? "\xC0 commander" : "OK"}</span></td><td class="num"><button class="btn sm" data-act="entree" data-v="${a.id}">+ Entr\xE9e</button></td></tr>`;
    }),
    i = equipements().map(
      (a) =>
        `<tr><td><button class="link" data-act="editarticle" data-v="${a.id}">${esc(a.nom)}</button></td><td class="num">${n(a.stock)}</td><td class="num">${a.valeur ? eur(a.valeur * a.stock) : "\u2013"}</td><td>${t(a)}</td></tr>`,
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
    <section class="card tbl"><h2>Consommables</h2>${table(["Article", "#Stock", "#Seuil", "\xC9tat", "#"], s, "Aucun consommable : candy, sirop, pots, \xE9tiquettes\u2026")}${e("Consommable")}</section>
    <section class="card tbl"><h2>\xC9quipement</h2>${table(["\xC9quipement", "#Qt\xE9", "#Valeur", "Fournisseur"], i, "Aucun \xE9quipement enregistr\xE9.")}${e("\xC9quipement")}</section>`,
  );
}
function viewClients() {
  const e = S.d,
    t = e.ventes.filter((o) => S.venteFiltre === "toutes" || !o.paye),
    s = e.clients.map((o) => {
      const l = e.ventes.filter((r) => r.client_id === o.id);
      return `<tr><td><button class="link" data-act="editclient" data-v="${o.id}">${esc(o.nom)}</button></td><td>${esc(o.cercle)}</td><td>${o.telephone ? `<a href="tel:${esc(o.telephone)}">${esc(o.telephone)}</a>` : "\u2013"}</td><td class="num">${eur(sum(l, venteTotal))}</td><td>${l[0] ? dfr(l[0].date_vente) : "Jamais"}</td></tr>`;
    }),
    i = t.slice(0, 25).map((o) => {
      const l = e.lignes
        .filter((r) => r.vente_id === o.id)
        .map((r) => `${r.quantite} \xD7 ${n(byId(e.lots, r.lot_id)?.format_g, 0)} g`)
        .join(", ");
      return `<tr><td>${dfr(o.date_vente)}${o._attente ? '<br><span class="tag watch hl-tag">en attente</span>' : ""}</td><td>${esc(byId(e.clients, o.client_id)?.nom)}</td><td>${esc(l)}</td><td class="num">${eur(venteTotal(o))}</td><td><button class="link ${o.paye ? "" : "watch"}" data-act="togglepaye" data-v="${o.id}">${o.paye ? "Pay\xE9e" + (o.mode ? " \xB7 " + esc(o.mode) : "") : "\xC0 encaisser"}</button></td><td class="num"><button class="link" data-act="delvente" data-v="${o.id}">Supprimer</button></td></tr>`;
    });
  if (!e.clients.length)
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
  const a = sum(
    e.ventes.filter((o) => !o.paye),
    venteTotal,
  );
  shell(
    "Clients & ventes",
    e.clients.length + " client(s)" + (a ? " \xB7 " + eur(a) + " \xE0 encaisser" : ""),
    '<button class="btn main" data-act="newvente">Nouvelle vente</button><button class="btn" data-act="newclient">Ajouter un client</button>',
    `
    <section class="card tbl">${table(["Client", "Cercle", "T\xE9l\xE9phone", "#Total", "Dernier achat"], s, "Aucun client.")}</section>
    <section class="card tbl"><h2>Ventes</h2><div class="pad">${subtabs(
      [
        ["toutes", "Toutes"],
        ["impayees", "\xC0 encaisser"],
      ],
      S.venteFiltre,
      "vfiltre",
    )}</div>${table(["Date", "Client", "Pots", "#Montant", "Paiement", "#"], i, "Aucune vente.")}</section>`,
  );
}
function viewVente() {
  const e = S.vente,
    t = S.d,
    s = cfg(),
    i = t.lots.filter((r) => r.pots_restants > 0),
    a = sum(i, (r) => (e.q[r.id] || 0) * r.prix),
    o = i
      .map(
        (r) =>
          `<div class="stepper"><div><b>${n(r.format_g, 0)} g \xB7 ${esc(r.code)}</b><div class="small">${eur(r.prix)} \xB7 ${r.pots_restants} en stock</div></div><div class="ctl"><button type="button" aria-label="Retirer un pot ${r.format_g} g" data-act="sstep" data-k="${r.id}" data-v="-1">\u2212</button><span>${e.q[r.id] || 0}</span><button type="button" aria-label="Ajouter un pot ${r.format_g} g" data-act="sstep" data-k="${r.id}" data-v="1">+</button></div></div>`,
      )
      .join(""),
    l = t.clients
      .map(
        (r) =>
          `<option value="${r.id}" ${e.client_id === r.id ? "selected" : ""}>${esc(r.nom)}</option>`,
      )
      .join("");
  shell(
    "Nouvelle vente",
    "",
    '<button class="btn" data-act="cancel">Annuler</button>',
    `
    <form data-form="vente" class="form">
      ${t.clients.length ? `<label>Client<select id="s_client" required><option value="">Choisir\u2026</option>${l}</select></label>` : ""}
      <button type="button" class="link" data-act="newclient">Ajouter un client</button>
      <label>Date<input type="date" id="s_date" value="${esc(e.date_vente)}" max="${today()}" required></label>
      <section class="card"><h2>Pots vendus</h2>${o || '<p class="small">Aucun pot en stock. Cr\xE9ez d\u2019abord un lot dans Stocks.</p>'}</section>
      <div class="field"><div class="t">Paiement</div><div class="seg" style="grid-template-columns:repeat(2,minmax(0,1fr))"><button type="button" class="${e.paye ? "on" : ""}" data-act="spaye" data-v="1">Pay\xE9e</button><button type="button" class="${e.paye ? "" : "on"}" data-act="spaye" data-v="0">\xC0 encaisser</button></div></div>
      ${e.paye ? `<label>Mode de paiement<select id="s_mode">${s.modes.map((r) => `<option ${e.mode === r ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label>` : ""}
      <button class="btn main block" ${S.busy ? "disabled" : ""}>Enregistrer \xB7 ${eur(a)}</button>
    </form>`,
  );
}
function viewFournisseurs() {
  const e = S.d;
  if (!e.fournisseurs.length)
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
  const t = e.fournisseurs.map((s) => {
    const i = e.depenses.filter((a) => a.fournisseur_id === s.id);
    return `<tr><td><button class="link" data-act="editfournisseur" data-v="${s.id}">${esc(s.nom)}</button></td><td>${esc(s.produits) || "\u2013"}</td><td>${s.telephone ? `<a href="tel:${esc(s.telephone)}">${esc(s.telephone)}</a>` : esc(s.contact) || "\u2013"}</td><td>${i[0] ? dfr(i[0].date_depense) : "\u2013"}</td><td class="num">${eur(sum(i, (a) => a.montant))}</td></tr>`;
  });
  shell(
    "Fournisseurs",
    e.fournisseurs.length + " fournisseur(s)",
    '<button class="btn main" data-act="newfournisseur">Ajouter un fournisseur</button>',
    `<section class="card tbl">${table(["Fournisseur", "Produits", "Contact", "Dernier achat", "#Achats"], t, "")}</section>`,
  );
}
const yearSel = () =>
  `<label class="yr">Ann\xE9e<select data-chg="annee">${years()
    .map((e) => `<option ${e === S.annee ? "selected" : ""}>${e}</option>`)
    .join("")}</select></label>`;
function viewCompta() {
  const e = S.d,
    t = fin(S.annee),
    s = t.dep.map(
      (i) =>
        `<tr><td><button class="link" data-act="editdepense" data-v="${i.id}">${dfr(i.date_depense)}</button>${i._attente ? ' <span class="tag watch hl-tag">en attente</span>' : ""}</td><td>${esc(i.libelle)}</td><td>${esc(i.categorie)}</td><td>${esc(byId(e.fournisseurs, i.fournisseur_id)?.nom) || "\u2013"}</td><td class="num">${eur(i.montant)}</td></tr>`,
    );
  shell(
    "D\xE9penses",
    "Total " + S.annee + " : " + eur(t.charges),
    `${yearSel()}<button class="btn main" data-act="newdepense">Ajouter une d\xE9pense</button>`,
    `<section class="card tbl">${table(["Date", "Libell\xE9", "Poste", "Fournisseur", "#Montant"], s, "Aucune d\xE9pense sur cette ann\xE9e.")}</section>`,
  );
}
function pilotFin() {
  const e = S.d,
    t = S.annee,
    s = fin(t),
    i = cfg(),
    a = stock(),
    o = fin(t - 1),
    l = o.ca
      ? ` (${s.ca >= o.ca ? "+" : ""}${n(((s.ca - o.ca) / o.ca) * 100, 0)} % sur ${t - 1})`
      : "",
    b = [...new Set([...i.postes, ...s.dep.map((u) => u.categorie)])]
      .map((u) => [
        u,
        sum(
          s.dep.filter((c) => c.categorie === u),
          (c) => c.montant,
        ),
      ])
      .filter((u) => u[1] > 0)
      .sort((u, c) => c[1] - u[1])
      .map(([u, c]) => [u, c, eur0(c)]),
    m = {};
  s.lignes.forEach((u) => {
    const c = n(byId(e.lots, u.lot_id)?.format_g, 0) + " g";
    ((m[c] = m[c] || { v: 0, p: 0 }),
      (m[c].v += u.quantite * u.prix_unitaire),
      (m[c].p += u.quantite));
  });
  const $ = Object.entries(m).map(([u, c]) => [u, c.v, `${eur0(c.v)}`]),
    p = {};
  s.ventes.forEach((u) => {
    const c = byId(e.clients, u.client_id)?.cercle || "Autre";
    p[c] = (p[c] || 0) + venteTotal(u);
  });
  const v = Object.entries(p)
      .sort((u, c) => c[1] - u[1])
      .map(([u, c]) => [u, c, eur0(c)]),
    f = {};
  s.ventes.forEach((u) => {
    f[u.client_id] = (f[u.client_id] || 0) + venteTotal(u);
  });
  const g = Object.entries(f)
      .sort((u, c) => c[1] - u[1])
      .slice(0, 5)
      .map(([u, c]) => [byId(e.clients, u)?.nom || "?", c, eur0(c)]),
    w = s.charges - s.ca;
  return `<div class="grid">
    ${kpi("Chiffre d\u2019affaires", eur0(s.ca), s.ventes.length + " vente(s)" + l)}
    ${kpi("D\xE9penses", eur0(s.charges), s.dep.length + " d\xE9pense(s)")}
    ${kpi("R\xE9sultat", eur0(s.resultat), s.ca ? "Marge " + n((s.resultat / s.ca) * 100, 0) + " %" : "", s.resultat < 0 ? "crit" : "good")}
    ${kpi("Tr\xE9sorerie fin de p\xE9riode", eur0(s.tresoFin), s.aEncaisser ? eur0(s.aEncaisser) + " \xE0 encaisser" : "Tout est encaiss\xE9")}
    ${kpi("Prix de vente moyen", s.prixKg ? eur(s.prixKg) : "\u2013", "par kg vendu")}
    ${kpi("Co\xFBt de revient", s.coutKg !== null ? eur(s.coutKg) : "\u2013", "par kg r\xE9colt\xE9")}
    ${kpi("Stock \xE0 vendre", eur0(a.valeur), "R\xE9sultat potentiel " + eur0(s.resultat + a.valeur))}
    ${kpi("Seuil de rentabilit\xE9", w > 0 ? eur0(w) : "Atteint", w > 0 ? "de ventes restantes pour couvrir les d\xE9penses" : "les ventes couvrent les d\xE9penses")}
  </div>
  <section class="card"><h2>Ventes et d\xE9penses par mois</h2>${barChart({
    labels: MOIS,
    series: [
      { name: "Ventes", color: C.honey, values: s.mCa },
      { name: "D\xE9penses", color: C.blue, values: s.mDep },
    ],
    title: "Ventes et d\xE9penses par mois",
  })}</section>
  <section class="card"><h2>Tr\xE9sorerie cumul\xE9e</h2><p class="small">Argent encaiss\xE9 moins d\xE9penses, depuis le d\xE9but.</p>${lineChart({ labels: MOIS, series: [{ name: "Tr\xE9sorerie", color: C.green, values: s.treso }], title: "Tr\xE9sorerie cumul\xE9e" })}</section>
  <div class="grid2">
    <section class="card"><h2>D\xE9penses par poste</h2>${hbars(b, C.blue)}</section>
    <section class="card"><h2>Ventes par format</h2>${hbars($)}</section>
    <section class="card"><h2>Ventes par cercle</h2>${hbars(v)}</section>
    <section class="card"><h2>Meilleurs clients</h2>${hbars(g)}</section>
  </div>`;
}
function pilotOps() {
  const e = S.d,
    t = S.annee,
    s = rythme(),
    i = e.recoltes.filter((c) => yr(c.date_recolte) === t),
    a = e.visites.filter((c) => yr(c.date_visite) === t),
    o = sum(i, (c) => c.kg),
    l = e.ruches.length,
    r = Array(12).fill(0);
  a.forEach((c) => r[mo(c.date_visite)]++);
  const b = fin(t),
    m = new Set(a.map((c) => c.id)),
    $ = e.intrants.filter((c) => m.has(c.visite_id)),
    p = e.ruches
      .map((c) => [
        c.nom,
        sum(
          i.filter((y) => y.ruche_id === c.id),
          (y) => y.kg,
        ),
      ])
      .filter((c) => c[1] > 0)
      .sort((c, y) => y[1] - c[1])
      .map(([c, y]) => [c, y, n(y) + " kg"]),
    f = [...new Set($.map((c) => c.article_id))].map((c) => {
      const y = byId(e.articles, c),
        k = sum(
          $.filter((d) => d.article_id === c),
          (d) => d.quantite,
        );
      return [y?.nom || "?", k, n(k) + " " + (y?.unite || "")];
    }),
    g = consommables()
      .map((c) => {
        const y = new Date(Date.now() - 15552e6).toISOString().slice(0, 10),
          k = new Set(e.visites.filter((h) => h.date_visite >= y).map((h) => h.id)),
          d =
            sum(
              e.intrants.filter((h) => h.article_id === c.id && k.has(h.visite_id)),
              (h) => h.quantite,
            ) / 6;
        return { a: c, cons: d, mois: d > 0 ? Number(c.stock) / d : null };
      })
      .filter((c) => c.cons > 0),
    w = ETATS.map((c) => [c, e.ruches.filter((y) => y.etat === c).length]),
    u = e.ruches.map((c) => {
      const y = lastVisit(c.id),
        k = sum(
          i.filter((h) => h.ruche_id === c.id),
          (h) => h.kg,
        ),
        d = e.visites.find((h) => h.ruche_id === c.id && h.poids_kg);
      return `<tr><td><button class="link" data-act="ruche" data-v="${c.id}">${esc(c.nom)}</button></td><td><span class="tag ${etatClass(c.etat)}">${esc(c.etat)}</span></td><td class="num">${y ? days(y.date_visite) + " j" : "\u2013"}</td><td>${y ? esc(y.provisions) : "\u2013"}</td><td class="num">${d ? n(d.poids_kg) + " kg" : "\u2013"}</td><td class="num">${n(k)} kg</td></tr>`;
    });
  return `<div class="grid">
    ${kpi("Miel r\xE9colt\xE9", n(o) + " kg", l ? n(o / l) + " kg par ruche" : "")}
    ${kpi("Visites", a.length, l ? n(a.length / l) + " par ruche" : "")}
    ${kpi("Ruches \xE0 surveiller", w[1][1] + w[2][1], "sur " + l)}
    ${kpi("Pots vendus par mois", n(s.mois, 0), s.moisRestants !== null ? "Stock pour " + n(s.moisRestants, 0) + " mois \xE0 ce rythme" : "sur les 3 derniers mois")}
  </div>
  <section class="card tbl"><h2>Tableau des ruches</h2>${table(["Ruche", "\xC9tat", "#Derni\xE8re visite", "Provisions", "#Poids", "#Miel " + t], u, "Aucune ruche.")}</section>
  <div class="grid2">
    <section class="card"><h2>Rendement par ruche</h2>${hbars(p)}</section>
    <section class="card"><h2>Intrants utilis\xE9s</h2>${hbars(f, C.green)}</section>
  </div>
  <section class="card"><h2>Visites par mois</h2>${barChart({ labels: MOIS, series: [{ name: "Visites", color: C.green, values: r }], fmt: (c) => n(c, 1), h: 170, title: "Visites par mois" })}</section>
  <section class="card"><h2>Pots vendus par mois</h2>${barChart({ labels: MOIS, series: [{ name: "Pots", color: C.honey, values: b.mPots }], fmt: (c) => n(c, 1), h: 170, title: "Pots vendus par mois" })}</section>
  ${
    g.length
      ? `<section class="card tbl"><h2>Autonomie des consommables</h2>${table(
          ["Article", "#Stock", "#Conso/mois", "#Autonomie"],
          g.map(
            (c) =>
              `<tr><td>${esc(c.a.nom)}</td><td class="num">${n(c.a.stock)} ${esc(c.a.unite)}</td><td class="num">${n(c.cons)} ${esc(c.a.unite)}</td><td class="num">${n(c.mois)} mois</td></tr>`,
          ),
          "",
        )}</section>`
      : ""
  }`;
}
function viewPilotage() {
  const e =
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
      (e
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
            l = await sb
              .from("depenses")
              .insert({
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
