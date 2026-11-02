/* Apidoo : application de gestion apicole (MVP) */
const sb = supabase.createClient(window.APIDOO.url, window.APIDOO.key);
const $app = document.getElementById('app');
const $sheet = document.getElementById('sheet');
const $sheetForm = document.getElementById('sheetForm');

const ROUTES = [['dash', 'Accueil'], ['ruches', 'Ruches'], ['miel', 'Miel'], ['materiel', 'Matériel'], ['clients', 'Clients'], ['compta', 'Compta']];
const TABLES = {
  ruches: ['ruches', 'nom'], articles: ['articles', 'nom'], visites: ['visites', 'date_visite', false],
  intrants: ['visite_intrants'], recoltes: ['recoltes', 'date_recolte', false], lots: ['lots_stock', 'code'],
  clients: ['clients', 'nom'], ventes: ['ventes', 'date_vente', false], lignes: ['vente_lignes'], depenses: ['depenses', 'date_depense', false]
};
const CERCLES = ['Famille', 'Amis', 'Collègues', 'Autre'];
const CATEGORIES = ['Pots & étiquettes', 'Alimentation', 'Traitements', 'Matériel', 'Autre'];
const ETATS = ['Bonne', 'À surveiller', 'Critique'];
const etatClass = (e) => (e === 'Bonne' ? 'good' : e === 'Critique' ? 'crit' : 'watch');

const S = { session: null, member: null, route: 'dash', ruche: null, d: null, visite: null, vente: null, authMode: 'in', authMsg: '', recovery: false, busy: false };

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (v, d = 1) => Number(v || 0).toLocaleString('fr-FR', { maximumFractionDigits: d });
const eur = (v) => n(v, 2) + ' €';
const today = () => { const t = new Date(); return new Date(t - t.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const dfr = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '–');
const byId = (list, id) => list.find((x) => x.id === id);
const sum = (list, f) => list.reduce((t, x) => t + Number(f(x) || 0), 0);

function toast(msg, err) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), err ? 6000 : 3000);
}
const fail = (e) => { console.error(e); toast(e.message || 'Une erreur est survenue', true); };

async function loadAll() {
  const keys = Object.keys(TABLES);
  const res = await Promise.all(keys.map((k) => {
    const [t, ord, asc] = TABLES[k];
    let q = sb.from(t).select('*');
    if (ord) q = q.order(ord, { ascending: asc !== false });
    return q;
  }));
  const d = {};
  res.forEach((r, i) => { if (r.error) throw r.error; d[keys[i]] = r.data; });
  S.d = d;
}
async function refresh() { await loadAll(); render(); }
async function write(promise, ok) {
  const { error } = await promise;
  if (error) throw error;
  await refresh();
  if (ok) toast(ok);
}

/* ---------- Connexion ---------- */
function authView() {
  const m = S.authMode;
  $app.innerHTML = `<div class="auth"><form data-form="auth">
    <div class="brand"><svg width="30" height="30" viewBox="0 0 34 34" aria-hidden="true"><path d="M9 3h16l8 14-8 14H9L1 17z" fill="#E3A008"/></svg>Apidoo</div>
    ${S.recovery ? `<label>Nouveau mot de passe<input name="password" type="password" minlength="8" required autocomplete="new-password"></label>
      <button class="btn main block">Enregistrer</button>` : `
    <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
    ${m === 'reset' ? '' : `<label>Mot de passe<input name="password" type="password" minlength="8" required autocomplete="${m === 'up' ? 'new-password' : 'current-password'}"></label>`}
    <button class="btn main block">${m === 'up' ? 'Créer mon compte' : m === 'reset' ? 'Recevoir le lien' : 'Se connecter'}</button>
    <div class="actions" style="justify-content:space-between">
      <button type="button" class="link" data-act="authmode" data-v="${m === 'in' ? 'up' : 'in'}">${m === 'in' ? 'Créer mon compte' : 'J’ai déjà un compte'}</button>
      ${m === 'in' ? '<button type="button" class="link" data-act="authmode" data-v="reset">Mot de passe oublié</button>' : ''}
    </div>`}
    ${S.authMsg ? `<p class="notice" role="status">${esc(S.authMsg)}</p>` : ''}
  </form></div>`;
}
const AUTH_FR = { 'Invalid login credentials': 'E-mail ou mot de passe incorrect.', 'Email not confirmed': 'Confirme d’abord ton adresse grâce à l’e-mail reçu.', 'User already registered': 'Ce compte existe déjà.' };
async function submitAuth(f) {
  const redirect = location.origin + location.pathname;
  S.authMsg = '';
  try {
    if (S.recovery) {
      const { error } = await sb.auth.updateUser({ password: f.password.value });
      if (error) throw error;
      S.recovery = false; await boot(); return;
    }
    if (S.authMode === 'reset') {
      const { error } = await sb.auth.resetPasswordForEmail(f.email.value, { redirectTo: redirect });
      if (error) throw error;
      S.authMsg = 'Si ce compte existe, un lien vient de partir par e-mail.';
    } else if (S.authMode === 'up') {
      const { error } = await sb.auth.signUp({ email: f.email.value, password: f.password.value, options: { emailRedirectTo: redirect } });
      if (error) throw error;
      S.authMsg = 'Compte créé. Ouvre l’e-mail de confirmation, puis reviens te connecter.';
      S.authMode = 'in';
    } else {
      const { error } = await sb.auth.signInWithPassword({ email: f.email.value, password: f.password.value });
      if (error) throw error;
      return;
    }
  } catch (e) { S.authMsg = AUTH_FR[e.message] || e.message; }
  authView();
}

