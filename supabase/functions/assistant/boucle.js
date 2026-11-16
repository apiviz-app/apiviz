// Apiviz — assistant API (IT-24) : boucle lectures → réponse. Pure : l'appel au modèle et les lectures sont injectés,
// ce qui permet de la tester sans réseau (tests/unitaires/assistant.test.mjs).
//
// À chaque tour, le modèle doit appeler un outil (tool_choice « any ») : une ou plusieurs lectures, ou « repondre ».
// Au dernier tour, « repondre » est imposé. Une réponse mal formée est redemandée une fois, puis abandonnée.

import { executer } from "./outils.js";
import { erreursFormat, nettoyer } from "./regles.js";

export const TOURS = 6;

/**
 * @param {object} p
 * @param {Array} p.messages      premier message utilisateur (instantané + question)
 * @param {(messages: Array, forcer: boolean) => Promise<{content: Array, usage?: object}>} p.appel  appel au modèle
 * @param {object} p.db           client Supabase de l'utilisateur
 * @param {Set<string>} p.ids     identifiants déjà lus (instantané)
 * @param {object} p.ctx          { jour, fetch? }
 * @param {Function} [p.lire]     exécution d'un outil (par défaut outils.executer)
 * @returns {Promise<{ reponse?: object, retraits?: object, lus: string[], tours: number, usage: object, echec?: "format" | "tours" }>}
 */
export async function boucle({ messages, appel, db, ids, ctx, lire = executer, tours = TOURS }) {
  const lus = [];
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  let essaisFormat = 0;
  for (let tour = 0; tour < tours; tour++) {
    const r = await appel(messages, tour === tours - 1);
    for (const k of Object.keys(usage)) usage[k] += Number(r.usage?.[k] || 0);
    messages.push({ role: "assistant", content: r.content });
    const appels = (r.content || []).filter((b) => b.type === "tool_use");
    const fin = appels.find((b) => b.name === "repondre");
    if (fin) {
      const erreurs = erreursFormat(fin.input);
      if (!erreurs.length) return { ...nettoyer(fin.input, ids), lus, tours: tour + 1, usage };
      if (++essaisFormat > 1) return { lus, tours: tour + 1, usage, echec: "format" };
      messages.push({
        role: "user",
        content: appels.map((b) => ({
          type: "tool_result", tool_use_id: b.id, is_error: b.name === "repondre",
          content: b.name === "repondre" ? `Format invalide : ${erreurs.join(" ")} Rappelle « repondre » avec un format correct.` : "Ignoré : réponds maintenant.",
        })),
      });
      continue;
    }
    if (!appels.length) {
      // Texte sans outil (ne devrait pas arriver avec tool_choice « any ») : on demande la réponse finale.
      messages.push({ role: "user", content: "Termine par l'outil « repondre »." });
      continue;
    }
    const resultats = await Promise.all(appels.map(async (b) => {
      lus.push(b.name);
      const res = await lire(b.name, b.input, db, ids, ctx);
      return { type: "tool_result", tool_use_id: b.id, content: JSON.stringify(res).slice(0, 60000) };
    }));
    messages.push({ role: "user", content: resultats });
  }
  return { lus, tours, usage, echec: "tours" };
}
