// Apiviz — assistant API (IT-24) : appel de la fonction serveur « assistant » de la base de l'environnement
// (apidoo-test en recette, apidoo en production : window.APIDOO.url). Jeton de l'utilisateur et exploitation choisie
// (en-tête x-exploitation, comme pour la base). Globales lues à l'appel : sb, APIDOO.

let cache = null, cleCache = "", enVol = null;

const exploitation = () => (typeof sb != "undefined" && sb.rest?.headers?.["x-exploitation"]) || "";

async function appeler(corps) {
  const { data } = await sb.auth.getSession();
  const jeton = data?.session?.access_token;
  if (!jeton) throw Object.assign(new Error("Connecte-toi pour parler à API."), { code: "connexion" });
  const x = exploitation();
  const rep = await fetch(`${window.APIDOO.url}/functions/v1/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jeton}`, apikey: window.APIDOO.key, ...(x ? { "x-exploitation": x } : {}) },
    body: JSON.stringify(corps),
  });
  const j = await rep.json().catch(() => ({}));
  if (!rep.ok) {
    if (j.code === "gouttes" && cache) cache.gouttes = Number(j.gouttes?.restant ?? 0);
    throw Object.assign(new Error(j.erreur || "API n'a pas pu répondre. Réessaie dans un instant."), { code: j.code || String(rep.status) });
  }
  return j;
}

/** État connu ({ actif, restant, plafond, gouttes }) ou null tant qu'il n'a pas été demandé pour cette exploitation. */
export const connu = () => (cache && cleCache === exploitation() ? cache : null);

/**
 * Demande à la fonction si API est disponible ici (clé en place, réglage actif, migration 024 appliquée).
 * Tout autre résultat (fonction absente, hors ligne, base simulée des tests) vaut « pas encore » : l'application garde
 * « Bientôt ». Un échec n'est pas gardé : la question est reposée à la prochaine ouverture.
 */
export function etat() {
  if (connu()) return Promise.resolve(cache);
  if (enVol) return enVol;
  const cle = exploitation();
  enVol = appeler({ etat: true })
    .then((r) => {
      // gouttes (migration 029) : gouttes restantes de l'exploitation, null sur une base sans offres.
      const st = { actif: r.actif === true, restant: Number.isInteger(r.restant) ? r.restant : null, plafond: Number.isInteger(r.plafond) ? r.plafond : null,
        gouttes: typeof r.gouttes === "number" ? r.gouttes : null };
      cache = st; cleCache = cle;
      // v5.72 : retenu sur l'appareil, pour que l'espace API reste ouvert sans réseau (réponses du téléphone).
      try { localStorage.setItem(`apiviz.api.actif.${cle}`, st.actif ? "1" : "0"); } catch { /* navigation privée */ }
      return st;
    })
    .catch(() => ({ actif: false, restant: null, plafond: null, gouttes: null }))
    .finally(() => { enVol = null; });
  return enVol;
}

/** v5.72 : API était disponible pour cette exploitation la dernière fois qu'on l'a demandé (sur cet appareil). */
export const etaitActif = () => { try { return localStorage.getItem(`apiviz.api.actif.${exploitation()}`) === "1"; } catch { return false; } };

/** Pose une question. Renvoie { reponse, restant, gouttes } ; lève une erreur au message en français (code « gouttes » :
 * plus de gouttes). mode : « rapide » ou « approfondi » (IT-27). */
export async function demander(question, historique, mode) {
  const r = await appeler({ question, historique, ...(mode ? { mode } : {}) });
  if (cache && Number.isInteger(r.restant)) cache.restant = r.restant;
  if (cache && r.gouttes && Number.isFinite(Number(r.gouttes.restant))) cache.gouttes = Number(r.gouttes.restant);
  return r;
}

/** Pour les tests : oublie l'état. */
export function _oublier() { cache = null; cleCache = ""; enVol = null; }