/* ---------- Coque ---------- */
function shell(title, sub, actions, body) {
  const nav = ROUTES.map(([r, t]) => `<button class="nav ${S.route === r ? 'on' : ''}" data-act="go" data-v="${r}" ${S.route === r ? 'aria-current="page"' : ''}>${t}</button>`).join('');
  const bottom = ROUTES.map(([r, t]) => `<button class="${S.route === r ? 'on' : ''}" data-act="go" data-v="${r}">${t}</button>`).join('');
  $app.innerHTML = `<div class="shell">
    <nav class="side" aria-label="Navigation">
      <div class="brand"><svg width="30" height="30" viewBox="0 0 34 34" aria-hidden="true"><path d="M9 3h16l8 14-8 14H9L1 17z" fill="#E3A008"/></svg>Apidoo</div>
      ${nav}
      <div class="me">${esc(S.session.user.email)}<br><button class="link" data-act="logout">Se déconnecter</button></div>
    </nav>
    <main><div class="wrap">
      <div class="head"><div><h1>${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div><div class="actions">${actions || ''}</div></div>
      ${body}
    </div></main>
    <nav class="bottom" aria-label="Navigation">${bottom}</nav>
  </div>`;
}
const table = (heads, rows, emptyMsg) => (rows.length ? `<table><thead><tr>${heads.map((h) => (h[0] === '#' ? `<th class="num">${esc(h.slice(1))}</th>` : `<th>${esc(h)}</th>`)).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>` : `<p class="empty">${esc(emptyMsg)}</p>`);

/* ---------- Calculs ---------- */
function metrics() {
  const d = S.d;
  const potsRestants = sum(d.lots, (l) => l.pots_restants);
  const kgStock = sum(d.lots, (l) => l.pots_restants * l.format_g / 1000);
  const ca = sum(d.lignes, (l) => l.quantite * l.prix_unitaire);
  const dep = sum(d.depenses, (x) => x.montant);
  const kgRecolte = sum(d.recoltes, (r) => r.kg);
  const kgPots = sum(d.lots, (l) => l.pots_initiaux * l.format_g / 1000);
  return { potsRestants, kgStock, ca, dep, kgRecolte, kgPots, valeur: sum(d.lots, (l) => l.pots_restants * l.prix) };
}
const venteTotal = (v) => sum(S.d.lignes.filter((l) => l.vente_id === v.id), (l) => l.quantite * l.prix_unitaire);
const lastVisit = (rid) => S.d.visites.find((v) => v.ruche_id === rid);

function todos() {
  const d = S.d, out = [];
  if (!d.recoltes.length) out.push(['Démarrer', 'watch', 'Saisir votre récolte de miel', 'ruches']);
  if (!d.lots.length) out.push(['Démarrer', 'watch', 'Créer vos lots de pots de 250 g et 500 g', 'miel']);
  d.articles.filter((a) => Number(a.seuil) > 0 && Number(a.stock) <= Number(a.seuil)).forEach((a) => out.push(['Stock bas', 'watch', `${a.nom} : ${n(a.stock)} ${a.unite} restants (seuil ${n(a.seuil)})`, 'materiel']));
  d.ruches.filter((r) => r.etat !== 'Bonne').forEach((r) => out.push([r.nom, etatClass(r.etat), `État : ${r.etat}`, 'ruche:' + r.id]));
  const m = new Date().getMonth();
  if (m >= 8) out.push(['Obligation', 'good', `Déclarer les ruches avant le 31 décembre ${new Date().getFullYear()}`, 'ruches']);
  return out;
}

