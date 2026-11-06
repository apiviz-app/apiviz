// Apidoo — rappels (version bêta).
// Les tâches datées partent dans l'agenda du téléphone (fichier .ics avec alerte à 9 h),
// et l'icône de l'app affiche le nombre de points à surveiller.
const RP = (() => {
  // ---------- Fichier calendrier ----------
  const echap = (t) => String(t ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const jour = (d) => String(d).replace(/-/g, "");
  // Lignes de plus de 75 octets repliées, comme le veut le format.
  const plier = (l) => {
    const out = []; let cur = "", n = 0;
    for (const ch of l) {
      const b = new TextEncoder().encode(ch).length;
      if (n + b > 73) { out.push(cur); cur = " "; n = 1; }
      cur += ch; n += b;
    }
    out.push(cur);
    return out.join("\r\n");
  };
  const aExporter = () => S.d.taches.filter((t) => !t.faite && t.echeance && t.echeance >= today());

  function ics() {
    const nom = cfg().nom, maintenant = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const ev = aExporter().map((t) => {
      const r = t.ruche_id ? byId(S.d.ruches, t.ruche_id)?.nom : "";
      return ["BEGIN:VEVENT", `UID:tache-${t.id}@apidoo`, `DTSTAMP:${maintenant}`,
        `DTSTART:${jour(t.echeance)}T090000`, `DTEND:${jour(t.echeance)}T093000`,
        `SUMMARY:${echap("Apidoo · " + t.titre)}`,
        `DESCRIPTION:${echap([nom, r && "Ruche : " + r, t.assigne && "Qui : " + t.assigne].filter(Boolean).join("\n"))}`,
        "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${echap(t.titre)}`, "TRIGGER:PT0M", "END:VALARM",
        "END:VEVENT"];
    }).flat();
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Apidoo//Taches//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...ev, "END:VCALENDAR"]
      .map(plier).join("\r\n") + "\r\n";
  }

  ACT.rpics = () => {
    const n = aExporter().length;
    if (!n) return toast("Aucune tâche datée à venir", true);
    download(`apidoo-taches-${today()}.ics`, ics(), "text/calendar;charset=utf-8");
    toast(n > 1 ? `${n} tâches prêtes pour l’agenda` : "1 tâche prête pour l’agenda");
  };

  // ---------- Pastille sur l'icône de l'app ----------
  function pastille() {
    if (!("setAppBadge" in navigator) || !S.d || !S.session) return;
    try {
      const n = todos().filter((t) => t[1] !== "good").length;
      (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
    } catch {}
  }
  // Pastille de l'icône mise à jour après chaque rendu (crochet du noyau, IT-03).
  Noyau.crochets.sur("apresRendu", "rappels.pastille", pastille);

  const bouton = () => (aExporter().length ? '<button class="btn" data-act="rpics">Mettre dans mon agenda</button>' : "");
  return { ics, pastille, bouton };
})();
