// Apiviz — mouvement : les passages entre le logo, le symbole et API (v5.23).
// Trois éléments graphiques sans dépendance, chargés avant app.js pour servir dès le premier écran :
//   <mv-eveil>  écran de chargement : l'œil-alvéole devient API, une alvéole par ruche se remplit ;
//   <mv-logo>   connexion : les deux points du logo s'envolent, forment API, puis reviennent ;
//   <mv-oeil>   écrans vides : le symbole suit le doigt ou la souris et cligne.
// Puis, une fois les autres scripts chargés : la coche et les éclats d'une saisie réussie, et le bouton API
// de la barre du bas qui passe dans la feuille « Que veux-tu faire ? ».
// Styles : styles/38-mouvement.css. Tout se fige avec le réglage « moins d'animations » du téléphone.
(function (racine) {
  var CORPS = "M108 68L84 30H36L12 68l24 38h48z"; // même tracé que api-compagnon.js
  var HEX = function (x, y, r) {
    var h = r * 0.866;
    return "M" + (x + r) + " " + y + "L" + (x + r / 2) + " " + (y - h) + "H" + (x - r / 2) + "L" + (x - r) + " " + y + "L" + (x - r / 2) + " " + (y + h) + "H" + (x + r / 2) + "z";
  };
  var calme = function () { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches); };
  var CLE_RUCHES = "apidoo-nb-ruches"; // nombre de ruches vu à la dernière ouverture, pour l'écran de chargement
  var lire = function () { try { return parseInt(localStorage.getItem(CLE_RUCHES), 10) || 0; } catch (e) { return 0; } };

  // ---------- <mv-eveil> : écran de chargement ----------
  var OEIL = '<g class="mv-ev-pau"><path class="mv-ev-pup" d="' + HEX(0, 0, 9) + '"/><path class="mv-ev-ref" d="' + HEX(2.5, -3.5, 2.6) + '"/></g>';
  var EVEIL =
    '<svg class="mv-ev" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><g class="mv-ev-tout">' +
      '<path class="mv-ev-tige" pathLength="1" d="M47 27C45 16 40 11 33 9"/><circle class="mv-ev-bout" cx="32" cy="9" r="5.5"/>' +
      '<path class="mv-ev-tige" pathLength="1" d="M73 27C75 16 80 11 87 9"/><circle class="mv-ev-bout" cx="88" cy="9" r="5.5"/>' +
      '<path class="mv-ev-corps" d="' + CORPS + '"/>' +
      '<g class="mv-ev-g">' + OEIL + '</g><g class="mv-ev-d">' + OEIL + "</g>" +
    "</g></svg>";

  function eveil() {
    var nb = lire(), cases = Math.min(Math.max(nb, 1), 12) || 6, i, c = "";
    if (!nb) cases = 6;
    for (i = 0; i < cases; i++) c += '<i style="--i:' + i + '"></i>';
    var texte = nb > 1 ? "Mise à jour de tes " + nb + " ruches" : nb === 1 ? "Mise à jour de ta ruche" : "Ouverture du rucher";
    return EVEIL + '<img class="mv-ev-logo" src="logo-apiviz-clair.svg" alt="">' +
      '<span class="mv-ev-cells" aria-hidden="true">' + c + "</span><span class=\"mv-ev-texte\">" + texte + "</span>";
  }

  // ---------- <mv-logo> : les points des « i » s'envolent ----------
  var texteLogo = null, demande = null, dejaJoue = false;
  function chargerLogo() {
    if (!demande) {
      demande = fetch("logo-apiviz.svg").then(function (r) { return r.ok ? r.text() : null; })
        .then(function (t) { texteLogo = t && t.indexOf("<svg") === 0 ? t : null; return texteLogo; })
        .catch(function () { return null; });
    }
    return demande;
  }

  // ---------- <mv-oeil> : le symbole regarde ----------
  var SYMBOLE =
    '<svg viewBox="0 0 200 180" aria-hidden="true" focusable="false"><polygon fill="var(--honey,#E3A008)" points="51.0,4.6 149.0,4.6 198.0,90.0 149.0,175.4 51.0,175.4 2.0,90.0"/>' +
    '<g class="mv-o-suit"><g class="mv-o-erre"><g class="mv-o-pau">' +
      '<polygon fill="var(--pine,#1E2B24)" points="77.5,50.7 122.5,50.7 145.1,90.0 122.5,129.3 77.5,129.3 54.9,90.0"/>' +
      '<polygon fill="var(--cire,#FFF8E7)" points="108.8,63.1 120.1,63.1 125.7,72.9 120.1,82.7 108.8,82.7 103.2,72.9"/>' +
    "</g></g></g></svg>";
  var yeux = new Set(), dernier = null, image = 0, repos = 0;
  function regarder() {
    image = 0;
    if (!dernier) return;
    yeux.forEach(function (o) {
      var r = o.getBoundingClientRect();
      if (!r.width || !o.regard) return;
      var dx = dernier.x - (r.left + r.width / 2), dy = dernier.y - (r.top + r.height / 2);
      var d = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(d / 6, 22) / d;
      o.regard.style.transform = "translate(" + (dx * k).toFixed(1) + "px," + (dy * k * 0.7).toFixed(1) + "px)";
      o.setAttribute("data-suit", "");
    });
  }
  function lacher() {
    yeux.forEach(function (o) { if (o.regard) o.regard.style.transform = ""; o.removeAttribute("data-suit"); });
  }
  function pointeur(e) {
    dernier = { x: e.clientX, y: e.clientY };
    if (!image) image = requestAnimationFrame(regarder);
    clearTimeout(repos); repos = setTimeout(lacher, 2500);
  }
  function ecouter(oui) {
    ["pointermove", "pointerdown"].forEach(function (ev) {
      if (oui) document.addEventListener(ev, pointeur, { passive: true }); else document.removeEventListener(ev, pointeur);
    });
  }

  if (window.customElements) {
    if (!customElements.get("mv-eveil")) customElements.define("mv-eveil", class extends HTMLElement {
      connectedCallback() { if (!this.querySelector(".mv-ev")) this.innerHTML = eveil(); }
    });

    if (!customElements.get("mv-logo")) customElements.define("mv-logo", class extends HTMLElement {
      connectedCallback() {
        var soi = this;
        if (!this.pret) { this.pret = true; this.addEventListener("click", function () { soi.jouer(); }); }
        if (this.querySelector("svg")) return;
        if (texteLogo) return this.monter();
        chargerLogo().then(function (t) { if (t && soi.isConnected && !soi.querySelector("svg")) soi.monter(); });
      }
      disconnectedCallback() { clearTimeout(this.t0); clearTimeout(this.t1); clearTimeout(this.t2); this.classList.remove("joue"); }
      monter() {
        var soi = this, h = parseInt(this.getAttribute("hauteur"), 10) || 38;
        this.innerHTML = texteLogo + '<span class="mv-envol" aria-hidden="true">' +
          (racine.Apiviz && Apiviz.compagnon ? Apiviz.compagnon("repos", 46).replace("<api-compagnon ", "<api-compagnon muet ") : "") + "</span>";
        var svg = this.querySelector("svg"), vb = svg.viewBox.baseVal, pts = svg.querySelectorAll("polygon");
        svg.setAttribute("height", h); svg.setAttribute("width", Math.round(h * vb.width / vb.height));
        svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Apiviz");
        if (pts.length === 2) { pts[0].setAttribute("class", "mv-pt mv-pt-g"); pts[1].setAttribute("class", "mv-pt mv-pt-d"); }
        // Une seule fois par ouverture de l'application : la page de connexion se redessine à chaque essai.
        if (!dejaJoue) { dejaJoue = true; this.t0 = setTimeout(function () { soi.jouer(); }, 600); }
      }
      jouer() {
        var soi = this, api = this.querySelector("api-compagnon");
        if (calme() || this.classList.contains("joue") || !this.querySelector(".mv-pt") || !api) return;
        this.classList.add("joue");
        this.t1 = setTimeout(function () { if (api.jouer) api.jouer("bonjour"); }, 880);
        this.t2 = setTimeout(function () { soi.classList.remove("joue"); }, 3500);
      }
    });

    if (!customElements.get("mv-oeil")) customElements.define("mv-oeil", class extends HTMLElement {
      connectedCallback() {
        if (!this.regard) { this.innerHTML = SYMBOLE; this.regard = this.querySelector(".mv-o-suit"); }
        if (calme()) return;
        if (!yeux.size) ecouter(true);
        yeux.add(this);
      }
      disconnectedCallback() { yeux.delete(this); if (!yeux.size) ecouter(false); }
    });
  }

  // ---------- Une fois toute l'application chargée ----------
  var REUSSITE = /enregistr|ajout|noté|encaiss|mis à jour|créée|envoyée/i, ECHEC = /impossible|erreur|échec|refus|non enregistr/i;
  var ECLATS = [[-150, "var(--honey,#E3A008)"], [-95, "var(--honey-light,#F6C453)"], [-35, "var(--cire,#FFF8E7)"], [35, "var(--honey,#E3A008)"], [95, "var(--cire,#FFF8E7)"], [150, "var(--honey-light,#F6C453)"]];
  function feter(bulle) {
    if (!bulle || bulle.classList.contains("mv-ok")) return;
    bulle.classList.add("mv-ok");
    bulle.insertAdjacentHTML("afterbegin",
      '<svg class="mv-coche" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg>' +
      '<span class="mv-eclats" aria-hidden="true">' + ECLATS.map(function (e) { return '<i style="--a:' + e[0] + "deg;--c:" + e[1] + '"></i>'; }).join("") + "</span>");
  }

  function brancher() {
    // « C'est noté » : coche tracée et éclats d'alvéoles sur la confirmation (API saute déjà dans la barre, alveoles.js).
    var toastAvant = racine.toast;
    if (typeof toastAvant === "function") {
      racine.toast = function (message, erreur) {
        var r = toastAvant.apply(this, arguments);
        if (!erreur && REUSSITE.test(String(message)) && !ECHEC.test(String(message))) feter(document.querySelector(".toast:not(.err)"));
        return r;
      };
    }

    // Le bouton API de la barre du bas passe dans la feuille, puis revient à sa place quand elle se ferme.
    var feuille = document.getElementById("sheet"), ouvrir = racine.quickSheet;
    var revenir = function () {
      if (!document.body.classList.contains("mv-api-sorti")) return;
      document.body.classList.remove("mv-api-sorti");
      document.body.classList.add("mv-api-retour");
      setTimeout(function () { document.body.classList.remove("mv-api-retour"); }, 600);
    };
    if (typeof ouvrir === "function" && feuille) {
      racine.quickSheet = function () {
        var r = ouvrir.apply(this, arguments), api = feuille.querySelector(".al-tete api-compagnon");
        if (feuille.open && api) { api.classList.add("mv-monte"); document.body.classList.add("mv-api-sorti"); }
        return r;
      };
      feuille.addEventListener("close", revenir);
    }

    // Après chaque écran : retenir le nombre de ruches pour le prochain chargement ; API retrouve sa place si la
    // feuille a été fermée sans passer par « close ».
    if (racine.Noyau && Noyau.crochets) {
      Noyau.crochets.sur("apresCoquille", "mouvement", function () {
        try { if (typeof S !== "undefined" && S.d && S.d.ruches) localStorage.setItem(CLE_RUCHES, String(S.d.ruches.length)); } catch (e) { /* stockage indisponible */ }
        if (feuille && !feuille.open) revenir();
      });
    }
  }
  // Les scripts « defer » s'exécutent avant DOMContentLoaded : à ce moment-là, toast() et quickSheet() existent.
  if (document.readyState === "complete") brancher(); else document.addEventListener("DOMContentLoaded", brancher);

  racine.Mouvement = { eveil: eveil, feter: feter };
})(window);