/* ---------- Écrans ---------- */
function viewDash() {
  const m = metrics(), d = S.d;
  const kpi = (l, v, s) => `<div class="card kpi"><div class="l">${esc(l)}</div><div class="big">${esc(v)}</div><div class="s">${esc(s)}</div></div>`;
  const hexes = d.ruches.map((r) => `<button class="hexbtn" data-act="ruche" data-v="${r.id}" aria-label="Ouvrir ${esc(r.nom)}, état ${esc(r.etat)}"><span class="hex bg-${etatClass(r.etat)}">${esc(r.nom)}</span><span class="tag">${esc(r.etat)}</span></button>`).join('');
  const t = todos().map(([tag, c, txt, go]) => `<button class="todo" data-act="${go.startsWith('ruche:') ? 'ruche' : 'go'}" data-v="${go.replace('ruche:', '')}"><b class="${c}">${esc(tag)}</b><span>${esc(txt)}</span></button>`).join('');
  const perHive = d.ruches.map((r) => [r.nom, sum(d.recoltes.filter((x) => x.ruche_id === r.id), (x) => x.kg)]).filter((x) => x[1] > 0);
  const max = Math.max(1, ...perHive.map((x) => x[1]));
  const bars = perHive.map(([nom, kg]) => `<div class="bar"><span>${esc(nom)}</span><span class="t"><i style="width:${Math.round(kg / max * 100)}%"></i></span><span>${n(kg)} kg</span></div>`).join('');
  const months = {};
  d.ventes.forEach((v) => { const k = v.date_vente.slice(0, 7); months[k] = (months[k] || 0) + venteTotal(v); });
  const mk = Object.keys(months).sort().slice(-6), mm = Math.max(1, ...mk.map((k) => months[k]));
  const mbars = mk.map((k) => `<div class="bar"><span>${k.slice(5, 7)}/${k.slice(0, 4)}</span><span class="t"><i style="width:${Math.round(months[k] / mm * 100)}%"></i></span><span>${n(months[k], 0)} €</span></div>`).join('');
  shell('Accueil', 'Bee’s Brothers', `<button class="btn main" data-act="newvisite">Nouvelle visite</button><button class="btn" data-act="newvente">Nouvelle vente</button>`, `
    <div class="grid">
      ${kpi('Miel en pots', n(m.kgStock) + ' kg', m.kgRecolte ? `sur ${n(m.kgRecolte)} kg récoltés` : 'récolte à saisir')}
      ${kpi('Pots restants', m.potsRestants, 'à vendre : ' + eur(m.valeur))}
      ${kpi('Ventes', eur(m.ca), d.ventes.length + ' vente(s)')}
      ${kpi('Résultat à date', eur(m.ca - m.dep), 'après ' + eur(m.dep) + ' de dépenses')}
    </div>
    <div class="grid2">
      <section class="card"><h2>État des ruches</h2><div class="hexes">${hexes}</div></section>
      <section class="card"><h2>À faire</h2>${t || '<p class="small">Rien à signaler.</p>'}</section>
    </div>
    <div class="grid2">
      <section class="card"><h2>Ventes par mois</h2><div class="bars">${mbars || '<p class="small">Aucune vente pour le moment.</p>'}</div></section>
      <section class="card"><h2>Miel récolté par ruche</h2><div class="bars">${bars || '<p class="small">Aucune récolte par ruche pour le moment.</p>'}</div></section>
    </div>`);
}

function viewRuches() {
  const d = S.d;
  const rows = d.ruches.map((r) => {
    const v = lastVisit(r.id);
    return `<tr><td><button class="link" data-act="ruche" data-v="${r.id}">${esc(r.nom)}</button></td><td>${esc(r.rucher) || '–'}</td><td><span class="tag ${etatClass(r.etat)}">${esc(r.etat)}</span></td><td>${v ? dfr(v.date_visite) : 'Jamais'}</td><td class="num">${n(sum(d.recoltes.filter((x) => x.ruche_id === r.id), (x) => x.kg))} kg</td></tr>`;
  });
  const rec = d.recoltes.map((r) => `<tr><td>${dfr(r.date_recolte)}</td><td>${r.ruche_id ? esc(byId(d.ruches, r.ruche_id)?.nom) : 'Toutes les ruches'}</td><td class="num">${n(r.kg)} kg</td><td class="num"><button class="link" data-act="delrecolte" data-v="${r.id}">Supprimer</button></td></tr>`);
  shell('Ruches', d.ruches.length + ' ruches', `<button class="btn main" data-act="newvisite">Nouvelle visite</button><button class="btn" data-act="newrecolte">Récolte</button><button class="btn" data-act="newruche">Ajouter une ruche</button>`, `
    <section class="card tbl">${table(['Ruche', 'Rucher', 'État', 'Dernière visite', '#Miel'], rows, 'Aucune ruche.')}</section>
    <section class="card tbl"><h2>Récoltes</h2>${table(['Date', 'Origine', '#Quantité', '#'], rec, 'Aucune récolte saisie.')}</section>`);
}

function viewRuche() {
  const d = S.d, r = byId(d.ruches, S.ruche);
  if (!r) { S.route = 'ruches'; return render(); }
  const vs = d.visites.filter((v) => v.ruche_id === r.id);
  const rows = vs.map((v) => {
    const intr = d.intrants.filter((i) => i.visite_id === v.id).map((i) => { const a = byId(d.articles, i.article_id); return `${n(i.quantite)} ${esc(a?.unite)} ${esc(a?.nom)}`; }).join(', ');
    return `<tr><td>${dfr(v.date_visite)}</td><td>Activité ${esc(v.activite.toLowerCase())}, provisions ${esc(v.provisions.toLowerCase())}, reine ${esc(v.reine.toLowerCase())}${v.poids_kg ? ', ' + n(v.poids_kg) + ' kg' : ''}${v.note ? '<br><span class="small">' + esc(v.note) + '</span>' : ''}</td><td>${intr || '–'}</td><td class="num"><button class="link" data-act="delvisite" data-v="${v.id}">Supprimer</button></td></tr>`;
  });
  const kg = sum(d.recoltes.filter((x) => x.ruche_id === r.id), (x) => x.kg);
  const candy = sum(d.intrants.filter((i) => vs.some((v) => v.id === i.visite_id)), (i) => i.quantite);
  shell(r.nom, [r.rucher, r.annee_reine ? 'reine ' + r.annee_reine : ''].filter(Boolean).join(' · ') || 'Fiche de la ruche', `<button class="btn main" data-act="newvisite" data-v="${r.id}">Nouvelle visite</button><button class="btn" data-act="editruche" data-v="${r.id}">Modifier</button>`, `
    <div class="grid">
      <div class="card kpi"><div class="l">État</div><div class="big ${etatClass(r.etat)}">${esc(r.etat)}</div></div>
      <div class="card kpi"><div class="l">Miel récolté</div><div class="big">${n(kg)} kg</div></div>
      <div class="card kpi"><div class="l">Intrants utilisés</div><div class="big">${n(candy)}</div><div class="s">kg ou L au total</div></div>
      <div class="card kpi"><div class="l">Visites</div><div class="big">${vs.length}</div></div>
    </div>
    ${r.notes ? `<section class="card">${esc(r.notes)}</section>` : ''}
    <section class="card tbl"><h2>Journal des visites</h2>${table(['Date', 'Observations', 'Intrants', '#'], rows, 'Aucune visite enregistrée.')}</section>`);
}

