// Apiviz — e-mails envoyés par Apiviz (v5.90, migration 042), par l'API de Brevo (service français, données en France et
// en Allemagne). Règles pures, sans accès réseau sauf envoyer() qui reçoit fetch : partagé par les fonctions serveur
// « courriels » et « supprimer-comptes » (chaque fonction est déployée avec ses seuls fichiers : même fichier dans les
// deux dossiers, tests/unitaires/courriel.test.mjs vérifie qu'ils sont identiques).
//
// Ton : tutoiement, comme l'application (docs/CHARTE_DE_TON.md). Jamais de contenu de l'exploitation dans un e-mail :
// seulement le prénom, une date et un lien vers Apiviz.

export const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
export const NATURES = ["preavis-inactivite", "suppression-demandee"];

const echapper = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** « 24 décembre 2026 », heure de Paris. */
export function dateLongue(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

/** « Apiviz <bonjour@apiviz.fr> » → { name, email } ; null si l'adresse manque. */
export function expediteurDe(texte) {
  const s = String(texte || "").trim();
  const m = s.match(/^(.*?)\s*<([^<>\s]+@[^<>\s]+)>$/);
  if (m) return { name: m[1].trim() || "Apiviz", email: m[2] };
  return /^[^<>\s]+@[^<>\s]+$/.test(s) ? { name: "Apiviz", email: s } : null;
}

function gabarit(titre, paragraphes, bouton, lien) {
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f3ea;font-family:Arial,Helvetica,sans-serif;color:#1e2b24">
<div style="max-width:520px;margin:0 auto;padding:28px 22px">
<p style="font-weight:bold;font-size:20px;margin:0 0 18px">Apiviz</p>
<h1 style="font-size:20px;line-height:1.3;margin:0 0 14px">${echapper(titre)}</h1>
${paragraphes.map((p) => `<p style="font-size:16px;line-height:1.5;margin:0 0 12px">${echapper(p)}</p>`).join("\n")}
<p style="margin:22px 0"><a href="${echapper(lien)}" style="background:#1e2b24;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block;font-size:16px">${echapper(bouton)}</a></p>
<p style="font-size:13px;color:#5b6660;margin:24px 0 0">Cet e-mail t'est envoyé parce que tu as un compte Apiviz. Pour toute question, réponds simplement à ce message.</p>
</div></body></html>`;
  const texte = `${titre}\n\n${paragraphes.join("\n\n")}\n\n${bouton} : ${lien}\n\n-- \nApiviz. Cet e-mail t'est envoyé parce que tu as un compte Apiviz. Pour toute question, réponds à ce message.`;
  return { html, texte };
}

const bonjour = (prenom) => (String(prenom || "").trim() ? `Bonjour ${String(prenom).trim()},` : "Bonjour,");

/** Préavis : compte sans activité depuis 3 ans, effacé à la date donnée sauf reconnexion. */
export function preavisInactivite({ prenom, effacement_le, lien }) {
  const date = dateLongue(effacement_le);
  const sujet = `Ton compte Apiviz sera supprimé le ${date}`;
  return { sujet, ...gabarit(sujet, [
    bonjour(prenom),
    "Tu n'as pas ouvert Apiviz depuis plus de trois ans. Pour ne pas garder tes données sans raison, nous supprimerons ton compte et les exploitations dont tu es le seul membre le " + date + ".",
    "Tu veux le garder ? Il suffit de te reconnecter avant cette date : rien ne sera supprimé. Tu peux aussi télécharger tes données depuis Réglages › Mes données.",
    "Les exploitations que tu partages avec d'autres membres leur restent.",
  ], "Ouvrir Apiviz", lien) };
}

/** Confirmation d'une demande de suppression (041) : date d'effacement, annulable en se reconnectant. */
export function suppressionDemandee({ prenom, effacement_le, lien }) {
  const date = dateLongue(effacement_le);
  const sujet = "Ta demande de suppression de compte est bien prise en compte";
  return { sujet, ...gabarit(sujet, [
    bonjour(prenom),
    `Tu as demandé la suppression de ton compte Apiviz et de tes données. Elle aura lieu le ${date}.`,
    "Tu as changé d'avis ? Reconnecte-toi avant cette date et touche « Annuler la suppression ».",
    "Si tu n'es pas à l'origine de cette demande, reconnecte-toi tout de suite pour l'annuler, puis change ton mot de passe.",
  ], "Ouvrir Apiviz", lien) };
}

/** Corps de la requête Brevo. */
export function corpsBrevo({ expediteur, a, nom, message, nature }) {
  return {
    sender: expediteur,
    to: [{ email: a, ...(String(nom || "").trim() ? { name: String(nom).trim() } : {}) }],
    subject: message.sujet,
    htmlContent: message.html,
    textContent: message.texte,
    tags: [nature],
  };
}

/** Envoi par Brevo. { ok: true, id } ou { ok: false, statut, erreur } ; ne lève jamais. */
export async function envoyer(fetchFn, cle, corps) {
  try {
    const r = await fetchFn(BREVO_URL, {
      method: "POST",
      headers: { "api-key": cle, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(corps),
    });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, id: j.messageId || "" } : { ok: false, statut: r.status, erreur: String(j.message || j.code || `HTTP ${r.status}`) };
  } catch (e) {
    return { ok: false, statut: 0, erreur: String(e?.message || e) };
  }
}
