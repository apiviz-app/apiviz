// Apiviz — essaimage (v5.43, AP-US-042, maquette du 15 nov. 2026).
// Des cellules royales operculées notées à la dernière visite d'une colonie active :
//   - une carte « Essaimage » sur l'accueil, sous la priorité d'API (completerAccueil) ;
//   - une tâche proposée juste après l'enregistrement (proposerTacheEssaimage), échéance modifiable.
// Repère d'observation, sans seuil ni délai réglementaire. L'alerte disparaît dès qu'une visite plus récente ne note
// plus de cellules operculées. La tâche passe par write() : file d'envoi hors ligne comprise (offline.js).
// Globales d’app.js lues à l’appel : S, esc, byId, today, sheet, sb, write, $sheet.
import { alertesEssaimage, tacheEssaimage, jourMoisCourt } from "./regles.js";

/** Feuille « Ruche 4 : essaimage possible » ; ensuite() est appelé quand elle se ferme (ruche suivante d'une série). */
export function proposerTacheEssaimage(rucheId, ensuite = null) {
  const r = byId(S.d.ruches, rucheId);
  if (!r || typeof sheet != "function") return ensuite?.();
  const t = tacheEssaimage(r.nom, today());
  sheet({
    title: `${r.nom} : essaimage possible`,
    intro: "Tu as noté des cellules royales operculées. On garde un œil dessus ? Échéance proposée dans 6 jours, à changer comme tu veux.",
    fields: [
      { name: "titre", label: "Tâche", required: true, value: t.titre },
      { name: "echeance", label: "Échéance", type: "date", required: true, value: t.echeance },
    ],
    label: "Ajouter la tâche",
    submit: async (f) => { await write(sb.from("taches").insert({ titre: f.titre.trim(), echeance: f.echeance, ruche_id: r.id }), "Tâche ajoutée"); },
  });
  if (ensuite) $sheet.addEventListener("close", () => setTimeout(ensuite, 0), { once: true });
}

/** Carte « Essaimage » de l'accueil, après la priorité d'API. */
export function completerAccueil() {
  const wrap = document.querySelector(".wrap.ac") || document.querySelector(".wrap");
  if (!wrap || !S.d || wrap.querySelector(".es-carte")) return;
  const l = alertesEssaimage(S.d);
  if (!l.length) return;
  const lignes = l.map(({ ruche, visite }) => `<button type="button" class="es-ligne" data-act="ruche" data-v="${esc(ruche.id)}">
      <span><b>${esc(ruche.nom)}</b><small class="small">Cellules royales operculées le ${esc(jourMoisCourt(visite.date_visite))}</small></span><span class="es-puce">Essaimage</span></button>`).join("");
  const ancre = wrap.querySelector(":scope > .ac-haut") || wrap.querySelector(":scope > .ac-api") || wrap.querySelector(":scope > .ac-hero");
  const html = `<section class="card es-carte" aria-label="Essaimage"><h2>Essaimage à surveiller</h2>${lignes}</section>`;
  ancre ? ancre.insertAdjacentHTML("afterend", html) : wrap.insertAdjacentHTML("afterbegin", html);
}