function viewVisite() {
  const v = S.visite, d = S.d;
  const seg = (t, k, opts) => `<div class="field"><div class="t">${t}</div><div class="seg">${opts.map((o) => `<button type="button" class="${v[k] === o ? 'on' : ''}" aria-pressed="${v[k] === o}" data-act="vset" data-k="${k}" data-v="${o}">${o}</button>`).join('')}</div></div>`;
  const steppers = d.articles.map((a) => `<div class="stepper"><div><b>${esc(a.nom)}</b><div class="small">${n(a.stock)} ${esc(a.unite)} en stock</div></div><div class="ctl"><button type="button" aria-label="Diminuer ${esc(a.nom)}" data-act="vstep" data-k="${a.id}" data-v="-0.5">−</button><span>${n(v.q[a.id] || 0)}</span><button type="button" aria-label="Augmenter ${esc(a.nom)}" data-act="vstep" data-k="${a.id}" data-v="0.5">+</button></div></div>`).join('');
  shell('Nouvelle visite', 'Au rucher', `<button class="btn" data-act="cancel">Annuler</button>`, `
    <form data-form="visite" style="display:flex;flex-direction:column;gap:16px;max-width:560px">
      <div class="field"><div class="t">Ruche visitée</div><div class="pick">${d.ruches.map((r) => `<button type="button" class="${v.ruche_id === r.id ? 'on' : ''}" aria-pressed="${v.ruche_id === r.id}" data-act="vset" data-k="ruche_id" data-v="${r.id}">${esc(r.nom)}</button>`).join('')}</div></div>
      <label>Date<input type="date" id="v_date" value="${esc(v.date_visite)}" max="${today()}" required></label>
      ${seg('Activité à l’entrée', 'activite', ['Faible', 'Normale', 'Forte'])}
      ${seg('Provisions', 'provisions', ['Faibles', 'Moyennes', 'Bonnes'])}
      ${seg('Reine', 'reine', ['Vue', 'Non vue', 'Non cherchée'])}
      <section class="card"><h2>Ce que vous avez utilisé</h2>${steppers || '<p class="small">Ajoutez des articles dans Matériel.</p>'}</section>
      <label>Poids de la ruche (kg, facultatif)<input type="number" step="0.1" min="0" inputmode="decimal" id="v_poids" value="${esc(v.poids_kg)}"></label>
      <label>Note<textarea id="v_note">${esc(v.note)}</textarea></label>
      <button class="btn main block" ${S.busy ? 'disabled' : ''}>Enregistrer la visite</button>
    </form>`);
}

function viewMiel() {
  const d = S.d, m = metrics();
  const rows = d.lots.map((l) => `<tr><td><button class="link" data-act="editlot" data-v="${l.id}">${esc(l.code)}</button></td><td>${esc(l.miel)}</td><td>${l.format_g} g</td><td class="num">${eur(l.prix)}</td><td class="num">${l.pots_restants} / ${l.pots_initiaux}</td><td>${dfr(l.ddm)}</td></tr>`);
  const ecart = m.kgRecolte - m.kgPots;
  shell('Stock de miel', 'Du kilo récolté au pot vendu', `<button class="btn main" data-act="newlot">Nouveau lot</button><button class="btn" data-act="newrecolte">Récolte</button>`, `
    <div class="grid">
      <div class="card kpi"><div class="l">Récolté</div><div class="big">${n(m.kgRecolte)} kg</div></div>
      <div class="card kpi"><div class="l">Mis en pots</div><div class="big">${n(m.kgPots)} kg</div><div class="s">${ecart > 0 ? n(ecart) + ' kg pas encore en pots' : ecart < 0 ? 'Plus que la récolte saisie : à vérifier' : 'Tout est en pots'}</div></div>
      <div class="card kpi"><div class="l">En stock</div><div class="big">${n(m.kgStock)} kg</div><div class="s">${m.potsRestants} pots</div></div>
      <div class="card kpi"><div class="l">À vendre</div><div class="big">${eur(m.valeur)}</div></div>
    </div>
    <section class="card tbl">${table(['Lot', 'Miel', 'Format', '#Prix', '#Pots restants', 'DDM'], rows, 'Aucun lot. Créez un lot par format de pot.')}</section>`);
}

