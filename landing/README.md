# Landing page apiviz.fr

Page d'accueil publique d'apiviz, servie par le Worker Cloudflare `apiviz-landing` sur `apiviz.fr` (et `www.apiviz.fr`, redirigé vers `apiviz.fr`).

- `public/index.html` : la page, en un seul fichier (styles, scripts, logo apiviz inclus).
- `src.js` : redirection `www` → domaine nu, puis fichiers de `public/`.
- `wrangler.jsonc` : Worker et domaines.

Publier : `cd landing && npx wrangler@4 deploy`.
Boutons « Demander un accès » : constante `APP_URL` en bas de `public/index.html` (aujourd'hui un e-mail à contact@apiviz.fr ; à remplacer par `https://app.apiviz.fr/` à l'ouverture de l'application).
