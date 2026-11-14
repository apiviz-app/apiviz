// Apiviz — règles du profil et de l'inscription (v5.38, migration 021). Fonctions pures, testées par
// tests/unitaires/profil.test.mjs. Les codes sont ceux des contraintes de la table profils.

export const AGES = [["15-24", "15–24 ans"], ["25-34", "25–34"], ["35-49", "35–49"], ["50-64", "50–64"], ["65+", "65 et plus"]];
export const SEXES = [["femme", "Une femme"], ["homme", "Un homme"], ["autre", "Autre"], ["nr", "Je préfère ne pas répondre"]];
export const ANCIENNETES = [["0", "Cette année"], ["1-3", "1 à 3 ans"], ["4-10", "4 à 10 ans"], ["10+", "Plus de 10 ans"]];
export const ACTIVITES = [["loisir", "Loisir"], ["pluriactif", "Pluriactif"], ["professionnel", "Professionnel"]];
export const COLONIES = [["1-10", "1 à 10"], ["11-50", "11 à 50"], ["51-150", "51 à 150"], ["150+", "Plus de 150"]];
export const SOURCES = [["bouche", "Bouche-à-oreille"], ["syndicat", "Syndicat ou GDS"], ["rucher-ecole", "Rucher-école"], ["salon", "Salon"],
  ["reseaux", "Réseaux sociaux"], ["recherche", "Recherche web"], ["store", "Store"], ["autre", "Autre"]];
const CHAMPS = { tranche_age: AGES, sexe: SEXES, anciennete: ANCIENNETES, activite: ACTIVITES, colonies: COLONIES, source: SOURCES };

/** Profil vide (réponses facultatives effacées). */
export const vide = () => ({ prenom: "", nom: "", tranche_age: "", sexe: "", code_postal: "", anciennete: "", activite: "", colonies: "", source: "", newsletter: false });

/** Libellé d'un code, ou « » s'il n'y a pas de réponse. */
export const libelle = (liste, code) => (liste.find(([k]) => k === code) || [, ""])[1];

/** Département déduit d'un code postal (comme le déclencheur de 021) : « 33 », « 2A », « 974 », ou « ». */
export function departement(cp) {
  const c = String(cp || "").trim();
  if (!/^[0-9]{5}$/.test(c)) return "";
  if (c.startsWith("97")) return c.slice(0, 3);
  if (c.startsWith("20")) return c < "20200" ? "2A" : "2B";
  return c.slice(0, 2);
}

const DEPARTEMENTS = {
  "01": "Ain", "02": "Aisne", "03": "Allier", "04": "Alpes-de-Haute-Provence", "05": "Hautes-Alpes", "06": "Alpes-Maritimes", "07": "Ardèche",
  "08": "Ardennes", "09": "Ariège", "10": "Aube", "11": "Aude", "12": "Aveyron", "13": "Bouches-du-Rhône", "14": "Calvados", "15": "Cantal",
  "16": "Charente", "17": "Charente-Maritime", "18": "Cher", "19": "Corrèze", "2A": "Corse-du-Sud", "2B": "Haute-Corse", "21": "Côte-d’Or",
  "22": "Côtes-d’Armor", "23": "Creuse", "24": "Dordogne", "25": "Doubs", "26": "Drôme", "27": "Eure", "28": "Eure-et-Loir", "29": "Finistère",
  "30": "Gard", "31": "Haute-Garonne", "32": "Gers", "33": "Gironde", "34": "Hérault", "35": "Ille-et-Vilaine", "36": "Indre", "37": "Indre-et-Loire",
  "38": "Isère", "39": "Jura", "40": "Landes", "41": "Loir-et-Cher", "42": "Loire", "43": "Haute-Loire", "44": "Loire-Atlantique", "45": "Loiret",
  "46": "Lot", "47": "Lot-et-Garonne", "48": "Lozère", "49": "Maine-et-Loire", "50": "Manche", "51": "Marne", "52": "Haute-Marne", "53": "Mayenne",
  "54": "Meurthe-et-Moselle", "55": "Meuse", "56": "Morbihan", "57": "Moselle", "58": "Nièvre", "59": "Nord", "60": "Oise", "61": "Orne",
  "62": "Pas-de-Calais", "63": "Puy-de-Dôme", "64": "Pyrénées-Atlantiques", "65": "Hautes-Pyrénées", "66": "Pyrénées-Orientales", "67": "Bas-Rhin",
  "68": "Haut-Rhin", "69": "Rhône", "70": "Haute-Saône", "71": "Saône-et-Loire", "72": "Sarthe", "73": "Savoie", "74": "Haute-Savoie", "75": "Paris",
  "76": "Seine-Maritime", "77": "Seine-et-Marne", "78": "Yvelines", "79": "Deux-Sèvres", "80": "Somme", "81": "Tarn", "82": "Tarn-et-Garonne",
  "83": "Var", "84": "Vaucluse", "85": "Vendée", "86": "Vienne", "87": "Haute-Vienne", "88": "Vosges", "89": "Yonne", "90": "Territoire de Belfort",
  "91": "Essonne", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis", "94": "Val-de-Marne", "95": "Val-d’Oise", "971": "Guadeloupe",
  "972": "Martinique", "973": "Guyane", "974": "La Réunion", "976": "Mayotte",
};
/** « Gironde », « La Réunion », ou « » : ce que l'écran affiche à côté du code postal. */
export const lieu = (cp) => DEPARTEMENTS[departement(cp)] || "";

/** Contrôle des réponses avant envoi : message, ou null. Tout est facultatif ; seul un code postal tapé doit être bon. */
export function controle(b) {
  const cp = String(b?.code_postal || "").trim();
  if (cp && !/^[0-9]{5}$/.test(cp)) return "Le code postal a cinq chiffres.";
  for (const [k, liste] of Object.entries(CHAMPS)) if (b?.[k] && !liste.some(([c]) => c === b[k])) return "Une réponse n’est pas reconnue.";
  return null;
}

/** Les réponses facultatives à enregistrer (codes vides si pas de réponse). */
export function reponses(b) {
  const r = { code_postal: /^[0-9]{5}$/.test(String(b?.code_postal || "").trim()) ? String(b.code_postal).trim() : "" };
  for (const [k, liste] of Object.entries(CHAMPS)) r[k] = liste.some(([c]) => c === b?.[k]) ? b[k] : "";
  return r;
}

/** Personnes sans compte de l'exploitation (réglage « associes », gardé depuis 017). */
export const sansCompte = (reglages) => (Array.isArray(reglages?.associes) ? reglages.associes : []).map((x) => String(x || "").trim()).filter((x) => x && x.toLowerCase() !== "société");