function viewMateriel() {
  const rows = S.d.articles.map((a) => {
    const low = Number(a.seuil) > 0 && Number(a.stock) <= Number(a.seuil);
    return `<tr><td><button class="link" data-act="editarticle" data-v="${a.id}">${esc(a.nom)}</button></td><td class="num">${n(a.stock)} ${esc(a.unite)}</td><td class="num">${n(a.seuil)} ${esc(a.unite)}</td><td><span class="tag ${low ? 'watch' : 'good'}">${low ? 'À commander' : 'OK'}</span></td><td class="num"><button class="btn" data-act="entree" data-v="${a.id}">Entrée de stock</button></td></tr>`;
  });
  shell('Matériel', 'Ce que vous avez et ce qu’il faut racheter', `<button class="btn main" data-act="newarticle">Ajouter un article</button>`, `<section class="card tbl">${table(['Article', '#Stock', '#Seuil', 'État', '#'], rows, 'Aucun article.')}</section>`);
}

function viewClients() {
  const d = S.d;
  const rows = d.clients.map((c) => {
    const vs = d.ventes.filter((v) => v.client_id === c.id);
    return `<tr><td><button class="link" data-act="editclient" data-v="${c.id}">${esc(c.nom)}</button></td><td>${esc(c.cercle)}</td><td>${esc(c.telephone) || '–'}</td><td class="num">${eur(sum(vs, venteTotal))}</td><td>${vs[0] ? dfr(vs[0].date_vente) : 'Jamais'}</td></tr>`;
  });
  const sales = d.ventes.slice(0, 15).map((v) => {
    const det = d.lignes.filter((l) => l.vente_id === v.id).map((l) => `${l.quantite} × ${byId(d.lots, l.lot_id)?.format_g} g`).join(', ');
    return `<tr><td>${dfr(v.date_vente)}</td><td>${esc(byId(d.clients, v.client_id)?.nom)}</td><td>${esc(det)}</td><td class="num">${eur(venteTotal(v))}</td><td class="num"><button class="link" data-act="delvente" data-v="${v.id}">Supprimer</button></td></tr>`;
  });
  shell('Clients & ventes', d.clients.length + ' client(s)', `<button class="btn main" data-act="newvente">Nouvelle vente</button><button class="btn" data-act="newclient">Ajouter un client</button>`, `
    <section class="card tbl">${table(['Client', 'Cercle', 'Téléphone', '#Total', 'Dernier achat'], rows, 'Aucun client.')}</section>
    <section class="card tbl"><h2>Dernières ventes</h2>${table(['Date', 'Client', 'Pots', '#Montant', '#'], sales, 'Aucune vente.')}</section>`);
}

function viewVente() {
  const v = S.vente, d = S.d;
  const lots = d.lots.filter((l) => l.pots_restants > 0);
  const total = sum(lots, (l) => (v.q[l.id] || 0) * l.prix);
  const steppers = lots.map((l) => `<div class="stepper"><div><b>${l.format_g} g · ${esc(l.code)}</b><div class="small">${eur(l.prix)} · ${l.pots_restants} en stock</div></div><div class="ctl"><button type="button" aria-label="Retirer un pot ${l.format_g} g" data-act="sstep" data-k="${l.id}" data-v="-1">−</button><span>${v.q[l.id] || 0}</span><button type="button" aria-label="Ajouter un pot ${l.format_g} g" data-act="sstep" data-k="${l.id}" data-v="1">+</button></div></div>`).join('');
  const opts = d.clients.map((c) => `<option value="${c.id}" ${v.client_id === c.id ? 'selected' : ''}>${esc(c.nom)}</option>`).join('');
  shell('Nouvelle vente', '', `<button class="btn" data-act="cancel">Annuler</button>`, `
    <form data-form="vente" style="display:flex;flex-direction:column;gap:14px;max-width:560px">
      ${d.clients.length ? `<label>Client<select id="s_client" required><option value="">Choisir…</option>${opts}</select></label>` : ''}
      <button type="button" class="link" data-act="newclient">Ajouter un client</button>
      <label>Date<input type="date" id="s_date" value="${esc(v.date_vente)}" max="${today()}" required></label>
      <section class="card"><h2>Pots vendus</h2>${steppers || '<p class="small">Aucun pot en stock. Créez d’abord un lot dans Miel.</p>'}</section>
      <button class="btn main block" ${S.busy ? 'disabled' : ''}>Enregistrer · ${eur(total)}</button>
    </form>`);
}

