/* API, le compagnon d'Apidoo. Élément <api-compagnon etat="repos" taille="64">. Aucune dépendance. */
(function (racine) {
  var CORPS = "M108 68L84 30H36L12 68l24 38h48z";
  var ETATS = {
    repos:     { g: 0,   d: 0,   oeil: [1, 1],       regard: [0, 0],   yeux: "ouvert", nom: "API au repos" },
    bonjour:   { g: 0,   d: 0,   oeil: [1, 1],       regard: [0, 0],   yeux: "ouvert", nom: "API dit bonjour", duree: 1800 },
    ecoute:    { g: 20,  d: -20, oeil: [1.28, .92],  regard: [0, 0],   yeux: "ouvert", nom: "API écoute" },
    reflexion: { g: 0,   d: 0,   oeil: [1, 1],       regard: [6, -6],  yeux: "ouvert", nom: "API réfléchit" },
    repond:    { g: 8,   d: -8,  oeil: [1, .92],     regard: [0, 1],   yeux: "ouvert", nom: "API répond" },
    fait:      { g: 12,  d: -12, oeil: [1, 1],       regard: [0, 0],   yeux: "rieur",  nom: "C'est fait", duree: 1900 },
    attention: { g: -34, d: 34,  oeil: [1, 1],       regard: [0, 2],   yeux: "ouvert", nom: "API signale un problème", sourcils: 1 },
    horsligne: { g: -30, d: 30,  oeil: [1, 1],       regard: [0, 0],   yeux: "dort",   nom: "API hors ligne, sans réseau" }
  };
  var RESSORT = "cubic-bezier(.34,1.56,.64,1)";
  var SORTIE = "cubic-bezier(.22,1,.36,1)";

  function regles() {
    var r = "";
    Object.keys(ETATS).forEach(function (k) {
      var e = ETATS[k], s = '.api[data-etat="' + k + '"] ';
      r += s + ".api-ant-g{transform:rotate(" + e.g + "deg)}" + s + ".api-ant-d{transform:rotate(" + e.d + "deg)}";
      r += s + ".api-oeil{transform:scale(" + e.oeil[0] + "," + e.oeil[1] + ")}";
      r += s + ".api-regard{transform:translate(" + e.regard[0] + "px," + e.regard[1] + "px)}";
      if (e.yeux !== "ouvert") r += s + ".api-ouvert{opacity:0}" + s + ".api-" + e.yeux + "{opacity:1}";
      if (e.sourcils) r += s + ".api-sourcils{opacity:1}";
    });
    return r;
  }

  var CSS =
    "api-compagnon{display:inline-block;flex:none;line-height:0;vertical-align:middle;width:var(--api-taille,64px);height:var(--api-taille,64px)}" +
    ".api{--api-miel:var(--honey,#E3A008);--api-trait:var(--pine,#1E2B24);--api-yeux:var(--pine,#1E2B24);display:block;width:100%;height:100%;overflow:visible}" +
    '.api[data-fond="sombre"]{--api-trait:#fff}' +
    '.api[data-etat="horsligne"]{--api-miel:#C4CABD;--api-trait:#55605A}' +
    '.api[data-etat="horsligne"][data-fond="sombre"]{--api-trait:#C5D0C8}' +
    ".api-corps{fill:var(--api-miel);stroke:var(--api-miel);stroke-width:10;stroke-linejoin:round;transition:fill .4s ease,stroke .4s ease}" +
    ".api-tige{fill:none;stroke:var(--api-trait);stroke-width:5;stroke-linecap:round;transition:stroke .4s ease}" +
    ".api-bout{fill:var(--api-trait);transition:fill .4s ease}" +
    ".api-pupille{fill:var(--api-yeux)}" +
    ".api-arc{fill:none;stroke:var(--api-yeux);stroke-width:6;stroke-linecap:round}" +
    ".api-sourcil{fill:none;stroke:var(--api-yeux);stroke-width:5;stroke-linecap:round}" +
    ".api-ant-g,.api-ant-g-i{transform-origin:47px 27px}.api-ant-d,.api-ant-d-i{transform-origin:73px 27px}" +
    ".api-ant-g,.api-ant-d{transition:transform .42s " + RESSORT + "}" +
    ".api-oeil-g,.api-pau-g{transform-origin:48px 64px}.api-oeil-d,.api-pau-d{transform-origin:72px 64px}" +
    ".api-oeil{transition:transform .26s " + SORTIE + "}" +
    ".api-regard{transition:transform .32s " + SORTIE + "}" +
    ".api-ouvert{transition:opacity .12s linear}" +
    ".api-rieur,.api-dort,.api-sourcils{opacity:0;transition:opacity .14s linear}" +
    ".api-tout,.api-souffle{transform-origin:60px 110px}" +
    ".api-onde{fill:none;stroke:var(--honey,#E3A008);stroke-width:3;stroke-linejoin:round;opacity:0;transform-origin:60px 68px}" +
    ".api-cell{fill:var(--honey,#E3A008);opacity:0;transform-box:fill-box;transform-origin:center}" +
    ".api-eclat{fill:var(--honey,#E3A008);opacity:0;transform-box:fill-box;transform-origin:center}" +
    ".api-z{fill:none;stroke:var(--api-trait);stroke-width:3;stroke-linecap:round;stroke-linejoin:round;opacity:0}" +
    /* Toujours en vie : souffle, balancement, clignement */
    ".api-souffle{animation:api-souffle 3.8s ease-in-out infinite}" +
    ".api-ant-g-i{animation:api-balance 3.8s ease-in-out infinite}" +
    ".api-ant-d-i{animation:api-balance 3.8s ease-in-out -.7s infinite reverse}" +
    ".api-pau{animation:api-cligne 5.6s linear infinite}" +
    "@keyframes api-souffle{0%,100%{transform:none}50%{transform:scale(1.012,.985)}}" +
    "@keyframes api-balance{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(3deg)}}" +
    "@keyframes api-cligne{0%,44%,48%,90%,94%,100%{transform:none}46%,92%,96%{transform:scaleY(.08)}94%{transform:none}}" +
    /* J'écoute */
    '.api[data-etat="ecoute"] .api-onde{animation:api-onde 2.1s ease-out infinite}' +
    '.api[data-etat="ecoute"] .api-onde:nth-child(2){animation-delay:.7s}' +
    '.api[data-etat="ecoute"] .api-onde:nth-child(3){animation-delay:1.4s}' +
    '.api[data-etat="ecoute"] .api-ant-g-i,.api[data-etat="ecoute"] .api-ant-d-i{animation:api-capte 1.05s ease-in-out infinite}' +
    '.api[data-etat="ecoute"] .api-ant-d-i{animation-delay:-.2s}' +
    "@keyframes api-onde{0%{opacity:.75;transform:scale(1)}100%{opacity:0;transform:scale(1.55)}}" +
    "@keyframes api-capte{0%,100%{transform:rotate(0)}30%{transform:rotate(-5deg)}65%{transform:rotate(4deg)}}" +
    /* Je réfléchis */
    '.api[data-etat="reflexion"] .api-regard-i{animation:api-cherche 3.2s ease-in-out infinite}' +
    '.api[data-etat="reflexion"] .api-cell{animation:api-remplit 1.9s ease-in-out infinite}' +
    '.api[data-etat="reflexion"] .api-cell:nth-child(2){animation-delay:.3s}' +
    '.api[data-etat="reflexion"] .api-cell:nth-child(3){animation-delay:.6s}' +
    '.api[data-etat="reflexion"] .api-ant-g-i{animation:api-balance 1.9s ease-in-out infinite}' +
    '.api[data-etat="reflexion"] .api-ant-d-i{animation:api-balance 1.9s ease-in-out -.5s infinite}' +
    "@keyframes api-cherche{0%,38%{transform:none}46%,82%{transform:translate(-9px,-1px)}90%,100%{transform:none}}" +
    "@keyframes api-remplit{0%,100%{opacity:.18;transform:scale(.72)}22%,58%{opacity:1;transform:scale(1)}}" +
    /* Je réponds */
    '.api[data-etat="repond"] .api-souffle{animation:api-hoche .82s ease-in-out infinite}' +
    '.api[data-etat="repond"] .api-ant-g-i{animation:api-parle .82s ease-in-out infinite}' +
    '.api[data-etat="repond"] .api-ant-d-i{animation:api-parle .82s ease-in-out -.18s infinite reverse}' +
    "@keyframes api-hoche{0%,100%{transform:none}45%{transform:translateY(-2px) scale(.992,1.012)}}" +
    "@keyframes api-parle{0%,100%{transform:rotate(0)}30%{transform:rotate(7deg)}62%{transform:rotate(-4deg)}}" +
    /* C'est fait */
    '.api[data-etat="fait"] .api-tout{animation:api-saut .86s ' + "ease-out both}" +
    '.api[data-etat="fait"] .api-eclat{animation:api-eclat .78s ' + SORTIE + " .24s both}" +
    '.api[data-etat="fait"] .api-pau{animation:none}' +
    "@keyframes api-saut{0%{transform:none}18%{transform:scale(1.08,.9)}46%{transform:translateY(-14px) scale(.96,1.05)}70%{transform:scale(1.06,.94)}85%{transform:translateY(-3px)}100%{transform:none}}" +
    "@keyframes api-eclat{0%{opacity:0;transform:scale(.4)}22%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}}" +
    /* Attention */
    '.api[data-etat="attention"] .api-tout{animation:api-sursaut .56s ease-out both}' +
    '.api[data-etat="attention"] .api-ant-g-i,.api[data-etat="attention"] .api-ant-d-i{animation:api-frisson 4.2s ease-in-out infinite}' +
    '.api[data-etat="attention"] .api-pau{animation:none}' +
    "@keyframes api-sursaut{0%{transform:none}16%{transform:translateX(-3px)}34%{transform:translateX(3px)}52%{transform:translateX(-2px)}72%{transform:translateX(1px)}100%{transform:none}}" +
    "@keyframes api-frisson{0%,86%,100%{transform:none}90%{transform:rotate(5deg)}94%{transform:rotate(-4deg)}}" +
    /* Hors ligne */
    '.api[data-etat="horsligne"] .api-souffle{animation-duration:6.4s}' +
    '.api[data-etat="horsligne"] .api-ant-g-i,.api[data-etat="horsligne"] .api-ant-d-i,.api[data-etat="horsligne"] .api-pau{animation:none}' +
    '.api[data-etat="horsligne"] .api-z{animation:api-z 4.2s ease-in-out infinite}' +
    '.api[data-etat="horsligne"] .api-z2{animation-delay:1.5s}' +
    "@keyframes api-z{0%{opacity:0;transform:none}20%{opacity:.9}70%{opacity:.7}100%{opacity:0;transform:translate(10px,-22px)}}" +
    /* Bonjour */
    '.api[data-etat="bonjour"] .api-tout{animation:api-arrive .72s ease-out both}' +
    '.api[data-etat="bonjour"] .api-ant-d-i{animation:api-salut 1.05s ease-in-out .5s both}' +
    '.api[data-etat="bonjour"] .api-ant-g-i{animation:none}' +
    "@keyframes api-arrive{0%{opacity:0;transform:translateY(-28px) scale(.84)}45%{opacity:1;transform:scale(1.08,.9)}68%{transform:translateY(-6px) scale(.97,1.03)}100%{transform:none}}" +
    "@keyframes api-salut{0%,100%{transform:none}18%,54%{transform:rotate(-24deg)}36%,72%{transform:rotate(8deg)}}" +
    ".api[data-pause] *{animation-play-state:paused!important}" +
    /* Moins d'animations demandé : la pose suffit à dire l'état */
    "@media (prefers-reduced-motion:reduce){.api *{animation:none!important;transition:none!important}" +
    '.api[data-etat="ecoute"] .api-onde:first-child{opacity:.6}' +
    '.api[data-etat="reflexion"] .api-cell{opacity:1}' +
    '.api[data-etat="horsligne"] .api-z{opacity:.8}' +
    "}" + regles();

  var HEX = function (x, y, r) {
    var h = r * .866;
    return "M" + (x + r) + " " + y + "L" + (x + r / 2) + " " + (y - h) + "H" + (x - r / 2) + "L" + (x - r) + " " + y + "L" + (x - r / 2) + " " + (y + h) + "H" + (x + r / 2) + "z";
  };
  var ECLATS = [[-66, -28], [-42, -64], [66, -32], [40, -66], [76, 8]];

  var FORME =
    '<g class="api-ondes" aria-hidden="true"><path class="api-onde" d="' + CORPS + '"/><path class="api-onde" d="' + CORPS + '"/><path class="api-onde" d="' + CORPS + '"/></g>' +
    '<g class="api-tout"><g class="api-souffle">' +
      '<g class="api-ant-g"><g class="api-ant-g-i"><path class="api-tige" d="M47 27C45 16 40 11 33 9"/><circle class="api-bout" cx="32" cy="9" r="5.5"/></g></g>' +
      '<g class="api-ant-d"><g class="api-ant-d-i"><path class="api-tige" d="M73 27C75 16 80 11 87 9"/><circle class="api-bout" cx="88" cy="9" r="5.5"/></g></g>' +
      '<path class="api-corps" d="' + CORPS + '"/>' +
      '<g class="api-regard"><g class="api-regard-i">' +
        '<g class="api-ouvert">' +
          '<g class="api-oeil api-oeil-g"><g class="api-pau api-pau-g"><ellipse class="api-pupille" cx="48" cy="64" rx="7" ry="10"/></g></g>' +
          '<g class="api-oeil api-oeil-d"><g class="api-pau api-pau-d"><ellipse class="api-pupille" cx="72" cy="64" rx="7" ry="10"/></g></g>' +
        "</g>" +
        '<path class="api-arc api-rieur" d="M39 67q9-11 18 0M63 67q9-11 18 0"/>' +
        '<path class="api-arc api-dort" d="M39 63q9 8 18 0M63 63q9 8 18 0"/>' +
        '<path class="api-sourcil api-sourcils" d="M38 53l14-6M82 53l-14-6"/>' +
      "</g></g>" +
    "</g></g>" +
    '<g aria-hidden="true"><path class="api-cell" d="' + HEX(49, 9, 6) + '"/><path class="api-cell" d="' + HEX(60, 15.5, 6) + '"/><path class="api-cell" d="' + HEX(71, 9, 6) + '"/></g>' +
    '<g aria-hidden="true">' + ECLATS.map(function (e, i) {
      return '<path class="api-eclat" style="--dx:' + e[0] + "px;--dy:" + e[1] + 'px" d="' + HEX(60, 62, i % 2 ? 4.5 : 6) + '"/>';
    }).join("") + "</g>" +
    '<g aria-hidden="true"><path class="api-z" d="M94 34h8l-8 8h8"/><path class="api-z api-z2" d="M104 22h6l-6 6h6"/></g>';

  function feuille() {
    if (document.getElementById("api-compagnon-css")) return;
    var s = document.createElement("style");
    s.id = "api-compagnon-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var veille = "IntersectionObserver" in window ? new IntersectionObserver(function (l) {
    l.forEach(function (e) {
      if (e.isIntersecting) e.target.removeAttribute("data-pause"); else e.target.setAttribute("data-pause", "");
    });
  }) : null;

  if (window.customElements && !customElements.get("api-compagnon")) {
    customElements.define("api-compagnon", class extends HTMLElement {
      static get observedAttributes() { return ["etat", "taille", "fond"]; }
      connectedCallback() {
        feuille();
        if (!this.svg) {
          this.insertAdjacentHTML("beforeend", '<svg class="api" viewBox="0 0 120 120" focusable="false">' + FORME + "</svg>");
          this.svg = this.lastElementChild;
        }
        if (veille) veille.observe(this.svg);
        this.maj();
      }
      disconnectedCallback() { if (veille && this.svg) veille.unobserve(this.svg); clearTimeout(this.minuteur); }
      attributeChangedCallback() { if (this.svg) this.maj(); }
      /* Change d'état. Les états brefs (bonjour, fait) reviennent seuls à l'état « apres ». */
      jouer(etat, apres) { this.apres = apres || "repos"; if (this.getAttribute("etat") === etat) this.maj(); else this.setAttribute("etat", etat); }
      maj() {
        var nom = ETATS[this.getAttribute("etat")] ? this.getAttribute("etat") : "repos", e = ETATS[nom], t = this.getAttribute("taille"), f = this.getAttribute("fond");
        if (t) this.style.setProperty("--api-taille", /^\d+$/.test(t) ? t + "px" : t);
        if (f) this.svg.setAttribute("data-fond", f); else this.svg.removeAttribute("data-fond");
        this.svg.removeAttribute("data-etat"); this.svg.getBoundingClientRect();
        this.svg.setAttribute("data-etat", nom);
        if (this.hasAttribute("muet")) { this.svg.setAttribute("aria-hidden", "true"); this.svg.removeAttribute("role"); }
        else { this.svg.setAttribute("role", "img"); this.svg.setAttribute("aria-label", e.nom); }
        clearTimeout(this.minuteur);
        if (e.duree) {
          var soi = this, fin = window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches ? 900 : e.duree;
          this.minuteur = setTimeout(function () {
            soi.dispatchEvent(new CustomEvent("api-fin", { detail: { etat: nom } }));
            soi.setAttribute("etat", soi.apres || "repos");
          }, fin);
        }
      }
    });
  }

  racine.ETATS = ETATS;
  racine.formeApi = FORME;
  racine.cssApi = CSS;
  racine.CORPS_API = CORPS;
  /* Même appel que compagnon(humeur, taille) dans alveoles.js. */
  racine.compagnon = function (etat, taille, fond) {
    return '<api-compagnon etat="' + (etat || "repos") + '" taille="' + (taille || 62) + '"' + (fond ? ' fond="' + fond + '"' : "") + "></api-compagnon>";
  };
})(window.Apidoo = window.Apidoo || {});
