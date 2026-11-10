// Apiviz — envoi des erreurs au journal de production (IT-03, AP-FEAT-016).
// app.js garde journaliser() (console et 50 entrées sur l'appareil, AP-FEAT-036) ; cette file en reçoit une copie,
// regroupe les erreurs identiques et les envoie par la fonction SQL journaliser_erreur (migration 013).
// Rien n'est envoyé sans session ni réseau ; jamais d'e-mail ni de donnée métier : seulement version, écran,
// type, message nettoyé et emplacement dans le code.

const COURRIEL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const GUILLEMETS = /« [^»]{1,80} »|"[^"]{1,80}"/g;

/** Message sans e-mail, sans identifiant, sans texte saisi entre guillemets (noms de ruches, de clients…). */
export function nettoyer(message) {
  return String(message ?? "")
    .replace(COURRIEL, "[e-mail]")
    .replace(UUID, "[id]")
    .replace(GUILLEMETS, "[texte]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

/** Empreinte courte et stable (FNV-1a 32 bits, en hexadécimal) : même erreur, même écran, même version. */
export function empreinte(...parties) {
  let h = 0x811c9dc5;
  for (const c of parties.join("|")) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

/**
 * File d'envoi regroupée.
 * envoyer(p) : promesse ; p = { empreinte, version, ecran, message, source, nombre }.
 * pret() : vrai si l'on peut envoyer (session ouverte, réseau). minuterie : setTimeout injectable pour les tests.
 */
export function creerFile({ envoyer, version = "dev", pret = () => true, delai = 5000, minuterie = setTimeout, maxParSession = 100 }) {
  const attente = new Map(); // empreinte -> charge, avec « nombre »
  let planifie = null, envoyes = 0, enCours = false;

  function signaler(type, entree) {
    const message = nettoyer(`${type} : ${entree?.code ? entree.code + " " : ""}${entree?.message ?? ""}`);
    const ecran = String(entree?.route ?? "").slice(0, 40);
    const source = nettoyer(entree?.source ?? "").slice(0, 200);
    const cle = empreinte(version, ecran, message);
    const deja = attente.get(cle);
    if (deja) deja.nombre++;
    else attente.set(cle, { empreinte: cle, version, ecran, message, source, nombre: 1 });
    if (!planifie) planifie = minuterie(vider, delai);
  }

  async function vider() {
    planifie = null;
    if (enCours || !attente.size) return;
    if (!pret()) { planifie = minuterie(vider, delai * 6); return; }
    enCours = true;
    try {
      for (const [cle, charge] of [...attente]) {
        if (envoyes >= maxParSession) { attente.clear(); break; }
        attente.delete(cle);
        envoyes++;
        try { await envoyer(charge); } catch { /* le journal ne doit jamais gêner l'application */ }
      }
    } finally { enCours = false; }
  }

  return { signaler, vider, taille: () => attente.size };
}