function viewCompta() {
  const d = S.d, m = metrics();
  const rows = d.depenses.map((x) => `<tr><td>${dfr(x.date_depense)}</td><td>${esc(x.libelle)}</td><td>${esc(x.categorie)}</td><td class="num">${eur(x.montant)}</td><td class="num"><button class="link" data-act="deldepense" data-v="${x.id}">Supprimer</button></td></tr>`);
  const cats = CATEGORIES.map((c) => [c, sum(d.depenses.filter((x) => x.categorie === c), (x) => x.montant)]).filter((x) => x[1] > 0);
  const mx = Math.max(1, ...cats.map((c) => c[1]));
  const cout = m.kgRecolte ? m.dep / m.kgRecolte : null;
  shell('Compta', 'Ventes, dépenses et coût de revient', `<button class="btn main" data-act="newdepense">Ajouter une dépense</button>`, `
    <div class="grid">
      <div class="card kpi"><div class="l">Ventes</div><div class="big">${eur(m.ca)}</div></div>
      <div class="card kpi"><div class="l">Dépenses</div><div class="big">${eur(m.dep)}</div></div>
      <div class="card kpi"><div class="l">Résultat à date</div><div class="big">${eur(m.ca - m.dep)}</div></div>
      <div class="card kpi"><div class="l">Coût de revient</div><div class="big">${cout === null ? '–' : eur(cout)}</div><div class="s">par kg récolté</div></div>
    </div>
    ${cats.length ? `<section class="card"><h2>Dépenses par poste</h2><div class="bars">${cats.map(([c, v]) => `<div class="bar"><span>${esc(c)}</span><span class="t"><i style="width:${Math.round(v / mx * 100)}%"></i></span><span>${n(v, 0)} €</span></div>`).join('')}</div></section>` : ''}
    <section class="card tbl">${table(['Date', 'Libellé', 'Poste', '#Montant', '#'], rows, 'Aucune dépense.')}</section>`);
}

function render() {
  if (S.recovery || !S.session) return authView();
  if (S.member === false) {
    $app.innerHTML = `<div class="auth"><form><div class="brand">Apidoo</div><p>Cette adresse (${esc(S.session.user.email)}) n’a pas encore accès aux données.</p><button type="button" class="btn" data-act="logout">Se déconnecter</button></form></div>`;
    return;
  }
  if (!S.d) { $app.innerHTML = '<p style="padding:24px">Chargement…</p>'; return; }
  ({ dash: viewDash, ruches: viewRuches, ruche: viewRuche, visite: viewVisite, miel: viewMiel, materiel: viewMateriel, clients: viewClients, vente: viewVente, compta: viewCompta }[S.route])();
  window.scrollTo?.(0, 0);
}

