// Apidoo — étiquettes de pots (version bêta).
// Une planche A4 de 21 étiquettes 63,5 × 38,1 mm (format courant, type Avery L7160), à imprimer à 100 %.
// S'appuie sur app.js (S, cfg, sheet, toast…).
const ET = (() => {
  const PAR_PLANCHE = 21;
  const $zone = document.createElement("div");
  $zone.id = "etiqPrint";
  $zone.setAttribute("aria-hidden", "true");
  document.body.appendChild($zone);
  addEventListener("afterprint", () => { document.body.classList.remove("print-etiq"); $zone.innerHTML = ""; });

  const variete = (m) => {
    const t = String(m || "").trim();
    if (!t) return "Miel";
    return /^miel\b/i.test(t) ? t : "Miel " + t.charAt(0).toLowerCase() + t.slice(1);
  };

  function etiquette(lot, c) {
    const adr = String(c.adresse || "").split(/\n/).map((l) => l.trim()).filter(Boolean).join(" · ");
    return `<div class="et"><div class="et-nom">${esc(variete(lot.miel))}</div>
      <div class="et-poids">Poids net : ${esc(n(lot.format_g, 0))} g</div>
      <div>Origine : ${esc(c.origine || "France")}</div>
      <div>À consommer de préférence avant le ${esc(dfr(lot.ddm))}</div>
      <div>Lot ${esc(lot.code)}</div>
      <div class="et-pied">${esc(c.nom)}${adr ? " · " + esc(adr) : ""}</div></div>`;
  }

  function imprimer(lot, nombre, deja) {
    const c = cfg();
    const cases = Array(deja).fill('<div class="et et-vide"></div>').concat(Array(nombre).fill(etiquette(lot, c)));
    const planches = [];
    for (let i = 0; i < cases.length; i += PAR_PLANCHE) planches.push(`<div class="et-planche">${cases.slice(i, i + PAR_PLANCHE).join("")}</div>`);
    $zone.innerHTML = planches.join("");
    document.body.classList.add("print-etiq");
    setTimeout(() => window.print(), 50);
  }

  ACT.etiq = (id) => {
    const lot = byId(S.d.lots, id), c = cfg();
    if (!lot) return;
    if (!String(c.adresse || "").trim()) { toast("Ajoute d’abord ton adresse dans Réglages : elle doit figurer sur l’étiquette", true); return (S.rgForm = true, go("reglages")); }
    sheet({
      title: "Étiquettes · lot " + lot.code,
      intro: "Planche A4 de 21 étiquettes 63,5 × 38,1 mm. Imprime à 100 %, sans mise à l’échelle.",
      label: "Imprimer",
      fields: [
        { name: "nombre", label: "Nombre d’étiquettes", type: "number", step: "1", min: 1, required: true, value: Math.min(Number(lot.pots_initiaux) || 1, 210) },
        { name: "deja", label: "Cases déjà utilisées sur la première planche", type: "number", step: "1", min: 0, required: true, value: 0 },
      ],
      submit: async (v) => {
        if (!lot.ddm) throw new Error("Renseigne d’abord la DDM du lot (touche son numéro dans Stocks)");
        const nombre = Math.max(1, Math.min(210, Math.round(Number(v.nombre)))), deja = Math.max(0, Math.min(PAR_PLANCHE - 1, Math.round(Number(v.deja))));
        imprimer(lot, nombre, deja);
      },
    });
  };

  const bouton = (lot) => `<button class="btn sm" data-act="etiq" data-v="${lot.id}">Étiquettes</button>`;
  return { bouton, etiquette };
})();