/* ---------- Fiches de saisie ---------- */
function sheet({ title, fields, submit, label = 'Enregistrer', del }) {
  $sheetForm.innerHTML = `<h2>${esc(title)}</h2>${fields.map((f) => {
    const a = `name="${f.name}" ${f.required ? 'required' : ''} ${f.step ? `step="${f.step}"` : ''} ${f.min !== undefined ? `min="${f.min}"` : ''}`;
    let inp;
    if (f.type === 'select') inp = `<select ${a}>${f.options.map((o) => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(f.value ?? '') === String(v) ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select>`;
    else if (f.type === 'textarea') inp = `<textarea ${a}>${esc(f.value)}</textarea>`;
    else inp = `<input type="${f.type || 'text'}" ${a} value="${esc(f.value)}" ${f.type === 'number' ? 'inputmode="decimal"' : ''}>`;
    return `<label>${esc(f.label)}${inp}</label>`;
  }).join('')}
  <div class="actions"><button class="btn main" style="flex:1">${esc(label)}</button><button type="button" class="btn" data-act="closesheet">Annuler</button></div>
  ${del ? '<button type="button" class="link" data-act="sheetdel" style="color:#A61B1B">Supprimer</button>' : ''}`;
  $sheetForm.onsubmit = async (e) => {
    e.preventDefault();
    const btn = $sheetForm.querySelector('.btn.main');
    btn.disabled = true;
    try {
      await submit(Object.fromEntries(new FormData($sheetForm)));
      $sheet.close();
    } catch (err) { fail(err); btn.disabled = false; }
  };
  sheet.del = del;
  $sheet.showModal();
}
const num = (v) => (v === '' || v === undefined ? null : Number(v));
const orNull = (v) => v || null;

function rucheForm(r) {
  sheet({
    title: r ? 'Modifier la ruche' : 'Ajouter une ruche',
    fields: [
      { name: 'nom', label: 'Nom', required: true, value: r?.nom },
      { name: 'rucher', label: 'Rucher', value: r?.rucher },
      { name: 'annee_reine', label: 'Année de la reine', type: 'number', value: r?.annee_reine },
      { name: 'etat', label: 'État', type: 'select', options: ETATS, value: r?.etat || 'Bonne' },
      { name: 'notes', label: 'Notes', type: 'textarea', value: r?.notes }
    ],
    submit: (f) => { const row = { ...f, annee_reine: num(f.annee_reine) }; return write(r ? sb.from('ruches').update(row).eq('id', r.id) : sb.from('ruches').insert(row), 'Ruche enregistrée'); }
  });
}
function lotForm(l) {
  sheet({
    title: l ? 'Modifier le lot' : 'Nouveau lot',
    fields: [
      { name: 'code', label: 'Numéro de lot', required: true, value: l?.code },
      { name: 'miel', label: 'Miel', required: true, value: l?.miel || 'Toutes fleurs' },
      { name: 'format_g', label: 'Format', type: 'select', options: [[250, '250 g'], [500, '500 g']], value: l?.format_g || 500 },
      { name: 'prix', label: 'Prix du pot (€)', type: 'number', step: '0.01', min: 0, required: true, value: l?.prix },
      { name: 'pots_initiaux', label: 'Nombre de pots remplis', type: 'number', step: '1', min: l?.pots_vendus || 0, required: true, value: l?.pots_initiaux },
      { name: 'date_mise_en_pot', label: 'Mise en pot', type: 'date', value: l?.date_mise_en_pot },
      { name: 'ddm', label: 'Date de durabilité minimale (DDM)', type: 'date', value: l?.ddm }
    ],
    submit: (f) => {
      const row = { ...f, format_g: num(f.format_g), prix: num(f.prix), pots_initiaux: num(f.pots_initiaux), date_mise_en_pot: orNull(f.date_mise_en_pot), ddm: orNull(f.ddm) };
      return write(l ? sb.from('lots').update(row).eq('id', l.id) : sb.from('lots').insert(row), 'Lot enregistré');
    }
  });
}
function articleForm(a) {
  sheet({
    title: a ? 'Modifier l’article' : 'Ajouter un article',
    fields: [
      { name: 'nom', label: 'Nom', required: true, value: a?.nom },
      { name: 'unite', label: 'Unité (kg, L, unité…)', required: true, value: a?.unite || 'unité' },
      { name: 'stock', label: 'Stock actuel', type: 'number', step: '0.01', min: 0, required: true, value: a?.stock ?? 0 },
      { name: 'seuil', label: 'Seuil d’alerte', type: 'number', step: '0.01', min: 0, required: true, value: a?.seuil ?? 0 }
    ],
    submit: (f) => { const row = { ...f, stock: num(f.stock), seuil: num(f.seuil) }; return write(a ? sb.from('articles').update(row).eq('id', a.id) : sb.from('articles').insert(row), 'Article enregistré'); }
  });
}
function clientForm(c) {
  const fromSale = S.route === 'vente';
  sheet({
    title: c ? 'Modifier le client' : 'Ajouter un client',
    fields: [
      { name: 'nom', label: 'Nom', required: true, value: c?.nom },
      { name: 'cercle', label: 'Cercle', type: 'select', options: CERCLES, value: c?.cercle || 'Amis' },
      { name: 'telephone', label: 'Téléphone', type: 'tel', value: c?.telephone },
      { name: 'email', label: 'E-mail', type: 'email', value: c?.email },
      { name: 'notes', label: 'Notes', type: 'textarea', value: c?.notes }
    ],
    submit: async (f) => {
      if (c) return write(sb.from('clients').update(f).eq('id', c.id), 'Client enregistré');
      const { data, error } = await sb.from('clients').insert(f).select().single();
      if (error) throw error;
      if (fromSale) S.vente.client_id = data.id;
      await refresh();
      toast('Client enregistré');
    }
  });
}

/* ---------- Actions ---------- */
const go = (r) => { S.route = r; render(); };
function readVisitForm() {
  const d = document.getElementById('v_date'); if (!d) return;
  S.visite.date_visite = d.value;
  S.visite.poids_kg = document.getElementById('v_poids').value;
  S.visite.note = document.getElementById('v_note').value;
}
function readSaleForm() {
  const c = document.getElementById('s_client'); if (c) S.vente.client_id = c.value;
  const d = document.getElementById('s_date'); if (d) S.vente.date_vente = d.value;
}
const twoStep = async (el, label, run) => {
  if (el.dataset.armed) { el.disabled = true; try { await run(); } catch (e) { fail(e); el.disabled = false; } return; }
  el.dataset.armed = '1';
  el.textContent = label;
  setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.textContent = 'Supprimer'; } }, 4000);
};

const ACT = {
  go: (v) => go(v),
  authmode: (v) => { S.authMode = v; S.authMsg = ''; authView(); },
  logout: async () => { await sb.auth.signOut(); },
  ruche: (v) => { S.ruche = v; go('ruche'); },
  cancel: () => go('dash'),
  closesheet: () => $sheet.close(),
  sheetdel: (v, k, el) => twoStep(el, 'Confirmer', async () => { await sheet.del(); $sheet.close(); }),
  newvisite: (v) => { S.visite = { ruche_id: v || S.d.ruches[0]?.id, date_visite: today(), activite: 'Normale', provisions: 'Moyennes', reine: 'Non cherchée', poids_kg: '', note: '', q: {} }; go('visite'); },
  vset: (v, k) => { readVisitForm(); S.visite[k] = v; viewVisite(); },
  vstep: (v, k) => {
    readVisitForm();
    const a = byId(S.d.articles, k);
    S.visite.q[k] = Math.max(0, Math.min(Number(a.stock), (S.visite.q[k] || 0) + Number(v)));
    viewVisite();
  },
  newvente: () => { S.vente = { client_id: '', date_vente: today(), q: {} }; go('vente'); },
  sstep: (v, k) => {
    readSaleForm();
    const l = byId(S.d.lots, k);
    S.vente.q[k] = Math.max(0, Math.min(l.pots_restants, (S.vente.q[k] || 0) + Number(v)));
    viewVente();
  },
  newruche: () => rucheForm(),
  editruche: (v) => rucheForm(byId(S.d.ruches, v)),
  newlot: () => lotForm(),
  editlot: (v) => lotForm(byId(S.d.lots, v)),
  newarticle: () => articleForm(),
  editarticle: (v) => articleForm(byId(S.d.articles, v)),
  newclient: () => { if (S.route === 'vente') readSaleForm(); clientForm(); },
  editclient: (v) => clientForm(byId(S.d.clients, v)),
  newrecolte: () => sheet({
    title: 'Saisir une récolte',
    fields: [
      { name: 'ruche_id', label: 'Origine', type: 'select', options: [['', 'Toutes les ruches']].concat(S.d.ruches.map((r) => [r.id, r.nom])), value: '' },
      { name: 'kg', label: 'Quantité (kg)', type: 'number', step: '0.1', min: 0.1, required: true },
      { name: 'date_recolte', label: 'Date', type: 'date', required: true, value: today() }
    ],
    submit: (f) => write(sb.from('recoltes').insert({ ...f, ruche_id: orNull(f.ruche_id), kg: num(f.kg) }), 'Récolte enregistrée')
  }),
  entree: (v) => {
    const a = byId(S.d.articles, v);
    sheet({
      title: 'Entrée de stock : ' + a.nom, label: 'Ajouter',
      fields: [{ name: 'q', label: `Quantité reçue (${a.unite})`, type: 'number', step: '0.01', min: 0.01, required: true }],
      submit: (f) => write(sb.from('articles').update({ stock: Number(a.stock) + num(f.q) }).eq('id', a.id), 'Stock mis à jour')
    });
  },
  newdepense: () => sheet({
    title: 'Ajouter une dépense',
    fields: [
      { name: 'libelle', label: 'Libellé', required: true },
      { name: 'categorie', label: 'Poste', type: 'select', options: CATEGORIES, value: 'Matériel' },
      { name: 'montant', label: 'Montant (€)', type: 'number', step: '0.01', min: 0, required: true },
      { name: 'date_depense', label: 'Date', type: 'date', required: true, value: today() }
    ],
    submit: (f) => write(sb.from('depenses').insert({ ...f, montant: num(f.montant) }), 'Dépense enregistrée')
  }),
  delvisite: (v, k, el) => twoStep(el, 'Confirmer', () => write(sb.from('visites').delete().eq('id', v), 'Visite supprimée, stock rétabli')),
  delvente: (v, k, el) => twoStep(el, 'Confirmer', () => write(sb.from('ventes').delete().eq('id', v), 'Vente supprimée, stock rétabli')),
  delrecolte: (v, k, el) => twoStep(el, 'Confirmer', () => write(sb.from('recoltes').delete().eq('id', v), 'Récolte supprimée')),
  deldepense: (v, k, el) => twoStep(el, 'Confirmer', () => write(sb.from('depenses').delete().eq('id', v), 'Dépense supprimée'))
};

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  e.preventDefault();
  try { await ACT[b.dataset.act](b.dataset.v, b.dataset.k, b); } catch (err) { fail(err); }
});

document.addEventListener('submit', async (e) => {
  const form = e.target.dataset.form;
  if (!form) return;
  e.preventDefault();
  if (form === 'auth') return submitAuth(e.target);
  if (S.busy) return;
  try {
    if (form === 'visite') {
      readVisitForm();
      const v = S.visite;
      if (!v.ruche_id) throw new Error('Choisissez une ruche');
      S.busy = true;
      const intrants = Object.entries(v.q).filter(([, q]) => q > 0).map(([article_id, quantite]) => ({ article_id, quantite }));
      const { error } = await sb.rpc('creer_visite', { p: { ...v, q: undefined, intrants } });
      if (error) throw error;
      S.ruche = v.ruche_id; S.route = 'ruche';
      await refresh();
      toast('Visite enregistrée');
    } else if (form === 'vente') {
      readSaleForm();
      const v = S.vente;
      if (!v.client_id) throw new Error('Choisissez un client');
      const lignes = Object.entries(v.q).filter(([, q]) => q > 0).map(([lot_id, quantite]) => ({ lot_id, quantite }));
      if (!lignes.length) throw new Error('Ajoutez au moins un pot');
      S.busy = true;
      const { error } = await sb.rpc('creer_vente', { p: { client_id: v.client_id, date_vente: v.date_vente, lignes } });
      if (error) throw error;
      S.route = 'clients';
      await refresh();
      toast('Vente enregistrée');
    }
  } catch (err) { fail(err); } finally { S.busy = false; }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && S.d && !['visite', 'vente'].includes(S.route) && !$sheet.open) refresh().catch(() => {});
});

/* ---------- Démarrage ---------- */
async function boot() {
  const { data } = await sb.auth.getSession();
  S.session = data.session;
  if (!S.session) { S.d = null; S.member = null; return render(); }
  render();
  try {
    const m = await sb.rpc('est_membre');
    S.member = m.data === true;
    if (S.member) await loadAll();
  } catch (e) { fail(e); }
  render();
}
sb.auth.onAuthStateChange((ev) => {
  if (ev === 'PASSWORD_RECOVERY') { S.recovery = true; render(); return; }
  if (ev === 'SIGNED_IN' && S.session) return;
  if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setTimeout(boot, 0);
});
boot();
